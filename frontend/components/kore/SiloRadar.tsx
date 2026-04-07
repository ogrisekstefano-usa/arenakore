/**
 * ARENAKORE — Silo Competency Radar
 * Polygon radar chart showing per-silo competency scores.
 * Uses react-native-svg for cross-platform rendering.
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';

const FONT_J = Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined });
const FONT_M = Platform.select({ web: "'Montserrat', sans-serif", default: undefined });

interface SiloData {
  silo: string;
  color: string;
  competency: number;
  count: number;
  avg_quality: number;
}

interface Props {
  data: SiloData[];
  size?: number;
  auraColor?: string;
}

const DISC_ICONS: Record<string, string> = {
  'Golf': '⛳', 'Fitness': '🏋️', 'Padel': '🏓', 'Calcio': '⚽', 'Tennis': '🎾',
  'Basket': '🏀', 'Running': '🏃', 'Nuoto': '🏊', 'Yoga': '🧘', 'CrossFit': '💪',
  'Boxing': '🥊', 'MMA': '🥋', 'Ciclismo': '🚴'
};

export function SiloRadar({ data, size = 220, auraColor = '#00E5FF' }: Props) {
  // ═══ DEFENSIVE: Ensure data is a valid array ═══
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <View style={s.emptyContainer}>
        <Text style={s.emptyText}>Completa sfide per sbloccare il Radar Silo</Text>
      </View>
    );
  }

  // Pad to minimum 3 axes for a polygon
  const axes = data.length < 3
    ? [...data, ...Array(3 - data.length).fill(null).map((_, i) => ({
        silo: ['Esplora', 'Scopri', 'Prova'][i] || 'Altro',
        color: '#333',
        competency: 0,
        count: 0,
        avg_quality: 0
      }))]
    : data;

  const center = size / 2;
  const maxR = size / 2 - 30;
  const n = axes.length;
  const angleStep = (Math.PI * 2) / n;

  // Calculate polygon points
  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / 100) * maxR;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  // Grid rings (25%, 50%, 75%, 100%)
  const rings = [25, 50, 75, 100];

  // Data polygon points
  const dataPoints = axes.map((d, i) => getPoint(i, d.competency));
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <View style={s.container}>
      <Svg width={size} height={size}>
        {/* Grid rings */}
        {rings.map(r => (
          <Circle
            key={r}
            cx={center}
            cy={center}
            r={(r / 100) * maxR}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {axes.map((_, i) => {
          const endPt = getPoint(i, 100);
          return (
            <Line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={endPt.x}
              y2={endPt.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon */}
        <Polygon
          points={dataPolygon}
          fill={auraColor + '15'}
          stroke={auraColor}
          strokeWidth={2}
        />

        {/* Data points (dots) */}
        {dataPoints.map((p, i) => (
          <Circle
            key={`dot-${i}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={axes[i].color || auraColor}
            stroke="#0A0A0A"
            strokeWidth={2}
          />
        ))}

        {/* Axis labels */}
        {axes.map((d, i) => {
          const labelPt = getPoint(i, 118);
          return (
            <SvgText
              key={`label-${i}`}
              x={labelPt.x}
              y={labelPt.y}
              fill={d.competency > 0 ? d.color : 'rgba(255,255,255,0.15)'}
              fontSize={9}
              fontWeight="800"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {d.silo}
            </SvgText>
          );
        })}
      </Svg>

      {/* Legend below radar */}
      <View style={s.legend}>
        {data.map((d) => (
          <View key={d.silo} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: d.color }]} />
            <Text style={s.legendSilo}>{DISC_ICONS[d.silo] || '🏅'} {d.silo}</Text>
            <Text style={[s.legendScore, { color: d.color }]}>{Math.round(d.competency)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { alignItems: 'center' },
  emptyContainer: {
    height: 120, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed',
    borderRadius: 16, marginVertical: 8
  },
  emptyText: { color: 'rgba(255,255,255,0.15)', fontSize: 12, fontWeight: '600', fontFamily: FONT_M },
  legend: { marginTop: 8, gap: 6, width: '100%' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendSilo: { color: 'rgba(255,255,255,0.50)', fontSize: 11, fontWeight: '700', fontFamily: FONT_M, flex: 1 },
  legendScore: { fontSize: 14, fontWeight: '900', fontFamily: FONT_J }
});
