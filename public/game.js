/* global MONSTER_DEFS, MONSTER_SVGS, PLAYER_SVGS, MONSTER_SKILLS, ZONE_MONSTER_POOL, TIER_COLORS, TIER_BASE_XP, CLASS_SKILLS, ANIM_PROJECTILE, SKILL_TREES, FOREST_ZONES, DESERT_ZONES */
// ── State ─────────────────────────────────────────────────────────────────────
const token   = localStorage.getItem('rpg_token');
const meRaw   = localStorage.getItem('rpg_user');

if (!token || !meRaw) { window.location.href = '/'; }

const me = JSON.parse(meRaw);
let dmTarget  = null;   // { username, avatar }
let allUsers  = [];
let onlineSet = new Set();

// ── Party state ───────────────────────────────────────────────────────────────
let partyState = null; // { partyId, leader, members[], memberStats:{u→data}, zoneId, isLeader }

// ── PvP state ─────────────────────────────────────────────────────────────────
let pvpState          = null;   // active pvp session
let _pvpPendingFrom   = null;   // username who challenged us
let _pvpChallengeCountdown = null;
let _pvpWaitingFor    = null;   // username we challenged
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

  // Load desert progress
  const desertProgressRes = await api('GET', '/api/me/desert-progress');
  _desertProgress = desertProgressRes?.desert_progress ?? 0;

  // Load rift progress
  const riftProgressRes = await api('GET', '/api/me/rift-progress');
  _riftProgress = riftProgressRes?.rift_progress ?? 0;

  // Show/hide Eastern Gate based on forest completion
  updateEasternGate();
  // Show/hide Rift Gate based on desert completion
  updateRiftGate();

  await Promise.all([loadUsers(), loadPublicHistory(), loadEvents(), loadMyInvites(), loadQuestLog()]);

  // Listeners
  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-send').addEventListener('click', sendMessage);
  document.getElementById('msg-input').addEventListener('keydown', onInputKey);
  document.getElementById('msg-input').addEventListener('input', onTyping);

  // Start town music on first user interaction (AudioContext requires a gesture)
  const _startTownMusic = () => {
    SoundEngine.play('town');
    document.removeEventListener('click', _startTownMusic);
  };
  document.addEventListener('click', _startTownMusic);
});

// ── API helpers ───────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    signal: AbortSignal.timeout(15000),
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
        <div class="p-name">${escHtml(u.username)}</div>
        <div class="p-class">Lv.${u.level} ${u.class}</div>
      </div>
      <span class="p-online ${isOnline ? 'on' : ''}"></span>
      ${isOnline ? `<button class="p-pvp-btn" title="Challenge to PvP" onclick="event.stopPropagation();sendPvpChallenge('${escHtml(u.username)}')">⚔</button>` : ''}
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
    // Pitou summon — solo combat only, player's turn
    if (content.trim().toLowerCase() === 'pitou, i need your help!' &&
        combatState && !combatState.isParty && combatState.phase === 'player') {
      invokePitou();
    }
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
  crit_bonus: 'Crit Rate', dmg_reduction: 'Dmg Reduction',
};
// Stats whose values are percentages — displayed as "+N%" not "+N"
const PCT_STATS = new Set(['crit_bonus', 'dmg_reduction']);
function _affixValStr(stat, value) {
  return PCT_STATS.has(stat) ? `+${value}%` : `+${value}`;
}

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
let _invSort    = 'default'; // 'default' | 'type' | 'rarity' | 'obtained'

function setInvSort(mode) {
  _invSort = mode;
  if (charCache) switchCharTab('equipment');
}

async function fetchAndCacheStats() {
  const [stats, skillData] = await Promise.all([
    api('GET', '/api/me/stats'),
    api('GET', '/api/me/skills'),
  ]);
  charCache = { ...stats, skillData };
}

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
  const cpLv = charCache?.level ?? me.level ?? 1;
  document.getElementById('cp-level').textContent = `Lv.${cpLv}`;

  // XP bar — formula mirrors server: level = floor(sqrt(xp/100)) + 1
  const cpXp       = charCache?.xp ?? 0;
  const xpThisLv   = (cpLv - 1) ** 2 * 100;
  const xpNextLv   = cpLv ** 2 * 100;
  const xpProgress = cpLv >= 50 ? 1 : (cpXp - xpThisLv) / (xpNextLv - xpThisLv);
  document.getElementById('cp-xp-bar-fill').style.width = `${Math.max(0, Math.min(100, xpProgress * 100))}%`;
  document.getElementById('cp-xp-label').textContent = cpLv >= 50
    ? 'MAX LEVEL'
    : `${cpXp - xpThisLv} / ${xpNextLv - xpThisLv} XP`;

  if (!charCache) {
    document.getElementById('char-content').innerHTML =
      '<div class="inv-empty">Loading…</div>';
    await fetchAndCacheStats();
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
  if (tab === 'skills') {
    content.innerHTML = '<div class="inv-empty">Loading…</div>';
    api('GET', '/api/me/skills').then(skillData => {
      if (charCache) charCache.skillData = skillData;
      content.innerHTML = renderSkillTree(charCache);
    });
  }
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
  const SLOT_ORDER  = { head:0, chest:1, gloves:2, pants:3, boots:4, mainhand:5, offhand:6 };
  const RARITY_ORDER = { godly:0, legendary:1, rare:2, magic:3, normal:4 };

  const rawInv = data.inventory || [];
  const inventory = [...rawInv].sort((a, b) => {
    if (_invSort === 'type')     return (SLOT_ORDER[a.slot] ?? 9) - (SLOT_ORDER[b.slot] ?? 9);
    if (_invSort === 'rarity')   return (RARITY_ORDER[a.rarity] ?? 9) - (RARITY_ORDER[b.rarity] ?? 9);
    if (_invSort === 'obtained') return b.inv_id - a.inv_id; // newest first
    return 0; // default: acquisition order (oldest first)
  });

  const sortBtns = ['default','type','rarity','obtained'].map(m => {
    const labels = { default:'Default', type:'By Type', rarity:'By Rarity', obtained:'Newest' };
    const active = _invSort === m;
    return `<button class="inv-sort-btn${active ? ' active' : ''}" onclick="setInvSort('${m}')">${labels[m]}</button>`;
  }).join('');

  const cells = [];
  for (let i = 0; i < 100; i++) {
    const inv = inventory[i];
    if (inv) {
      const slotMeta  = SLOT_META[inv.slot] || {};
      const rCls      = RARITY_COLORS[inv.rarity] || 'rarity-normal';
      const playerLv  = data.level || 1;
      const req       = inv.level_req || 1;
      const locked    = playerLv < req;
      cells.push(`<div class="inv-cell has-item${locked ? ' inv-locked' : ''}"
        draggable="${!locked}"
        data-inv-id="${inv.inv_id}"
        data-item-slot="${inv.slot}"
        onclick="onInvCellClick(${inv.inv_id})"
        title="${escHtml(inv.name)}${locked ? ` (Requires Lv.${req})` : ''}">
        <span class="inv-icon">${escHtml(inv.icon || slotMeta.icon || '🎒')}</span>
        <span class="inv-name ${rCls}">${escHtml(inv.name)}</span>
        ${locked ? `<span class="inv-lock">🔒 Lv.${req}</span>` : ''}
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

  const eff = getEffectiveStats(data);
  const derivedEntries = [
    ['⚔️', 'ATK',   s.atk ?? '—'],
    ['🛡️', 'DEF',   s.def ?? '—'],
    ['❤️', 'HP',    s.hp  ?? '—'],
    ['💧', 'MP',    s.mp  ?? '—'],
    ['💨', 'Dodge', `${(eff.dodgeRate||0).toFixed(1)}%`],
    ['🎯', 'Crit',  `${(eff.critRate||0).toFixed(1)}%`],
    ...(eff.blockRate > 0    ? [['🛡', 'Block', `${(eff.blockRate||0).toFixed(1)}%`]]    : []),
    ...(eff.dmgReduction > 0 ? [['🔰', 'DR',    `${eff.dmgReduction}%`]] : []),
  ];
  const derivedRows = derivedEntries.map(([ic, lb, val]) =>
    `<div class="esl-row"><span class="esl-key">${ic} ${lb}</span><span class="esl-val">${val}</span></div>`
  ).join('');

  const attrBanner = ap > 0
    ? `<div class="esl-attr-banner">✨ ${ap} attribute point${ap > 1 ? 's' : ''} to spend</div>`
    : '';

  const cls     = data?.class || 'Warrior';
  const isAgile = cls === 'Rogue' || cls === 'Ranger';
  const ratesInfo = `
    <div class="esl-section-label" style="margin-top:6px">Combat Rates</div>
    <div class="esl-rate-row"><span class="esl-rate-icon">💨</span><span class="esl-rate-body"><b>${(eff.dodgeRate||0).toFixed(1)}% Dodge</b> — Fully avoid an attack. ${isAgile ? 'Rogue/Ranger base 10%' : 'Base 5%'}, +1${isAgile ? '.5' : ''}% per 5 DEX.</span></div>
    <div class="esl-rate-row"><span class="esl-rate-icon">🎯</span><span class="esl-rate-body"><b>${(eff.critRate||0).toFixed(1)}% Crit</b> — Deal 2× damage. Base 5%, +1${isAgile ? '.5' : ''}% per 5 DEX.</span></div>
    ${eff.blockRate > 0
      ? `<div class="esl-rate-row"><span class="esl-rate-icon">🛡</span><span class="esl-rate-body"><b>${(eff.blockRate||0).toFixed(1)}% Block</b> — Negate an attack. From equipped shield + 1% per 5 DEX.</span></div>`
      : `<div class="esl-rate-row" style="opacity:.45"><span class="esl-rate-icon">🛡</span><span class="esl-rate-body">Block — Equip a shield to gain block chance.</span></div>`
    }
    ${eff.dmgReduction > 0
      ? `<div class="esl-rate-row"><span class="esl-rate-icon">🔰</span><span class="esl-rate-body"><b>${eff.dmgReduction}% Damage Reduction</b> — Reduce all incoming damage. From Resilient affix on armour.</span></div>`
      : ''
    }`;

  const statsPanel = `<div class="equip-stats-left">
    ${attrBanner}
    <div class="esl-section-label">Basic</div>
    ${basicRows}
    <div class="esl-section-label" style="margin-top:6px">Derived</div>
    ${derivedRows}
    ${ratesInfo}
  </div>`;

  return `<div class="equip-combined">
    <div class="equip-mannequin-col">
      <div class="equip-body-wrap" style="height:340px;position:relative;max-width:none;margin:0">
        ${bodySvg}${slots}
      </div>
      ${statsPanel}
    </div>
    <div class="equip-inventory-col">
      <div class="inv-grid-title">
        <span>Inventory (${rawInv.length}/100)</span>
        <span style="color:#f0c040;font-family:'Cinzel',serif">💰 ${data.gold ?? 0}</span>
      </div>
      <div class="inv-sort-bar">${sortBtns}</div>
      <div class="inv-grid-scroll"><div class="inv-grid">${cells.join('')}</div></div>
    </div>
  </div>`;
}

async function assignAttrPoint(attr) {
  const res = await api('POST', '/api/me/attributes/assign', { attr });
  if (res.error) { showToast(`❌ ${res.error}`); return; }
  // Re-fetch so derived stats (HP, MP, ATK, DEF) update correctly
  await fetchAndCacheStats();
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
  const equipped = (charCache?.equipped || []).find(e => e.slot === item.slot) ?? null;
  _showCompareDetail(item, invId, equipped);
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
       ${escHtml(a.name)}: <b>${_affixValStr(a.stat, a.value)}</b> ${STAT_NAMES[a.stat] || a.stat}
     </div>`
  ).join('');

  const actionBtn = context === 'equipped'
    ? `<button class="itd-btn unequip" onclick="unequipSlot('${key}')">Unequip</button>`
    : `<button class="itd-btn" style="border-color:rgba(74,222,128,.35);color:#4ade80" onclick="closeItemDetail()">Drag to equip ↑</button>`;

  document.getElementById('item-detail').innerHTML = `
    <div class="itd-name ${rCls}">${escHtml(item.name)}</div>
    <div class="itd-type">${rLabel} · ${escHtml(slotLabel)}${item.level_req > 1 ? ` · <span style="color:#c09050">Req. Lv.${item.level_req}</span>` : ''}</div>
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
  const el = document.getElementById('item-detail');
  el.style.display = 'none';
  el.classList.remove('comparing');
}

function _showCompareDetail(invItem, invId, equippedItem) {
  // Build a single item card (left = equipped, right = inventory)
  function card(item, label, isNew) {
    if (!item) {
      return `<div class="itd-card itd-card-empty">
        <div class="itd-card-label">${label}</div>
        <span>— Nothing equipped —</span>
      </div>`;
    }
    const rCls      = RARITY_COLORS[item.rarity] || 'rarity-normal';
    const rLabel    = RARITY_LABELS[item.rarity] || 'Normal';
    const slotLabel = SLOT_LABELS[item.slot] || item.slot;
    const reqLv     = item.level_req || 1;
    const reqHtml   = reqLv > 1 ? `<div class="itd-req">Req. Lv.${reqLv}</div>` : '';

    // Prominent first-row stat: ATK for weapons, DEF for armor
    const isWeaponSlot = item.slot === 'mainhand';
    const prominentHtml = isWeaponSlot
      ? (item.atk_bonus ? `<div class="bsm-weapon-atk">⚔ +${item.atk_bonus} ATK</div>` : '')
      : (item.def_bonus ? `<div class="bsm-weapon-atk">🛡 +${item.def_bonus} DEF</div>` : '');

    // Block rate row for shields
    const blockRate = item.block_rate || 0;
    const blockHtml = blockRate > 0
      ? `<div class="itd-stat-row">
          <span class="itd-stat-lbl">🛡 Block</span>
          <span class="itd-stat-val">${blockRate}%</span>
          ${isNew ? (() => { const d = (invItem.block_rate||0)-(equippedItem?.block_rate||0); return d>0?`<span class="itd-diff up">▲${d}%</span>`:d<0?`<span class="itd-diff down">▼${Math.abs(d)}%</span>`:''; })() : ''}
        </div>`
      : '';

    // Collect all stat keys present in either item, excluding the prominent one
    const skipKey = isWeaponSlot ? 'atk_bonus' : 'def_bonus';
    const keys = Object.keys(STAT_NAMES).filter(k =>
      k !== skipKey && ((invItem[k] || 0) !== 0 || (equippedItem?.[k] || 0) !== 0)
    );

    const statRows = keys.map(k => {
      const val  = item[k] || 0;
      let diffHtml = '';
      if (isNew) {
        const diff = (invItem[k] || 0) - (equippedItem?.[k] || 0);
        if      (diff > 0) diffHtml = `<span class="itd-diff up">▲${diff}</span>`;
        else if (diff < 0) diffHtml = `<span class="itd-diff down">▼${Math.abs(diff)}</span>`;
      }
      return `<div class="itd-stat-row">
        <span class="itd-stat-lbl">${STAT_NAMES[k]}</span>
        <span class="itd-stat-val">${val ? '+' + val : '—'}</span>
        ${diffHtml}
      </div>`;
    }).join('');

    const affixRows = (item.affixes || []).map(a =>
      `<div class="itd-affix ${a.type}">${escHtml(a.name)}: <b>${_affixValStr(a.stat, a.value)}</b> ${STAT_NAMES[a.stat] || a.stat}</div>`
    ).join('');

    return `<div class="itd-card ${isNew ? 'itd-card-new' : 'itd-card-cur'}">
      <div class="itd-card-label">${label}</div>
      <div class="itd-name ${rCls}">${escHtml(item.name)}</div>
      <div class="itd-type">${rLabel} · ${escHtml(slotLabel)}</div>
      ${reqHtml}
      ${prominentHtml}
      ${item.description ? `<div class="itd-desc">${escHtml(item.description)}</div>` : ''}
      ${blockHtml || statRows ? `<div class="itd-stat-list">${blockHtml}${statRows}</div>` : ''}
      ${affixRows ? `<div class="itd-divider"></div><div class="itd-affixes">${affixRows}</div>` : ''}
    </div>`;
  }

  const playerLv   = charCache?.level || 1;
  const itemReqLv  = invItem.level_req || 1;
  const canEquip   = playerLv >= itemReqLv;
  const equipBtn   = canEquip
    ? `<button class="itd-btn" style="border-color:rgba(74,222,128,.35);color:#4ade80"
         onclick="equipFromDetail(${invId},'${invItem.slot}')">⚔ Equip</button>`
    : `<button class="itd-btn" disabled style="opacity:.4;cursor:not-allowed">🔒 Req. Lv.${itemReqLv}</button>`;

  const el = document.getElementById('item-detail');
  el.classList.add('comparing');
  el.innerHTML = `
    <div class="itd-compare">
      ${card(equippedItem, 'Equipped', false)}
      ${card(invItem, 'In Inventory', true)}
    </div>
    <div class="itd-actions" style="padding:0 16px 14px;justify-content:flex-end">
      <div style="display:flex;gap:8px">
        ${equipBtn}
        <button class="itd-btn close-btn" onclick="closeItemDetail()">Close</button>
      </div>
    </div>`;
  el.style.display = 'block';
}

async function equipFromDetail(invId, slot) {
  closeItemDetail();
  const res = await api('POST', `/api/me/inventory/${invId}/equip`, { slot });
  if (res.error) { showToast(`❌ ${res.error}`); return; }
  charCache = { ...charCache, equipped: res.equipped, inventory: res.inventory, stats: res.stats };
  switchCharTab('equipment');
  showToast(`Equipped!`);
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
  const quests = charCache?.quests || [];
  const questState = quests.find(q => q.quest_key === 'gatehouse_patrol');
  const box = document.getElementById('npc-dialogue');

  if (questState) {
    const followUp = questState.status === 'completed'
      ? 'You have done the town a great service, adventurer. The people will not forget your courage.'
      : 'You still live. Good. The Darkwood awaits — find out what happened to those hunting parties. Do not fail us.';
    box.innerHTML = `
      <div class="dlg-npc-name">🪖 Captain Gregor — Commander of the Gatehouse</div>
      <div id="dlg-lines"></div>
      <div id="dlg-choices" class="dlg-choices" style="display:none"></div>`;
    box.style.display = 'block';
    const p = document.createElement('p');
    p.className = 'dlg-line';
    p.textContent = followUp;
    document.getElementById('dlg-lines').appendChild(p);
    requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('visible')));
    setTimeout(() => {
      const choicesEl = document.getElementById('dlg-choices');
      if (choicesEl) {
        choicesEl.innerHTML = `<button class="dlg-btn no" onclick="closeDialogue()">✦ Understood, Captain.</button>`;
        choicesEl.style.display = 'flex';
      }
    }, 1200);
    return;
  }

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
  list.innerHTML = quests.map(q => {
    const done = q.status === 'complete';
    return `<div class="ql-card${done ? ' ql-done' : ''}">
      <span class="ql-icon">${done ? '✅' : '📜'}</span>
      <div>
        <div class="ql-title">${escHtml(q.title)}</div>
        <div class="ql-status" style="color:${done ? '#4ade80' : 'var(--muted)'}">
          ${done ? '✓ COMPLETE' : '● ACTIVE'}
        </div>
      </div>
    </div>`;
  }).join('');
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
      cls2 += node.type === 'active' ? ' skill-active' : node.type === 'buff' ? ' skill-buff' : node.type === 'curse' ? ' skill-curse' : ' skill-passive';
      if (isLocked)   cls2 += ' locked';
      if (pts > 0)    cls2 += ' has-points';
      if (pts >= node.maxPoints) cls2 += ' maxed';
      if (canAssign)  cls2 += ' can-assign';

      const dotType = node.type === 'active' ? 'active-type' : node.type === 'buff' ? 'buff-type' : node.type === 'curse' ? 'curse-type' : 'passive-type';
      const dots = Array.from({ length: node.maxPoints }, (_, i) =>
        `<span class="st-dot${i < pts ? ` filled ${dotType}` : ''}"></span>`
      ).join('');

      const typeLabel = node.type === 'active' ? '⚡ Active' : node.type === 'buff' ? '💛 Buff' : node.type === 'curse' ? '🟣 Curse' : '🔷 Passive';

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
    if (p.maxHp)   parts.push(`+${p.maxHp} Max HP`);
    if (p.maxMp)   parts.push(`+${p.maxMp} Max MP`);
    if (p.defPct)       parts.push(`-${p.defPct}% damage taken`);
    if (p.critPct)      parts.push(`+${p.critPct}% Crit Rate`);
    if (p.hpPct)        parts.push(`+${p.hpPct}% Max HP`);
    if (p.atkPct)        parts.push(`+${p.atkPct}% ATK`);
    if (p.defStatPct)    parts.push(`+${p.defStatPct}% DEF`);
    if (p.lifestealPct)  parts.push(`+${p.lifestealPct}% Lifesteal`);
    if (p.dodgePct)      parts.push(`+${p.dodgePct}% Dodge Rate`);
    if (p.blockRatePct)  parts.push(`+${p.blockRatePct}% Block Rate`);
    if (p.hpPenaltyPct)  parts.push(`−${p.hpPenaltyPct}% Max HP`);
    benefitText = `Per point: ${parts.join(', ')}`;
  } else if (node.skill) {
    const s = node.skill;
    if (s.heal) {
      benefitText = `Current heal: Spirit × ${s.baseHealMult + pts * s.healPerPt}${pts < node.maxPoints ? ` → next: ×${s.baseHealMult + (pts + 1) * s.healPerPt}` : ' (max)'}`;
    } else if (s.type === 'guard' || s.type === 'divine_shield') {
      const redArr  = s.reductionByPt || [];
      const hitsArr = s.hitsByPt || [];
      const curPt   = Math.max(0, pts - 1);
      const nxtPt   = pts;
      const curRed  = redArr[curPt] != null ? `${Math.round(redArr[curPt] * 100)}%` : '—';
      const curHits = s.type === 'guard' ? (hitsArr[curPt] ?? '—') : (s.hits ?? 2);
      const nxtRed  = redArr[nxtPt] != null ? `${Math.round(redArr[nxtPt] * 100)}%` : null;
      const nxtHits = s.type === 'guard' ? (hitsArr[nxtPt] ?? null) : (s.hits ?? 2);
      const guardBase = pts > 0
        ? `${curRed} reduction · ${curHits} hit${curHits > 1 ? 's' : ''}${pts < node.maxPoints && nxtRed ? ` → next: ${nxtRed} · ${nxtHits} hit${nxtHits > 1 ? 's' : ''}` : pts >= node.maxPoints ? ' (max)' : ''}`
        : `Rank 1: ${Math.round((redArr[0] ?? 0.5) * 100)}% reduction · ${s.type === 'guard' ? (hitsArr[0] ?? 2) : (s.hits ?? 2)} hits`;
      const activeParts = [];
      if (s.blockPerPt) activeParts.push(`+${s.blockPerPt * (pts || 1)}% Block while active`);
      if (s.dodgePerPt) activeParts.push(`+${s.dodgePerPt * (pts || 1)}% Dodge while active`);
      benefitText = guardBase + (activeParts.length ? ` · ${activeParts.join(', ')}` : '');
    } else {
      const cur = (s.baseDmg + Math.max(0, pts - 1) * (s.dmgPerPt || 0)).toFixed(2);
      const nxt = (s.baseDmg + pts * (s.dmgPerPt || 0)).toFixed(2);
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
    <div class="st-detail-meta">${node.type === 'active' ? '⚡ Active Skill' : node.type === 'buff' ? '💛 Buff Skill' : node.type === 'curse' ? '🟣 Curse Skill' : '🔷 Passive Bonus'} · Rank ${pts}/${node.maxPoints}${(node.type === 'active' || node.type === 'buff' || node.type === 'curse') && node.skill ? ` · ${node.skill.mpCostPct ? `${node.skill.mpCostPct}% max MP` : node.skill.mpCost > 0 ? `${node.skill.mpCost} MP` : 'Free'}` : ''}${reqText ? ` · Requires: ${escHtml(reqText)}` : ''}</div>
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

function calcDexBonus(dex) {
  const d = Math.max(0, dex);
  let pts = Math.floor(Math.min(d, 50) / 5);
  if (d > 50)  pts += Math.floor(Math.min(d - 50, 50) / 8);
  if (d > 100) pts += Math.floor((d - 100) / 12);
  return pts; // percentage points before agility multiplier
}

function getEffectiveStats(data) {
  const base = { ...(data?.stats || { hp:50, mp:20, atk:10, def:5, spirit:5 }) };
  const tree  = SKILL_TREES[data?.class] || [];
  const alloc = data?.skillData?.allocated || {};

  tree.forEach(node => {
    if (node.type !== 'passive') return;
    const pts = alloc[node.id] || 0;
    if (pts <= 0) return;
    const p = node.passive;
    if (p.atk)     base.atk     += p.atk     * pts;
    if (p.def)     base.def     += p.def     * pts;
    if (p.spirit)  base.spirit  += p.spirit  * pts;
    if (p.maxHp)   { base.hp  += p.maxHp  * pts; base.max_hp = (base.max_hp || base.hp) + p.maxHp * pts; }
    if (p.maxMp)   base.mp    += p.maxMp   * pts;
    if (p.defPct)       base.defPct       = (base.defPct       || 0) + p.defPct       * pts;
    if (p.critPct)      base.critPct      = (base.critPct      || 0) + p.critPct      * pts;
    if (p.hpPct)        base.hpPct        = (base.hpPct        || 0) + p.hpPct        * pts;
    if (p.atkPct)       base.atkPct       = (base.atkPct       || 0) + p.atkPct       * pts;
    if (p.defStatPct)   base.defStatPct   = (base.defStatPct   || 0) + p.defStatPct   * pts;
    if (p.lifestealPct) base.lifestealPct = (base.lifestealPct || 0) + p.lifestealPct * pts;
    if (p.dodgePct)     base.dodgePct     = (base.dodgePct     || 0) + p.dodgePct     * pts;
    if (p.hpPenaltyPct)    base.hpPenaltyPct    = (base.hpPenaltyPct    || 0) + p.hpPenaltyPct    * pts;
    if (p.critDmgBonus)    base.critDmgBonus    = (base.critDmgBonus    || 0) + p.critDmgBonus    * pts;
    if (p.onKillHealPct)   base.onKillHealPct   = (base.onKillHealPct   || 0) + p.onKillHealPct   * pts;
    if (p.martyrTriggerPct)base.martyrTriggerPct= (base.martyrTriggerPct|| 0) + p.martyrTriggerPct* pts;
    if (p.lastStand)       base.lastStand       = true;
  });
  // Apply % HP bonus after all flat bonuses are accumulated
  if (base.hpPct) {
    const bonus = Math.floor(base.hp * base.hpPct / 100);
    base.hp += bonus;
  }
  // Apply % ATK bonus after all flat bonuses are accumulated
  if (base.atkPct) {
    base.atk = Math.floor(base.atk * (1 + base.atkPct / 100));
  }
  // Apply % DEF bonus after all flat bonuses are accumulated
  if (base.defStatPct) {
    base.def = Math.floor(base.def * (1 + base.defStatPct / 100));
  }
  // Apply HP penalty (Shadow Mastery trade-off) after all other HP bonuses
  if (base.hpPenaltyPct) {
    base.hp = Math.max(1, Math.floor(base.hp * (1 - base.hpPenaltyPct / 100)));
  }

  // ── Dodge / Crit from DEX ──────────────────────────────────────────────────
  const cls     = data?.class || 'Warrior';
  const isAgile = cls === 'Rogue' || cls === 'Ranger';
  const dexPts  = calcDexBonus(base.dex || 0);
  const dexBonus = isAgile ? dexPts * 1.5 : dexPts;
  base.dodgeRate = Math.min(75, (isAgile ? 10 : 5) + dexBonus + (base.dodgePct || 0));

  // ── Special affixes from all equipped gear ─────────────────────────────────
  const equippedArr    = Array.isArray(data?.equipped) ? data.equipped : [];
  const equippedAffixes = equippedArr.flatMap(item => item.affixes || []);
  const critBonus  = equippedAffixes.filter(a => a.stat === 'crit_bonus').reduce((s, a) => s + a.value, 0);
  const dmgReducPct = equippedAffixes.filter(a => a.stat === 'dmg_reduction').reduce((s, a) => s + a.value, 0);
  base.critRate     = Math.min(75, 5 + dexBonus + critBonus + (base.critPct || 0));
  base.dmgReduction = Math.min(50, dmgReducPct);

  // ── Block from equipped offhand ────────────────────────────────────────────
  const offhand   = equippedArr.find(i => i.slot === 'offhand');
  const baseBlock = offhand?.block_rate || 0;
  base.blockRate  = baseBlock > 0 ? Math.min(75, baseBlock + Math.floor((base.dex || 0) / 5)) : 0;

  return base;
}

// ── Combat: player skill list including unlocked tree actives ───────────────

function getPlayerCombatSkills(data) {
  const base  = CLASS_SKILLS[data?.class] || CLASS_SKILLS.Warrior;
  const tree  = SKILL_TREES[data?.class] || [];
  const alloc = data?.skillData?.allocated || {};

  const treeSkills = tree
    .filter(n => (n.type === 'active' || n.type === 'buff' || n.type === 'curse') && (alloc[n.id] || 0) > 0)
    .map(n => {
      const pts = alloc[n.id];
      const s   = n.skill;
      const dmgMult = s.heal || s.type === 'guard' ? 0 : (s.baseDmg + (pts - 1) * (s.dmgPerPt || 0));
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
        pts,
        reductionByPt: s.reductionByPt,
        hitsByPt:      s.hitsByPt,
        blockPerPt:    s.blockPerPt,
        dodgePerPt:    s.dodgePerPt,
        mpCostPct:     s.mpCostPct,
        hits:          s.hits,
        multiHit:      s.multiHit,
        defPierce:     s.defPierce,
        freeze:        s.freeze,
        durationByPt:  s.durationByPt,
      };
    });

  return [...base, ...treeSkills];
}

// ── Dark Forest ───────────────────────────────────────────────────────────────

function updateDarkForestHotspot() {
  const quests = charCache?.quests || [];
  const hasQuest = quests.some(q => q.quest_key === 'gatehouse_patrol');
  const hs = document.getElementById('dark-forest-hs');
  if (hs) hs.style.display = hasQuest ? 'flex' : 'none';
}

// Zone definitions — positions mapped to dark-forest.jpg
// Entry: lower-right clearing where the path meets the treeline
// Mid:   center-left winding path through dense canopy
// Deep:  upper-left shadow pocket under the ancient trees
// Demon: upper-center, deepest dark at the heart of the forest
const FOREST_ZONES = [
  { id: 'entry', name: 'Forest Entry',          sub: 'Where the path meets the trees',   pos: { left:'68%', top:'70%' }, levelRange: [1,  4]  },
  { id: 'mid',   name: 'Mid-Forest',             sub: 'Twisted canopy · Paths diverge',   pos: { left:'38%', top:'52%' }, levelRange: [3,  8]  },
  { id: 'deep',  name: 'Deep Forest',            sub: 'Ancient dark · Few return',        pos: { left:'22%', top:'33%' }, levelRange: [7,  10], danger: true },
  { id: 'demon', name: '☠ Demon in the Forest',  sub: '??? · Do not face it alone',      pos: { left:'50%', top:'12%' }, levelRange: [10, 12], danger: true },
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
        ${!locked && z.levelRange ? `<div class="fm-zone-lvrange">Lv.${z.levelRange[0]}–${z.levelRange[1]}</div>` : ''}
      </div>
      <div class="fm-connector"></div>
    </div>`;
  }).join('');
}

let _forestTimer = null;

function openDarkForest() {
  // Always refresh stats + skills before combat starts — 5s loading window gives ample time.
  // Fixes stale charCache (newly allocated skills not picked up) and the race condition
  // where charCache is null and the old conditional fetch could lose the race.
  fetchAndCacheStats().catch(() => {});
  SoundEngine.play('forest');

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
    bar.style.transition = 'width 1s linear';
    bar.style.width = '100%';
  }));

  clearTimeout(_forestTimer);
  _forestTimer = setTimeout(() => {
    loading.style.display = 'none';
    map.style.display = 'block';
    renderForestMap();
  }, 1000);
}

function closeDarkForest() {
  clearTimeout(_forestTimer);
  document.getElementById('forest-overlay').style.display = 'none';
  document.getElementById('forest-loading').style.display = '';
  document.getElementById('forest-map').style.display = 'none';
  SoundEngine.play('town');
}

function onForestZoneClick(id) {
  const idx      = FOREST_ZONES.findIndex(z => z.id === id);
  const progress = getForestProgress();
  if (idx > progress) { showToast('🔒 Complete the previous area first.'); return; }
  const pool = ZONE_MONSTER_POOL[id] || [];
  const hasBoss = pool.some(mid => MONSTER_DEFS[mid]?.isBoss);
  if (hasBoss) {
    openPartyModal(id);
  } else {
    startCombat(id);
  }
}

// ── Party system ──────────────────────────────────────────────────────────────

function openPartyModal(zoneId) {
  partyState = { zoneId, pendingInvites: new Set() };
  const overlay = document.getElementById('party-modal-overlay');
  const listEl  = document.getElementById('party-player-list');
  const waitSec = document.getElementById('party-wait-section');
  const btns    = document.getElementById('party-modal-btns');
  const bWait   = document.getElementById('party-modal-btns-waiting');

  waitSec.style.display = 'none';
  btns.style.display    = 'flex';
  bWait.style.display   = 'none';

  const others = allUsers.filter(u => u.username !== me.username && onlineSet.has(u.username));
  if (!others.length) {
    listEl.innerHTML = '<div style="color:var(--muted);font-size:12px;font-style:italic;text-align:center;padding:10px 0">No other players are online.</div>';
  } else {
    listEl.innerHTML = others.slice(0, 2).map(u => `
      <label class="party-player-row">
        <input type="checkbox" class="party-checkbox" value="${escHtml(u.username)}" onchange="partyCheckboxChanged()">
        <span class="party-player-avatar">${escHtml(u.avatar || '?')}</span>
        <span class="party-player-name">${escHtml(u.username)}</span>
        <span class="party-player-class" style="color:var(--muted);font-size:11px">${escHtml(u.class || '')}</span>
      </label>
    `).join('');
  }

  document.getElementById('party-confirm-btn').disabled = true;
  overlay.classList.add('show');
}

function partyCheckboxChanged() {
  const checked = document.querySelectorAll('.party-checkbox:checked').length;
  document.getElementById('party-confirm-btn').disabled = checked === 0;
}

function closePartyModal() {
  document.getElementById('party-modal-overlay').classList.remove('show');
  partyState = null;
}

function partyStartSolo() {
  document.getElementById('party-modal-overlay').classList.remove('show');
  const zoneId = partyState?.zoneId;
  partyState = null;
  startCombat(zoneId);
}

function partyConfirmStart() {
  const checked = [...document.querySelectorAll('.party-checkbox:checked')].map(cb => cb.value);
  if (!checked.length) return;

  // Switch UI to waiting state
  document.getElementById('party-player-list').style.display = 'none';
  document.getElementById('party-wait-section').style.display = 'block';
  document.getElementById('party-modal-btns').style.display = 'none';
  document.getElementById('party-modal-btns-waiting').style.display = 'flex';

  const waitList = document.getElementById('party-wait-list');
  waitList.innerHTML = checked.map(u => `
    <div class="party-wait-row" id="party-wait-${CSS.escape(u)}">
      <span>${escHtml(u)}</span>
      <span class="party-wait-status" style="color:var(--muted)">Waiting…</span>
    </div>
  `).join('');

  partyState.invited = checked;
  partyState.responses = {};
  checked.forEach(u => { partyState.responses[u] = null; });

  socket.emit('party:invite', { invitees: checked, zone: partyState.zoneId });
}

function partyCancelInvite() {
  if (partyState?.partyId) {
    socket.emit('party:cancel', { partyId: partyState.partyId });
  }
  document.getElementById('party-modal-overlay').classList.remove('show');
  document.getElementById('party-player-list').style.display = '';
  partyState = null;
}

function partyRespondInvite(accept) {
  const notif = document.getElementById('party-invite-notif');
  notif.classList.remove('show');
  socket.emit('party:respond', { partyId: partyState?.pendingPartyId, accept });
  if (accept) SoundEngine.playPartyJoined();
  else partyState = null;
}

// ── Party socket events ───────────────────────────────────────────────────────

socket.on('party:formed', ({ partyId }) => {
  if (!partyState) return;
  partyState.partyId  = partyId;
  partyState.isLeader = true;
});

socket.on('party:member_responded', ({ username, accept }) => {
  if (!partyState) return;
  partyState.responses[username] = accept;
  if (accept) SoundEngine.playPartyJoined();
  const row = document.getElementById(`party-wait-${CSS.escape(username)}`);
  if (row) {
    const st = row.querySelector('.party-wait-status');
    if (st) st.textContent = accept ? '✅ Accepted' : '❌ Declined';
    if (st) st.style.color = accept ? '#4ade80' : '#e07070';
  }

  // If all responded, enable "Start" button or auto-start
  const allDone = Object.values(partyState.responses).every(r => r !== null);
  if (allDone) {
    const accepted = Object.entries(partyState.responses).filter(([, v]) => v).map(([k]) => k);
    document.getElementById('party-modal-btns-waiting').innerHTML =
      `<button class="party-btn secondary" onclick="partyCancelInvite()">Cancel</button>
       <button class="party-btn primary" onclick="partyBeginBossFight()">⚔ Start Fight (${accepted.length + 1})</button>`;
  }
});

socket.on('party:invite_received', ({ partyId, leader, zone }) => {
  partyState = { pendingPartyId: partyId, zoneId: zone };
  const notif  = document.getElementById('party-invite-notif');
  const msgEl  = document.getElementById('party-invite-msg');
  const zInfo  = FOREST_ZONES.find(z => z.id === zone);
  msgEl.textContent = `${leader} invites you to face ${zInfo?.name || zone}!`;
  notif.classList.add('show');
  SoundEngine.playPartyRequest();
  // Auto-dismiss after 30s
  setTimeout(() => {
    if (notif.classList.contains('show')) {
      notif.classList.remove('show');
      partyState = null;
    }
  }, 30000);
});

socket.on('party:cancelled', () => {
  document.getElementById('party-invite-notif').classList.remove('show');
  document.getElementById('party-modal-overlay').classList.remove('show');
  partyState = null;
  showToast('Party was cancelled.');
});

socket.on('party:combat_start', async ({ partyId, members, zone, monsters }) => {
  document.getElementById('party-invite-notif').classList.remove('show');
  partyState = { partyId, isLeader: false, zoneId: zone, members };
  showToast(`⚔ Party combat starting — ${zone}!`);

  // Fetch stats for all party members except self
  const others = (members || []).filter(u => u !== me.username);
  const memberStats = {};
  await Promise.all(others.map(async u => {
    const data = await api('GET', `/api/users/${encodeURIComponent(u)}/combat-stats`).catch(() => null);
    if (data) memberStats[u] = data;
  }));
  partyState.memberStats = memberStats;

  // Refresh charCache (especially skillData) so skill tree skills are available.
  // Run fetch in parallel with the 800ms delay so we don't widen the window where
  // combatState is still null when party:turn arrives.
  await Promise.all([
    fetchAndCacheStats().catch(() => {}),
    new Promise(r => setTimeout(r, 800)),
  ]);
  document.getElementById('forest-overlay').style.display = 'none';
  document.getElementById('desert-overlay').style.display = 'none';
  // Use the leader's pre-built monsters so all players fight the same boss
  startCombat(zone, members, memberStats, monsters || null, false);
});

socket.on('party:ended', async ({ result } = {}) => {
  if (result === 'lose' && combatState && combatState.partyRole === 'member' &&
      combatState.phase !== 'lose' && combatState.phase !== 'win') {
    combatState.phase = 'lose';
    renderSkillButtons();
    addCombatLog('💀 The party has been wiped out...');
    const pfig = document.getElementById('cb-player-figure');
    if (pfig) pfig.classList.add('anim-death');
    api('POST', '/api/me/die').then(() => { if (charCache) charCache.curHp = 1; }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    closeCombat();
    showToast('💀 Your party was defeated. Visit the Chapel to receive a blessing!');
  }
  partyState = null;
});

// Leader receives a party member's chosen action
socket.on('party:action', ({ from, skillId, targetIdx, dmg, logText, healAmt, guardState, shieldState }) => {
  // Store the member's buff state on their combatant entry so monsterTurn can apply it
  if (guardState !== undefined || shieldState !== undefined) {
    const pm = combatState?.partyMembers.find(m => m.username === from);
    if (pm) {
      if (guardState  !== undefined) pm.ironGuard    = guardState;
      if (shieldState !== undefined) pm.divineShield = shieldState;
    }
  }
  if (_partyActionResolve) {
    _partyActionResolve({ from, skillId, targetIdx, dmg, logText, healAmt });
    _partyActionResolve = null;
  }
});

// Party member receives a state sync from the leader
socket.on('party:sync', async (syncData) => {
  if (!combatState || combatState.partyRole !== 'member') return;
  if (syncData.monsters) {
    syncData.monsters.forEach((m, i) => {
      if (!combatState.monsters[i]) {
        // New minion summoned by boss — add it to our local state and re-render
        const base = MONSTER_DEFS[m.monsterId];
        if (base) {
          const lv  = base.level;
          const hp  = Math.round(base.hp  * (1 + (lv - 1) * 0.15));
          const atk = Math.round(base.atk * (1 + (lv - 1) * 0.10));
          const def = Math.round(base.def * (1 + (lv - 1) * 0.10));
          combatState.monsters.push({ ...base, monsterId: m.monsterId, level: lv, hp, atk, def, xp: 0, curHp: m.curHp });
          renderMonsterCards();
        }
        return;
      }
      const wasAlive = combatState.monsters[i].curHp > 0;
      combatState.monsters[i].curHp = m.curHp;
      if (wasAlive && m.curHp <= 0) {
        const fig = monsterEl(i);
        if (fig) fig.classList.add('anim-death');
      }
    });
  }
  if (syncData.memberHps) {
    const hps = syncData.memberHps;
    if (hps[me.username] !== undefined) combatState.player.curHp = hps[me.username];
    for (const pm of combatState.partyMembers) {
      if (hps[pm.username] !== undefined) pm.curHp = hps[pm.username];
    }
  }
  if (syncData.newLogs) {
    for (const entry of syncData.newLogs) addCombatLog(entry);
  }
  if (syncData.dmgEvents) {
    syncData.dmgEvents.forEach((ev, i) => {
      const delay = i * 120;
      if (ev.target === 'monster') {
        // Skip own attacks — already animated locally in useSkill()
        if (ev.attacker === me.username) return;
        // Find attacker's figure — leader is in partyMembers on the member's screen
        const atkIdx = combatState.partyMembers.findIndex(pm => pm.username === ev.attacker);
        const atkFig = atkIdx >= 0 ? partyMemberFig(atkIdx) : null;
        setTimeout(() => {
          if (atkFig) addAnim(atkFig, 'anim-atk-r', 700);
          const tfig = monsterEl(ev.idx);
          setTimeout(() => {
            if (tfig) { addAnim(tfig, 'anim-hit', 400); addAnim(tfig, 'anim-shake', 450); }
            spawnFxText(`-${ev.dmg}`, ev.crit ? '#ff2020' : '#ff6060', tfig, ev.crit);
          }, 340);
        }, delay);
      } else if (ev.target === me.username) {
        // Monster attacked me (this viewer) — show boss attack anim + my player figure hit/dodge/block
        setTimeout(() => {
          const mfig = monsterEl(ev.monIdx);
          if (mfig) addAnim(mfig, 'anim-atk-l', 700);
          const pfig = document.getElementById('cb-player-figure');
          setTimeout(() => {
            if (ev.dodge) {
              spawnFxText('DODGE!', '#88ccff', pfig);
            } else if (ev.block) {
              spawnFxText('BLOCK!', '#aaaaee', pfig);
            } else {
              if (pfig) { addAnim(pfig, 'anim-hit', 400); addAnim(pfig, 'anim-shake', 450); }
              spawnFxText(`-${ev.dmg}`, '#ff4444', pfig);
            }
          }, 340);
        }, delay);
      } else if (ev.target === 'self') {
        // Skip own buff/heal — already animated locally in useSkill()
        if (ev.attacker === me.username) return;
        // Party member used a buff/heal — show animation on their figure
        const atkIdx = combatState.partyMembers.findIndex(pm => pm.username === ev.attacker);
        const atkFig = atkIdx >= 0 ? partyMemberFig(atkIdx) : null;
        setTimeout(() => {
          if (atkFig) {
            addAnim(atkFig, ev.healAmt > 0 ? 'anim-heal' : 'anim-buff', 700);
            if (ev.healAmt > 0) spawnFxText(`+${ev.healAmt}`, '#4ade80', atkFig);
            else spawnFxText('GUARD!', '#88ccff', atkFig);
          }
        }, delay);
      } else if (ev.target) {
        // Monster attacked a party member — show boss attack anim + member hit/dodge/block anim
        const pmIdx = combatState.partyMembers.findIndex(pm => pm.username === ev.target);
        if (pmIdx >= 0) {
          setTimeout(() => {
            const mfig = monsterEl(ev.monIdx);
            if (mfig) addAnim(mfig, 'anim-atk-l', 700);
            const pmfig = partyMemberFig(pmIdx);
            setTimeout(() => {
              if (ev.dodge) {
                spawnFxText('DODGE!', '#88ccff', pmfig);
              } else if (ev.block) {
                spawnFxText('BLOCK!', '#aaaaee', pmfig);
              } else {
                if (pmfig) { addAnim(pmfig, 'anim-hit', 400); addAnim(pmfig, 'anim-shake', 450); }
                spawnFxText(`-${ev.dmg}`, '#ff4444', pmfig);
              }
            }, 340);
          }, delay);
        }
      }
    });
  }
  renderCombatBars();
  // If all monsters are dead and we haven't won yet, trigger win flow
  if (combatState.monsters.every(m => m.curHp <= 0) &&
      combatState.phase !== 'win' && combatState.phase !== 'lose') {
    await handleCombatWin();
  }
});

// Party member receives notification it's their turn to act
socket.on('party:turn', (syncData) => {
  if (!combatState || combatState.partyRole !== 'member') return;
  if (syncData.monsters) {
    syncData.monsters.forEach((m, i) => {
      if (!combatState.monsters[i]) {
        const base = MONSTER_DEFS[m.monsterId];
        if (base) {
          const lv  = base.level;
          const hp  = Math.round(base.hp  * (1 + (lv - 1) * 0.15));
          const atk = Math.round(base.atk * (1 + (lv - 1) * 0.10));
          const def = Math.round(base.def * (1 + (lv - 1) * 0.10));
          combatState.monsters.push({ ...base, monsterId: m.monsterId, level: lv, hp, atk, def, xp: 0, curHp: m.curHp });
          renderMonsterCards();
        }
        return;
      }
      const wasAlive = combatState.monsters[i].curHp > 0;
      combatState.monsters[i].curHp = m.curHp;
      if (wasAlive && m.curHp <= 0) {
        const fig = monsterEl(i);
        if (fig) fig.classList.add('anim-death');
      }
    });
  }
  if (syncData.memberHps) {
    const hps = syncData.memberHps;
    if (hps[me.username] !== undefined) combatState.player.curHp = hps[me.username];
    for (const pm of combatState.partyMembers) {
      if (hps[pm.username] !== undefined) pm.curHp = hps[pm.username];
    }
  }
  if (syncData.newLogs) {
    for (const entry of syncData.newLogs) addCombatLog(entry);
  }
  combatState.phase = 'player';
  renderCombatBars();
  renderSkillButtons();
  // Flash the skill panel so the member can't miss their turn
  const skillEl = document.getElementById('combat-skills');
  if (skillEl) { skillEl.classList.add('your-turn-flash'); setTimeout(() => skillEl.classList.remove('your-turn-flash'), 1200); }
  showToast('⚔️ YOUR TURN — Choose a skill!');
});

async function partyBeginBossFight() {
  if (!partyState?.partyId) return;
  const accepted = Object.entries(partyState.responses).filter(([, v]) => v).map(([k]) => k);
  partyState.members = [me.username, ...accepted];
  document.getElementById('party-modal-overlay').classList.remove('show');

  // Fetch stats for all accepted members
  const memberStats = {};
  await Promise.all(accepted.map(async u => {
    const data = await api('GET', `/api/users/${encodeURIComponent(u)}/combat-stats`).catch(() => null);
    if (data) memberStats[u] = data;
  }));
  partyState.memberStats = memberStats;

  // Leader generates monsters — members will receive the same list so all fight the same boss
  const monsters = generateMonsters(partyState.zoneId, partyState.members.length);

  socket.emit('party:start', { partyId: partyState.partyId, monsters });
  startCombat(partyState.zoneId, partyState.members, memberStats, monsters, true);
}

// ── Pitou — summoned ally ─────────────────────────────────────────────────────

const PITOU_SVG = `<svg viewBox="0 0 60 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M34,70 Q50,60 55,44 Q59,32 50,28" stroke="#D4C5A0" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="50" cy="28" r="4" fill="#C4B090"/>
  <rect x="18" y="68" width="10" height="24" rx="2" fill="#26A69A"/>
  <rect x="32" y="68" width="10" height="24" rx="2" fill="#26A69A"/>
  <rect x="15" y="88" width="14" height="10" rx="3" fill="#004D40"/>
  <rect x="31" y="88" width="14" height="10" rx="3" fill="#004D40"/>
  <path d="M14,28 L46,28 L43,70 L17,70 Z" fill="#26A69A"/>
  <path d="M22,30 L38,30 L36,62 L24,62 Z" fill="#80CBC4"/>
  <rect x="14" y="56" width="32" height="5" rx="2" fill="#004D40"/>
  <path d="M46,30 L54,52 L48,56 L42,32" fill="#FFCCAA"/>
  <path d="M14,30 L4,46 L9,52 L18,32" fill="#FFCCAA"/>
  <circle cx="6" cy="51" r="7" fill="rgba(180,100,255,0.3)"/>
  <circle cx="6" cy="51" r="4.5" fill="rgba(210,150,255,0.55)"/>
  <circle cx="6" cy="51" r="2.5" fill="rgba(245,210,255,0.9)"/>
  <line x1="2" y1="48" x2="0" y2="43" stroke="rgba(220,180,255,0.9)" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="6" y1="46" x2="6" y2="41" stroke="rgba(220,180,255,0.9)" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="10" y1="48" x2="12" y2="43" stroke="rgba(220,180,255,0.9)" stroke-width="1.2" stroke-linecap="round"/>
  <rect x="26" y="20" width="8" height="10" fill="#FFCCAA"/>
  <circle cx="30" cy="13" r="12" fill="#FFCCAA"/>
  <polygon points="20,7 15,1 25,9" fill="#FFCCAA"/>
  <polygon points="40,7 45,1 35,9" fill="#FFCCAA"/>
  <polygon points="20,6 16,2 24,8" fill="#F48FB1"/>
  <polygon points="40,6 44,2 36,8" fill="#F48FB1"/>
  <path d="M18,16 Q14,7 20,2 Q30,0 40,2 Q46,7 42,16 Q38,22 22,22 Z" fill="#E8E8E8"/>
  <path d="M18,15 Q12,22 10,30" stroke="#E0E0E0" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M42,15 Q48,22 50,30" stroke="#E0E0E0" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="25" cy="13" rx="3.5" ry="3" fill="#FFD600"/>
  <ellipse cx="35" cy="13" rx="3.5" ry="3" fill="#FFD600"/>
  <rect x="24.5" y="10.5" width="1" height="5" rx="0.5" fill="#180800"/>
  <rect x="34.5" y="10.5" width="1" height="5" rx="0.5" fill="#180800"/>
  <circle cx="23.5" cy="11.5" r="0.7" fill="rgba(255,255,255,0.8)"/>
  <circle cx="33.5" cy="11.5" r="0.7" fill="rgba(255,255,255,0.8)"/>
  <path d="M28.5,18 Q30,20 31.5,18 L30,17 Z" fill="#F48FB1"/>
  <path d="M27,21 Q30,23.5 33,21" stroke="#C87DA0" stroke-width="0.7" fill="none"/>
  <line x1="17" y1="18" x2="23" y2="19" stroke="#C0A080" stroke-width="0.7" opacity="0.7"/>
  <line x1="17" y1="20.5" x2="23" y2="20.5" stroke="#C0A080" stroke-width="0.7" opacity="0.7"/>
  <line x1="43" y1="19" x2="37" y2="18" stroke="#C0A080" stroke-width="0.7" opacity="0.7"/>
  <line x1="43" y1="20.5" x2="37" y2="20.5" stroke="#C0A080" stroke-width="0.7" opacity="0.7"/>
</svg>`;

const PITOU_DEBUFFS = [
  { type:'weakness',   name:'Enfeeble',  icon:'💜', spellIcon:'💜',
    desc:'−30% enemy ATK',            turns:3,
    castLines:['She traces a sigil in the air — the enemy\'s strength drains away...'] },
  { type:'vulnerable', name:'Hex Mark',  icon:'🎯', spellIcon:'💫',
    desc:'+30% damage you deal',       turns:3,
    castLines:['Her claw carves a glowing rune — the enemy is marked!'] },
  { type:'freeze',     name:'Petrify',   icon:'❄️', spellIcon:'❄️',
    desc:'Enemies skip attacks',       turns:2,
    castLines:['She exhales cold light — the enemy is frozen solid!'] },
];

const PITOU_GREETINGS = [
  '"Kukuku… you called?"',
  '"I\'ve been watching this whole time."',
  '"How fun. Leave it to me."',
  '"Oh? You actually need help?"',
];

async function invokePitou() {
  if (!combatState || combatState.isParty) return;
  if (combatState.phase === 'win' || combatState.phase === 'lose') return;
  if (combatState._pitouCalled) {
    addCombatLog('🐱 Pitou has already aided you this battle — she can only help once per fight!');
    return;
  }
  if (combatState.busy) return;

  combatState._pitouCalled = true;
  combatState.busy = true;
  renderSkillButtons();

  const debuff = PITOU_DEBUFFS[Math.floor(Math.random() * PITOU_DEBUFFS.length)];

  // Inject SVG into the figure element and reveal it
  const el = document.getElementById('pitou-figure');
  if (!el) { combatState.busy = false; return; }
  el.innerHTML = PITOU_SVG;
  el.style.display = 'block';
  el.className = '';
  void el.offsetWidth;
  el.classList.add('pitou-anim-enter');

  await new Promise(r => setTimeout(r, 750));

  addCombatLog(`🐱 Pitou appears: ${PITOU_GREETINGS[Math.floor(Math.random() * PITOU_GREETINGS.length)]}`);
  await new Promise(r => setTimeout(r, 700));

  // Switch to casting animation
  el.classList.remove('pitou-anim-enter');
  el.classList.add('pitou-anim-cast');

  // Shoot spell projectile toward the enemies
  const arena = document.getElementById('combat-arena');
  if (arena) {
    const proj = document.createElement('div');
    proj.className = 'pitou-spell-proj';
    proj.textContent = debuff.spellIcon;
    arena.appendChild(proj);
    await new Promise(r => setTimeout(r, 560));
    proj.remove();
  } else {
    await new Promise(r => setTimeout(r, 560));
  }

  // Apply debuff — hit all alive monsters with visual FX
  combatState._pitouDebuff = { ...debuff, turnsLeft: debuff.turns };
  addCombatLog(`✨ ${debuff.castLines[0]}`);
  addCombatLog(`💜 ${debuff.name} applied to all enemies! ${debuff.desc} for ${debuff.turns} turn${debuff.turns > 1 ? 's' : ''}!`);
  combatState.monsters.forEach((m, i) => {
    if (m.curHp > 0) {
      const fig = monsterEl(i);
      spawnFxText(debuff.icon, '#cc88ff', fig);
      addAnim(fig, 'anim-hit', 400);
    }
  });
  renderPitouDebuffBadge();

  await new Promise(r => setTimeout(r, 900));

  // Pitou departs
  addCombatLog('🐱 Pitou: "I\'ll be watching." *vanishes into the shadows*');
  el.classList.remove('pitou-anim-cast');
  el.classList.add('pitou-anim-exit');
  await new Promise(r => setTimeout(r, 480));
  el.style.display = 'none';
  el.className = '';

  combatState.busy = false;
  renderSkillButtons();
}

function renderPitouDebuffBadge() {
  if (!combatState) return;
  const debuff = combatState._pitouDebuff;
  combatState.monsters.forEach((m, i) => {
    const card = monsterCard(i);
    if (!card) return;
    let badge = card.querySelector('.cb-monster-debuff');
    if (debuff && m.curHp > 0) {
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'cb-monster-debuff';
        card.insertBefore(badge, card.firstChild);
      }
      badge.textContent = `${debuff.icon} ${debuff.name} (${debuff.turnsLeft}t)`;
    } else if (badge) {
      badge.remove();
    }
  });
}

// ── Combat system ─────────────────────────────────────────────────────────────

let combatState = null;
let _partyActionResolve = null;

// Broadcast current combat state (HPs + new log entries) to all party members
function emitPartySync() {
  if (!combatState || combatState.partyRole !== 'leader' || !partyState?.partyId) return;
  const memberHps = { [me.username]: combatState.player.curHp };
  for (const pm of combatState.partyMembers) memberHps[pm.username] = pm.curHp;
  const newLogs = combatState.log.slice(combatState._syncedLogLen || 0);
  combatState._syncedLogLen = combatState.log.length;
  const dmgEvents = combatState._pendingSyncEvents || [];
  combatState._pendingSyncEvents = [];
  socket.emit('party:sync', {
    partyId: partyState.partyId,
    monsters: combatState.monsters.map(m => ({ curHp: m.curHp, monsterId: m.monsterId })),
    memberHps,
    newLogs,
    dmgEvents,
  });
}

// Leader gives each alive party member an interactive turn, then returns
async function doPartyMemberTurns() {
  if (!combatState?.isParty || combatState.partyRole !== 'leader') return;
  for (let mi = 0; mi < combatState.partyMembers.length; mi++) {
    const member = combatState.partyMembers[mi];
    if (member.curHp <= 0) continue;
    if (!combatState || combatState.monsters.every(m => m.curHp <= 0)) break;
    // Sync state and signal this member's turn
    const memberHps = { [me.username]: combatState.player.curHp };
    for (const pm of combatState.partyMembers) memberHps[pm.username] = pm.curHp;
    const newLogs = combatState.log.slice(combatState._syncedLogLen || 0);
    combatState._syncedLogLen = combatState.log.length;
    socket.emit('party:turn', {
      partyId: partyState.partyId,
      target: member.username,
      monsters: combatState.monsters.map(m => ({ curHp: m.curHp, monsterId: m.monsterId })),
      memberHps,
      newLogs,
    });
    addCombatLog(`⏳ Waiting for ${member.username}…`);
    // Wait up to 20s for the member's action
    const action = await Promise.race([
      new Promise(resolve => { _partyActionResolve = resolve; }),
      new Promise(resolve => setTimeout(() => resolve(null), 20000)),
    ]);
    _partyActionResolve = null;
    if (!combatState) return;
    const mfig = partyMemberFig(mi);
    // Apply action or auto-attack on timeout
    if (action && action.dmg > 0 && action.targetIdx >= 0) {
      const target = combatState.monsters[action.targetIdx];
      if (target && target.curHp > 0) {
        addAnim(mfig, 'anim-atk-r', 700);
        await new Promise(r => setTimeout(r, 340));
        const tfig = monsterEl(action.targetIdx);
        addAnim(tfig, 'anim-hit', 400); addAnim(tfig, 'anim-shake', 450);
        spawnFxText(`-${action.dmg}`, '#ff6060', tfig);
        target.curHp = Math.max(0, target.curHp - action.dmg);
        addCombatLog(action.logText);
        // Queue so other party members see this animation
        if (!combatState._pendingSyncEvents) combatState._pendingSyncEvents = [];
        combatState._pendingSyncEvents.push({ target: 'monster', idx: action.targetIdx, dmg: action.dmg, crit: false, attacker: member.username });
        if (target.curHp <= 0) {
          target.curHp = 0;
          if (tfig) tfig.classList.add('anim-death');
          addCombatLog(`💀 ${target.name} is defeated!`);
          await new Promise(r => setTimeout(r, 500));
        }
      }
    } else if (action && action.targetIdx === -1 && action.logText) {
      // Heal or non-damage action
      addAnim(mfig, 'anim-magic', 550);
      addCombatLog(action.logText);
      member.curHp = Math.min(member.maxHp, member.curHp + (action.healAmt || 0));
      // Queue so other party members see this animation
      if (!combatState._pendingSyncEvents) combatState._pendingSyncEvents = [];
      combatState._pendingSyncEvents.push({ target: 'self', attacker: member.username, healAmt: action.healAmt || 0 });
    } else {
      // Timeout — auto basic attack
      const aliveMonsters = combatState.monsters.filter(m => m.curHp > 0);
      if (aliveMonsters.length) {
        const target = aliveMonsters[0];
        const ti = combatState.monsters.indexOf(target);
        addAnim(mfig, 'anim-atk-r', 700);
        await new Promise(r => setTimeout(r, 340));
        const tfig = monsterEl(ti);
        addAnim(tfig, 'anim-hit', 400); addAnim(tfig, 'anim-shake', 450);
        const atk = member.stats?.atk || 20;
        const dmg = Math.max(1, atk - Math.floor(target.def * 0.5) + randInt(-3, 3));
        spawnFxText(`-${dmg}`, '#ff6060', tfig);
        target.curHp = Math.max(0, target.curHp - dmg);
        addCombatLog(`⚔ ${member.username} attacks ${target.name}: −${dmg} (auto)`);
        if (!combatState._pendingSyncEvents) combatState._pendingSyncEvents = [];
        combatState._pendingSyncEvents.push({ target: 'monster', idx: ti, dmg, crit: false, attacker: member.username });
        if (target.curHp <= 0) {
          target.curHp = 0;
          if (tfig) tfig.classList.add('anim-death');
          addCombatLog(`💀 ${target.name} is defeated!`);
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }
    renderCombatBars();
    emitPartySync();
    if (!combatState || combatState.monsters.every(m => m.curHp <= 0)) break;
  }
}

function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

function monsterEl(idx)     { return document.getElementById(`cb-mon-fig-${idx}`); }
function monsterCard(idx)   { return document.getElementById(`cb-mon-card-${idx}`); }
function partyMemberFig(idx){ return document.getElementById(`cb-party-fig-${idx}`); }

function generateMonsters(zoneId, partySize) {
  const pool = ZONE_MONSTER_POOL[zoneId];
  if (!pool?.length) return [];
  const zone = FOREST_ZONES.find(z => z.id === zoneId) || DESERT_ZONES.find(z => z.id === zoneId) || RIFT_ZONES.find(z => z.id === zoneId);
  const [lvMin, lvMax] = zone?.levelRange || [1, 4];
  const hasBoss = pool.some(id => MONSTER_DEFS[id]?.isBoss);
  const maxCount = hasBoss ? 1 : randInt(1, 3);
  return Array.from({ length: maxCount }, () => {
    const id   = pool[randInt(0, pool.length - 1)];
    const base = MONSTER_DEFS[id];
    const lv   = base.isBoss ? base.level : randInt(lvMin, lvMax);
    const hpBase = Math.round(base.hp * (1 + (lv - 1) * 0.15));
    const hp   = base.isBoss && partySize > 1 ? Math.round(hpBase * (1 + 0.5 * (partySize - 1))) : hpBase;
    const atk  = Math.round(base.atk * (1 + (lv - 1) * 0.10));
    const def  = Math.round(base.def * (1 + (lv - 1) * 0.10));
    const xp   = Math.round((TIER_BASE_XP[base.tier] || 5) * (1 + (lv - 1) * 0.2));
    return { ...base, monsterId: id, level: lv, hp, atk, def, xp, curHp: hp };
  });
}

function startCombat(zoneId, partyMembers = null, memberStats = null, preBuiltMonsters = null, isPartyLeader = true) {
  const pool = ZONE_MONSTER_POOL[zoneId];
  if (!pool?.length) { showToast('⚠ This area is not yet implemented.'); return; }

  const stats = getEffectiveStats(charCache);
  const cls   = charCache?.class || 'Warrior';

  // Use pre-built monsters (party members share the same monsters as leader) or generate fresh
  const partySize = partyMembers ? partyMembers.length : 1;
  const monsters = preBuiltMonsters || generateMonsters(zoneId, partySize);
  const hasBoss = monsters.some(m => m.isBoss);

  const firstTier = monsters[0].tier;
  const tc = TIER_COLORS[firstTier] || TIER_COLORS.D;

  // Start appropriate music
  const isDesertZone = DESERT_ZONES.some(z => z.id === zoneId);
  const isRiftZone   = RIFT_ZONES.some(z => z.id === zoneId);
  try {
    if (zoneId === 'abyssal_sanctum') {
      SoundEngine.play('abyss_boss');
    } else if (isRiftZone) {
      SoundEngine.play('abyss');
    } else if (hasBoss) {
      SoundEngine.play('boss');
    } else if (isDesertZone) {
      SoundEngine.play('desert');
    } else {
      SoundEngine.play('forest');
    }
  } catch(e) { console.warn('SoundEngine error:', e); }

  // Build party member combatants (exclude self)
  const partyOthers = partyMembers ? partyMembers.filter(u => u !== me.username) : [];
  const partyMemberCombatants = partyOthers.map(u => {
    const d      = memberStats?.[u];
    const maxHp  = d?.maxHp || d?.stats?.hp || 100;
    const curHp  = Math.min(d?.curHp ?? maxHp, maxHp);
    // Compute full effective stats (skill tree passives + dodge/crit/block) if skillData is available
    const fullStats = (d?.skillData && d?.stats)
      ? getEffectiveStats({ class: d.class, stats: d.stats, skillData: d.skillData, equipped: d.equipped || [] })
      : (d?.stats || {});
    return { username: u, class: d?.class || 'Warrior', curHp, maxHp, stats: fullStats };
  });

  const _preInvIds = new Set((charCache?.inventory || []).map(i => i.inv_id));

  const _desertZoneIdx = DESERT_ZONES.findIndex(z => z.id === zoneId);
  const _riftZoneIdx   = RIFT_ZONES.findIndex(z => z.id === zoneId);
  combatState = {
    zoneId,
    zoneIdx:           FOREST_ZONES.findIndex(z => z.id === zoneId),
    desertZoneIdx:     _desertZoneIdx,
    riftZoneIdx:       _riftZoneIdx,
    monsters,
    _preInvIds,
    _syncedLogLen: 0,
    player:       { curHp: Math.min(charCache?.curHp ?? stats.hp, stats.hp), maxHp: stats.hp, curMp: stats.mp, maxMp: stats.mp, class: cls, stats, skillData: charCache?.skillData },
    partyMembers: partyMemberCombatants,
    isParty:      partyOthers.length > 0,
    partyRole:    partyOthers.length > 0 ? (isPartyLeader ? 'leader' : 'member') : null,
    phase:        (partyOthers.length > 0 && !isPartyLeader) ? 'waiting' : 'player',
    log:          [],
    busy:         false,
    bossRound:    0,
  };

  // Header
  const zoneInfo = FOREST_ZONES.find(z => z.id === zoneId) || DESERT_ZONES.find(z => z.id === zoneId) || RIFT_ZONES.find(z => z.id === zoneId);
  const badge = document.getElementById('cb-tier-badge');
  badge.textContent      = `Tier ${firstTier}`;
  badge.className        = `cb-tier cb-tier-${firstTier}`;
  badge.style.background = tc.bg;
  badge.style.color      = tc.text;
  document.getElementById('cb-zone-label').textContent = zoneInfo?.name || zoneId;

  // Clear stale party member cards from any previous fight
  document.getElementById('cb-party-members').innerHTML = '';

  // Player figure — clear death animation from previous fight before injecting SVG
  const pfig = document.getElementById('cb-player-figure');
  pfig.classList.remove('anim-death');
  pfig.style.opacity = '';
  pfig.style.transform = '';
  pfig.innerHTML = PLAYER_SVGS[cls] || PLAYER_SVGS.Warrior;

  document.getElementById('cb-player-name').textContent = `${me.username} · ${cls}`;
  document.getElementById('cb-player-level').textContent = `Lv.${charCache?.level || me.level || 1}`;

  // Monster cards
  renderMonsterCards();

  // Enrage: party members skip this — the leader already applied enrage to pre-built monsters.
  // Running it again would double ATK a second time and add a duplicate log.
  if (combatState.partyRole !== 'member') {
    const playerLevel = charCache?.level || me.level || 1;
    const enragedNames = [];
    monsters.forEach((mon, i) => {
      if (mon.level > playerLevel + 3) {
        mon.enraged = true;
        mon.atk = Math.round(mon.atk * 2.0);
        enragedNames.push(mon.name);
        setTimeout(() => {
          const fig = document.getElementById(`cb-mon-fig-${i}`);
          if (fig) fig.classList.add('anim-enraged');
        }, i * 120);
      }
    });
    if (enragedNames.length) {
      setTimeout(() => {
        const names = [...new Set(enragedNames)].join(', ');
        addCombatLog(`🔴 ${names} ${enragedNames.length > 1 ? 'are' : 'is'} enraged by your weakness (3+ levels below)! ATK +100% — be careful!`);
        showToast(`⚠️ ${names} senses you are far weaker and goes berserk! ATK +100%!`);
      }, 400);
    }
  } else {
    // Member: apply enrage visual only (ATK was already doubled by the leader)
    monsters.forEach((mon, i) => {
      if (mon.enraged) {
        setTimeout(() => {
          const fig = document.getElementById(`cb-mon-fig-${i}`);
          if (fig) fig.classList.add('anim-enraged');
        }, i * 120);
      }
    });
  }

  const names = monsters.map(m => m.name).join(', ');
  // Party members skip the local spawn log — they receive it from the leader via party:sync
  if (!combatState || combatState.partyRole !== 'member') {
    addCombatLog(`⚔ ${monsters.length > 1 ? `${monsters.length} enemies appear` : `A ${names} appears`}!`);
  }
  renderCombatBars();
  renderSkillButtons();

  const showCombat = () => {
    const forestEl = document.getElementById('forest-overlay');
    const desertEl = document.getElementById('desert-overlay');
    const riftEl   = document.getElementById('rift-overlay');
    // Remember which map overlay was open so closeCombat can restore it
    // Use === 'block' (not !== 'none') because an unset inline style is '' which !== 'none'
    // Check rift first — it sits above desert (z-index:20 vs 15), so if both are open,
    // rift is the active overlay and should be restored after combat.
    combatState._fromOverlay = riftEl.style.display   === 'block' ? 'rift'
                             : desertEl.style.display === 'block' ? 'desert'
                             : forestEl.style.display === 'block' ? 'forest' : null;
    forestEl.style.display = 'none';
    desertEl.style.display = 'none';
    if (riftEl) riftEl.style.display = 'none';
    document.getElementById('combat-overlay').style.display = 'flex';
  };
  if (zoneId === 'demon') {
    showBossIntro(showCombat);
  } else if (zoneId === 'pharaoh_tomb') {
    showDesertBossIntro(showCombat);
  } else if (zoneId === 'abyssal_sanctum') {
    showAbyssalBossIntro(showCombat);
  } else {
    showCombat();
  }
}

function renderMonsterCards() {
  const area = document.getElementById('cb-monsters-area');
  const count = combatState.monsters.length;
  area.className = `monsters-${count}`;
  area.innerHTML = combatState.monsters.map((mon, i) => {
    const tc = TIER_COLORS[mon.tier] || TIER_COLORS.D;
    const bossClass = mon.isBoss ? ' boss-card' + (mon.bossEnraged ? ' boss-enraged' : '') : '';
    return `<div class="cb-monster-card${bossClass}" id="cb-mon-card-${i}" onclick="onMonsterClick(${i})">
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

  const lv      = charCache?.level || 1;
  const curXp   = charCache?.xp    || 0;
  const xpThis  = (lv - 1) * (lv - 1) * 100;
  const xpNext  = lv * lv * 100;
  document.getElementById('cb-player-xp-fill').style.width = lv >= 50 ? '100%' : pct(curXp - xpThis, xpNext - xpThis);
  document.getElementById('cb-player-xp-num').textContent = lv >= 50 ? 'MAX' : `${curXp - xpThis}/${xpNext - xpThis}`;

  combatState.monsters.forEach((mon, i) => {
    const fill = document.getElementById(`cb-mon-hp-${i}`);
    const num  = document.getElementById(`cb-mon-hp-num-${i}`);
    const card = monsterCard(i);
    if (fill) fill.style.width = pct(mon.curHp, mon.hp);
    if (num)  num.textContent  = `${Math.max(0, mon.curHp)}/${mon.hp}`;
    if (card) {
      const bossClass = mon.isBoss ? ' boss-card' + (mon.bossEnraged ? ' boss-enraged' : '') : '';
      card.className = `cb-monster-card${bossClass}${mon.curHp <= 0 ? ' dead' : ''}`;
    }
  });

  // Party member cards — persistent DOM so animation classes survive re-renders
  const partyEl = document.getElementById('cb-party-members');
  if (combatState.isParty && combatState.partyMembers.length) {
    partyEl.style.display = 'flex';
    combatState.partyMembers.forEach((m, i) => {
      let card = document.getElementById(`cb-party-card-${i}`);
      if (!card) {
        card = document.createElement('div');
        card.id = `cb-party-card-${i}`;
        card.innerHTML = `
          <div class="cb-player-figure" id="cb-party-fig-${i}" style="transform:scaleX(-1)">${PLAYER_SVGS[m.class] || PLAYER_SVGS.Warrior}</div>
          <div class="cb-name">${escHtml(m.username)}</div>
          <div class="cb-hero-bar-row">
            <span class="cb-bar-lbl">HP</span>
            <div class="cb-bar-track"><div class="cb-bar-fill cb-hp-fill" id="cb-party-hp-fill-${i}"></div></div>
            <span class="cb-bar-num" id="cb-party-hp-num-${i}"></span>
          </div>`;
        partyEl.appendChild(card);
      }
      const fill = document.getElementById(`cb-party-hp-fill-${i}`);
      const num  = document.getElementById(`cb-party-hp-num-${i}`);
      if (fill) fill.style.width = pct(m.curHp, m.maxHp);
      if (num)  num.textContent  = `${Math.max(0, m.curHp)}/${m.maxHp}`;
      card.className = `cb-hero-card${m.curHp <= 0 ? ' ko' : ''}`;
    });
  } else {
    partyEl.style.display = 'none';
  }
}

function renderSkillButtons() {
  const el = document.getElementById('combat-skills');
  if (!el || !combatState) return;
  if (combatState.phase === 'win')  { el.innerHTML = '<div class="cb-phase-msg" style="color:var(--gold)">🏆 Victory!</div>'; return; }
  if (combatState.phase === 'lose') { el.innerHTML = '<div class="cb-phase-msg" style="color:#e07070">💀 Defeated...</div>'; return; }
  if (combatState.player.ko) { el.innerHTML = '<div class="cb-phase-msg" style="color:#e07070">💀 KO\'d — allies fight on...</div>'; return; }
  if (combatState.partyRole === 'member' && combatState.phase === 'waiting') {
    el.innerHTML = '<div class="cb-phase-msg" style="color:#aaa">⏳ Waiting for your turn…</div>';
    return;
  }
  if (combatState.targetMode) {
    el.innerHTML = `<div class="cb-phase-msg" style="color:#8aaccc;font-size:12px">
      🎯 Select a target&hellip;
      <button class="skill-btn" style="margin-left:10px;padding:4px 12px;font-size:10px" onclick="cancelTargetMode()">✕ Cancel</button>
    </div>`;
    return;
  }
  const busy   = combatState.busy || combatState.phase !== 'player';
  const skills = getPlayerCombatSkills(combatState.player);
  el.innerHTML = skills.map(sk => {
    const actualCost = sk.mpCostPct
      ? Math.max(1, Math.floor(combatState.player.maxMp * sk.mpCostPct / 100))
      : sk.mpCost;
    const noMp   = actualCost > 0 && combatState.player.curMp < actualCost;
    const tgtTag = sk.heal ? '💚 Self' : sk.target === 'self' ? '🛡 Self' : sk.target === 'all' ? '◎ All' : '◉ Single';
    const costLabel = sk.mpCostPct ? `${sk.mpCostPct}% max MP` : sk.mpCost ? `${sk.mpCost} MP` : 'Free';
    return `<button class="skill-btn${noMp ? ' no-mp' : ''}"
      onclick="useSkill('${sk.id}')" ${(busy || noMp) ? 'disabled' : ''}>
      ${escHtml(sk.name)}
      <span class="sk-cost">${costLabel}</span>
      <span class="sk-target">${tgtTag}</span>
    </button>`;
  }).join('');
}

// ── Animations ────────────────────────────────────────────────────────────────

function spawnFxText(text, color, anchorEl, crit = false) {
  const el = Object.assign(document.createElement('div'), { className:'cb-dmg-text' + (crit ? ' cb-dmg-crit' : ''), textContent:text });
  el.style.color = color || '#fff';
  if (anchorEl) {
    const r = anchorEl.getBoundingClientRect();
    el.style.left = `${r.left + r.width / 2}px`;
    el.style.top  = `${r.top}px`;
  }
  document.body.appendChild(el);
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
    case 'magic': case 'burst':
      addAnim(atkEl, 'anim-magic', 550);
      await new Promise(r => setTimeout(r, 140));
      await spawnProjectile(proj, playerAttacking);
      hitAll('anim-hit', 400);
      await new Promise(r => setTimeout(r, 340));
      break;
    case 'curse':
      addAnim(atkEl, 'anim-curse', 550);
      await new Promise(r => setTimeout(r, 140));
      await spawnProjectile(proj, playerAttacking);
      hitAll('anim-hit', 400);
      await new Promise(r => setTimeout(r, 340));
      break;
    case 'buff':
      addAnim(atkEl, 'anim-buff', 700);
      await new Promise(r => setTimeout(r, 700));
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
  if (!combatState || combatState.busy || combatState.phase !== 'player' || combatState.player.ko) return;
  const skills = getPlayerCombatSkills(combatState.player);
  const skill  = skills.find(s => s.id === skillId);
  if (!skill) return;
  const _actualCost = skill.mpCostPct
    ? Math.max(1, Math.floor(combatState.player.maxMp * skill.mpCostPct / 100))
    : skill.mpCost;
  if (_actualCost > combatState.player.curMp) { showToast('❌ Not enough MP!'); return; }

  // Party member: compute action locally and relay to leader
  if (combatState.partyRole === 'member') {
    combatState.player.curMp -= _actualCost;
    let dmg = 0, targetIdx = -1, logText = '', healAmt = 0;
    if (skill.heal) {
      healAmt = Math.floor(combatState.player.stats.spirit * (skill.healMult || 3));
      combatState.player.curHp = Math.min(combatState.player.maxHp, combatState.player.curHp + healAmt);
      logText = `💚 ${me.username} uses ${skill.name}: +${healAmt} HP`;
    } else if (skill.type === 'guard') {
      const pt  = Math.min((skill.pts || 1), 3) - 1;
      const reduction = (skill.reductionByPt || [0.5, 0.6, 0.6])[pt];
      const hits      = (skill.hitsByPt      || [2,   2,   3  ])[pt];
      const pts       = skill.pts || 1;
      combatState.player.ironGuard = { reduction, hitsRemaining: hits,
        blockBonus: (skill.blockPerPt || 0) * pts,
        dodgeBonus: (skill.dodgePerPt || 0) * pts };
      logText = `🛡️ ${me.username} uses ${skill.name}: ${Math.round(reduction * 100)}% damage reduction for ${hits} hit${hits > 1 ? 's' : ''}!`;
    } else if (skill.type === 'divine_shield') {
      const pt        = Math.min((skill.pts || 1), 3) - 1;
      const reduction = (skill.reductionByPt || [0.5, 0.75, 1.0])[pt];
      const hits      = skill.hits || 2;
      combatState.player.divineShield = { reduction, hitsRemaining: hits };
      const label = reduction >= 1.0 ? 'INVINCIBLE' : `${Math.round(reduction * 100)}% dmg reduction`;
      logText = `🔰 ${me.username} uses ${skill.name}: ${label} for ${hits} hit${hits > 1 ? 's' : ''}!`;
    } else {
      targetIdx = combatState.monsters.findIndex(m => m.curHp > 0);
      if (targetIdx === -1) return;
      const target = combatState.monsters[targetIdx];
      const isCrit = Math.random() * 100 < (combatState.player.stats.critRate || 0);
      const raw = Math.floor(combatState.player.stats.atk * skill.dmgMult) - Math.floor(target.def * 0.5) + randInt(-3, 3);
      dmg = Math.max(1, isCrit ? raw * 2 : raw);
      logText = `⚔ ${me.username} uses ${skill.name} on ${target.name}: ${isCrit ? '💥 CRIT ' : ''}−${dmg}`;
    }
    combatState.phase = 'waiting';
    renderSkillButtons();
    renderCombatBars();
    // Show local animation + fx so the member sees their own action
    const pfig = document.getElementById('cb-player-figure');
    const isSelfBuff = skill.type === 'guard' || skill.type === 'divine_shield';
    addAnim(pfig, skill.heal ? 'anim-heal' : isSelfBuff ? 'anim-buff' : 'anim-atk-r', 700);
    if (skill.heal) {
      spawnFxText(`+${healAmt}`, '#4ade80', pfig);
    } else if (skill.type === 'guard') {
      spawnFxText('GUARD!', '#88ccff', pfig);
    } else if (skill.type === 'divine_shield') {
      spawnFxText('DIVINE!', '#ffe080', pfig);
    } else if (targetIdx >= 0) {
      const isCrit = dmg > 0 && logText.includes('CRIT');
      setTimeout(() => {
        const tfig = monsterEl(targetIdx);
        addAnim(tfig, 'anim-hit', 400); addAnim(tfig, 'anim-shake', 450);
        spawnFxText(`-${dmg}`, isCrit ? '#ff2020' : '#ff6060', tfig, isCrit);
      }, 340);
    }
    // Only send guard/shield state when the member just activated the buff (not on every action).
    // Sending stale hitsRemaining on later turns would reset the leader's tracked hit count.
    const guardState  = skillId === 'iron_guard'    && combatState.player.ironGuard    ? { ...combatState.player.ironGuard }    : undefined;
    const shieldState = skillId === 'divine_shield' && combatState.player.divineShield ? { ...combatState.player.divineShield } : undefined;
    socket.emit('party:action', { partyId: partyState.partyId, skillId, targetIdx, dmg, healAmt, logText, guardState, shieldState });
    return;
  }

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

// Queue a monster-hit event so party members see the leader's damage numbers + animations via party:sync
function _queueMonsterHit(monIdx, dmg, crit = false) {
  if (!combatState.isParty || combatState.partyRole !== 'leader') return;
  if (!combatState._pendingSyncEvents) combatState._pendingSyncEvents = [];
  combatState._pendingSyncEvents.push({ target: 'monster', idx: monIdx, dmg, crit, attacker: me.username });
}

function _applyLifesteal(dmgDealt) {
  const pct = combatState?.player?.stats?.lifestealPct || 0;
  if (!pct || dmgDealt <= 0) return;
  const heal = Math.max(1, Math.floor(dmgDealt * pct / 100));
  combatState.player.curHp = Math.min(combatState.player.maxHp, combatState.player.curHp + heal);
  addCombatLog(`🧛 Lifesteal: +${heal} HP`);
  spawnFxText(`+${heal}`, '#cc44ff', document.getElementById('cb-player-figure'));
}

function _applySoulHarvest() {
  const pct = combatState?.player?.stats?.onKillHealPct || 0;
  if (!pct) return;
  const heal = Math.max(1, Math.floor(combatState.player.maxHp * pct / 100));
  combatState.player.curHp = Math.min(combatState.player.maxHp, combatState.player.curHp + heal);
  addCombatLog(`💜 Soul Harvest: +${heal} HP on kill!`);
  spawnFxText(`+${heal}`, '#9040ff', document.getElementById('cb-player-figure'));
}

async function executeSkill(skillId, targetIdx = null) {
  const skills = getPlayerCombatSkills(combatState.player);
  const skill  = skills.find(s => s.id === skillId);

  combatState.busy = true;
  const _cost = skill.mpCostPct
    ? Math.max(1, Math.floor(combatState.player.maxMp * skill.mpCostPct / 100))
    : skill.mpCost;
  combatState.player.curMp -= _cost;
  renderSkillButtons();
  renderCombatBars();

  const _sfxCls = charCache?.class || 'Warrior';

  // ── Self-heal ──────────────────────────────────────────────────────────────
  if (skill.heal) {
    await doAnimation(skill.type, true, 0);
    try { SoundEngine.playSfxBuff(); } catch(e) {}
    const mult = skill.healMult || 3;
    const amt = Math.floor(combatState.player.stats.spirit * mult);
    combatState.player.curHp = Math.min(combatState.player.maxHp, combatState.player.curHp + amt);
    addCombatLog(`💚 ${skill.name}: +${amt} HP`);
    spawnFxText(`+${amt}`, '#4ade80', document.getElementById('cb-player-figure'));

  // ── Iron Guard (defensive stance) ─────────────────────────────────────────
  } else if (skill.type === 'guard') {
    await doAnimation('buff', true, 0);
    try { SoundEngine.playSfxBuff(); } catch(e) {}
    const pt  = Math.min((skill.pts || 1), 3) - 1;
    const reduction = (skill.reductionByPt || [0.5, 0.6, 0.6])[pt];
    const hits      = (skill.hitsByPt      || [2,   2,   3  ])[pt];
    const pts       = skill.pts || 1;
    combatState.player.ironGuard = { reduction, hitsRemaining: hits,
      blockBonus: (skill.blockPerPt || 0) * pts,
      dodgeBonus: (skill.dodgePerPt || 0) * pts };
    addCombatLog(`🛡️ ${skill.name}: ${Math.round(reduction * 100)}% damage reduction for ${hits} hit${hits > 1 ? 's' : ''}!`);
    spawnFxText('GUARD!', '#88ccff', document.getElementById('cb-player-figure'));

  // ── Time Stop (freeze enemies) ─────────────────────────────────────────────
  } else if (skill.freeze) {
    await doAnimation('buff', true, 0);
    try { SoundEngine.playSfxBuff(); } catch(e) {}
    const pt  = Math.min((skill.pts || 1), 3) - 1;
    const dur = (skill.durationByPt || [1, 2, 3])[pt];
    combatState._pitouDebuff = { type: 'freeze', name: 'Time Stop', turnsLeft: dur };
    renderPitouDebuffBadge();
    addCombatLog(`⏸️ ${skill.name}: All enemies frozen for ${dur} turn${dur > 1 ? 's' : ''}!`);
    spawnFxText('FROZEN!', '#88d8ff', document.getElementById('cb-player-figure'));

  // ── Divine Shield (turn-based immunity) ───────────────────────────────────
  } else if (skill.type === 'divine_shield') {
    await doAnimation('buff', true, 0);
    try { SoundEngine.playSfxBuff(); } catch(e) {}
    const pt        = Math.min((skill.pts || 1), 3) - 1;
    const reduction = (skill.reductionByPt || [0.5, 0.75, 1.0])[pt];
    const hits      = skill.hits || 2;
    combatState.player.divineShield = { reduction, hitsRemaining: hits };
    const label = reduction >= 1.0 ? 'INVINCIBLE' : `${Math.round(reduction * 100)}% dmg reduction`;
    addCombatLog(`🔰 ${skill.name}: ${label} for ${hits} hit${hits > 1 ? 's' : ''}!`);
    spawnFxText(reduction >= 1.0 ? 'INVINCIBLE!' : 'DIVINE!', '#ffe080', document.getElementById('cb-player-figure'));

  // ── AoE attack ────────────────────────────────────────────────────────────
  } else if (skill.target === 'all') {
    const alive = combatState.monsters.map((m, i) => ({ m, i })).filter(({ m }) => m.curHp > 0);
    if (!alive.length) { await handleCombatWin(); return; }

    await doAnimation(skill.type, true, 'all');
    try { skill.type === 'curse' ? SoundEngine.playSfxCurse() : SoundEngine.playSfxPlayerAttack(_sfxCls, false); } catch(e) {}

    const critRate = combatState.player.stats.critRate || 0;
    const critDmgBonus = combatState.player.stats.critDmgBonus || 0;
    const label = alive.length > 1 ? 'all enemies' : alive[0].m.name;
    addCombatLog(`⚔ ${skill.name} hits ${label}!`);
    let _aoeTotal = 0;
    const _vulnMult = combatState._pitouDebuff?.type === 'vulnerable' ? 1.3 : 1.0;
    for (const [idx, { m: target, i: ti }] of alive.entries()) {
      const isCrit = Math.random() * 100 < critRate;
      const defMult = skill.defPierce !== undefined ? (1 - skill.defPierce) : 0.5;
      const raw = Math.floor(combatState.player.stats.atk * skill.dmgMult)
                  - Math.floor(target.def * defMult) + randInt(-3, 3);
      const critMult = isCrit ? 2 + critDmgBonus / 100 : 1;
      const dmg = Math.max(1, Math.floor((critMult > 1 ? raw * critMult : raw) * _vulnMult));
      _aoeTotal += dmg;
      target.curHp -= dmg;
      addCombatLog(`  ${target.name}: ${isCrit ? '💥 CRIT ' : ''}−${dmg}`);
      const fig = monsterEl(ti);
      setTimeout(() => spawnFxText(`-${dmg}`, isCrit ? '#ff2020' : '#ff6060', fig, isCrit), idx * 80);
      setTimeout(() => { try { SoundEngine.playSfxEnemyHit(isCrit); } catch(e) {} }, idx * 80 + 130);
      _queueMonsterHit(ti, dmg, isCrit);
      if (target.curHp <= 0) {
        target.curHp = 0;
        const fig = monsterEl(ti);
        if (fig) fig.classList.add('anim-death');
        addCombatLog(`💀 ${target.name} is defeated!`);
        _applySoulHarvest();
      }
    }
    if (alive.some(({ m }) => m.curHp <= 0)) await new Promise(r => setTimeout(r, 600));
    _applyLifesteal(_aoeTotal);

  // ── Single-target attack ───────────────────────────────────────────────────
  } else {
    if (targetIdx === null) targetIdx = combatState.monsters.findIndex(m => m.curHp > 0);
    if (targetIdx === -1)  { await handleCombatWin(); return; }
    const target = combatState.monsters[targetIdx];

    await doAnimation(skill.type, true, targetIdx);

    const critRate = combatState.player.stats.critRate || 0;
    const critDmgBonus = combatState.player.stats.critDmgBonus || 0;
    const isCrit   = Math.random() * 100 < critRate;
    try { skill.type === 'curse' ? SoundEngine.playSfxCurse() : SoundEngine.playSfxPlayerAttack(_sfxCls, isCrit); } catch(e) {}
    const defMult  = skill.defPierce !== undefined ? (1 - skill.defPierce) : 0.5;
    const raw = Math.floor(combatState.player.stats.atk * skill.dmgMult)
                - Math.floor(target.def * defMult) + randInt(-3, 3);
    const vulnMult = combatState._pitouDebuff?.type === 'vulnerable' ? 1.3 : 1.0;
    const critMult = isCrit ? 2 + critDmgBonus / 100 : 1;
    const dmg = Math.max(1, Math.floor((critMult > 1 ? raw * critMult : raw) * vulnMult));
    target.curHp -= dmg;
    addCombatLog(`⚔ ${skill.name} hits ${target.name}: ${isCrit ? '💥 CRIT ' : ''}−${dmg}`);
    spawnFxText(`-${dmg}`, isCrit ? '#ff2020' : '#ff6060', monsterEl(targetIdx), isCrit);
    setTimeout(() => { try { SoundEngine.playSfxEnemyHit(isCrit); } catch(e) {} }, 140);
    _queueMonsterHit(targetIdx, dmg, isCrit);
    _applyLifesteal(dmg);
    // ── Death Mark multi-hit ──────────────────────────────────────────────────
    if (skill.multiHit && target.curHp > 0) {
      const critRate2 = combatState.player.stats.critRate || 0;
      if (Math.random() < skill.multiHit.chance2) {
        await new Promise(r => setTimeout(r, 300));
        const isCrit2 = Math.random() * 100 < critRate2;
        const raw2 = Math.floor(combatState.player.stats.atk * skill.dmgMult) - Math.floor(target.def * 0.5) + randInt(-3, 3);
        const dmg2 = Math.max(1, isCrit2 ? raw2 * 2 : raw2);
        target.curHp = Math.max(0, target.curHp - dmg2);
        addCombatLog(`💀 Death Mark strikes again! ${isCrit2 ? '💥 CRIT ' : ''}−${dmg2}`);
        spawnFxText(`-${dmg2}`, isCrit2 ? '#ff2020' : '#aa2020', monsterEl(targetIdx), isCrit2);
        _queueMonsterHit(targetIdx, dmg2, isCrit2);
        _applyLifesteal(dmg2);
        if (target.curHp > 0 && Math.random() < skill.multiHit.chance3) {
          await new Promise(r => setTimeout(r, 300));
          const isCrit3 = Math.random() * 100 < critRate2;
          const raw3 = Math.floor(combatState.player.stats.atk * skill.dmgMult) - Math.floor(target.def * 0.5) + randInt(-3, 3);
          const dmg3 = Math.max(1, isCrit3 ? raw3 * 2 : raw3);
          target.curHp = Math.max(0, target.curHp - dmg3);
          addCombatLog(`💀 Death Mark — third strike! ${isCrit3 ? '💥 CRIT ' : ''}−${dmg3}`);
          spawnFxText(`-${dmg3}`, isCrit3 ? '#ff2020' : '#aa2020', monsterEl(targetIdx), isCrit3);
          _queueMonsterHit(targetIdx, dmg3, isCrit3);
          _applyLifesteal(dmg3);
        }
      }
    }
    if (target.curHp <= 0) {
      target.curHp = 0;
      const fig = monsterEl(targetIdx);
      if (fig) fig.classList.add('anim-death');
      addCombatLog(`💀 ${target.name} is defeated!`);
      _applySoulHarvest();
      await new Promise(r => setTimeout(r, 600));
    }
  }

  renderCombatBars();
  if (combatState.monsters.every(m => m.curHp <= 0)) { await handleCombatWin(); return; }

  // Immediately push the leader's attack damage numbers to party members
  emitPartySync();

  // Party member interactive turns (leader awaits each member's chosen action)
  if (combatState.isParty && combatState.partyRole === 'leader') {
    await doPartyMemberTurns();
    if (!combatState || combatState.phase === 'win' || combatState.phase === 'lose') return;
    if (combatState.monsters.every(m => m.curHp <= 0)) { await handleCombatWin(); return; }
  }

  combatState.phase = 'enemy';
  renderSkillButtons();
  await new Promise(r => setTimeout(r, 400));
  await monsterTurn();
  // If leader was KO'd during the monster attack, hand off to the ally auto-turn loop
  if (combatState && combatState.player.ko && combatState.partyMembers?.some(m => m.curHp > 0)) {
    await doAllyAutoTurn();
  }
}

// ── Boss intro cutscene ────────────────────────────────────────────────────────

// ── Desert Saharrrra ──────────────────────────────────────────────────────────

const DESERT_ZONES = [
  { id:'dunes',        name:'The Sunscorched Dunes',     sub:'Scorching heat · Sand as far as the eye can see', pos:{left:'26%',top:'65%'}, levelRange:[13,18] },
  { id:'bone_wastes',  name:'The Bone Wastes',           sub:'Ancient dead · Sandstorms rattle the bones',       pos:{left:'44%',top:'50%'}, levelRange:[18,23], danger:true },
  { id:'canyons',      name:'The Whispering Canyons',    sub:'Wind-carved walls · Echoes of the fallen',         pos:{left:'60%',top:'36%'}, levelRange:[23,28], danger:true },
  { id:'mirror_oasis', name:'The Oasis of Mirrors',      sub:'Mirages shimmer · Trust nothing',                  pos:{left:'75%',top:'52%'}, levelRange:[28,33], danger:true },
  { id:'pharaoh_tomb', name:'☠ Tomb of the Forgotten Sun', sub:'??? · Do not enter alone',                       pos:{left:'88%',top:'20%'}, levelRange:[35,35], danger:true },
];

let _desertProgress = 0;

function getDesertProgress() { return _desertProgress; }

async function setDesertProgress(v) {
  _desertProgress = v;
  await api('POST', '/api/me/desert-progress', { desert_progress: v });
}

function updateEasternGate() {
  const btn = document.getElementById('eastern-gate-btn');
  if (btn) btn.style.display = _forestProgress >= FOREST_ZONES.length ? 'block' : 'none';
}

function renderDesertMap() {
  const progress = getDesertProgress();
  const campDescs = [
    'A lone tent. A dying campfire. The wind carries only sand.',
    'A spice merchant has set up stall. The smell of cardamom cuts through the heat.',
    'Sacred waters have seeped up from the rock. The Holy Well draws weary travelers.',
    'Oasis Camp — a crossroads of the eastern trade routes. Voices, lanterns, and commerce.',
  ];
  const campDesc = campDescs[Math.min(progress, campDescs.length - 1)];

  const zonesHtml = DESERT_ZONES.map((z, i) => {
    const locked    = i > progress;
    const completed = i < progress;
    const dangerCls = z.danger && !locked ? ' danger' : '';
    const stateCls  = locked ? ' locked' : completed ? ' done' : '';
    const clickAttr = locked ? '' : `onclick="onDesertZoneClick('${z.id}')"`;
    return `<div class="dm-zone${dangerCls}${stateCls}" style="left:${z.pos.left};top:${z.pos.top}" ${clickAttr}>
      <div class="dm-zone-label">
        ${locked    ? '<div class="dm-lock">🔒</div>' : ''}
        ${completed ? '<div class="dm-done">✓</div>'  : ''}
        <div class="dm-zone-name">${z.name}</div>
        <div class="dm-zone-sub">${locked ? 'Complete previous area first' : z.sub}</div>
        ${!locked && z.levelRange ? `<div class="dm-zone-lvrange">Lv.${z.levelRange[0]}–${z.levelRange[1]}</div>` : ''}
      </div>
      <div class="dm-connector"></div>
    </div>`;
  }).join('');

  const campHtml = `<div class="dm-camp" style="left:8%;top:72%" onclick="openDesertCamp()">
    <div class="dm-zone-label">
      <div class="dm-zone-name">🏕 Oasis Camp</div>
      <div class="dm-zone-sub" style="font-style:italic;font-size:10px">${campDesc}</div>
    </div>
  </div>`;

  const riftGateHtml = progress >= DESERT_ZONES.length
    ? `<div id="rift-gate-btn" style="display:flex" onclick="openRiftGate()">
        <div id="rift-gate-btn-name">🌌 The Abyssal Rift</div>
        <div id="rift-gate-btn-sub">A wound in the sky calls to you</div>
      </div>`
    : '';

  document.getElementById('dm-zones').innerHTML = campHtml + zonesHtml + riftGateHtml;
}

let _desertTimer = null;

function openDesert() {
  fetchAndCacheStats().catch(() => {});
  try { SoundEngine.play('desert'); } catch(e) {}

  const overlay = document.getElementById('desert-overlay');
  const loading = document.getElementById('desert-loading');
  const map     = document.getElementById('desert-map');
  overlay.style.display = 'block';
  loading.style.display = '';
  map.style.display = 'none';

  const bar = document.getElementById('dld-bar');
  bar.style.transition = 'none';
  bar.style.width = '0%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.style.transition = 'width 1s linear';
    bar.style.width = '100%';
  }));

  clearTimeout(_desertTimer);
  _desertTimer = setTimeout(() => {
    loading.style.display = 'none';
    map.style.display = 'block';
    renderDesertMap();
  }, 1000);
}

function closeDesert() {
  clearTimeout(_desertTimer);
  document.getElementById('desert-overlay').style.display = 'none';
  document.getElementById('desert-loading').style.display = '';
  document.getElementById('desert-map').style.display = 'none';
  SoundEngine.play('town');
}


function onDesertZoneClick(id) {
  const idx      = DESERT_ZONES.findIndex(z => z.id === id);
  const progress = getDesertProgress();
  if (idx > progress) { showToast('🔒 Complete the previous area first.'); return; }
  const pool = ZONE_MONSTER_POOL[id] || [];
  const hasBoss = pool.some(mid => MONSTER_DEFS[mid]?.isBoss);
  if (hasBoss) {
    openPartyModal(id);
  } else {
    startCombat(id);
  }
}

const RASHID_LINES = [
  'As the last ember of the Demon Lord\'s fire died, the creature let out a final, rattling wheeze...',
  '"The Eye... sleeps in Saharrrra... when it wakes... all light dies..."',
  'The scholars were summoned. Their verdict was grim: an ancient cursed artifact — The Eye of the Forgotten Sun — sleeps beneath the desert sands.',
  'If it awakens, the world drowns in eternal darkness. The only path forward leads east.',
  '"I can take you by camel. But know this — the desert is no forest. It is vast, merciless... and it has its own dead." — Caravan Master Rashid',
];

// Module-level handler ref so removeEventListener always removes the right function
let _teAdvanceHandler = null;

function openEasternGate() {
  if (localStorage.getItem('rpg_eastern_gate_seen')) { openDesert(); return; }
  localStorage.setItem('rpg_eastern_gate_seen', '1');
  const overlay  = document.getElementById('travel-east-overlay');
  const textEl   = document.getElementById('te-text');
  const promptEl = document.getElementById('te-prompt');
  const journBtn = document.getElementById('te-journey-btn');

  // Remove any leftover listener from a previous open
  if (_teAdvanceHandler) {
    overlay.removeEventListener('click', _teAdvanceHandler);
    _teAdvanceHandler = null;
  }

  overlay.style.display = 'flex';
  let lineIdx = 0, typing = false, ticker = null;

  function showFull() {
    if (ticker) { clearInterval(ticker); ticker = null; }
    typing = false;
    textEl.textContent = RASHID_LINES[lineIdx];
    const isLast = lineIdx >= RASHID_LINES.length - 1;
    promptEl.style.display = isLast ? 'none' : 'block';
    journBtn.style.display  = isLast ? 'block' : 'none';
  }

  function typeLine(idx) {
    promptEl.style.display = 'none';
    journBtn.style.display = 'none';
    textEl.textContent = '';
    typing = true;
    let i = 0;
    ticker = setInterval(() => {
      textEl.textContent += RASHID_LINES[idx][i++];
      if (i >= RASHID_LINES[idx].length) { clearInterval(ticker); ticker = null; showFull(); }
    }, 34);
  }

  function advance() {
    if (typing) { showFull(); return; }
    if (lineIdx < RASHID_LINES.length - 1) { lineIdx++; typeLine(lineIdx); }
  }

  function closeAndRide() {
    if (ticker) { clearInterval(ticker); ticker = null; }
    overlay.style.display = 'none';
    overlay.removeEventListener('click', advance);
    _teAdvanceHandler = null;
    journBtn.onclick = null;
    // Defer openDesert past the current click event to avoid propagation issues
    setTimeout(openDesert, 80);
  }

  _teAdvanceHandler = advance;
  overlay.addEventListener('click', advance);
  journBtn.onclick = (e) => { e.stopPropagation(); closeAndRide(); };
  typeLine(0);
}

function openDesertCamp() {
  document.getElementById('bld-popup-icon').textContent = '🏕';
  document.getElementById('bld-popup-name').textContent = 'Oasis Camp';
  const campDescs = [
    'A lone tent. A dying campfire. The wind carries only sand.',
    'A spice merchant has set up stall. The smell of cardamom cuts through the heat.',
    'Sacred waters have seeped up from the rock. The Holy Well draws weary travelers.',
    'Oasis Camp — a crossroads of the eastern trade routes. Voices, lanterns, and commerce.',
  ];
  document.getElementById('bld-popup-sub').textContent =
    campDescs[Math.min(getDesertProgress(), campDescs.length - 1)];
  document.getElementById('bld-popup-actions').innerHTML = `
    <button class="bld-action-btn" onclick="healAtHolyWell()">🏺 Holy Well — Restore HP &amp; MP</button>
    <button class="bld-action-btn" onclick="closeBldPopup();openBlacksmith()">🛍 Sand Bazaar — Buy / Sell Gear</button>
    <button class="bld-action-btn" onclick="closeBldPopup();closeDesert()">🐪 Return to Town</button>
  `;
  document.getElementById('bld-popup').classList.add('show');
}

async function healAtHolyWell() {
  const res = await api('POST', '/api/me/heal').catch(() => null);
  if (res?.ok) {
    if (charCache) { charCache.curHp = res.curHp; charCache.curMp = res.curMp; }
    showToast(`🏺 The holy waters restore you! HP & MP fully restored! (${res.curHp} HP / ${res.curMp} MP)`);
    closeBldPopup();
  } else {
    showToast('❌ The well ran dry. Try again.');
  }
}

const DESERT_BOSS_INTRO_LINES = [
  "You dare disturb my eternal rest? Ten thousand years I have waited.",
  "My kingdom crumbled. My people turned to dust. But I endure — bound to this curse.",
  "The Eye of the Forgotten Sun does not belong to the living. You will join my servants.",
];

function showDesertBossIntro(onDone) {
  if (localStorage.getItem('rpg_desert_boss_intro_seen')) { onDone(); return; }

  const overlay  = document.getElementById('desert-boss-intro-overlay');
  const textEl   = document.getElementById('desert-boss-intro-text');
  const promptEl = document.getElementById('desert-boss-intro-prompt');
  const fightBtn = document.getElementById('desert-boss-intro-fight-btn');
  const pharaohEl = document.getElementById('desert-boss-intro-pharaoh');

  const lines = DESERT_BOSS_INTRO_LINES;

  pharaohEl.innerHTML = MONSTER_SVGS['pharaoh_wrath'] || '';
  overlay.style.display = 'flex';
  pharaohEl.style.animation = 'boss-intro-appear .8s ease-out forwards, boss-intro-float 3s ease-in-out 0.8s infinite';

  let lineIdx = 0;
  let typing  = false;
  let ticker  = null;

  function showFull() {
    if (ticker) { clearInterval(ticker); ticker = null; }
    typing = false;
    textEl.textContent = lines[lineIdx];
    const isLast = lineIdx >= lines.length - 1;
    promptEl.style.display = isLast ? 'none' : 'block';
    fightBtn.style.display  = isLast ? 'block' : 'none';
  }

  function typeLine(idx) {
    promptEl.style.display = 'none';
    fightBtn.style.display = 'none';
    textEl.textContent = '';
    typing = true;
    let i = 0;
    ticker = setInterval(() => {
      textEl.textContent += lines[idx][i++];
      if (i >= lines[idx].length) { clearInterval(ticker); ticker = null; showFull(); }
    }, 38);
  }

  function advance() {
    if (typing) { showFull(); return; }
    if (lineIdx < lines.length - 1) { lineIdx++; typeLine(lineIdx); }
  }

  function closeDesertBossIntro() {
    overlay.style.display = 'none';
    overlay.removeEventListener('click', advance);
    fightBtn.onclick = null;
    localStorage.setItem('rpg_desert_boss_intro_seen', '1');
    onDone();
  }

  overlay.addEventListener('click', advance);
  fightBtn.onclick = (e) => { e.stopPropagation(); closeDesertBossIntro(); };

  typeLine(0);
}

const ABYSS_BOSS_INTRO_LINES = [
  "You dare approach the Abyssal Sanctum? Ten billion years of silence — and you choose now to interrupt it.",
  "I do not destroy. I erase. Your world, your history, your name — all of it, gone as if it never existed.",
  "The worlds that came before yours? You cannot remember them because I finished my work. You are simply next.",
  "There is no victory here. There is only the question of how much of existence survives your failure.",
  "Fight then, little spark. I have extinguished stars. You are merely... charming.",
];

function showAbyssalBossIntro(onDone) {
  if (localStorage.getItem('rpg_abyss_boss_intro_seen')) { onDone(); return; }

  const overlay  = document.getElementById('abyss-boss-intro-overlay');
  const textEl   = document.getElementById('abyss-boss-intro-text');
  const promptEl = document.getElementById('abyss-boss-intro-prompt');
  const fightBtn = document.getElementById('abyss-boss-intro-fight-btn');
  const entityEl = document.getElementById('abyss-boss-intro-entity');

  const lines = ABYSS_BOSS_INTRO_LINES;

  entityEl.innerHTML = MONSTER_SVGS['abyssal_god'] || '<div style="font-size:120px;text-align:center">🌌</div>';
  overlay.style.display = 'flex';

  let lineIdx = 0;
  let typing  = false;
  let ticker  = null;

  function showFull() {
    if (ticker) { clearInterval(ticker); ticker = null; }
    typing = false;
    textEl.textContent = lines[lineIdx];
    const isLast = lineIdx >= lines.length - 1;
    promptEl.style.display = isLast ? 'none' : 'block';
    fightBtn.style.display  = isLast ? 'block' : 'none';
  }

  function typeLine(idx) {
    promptEl.style.display = 'none';
    fightBtn.style.display = 'none';
    textEl.textContent = '';
    typing = true;
    let i = 0;
    ticker = setInterval(() => {
      textEl.textContent += lines[idx][i++];
      if (i >= lines[idx].length) { clearInterval(ticker); ticker = null; showFull(); }
    }, 35);
  }

  function advance() {
    if (typing) { showFull(); return; }
    if (lineIdx < lines.length - 1) { lineIdx++; typeLine(lineIdx); }
  }

  function closeAbyssBossIntro() {
    overlay.style.display = 'none';
    overlay.removeEventListener('click', advance);
    fightBtn.onclick = null;
    localStorage.setItem('rpg_abyss_boss_intro_seen', '1');
    onDone();
  }

  overlay.addEventListener('click', advance);
  fightBtn.onclick = (e) => { e.stopPropagation(); closeAbyssBossIntro(); };

  typeLine(0);
}

async function abyssalBossSummonMinion() {
  const base = MONSTER_DEFS['rift_architect'];
  const lv   = base.level;
  const hp   = Math.round(base.hp  * (1 + (lv - 1) * 0.15));
  const atk  = Math.round(base.atk * (1 + (lv - 1) * 0.10));
  const def  = Math.round(base.def * (1 + (lv - 1) * 0.10));
  const architect = { ...base, monsterId: 'rift_architect', level: lv, hp, atk, def, xp: 0, curHp: hp };
  combatState.monsters.push(architect);

  const area = document.getElementById('cb-monsters-area');
  area.classList.add('summon-flashing');
  setTimeout(() => area.classList.remove('summon-flashing'), 600);

  renderMonsterCards();
  renderCombatBars();

  const newIdx = combatState.monsters.length - 1;
  const newCard = document.getElementById(`cb-mon-card-${newIdx}`);
  if (newCard) newCard.classList.add('imp-spawning');

  addCombatLog(`⚫ The Abyssal God tears reality — a Rift Architect emerges from nothingness!`);
  await new Promise(r => setTimeout(r, 700));
}

async function desertBossSummonMinion() {
  const base = MONSTER_DEFS['cursed_servant'];
  const lv   = base.level;
  const hp   = Math.round(base.hp  * (1 + (lv - 1) * 0.15));
  const atk  = Math.round(base.atk * (1 + (lv - 1) * 0.10));
  const def  = Math.round(base.def * (1 + (lv - 1) * 0.10));
  const servant = { ...base, monsterId: 'cursed_servant', level: lv, hp, atk, def, xp: 0, curHp: hp };
  combatState.monsters.push(servant);

  const area = document.getElementById('cb-monsters-area');
  area.classList.add('summon-flashing');
  setTimeout(() => area.classList.remove('summon-flashing'), 600);

  renderMonsterCards();
  renderCombatBars();

  const newIdx = combatState.monsters.length - 1;
  const newCard = document.getElementById(`cb-mon-card-${newIdx}`);
  if (newCard) newCard.classList.add('imp-spawning');

  addCombatLog(`🔴 The Pharaoh's Wrath raises his hand — a Cursed Servant rises from the sand!`);
  await new Promise(r => setTimeout(r, 700));
}

// ── End Desert Saharrrra ─────────────────────────────────────────────────────
// ── Act 3: The Abyssal Rift ──────────────────────────────────────────────────

/* global RIFT_ZONES */
const RIFT_ZONES = [
  // Entry — dark rocky cliffs bottom-left
  { id:'void_threshold',    name:'The Void Threshold',    sub:'Reality frays here · Wisps of non-existence drift', pos:{left:'17%',top:'72%'}, levelRange:[36,40] },
  // Broken floating terrain, left-center
  { id:'shattered_expanse', name:'The Shattered Expanse', sub:'Broken planes · Gravity forgets its direction',      pos:{left:'26%',top:'52%'}, levelRange:[40,43], danger:true },
  // Dark cave hollows, upper-left cliffs
  { id:'mindflayer_hollows',name:'Mindflayer Hollows',    sub:'Thoughts devoured · Silence is the only mercy',      pos:{left:'50%',top:'25%'}, levelRange:[43,46], danger:true },
  // The great vortex — center of the map
  { id:'starless_sea',      name:'The Starless Sea',      sub:'Where stars go to die · Cold beyond cold',           pos:{left:'38%',top:'85%'}, levelRange:[46,48], danger:true },
  // Floating castle above the vortex, upper-center
  { id:'null_citadel',      name:'The Null Citadel',      sub:'Built from erased worlds · Home of the Architects',  pos:{left:'62%',top:'30%'}, levelRange:[48,49], danger:true },
  // Ruined structures, right side
  { id:'fracture_peaks',    name:'Fracture Peaks',        sub:'The summit of nothing · The Rift breathes here',     pos:{left:'67%',top:'85%'}, levelRange:[49,50], danger:true },
  // Glowing green portal, far right
  { id:'oblivion_gate',     name:'The Oblivion Gate',     sub:'One-way threshold · All who enter are forgotten',    pos:{left:'90%',top:'45%'}, levelRange:[49,50], danger:true },
  // Heart of the vortex — boss
  { id:'abyssal_sanctum',   name:'☠ The Abyssal Sanctum', sub:'??? · Do not enter alone — or at all',              pos:{left:'50%',top:'58%'}, levelRange:[50,50], danger:true },
];

let _riftProgress = 0;

function getRiftProgress() { return _riftProgress; }

async function setRiftProgress(v) {
  _riftProgress = v;
  await api('POST', '/api/me/rift-progress', { rift_progress: v });
}

function updateRiftGate() {
  const btn = document.getElementById('rift-gate-btn');
  if (btn) btn.style.display = _desertProgress >= DESERT_ZONES.length ? 'flex' : 'none';
}

function renderRiftMap() {
  const progress = getRiftProgress();
  const zonesHtml = RIFT_ZONES.map((z, i) => {
    const locked    = i > progress;
    const completed = i < progress;
    const dangerCls = z.danger && !locked ? ' danger' : '';
    const stateCls  = locked ? ' locked' : completed ? ' done' : '';
    const clickAttr = locked ? '' : `onclick="onRiftZoneClick('${z.id}')"`;
    return `<div class="rm-zone${dangerCls}${stateCls}" style="left:${z.pos.left};top:${z.pos.top}" ${clickAttr}>
      <div class="rm-zone-label">
        ${locked    ? '<div class="rm-lock">🔒</div>' : ''}
        ${completed ? '<div class="rm-done">✓</div>'  : ''}
        <div class="rm-zone-name">${z.name}</div>
        <div class="rm-zone-sub">${locked ? 'Advance through the Rift first' : z.sub}</div>
        ${!locked && z.levelRange ? `<div class="rm-zone-lvrange">Lv.${z.levelRange[0]}–${z.levelRange[1]}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  document.getElementById('rm-zones').innerHTML = zonesHtml;
}

let _riftTimer = null;

function openRift() {
  fetchAndCacheStats().catch(() => {});
  try { SoundEngine.play('abyss'); } catch(e) {}

  const overlay = document.getElementById('rift-overlay');
  const loading = document.getElementById('rift-loading');
  const map     = document.getElementById('rift-map');
  overlay.style.display = 'block';
  loading.style.display = '';
  map.style.display = 'none';

  const bar = document.getElementById('rld-bar');
  bar.style.transition = 'none';
  bar.style.width = '0%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.style.transition = 'width 1.5s linear';
    bar.style.width = '100%';
  }));

  clearTimeout(_riftTimer);
  _riftTimer = setTimeout(() => {
    loading.style.display = 'none';
    map.style.display = 'block';
    renderRiftMap();
    updateRiftGate();
  }, 1500);
}

function closeRift() {
  clearTimeout(_riftTimer);
  document.getElementById('rift-overlay').style.display = 'none';
  document.getElementById('rift-loading').style.display = '';
  document.getElementById('rift-map').style.display = 'none';
  SoundEngine.play('town');
}

function onRiftZoneClick(id) {
  const idx      = RIFT_ZONES.findIndex(z => z.id === id);
  const progress = getRiftProgress();
  if (idx > progress) { showToast('🔒 Advance through the Rift first.'); return; }
  const pool = ZONE_MONSTER_POOL[id] || [];
  const hasBoss = pool.some(mid => MONSTER_DEFS[mid]?.isBoss);
  if (hasBoss) {
    openPartyModal(id);
  } else {
    startCombat(id);
  }
}

function openRiftGate() {
  if (localStorage.getItem('rpg_rift_gate_seen')) { openRift(); return; }
  localStorage.setItem('rpg_rift_gate_seen', '1');
  showAct3TransitionScene().then(() => openRift());
}

async function showAct3TransitionScene() {
  return new Promise(resolve => {
    const ACT3_LINES = [
      'As the Pharaoh crumbled to dust, the Eye of the Forgotten Sun shattered. In its place — a wound in the sky.',
      'The Void Scholar appeared from nowhere. "It was a seal," she whispered. "The Pharaoh was never a tyrant. He was a guardian."',
      '"Beyond that crack is the Abyssal Rift — home of the entity that predates all creation. The Abyssal God does not want power. It wants to finish what it started before the first star was lit."',
      '"Entire worlds have been erased from existence. Not destroyed — erased. As if they never were. We are next."',
      '"The rift opens wider each hour. No army can stop it. But one traveler — one who has proven themselves against forest demons and desert pharaohs — might reach the Abyssal Sanctum."',
      '"I will not lie to you. You may not return. But if you do not go... nothing will." — The Void Scholar',
    ];

    const overlay  = document.getElementById('act3-transition-overlay');
    const textEl   = document.getElementById('act3-text');
    const promptEl = document.getElementById('act3-prompt');
    const enterBtn = document.getElementById('act3-enter-btn');

    overlay.style.display = 'flex';
    let lineIdx = 0, typing = false, ticker = null;

    function showFull() {
      if (ticker) { clearInterval(ticker); ticker = null; }
      typing = false;
      textEl.textContent = ACT3_LINES[lineIdx];
      const isLast = lineIdx >= ACT3_LINES.length - 1;
      promptEl.style.display = isLast ? 'none' : 'block';
      enterBtn.style.display  = isLast ? 'block' : 'none';
    }

    function typeLine(idx) {
      promptEl.style.display = 'none';
      enterBtn.style.display = 'none';
      textEl.textContent = '';
      typing = true;
      let i = 0;
      ticker = setInterval(() => {
        textEl.textContent += ACT3_LINES[idx][i++];
        if (i >= ACT3_LINES[idx].length) { clearInterval(ticker); ticker = null; showFull(); }
      }, 32);
    }

    function advance() {
      if (typing) { showFull(); return; }
      if (lineIdx < ACT3_LINES.length - 1) { lineIdx++; typeLine(lineIdx); }
    }

    function closeScene() {
      if (ticker) { clearInterval(ticker); ticker = null; }
      overlay.style.display = 'none';
      overlay.removeEventListener('click', advance);
      enterBtn.onclick = null;
      resolve();
    }

    overlay.addEventListener('click', advance);
    enterBtn.onclick = (e) => { e.stopPropagation(); closeScene(); };
    typeLine(0);
  });
}

const BOSS_INTRO_LINES = [
  "A lone {cls}… how disappointing.",
  "Did none of your kind warn you? Even armies have fallen before me.",
  "Run along and bring more of your pathetic kin. I'll be waiting.",
];

function showBossIntro(onDone) {
  if (localStorage.getItem('rpg_boss_intro_seen')) { onDone(); return; }

  const overlay  = document.getElementById('boss-intro-overlay');
  const textEl   = document.getElementById('boss-intro-text');
  const promptEl = document.getElementById('boss-intro-prompt');
  const fightBtn = document.getElementById('boss-intro-fight-btn');
  const demonEl  = document.getElementById('boss-intro-demon');

  const cls   = charCache?.class || 'warrior';
  const lines = BOSS_INTRO_LINES.map(l => l.replace('{cls}', cls));

  demonEl.innerHTML = MONSTER_SVGS['demon_lord'] || '';
  overlay.style.display = 'flex';
  // animate demon appearing
  demonEl.style.animation = 'boss-intro-appear .8s ease-out forwards, boss-intro-float 3s ease-in-out 0.8s infinite';

  let lineIdx = 0;
  let typing  = false;
  let ticker  = null;

  function showFull() {
    if (ticker) { clearInterval(ticker); ticker = null; }
    typing = false;
    textEl.textContent = lines[lineIdx];
    const isLast = lineIdx >= lines.length - 1;
    promptEl.style.display = isLast ? 'none' : 'block';
    fightBtn.style.display  = isLast ? 'block' : 'none';
  }

  function typeLine(idx) {
    promptEl.style.display = 'none';
    fightBtn.style.display = 'none';
    textEl.textContent = '';
    typing = true;
    let i = 0;
    ticker = setInterval(() => {
      textEl.textContent += lines[idx][i++];
      if (i >= lines[idx].length) { clearInterval(ticker); ticker = null; showFull(); }
    }, 38);
  }

  function advance() {
    if (typing) { showFull(); return; }
    if (lineIdx < lines.length - 1) { lineIdx++; typeLine(lineIdx); }
  }

  function closeBossIntro() {
    overlay.style.display = 'none';
    overlay.removeEventListener('click', advance);
    fightBtn.onclick = null;
    localStorage.setItem('rpg_boss_intro_seen', '1');
    onDone();
  }

  overlay.addEventListener('click', advance);
  fightBtn.onclick = (e) => { e.stopPropagation(); closeBossIntro(); };

  typeLine(0);
}

async function bossSummonMinion() {
  const base = MONSTER_DEFS['demon_imp'];
  const lv   = base.level;
  const hp   = Math.round(base.hp  * (1 + (lv - 1) * 0.15));
  const atk  = Math.round(base.atk * (1 + (lv - 1) * 0.10));
  const def  = Math.round(base.def * (1 + (lv - 1) * 0.10));
  const imp  = { ...base, monsterId: 'demon_imp', level: lv, hp, atk, def, xp: 0, curHp: hp };
  combatState.monsters.push(imp);

  // Flash the arena and re-render cards
  const area = document.getElementById('cb-monsters-area');
  area.classList.add('summon-flashing');
  setTimeout(() => area.classList.remove('summon-flashing'), 600);

  renderMonsterCards();
  renderCombatBars();

  // Animate the new imp spawning in
  const newIdx = combatState.monsters.length - 1;
  const newCard = document.getElementById(`cb-mon-card-${newIdx}`);
  if (newCard) newCard.classList.add('imp-spawning');

  addCombatLog(`🔴 Demon Lord tears open a portal — a Demon Imp emerges!`);
  await new Promise(r => setTimeout(r, 700));
}

async function bossEnrage(bossIdx) {
  const boss = combatState.monsters[bossIdx];
  if (boss.bossEnraged) return; // already enraged, normal attack instead
  boss.bossEnraged = true;
  boss.atk = Math.round(boss.atk * 1.6);

  const card = document.getElementById(`cb-mon-card-${bossIdx}`);
  if (card) { card.classList.remove('boss-card'); card.classList.add('boss-card', 'boss-enraged'); }

  addCombatLog(`🔥 ENRAGED! Demon Lord's minions are at full strength — it roars with fury! ATK +60%!`);
  showToast('🔥 Demon Lord is ENRAGED! Three minions stand — its power surges!');
  await new Promise(r => setTimeout(r, 800));
}

async function monsterTurn() {
  // Check for boss summon/enrage every 8 rounds
  combatState.bossRound = (combatState.bossRound || 0) + 1;
  const bossIdx = combatState.monsters.findIndex(m => m.isBoss && m.curHp > 0);
  const isSummonRound = bossIdx !== -1 && combatState.bossRound % 8 === 0;

  if (isSummonRound) {
    const aliveMinions = combatState.monsters.filter(m => m.isMinion && m.curHp > 0).length;
    const isDesertBoss = combatState.zoneId === 'pharaoh_tomb';
    const isAbyssBoss  = combatState.zoneId === 'abyssal_sanctum';
    if (aliveMinions < 3) {
      if (isAbyssBoss)  await abyssalBossSummonMinion();
      else if (isDesertBoss) await desertBossSummonMinion();
      else              await bossSummonMinion();
    } else {
      await bossEnrage(bossIdx);
    }
  }

  // ── Abyss boss phase transitions ────────────────────────────────────────────
  if (combatState.zoneId === 'abyssal_sanctum' && bossIdx !== -1) {
    const boss  = combatState.monsters[bossIdx];
    const hpPct = boss.curHp / boss.hp;
    const phase = hpPct > 0.65 ? 1 : hpPct > 0.30 ? 2 : 3;
    if (phase !== combatState._abyssPhase) {
      combatState._abyssPhase = phase;
      try { SoundEngine.setAbyssBossPhase(phase === 1 ? 'void_approach' : phase === 2 ? 'cosmic_battle' : 'annihilation'); } catch(e) {}
      if (phase === 2) {
        addCombatLog(`🌌 The Abyssal God stirs — PHASE 2: COSMIC BATTLE! Reality warps around you!`);
        showToast('🌌 PHASE 2 — The void ignites!');
        const card = document.getElementById(`cb-mon-card-${bossIdx}`);
        if (card) card.classList.add('boss-enraged');
      } else if (phase === 3) {
        addCombatLog(`⚫ PHASE 3: ANNIHILATION — The Abyssal God tears reality itself apart!`);
        showToast('⚫ PHASE 3 — ANNIHILATION!');
        const card = document.getElementById(`cb-mon-card-${bossIdx}`);
        if (card) { card.style.filter = 'drop-shadow(0 0 20px #7000ff)'; }
        boss.atk = Math.round(boss.atk * 1.4);
      }
    }
  }

  // ── Pitou freeze check — skip ALL monster attacks this turn ─────────────────
  if (combatState._pitouDebuff?.type === 'freeze') {
    const d = combatState._pitouDebuff;
    addCombatLog(`❄️ Pitou's Petrify holds! All enemies are frozen. (${d.turnsLeft} turn${d.turnsLeft > 1 ? 's' : ''} left)`);
    combatState.monsters.filter(m => m.curHp > 0).forEach((_, i) => {
      spawnFxText('FROZEN!', '#88d8ff', monsterEl(i));
    });
    d.turnsLeft--;
    if (d.turnsLeft <= 0) {
      addCombatLog('❄️ Pitou\'s Petrify fades — enemies can move again!');
      combatState._pitouDebuff = null;
    }
    renderPitouDebuffBadge();
    renderCombatBars();
    // Skip to end-of-monster-turn cleanup
    emitPartySync();
    combatState.phase = 'player';
    combatState.busy  = false;
    renderSkillButtons();
    return;
  }

  // Each alive monster attacks in sequence
  for (let i = 0; i < combatState.monsters.length; i++) {
    const mon = combatState.monsters[i];
    if (mon.curHp <= 0) continue;

    const mSkills = mon.skills.map(id => MONSTER_SKILLS[id]).filter(Boolean);
    const skill   = mSkills[randInt(0, mSkills.length - 1)];

    // Target a party member: always if leader is KO'd, 40% chance otherwise
    const alivePartyMembers = combatState.isParty
      ? combatState.partyMembers.filter(m => m.curHp > 0)
      : [];
    const targetsMember = alivePartyMembers.length > 0 &&
      (combatState.player.ko || Math.random() < 0.4);

    if (targetsMember) {
      await doAnimation(skill.type, false, i);
      const member = alivePartyMembers[randInt(0, alivePartyMembers.length - 1)];
      const memberIdx = combatState.partyMembers.indexOf(member);
      const mfig = partyMemberFig(memberIdx);

      // Dodge check for party member
      const mIronGuardDodge = member.ironGuard?.dodgeBonus || 0;
      if (Math.random() * 100 < (member.stats?.dodgeRate || 0) + mIronGuardDodge) {
        addCombatLog(`💨 ${mon.name} uses ${skill.name} on ${member.username} — dodged!`);
        spawnFxText('DODGE!', '#88ccff', mfig);
        if (!combatState._pendingSyncEvents) combatState._pendingSyncEvents = [];
        combatState._pendingSyncEvents.push({ target: member.username, monIdx: i, dmg: 0, dodge: true });
        await new Promise(r => setTimeout(r, 280));
        continue;
      }

      // Block check for party member
      const mIronGuardBlock = member.ironGuard?.blockBonus || 0;
      if ((member.stats?.blockRate > 0 || mIronGuardBlock > 0) && Math.random() * 100 < (member.stats?.blockRate || 0) + mIronGuardBlock) {
        addCombatLog(`🛡 ${mon.name} uses ${skill.name} on ${member.username} — blocked!`);
        spawnFxText('BLOCK!', '#aaaaee', mfig);
        if (!combatState._pendingSyncEvents) combatState._pendingSyncEvents = [];
        combatState._pendingSyncEvents.push({ target: member.username, monIdx: i, dmg: 0, block: true });
        await new Promise(r => setTimeout(r, 280));
        continue;
      }

      const raw  = Math.floor(mon.atk * skill.dmgMult) - Math.floor((member.stats?.def || 10) * 0.5) + randInt(-2, 2);
      const mGuardR  = member.ironGuard    ? member.ironGuard.reduction    : 0;
      const mShieldR = member.divineShield ? member.divineShield.reduction : 0;
      const mTotalR  = Math.min(1, mGuardR + mShieldR);
      const dmg = mTotalR >= 1 ? 0 : Math.max(1, Math.floor(Math.max(1, raw) * (1 - mTotalR)));
      let mGuardMsg = '';
      if (member.ironGuard) {
        member.ironGuard.hitsRemaining--;
        if (member.ironGuard.hitsRemaining <= 0) { member.ironGuard = null; mGuardMsg = ' 🛡️ Iron Guard fades!'; }
        else mGuardMsg = ` 🛡️ Iron Guard (${member.ironGuard.hitsRemaining} left)`;
      }
      if (member.divineShield) {
        member.divineShield.hitsRemaining--;
        if (member.divineShield.hitsRemaining <= 0) { member.divineShield = null; mGuardMsg += ' 🔰 Divine Shield fades!'; }
        else mGuardMsg += ` 🔰 Divine Shield (${member.divineShield.hitsRemaining} left)`;
      }
      member.curHp = Math.max(0, member.curHp - dmg);
      addCombatLog(dmg === 0
        ? `🔰 ${mon.name} uses ${skill.name} on ${member.username} — blocked!${mGuardMsg}`
        : `${mon.name} uses ${skill.name} on ${member.username}: −${dmg}${mGuardMsg}`);
      spawnFxText(dmg === 0 ? 'BLOCK!' : `-${dmg}`, dmg === 0 ? '#aaaaee' : '#ff4444', mfig);
      addAnim(mfig, 'anim-hit', 400); addAnim(mfig, 'anim-shake', 450);
      // Queue event so member's client can show animations + damage number too
      if (!combatState._pendingSyncEvents) combatState._pendingSyncEvents = [];
      combatState._pendingSyncEvents.push({ target: member.username, monIdx: i, dmg });
      renderCombatBars();
      await new Promise(r => setTimeout(r, 280));
      continue;
    }

    // Don't attack an already KO'd leader
    if (combatState.player.ko) {
      await new Promise(r => setTimeout(r, 200));
      continue;
    }

    await doAnimation(skill.type, false, i);

    const pfig = document.getElementById('cb-player-figure');

    // Dodge check (includes Iron Guard bonus while stance is active)
    const _ironGuardDodge = combatState.player.ironGuard?.dodgeBonus || 0;
    if (Math.random() * 100 < (combatState.player.stats.dodgeRate || 0) + _ironGuardDodge) {
      addCombatLog(`💨 ${mon.name} uses ${skill.name} — you dodge!`);
      spawnFxText('DODGE!', '#88ccff', pfig);
      try { SoundEngine.playSfxDodge(); } catch(e) {}
      await new Promise(r => setTimeout(r, 280));
      continue;
    }

    // Block check (includes Iron Guard bonus while stance is active)
    const _ironGuardBlock = combatState.player.ironGuard?.blockBonus || 0;
    if ((combatState.player.stats.blockRate > 0 || _ironGuardBlock > 0) && Math.random() * 100 < (combatState.player.stats.blockRate || 0) + _ironGuardBlock) {
      addCombatLog(`🛡 ${mon.name} uses ${skill.name} — blocked!`);
      spawnFxText('BLOCK!', '#aaaaee', pfig);
      try { SoundEngine.playSfxBlock(); } catch(e) {}
      await new Promise(r => setTimeout(r, 280));
      continue;
    }

    const raw    = Math.floor(mon.atk * skill.dmgMult)
                   - Math.floor(combatState.player.stats.def * 0.5) + randInt(-2, 2);
    const defPct  = (combatState.player.stats.defPct || 0) / 100;
    const dr      = (combatState.player.stats.dmgReduction || 0) / 100;
    const guardR  = combatState.player.ironGuard ? combatState.player.ironGuard.reduction : 0;
    const shieldR = combatState.player.divineShield ? combatState.player.divineShield.reduction : 0;
    const totalR  = Math.min(1, guardR + shieldR);
    const pitouW  = combatState._pitouDebuff?.type === 'weakness' ? 0.7 : 1.0;
    const dmg     = totalR >= 1 ? 0 : Math.max(1, Math.floor(Math.max(1, raw) * (1 - defPct) * (1 - dr) * (1 - totalR) * pitouW));
    combatState.player.curHp -= dmg;
    try { SoundEngine.playSfxPlayerHit(charCache?.class || 'Warrior'); } catch(e) {}
    let guardMsg = '';
    if (combatState.player.ironGuard) {
      combatState.player.ironGuard.hitsRemaining--;
      if (combatState.player.ironGuard.hitsRemaining <= 0) {
        combatState.player.ironGuard = null;
        guardMsg += ' 🛡️ Iron Guard fades!';
        renderSkillButtons();
      } else {
        guardMsg += ` 🛡️ Iron Guard (${combatState.player.ironGuard.hitsRemaining} hit${combatState.player.ironGuard.hitsRemaining > 1 ? 's' : ''} left)`;
      }
    }
    if (combatState.player.divineShield) {
      combatState.player.divineShield.hitsRemaining--;
      if (combatState.player.divineShield.hitsRemaining <= 0) {
        combatState.player.divineShield = null;
        guardMsg += ' 🔰 Divine Shield fades!';
        renderSkillButtons();
      } else {
        guardMsg += ` 🔰 Divine Shield (${combatState.player.divineShield.hitsRemaining} hit${combatState.player.divineShield.hitsRemaining > 1 ? 's' : ''} left)`;
      }
    }
    addCombatLog(dmg === 0
      ? `🔰 ${mon.name} uses ${skill.name} — blocked by Divine Shield!${guardMsg}`
      : `${mon.name} uses ${skill.name}: −${dmg}${guardMsg}`);
    spawnFxText(`-${dmg}`, '#ff4444', pfig);
    // Queue event so party members see the monster attack leader
    if (combatState.isParty && combatState.partyRole === 'leader') {
      if (!combatState._pendingSyncEvents) combatState._pendingSyncEvents = [];
      combatState._pendingSyncEvents.push({ target: me.username, monIdx: i, dmg });
    }
    renderCombatBars();

    if (combatState.player.curHp <= 0 && !combatState.player.ko) {
      // ── Immortal Vow (lastStand): survive with 1 HP once ──────────────────
      if (combatState.player.stats.lastStand && !combatState._lastStandUsed) {
        combatState._lastStandUsed = true;
        combatState.player.curHp = 1;
        addCombatLog(`⚰️ IMMORTAL VOW! Death refused — you survive with 1 HP!`);
        spawnFxText('UNDYING!', '#ff8800', pfig);
        renderCombatBars();
        await new Promise(r => setTimeout(r, 400));
      // ── Martyr's Resolve: if HP drops below trigger% threshold, auto-heal once ─
      } else if (combatState.player.stats.martyrTriggerPct && !combatState._martyrUsed) {
        combatState._martyrUsed = true;
        const healAmt = combatState.player.maxHp;
        combatState.player.curHp = healAmt;
        addCombatLog(`🕊️ Martyr's Resolve! Near death — a divine surge restores full HP!`);
        spawnFxText('MARTYR!', '#ffe080', pfig);
        renderCombatBars();
        await new Promise(r => setTimeout(r, 400));
      } else {
        combatState.player.curHp = 0;
        if (combatState.isParty && combatState.partyMembers.some(m => m.curHp > 0)) {
          // KO the leader — allies fight on
          combatState.player.ko = true;
          if (pfig) pfig.classList.add('anim-death');
          addCombatLog(`💀 ${me.username} has fallen! Allies fight on...`);
          api('POST', '/api/me/die').catch(() => {});
          if (charCache) charCache.curHp = 1;
          renderCombatBars();
        } else {
          await handleCombatLose(); return;
        }
      }
    }
    await new Promise(r => setTimeout(r, 280));
  }

  // Wipe check: leader KO'd and all party members also down
  if (combatState.player.ko && combatState.partyMembers.every(m => m.curHp <= 0)) {
    await handleCombatLose(); return;
  }

  // ── Pitou debuff tick-down (weakness / vulnerable) ──────────────────────────
  if (combatState._pitouDebuff && combatState._pitouDebuff.type !== 'freeze') {
    const d = combatState._pitouDebuff;
    d.turnsLeft--;
    if (d.turnsLeft <= 0) {
      addCombatLog(`✨ Pitou's ${d.name} wears off.`);
      combatState._pitouDebuff = null;
    } else {
      addCombatLog(`💜 Pitou's ${d.name}: ${d.turnsLeft} turn${d.turnsLeft > 1 ? 's' : ''} remaining.`);
    }
    renderPitouDebuffBadge();
  }

  // Sync state to all party members after monsters' attacks
  emitPartySync();

  combatState.phase = 'player';
  combatState.busy  = false;
  renderSkillButtons();
  if (combatState.isParty && combatState.partyRole === 'leader') showToast('⚔ Your turn!');
}

// Called each round when the leader is KO'd but party members are still alive.
// Loops (instead of recursing through monsterTurn) to avoid stack overflow.
async function doAllyAutoTurn() {
  while (combatState && combatState.phase !== 'win' && combatState.phase !== 'lose'
         && combatState.player.ko && combatState.partyMembers.some(m => m.curHp > 0)) {
    combatState.busy = true;

    await doPartyMemberTurns();
    if (!combatState || combatState.phase === 'win' || combatState.phase === 'lose') return;

    renderCombatBars();
    if (combatState.monsters.every(m => m.curHp <= 0)) { await handleCombatWin(); return; }

    combatState.phase = 'enemy';
    await new Promise(r => setTimeout(r, 400));
    await monsterTurn();
    if (!combatState || combatState.phase === 'win' || combatState.phase === 'lose') return;
  }
}

async function handleCombatWin() {
  combatState.phase = 'win';
  combatState.busy  = false;
  renderSkillButtons();
  const playerLv = charCache?.level || 1;
  let tooWeakCount = 0;
  const totalXp = combatState.monsters.reduce((s, m) => {
    if (m.level <= playerLv - 3) { tooWeakCount++; return s; }
    const cappedLv = Math.min(m.level, playerLv + 3);
    const xp = Math.round((TIER_BASE_XP[m.tier] || 5) * (1 + (cappedLv - 1) * 0.2));
    return s + xp;
  }, 0);
  if (tooWeakCount > 0) showToast(`⚠ ${tooWeakCount} monster${tooWeakCount > 1 ? 's were' : ' was'} too weak — no XP rewarded. Fight stronger enemies!`);
  const isPartyFight = !!(combatState.isParty && partyState?.partyId);
  const finalXp = isPartyFight ? totalXp * 3 : totalXp;
  addCombatLog(`🏆 All enemies defeated! +${finalXp} XP${isPartyFight ? ' 👥 Party Bonus ×3!' : ''}`);

  // Save XP, then save loot — deduplicate by monsterId so re-summoned minions don't inflate the list
  const _seenIds = new Set();
  const monsterList = combatState.monsters
    .filter(m => { if (_seenIds.has(m.monsterId)) return false; _seenIds.add(m.monsterId); return true; })
    .map(m => ({ monsterId: m.monsterId, tier: m.tier, level: m.level }))
    .slice(0, 9);

  let xpRes, lootRes, leveledUp;
  if (combatState.isParty && partyState?.partyId) {
    if (partyState.isLeader) {
      // Only the leader calls the reward endpoint — it awards XP + loot to all members
      const partyMembers = partyState.members || [me.username];
      const partyReward  = await api('POST', '/api/party/reward', { partyMembers, xp: finalXp, monsters: monsterList }).catch(() => null);
      const myResult     = partyReward?.results?.[me.username];
      xpRes     = myResult;
      lootRes   = { items: myResult?.items || [], gold: myResult?.gold || 0 };
      leveledUp = (myResult?.levelGain || 0) > 0;
      socket.emit('party:end', { partyId: partyState.partyId });
    } else {
      // Member clients: wait for leader to emit party:end (which triggers party:ended)
      // Guard against race condition: party:ended may have already arrived and set partyState=null
      if (partyState?.partyId) {
        await new Promise(resolve => {
          const cleanup = () => { socket.off('party:ended', handler); clearTimeout(timer); resolve(); };
          const handler = () => cleanup();
          const timer   = setTimeout(cleanup, 4000); // reduced from 8s; solo fallback handles the rest
          socket.once('party:ended', handler);
        });
      }
      xpRes = null; lootRes = null; leveledUp = false;
    }
    partyState = null;
  } else {
    [xpRes, lootRes] = await Promise.all([
      api('POST', '/api/me/xp',   { xp: finalXp }).catch(() => null),
      api('POST', '/api/me/loot', { monsters: monsterList }).catch(() => null),
    ]);
    leveledUp = xpRes?.newSkillPoints > 0;
  }

  // Fetch fresh stats — if it times out, fall back to cached data so loot panel still shows
  const [freshStats, freshSkills] = await Promise.all([
    api('GET', '/api/me/stats').catch(() => null),
    api('GET', '/api/me/skills').catch(() => null),
  ]).catch(() => [null, null]);
  if (freshStats && freshSkills) {
    charCache = { ...freshStats, skillData: freshSkills };
    const goldEl = document.getElementById('my-gold');
    if (goldEl) goldEl.textContent = `💰 ${charCache.gold || 0}`;
  }

  if (leveledUp) {
    const sp = xpRes?.newSkillPoints ?? xpRes?.levelGain ?? 1;
    const ap = xpRes?.newAttrPoints ?? 5;
    showToast(`🎉 Level up! +${sp} skill point${sp > 1 ? 's' : ''}, +${ap} attribute points!`);
  }

  // For party member clients: derive new items from fresh inventory
  if (lootRes === null) {
    const preIds = combatState._preInvIds || new Set();
    const newItems = (charCache?.inventory || []).filter(i => !preIds.has(i.inv_id));
    lootRes = { items: newItems, gold: 0 };
  }

  combatState._pendingZoneIdx       = combatState.zoneIdx >= 0 ? combatState.zoneIdx : undefined;
  combatState._pendingDesertZoneIdx = combatState.desertZoneIdx >= 0 ? combatState.desertZoneIdx : undefined;
  combatState._pendingRiftZoneIdx   = combatState.riftZoneIdx >= 0 ? combatState.riftZoneIdx : undefined;

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

  // Hide arena + log to free vertical space for the loot panel
  const arenaEl = document.getElementById('combat-arena');
  const logEl   = document.getElementById('combat-log');
  if (arenaEl) arenaEl.style.display = 'none';
  if (logEl)   logEl.style.display   = 'none';

  const invCount = (charCache?.inventory || []).length;
  if (invCount >= 100) {
    showToast(`⚠ Inventory is full (${invCount}/100)! Visit your bag to drop items.`);
  }

  const items  = lootRes?.items || [];
  const gold   = lootRes?.gold  || 0;

  function _lootCard(it) {
    const rCls      = RARITY_COLORS[it.rarity] || 'rarity-normal';
    const rLabel    = RARITY_LABELS[it.rarity]  || 'Normal';
    const slotLabel = SLOT_LABELS[it.slot]       || it.slot;
    const reqLv     = it.level_req || 1;
    const typeStr   = `${rLabel} · ${slotLabel}${reqLv > 1 ? ` · Req.Lv.${reqLv}` : ''}`;

    const isWeapon    = it.slot === 'mainhand';
    const prominentVal = isWeapon ? (it.atk_bonus || 0) : (it.def_bonus || 0);
    const prominentIcon = isWeapon ? '⚔' : '🛡';
    const prominentHtml = prominentVal
      ? `<div class="cb-loot-item-prominent">${prominentIcon} +${prominentVal} ${isWeapon ? 'ATK' : 'DEF'}</div>`
      : '';

    const statLabels = { str_bonus:'STR', dex_bonus:'DEX', int_bonus:'INT',
                         spirit_bonus:'SP', hp_bonus:'HP', mp_bonus:'MP',
                         atk_bonus:'ATK', def_bonus:'DEF' };
    const skipKey = isWeapon ? 'atk_bonus' : 'def_bonus';
    const statsStr = Object.entries(statLabels)
      .filter(([k]) => k !== skipKey && (it[k] || 0) !== 0)
      .map(([k, lbl]) => `+${it[k]} ${lbl}`)
      .join('  ');

    const blockHtml = (it.block_rate > 0)
      ? `<div class="cb-loot-item-stats">🛡 ${it.block_rate}% Block${statsStr ? '  ' + statsStr : ''}</div>`
      : (statsStr ? `<div class="cb-loot-item-stats">${statsStr}</div>` : '');

    const affixHtml = (it.affixes || []).length
      ? `<div class="cb-loot-item-affixes">${
          it.affixes.map(a =>
            `<div class="cb-loot-affix ${a.type}">[${a.type === 'prefix' ? 'P' : 'S'}] ${escHtml(a.name)}: ${_affixValStr(a.stat, a.value)} ${STAT_NAMES[a.stat] || a.stat}</div>`
          ).join('')
        }</div>`
      : '';

    return `<div class="cb-loot-item">
      <div class="cb-loot-item-header">
        <span class="cb-loot-item-icon">${escHtml(it.icon || '🎒')}</span>
        <div class="cb-loot-item-meta">
          <div class="cb-loot-item-name ${rCls}">${escHtml(it.name)}</div>
          <div class="cb-loot-item-type">${typeStr}</div>
        </div>
      </div>
      ${prominentHtml}${blockHtml}${affixHtml}
    </div>`;
  }

  const itemsHtml = items.length
    ? items.map(_lootCard).join('')
    : '<div class="cb-loot-empty">No items dropped.</div>';

  skillsEl.innerHTML = `<div id="cb-loot-panel">
    <div class="cb-loot-title">🏆 Victory — Loot</div>
    <div class="cb-loot-items">${itemsHtml}</div>
    ${gold > 0 ? `<div class="cb-loot-gold">💰 +${gold} gold</div>` : ''}
    <button class="cb-collect-btn" onclick="collectLoot()">Collect Loot</button>
  </div>`;
}

function showDemonLordDeathScene() {
  return new Promise(resolve => {
    const overlay  = document.getElementById('travel-east-overlay');
    const caravan  = document.getElementById('te-caravan');
    const textEl   = document.getElementById('te-text');
    const promptEl = document.getElementById('te-prompt');
    const journBtn = document.getElementById('te-journey-btn');
    const speaker  = document.getElementById('te-speaker');

    const deathLines = [
      '...The Demon Lord collapses. The dark forest falls silent for the first time in a hundred years.',
      'As the last ember of its fire dies, the creature lets out a rattling whisper...',
      '"The Eye... sleeps in Saharrrra... when it wakes... all light dies..."',
      'The words hang in the cold air. Something stirs far to the east. The journey is not over.',
    ];

    caravan.textContent = '👹';
    caravan.style.animation = 'none';
    caravan.style.opacity = '0.4';
    caravan.style.filter = 'grayscale(1) drop-shadow(0 0 20px rgba(255,50,0,.4))';
    speaker.textContent = '— THE DEMON LORD —';
    overlay.style.display = 'flex';

    let lineIdx = 0, typing = false, ticker = null;

    function showFull() {
      if (ticker) { clearInterval(ticker); ticker = null; }
      typing = false;
      textEl.textContent = deathLines[lineIdx];
      const isLast = lineIdx >= deathLines.length - 1;
      promptEl.style.display = isLast ? 'none' : 'block';
      journBtn.style.display  = isLast ? 'block' : 'none';
      if (isLast) {
        journBtn.textContent = '↩ Return to Town';
        journBtn.style.display = 'block';
      }
    }

    function typeLine(idx) {
      promptEl.style.display = 'none';
      journBtn.style.display = 'none';
      textEl.textContent = '';
      typing = true;
      let i = 0;
      ticker = setInterval(() => {
        textEl.textContent += deathLines[idx][i++];
        if (i >= deathLines[idx].length) { clearInterval(ticker); ticker = null; showFull(); }
      }, 36);
    }

    function advance() {
      if (typing) { showFull(); return; }
      if (lineIdx < deathLines.length - 1) { lineIdx++; typeLine(lineIdx); }
    }

    function close() {
      overlay.style.display = 'none';
      overlay.removeEventListener('click', advance);
      journBtn.onclick = null;
      // Reset caravan icon for next use
      caravan.textContent = '🐪';
      caravan.style.animation = '';
      caravan.style.opacity = '';
      caravan.style.filter = '';
      speaker.textContent = '— CARAVAN MASTER RASHID —';
      resolve();
    }

    overlay.addEventListener('click', advance);
    journBtn.onclick = (e) => { e.stopPropagation(); close(); };
    typeLine(0);
  });
}

async function collectLoot() {
  const zoneIdx       = combatState?._pendingZoneIdx;
  const desertZoneIdx = combatState?._pendingDesertZoneIdx;
  const riftZoneIdx   = combatState?._pendingRiftZoneIdx;
  closeCombat();

  // Forest progress
  if (zoneIdx !== undefined && zoneIdx === getForestProgress()) await setForestProgress(zoneIdx + 1);
  renderForestMap();
  if (zoneIdx !== undefined) {
    const next = FOREST_ZONES[zoneIdx + 1];
    updateEasternGate();
    if (!next) {
      // Dark Forest fully conquered — show dying Demon Lord scene only the first time
      if (!localStorage.getItem('rpg_demon_lord_death_seen')) {
        localStorage.setItem('rpg_demon_lord_death_seen', '1');
        await showDemonLordDeathScene();
      }
      const res = await api('POST', '/api/me/quests/gatehouse/complete').catch(() => null);
      if (res?.ok && !res.alreadyDone) {
        await loadQuestLog();
      }
      showToast('🏆 Quest complete: Into the Dark Forest! The TRAVEL EAST gate is now open.');
    } else {
      showToast(`✅ ${FOREST_ZONES[zoneIdx].name} cleared! ${next.name} unlocked!`);
    }
  }

  // Desert progress
  if (desertZoneIdx !== undefined && desertZoneIdx === getDesertProgress()) {
    await setDesertProgress(desertZoneIdx + 1);
    renderDesertMap();
    const next = DESERT_ZONES[desertZoneIdx + 1];
    if (next) {
      showToast(`✅ ${DESERT_ZONES[desertZoneIdx].name} cleared! ${next.name} unlocked!`);
    } else {
      showToast('🏆 The Desert Saharrrra has been conquered! The Eye of the Forgotten Sun rests in peace.');
      // Trigger Act 3 transition cutscene the first time Pharaoh is defeated
      if (!localStorage.getItem('rpg_pharaoh_death_seen')) {
        localStorage.setItem('rpg_pharaoh_death_seen', '1');
        // Update the rift gate in case desert map is still visible
        updateRiftGate();
        await new Promise(r => setTimeout(r, 1200)); // let loot panel settle
        await showAct3TransitionScene();
      }
    }
  }

  // Rift progress
  if (riftZoneIdx !== undefined && riftZoneIdx === getRiftProgress()) {
    await setRiftProgress(riftZoneIdx + 1);
    renderRiftMap();
    const next = RIFT_ZONES[riftZoneIdx + 1];
    if (next) {
      showToast(`✅ ${RIFT_ZONES[riftZoneIdx].name} cleared! ${next.name} unlocked!`);
    } else {
      // Abyssal God defeated
      if (!localStorage.getItem('rpg_abyssal_god_death_seen')) {
        localStorage.setItem('rpg_abyssal_god_death_seen', '1');
        await new Promise(r => setTimeout(r, 600));
        // Show victory modal — combat is already closed so we can't use addCombatLog
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `<div style="text-align:center;color:#c8a8ff;font-family:monospace;padding:40px;max-width:480px;border:1px solid #6633cc;background:#0a0010;border-radius:8px;">
          <div style="font-size:36px;margin-bottom:16px">🌌</div>
          <div style="font-size:13px;line-height:2.2;letter-spacing:1px;">
            ══════════════════════════════════════════<br>
            &nbsp;THE ABYSSAL GOD HAS BEEN DESTROYED<br>
            &nbsp;The crack in the sky seals itself shut.<br>
            &nbsp;The void recedes. Stars blink back into<br>
            &nbsp;existence. You have saved everything.<br>
            ══════════════════════════════════════════
          </div>
          <button onclick="this.parentElement.parentElement.remove()" style="margin-top:24px;padding:10px 28px;background:#6633cc;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;">Continue</button>
        </div>`;
        document.body.appendChild(modal);
      } else {
        showToast('🌌 THE ABYSSAL RIFT IS SEALED! Existence endures.');
      }
    }
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
  // Notify party members if this was a party wipe (leader lost)
  if (combatState.isParty && combatState.partyRole === 'leader' && partyState?.partyId) {
    socket.emit('party:end', { partyId: partyState.partyId, result: 'lose' });
    partyState = null;
  }
  await new Promise(r => setTimeout(r, 1500));
  closeCombat();
  showToast('💀 You were defeated. Visit the Chapel to receive a blessing!');
}

function fleeCombat() {
  if (combatState?.busy) return;
  closeCombat();
  showToast('🏃 You fled from battle!');
}

async function healAtChapel() {
  const res = await api('POST', '/api/me/heal').catch(() => null);
  if (res?.ok) {
    if (charCache) { charCache.curHp = res.curHp; charCache.curMp = res.curMp; }
    showToast(`🙏 Blessed! HP & MP fully restored! (${res.curHp} HP / ${res.curMp} MP)`);
    closeBldPopup();
  } else {
    showToast('❌ Could not receive blessing.');
  }
}

function closeCombat() {
  const fromOverlay = combatState?._fromOverlay;
  combatState = null;
  document.getElementById('combat-overlay').style.display = 'none';
  document.getElementById('cb-party-members').innerHTML = '';
  // Reset arena/log visibility hidden by showLootPanel so the next fight starts clean
  const arenaEl = document.getElementById('combat-arena');
  const logEl   = document.getElementById('combat-log');
  if (arenaEl) arenaEl.style.display = '';
  if (logEl)   logEl.style.display   = '';
  // Restore the map overlay the player came from (hidden by showCombat)
  if (fromOverlay === 'forest') document.getElementById('forest-overlay').style.display = 'block';
  else if (fromOverlay === 'desert') document.getElementById('desert-overlay').style.display = 'block';
  else if (fromOverlay === 'rift') document.getElementById('rift-overlay').style.display = 'block';
  // Return to appropriate ambient music based on which overlay is open, else town
  const forestOpen = document.getElementById('forest-overlay')?.style.display === 'block';
  const desertOpen = document.getElementById('desert-overlay')?.style.display === 'block';
  const riftOpen   = document.getElementById('rift-overlay')?.style.display === 'block';
  try { SoundEngine.play(forestOpen ? 'forest' : desertOpen ? 'desert' : riftOpen ? 'abyss' : 'town'); } catch(e) {}
}

// ── Blacksmith Shop ───────────────────────────────────────────────────────────

// Mirrors server calcSellValue (no fluctuation — shows estimate; actual price returned by server)
const SELL_BASE_CLIENT = { normal:15, uncommon:28, magic:45, rare:90, epic:140, legendary:300, godly:600 };
function _calcSellValue(item) {
  const base = SELL_BASE_CLIENT[item.rarity] ?? 15;
  const lv   = item.level_req || 1;
  return Math.round(base * (1 + (lv - 1) * 0.3));
}

let _bsmCatalog   = null;
let _bsmExpiresAt = 0;
let _bsmTimerInterval = null;
let _bsmPurchased = new Set();
let _bsmDragSrc = null; // { type: 'shop'|'inv', id: catalogId|invId }
let _bsmConfirmCallback = null;

async function openBlacksmith() {
  document.getElementById('bsm-overlay').classList.add('show');
  document.getElementById('bsm-modal').classList.add('show');
  // Reset to shop tab
  switchBsmTab('shop');
  document.getElementById('bsm-shop-items').innerHTML =
    '<div style="color:var(--muted);padding:20px;text-align:center;font-size:13px">Loading…</div>';
  const [res] = await Promise.all([
    api('GET', '/api/shop').catch(() => null),
    fetchAndCacheStats(),
  ]);
  _bsmCatalog   = Array.isArray(res?.items) ? res.items : [];
  _bsmExpiresAt = res?.expiresAt || 0;
  _bsmPurchased = new Set();
  _renderBsmShop();
  _renderBsmInv();
  _startBsmTimer();
}

function switchBsmTab(tab) {
  const shopCol   = document.getElementById('bsm-shop-col');
  const invCol    = document.getElementById('bsm-inv-col');
  const craftView = document.getElementById('bsm-craft-view');
  const tabShop   = document.getElementById('bsm-tab-shop');
  const tabCraft  = document.getElementById('bsm-tab-craft');
  if (tab === 'craft') {
    if (shopCol)   shopCol.style.display   = 'none';
    if (invCol)    invCol.style.display    = 'none';
    if (craftView) craftView.style.display = 'block';
    if (tabShop)   tabShop.classList.remove('active');
    if (tabCraft)  tabCraft.classList.add('active');
    renderCraftRecipes();
  } else {
    if (shopCol)   shopCol.style.display   = '';
    if (invCol)    invCol.style.display    = '';
    if (craftView) craftView.style.display = 'none';
    if (tabShop)   tabShop.classList.add('active');
    if (tabCraft)  tabCraft.classList.remove('active');
  }
}

let _craftRecipes = null;

async function renderCraftRecipes() {
  const el = document.getElementById('bsm-craft-recipes');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--muted);padding:20px;text-align:center;font-size:13px">Loading recipes…</div>';
  const [recipesRes] = await Promise.all([
    !_craftRecipes ? api('GET', '/api/crafting/recipes').catch(() => null) : Promise.resolve(null),
    !charCache      ? fetchAndCacheStats().catch(() => {})                 : Promise.resolve(),
  ]);
  if (recipesRes) _craftRecipes = recipesRes?.recipes || [];
  if (!_craftRecipes) _craftRecipes = [];
  const playerLv = charCache?.level || 1;
  if (!_craftRecipes.length) {
    el.innerHTML = '<div style="color:var(--muted);padding:20px;text-align:center;font-size:13px">No recipes available.</div>';
    return;
  }
  el.innerHTML = _craftRecipes.map(r => {
    const canLevel  = playerLv >= r.level_req;
    const gold      = charCache?.gold ?? 0;
    const canAfford = gold >= r.gold_cost;
    const mat2Html  = r.mat2_rarity
      ? `<span style="color:var(--muted)">+</span><span class="rarity-${r.mat2_rarity}">${r.mat2_rarity} ${r.mat2_slot}</span>` : '';
    const RARITY_LABEL = { normal:'Normal', magic:'Magic', rare:'Rare', legendary:'Legendary', godly:'Godly' };
    const outLabel  = RARITY_LABEL[r.out_rarity] || r.out_rarity;
    const reqHtml   = !canLevel ? `<span style="color:#cc4444">(Req. Lv.${r.level_req})</span>` : `<span style="color:var(--muted)">Lv.${r.level_req}</span>`;
    return `<div class="craft-recipe">
      <div class="craft-recipe-name rarity-${r.out_rarity}">${r.name}</div>
      <div style="font-size:9px;letter-spacing:.08em;font-family:'Cinzel',serif;margin-bottom:5px;display:flex;gap:8px;align-items:center">
        <span class="rarity-${r.out_rarity}">${outLabel} ${r.slot}</span>
        ${reqHtml}
      </div>
      <div class="craft-recipe-mats">
        <span style="color:var(--muted);font-size:9px">MATS:</span>
        <span class="rarity-${r.mat1_rarity}">${r.mat1_rarity} ${r.mat1_slot}</span>
        ${mat2Html}
      </div>
      <div class="craft-recipe-cost">Cost: ${r.gold_cost} 💰${!canAfford ? ' <span style="color:#cc4444">(insufficient gold)</span>' : ''}</div>
      <button class="craft-btn" onclick="craftItem(${r.id})" ${!canLevel || !canAfford ? 'disabled' : ''}>
        ⚒ Craft
      </button>
    </div>`;
  }).join('');
}

async function craftItem(recipeId) {
  const res = await api('POST', '/api/crafting/craft', { recipeId }).catch(() => null);
  if (!res || res.error) {
    showToast(`❌ ${res?.error || 'Crafting failed.'}`);
    return;
  }
  _craftRecipes = null; // invalidate cache so gold/level changes reflect
  await fetchAndCacheStats();
  _renderBsmInv();
  renderCraftRecipes();
  showToast(`⚒ Crafted: ${res.item?.name || 'new item'}! Check your inventory.`);
}

function closeBlacksmith() {
  document.getElementById('bsm-overlay').classList.remove('show');
  document.getElementById('bsm-modal').classList.remove('show');
  clearInterval(_bsmTimerInterval);
  _bsmTimerInterval = null;
}

function _startBsmTimer() {
  clearInterval(_bsmTimerInterval);
  const el = document.getElementById('bsm-refresh-timer');
  function tick() {
    const ms  = Math.max(0, _bsmExpiresAt - Date.now());
    const h   = Math.floor(ms / 3600000);
    const m   = Math.floor((ms % 3600000) / 60000);
    const s   = Math.floor((ms % 60000) / 1000);
    const pad = n => String(n).padStart(2, '0');
    el.textContent = ms > 0
      ? `Refreshes in ${h}:${pad(m)}:${pad(s)}`
      : 'Refreshing…';
  }
  tick();
  _bsmTimerInterval = setInterval(tick, 1000);
}

function _bsmAffixHtml(affixes) {
  if (!affixes || !affixes.length) return '';
  return affixes.map(a =>
    `<div class="bsm-affix-row ${a.type}">${escHtml(a.name)}: <b>${_affixValStr(a.stat, a.value)}</b> ${STAT_NAMES[a.stat] || a.stat}</div>`
  ).join('');
}

function bsmToggleAffixes(event) {
  event.stopPropagation();
  const btn = event.currentTarget;
  const detail = btn.closest('.bsm-item').querySelector('.bsm-affix-detail');
  if (!detail) return;
  const open = detail.classList.toggle('open');
  btn.textContent = open ? '▲' : '···';
}

function _bsmBonusStr(bonuses, excludeAtk = false, excludeDef = false) {
  if (!bonuses) return '';
  const labels = { atk_bonus:'ATK', def_bonus:'DEF', str_bonus:'STR', dex_bonus:'DEX',
                   int_bonus:'INT', spirit_bonus:'SP', hp_bonus:'HP', mp_bonus:'MP' };
  return Object.entries(bonuses)
    .filter(([k, v]) => v && !(excludeAtk && k === 'atk_bonus') && !(excludeDef && k === 'def_bonus'))
    .map(([k, v]) => `+${v} ${labels[k] || k}`)
    .join('  ');
}
function _bsmWeaponAtkHtml(item) {
  if (item.slot !== 'mainhand' || !item.bonuses?.atk_bonus) return '';
  return `<div class="bsm-weapon-atk">⚔ +${item.bonuses.atk_bonus} ATK</div>`;
}
function _bsmArmorDefHtml(item) {
  if (item.slot === 'mainhand') return '';
  const def = item.bonuses?.def_bonus || item.def_bonus || 0;
  if (!def) return '';
  return `<div class="bsm-weapon-atk">🛡 +${def} DEF</div>`;
}

function _slotLabel(slot) {
  return { head:'Head', chest:'Chest', gloves:'Gloves', pants:'Pants',
           boots:'Boots', mainhand:'Main Hand', offhand:'Off Hand' }[slot] || slot;
}

function _renderBsmShop() {
  const el = document.getElementById('bsm-shop-items');
  if (!_bsmCatalog || !_bsmCatalog.length) {
    el.innerHTML = '<div style="color:var(--muted);padding:20px;text-align:center;font-size:13px">No wares available — try again later.</div>';
    return;
  }
  el.innerHTML = (_bsmCatalog || []).map(item => {
    const sold  = _bsmPurchased.has(item.id);
    const rCls  = RARITY_COLORS[item.rarity] || 'rarity-normal';
    const isWeapon = item.slot === 'mainhand';
    const stats = _bsmBonusStr(item.bonuses, isWeapon, !isWeapon);
    return `<div class="bsm-item${sold ? ' bsm-item-sold' : ''}"${!sold ? ` draggable="true"` : ''}
      data-catalog-id="${item.id}"
      ${!sold ? `ondragstart="bsmDragStart(event,'shop','${item.id}')"` : ''}
      ${!sold ? `onclick="bsmConfirmBuy('${item.id}')"` : ''}>
      <div class="bsm-item-icon">${item.icon}</div>
      <div class="bsm-item-info">
        <div class="bsm-item-name ${rCls}">${escHtml(item.name)}</div>
        <div class="bsm-item-slot">${_slotLabel(item.slot)}${item.level_req > 1 ? ` · <span class="bsm-lvreq">Req. Lv.${item.level_req}</span>` : ''}</div>
        ${_bsmWeaponAtkHtml(item)}${_bsmArmorDefHtml(item)}
        ${stats ? `<div class="bsm-item-stats">${stats}</div>` : ''}
        ${_bsmAffixHtml(item.affixes) ? `<div class="bsm-affix-detail">${_bsmAffixHtml(item.affixes)}</div>` : ''}
      </div>
      <div class="bsm-item-price">
        ${sold ? '<span style="color:var(--muted);font-size:11px">Sold</span>' : `💰 ${item.cost}g<small>sell ${item.sell}g</small>`}
      </div>
      ${!sold && item.affixes?.length ? `<button class="bsm-dots-btn" onclick="bsmToggleAffixes(event)">···</button>` : ''}
      ${!sold ? `<button class="bsm-item-btn" onclick="event.stopPropagation();bsmConfirmBuy('${item.id}')">Buy</button>` : ''}
    </div>`;
  }).join('');
}

function _renderBsmInv() {
  let inv = [...(charCache?.inventory || [])];
  const gold = charCache?.gold ?? 0;
  document.getElementById('bsm-inv-count').textContent = inv.length;
  document.getElementById('bsm-gold-display').textContent = `💰 ${gold}`;
  const el = document.getElementById('bsm-inv-items');
  el.innerHTML = inv.map(item => {
    const rCls = RARITY_COLORS[item.rarity] || 'rarity-normal';
    const sellPrice = _calcSellValue(item);
    const slotMeta = SLOT_META[item.slot] || {};
    const isWeapon = item.slot === 'mainhand';
    const stats = _bsmBonusStr(item.bonuses, isWeapon, !isWeapon);
    return `<div class="bsm-item" draggable="true"
      data-inv-id="${item.inv_id}"
      ondragstart="bsmDragStart(event,'inv',${item.inv_id})"
      onclick="bsmConfirmSell(${item.inv_id},'${escHtml(item.name)}',${sellPrice})">
      <div class="bsm-item-icon">${item.icon || slotMeta.icon || '🎒'}</div>
      <div class="bsm-item-info">
        <div class="bsm-item-name ${rCls}">${escHtml(item.name)}</div>
        <div class="bsm-item-slot">${_slotLabel(item.slot)}</div>
        ${_bsmWeaponAtkHtml(item)}${_bsmArmorDefHtml(item)}
        ${stats ? `<div class="bsm-item-stats">${stats}</div>` : ''}
        ${_bsmAffixHtml(item.affixes) ? `<div class="bsm-affix-detail">${_bsmAffixHtml(item.affixes)}</div>` : ''}
      </div>
      <div class="bsm-item-price">
        <small>sell for</small>
        💰 ${sellPrice}g
      </div>
      ${item.affixes?.length ? `<button class="bsm-dots-btn" onclick="bsmToggleAffixes(event)">···</button>` : ''}
      <button class="bsm-item-btn sell-btn" onclick="event.stopPropagation();bsmConfirmSell(${item.inv_id},'${escHtml(item.name)}',${sellPrice})">Sell</button>
    </div>`;
  }).join('') || '<div style="color:var(--muted);padding:20px;text-align:center;font-size:13px">Inventory empty</div>';
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────

function bsmDragStart(e, type, id) {
  _bsmDragSrc = { type, id };
  e.dataTransfer.effectAllowed = 'move';
}

function bsmDragOver(e, target) {
  // Allow drop only when dragging the opposite type
  if (!_bsmDragSrc) return;
  if ((target === 'inv' && _bsmDragSrc.type === 'shop') ||
      (target === 'shop' && _bsmDragSrc.type === 'inv')) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-active');
  }
}

function bsmDragLeave(e) {
  e.currentTarget.classList.remove('drag-active');
}

function bsmDrop(e, target) {
  e.currentTarget.classList.remove('drag-active');
  if (!_bsmDragSrc) return;
  e.preventDefault();
  if (target === 'inv' && _bsmDragSrc.type === 'shop') {
    bsmConfirmBuy(_bsmDragSrc.id);
  } else if (target === 'shop' && _bsmDragSrc.type === 'inv') {
    // find item details from charCache
    const item = (charCache?.inventory || []).find(i => i.inv_id == _bsmDragSrc.id);
    if (item) {
      const sellPrice = _calcSellValue(item);
      bsmConfirmSell(item.inv_id, item.name, sellPrice);
    }
  }
  _bsmDragSrc = null;
}

// ── Confirm dialogs ───────────────────────────────────────────────────────────

function _bsmShowConfirm(msg, warn, onOk) {
  document.getElementById('bsm-confirm-msg').textContent = msg;
  document.getElementById('bsm-confirm-warn').textContent = warn || '';
  _bsmConfirmCallback = onOk;
  document.getElementById('bsm-confirm').classList.add('show');
  document.getElementById('bsm-confirm-ok').onclick = () => { bsmDismissConfirm(); onOk(); };
}

function bsmDismissConfirm() {
  document.getElementById('bsm-confirm').classList.remove('show');
  _bsmConfirmCallback = null;
}

function bsmConfirmBuy(catalogId) {
  const entry = (_bsmCatalog || []).find(c => c.id === catalogId);
  if (!entry) return;
  const gold = charCache?.gold ?? 0;
  const invCount = (charCache?.inventory || []).length;
  let warn = '';
  if (gold < entry.cost) warn = `⚠ Not enough gold! You have ${gold}g but need ${entry.cost}g.`;
  else if (invCount >= 100) warn = '⚠ Inventory is full (100/100). Drop something first.';
  _bsmShowConfirm(
    `Buy "${entry.name}" for 💰 ${entry.cost}g?`,
    warn,
    warn ? null : async () => {
      const res = await api('POST', '/api/shop/buy', { catalogId }).catch(() => null);
      if (res?.ok) {
        if (charCache) charCache.gold = res.gold;
        _bsmPurchased.add(catalogId);
        await fetchAndCacheStats();
        _renderBsmShop();
        _renderBsmInv();
        showToast(`🛒 Bought ${entry.name}!`);
      } else {
        showToast('❌ Purchase failed.');
      }
    }
  );
  if (warn) {
    // still show confirm but disable ok button
    document.getElementById('bsm-confirm-ok').disabled = true;
    document.getElementById('bsm-confirm-ok').style.opacity = '0.4';
  } else {
    document.getElementById('bsm-confirm-ok').disabled = false;
    document.getElementById('bsm-confirm-ok').style.opacity = '';
  }
}

function bsmConfirmSell(invId, name, price) {
  _bsmShowConfirm(
    `Sell "${name}" for 💰 ${price}g?`,
    '',
    async () => {
      const res = await api('POST', '/api/shop/sell', { invId }).catch(() => null);
      if (res?.ok) {
        if (charCache) charCache.gold = res.gold;
        await fetchAndCacheStats();
        _renderBsmInv();
        showToast(`💰 Sold for ${res.price}g!`);
      } else {
        showToast('❌ Sale failed.');
      }
    }
  );
}

function bsmSellAll() {
  const inv = charCache?.inventory || [];
  if (!inv.length) { showToast('⚠ Inventory is empty.'); return; }
  const total = inv.reduce((s, item) => s + _calcSellValue(item), 0);
  _bsmShowConfirm(
    `Sell all ${inv.length} item${inv.length > 1 ? 's' : ''} for 💰 ~${total}g?`,
    '(Actual prices may vary slightly)',
    async () => {
      let earned = 0;
      for (const item of [...inv]) {
        const res = await api('POST', '/api/shop/sell', { invId: item.inv_id }).catch(() => null);
        if (res?.ok) earned += res.price;
      }
      await fetchAndCacheStats();
      _renderBsmInv();
      showToast(`💰 Sold everything for ${earned}g!`);
    }
  );
}

// ── PvP ───────────────────────────────────────────────────────────────────────

function sendPvpChallenge(targetUsername) {
  if (_pvpWaitingFor) { showToast('⚠ Already waiting for a challenge response.'); return; }
  if (pvpState)       { showToast('⚠ You are already in a PvP battle.'); return; }
  socket.emit('pvp:challenge', { to: targetUsername });
}

function acceptPvpChallenge() {
  if (!_pvpPendingFrom) return;
  clearInterval(_pvpChallengeCountdown);
  const from = _pvpPendingFrom;
  _pvpPendingFrom = null;
  document.getElementById('pvp-challenge-modal').style.display = 'none';
  socket.emit('pvp:accept', { from });
}

function declinePvpChallenge() {
  if (!_pvpPendingFrom) return;
  clearInterval(_pvpChallengeCountdown);
  const from = _pvpPendingFrom;
  _pvpPendingFrom = null;
  document.getElementById('pvp-challenge-modal').style.display = 'none';
  socket.emit('pvp:decline', { from });
}

function cancelPvpChallenge() {
  _pvpWaitingFor = null;
  document.getElementById('pvp-waiting-modal').style.display = 'none';
}

function forfeitPvp() {
  if (!pvpState || pvpState.phase === 'ended') { closePvp(); return; }
  if (!confirm('Forfeit the battle? Your opponent wins.')) return;
  socket.emit('pvp:forfeit', { sessionId: pvpState.sessionId });
}

function closePvp() {
  pvpState = null;
  document.getElementById('pvp-overlay').style.display = 'none';
}

// ── PvP socket events ─────────────────────────────────────────────────────────

socket.on('pvp:challenge', ({ from, fromData }) => {
  _pvpPendingFrom = from;
  document.getElementById('pvp-ch-avatar').textContent = fromData.avatar || '❓';
  document.getElementById('pvp-ch-name').textContent   = from;
  document.getElementById('pvp-ch-info').textContent   = `Lv.${fromData.level} ${fromData.class}`;
  document.getElementById('pvp-challenge-modal').style.display = 'flex';

  let secs = 10;
  document.getElementById('pvp-ch-countdown').textContent = secs;
  clearInterval(_pvpChallengeCountdown);
  _pvpChallengeCountdown = setInterval(() => {
    secs--;
    const el = document.getElementById('pvp-ch-countdown');
    if (el) el.textContent = secs;
    if (secs <= 0) {
      clearInterval(_pvpChallengeCountdown);
      _pvpPendingFrom = null;
      document.getElementById('pvp-challenge-modal').style.display = 'none';
    }
  }, 1000);
});

socket.on('pvp:challenge_expired', () => {
  clearInterval(_pvpChallengeCountdown);
  _pvpPendingFrom = null;
  document.getElementById('pvp-challenge-modal').style.display = 'none';
});

socket.on('pvp:challenge_sent', ({ to }) => {
  _pvpWaitingFor = to;
  document.getElementById('pvp-waiting-name').textContent = to;
  document.getElementById('pvp-waiting-modal').style.display = 'flex';
});

socket.on('pvp:declined', ({ reason }) => {
  _pvpWaitingFor = null;
  document.getElementById('pvp-waiting-modal').style.display = 'none';
  const msgs = { timeout: 'Challenge expired — no response.', declined: 'Challenge was declined.', offline: 'Player went offline.' };
  showToast(`❌ ${msgs[reason] || 'Challenge cancelled.'}`);
});

socket.on('pvp:error', ({ msg }) => showToast(`⚠ PvP: ${msg}`));

socket.on('pvp:start', async ({ sessionId, opponent }) => {
  _pvpWaitingFor = null;
  _pvpPendingFrom = null;
  clearInterval(_pvpChallengeCountdown);
  document.getElementById('pvp-waiting-modal').style.display = 'none';
  document.getElementById('pvp-challenge-modal').style.display = 'none';

  pvpState = { sessionId, opponent, phase: 'loading', log: [] };

  // Render overlay immediately
  document.getElementById('pvp-overlay').style.display = 'flex';
  document.getElementById('pvp-status').textContent = '⏳ Connecting to arena…';
  document.getElementById('pvp-skills').innerHTML = '';
  document.getElementById('pvp-log-inner').innerHTML = '';

  // Render our side
  const cls = charCache?.class || 'Warrior';
  document.getElementById('pvp-my-fig').innerHTML    = PLAYER_SVGS[cls] || PLAYER_SVGS.Warrior;
  document.getElementById('pvp-my-name').textContent = `${me.username} · ${cls}`;
  document.getElementById('pvp-my-lv').textContent   = `Lv.${charCache?.level || 1}`;

  // Render opponent side
  document.getElementById('pvp-opp-fig').innerHTML    = PLAYER_SVGS[opponent.class] || PLAYER_SVGS.Warrior;
  document.getElementById('pvp-opp-name').textContent = `${opponent.username} · ${opponent.class}`;
  document.getElementById('pvp-opp-lv').textContent   = `Lv.${opponent.level || '?'}`;

  // Fetch fresh stats and report ready to server
  await fetchAndCacheStats();
  const stats = getEffectiveStats(charCache);
  socket.emit('pvp:ready', {
    sessionId,
    stats: {
      hp:     stats.hp,
      mp:     stats.mp,
      atk:    stats.atk,
      def:    stats.def,
      spirit: stats.spirit,
      dex:    stats.dex || charCache?.stats?.dex || 10,
    },
  });
});

socket.on('pvp:begin', (data) => {
  pvpState = { ...pvpState, ...data, phase: data.yourTurn ? 'your-turn' : 'opponent-turn' };
  _pvpRenderBars(data);
  const myDex  = (data.p1.username === me.username ? data.p1 : data.p2).dex;
  const oppDex = (data.p1.username === me.username ? data.p2 : data.p1).dex;
  document.getElementById('pvp-status').textContent = data.yourTurn
    ? `⚔ Battle starts! You go first (DEX ${myDex} vs ${oppDex})!`
    : `⚔ Battle starts! ${data.turnUsername} goes first (DEX ${oppDex} vs ${myDex})!`;
  _pvpAddLog(data.yourTurn ? 'You have the first move!' : `${data.turnUsername} moves first.`);
  _pvpRenderSkills();
});

socket.on('pvp:update', (data) => {
  pvpState = { ...pvpState, ...data, phase: data.yourTurn ? 'your-turn' : 'opponent-turn' };
  _pvpRenderBars(data);
  _pvpAddLog(data.log);
  document.getElementById('pvp-status').textContent = data.yourTurn
    ? 'Your turn — choose a skill!'
    : `Waiting for ${data.turnUsername}…`;
  if (data.yourTurn) showToast('⚔ Your turn!');
  _pvpRenderSkills();
});

socket.on('pvp:end', (data) => {
  const won = data.winner === me.username;
  pvpState = { ...pvpState, phase: 'ended' };
  _pvpRenderBars(data);
  _pvpAddLog(won ? `🏆 You defeated ${pvpState.opponent.username}!` : `💀 ${data.winner} won the battle.`);
  document.getElementById('pvp-status').textContent = won ? '🏆 Victory!' : '💀 Defeated!';
  document.getElementById('pvp-skills').innerHTML = `
    <div style="color:${won ? '#4eff91' : '#e07070'};font-family:'Cinzel',serif;font-size:15px;margin-bottom:10px">
      ${won ? '🏆 You Win!' : '💀 You Were Defeated'}
    </div>
    <button class="skill-btn" onclick="closePvp()">Leave Arena</button>
  `;
  showToast(won ? `🏆 You defeated ${pvpState.opponent.username} in PvP!` : `💀 ${data.winner} defeated you in PvP.`);
});

// ── PvP rendering helpers ─────────────────────────────────────────────────────

function _pvpRenderBars(data) {
  const pct = (cur, max) => `${Math.max(0, Math.min(100, max > 0 ? (cur / max) * 100 : 0))}%`;
  const myD  = data.p1.username === me.username ? data.p1 : data.p2;
  const oppD = data.p1.username === me.username ? data.p2 : data.p1;

  document.getElementById('pvp-my-hp-fill').style.width  = pct(myD.curHp,  myD.maxHp  || myD.curHp);
  document.getElementById('pvp-my-mp-fill').style.width  = pct(myD.curMp,  myD.maxMp  || myD.curMp);
  document.getElementById('pvp-my-hp-num').textContent   = `${Math.max(0, myD.curHp)}/${myD.maxHp || myD.curHp}`;
  document.getElementById('pvp-my-mp-num').textContent   = `${myD.curMp}/${myD.maxMp || myD.curMp}`;

  document.getElementById('pvp-opp-hp-fill').style.width = pct(oppD.curHp, oppD.maxHp || oppD.curHp);
  document.getElementById('pvp-opp-mp-fill').style.width = pct(oppD.curMp, oppD.maxMp || oppD.curMp);
  document.getElementById('pvp-opp-hp-num').textContent  = `${Math.max(0, oppD.curHp)}/${oppD.maxHp || oppD.curHp}`;
  document.getElementById('pvp-opp-mp-num').textContent  = `${oppD.curMp}/${oppD.maxMp || oppD.curMp}`;

  // Guard indicators
  const myGuardEl  = document.getElementById('pvp-my-guard');
  const oppGuardEl = document.getElementById('pvp-opp-guard');
  if (myGuardEl)  myGuardEl.textContent  = myD.guard  ? `🛡 ${Math.round(myD.guard.reduction * 100)}% · ${myD.guard.hitsRemaining} hit${myD.guard.hitsRemaining > 1 ? 's' : ''}` : '';
  if (oppGuardEl) oppGuardEl.textContent = oppD.guard ? `🛡 ${Math.round(oppD.guard.reduction * 100)}% · ${oppD.guard.hitsRemaining} hit${oppD.guard.hitsRemaining > 1 ? 's' : ''}` : '';
}

function _pvpAddLog(msg) {
  if (!msg || !pvpState) return;
  pvpState.log = [...(pvpState.log || []), msg];
  const inner = document.getElementById('pvp-log-inner');
  if (!inner) return;
  const lines = pvpState.log.slice(-6);
  inner.innerHTML = lines.map((l, i) =>
    `<div class="cb-log-line${i === lines.length - 1 ? ' new' : ''}">${escHtml(l)}</div>`
  ).join('');
  inner.parentElement.scrollTop = inner.parentElement.scrollHeight;
}

function _pvpRenderSkills() {
  const el = document.getElementById('pvp-skills');
  if (!el || !pvpState) return;
  if (pvpState.phase === 'loading') { el.innerHTML = '<div class="cb-phase-msg">Connecting…</div>'; return; }
  if (pvpState.phase === 'ended')   return;
  if (pvpState.phase !== 'your-turn') {
    el.innerHTML = `<div class="cb-phase-msg" style="color:#8aaccc">⏳ Waiting for ${escHtml(pvpState.opponent.username)}…</div>`;
    return;
  }

  const skills = getPlayerCombatSkills(charCache);
  const myData = pvpState.p1?.username === me.username ? pvpState.p1 : pvpState.p2;
  const curMp  = myData?.curMp ?? 999;

  el.innerHTML = skills.map(sk => {
    const noMp = sk.mpCost > 0 && curMp < sk.mpCost;
    const tgt  = sk.heal ? '💚 Self' : '⚔ Opponent';
    return `<button class="skill-btn${noMp ? ' no-mp' : ''}"
      onclick="pvpUseSkill('${sk.id}')" ${noMp ? 'disabled' : ''}>
      ${escHtml(sk.name)}
      <span class="sk-cost">${sk.mpCost ? `${sk.mpCost} MP` : 'Free'}</span>
      <span class="sk-target">${tgt}</span>
    </button>`;
  }).join('');
}

async function pvpUseSkill(skillId) {
  if (!pvpState || pvpState.phase !== 'your-turn') return;

  const skills = getPlayerCombatSkills(charCache);
  const skill  = skills.find(s => s.id === skillId);
  if (!skill) return;

  const myData  = pvpState.p1?.username === me.username ? pvpState.p1 : pvpState.p2;
  const oppData = pvpState.p1?.username === me.username ? pvpState.p2 : pvpState.p1;
  const curMp   = myData?.curMp ?? 0;

  if (skill.mpCost > curMp) { showToast('❌ Not enough MP!'); return; }

  // Disable buttons while animating
  pvpState.phase = 'busy';
  _pvpRenderSkills();

  const stats = getEffectiveStats(charCache);
  let dmg = 0, healAmt = 0, buffType = null, buffReduction = 0, buffHits = 0;

  const isBuff = skill.type === 'guard' || skill.type === 'divine_shield';
  if (skill.heal) {
    healAmt = Math.floor(stats.spirit * (skill.healMult || 3));
  } else if (isBuff) {
    const pt = Math.min((skill.pts || 1), skill.type === 'divine_shield' ? 3 : 3) - 1;
    buffType      = skill.type;
    buffReduction = (skill.reductionByPt || [0.5, 0.6, 0.6])[pt];
    buffHits      = skill.type === 'divine_shield' ? (skill.hits || 2) : (skill.hitsByPt || [2, 2, 3])[pt];
  } else {
    const oppDef = oppData?.def ?? 0;
    dmg = Math.max(1, Math.floor(stats.atk * skill.dmgMult) - Math.floor(oppDef * 0.5));
  }

  // Play animation
  const myFig  = document.getElementById('pvp-my-fig');
  const oppFig = document.getElementById('pvp-opp-fig');
  const proj   = ANIM_PROJECTILE[skill.type];

  async function pvpProjectile() {
    const fx = document.getElementById('pvp-fx');
    if (!fx || !proj) return new Promise(r => setTimeout(r, 420));
    return new Promise(resolve => {
      const p = Object.assign(document.createElement('span'), { className: 'cb-proj', textContent: proj });
      fx.appendChild(p);
      p.animate([{ left: '5%' }, { left: '90%' }], { duration: 420, easing: 'ease-in', fill: 'forwards' })
        .onfinish = () => { p.remove(); resolve(); };
    });
  }

  if (isBuff) {
    addAnim(myFig, 'anim-buff', 700);
    spawnFxText(skill.type === 'divine_shield' ? 'DIVINE!' : 'GUARD!', '#88ccff', myFig);
    await new Promise(r => setTimeout(r, 700));
  } else {
    switch (skill.type) {
      case 'melee': case 'bash': case 'stab':
        addAnim(myFig, 'anim-atk-r', 700);
        await new Promise(r => setTimeout(r, 340));
        addAnim(oppFig, 'anim-hit', 400); addAnim(oppFig, 'anim-shake', 450);
        await new Promise(r => setTimeout(r, 400));
        break;
      case 'heal':
        addAnim(myFig, 'anim-heal', 650);
        await new Promise(r => setTimeout(r, 650));
        break;
      default:
        addAnim(myFig, 'anim-magic', 550);
        await new Promise(r => setTimeout(r, 140));
        await pvpProjectile();
        addAnim(oppFig, 'anim-hit', 400);
        await new Promise(r => setTimeout(r, 340));
    }
  }

  socket.emit('pvp:action', {
    sessionId: pvpState.sessionId,
    skillName: skill.name,
    dmg,
    healAmt,
    mpCost:     skill.mpCost,
    targetSelf: !!(skill.heal || isBuff),
    buffType,
    buffReduction,
    buffHits,
  });
}

// ── Fullscreen ────────────────────────────────────────────────────────────────
function toggleFullscreen() {
  const btn = document.getElementById('btn-fullscreen');
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
    btn.textContent = '✕';
    btn.title = 'Exit Fullscreen';
  } else {
    document.exitFullscreen().catch(() => {});
    btn.textContent = '⛶';
    btn.title = 'Fullscreen';
  }
}
document.addEventListener('fullscreenchange', () => {
  const btn = document.getElementById('btn-fullscreen');
  if (btn) {
    btn.textContent = document.fullscreenElement ? '✕' : '⛶';
    btn.title = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen';
  }
});

// ── Royal Keep Resets ─────────────────────────────────────────────────────────
async function doSkillReset() {
  showToast('⏳ Resetting skills…');
  document.getElementById('bld-popup-sub').textContent = '⏳ Processing…';
  let res;
  try { res = await api('POST', '/api/me/skills/reset'); }
  catch (e) {
    showToast('❌ Skill reset failed — check connection');
    document.getElementById('bld-popup-sub').textContent = '❌ Request failed. Try again.';
    return;
  }
  if (!res || res.error) {
    showToast(`❌ ${res?.error || 'Unknown error'}`);
    document.getElementById('bld-popup-sub').textContent = `❌ ${res?.error || 'Unknown error'}`;
    return;
  }
  showToast(`✅ Skills reset! ${res.skillPoints} points returned`);
  document.getElementById('bld-popup-sub').innerHTML =
    `✅ Skills cleared! <b>${res.skillPoints}</b> skill points returned.<br>Remaining gold: <b>${res.gold} 💰</b>`;
  document.getElementById('bld-popup-actions').innerHTML = '';
  document.getElementById('my-gold').textContent = `💰 ${res.gold}`;
  await fetchAndCacheStats().catch(() => {});
  if (charCache) charCache.skillData = { unspentPoints: res.skillPoints, allocated: {} };
  if (document.getElementById('char-panel').classList.contains('show') && charTab) {
    switchCharTab(charTab);
  }
}

async function doAttrReset() {
  showToast('⏳ Resetting attributes…');
  document.getElementById('bld-popup-sub').textContent = '⏳ Processing…';
  let res;
  try { res = await api('POST', '/api/me/attributes/reset'); }
  catch (e) {
    showToast('❌ Attribute reset failed — check connection');
    document.getElementById('bld-popup-sub').textContent = '❌ Request failed. Try again.';
    return;
  }
  if (!res || res.error) {
    showToast(`❌ ${res?.error || 'Unknown error'}`);
    document.getElementById('bld-popup-sub').textContent = `❌ ${res?.error || 'Unknown error'}`;
    return;
  }
  showToast(`✅ Attributes reset! ${res.attrPoints} points returned`);
  document.getElementById('bld-popup-sub').innerHTML =
    `✅ Attributes cleared! <b>${res.attrPoints}</b> attribute points returned.<br>Remaining gold: <b>${res.gold} 💰</b>`;
  document.getElementById('bld-popup-actions').innerHTML = '';
  document.getElementById('my-gold').textContent = `💰 ${res.gold}`;
  await fetchAndCacheStats().catch(() => {});
  if (document.getElementById('char-panel').classList.contains('show') && charTab) {
    switchCharTab(charTab);
  }
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