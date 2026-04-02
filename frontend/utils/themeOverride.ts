/**
 * ARENAKORE — THEME OVERRIDE (Montserrat System)
 * Single font system: Montserrat 300/400/500/700/800
 */
import { StyleSheet, Platform } from 'react-native';

export const THEME_TEST_ACTIVE = true;

// ── FONT STACK: Montserrat Only ──
const FONT_BODY  = Platform.select({ ios: 'System', android: 'System', default: "'Montserrat', -apple-system, sans-serif" });
const FONT_TITLE = Platform.select({ ios: 'System', android: 'System', default: "'Montserrat', -apple-system, sans-serif" });

export const T = THEME_TEST_ACTIVE ? StyleSheet.create({
  /** Body text — Montserrat 400/500, 16px */
  body: {
    fontFamily:    FONT_BODY,
    fontSize:      16,
    lineHeight:    26,
    fontWeight:    '400',
    letterSpacing: 0.2,
  },
  /** Title — Montserrat 800, letter-spacing: -0.01em */
  title: {
    fontFamily:    FONT_TITLE,
    fontSize:      28,
    lineHeight:    34,
    fontWeight:    '800',
    letterSpacing: -0.3,
  },
  /** Heading — Montserrat 700 */
  heading: {
    fontFamily:    FONT_TITLE,
    fontSize:      20,
    lineHeight:    26,
    fontWeight:    '700',
    letterSpacing: -0.2,
  },
  /** Caption — Montserrat 500 */
  caption: {
    fontFamily:    FONT_BODY,
    fontSize:      12,
    lineHeight:    16,
    fontWeight:    '500',
    letterSpacing: 0.5,
  },
  /** Label/Overline — Montserrat 800, small caps feel */
  label: {
    fontFamily:    FONT_BODY,
    fontSize:      11,
    fontWeight:    '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
}) : {
  body: {}, title: {}, heading: {}, caption: {}, label: {},
};

/** MONT helper — returns Montserrat fontFamily for web */
export const MONT_WEB: any = Platform.select({
  web: { fontFamily: "'Montserrat', -apple-system, sans-serif" },
  default: {},
});
