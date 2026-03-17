const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'rpg.db');

// ── Bootstrap (synchronous wrapper around sql.js) ─────────────────────────────
// sql.js is pure JS so it works on any platform with no build tools.

let _db;

function getDb() {
  if (_db) return _db;
  throw new Error('Database not initialised yet — await initDb() first');
}

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  // Persist to disk on every write
  _db._save = function () {
    fs.writeFileSync(DB_PATH, Buffer.from(this.export()));
  };

  // Patch run/exec to auto-save
  const origRun  = _db.run.bind(_db);
  const origExec = _db.exec.bind(_db);
  _db.run = function (...args) {
    const r = origRun(...args);
    // Capture last_insert_rowid() BEFORE _save()/export() resets it
    const rid = origExec('SELECT last_insert_rowid()');
    this._lastRowId = rid[0]?.values?.[0]?.[0] ?? null;
    this._save();
    return r;
  };

  _db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    UNIQUE NOT NULL,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'player',   -- admin | gamemaster | player
    class       TEXT    NOT NULL DEFAULT 'Warrior',  -- character class
    avatar      TEXT    NOT NULL DEFAULT '⚔️',
    level       INTEGER NOT NULL DEFAULT 1,
    xp          INTEGER NOT NULL DEFAULT 0,
    hp          INTEGER NOT NULL DEFAULT 100,
    max_hp      INTEGER NOT NULL DEFAULT 100,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user   TEXT    NOT NULL,
    to_user     TEXT,                               -- NULL = public
    content     TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL,
    created_by  TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'open',    -- open | active | completed
    scheduled_at TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS event_invites (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id    INTEGER NOT NULL REFERENCES events(id),
    username    TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'pending', -- pending | accepted | declined
    UNIQUE(event_id, username)
  );

  CREATE TABLE IF NOT EXISTS items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    slot         TEXT    NOT NULL,
    str_bonus    INTEGER NOT NULL DEFAULT 0,
    dex_bonus    INTEGER NOT NULL DEFAULT 0,
    int_bonus    INTEGER NOT NULL DEFAULT 0,
    spirit_bonus INTEGER NOT NULL DEFAULT 0,
    hp_bonus     INTEGER NOT NULL DEFAULT 0,
    mp_bonus     INTEGER NOT NULL DEFAULT 0,
    atk_bonus    INTEGER NOT NULL DEFAULT 0,
    def_bonus    INTEGER NOT NULL DEFAULT 0,
    description  TEXT,
    icon         TEXT    NOT NULL DEFAULT '🎒'
  );

  CREATE TABLE IF NOT EXISTS user_equipment (
    username  TEXT    NOT NULL,
    slot      TEXT    NOT NULL,
    item_id   INTEGER NOT NULL REFERENCES items(id),
    PRIMARY KEY (username, slot)
  );

  CREATE TABLE IF NOT EXISTS player_inventory (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL,
    item_id     INTEGER NOT NULL REFERENCES items(id),
    obtained_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS player_quests (
    username    TEXT    NOT NULL,
    quest_key   TEXT    NOT NULL,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    status      TEXT    NOT NULL DEFAULT 'active',
    accepted_at TEXT    NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (username, quest_key)
  );
`);

  // ── V2 Migration: rebuild items (drop old CHECK constraint) + new tables ────
  const pInvExists = _db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='player_inventory'"
  ).length > 0;
  if (!pInvExists) {
    _db.exec(`
      CREATE TABLE items_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slot TEXT NOT NULL,
        str_bonus INTEGER NOT NULL DEFAULT 0, dex_bonus INTEGER NOT NULL DEFAULT 0,
        int_bonus INTEGER NOT NULL DEFAULT 0, spirit_bonus INTEGER NOT NULL DEFAULT 0,
        hp_bonus INTEGER NOT NULL DEFAULT 0, mp_bonus INTEGER NOT NULL DEFAULT 0,
        atk_bonus INTEGER NOT NULL DEFAULT 0, def_bonus INTEGER NOT NULL DEFAULT 0,
        description TEXT, icon TEXT NOT NULL DEFAULT '🎒'
      );
      INSERT OR IGNORE INTO items_new
        SELECT id,name,slot,str_bonus,dex_bonus,int_bonus,spirit_bonus,
               hp_bonus,mp_bonus,atk_bonus,def_bonus,description,icon FROM items;
      DROP TABLE IF EXISTS user_equipment;
      DROP TABLE IF EXISTS items;
      ALTER TABLE items_new RENAME TO items;
      CREATE TABLE user_equipment (
        username TEXT NOT NULL, slot TEXT NOT NULL,
        item_id INTEGER NOT NULL REFERENCES items(id),
        PRIMARY KEY (username, slot)
      );
    `);
    _db._save();
  }

  // ── V3 Migration: add rarity + affixes columns to items ───────────────────
  const itemCols = (_db.exec('PRAGMA table_info(items)')[0]?.values || []).map(r => r[1]);
  if (!itemCols.includes('rarity')) {
    _db.exec("ALTER TABLE items ADD COLUMN rarity TEXT NOT NULL DEFAULT 'normal'");
    _db.exec("ALTER TABLE items ADD COLUMN affixes TEXT NOT NULL DEFAULT '[]'");
    _db._save();
  }

  // ── V4 Migration: skill tree ────────────────────────────────────────────────
  const userCols = (_db.exec('PRAGMA table_info(users)')[0]?.values || []).map(r => r[1]);
  if (!userCols.includes('skill_points')) {
    _db.exec("ALTER TABLE users ADD COLUMN skill_points INTEGER NOT NULL DEFAULT 0");
    _db.exec(`CREATE TABLE IF NOT EXISTS player_skills (
      username TEXT NOT NULL,
      node_id  TEXT NOT NULL,
      points   INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (username, node_id)
    )`);
    // Award retroactive skill points to existing users (1 per level beyond 1)
    _db.exec("UPDATE users SET skill_points = MAX(0, level - 1)");
    _db._save();
  }

  // ── V5 Migration: gold ───────────────────────────────────────────────────────
  const userColsV5 = (_db.exec('PRAGMA table_info(users)')[0]?.values || []).map(r => r[1]);
  if (!userColsV5.includes('gold')) {
    _db.exec("ALTER TABLE users ADD COLUMN gold INTEGER NOT NULL DEFAULT 0");
    _db._save();
  }

  return _db;
}

// ── sql.js helper: run a SELECT and return array of plain objects ─────────────
function query(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  const result = stmt.getAsObject ? null : null; // not used directly
  // Use db.exec for selects to get column names + values
  const res = db.exec(sql, params);
  if (!res.length) return [];
  const { columns, values } = res[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

// run INSERT/UPDATE/DELETE, returns { lastInsertRowid }
function run(sql, params = []) {
  const db = getDb();
  db.run(sql, params); // patched: executes, captures lastRowId, then saves
  return { lastInsertRowid: db._lastRowId ?? null };
}

// ── User helpers ──────────────────────────────────────────────────────────────

const getUserByUsername = {
  get: (username) => query('SELECT * FROM users WHERE username = ?', [username])[0] || null,
};

const getAllUsers = {
  all: () => query('SELECT id, username, role, class, avatar, level, xp, hp, max_hp, created_at FROM users'),
};

const createUser = {
  run: ({ username, password, role, class: cls, avatar }) =>
    run(
      'INSERT INTO users (username, password, role, class, avatar) VALUES (?,?,?,?,?)',
      [username, password, role, cls, avatar]
    ),
};

const updateUserXP = {
  run: (xpGain, level, username) =>
    run('UPDATE users SET xp = xp + ?, level = ? WHERE username = ?', [xpGain, level, username]),
};

// ── Message helpers ───────────────────────────────────────────────────────────

const saveMessage = {
  run: ({ from_user, to_user, content }) =>
    run(
      'INSERT INTO messages (from_user, to_user, content) VALUES (?,?,?)',
      [from_user, to_user ?? null, content]
    ),
};

const getPublicMessages = {
  all: () => query('SELECT * FROM messages WHERE to_user IS NULL ORDER BY created_at DESC LIMIT 100'),
};

const getPrivateMessages = {
  all: (a, b, c, d) => query(
    'SELECT * FROM messages WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=?) ORDER BY created_at DESC LIMIT 100',
    [a, b, c, d]
  ),
};

// ── Event helpers ─────────────────────────────────────────────────────────────

const createEvent = {
  run: ({ title, description, created_by, scheduled_at }) =>
    run(
      'INSERT INTO events (title, description, created_by, scheduled_at) VALUES (?,?,?,?)',
      [title, description, created_by, scheduled_at ?? null]
    ),
};

const getAllEvents = {
  all: () => query('SELECT * FROM events ORDER BY created_at DESC'),
};

const getEventById = {
  get: (id) => query('SELECT * FROM events WHERE id = ?', [id])[0] || null,
};

const updateEventStatus = {
  run: (status, id) => run('UPDATE events SET status = ? WHERE id = ?', [status, id]),
};

const inviteToEvent = {
  run: (event_id, username) =>
    run('INSERT OR IGNORE INTO event_invites (event_id, username) VALUES (?,?)', [event_id, username]),
};

const getEventInvites = {
  all: (username) => query(
    `SELECT ei.*, e.title as event_title
     FROM event_invites ei JOIN events e ON e.id = ei.event_id
     WHERE ei.username = ?`,
    [username]
  ),
};

const respondToInvite = {
  run: (status, event_id, username) =>
    run('UPDATE event_invites SET status = ? WHERE event_id = ? AND username = ?', [status, event_id, username]),
};

const getEventParticipants = {
  all: (event_id) => query('SELECT * FROM event_invites WHERE event_id = ?', [event_id]),
};

// ── Equipment helpers ─────────────────────────────────────────────────────────

// All equipped items for a user (joined with item details)
const getEquipment = {
  all: (username) => query(
    `SELECT ue.slot, i.*
     FROM user_equipment ue
     JOIN items i ON i.id = ue.item_id
     WHERE ue.username = ?`,
    [username]
  ),
};

// Equip an item (replace if slot already occupied)
const equipItem = {
  run: (username, slot, item_id) =>
    run(
      'INSERT OR REPLACE INTO user_equipment (username, slot, item_id) VALUES (?,?,?)',
      [username, slot, item_id]
    ),
};

// Unequip a slot
const unequipItem = {
  run: (username, slot) =>
    run('DELETE FROM user_equipment WHERE username = ? AND slot = ?', [username, slot]),
};

// All items (optionally filtered by slot)
const getItems = {
  all: (slot) => slot
    ? query('SELECT * FROM items WHERE slot = ? ORDER BY name', [slot])
    : query('SELECT * FROM items ORDER BY slot, name'),
};

// ── Inventory helpers ─────────────────────────────────────────────────────────

const getInventory = {
  all: (username) => query(
    `SELECT pi.id as inv_id, i.*
     FROM player_inventory pi
     JOIN items i ON i.id = pi.item_id
     WHERE pi.username = ?
     ORDER BY pi.obtained_at`,
    [username]
  ),
};

const addInventoryItem = {
  run: (username, item_id) =>
    run('INSERT INTO player_inventory (username, item_id) VALUES (?,?)', [username, item_id]),
};

const removeInventoryItem = {
  run: (inv_id, username) =>
    run('DELETE FROM player_inventory WHERE id = ? AND username = ?', [inv_id, username]),
};

// ── Quest helpers ─────────────────────────────────────────────────────────────

const getPlayerQuests = {
  all: (username) => query(
    'SELECT * FROM player_quests WHERE username = ? ORDER BY accepted_at',
    [username]
  ),
  get: (username, quest_key) =>
    query('SELECT * FROM player_quests WHERE username = ? AND quest_key = ?', [username, quest_key])[0] || null,
};

const addQuest = {
  run: (username, quest_key, title, description) =>
    run(
      'INSERT OR IGNORE INTO player_quests (username, quest_key, title, description) VALUES (?,?,?,?)',
      [username, quest_key, title, description]
    ),
};

// ── Skill tree helpers ────────────────────────────────────────────────────────

const getPlayerSkills = {
  all: (username) => query('SELECT * FROM player_skills WHERE username = ?', [username]),
  get: (username, node_id) =>
    query('SELECT * FROM player_skills WHERE username = ? AND node_id = ?', [username, node_id])[0] || null,
};

const assignSkillPoint = {
  run: (username, node_id, points) =>
    run(
      'INSERT OR REPLACE INTO player_skills (username, node_id, points) VALUES (?,?,?)',
      [username, node_id, points]
    ),
};

const adjustSkillPoints = {
  run: (delta, username) =>
    run('UPDATE users SET skill_points = skill_points + ? WHERE username = ?', [delta, username]),
};

const addGold = {
  run: (amount, username) =>
    run('UPDATE users SET gold = gold + ? WHERE username = ?', [amount, username]),
};

// Expose raw db for ad-hoc queries in server.js
const db = { prepare: (sql) => ({ run: (...args) => run(sql, args) }) };

module.exports = {
  initDb,
  query,
  run,
  db,
  getUserByUsername,
  getAllUsers,
  createUser,
  updateUserXP,
  saveMessage,
  getPublicMessages,
  getPrivateMessages,
  createEvent,
  getAllEvents,
  getEventById,
  updateEventStatus,
  inviteToEvent,
  getEventInvites,
  respondToInvite,
  getEventParticipants,
  getEquipment,
  equipItem,
  unequipItem,
  getItems,
  getInventory,
  addInventoryItem,
  removeInventoryItem,
  getPlayerQuests,
  addQuest,
  getPlayerSkills,
  assignSkillPoint,
  adjustSkillPoints,
  addGold,
};
