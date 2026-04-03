/**
 * ARENAKORE — DATA ORIGIN BADGE
 * ═══════════════════════════════
 * Shows the source of challenge data with trust hierarchy.
 * NEXUS (Max Trust) > Sensor/Strava (High) > Manual (Low)
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SOURCE_CONFIG: Record<string, { icon: string; emoji: string; label: string; color: string; trust: number; glow: boolean }> = {
  NEXUS_VISION:  { icon: 'eye',        emoji: '👁️', label: 'NÈXUS',         color: '#00E5FF', trust: 100, glow: true },
  BLE_SENSOR:    { icon: 'watch',       emoji: '⌚', label: 'SENSORE',       color: '#FF9500', trust: 92,  glow: false },
  STRAVA:        { icon: 'bicycle',     emoji: '🏃‍♂️', label: 'STRAVA',        color: '#FC4C02', trust: 88,  glow: false },
  APPLE_HEALTH:  { icon: 'heart',       emoji: '🍎', label: 'HEALTHKIT',     color: '#FF2D55', trust: 85,  glow: false },
  GOOGLE_HEALTH: { icon: 'fitness',     emoji: '🤖', label: 'HEALTH CONNECT', color: '#4285F4', trust: 85, glow: false },
  MANUAL:        { icon: 'create',      emoji: '⚠️', label: 'MANUALE',       color: '#8E8E93', trust: 30,  glow: false },
};

interface Props {
  sources?: string[];
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function DataOriginBadge({ sources = ['MANUAL'], size = 'md', showLabel = true }: Props) {
  // Sort by trust level (highest first)
  const sorted = [...new Set(sources)]
    .filter(s => SOURCE_CONFIG[s])
    .sort((a, b) => SOURCE_CONFIG[b].trust - SOURCE_CONFIG[a].trust);

  if (sorted.length === 0) sorted.push('MANUAL');

  const iconSize = size === 'sm' ? 10 : size === 'lg' ? 16 : 13;
  const fontSize = size === 'sm' ? 7 : size === 'lg' ? 10 : 8;

  return (
    <View style={db.wrap}>
      {sorted.map((src, idx) => {
        const cfg = SOURCE_CONFIG[src];
        const isFirst = idx === 0;
        return (
          <View
            key={src}
            style={[
              db.badge,
              {
                backgroundColor: cfg.color + (isFirst ? '18' : '0A'),
                borderColor: cfg.color + (isFirst ? '40' : '20'),
              },
              cfg.glow && isFirst && Platform.OS === 'web' ? {
                // @ts-ignore — Web boxShadow for NEXUS glow
                boxShadow: `0 0 8px ${cfg.color}44, 0 0 16px ${cfg.color}22`,
              } : {},
            ]}
          >
            <Text style={{ fontSize: iconSize + 2 }}>{cfg.emoji}</Text>
            {showLabel && (
              <Text style={[db.label, { color: cfg.color, fontSize, opacity: isFirst ? 1 : 0.6 }]}>
                {cfg.label}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}


// Single-line compact badge for challenge results
export function DataOriginLine({ sources = ['MANUAL'] }: { sources?: string[] }) {
  const sorted = [...new Set(sources)]
    .filter(s => SOURCE_CONFIG[s])
    .sort((a, b) => SOURCE_CONFIG[b].trust - SOURCE_CONFIG[a].trust);

  if (sorted.length === 0) sorted.push('MANUAL');

  return (
    <View style={db.lineWrap}>
      <Text style={db.linePrefix}>ORIGINE:</Text>
      {sorted.map((src, idx) => {
        const cfg = SOURCE_CONFIG[src];
        return (
          <View key={src} style={db.lineItem}>
            <Text style={{ fontSize: 12 }}>{cfg.emoji}</Text>
            <Text style={[db.lineLabel, { color: cfg.color }]}>{cfg.label}</Text>
            {idx < sorted.length - 1 && <Text style={db.lineSep}>+</Text>}
          </View>
        );
      })}
    </View>
  );
}


const db = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  label: { fontWeight: '900', letterSpacing: 1 },
  lineWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  linePrefix: {
    color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '800', letterSpacing: 1,
  },
  lineItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lineLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  lineSep: { color: 'rgba(255,255,255,0.2)', fontSize: 9, marginHorizontal: 1 },
});
