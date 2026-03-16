// ── State ─────────────────────────────────────────────────────────────────────
const token   = localStorage.getItem('rpg_token');
const meRaw   = localStorage.getItem('rpg_user');

if (!token || !meRaw) { window.location.href = '/'; }

const me = JSON.parse(meRaw);
let dmTarget  = null;   // { username, avatar }
let allUsers  = [];
let onlineSet = new Set();
let typingTimer = null;

const isGM = me.role === 'admin' || me.role === 'gamemaster';

// ── Socket ────────────────────────────────────────────────────────────────────
const socket = io({ auth: { token } });

socket.on('connect_error', (err) => {
  if (err.message === 'Authentication error') {
    localStorage.clear();
    window.location.href = '/';
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Populate topbar
  document.getElementById('my-avatar').textContent = me.avatar;
  document.getElementById('my-name').textContent   = me.username;
  document.getElementById('my-meta').textContent   = `Lv.${me.level} ${me.class}`;
  const roleBadge = document.getElementById('my-role-badge');
  roleBadge.textContent = me.role.charAt(0).toUpperCase() + me.role.slice(1);
  roleBadge.className   = `badge-role ${me.role}`;

  // Show GM button
  if (isGM) document.getElementById('btn-open-event-modal').style.display = '';
  // Show Admin button
  if (me.role === 'admin') document.getElementById('btn-admin').style.display = '';

  // Load data
  await Promise.all([loadUsers(), loadPublicHistory(), loadEvents(), loadMyInvites()]);

  // Listeners
  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-send').addEventListener('click', sendMessage);
  document.getElementById('msg-input').addEventListener('keydown', onInputKey);
  document.getElementById('msg-input').addEventListener('input', onTyping);
});

// ── API helpers ───────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { localStorage.clear(); window.location.href = '/'; }
  return res.json();
}

// ── Load users ────────────────────────────────────────────────────────────────
async function loadUsers() {
  allUsers = await api('GET', '/api/users');
  renderPlayerList();
}

function renderPlayerList() {
  const ul = document.getElementById('player-list');
  ul.innerHTML = '';
  const others = allUsers.filter(u => u.username !== me.username);

  others.forEach(u => {
    const isOnline = onlineSet.has(u.username);
    const li = document.createElement('li');
    li.dataset.username = u.username;
    if (dmTarget?.username === u.username) li.classList.add('active-dm');
    li.innerHTML = `
      <span class="p-avatar">${u.avatar}</span>
      <div class="p-info">
        <div class="p-name">${u.username}</div>
        <div class="p-class">Lv.${u.level} ${u.class}</div>
      </div>
      <span class="p-online ${isOnline ? 'on' : ''}"></span>
    `;
    li.addEventListener('click', () => startDM(u));
    ul.appendChild(li);
  });

  const onlineOthers = others.filter(u => onlineSet.has(u.username)).length;
  document.getElementById('online-count').textContent = onlineOthers + 1; // +me
}

// ── Online tracking ───────────────────────────────────────────────────────────
socket.on('users:online', (usernames) => {
  onlineSet = new Set(usernames);
  renderPlayerList();
});

// ── DM targeting ─────────────────────────────────────────────────────────────
function startDM(user) {
  dmTarget = user;
  document.getElementById('dm-indicator').style.display = 'flex';
  document.getElementById('dm-target-name').textContent = `${user.avatar} ${user.username}`;
  document.getElementById('chat-title').textContent    = `💬 ${user.username}`;
  document.getElementById('chat-subtitle').textContent = `Private conversation`;

  // Mark active
  document.querySelectorAll('#player-list li').forEach(li => {
    li.classList.toggle('active-dm', li.dataset.username === user.username);
  });

  // Load DM history
  loadDMHistory(user.username);
  document.getElementById('msg-input').focus();
}

function clearDM() {
  dmTarget = null;
  document.getElementById('dm-indicator').style.display = 'none';
  document.getElementById('chat-title').textContent    = '💬 Public Chat';
  document.getElementById('chat-subtitle').textContent = 'Town Square — all can see';
  document.querySelectorAll('#player-list li').forEach(li => li.classList.remove('active-dm'));
  loadPublicHistory();
}

// ── Chat history ──────────────────────────────────────────────────────────────
async function loadPublicHistory() {
  const msgs = await api('GET', '/api/messages/public');
  clearMessages();
  msgs.forEach(m => appendMessage({
    from: m.from_user, content: m.content, at: m.created_at, private: false,
  }));
  scrollToBottom();
}

async function loadDMHistory(username) {
  const msgs = await api('GET', `/api/messages/private/${username}`);
  clearMessages();
  msgs.forEach(m => appendMessage({
    from: m.from_user, to: m.to_user, content: m.content, at: m.created_at, private: true,
  }));
  scrollToBottom();
}

function clearMessages() {
  document.getElementById('messages').innerHTML = '';
}

function appendMessage({ from, to, content, at, private: isPrivate, system }) {
  const container = document.getElementById('messages');

  if (system) {
    const div = document.createElement('div');
    div.className = 'msg system';
    div.innerHTML = `<span class="msg-content">${escHtml(content)}</span>`;
    container.appendChild(div);
    scrollToBottom();
    return;
  }

  const user = allUsers.find(u => u.username === from) || { avatar: '❓', username: from, class: '' };
  const isSelf = from === me.username;
  const timeStr = formatTime(at);

  const div = document.createElement('div');
  div.className = `msg${isPrivate ? ' private' : ''}`;
  div.innerHTML = `
    <span class="msg-avatar">${user.avatar}</span>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-author${isSelf ? ' self' : ''}">${escHtml(from)}</span>
        ${isPrivate ? `<span class="msg-dm-tag">🔒 ${isSelf ? 'to ' + escHtml(to) : 'private'}</span>` : ''}
        <span class="msg-time">${timeStr}</span>
      </div>
      <div class="msg-content">${escHtml(content)}</div>
    </div>
  `;
  container.appendChild(div);
  scrollToBottom();
}

function scrollToBottom() {
  const el = document.getElementById('messages');
  el.scrollTop = el.scrollHeight;
}

// ── Send message ──────────────────────────────────────────────────────────────
function sendMessage() {
  const input = document.getElementById('msg-input');
  const content = input.value.trim();
  if (!content) return;
  input.value = '';

  if (dmTarget) {
    socket.emit('chat:private', { to: dmTarget.username, content });
  } else {
    socket.emit('chat:public', { content });
  }
}

function onInputKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function onTyping() {
  if (!dmTarget) {
    socket.emit('typing:public');
  }
}

// ── Receive messages ──────────────────────────────────────────────────────────
socket.on('chat:public', (msg) => {
  if (!dmTarget) {
    appendMessage({ from: msg.from, content: msg.content, at: msg.at, private: false });
  }
});

socket.on('chat:private', (msg) => {
  const isRelevant = (msg.from === dmTarget?.username && msg.to === me.username)
                  || (msg.from === me.username && msg.to === dmTarget?.username)
                  || (msg.from !== me.username && msg.to === me.username);

  if (dmTarget && isRelevant) {
    appendMessage({ from: msg.from, to: msg.to, content: msg.content, at: msg.at, private: true });
  }

  // Toast if DM arrives and we're not in that DM window
  if (msg.from !== me.username && msg.to === me.username && dmTarget?.username !== msg.from) {
    showToast(`📨 Private message from ${msg.from}`);
  }
});

// Typing indicator
socket.on('typing:public', ({ username }) => {
  if (username === me.username || dmTarget) return;
  const el = document.getElementById('typing-indicator');
  el.textContent = `${username} is typing…`;
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => el.textContent = '', 2000);
});

// ── Events ────────────────────────────────────────────────────────────────────
async function loadEvents() {
  const events = await api('GET', '/api/events');
  renderEvents(events);
}

function renderEvents(events) {
  const panel = document.getElementById('events-panel');
  const noEl  = document.getElementById('no-events');

  // Remove old event cards
  panel.querySelectorAll('.event-card').forEach(el => el.remove());

  if (!events.length) { noEl.style.display = ''; return; }
  noEl.style.display = 'none';

  events.forEach(ev => {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.id = `ev-${ev.id}`;

    const participants = (ev.participants || []);
    const accepted = participants.filter(p => p.status === 'accepted').map(p => p.username);
    const pending  = participants.filter(p => p.status === 'pending').map(p => p.username);

    let participantText = '';
    if (accepted.length) participantText += `✅ ${accepted.join(', ')}`;
    if (pending.length)  participantText += (participantText ? ' · ' : '') + `⏳ ${pending.join(', ')}`;

    let actions = '';
    if (isGM) {
      actions += `<button class="btn-sm" onclick="inviteMore(${ev.id})">+ Invite</button>`;
      if (ev.status === 'open')   actions += `<button class="btn-sm gold" onclick="setStatus(${ev.id},'active')">Start</button>`;
      if (ev.status === 'active') actions += `<button class="btn-sm" onclick="setStatus(${ev.id},'completed')">Complete</button>`;
    }

    card.innerHTML = `
      <div class="event-status ${ev.status}">${ev.status.toUpperCase()}</div>
      <div class="event-title">${escHtml(ev.title)}</div>
      <div class="event-desc">${escHtml(ev.description)}</div>
      <div class="event-meta">
        ${ev.scheduled_at ? '🕐 ' + formatDateTime(ev.scheduled_at) + ' · ' : ''}
        📋 by ${escHtml(ev.created_by)}
      </div>
      ${participantText ? `<div class="event-participants">${participantText}</div>` : ''}
      ${actions ? `<div class="event-actions">${actions}</div>` : ''}
    `;
    panel.appendChild(card);
  });
}

async function loadMyInvites() {
  const invites = await api('GET', '/api/events/invites');
  const pending = invites.filter(i => i.status === 'pending');
  const section = document.getElementById('invites-section');
  const list    = document.getElementById('invites-list');

  if (!pending.length) { section.style.display = 'none'; return; }
  section.style.display = '';
  list.innerHTML = '';

  pending.forEach(inv => {
    const item = document.createElement('div');
    item.className = 'invite-item';
    item.id = `inv-${inv.event_id}`;
    item.innerHTML = `
      <div class="inv-title">📜 ${escHtml(inv.event_title)}</div>
      <div style="font-size:12px;color:var(--muted)">You have been invited to join this quest</div>
      <div class="inv-actions">
        <button class="btn-sm accept" onclick="respondInvite(${inv.event_id},'accepted',this)">Accept</button>
        <button class="btn-sm decline" onclick="respondInvite(${inv.event_id},'declined',this)">Decline</button>
      </div>
    `;
    list.appendChild(item);
  });
}

async function respondInvite(eventId, status, btn) {
  await api('POST', `/api/events/${eventId}/respond`, { status });
  document.getElementById(`inv-${eventId}`)?.remove();
  if (!document.getElementById('invites-list').children.length) {
    document.getElementById('invites-section').style.display = 'none';
  }
  loadEvents();
}

async function setStatus(eventId, status) {
  await api('PATCH', `/api/events/${eventId}/status`, { status });
  loadEvents();
}

async function inviteMore(eventId) {
  const username = prompt('Enter username to invite:');
  if (!username) return;
  await api('POST', `/api/events/${eventId}/invite`, { usernames: [username] });
  showToast(`Invitation sent to ${username}`);
  loadEvents();
}

// Socket events
socket.on('event:new', ({ event, participants }) => {
  showToast(`⚔ New quest: ${event.title}`);
  loadEvents();
});

socket.on('event:updated', () => {
  loadEvents();
  loadMyInvites();
});

socket.on('event:invite', ({ event }) => {
  showToast(`📨 You've been invited: ${event.title}`);
  loadMyInvites();
});

// ── Create Event Modal ────────────────────────────────────────────────────────
function openEventModal() {
  document.getElementById('modal-overlay').classList.add('open');

  // Populate invite checkboxes
  const container = document.getElementById('invite-checkboxes');
  container.innerHTML = '';
  allUsers.filter(u => u.username !== me.username).forEach(u => {
    const label = document.createElement('label');
    label.className = 'invite-cb-label';
    label.innerHTML = `<input type="checkbox" value="${escHtml(u.username)}"> ${u.avatar} ${escHtml(u.username)}`;
    container.appendChild(label);
  });
}

function closeEventModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.getElementById('ev-title').value = '';
  document.getElementById('ev-desc').value  = '';
  document.getElementById('ev-date').value  = '';
}

async function submitEvent() {
  const title    = document.getElementById('ev-title').value.trim();
  const desc     = document.getElementById('ev-desc').value.trim();
  const dateVal  = document.getElementById('ev-date').value;
  const checkboxes = document.querySelectorAll('#invite-checkboxes input[type=checkbox]:checked');
  const invites  = Array.from(checkboxes).map(c => c.value);

  if (!title || !desc) { alert('Please fill in title and description'); return; }

  await api('POST', '/api/events', {
    title, description: desc,
    scheduled_at: dateVal || null,
    invites,
  });

  closeEventModal();
  loadEvents();
}

// ── Logout ────────────────────────────────────────────────────────────────────
function logout() {
  localStorage.clear();
  window.location.href = '/';
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ── Mobile tab switching ──────────────────────────────────────────────────────
function mobileTab(tab) {
  document.querySelectorAll('#mobile-nav button').forEach(b => b.classList.remove('active'));
  document.getElementById(`nav-${tab}`).classList.add('active');

  const sidebar   = document.querySelector('.sidebar');
  const chatArea  = document.getElementById('chat-area');
  const townArea  = document.getElementById('town-square-area');

  sidebar.classList.remove('mobile-active');
  chatArea.classList.remove('mobile-active');
  if (townArea) townArea.style.display = 'none';

  if (tab === 'town')    { if (townArea) townArea.style.display = 'flex'; }
  if (tab === 'players') { sidebar.classList.add('mobile-active'); }
  if (tab === 'chat')    { chatArea.classList.add('mobile-active'); scrollToBottom(); }
}

// Init mobile layout on load
if (window.innerWidth <= 860) mobileTab('town');
window.addEventListener('resize', () => {
  if (window.innerWidth > 860) {
    document.querySelector('.sidebar').classList.remove('mobile-active');
    document.getElementById('chat-area').classList.remove('mobile-active');
    const townArea = document.getElementById('town-square-area');
    if (townArea) townArea.style.display = '';
  }
});

// ── Admin Panel ───────────────────────────────────────────────────────────────
function openAdmin() {
  document.getElementById('admin-panel').classList.add('open');
  renderAdminUsers();
}

function closeAdmin() {
  document.getElementById('admin-panel').classList.remove('open');
}

async function renderAdminUsers() {
  const users = await api('GET', '/api/users');
  const list = document.getElementById('admin-user-list');
  list.innerHTML = '';

  users.filter(u => u.username !== 'admin').forEach(u => {
    const isBanned = u.role === 'banned';
    const row = document.createElement('div');
    row.className = 'admin-user-row';
    row.id = `admin-row-${u.username}`;
    row.innerHTML = `
      <span style="font-size:22px">${u.avatar}</span>
      <div class="admin-user-info">
        <div class="uname">${escHtml(u.username)}</div>
        <div class="umeta">Lv.${u.level} ${u.class} · <span style="color:${isBanned?'#e08080':'var(--muted)'}">${u.role}</span></div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <select onchange="changeRole('${escHtml(u.username)}',this)" style="background:var(--panel2);border:1px solid var(--border2);color:var(--text);font-size:11px;padding:3px 6px;border-radius:2px">
          <option value="player"     ${u.role==='player'?'selected':''}>Player</option>
          <option value="gamemaster" ${u.role==='gamemaster'?'selected':''}>Game Master</option>
        </select>
        <button class="btn-sm gold" onclick="adminResetPw('${escHtml(u.username)}')">🔑 Reset PW</button>
        <button class="btn-sm ${isBanned?'accept':'decline'}" onclick="toggleBan('${escHtml(u.username)}',${!isBanned})">
          ${isBanned ? '✅ Unban' : '🚫 Ban'}
        </button>
        <button class="btn-sm decline" onclick="deleteUser('${escHtml(u.username)}')">🗑 Delete</button>
      </div>
    `;
    list.appendChild(row);
  });
}

async function changeRole(username, select) {
  await api('PATCH', `/api/users/${username}/role`, { role: select.value });
  showToast(`${username} is now ${select.value}`);
}

async function toggleBan(username, ban) {
  await api('PATCH', `/api/users/${username}/ban`, { banned: ban });
  showToast(ban ? `🚫 ${username} banned from public chat` : `✅ ${username} unbanned`);
  renderAdminUsers();
}

async function deleteUser(username) {
  if (!confirm(`Delete ${username}'s account permanently? This cannot be undone.`)) return;
  await api('DELETE', `/api/users/${username}`);
  showToast(`🗑 ${username}'s account deleted`);
  renderAdminUsers();
}

async function adminResetPw(username) {
  const newPassword = prompt(`Reset password for ${username}.\nEnter new password (min 4 characters):`);
  if (!newPassword) return;
  if (newPassword.length < 4) { showToast('❌ Password too short'); return; }
  const res = await api('PATCH', `/api/users/${username}/password`, { newPassword });
  if (res.error) { showToast(`❌ ${res.error}`); return; }
  showToast(`🔑 Password reset for ${username}`);
}

// Handle being kicked/banned by server
socket.on('force_logout', ({ reason }) => {
  alert(reason);
  localStorage.clear();
  window.location.href = '/';
});

socket.on('ban_status', ({ banned }) => {
  showToast(banned ? '🚫 You have been banned from public chat' : '✅ Your ban has been lifted');
});

// ── Change Password Modal ─────────────────────────────────────────────────────
function openPwModal() {
  document.getElementById('pw-modal').classList.add('open');
  document.getElementById('pw-current').value = '';
  document.getElementById('pw-new').value = '';
  document.getElementById('pw-confirm').value = '';
  document.getElementById('pw-error').style.display = 'none';
}

function closePwModal() {
  document.getElementById('pw-modal').classList.remove('open');
}

async function submitPwChange() {
  const current = document.getElementById('pw-current').value;
  const newPw   = document.getElementById('pw-new').value;
  const confirm = document.getElementById('pw-confirm').value;
  const errEl   = document.getElementById('pw-error');

  errEl.style.display = 'none';

  if (!current || !newPw || !confirm) {
    errEl.textContent = 'Please fill in all fields.'; errEl.style.display = 'block'; return;
  }
  if (newPw !== confirm) {
    errEl.textContent = 'New passwords do not match.'; errEl.style.display = 'block'; return;
  }
  if (newPw.length < 4) {
    errEl.textContent = 'Password must be at least 4 characters.'; errEl.style.display = 'block'; return;
  }

  const res = await api('PATCH', '/api/users/me/password', { currentPassword: current, newPassword: newPw });
  if (res.error) {
    errEl.textContent = res.error; errEl.style.display = 'block'; return;
  }

  closePwModal();
  showToast('🔑 Password updated successfully!');
}