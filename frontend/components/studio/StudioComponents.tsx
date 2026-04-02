/**
 * COACH STUDIO — Shared SVG Chart Components
 * ActivityHeatmap, LineChart, RadarChart, AlertBadge
 * Updated: Montserrat titles + theme-aware cards
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Rect, Line, Polyline, Polygon, Circle, Text as SvgText, G } from 'react-native-svg';
import { useTheme, PJS, MONT, fz } from '../../contexts/ThemeContext';

const DNA_KEYS = ['velocita','forza','resistenza','agilita','tecnica','potenza'];
const DNA_SHORT = ['VEL','FOR','RES','AGI','TEC','POT'];
const LINE_COLORS = ['#00E5FF','#FF3B30','#FFD700','#00FF87','#AF52DE','#FF9500'];

// ── Activity Heatmap (GitHub-style 30-day grid) ──────────────────────────
export function ActivityHeatmap({ grid, totalScans, activeDays }: { grid: any[]; totalScans: number; activeDays: number }) {
  const CELL = 18, GAP = 3, COLS = 10, ROWS = 3;
  const w = COLS * (CELL + GAP), h = ROWS * (CELL + GAP);
  const getColor = (intensity: number) => {
    if (intensity === 0) return '#111111';
    if (intensity < 0.25) return 'rgba(0,229,255,0.2)';
    if (intensity < 0.5) return 'rgba(0,229,255,0.45)';
    if (intensity < 0.75) return 'rgba(0,229,255,0.7)';
    return '#00E5FF';
  };

  return (
    <View style={h$.wrap}>
      <View style={h$.header}>
        <Text style={h$.title}>SCAN ACTIVITY — 30 GIORNI</Text>
        <View style={h$.stats}>
          <Text style={h$.stat}>{totalScans} scan</Text>
          <Text style={h$.statSep}>·</Text>
          <Text style={h$.stat}>{activeDays} giorni attivi</Text>
        </View>
      </View>
      <Svg width={w} height={h + 20}>
        {grid.map((cell, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const x = col * (CELL + GAP);
          const y = row * (CELL + GAP);
          return (
            <Rect
              key={i} x={x} y={y} width={CELL} height={CELL}
              rx={3} fill={getColor(cell.intensity)}
            />
          );
        })}
        {/* Date labels */}
        {[0, 9, 19, 29].map(i => {
          const col = i % COLS, row = Math.floor(i / COLS);
          const x = col * (CELL + GAP) + CELL / 2;
          const d = grid[i]?.date?.slice(5) || '';
          return <SvgText key={i} x={x} y={h + 14} fontSize={8} fill="rgba(255,255,255,0.25)" textAnchor="middle">{d}</SvgText>;
        })}
      </Svg>
      <View style={h$.legend}>
        <Text style={h$.legendLabel}>Meno</Text>
        {[0, 0.2, 0.5, 0.75, 1].map(v => (
          <View key={v} style={[h$.legendCell, { backgroundColor: getColor(v) }]} />
        ))}
        <Text style={h$.legendLabel}>Più</Text>
      </View>
    </View>
  );
}

const h$ = StyleSheet.create({
  wrap: { backgroundColor: '#0A0A0A', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1E1E1E', gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stat: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700' },
  statSep: { color: 'rgba(255,255,255,0.2)' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  legendLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '400' },
  legendCell: { width: 12, height: 12, borderRadius: 2 },
});

// ── Line Chart (Historical DNA Trends) ────────────────────────────────────
export function LineChart({ months, keys, labels, height = 160, width = 440 }: {
  months: any[]; keys: string[]; labels?: string[]; height?: number; width?: number;
}) {
  if (!months || months.length < 2) return null;
  const padL = 32, padB = 24, padT = 12, padR = 16;
  const chartW = width - padL - padR;
  const chartH = height - padB - padT;
  const n = months.length;
  const xPos = (i: number) => padL + (i / (n - 1)) * chartW;
  const yPos = (v: number) => padT + chartH - (v / 100) * chartH;

  // Grid lines at 25/50/75/100
  const gridY = [25, 50, 75, 100];

  return (
    <Svg width={width} height={height}>
      {/* Grid */}
      {gridY.map(v => (
        <G key={v}>
          <Line x1={padL} y1={yPos(v)} x2={width - padR} y2={yPos(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <SvgText x={padL - 4} y={yPos(v) + 4} fontSize={7} fill="rgba(255,255,255,0.2)" textAnchor="end">{v}</SvgText>
        </G>
      ))}
      {/* X-axis labels */}
      {months.map((m, i) => (
        <SvgText key={i} x={xPos(i)} y={height - 6} fontSize={8} fill="rgba(255,255,255,0.25)" textAnchor="middle">{m.month}</SvgText>
      ))}
      {/* Lines */}
      {keys.map((key, ki) => {
        const pts = months.map((m, i) => `${xPos(i)},${yPos(m[key] || 50)}`).join(' ');
        return (
          <G key={key}>
            <Polyline points={pts} fill="none" stroke={LINE_COLORS[ki % LINE_COLORS.length]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
            {/* Current value dot */}
            <Circle
              cx={xPos(months.length - 1)}
              cy={yPos(months[months.length - 1][key] || 50)}
              r={3} fill={LINE_COLORS[ki % LINE_COLORS.length]}
            />
          </G>
        );
      })}
    </Svg>
  );
}

// ── Small Radar (for athlete rows) ─────────────────────────────────────────
export function MiniRadar({ dna, color = '#00E5FF', size = 60 }: { dna: any; color?: string; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 6;
  const n = DNA_KEYS.length;
  const pts = DNA_KEYS.map((k, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const v = ((dna?.[k] ?? 50) / 100) * r;
    return [cx + v * Math.cos(angle), cy + v * Math.sin(angle)];
  });
  const gridPts = DNA_KEYS.map((_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
  return (
    <Svg width={size} height={size}>
      <Polygon points={gridPts.map(p => p.join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      <Polygon points={pts.map(p => p.join(',')).join(' ')} fill={color + '25'} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────
export function KPICard({ label, value, sub, color = '#00E5FF', icon, trend }: any) {
  const { theme, mode } = useTheme();
  return (
    <View
      style={[k$.card, {
        backgroundColor: theme.surface,
        borderColor: theme.border,
        borderRadius: theme.cardRadius,
        ...(Platform.OS === 'web' && theme.cardShadow ? { boxShadow: theme.cardShadowCss } as any : {}),
      }]}
      {...(Platform.OS === 'web' ? { 'data-nexus-card': '1' } as any : {})}
    >
      <View style={k$.top}>
        <Text style={[k$.icon, { color }]}>{icon}</Text>
        {trend && (
          <View style={[k$.trendBadge, { backgroundColor: trend === 'up' ? theme.positive + '20' : theme.negative + '20' }]}>
            <Text style={[k$.trendText, { color: trend === 'up' ? theme.positive : theme.negative }]}>{trend === 'up' ? '↑' : '↓'}</Text>
          </View>
        )}
      </View>
      <Text style={[k$.value, PJS('800'), { color, fontSize: fz(28, mode) }]}>{value}</Text>
      <Text style={[k$.label, MONT('600'), { color: theme.textTer, fontSize: fz(9, mode) }]}>{label}</Text>
      {sub && <Text style={[k$.sub, MONT('400'), { color: theme.textTer, fontSize: fz(10, mode) }]}>{sub}</Text>}
    </View>
  );
}

const k$ = StyleSheet.create({
  card: { flex: 1, borderRadius: 12, padding: 18, gap: 6, borderWidth: 1, minWidth: 140 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icon: { fontSize: 20 },
  value: { letterSpacing: -0.5 },
  label: { letterSpacing: 2 },
  sub: {},
  trendBadge: { borderRadius: 6, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  trendText: { fontSize: 12, fontWeight: '900' },
});

// ── Alert Row ──────────────────────────────────────────────────────────────
export function AlertRow({ alert }: { alert: any }) {
  return (
    <View style={[al$.row, { borderLeftColor: alert.color }]}>
      <View style={al$.left}>
        <Text style={[al$.badge, { color: alert.color, borderColor: alert.color + '40', backgroundColor: alert.color + '12' }]}>
          {alert.severity?.toUpperCase()}
        </Text>
        <Text style={al$.athlete}>{alert.athlete}</Text>
      </View>
      <Text style={al$.message} numberOfLines={2}>{alert.message}</Text>
    </View>
  );
}

const al$ = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, paddingLeft: 10, borderLeftWidth: 2, marginBottom: 2 },
  left: { gap: 4, minWidth: 100 },
  badge: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  athlete: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  message: { flex: 1, color: '#AAAAAA', fontSize: 12, fontWeight: '300', lineHeight: 17 },
});

// ── Section Header ─────────────────────────────────────────────────────────
export function SectionHeader({ title, sub }: { title: string; sub?: string; action?: string; onAction?: () => void }) {
  const { theme, mode } = useTheme();
  return (
    <View style={sh$.row}>
      <View>
        <Text
          style={[sh$.title, PJS('700'), { color: theme.titleColor, fontSize: fz(15, mode) }]}
          {...(Platform.OS === 'web' ? { 'data-nexus-title': '1' } as any : {})}
        >{title}</Text>
        {sub && <Text style={[sh$.sub, MONT('400'), { color: theme.textTer, fontSize: fz(11, mode) }]}>{sub}</Text>}
      </View>
    </View>
  );
}

const sh$ = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  title: {},
  sub: { marginTop: 3 },
});

export { DNA_KEYS, DNA_SHORT, LINE_COLORS };
