# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install dependencies
npm start         # run server (node server.js)
npm run dev       # run with auto-restart (nodemon)
```

Server runs on port 3000. No build step — frontend is plain HTML/CSS/JS served as static files.

There are no tests.

## Architecture

Single-server Node.js app. Backend is Express + Socket.IO. Frontend is vanilla JS (no framework, no bundler). Database is sql.js (in-memory SQLite persisted to `rpg.db`).

### File map

| File | Role |
|------|------|
| `server.js` | All REST routes + Socket.IO event handlers. Routes defined inside `startServer()` so they close over `db`. |
| `database.js` | sql.js init, schema, migrations (V1–V5), and named query helpers (`getUserByUsername.get()`, `equipItem.run()`, etc.). |
| `auth.js` | JWT sign/verify, bcrypt, `requireAuth` / `requireGM` / `requireAdmin` middleware. |
| `classes.js` | Class base stats, `calcStats()`, `sumGear()`, affix/rarity generation. Exports `SLOTS` (the canonical equipment slot list). |
| `public/monsters.js` | `MONSTER_DEFS`, `ZONE_MONSTER_POOL`, `CLASS_SKILLS`, `PLAYER_SVGS`, `TIER_LOOT`. Loaded as a `<script>` tag. |
| `public/skilltree.js` | `SKILL_TREES` — 6 classes × 6 nodes. Loaded before `game.js`. |
| `public/game.js` | Entire client app: chat, equipment panel, combat engine, skill tree UI, loot panel, forest map. |
| `public/game.html` | All HTML + inline CSS. Building-popup logic and day/night clock are in an inline `<script>` at the bottom. |

### Data flow: character stats

`GET /api/me/stats` is the single source of truth for the client. It returns `{ class, stats, equipped, slots, inventory, quests, gold, curHp }`. The client caches this in `charCache`. After any write (equip, loot, die/heal), the server-side data is updated and the client re-fetches to rebuild `charCache`.

`calcStats(class, gearBonuses)` → base class stats + gear. Skill tree passive bonuses are applied client-side by `getEffectiveStats(charCache)` at combat start.

### Data flow: combat

Combat is entirely client-side. `combatState` tracks `player` (curHp, curMp, stats), `monsters[]` (curHp), `phase`, and `busy`. On victory, the client POSTs to `/api/me/xp` then `/api/me/loot`, then fetches fresh stats — only after that is `charCache` updated and the loot panel shown.

### Data flow: loot persistence

The loot endpoint inserts into `items` then `player_inventory`. The critical sql.js quirk: **`db.export()` (called on every write via `_save()`) resets `last_insert_rowid()` to 0**. The fix is in `database.js` — `last_insert_rowid()` is captured via `origExec` *before* `_save()` is called, stored as `db._lastRowId`, and returned from `run()`.

### Equipment slots

The canonical slot list lives in `classes.js` → `SLOTS`:
```
head, chest, gloves, pants, boots, mainhand, offhand
```
Everything must agree with this: `SLOT_META` in `game.js`, `ALL_SLOTS` / `LOOT_SLOT_CAT` / `LOOT_SLOT_ICON` in `server.js`, and the DB `user_equipment` table. Any new loot slot must be added to `SLOTS` first.

### Database

sql.js is **in-memory SQLite** — the entire DB lives in RAM and is written to `rpg.db` after every mutating query via `_save()`. Schema migrations run on startup in `initDb()`. Add new migrations as numbered `V(n)` blocks after the existing ones; guard with a column-exists check so they're idempotent.

The `query(sql, params)` helper uses `db.exec(sql, params)` (returns `[{columns, values}]`). The `run(sql, params)` helper uses patched `db.run` and returns `{ lastInsertRowid: db._lastRowId }`.

### Real-time (Socket.IO)

`onlineUsers` is a `Map<username, socketId>`. All sockets authenticate with the JWT in `auth` handshake data. Events: `chat:public`, `chat:private`, `typing:public`, `users:online`, `event:invite`, `event:updated`.

### Roles

`admin` > `gamemaster` > `player`. Role is stored on the `users` row. The `requireGM` middleware allows both `admin` and `gamemaster`.

### Seeded accounts

On first run: admin (`admin` / `admin123`), plus Daddy/Mommy/Blake/Casper/Dandan (password = username). These are skipped if the username already exists.
