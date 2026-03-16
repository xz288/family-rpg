const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const dbModule = require('./database');
const { hashPassword, checkPassword, signToken, verifyToken, requireAuth, requireGM, requireAdmin } = require('./auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// We'll set this after initDb resolves
let db;

async function startServer() {
  await dbModule.initDb();
  db = dbModule;

  // ── Seed admin account (first run) ──────────────────────────────────────────
  const existing = db.getUserByUsername.get('admin');
  if (!existing) {
    db.createUser.run({ username: 'admin', password: hashPassword('admin123'), role: 'admin', class: 'Sage', avatar: '👑' });
    console.log('✅ Admin account created  →  username: admin  password: admin123');
  }

  const familyAccounts = [
    { username: 'Daddy',  password: 'Daddy',  class: 'Warrior', avatar: '⚔️' },
    { username: 'Mommy',  password: 'Mommy',  class: 'Healer',  avatar: '💚' },
    { username: 'Blake',  password: 'Blake',  class: 'Rogue',   avatar: '🗡️' },
    { username: 'Casper', password: 'Casper', class: 'Paladin', avatar: '🛡️' },
    { username: 'Dandan', password: 'Dandan', class: 'Ranger',  avatar: '🏹' },
  ];
  for (const acc of familyAccounts) {
    const exists = db.getUserByUsername.get(acc.username);
    if (!exists) db.createUser.run({ ...acc, password: hashPassword(acc.password), role: 'player' });
  }
  console.log('✅ Family accounts ready');

// ── REST API: Auth ────────────────────────────────────────────────────────────

app.post('/api/register', (req, res) => {
  const { username, password, class: charClass, avatar } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const validClasses = ['Warrior', 'Mage', 'Rogue', 'Healer', 'Ranger', 'Paladin'];
  const validAvatars = { Warrior:'⚔️', Mage:'🔮', Rogue:'🗡️', Healer:'💚', Ranger:'🏹', Paladin:'🛡️' };

  const chosenClass = validClasses.includes(charClass) ? charClass : 'Warrior';
  const chosenAvatar = avatar || validAvatars[chosenClass];

  try {
    db.createUser.run({
      username,
      password: hashPassword(password),
      role: 'player',
      class: chosenClass,
      avatar: chosenAvatar,
    });
    const user = db.getUserByUsername.get(username);
    res.json({ token: signToken(user), user: sanitize(user) });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already taken' });
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.getUserByUsername.get(username);
  if (!user || !checkPassword(password, user.password))
    return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: signToken(user), user: sanitize(user) });
});

// ── REST API: Users ───────────────────────────────────────────────────────────

app.get('/api/users', requireAuth, (req, res) => {
  res.json(db.getAllUsers.all());
});

app.patch('/api/users/:username/role', requireAuth, requireAdmin, (req, res) => {
  const { role } = req.body;
  const validRoles = ['admin', 'gamemaster', 'player'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  db.db.prepare('UPDATE users SET role = ? WHERE username = ?').run(role, req.params.username);
  res.json({ ok: true });
});

// Delete account (admin only)
app.delete('/api/users/:username', requireAuth, requireAdmin, (req, res) => {
  const { username } = req.params;
  if (username === 'admin') return res.status(400).json({ error: 'Cannot delete admin' });
  db.db.prepare('DELETE FROM users WHERE username = ?').run(username);
  db.db.prepare('DELETE FROM messages WHERE from_user = ?').run(username);
  // Kick them if online
  const sid = onlineUsers.get(username);
  if (sid) io.to(sid).emit('force_logout', { reason: 'Your account has been deleted.' });
  onlineUsers.delete(username);
  io.emit('users:online', Array.from(onlineUsers.keys()));
  res.json({ ok: true });
});

// Change own password
app.patch('/api/users/me/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields required' });
  if (newPassword.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
  const user = db.getUserByUsername.get(req.user.username);
  if (!checkPassword(currentPassword, user.password))
    return res.status(401).json({ error: 'Current password is incorrect' });
  db.db.prepare('UPDATE users SET password = ? WHERE username = ?')
    .run(hashPassword(newPassword), req.user.username);
  res.json({ ok: true });
});

// Admin reset any user's password
app.patch('/api/users/:username/password', requireAuth, requireAdmin, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
  db.db.prepare('UPDATE users SET password = ? WHERE username = ?')
    .run(hashPassword(newPassword), req.params.username);
  res.json({ ok: true });
});

// Ban/unban from public chat (admin only)
app.patch('/api/users/:username/ban', requireAuth, requireAdmin, (req, res) => {
  const { banned } = req.body; // true or false
  db.db.prepare("UPDATE users SET role = ? WHERE username = ?")
    .run(banned ? 'banned' : 'player', req.params.username);
  const sid = onlineUsers.get(req.params.username);
  if (sid) io.to(sid).emit('ban_status', { banned });
  res.json({ ok: true });
});

// ── REST API: Messages ────────────────────────────────────────────────────────

app.get('/api/messages/public', requireAuth, (req, res) => {
  res.json(db.getPublicMessages.all().reverse());
});

app.get('/api/messages/private/:with', requireAuth, (req, res) => {
  const me = req.user.username;
  const them = req.params.with;
  res.json(db.getPrivateMessages.all(me, them, them, me).reverse());
});

// ── REST API: Events ──────────────────────────────────────────────────────────

app.get('/api/events', requireAuth, (req, res) => {
  const events = db.getAllEvents.all();
  const withParticipants = events.map(e => ({
    ...e,
    participants: db.getEventParticipants.all(e.id),
  }));
  res.json(withParticipants);
});

app.post('/api/events', requireAuth, requireGM, (req, res) => {
  const { title, description, invites, scheduled_at } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Title and description required' });

  const info = db.createEvent.run({ title, description, created_by: req.user.username, scheduled_at: scheduled_at || null });
  const eventId = info.lastInsertRowid;

  if (Array.isArray(invites)) {
    invites.forEach(u => db.inviteToEvent.run(eventId, u));
  }

  const event = db.getEventById.get(eventId);
  const participants = db.getEventParticipants.all(eventId);

  // Notify invited players in real-time
  if (Array.isArray(invites)) {
    invites.forEach(u => {
      const socketId = onlineUsers.get(u);
      if (socketId) {
        io.to(socketId).emit('event:invite', { event, participants });
      }
    });
  }

  io.emit('event:new', { event, participants });
  res.json({ event, participants });
});

app.post('/api/events/:id/invite', requireAuth, requireGM, (req, res) => {
  const { usernames } = req.body;
  const eventId = parseInt(req.params.id);
  const event = db.getEventById.get(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  (usernames || []).forEach(u => {
    db.inviteToEvent.run(eventId, u);
    const socketId = onlineUsers.get(u);
    if (socketId) io.to(socketId).emit('event:invite', { event });
  });

  res.json({ ok: true });
});

app.post('/api/events/:id/respond', requireAuth, (req, res) => {
  const { status } = req.body; // accepted | declined
  db.respondToInvite.run(status, parseInt(req.params.id), req.user.username);
  io.emit('event:updated', { eventId: req.params.id });
  res.json({ ok: true });
});

app.patch('/api/events/:id/status', requireAuth, requireGM, (req, res) => {
  const { status } = req.body;
  db.updateEventStatus.run(status, parseInt(req.params.id));
  io.emit('event:updated', { eventId: req.params.id });
  res.json({ ok: true });
});

app.get('/api/events/invites', requireAuth, (req, res) => {
  res.json(db.getEventInvites.all(req.user.username));
});

// ── Socket.IO: Real-time ──────────────────────────────────────────────────────

// Map username → socket id for targeted delivery
const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    socket.user = verifyToken(token);
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const { username, role } = socket.user;
  onlineUsers.set(username, socket.id);

  console.log(`🟢 ${username} connected (${role})`);

  // Broadcast updated online list
  io.emit('users:online', Array.from(onlineUsers.keys()));

  // ── Public chat ────────────────────────────────────────────────────────────
  socket.on('chat:public', ({ content }) => {
    if (!content?.trim()) return;
    const user = db.getUserByUsername.get(username);
    if (user?.role === 'banned') {
      socket.emit('chat:public', { from: '🚫 System', content: 'You are banned from public chat.', at: new Date().toISOString(), system: true });
      return;
    }
    db.saveMessage.run({ from_user: username, to_user: null, content: content.trim() });
    io.emit('chat:public', { from: username, content: content.trim(), at: new Date().toISOString() });
  });

  // ── Private message ────────────────────────────────────────────────────────
  socket.on('chat:private', ({ to, content }) => {
    if (!content?.trim() || !to) return;
    db.saveMessage.run({ from_user: username, to_user: to, content: content.trim() });
    const payload = { from: username, to, content: content.trim(), at: new Date().toISOString() };
    // Send to recipient if online
    const targetSocketId = onlineUsers.get(to);
    if (targetSocketId) io.to(targetSocketId).emit('chat:private', payload);
    // Echo back to sender
    socket.emit('chat:private', payload);
  });

  // ── Typing indicator ───────────────────────────────────────────────────────
  socket.on('typing:public', () => {
    socket.broadcast.emit('typing:public', { username });
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    onlineUsers.delete(username);
    console.log(`🔴 ${username} disconnected`);
    io.emit('users:online', Array.from(onlineUsers.keys()));
  });
});

  // ── Start ───────────────────────────────────────────────────────────────────
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🐉 Family RPG Server running on http://0.0.0.0:${PORT}`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://<your-local-ip>:${PORT}\n`);
  });
} // end startServer

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

function sanitize(user) {
  const { password, ...safe } = user;
  return safe;
}
