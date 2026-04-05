/**
 * ARENAKORE — WAVEFORM CHART (Audio Analytics Beta)
 * ═══════════════════════════════════════════════════
 * SVG waveform visualization showing audio impact peaks
 * correlated with declared repetitions.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

interface WaveformProps {
  waveformData: { t: number; amplitude: number; is_peak: boolean }[];
  peakCount: number;
  declaredReps: number;
  repMatchPct: number;
  status: string;
  width?: number;
  height?: number;
}

export function WaveformChart({
  waveformData, peakCount, declaredReps, repMatchPct, status,
  width = 320, height = 120
}: WaveformProps) {
  if (!waveformData || waveformData.length === 0) {
    return (
      <View style={[wf.container, { width }]}>
        <View style={wf.header}>
          <Ionicons name="mic" size={14} color="#FF9500" />
          <Text style={wf.title}>AUDIO ANALYTICS</Text>
          <View style={wf.betaPill}><Text style={wf.betaText}>BETA</Text></View>
        </View>
        <View style={wf.empty}>
          <Text style={wf.emptyText}>Nessun dato audio registrato</Text>
        </View>
      </View>
    );
  }

  const padding = 16;
  const chartW = width - padding * 2;
  const chartH = height - 30;
  const maxT = Math.max(...waveformData.map(d => d.t), 1);

  const scaleX = (t: number) => padding + (t / maxT) * chartW;
  const scaleY = (amp: number) => chartH - amp * (chartH - 10);

  // Build SVG path
  let pathD = '';
  waveformData.forEach((d, i) => {
    const x = scaleX(d.t);
    const y = scaleY(d.amplitude);
    pathD += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
  });

  // Baseline path (mirror)
  let mirrorD = '';
  waveformData.forEach((d, i) => {
    const x = scaleX(d.t);
    const y = scaleY(-d.amplitude * 0.3 + 0.5);
    mirrorD += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
  });

  const matchColor = repMatchPct >= 80 ? '#34C759' : repMatchPct >= 50 ? '#FFD700' : '#FF3B30';

  return (
    <View style={[wf.container, { width }]}>
      <View style={wf.header}>
        <Ionicons name="mic" size={14} color="#FF9500" />
        <Text style={wf.title}>AUDIO ANALYTICS</Text>
        <View style={wf.betaPill}><Text style={wf.betaText}>BETA</Text></View>
      </View>

      <Svg width={width} height={height}>
        {/* Center baseline */}
        <Line x1={padding} y1={chartH / 2} x2={width - padding} y2={chartH / 2}
          stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />

        {/* Waveform path */}
        <Path d={pathD} fill="none" stroke="#00E5FF" strokeWidth={1.5} opacity={0.9} />
        <Path d={mirrorD} fill="none" stroke="#00E5FF" strokeWidth={1} opacity={0.3} />

        {/* Peak markers */}
        {waveformData.filter(d => d.is_peak).map((d, i) => {
          const x = scaleX(d.t);
          const y = scaleY(d.amplitude);
          return (
            <React.Fragment key={i}>
              <Line x1={x} y1={0} x2={x} y2={chartH} stroke="#FF9500" strokeWidth={0.5} opacity={0.3} strokeDasharray="2,2" />
              <Circle cx={x} cy={y} r={4} fill="#FF9500" opacity={0.9} />
              <Circle cx={x} cy={y} r={2} fill="#FFFFFF" opacity={0.8} />
              <SvgText x={x} y={chartH + 12} fill="#FF9500" fontSize={7} fontWeight="800" textAnchor="middle">
                {`R${i + 1}`}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Stats row */}
      <View style={wf.statsRow}>
        <View style={wf.statBox}>
          <Text style={wf.statLabel}>PICCHI</Text>
          <Text style={wf.statVal}>{peakCount}</Text>
        </View>
        <View style={wf.statBox}>
          <Text style={wf.statLabel}>DICHIARATE</Text>
          <Text style={wf.statVal}>{declaredReps}</Text>
        </View>
        <View style={wf.statBox}>
          <Text style={wf.statLabel}>MATCH</Text>
          <Text style={[wf.statVal, { color: matchColor }]}>{repMatchPct}%</Text>
        </View>
        <View style={[wf.statusPill, { backgroundColor: matchColor + '18', borderColor: matchColor }]}>
          <Text style={[wf.statusText, { color: matchColor }]}>
            {status === 'AUDIO_CORRELATED' ? 'CORRELATO' : status === 'PARTIAL_MATCH' ? 'PARZIALE' : 'BASSO'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const wf = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,149,0,0.15)',
    borderRadius: 14, padding: 12, gap: 6
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: {
    color: '#FF9500', fontSize: 11, fontWeight: '900', letterSpacing: 2, flex: 1
  },
  betaPill: {
    backgroundColor: 'rgba(255,149,0,0.15)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2
  },
  betaText: { color: '#FF9500', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  empty: { padding: 20, alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  statBox: { alignItems: 'center', gap: 2 },
  statLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  statVal: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  statusPill: {
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 'auto' as any
  },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 }
});
