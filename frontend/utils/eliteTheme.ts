/**
 * ARENAKORE — ELITE STYLE GUIDE v1.0
 * ═══════════════════════════════════════════════════════════════
 * "Blocco di granito nero con dati laser Cyan e Gold"
 *
 * TYPOGRAPHY: Montserrat 900 Dominance
 * PALETTE: OLED Black Pure
 * ACCENTS: Regola dei 22/44
 * LAYOUT: Brutalist
 */
import { Platform, TextStyle, ViewStyle } from 'react-native';

// ══════════════════════════════════════════════════════════════
// 1. PALETTE OLED & SUPERFICI
// ══════════════════════════════════════════════════════════════
export const EL = {
  // Backgrounds
  BG:            '#000000',   // OLED Black puro
  CARD_BG:       '#0a0a0a',   // Profondità minima
  SURFACE_2:     '#111111',
  SURFACE_3:     '#161616',

  // Borders
  BORDER:        'rgba(255,255,255,0.07)',  // Sottilissimi, 1px
  BORDER_FOCUS:  '#00E5FF',                  // Cyan solido 2px

  // Accenti principali
  CYAN:          '#00E5FF',
  GOLD:          '#FFD700',
  GREEN:         '#00FF87',
  RED:           '#FF3B30',
  ORANGE:        '#FF6B00',

  // Accenti fill (13% — suffisso '22')
  CYAN_22:       '#00E5FF22',
  GOLD_22:       '#FFD70022',
  GREEN_22:      '#00FF8722',
  RED_22:        '#FF3B3022',
  ORANGE_22:     '#FF6B0022',

  // Accenti bordi soft (27% — suffisso '44')
  CYAN_44:       '#00E5FF44',
  GOLD_44:       '#FFD70044',
  GREEN_44:      '#00FF8744',
  RED_44:        '#FF3B3044',
  ORANGE_44:     '#FF6B0044',

  // Testo
  TEXT:          '#FFFFFF',
  TEXT_SEC:      '#AAAAAA',       // 67% opacità
  TEXT_TER:      'rgba(255,255,255,0.30)',
  BODY_COLOR:    '#AAAAAA',       // Body text

  // Layout Brutalist
  SCREEN_MARGIN: 24,
  RADIUS_MAIN:   20,    // card principali
  RADIUS_STD:    16,    // card standard
  RADIUS_BTN:    12,    // bottoni
} as const;

// ══════════════════════════════════════════════════════════════
// 2. SISTEMA TIPOGRAFICO (Montserrat 900 Dominance)
// ══════════════════════════════════════════════════════════════

const MONT_FAMILY = Platform.select({
  web: `'Montserrat', -apple-system, sans-serif`,
  default: undefined,
});

/** Titoli Hero/Brand: 900 Black, 42px, LS 4 */
export const T_HERO: TextStyle = {
  fontFamily: MONT_FAMILY,
  fontWeight: '900',
  fontSize: 42,
  letterSpacing: 4,
  color: EL.TEXT,
};

/** Titoli Schermata: 900 Black, 32px, LS 8 (Monumentale) */
export const T_SCREEN: TextStyle = {
  fontFamily: MONT_FAMILY,
  fontWeight: '900',
  fontSize: 32,
  letterSpacing: 8,
  color: EL.TEXT,
};

/** Titoli Sezione/Card: 900 Black, 18-20px, LS 2-4 */
export const T_SECTION: TextStyle = {
  fontFamily: MONT_FAMILY,
  fontWeight: '900',
  fontSize: 18,
  letterSpacing: 3,
  color: EL.TEXT,
};

/** Numeri Atletici (HUD): 800 ExtraBold, 96px, LH 100 */
export const T_HUD: TextStyle = {
  fontFamily: MONT_FAMILY,
  fontWeight: '800',
  fontSize: 96,
  lineHeight: 100,
  color: EL.TEXT,
};

/** Bottoni CTA: 800 ExtraBold, 14-18px, LS 3 */
export const T_CTA: TextStyle = {
  fontFamily: MONT_FAMILY,
  fontWeight: '800',
  fontSize: 14,
  letterSpacing: 3,
  color: '#050505',
};

/** Body Testo: 400 Regular, 13-15px, Colore #AAAAAA */
export const T_BODY: TextStyle = {
  fontFamily: MONT_FAMILY,
  fontWeight: '400',
  fontSize: 14,
  color: EL.BODY_COLOR,
};

/** Label/Caption: 900, 10-11px, LS 2-3 */
export const T_LABEL: TextStyle = {
  fontFamily: MONT_FAMILY,
  fontWeight: '900',
  fontSize: 10,
  letterSpacing: 2,
  color: EL.TEXT_SEC,
};

// ══════════════════════════════════════════════════════════════
// 3. CARD BASE STYLE
// ══════════════════════════════════════════════════════════════
export const CARD_BASE: ViewStyle = {
  backgroundColor: EL.CARD_BG,
  borderRadius: EL.RADIUS_MAIN,
  borderWidth: 1,
  borderColor: EL.BORDER,
};

export const CARD_STD: ViewStyle = {
  backgroundColor: EL.CARD_BG,
  borderRadius: EL.RADIUS_STD,
  borderWidth: 1,
  borderColor: EL.BORDER,
};
