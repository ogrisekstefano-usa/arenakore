/**
 * ARENAKORE — THEME TEST CHICAGO
 * React Native (native) typography override.
 * Completely reversible: set THEME_TEST_ACTIVE = false to restore defaults.
 *
 * Usage in any component:
 *   import { T, THEME_TEST_ACTIVE } from '../utils/themeOverride';
 *   <Text style={[s.someStyle, T.body]}>...</Text>
 */
import { StyleSheet, Platform } from 'react-native';

// ── TOGGLE: set to false to instantly revert all overrides
export const THEME_TEST_ACTIVE = true;

// ── FONT STACK (platform-appropriate Inter/Roboto)
const FONT_BODY   = Platform.select({ ios: 'System', android: 'Roboto',    default: 'Inter, Roboto, sans-serif' });
const FONT_TITLE  = Platform.select({ ios: 'System', android: 'Roboto',    default: 'Inter, Roboto, sans-serif' });

// ── THEME OVERRIDE STYLES
// These supplement (not replace) existing styles.
// Apply with: [existingStyle, T.body] — the T.body overrides only what it declares.
export const T = THEME_TEST_ACTIVE ? StyleSheet.create({
  /** Body text — Inter/Roboto 16px, lineHeight 1.7, weight 400 */
  body: {
    fontFamily:    FONT_BODY,
    fontSize:      16,
    lineHeight:    27,          // 16 × 1.7 ≈ 27
    fontWeight:    '400',
    letterSpacing: 0.3,
  },

  /** Medium body — 16px weight 500 */
  bodyMed: {
    fontFamily:    FONT_BODY,
    fontSize:      16,
    lineHeight:    26,
    fontWeight:    '500',
    letterSpacing: 0.3,
  },

  /** Description / caption — 14px weight 400 */
  desc: {
    fontFamily:    FONT_BODY,
    fontSize:      14,
    lineHeight:    24,
    fontWeight:    '400',
    letterSpacing: 0.25,
  },

  /** Uppercase label (ALL-CAPS, tight spaced) */
  label: {
    fontFamily:    FONT_TITLE,
    fontSize:      10,
    fontWeight:    '700',
    letterSpacing: 1.5,
  },

  /** Uppercase instruction text (beat exercises, scanner) */
  instruction: {
    fontFamily:    FONT_TITLE,
    fontSize:      18,
    fontWeight:    '700',
    letterSpacing: 1.5,
    lineHeight:    28,
  },

  /** Button text */
  button: {
    fontFamily:    FONT_TITLE,
    fontSize:      14,
    fontWeight:    '900',
    letterSpacing: 2.0,
  },

  /** Title large */
  titleLg: {
    fontFamily:    FONT_TITLE,
    fontSize:      40,
    fontWeight:    '900',
    letterSpacing: 0.5,
    lineHeight:    46,
  },

  /** +2px size bump for readability at distance */
  scaleUp: {
    fontSize:      18,          // instead of 16
    lineHeight:    28,
  },

}) : StyleSheet.create({
  // ── INACTIVE: empty overrides — no visual change
  body: {}, bodyMed: {}, desc: {}, label: {},
  instruction: {}, button: {}, titleLg: {}, scaleUp: {},
});

// ── CONVENIENCE: apply override only when active
export function applyTheme<T extends object>(base: T, override: Partial<T>): T {
  if (!THEME_TEST_ACTIVE) return base;
  return { ...base, ...override };
}
