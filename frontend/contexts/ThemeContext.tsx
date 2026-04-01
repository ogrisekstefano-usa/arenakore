/**
 * NÈXUS COMMAND CENTER — Theme System
 * Dual-theme: OLED Dark + Titanium Light
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Platform } from 'react-native';

export type ThemeMode = 'dark' | 'light';

export const THEMES = {
  dark: {
    mode: 'dark' as ThemeMode,
    bg:          '#000000',
    surface:     '#0A0A0A',
    surface2:    '#111111',
    surface3:    '#161616',
    border:      'rgba(255,255,255,0.07)',
    border2:     'rgba(255,255,255,0.12)',
    text:        '#FFFFFF',
    textSec:     'rgba(255,255,255,0.55)',
    textTer:     'rgba(255,255,255,0.25)',
    accent:      '#00F2FF',       // Cyan Neon
    accentGold:  '#D4AF37',       // Gold
    accentRed:   '#FF453A',       // Red
    accentGreen: '#34C759',       // Green
    shadow:      'rgba(0,0,0,0.6)',
    navBg:       '#050505',
    navBorder:   'rgba(255,255,255,0.05)',
    inputBg:     'rgba(255,255,255,0.04)',
    cardBg:      '#0A0A0A',
    cardBorder:  'rgba(255,255,255,0.07)',
    positive:    '#34C759',
    negative:    '#FF453A',
  },
  light: {
    mode: 'light' as ThemeMode,
    bg:          '#F4F4F4',
    surface:     '#FFFFFF',
    surface2:    '#ECECEC',
    surface3:    '#E4E4E4',
    border:      'rgba(0,0,0,0.08)',
    border2:     'rgba(0,0,0,0.14)',
    text:        '#0A0A0A',
    textSec:     'rgba(0,0,0,0.55)',
    textTer:     'rgba(0,0,0,0.35)',
    accent:      '#2563EB',       // Steel Blue
    accentGold:  '#B8860B',       // Dark Gold
    accentRed:   '#DC2626',       // Red
    accentGreen: '#16A34A',       // Green
    shadow:      'rgba(0,0,0,0.12)',
    navBg:       '#FFFFFF',
    navBorder:   'rgba(0,0,0,0.08)',
    inputBg:     'rgba(0,0,0,0.04)',
    cardBg:      '#FFFFFF',
    cardBorder:  'rgba(0,0,0,0.08)',
    positive:    '#16A34A',
    negative:    '#DC2626',
  },
};

export type Theme = typeof THEMES.dark;

// ── Font helpers ─────────────────────────────────────────────────────────────
export const MONT = (weight: '400' | '700' | '900' = '900'): any =>
  Platform.select({
    web: { fontFamily: `'Montserrat', 'Inter', sans-serif`, fontWeight: weight },
    default: { fontWeight: weight },
  });

export const INTER = (weight: '300' | '400' | '500' = '400'): any =>
  Platform.select({
    web: { fontFamily: `'Inter', -apple-system, sans-serif`, fontWeight: weight },
    default: { fontWeight: weight },
  });

// ── Context ───────────────────────────────────────────────────────────────────
interface ThemeCtx {
  theme: Theme;
  mode: ThemeMode;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: THEMES.dark,
  mode: 'dark',
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const toggle = useCallback(() => setMode(m => m === 'dark' ? 'light' : 'dark'), []);
  return (
    <Ctx.Provider value={{ theme: THEMES[mode], mode, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() { return useContext(Ctx); }
