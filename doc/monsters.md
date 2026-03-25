# Monster Compendium

## Tier Overview

| Tier | Color | Description |
|------|-------|-------------|
| D | Gray | Weakest enemies — starter zones |
| C | Green | Common enemies — early-mid zones |
| B | Blue | Moderate enemies — mid zones |
| A | Purple | Elite enemies — late zones |
| S | Orange | Boss-tier — zone final bosses |

Monster stats **scale with level** on spawn:
- HP: base × (1 + (level−1) × 0.15) per level above 1
- ATK/DEF: base × (1 + (level−1) × 0.10) per level above 1

---

## Act 1 — Dark Forest

### Entry Forest

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|-----|-----|-----|--------|
| Green Slime | D | 1 | 60 | 22 | 4 | Slam (×1.0 melee) |
| Blue Slime | D | 2 | 50 | 20 | 3 | Acid Splash (×1.1 magic) |

**Zone:** `entry` — spawns Green Slime and Blue Slime.

---

### Mid Forest

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|-----|-----|-----|--------|
| Goblin Scout | C | 3 | 110 | 30 | 10 | Strike (×1.0 melee), Backstab (×1.4 stab) |
| Forest Archer | C | 4 | 90 | 33 | 7 | Arrow Shot (×1.0 arrow), Piercing Shot (×1.3 pierce) |

**Zone:** `mid` — spawns Goblin Scout and Forest Archer.

---

### Deep Forest

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|-----|-----|-----|--------|
| Forest Shaman | B | 8 | 140 | 42 | 15 | Hex Bolt (×1.2 magic), Nature's Curse (×1.5 curse) |

**Zone:** `deep` — spawns Forest Shaman only.

---

### Boss — Demon Lord ☠

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|-------|-----|-----|--------|
| Demon Lord | S | 12 | 900 | 90 | 38 | Inferno (×1.8 fire), Hellfire (×1.4 fire), Cleave (×1.5 melee) |
| Demon Imp *(minion)* | B | 10 | 140 | 40 | 12 | Scratch (×0.9 melee), Bite (×1.2 melee) |

**Zone:** `demon` — party boss fight. HP scales with party size (+50% per extra member above 1).

**Boss intro line:** *"You dare enter my domain, fool? I will rend your soul from your body!"*

---

## Act 2 — Desert Saharrrra

Unlocked after completing all 4 Act 1 zones (`forest_progress >= 4`).

### Dunes (Level 13–18)

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|-----|-----|-----|--------|
| Sand Scorpion | C | 13 | 200 | 48 | 20 | Venomous Sting (×1.0 pierce), Claw Snap (×1.4 melee) |
| Desert Jackal | C | 15 | 170 | 52 | 16 | Jackal Bite (×1.1 melee), Pack Howl (×0.7 magic) |

**Zone:** `dunes`

---

### Bone Wastes (Level 18–23)

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|-----|-----|-----|--------|
| Sandstorm Wraith | B | 18 | 270 | 62 | 24 | Desert Wail (×1.1 magic), Sandblast (×1.4 magic) |
| Bone Crawler | B | 20 | 310 | 60 | 32 | Bone Rattle (×1.0 melee), Crushing Slam (×1.7 melee) |

**Zone:** `bone_wastes`

---

### Whispering Canyons (Level 23–28)

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|-----|-----|-----|--------|
| Canyon Serpent | B | 23 | 340 | 70 | 28 | Serpent Fang (×1.2 pierce), Constrict (×0.9 melee) |
| Dune Sorcerer | A | 25 | 280 | 85 | 34 | Sand Curse (×1.5 curse), Mirage Blast (×1.8 magic) |

**Zone:** `canyons`

---

### Oasis of Mirrors (Level 28–33)

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|-----|-----|-----|--------|
| Mirage Stalker | A | 28 | 380 | 90 | 38 | Phase Strike (×1.8 melee), Sandblast (×1.4 magic) |
| Sandglass Golem | A | 30 | 480 | 88 | 50 | Sandstorm (×1.3 magic), Crushing Slam (×1.7 melee) |

**Zone:** `mirror_oasis`

---

### Boss — The Pharaoh's Wrath ☠

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|------|-----|-----|--------|
| The Pharaoh's Wrath | S | 35 | 3,000 | 155 | 70 | Pharaoh's Curse (×1.8 curse), Solar Beam (×2.5 fire), Ancient Wrath (×3.0 melee) |
| Cursed Servant *(minion)* | A | 33 | 400 | 98 | 42 | Servant Slash (×1.4 melee), Sandblast (×1.4 magic) |

**Zone:** `pharaoh_tomb` — party boss fight.

**Boss intro lines:**
- *"You dare disturb my eternal rest? Ten thousand years I have waited."*
- *"My kingdom crumbled. My people turned to dust. But I endure — bound to this curse."*
- *"The Eye of the Forgotten Sun does not belong to the living. You will join my servants."*

---

## Act 3 — Abyssal Rift

Unlocked after completing all 5 Act 2 zones (`desert_progress >= 5`).

### Void Threshold (Level 36–38)

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|-----|-----|-----|--------|
| Void Wisp | C | 36 | 380 | 95 | 48 | Void Pulse (×1.1 magic), Blink Strike (×1.6 melee) |
| Rift Stalker | C | 38 | 420 | 108 | 52 | Phase Claw (×1.3 melee), Dimensional Rend (×1.8 magic) |

**Zone:** `void_threshold`

---

### Shattered Expanse (Level 38–40)

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|-----|-----|-----|--------|
| Rift Stalker | C | 38 | 420 | 108 | 52 | Phase Claw, Dimensional Rend |
| Thought Devourer | B | 40 | 580 | 118 | 60 | Mind Shatter (×1.4 magic), Psychic Drain (×1.2 curse) |

**Zone:** `shattered_expanse`

---

### Mindflayer Hollows (Level 40–42)

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|-----|-----|-----|--------|
| Thought Devourer | B | 40 | 580 | 118 | 60 | Mind Shatter, Psychic Drain |
| Voidborn Herald | B | 42 | 640 | 128 | 66 | Null Word (×1.5 curse), Herald Slam (×1.9 melee) |

**Zone:** `mindflayer_hollows`

---

### Starless Sea (Level 44–46)

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|-----|-----|-----|--------|
| Star-Eater | A | 44 | 720 | 145 | 72 | Cosmic Bite (×1.6 melee), Gravity Well (×1.3 magic) |
| Oblivion Wraith | A | 46 | 800 | 158 | 78 | Soul Rend (×2.0 curse), Blink Strike (×1.6 melee) |

**Zone:** `starless_sea`

---

### Null Citadel (Level 42–48)

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|-----|-----|-----|--------|
| Voidborn Herald | B | 42 | 640 | 128 | 66 | Null Word, Herald Slam |
| Null Colossus | A | 48 | 980 | 170 | 88 | Null Crash (×2.2 melee), Gravity Well (×1.3 magic), Herald Slam (×1.9 melee) |

**Zone:** `null_citadel`

---

### Fracture Peaks (Level 46–48)

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|-----|-----|-----|--------|
| Null Colossus | A | 48 | 980 | 170 | 88 | Null Crash, Gravity Well, Herald Slam |
| Oblivion Wraith | A | 46 | 800 | 158 | 78 | Soul Rend, Blink Strike |

**Zone:** `fracture_peaks`

---

### Oblivion Gate (Level 46–48)

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|-----|-----|-----|--------|
| Oblivion Wraith | A | 46 | 800 | 158 | 78 | Soul Rend, Blink Strike |
| Null Colossus | A | 48 | 980 | 170 | 88 | Null Crash, Gravity Well, Herald Slam |

**Zone:** `oblivion_gate`

---

### Boss — The Abyssal God ☠

| Monster | Tier | Level | HP | ATK | DEF | Skills |
|---------|------|-------|------|-----|-----|--------|
| The Abyssal God | S | 50 | 6,000 | 220 | 110 | Abyssal Gaze (×2.0 curse), Void Collapse (×2.8 magic), Cosmic Annihilation (×3.5 burst), Reality Unravel (×4.0 melee) |
| Rift Architect *(minion)* | S | 49 | 1,200 | 185 | 95 | Reality Tear (×2.4 magic), Void Nova (×1.6 burst) |

**Zone:** `abyssal_sanctum` — party boss fight. Final encounter of the game.

**Boss intro lines:**
- *"You have wandered far into the dark. Few reach this place. None leave."*
- *"I am the silence between stars. The void before creation. You face the end of everything."*
- *"Your world clings to existence by a thread. I am the hand that cuts it."*

---

## Skill Type Reference

| Type | Description |
|------|-------------|
| melee | Physical melee attack |
| stab | Pierce/backstab attack |
| arrow | Ranged arrow shot |
| pierce | Armor-penetrating shot |
| magic | Magical spell |
| fire | Fire damage spell |
| holy | Divine damage |
| curse | Curse/dark magic |
| burst | AoE explosion |
| buff | Self-enhancement (no damage) |
