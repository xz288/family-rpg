You are a senior software engineer performing a structured architecture review and refactor of this family RPG codebase. Work through the three phases below in order: audit, plan, then implement.

---

## Phase 1 — Architecture Audit

Read the following files before forming any opinions:
- `CLAUDE.md` (architecture overview)
- `classes.js` (CLASSES, SLOTS, calcStats)
- `server.js` (routes, loot helpers, seeding)
- `database.js` (schema, helpers)
- `public/monsters.js` (MONSTER_DEFS, ZONE_MONSTER_POOL, CLASS_SKILLS, PLAYER_SVGS, FOREST_ZONES)
- `public/skilltree.js` (SKILL_TREES)
- `public/game.js` (charCache, combatState, openCharPanel, handleCombatWin, startCombat, renderCharEquipment)
- `public/game.html` (registration form class options, building hotspots)

Then evaluate the codebase honestly against each of the three criteria below. For each criterion write a short findings section listing concrete problems found, scored by severity (🔴 high / 🟡 medium / 🟢 low).

### Criterion 1 — Clear Flow State
Does the game create a satisfying progression loop? Are the states (idle → explore → combat → loot → equip → grow) legible in the code and to the player?

Look for:
- Is it obvious what triggers each state transition?
- Are there dead ends or confusing transitions?
- Is player feedback (toasts, logs, panel updates) timely and accurate?
- Is `combatState` cleanly entered and exited?
- Is `charCache` ever stale or inconsistently refreshed?

### Criterion 2 — User Friendliness
Does the UI surface the right information at the right time without requiring the player to know the internals?

Look for:
- Missing contextual information (e.g. can a player see what a skill does before allocating points?)
- Actions that silently fail or give ambiguous feedback
- Inconsistencies between what the loot panel shows and what inventory shows
- Dead inventory items (wrong slot, can't equip)
- Combat log clarity

### Criterion 3 — Scalability (change one thing, touch one file)
How much code must change to add: a new class, a new skill to an existing class, a new quest, a new forest zone?

Look for:
- Data that should be in one authoritative place but is duplicated across files (e.g. class list in `classes.js` AND `server.js` AND `game.html`)
- Hard-coded switch/if-else blocks that grow with every new entity
- Routes that are specific to one quest (not data-driven)
- Any place where adding a new slot would require touching more than 2 files

### Criterion 4 — Asset Replaceability (swap visuals without touching logic)
If someone wanted to replace a class character model, a map background image, or a combat animation — how isolated are those assets from the game logic? Could a non-programmer do it?

Look for:
- **Class models:** Are player SVGs defined inline inside `monsters.js` (mixed with game logic) or in a dedicated, clearly labelled asset map? Is `PLAYER_SVGS` the single lookup used everywhere, or are SVG strings duplicated/inlined elsewhere?
- **Map backgrounds:** Are background images referenced by a hardcoded filename string buried inside CSS or JS, or declared as a named constant/CSS variable that can be swapped in one place?
- **Combat animations:** Are animation class names (e.g. `anim-atk-r`, `anim-death`, `anim-magic`) defined in one CSS block, or scattered across inline styles in JS? Is the mapping from skill type → animation name centralised or repeated in multiple `if/else` branches?
- **Monster sprites:** Are monster SVGs co-located with monster stat data (making visual changes require editing the same object as balance changes), or separated?
- **General:** Is there a clear seam between "what something looks like" and "what something does"? Could an artist edit assets without risking breaking game logic?

---

## Phase 2 — Refactor Plan

After the audit, produce a prioritised refactor plan. For each item:
- State the problem clearly
- Describe the refactor (what moves where, what pattern replaces what)
- Confirm: **no behavior change, no data change, no schema change**
- Estimate lines touched

Present the plan and wait for approval before proceeding to Phase 3. Ask: "Shall I proceed with all of these, or would you like to select specific items?"

---

## Phase 3 — Implementation

Implement the approved refactor items one at a time:
1. Announce which item you are working on
2. Make the changes
3. Verify nothing was accidentally deleted or broken (re-read changed sections)
4. Mark the item done and move to the next

Rules for implementation:
- **No behavior changes.** Combat formulas, XP curves, loot odds, stat calculations must be identical before and after.
- **No DB schema changes.** Do not add, remove, or rename columns or tables.
- **No new dependencies.** Refactor using what is already in the project.
- **Data moves to the authoritative source.** If a constant is duplicated, pick the most logical home and import/require it everywhere else.
- **Prefer data over code.** Replace if/switch blocks with lookup tables or config objects where it makes the addition of a new entity purely additive (add one entry, touch one file).
- If a change touches `game.html` or `game.js`, re-read the relevant section first to avoid breaking CSS or event listeners.

After all approved items are done, summarise what changed and what the before/after addition cost is for each entity type (class, skill, quest, zone, visual asset swap).
