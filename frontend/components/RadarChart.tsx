/**
 * ARENAKORE — DNA Radar Chart v4.0 (Hybrid Render)
 * ═══════════════════════════════════════════════════
 * SVG: Spider web grid + data polygon + dots
 * React Native Text: Labels + Values (guaranteed font rendering)
 * Typography: Montserrat 600 labels / Plus Jakarta Sans 800 values
 */
import React from 'react';
import { View, Text, Platform, useColorScheme, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Circle } from 'react-native-svg';
import { DNAStats } from '../contexts/AuthContext';

const ATTRS = [
  { key: 'velocita', label: 'VEL' },
  { key: 'forza', label: 'FOR' },
  { key: 'resistenza', label: 'RES' },
  { key: 'agilita', label: 'AGI' },
  { key: 'tecnica', label: 'TEC' },
  { key: 'potenza', label: 'POT' },
];

const FONT_JAKARTA = Platform.select({
  web: "'Plus Jakarta Sans', 'Montserrat', -apple-system, sans-serif",
  default: undefined
});
const FONT_MONT = Platform.select({
  web: "'Montserrat', -apple-system, sans-serif",
  default: undefined
});

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

interface RadarChartProps {
  stats: DNAStats;
  size?: number;
  glowing?: boolean;
  recordsBroken?: string[];
  accentColor?: string;
  mode?: 'light' | 'dark';
}

export function RadarChart({ stats, size = 300, glowing = false, recordsBroken = [], accentColor = '#007AFF', mode }: RadarChartProps) {
  const systemScheme = useColorScheme();
  const isDark = mode ? mode === 'dark' : (systemScheme !== 'light');

  const LABEL_PAD = 55; // extra space around SVG for RN Text labels
  const totalSize = size;
  const svgSize = size - LABEL_PAD * 2;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const maxR = svgSize * 0.42;
  const n = ATTRS.length;
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  const GRID_COLOR = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const AXIS_COLOR = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const RECORD_COLOR = '#FFD700';
  const LABEL_COLOR = isDark ? 'rgba(255,255,255,0.50)' : '#666';
  const VALUE_COLOR = isDark ? '#00FFFF' : '#000000';

  const axisEndpoints = ATTRS.map((_, i) => polarToXY(cx, cy, maxR, (i * 360) / n));
  const dataPoints = ATTRS.map((a, i) => {
    const val = (stats[a.key as keyof DNAStats] || 0) / 100;
    return polarToXY(cx, cy, maxR * val, (i * 360) / n);
  });
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');
  const gridPolygons = gridLevels.map(level =>
    ATTRS.map((_, i) => polarToXY(cx, cy, maxR * level, (i * 360) / n))
      .map(p => `${p.x},${p.y}`).join(' ')
  );

  const isRecordBroken = (key: string) => recordsBroken.includes(key);

  // Calculate label positions relative to outer container
  const labelPositions = ATTRS.map((a, i) => {
    const angle = (i * 360) / n;
    const lR = maxR + 18;
    const p = polarToXY(cx, cy, lR, angle);
    return {
      left: LABEL_PAD + p.x,
      top: LABEL_PAD + p.y,
      angle
    };
  });

  return (
    <View style={{ width: totalSize, height: totalSize, position: 'relative' }}>
      {/* SVG Radar */}
      <View style={{ position: 'absolute', left: LABEL_PAD, top: LABEL_PAD }}>
        <Svg width={svgSize} height={svgSize}>
          {gridPolygons.map((pts, i) => (
            <Polygon key={`g-${i}`} points={pts} fill="none" stroke={GRID_COLOR} strokeWidth={0.5} />
          ))}
          {axisEndpoints.map((p, i) => (
            <Line key={`a-${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={AXIS_COLOR} strokeWidth={0.5} />
          ))}
          <Polygon
            points={dataPolygon}
            fill={glowing ? `${accentColor}40` : `${accentColor}18`}
            stroke={accentColor}
            strokeWidth={glowing ? 2.5 : 1.5}
          />
          {dataPoints.map((p, i) => (
            <Circle key={`d-${i}`} cx={p.x} cy={p.y} r={isRecordBroken(ATTRS[i].key) ? 5 : 3}
              fill={isRecordBroken(ATTRS[i].key) ? RECORD_COLOR : accentColor} />
          ))}
        </Svg>
      </View>

      {/* React Native Text Labels — guaranteed rendering */}
      {ATTRS.map((a, i) => {
        const pos = labelPositions[i];
        const broken = isRecordBroken(a.key);
        const val = stats[a.key as keyof DNAStats] || 0;

        return (
          <View key={`lbl-${i}`} style={[
            r$.labelWrap,
            {
              left: pos.left,
              top: pos.top,
              transform: [{ translateX: -30 }, { translateY: -16 }]
            },
          ]}>
            <Text style={[
              r$.labelText,
              { color: broken ? RECORD_COLOR : LABEL_COLOR, fontFamily: FONT_MONT || undefined },
            ]}>
              {a.label}
            </Text>
            <Text style={[
              r$.valueText,
              { color: broken ? RECORD_COLOR : VALUE_COLOR, fontFamily: FONT_JAKARTA || undefined },
            ]}>
              {val}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const r$ = StyleSheet.create({
  labelWrap: {
    position: 'absolute',
    width: 60,
    alignItems: 'center',
    gap: 1
  },
  labelText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center'
  },
  valueText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center'
  }
});
