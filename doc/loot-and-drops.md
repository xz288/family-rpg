# Loot & Drop System

## Gold Drops

Each defeated monster independently rolls gold from its tier range. Gold from all monsters in a fight is summed.

| Tier | Gold Range | Average |
|------|-----------|---------|
| D | 5–18 | ~12 |
| C | 18–45 | ~32 |
| B | 45–95 | ~70 |
| A | 95–180 | ~138 |
| S | 180–350 | ~265 |

---

## Item Drop Chance

Each monster rolls independently for an item drop. The total items from a fight are **capped at 3** (or party size + 1, whichever is lower).

| Tier | Item Drop Chance |
|------|----------------|
| D | 35% |
| C | 55% |
| B | 72% |
| A | 88% |
| S | 96% |

---

## Loot Rarity by Monster Tier

When an item drops, its rarity is rolled based on the monster's tier:

| Monster Tier | Normal | Magic | Rare | Legendary | Godly |
|-------------|--------|-------|------|-----------|-------|
| D | 100% | — | — | — | — |
| C | 95% | 5% | — | — | — |
| B | 60% | 35% | 5% | — | — |
| A | — | 60% | 35% | 5% | — |
| S | — | — | 60% | 35% | 5% |

---

## Item Level Requirement

The item's level requirement is derived from the monster's level, with a small random downward adjustment:

```
level_req = max(1, monsterLevel - rand(0, 2))
```

Example: a level 25 monster drops an item with level_req of 23, 24, or 25 (equal chance).

The `level_req` has two effects:
1. Players below the required level cannot equip the item
2. It drives armor DEF scaling (see below)

---

## Item Stat Scaling

### Weapon ATK

Weapons always have a guaranteed ATK affix (`Keen`), calculated from the **monster's level** (not item level_req):

```
ATK = round(monsterLevel × rarityMult × rand(0.95, 1.05))
```

| Rarity | Multiplier |
|--------|-----------|
| Normal | 2.5 |
| Magic | 3.0 |
| Rare | 3.6 |
| Legendary | 4.32 |
| Godly | 5.184 |

### Armor DEF

All non-weapon armor slots always have a guaranteed DEF affix (`Sturdy`), calculated from the **item's level_req**:

```
DEF = round(level_req × rarityMult × rand(0.95, 1.05))
```

| Rarity | Multiplier |
|--------|-----------|
| Normal | 1.0 |
| Magic | 1.2 |
| Rare | 1.44 |
| Legendary | 1.728 |
| Godly | 2.0736 |

---

## Item Sell Value

When selling an item to the blacksmith, the price is:

```
sell_value = round(SELL_BASE[rarity] × (1 + (level_req - 1) × 0.3) × rand(0.85, 1.15))
```

| Rarity | Base Sell Price |
|--------|----------------|
| Normal | 15 |
| Magic (Uncommon) | 28 |
| Magic | 45 |
| Rare | 90 |
| Epic | 140 |
| Legendary | 300 |
| Godly | 600 |

---

## Affix System (Random Rolls)

In addition to the guaranteed Keen/Sturdy affix, items can roll additional random affixes. The number of affixes depends on rarity:

| Rarity | Affix Count |
|--------|------------|
| Normal | 0 |
| Magic | 1–2 |
| Rare | 3–4 |
| Legendary | 5 (always) |
| Godly | 6 (always) |

Affix values scale with a **tier index** based on rarity:

| Rarity | Tier Index |
|--------|-----------|
| Normal | 0 |
| Magic | 1 |
| Rare | 2 |
| Legendary | 4 |
| Godly | 5 |

(Index 3 is skipped — gap between Rare and Legendary creates a meaningful power jump.)

See [gear-and-crafting.md](gear-and-crafting.md) for the full affix pool.

---

## Special Affixes (Rare+ Only)

Rare, Legendary, and Godly items have a chance to roll a special affix:

| Rarity | Chance |
|--------|--------|
| Rare | 10% |
| Legendary | 18% |
| Godly | 28% |

**Weapons** can roll `crit_bonus` (Keen Eye affix):
```
crit_bonus = min(max, floor(base + level × perLevel))
```
| Rarity | Base | Per Level | Max |
|--------|------|-----------|-----|
| Rare | 1 | 0.15 | 4 |
| Legendary | 3 | 0.20 | 7 |
| Godly | 6 | 0.20 | 10 |

**Armor** can roll `dmg_reduction` (%) — reduces all incoming damage by a flat percentage (capped at 50% total across all pieces):
```
dmg_reduction = min(max, floor(base + level × perLevel))
```
| Rarity | Base | Per Level | Max |
|--------|------|-----------|-----|
| Rare | 5 | 0.05 | 6 |
| Legendary | 6 | 0.10 | 8 |
| Godly | 8 | 0.10 | 10 |

---

## Loot Name Pools by Slot & Tier

Items are named by randomly picking from a pool based on slot and monster tier.

### Mainhand
| Tier | Names |
|------|-------|
| D | Rusty Blade, Chipped Sword, Bent Dagger, Cracked Club |
| C | Iron Sword, Steel Dagger, Hunter's Shortbow, Oak Staff |
| B | Shadow Blade, Enchanted Staff, Moonbow, Void Shard |
| A | Sunseeker's Scimitar, Khemeti War-blade, Eye-Blessed Staff, Oasis-Forged Saber |
| S | Eternal Sun Blade, Wrathbound Scepter, Saharrrran Relic Sword |

### Offhand
| Tier | Names |
|------|-------|
| D | Cracked Buckler, Worn Shield, Chipped Focus |
| C | Iron Shield, Leather Buckler, Oak Totem |
| B | Shadow Aegis, Enchanted Orb, Knight's Bulwark |
| A | Pharaoh's Guard, Sun-disk Aegis, Oasis-Forged Bulwark |
| S | Eternal Sun Shield, Wrathbound Orb, Saharrrran Relic Focus |

### Head
| Tier | Names |
|------|-------|
| D | Torn Hood, Dented Cap, Ragged Hat |
| C | Iron Helm, Leather Cap, Chain Coif |
| B | Shadow Cowl, Mage Crown, Knight's Visor |
| A | Sunseeker's Khat, Khemeti Crown, Dunestalker Cowl |
| S | Eternal Sun Crown, Wrathbound Mask, Pharaoh's Nemes |

### Chest
| Tier | Names |
|------|-------|
| D | Tattered Tunic, Cracked Chest Plate, Worn Vest |
| C | Chain Mail, Iron Breastplate, Leather Armor |
| B | Shadow Coat, Mage Robe, Knight's Plate |
| A | Sunseeker's Robes, Khemeti Plate, Oasis-Forged Mail |
| S | Eternal Sun Raiment, Wrathbound Shroud, Pharaoh's Burial Wraps |

### Gloves
| Tier | Names |
|------|-------|
| D | Tattered Gloves, Worn Mitts, Cracked Gauntlets |
| C | Iron Gauntlets, Leather Gloves, Chain Mitts |
| B | Shadow Wraps, Knight's Gauntlets, Mage Gloves |
| A | Sunseeker's Handwraps, Khemeti Gauntlets, Eye-Blessed Mitts |
| S | Eternal Sun Gauntlets, Wrathbound Handwraps, Pharaoh's Gold Gloves |

### Pants
| Tier | Names |
|------|-------|
| D | Torn Pants, Rusted Greaves, Patched Leggings |
| C | Iron Greaves, Leather Pants, Chain Leggings |
| B | Shadow Leggings, Battle Greaves, Mage Trousers |
| A | Sunseeker's Kilt, Khemeti Greaves, Dunestalker Legwraps |
| S | Eternal Sun Legs, Wrathbound Greaves, Pharaoh's Gold Kilt |

### Boots
| Tier | Names |
|------|-------|
| D | Worn Boots, Cracked Sandals, Tattered Shoes |
| C | Iron Boots, Leather Boots, Hunter's Treads |
| B | Shadow Treads, Knight's Sabatons, Mage Slippers |
| A | Sunseeker's Sandals, Khemeti Treads, Oasis-Forged Boots |
| S | Eternal Sun Sabatons, Wrathbound Sandals, Pharaoh's Gold Boots |
