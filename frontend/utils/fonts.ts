/**
 * ARENAKORE — Font System (Montserrat Only)
 * ═══════════════════════════════════════════════════════════════
 * Montserrat 300/400/500/700/800 — geometric, clean, Nike-grade
 * All other fonts have been purged.
 */
import { Platform, TextStyle } from 'react-native';

const FAMILY = Platform.select({
  web: "'Montserrat', -apple-system, sans-serif",
  default: undefined,
});

/** Body text — Montserrat 400, 14px */
export const F: Record<string, TextStyle> = {
  body:      { fontFamily: FAMILY, fontWeight: '400', fontSize: 14 },
  bodyMed:   { fontFamily: FAMILY, fontWeight: '500', fontSize: 14 },
  bodyBold:  { fontFamily: FAMILY, fontWeight: '700', fontSize: 14 },
  title:     { fontFamily: FAMILY, fontWeight: '800', fontSize: 20, letterSpacing: -0.2 },
  hero:      { fontFamily: FAMILY, fontWeight: '800', fontSize: 32, letterSpacing: -0.3 },
  caption:   { fontFamily: FAMILY, fontWeight: '500', fontSize: 12, letterSpacing: 0.5 },
  label:     { fontFamily: FAMILY, fontWeight: '800', fontSize: 11, letterSpacing: 2 },
  cta:       { fontFamily: FAMILY, fontWeight: '800', fontSize: 14, letterSpacing: 3 },
  data:      { fontFamily: FAMILY, fontWeight: '700', fontSize: 16 },
  number:    { fontFamily: FAMILY, fontWeight: '800', fontSize: 24, letterSpacing: -0.5 },
  overline:  { fontFamily: FAMILY, fontWeight: '800', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const },

  // Backwards compat
  bodyRegular: { fontFamily: FAMILY, fontWeight: '400' },
  input: { fontFamily: FAMILY, fontWeight: '400', fontSize: 16 },
  validated: {}, caption2: {}, instruction: {}, formDesc: {},
};
