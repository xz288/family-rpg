# Classes & Skill System

## Classes Overview

The game has 7 playable classes. Each has different base attributes that determine their natural strengths.

| Class | Icon | STR | DEX | INT | SPIRIT | Playstyle |
|-------|------|-----|-----|-----|--------|-----------|
| Warrior | ⚔️ | 15 | 10 | 5 | 7 | Tanky melee, high HP, AoE attacks |
| Paladin | 🛡️ | 13 | 8 | 6 | 12 | Holy damage, lifesteal, defensive buffs |
| Rogue | 🗡️ | 9 | 20 | 7 | 6 | DEX-based burst damage, high crit/dodge |
| Ranger | 🏹 | 10 | 14 | 7 | 8 | Balanced ranged, multi-hit, AoE arrows |
| Mage | 🔮 | 5 | 7 | 16 | 12 | High magic burst, large MP pool |
| Healer | 💚 | 6 | 7 | 10 | 16 | Self-healing, damage reduction, Spirit scaling |
| Sage | 🧙 | 5 | 5 | 14 | 14 | Void/arcane burst, DEF-piercing spells |

> **Rogue** uses `ATK = floor(0.5×STR + 2×DEX)` — DEX is their primary damage stat.
> All other classes use `ATK = floor(2×STR + 0.5×DEX)`.

---

## Base Combat Skills

Every class starts with two skills — one free (0 MP) and one costing MP.

| Class | Free Skill | MP Skill |
|-------|-----------|----------|
| Warrior | Strike (×1.0 melee, single) | Bash (×1.7 bash, single, 8 MP) |
| Paladin | Strike (×1.0 melee, single) | Holy Strike (×1.2 holy, **all**, 10 MP) |
| Rogue | Quick Stab (×1.0 melee, single) | Backstab (×2.0 stab, single, 8 MP) |
| Ranger | Arrow Shot (×1.0 arrow, single) | Volley (×1.4 pierce, **all**, 10 MP) |
| Mage | Arcane Bolt (×1.0 magic, single) | Fireball (×2.0 fire, **all**, 15 MP) |
| Healer | Smite (×0.9 holy, single) | Heal (0 dmg, **restores 3×Spirit HP**, 12 MP) |
| Sage | Mind Bolt (×1.0 magic, single) | Arcane Burst (×2.2 burst, **all**, 18 MP) |

---

## Skill Trees

Each class has a **5-tier skill tree** with 10 nodes (2 per tier). Players spend skill points (1 per level) to unlock nodes.

### How Skill Trees Work

- **Passive nodes** — stat bonuses applied permanently when points are allocated
- **Active nodes** — unlock new combat skills; damage scales with invested points
- **Buff nodes** — special stance/shield skills; behavior changes per point level
- Nodes require prerequisites in the same column to be partially filled first
- Some nodes have **lower max points** than the default 5 (e.g., Iron Guard max 3, Divine Shield max 3, Evasion max 3)

### Active Skill Damage Formula

```
dmgMult = baseDmg + (allocatedPoints - 1) × dmgPerPt
```

### Heal Skill Formula

```
HP restored = Spirit × (baseHealMult + (allocatedPoints - 1) × healPerPt)
```

---

## Warrior Skill Tree

| Tier | Node | Type | Max | Effect |
|------|------|------|-----|--------|
| 1 | Sword Mastery | Passive | 5 | +3 ATK, +1% Crit per point |
| 1 | Iron Skin | Passive | 5 | -5% damage taken per point |
| 2 | Whirlwind | Active | 5 | AoE melee. Base 1.2× → +0.15× per pt (14 MP) |
| 2 | Iron Guard | Buff | 3 | Stance: 50%/60%/60% reduction for 2/2/3 hits; +10% dodge & block per pt (12 MP) |
| 3 | Berserk | Active | 5 | Single melee. Base 2.5× → +0.2× per pt (20 MP) |
| 3 | Bloodvow | Passive | 5 | +10% Max HP per point |
| 4 | Titan Strike | Active | 5 | Single melee, pierces 30% DEF. Base 3.8× → +0.25× per pt (28 MP) |
| 4 | Warlord Aura | Passive | 5 | +15% Max HP, +8 DEF per point |
| 5 | Void Cleave | Active | 5 | AoE, ignores ALL DEF. Base 2.8× → +0.3× per pt (38 MP) |
| 5 | Immortal Vow | Passive | 3 | When HP < 20%: 40%/55%/70% dmg reduction for 3 hits (once per fight) |

---

## Paladin Skill Tree

| Tier | Node | Type | Max | Effect |
|------|------|------|-----|--------|
| 1 | Vampire Touch | Passive | 5 | +5% lifesteal per point |
| 1 | Divine Shield | Buff | 3 | Shield: 50%/75%/100% reduction for 2 hits (costs 20% of max MP) |
| 2 | Consecration | Active | 5 | AoE holy. Base 1.3× → +0.15× per pt (16 MP) |
| 2 | Guardian | Passive | 5 | +5% total DEF per point |
| 3 | Holy Wrath | Active | 5 | Single holy. Base 2.8× → +0.2× per pt (24 MP) |
| 3 | Power Aura | Passive | 5 | +5% total ATK per point |
| 4 | Radiant Judgment | Active | 5 | AoE holy. Base 2.5× → +0.25× per pt (30 MP) |
| 4 | Fortress of Faith | Passive | 5 | +10% DEF, +5% ATK per point |
| 5 | Divine Reckoning | Active | 5 | AoE holy nova. Base 3.5× → +0.3× per pt (42 MP) |
| 5 | Undying Light | Passive | 3 | +10%/15%/20% lifesteal |

---

## Rogue Skill Tree

| Tier | Node | Type | Max | Effect |
|------|------|------|-----|--------|
| 1 | Shadow Step | Passive | 5 | +5% Crit Rate per point |
| 1 | Evasion | Passive | 3 | +10% Dodge Rate per point |
| 2 | Poison Strike | Active | 5 | Single stab. Base 1.6× → +0.2× per pt (12 MP) |
| 2 | Smoke Bomb | Active | 5 | AoE melee. Base 1.2× → +0.2× per pt (10 MP) |
| 3 | Death Mark | Active | 5 | Single stab, always 4× damage. 20% chance 2nd hit, 10% chance 3rd (22 MP) |
| 3 | Shadow Mastery | Passive | 5 | +5% Dodge Rate, -5% Max HP per point (trade-off) |
| 4 | Phantasm Blade | Active | 5 | Single stab, 5× base. 30% chance 2nd hit, 15% 3rd. Base +0.2× per pt (30 MP) |
| 4 | Void Step | Passive | 5 | +15% Dodge, +8% Crit per point |
| 5 | Death Spiral | Active | 5 | AoE stab. Base 2.2× → +0.2× per pt (40 MP) |
| 5 | Soul Harvest | Passive | 3 | Each kill restores 8%/12%/16% max HP |

---

## Ranger Skill Tree

| Tier | Node | Type | Max | Effect |
|------|------|------|-----|--------|
| 1 | Eagle Eye | Passive | 5 | +4 ATK per point |
| 1 | Agility | Passive | 5 | +3 DEF per point |
| 2 | Multi-Shot | Active | 5 | AoE arrow. Base 1.3× → +0.15× per pt (14 MP) |
| 2 | Hunter's Mark | Active | 5 | Single pierce. Base 1.7× → +0.15× per pt (12 MP) |
| 3 | Rain of Arrows | Active | 5 | AoE pierce. Base 2.0× → +0.2× per pt (22 MP) |
| 3 | Quiver Mastery | Passive | 5 | +5 ATK, +10 max MP per point |
| 4 | Stellar Arrow | Active | 5 | AoE pierce. Base 2.8× → +0.25× per pt (28 MP) |
| 4 | Beast Bond | Passive | 5 | +8 ATK, +6 DEF, +3% Crit per point |
| 5 | Void Barrage | Active | 5 | AoE arrow. Base 3.2× → +0.3× per pt (38 MP) |
| 5 | Hunter's Instinct | Passive | 3 | Crit hits deal +25%/+40%/+60% bonus damage |

---

## Mage Skill Tree

| Tier | Node | Type | Max | Effect |
|------|------|------|-----|--------|
| 1 | Arcane Knowledge | Passive | 5 | +4 ATK per point |
| 1 | Mana Surge | Passive | 5 | +10 max MP per point |
| 2 | Ice Bolt | Active | 5 | Single magic. Base 1.6× → +0.2× per pt (14 MP) |
| 2 | Chain Lightning | Active | 5 | AoE magic. Base 1.4× → +0.15× per pt (18 MP) |
| 3 | Meteor | Active | 5 | AoE fire. Base 3.0× → +0.3× per pt (28 MP) |
| 3 | Spell Power | Passive | 5 | +6 ATK, +8 max MP per point |
| 4 | Singularity | Active | 5 | AoE magic. Base 3.2× → +0.3× per pt (32 MP) |
| 4 | Arcane Overflow | Passive | 5 | +12 ATK, +15 max MP per point |
| 5 | Void Implosion | Active | 5 | AoE burst. Base 4.5× → +0.35× per pt (45 MP) |
| 5 | Time Stop | Active | 3 | Freeze all enemies for 1/2/3 turns (40 MP) |

---

## Healer Skill Tree

| Tier | Node | Type | Max | Effect |
|------|------|------|-----|--------|
| 1 | Holy Spirit | Passive | 5 | +4 SPIRIT per point |
| 1 | Mending | Passive | 5 | +12 max HP per point |
| 2 | Revitalize | Active | 5 | Heal self: Spirit × (4 + 1 per pt) HP (18 MP) |
| 2 | Holy Barrier | Active | 5 | Heal self: Spirit × (3 + 1 per pt) HP (14 MP) |
| 3 | Sacred Ground | Active | 5 | Heal self: Spirit × (6 + 1 per pt) HP (24 MP) |
| 3 | Divine Grace | Passive | 5 | -5% damage taken per point |
| 4 | Resurrection Pulse | Active | 5 | Heal self: Spirit × (10 + 2 per pt) HP (32 MP) |
| 4 | Aegis of Light | Passive | 5 | -8% damage taken, +6 SPIRIT per point |
| 5 | Divine Miracle | Active | 5 | Heal self: Spirit × 20 HP (50 MP) |
| 5 | Martyr's Resolve | Passive | 3 | When HP < 30%, instantly heal 20%/30%/40% max HP once per fight |

---

## Sage Skill Tree

| Tier | Node | Type | Max | Effect |
|------|------|------|-----|--------|
| 1 | Wisdom | Passive | 5 | +3 ATK, +6 max MP per point |
| 1 | Runic Armor | Passive | 5 | +4 DEF per point |
| 2 | Void Bolt | Active | 5 | Single magic. Base 1.8× → +0.2× per pt (16 MP) |
| 2 | Time Warp | Active | 5 | AoE burst. Base 1.3× → +0.15× per pt (20 MP) |
| 3 | Apocalypse | Active | 5 | AoE burst. Base 3.2× → +0.3× per pt (30 MP) |
| 3 | Ancient Lore | Passive | 5 | +5 ATK, +3 DEF per point |
| 4 | Entropy Blast | Active | 5 | AoE burst, **ignores ALL DEF**. Base 3.8× → +0.3× per pt (35 MP) |
| 4 | Planar Mastery | Passive | 5 | +8 ATK, +5 DEF, +15 max MP per point |
| 5 | Reality Collapse | Active | 5 | AoE burst. Base 5.0× → +0.4× per pt (55 MP) |
| 5 | Omniscience | Passive | 3 | +15% ATK, +15% Crit, +15% Dodge per point |

---

## Skill Point Economy

| Action | Effect |
|--------|--------|
| Level up | +1 skill point |
| Reset skill tree | Costs 3,000 gold; refunds all points |
| Total points at level N | `max(0, N - 1)` |

---

## Skill Tree Prerequisites

Each node (except Tier 1) requires a specific Tier N-1 node in the same column to have at least some points allocated before it can be unlocked. The exact requirement per node is shown in the game UI.

Example (Warrior):
- Whirlwind (Tier 2) requires Sword Mastery (Tier 1) ≥ 1 point
- Berserk (Tier 3) requires Whirlwind (Tier 2) ≥ 2 points
- Titan Strike (Tier 4) requires Berserk (Tier 3) ≥ 3 points
- Void Cleave (Tier 5) requires Titan Strike (Tier 4) ≥ 2 points
