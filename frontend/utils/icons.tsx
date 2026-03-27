/**
 * ARENAKORE — MONOCHROMATIC ICON SYSTEM v1.0
 * Zero emoji. Zero colored icons.
 * White = General | Cyan #00F2FF = Bio/Performance | Gold #FFD700 = Status/Kore
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Core palette
export const ICON_COLORS = {
  WHITE: '#FFFFFF',
  CYAN: '#00F2FF',
  GOLD: '#FFD700',
  DIM: 'rgba(255,255,255,0.45)',
  RED: '#FF453A',
} as const;

// =============================================
// SPORT / CATEGORY → Ionicons Name Mapping
// =============================================
export const SPORT_ICON_MAP: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  atletica:  { icon: 'walk',          color: '#FF6B00' },
  combat:    { icon: 'hand-left',     color: '#FF3B30' },
  acqua:     { icon: 'water',         color: '#007AFF' },
  team:      { icon: 'football',      color: '#34C759' },
  fitness:   { icon: 'barbell',       color: ICON_COLORS.GOLD },
  outdoor:   { icon: 'trail-sign',    color: '#30B0C7' },
  mind_body: { icon: 'leaf',          color: '#AF52DE' },
  extreme:   { icon: 'flame',         color: '#FF2D55' },
};

// =============================================
// EXERCISE → Ionicons
// =============================================
export const EXERCISE_ICON_MAP: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  squat: { icon: 'barbell', color: ICON_COLORS.CYAN },
  punch: { icon: 'hand-left', color: ICON_COLORS.CYAN },
};

// =============================================
// MEDAL RANKING → Ionicons
// =============================================
export const MEDAL_ICON_MAP: Record<number, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; border: string }> = {
  1: { icon: 'medal', color: '#D4AF37', bg: 'rgba(212,175,55,0.2)', border: 'rgba(212,175,55,0.5)' },
  2: { icon: 'medal', color: '#C0C0C0', bg: 'rgba(192,192,192,0.15)', border: 'rgba(192,192,192,0.4)' },
  3: { icon: 'medal', color: '#CD7F32', bg: 'rgba(205,127,50,0.15)', border: 'rgba(205,127,50,0.4)' },
};

// =============================================
// DNA ATTRIBUTES → Ionicons
// =============================================
export const DNA_ATTR_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  velocita:   { icon: 'flash',          color: ICON_COLORS.CYAN },
  forza:      { icon: 'barbell',        color: ICON_COLORS.WHITE },
  resistenza: { icon: 'heart',          color: '#FF453A' },
  agilita:    { icon: 'walk',           color: ICON_COLORS.CYAN },
  tecnica:    { icon: 'navigate-circle', color: ICON_COLORS.WHITE },
  potenza:    { icon: 'flash-sharp',    color: ICON_COLORS.GOLD },
};

// =============================================
// DIFFICULTY → Ionicons
// =============================================
export const DIFFICULTY_ICON_MAP: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  easy:    { icon: 'star',       color: '#34C759' },
  medium:  { icon: 'star',       color: '#FF9500' },
  hard:    { icon: 'star',       color: '#FF3B30' },
  extreme: { icon: 'flame',      color: '#AF52DE' },
};

// =============================================
// CONSOLE BUTTONS → Ionicons
// =============================================
export const CONSOLE_ICON_MAP: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  scan:  { icon: 'scan',         color: ICON_COLORS.CYAN },
  forge: { icon: 'construct',    color: ICON_COLORS.GOLD },
  hall:  { icon: 'trophy',       color: ICON_COLORS.GOLD },
  dna:   { icon: 'analytics',    color: ICON_COLORS.CYAN },
};

// =============================================
// ROLE → Ionicons (mirrors ControlCenter)
// =============================================
export const ROLE_ICON_MAP: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  ADMIN:     { icon: 'shield-checkmark', color: '#FF453A' },
  GYM_OWNER: { icon: 'business',         color: ICON_COLORS.GOLD },
  COACH:     { icon: 'fitness',           color: ICON_COLORS.CYAN },
  ATHLETE:   { icon: 'person',            color: '#32D74B' },
};

// =============================================
// Convenience render helper
// =============================================
export function SportIcon({ sport, size = 16, fallbackColor }: { sport?: string; size?: number; fallbackColor?: string }) {
  const cfg = sport ? SPORT_ICON_MAP[sport] : null;
  return (
    <Ionicons
      name={cfg?.icon || 'flash'}
      size={size}
      color={cfg?.color || fallbackColor || ICON_COLORS.CYAN}
    />
  );
}
