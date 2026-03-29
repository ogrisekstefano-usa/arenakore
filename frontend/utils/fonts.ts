/**
 * ARENAKORE — FONT UTILITY
 * Provides Inter font styles for BODY TEXT ONLY.
 * Titles, buttons, icons, badge numbers — NOT affected.
 *
 * Usage:
 *   import { F } from '../utils/fonts';
 *   <Text style={[s.myStyle, F.body]}>Testo leggibile</Text>
 *
 * To disable: set INTER_ENABLED = false → all F.* return {}
 */
import { Platform } from 'react-native';

// ── Toggle
const INTER_ENABLED = true;

// ── Font names (loaded in _layout.tsx via useFonts)
const INTER_400 = 'Inter_400Regular';
const INTER_500 = 'Inter_500Medium';
const INTER_600 = 'Inter_600SemiBold';
const INTER_700 = 'Inter_700Bold';

// On native, use loaded Inter.  On web, use CSS stack (font is system).
const bodyStack = Platform.select({
  ios:     INTER_500,
  android: INTER_500,
  default: undefined,   // web: inherits from CSS font-stack
});

const descStack = Platform.select({
  ios:     INTER_400,
  android: INTER_400,
  default: undefined,
});

// ── Exported style objects
// Apply with: [existingStyle, F.body]
// They OVERRIDE only fontFamily + letterSpacing. Everything else (size, color, weight) is preserved.
export const F = INTER_ENABLED ? {
  /** Body / description text: Inter Regular, light spacing */
  body: {
    fontFamily:    bodyStack,
    letterSpacing: 0.15,
  },

  /** Medium weight body text */
  bodyMed: {
    fontFamily:    INTER_500,
    letterSpacing: 0.15,
  },

  /** Caption / label text: small spacing */
  caption: {
    fontFamily:    descStack,
    letterSpacing: 0.3,
  },

  /** Uppercase instruction text: spacing that "stacca" letters */
  instruction: {
    fontFamily:    INTER_700,
    letterSpacing: 1.5,
  },

  /** Form descriptions: readable weight, slight spacing */
  formDesc: {
    fontFamily:    bodyStack,
    fontWeight:    '500' as const,
    letterSpacing: 0.2,
    lineHeight:    22,
  },
} : {
  // ── DISABLED: no-op (returns empty objects — no visual change)
  body: {}, bodyMed: {}, caption: {}, instruction: {}, formDesc: {},
};
