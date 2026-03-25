# Attributes & Derived Stats

## Primary Attributes

Every character has four primary attributes. Each class starts with different base values, and players gain **5 attribute points per level** to invest freely.

| Attribute | Key Role |
|-----------|----------|
| **STR** (Strength) | Increases HP and ATK |
| **DEX** (Dexterity) | Increases DEF, Dodge, Crit, and Block |
| **INT** (Intelligence) | No direct derived stat — used by gear affixes for crit/magic bonuses |
| **SPIRIT** | Increases MP; Healer's Heal restores `Spirit × multiplier` HP |

### Class Base Attributes (before gear or attribute point investment)

| Class | STR | DEX | INT | SPIRIT |
|-------|-----|-----|-----|--------|
| Warrior | 15 | 10 | 5 | 7 |
| Paladin | 13 | 8 | 6 | 12 |
| Rogue | 9 | 20 | 7 | 6 |
| Ranger | 10 | 14 | 7 | 8 |
| Mage | 5 | 7 | 16 | 12 |
| Healer | 6 | 7 | 10 | 16 |
| Sage | 5 | 5 | 14 | 14 |

---

## Derived Stats — Formulas

### HP
```
HP = 4 × STR + gear hp_bonus
```
Skill tree passives can add flat HP (`+maxHp`) or percentage HP (`hpPct`).

### MP
```
MP = 4 × SPIRIT + gear mp_bonus
```
Skill tree passives can add flat MP (`+maxMp`).

### ATK
- **Most classes:** `ATK = floor(2 × STR + 0.5 × DEX) + gear atk_bonus`
- **Rogue only:** `ATK = floor(0.5 × STR + 2 × DEX) + gear atk_bonus`

> Rogue uses DEX as the primary attack driver, not STR.

Skill tree passives can add flat ATK (`+atk`) or percentage ATK (`atkPct` — applied after all flat bonuses).

### DEF
```
DEF = floor(2 × DEX + 0.5 × STR) + gear def_bonus
```
Skill tree passives can add flat DEF (`+def`) or percentage DEF (`defStatPct` — applied after all flat bonuses).

---

## Combat-Specific Rates

All rate stats are **capped at 75%**.

### Dodge Rate
```
DEX Bonus Points = floor(min(DEX, 50) / 5)
                 + floor(min(max(DEX-50, 0), 50) / 8)   [if DEX > 50]
                 + floor(max(DEX-100, 0) / 12)           [if DEX > 100]

Dodge Rate = base + (isAgile ? dexPts × 1.5 : dexPts) + dodgePct (from skill tree)

base = 10% for Rogue/Ranger, 5% for all other classes
```

*Rogue and Ranger are "agile" classes — they get 1.5× DEX contribution to dodge/crit and a higher base.*

### Crit Rate
```
Crit Rate = 5% + (isAgile ? dexPts × 1.5 : dexPts) + crit_bonus (from gear) + critPct (from skill tree)
```
Critical hits deal **2× damage** (subject to critDmgBonus from skill tree for Ranger's Hunter's Instinct).

### Block Rate
Block only applies if an **offhand shield** is equipped.
```
Block Rate = shield.block_rate + floor(DEX / 5)
```
Shield `block_rate` is determined at item generation time by rarity:

| Rarity | Block Rate Range |
|--------|-----------------|
| Normal | 5–8% |
| Magic | 8–12% |
| Rare | 12–15% |
| Legendary | 15–18% |
| Godly | 18–20% |

---

## Damage Reduction (Incoming Attack)

When a monster attacks the player, the full damage calculation is:

```
raw = floor(monster.ATK × skill.dmgMult) - floor(player.DEF × 0.5) + rand(-2, +2)
dmg = max(1, floor(max(1, raw) × (1 - defPct) × (1 - dmgReduction) × (1 - guardReduction) × weaknessMultiplier))
```

- **defPct** — from Warrior Iron Skin / Healer Divine Grace / Sage Runic Armor passives
- **dmgReduction** — from special `dmg_reduction` affix on rare+ armor (capped at 50%)
- **guardReduction** — from active Iron Guard (Warrior) or Divine Shield (Paladin) buff
- **weaknessMultiplier** — 0.7 if the boss applies a weakness debuff

---

## Lifesteal (Paladin)

Paladin's Vampire Touch passive grants lifesteal. After any attack that deals damage:
```
HP restored = floor(damage dealt × lifestealPct / 100)
```

---

## Summary: Attribute Investment Guide

| Goal | Invest in |
|------|-----------|
| More HP | STR |
| More MP | SPIRIT |
| More damage (non-Rogue) | STR |
| More damage (Rogue) | DEX |
| More defense | DEX |
| More dodge/crit | DEX |
| Heal for more (Healer) | SPIRIT |
| Magic gear synergy | INT |
