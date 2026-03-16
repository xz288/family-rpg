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
  _db.run = function (...args) {
    const r = origRun(...args);
    this._save();
    return r;
  };

  _db.exec(`
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
`);

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
  db.run(sql, params); // auto-saves via patched run
  const [{ lastid }] = db.exec('SELECT last_insert_rowid() as lastid')[0]
    ? db.exec('SELECT last_insert_rowid() as lastid')[0].values.map(r => ({ lastid: r[0] }))
    : [{ lastid: null }];
  return { lastInsertRowid: lastid };
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

// Expose raw db for ad-hoc queries in server.js
const db = { prepare: (sql) => ({ run: (...args) => run(sql, args) }) };

module.exports = {
  initDb,
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
};
