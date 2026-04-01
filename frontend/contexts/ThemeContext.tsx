/**
 * NÈXUS COMMAND CENTER — Theme System v2.1
 * Typography: Montserrat (tutti i pesi) — geometric, clean, Nike-ready
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
    border:      '#1F2937',          // precisione cromatica, non rgba fuzzy
    border2:     'rgba(255,255,255,0.12)',
    text:        '#FFFFFF',
    textSec:     'rgba(255,255,255,0.60)',
    textTer:     'rgba(255,255,255,0.30)',
    accent:      '#00F2FF',
    accentGold:  '#D4AF37',
    accentRed:   '#FF453A',
    accentGreen: '#34C759',
    shadow:      'rgba(0,0,0,0.6)',
    navBg:       '#050505',
    navBorder:   '#1F2937',
    inputBg:     'rgba(255,255,255,0.04)',
    cardBg:      '#0A0A0A',
    cardBorder:  '#1F2937',
    positive:    '#34C759',
    negative:    '#FF453A',
    titleColor:  '#FFFFFF',
    cardRadius:  16,                 // rounded-2xl su entrambi i temi
    cardShadow:  false,
    cardShadowCss: 'none',
  },
  light: {
    mode: 'light' as ThemeMode,
    bg:          '#F4F4F4',
    surface:     '#FFFFFF',
    surface2:    '#F0F0F0',
    surface3:    '#E8E8E8',
    border:      '#D1D5DB',
    border2:     '#C1C5CB',
    text:        '#111111',
    textSec:     '#4B5563',
    textTer:     '#9CA3AF',
    accent:      '#1D4ED8',
    accentGold:  '#92400E',
    accentRed:   '#DC2626',
    accentGreen: '#15803D',
    shadow:      'rgba(0,0,0,0.08)',
    navBg:       '#FFFFFF',
    navBorder:   '#E5E7EB',
    inputBg:     '#F9FAFB',
    cardBg:      '#FFFFFF',
    cardBorder:  '#D1D5DB',
    positive:    '#15803D',
    negative:    '#DC2626',
    titleColor:  '#000000',
    cardRadius:  16,
    cardShadow:  true,
    cardShadowCss: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
  },
};

export type Theme = typeof THEMES.dark;

// ── Font size scale (+2px in light mode) ─────────────────────────────────────
export const fz = (base: number, mode: ThemeMode): number =>
  mode === 'light' ? base + 2 : base;

// ── FONT HELPERS (tutti Montserrat) ───────────────────────────────────────────

/**
 * PJS — Montserrat 800 per TITOLI e KPI
 * geometric, Nike-grade, altamente leggibile
 */
export const PJS = (weight: '600' | '700' | '800' = '800', extra?: object): any =>
  Platform.select({
    web: {
      fontFamily: `'Montserrat', -apple-system, sans-serif`,
      fontWeight: weight,
      letterSpacing: '-0.01em',
      ...extra,
    },
    default: { fontWeight: weight, ...extra },
  });

/**
 * MONT — Montserrat per body text e dati biometrici secondari
 * 400 = corpo normale, 600 = dato chiave in tabella
 */
export const MONT = (weight: '300' | '400' | '500' | '600' | '700' | '800' | '900' = '400'): any =>
  Platform.select({
    web: {
      fontFamily: `'Montserrat', -apple-system, sans-serif`,
      fontWeight: weight,
    },
    default: { fontWeight: weight },
  });

/**
 * INTER — backwards compat, mappa a MONT
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
