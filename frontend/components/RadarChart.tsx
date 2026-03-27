import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';
import { DNAStats } from '../contexts/AuthContext';

const ATTRS = [
  { key: 'velocita', label: 'Velocità' },
  { key: 'forza', label: 'Forza' },
  { key: 'resistenza', label: 'Resistenza' },
  { key: 'agilita', label: 'Agilità' },
  { key: 'tecnica', label: 'Tecnica' },
  { key: 'potenza', label: 'Potenza' },
];

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

interface RadarChartProps {
  stats: DNAStats;
  size?: number;
}

export function RadarChart({ stats, size = 280 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.34;
  const labelR = maxR + 26;
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

  return (
    <View>
      <Svg width={size} height={size}>
        {gridPolygons.map((pts, i) => (
          <Polygon key={`grid-${i}`} points={pts} fill="none" stroke="#1E1E1E" strokeWidth={1} />
        ))}
        {axisEndpoints.map((p, i) => (
          <Line key={`ax-${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#2A2A2A" strokeWidth={1} />
        ))}
        <Polygon
          points={dataPolygon}
          fill="rgba(0,229,255,0.12)"
          stroke="#00E5FF"
          strokeWidth={2}
        />
        {dataPoints.map((p, i) => (
          <Circle key={`dot-${i}`} cx={p.x} cy={p.y} r={4} fill="#00E5FF" />
        ))}
        {ATTRS.map((a, i) => {
          const lp = polarToXY(cx, cy, labelR, (i * 360) / n);
          return (
            <SvgText
              key={`lbl-${i}`}
              x={lp.x}
              y={lp.y}
              fill="#888888"
              fontSize={10}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {a.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
