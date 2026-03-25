# Leveling & XP System

## Level Formula

```
Level = min(50, floor(sqrt(XP / 100)) + 1)
```

The level cap is **50**.

### XP Required Per Level

| Level | Total XP Needed | XP to Reach Next Level |
|-------|----------------|------------------------|
| 1 | 0 | 100 |
| 2 | 100 | 300 |
| 3 | 400 | 500 |
| 4 | 900 | 700 |
| 5 | 1,600 | 900 |
| 6 | 2,500 | 1,100 |
| 8 | 4,900 | 1,500 |
| 10 | 8,100 | 1,900 |
| 15 | 19,600 | 2,900 |
| 20 | 36,100 | 3,900 |
| 25 | 57,600 | 4,900 |
| 30 | 84,100 | 5,900 |
| 35 | 115,600 | 6,900 |
| 40 | 152,100 | 7,900 |
| 45 | 193,600 | 8,900 |
| 50 | 240,100 | — (cap) |

**Formula for exact XP to reach level N:**
```
XP required = (N - 1)² × 100
```

---

## Monster XP

Each monster grants XP based on its **tier** and **level**:

```
XP = TIER_BASE_XP[tier] × (1 + (monsterLevel - 1) × 0.2)
```

### Tier Base XP Values

| Tier | Base XP (at level 1) |
|------|---------------------|
| D | 5 |
| C | 10 |
| B | 15 |
| A | 30 |
| S | 100 |

### XP Examples

| Monster | Tier | Level | XP |
|---------|------|-------|-----|
| Green Slime | D | 1 | 5 |
| Blue Slime | D | 2 | 6 |
| Goblin Scout | C | 3 | 14 |
| Forest Archer | C | 4 | 16 |
| Forest Shaman | B | 8 | 36 |
| Demon Lord (boss) | S | 12 | 320 |
| Sand Scorpion | C | 13 | 34 |
| Desert Jackal | C | 15 | 38 |
| Sandstorm Wraith | B | 18 | 66 |
| Bone Crawler | B | 20 | 72 |
| Canyon Serpent | B | 23 | 81 |
| Dune Sorcerer | A | 25 | 174 |
| Mirage Stalker | A | 28 | 192 |
| Sandglass Golem | A | 30 | 204 |
| Pharaoh's Wrath (boss) | S | 35 | 788 |
| Void Wisp | C | 36 | 80 |
| Rift Stalker | C | 38 | 84 |
| Thought Devourer | B | 40 | 132 |
| Voidborn Herald | B | 42 | 138 |
| Star-Eater | A | 44 | 369 |
| Oblivion Wraith | A | 46 | 381 |
| Null Colossus | A | 48 | 393 |
| Abyssal God (boss) | S | 50 | 1,080 |

> In party combat, the same XP amount is granted to **every party member individually** (no split).

---

## Skill Points

- Players earn **1 skill point per level** (starting from level 2).
- Total available skill points at level N = `max(0, N - 1)`
- Skill points can be spent in the **Skill Tree** to unlock active skills and passive bonuses.
- **Resetting the skill tree costs 3,000 gold** and refunds all allocated points.

---

## Attribute Points

- Players earn **5 attribute points per level** (starting from level 2).
- Total available attribute points at level N = `max(0, N - 1) × 5`
- Points can be assigned to STR, DEX, INT, or SPIRIT one at a time.
- **Resetting attributes costs 3,000 gold** and refunds all allocated points.

---

## On Level-Up

When the server detects a level gain:
1. Player's level is updated in the database
2. Skill points are incremented by the number of levels gained
3. Attribute points are incremented by `levelsGained × 5`
4. The UI shows a level-up notification

---

## Death Penalty

When a player dies (HP drops to 0 in combat):
- HP is set to **1** (not 0)
- No XP or gold is lost
- The player must rest (e.g., at the Royal Keep, Holy Well, or Chapel) to restore full HP
