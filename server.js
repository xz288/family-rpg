const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const dbModule = require('./database');
const { hashPassword, checkPassword, signToken, verifyToken, requireAuth, requireGM, requireAdmin } = require('./auth');
const { calcStats, sumGear, CLASSES, SLOTS, CLASS_AVATARS, generateItemAffixes } = require('./classes');
const { query, run, adjustAttrPoints, getStash, addStashItem, removeStashItem } = dbModule;

// Parse affixes JSON for items returned from DB
function parseAffixes(items) {
  return items.map(i => ({ ...i, affixes: i.affixes ? JSON.parse(i.affixes) : [] }));
}

// ── Blacksmith shop — dynamic generation ──────────────────────────────────────

// Minimum player level required to equip each rarity (module scope — used by shop + loot)
const RARITY_LEVEL_REQ = { normal:1, uncommon:3, magic:5, rare:8, epic:12, legendary:12, godly:15 };

// Sell value base by rarity — factors in level_req with ±15% random fluctuation at sell time
const SELL_BASE_BY_RARITY = { normal:15, uncommon:28, magic:45, rare:90, epic:140, legendary:300, godly:600 };
function calcSellValue(rarity, level_req) {
  const base = SELL_BASE_BY_RARITY[rarity] ?? 15;
  const lvMult = 1 + ((level_req || 1) - 1) * 0.3;
  const fluctuation = 0.85 + Math.random() * 0.3; // ±15% randomness
  return Math.max(1, Math.round(base * lvMult * fluctuation));
}

// Base item names per slot (picked randomly)
const SHOP_BASE_NAMES = {
  mainhand: ['Sword', 'Axe', 'Blade', 'Staff', 'Bow', 'Dagger', 'Wand'],
  offhand:  ['Shield', 'Buckler', 'Tome', 'Orb'],
  head:     ['Helm', 'Cap', 'Hood', 'Crown'],
  chest:    ['Chestplate', 'Vest', 'Robe', 'Mail'],
  gloves:   ['Gauntlets', 'Gloves', 'Wraps', 'Grips'],
  pants:    ['Leggings', 'Trousers', 'Greaves', 'Breeches'],
  boots:    ['Boots', 'Sabatons', 'Treads', 'Stompers'],
};

const SHOP_ICONS = {
  mainhand: ['⚔️','🪓','🗡️','🪄','🏹','🔪','🪄'],
  offhand:  ['🛡️','🛡️','📖','🔮'],
  head:     ['🪖','🪖','🧢','👑'],
  chest:    ['🦺','🦺','👘','🧥'],
  gloves:   ['🧤','🧤','🧤','🧤'],
  pants:    ['👖','👖','👖','👖'],
  boots:    ['👢','👢','👟','👢'],
};

// Cost ranges [min, max] by rarity — intentionally steep to keep loot as the main upgrade path
const RARITY_COST_RANGE = {
  normal:    [450,   840],
  magic:     [1650,  2850],
  rare:      [5400,  9600],
  legendary: [18000, 30000],
  godly:     [60000, 105000],
};

// Rarity weights by player level: { rarity: weight }
function _shopRarityWeights(level) {
  if (level <= 4)  return { normal: 75, magic: 22, rare: 3 };
  if (level <= 9)  return { normal: 45, magic: 45, rare: 9,  legendary: 1 };
  if (level <= 15) return { normal: 15, magic: 55, rare: 26, legendary: 4 };
  if (level <= 22) return { normal: 5,  magic: 40, rare: 45, legendary: 9,  godly: 1 };
  return                   { normal: 0,  magic: 20, rare: 50, legendary: 26, godly: 4 };
}

function _pickWeighted(weights) {
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of Object.entries(weights)) {
    r -= w;
    if (r <= 0) return key;
  }
  return Object.keys(weights)[0];
}

function _randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

// Shield detection & icons
const SHIELD_RE = /shield|buckler|aegis|bulwark|targe/i;
function _offhandIcon(name) { return SHIELD_RE.test(name) ? '🛡️' : '🔮'; }
function _isShield(name)    { return SHIELD_RE.test(name); }

// Weapons always carry at least one ATK affix based on tier × level
const WEAPON_ATK_TABLE = {
  normal:    { base: 4,  per: 0.5 },
  magic:     { base: 8,  per: 1.0 },
  rare:      { base: 14, per: 1.7 },
  legendary: { base: 22, per: 2.7 },
  godly:     { base: 32, per: 4.0 },
};
function guaranteeWeaponAtk(affixes, bonuses, rarity, level) {
  const t = WEAPON_ATK_TABLE[rarity] || WEAPON_ATK_TABLE.normal;
  const guaranteed = Math.floor(t.base + (level - 1) * t.per);
  const currentAtk = bonuses.atk_bonus || 0;
  if (currentAtk >= guaranteed) return { affixes, bonuses };
  // Add a Keen affix for the shortfall, preserving all original affixes
  const needed     = guaranteed - currentAtk;
  const keenAffix  = { name: 'Keen', type: 'prefix', stat: 'atk_bonus', value: needed };
  const newBonuses = { ...bonuses, atk_bonus: guaranteed };
  return { affixes: [keenAffix, ...affixes], bonuses: newBonuses };
}

// All non-weapon gear carries at least one DEF affix — guaranteed values by rarity tier
const ARMOR_DEF_BY_RARITY = { normal:1, magic:2, rare:4, legendary:9, godly:14 };
function guaranteeArmorDef(affixes, bonuses, rarity) {
  if (affixes.some(a => a.stat === 'def_bonus')) return { affixes, bonuses };
  const value    = ARMOR_DEF_BY_RARITY[rarity] || 1;
  const defAffix = { name: 'Sturdy', type: 'prefix', stat: 'def_bonus', value };
  const newBonuses = { ...bonuses };
  let newAffixes;
  if (affixes.length > 0) {
    const replaced = affixes[affixes.length - 1];
    newBonuses[replaced.stat] = (newBonuses[replaced.stat] || 0) - replaced.value;
    if (newBonuses[replaced.stat] <= 0) delete newBonuses[replaced.stat];
    newAffixes = [...affixes.slice(0, -1), defAffix];
  } else {
    newAffixes = [defAffix];
  }
  newBonuses.def_bonus = (newBonuses.def_bonus || 0) + value;
  return { affixes: newAffixes, bonuses: newBonuses };
}

// Base block rate ranges [min, max] by rarity — only applies to offhand items
const OFFHAND_BLOCK_RATE = { normal:[5,8], magic:[8,12], rare:[12,15], legendary:[15,18], godly:[18,20] };
function _rollBlockRate(rarity, randFn) {
  const [mn, mx] = OFFHAND_BLOCK_RATE[rarity] || [5, 8];
  return randFn(mn, mx);
}

// Special affixes — slim chance on rare+ gear only
// Weapons: crit_bonus (% crit rate), Armor: dmg_reduction (% damage taken reduction)
const SPECIAL_AFFIX_CHANCE   = { rare: 0.10, legendary: 0.18, godly: 0.28 };
const SPECIAL_CRIT_BY_RARITY = {
  rare:      { base: 1, perLevel: 0.15, max: 4  },
  legendary: { base: 3, perLevel: 0.20, max: 7  },
  godly:     { base: 6, perLevel: 0.20, max: 10 },
};
const SPECIAL_DR_BY_RARITY   = {
  rare:      { base: 5, perLevel: 0.05, max: 6  },
  legendary: { base: 6, perLevel: 0.10, max: 8  },
  godly:     { base: 8, perLevel: 0.10, max: 10 },
};
function rollSpecialAffix(slot, rarity, level, randFn) {
  const chance = SPECIAL_AFFIX_CHANCE[rarity];
  if (!chance || randFn(1, 100) > Math.round(chance * 100)) return null;
  if (slot === 'mainhand') {
    const t = SPECIAL_CRIT_BY_RARITY[rarity];
    if (!t) return null;
    const value = Math.min(t.max, Math.floor(t.base + level * t.perLevel));
    return { name: 'Keen Eye', type: 'prefix', stat: 'crit_bonus', value };
  } else {
    const t = SPECIAL_DR_BY_RARITY[rarity];
    if (!t) return null;
    const value = Math.min(t.max, Math.floor(t.base + level * t.perLevel));
    return { name: 'Resilient', type: 'prefix', stat: 'dmg_reduction', value };
  }
}

function generateShopForPlayer(level) {
  const weights = _shopRarityWeights(level);
  const items = [];
  let seq = 0;

  for (const slot of SLOTS) {
    // 2 items per slot
    for (let k = 0; k < 2; k++) {
      const rarity   = _pickWeighted(weights);
      let { affixes, bonuses } = generateItemAffixes(slot, rarity);
      const baseIdx  = _randInt(0, SHOP_BASE_NAMES[slot].length - 1);
      const baseName = SHOP_BASE_NAMES[slot][baseIdx];
      const icon     = SHOP_ICONS[slot][baseIdx] || '🎒';
      if (slot !== 'mainhand')
        ({ affixes, bonuses } = guaranteeArmorDef(affixes, bonuses, rarity));

      // Build name from affixes
      const prefix = affixes.find(a => a.type === 'prefix');
      const suffix = affixes.find(a => a.type === 'suffix');
      const parts  = [prefix?.name, baseName, suffix ? `of ${suffix.name.replace(/^of\s+/i,'')}` : ''];
      const name   = parts.filter(Boolean).join(' ');

      const [cMin, cMax] = RARITY_COST_RANGE[rarity] || [60, 100];
      const cost = _randInt(cMin, cMax);
      const sell = Math.round(cost * 0.4);

      const level_req  = RARITY_LEVEL_REQ[rarity] ?? 1;
      if (slot === 'mainhand')
        ({ affixes, bonuses } = guaranteeWeaponAtk(affixes, bonuses, rarity, level_req));
      const block_rate = slot === 'offhand' && _isShield(baseName) ? _rollBlockRate(rarity, _randInt) : 0;
      const special = rollSpecialAffix(slot, rarity, level_req, _randInt);
      if (special) affixes = [...affixes, special];
      items.push({ id: `sh_${slot}_${seq++}`, slot, name, icon, rarity, affixes, bonuses, cost, sell, level_req, block_rate });
    }
  }

  return items;
}

// Per-user shop cache: username → { items, generatedAt }
const shopCache = new Map();
const SHOP_TTL  = 2 * 60 * 60 * 1000; // 2 hours

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

  const validClasses = Object.keys(CLASSES);

  const chosenClass = validClasses.includes(charClass) ? charClass : 'Warrior';
  const chosenAvatar = avatar || CLASS_AVATARS[chosenClass];

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
  const equipped   = parseAffixes(db.getEquipment.all(user.username));
  const inventory  = parseAffixes(db.getInventory.all(user.username));
  const quests     = db.getPlayerQuests.all(user.username);
  const attrStats  = { str: user.attr_str||0, dex: user.attr_dex||0, int: user.attr_int||0, spirit: user.attr_spirit||0 };
  const classBase  = CLASSES[user.class] || CLASSES.Warrior;
  const stats      = calcStats(user.class, sumGear(equipped), attrStats);
  const rawHp = user.hp !== undefined ? user.hp : stats.hp;
  const curHp = Math.min(rawHp, stats.hp); // never exceed current max HP
  res.json({ class: user.class, level: user.level, xp: user.xp, stats, classBase, attrStats, attrPoints: user.attr_points||0, equipped, slots: SLOTS, inventory, quests, gold: user.gold||0, curHp });
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
  const attrStats = { str: user.attr_str||0, dex: user.attr_dex||0, int: user.attr_int||0, spirit: user.attr_spirit||0 };
  const stats     = calcStats(user.class, sumGear(equipped), attrStats);
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

// Complete the Gatehouse quest (called after Demon Lord is defeated)
app.post('/api/me/quests/gatehouse/complete', requireAuth, (req, res) => {
  const username = req.user.username;
  const quest = db.getPlayerQuests.get(username, 'gatehouse_patrol');
  if (!quest) return res.json({ ok: false, reason: 'quest not found' });
  if (quest.status === 'complete') return res.json({ ok: true, alreadyDone: true });
  run('UPDATE player_quests SET status=? WHERE username=? AND quest_key=?',
    ['complete', username, 'gatehouse_patrol']);
  res.json({ ok: true });
});

// Forest map progress — stored server-side so it persists across devices and resets with seasons
app.get('/api/me/progress', requireAuth, (req, res) => {
  const user = db.getUserByUsername.get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ forest_progress: user.forest_progress ?? 0 });
});

app.post('/api/me/progress', requireAuth, (req, res) => {
  const { forest_progress } = req.body;
  if (!Number.isInteger(forest_progress) || forest_progress < 0 || forest_progress > 99)
    return res.status(400).json({ error: 'Invalid progress' });
  const user = db.getUserByUsername.get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  // Only allow advancing, never rolling back via this endpoint
  if (forest_progress > (user.forest_progress ?? 0)) {
    run('UPDATE users SET forest_progress=? WHERE username=?', [forest_progress, req.user.username]);
  }
  res.json({ ok: true, forest_progress: Math.max(forest_progress, user.forest_progress ?? 0) });
});

// Desert Saharrrra map progress
app.get('/api/me/desert-progress', requireAuth, (req, res) => {
  const user = db.getUserByUsername.get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ desert_progress: user.desert_progress ?? 0 });
});

app.post('/api/me/desert-progress', requireAuth, (req, res) => {
  const { desert_progress } = req.body;
  if (!Number.isInteger(desert_progress) || desert_progress < 0 || desert_progress > 99)
    return res.status(400).json({ error: 'Invalid progress' });
  const user = db.getUserByUsername.get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (desert_progress > (user.desert_progress ?? 0)) {
    run('UPDATE users SET desert_progress=? WHERE username=?', [desert_progress, req.user.username]);
  }
  res.json({ ok: true, desert_progress: Math.max(desert_progress, user.desert_progress ?? 0) });
});

// Grant XP after combat win
app.post('/api/me/xp', requireAuth, (req, res) => {
  const xpGain = parseInt(req.body.xp, 10);
  if (!Number.isInteger(xpGain) || xpGain <= 0 || xpGain > 10000)
    return res.status(400).json({ error: 'Invalid XP' });
  const user     = db.getUserByUsername.get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const newTotal = user.xp + xpGain;
  const newLevel = Math.min(30, Math.floor(Math.sqrt(newTotal / 100)) + 1);
  const levelGain = Math.max(0, newLevel - user.level);
  db.updateUserXP.run(xpGain, newLevel, req.user.username);
  if (levelGain > 0) {
    db.adjustSkillPoints.run(levelGain, req.user.username);
    adjustAttrPoints.run(levelGain * 5, req.user.username);
  }
  res.json({ ok: true, xp: newTotal, level: newLevel, newSkillPoints: levelGain, newAttrPoints: levelGain * 5 });
});

// Record player death — sets HP to 1
app.post('/api/me/die', requireAuth, (req, res) => {
  run('UPDATE users SET hp = 1 WHERE username = ?', [req.user.username]);
  res.json({ ok: true, curHp: 1 });
});

// Heal at Royal Keep — restores HP and MP to max
app.post('/api/me/heal', requireAuth, (req, res) => {
  const user = db.getUserByUsername.get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const equipped  = parseAffixes(db.getEquipment.all(user.username));
  const attrStats = { str: user.attr_str||0, dex: user.attr_dex||0, int: user.attr_int||0, spirit: user.attr_spirit||0 };
  const stats     = calcStats(user.class, sumGear(equipped), attrStats);
  run('UPDATE users SET hp = ? WHERE username = ?', [stats.hp, req.user.username]);
  res.json({ ok: true, curHp: stats.hp, curMp: stats.mp });
});

// Distribute one attribute point into str / dex / int / spirit
app.post('/api/me/attributes/assign', requireAuth, (req, res) => {
  const { attr } = req.body;
  const validAttrs = ['str', 'dex', 'int', 'spirit'];
  if (!validAttrs.includes(attr)) return res.status(400).json({ error: 'Invalid attribute' });
  const user = db.getUserByUsername.get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.attr_points || user.attr_points <= 0) return res.status(400).json({ error: 'No attribute points available' });
  const col = `attr_${attr}`;
  run(`UPDATE users SET ${col} = ${col} + 1, attr_points = attr_points - 1 WHERE username = ?`, [req.user.username]);
  const updated = db.getUserByUsername.get(req.user.username);
  res.json({ ok: true, attr, value: updated[col], attrPoints: updated.attr_points });
});

// Skill tree: get allocated points and unspent points
app.get('/api/me/skills', requireAuth, (req, res) => {
  let user = db.getUserByUsername.get(req.user.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const rows = db.getPlayerSkills.all(req.user.username);

  // Self-heal: total points (unspent + allocated) must be >= level - 1
  const totalAllocated = rows.reduce((s, r) => s + (r.points || 0), 0);
  const totalPoints    = (user.skill_points || 0) + totalAllocated;
  const expected       = Math.max(0, (user.level || 1) - 1);
  if (totalPoints < expected) {
    db.adjustSkillPoints.run(expected - totalPoints, req.user.username);
    user = db.getUserByUsername.get(req.user.username);
  }

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
  mainhand: { D:['Rusty Blade','Chipped Sword','Bent Dagger','Cracked Club'], C:['Iron Sword','Steel Dagger','Hunter\'s Shortbow','Oak Staff'], B:['Shadow Blade','Enchanted Staff','Moonbow','Void Shard'], A:['Sunseeker\'s Scimitar','Khemeti War-blade','Eye-Blessed Staff','Oasis-Forged Saber'], S:['Eternal Sun Blade','Wrathbound Scepter','Saharrrran Relic Sword'] },
  offhand:  { D:['Cracked Buckler','Worn Shield','Chipped Focus'], C:['Iron Shield','Leather Buckler','Oak Totem'], B:['Shadow Aegis','Enchanted Orb','Knight\'s Bulwark'], A:['Pharaoh\'s Guard','Sun-disk Aegis','Oasis-Forged Bulwark'], S:['Eternal Sun Shield','Wrathbound Orb','Saharrrran Relic Focus'] },
  head:     { D:['Torn Hood','Dented Cap','Ragged Hat'], C:['Iron Helm','Leather Cap','Chain Coif'], B:['Shadow Cowl','Mage Crown','Knight\'s Visor'], A:['Sunseeker\'s Khat','Khemeti Crown','Dunestalker Cowl'], S:['Eternal Sun Crown','Wrathbound Mask','Pharaoh\'s Nemes'] },
  chest:    { D:['Tattered Tunic','Cracked Chest Plate','Worn Vest'], C:['Chain Mail','Iron Breastplate','Leather Armor'], B:['Shadow Coat','Mage Robe','Knight\'s Plate'], A:['Sunseeker\'s Robes','Khemeti Plate','Oasis-Forged Mail'], S:['Eternal Sun Raiment','Wrathbound Shroud','Pharaoh\'s Burial Wraps'] },
  pants:    { D:['Torn Pants','Rusted Greaves','Patched Leggings'], C:['Iron Greaves','Leather Pants','Chain Leggings'], B:['Shadow Leggings','Battle Greaves','Mage Trousers'], A:['Sunseeker\'s Kilt','Khemeti Greaves','Dunestalker Legwraps'], S:['Eternal Sun Legs','Wrathbound Greaves','Pharaoh\'s Gold Kilt'] },
  boots:    { D:['Worn Boots','Cracked Sandals','Tattered Shoes'], C:['Iron Boots','Leather Boots','Hunter\'s Treads'], B:['Shadow Treads','Knight\'s Sabatons','Mage Slippers'], A:['Sunseeker\'s Sandals','Khemeti Treads','Oasis-Forged Boots'], S:['Eternal Sun Sabatons','Wrathbound Sandals','Pharaoh\'s Gold Boots'] },
  gloves:   { D:['Tattered Gloves','Worn Mitts','Cracked Gauntlets'], C:['Iron Gauntlets','Leather Gloves','Chain Mitts'], B:['Shadow Wraps','Knight\'s Gauntlets','Mage Gloves'], A:['Sunseeker\'s Handwraps','Khemeti Gauntlets','Eye-Blessed Mitts'], S:['Eternal Sun Gauntlets','Wrathbound Handwraps','Pharaoh\'s Gold Gloves'] },
};
const LOOT_SLOT_ICON = { mainhand:'⚔️', offhand:'🔮', head:'🪖', chest:'🦺', pants:'👖', boots:'👢', gloves:'🧤' };
const LOOT_TIER_RARITY = { D:'normal', C:'magic', B:'rare', A:'legendary', S:'godly' };
// SLOTS is imported from classes.js — no duplicate list needed
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

    const slot    = SLOTS[Math.floor(Math.random() * SLOTS.length)];
    const names   = LOOT_NAMES[slot]?.[tier] || [`${tier} ${slot}`];
    const name    = names[Math.floor(Math.random() * names.length)];
    const icon    = slot === 'offhand' ? _offhandIcon(name) : (LOOT_SLOT_ICON[slot] || '🎒');
    const rarity  = LOOT_TIER_RARITY[tier] || 'normal';

    let { affixes, bonuses } = generateItemAffixes(slot, rarity);
    if (slot !== 'mainhand')
      ({ affixes, bonuses } = guaranteeArmorDef(affixes, bonuses, rarity));
    if (slot === 'mainhand')
      ({ affixes, bonuses } = guaranteeWeaponAtk(affixes, bonuses, rarity, mon.level || 1));
    const b = bonuses;

    const rarityReq  = RARITY_LEVEL_REQ[rarity] ?? 1;
    const level_req  = Math.min(rarityReq, mon.level || 1);
    const block_rate = slot === 'offhand' && _isShield(name) ? _rollBlockRate(rarity, lootRandInt) : 0;
    const special = rollSpecialAffix(slot, rarity, level_req, lootRandInt);
    if (special) affixes = [...affixes, special];

    const { lastInsertRowid } = db.run(
      `INSERT INTO items (name, slot, rarity, icon, affixes,
         str_bonus, dex_bonus, int_bonus, spirit_bonus,
         hp_bonus, mp_bonus, atk_bonus, def_bonus, level_req, block_rate)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [name, slot, rarity, icon, JSON.stringify(affixes),
       b.str_bonus||0, b.dex_bonus||0, b.int_bonus||0, b.spirit_bonus||0,
       b.hp_bonus||0, b.mp_bonus||0, b.atk_bonus||0, b.def_bonus||0, level_req, block_rate]
    );
    db.addInventoryItem.run(username, lastInsertRowid);
    droppedItems.push({ id: lastInsertRowid, name, slot, icon, rarity, level_req, block_rate, affixes, ...b });
  }

  if (gold > 0) db.addGold.run(gold, username);
  res.json({ items: droppedItems, gold });
});

// ── REST API: Party ───────────────────────────────────────────────────────────

// Public combat stats for another player (used by party leader to load member stats)
app.get('/api/users/:target/combat-stats', requireAuth, (req, res) => {
  const user = db.getUserByUsername.get(req.params.target);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const equipped  = parseAffixes(db.getEquipment.all(user.username));
  const attrStats = { str: user.attr_str||0, dex: user.attr_dex||0, int: user.attr_int||0, spirit: user.attr_spirit||0 };
  const stats     = calcStats(user.class, sumGear(equipped), attrStats);
  const curHp     = Math.min(user.hp !== undefined ? user.hp : stats.hp, stats.hp);
  res.json({ username: user.username, class: user.class, level: user.level, curHp, stats });
});

// Award XP + independent loot rolls to every party member after a boss win
app.post('/api/party/reward', requireAuth, (req, res) => {
  const { partyMembers, xp, monsters } = req.body;
  if (!Array.isArray(partyMembers) || partyMembers.length < 2 || partyMembers.length > 3)
    return res.status(400).json({ error: 'Invalid party size' });
  if (!partyMembers.includes(req.user.username))
    return res.status(403).json({ error: 'Not in party' });
  if (!Number.isInteger(xp) || xp <= 0 || xp > 20000)
    return res.status(400).json({ error: 'Invalid XP' });

  const results = {};
  for (const member of partyMembers) {
    const user = db.getUserByUsername.get(member);
    if (!user) continue;

    // XP
    const newTotal  = user.xp + xp;
    const newLevel  = Math.min(30, Math.floor(Math.sqrt(newTotal / 100)) + 1);
    const levelGain = Math.max(0, newLevel - user.level);
    db.updateUserXP.run(xp, newLevel, member);
    if (levelGain > 0) {
      db.adjustSkillPoints.run(levelGain, member);
      adjustAttrPoints.run(levelGain * 5, member);
    }

    // Independent loot roll per member
    const items = [];
    let gold = 0;
    if (Array.isArray(monsters) && monsters.length) {
      for (const mon of monsters) {
        const tier = mon.tier || 'D';
        const g = { D:[5,18], C:[18,45], B:[45,95], A:[95,180], S:[180,350] }[tier] || [5,18];
        gold += lootRandInt(g[0], g[1]);
      }
      const maxItems = Math.min(3, monsters.length + 1);
      for (const mon of monsters) {
        if (items.length >= maxItems) break;
        const tier   = mon.tier || 'D';
        const chance = { D:0.35, C:0.55, B:0.72, A:0.88, S:0.96 }[tier] || 0.35;
        if (Math.random() >= chance) continue;
        const slot   = SLOTS[Math.floor(Math.random() * SLOTS.length)];
        const names  = LOOT_NAMES[slot]?.[tier] || [`${tier} ${slot}`];
        const name   = names[Math.floor(Math.random() * names.length)];
        const icon   = slot === 'offhand' ? _offhandIcon(name) : (LOOT_SLOT_ICON[slot] || '🎒');
        const rarity = LOOT_TIER_RARITY[tier] || 'normal';
        let { affixes, bonuses } = generateItemAffixes(slot, rarity);
        if (slot !== 'mainhand') ({ affixes, bonuses } = guaranteeArmorDef(affixes, bonuses, rarity));
        if (slot === 'mainhand')  ({ affixes, bonuses } = guaranteeWeaponAtk(affixes, bonuses, rarity, mon.level || 1));
        const b          = bonuses;
        const level_req  = Math.min(RARITY_LEVEL_REQ[rarity] ?? 1, mon.level || 1);
        const block_rate = slot === 'offhand' && _isShield(name) ? _rollBlockRate(rarity, lootRandInt) : 0;
        const special    = rollSpecialAffix(slot, rarity, level_req, lootRandInt);
        if (special) affixes = [...affixes, special];
        const { lastInsertRowid } = db.run(
          `INSERT INTO items (name,slot,rarity,icon,affixes,str_bonus,dex_bonus,int_bonus,spirit_bonus,hp_bonus,mp_bonus,atk_bonus,def_bonus,level_req,block_rate) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [name,slot,rarity,icon,JSON.stringify(affixes),b.str_bonus||0,b.dex_bonus||0,b.int_bonus||0,b.spirit_bonus||0,b.hp_bonus||0,b.mp_bonus||0,b.atk_bonus||0,b.def_bonus||0,level_req,block_rate]
        );
        db.addInventoryItem.run(member, lastInsertRowid);
        items.push({ id: lastInsertRowid, name, slot, icon, rarity, level_req, affixes, ...b });
      }
      if (gold > 0) db.addGold.run(gold, member);
    }
    results[member] = { xp, levelGain, gold, items };
  }
  res.json({ ok: true, results });
});

// ── REST API: Inventory ───────────────────────────────────────────────────────

app.get('/api/me/inventory', requireAuth, (req, res) => {
  res.json(db.getInventory.all(req.user.username));
});

// Drop (permanently delete) an inventory item the player owns
app.delete('/api/me/inventory/:invId', requireAuth, (req, res) => {
  const username = req.user.username;
  const invId    = parseInt(req.params.invId);
  const row = query(
    'SELECT id FROM player_inventory WHERE id=? AND username=?', [invId, username]
  )[0];
  if (!row) return res.status(404).json({ error: 'Item not found' });
  run('DELETE FROM player_inventory WHERE id=?', [invId]);
  const remaining = query('SELECT COUNT(*) as n FROM player_inventory WHERE username=?', [username])[0]?.n ?? 0;
  res.json({ ok: true, remaining });
});

// Equip an item from inventory — swaps if slot occupied
app.post('/api/me/inventory/:invId/equip', requireAuth, (req, res) => {
  const username = req.user.username;
  const invId    = parseInt(req.params.invId);
  const { slot } = req.body;

  if (!SLOTS.includes(slot)) return res.status(400).json({ error: 'Invalid slot' });

  // Verify ownership + get item details via join
  const [invRow] = query(
    `SELECT pi.id as inv_id, pi.item_id, i.slot as item_slot, i.level_req
     FROM player_inventory pi JOIN items i ON i.id = pi.item_id
     WHERE pi.id = ? AND pi.username = ?`,
    [invId, username]
  );
  if (!invRow) return res.status(404).json({ error: 'Item not in your inventory' });
  if (invRow.item_slot !== slot) {
    return res.status(400).json({ error: `This item belongs in the ${invRow.item_slot} slot` });
  }

  // Level requirement check
  const equipUser = db.getUserByUsername.get(username);
  if (equipUser && (equipUser.level || 1) < (invRow.level_req || 1)) {
    return res.status(400).json({ error: `Requires level ${invRow.level_req}` });
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
  const attrStats = { str: user.attr_str||0, dex: user.attr_dex||0, int: user.attr_int||0, spirit: user.attr_spirit||0 };
  const stats     = calcStats(user.class, sumGear(equipped), attrStats);
  res.json({ equipped, inventory, stats });
});

// ── REST API: Blacksmith Shop ─────────────────────────────────────────────────

// Get the shop catalog — generated fresh per player level, cached 30 min
app.get('/api/shop', requireAuth, (req, res) => {
  try {
    const username = req.user.username;
    const now = Date.now();
    const cached = shopCache.get(username);
    if (!cached || now - cached.generatedAt > SHOP_TTL) {
      const user = db.getUserByUsername.get(username);
      const items = generateShopForPlayer(user?.level || 1);
      shopCache.set(username, { items, generatedAt: now });
    }
    const entry = shopCache.get(username);
    res.json({ items: entry.items, expiresAt: entry.generatedAt + SHOP_TTL });
  } catch (err) {
    console.error('Shop generation error:', err);
    res.status(500).json({ error: 'Shop unavailable' });
  }
});

// Buy an item from the shop — validates against the server-side cache
app.post('/api/shop/buy', requireAuth, (req, res) => {
  const username = req.user.username;
  const { catalogId } = req.body;
  const cached = shopCache.get(username);
  const entry  = cached?.items?.find(c => c.id === catalogId);
  if (!entry) return res.status(400).json({ error: 'Shop has refreshed — please reopen the blacksmith' });

  const user = db.getUserByUsername.get(username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if ((user.gold || 0) < entry.cost) return res.status(400).json({ error: 'Not enough gold' });

  const invCount = query('SELECT COUNT(*) as n FROM player_inventory WHERE username=?', [username])[0]?.n ?? 0;
  if (invCount >= 100) return res.status(400).json({ error: 'Inventory full (100 items max)' });

  const b = entry.bonuses || {};
  const { lastInsertRowid } = db.run(
    `INSERT INTO items (name, slot, rarity, icon, affixes,
       str_bonus, dex_bonus, int_bonus, spirit_bonus,
       hp_bonus, mp_bonus, atk_bonus, def_bonus, level_req, block_rate)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [entry.name, entry.slot, entry.rarity, entry.icon, JSON.stringify(entry.affixes || []),
     b.str_bonus||0, b.dex_bonus||0, b.int_bonus||0, b.spirit_bonus||0,
     b.hp_bonus||0, b.mp_bonus||0, b.atk_bonus||0, b.def_bonus||0,
     entry.level_req || 1, entry.block_rate || 0]
  );
  db.addInventoryItem.run(username, lastInsertRowid);
  run('UPDATE users SET gold = gold - ? WHERE username = ?', [entry.cost, username]);

  const updatedUser = db.getUserByUsername.get(username);
  res.json({ ok: true, gold: updatedUser.gold });
});

// Sell a player's inventory item to the shop
app.post('/api/shop/sell', requireAuth, (req, res) => {
  const username = req.user.username;
  const invId = parseInt(req.body.invId);
  if (!invId) return res.status(400).json({ error: 'invId required' });

  const [row] = query(
    `SELECT pi.id as inv_id, i.rarity, i.level_req FROM player_inventory pi
     JOIN items i ON i.id = pi.item_id
     WHERE pi.id = ? AND pi.username = ?`,
    [invId, username]
  );
  if (!row) return res.status(404).json({ error: 'Item not in your inventory' });

  const price = calcSellValue(row.rarity, row.level_req);
  run('DELETE FROM player_inventory WHERE id = ?', [invId]);
  run('UPDATE users SET gold = gold + ? WHERE username = ?', [price, username]);

  const updatedUser = db.getUserByUsername.get(username);
  res.json({ ok: true, gold: updatedUser.gold, price });
});

// ── REST API: Inn Stash ───────────────────────────────────────────────────────

// Get stash contents
app.get('/api/stash', requireAuth, (req, res) => {
  const username = req.user.username;
  const items = parseAffixes(getStash.all(username));
  const count = query('SELECT COUNT(*) as n FROM player_stash WHERE username=?', [username])[0]?.n ?? 0;
  res.json({ items, count, max: 100 });
});

// Store item from inventory into stash
app.post('/api/stash/store', requireAuth, (req, res) => {
  const username = req.user.username;
  const { invId, stashSlot } = req.body;
  if (stashSlot < 0 || stashSlot > 99) return res.status(400).json({ error: 'Invalid stash slot' });

  // Verify ownership
  const [invRow] = query(
    'SELECT pi.id as inv_id, pi.item_id FROM player_inventory pi WHERE pi.id = ? AND pi.username = ?',
    [invId, username]
  );
  if (!invRow) return res.status(404).json({ error: 'Item not in your inventory' });

  // Check slot is free
  const [existing] = query('SELECT id FROM player_stash WHERE username=? AND stash_slot=?', [username, stashSlot]);
  if (existing) return res.status(400).json({ error: 'Stash slot occupied' });

  // Check stash not full
  const count = query('SELECT COUNT(*) as n FROM player_stash WHERE username=?', [username])[0]?.n ?? 0;
  if (count >= 100) return res.status(400).json({ error: 'Stash is full' });

  db.removeInventoryItem.run(invId, username);
  addStashItem.run(username, invRow.item_id, stashSlot);
  res.json({ ok: true });
});

// Withdraw item from stash into inventory
app.post('/api/stash/withdraw', requireAuth, (req, res) => {
  const username = req.user.username;
  const { stashId } = req.body;

  const [stashRow] = query(
    'SELECT ps.id, ps.item_id FROM player_stash ps WHERE ps.id = ? AND ps.username = ?',
    [stashId, username]
  );
  if (!stashRow) return res.status(404).json({ error: 'Item not in stash' });

  const invCount = query('SELECT COUNT(*) as n FROM player_inventory WHERE username=?', [username])[0]?.n ?? 0;
  if (invCount >= 100) return res.status(400).json({ error: 'Inventory full (100 items max)' });

  removeStashItem.run(stashId, username);
  db.addInventoryItem.run(username, stashRow.item_id);
  res.json({ ok: true });
});

// POST /api/admin/reset-progression  — wipe XP, level, all points for every non-admin user
app.post('/api/admin/reset-progression', requireAuth, requireAdmin, (_req, res) => {
  run(`UPDATE users SET
    xp=0, level=1,
    skill_points=0,
    attr_points=0, attr_str=0, attr_dex=0, attr_int=0, attr_spirit=0,
    forest_progress=0
    WHERE role != 'admin'`);
  run(`DELETE FROM player_skills`);
  res.json({ ok: true, message: 'All progression reset to zero.' });
});

// POST /api/admin/users/:username/reset-progression  — wipe one user's progression
app.post('/api/admin/users/:username/reset-progression', requireAuth, requireAdmin, (req, res) => {
  const { username } = req.params;
  if (username === 'admin') return res.status(400).json({ error: 'Cannot reset admin' });
  run(`UPDATE users SET
    xp=0, level=1,
    skill_points=0,
    attr_points=0, attr_str=0, attr_dex=0, attr_int=0, attr_spirit=0,
    forest_progress=0
    WHERE username=?`, [username]);
  run(`DELETE FROM player_skills WHERE username=?`, [username]);
  res.json({ ok: true });
});

// GET /api/season  — public: current season number + topic
app.get('/api/season', (_req, res) => {
  const cur = query('SELECT number, topic FROM seasons WHERE ended_at IS NULL ORDER BY number DESC LIMIT 1')[0];
  res.json({ number: cur?.number ?? 1, topic: cur?.topic ?? '' });
});

// GET /api/seasons  — public: list all seasons (for Hall of Fame picker)
app.get('/api/seasons', (_req, res) => {
  const seasons = query('SELECT number, topic, started_at, ended_at FROM seasons ORDER BY number DESC');
  res.json(seasons);
});

// GET /api/seasons/:n/rankings  — public: rankings for season N
// Current open season: live from users table. Past seasons: from season_rankings.
app.get('/api/seasons/:n/rankings', (_req, res) => {
  const n = parseInt(_req.params.n, 10);
  if (!n) return res.status(400).json({ error: 'Invalid season' });
  const season = query('SELECT * FROM seasons WHERE number=?', [n])[0];
  if (!season) return res.status(404).json({ error: 'Season not found' });

  let rankings;
  if (!season.ended_at) {
    // Live: pull from users, sorted by level DESC then xp DESC
    rankings = query(
      `SELECT username, class, avatar, level, xp,
              ROW_NUMBER() OVER (ORDER BY xp DESC) AS rank
       FROM users WHERE role != 'admin' ORDER BY xp DESC`
    );
  } else {
    rankings = query(
      'SELECT rank, username, class, avatar, level, xp FROM season_rankings WHERE season_number=? ORDER BY rank',
      [n]
    );
  }
  res.json({ season, rankings });
});

// POST /api/admin/season  { topic }  — update current season topic only
app.post('/api/admin/season', requireAuth, requireAdmin, (req, res) => {
  const topic = (req.body.topic ?? '').trim().slice(0, 80);
  run('UPDATE seasons SET topic=? WHERE ended_at IS NULL', [topic]);
  run('UPDATE settings SET value=? WHERE key=?', [topic, 'season_topic']);
  res.json({ ok: true, topic });
});

// POST /api/admin/new-season  { topic }  — snapshot rankings, close season, open next
app.post('/api/admin/new-season', requireAuth, requireAdmin, (req, res) => {
  const topic = (req.body.topic ?? '').trim().slice(0, 80);
  const now   = new Date().toISOString();

  // 1. Find current open season
  const cur = query('SELECT number FROM seasons WHERE ended_at IS NULL ORDER BY number DESC LIMIT 1')[0];
  const curNum = cur?.number ?? 1;

  // 2. Snapshot current live rankings into season_rankings
  const players = query(
    `SELECT username, class, avatar, level, xp,
            ROW_NUMBER() OVER (ORDER BY level DESC, xp DESC) AS rank
     FROM users WHERE role != 'admin' ORDER BY level DESC, xp DESC`
  );
  for (const p of players) {
    run(
      `INSERT OR REPLACE INTO season_rankings (season_number, rank, username, class, avatar, level, xp)
       VALUES (?,?,?,?,?,?,?)`,
      [curNum, p.rank, p.username, p.class, p.avatar || '', p.level, p.xp]
    );
  }

  // 3. Close current season
  run('UPDATE seasons SET ended_at=? WHERE number=?', [now, curNum]);

  // 4. Open next season
  const nextNum = curNum + 1;
  run('INSERT INTO seasons (number, topic, started_at) VALUES (?,?,?)', [nextNum, topic, now]);
  run('UPDATE settings SET value=? WHERE key=?', [topic, 'season_topic']);

  // 5. Reset all player progression
  run(`UPDATE users SET xp=0, level=1, skill_points=0,
    attr_points=0, attr_str=0, attr_dex=0, attr_int=0, attr_spirit=0, gold=100,
    forest_progress=0
    WHERE role != 'admin'`);
  run('DELETE FROM player_skills');
  run('DELETE FROM player_quests');

  // 6. Wipe all inventories and equipment
  run('DELETE FROM user_equipment');
  run('DELETE FROM player_inventory');
  run(`DELETE FROM items WHERE id NOT IN (
    SELECT item_id FROM user_equipment UNION SELECT item_id FROM player_inventory
  )`);

  res.json({ ok: true, topic, number: nextNum });
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

// ── PvP state ────────────────────────────────────────────────────────────────
const pvpSessions   = new Map(); // sessionId → session
const pvpChallenges = new Map(); // targetUsername → { from, timer }

// ── Party state ───────────────────────────────────────────────────────────────
const parties = new Map(); // partyId → { id, leader, members[], memberData:{u→{accepted}}, zone }

function _pvpEnd(sessionId, winnerUsername) {
  const session = pvpSessions.get(sessionId);
  if (!session) return;
  const payload = {
    winner: winnerUsername,
    p1: { username: session.p1.username, curHp: session.p1.curHp },
    p2: { username: session.p2.username, curHp: session.p2.curHp },
  };
  const s1 = onlineUsers.get(session.p1.username);
  const s2 = onlineUsers.get(session.p2.username);
  if (s1) io.to(s1).emit('pvp:end', payload);
  if (s2) io.to(s2).emit('pvp:end', payload);
  pvpSessions.delete(sessionId);
}

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

  // ── PvP ────────────────────────────────────────────────────────────────────

  socket.on('pvp:challenge', ({ to }) => {
    if (to === username) return;
    const targetSid = onlineUsers.get(to);
    if (!targetSid) return socket.emit('pvp:error', { msg: 'Player is offline.' });
    if (pvpChallenges.has(to)) return socket.emit('pvp:error', { msg: 'That player is already being challenged.' });
    const inSession = [...pvpSessions.values()].some(s => s.p1.username === username || s.p2.username === username);
    if (inSession) return socket.emit('pvp:error', { msg: 'You are already in a PvP battle.' });

    const challenger = db.getUserByUsername.get(username);
    const timer = setTimeout(() => {
      if (pvpChallenges.get(to)?.from === username) {
        pvpChallenges.delete(to);
        socket.emit('pvp:declined', { reason: 'timeout' });
        io.to(targetSid).emit('pvp:challenge_expired');
      }
    }, 12000);

    pvpChallenges.set(to, { from: username, timer });
    io.to(targetSid).emit('pvp:challenge', {
      from: username,
      fromData: { avatar: challenger.avatar, class: challenger.class, level: challenger.level },
    });
    socket.emit('pvp:challenge_sent', { to });
  });

  socket.on('pvp:accept', ({ from }) => {
    const ch = pvpChallenges.get(username);
    if (!ch || ch.from !== from) return socket.emit('pvp:error', { msg: 'No pending challenge.' });
    clearTimeout(ch.timer);
    pvpChallenges.delete(username);

    const challengerSid = onlineUsers.get(from);
    if (!challengerSid) return socket.emit('pvp:error', { msg: 'Challenger went offline.' });

    const sessionId = `pvp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const p1u = db.getUserByUsername.get(from);
    const p2u = db.getUserByUsername.get(username);

    pvpSessions.set(sessionId, {
      id: sessionId,
      p1: { username: from,     curHp: 0, maxHp: 0, curMp: 0, maxMp: 0, dex: 0, def: 0, spirit: 0 },
      p2: { username, curHp: 0, maxHp: 0, curMp: 0, maxMp: 0, dex: 0, def: 0, spirit: 0 },
      turn: null, ready: new Set(),
    });

    io.to(challengerSid).emit('pvp:start', {
      sessionId,
      opponent: { username, avatar: p2u.avatar, class: p2u.class, level: p2u.level },
    });
    socket.emit('pvp:start', {
      sessionId,
      opponent: { username: from, avatar: p1u.avatar, class: p1u.class, level: p1u.level },
    });
  });

  socket.on('pvp:decline', ({ from }) => {
    const ch = pvpChallenges.get(username);
    if (!ch || ch.from !== from) return;
    clearTimeout(ch.timer);
    pvpChallenges.delete(username);
    const sid = onlineUsers.get(from);
    if (sid) io.to(sid).emit('pvp:declined', { reason: 'declined' });
  });

  // Client reports its effective stats so server can track HP/MP authoritatively
  socket.on('pvp:ready', ({ sessionId, stats }) => {
    const session = pvpSessions.get(sessionId);
    if (!session) return;
    const isP1 = session.p1.username === username;
    const isP2 = session.p2.username === username;
    if (!isP1 && !isP2) return;

    const p   = isP1 ? session.p1 : session.p2;
    p.curHp   = stats.hp;
    p.maxHp   = stats.hp;
    p.curMp   = stats.mp;
    p.maxMp   = stats.mp;
    p.dex     = stats.dex   || 0;
    p.def     = stats.def   || 0;
    p.spirit  = stats.spirit || 0;
    session.ready.add(username);

    if (session.ready.size === 2) {
      session.turn = session.p1.dex >= session.p2.dex ? session.p1.username : session.p2.username;
      const mkPayload = (pu) => ({
        sessionId,
        yourTurn: session.turn === pu,
        turnUsername: session.turn,
        p1: { username: session.p1.username, curHp: session.p1.curHp, maxHp: session.p1.maxHp, curMp: session.p1.curMp, maxMp: session.p1.maxMp, dex: session.p1.dex, def: session.p1.def },
        p2: { username: session.p2.username, curHp: session.p2.curHp, maxHp: session.p2.maxHp, curMp: session.p2.curMp, maxMp: session.p2.maxMp, dex: session.p2.dex, def: session.p2.def },
      });
      const s1 = onlineUsers.get(session.p1.username);
      const s2 = onlineUsers.get(session.p2.username);
      if (s1) io.to(s1).emit('pvp:begin', mkPayload(session.p1.username));
      if (s2) io.to(s2).emit('pvp:begin', mkPayload(session.p2.username));
    }
  });

  socket.on('pvp:action', ({ sessionId, skillName, dmg, healAmt, mpCost, targetSelf }) => {
    const session = pvpSessions.get(sessionId);
    if (!session || session.turn !== username) return;

    const isP1   = session.p1.username === username;
    const self   = isP1 ? session.p1 : session.p2;
    const opp    = isP1 ? session.p2 : session.p1;

    const actualDmg  = Math.max(0, Math.min(9999, Math.floor(dmg     || 0)));
    const actualHeal = Math.max(0, Math.min(9999, Math.floor(healAmt  || 0)));
    const actualMp   = Math.max(0, Math.min(999,  Math.floor(mpCost   || 0)));

    self.curMp = Math.max(0, self.curMp - actualMp);

    let log;
    if (targetSelf) {
      self.curHp = Math.min(self.maxHp, self.curHp + actualHeal);
      log = `${username} used ${skillName} → healed ${actualHeal} HP.`;
    } else {
      opp.curHp = Math.max(0, opp.curHp - actualDmg);
      log = `${username} used ${skillName} → ${actualDmg} damage to ${opp.username}.`;
    }

    if (opp.curHp <= 0) {
      _pvpEnd(sessionId, username);
    } else {
      session.turn = opp.username;
      const base = {
        sessionId, turnUsername: session.turn, log,
        p1: { username: session.p1.username, curHp: session.p1.curHp, maxHp: session.p1.maxHp, curMp: session.p1.curMp, maxMp: session.p1.maxMp },
        p2: { username: session.p2.username, curHp: session.p2.curHp, maxHp: session.p2.maxHp, curMp: session.p2.curMp, maxMp: session.p2.maxMp },
      };
      const s1 = onlineUsers.get(session.p1.username);
      const s2 = onlineUsers.get(session.p2.username);
      if (s1) io.to(s1).emit('pvp:update', { ...base, yourTurn: session.turn === session.p1.username });
      if (s2) io.to(s2).emit('pvp:update', { ...base, yourTurn: session.turn === session.p2.username });
    }
  });

  socket.on('pvp:forfeit', ({ sessionId }) => {
    const session = pvpSessions.get(sessionId);
    if (!session) return;
    const opp = session.p1.username === username ? session.p2.username : session.p1.username;
    _pvpEnd(sessionId, opp);
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  // ── Party ──────────────────────────────────────────────────────────────────
  socket.on('party:invite', ({ invitees, zone }) => {
    if (!Array.isArray(invitees) || invitees.length < 1 || invitees.length > 2) return;
    const partyId   = `party_${Date.now()}_${username}`;
    const memberData = { [username]: { accepted: true } };
    invitees.forEach(u => { memberData[u] = { accepted: null }; });
    parties.set(partyId, { id: partyId, leader: username, members: [username, ...invitees], memberData, zone });
    invitees.forEach(invitee => {
      const sid = onlineUsers.get(invitee);
      if (sid) io.to(sid).emit('party:invite_received', { partyId, leader: username, zone });
    });
    socket.emit('party:formed', { partyId, invitees });
  });

  socket.on('party:respond', ({ partyId, accept }) => {
    const party = parties.get(partyId);
    if (!party || !party.memberData[username]) return;
    party.memberData[username].accepted = accept;
    if (!accept) {
      party.members = party.members.filter(m => m !== username);
      delete party.memberData[username];
    }
    const leaderSid = onlineUsers.get(party.leader);
    if (leaderSid) io.to(leaderSid).emit('party:member_responded', { partyId, username, accept });
  });

  socket.on('party:start', ({ partyId, monsters }) => {
    const party = parties.get(partyId);
    if (!party || party.leader !== username) return;
    const accepted = [party.leader, ...party.members.filter(m => m !== party.leader && party.memberData[m]?.accepted)];
    accepted.filter(m => m !== username).forEach(m => {
      const sid = onlineUsers.get(m);
      if (sid) io.to(sid).emit('party:combat_start', { partyId, zone: party.zone, leader: username, members: accepted, monsters });
    });
  });

  socket.on('party:end', ({ partyId, result }) => {
    const party = parties.get(partyId);
    if (!party || party.leader !== username) return;
    party.members.filter(m => m !== username && party.memberData[m]?.accepted).forEach(m => {
      const sid = onlineUsers.get(m);
      if (sid) io.to(sid).emit('party:ended', { result, leader: username });
    });
    parties.delete(partyId);
  });

  socket.on('party:cancel', ({ partyId }) => {
    const party = parties.get(partyId);
    if (!party || party.leader !== username) return;
    party.members.filter(m => m !== username).forEach(m => {
      const sid = onlineUsers.get(m);
      if (sid) io.to(sid).emit('party:cancelled', { leader: username });
    });
    parties.delete(partyId);
  });

  // Leader broadcasts combat state to all party members
  socket.on('party:sync', ({ partyId, ...syncData }) => {
    const party = parties.get(partyId);
    if (!party || party.leader !== username) return;
    party.members.filter(m => m !== username).forEach(m => {
      const sid = onlineUsers.get(m);
      if (sid) io.to(sid).emit('party:sync', syncData);
    });
  });

  // Leader signals a specific member it's their turn (includes state snapshot)
  socket.on('party:turn', ({ partyId, target, ...syncData }) => {
    const party = parties.get(partyId);
    if (!party || party.leader !== username) return;
    const sid = onlineUsers.get(target);
    if (sid) io.to(sid).emit('party:turn', syncData);
  });

  // Member sends their chosen action to the leader
  socket.on('party:action', ({ partyId, ...actionData }) => {
    const party = parties.get(partyId);
    if (!party) return;
    const leaderSid = onlineUsers.get(party.leader);
    if (leaderSid) io.to(leaderSid).emit('party:action', { from: username, ...actionData });
  });

  socket.on('disconnect', () => {
    // Clean up PvP session if player was in one
    for (const [sid, session] of pvpSessions) {
      if (session.p1.username === username || session.p2.username === username) {
        const opp = session.p1.username === username ? session.p2.username : session.p1.username;
        _pvpEnd(sid, opp);
        break;
      }
    }
    // Clean up pending challenges sent by this user
    for (const [target, ch] of pvpChallenges) {
      if (ch.from === username) {
        clearTimeout(ch.timer);
        pvpChallenges.delete(target);
        const tSid = onlineUsers.get(target);
        if (tSid) io.to(tSid).emit('pvp:challenge_expired');
      }
    }
    // Clean up if this user had a pending challenge incoming
    if (pvpChallenges.has(username)) {
      const ch = pvpChallenges.get(username);
      clearTimeout(ch.timer);
      pvpChallenges.delete(username);
      const cSid = onlineUsers.get(ch.from);
      if (cSid) io.to(cSid).emit('pvp:declined', { reason: 'offline' });
    }

    // Clean up parties
    for (const [pid, party] of parties) {
      if (party.leader === username) {
        party.members.filter(m => m !== username).forEach(m => {
          const sid = onlineUsers.get(m);
          if (sid) io.to(sid).emit('party:cancelled', { leader: username });
        });
        parties.delete(pid);
      } else if (party.members.includes(username)) {
        party.members = party.members.filter(m => m !== username);
        delete party.memberData[username];
        const leaderSid = onlineUsers.get(party.leader);
        if (leaderSid) io.to(leaderSid).emit('party:member_responded', { partyId: pid, username, accept: false });
      }
    }

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
