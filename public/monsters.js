// ── Player skills by class ────────────────────────────────────────────────────
const CLASS_SKILLS = {
  Warrior: [
    { id:'strike', name:'Strike',       mpCost:0,  dmgMult:1.0, type:'melee', target:'single', desc:'A basic melee strike.' },
    { id:'bash',   name:'Bash',         mpCost:8,  dmgMult:1.7, type:'bash',  target:'single', desc:'Slam the foe with brute force.' },
  ],
  Paladin: [
    { id:'strike',      name:'Strike',      mpCost:0,  dmgMult:1.0, type:'melee', target:'single', desc:'A basic melee strike.' },
    { id:'holy_strike', name:'Holy Strike', mpCost:10, dmgMult:1.6, type:'holy',  target:'all',    desc:'A holy burst that damages all enemies.' },
  ],
  Rogue: [
    { id:'stab',     name:'Quick Stab', mpCost:0,  dmgMult:1.0, type:'melee', target:'single', desc:'A swift stab.' },
    { id:'backstab', name:'Backstab',   mpCost:8,  dmgMult:2.0, type:'stab',  target:'single', desc:'Strike a vital point for massive damage.' },
  ],
  Ranger: [
    { id:'arrow',      name:'Arrow Shot', mpCost:0,  dmgMult:1.0, type:'arrow',  target:'single', desc:'A basic arrow shot.' },
    { id:'aimed_shot', name:'Volley',     mpCost:10, dmgMult:1.4, type:'pierce', target:'all',    desc:'Rain arrows on all enemies.' },
  ],
  Mage: [
    { id:'bolt',     name:'Arcane Bolt', mpCost:0,  dmgMult:1.0, type:'magic', target:'single', desc:'A quick arcane projectile.' },
    { id:'fireball', name:'Fireball',    mpCost:15, dmgMult:2.0, type:'fire',  target:'all',    desc:'A blazing fireball that scorches all enemies.' },
  ],
  Healer: [
    { id:'smite', name:'Smite', mpCost:0,  dmgMult:0.9, type:'holy', target:'single', desc:'A divine smite.' },
    { id:'heal',  name:'Heal',  mpCost:12, dmgMult:0,   type:'heal', heal:true, target:'self', desc:'Restore HP equal to 3× Spirit.' },
  ],
  Sage: [
    { id:'mind_bolt',    name:'Mind Bolt',    mpCost:0,  dmgMult:1.0, type:'magic', target:'single', desc:'A focused psychic strike.' },
    { id:'arcane_burst', name:'Arcane Burst', mpCost:18, dmgMult:2.2, type:'burst', target:'all',    desc:'An explosive arcane detonation hitting all enemies.' },
  ],
};
// PLAYER_SVGS and MONSTER_SVGS have moved to assets.js — edit visuals there.

// ── Monster tier base XP (at level 1) ────────────────────────────────────────
// Formula: xp = TIER_BASE_XP[tier] * (1 + (monsterLevel - 1) * 0.2)
const TIER_BASE_XP = { D: 5, C: 10, B: 15, A: 30, S: 100 };

// ── Monster definitions ───────────────────────────────────────────────────────
// level  — affects HP (+15%/lv), ATK/DEF (+10%/lv), and XP (+20%/lv)
// No static xp field — computed from tier + level at spawn time
const MONSTER_DEFS = {
  green_slime:   { name:'Green Slime',   tier:'D', level:1, hp:60,  atk:22, def:4,  skills:['m_slam'] },
  blue_slime:    { name:'Blue Slime',    tier:'D', level:2, hp:50,  atk:20, def:3,  skills:['m_splash'] },
  goblin:        { name:'Goblin Scout',  tier:'C', level:3, hp:110, atk:30, def:10, skills:['m_strike','m_stab'] },
  forest_archer: { name:'Forest Archer', tier:'C', level:4, hp:90,  atk:33, def:7,  skills:['m_shot','m_pierce'] },
  forest_shaman: { name:'Forest Shaman', tier:'B', level:8, hp:140, atk:42, def:15, skills:['m_hex','m_curse'] },
  demon_lord:    { name:'Demon Lord',    tier:'S', level:12, hp:900, atk:90, def:38, skills:['m_inferno','m_hellfire','m_cleave'], isBoss:true },
  demon_imp:     { name:'Demon Imp',     tier:'B', level:10, hp:140, atk:40, def:12, skills:['m_imp_scratch','m_imp_bite'], isMinion:true },
};

// ── Monster skills ────────────────────────────────────────────────────────────
const MONSTER_SKILLS = {
  m_slam:   { name:'Slam',            dmgMult:1.0, type:'melee'  },
  m_splash: { name:'Acid Splash',     dmgMult:1.1, type:'magic'  },
  m_strike: { name:'Strike',          dmgMult:1.0, type:'melee'  },
  m_stab:   { name:'Backstab',        dmgMult:1.4, type:'stab'   },
  m_shot:   { name:'Arrow Shot',      dmgMult:1.0, type:'arrow'  },
  m_pierce: { name:'Piercing Shot',   dmgMult:1.3, type:'pierce' },
  m_hex:         { name:'Hex Bolt',       dmgMult:1.2, type:'magic'  },
  m_curse:       { name:"Nature's Curse", dmgMult:1.5, type:'curse'  },
  m_inferno:     { name:'Inferno',        dmgMult:1.8, type:'fire'   },
  m_hellfire:    { name:'Hellfire',       dmgMult:1.4, type:'fire'   },
  m_cleave:      { name:'Cleave',         dmgMult:1.5, type:'melee'  },
  m_imp_scratch: { name:'Scratch',        dmgMult:0.9, type:'melee'  },
  m_imp_bite:    { name:'Bite',           dmgMult:1.2, type:'melee'  },
};

// ── Zone → monster pool (up to 3 will spawn) ─────────────────────────────────
const ZONE_MONSTER_POOL = {
  entry: ['green_slime', 'blue_slime'],
  mid:   ['goblin', 'forest_archer'],
  deep:  ['forest_shaman'],
  demon: ['demon_lord'],
};

const TIER_COLORS = {
  D: { bg:'#2a2a2a', text:'#aaaaaa' },
  C: { bg:'#1a3a1a', text:'#6aaa6a' },
  B: { bg:'#1a2a4a', text:'#6a8aff' },
  A: { bg:'#2a1a4a', text:'#c060ff' },
  S: { bg:'#3a1a0a', text:'#ff8c00' },
};

const ANIM_PROJECTILE = {
  arrow:'🏹', pierce:'🏹', magic:'🔮', burst:'🔮', fire:'🔥', holy:'✨', curse:'💜',
};

// ── Loot tables ───────────────────────────────────────────────────────────────
// itemChance = per-monster probability of dropping one item
const TIER_LOOT = {
  D: { goldMin:5,   goldMax:18,  itemChance:0.35, maxItems:1 },
  C: { goldMin:18,  goldMax:45,  itemChance:0.55, maxItems:2 },
  B: { goldMin:45,  goldMax:95,  itemChance:0.72, maxItems:3 },
  A: { goldMin:95,  goldMax:180, itemChance:0.88, maxItems:3 },
  S: { goldMin:180, goldMax:350, itemChance:0.96, maxItems:3 },
};
