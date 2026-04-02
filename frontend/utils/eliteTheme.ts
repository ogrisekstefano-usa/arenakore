/**
 * ARENAKORE — ELITE STYLE GUIDE v2.0 (Apple Fitness Minimalism)
 * ═══════════════════════════════════════════════════════════════
 * TYPOGRAPHY: Montserrat 500 (labels) + Plus Jakarta Sans 800 (values)
 * PALETTE: OLED Black + #121212 Cards
 * ACCENTS: Apple Semantic Colors
 * LAYOUT: Functional Minimalism
 */
import { Platform, TextStyle, ViewStyle } from 'react-native';

// ══════════════════════════════════════════════════════════════
// 1. PALETTE — Apple Fitness Inspired
// ══════════════════════════════════════════════════════════════
export const EL = {
  // Backgrounds
  BG:            '#000000',    // OLED Black
  CARD_BG:       '#121212',    // Functional Card surface
  SURFACE_2:     '#1C1C1E',    // iOS system gray 6
  SURFACE_3:     '#2C2C2E',    // iOS system gray 5

  // Borders
  BORDER:        'rgba(255,255,255,0.06)',
  BORDER_FOCUS:  '#007AFF',

  // Semantic Tag Colors (Apple Palette)
  POWER:         '#FF3B30',    // Apple Red
  PULSE:         '#007AFF',    // Apple Blue
  FLOW:          '#34C759',    // Apple Green

  // Utility Accents
  CYAN:          '#00E5FF',    // FLUX brand accent
  GOLD:          '#FFD700',    // Achievement / Premium
  ORANGE:        '#FF9500',    // Warning / Live
  RED:           '#FF3B30',    // Error / Danger

  // Fills (12% opacity)
  POWER_12:      'rgba(255,59,48,0.12)',
  PULSE_12:      'rgba(0,122,255,0.12)',
  FLOW_12:       'rgba(52,199,89,0.12)',
  CYAN_12:       'rgba(0,229,255,0.12)',

  // Text
  TEXT:           '#FFFFFF',
  TEXT_SEC:       '#8E8E93',     // Apple system gray
  TEXT_TER:       'rgba(255,255,255,0.30)',
  LABEL_COLOR:   '#8E8E93',     // Parameter labels
  BODY_COLOR:    '#AEAEB2',     // Body text

  // Layout
  SCREEN_MARGIN: 20,
  RADIUS_CARD:   16,
  RADIUS_BTN:    12,
  RADIUS_PILL:   20,
} as const;

// ══════════════════════════════════════════════════════════════
// 2. FONT FAMILIES
// ══════════════════════════════════════════════════════════════

/** Montserrat — Structure, Labels, Navigation */
export const FONT_MONT = Platform.select({
  web: `'Montserrat', -apple-system, sans-serif`,
  default: undefined,
}) as string | undefined;

/** Plus Jakarta Sans — Data Values, Numbers, Hero Metrics */
export const FONT_JAKARTA = Platform.select({
  web: `'Plus Jakarta Sans', 'Montserrat', -apple-system, sans-serif`,
  default: undefined,
}) as string | undefined;

// ══════════════════════════════════════════════════════════════
// 3. TYPOGRAPHY SYSTEM
// ══════════════════════════════════════════════════════════════

/** Screen Title: Montserrat 800, 28px, left-aligned */
export const T_SCREEN_TITLE: TextStyle = {
  fontFamily: FONT_MONT,
  fontWeight: '800',
  fontSize: 28,
  letterSpacing: 0.5,
  color: EL.TEXT,
};

/** Section Title: Montserrat 700, 18px */
export const T_SECTION: TextStyle = {
  fontFamily: FONT_MONT,
  fontWeight: '700',
  fontSize: 18,
  letterSpacing: 0.3,
  color: EL.TEXT,
};

/** Parameter Label: Montserrat 500, 12px, Grey */
export const T_PARAM_LABEL: TextStyle = {
  fontFamily: FONT_MONT,
  fontWeight: '500',
  fontSize: 12,
  color: EL.LABEL_COLOR,
  letterSpacing: 0.3,
};

/** Data Value (Hero): Plus Jakarta Sans 800, 32px, White */
export const T_DATA_HERO: TextStyle = {
  fontFamily: FONT_JAKARTA,
  fontWeight: '800',
  fontSize: 32,
  color: EL.TEXT,
};

/** Data Value (Standard): Plus Jakarta Sans 800, 24px, White */
export const T_DATA_STD: TextStyle = {
  fontFamily: FONT_JAKARTA,
  fontWeight: '800',
  fontSize: 24,
  color: EL.TEXT,
};

/** Data Value (Small): Plus Jakarta Sans 700, 16px, White */
export const T_DATA_SM: TextStyle = {
  fontFamily: FONT_JAKARTA,
  fontWeight: '700',
  fontSize: 16,
  color: EL.TEXT,
};

/** Body Text: Montserrat 400, 14px */
export const T_BODY: TextStyle = {
  fontFamily: FONT_MONT,
  fontWeight: '400',
  fontSize: 14,
  color: EL.BODY_COLOR,
};

/** Button CTA: Montserrat 700, 15px */
export const T_CTA: TextStyle = {
  fontFamily: FONT_MONT,
  fontWeight: '700',
  fontSize: 15,
  letterSpacing: 0.5,
  color: '#000000',
};

/** Label/Caption: Montserrat 600, 11px */
export const T_LABEL: TextStyle = {
  fontFamily: FONT_MONT,
  fontWeight: '600',
  fontSize: 11,
  letterSpacing: 0.5,
  color: EL.TEXT_SEC,
};

// Legacy exports for backwards compat
export const T_HERO = T_DATA_HERO;
export const T_HUD: TextStyle = { ...T_DATA_HERO, fontSize: 72 };

// ══════════════════════════════════════════════════════════════
// 4. CARD STYLES — Functional Cards (#121212)
// ══════════════════════════════════════════════════════════════
export const CARD_BASE: ViewStyle = {
  backgroundColor: EL.CARD_BG,
  borderRadius: EL.RADIUS_CARD,
  padding: 16,
};

export const CARD_STD: ViewStyle = {
  backgroundColor: EL.CARD_BG,
  borderRadius: EL.RADIUS_CARD,
  padding: 14,
};
