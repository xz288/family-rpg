'use strict';

// ── Class base stats ──────────────────────────────────────────────────────────
// Each class defines its four primary attributes.
// Derived stats (hp, mp, atk, def) are calculated from these via calcStats().

const CLASSES = {
  Warrior: { str: 15, dex: 10, int:  5, spirit:  7 },
  Paladin: { str: 13, dex:  8, int:  6, spirit: 12 },
  Rogue:   { str:  9, dex: 20, int:  7, spirit:  6 },
  Ranger:  { str: 10, dex: 14, int:  7, spirit:  8 },
  Mage:    { str:  5, dex:  7, int: 16, spirit: 12 },
  Healer:  { str:  6, dex:  7, int: 10, spirit: 16 },
  Sage:    { str:  5, dex:  5, int: 14, spirit: 14 },
};

// Valid equipment slots
const SLOTS = ['head', 'chest', 'gloves', 'pants', 'boots', 'mainhand', 'offhand'];

/**
 * Calculate full character stats.
 *
 * @param {string} cls  - character class (must be a key in CLASSES)
 * @param {object} gear - summed gear bonuses across all equipped items
 *                        { str, dex, int, spirit, hp, mp, atk, def }
 * @returns {{ str, dex, int, spirit, hp, mp, atk, def }}
 */
function calcStats(cls, gear = {}, attrs = {}) {
  const base = CLASSES[cls] || CLASSES.Warrior;

  const str    = base.str    + (gear.str    || 0) + (attrs.str    || 0);
  const dex    = base.dex    + (gear.dex    || 0) + (attrs.dex    || 0);
  const int_   = base.int    + (gear.int    || 0) + (attrs.int    || 0);
  const spirit = base.spirit + (gear.spirit || 0) + (attrs.spirit || 0);

  return {
    str,
    dex,
    int: int_,
    spirit,
    hp:  4 * str    + (gear.hp  || 0),       // gear can add flat HP on top
    mp:  4 * spirit + (gear.mp  || 0),       // gear can add flat MP on top
    atk: (cls === 'Rogue' ? Math.floor(0.5 * str + 2 * dex) : Math.floor(2 * str + 0.5 * dex)) + (gear.atk || 0),
    def: Math.floor(2 * dex  + 0.5 * str) + (gear.def || 0),
  };
}

/**
 * Sum gear bonuses from an array of item rows (as returned by getEquipment).
 * Returns an object safe to pass as the second argument to calcStats().
 */
function sumGear(items) {
  const g = { str: 0, dex: 0, int: 0, spirit: 0, hp: 0, mp: 0, atk: 0, def: 0 };
  for (const item of items) {
    g.str    += item.str_bonus    || 0;
    g.dex    += item.dex_bonus    || 0;
    g.int    += item.int_bonus    || 0;
    g.spirit += item.spirit_bonus || 0;
    g.hp     += item.hp_bonus     || 0;
    g.mp     += item.mp_bonus     || 0;
    g.atk    += item.atk_bonus    || 0;
    g.def    += item.def_bonus    || 0;
  }
  return g;
}

// ── Rarity system ─────────────────────────────────────────────────────────────

const RARITIES = ['normal', 'magic', 'rare', 'legendary', 'godly'];

// [min, max] affix count per rarity
const RARITY_AFFIXES = {
  normal:    [0, 0],
  magic:     [1, 2],
  rare:      [3, 4],
  legendary: [5, 5],
  godly:     [6, 6],
};

// Value-tier index (0-5) into each affix's `values` array
const RARITY_TIER = {
  normal:    0,
  magic:     1,
  rare:      2,
  legendary: 4,
  godly:     5,
};

const WEAPON_SLOTS = new Set(['mainhand', 'offhand']);

// Affix pool — prefixes add power-forward stats, suffixes add utility/secondary stats
const AFFIX_POOL = {
  weapon: {
    prefixes: [
      { name: 'Serrated',  stat: 'atk_bonus',    values: [2,  4,  6,  9, 12, 18] },
      { name: 'Heavy',     stat: 'str_bonus',    values: [1,  2,  3,  5,  7, 10] },
      { name: 'Balanced',  stat: 'dex_bonus',    values: [1,  2,  3,  4,  6,  9] },
      { name: 'Arcane',    stat: 'int_bonus',    values: [1,  2,  3,  5,  7, 10] },
      { name: 'Vicious',   stat: 'atk_bonus',    values: [3,  5,  8, 11, 15, 22] },
      { name: 'Cruel',     stat: 'atk_bonus',    values: [4,  6,  9, 13, 18, 26] },
    ],
    suffixes: [
      { name: 'of Slaying',  stat: 'atk_bonus',    values: [1,  3,  5,  7, 10, 15] },
      { name: 'of Might',    stat: 'str_bonus',    values: [1,  2,  4,  6,  8, 12] },
      { name: 'of Agility',  stat: 'dex_bonus',    values: [1,  2,  3,  5,  7, 11] },
      { name: 'of the Mage', stat: 'int_bonus',    values: [1,  2,  4,  6,  9, 13] },
      { name: 'of the Hunt', stat: 'dex_bonus',    values: [2,  3,  5,  7, 10, 15] },
      { name: 'of Ruin',     stat: 'atk_bonus',    values: [2,  4,  7, 10, 14, 20] },
    ],
  },
  armor: {
    prefixes: [
      { name: 'Sturdy',     stat: 'def_bonus',    values: [1,  2,  4,  6,  9, 14] },
      { name: 'Reinforced', stat: 'hp_bonus',     values: [4,  8, 14, 20, 30, 45] },
      { name: 'Blessed',    stat: 'spirit_bonus', values: [1,  2,  3,  5,  7, 10] },
      { name: 'Arcane',     stat: 'mp_bonus',     values: [4,  8, 14, 20, 30, 45] },
      { name: 'Warded',     stat: 'def_bonus',    values: [2,  3,  5,  8, 12, 18] },
      { name: 'Vital',      stat: 'hp_bonus',     values: [6, 12, 18, 26, 38, 55] },
    ],
    suffixes: [
      { name: 'of Life',       stat: 'hp_bonus',     values: [5, 10, 16, 24, 35, 50] },
      { name: 'of Resilience', stat: 'def_bonus',    values: [1,  2,  3,  5,  8, 12] },
      { name: 'of Vigor',      stat: 'str_bonus',    values: [1,  2,  3,  5,  7, 10] },
      { name: 'of the Sage',   stat: 'int_bonus',    values: [1,  2,  3,  5,  7, 10] },
      { name: 'of Devotion',   stat: 'spirit_bonus', values: [1,  2,  3,  5,  7, 10] },
      { name: 'of Warding',    stat: 'def_bonus',    values: [2,  3,  5,  8, 11, 16] },
    ],
  },
};

/**
 * Generate affixes for an item of the given slot + rarity.
 * Returns { affixes: [{name, type, stat, value}], bonuses: {stat: total} }
 */
function generateItemAffixes(slot, rarity) {
  const [minA, maxA] = RARITY_AFFIXES[rarity] || [0, 0];
  const count = minA + Math.floor(Math.random() * (maxA - minA + 1));
  if (count === 0) return { affixes: [], bonuses: {} };

  const tier  = RARITY_TIER[rarity] || 0;
  const pool  = WEAPON_SLOTS.has(slot) ? AFFIX_POOL.weapon : AFFIX_POOL.armor;

  // Shuffle all prefixes+suffixes, pick `count` unique ones
  const all = [
    ...pool.prefixes.map(a => ({ ...a, type: 'prefix' })),
    ...pool.suffixes.map(a => ({ ...a, type: 'suffix' })),
  ].sort(() => Math.random() - 0.5).slice(0, count);

  const bonuses = {};
  const affixes = all.map(a => {
    const value = a.values[Math.min(tier, a.values.length - 1)];
    bonuses[a.stat] = (bonuses[a.stat] || 0) + value;
    return { name: a.name, type: a.type, stat: a.stat, value };
  });

  return { affixes, bonuses };
}

// Canonical class → avatar emoji mapping (single source of truth)
const CLASS_AVATARS = {
  Warrior: '⚔️',
  Paladin: '🛡️',
  Rogue:   '🗡️',
  Ranger:  '🏹',
  Mage:    '🔮',
  Healer:  '💚',
  Sage:    '🧙',
};

module.exports = { CLASSES, SLOTS, CLASS_AVATARS, calcStats, sumGear, RARITIES, RARITY_AFFIXES, AFFIX_POOL, generateItemAffixes };
