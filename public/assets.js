// ── Visual Assets ─────────────────────────────────────────────────────────────
// This file contains ONLY visual assets (SVG strings).
// To replace a character model or monster sprite, edit the relevant entry here.
// No game logic lives in this file.

// ── Player SVG figures ────────────────────────────────────────────────────────
// viewBox "0 0 60 100" — drawn feet-to-head so z-order is natural
const PLAYER_SVGS = {

  Warrior: `<svg viewBox="0 0 60 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="17" y="90" width="11" height="8" rx="3" fill="#263238"/>
    <rect x="32" y="90" width="11" height="8" rx="3" fill="#263238"/>
    <rect x="18" y="63" width="11" height="29" rx="2" fill="#546E7A"/>
    <rect x="31" y="63" width="11" height="29" rx="2" fill="#546E7A"/>
    <path d="M13,27 L47,27 L44,65 L16,65 Z" fill="#78909C"/>
    <path d="M22,29 L38,29 L36,58 L24,58 Z" fill="#90A4AE"/>
    <ellipse cx="12" cy="29" rx="7" ry="4" transform="rotate(-12,12,29)" fill="#607D8B"/>
    <ellipse cx="48" cy="29" rx="7" ry="4" transform="rotate(12,48,29)" fill="#607D8B"/>
    <path d="M3,31 L3,60 L8,67 L13,60 L13,31 Z" fill="#8D6E63" stroke="#5D4037" stroke-width="1.2"/>
    <line x1="8" y1="33" x2="8" y2="63" stroke="#5D4037" stroke-width="0.8"/>
    <line x1="3" y1="47" x2="13" y2="47" stroke="#5D4037" stroke-width="0.8"/>
    <path d="M13,29 L9,57 L15,60 L18,31" fill="#FFCCAA"/>
    <line x1="56" y1="16" x2="58" y2="80" stroke="#CFD8DC" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="51" y="43" width="13" height="3" rx="1.5" fill="#90A4AE"/>
    <path d="M47,29 L54,54 L48,58 L42,31" fill="#FFCCAA"/>
    <rect x="25" y="21" width="10" height="8" fill="#FFCCAA"/>
    <circle cx="30" cy="13" r="11" fill="#FFCCAA"/>
    <path d="M19,10 Q30,0 41,10 L40,22 L20,22 Z" fill="#546E7A" stroke="#455A64" stroke-width="1"/>
    <rect x="25" y="17" width="10" height="6" fill="#546E7A"/>
    <rect x="21" y="13" width="18" height="3" rx="1.5" fill="#37474F"/>
    <circle cx="26" cy="14" r="1.2" fill="#80CBC4"/>
    <circle cx="34" cy="14" r="1.2" fill="#80CBC4"/>
  </svg>`,

  Paladin: `<svg viewBox="0 0 60 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="17" y="90" width="11" height="8" rx="3" fill="#4E342E"/>
    <rect x="32" y="90" width="11" height="8" rx="3" fill="#4E342E"/>
    <rect x="18" y="63" width="11" height="29" rx="2" fill="#F9A825"/>
    <rect x="31" y="63" width="11" height="29" rx="2" fill="#F9A825"/>
    <path d="M13,27 L47,27 L44,65 L16,65 Z" fill="#FBC02D"/>
    <path d="M23,29 L37,29 L35,58 L25,58 Z" fill="#FFE082"/>
    <ellipse cx="12" cy="29" rx="7" ry="4" transform="rotate(-12,12,29)" fill="#F9A825"/>
    <ellipse cx="48" cy="29" rx="7" ry="4" transform="rotate(12,48,29)" fill="#F9A825"/>
    <path d="M3,31 L3,60 L8,67 L13,60 L13,31 Z" fill="#ECEFF1" stroke="#90A4AE" stroke-width="1"/>
    <line x1="8" y1="33" x2="8" y2="63" stroke="#90A4AE" stroke-width="1"/>
    <line x1="3" y1="47" x2="13" y2="47" stroke="#90A4AE" stroke-width="1"/>
    <circle cx="8" cy="47" r="2" fill="#EF9A9A"/>
    <path d="M13,29 L9,57 L15,60 L18,31" fill="#FFCCAA"/>
    <line x1="55" y1="16" x2="55" y2="78" stroke="#FBC02D" stroke-width="3" stroke-linecap="round"/>
    <circle cx="55" cy="20" r="5" fill="#FFEE58" stroke="#F9A825" stroke-width="1"/>
    <path d="M47,29 L54,54 L48,58 L42,31" fill="#FFCCAA"/>
    <rect x="25" y="21" width="10" height="8" fill="#FFCCAA"/>
    <circle cx="30" cy="13" r="11" fill="#FFCCAA"/>
    <path d="M19,7 L23,3 L30,1 L37,3 L41,7 L40,21 L20,21 Z" fill="#FBC02D" stroke="#F9A825" stroke-width="1"/>
    <circle cx="25" cy="13" r="2" fill="#4E342E"/>
    <circle cx="35" cy="13" r="2" fill="#4E342E"/>
    <path d="M25,17 Q30,20 35,17" stroke="#4E342E" stroke-width="1" fill="none"/>
  </svg>`,

  Rogue: `<svg viewBox="0 0 60 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="17" y="90" width="11" height="8" rx="3" fill="#1B0000"/>
    <rect x="32" y="90" width="11" height="8" rx="3" fill="#1B0000"/>
    <rect x="19" y="63" width="10" height="29" rx="2" fill="#3E2723"/>
    <rect x="31" y="63" width="10" height="29" rx="2" fill="#3E2723"/>
    <path d="M15,27 L45,27 L42,65 L18,65 Z" fill="#4E342E"/>
    <path d="M23,29 L37,29 L35,60 L25,60 Z" fill="#3E2723"/>
    <path d="M6,30 L3,58 L9,62 L14,32" fill="#FFCCAA"/>
    <path d="M54,30 L57,58 L51,62 L46,32" fill="#FFCCAA"/>
    <line x1="2" y1="48" x2="6" y2="78" stroke="#CFD8DC" stroke-width="2" stroke-linecap="round"/>
    <rect x="0" y="52" width="8" height="2" rx="1" fill="#90A4AE"/>
    <line x1="58" y1="48" x2="54" y2="78" stroke="#CFD8DC" stroke-width="2" stroke-linecap="round"/>
    <rect x="52" y="52" width="8" height="2" rx="1" fill="#90A4AE"/>
    <rect x="25" y="20" width="10" height="9" fill="#FFCCAA"/>
    <circle cx="30" cy="12" r="11" fill="#FFCCAA"/>
    <path d="M16,6 Q30,-2 44,6 L42,20 L18,20 Z" fill="#212121"/>
    <path d="M18,12 Q30,6 42,12 L41,20 L19,20 Z" fill="#3E2723"/>
    <circle cx="25" cy="14" r="2" fill="#212121"/>
    <circle cx="35" cy="14" r="2" fill="#212121"/>
    <path d="M26,18 Q30,21 34,18" stroke="#555" stroke-width="1" fill="none"/>
  </svg>`,

  Ranger: `<svg viewBox="0 0 60 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="17" y="90" width="11" height="8" rx="3" fill="#33691E"/>
    <rect x="32" y="90" width="11" height="8" rx="3" fill="#33691E"/>
    <rect x="18" y="63" width="11" height="29" rx="2" fill="#558B2F"/>
    <rect x="31" y="63" width="11" height="29" rx="2" fill="#558B2F"/>
    <path d="M14,27 L46,27 L43,65 L17,65 Z" fill="#558B2F"/>
    <path d="M21,28 L39,28 L37,58 L23,58 Z" fill="#689F38"/>
    <path d="M7,26 Q3,48 7,66 L13,63 L9,48 L13,33 Z" fill="#8D6E63" stroke="#5D4037" stroke-width="1"/>
    <line x1="7" y1="26" x2="7" y2="66" stroke="#5D4037" stroke-width="0.8"/>
    <line x1="7" y1="26" x2="13" y2="33" stroke="#795548" stroke-width="1.2"/>
    <line x1="7" y1="66" x2="13" y2="63" stroke="#795548" stroke-width="1.2"/>
    <path d="M14,29 L9,56 L15,60 L18,32" fill="#FFCCAA"/>
    <path d="M46,29 L52,55 L47,59 L42,32" fill="#FFCCAA"/>
    <rect x="25" y="20" width="10" height="9" fill="#FFCCAA"/>
    <circle cx="30" cy="12" r="11" fill="#FFCCAA"/>
    <path d="M16,4 Q30,-2 44,4 L42,17 L18,17 Z" fill="#33691E"/>
    <path d="M20,10 Q30,5 40,10" stroke="#1B5E20" stroke-width="1.5" fill="none"/>
    <circle cx="25" cy="13" r="2" fill="#333"/>
    <circle cx="35" cy="13" r="2" fill="#333"/>
    <path d="M26,17 Q30,20 34,17" stroke="#555" stroke-width="1" fill="none"/>
  </svg>`,

  Mage: `<svg viewBox="0 0 60 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="17" y="88" width="12" height="10" rx="3" fill="#0D47A1"/>
    <rect x="31" y="88" width="12" height="10" rx="3" fill="#0D47A1"/>
    <path d="M15,30 L45,30 L47,98 L13,98 Z" fill="#1565C0"/>
    <path d="M22,31 L38,31 L40,70 L20,70 Z" fill="#1976D2"/>
    <path d="M8,30 L4,70 L10,72 L15,32" fill="#FFCCAA"/>
    <path d="M52,30 L56,70 L50,72 L45,32" fill="#FFCCAA"/>
    <line x1="4" y1="18" x2="4" y2="82" stroke="#8D6E63" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="4" cy="15" r="6" fill="#7C4DFF" opacity="0.9"/>
    <circle cx="4" cy="15" r="3" fill="#E040FB"/>
    <rect x="25" y="20" width="10" height="11" fill="#FFCCAA"/>
    <circle cx="30" cy="13" r="11" fill="#FFCCAA"/>
    <path d="M19,4 L30,-3 L41,4 L38,14 L22,14 Z" fill="#0D47A1" stroke="#1565C0" stroke-width="1"/>
    <path d="M24,9 L30,0 L36,9 Z" fill="#1565C0"/>
    <circle cx="25" cy="14" r="2" fill="#1A237E"/>
    <circle cx="35" cy="14" r="2" fill="#1A237E"/>
    <path d="M26,18 Q30,21 34,18" stroke="#555" stroke-width="1" fill="none"/>
  </svg>`,

  Healer: `<svg viewBox="0 0 60 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="17" y="88" width="12" height="10" rx="3" fill="#B0BEC5"/>
    <rect x="31" y="88" width="12" height="10" rx="3" fill="#B0BEC5"/>
    <path d="M15,30 L45,30 L47,98 L13,98 Z" fill="#E8EAF6"/>
    <path d="M22,31 L38,31 L40,72 L20,72 Z" fill="#C5CAE9"/>
    <path d="M8,30 L4,70 L10,72 L15,32" fill="#FFCCAA"/>
    <path d="M52,30 L56,70 L50,72 L45,32" fill="#FFCCAA"/>
    <line x1="56" y1="20" x2="56" y2="78" stroke="#8D6E63" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="56" cy="17" r="5" fill="#E8EAF6" stroke="#9FA8DA" stroke-width="1.5"/>
    <line x1="56" y1="13" x2="56" y2="21" stroke="#EF9A9A" stroke-width="2"/>
    <line x1="52" y1="17" x2="60" y2="17" stroke="#EF9A9A" stroke-width="2"/>
    <rect x="25" y="20" width="10" height="11" fill="#FFCCAA"/>
    <circle cx="30" cy="13" r="11" fill="#FFCCAA"/>
    <path d="M19,9 Q30,4 41,9 L41,14 L19,14 Z" fill="#9FA8DA" stroke="#7986CB" stroke-width="1"/>
    <circle cx="30" cy="9" r="2.5" fill="#F48FB1"/>
    <circle cx="25" cy="14" r="2" fill="#333"/>
    <circle cx="35" cy="14" r="2" fill="#333"/>
    <path d="M25,18 Q30,22 35,18" stroke="#555" stroke-width="1" fill="none"/>
  </svg>`,

  Sage: `<svg viewBox="0 0 60 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="17" y="88" width="12" height="10" rx="3" fill="#311B92"/>
    <rect x="31" y="88" width="12" height="10" rx="3" fill="#311B92"/>
    <path d="M15,30 L45,30 L47,98 L13,98 Z" fill="#6A1B9A"/>
    <path d="M22,31 L38,31 L40,72 L20,72 Z" fill="#7B1FA2"/>
    <path d="M8,30 L4,70 L10,72 L15,32" fill="#FFCCAA"/>
    <path d="M52,30 L56,72 L50,74 L45,32" fill="#FFCCAA"/>
    <circle cx="56" cy="22" r="8" fill="#CE93D8" opacity="0.8"/>
    <circle cx="56" cy="22" r="5" fill="#AB47BC"/>
    <circle cx="56" cy="22" r="2.5" fill="#E040FB"/>
    <rect x="25" y="20" width="10" height="11" fill="#FFCCAA"/>
    <circle cx="30" cy="13" r="11" fill="#FFCCAA"/>
    <path d="M20,5 L30,-5 L40,5 L38,16 L22,16 Z" fill="#4A148C" stroke="#6A1B9A" stroke-width="1"/>
    <path d="M25,8 L30,-1 L35,8 Z" fill="#6A1B9A"/>
    <circle cx="25" cy="14" r="2" fill="#1A237E"/>
    <circle cx="35" cy="14" r="2" fill="#1A237E"/>
    <path d="M26,18 Q30,21 34,18" stroke="#555" stroke-width="1" fill="none"/>
  </svg>`,
};

// ── Monster SVG figures ───────────────────────────────────────────────────────
const MONSTER_SVGS = {

  green_slime: `<svg viewBox="0 0 80 70" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="40" cy="48" rx="30" ry="18" fill="#2E7D32" opacity="0.5"/>
    <path d="M14,42 Q10,18 22,10 Q30,4 40,8 Q50,4 58,10 Q70,18 66,42 Q62,58 40,62 Q18,58 14,42 Z" fill="#66BB6A"/>
    <path d="M20,38 Q18,18 30,12 Q40,8 50,12 Q62,18 60,38 Q58,52 40,56 Q22,52 20,38 Z" fill="#81C784"/>
    <path d="M12,42 Q10,30 18,22" stroke="#4CAF50" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M68,42 Q70,30 62,22" stroke="#4CAF50" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="28" cy="36" rx="7" ry="9" fill="#1B5E20"/>
    <ellipse cx="52" cy="36" rx="7" ry="9" fill="#1B5E20"/>
    <ellipse cx="28" cy="34" rx="3" ry="4" fill="#fff"/>
    <ellipse cx="52" cy="34" rx="3" ry="4" fill="#fff"/>
    <circle cx="29" cy="35" r="2" fill="#000"/>
    <circle cx="53" cy="35" r="2" fill="#000"/>
    <path d="M32,46 Q40,50 48,46" stroke="#2E7D32" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="40" cy="8" rx="4" ry="5" fill="#A5D6A7" opacity="0.7"/>
  </svg>`,

  blue_slime: `<svg viewBox="0 0 80 70" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="40" cy="49" rx="30" ry="17" fill="#0D47A1" opacity="0.4"/>
    <path d="M14,42 Q12,18 24,10 Q32,5 40,9 Q48,5 56,10 Q68,18 66,42 Q62,58 40,62 Q18,58 14,42 Z" fill="#42A5F5"/>
    <path d="M20,38 Q20,18 32,12 Q40,8 48,12 Q60,18 60,38 Q58,52 40,56 Q22,52 20,38 Z" fill="#64B5F6"/>
    <ellipse cx="29" cy="34" rx="7" ry="9" fill="#0D47A1"/>
    <ellipse cx="51" cy="34" rx="7" ry="9" fill="#0D47A1"/>
    <ellipse cx="29" cy="32" rx="3.5" ry="4.5" fill="#fff"/>
    <ellipse cx="51" cy="32" rx="3.5" ry="4.5" fill="#fff"/>
    <circle cx="30" cy="34" r="2" fill="#000"/>
    <circle cx="52" cy="34" r="2" fill="#000"/>
    <path d="M34,44 Q40,42 46,44" stroke="#0D47A1" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M38,4 L40,10 L42,4" stroke="#29B6F6" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M14,36 Q10,28 16,22" stroke="#29B6F6" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M66,36 Q70,28 64,22" stroke="#29B6F6" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  </svg>`,

  goblin: `<svg viewBox="0 0 60 90" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="78" width="9" height="10" rx="2" fill="#3E2723"/>
    <rect x="31" y="78" width="9" height="10" rx="2" fill="#3E2723"/>
    <rect x="21" y="56" width="9" height="24" rx="2" fill="#558B2F"/>
    <rect x="30" y="56" width="9" height="24" rx="2" fill="#558B2F"/>
    <path d="M14,24 L46,24 L43,58 L17,58 Z" fill="#795548"/>
    <path d="M20,26 L40,26 L38,52 L22,52 Z" fill="#6D4C41"/>
    <path d="M5,22 L2,48 L9,52 L14,26" fill="#558B2F"/>
    <path d="M55,22 L58,48 L51,52 L46,26" fill="#558B2F"/>
    <line x1="2" y1="36" x2="0" y2="56" stroke="#CFD8DC" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="-2" y="44" width="8" height="2" rx="1" fill="#90A4AE"/>
    <rect x="22" y="18" width="16" height="8" fill="#558B2F"/>
    <circle cx="30" cy="13" r="12" fill="#558B2F"/>
    <path d="M10,8 Q14,1 18,8" fill="#388E3C" stroke="none"/>
    <path d="M50,8 Q46,1 42,8" fill="#388E3C" stroke="none"/>
    <ellipse cx="22" cy="7" rx="4" ry="8" fill="#388E3C"/>
    <ellipse cx="38" cy="7" rx="4" ry="8" fill="#388E3C"/>
    <circle cx="24" cy="14" r="3" fill="#F9A825"/>
    <circle cx="36" cy="14" r="3" fill="#F9A825"/>
    <circle cx="24" cy="14" r="1.5" fill="#000"/>
    <circle cx="36" cy="14" r="1.5" fill="#000"/>
    <path d="M25,20 L30,23 L35,20" stroke="#2E7D32" stroke-width="1.2" fill="none"/>
    <path d="M27,22 L30,25 L33,22" stroke="#E8F5E9" stroke-width="0.8" fill="none"/>
  </svg>`,

  forest_archer: `<svg viewBox="0 0 65 95" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="83" width="10" height="10" rx="2" fill="#33691E"/>
    <rect x="33" y="83" width="10" height="10" rx="2" fill="#33691E"/>
    <rect x="21" y="58" width="10" height="27" rx="2" fill="#558B2F"/>
    <rect x="33" y="58" width="10" height="27" rx="2" fill="#558B2F"/>
    <path d="M14,26 L50,26 L46,60 L18,60 Z" fill="#33691E"/>
    <path d="M21,28 L43,28 L40,56 L24,56 Z" fill="#558B2F"/>
    <path d="M57,16 Q60,40 57,72" stroke="#795548" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <line x1="57" y1="16" x2="57" y2="72" stroke="#795548" stroke-width="1"/>
    <line x1="57" y1="16" x2="48" y2="28" stroke="#5D4037" stroke-width="1.5"/>
    <line x1="57" y1="72" x2="48" y2="64" stroke="#5D4037" stroke-width="1.5"/>
    <line x1="57" y1="44" x2="46" y2="44" stroke="#5D4037" stroke-width="1.2"/>
    <path d="M14,28 L8,55 L15,58 L20,30" fill="#8D6E63"/>
    <path d="M50,28 L56,48 L50,51 L44,30" fill="#8D6E63"/>
    <rect x="24" y="19" width="15" height="9" fill="#8D6E63"/>
    <circle cx="31" cy="14" r="12" fill="#8D6E63"/>
    <path d="M18,4 Q22,-1 26,4 L31,0 L36,4 Q40,-1 44,4 L41,14 L21,14 Z" fill="#33691E"/>
    <path d="M26,4 L31,0 L36,4" fill="#1B5E20"/>
    <circle cx="24" cy="14" r="2" fill="#333"/>
    <circle cx="38" cy="14" r="2" fill="#333"/>
    <path d="M26,19 Q31,22 36,19" stroke="#555" stroke-width="1" fill="none"/>
  </svg>`,

  forest_shaman: `<svg viewBox="0 0 65 105" xmlns="http://www.w3.org/2000/svg">
    <path d="M18,34 L47,34 L52,105 L13,105 Z" fill="#1B5E20"/>
    <path d="M23,36 L42,36 L46,78 L19,78 Z" fill="#2E7D32"/>
    <path d="M8,32 L4,75 L10,77 L16,36" fill="#1B5E20"/>
    <path d="M57,32 L61,75 L55,77 L49,36" fill="#1B5E20"/>
    <line x1="4" y1="12" x2="4" y2="84" stroke="#3E2723" stroke-width="3" stroke-linecap="round"/>
    <circle cx="4" cy="9" r="8" fill="#B71C1C" opacity="0.85"/>
    <circle cx="4" cy="9" r="5" fill="#E53935"/>
    <circle cx="4" cy="9" r="2.5" fill="#FFCDD2"/>
    <line x1="0" y1="9" x2="8" y2="9" stroke="#FFCDD2" stroke-width="1.5"/>
    <line x1="4" y1="5" x2="4" y2="13" stroke="#FFCDD2" stroke-width="1.5"/>
    <rect x="26" y="24" width="13" height="12" fill="#263238"/>
    <circle cx="32" cy="17" r="13" fill="#263238"/>
    <path d="M16,6 Q20,-2 32,-4 Q44,-2 48,6 L46,18 L18,18 Z" fill="#1B5E20" stroke="#2E7D32" stroke-width="1"/>
    <path d="M22,4 L32,-2 L42,4 L40,12 L24,12 Z" fill="#263238"/>
    <circle cx="25" cy="17" r="3" fill="#E53935"/>
    <circle cx="39" cy="17" r="3" fill="#E53935"/>
    <circle cx="25" cy="17" r="1.5" fill="#FFCDD2"/>
    <circle cx="39" cy="17" r="1.5" fill="#FFCDD2"/>
    <path d="M28,23 L32,26 L36,23" stroke="#1B5E20" stroke-width="1" fill="none"/>
  </svg>`,

  demon_lord: `<svg viewBox="0 0 140 175" xmlns="http://www.w3.org/2000/svg">
    <!-- Wings (behind everything) -->
    <path d="M62,72 Q22,38 0,95 Q22,72 48,82 Q56,86 62,90" fill="#3d0000"/>
    <path d="M62,72 Q28,18 8,52 Q28,48 48,82" fill="#5a0000"/>
    <line x1="62" y1="72" x2="8" y2="78" stroke="#8b0000" stroke-width="1" opacity="0.5"/>
    <line x1="62" y1="72" x2="18" y2="55" stroke="#8b0000" stroke-width="1" opacity="0.5"/>
    <line x1="62" y1="72" x2="6" y2="62" stroke="#8b0000" stroke-width="1" opacity="0.5"/>
    <path d="M78,72 Q118,38 140,95 Q118,72 92,82 Q84,86 78,90" fill="#3d0000"/>
    <path d="M78,72 Q112,18 132,52 Q112,48 92,82" fill="#5a0000"/>
    <line x1="78" y1="72" x2="132" y2="78" stroke="#8b0000" stroke-width="1" opacity="0.5"/>
    <line x1="78" y1="72" x2="122" y2="55" stroke="#8b0000" stroke-width="1" opacity="0.5"/>
    <line x1="78" y1="72" x2="134" y2="62" stroke="#8b0000" stroke-width="1" opacity="0.5"/>
    <!-- Legs -->
    <rect x="52" y="140" width="16" height="28" rx="4" fill="#1a0505"/>
    <rect x="72" y="140" width="16" height="28" rx="4" fill="#1a0505"/>
    <!-- Hooves -->
    <path d="M48,164 L68,164 L71,175 L46,175 Z" fill="#0d0000"/>
    <path d="M72,164 L92,164 L94,175 L70,175 Z" fill="#0d0000"/>
    <!-- Torso -->
    <path d="M48,88 L92,88 L96,148 L44,148 Z" fill="#1a0505"/>
    <!-- Chest plate -->
    <path d="M55,92 L85,92 L82,128 L58,128 Z" fill="#2d0808"/>
    <!-- Glowing chest rune -->
    <path d="M70,100 L74,110 L70,108 L66,110 Z" fill="#cc0000" opacity="0.9"/>
    <ellipse cx="70" cy="116" rx="5" ry="5" fill="#cc0000" opacity="0.5"/>
    <ellipse cx="70" cy="116" rx="3" ry="3" fill="#ff4444" opacity="0.7"/>
    <!-- Left arm -->
    <path d="M48,92 L26,98 L16,128 L34,136 L50,112 Z" fill="#1a0505"/>
    <path d="M16,126 L8,136 M19,130 L12,141 M23,133 L17,143" stroke="#cc2222" stroke-width="2" stroke-linecap="round"/>
    <!-- Right arm -->
    <path d="M92,92 L114,98 L124,128 L106,136 L90,112 Z" fill="#1a0505"/>
    <path d="M124,126 L132,136 M121,130 L128,141 M117,133 L123,143" stroke="#cc2222" stroke-width="2" stroke-linecap="round"/>
    <!-- Neck -->
    <rect x="62" y="78" width="16" height="14" rx="4" fill="#1a0505"/>
    <!-- Head -->
    <ellipse cx="70" cy="60" rx="24" ry="22" fill="#1a0505"/>
    <!-- Left horn -->
    <path d="M52,48 Q36,18 44,36" fill="#6b0000"/>
    <path d="M52,48 Q34,12 40,30 Q42,24 44,36 Z" fill="#8b2222"/>
    <!-- Right horn -->
    <path d="M88,48 Q104,18 96,36" fill="#6b0000"/>
    <path d="M88,48 Q106,12 100,30 Q98,24 96,36 Z" fill="#8b2222"/>
    <!-- Eye glow halos -->
    <ellipse cx="60" cy="58" rx="10" ry="8" fill="#ff0000" opacity="0.2"/>
    <ellipse cx="80" cy="58" rx="10" ry="8" fill="#ff0000" opacity="0.2"/>
    <!-- Eyes -->
    <ellipse cx="60" cy="58" rx="7" ry="6" fill="#990000"/>
    <ellipse cx="80" cy="58" rx="7" ry="6" fill="#990000"/>
    <ellipse cx="60" cy="58" rx="4" ry="4" fill="#ff2222"/>
    <ellipse cx="80" cy="58" rx="4" ry="4" fill="#ff2222"/>
    <ellipse cx="60" cy="58" rx="2" ry="2.5" fill="#000"/>
    <ellipse cx="80" cy="58" rx="2" ry="2.5" fill="#000"/>
    <!-- Brow -->
    <path d="M53,52 Q60,48 67,52" stroke="#0d0000" stroke-width="2" fill="none"/>
    <path d="M73,52 Q80,48 87,52" stroke="#0d0000" stroke-width="2" fill="none"/>
    <!-- Nose -->
    <path d="M67,66 Q70,69 73,66" stroke="#330000" stroke-width="1.5" fill="none"/>
    <!-- Mouth + fangs -->
    <path d="M58,73 Q70,82 82,73" stroke="#8b0000" stroke-width="2" fill="none"/>
    <path d="M62,73 L60,80 M67,75 L66,82 M73,75 L74,82 M78,73 L80,80" stroke="#e0e0e0" stroke-width="2" stroke-linecap="round"/>
    <!-- Tail -->
    <path d="M68,146 Q50,158 46,170 Q48,178 58,173 Q56,165 64,158 Q76,147 76,146" fill="#250808"/>
    <!-- Spade tip -->
    <path d="M49,171 Q42,178 49,182 L59,174 Z" fill="#8b0000"/>
    <!-- Ground flames -->
    <ellipse cx="60" cy="172" rx="12" ry="4" fill="#ff4400" opacity="0.35"/>
    <ellipse cx="84" cy="172" rx="12" ry="4" fill="#ff4400" opacity="0.35"/>
    <path d="M54,170 Q57,160 55,168 Q59,158 58,167 Q62,157 61,166" stroke="#ff6600" stroke-width="1.5" fill="none" opacity="0.75"/>
    <path d="M80,170 Q83,160 81,168 Q85,158 84,167 Q88,157 87,166" stroke="#ff6600" stroke-width="1.5" fill="none" opacity="0.75"/>
  </svg>`,

  demon_imp: `<svg viewBox="0 0 65 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Tiny wings -->
    <path d="M22,36 Q8,28 10,44 Q16,38 22,42" fill="#3a0808"/>
    <path d="M43,36 Q57,28 55,44 Q49,38 43,42" fill="#3a0808"/>
    <!-- Legs -->
    <rect x="22" y="65" width="10" height="18" rx="3" fill="#3a0d0d"/>
    <rect x="33" y="65" width="10" height="18" rx="3" fill="#3a0d0d"/>
    <!-- Feet -->
    <path d="M19,80 L33,80 L35,88 L17,88 Z" fill="#250808"/>
    <path d="M32,80 L46,80 L48,88 L30,88 Z" fill="#250808"/>
    <!-- Body -->
    <ellipse cx="32" cy="52" rx="18" ry="16" fill="#4a1010"/>
    <!-- Head -->
    <ellipse cx="32" cy="28" rx="16" ry="14" fill="#5a1515"/>
    <!-- Small horns -->
    <path d="M22,20 Q16,8 19,16" stroke="#8b0000" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M42,20 Q48,8 45,16" stroke="#8b0000" stroke-width="3" fill="none" stroke-linecap="round"/>
    <!-- Eyes -->
    <ellipse cx="25" cy="27" rx="5" ry="4" fill="#cc0000"/>
    <ellipse cx="39" cy="27" rx="5" ry="4" fill="#cc0000"/>
    <ellipse cx="25" cy="27" rx="2.5" ry="2" fill="#ff4444"/>
    <ellipse cx="39" cy="27" rx="2.5" ry="2" fill="#ff4444"/>
    <ellipse cx="25" cy="27" rx="1.2" ry="1.5" fill="#000"/>
    <ellipse cx="39" cy="27" rx="1.2" ry="1.5" fill="#000"/>
    <!-- Mouth -->
    <path d="M25,35 Q32,40 39,35" stroke="#8b0000" stroke-width="1.5" fill="none"/>
    <path d="M27,35 L26,40 M31,36 L31,41 M37,35 L38,40" stroke="#ddd" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Arms -->
    <path d="M14,48 Q6,54 8,64" stroke="#4a1010" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M50,48 Q58,54 56,64" stroke="#4a1010" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- Claws -->
    <path d="M8,62 L4,68 M10,65 L7,71" stroke="#cc2222" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M56,62 L60,68 M54,65 L57,71" stroke="#cc2222" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Tail -->
    <path d="M38,64 Q50,70 48,80 Q50,84 46,82" stroke="#6b1010" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- Tail tip -->
    <path d="M44,81 Q48,86 52,82 L46,78 Z" fill="#8b0000"/>
  </svg>`,

  // ── Desert Saharrrra monsters ────────────────────────────────────────────────

  sand_scorpion: `<svg viewBox="0 0 90 70" xmlns="http://www.w3.org/2000/svg">
    <!-- Shadow -->
    <ellipse cx="45" cy="67" rx="32" ry="4" fill="#a06820" opacity=".35"/>
    <!-- Tail segments -->
    <circle cx="72" cy="28" r="5" fill="#c8902a"/>
    <circle cx="78" cy="18" r="4.5" fill="#c8902a"/>
    <circle cx="82" cy="9"  r="4" fill="#c8902a"/>
    <!-- Stinger -->
    <path d="M82,9 Q90,4 88,14" fill="#e8a030" stroke="#b87820" stroke-width="1"/>
    <!-- Body -->
    <ellipse cx="44" cy="44" rx="22" ry="14" fill="#d4993a"/>
    <ellipse cx="44" cy="44" rx="16" ry="9"  fill="#e8b048"/>
    <!-- Head/carapace -->
    <ellipse cx="22" cy="40" rx="14" ry="10" fill="#c8882a"/>
    <!-- Eyes -->
    <circle cx="16" cy="36" r="3" fill="#ff4400"/>
    <circle cx="16" cy="36" r="1.5" fill="#ff8800"/>
    <circle cx="22" cy="34" r="2.5" fill="#ff4400"/>
    <circle cx="22" cy="34" r="1.2" fill="#ff8800"/>
    <!-- Claws (pincers) -->
    <path d="M10,42 Q2,36 4,28 Q6,22 12,26 Q8,30 10,36 L16,40" fill="#b87820" stroke="#906010" stroke-width="1"/>
    <path d="M10,42 Q0,44 2,36" fill="#c8902a"/>
    <path d="M14,46 Q4,52 6,44 Q6,38 12,40 Q8,44 10,48 L16,46" fill="#b87820" stroke="#906010" stroke-width="1"/>
    <!-- Legs -->
    <line x1="30" y1="52" x2="20" y2="62" stroke="#b07020" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="38" y1="55" x2="30" y2="66" stroke="#b07020" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="46" y1="56" x2="40" y2="67" stroke="#b07020" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="54" y1="55" x2="52" y2="66" stroke="#b07020" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="60" y1="52" x2="62" y2="62" stroke="#b07020" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="64" y1="48" x2="70" y2="57" stroke="#b07020" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Tail connection to body -->
    <path d="M62,40 Q68,34 72,28" stroke="#c8902a" stroke-width="6" fill="none" stroke-linecap="round"/>
  </svg>`,

  desert_jackal: `<svg viewBox="0 0 75 85" xmlns="http://www.w3.org/2000/svg">
    <!-- Shadow -->
    <ellipse cx="38" cy="82" rx="22" ry="4" fill="#a06820" opacity=".3"/>
    <!-- Body -->
    <ellipse cx="38" cy="54" rx="20" ry="13" fill="#c8882a"/>
    <ellipse cx="38" cy="52" rx="14" ry="9"  fill="#daa040"/>
    <!-- Tail -->
    <path d="M56,52 Q68,44 66,34 Q64,28 60,30 Q62,36 58,42 Q54,48 56,52" fill="#b87828" stroke="#a06820" stroke-width="1"/>
    <!-- Neck + head -->
    <ellipse cx="20" cy="46" rx="10" ry="8" fill="#c8882a"/>
    <ellipse cx="12" cy="36" rx="14" ry="12" fill="#b87828"/>
    <!-- Snout -->
    <path d="M2,34 Q0,38 4,40 Q8,42 12,40" fill="#a06820"/>
    <!-- Nose -->
    <ellipse cx="3" cy="37" rx="2" ry="1.5" fill="#222"/>
    <!-- Eye -->
    <ellipse cx="8" cy="30" rx="3" ry="2.5" fill="#ff8800"/>
    <ellipse cx="8" cy="30" rx="1.5" ry="1.5" fill="#cc5500"/>
    <circle  cx="8" cy="30" r=".8"  fill="#000"/>
    <!-- Ears (pointed) -->
    <path d="M8,24 Q4,12 8,8 Q12,12 14,22 Z" fill="#a06820"/>
    <path d="M18,22 Q16,10 20,6 Q24,10 24,20 Z" fill="#a06820"/>
    <!-- Legs -->
    <rect x="22" y="64" width="8" height="16" rx="3" fill="#b07028"/>
    <rect x="34" y="66" width="8" height="14" rx="3" fill="#b07028"/>
    <rect x="44" y="64" width="7" height="16" rx="3" fill="#b07028"/>
    <!-- Paws -->
    <ellipse cx="26" cy="79" rx="5" ry="3" fill="#986018"/>
    <ellipse cx="38" cy="79" rx="5" ry="3" fill="#986018"/>
    <ellipse cx="47" cy="79" rx="4" ry="3" fill="#986018"/>
    <!-- Desert markings on back -->
    <path d="M30,45 Q38,42 46,45" stroke="#986018" stroke-width="1.5" fill="none" opacity=".6"/>
    <path d="M28,50 Q38,47 48,50" stroke="#986018" stroke-width="1" fill="none" opacity=".4"/>
  </svg>`,

  sandstorm_wraith: `<svg viewBox="0 0 70 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Wispy sand particles -->
    <ellipse cx="35" cy="90" rx="20" ry="5" fill="#c8a050" opacity=".3"/>
    <!-- Swirling cloak/body -->
    <path d="M20,50 Q10,70 14,90 Q25,95 35,90 Q45,95 56,90 Q60,70 50,50 Q42,38 35,35 Q28,38 20,50 Z" fill="#d4a040" opacity=".75"/>
    <path d="M22,52 Q14,68 18,86 Q28,90 35,88 Q42,90 52,86 Q56,68 48,52 Q41,42 35,38 Q29,42 22,52 Z" fill="#e8c060" opacity=".5"/>
    <!-- Torn lower hem (wispy) -->
    <path d="M18,82 Q22,90 18,98" stroke="#c8a050" stroke-width="2" fill="none" opacity=".6"/>
    <path d="M26,86 Q28,92 24,100" stroke="#d4b060" stroke-width="1.5" fill="none" opacity=".5"/>
    <path d="M35,88 Q35,94 32,102" stroke="#c8a050" stroke-width="1.5" fill="none" opacity=".5"/>
    <path d="M44,86 Q46,92 44,100" stroke="#d4b060" stroke-width="1.5" fill="none" opacity=".5"/>
    <path d="M52,82 Q54,90 52,98" stroke="#c8a050" stroke-width="2" fill="none" opacity=".6"/>
    <!-- Upper body / torso -->
    <ellipse cx="35" cy="52" rx="16" ry="18" fill="#c89030" opacity=".85"/>
    <!-- Arms (wispy) -->
    <path d="M20,46 Q8,38 6,28 Q4,20 10,18 Q14,16 16,22" stroke="#c8a050" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M50,46 Q62,38 64,28 Q66,20 60,18 Q56,16 54,22" stroke="#c8a050" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- Clawed hand wisps -->
    <path d="M16,22 L10,16 M18,20 L14,13 M20,18 L18,11" stroke="#e8d080" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M54,22 L60,16 M52,20 L56,13 M50,18 L52,11" stroke="#e8d080" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Head (hooded void) -->
    <ellipse cx="35" cy="26" rx="16" ry="14" fill="#1a1000" opacity=".9"/>
    <path d="M20,20 Q22,8 35,6 Q48,8 50,20 L48,28 Q35,24 22,28 Z" fill="#2a1a00" opacity=".95"/>
    <!-- Glowing eyes -->
    <ellipse cx="28" cy="24" rx="4" ry="3" fill="#ff8800" opacity=".9"/>
    <ellipse cx="42" cy="24" rx="4" ry="3" fill="#ff8800" opacity=".9"/>
    <ellipse cx="28" cy="24" rx="2" ry="1.5" fill="#ffcc00"/>
    <ellipse cx="42" cy="24" rx="2" ry="1.5" fill="#ffcc00"/>
    <!-- Sand swirl particles around body -->
    <path d="M12,54 Q6,58 8,64" stroke="#e8c060" stroke-width="1" fill="none" opacity=".5"/>
    <path d="M58,54 Q64,58 62,64" stroke="#e8c060" stroke-width="1" fill="none" opacity=".5"/>
  </svg>`,

  bone_crawler: `<svg viewBox="0 0 90 65" xmlns="http://www.w3.org/2000/svg">
    <!-- Shadow -->
    <ellipse cx="45" cy="62" rx="34" ry="4" fill="#888" opacity=".3"/>
    <!-- Main shell / carapace -->
    <ellipse cx="45" cy="38" rx="28" ry="18" fill="#e8e0d0"/>
    <ellipse cx="45" cy="36" rx="22" ry="13" fill="#f0ece0"/>
    <!-- Bone texture lines on shell -->
    <path d="M28,32 Q45,28 62,32" stroke="#ccc8b8" stroke-width="1.5" fill="none"/>
    <path d="M26,38 Q45,34 64,38" stroke="#ccc8b8" stroke-width="1.5" fill="none"/>
    <path d="M28,44 Q45,40 62,44" stroke="#ccc8b8" stroke-width="1.5" fill="none"/>
    <!-- Head (skull-like) -->
    <ellipse cx="18" cy="36" rx="14" ry="12" fill="#e8e0d0"/>
    <!-- Eye sockets (dark hollows) -->
    <ellipse cx="12" cy="32" rx="3.5" ry="3" fill="#333" opacity=".8"/>
    <ellipse cx="20" cy="31" rx="3" ry="2.5" fill="#333" opacity=".8"/>
    <!-- Glowing eyes -->
    <ellipse cx="12" cy="32" rx="2" ry="1.8" fill="#ffcc00" opacity=".8"/>
    <ellipse cx="20" cy="31" rx="1.8" ry="1.5" fill="#ffcc00" opacity=".8"/>
    <!-- Mandibles -->
    <path d="M6,38 Q2,44 6,48 Q10,44 12,40" fill="#d0c8b8" stroke="#bbb0a0" stroke-width="1"/>
    <path d="M8,40 Q4,46 8,50 Q12,46 14,42" fill="#e0d8c8" stroke="#bbb0a0" stroke-width="1"/>
    <!-- Legs (bone-white, segmented) -->
    <line x1="28" y1="52" x2="16" y2="64" stroke="#d0c8b8" stroke-width="3" stroke-linecap="round"/>
    <line x1="36" y1="54" x2="26" y2="65" stroke="#d0c8b8" stroke-width="3" stroke-linecap="round"/>
    <line x1="45" y1="55" x2="38" y2="65" stroke="#d0c8b8" stroke-width="3" stroke-linecap="round"/>
    <line x1="54" y1="54" x2="52" y2="65" stroke="#d0c8b8" stroke-width="3" stroke-linecap="round"/>
    <line x1="62" y1="52" x2="64" y2="64" stroke="#d0c8b8" stroke-width="3" stroke-linecap="round"/>
    <line x1="68" y1="48" x2="74" y2="60" stroke="#d0c8b8" stroke-width="3" stroke-linecap="round"/>
    <!-- Upper legs -->
    <line x1="28" y1="24" x2="18" y2="14" stroke="#d0c8b8" stroke-width="3" stroke-linecap="round"/>
    <line x1="38" y1="22" x2="30" y2="12" stroke="#d0c8b8" stroke-width="3" stroke-linecap="round"/>
    <line x1="52" y1="22" x2="50" y2="12" stroke="#d0c8b8" stroke-width="3" stroke-linecap="round"/>
    <line x1="62" y1="24" x2="68" y2="14" stroke="#d0c8b8" stroke-width="3" stroke-linecap="round"/>
  </svg>`,

  canyon_serpent: `<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Coiled body -->
    <path d="M60,72 Q72,64 70,50 Q68,38 56,36 Q44,34 38,44 Q32,54 38,64 Q44,74 54,72 Q64,70 66,60 Q68,50 60,46 Q52,42 46,48 Q40,54 44,60 Q48,66 54,64" stroke="#c05020" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M60,72 Q72,64 70,50 Q68,38 56,36 Q44,34 38,44 Q32,54 38,64 Q44,74 54,72 Q64,70 66,60 Q68,50 60,46 Q52,42 46,48 Q40,54 44,60 Q48,66 54,64" stroke="#e07030" stroke-width="7" fill="none" stroke-linecap="round"/>
    <!-- Scale pattern overlay -->
    <path d="M60,72 Q72,64 70,50 Q68,38 56,36 Q44,34 38,44 Q32,54 38,64" stroke="#d06028" stroke-width="1.5" fill="none" opacity=".5" stroke-dasharray="4,3"/>
    <!-- Head -->
    <ellipse cx="44" cy="60" rx="10" ry="7" fill="#c05020" transform="rotate(-20 44 60)"/>
    <ellipse cx="44" cy="60" rx="7"  ry="5" fill="#d86030" transform="rotate(-20 44 60)"/>
    <!-- Eyes -->
    <ellipse cx="38" cy="55" rx="3" ry="2.5" fill="#ff8800"/>
    <ellipse cx="38" cy="55" rx="1.5" ry="2" fill="#000"/>
    <!-- Forked tongue -->
    <path d="M34,60 L28,58 M34,60 L28,62" stroke="#ff2020" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Tail tip -->
    <path d="M54,64 Q52,70 48,72 Q44,74 46,78" stroke="#c05020" stroke-width="6" fill="none" stroke-linecap="round"/>
    <!-- Rattle -->
    <ellipse cx="46" cy="79" rx="4" ry="3" fill="#b04018" stroke="#803010" stroke-width="1"/>
    <ellipse cx="46" cy="79" rx="2" ry="1.5" fill="#c05020"/>
    <!-- Desert pattern on scales -->
    <path d="M50,44 Q56,40 62,44" stroke="#e07030" stroke-width="1" fill="none" opacity=".6"/>
    <path d="M42,52 Q48,48 54,52" stroke="#e07030" stroke-width="1" fill="none" opacity=".6"/>
  </svg>`,

  dune_sorcerer: `<svg viewBox="0 0 65 105" xmlns="http://www.w3.org/2000/svg">
    <!-- Robe bottom -->
    <path d="M16,56 L14,105 L50,105 L49,56 Z" fill="#8a5a1a"/>
    <path d="M20,58 L18,105 L46,105 L45,58 Z" fill="#a06e28"/>
    <!-- Staff -->
    <line x1="60" y1="10" x2="58" y2="100" stroke="#6a4010" stroke-width="3" stroke-linecap="round"/>
    <circle cx="60" cy="10" r="7" fill="#c8a030" stroke="#e8c040" stroke-width="1.5"/>
    <circle cx="60" cy="10" r="4" fill="#ffcc00" opacity=".8"/>
    <!-- Arms -->
    <path d="M16,40 Q6,50 8,66" stroke="#a06e28" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M49,40 Q58,46 58,58" stroke="#a06e28" stroke-width="7" fill="none" stroke-linecap="round"/>
    <!-- Torso -->
    <rect x="18" y="30" width="30" height="30" rx="4" fill="#8a5a1a"/>
    <rect x="22" y="32" width="22" height="24" rx="3" fill="#a06e28"/>
    <!-- Chest amulet (Eye of Ra) -->
    <ellipse cx="33" cy="44" rx="7" ry="5" fill="#c89020"/>
    <ellipse cx="33" cy="44" rx="4" ry="3" fill="#ffaa00"/>
    <ellipse cx="33" cy="44" rx="2" ry="1.5" fill="#ff6600"/>
    <!-- Headdress (wrapped turban) -->
    <ellipse cx="33" cy="20" rx="14" ry="12" fill="#6a3a08"/>
    <path d="M20,18 Q22,8 33,6 Q44,8 46,18 L44,24 Q33,20 22,24 Z" fill="#8a5020"/>
    <!-- Turban wrap lines -->
    <path d="M22,16 Q33,12 44,16" stroke="#6a3a08" stroke-width="1.5" fill="none"/>
    <path d="M20,20 Q33,16 46,20" stroke="#6a3a08" stroke-width="1" fill="none"/>
    <!-- Face -->
    <ellipse cx="33" cy="22" rx="10" ry="9" fill="#c09050"/>
    <!-- Eyes (glowing gold) -->
    <ellipse cx="27" cy="20" rx="3" ry="2.5" fill="#cc8800"/>
    <ellipse cx="39" cy="20" rx="3" ry="2.5" fill="#cc8800"/>
    <ellipse cx="27" cy="20" rx="1.5" ry="1.5" fill="#ffcc00"/>
    <ellipse cx="39" cy="20" rx="1.5" ry="1.5" fill="#ffcc00"/>
    <circle cx="27" cy="20" r=".8" fill="#000"/>
    <circle cx="39" cy="20" r=".8" fill="#000"/>
    <!-- Beard -->
    <path d="M26,26 Q33,30 40,26 L39,30 Q33,34 27,30 Z" fill="#6a3a08"/>
    <!-- Sand magic wisps -->
    <path d="M6,62 Q2,66 4,72" stroke="#e8c060" stroke-width="1.5" fill="none" opacity=".6"/>
    <path d="M4,68 Q0,70 2,76" stroke="#e8c060" stroke-width="1" fill="none" opacity=".4"/>
  </svg>`,

  mirage_stalker: `<svg viewBox="0 0 65 95" xmlns="http://www.w3.org/2000/svg">
    <!-- Translucent shadow (mirage effect) -->
    <ellipse cx="48" cy="82" rx="14" ry="6" fill="#8888ff" opacity=".15"/>
    <ellipse cx="48" cy="88" rx="10" ry="4" fill="#8888ff" opacity=".1"/>
    <!-- Ghost duplicate (offset, translucent) -->
    <rect x="30" y="44" width="26" height="35" rx="4" fill="#4060cc" opacity=".18"/>
    <ellipse cx="43" cy="34" rx="13" ry="11" fill="#4060cc" opacity=".18"/>
    <!-- Main body (dark, shifting) -->
    <rect x="18" y="50" width="26" height="38" rx="4" fill="#1a1a3a"/>
    <rect x="22" y="52" width="18" height="30" rx="3" fill="#2a2a50"/>
    <!-- Legs -->
    <rect x="20" y="84" width="10" height="10" rx="3" fill="#141430"/>
    <rect x="32" y="84" width="10" height="10" rx="3" fill="#141430"/>
    <!-- Arms -->
    <path d="M18,54 Q8,60 6,72" stroke="#1a1a3a" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M44,54 Q54,60 56,72" stroke="#1a1a3a" stroke-width="7" fill="none" stroke-linecap="round"/>
    <!-- Clawed hands -->
    <path d="M6,70 L2,76 M8,73 L5,80 M11,74 L10,81" stroke="#6060cc" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M56,70 L60,76 M54,73 L57,80 M51,74 L52,81" stroke="#6060cc" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Head -->
    <ellipse cx="31" cy="36" rx="14" ry="12" fill="#1a1a3a"/>
    <!-- Mirage shimmer on face -->
    <ellipse cx="31" cy="36" rx="10" ry="8"  fill="#2a2a54" opacity=".7"/>
    <!-- Eyes (piercing blue/violet) -->
    <ellipse cx="24" cy="33" rx="4" ry="3.5" fill="#4040ff"/>
    <ellipse cx="38" cy="33" rx="4" ry="3.5" fill="#4040ff"/>
    <ellipse cx="24" cy="33" rx="2.5" ry="2.5" fill="#8888ff"/>
    <ellipse cx="38" cy="33" rx="2.5" ry="2.5" fill="#8888ff"/>
    <circle cx="24" cy="33" r="1.2" fill="#fff" opacity=".8"/>
    <circle cx="38" cy="33" r="1.2" fill="#fff" opacity=".8"/>
    <!-- Mouth (thin line) -->
    <path d="M25,42 Q31,46 37,42" stroke="#6060cc" stroke-width="1.2" fill="none"/>
    <!-- Mirage effect trails -->
    <path d="M18,58 Q10,60 8,68" stroke="#6060cc" stroke-width="1" fill="none" opacity=".4"/>
    <path d="M44,58 Q52,60 54,68" stroke="#6060cc" stroke-width="1" fill="none" opacity=".4"/>
  </svg>`,

  sandglass_golem: `<svg viewBox="0 0 85 110" xmlns="http://www.w3.org/2000/svg">
    <!-- Ground sand pool -->
    <ellipse cx="42" cy="107" rx="30" ry="5" fill="#c8a050" opacity=".4"/>
    <!-- Legs (stone columns) -->
    <rect x="18" y="78" width="18" height="28" rx="4" fill="#8a6828"/>
    <rect x="48" y="78" width="18" height="28" rx="4" fill="#8a6828"/>
    <!-- Stone texture on legs -->
    <line x1="20" y1="86" x2="34" y2="86" stroke="#6a4a18" stroke-width="1.5" opacity=".5"/>
    <line x1="20" y1="94" x2="34" y2="94" stroke="#6a4a18" stroke-width="1.5" opacity=".5"/>
    <line x1="50" y1="86" x2="64" y2="86" stroke="#6a4a18" stroke-width="1.5" opacity=".5"/>
    <line x1="50" y1="94" x2="64" y2="94" stroke="#6a4a18" stroke-width="1.5" opacity=".5"/>
    <!-- Body (hourglass/sandglass shape) -->
    <path d="M22,40 L24,78 L60,78 L62,40 Q52,58 42,60 Q32,58 22,40 Z" fill="#a07838"/>
    <path d="M24,42 L26,76 L58,76 L60,42 Q50,56 42,58 Q34,56 24,42 Z" fill="#c09848"/>
    <!-- Sand cascade (hourglass center) -->
    <path d="M38,56 Q42,60 46,56 L48,70 Q42,68 36,70 Z" fill="#e8c060" opacity=".8"/>
    <!-- Upper body bulge -->
    <ellipse cx="42" cy="34" rx="22" ry="16" fill="#b08838"/>
    <ellipse cx="42" cy="32" rx="17" ry="12" fill="#c8a048"/>
    <!-- Stone cracks -->
    <path d="M34,26 Q38,32 36,38" stroke="#806020" stroke-width="1.5" fill="none" opacity=".5"/>
    <path d="M48,28 Q52,34 50,40" stroke="#806020" stroke-width="1.5" fill="none" opacity=".5"/>
    <!-- Arms (huge stone fists) -->
    <rect x="2"  y="36" width="20" height="14" rx="5" fill="#8a6828"/>
    <rect x="62" y="36" width="20" height="14" rx="5" fill="#8a6828"/>
    <!-- Knuckle lines -->
    <line x1="6"  y1="40" x2="20" y2="40" stroke="#6a4a18" stroke-width="1" opacity=".5"/>
    <line x1="64" y1="40" x2="78" y2="40" stroke="#6a4a18" stroke-width="1" opacity=".5"/>
    <!-- Head (stone block) -->
    <rect x="28" y="10" width="28" height="24" rx="5" fill="#b08838"/>
    <rect x="30" y="12" width="24" height="20" rx="4" fill="#c8a048"/>
    <!-- Eye glow (sand-energy) -->
    <ellipse cx="36" cy="22" rx="5" ry="4" fill="#ff8800"/>
    <ellipse cx="48" cy="22" rx="5" ry="4" fill="#ff8800"/>
    <ellipse cx="36" cy="22" rx="3" ry="2.5" fill="#ffcc00"/>
    <ellipse cx="48" cy="22" rx="3" ry="2.5" fill="#ffcc00"/>
    <ellipse cx="36" cy="22" rx="1.5" ry="1.5" fill="#fff" opacity=".7"/>
    <ellipse cx="48" cy="22" rx="1.5" ry="1.5" fill="#fff" opacity=".7"/>
    <!-- Rune on forehead -->
    <path d="M40,13 L42,17 L44,13 M42,13 L42,17" stroke="#ffcc00" stroke-width="1" fill="none" opacity=".7"/>
    <!-- Sand leaking from joints -->
    <path d="M24,50 Q18,54 16,62" stroke="#e8c060" stroke-width="2" fill="none" opacity=".5"/>
    <path d="M60,50 Q66,54 68,62" stroke="#e8c060" stroke-width="2" fill="none" opacity=".5"/>
  </svg>`,

  cursed_servant: `<svg viewBox="0 0 65 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Shadow -->
    <ellipse cx="32" cy="97" rx="18" ry="4" fill="#888" opacity=".3"/>
    <!-- Legs (wrapped in bandages) -->
    <rect x="18" y="74" width="12" height="22" rx="3" fill="#c4a050"/>
    <rect x="33" y="74" width="12" height="22" rx="3" fill="#c4a050"/>
    <!-- Bandage wraps on legs -->
    <line x1="17" y1="78" x2="31" y2="78" stroke="#a88030" stroke-width="1.5" opacity=".6"/>
    <line x1="17" y1="84" x2="31" y2="84" stroke="#a88030" stroke-width="1.5" opacity=".6"/>
    <line x1="17" y1="90" x2="31" y2="90" stroke="#a88030" stroke-width="1.5" opacity=".6"/>
    <line x1="32" y1="78" x2="46" y2="78" stroke="#a88030" stroke-width="1.5" opacity=".6"/>
    <line x1="32" y1="84" x2="46" y2="84" stroke="#a88030" stroke-width="1.5" opacity=".6"/>
    <line x1="32" y1="90" x2="46" y2="90" stroke="#a88030" stroke-width="1.5" opacity=".6"/>
    <!-- Body (wrapped mummy) -->
    <rect x="16" y="42" width="34" height="34" rx="4" fill="#c4a050"/>
    <!-- Body wrappings -->
    <line x1="15" y1="48" x2="51" y2="48" stroke="#a88030" stroke-width="1.5" opacity=".7"/>
    <line x1="15" y1="54" x2="51" y2="54" stroke="#a88030" stroke-width="1.5" opacity=".7"/>
    <line x1="15" y1="60" x2="51" y2="60" stroke="#a88030" stroke-width="1.5" opacity=".7"/>
    <line x1="15" y1="66" x2="51" y2="66" stroke="#a88030" stroke-width="1.5" opacity=".7"/>
    <!-- Collar / pectoral -->
    <path d="M18,44 Q33,40 48,44 L46,50 Q33,46 20,50 Z" fill="#d4a020"/>
    <!-- Arms -->
    <path d="M16,50 Q6,58 8,70" stroke="#c4a050" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M50,50 Q60,58 58,70" stroke="#c4a050" stroke-width="7" fill="none" stroke-linecap="round"/>
    <!-- Arm bandages -->
    <line x1="11" y1="56" x2="17" y2="52" stroke="#a88030" stroke-width="1.5" opacity=".6"/>
    <line x1="9"  y1="62" x2="15" y2="58" stroke="#a88030" stroke-width="1.5" opacity=".6"/>
    <line x1="55" y1="56" x2="49" y2="52" stroke="#a88030" stroke-width="1.5" opacity=".6"/>
    <line x1="57" y1="62" x2="51" y2="58" stroke="#a88030" stroke-width="1.5" opacity=".6"/>
    <!-- Clawed hands (bandage-wrapped) -->
    <path d="M8,68 L4,74 M10,71 L6,78 M13,72 L10,78" stroke="#c4a050" stroke-width="2" stroke-linecap="round"/>
    <path d="M58,68 L62,74 M56,71 L60,78 M53,72 L56,78" stroke="#c4a050" stroke-width="2" stroke-linecap="round"/>
    <!-- Head (mummy-wrapped) -->
    <ellipse cx="33" cy="26" rx="15" ry="16" fill="#c4a050"/>
    <!-- Head bandage layers -->
    <path d="M19,22 Q33,16 47,22" stroke="#a88030" stroke-width="2" fill="none"/>
    <path d="M18,28 Q33,22 48,28" stroke="#a88030" stroke-width="2" fill="none"/>
    <path d="M19,34 Q33,28 47,34" stroke="#a88030" stroke-width="2" fill="none"/>
    <!-- Diagonal wrap -->
    <path d="M20,18 Q28,30 24,40" stroke="#a88030" stroke-width="2" fill="none" opacity=".5"/>
    <!-- Eyes (glowing amber through wrappings) -->
    <ellipse cx="26" cy="26" rx="4" ry="3" fill="#ff8800" opacity=".9"/>
    <ellipse cx="40" cy="25" rx="4" ry="3" fill="#ff8800" opacity=".9"/>
    <ellipse cx="26" cy="26" rx="2.2" ry="1.8" fill="#ffcc00"/>
    <ellipse cx="40" cy="25" rx="2.2" ry="1.8" fill="#ffcc00"/>
    <!-- Curse mark on chest -->
    <path d="M30,56 L33,52 L36,56 M33,52 L33,62" stroke="#8800cc" stroke-width="1.5" fill="none" opacity=".7"/>
  </svg>`,

  pharaoh_wrath: `<svg viewBox="0 0 140 185" xmlns="http://www.w3.org/2000/svg">
    <!-- Ground glow -->
    <ellipse cx="70" cy="181" rx="48" ry="7" fill="#ffaa00" opacity=".25"/>
    <!-- Legs (gold-wrapped stone) -->
    <rect x="40" y="130" width="22" height="45" rx="5" fill="#b89030"/>
    <rect x="78" y="130" width="22" height="45" rx="5" fill="#b89030"/>
    <!-- Leg gold banding -->
    <rect x="38" y="134" width="26" height="4" rx="2" fill="#e8c040"/>
    <rect x="38" y="144" width="26" height="4" rx="2" fill="#e8c040"/>
    <rect x="38" y="154" width="26" height="4" rx="2" fill="#e8c040"/>
    <rect x="76" y="134" width="26" height="4" rx="2" fill="#e8c040"/>
    <rect x="76" y="144" width="26" height="4" rx="2" fill="#e8c040"/>
    <rect x="76" y="154" width="26" height="4" rx="2" fill="#e8c040"/>
    <!-- Sandstone feet -->
    <path d="M36,172 L64,172 L66,183 L34,183 Z" fill="#a08020"/>
    <path d="M76,172 L104,172 L106,183 L74,183 Z" fill="#a08020"/>
    <!-- Torso / ceremonial kilt -->
    <path d="M42,76 L98,76 L104,136 L36,136 Z" fill="#b89030"/>
    <!-- Kilt banding and apron -->
    <path d="M50,80 L90,80 L92,130 L48,130 Z" fill="#c8a040"/>
    <path d="M58,80 Q70,96 82,80 L84,130 L56,130 Z" fill="#e8c050"/>
    <!-- Gold chest pectoral collar -->
    <path d="M38,72 Q70,62 102,72 L100,82 Q70,74 40,82 Z" fill="#d4a820" stroke="#f0c840" stroke-width="1.5"/>
    <!-- Lapis lazuli gems in collar -->
    <circle cx="56" cy="74" r="4" fill="#1a4aaa"/>
    <circle cx="70" cy="70" r="4" fill="#1a4aaa"/>
    <circle cx="84" cy="74" r="4" fill="#1a4aaa"/>
    <circle cx="56" cy="74" r="2" fill="#2a5acc"/>
    <circle cx="70" cy="70" r="2" fill="#2a5acc"/>
    <circle cx="84" cy="74" r="2" fill="#2a5acc"/>
    <!-- Arms -->
    <path d="M42,80 L18,92 L10,120 L32,128 L44,108 Z" fill="#b89030"/>
    <path d="M98,80 L122,92 L130,120 L108,128 L96,108 Z" fill="#b89030"/>
    <!-- Gold armbands -->
    <ellipse cx="24" cy="104" rx="8" ry="4" fill="#e8c040" transform="rotate(-20 24 104)"/>
    <ellipse cx="118" cy="104" rx="8" ry="4" fill="#e8c040" transform="rotate(20 118 104)"/>
    <!-- Left hand: Crook scepter -->
    <path d="M14,118 L10,82" stroke="#d4a020" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M10,82 Q4,72 4,62 Q4,54 10,52 Q18,50 20,60 L18,68" stroke="#d4a020" stroke-width="3" fill="none" stroke-linecap="round"/>
    <!-- Right hand: Flail -->
    <line x1="126" y1="118" x2="130" y2="82" stroke="#d4a020" stroke-width="3" stroke-linecap="round"/>
    <line x1="130" y1="82" x2="134" y2="62" stroke="#e8c040" stroke-width="2" stroke-linecap="round"/>
    <circle cx="134" cy="60" r="5" fill="#e8c040" stroke="#c8a020" stroke-width="1"/>
    <line x1="134" y1="55" x2="138" y2="44" stroke="#e8c040" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="138" cy="42" r="4" fill="#c8a020"/>
    <!-- Neck / base of head -->
    <rect x="60" y="60" width="20" height="18" rx="4" fill="#b89030"/>
    <!-- Nemes headdress (the gold-striped cloth) -->
    <path d="M30,50 Q32,28 70,24 Q108,28 110,50 L106,68 L70,72 L34,68 Z" fill="#e8c040"/>
    <!-- Headdress blue stripes -->
    <rect x="36" y="36" width="6" height="30" rx="2" fill="#1a4aaa" opacity=".75"/>
    <rect x="44" y="32" width="6" height="34" rx="2" fill="#1a4aaa" opacity=".75"/>
    <rect x="90" y="32" width="6" height="34" rx="2" fill="#1a4aaa" opacity=".75"/>
    <rect x="98" y="36" width="6" height="30" rx="2" fill="#1a4aaa" opacity=".75"/>
    <!-- Headdress side lappets (hang beside face) -->
    <rect x="22" y="46" width="12" height="38" rx="5" fill="#d4a820"/>
    <rect x="106" y="46" width="12" height="38" rx="5" fill="#d4a820"/>
    <!-- Gold face mask -->
    <ellipse cx="70" cy="46" rx="24" ry="22" fill="#c8a040"/>
    <ellipse cx="70" cy="46" rx="19" ry="17" fill="#d4ac50"/>
    <!-- Eye of Horus left -->
    <path d="M46,40 L54,42 L48,46 L44,44 Z" fill="#1a4aaa" opacity=".85"/>
    <path d="M52,46 L54,52 L50,54 L46,46 Z" fill="#1a4aaa" opacity=".5"/>
    <!-- Eye of Horus right -->
    <path d="M94,40 L86,42 L92,46 L96,44 Z" fill="#1a4aaa" opacity=".85"/>
    <path d="M88,46 L86,52 L90,54 L94,46 Z" fill="#1a4aaa" opacity=".5"/>
    <!-- Burning amber eyes -->
    <ellipse cx="56" cy="43" rx="6" ry="5" fill="#cc6600"/>
    <ellipse cx="84" cy="43" rx="6" ry="5" fill="#cc6600"/>
    <ellipse cx="56" cy="43" rx="4" ry="3" fill="#ff9900"/>
    <ellipse cx="84" cy="43" rx="4" ry="3" fill="#ff9900"/>
    <ellipse cx="56" cy="43" rx="2" ry="2" fill="#ffcc00"/>
    <ellipse cx="84" cy="43" rx="2" ry="2" fill="#ffcc00"/>
    <circle  cx="56" cy="43" r="1" fill="#000"/>
    <circle  cx="84" cy="43" r="1" fill="#000"/>
    <!-- Nose bridge -->
    <rect x="67" y="46" width="6" height="8" rx="3" fill="#b89040"/>
    <!-- Stern mouth -->
    <rect x="58" y="57" width="24" height="2.5" rx="1.5" fill="#8a6020"/>
    <!-- Uraeus cobra (crown serpent) -->
    <path d="M66,24 Q66,14 60,9 Q56,4 60,1 Q65,-2 70,0 Q75,-2 80,1 Q84,4 80,9 Q74,14 74,24" fill="#4aaa20" stroke="#2a8010" stroke-width="1"/>
    <ellipse cx="70" cy="0" rx="5" ry="3" fill="#ff4400"/>
    <circle  cx="70" cy="2" r="2" fill="#cc3300"/>
    <!-- Aura of ancient power -->
    <ellipse cx="70" cy="90" rx="58" ry="55" fill="none" stroke="#ffaa00" stroke-width="1.5" opacity=".15"/>
    <ellipse cx="70" cy="90" rx="65" ry="62" fill="none" stroke="#ff8800" stroke-width="1"   opacity=".1"/>
  </svg>`,

  void_wisp: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <!-- Outer glow -->
    <ellipse cx="40" cy="40" rx="34" ry="34" fill="none" stroke="#7000cc" stroke-width="4" opacity=".18"/>
    <ellipse cx="40" cy="40" rx="26" ry="26" fill="none" stroke="#9020ff" stroke-width="3" opacity=".28"/>
    <!-- Core void body -->
    <circle cx="40" cy="40" r="18" fill="#0a0018"/>
    <circle cx="40" cy="40" r="18" fill="url(#wg)" opacity=".9"/>
    <defs><radialGradient id="wg" cx="40%" cy="35%" r="60%" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#8020ff" stop-opacity=".9"/><stop offset="60%" stop-color="#3000aa" stop-opacity=".7"/><stop offset="100%" stop-color="#0a0018" stop-opacity=".95"/></radialGradient></defs>
    <!-- Eyes -->
    <ellipse cx="33" cy="38" rx="4" ry="5" fill="#fff" opacity=".9"/>
    <ellipse cx="47" cy="38" rx="4" ry="5" fill="#fff" opacity=".9"/>
    <circle cx="34" cy="39" r="2.5" fill="#cc00ff"/>
    <circle cx="48" cy="39" r="2.5" fill="#cc00ff"/>
    <circle cx="35" cy="38" r="1" fill="#000"/>
    <circle cx="49" cy="38" r="1" fill="#000"/>
    <!-- Trailing energy wisps -->
    <path d="M22,30 Q10,20 14,10" stroke="#6000cc" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/>
    <path d="M58,30 Q70,20 66,10" stroke="#6000cc" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/>
    <path d="M40,22 Q36,10 40,4" stroke="#8020ff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>
    <circle cx="14" cy="10" r="3" fill="#9040ff" opacity=".6"/>
    <circle cx="66" cy="10" r="3" fill="#9040ff" opacity=".6"/>
    <circle cx="40" cy="4" r="2" fill="#b060ff" opacity=".5"/>
  </svg>`,

  rift_stalker: `<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Shadow cloak -->
    <ellipse cx="40" cy="88" rx="28" ry="8" fill="#1a0030" opacity=".5"/>
    <!-- Body -->
    <path d="M20,95 L14,55 Q14,30 40,28 Q66,30 66,55 L60,95 Z" fill="#120020"/>
    <path d="M22,90 L16,55 Q17,34 40,32 Q63,34 64,55 L58,90 Z" fill="#2a0050"/>
    <!-- Cloak shimmer -->
    <path d="M18,70 Q14,60 16,50" stroke="#6000cc" stroke-width="1.5" fill="none" opacity=".5"/>
    <path d="M62,70 Q66,60 64,50" stroke="#6000cc" stroke-width="1.5" fill="none" opacity=".5"/>
    <!-- Head -->
    <ellipse cx="40" cy="22" rx="16" ry="18" fill="#1a0030"/>
    <ellipse cx="40" cy="22" rx="14" ry="16" fill="#250040"/>
    <!-- Glowing eye slits -->
    <rect x="27" y="19" width="10" height="3" rx="1.5" fill="#cc00ff"/>
    <rect x="43" y="19" width="10" height="3" rx="1.5" fill="#cc00ff"/>
    <rect x="28" y="19.5" width="8" height="2" rx="1" fill="#ff80ff" opacity=".8"/>
    <rect x="44" y="19.5" width="8" height="2" rx="1" fill="#ff80ff" opacity=".8"/>
    <!-- Void claws -->
    <path d="M14,75 L4,68 M14,80 L2,78 M14,85 L6,88" stroke="#8020cc" stroke-width="2" stroke-linecap="round"/>
    <path d="M66,75 L76,68 M66,80 L78,78 M66,85 L74,88" stroke="#8020cc" stroke-width="2" stroke-linecap="round"/>
    <!-- Phase rift glow -->
    <ellipse cx="40" cy="55" rx="12" ry="8" fill="none" stroke="#6010aa" stroke-width="1" opacity=".4"/>
  </svg>`,

  thought_devourer: `<svg viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Tentacle base -->
    <ellipse cx="50" cy="78" rx="30" ry="10" fill="#0e001c" opacity=".6"/>
    <!-- Main body - brain-like mass -->
    <ellipse cx="50" cy="45" rx="36" ry="30" fill="#1a0028"/>
    <ellipse cx="50" cy="43" rx="32" ry="27" fill="#2a0042"/>
    <!-- Brain folds -->
    <path d="M22,42 Q26,28 34,30 Q38,32 36,42" fill="none" stroke="#4a1080" stroke-width="2.5" opacity=".8"/>
    <path d="M38,36 Q42,24 50,26 Q56,28 56,36" fill="none" stroke="#4a1080" stroke-width="2.5" opacity=".8"/>
    <path d="M56,36 Q62,26 68,30 Q72,34 68,42" fill="none" stroke="#4a1080" stroke-width="2.5" opacity=".8"/>
    <!-- Mind-shard eyes (3 of them) -->
    <ellipse cx="36" cy="46" rx="5" ry="6" fill="#000"/>
    <ellipse cx="50" cy="42" rx="6" ry="7" fill="#000"/>
    <ellipse cx="64" cy="46" rx="5" ry="6" fill="#000"/>
    <ellipse cx="36" cy="46" rx="3" ry="4" fill="#9900cc"/>
    <ellipse cx="50" cy="42" rx="4" ry="5" fill="#bb00ee"/>
    <ellipse cx="64" cy="46" rx="3" ry="4" fill="#9900cc"/>
    <!-- Tentacles -->
    <path d="M22,55 Q8,65 6,78" stroke="#3a006a" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M30,62 Q20,72 18,84" stroke="#3a006a" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M78,55 Q92,65 94,78" stroke="#3a006a" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M70,62 Q80,72 82,84" stroke="#3a006a" stroke-width="4" fill="none" stroke-linecap="round"/>
    <!-- Psy aura -->
    <ellipse cx="50" cy="45" rx="40" ry="34" fill="none" stroke="#6600aa" stroke-width="1.5" opacity=".25"/>
  </svg>`,

  voidborn_herald: `<svg viewBox="0 0 80 110" xmlns="http://www.w3.org/2000/svg">
    <!-- Shadow base -->
    <ellipse cx="40" cy="102" rx="22" ry="6" fill="#0a0010" opacity=".5"/>
    <!-- Robed body -->
    <path d="M18,105 L12,65 L16,40 L40,36 L64,40 L68,65 L62,105 Z" fill="#0e0020"/>
    <path d="M20,102 L15,66 L18,43 L40,40 L62,43 L65,66 L60,102 Z" fill="#1c0038"/>
    <!-- Void sigil chest -->
    <circle cx="40" cy="68" r="8" fill="none" stroke="#7020cc" stroke-width="1.5" opacity=".6"/>
    <path d="M40,60 L42,68 L40,76 L38,68 Z" fill="#8030dd" opacity=".5"/>
    <path d="M32,68 L40,66 L48,68 L40,70 Z" fill="#8030dd" opacity=".5"/>
    <!-- Head with hood -->
    <ellipse cx="40" cy="28" rx="16" ry="18" fill="#1a0030"/>
    <path d="M24,20 Q22,8 40,4 Q58,8 56,20" fill="#0e0020"/>
    <!-- Hollow glowing face -->
    <ellipse cx="33" cy="26" rx="4.5" ry="5" fill="#5500aa"/>
    <ellipse cx="47" cy="26" rx="4.5" ry="5" fill="#5500aa"/>
    <ellipse cx="33" cy="26" rx="2.5" ry="3" fill="#cc44ff"/>
    <ellipse cx="47" cy="26" rx="2.5" ry="3" fill="#cc44ff"/>
    <!-- Herald staff -->
    <line x1="68" y1="105" x2="74" y2="28" stroke="#5000aa" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="74" cy="25" r="6" fill="#1a004a"/>
    <circle cx="74" cy="25" r="4" fill="#8800dd"/>
    <circle cx="74" cy="25" r="2" fill="#cc66ff"/>
  </svg>`,

  star_eater: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Dark void aura -->
    <circle cx="50" cy="50" r="46" fill="none" stroke="#1a0030" stroke-width="6" opacity=".5"/>
    <!-- Serpentine void body -->
    <path d="M50,14 Q72,14 76,30 Q80,46 68,54 Q80,62 76,78 Q72,92 50,88 Q28,92 24,78 Q20,62 32,54 Q20,46 24,30 Q28,14 50,14 Z" fill="#0c0018"/>
    <path d="M50,18 Q70,18 73,32 Q76,46 65,53 Q76,60 73,74 Q70,86 50,84 Q30,86 27,74 Q24,60 35,53 Q24,46 27,32 Q30,18 50,18 Z" fill="#1a0030"/>
    <!-- Star-eating maw -->
    <ellipse cx="50" cy="52" rx="14" ry="12" fill="#000"/>
    <ellipse cx="50" cy="52" rx="10" ry="8" fill="#0a0018"/>
    <!-- Teeth of void -->
    <path d="M40,44 L42,52 L36,48 L40,56" fill="none" stroke="#4400aa" stroke-width="1.5"/>
    <path d="M60,44 L58,52 L64,48 L60,56" fill="none" stroke="#4400aa" stroke-width="1.5"/>
    <!-- Star-fragment eyes -->
    <circle cx="36" cy="38" r="5" fill="#ffcc00" opacity=".9"/>
    <circle cx="64" cy="38" r="5" fill="#ffcc00" opacity=".9"/>
    <circle cx="36" cy="38" r="3" fill="#ff8800"/>
    <circle cx="64" cy="38" r="3" fill="#ff8800"/>
    <circle cx="36" cy="38" r="1.5" fill="#000"/>
    <circle cx="64" cy="38" r="1.5" fill="#000"/>
    <!-- Consumed star fragments -->
    <circle cx="22" cy="50" r="2" fill="#ffcc00" opacity=".4"/>
    <circle cx="78" cy="50" r="2" fill="#ffcc00" opacity=".4"/>
    <circle cx="50" cy="20" r="1.5" fill="#ffcc00" opacity=".3"/>
    <circle cx="50" cy="82" r="1.5" fill="#ffcc00" opacity=".3"/>
  </svg>`,

  oblivion_wraith: `<svg viewBox="0 0 80 110" xmlns="http://www.w3.org/2000/svg">
    <!-- Wraith trail -->
    <path d="M30,108 Q28,95 32,82" stroke="#3a0070" stroke-width="8" fill="none" stroke-linecap="round" opacity=".4"/>
    <path d="M50,108 Q52,95 48,82" stroke="#3a0070" stroke-width="8" fill="none" stroke-linecap="round" opacity=".4"/>
    <path d="M40,108 Q40,96 40,84" stroke="#4a0090" stroke-width="10" fill="none" stroke-linecap="round" opacity=".5"/>
    <!-- Flowing void body -->
    <path d="M14,82 Q10,55 24,38 Q32,28 40,26 Q48,28 56,38 Q70,55 66,82 Q58,92 40,94 Q22,92 14,82 Z" fill="#140024"/>
    <path d="M18,78 Q15,55 26,41 Q33,32 40,30 Q47,32 54,41 Q65,55 62,78 Q55,88 40,90 Q25,88 18,78 Z" fill="#220040"/>
    <!-- Spectral face: no visible features except eyes -->
    <ellipse cx="40" cy="52" rx="20" ry="22" fill="#1a0030"/>
    <!-- Eyes: pure white voids -->
    <ellipse cx="32" cy="48" rx="5" ry="6" fill="#fff" opacity=".95"/>
    <ellipse cx="48" cy="48" rx="5" ry="6" fill="#fff" opacity=".95"/>
    <ellipse cx="32" cy="48" rx="3" ry="4" fill="#8800ff"/>
    <ellipse cx="48" cy="48" rx="3" ry="4" fill="#8800ff"/>
    <!-- Howling mouth -->
    <ellipse cx="40" cy="58" rx="6" ry="8" fill="#000"/>
    <ellipse cx="40" cy="60" rx="4" ry="5" fill="#0a0018"/>
    <!-- Wisp fragments -->
    <circle cx="16" cy="40" r="3" fill="#6600cc" opacity=".5"/>
    <circle cx="64" cy="40" r="3" fill="#6600cc" opacity=".5"/>
    <circle cx="12" cy="62" r="2" fill="#4400aa" opacity=".4"/>
    <circle cx="68" cy="62" r="2" fill="#4400aa" opacity=".4"/>
  </svg>`,

  null_colossus: `<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg">
    <!-- Massive shadow base -->
    <ellipse cx="60" cy="122" rx="48" ry="8" fill="#0a0010" opacity=".6"/>
    <!-- Golem body — void stone -->
    <rect x="24" y="64" width="72" height="56" rx="6" fill="#0c0018"/>
    <rect x="28" y="68" width="64" height="50" rx="4" fill="#180028"/>
    <!-- Chest crack glowing -->
    <path d="M60,76 L56,92 L60,108 L64,92 Z" fill="none" stroke="#5500cc" stroke-width="2.5" opacity=".7"/>
    <path d="M44,84 L76,84" fill="none" stroke="#3300aa" stroke-width="1.5" opacity=".5"/>
    <!-- Head -->
    <rect x="34" y="34" width="52" height="34" rx="5" fill="#130022"/>
    <rect x="38" y="38" width="44" height="28" rx="3" fill="#1e0034"/>
    <!-- Eyes: massive void panels -->
    <rect x="40" y="43" width="16" height="10" rx="2" fill="#6600cc"/>
    <rect x="64" y="43" width="16" height="10" rx="2" fill="#6600cc"/>
    <rect x="42" y="45" width="12" height="6" rx="1" fill="#bb44ff"/>
    <rect x="66" y="45" width="12" height="6" rx="1" fill="#bb44ff"/>
    <!-- Void mouth slit -->
    <rect x="46" y="57" width="28" height="4" rx="2" fill="#3300aa"/>
    <!-- Arms — massive blocks -->
    <rect x="2" y="70" width="24" height="44" rx="4" fill="#0e0020"/>
    <rect x="4" y="72" width="20" height="40" rx="3" fill="#1a0030"/>
    <rect x="94" y="70" width="24" height="44" rx="4" fill="#0e0020"/>
    <rect x="96" y="72" width="20" height="40" rx="3" fill="#1a0030"/>
    <!-- Fist void aura -->
    <circle cx="14" cy="118" r="8" fill="none" stroke="#6600cc" stroke-width="2" opacity=".4"/>
    <circle cx="106" cy="118" r="8" fill="none" stroke="#6600cc" stroke-width="2" opacity=".4"/>
    <!-- Null rune on chest -->
    <circle cx="60" cy="90" r="10" fill="none" stroke="#4400aa" stroke-width="1.5" opacity=".5"/>
    <text x="60" y="94" font-size="10" fill="#6600cc" text-anchor="middle" opacity=".6">∅</text>
  </svg>`,

  rift_architect: `<svg viewBox="0 0 90 110" xmlns="http://www.w3.org/2000/svg">
    <!-- Reality fractures behind figure -->
    <line x1="0" y1="30" x2="20" y2="55" stroke="#4400aa" stroke-width="1.5" opacity=".4"/>
    <line x1="90" y1="30" x2="70" y2="55" stroke="#4400aa" stroke-width="1.5" opacity=".4"/>
    <line x1="0" y1="80" x2="18" y2="70" stroke="#3300aa" stroke-width="1" opacity=".3"/>
    <line x1="90" y1="80" x2="72" y2="70" stroke="#3300aa" stroke-width="1" opacity=".3"/>
    <!-- Body: geometric void form -->
    <polygon points="45,8 68,28 68,72 45,86 22,72 22,28" fill="#0e001e"/>
    <polygon points="45,12 65,30 65,70 45,82 25,70 25,30" fill="#1c0034"/>
    <!-- Geometric eye: single center -->
    <polygon points="45,42 52,49 45,56 38,49" fill="#000"/>
    <polygon points="45,44 50,49 45,54 40,49" fill="#7700cc"/>
    <polygon points="45,46 48,49 45,52 42,49" fill="#cc44ff"/>
    <!-- Blueprint lines on body -->
    <line x1="30" y1="35" x2="60" y2="35" stroke="#4400aa" stroke-width="1" opacity=".5"/>
    <line x1="30" y1="65" x2="60" y2="65" stroke="#4400aa" stroke-width="1" opacity=".5"/>
    <line x1="30" y1="35" x2="30" y2="65" stroke="#4400aa" stroke-width="1" opacity=".5"/>
    <line x1="60" y1="35" x2="60" y2="65" stroke="#4400aa" stroke-width="1" opacity=".5"/>
    <!-- Arms: extending fractured limbs -->
    <line x1="22" y1="45" x2="4" y2="40" stroke="#2a0050" stroke-width="4" stroke-linecap="round"/>
    <line x1="4" y1="40" x2="0" y2="55" stroke="#2a0050" stroke-width="3" stroke-linecap="round"/>
    <line x1="68" y1="45" x2="86" y2="40" stroke="#2a0050" stroke-width="4" stroke-linecap="round"/>
    <line x1="86" y1="40" x2="90" y2="55" stroke="#2a0050" stroke-width="3" stroke-linecap="round"/>
    <!-- Legs -->
    <line x1="35" y1="82" x2="30" y2="105" stroke="#160028" stroke-width="8" stroke-linecap="round"/>
    <line x1="55" y1="82" x2="60" y2="105" stroke="#160028" stroke-width="8" stroke-linecap="round"/>
  </svg>`,

  abyssal_god: `<svg viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg">
    <!-- Outer void rings -->
    <ellipse cx="80" cy="90" rx="78" ry="78" fill="none" stroke="#1a0030" stroke-width="3" opacity=".3"/>
    <ellipse cx="80" cy="90" rx="66" ry="66" fill="none" stroke="#2a0050" stroke-width="2" opacity=".3"/>
    <!-- Cosmic tear behind body -->
    <ellipse cx="80" cy="90" rx="45" ry="55" fill="#04000e" opacity=".9"/>
    <path d="M44,50 Q80,20 116,50 L116,130 Q80,160 44,130 Z" fill="#07001a" opacity=".8"/>
    <!-- Massive void body -->
    <ellipse cx="80" cy="90" rx="40" ry="50" fill="#0c001e"/>
    <ellipse cx="80" cy="88" rx="36" ry="46" fill="#140030"/>
    <!-- Cosmic texture: void cracks -->
    <path d="M60,65 L70,80 L60,95" fill="none" stroke="#3300aa" stroke-width="2" opacity=".6"/>
    <path d="M100,65 L90,80 L100,95" fill="none" stroke="#3300aa" stroke-width="2" opacity=".6"/>
    <path d="M70,108 Q80,118 90,108" fill="none" stroke="#5500cc" stroke-width="2" opacity=".5"/>
    <!-- The great eye — center of the god -->
    <ellipse cx="80" cy="80" rx="22" ry="18" fill="#000"/>
    <ellipse cx="80" cy="80" rx="16" ry="12" fill="#08001a"/>
    <ellipse cx="80" cy="80" rx="10" ry="8" fill="#4400cc"/>
    <ellipse cx="80" cy="80" rx="6" ry="5" fill="#9900ff"/>
    <ellipse cx="80" cy="80" rx="3" ry="2.5" fill="#dd66ff"/>
    <circle  cx="80" cy="80" r="1.5" fill="#fff"/>
    <!-- Eye lids -->
    <path d="M58,80 Q80,64 102,80" fill="none" stroke="#1a0040" stroke-width="3"/>
    <path d="M58,80 Q80,96 102,80" fill="none" stroke="#1a0040" stroke-width="3"/>
    <!-- Smaller orbiting eyes -->
    <circle cx="46" cy="62" r="6" fill="#000"/>
    <circle cx="46" cy="62" r="4" fill="#6600aa"/>
    <circle cx="46" cy="62" r="2" fill="#cc44ff"/>
    <circle cx="114" cy="62" r="6" fill="#000"/>
    <circle cx="114" cy="62" r="4" fill="#6600aa"/>
    <circle cx="114" cy="62" r="2" fill="#cc44ff"/>
    <circle cx="46" cy="112" r="5" fill="#000"/>
    <circle cx="46" cy="112" r="3" fill="#4400aa"/>
    <circle cx="114" cy="112" r="5" fill="#000"/>
    <circle cx="114" cy="112" r="3" fill="#4400aa"/>
    <!-- Tentacle appendages -->
    <path d="M44,75 Q20,65 8,75 Q0,82 8,92" stroke="#1e0038" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M44,100 Q22,110 12,125" stroke="#1e0038" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M116,75 Q140,65 152,75 Q160,82 152,92" stroke="#1e0038" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M116,100 Q138,110 148,125" stroke="#1e0038" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M64,130 Q60,150 52,165" stroke="#1e0038" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M96,130 Q100,150 108,165" stroke="#1e0038" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M80,135 L80,168" stroke="#220040" stroke-width="7" fill="none" stroke-linecap="round"/>
    <!-- Void pulse aura -->
    <ellipse cx="80" cy="90" rx="55" ry="65" fill="none" stroke="#5500cc" stroke-width="1.5" opacity=".2"/>
    <ellipse cx="80" cy="90" rx="50" ry="60" fill="none" stroke="#7700ee" stroke-width="1" opacity=".15"/>
    <!-- Stars being consumed -->
    <circle cx="28" cy="30" r="2" fill="#ffcc88" opacity=".5"/>
    <circle cx="132" cy="28" r="2" fill="#ffcc88" opacity=".5"/>
    <circle cx="18" cy="100" r="1.5" fill="#ffcc88" opacity=".4"/>
    <circle cx="142" cy="100" r="1.5" fill="#ffcc88" opacity=".4"/>
    <circle cx="55" cy="16" r="1.5" fill="#ffcc88" opacity=".3"/>
    <circle cx="108" cy="16" r="1.5" fill="#ffcc88" opacity=".3"/>
  </svg>`,
};
