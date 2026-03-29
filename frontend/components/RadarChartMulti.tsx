/**
 * ARENAKORE — MULTI-SCAN RADAR CHART
 * Sprint 9: Overlapping DNA radar polygons for history visualization
 * Renders up to 3 scans with Cyan (latest), Gold (previous), White (oldest)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';

const DNA_KEYS = ['velocita', 'forza', 'resistenza', 'agilita', 'tecnica', 'potenza'];
const DNA_LABELS = ['VEL', 'FOR', 'RES', 'AGI', 'TEC', 'POT'];

const SCAN_COLORS = [
  { stroke: '#00F2FF', fill: 'rgba(0,242,255,0.65)', label: 'ATTUALE' },
  { stroke: '#D4AF37', fill: 'rgba(212,175,55,0.10)', label: 'PRECEDENTE' },
  { stroke: 'rgba(255,255,255,0.55)', fill: 'rgba(255,255,255,0.04)', label: 'BASELINE' },
];

interface ScanEntry {
  dna: Record<string, number>;
  scan_type: string;
  scanned_at: string | null;
}

interface RadarChartMultiProps {
  scans: ScanEntry[];
  size?: number;
}

function pointsForDna(dna: Record<string, number>, cx: number, cy: number, r: number): string {
  return DNA_KEYS.map((key, i) => {
    const angle = (Math.PI * 2 * i) / DNA_KEYS.length - Math.PI / 2;
    const val = Math.min(100, Math.max(0, dna[key] || 0));
    const radius = (val / 100) * r;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');
}

export function RadarChartMulti({ scans, size = 240 }: RadarChartMultiProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 28;

  // Show up to 3 scans in reverse order (oldest first so newest renders on top)
  const toShow = [...scans].slice(-3).reverse(); // newest = index 0

  // Background rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Axis lines
  const axisLines = DNA_KEYS.map((_, i) => {
    const angle = (Math.PI * 2 * i) / DNA_KEYS.length - Math.PI / 2;
    return {
      x2: cx + maxR * Math.cos(angle),
      y2: cy + maxR * Math.sin(angle),
      lx: cx + (maxR + 14) * Math.cos(angle),
      ly: cy + (maxR + 14) * Math.sin(angle),
      label: DNA_LABELS[i],
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background rings */}
        {rings.map((ratio, ri) => (
          <Polygon
            key={ri}
            points={DNA_KEYS.map((_, i) => {
              const angle = (Math.PI * 2 * i) / DNA_KEYS.length - Math.PI / 2;
              const r = maxR * ratio;
              return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
            }).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {axisLines.map((ax, i) => (
          <Line key={i} x1={cx} y1={cy} x2={ax.x2} y2={ax.y2}
            stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
        ))}

        {/* DNA Polygons — render oldest first (bottom), newest last (top) */}
        {[...toShow].reverse().map((scan, idx) => {
          const colorIdx = toShow.length - 1 - idx; // Flip so newest = SCAN_COLORS[0]
          const col = SCAN_COLORS[Math.min(colorIdx, SCAN_COLORS.length - 1)];
          const pts = pointsForDna(scan.dna, cx, cy, maxR);
          return (
            <React.Fragment key={idx}>
              <Polygon points={pts} fill={col.fill} stroke="none" />
              <Polygon points={pts} fill="none" stroke={col.stroke} strokeWidth={1.5} />
            </React.Fragment>
          );
        })}

        {/* Axis labels */}
        {axisLines.map((ax, i) => (
          <SvgText
            key={i}
            x={ax.lx} y={ax.ly}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={8} fontWeight="800" fill="rgba(255,255,255,0.4)"
          >
            {ax.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

// Legend for the multi-radar
export function RadarMultiLegend({ scanCount }: { scanCount: number }) {
  const shown = Math.min(scanCount, 3);
  return (
    <View style={legendStyles.row}>
      {Array.from({ length: shown }).map((_, i) => (
        <View key={i} style={legendStyles.item}>
          <View style={[legendStyles.dot, { backgroundColor: SCAN_COLORS[i].stroke }]} />
          <Text style={legendStyles.label}>{SCAN_COLORS[i].label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});

const legendStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 1 } as any,
});
