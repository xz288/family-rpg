// ── Player skills by class ────────────────────────────────────────────────────
const CLASS_SKILLS = {
  Warrior: [
    { id:'strike', name:'Strike',       mpCost:0,  dmgMult:1.0, type:'melee', target:'single', desc:'A basic melee strike.' },
    { id:'bash',   name:'Bash',         mpCost:8,  dmgMult:1.7, type:'bash',  target:'single', desc:'Slam the foe with brute force.' },
  ],
  Paladin: [
    { id:'strike',      name:'Strike',      mpCost:0,  dmgMult:1.0, type:'melee', target:'single', desc:'A basic melee strike.' },
    { id:'holy_strike', name:'Holy Strike', mpCost:10, dmgMult:1.2, type:'holy',  target:'all',    desc:'A holy burst that damages all enemies.' },
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
  // ── Desert Saharrrra monsters ────────────────────────────────────────────────
  sand_scorpion:    { name:'Sand Scorpion',     tier:'C', level:13, hp:200, atk:48, def:20, skills:['m_sting','m_claw_snap'] },
  desert_jackal:    { name:'Desert Jackal',     tier:'C', level:15, hp:170, atk:52, def:16, skills:['m_jackal_bite','m_pack_howl'] },
  sandstorm_wraith: { name:'Sandstorm Wraith',  tier:'B', level:18, hp:270, atk:62, def:24, skills:['m_wail','m_sandblast'] },
  bone_crawler:     { name:'Bone Crawler',      tier:'B', level:20, hp:310, atk:60, def:32, skills:['m_rattle','m_crush'] },
  canyon_serpent:   { name:'Canyon Serpent',    tier:'B', level:23, hp:340, atk:70, def:28, skills:['m_fang','m_coil'] },
  dune_sorcerer:    { name:'Dune Sorcerer',     tier:'A', level:25, hp:280, atk:85, def:34, skills:['m_sand_curse','m_mirage_blast'] },
  mirage_stalker:   { name:'Mirage Stalker',    tier:'A', level:28, hp:380, atk:90, def:38, skills:['m_phase_strike','m_sandblast'] },
  sandglass_golem:  { name:'Sandglass Golem',   tier:'A', level:30, hp:480, atk:88, def:50, skills:['m_sandstorm','m_crush'] },
  pharaoh_wrath:    { name:"The Pharaoh's Wrath", tier:'S', level:35, hp:3000, atk:155, def:70, skills:['m_pharaoh_curse','m_solar_beam','m_ancient_wrath'], isBoss:true },
  cursed_servant:   { name:'Cursed Servant',    tier:'A', level:33, hp:400, atk:98, def:42, skills:['m_servant_slash','m_sandblast'], isMinion:true },
  // ── Abyssal Rift (Act 3) ─────────────────────────────────────────────────────
  void_wisp:         { name:'Void Wisp',          tier:'C', level:36, hp:380,  atk:95,  def:48,  skills:['m_void_pulse','m_blink_strike'] },
  rift_stalker:      { name:'Rift Stalker',        tier:'C', level:38, hp:420,  atk:108, def:52,  skills:['m_phase_claw','m_dimensional_rend'] },
  thought_devourer:  { name:'Thought Devourer',    tier:'B', level:40, hp:580,  atk:118, def:60,  skills:['m_mind_shatter','m_psy_drain'] },
  voidborn_herald:   { name:'Voidborn Herald',     tier:'B', level:42, hp:640,  atk:128, def:66,  skills:['m_null_word','m_herald_slam'] },
  star_eater:        { name:'Star-Eater',          tier:'A', level:44, hp:720,  atk:145, def:72,  skills:['m_cosmic_bite','m_gravity_well'] },
  oblivion_wraith:   { name:'Oblivion Wraith',     tier:'A', level:46, hp:800,  atk:158, def:78,  skills:['m_soul_rend','m_blink_strike'] },
  null_colossus:     { name:'Null Colossus',       tier:'A', level:48, hp:980,  atk:170, def:88,  skills:['m_null_crash','m_gravity_well','m_herald_slam'] },
  rift_architect:    { name:'Rift Architect',      tier:'S', level:49, hp:1200, atk:185, def:95,  skills:['m_reality_tear','m_void_nova'], isMinion:true },
  abyssal_god:       { name:'The Abyssal God',     tier:'S', level:50, hp:6000, atk:220, def:110,
                       skills:['m_abyss_gaze','m_void_collapse','m_cosmic_annihilation','m_reality_unravel'], isBoss:true },
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
  // ── Desert Saharrrra skills ──────────────────────────────────────────────────
  m_sting:         { name:'Venomous Sting',  dmgMult:1.0, type:'pierce' },
  m_claw_snap:     { name:'Claw Snap',        dmgMult:1.4, type:'melee'  },
  m_jackal_bite:   { name:'Jackal Bite',      dmgMult:1.1, type:'melee'  },
  m_pack_howl:     { name:'Pack Howl',        dmgMult:0.7, type:'magic'  },
  m_wail:          { name:'Desert Wail',      dmgMult:1.1, type:'magic'  },
  m_sandblast:     { name:'Sandblast',        dmgMult:1.4, type:'magic'  },
  m_rattle:        { name:'Bone Rattle',      dmgMult:1.0, type:'melee'  },
  m_crush:         { name:'Crushing Slam',    dmgMult:1.7, type:'melee'  },
  m_fang:          { name:'Serpent Fang',     dmgMult:1.2, type:'pierce' },
  m_coil:          { name:'Constrict',        dmgMult:0.9, type:'melee'  },
  m_sand_curse:    { name:'Sand Curse',       dmgMult:1.5, type:'curse'  },
  m_mirage_blast:  { name:'Mirage Blast',     dmgMult:1.8, type:'magic'  },
  m_phase_strike:  { name:'Phase Strike',     dmgMult:1.8, type:'melee'  },
  m_sandstorm:     { name:'Sandstorm',        dmgMult:1.3, type:'magic'  },
  m_pharaoh_curse: { name:"Pharaoh's Curse",  dmgMult:1.8, type:'curse'  },
  m_solar_beam:    { name:'Solar Beam',       dmgMult:2.5, type:'fire'   },
  m_ancient_wrath: { name:'Ancient Wrath',    dmgMult:3.0, type:'melee'  },
  m_servant_slash: { name:'Servant Slash',    dmgMult:1.4, type:'melee'  },
  // ── Abyssal Rift skills ───────────────────────────────────────────────────────
  m_void_pulse:          { name:'Void Pulse',           dmgMult:1.1, type:'magic'  },
  m_blink_strike:        { name:'Blink Strike',          dmgMult:1.6, type:'melee'  },
  m_phase_claw:          { name:'Phase Claw',            dmgMult:1.3, type:'melee'  },
  m_dimensional_rend:    { name:'Dimensional Rend',      dmgMult:1.8, type:'magic'  },
  m_mind_shatter:        { name:'Mind Shatter',          dmgMult:1.4, type:'magic'  },
  m_psy_drain:           { name:'Psychic Drain',         dmgMult:1.2, type:'curse'  },
  m_null_word:           { name:'Null Word',             dmgMult:1.5, type:'curse'  },
  m_herald_slam:         { name:'Herald Slam',           dmgMult:1.9, type:'melee'  },
  m_cosmic_bite:         { name:'Cosmic Bite',           dmgMult:1.6, type:'melee'  },
  m_gravity_well:        { name:'Gravity Well',          dmgMult:1.3, type:'magic'  },
  m_soul_rend:           { name:'Soul Rend',             dmgMult:2.0, type:'curse'  },
  m_null_crash:          { name:'Null Crash',            dmgMult:2.2, type:'melee'  },
  m_reality_tear:        { name:'Reality Tear',          dmgMult:2.4, type:'magic'  },
  m_void_nova:           { name:'Void Nova',             dmgMult:1.6, type:'burst'  },
  m_abyss_gaze:          { name:'Abyssal Gaze',          dmgMult:2.0, type:'curse'  },
  m_void_collapse:       { name:'Void Collapse',         dmgMult:2.8, type:'magic'  },
  m_cosmic_annihilation: { name:'Cosmic Annihilation',   dmgMult:3.5, type:'burst'  },
  m_reality_unravel:     { name:'Reality Unravel',       dmgMult:4.0, type:'melee'  },
};

// ── Zone → monster pool (up to 3 will spawn) ─────────────────────────────────
const ZONE_MONSTER_POOL = {
  // Dark Forest (Act 1)
  entry: ['green_slime', 'blue_slime'],
  mid:   ['goblin', 'forest_archer'],
  deep:  ['forest_shaman'],
  demon: ['demon_lord'],
  // Desert Saharrrra (Act 2)
  dunes:        ['sand_scorpion', 'desert_jackal'],
  bone_wastes:  ['sandstorm_wraith', 'bone_crawler'],
  canyons:      ['canyon_serpent', 'dune_sorcerer'],
  mirror_oasis: ['mirage_stalker', 'sandglass_golem'],
  pharaoh_tomb: ['pharaoh_wrath'],
  // Abyssal Rift (Act 3)
  void_threshold:     ['void_wisp', 'rift_stalker'],
  shattered_expanse:  ['rift_stalker', 'thought_devourer'],
  mindflayer_hollows: ['thought_devourer', 'voidborn_herald'],
  starless_sea:       ['star_eater', 'oblivion_wraith'],
  null_citadel:       ['voidborn_herald', 'null_colossus'],
  fracture_peaks:     ['null_colossus', 'oblivion_wraith'],
  oblivion_gate:      ['oblivion_wraith', 'null_colossus'],
  abyssal_sanctum:    ['abyssal_god'],
};

const TIER_COLORS = {
  D: { bg:'#2a2a2a', text:'#aaaaaa' },
  C: { bg:'#1a3a1a', text:'#6aaa6a' },
  B: { bg:'#1a2a4a', text:'#6a8aff' },
  A: { bg:'#2a1a4a', text:'#c060ff' },
  S: { bg:'#3a1a0a', text:'#ff8c00' },
};

const ANIM_PROJECTILE = {
  arrow:'🏹', pierce:'🏹', magic:'🔮', burst:'🔮', fire:'🔥', holy:'✨', curse:'💜', buff:null,
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
