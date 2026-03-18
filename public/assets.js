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
};
