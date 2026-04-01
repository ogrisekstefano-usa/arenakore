/**
 * NÈXUS COMMAND CENTER — Theme System v2
 * Plus Jakarta Sans (titles) + Montserrat (body)
 * Dual-theme: OLED Dark + Titanium Light
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Platform } from 'react-native';

export type ThemeMode = 'dark' | 'light';

export const THEMES = {
  dark: {
    mode: 'dark' as ThemeMode,
    // Backgrounds
    bg:          '#000000',
    surface:     '#0A0A0A',
    surface2:    '#111111',
    surface3:    '#161616',
    // Borders
    border:      'rgba(255,255,255,0.07)',
    border2:     'rgba(255,255,255,0.12)',
    // Text
    text:        '#FFFFFF',
    textSec:     'rgba(255,255,255,0.55)',
    textTer:     'rgba(255,255,255,0.25)',
    // Accents
    accent:      '#00F2FF',
    accentGold:  '#D4AF37',
    accentRed:   '#FF453A',
    accentGreen: '#34C759',
    // Navigation
    shadow:      'rgba(0,0,0,0.6)',
    navBg:       '#050505',
    navBorder:   'rgba(255,255,255,0.05)',
    inputBg:     'rgba(255,255,255,0.04)',
    cardBg:      '#0A0A0A',
    cardBorder:  'rgba(255,255,255,0.07)',
    positive:    '#34C759',
    negative:    '#FF453A',
    // Typography system
    titleColor:  '#FFFFFF',
    cardRadius:  12,
    cardShadow:  false,
    cardShadowCss: 'none',
  },
  light: {
    mode: 'light' as ThemeMode,
    // Backgrounds — Titanium palette
    bg:          '#F4F4F4',
    surface:     '#FFFFFF',
    surface2:    '#F0F0F0',
    surface3:    '#E8E8E8',
    // Borders — defined, not fuzzy
    border:      '#D1D5DB',
    border2:     '#C1C5CB',
    // Text — absolute black for titles
    text:        '#111111',
    textSec:     '#4B5563',
    textTer:     '#9CA3AF',
    // Accents — Steel Blue palette
    accent:      '#1D4ED8',
    accentGold:  '#92400E',
    accentRed:   '#DC2626',
    accentGreen: '#15803D',
    // Navigation
    shadow:      'rgba(0,0,0,0.08)',
    navBg:       '#FFFFFF',
    navBorder:   '#E5E7EB',
    inputBg:     '#F9FAFB',
    cardBg:      '#FFFFFF',
    cardBorder:  '#D1D5DB',
    positive:    '#15803D',
    negative:    '#DC2626',
    // Typography system — light mode boosts
    titleColor:  '#000000',   // Absolute black for H1/H2
    cardRadius:  16,          // 1rem = rounded-2xl
    cardShadow:  true,
    cardShadowCss: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
  },
};

export type Theme = typeof THEMES.dark;

// ── Font size scale (+2px for light mode) ────────────────────────────────────
export const fz = (base: number, mode: ThemeMode): number =>
  mode === 'light' ? base + 2 : base;

// ── FONT HELPERS ──────────────────────────────────────────────────────────────

/**
 * PJS — Plus Jakarta Sans 800
 * For: H1, H2, Widget Titles, KPI Values
 * Style: editorial, compact (-0.02em letter-spacing)
 */
export const PJS = (extra?: object): any =>
  Platform.select({
    web: {
      fontFamily: `'Plus Jakarta Sans', 'Montserrat', sans-serif`,
      fontWeight: '800',
      letterSpacing: '-0.02em',
      ...extra,
    },
    default: { fontWeight: '800', ...extra },
  });

/**
 * MONT — Montserrat (replaces previous INTER helper for body text)
 * weight 400 = normal body, 600 = medium emphasis
 */
export const MONT = (weight: '300' | '400' | '500' | '600' | '700' | '900' = '400'): any =>
  Platform.select({
    web: {
      fontFamily: `'Montserrat', 'Inter', -apple-system, sans-serif`,
      fontWeight: weight,
    },
    default: { fontWeight: weight },
  });

/**
 * INTER — kept for backwards compatibility, maps to Montserrat
 */
export const INTER = (weight: '300' | '400' | '500' | '600' = '400'): any =>
  MONT(weight);

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
