/* global MONSTER_DEFS, MONSTER_SVGS, PLAYER_SVGS, MONSTER_SKILLS, ZONE_MONSTER_POOL, TIER_COLORS, TIER_BASE_XP, CLASS_SKILLS, ANIM_PROJECTILE, SKILL_TREES, FOREST_ZONES */
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
  // Hall of Fame always visible
  document.getElementById('btn-hof').style.display = '';

  // Load season topic
  loadSeasonBadge();

  // Load data
  // Load forest progress from server before anything tries to render the map
  const progressRes = await api('GET', '/api/me/progress');
  _forestProgress = progressRes?.forest_progress ?? 0;

  await Promise.all([loadUsers(), loadPublicHistory(), loadEvents(), loadMyInvites(), loadQuestLog()]);

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
  loadMyInvites();
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

// ── Character Panel ───────────────────────────────────────────────────────────

// ── Rarity & affix display constants ──────────────────────────────────────────
const RARITY_COLORS = {
  normal:    'rarity-normal',
  magic:     'rarity-magic',
  rare:      'rarity-rare',
  legendary: 'rarity-legendary',
  godly:     'rarity-godly',
};

const RARITY_LABELS = {
  normal: 'Normal', magic: 'Magic', rare: 'Rare', legendary: 'Legendary', godly: 'Godly',
};

const STAT_NAMES = {
  atk_bonus: 'ATK', def_bonus: 'DEF', str_bonus: 'STR',
  dex_bonus: 'DEX', int_bonus: 'INT', spirit_bonus: 'SPIRIT',
  hp_bonus:  'HP',  mp_bonus:  'MP',
};

const SLOT_LABELS = {
  head: 'Head Armour', chest: 'Chest Armour', gloves: 'Gloves',
  pants: 'Leg Armour', boots: 'Boots',
  mainhand: 'Main Hand Weapon', offhand: 'Off Hand',
};

const SLOT_META = {
  head:     { icon: '🪖', label: 'Head'      },
  chest:    { icon: '🦺', label: 'Chest'     },
  gloves:   { icon: '🧤', label: 'Gloves'    },
  pants:    { icon: '👖', label: 'Pants'     },
  boots:    { icon: '👢', label: 'Boots'     },
  mainhand: { icon: '⚔️', label: 'Main Hand' },
  offhand:  { icon: '🛡️', label: 'Off Hand'  },
};
const STAT_META = {
  str:    { icon: '⚔️',  label: 'STR'    },
  dex:    { icon: '🏹',  label: 'DEX'    },
  int:    { icon: '📚',  label: 'INT'    },
  spirit: { icon: '✨',  label: 'SPIRIT' },
  hp:     { icon: '❤️',  label: 'HP'     },
  mp:     { icon: '💧',  label: 'MP'     },
  atk:    { icon: '🗡️',  label: 'ATK'    },
  def:    { icon: '🛡️',  label: 'DEF'    },
};

let charCache   = null;   // cached /api/me/stats response
let charTab     = null;   // currently shown tab
let dragItem    = null;   // { invId, itemSlot } — active drag from inventory

document.getElementById('char-panel').addEventListener('click', e => {
  if (e.target === document.getElementById('char-panel')) closeCharPanel();
});
document.getElementById('hof-panel').addEventListener('click', e => {
  if (e.target === document.getElementById('hof-panel')) closeHallOfFame();
});

async function openCharPanel(tab) {
  document.getElementById('char-panel').classList.add('show');
  document.getElementById('cp-avatar').textContent      = me.avatar || '⚔️';
  document.getElementById('cp-name').textContent        = me.username;
  document.getElementById('cp-class-badge').textContent = me.class || '—';
  document.getElementById('cp-level').textContent       = `Lv.${charCache?.level ?? me.level ?? 1}`;

  if (!charCache) {
    document.getElementById('char-content').innerHTML =
      '<div class="inv-empty">Loading…</div>';
    const [stats, skillData] = await Promise.all([
      api('GET', '/api/me/stats'),
      api('GET', '/api/me/skills'),
    ]);
    charCache = { ...stats, skillData };
  }

  // Update gold display
  const goldEl = document.getElementById('my-gold');
  if (goldEl && charCache?.gold !== undefined) goldEl.textContent = `💰 ${charCache.gold}`;

  switchCharTab(tab);
}

function closeCharPanel() {
  document.getElementById('char-panel').classList.remove('show');
  document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('active'));
}

function switchCharTab(tab) {
  charTab = tab;
  document.querySelectorAll('.char-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  document.querySelectorAll('.char-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.toLowerCase().includes(tab));
  });

  const content = document.getElementById('char-content');
  if (tab === 'equipment') { content.innerHTML = renderCharEquipment(charCache); bindDragDrop(); }
  if (tab === 'skills')    content.innerHTML = renderSkillTree(charCache);
  if (tab === 'quests')    content.innerHTML = renderCharQuests(charCache);
}


function renderCharEquipment(data) {
  if (!data) return '<div class="inv-empty">Could not load equipment.</div>';

  // ── Mannequin slots ──────────────────────────────────────────────────────
  const equipped = {};
  (data.equipped || []).forEach(item => { equipped[item.slot] = item; });

  const slots = Object.entries(SLOT_META).map(([slot, meta]) => {
    const item = equipped[slot];
    const rCls = item ? (RARITY_COLORS[item.rarity] || 'rarity-normal') : '';
    const bonuses = item ? gearBonusStr(item) : '';
    return `<div class="eq-slot" data-slot="${slot}"
      onclick="onSlotClick('${slot}')"
      style="cursor:pointer">
      ${item ? `<div class="eq-slot-icon">${escHtml(item.icon || meta.icon)}</div>` : ''}
      <div class="eq-slot-name">${meta.label}</div>
      <div class="eq-item-name ${rCls}${item ? '' : ' empty'}">${item ? escHtml(item.name) : 'Empty'}</div>
      ${bonuses ? `<div style="font-size:9px;color:var(--gold-d);font-family:'Cinzel',serif;margin-top:2px">${escHtml(bonuses)}</div>` : ''}
    </div>`;
  }).join('');

  const bodySvg = `<svg class="body-svg" viewBox="0 0 120 280" xmlns="http://www.w3.org/2000/svg" fill="rgba(201,168,76,.09)" stroke="rgba(201,168,76,.38)" stroke-width="1.5" stroke-linejoin="round">
    <circle cx="60" cy="22" r="18"/>
    <rect x="53" y="40" width="14" height="11"/>
    <polygon points="25,51 95,51 84,134 36,134"/>
    <polygon points="23,51 9,56 6,116 22,116"/>
    <polygon points="97,51 111,56 114,116 98,116"/>
    <polygon points="36,134 58,134 54,224 32,224"/>
    <polygon points="62,134 84,134 88,224 66,224"/>
    <polygon points="28,224 56,224 58,246 22,246"/>
    <polygon points="64,224 92,224 98,246 62,246"/>
  </svg>`;

  // ── Inventory grid (5 × 20 = 100 cells, scrollable) ─────────────────────
  const inventory = data.inventory || [];
  const cells = [];
  for (let i = 0; i < 100; i++) {
    const inv = inventory[i];
    if (inv) {
      const slotMeta = SLOT_META[inv.slot] || {};
      const rCls = RARITY_COLORS[inv.rarity] || 'rarity-normal';
      cells.push(`<div class="inv-cell has-item"
        draggable="true"
        data-inv-id="${inv.inv_id}"
        data-item-slot="${inv.slot}"
        onclick="onInvCellClick(${inv.inv_id})"
        title="${escHtml(inv.name)}">
        <span class="inv-icon">${escHtml(inv.icon || slotMeta.icon || '🎒')}</span>
        <span class="inv-name ${rCls}">${escHtml(inv.name)}</span>
      </div>`);
    } else {
      cells.push('<div class="inv-cell"></div>');
    }
  }

  // Stats panel for left column — split into Basic (distributable) and Derived
  const s    = data.stats    || {};
  const base = data.classBase || {};
  const dist = data.attrStats || {};
  const ap   = data.attrPoints ?? 0;

  // For each basic stat show: total | base+gear+dist breakdown hint
  const basicRows = [
    ['💪','STR','str'], ['🏹','DEX','dex'], ['📚','INT','int'], ['✨','SP','spirit'],
  ].map(([ic, lb, key]) => {
    const total    = s[key === 'spirit' ? 'spirit' : key] ?? '—';
    const baseVal  = base[key] ?? 0;
    const distVal  = dist[key] ?? 0;
    const hint     = distVal ? `${baseVal}+${distVal}pts` : `base ${baseVal}`;
    const btn      = ap > 0
      ? `<button class="esl-plus" onclick="assignAttrPoint('${key}')" title="Spend 1 attribute point">+</button>`
      : '';
    return `<div class="esl-row">
      <span class="esl-key">${ic} ${lb}</span>
      <span class="esl-hint">${hint}</span>
      <span class="esl-val">${total}</span>${btn}
    </div>`;
  }).join('');

  const derivedRows = [
    ['⚔️','ATK','atk'], ['🛡️','DEF','def'], ['❤️','HP','hp'], ['💧','MP','mp'],
  ].map(([ic, lb, key]) =>
    `<div class="esl-row"><span class="esl-key">${ic} ${lb}</span><span class="esl-val">${s[key]??'—'}</span></div>`
  ).join('');

  const attrBanner = ap > 0
    ? `<div class="esl-attr-banner">✨ ${ap} attribute point${ap > 1 ? 's' : ''} to spend</div>`
    : '';

  const statsPanel = `<div class="equip-stats-left">
    ${attrBanner}
    <div class="esl-section-label">Basic</div>
    ${basicRows}
    <div class="esl-section-label" style="margin-top:6px">Derived</div>
    ${derivedRows}
  </div>`;

  return `<div class="equip-combined">
    <div class="equip-mannequin-col">
      <div class="equip-body-wrap" style="height:340px;position:relative;max-width:none;margin:0">
        ${bodySvg}${slots}
      </div>
      ${statsPanel}
    </div>
    <div class="equip-inventory-col">
      <div class="inv-grid-title">Inventory (${inventory.length}/100) <span style="float:right;color:#f0c040;font-family:'Cinzel',serif">💰 ${data.gold ?? 0}</span></div>
      <div class="inv-grid-scroll"><div class="inv-grid">${cells.join('')}</div></div>
    </div>
  </div>`;
}

async function assignAttrPoint(attr) {
  const res = await api('POST', '/api/me/attributes/assign', { attr });
  if (res.error) { showToast(`❌ ${res.error}`); return; }
  // Re-fetch so derived stats (HP, MP, ATK, DEF) update correctly
  const [stats, skillData] = await Promise.all([
    api('GET', '/api/me/stats'),
    api('GET', '/api/me/skills'),
  ]);
  charCache = { ...stats, skillData };
  switchCharTab('equipment');
}

function gearBonusStr(item) {
  return Object.entries({
    STR: item.str_bonus, DEX: item.dex_bonus, INT: item.int_bonus,
    SP: item.spirit_bonus, HP: item.hp_bonus, MP: item.mp_bonus,
    ATK: item.atk_bonus, DEF: item.def_bonus,
  }).filter(([, v]) => v).map(([k, v]) => `${k}+${v}`).join(' ');
}

// ── Item detail popup ─────────────────────────────────────────────────────────

function onSlotClick(slot) {
  const item = (charCache?.equipped || []).find(i => i.slot === slot);
  if (!item) return; // empty slot — nothing to show
  showItemDetail(item, 'equipped', slot);
}

function onInvCellClick(invId) {
  const item = (charCache?.inventory || []).find(i => i.inv_id === invId);
  if (!item) return;
  showItemDetail(item, 'inventory', invId);
}

function showItemDetail(item, context, key) {
  const rCls   = RARITY_COLORS[item.rarity]  || 'rarity-normal';
  const rLabel = RARITY_LABELS[item.rarity]  || 'Normal';
  const slotLabel = SLOT_LABELS[item.slot] || item.slot;

  // Flat stat bonuses (skip zeros)
  const statRows = Object.entries(STAT_NAMES)
    .filter(([k]) => item[k])
    .map(([k, lbl]) => `<span class="itd-stat">${lbl} +${item[k]}</span>`)
    .join('');

  // Individual affixes
  const affixRows = (item.affixes || []).map(a =>
    `<div class="itd-affix ${a.type}">
       ${escHtml(a.name)}: <b>+${a.value}</b> ${STAT_NAMES[a.stat] || a.stat}
     </div>`
  ).join('');

  const actionBtn = context === 'equipped'
    ? `<button class="itd-btn unequip" onclick="unequipSlot('${key}')">Unequip</button>`
    : `<button class="itd-btn" style="border-color:rgba(74,222,128,.35);color:#4ade80" onclick="closeItemDetail()">Drag to equip ↑</button>`;

  document.getElementById('item-detail').innerHTML = `
    <div class="itd-name ${rCls}">${escHtml(item.name)}</div>
    <div class="itd-type">${rLabel} · ${escHtml(slotLabel)}</div>
    ${item.description ? `<div class="itd-desc">${escHtml(item.description)}</div>` : ''}
    ${statRows ? `<div class="itd-stats">${statRows}</div>` : ''}
    ${affixRows ? `<div class="itd-divider"></div><div class="itd-affixes">${affixRows}</div>` : ''}
    <div class="itd-actions">
      ${actionBtn}
      <button class="itd-btn close-btn" onclick="closeItemDetail()">Close</button>
    </div>`;
  document.getElementById('item-detail').style.display = 'block';
}

function closeItemDetail() {
  document.getElementById('item-detail').style.display = 'none';
}

async function unequipSlot(slot) {
  closeItemDetail();
  const res = await api('DELETE', `/api/me/equipment/${slot}`);
  if (res.error) { showToast(`❌ ${res.error}`); return; }
  charCache = { ...charCache, equipped: res.equipped, inventory: res.inventory, stats: res.stats };
  switchCharTab('equipment');
  showToast(`${SLOT_META[slot]?.label || slot} returned to inventory.`);
}

function renderCharQuests(data) {
  const quests = data?.quests || [];
  if (!quests.length) return '<div class="inv-empty">No active quests, adventurer.</div>';
  return quests.map(q => `
    <div class="quest-entry">
      <div class="quest-entry-title">📜 ${escHtml(q.title)}</div>
      <div class="quest-entry-desc">${escHtml(q.description)}</div>
      <div class="quest-entry-status">● ${q.status.toUpperCase()}</div>
    </div>`
  ).join('');
}

// ── Drag & drop equip ─────────────────────────────────────────────────────────
function bindDragDrop() {
  document.querySelectorAll('.inv-cell[draggable="true"]').forEach(cell => {
    cell.addEventListener('dragstart', e => {
      dragItem = { invId: parseInt(cell.dataset.invId), itemSlot: cell.dataset.itemSlot };
      cell.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    cell.addEventListener('dragend', () => {
      cell.classList.remove('dragging');
      dragItem = null;
    });
  });

  document.querySelectorAll('.eq-slot').forEach(slot => {
    slot.addEventListener('dragover', e => {
      if (dragItem && slot.dataset.slot === dragItem.itemSlot) {
        e.preventDefault();
        slot.classList.add('drag-over');
      }
    });
    slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
    slot.addEventListener('drop', async e => {
      e.preventDefault();
      slot.classList.remove('drag-over');
      if (!dragItem || slot.dataset.slot !== dragItem.itemSlot) return;
      const { invId } = dragItem;
      dragItem = null;
      closeItemDetail();
      const res = await api('POST', `/api/me/inventory/${invId}/equip`, { slot: slot.dataset.slot });
      if (res.error) { showToast(`❌ ${res.error}`); return; }
      // Merge new data into charCache without a full re-fetch
      charCache = { ...charCache, equipped: res.equipped, inventory: res.inventory, stats: res.stats };
      switchCharTab('equipment');
      showToast('⚔ Item equipped!');
    });
  });
}

// ── Gatehouse NPC dialogue ────────────────────────────────────────────────────
const GREGOR_LINES = [
  'Halt, adventurer. I am Captain Gregor, commander of this garrison.',
  'Three hunting parties entered the Darkwood north of town five days ago. Not one soul has returned. The villagers are frightened.',
  'My men are stretched thin guarding the walls. I cannot spare a patrol. Will you venture into the forest and find out what has happened to our people? The town will equip you for the journey.',
];

function openGatehouseDialogue() {
  closeBldPopup();
  const box = document.getElementById('npc-dialogue');
  box.innerHTML = `
    <div class="dlg-npc-name">🪖 Captain Gregor — Commander of the Gatehouse</div>
    <div id="dlg-lines"></div>
    <div id="dlg-choices" class="dlg-choices" style="display:none"></div>`;
  box.style.display = 'block';
  _showDialogueLine(0);
}

function _showDialogueLine(idx) {
  const linesEl   = document.getElementById('dlg-lines');
  const choicesEl = document.getElementById('dlg-choices');
  if (!linesEl) return;

  const p = document.createElement('p');
  p.className = 'dlg-line';
  p.textContent = GREGOR_LINES[idx];
  linesEl.appendChild(p);
  requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('visible')));

  if (idx < GREGOR_LINES.length - 1) {
    setTimeout(() => _showDialogueLine(idx + 1), 1900);
  } else {
    setTimeout(() => {
      if (choicesEl) {
        choicesEl.innerHTML = `
          <button class="dlg-btn yes" onclick="acceptGatehouseQuest()">⚔ Yes — I will find them.</button>
          <button class="dlg-btn no"  onclick="closeDialogue()">✦ Not today, Captain.</button>`;
        choicesEl.style.display = 'flex';
      }
    }, 1200);
  }
}

function closeDialogue() {
  document.getElementById('npc-dialogue').style.display = 'none';
}

async function acceptGatehouseQuest() {
  closeDialogue();
  const res = await api('POST', '/api/me/quests/gatehouse', {});
  if (res.error) { showToast(`❌ ${res.error}`); return; }
  if (res.alreadyAccepted) { showToast('You are already on this quest.'); return; }
  const names = (res.items || []).map(i => i.name).join(', ');
  showToast(`📜 Quest accepted! Received: ${names}`);
  charCache = null;   // force refresh on next panel open
  await loadQuestLog();
  updateDarkForestHotspot();
}

// ── Quest log (sidebar) ───────────────────────────────────────────────────────
async function loadQuestLog() {
  const data = await api('GET', '/api/me/stats');
  if (!charCache) charCache = data;
  const quests = data.quests || [];
  const section = document.getElementById('quest-log-section');
  const list    = document.getElementById('quest-log-list');
  if (!section || !list) return;
  if (!quests.length) { section.style.display = 'none'; return; }
  section.style.display = '';
  list.innerHTML = quests.map(q => `
    <div class="ql-card">
      <span class="ql-icon">📜</span>
      <div>
        <div class="ql-title">${escHtml(q.title)}</div>
        <div class="ql-status">● ${q.status.toUpperCase()}</div>
      </div>
    </div>`).join('');
  updateDarkForestHotspot();
}

// ── Skill Tree ─────────────────────────────────────────────────────────────

let selectedSkillNode = null;

function renderSkillTree(data) {
  if (!data) return '<div class="inv-empty">Could not load skill data.</div>';
  const cls      = data.class || 'Warrior';
  const tree     = SKILL_TREES[cls] || [];
  const skillData = data.skillData || { unspentPoints: 0, allocated: {} };
  const allocated = skillData.allocated || {};
  const unspent   = skillData.unspentPoints || 0;

  // Group by col, sort by tier
  const cols = {};
  tree.forEach(n => { (cols[n.col] = cols[n.col] || []).push(n); });
  Object.values(cols).forEach(c => c.sort((a, b) => a.tier - b.tier));
  const colKeys = Object.keys(cols).map(Number).sort();

  // Build columns HTML
  let colsHtml = '';
  for (const c of colKeys) {
    const nodes = cols[c];
    let colHtml = '';
    nodes.forEach((node, idx) => {
      const pts      = allocated[node.id] || 0;
      const reqsMet  = node.requires.every(r => (allocated[r.id] || 0) >= r.pts);
      const canAssign = unspent > 0 && reqsMet && pts < node.maxPoints;
      const isLocked  = pts === 0 && !reqsMet;

      let cls2 = 'st-node';
      cls2 += node.type === 'active' ? ' skill-active' : ' skill-passive';
      if (isLocked)   cls2 += ' locked';
      if (pts > 0)    cls2 += ' has-points';
      if (pts >= node.maxPoints) cls2 += ' maxed';
      if (canAssign)  cls2 += ' can-assign';

      const dotType = node.type === 'active' ? 'active-type' : 'passive-type';
      const dots = Array.from({ length: node.maxPoints }, (_, i) =>
        `<span class="st-dot${i < pts ? ` filled ${dotType}` : ''}"></span>`
      ).join('');

      const typeLabel = node.type === 'active' ? '⚡ Active' : '🔷 Passive';

      // Connector from previous node in same column
      if (idx > 0) {
        const prevNode = nodes[idx - 1];
        const prevPts  = allocated[prevNode.id] || 0;
        const connActive = prevPts >= (node.requires.find(r => r.id === prevNode.id)?.pts || 1);
        colHtml += `<div class="st-connector${connActive ? ' active' : ''}"></div>`;
      }

      colHtml += `<div class="${cls2}" data-node-id="${node.id}" onclick="selectSkillNode('${node.id}')">
        <div class="st-node-icon">${node.icon}</div>
        <div class="st-node-name">${escHtml(node.name)}</div>
        <div class="st-node-type">${typeLabel}</div>
        <div class="st-dots">${dots}</div>
      </div>`;
    });
    colsHtml += `<div class="st-col">${colHtml}</div>`;
  }

  const ptLabel = unspent === 1 ? '1 point' : `${unspent} points`;
  return `<div class="st-wrapper">
    <div class="st-header">
      <span class="st-class-name">${escHtml(data.class || '—')} Skill Tree</span>
      <span class="st-points-badge">⭐ ${ptLabel} available</span>
    </div>
    <div class="st-tree">${colsHtml}</div>
    <div class="st-detail" id="st-detail-panel">
      <div class="st-detail-empty">Click a skill to see details.</div>
    </div>
  </div>`;
}

function selectSkillNode(nodeId) {
  const cls    = charCache?.class || 'Warrior';
  const tree   = SKILL_TREES[cls] || [];
  const node   = tree.find(n => n.id === nodeId);
  if (!node) return;

  selectedSkillNode = nodeId;
  const skillData = charCache?.skillData || { unspentPoints: 0, allocated: {} };
  const allocated  = skillData.allocated || {};
  const unspent    = skillData.unspentPoints || 0;
  const pts        = allocated[nodeId] || 0;
  const reqsMet    = node.requires.every(r => (allocated[r.id] || 0) >= r.pts);
  const canAssign  = unspent > 0 && reqsMet && pts < node.maxPoints;

  // Highlight selected node
  document.querySelectorAll('.st-node').forEach(el => el.classList.remove('selected-node'));
  document.querySelector(`[data-node-id="${nodeId}"]`)?.classList.add('selected-node');

  let reqText = '';
  if (node.requires.length) {
    reqText = node.requires.map(r => {
      const rNode = tree.find(n => n.id === r.id);
      return `${rNode?.name || r.id} ≥ ${r.pts}`;
    }).join(', ');
  }

  let benefitText = '';
  if (node.type === 'passive') {
    const p = node.passive;
    const parts = [];
    if (p.atk)    parts.push(`+${p.atk} ATK`);
    if (p.def)    parts.push(`+${p.def} DEF`);
    if (p.spirit) parts.push(`+${p.spirit} Spirit`);
    if (p.maxHp)  parts.push(`+${p.maxHp} Max HP`);
    if (p.maxMp)  parts.push(`+${p.maxMp} Max MP`);
    if (p.defPct) parts.push(`-${p.defPct}% damage taken`);
    benefitText = `Per point: ${parts.join(', ')}`;
  } else if (node.skill) {
    const s = node.skill;
    if (s.heal) {
      benefitText = `Current heal: Spirit × ${s.baseHealMult + pts * s.healPerPt}${pts < node.maxPoints ? ` → next: ×${s.baseHealMult + (pts + 1) * s.healPerPt}` : ' (max)'}`;
    } else {
      const cur = (s.baseDmg + Math.max(0, pts - 1) * s.dmgPerPt).toFixed(2);
      const nxt = (s.baseDmg + pts * s.dmgPerPt).toFixed(2);
      benefitText = pts > 0
        ? `DMG ×${cur}${pts < node.maxPoints ? ` → next: ×${nxt}` : ' (max)'}`
        : `DMG ×${s.baseDmg.toFixed(2)} at rank 1`;
    }
  }

  const disabledReason = !reqsMet
    ? `Requires: ${reqText}`
    : unspent <= 0
    ? 'No skill points available'
    : pts >= node.maxPoints
    ? 'Already at maximum rank'
    : '';

  const panel = document.getElementById('st-detail-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="st-detail-name">${node.icon} ${escHtml(node.name)}</div>
    <div class="st-detail-meta">${node.type === 'active' ? '⚡ Active Skill' : '🔷 Passive Bonus'} · Rank ${pts}/${node.maxPoints}${reqText ? ` · Requires: ${escHtml(reqText)}` : ''}</div>
    <div class="st-detail-desc">${escHtml(node.desc)}</div>
    ${benefitText ? `<div class="st-detail-pts">${escHtml(benefitText)}</div>` : ''}
    <button class="st-assign-btn" onclick="assignSkillPoint('${node.id}')"
      ${canAssign ? '' : 'disabled'}>${canAssign ? `Assign Point (${unspent} left)` : escHtml(disabledReason)}</button>
  `;
}

async function assignSkillPoint(nodeId) {
  const res = await api('POST', '/api/me/skills/assign', { nodeId });
  if (res.error) { showToast(`❌ ${res.error}`); return; }

  // Update cache
  charCache.skillData = {
    unspentPoints: res.unspentPoints,
    allocated: { ...(charCache.skillData?.allocated || {}), [res.nodeId]: res.points },
  };

  // Re-render tree and re-select the node to refresh detail panel
  document.getElementById('char-content').innerHTML = renderSkillTree(charCache);
  selectSkillNode(nodeId);
}

// ── Combat: effective stats with passive bonuses ────────────────────────────

function getEffectiveStats(data) {
  const base = { ...(data?.stats || { hp:50, mp:20, atk:10, def:5, spirit:5 }) };
  const tree  = SKILL_TREES[data?.class] || [];
  const alloc = data?.skillData?.allocated || {};

  tree.forEach(node => {
    if (node.type !== 'passive') return;
    const pts = alloc[node.id] || 0;
    if (pts <= 0) return;
    const p = node.passive;
    if (p.atk)    base.atk    += p.atk    * pts;
    if (p.def)    base.def    += p.def    * pts;
    if (p.spirit) base.spirit += p.spirit * pts;
    if (p.maxHp)  { base.hp  += p.maxHp  * pts; base.max_hp = (base.max_hp || base.hp) + p.maxHp * pts; }
    if (p.maxMp)  base.mp    += p.maxMp  * pts;
    if (p.defPct) base.defPct = (base.defPct || 0) + p.defPct * pts;
  });
  return base;
}

// ── Combat: player skill list including unlocked tree actives ───────────────

function getPlayerCombatSkills(data) {
  const base  = CLASS_SKILLS[data?.class] || CLASS_SKILLS.Warrior;
  const tree  = SKILL_TREES[data?.class] || [];
  const alloc = data?.skillData?.allocated || {};

  const treeSkills = tree
    .filter(n => n.type === 'active' && (alloc[n.id] || 0) > 0)
    .map(n => {
      const pts = alloc[n.id];
      const s   = n.skill;
      const dmgMult = s.heal ? 0 : (s.baseDmg + (pts - 1) * (s.dmgPerPt || 0));
      const healMult = s.heal ? (s.baseHealMult + (pts - 1) * (s.healPerPt || 0)) : undefined;
      return {
        id:       s.id,
        name:     s.name,
        mpCost:   s.mpCost,
        type:     s.type,
        target:   s.target,
        heal:     s.heal || false,
        healMult,
        dmgMult,
      };
    });

  return [...base, ...treeSkills];
}

// ── Dark Forest ───────────────────────────────────────────────────────────────

function updateDarkForestHotspot() {
  const quests = charCache?.quests || [];
  const active = quests.some(q => q.quest_key === 'gatehouse_patrol' && q.status === 'active');
  const hs = document.getElementById('dark-forest-hs');
  if (hs) hs.style.display = active ? 'flex' : 'none';
}

// Zone definitions — positions mapped to dark-forest.jpg
// Entry: lower-right clearing where the path meets the treeline
// Mid:   center-left winding path through dense canopy
// Deep:  upper-left shadow pocket under the ancient trees
// Demon: upper-center, deepest dark at the heart of the forest
const FOREST_ZONES = [
  { id: 'entry', name: 'Forest Entry',          sub: 'Where the path meets the trees',   pos: { left:'68%', top:'70%' } },
  { id: 'mid',   name: 'Mid-Forest',             sub: 'Twisted canopy · Paths diverge',   pos: { left:'38%', top:'52%' } },
  { id: 'deep',  name: 'Deep Forest',            sub: 'Ancient dark · Few return',        pos: { left:'22%', top:'33%' }, danger: true },
  { id: 'demon', name: '☠ Demon in the Forest',  sub: '??? · Do not face it alone',      pos: { left:'50%', top:'12%' }, danger: true },
];

// Forest progress is stored server-side; cached locally for sync reads during a session
let _forestProgress = 0;

function getForestProgress() { return _forestProgress; }

async function setForestProgress(v) {
  _forestProgress = v;
  await api('POST', '/api/me/progress', { forest_progress: v });
}

function renderForestMap() {
  const progress = getForestProgress();
  document.getElementById('fm-zones').innerHTML = FOREST_ZONES.map((z, i) => {
    const locked    = i > progress;
    const completed = i < progress;
    const dangerCls = z.danger && !locked ? ' danger' : '';
    const stateCls  = locked ? ' locked' : completed ? ' done' : '';
    const clickAttr = locked ? '' : `onclick="onForestZoneClick('${z.id}')"`;
    return `<div class="fm-zone${dangerCls}${stateCls}" style="left:${z.pos.left};top:${z.pos.top}" ${clickAttr}>
      <div class="fm-zone-label">
        ${locked    ? '<div class="fm-lock">🔒</div>' : ''}
        ${completed ? '<div class="fm-done">✓</div>'  : ''}
        <div class="fm-zone-name">${z.name}</div>
        <div class="fm-zone-sub">${locked ? 'Complete previous area first' : z.sub}</div>
      </div>
      <div class="fm-connector"></div>
    </div>`;
  }).join('');
}

let _forestTimer = null;

function openDarkForest() {
  // Ensure charCache has current HP before any fight starts (5s loading window is enough)
  if (!charCache) {
    Promise.all([api('GET', '/api/me/stats'), api('GET', '/api/me/skills')])
      .then(([stats, skillData]) => { charCache = { ...stats, skillData }; })
      .catch(() => {});
  }

  const overlay = document.getElementById('forest-overlay');
  const loading = document.getElementById('forest-loading');
  const map     = document.getElementById('forest-map');
  overlay.style.display = 'block';
  loading.style.display = '';
  map.style.display = 'none';

  const bar = document.getElementById('fld-bar');
  bar.style.transition = 'none';
  bar.style.width = '0%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.style.transition = 'width 5s linear';
    bar.style.width = '100%';
  }));

  clearTimeout(_forestTimer);
  _forestTimer = setTimeout(() => {
    loading.style.display = 'none';
    map.style.display = 'block';
    renderForestMap();
  }, 5000);
}

function closeDarkForest() {
  clearTimeout(_forestTimer);
  document.getElementById('forest-overlay').style.display = 'none';
  document.getElementById('forest-loading').style.display = '';
  document.getElementById('forest-map').style.display = 'none';
}

function onForestZoneClick(id) {
  const idx      = FOREST_ZONES.findIndex(z => z.id === id);
  const progress = getForestProgress();
  if (idx > progress) { showToast('🔒 Complete the previous area first.'); return; }
  startCombat(id);
}

// ── Combat system ─────────────────────────────────────────────────────────────

let combatState = null;

function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

function monsterEl(idx)  { return document.getElementById(`cb-mon-fig-${idx}`); }
function monsterCard(idx){ return document.getElementById(`cb-mon-card-${idx}`); }

function startCombat(zoneId) {
  const pool = ZONE_MONSTER_POOL[zoneId];
  if (!pool?.length) { showToast('⚠ This area is not yet implemented.'); return; }

  const stats = getEffectiveStats(charCache);
  const cls   = charCache?.class || 'Warrior';

  // Spawn 1-3 monsters (single-monster zones like B-tier still cap at 1)
  const maxCount = pool.length === 1 ? 1 : randInt(1, 3);
  const monsters = Array.from({ length: maxCount }, () => {
    const id   = pool[randInt(0, pool.length - 1)];
    const base = MONSTER_DEFS[id];
    const lv   = base.level || 1;
    const hp   = Math.round(base.hp  * (1 + (lv - 1) * 0.15));
    const atk  = Math.round(base.atk * (1 + (lv - 1) * 0.10));
    const def  = Math.round(base.def * (1 + (lv - 1) * 0.10));
    const xp   = Math.round((TIER_BASE_XP[base.tier] || 5) * (1 + (lv - 1) * 0.2));
    return { ...base, monsterId: id, hp, atk, def, xp, curHp: hp };
  });

  const firstTier = monsters[0].tier;
  const tc = TIER_COLORS[firstTier] || TIER_COLORS.D;

  combatState = {
    zoneId,
    zoneIdx:  FOREST_ZONES.findIndex(z => z.id === zoneId),
    monsters,
    player:   { curHp: charCache?.curHp ?? stats.hp, maxHp: stats.hp, curMp: stats.mp, maxMp: stats.mp, class: cls, stats },
    phase:    'player',
    log:      [],
    busy:     false,
  };

  // Header
  const zone  = FOREST_ZONES.find(z => z.id === zoneId);
  const badge = document.getElementById('cb-tier-badge');
  badge.textContent      = `Tier ${firstTier}`;
  badge.className        = `cb-tier cb-tier-${firstTier}`;
  badge.style.background = tc.bg;
  badge.style.color      = tc.text;
  document.getElementById('cb-zone-label').textContent = zone?.name || zoneId;

  // Player figure — clear death animation from previous fight before injecting SVG
  const pfig = document.getElementById('cb-player-figure');
  pfig.classList.remove('anim-death');
  pfig.style.opacity = '';
  pfig.style.transform = '';
  pfig.innerHTML = PLAYER_SVGS[cls] || PLAYER_SVGS.Warrior;

  document.getElementById('cb-player-name').textContent = `${me.username} · ${cls}`;

  // Monster cards
  renderMonsterCards();

  const names = monsters.map(m => m.name).join(', ');
  addCombatLog(`⚔ ${maxCount > 1 ? `${maxCount} enemies appear` : `A ${names} appears`}!`);
  renderCombatBars();
  renderSkillButtons();

  document.getElementById('combat-overlay').style.display = 'flex';
}

function renderMonsterCards() {
  const area = document.getElementById('cb-monsters-area');
  const count = combatState.monsters.length;
  area.className = `monsters-${count}`;
  area.innerHTML = combatState.monsters.map((mon, i) => {
    const tc = TIER_COLORS[mon.tier] || TIER_COLORS.D;
    return `<div class="cb-monster-card" id="cb-mon-card-${i}" onclick="onMonsterClick(${i})">
      <div id="cb-mon-fig-${i}" class="cb-monster-figure">${MONSTER_SVGS[mon.monsterId] || ''}</div>
      <div class="cb-name">${escHtml(mon.name)}</div>
      <span class="cb-tier" style="background:${tc.bg};color:${tc.text};font-size:9px;padding:1px 6px">${mon.tier} · Lv.${mon.level}</span>
      <div class="cb-bar-track" style="width:80px">
        <div id="cb-mon-hp-${i}" class="cb-bar-fill cb-hp-fill" style="width:100%"></div>
      </div>
      <span id="cb-mon-hp-num-${i}" class="cb-bar-num" style="font-size:8px">${mon.hp}/${mon.hp}</span>
    </div>`;
  }).join('');
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function addCombatLog(msg) {
  combatState.log.push(msg);
  const inner = document.getElementById('cb-log-inner');
  if (!inner) return;
  const lines = combatState.log.slice(-6);
  inner.innerHTML = lines.map((l, i) =>
    `<div class="cb-log-line${i === lines.length - 1 ? ' new' : ''}">${escHtml(l)}</div>`
  ).join('');
  inner.parentElement.scrollTop = inner.parentElement.scrollHeight;
}

function renderCombatBars() {
  const p   = combatState.player;
  const pct = (cur, max) => `${Math.max(0, Math.min(100, (cur / max) * 100))}%`;

  document.getElementById('cb-player-hp-fill').style.width = pct(p.curHp, p.maxHp);
  document.getElementById('cb-player-mp-fill').style.width = pct(p.curMp, p.maxMp);
  document.getElementById('cb-player-hp-num').textContent  = `${Math.max(0,p.curHp)}/${p.maxHp}`;
  document.getElementById('cb-player-mp-num').textContent  = `${p.curMp}/${p.maxMp}`;

  combatState.monsters.forEach((mon, i) => {
    const fill = document.getElementById(`cb-mon-hp-${i}`);
    const num  = document.getElementById(`cb-mon-hp-num-${i}`);
    const card = monsterCard(i);
    if (fill) fill.style.width = pct(mon.curHp, mon.hp);
    if (num)  num.textContent  = `${Math.max(0, mon.curHp)}/${mon.hp}`;
    if (card) card.className   = `cb-monster-card${mon.curHp <= 0 ? ' dead' : ''}`;
  });
}

function renderSkillButtons() {
  const el = document.getElementById('combat-skills');
  if (!el || !combatState) return;
  if (combatState.phase === 'win')  { el.innerHTML = '<div class="cb-phase-msg" style="color:var(--gold)">🏆 Victory!</div>'; return; }
  if (combatState.phase === 'lose') { el.innerHTML = '<div class="cb-phase-msg" style="color:#e07070">💀 Defeated...</div>'; return; }
  if (combatState.targetMode) {
    el.innerHTML = `<div class="cb-phase-msg" style="color:#8aaccc;font-size:12px">
      🎯 Select a target&hellip;
      <button class="skill-btn" style="margin-left:10px;padding:4px 12px;font-size:10px" onclick="cancelTargetMode()">✕ Cancel</button>
    </div>`;
    return;
  }
  const busy   = combatState.busy || combatState.phase !== 'player';
  const skills = getPlayerCombatSkills(charCache);
  el.innerHTML = skills.map(sk => {
    const noMp   = sk.mpCost > 0 && combatState.player.curMp < sk.mpCost;
    const tgtTag = sk.heal ? '💚 Self' : sk.target === 'all' ? '◎ All' : '◉ Single';
    return `<button class="skill-btn${noMp ? ' no-mp' : ''}"
      onclick="useSkill('${sk.id}')" ${(busy || noMp) ? 'disabled' : ''}>
      ${escHtml(sk.name)}
      <span class="sk-cost">${sk.mpCost ? `${sk.mpCost} MP` : 'Free'}</span>
      <span class="sk-target">${tgtTag}</span>
    </button>`;
  }).join('');
}

// ── Animations ────────────────────────────────────────────────────────────────

function spawnFxText(text, color) {
  const fx = document.getElementById('cb-fx');
  if (!fx) return;
  const el = Object.assign(document.createElement('div'), { className:'cb-dmg-text', textContent:text });
  el.style.color = color || '#fff';
  fx.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function spawnProjectile(icon, fromLeft) {
  const fx = document.getElementById('cb-fx');
  if (!fx) return new Promise(r => setTimeout(r, 420));
  return new Promise(resolve => {
    const p = Object.assign(document.createElement('span'), { className:'cb-proj', textContent:icon });
    fx.appendChild(p);
    p.animate(
      [{ left: fromLeft ? '5%' : '90%' }, { left: fromLeft ? '90%' : '5%' }],
      { duration: 420, easing:'ease-in', fill:'forwards' }
    ).onfinish = () => { p.remove(); resolve(); };
  });
}

function addAnim(el, cls, ms) {
  if (!el) return;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

// playerAttacking: true = player attacks monster(s), false = monster[monIdx] attacks player
// monIdx: number for single target, 'all' for AoE (player attacking only)
async function doAnimation(type, playerAttacking, monIdx = 0) {
  const pfig  = document.getElementById('cb-player-figure');
  const aoe   = monIdx === 'all';
  const mfig  = aoe ? null : monsterEl(monIdx);
  const atkEl = playerAttacking ? pfig : mfig;
  const proj  = ANIM_PROJECTILE[type];

  // Collect defender elements (array for unified hit logic)
  const defEls = aoe
    ? combatState.monsters.map((m, i) => m.curHp > 0 ? monsterEl(i) : null).filter(Boolean)
    : [playerAttacking ? mfig : pfig];

  function hitAll(cls, ms) { defEls.forEach(el => addAnim(el, cls, ms)); }

  switch (type) {
    case 'melee': case 'bash': case 'stab':
      addAnim(atkEl, playerAttacking ? 'anim-atk-r' : 'anim-atk-l', 700);
      await new Promise(r => setTimeout(r, 340));
      hitAll('anim-hit', 400); hitAll('anim-shake', 450);
      await new Promise(r => setTimeout(r, 400));
      break;
    case 'arrow': case 'pierce':
      await spawnProjectile(proj, playerAttacking);
      hitAll('anim-hit', 400); hitAll('anim-shake', 350);
      await new Promise(r => setTimeout(r, 380));
      break;
    case 'magic': case 'burst': case 'curse':
      addAnim(atkEl, 'anim-magic', 550);
      await new Promise(r => setTimeout(r, 140));
      await spawnProjectile(proj, playerAttacking);
      hitAll('anim-hit', 400);
      await new Promise(r => setTimeout(r, 340));
      break;
    case 'fire':
      addAnim(atkEl, 'anim-fire', 550);
      await new Promise(r => setTimeout(r, 140));
      await spawnProjectile(proj, playerAttacking);
      hitAll('anim-hit', 400); hitAll('anim-shake', 400);
      await new Promise(r => setTimeout(r, 340));
      break;
    case 'holy':
      addAnim(atkEl, 'anim-holy', 550);
      await new Promise(r => setTimeout(r, 140));
      await spawnProjectile(proj, playerAttacking);
      hitAll('anim-hit', 400);
      await new Promise(r => setTimeout(r, 340));
      break;
    case 'heal':
      addAnim(atkEl, 'anim-heal', 650);
      await new Promise(r => setTimeout(r, 650));
      break;
    default:
      await new Promise(r => setTimeout(r, 400));
  }
}

// ── Turn logic ────────────────────────────────────────────────────────────────

function useSkill(skillId) {
  if (!combatState || combatState.busy || combatState.phase !== 'player') return;
  const skills = getPlayerCombatSkills(charCache);
  const skill  = skills.find(s => s.id === skillId);
  if (!skill) return;
  if (skill.mpCost > combatState.player.curMp) { showToast('❌ Not enough MP!'); return; }

  // Single-target with multiple live enemies → ask player to pick
  if (!skill.heal && skill.target === 'single') {
    const aliveCount = combatState.monsters.filter(m => m.curHp > 0).length;
    if (aliveCount > 1) {
      combatState.targetMode = { skillId };
      document.getElementById('cb-monsters-area').classList.add('target-selecting');
      renderSkillButtons();
      return;
    }
  }

  executeSkill(skillId);
}

// Called when a monster card is clicked
function onMonsterClick(idx) {
  const mon = combatState?.monsters[idx];
  if (!mon || mon.curHp <= 0) return;
  if (!combatState.targetMode) return;
  const { skillId } = combatState.targetMode;
  combatState.targetMode = null;
  document.getElementById('cb-monsters-area').classList.remove('target-selecting');
  executeSkill(skillId, idx);
}

function cancelTargetMode() {
  if (!combatState?.targetMode) return;
  combatState.targetMode = null;
  document.getElementById('cb-monsters-area').classList.remove('target-selecting');
  renderSkillButtons();
}

async function executeSkill(skillId, targetIdx = null) {
  const skills = getPlayerCombatSkills(charCache);
  const skill  = skills.find(s => s.id === skillId);

  combatState.busy = true;
  combatState.player.curMp -= skill.mpCost;
  renderSkillButtons();
  renderCombatBars();

  // ── Self-heal ──────────────────────────────────────────────────────────────
  if (skill.heal) {
    await doAnimation(skill.type, true, 0);
    const mult = skill.healMult || 3;
    const amt = Math.floor(combatState.player.stats.spirit * mult);
    combatState.player.curHp = Math.min(combatState.player.maxHp, combatState.player.curHp + amt);
    addCombatLog(`💚 ${skill.name}: +${amt} HP`);
    spawnFxText(`+${amt}`, '#4ade80');

  // ── AoE attack ────────────────────────────────────────────────────────────
  } else if (skill.target === 'all') {
    const alive = combatState.monsters.map((m, i) => ({ m, i })).filter(({ m }) => m.curHp > 0);
    if (!alive.length) { await handleCombatWin(); return; }

    await doAnimation(skill.type, true, 'all');

    const label = alive.length > 1 ? 'all enemies' : alive[0].m.name;
    addCombatLog(`⚔ ${skill.name} hits ${label}!`);
    for (const { m: target, i: ti } of alive) {
      const raw = Math.floor(combatState.player.stats.atk * skill.dmgMult)
                  - Math.floor(target.def * 0.5) + randInt(-3, 3);
      const dmg = Math.max(1, raw);
      target.curHp -= dmg;
      addCombatLog(`  ${target.name}: −${dmg}`);
      spawnFxText(`-${dmg}`, '#ff6060');
      if (target.curHp <= 0) {
        target.curHp = 0;
        const fig = monsterEl(ti);
        if (fig) fig.classList.add('anim-death');
        addCombatLog(`💀 ${target.name} is defeated!`);
      }
    }
    if (alive.some(({ m }) => m.curHp <= 0)) await new Promise(r => setTimeout(r, 600));

  // ── Single-target attack ───────────────────────────────────────────────────
  } else {
    if (targetIdx === null) targetIdx = combatState.monsters.findIndex(m => m.curHp > 0);
    if (targetIdx === -1)  { await handleCombatWin(); return; }
    const target = combatState.monsters[targetIdx];

    await doAnimation(skill.type, true, targetIdx);

    const raw = Math.floor(combatState.player.stats.atk * skill.dmgMult)
                - Math.floor(target.def * 0.5) + randInt(-3, 3);
    const dmg = Math.max(1, raw);
    target.curHp -= dmg;
    addCombatLog(`⚔ ${skill.name} hits ${target.name}: −${dmg}`);
    spawnFxText(`-${dmg}`, '#ff6060');
    if (target.curHp <= 0) {
      target.curHp = 0;
      const fig = monsterEl(targetIdx);
      if (fig) fig.classList.add('anim-death');
      addCombatLog(`💀 ${target.name} is defeated!`);
      await new Promise(r => setTimeout(r, 600));
    }
  }

  renderCombatBars();
  if (combatState.monsters.every(m => m.curHp <= 0)) { await handleCombatWin(); return; }

  combatState.phase = 'enemy';
  renderSkillButtons();
  await new Promise(r => setTimeout(r, 400));
  await monsterTurn();
}

async function monsterTurn() {
  // Each alive monster attacks in sequence
  for (let i = 0; i < combatState.monsters.length; i++) {
    const mon = combatState.monsters[i];
    if (mon.curHp <= 0) continue;

    const mSkills = mon.skills.map(id => MONSTER_SKILLS[id]).filter(Boolean);
    const skill   = mSkills[randInt(0, mSkills.length - 1)];

    await doAnimation(skill.type, false, i);

    const raw    = Math.floor(mon.atk * skill.dmgMult)
                   - Math.floor(combatState.player.stats.def * 0.5) + randInt(-2, 2);
    const defPct = (combatState.player.stats.defPct || 0) / 100;
    const dmg    = Math.max(1, Math.floor(Math.max(1, raw) * (1 - defPct)));
    combatState.player.curHp -= dmg;
    addCombatLog(`${mon.name} uses ${skill.name}: −${dmg}`);
    spawnFxText(`-${dmg}`, '#ff4444');
    renderCombatBars();

    if (combatState.player.curHp <= 0) { await handleCombatLose(); return; }
    await new Promise(r => setTimeout(r, 280));
  }

  combatState.phase = 'player';
  combatState.busy  = false;
  renderSkillButtons();
}

async function handleCombatWin() {
  combatState.phase = 'win';
  combatState.busy  = false;
  renderSkillButtons();
  const totalXp = combatState.monsters.reduce((s, m) => s + m.xp, 0);
  addCombatLog(`🏆 All enemies defeated! +${totalXp} XP`);

  // Save XP, then save loot — both must complete before we fetch fresh stats
  const xpRes = await api('POST', '/api/me/xp', { xp: totalXp }).catch(() => null);
  const leveledUp   = xpRes?.newSkillPoints > 0;

  const monsterList = combatState.monsters.map(m => ({ monsterId: m.monsterId, tier: m.tier }));
  const lootRes     = await api('POST', '/api/me/loot', { monsters: monsterList }).catch(() => null);

  // Fetch fresh stats NOW — items are already in the DB, this is guaranteed correct
  const [freshStats, freshSkills] = await Promise.all([
    api('GET', '/api/me/stats').catch(() => null),
    api('GET', '/api/me/skills').catch(() => null),
  ]);
  if (freshStats && freshSkills) {
    charCache = { ...freshStats, skillData: freshSkills };
    const goldEl = document.getElementById('my-gold');
    if (goldEl) goldEl.textContent = `💰 ${charCache.gold || 0}`;
  }

  if (leveledUp) {
    showToast(`🎉 Level up! +${xpRes.newSkillPoints} skill point${xpRes.newSkillPoints > 1 ? 's' : ''}, +${xpRes.newAttrPoints ?? 5} attribute points!`);
  }

  combatState._pendingZoneIdx = combatState.zoneIdx;

  // If inventory is over 100, make player drop items before seeing loot
  const inv = charCache?.inventory || [];
  if (inv.length > 100) {
    showBagFullModal(lootRes);
  } else {
    showLootPanel(lootRes);
  }
}

function showBagFullModal(lootRes) {
  _bagLootRes = lootRes;
  const over  = (charCache?.inventory || []).length - 100;
  document.getElementById('bag-full-modal').style.display = 'flex';
  renderBagFullList(over, lootRes);
}

function renderBagFullList(over, lootRes) {
  const inv = charCache?.inventory || [];
  const el   = document.getElementById('bag-full-list');
  const hdr  = document.getElementById('bag-full-count');

  hdr.textContent = over > 0
    ? `Bag full! Drop ${over} item${over > 1 ? 's' : ''} to continue.`
    : '✅ Bag cleared — collect your loot!';
  hdr.style.color = over > 0 ? '#e08080' : '#4eff91';

  const btn = document.getElementById('bag-full-done');
  btn.disabled   = over > 0;
  btn.style.opacity = over > 0 ? '0.4' : '1';
  btn.onclick = () => {
    document.getElementById('bag-full-modal').style.display = 'none';
    showLootPanel(lootRes);
  };

  el.innerHTML = inv.map(item => {
    const rCls = RARITY_COLORS[item.rarity] || 'rarity-normal';
    const meta = SLOT_META[item.slot] || {};
    return `<div class="bf-row" id="bf-row-${item.inv_id}">
      <span class="bf-icon">${escHtml(item.icon || meta.icon || '🎒')}</span>
      <div class="bf-info">
        <span class="bf-name ${rCls}">${escHtml(item.name)}</span>
        <span class="bf-slot">${escHtml(meta.label || item.slot)}</span>
      </div>
      <button class="bf-drop-btn" onclick="bagDropItem(${item.inv_id})">Drop</button>
    </div>`;
  }).join('');
}

let _bagLootRes = null;  // holds lootRes across drop actions

async function bagDropItem(invId) {
  const res = await api('DELETE', `/api/me/inventory/${invId}`);
  if (res.error) { showToast(`❌ ${res.error}`); return; }
  charCache = { ...charCache, inventory: (charCache.inventory || []).filter(i => i.inv_id !== invId) };
  renderBagFullList(charCache.inventory.length - 100, _bagLootRes);
}

function showLootPanel(lootRes) {
  const skillsEl = document.getElementById('combat-skills');
  if (!skillsEl) return;

  const items  = lootRes?.items || [];
  const gold   = lootRes?.gold  || 0;
  const rarity = { normal:'', uncommon:'color:#1eff00', rare:'color:#0070dd', epic:'color:#a335ee', legendary:'color:#ff8000' };

  const itemsHtml = items.length
    ? items.map(it => `<div class="cb-loot-item">
        <span class="cb-loot-item-icon">${escHtml(it.icon || '🎒')}</span>
        <span class="cb-loot-item-name" style="${rarity[it.rarity]||''}">${escHtml(it.name)}</span>
      </div>`).join('')
    : '<div class="cb-loot-empty">No items dropped.</div>';

  skillsEl.innerHTML = `<div id="cb-loot-panel">
    <div class="cb-loot-title">🏆 Victory — Loot</div>
    <div class="cb-loot-items">${itemsHtml}</div>
    ${gold > 0 ? `<div class="cb-loot-gold">💰 +${gold} gold</div>` : ''}
    <button class="cb-collect-btn" onclick="collectLoot()">Collect Loot</button>
  </div>`;
}

async function collectLoot() {
  const zoneIdx = combatState?._pendingZoneIdx;
  closeCombat();
  if (zoneIdx !== undefined && zoneIdx === getForestProgress()) await setForestProgress(zoneIdx + 1);
  renderForestMap();
  if (zoneIdx !== undefined) {
    const next = FOREST_ZONES[zoneIdx + 1];
    showToast(next
      ? `✅ ${FOREST_ZONES[zoneIdx].name} cleared! ${next.name} unlocked!`
      : `🏆 The Dark Forest has been conquered!`);
  }
  // charCache was already refreshed in handleCombatWin after loot was saved —
  // re-render the panel if it's open so new items are visible immediately.
  if (document.getElementById('char-panel').classList.contains('show')) {
    switchCharTab(charTab || 'equipment');
  }
}

async function handleCombatLose() {
  combatState.player.curHp = 0;
  combatState.phase = 'lose';
  renderCombatBars();
  renderSkillButtons();
  addCombatLog('💀 You have been defeated...');
  const pfig = document.getElementById('cb-player-figure');
  if (pfig) pfig.classList.add('anim-death');
  // Set HP to 1 in DB and update cache
  api('POST', '/api/me/die').then(() => {
    if (charCache) charCache.curHp = 1;
  }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  closeCombat();
  showToast('💀 You were defeated. Visit the Royal Keep to restore your HP!');
}

function fleeCombat() {
  if (combatState?.busy) return;
  closeCombat();
  showToast('🏃 You fled from battle!');
}

async function healAtRoyalKeep() {
  const res = await api('POST', '/api/me/heal').catch(() => null);
  if (res?.ok) {
    if (charCache) { charCache.curHp = res.curHp; charCache.curMp = res.curMp; }
    showToast(`🩹 HP & MP fully restored! (${res.curHp} HP / ${res.curMp} MP)`);
    closeBldPopup();
  } else {
    showToast('❌ Could not restore HP.');
  }
}

function closeCombat() {
  combatState = null;
  document.getElementById('combat-overlay').style.display = 'none';
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

// ── Season badge ─────────────────────────────────────────────────────────────
async function loadSeasonBadge() {
  const res = await api('GET', '/api/season');
  const el  = document.getElementById('season-badge');
  if (res.topic || res.number) {
    const label = res.topic ? `🌟 ${res.topic} #${res.number}` : `🌟 Season #${res.number}`;
    el.textContent   = label;
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

// ── Hall of Fame ──────────────────────────────────────────────────────────────
async function openHallOfFame() {
  document.getElementById('hof-panel').style.display = 'flex';
  const seasons = await api('GET', '/api/seasons');
  const select  = document.getElementById('hof-season-select');
  select.innerHTML = seasons.map(s =>
    `<option value="${s.number}">${s.ended_at ? '' : '▶ '}Season #${s.number}${s.topic ? ` — ${s.topic}` : ''}</option>`
  ).join('');
  // Default to current (first in list, highest number)
  if (seasons.length) await loadHofRankings(seasons[0].number);
}

function closeHallOfFame() {
  document.getElementById('hof-panel').style.display = 'none';
}

async function hofChangeSeason() {
  const n = parseInt(document.getElementById('hof-season-select').value, 10);
  await loadHofRankings(n);
}

async function loadHofRankings(seasonNum) {
  document.getElementById('hof-list').innerHTML = '<div class="hof-empty">Loading…</div>';
  const data = await api('GET', `/api/seasons/${seasonNum}/rankings`);
  if (data.error) { document.getElementById('hof-list').innerHTML = `<div class="hof-empty">${data.error}</div>`; return; }

  const { season, rankings } = data;
  const isLive = !season.ended_at;
  document.getElementById('hof-subtitle').textContent =
    isLive ? 'Current Season — Live Rankings' : `Ended ${new Date(season.ended_at).toLocaleDateString()}`;

  if (!rankings.length) {
    document.getElementById('hof-list').innerHTML = '<div class="hof-empty">No players yet this season.</div>';
    return;
  }

  const rankClass = r => r === 1 ? 'gold' : r === 2 ? 'silver' : r === 3 ? 'bronze' : '';
  const rankIcon  = r => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`;

  document.getElementById('hof-list').innerHTML = rankings.map(p =>
    `<div class="hof-row">
      <div class="hof-rank ${rankClass(p.rank)}">${rankIcon(p.rank)}</div>
      <div class="hof-avatar">${escHtml(p.avatar || '⚔️')}</div>
      <div class="hof-info">
        <div class="hof-name">${escHtml(p.username)}</div>
        <div class="hof-meta">${escHtml(p.class)}</div>
      </div>
      <div class="hof-stats">Lv.${p.level}<br><span style="font-size:10px;color:var(--muted)">${p.xp} XP</span></div>
    </div>`
  ).join('');
}

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
        <button class="btn-sm" style="border-color:#c08030;color:#c08030" onclick="resetProgression('${escHtml(u.username)}')">↺ Reset XP</button>
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

async function adminSetSeason(clear = false) {
  const topic = clear ? '' : document.getElementById('admin-season-input').value.trim();
  if (!clear && !topic) { showToast('Enter a season topic first'); return; }
  await api('POST', '/api/admin/season', { topic });
  document.getElementById('admin-season-input').value = '';
  loadSeasonBadge();
  showToast(topic ? `🌟 Season set: ${topic}` : 'Season topic cleared');
}

async function adminNewSeason() {
  const topic = document.getElementById('admin-season-input').value.trim();
  const msg = topic
    ? `Start new season "${topic}"?\n\nThis resets ALL players to Lv.1 with 0 XP, skill points, and attribute points.`
    : 'Start a new season?\n\nThis resets ALL players to Lv.1 with 0 XP, skill points, and attribute points.\n\n(Tip: enter a season topic above first)';
  if (!confirm(msg)) return;
  const res = await api('POST', '/api/admin/new-season', { topic });
  if (res.error) { showToast(`❌ ${res.error}`); return; }
  document.getElementById('admin-season-input').value = '';
  await loadSeasonBadge();
  showToast(res.topic ? `🌟 Season #${res.number} started: ${res.topic}` : `🌟 Season #${res.number} started — all progression reset`);
  renderAdminUsers();
}

async function resetProgression(username) {
  if (!confirm(`Reset ${username}'s XP, level, skill points and attribute points to zero? This cannot be undone.`)) return;
  const res = await api('POST', `/api/admin/users/${username}/reset-progression`);
  if (res.error) { showToast(`❌ ${res.error}`); return; }
  showToast(`↺ ${username}'s progression has been reset`);
  renderAdminUsers();
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

// Close NPC dialogue / item detail on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeDialogue(); closeItemDetail(); }
});

// Click outside item-detail to close it
document.addEventListener('click', e => {
  const el = document.getElementById('item-detail');
  if (el && el.style.display !== 'none' && !el.contains(e.target) && !e.target.closest('.eq-slot') && !e.target.closest('.inv-cell')) {
    closeItemDetail();
  }
});

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