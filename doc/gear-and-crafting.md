# Gear & Crafting System

## Equipment Slots

Every character has 7 equipment slots:

| Slot | Icon | Type |
|------|------|------|
| `head` | 🪖 | Armor |
| `chest` | 🦺 | Armor |
| `gloves` | 🧤 | Armor |
| `pants` | 👖 | Armor |
| `boots` | 👢 | Armor |
| `mainhand` | ⚔️ | Weapon |
| `offhand` | 🔮 / 🛡️ | Shield or Focus |

---

## Rarity Tiers

| Rarity | Color | Affix Count | Level Req to Equip |
|--------|-------|-------------|-------------------|
| Normal | Gray | 0 | 1 |
| Magic | Blue | 1–2 | 5 |
| Rare | Yellow | 3–4 | 8 |
| Legendary | Orange | 5 | 12 |
| Godly | Red/Gold | 6 | 15 |

---

## Affix Pool

Affixes are divided into **prefixes** (power-forward stats) and **suffixes** (utility/secondary stats). A fixed number are rolled randomly from the combined pool.

### Weapon Affixes

| Name | Type | Stat | Values (tier 0–5) |
|------|------|------|-------------------|
| Serrated | Prefix | ATK | 2 / 4 / 6 / 9 / 12 / 18 |
| Heavy | Prefix | STR | 1 / 2 / 3 / 5 / 7 / 10 |
| Balanced | Prefix | DEX | 1 / 2 / 3 / 4 / 6 / 9 |
| Arcane | Prefix | INT | 1 / 2 / 3 / 5 / 7 / 10 |
| Vicious | Prefix | ATK | 3 / 5 / 8 / 11 / 15 / 22 |
| Cruel | Prefix | ATK | 4 / 6 / 9 / 13 / 18 / 26 |
| of Slaying | Suffix | ATK | 1 / 3 / 5 / 7 / 10 / 15 |
| of Might | Suffix | STR | 1 / 2 / 4 / 6 / 8 / 12 |
| of Agility | Suffix | DEX | 1 / 2 / 3 / 5 / 7 / 11 |
| of the Mage | Suffix | INT | 1 / 2 / 4 / 6 / 9 / 13 |
| of the Hunt | Suffix | DEX | 2 / 3 / 5 / 7 / 10 / 15 |
| of Ruin | Suffix | ATK | 2 / 4 / 7 / 10 / 14 / 20 |

### Armor Affixes

| Name | Type | Stat | Values (tier 0–5) |
|------|------|------|-------------------|
| Sturdy | Prefix | DEF | 1 / 2 / 4 / 6 / 9 / 14 |
| Reinforced | Prefix | HP | 4 / 8 / 14 / 20 / 30 / 45 |
| Blessed | Prefix | SPIRIT | 1 / 2 / 3 / 5 / 7 / 10 |
| Arcane | Prefix | MP | 4 / 8 / 14 / 20 / 30 / 45 |
| Warded | Prefix | DEF | 2 / 3 / 5 / 8 / 12 / 18 |
| Vital | Prefix | HP | 6 / 12 / 18 / 26 / 38 / 55 |
| of Life | Suffix | HP | 5 / 10 / 16 / 24 / 35 / 50 |
| of Resilience | Suffix | DEF | 1 / 2 / 3 / 5 / 8 / 12 |
| of Vigor | Suffix | STR | 1 / 2 / 3 / 5 / 7 / 10 |
| of the Sage | Suffix | INT | 1 / 2 / 3 / 5 / 7 / 10 |
| of Devotion | Suffix | SPIRIT | 1 / 2 / 3 / 5 / 7 / 10 |
| of Warding | Suffix | DEF | 2 / 3 / 5 / 8 / 11 / 16 |

> **Note:** Tier index used for affix value lookup by rarity: Normal=0, Magic=1, Rare=2, Legendary=4, Godly=5. Index 3 is intentionally skipped (gap between Rare and Legendary).

---

## Guaranteed Stats

Every weapon gets a guaranteed `Keen` (ATK) affix. Every armor piece gets a guaranteed `Sturdy` (DEF) affix. These replace any randomly rolled ATK/DEF affixes to ensure consistent scaling.

See [loot-and-drops.md](loot-and-drops.md) for the full scaling formulas.

---

## Blacksmith Shop

The blacksmith generates a **personalized shop** per player, refreshed every **2 hours** or when the player levels up.

### Shop Stock

The shop always generates exactly **9 items** (one per slot × 1.28... — actually all 7 slots with some slots having 1–2 items).

### Shop Rarity Weights by Player Level

| Player Level | Normal | Magic | Rare | Legendary | Godly |
|-------------|--------|-------|------|-----------|-------|
| 1–4 | 75 | 22 | 3 | — | — |
| 5–9 | 45 | 45 | 9 | 1 | — |
| 10–15 | 15 | 55 | 26 | 4 | — |
| 16–22 | 5 | 40 | 45 | 9 | 1 |
| 23+ | — | 20 | 50 | 26 | 4 |

### Shop Item Level Scaling

Shop items are scaled to the **player's current level**:

```
level_req = max(RARITY_MIN[rarity], playerLevel - rand(2, 6))
```

This ensures items are within 2–6 levels of the player, making the shop useful without always giving maximum-power gear.

### Shop Buy Prices

| Rarity | Cost Range |
|--------|-----------|
| Normal | 450–840 |
| Magic | 1,650–2,850 |
| Rare | 5,400–9,600 |
| Legendary | 18,000–30,000 |
| Godly | 60,000–105,000 |

---

## Crafting System

Crafting allows players to combine two gear pieces of specific slots and rarity into a powerful crafted item. Crafted items use the same stat-scaling formulas as dropped items.

### How to Craft

1. Open the **Workshop** building in town
2. Browse available recipes
3. Click "Craft" on a recipe you meet the requirements for
4. The two material items are consumed from your inventory
5. A new crafted item appears in your inventory

### Requirements to Craft

- Player level must meet the recipe's `level_req`
- Must have enough gold
- Must have the two required material items in inventory (matched by slot and rarity)

### Crafted Item Stats

Crafted items use the same `guaranteeWeaponAtk` / `guaranteeArmorDef` + random affixes system as shop items, with the recipe's `level_req` as the scaling base.

### Notable Recipes

Below are the Act 3 void-tier recipes (examples — see the full recipe list in the Workshop UI):

| Recipe | Level Req | Gold Cost | Materials Needed | Output Rarity |
|--------|-----------|-----------|-----------------|---------------|
| Void Plate | — | — | Rare chest + Rare gloves | Legendary |
| Null Gauntlets | — | — | Rare gloves + Rare boots | Legendary |

*(Full recipe list is visible in-game in the Workshop building.)*

---

## Equipment Equip Requirements

A player cannot equip an item if their **current level is below the item's `level_req`**.

The item's level requirement is shown on the item detail panel in the inventory. Items above your level appear grayed out and cannot be equipped.

---

## Stash System

In addition to the main inventory, players have a **shared stash** accessible from the bank/vault building. Items can be moved between inventory and stash. All stash items are stored per-player.
