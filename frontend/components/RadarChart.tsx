/**
 * ARENAKORE — DNA Radar Chart (Apple Fitness Minimalism)
 * Clean spider web with thin lines, Plus Jakarta Sans 800 labels
 */
import React from 'react';
import { View, Platform } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';
import { DNAStats } from '../contexts/AuthContext';

const ATTRS = [
  { key: 'velocita', label: 'VELOCITÀ' },
  { key: 'forza', label: 'FORZA' },
  { key: 'resistenza', label: 'RESISTENZA' },
  { key: 'agilita', label: 'AGILITÀ' },
  { key: 'tecnica', label: 'TECNICA' },
  { key: 'potenza', label: 'POTENZA' },
];

const FONT_LABEL = Platform.select({
  web: "Plus Jakarta Sans, Montserrat, -apple-system, sans-serif",
  default: undefined,
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
}

export function RadarChart({ stats, size = 280, glowing = false, recordsBroken = [], accentColor = '#007AFF' }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.34;
  const labelR = maxR + 28;
  const n = ATTRS.length;
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  const axisEndpoints = ATTRS.map((_, i) => polarToXY(cx, cy, maxR, (i * 360) / n));

  const dataPoints = ATTRS.map((a, i) => {
    const val = (stats[a.key as keyof DNAStats] || 0) / 100;
    return polarToXY(cx, cy, maxR * val, (i * 360) / n);
  });
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  const gridPolygons = gridLevels.map(level =>
    ATTRS.map((_, i) => {
      const p = polarToXY(cx, cy, maxR * level, (i * 360) / n);
      return `${p.x},${p.y}`;
    }).join(' ')
  );

  const isRecordBroken = (key: string) => recordsBroken.includes(key);

  return (
    <View>
      <Svg width={size} height={size}>
        {/* Grid — ultra-thin, semi-transparent */}
        {gridPolygons.map((pts, i) => (
          <Polygon
            key={`grid-${i}`}
            points={pts}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={0.5}
          />
        ))}

        {/* Axes — thin */}
        {axisEndpoints.map((p, i) => (
          <Line
            key={`ax-${i}`}
            x1={cx} y1={cy} x2={p.x} y2={p.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={0.5}
          />
        ))}

        {/* Data polygon — clean fill */}
        <Polygon
          points={dataPolygon}
          fill={glowing ? `${accentColor}40` : `${accentColor}18`}
          stroke={accentColor}
          strokeWidth={glowing ? 2 : 1.5}
        />

        {/* Data dots — minimal */}
        {dataPoints.map((p, i) => {
          const broken = isRecordBroken(ATTRS[i].key);
          return (
            <React.Fragment key={`dot-${i}`}>
              <Circle
                cx={p.x} cy={p.y}
                r={broken ? 5 : 3}
                fill={broken ? '#FFD700' : accentColor}
              />
            </React.Fragment>
          );
        })}

        {/* Labels — Plus Jakarta Sans 800, clean white */}
        {ATTRS.map((a, i) => {
          const lp = polarToXY(cx, cy, labelR, (i * 360) / n);
          const broken = isRecordBroken(a.key);
          const val = stats[a.key as keyof DNAStats] || 0;
          return (
            <React.Fragment key={`lbl-${i}`}>
              <SvgText
                x={lp.x}
                y={lp.y - 6}
                fill={broken ? '#FFD700' : '#FFFFFF'}
                fontSize={11}
                fontWeight="800"
                fontFamily={FONT_LABEL || undefined}
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {a.label}
              </SvgText>
              <SvgText
                x={lp.x}
                y={lp.y + 8}
                fill={broken ? '#FFD700' : '#8E8E93'}
                fontSize={13}
                fontWeight="800"
                fontFamily={FONT_LABEL || undefined}
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {val}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
