# Zones & World Progression

## World Structure

The game is divided into **3 Acts**, each with its own themed map and enemy roster. Acts unlock sequentially — you must complete Act 1 before entering Act 2, and Act 2 before Act 3.

---

## Town (Home Base)

The town is your hub between adventures. It contains several interactive buildings:

| Building | Function |
|----------|----------|
| Royal Keep | Fully restores HP and MP |
| Blacksmith | Buy/sell gear; access Workshop crafting |
| Chapel | Heal; view quests |
| Eastern Gate | Opens once Act 1 is complete → leads to Desert |
| Abyssal Portal | Opens once Act 2 is complete → leads to Abyssal Rift |
| Tavern | Social hub; shows online players |
| Training Grounds | Allocate attribute points |
| Skill Shrine | Allocate skill tree points |

---

## Act 1 — Dark Forest

**Theme:** Ancient forest overrun by demons. Classic fantasy starter world.
**Unlock condition:** Always available.
**Completion:** Defeat the Demon Lord (Zone 4).

### Zones

| # | Zone ID | Name | Level Range | Notes |
|---|---------|------|-------------|-------|
| 1 | `entry` | Forest Entrance | 1–5 | Starter zone |
| 2 | `mid` | Mid Forest | 3–8 | |
| 3 | `deep` | Deep Forest | 8–12 | |
| 4 | `demon` | ☠ Demon's Lair | 12 | Boss — Demon Lord |

**Progression:** Zones unlock linearly. Complete zone N to unlock zone N+1. Progress is tracked per player as `forest_progress` (0–4).

**Camp buildings:**
- Royal Keep (HP/MP restore) — always available in camp
- Blacksmith — always available in camp

---

## Act 2 — Desert Saharrrra

**Theme:** Vast, scorching desert with ancient Egyptian-style ruins and cursed pharaoh.
**Unlock condition:** `forest_progress >= 4` (all Act 1 zones cleared).
**Transition:** Speak to Caravan Master Rashid at the Eastern Gate in town.
**Completion:** Defeat the Pharaoh's Wrath (Zone 5).

### Story Hook

> *"The Demon Lord fell wheezing: 'The Eye... sleeps in Saharrrra... when it wakes... all light dies...' An ancient cursed artifact — The Eye of the Forgotten Sun — sleeps beneath the desert sands. If it awakens, the world drowns in eternal night."*

### Zones

| # | Zone ID | Name | Level Range | Notes |
|---|---------|------|-------------|-------|
| Camp | `desert_camp` | Oasis Camp | — | Always accessible |
| 1 | `dunes` | The Sunscorched Dunes | 13–18 | |
| 2 | `bone_wastes` | The Bone Wastes | 18–23 | |
| 3 | `canyons` | The Whispering Canyons | 23–28 | |
| 4 | `mirror_oasis` | The Oasis of Mirrors | 28–33 | |
| 5 | `pharaoh_tomb` | ☠ Tomb of the Forgotten Sun | 35 | Boss — Pharaoh's Wrath |

**Progression:** Linear unlock, tracked as `desert_progress` (0–5).

**Oasis Camp buildings:**
- 🏺 Holy Well — restores HP and MP
- 🛍 Sand Bazaar — buy/sell gear (same as Blacksmith)
- 🐪 Return to Town

**Camp flavor text grows with progress:**
- 0 zones cleared: *"A lone tent. A dying campfire. The wind carries only sand."*
- 1 zone cleared: *"A spice merchant has set up stall. The smell of cardamom cuts through the heat."*
- 2 zones cleared: *"Sacred waters have seeped up from the rock. The Holy Well draws weary travelers."*
- 3+ zones cleared: *"Oasis Camp — a crossroads of the eastern trade routes. Voices, lanterns, and commerce."*

---

## Act 3 — Abyssal Rift

**Theme:** Dimension-shattering void realm filled with eldritch horrors and cosmic entities.
**Unlock condition:** `desert_progress >= 5` (all Act 2 zones cleared).
**Transition:** Use the Abyssal Portal in town.
**Completion:** Defeat the Abyssal God (Zone 8 — Abyssal Sanctum).

### Story Hook

> *"Beneath Saharrrra's sands, we found it — The Eye of the Forgotten Sun. But when we shattered the Eye's curse... something tore. A rift. Beyond it: not darkness, but un-darkness. An absence so total that even void has no name for it. We sealed the entrance. It is not sealed enough."*

### Zones

| # | Zone ID | Name | Level Range | Notes |
|---|---------|------|-------------|-------|
| Camp | `rift_camp` | Rift Outpost | — | Always accessible |
| 1 | `void_threshold` | Void Threshold | 36–38 | |
| 2 | `shattered_expanse` | Shattered Expanse | 38–40 | |
| 3 | `mindflayer_hollows` | Mindflayer Hollows | 40–42 | |
| 4 | `starless_sea` | Starless Sea | 44–46 | |
| 5 | `null_citadel` | Null Citadel | 42–48 | |
| 6 | `fracture_peaks` | Fracture Peaks | 46–48 | |
| 7 | `oblivion_gate` | Oblivion Gate | 46–48 | |
| 8 | `abyssal_sanctum` | ☠ Abyssal Sanctum | 50 | Boss — The Abyssal God |

**Progression:** Tracked as `rift_progress` (0–8).

**Rift Outpost buildings:**
- 💧 Rift Spring — restores HP and MP
- 🔧 Void Forge — buy/sell gear
- 🌀 Return to Town

---

## Combat System Overview

### Starting Combat

Click a zone to enter it. For regular zones, combat begins immediately. For boss zones, a **party modal** appears first — you can fight solo or invite up to 4 other players.

### Combat Flow

1. Party leader enters zone
2. Monsters spawn from the zone's pool (1–3 monsters)
3. Turn order: player → all monsters (in sequence) → player → ...
4. On victory: XP and loot are rolled and granted
5. Progress advances (zone unlocked)

### Monster Count Per Zone

Regular zones spawn **1–3 monsters** randomly selected from the zone pool. Boss zones always spawn the named boss plus potentially a minion.

### Party Combat

In party mode:
- One player is the **leader** who controls combat actions
- All members see the combat log in real time via Socket.IO
- XP is awarded to **every party member** in full (no split)
- Loot is generated per-member independently

---

## Zone Progression Unlock Rules

| Act | Progress Field | Max Value | Condition to Advance |
|-----|---------------|-----------|---------------------|
| 1 | `forest_progress` | 4 | Win combat in the current zone |
| 2 | `desert_progress` | 5 | Win combat in the current zone |
| 3 | `rift_progress` | 8 | Win combat in the current zone |

Progress only advances — defeating a zone twice does not roll back progress.
