const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const dbModule = require('./database');
const { hashPassword, checkPassword, signToken, verifyToken, requireAuth, requireGM, requireAdmin } = require('./auth');
const { calcStats, sumGear, CLASSES, SLOTS, generateItemAffixes } = require('./classes');
const { query, run } = dbModule;

// Parse affixes JSON for items returned from DB
function parseAffixes(items) {
  return items.map(i => ({ ...i, affixes: i.affixes ? JSON.parse(i.affixes) : [] }));
}

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

  // ── Seed starter quest items ───────────────────────────────────────────────
  const STARTER_ITEMS = [
    { name: 'Rusty Sword',        slot: 'mainhand', atk_bonus: 2, icon: '⚔️', description: 'A corroded but serviceable blade.' },
    { name: 'Leather Boots',      slot: 'boots',    def_bonus: 1, icon: '👢', description: 'Worn travelling boots, still functional.' },
    { name: 'Broken Chest Armor', slot: 'chest',    def_bonus: 2, hp_bonus: 4, icon: '🦺', description: 'A cracked breastplate — better than nothing.' },
  ];
  for (const item of STARTER_ITEMS) {
    if (!query('SELECT id FROM items WHERE name = ?', [item.name]).length) {
      run(
        'INSERT INTO items (name,slot,atk_bonus,def_bonus,hp_bonus,icon,description) VALUES (?,?,?,?,?,?,?)',
        [item.name, item.slot, item.atk_bonus||0, item.def_bonus||0, item.hp_bonus||0, item.icon, item.description]
      );
    }
  }
  console.log('✅ Starter items ready');

  // ── Fix legacy loot items with wrong slot names ──────────────────────────
  run("UPDATE items SET slot = 'mainhand' WHERE slot = 'weapon'");
  run("UPDATE items SET slot = 'pants'    WHERE slot = 'legs'");
  // ring/amulet have no valid equipment slot — remove them from inventories and items
  run("DELETE FROM player_inventory WHERE item_id IN (SELECT id FROM items WHERE slot IN ('ring','amulet'))");
  run("DELETE FROM user_equipment    WHERE item_id IN (SELECT id FROM items WHERE slot IN ('ring','amulet'))");
  run("DELETE FROM items WHERE slot IN ('ring','amulet')");
  console.log('✅ Slot names normalised');

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

// ── REST API: Stats & Equipment ───────────────────────────────────────────────

// Current user's computed stats + equipped items + inventory + quests
app.get('/api/me/stats', requireAuth, (req, res) => {
  const user = db.getUserByUsername.get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const equipped  = parseAffixes(db.getEquipment.all(user.username));
  const inventory = parseAffixes(db.getInventory.all(user.username));
  const quests    = db.getPlayerQuests.all(user.username);
  const stats     = calcStats(user.class, sumGear(equipped));
  res.json({ class: user.class, stats, equipped, slots: SLOTS, inventory, quests, gold: user.gold || 0, curHp: user.hp !== undefined ? user.hp : stats.hp });
});

// Available items (optionally ?slot=head etc.)
app.get('/api/items', requireAuth, (req, res) => {
  res.json(db.getItems.all(req.query.slot || null));
});

// Equip an item
app.put('/api/me/equipment/:slot', requireAuth, (req, res) => {
  const { slot } = req.params;
  const { item_id } = req.body;
  if (!SLOTS.includes(slot)) return res.status(400).json({ error: 'Invalid slot' });
  db.equipItem.run(req.user.username, slot, item_id);
  res.json({ ok: true });
});

// Unequip a slot — moves item back to inventory
app.delete('/api/me/equipment/:slot', requireAuth, (req, res) => {
  const { slot } = req.params;
  const username = req.user.username;
  if (!SLOTS.includes(slot)) return res.status(400).json({ error: 'Invalid slot' });

  const [cur] = query('SELECT item_id FROM user_equipment WHERE username = ? AND slot = ?', [username, slot]);
  if (!cur) return res.json({ ok: true });   // nothing equipped — no-op

  db.addInventoryItem.run(username, cur.item_id);
  db.unequipItem.run(username, slot);

  const equipped  = parseAffixes(db.getEquipment.all(username));
  const inventory = parseAffixes(db.getInventory.all(username));
  const user      = db.getUserByUsername.get(username);
  const stats     = calcStats(user.class, sumGear(equipped));
  res.json({ ok: true, equipped, inventory, stats });
});

// Class definitions (for client display)
app.get('/api/classes', (_, res) => {
  res.json(CLASSES);
});

// ── REST API: Quests ──────────────────────────────────────────────────────────

// Accept the Gatehouse quest — gives starter items, records quest
app.post('/api/me/quests/gatehouse', requireAuth, (req, res) => {
  const username = req.user.username;

  // Idempotent — if already accepted just return ok
  if (db.getPlayerQuests.get(username, 'gatehouse_patrol')) {
    return res.json({ ok: true, alreadyAccepted: true });
  }

  db.addQuest.run(
    username,
    'gatehouse_patrol',
    'Into the Dark Forest',
    'Investigate the forest north of town where villagers have gone missing and not returned.'
  );

  const rewards = ['Rusty Sword', 'Leather Boots', 'Broken Chest Armor'];
  const items = [];
  for (const name of rewards) {
    const [item] = parseAffixes(query('SELECT * FROM items WHERE name = ?', [name]));
    if (item) { db.addInventoryItem.run(username, item.id); items.push(item); }
  }

  res.json({ ok: true, items });
});

// Grant XP after combat win
app.post('/api/me/xp', requireAuth, (req, res) => {
  const xpGain = parseInt(req.body.xp, 10);
  if (!Number.isInteger(xpGain) || xpGain <= 0 || xpGain > 10000)
    return res.status(400).json({ error: 'Invalid XP' });
  const user     = db.getUserByUsername.get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const newTotal = user.xp + xpGain;
  const newLevel = Math.min(99, Math.floor(newTotal / 100) + 1);
  const levelGain = Math.max(0, newLevel - user.level);
  db.updateUserXP.run(xpGain, newLevel, req.user.username);
  if (levelGain > 0) db.adjustSkillPoints.run(levelGain, req.user.username);
  res.json({ ok: true, xp: newTotal, level: newLevel, newSkillPoints: levelGain });
});

// Record player death — sets HP to 1
app.post('/api/me/die', requireAuth, (req, res) => {
  run('UPDATE users SET hp = 1 WHERE username = ?', [req.user.username]);
  res.json({ ok: true, curHp: 1 });
});

// Heal at Royal Keep — restores HP to max
app.post('/api/me/heal', requireAuth, (req, res) => {
  const user = db.getUserByUsername.get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const equipped = parseAffixes(db.getEquipment.all(user.username));
  const stats = calcStats(user.class, sumGear(equipped));
  run('UPDATE users SET hp = ? WHERE username = ?', [stats.hp, req.user.username]);
  res.json({ ok: true, curHp: stats.hp });
});

// Skill tree: get allocated points and unspent points
app.get('/api/me/skills', requireAuth, (req, res) => {
  const user = db.getUserByUsername.get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const rows = db.getPlayerSkills.all(req.user.username);
  const allocated = {};
  rows.forEach(r => { allocated[r.node_id] = r.points; });
  res.json({ unspentPoints: user.skill_points || 0, allocated });
});

// Skill tree: assign one point to a node
app.post('/api/me/skills/assign', requireAuth, (req, res) => {
  const { nodeId } = req.body;
  if (!nodeId || typeof nodeId !== 'string' || !/^[a-z_]+$/.test(nodeId))
    return res.status(400).json({ error: 'Invalid node ID' });
  const user = db.getUserByUsername.get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.skill_points || user.skill_points <= 0)
    return res.status(400).json({ error: 'No skill points available' });
  const current = db.getPlayerSkills.get(req.user.username, nodeId);
  const currentPts = current ? current.points : 0;
  if (currentPts >= 5) return res.status(400).json({ error: 'Skill at maximum level' });
  db.assignSkillPoint.run(req.user.username, nodeId, currentPts + 1);
  db.adjustSkillPoints.run(-1, req.user.username);
  res.json({ ok: true, nodeId, points: currentPts + 1, unspentPoints: user.skill_points - 1 });
});

// ── Loot generation helpers ───────────────────────────────────────────────────
// Slots must match the equipment system: head, chest, gloves, pants, boots, mainhand, offhand
const LOOT_NAMES = {
  mainhand: { D:['Rusty Blade','Chipped Sword','Bent Dagger','Cracked Club'], C:['Iron Sword','Steel Dagger','Hunter\'s Shortbow','Oak Staff'], B:['Shadow Blade','Enchanted Staff','Moonbow','Void Shard'] },
  offhand:  { D:['Cracked Buckler','Worn Shield','Chipped Focus'], C:['Iron Shield','Leather Buckler','Oak Totem'], B:['Shadow Aegis','Enchanted Orb','Knight\'s Bulwark'] },
  head:     { D:['Torn Hood','Dented Cap','Ragged Hat'], C:['Iron Helm','Leather Cap','Chain Coif'], B:['Shadow Cowl','Mage Crown','Knight\'s Visor'] },
  chest:    { D:['Tattered Tunic','Cracked Chest Plate','Worn Vest'], C:['Chain Mail','Iron Breastplate','Leather Armor'], B:['Shadow Coat','Mage Robe','Knight\'s Plate'] },
  pants:    { D:['Torn Pants','Rusted Greaves','Patched Leggings'], C:['Iron Greaves','Leather Pants','Chain Leggings'], B:['Shadow Leggings','Battle Greaves','Mage Trousers'] },
  boots:    { D:['Worn Boots','Cracked Sandals','Tattered Shoes'], C:['Iron Boots','Leather Boots','Hunter\'s Treads'], B:['Shadow Treads','Knight\'s Sabatons','Mage Slippers'] },
  gloves:   { D:['Tattered Gloves','Worn Mitts','Cracked Gauntlets'], C:['Iron Gauntlets','Leather Gloves','Chain Mitts'], B:['Shadow Wraps','Knight\'s Gauntlets','Mage Gloves'] },
};
const LOOT_STATS = {
  D: { weapon:{atk_bonus:[2,6]},   armor:{def_bonus:[1,4],hp_bonus:[5,15]}  },
  C: { weapon:{atk_bonus:[6,14]},  armor:{def_bonus:[4,9],hp_bonus:[15,30]} },
  B: { weapon:{atk_bonus:[14,25]}, armor:{def_bonus:[9,18],hp_bonus:[30,60]}},
  A: { weapon:{atk_bonus:[25,40]}, armor:{def_bonus:[18,30],hp_bonus:[60,100]}},
  S: { weapon:{atk_bonus:[40,65]}, armor:{def_bonus:[30,50],hp_bonus:[100,160]}},
};
const LOOT_SLOT_CAT  = { mainhand:'weapon', offhand:'weapon', head:'armor', chest:'armor', pants:'armor', boots:'armor', gloves:'armor' };
const LOOT_SLOT_ICON = { mainhand:'⚔️', offhand:'🛡️', head:'🪖', chest:'🦺', pants:'👖', boots:'👢', gloves:'🧤' };
const LOOT_TIER_RARITY = { D:'normal', C:'uncommon', B:'rare', A:'epic', S:'legendary' };
const ALL_SLOTS = ['mainhand','offhand','head','chest','pants','boots','gloves'];
function lootRandInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

// Grant loot after a combat win
app.post('/api/me/loot', requireAuth, (req, res) => {
  const { monsters } = req.body; // [{ monsterId, tier }]
  if (!Array.isArray(monsters) || monsters.length === 0 || monsters.length > 9)
    return res.status(400).json({ error: 'Invalid monsters' });

  const username = req.user.username;
  const droppedItems = [];
  let gold = 0;

  // Gold: sum from each monster's tier range
  for (const mon of monsters) {
    const tier = mon.tier || 'D';
    const g = { D:[5,18], C:[18,45], B:[45,95], A:[95,180], S:[180,350] }[tier] || [5,18];
    gold += lootRandInt(g[0], g[1]);
  }

  // Items: each monster rolls independently; total capped at 3
  const maxItems = Math.min(3, monsters.length + 1);
  for (const mon of monsters) {
    if (droppedItems.length >= maxItems) break;
    const tier = mon.tier || 'D';
    const chance = { D:0.35, C:0.55, B:0.72, A:0.88, S:0.96 }[tier] || 0.35;
    if (Math.random() >= chance) continue;

    const slot    = ALL_SLOTS[Math.floor(Math.random() * ALL_SLOTS.length)];
    const cat     = LOOT_SLOT_CAT[slot];
    const names   = LOOT_NAMES[slot]?.[tier] || [`${tier} ${slot}`];
    const name    = names[Math.floor(Math.random() * names.length)];
    const icon    = LOOT_SLOT_ICON[slot] || '🎒';
    const rarity  = LOOT_TIER_RARITY[tier] || 'normal';
    const statRanges = LOOT_STATS[tier]?.[cat] || LOOT_STATS.D.armor;

    const vals = {};
    for (const [col, [mn, mx]] of Object.entries(statRanges)) {
      vals[col] = lootRandInt(mn, mx);
    }

    const { lastInsertRowid } = db.run(
      `INSERT INTO items (name, slot, atk_bonus, def_bonus, hp_bonus, mp_bonus, spirit_bonus, icon, rarity)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [name, slot, vals.atk_bonus||0, vals.def_bonus||0, vals.hp_bonus||0, vals.mp_bonus||0, vals.spirit_bonus||0, icon, rarity]
    );
    db.addInventoryItem.run(username, lastInsertRowid);
    droppedItems.push({ id: lastInsertRowid, name, slot, icon, rarity, ...vals });
  }

  if (gold > 0) db.addGold.run(gold, username);
  res.json({ items: droppedItems, gold });
});

// ── REST API: Inventory ───────────────────────────────────────────────────────

app.get('/api/me/inventory', requireAuth, (req, res) => {
  res.json(db.getInventory.all(req.user.username));
});

// Equip an item from inventory — swaps if slot occupied
app.post('/api/me/inventory/:invId/equip', requireAuth, (req, res) => {
  const username = req.user.username;
  const invId    = parseInt(req.params.invId);
  const { slot } = req.body;

  if (!SLOTS.includes(slot)) return res.status(400).json({ error: 'Invalid slot' });

  // Verify ownership + get item details via join
  const [invRow] = query(
    `SELECT pi.id as inv_id, pi.item_id, i.slot as item_slot
     FROM player_inventory pi JOIN items i ON i.id = pi.item_id
     WHERE pi.id = ? AND pi.username = ?`,
    [invId, username]
  );
  if (!invRow) return res.status(404).json({ error: 'Item not in your inventory' });
  if (invRow.item_slot !== slot) {
    return res.status(400).json({ error: `This item belongs in the ${invRow.item_slot} slot` });
  }

  // If slot occupied, move current item back to inventory
  const [cur] = query('SELECT item_id FROM user_equipment WHERE username = ? AND slot = ?', [username, slot]);
  if (cur) {
    db.addInventoryItem.run(username, cur.item_id);
    db.unequipItem.run(username, slot);
  }

  db.equipItem.run(username, slot, invRow.item_id);
  db.removeInventoryItem.run(invId, username);

  const equipped  = parseAffixes(db.getEquipment.all(username));
  const inventory = parseAffixes(db.getInventory.all(username));
  const user      = db.getUserByUsername.get(username);
  const stats     = calcStats(user.class, sumGear(equipped));
  res.json({ equipped, inventory, stats });
});

// ── REST API: Admin item generation ──────────────────────────────────────────

// POST /api/admin/items  { name, slot, rarity, icon?, description? }
// Creates an item with randomly-rolled affixes for the given rarity.
app.post('/api/admin/items', requireAuth, requireAdmin, (req, res) => {
  const { name, slot, rarity = 'normal', icon = '🎒', description = '' } = req.body;
  if (!name || !slot) return res.status(400).json({ error: 'name and slot required' });
  if (!SLOTS.includes(slot)) return res.status(400).json({ error: 'Invalid slot' });

  const { affixes, bonuses } = generateItemAffixes(slot, rarity);

  const info = run(
    `INSERT INTO items
       (name, slot, rarity, affixes, icon, description,
        str_bonus, dex_bonus, int_bonus, spirit_bonus,
        hp_bonus, mp_bonus, atk_bonus, def_bonus)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      name, slot, rarity, JSON.stringify(affixes), icon, description,
      bonuses.str_bonus    || 0,
      bonuses.dex_bonus    || 0,
      bonuses.int_bonus    || 0,
      bonuses.spirit_bonus || 0,
      bonuses.hp_bonus     || 0,
      bonuses.mp_bonus     || 0,
      bonuses.atk_bonus    || 0,
      bonuses.def_bonus    || 0,
    ]
  );

  const [item] = parseAffixes(query('SELECT * FROM items WHERE id = ?', [info.lastInsertRowid]));
  res.json(item);
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

  // Kick any existing session for this user
  const prevSocketId = onlineUsers.get(username);
  if (prevSocketId) {
    io.to(prevSocketId).emit('force_logout', { reason: 'You have logged in from another window.' });
    console.log(`⚠️  ${username} kicked previous session`);
  }

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
    // Only mark offline if this socket is still the active one
    if (onlineUsers.get(username) === socket.id) {
      onlineUsers.delete(username);
      io.emit('users:online', Array.from(onlineUsers.keys()));
    }
    console.log(`🔴 ${username} disconnected`);
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
