/**
 * ARENAKORE — VALIDATION BREAKDOWN (KORE ID)
 * ═══════════════════════════════════════════════════
 * Trust reputation breakdown showing how challenges were validated.
 * Uses Plus Jakarta Sans 800 for percentages. Apple Fitness design.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const METHODS: Record<string, { label: string; icon: string; color: string; glow: boolean }> = {
  NEXUS_VERIFIED:    { label: 'NÈXUS VERIFIED',    icon: 'shield-checkmark', color: '#00E5FF', glow: true },
  GPS_VERIFIED:      { label: 'GPS VERIFIED',       icon: 'navigate',         color: '#34C759', glow: false },
  BPM_CORRELATED:    { label: 'BPM CORRELATED',     icon: 'heart',            color: '#FF2D55', glow: false },
  AUDIO_CORRELATED:  { label: 'AUDIO MATCHED',      icon: 'mic',              color: '#FF9500', glow: false },
  PROXIMITY_WITNESS: { label: 'PROXIMITY WITNESS',  icon: 'people',           color: '#AF52DE', glow: false },
  PEER_CONFIRMED:    { label: 'PEER CONFIRMED',     icon: 'checkmark-done',   color: '#5AC8FA', glow: false },
  MANUAL_ENTRY:      { label: 'MANUAL ENTRY',       icon: 'create',           color: 'rgba(255,255,255,0.35)', glow: false }
};

// Trust Score Ring
function TrustRing({ score, size = 80 }: { score: number; size?: number }) {
  const strokeW = 5;
  const r = (size - strokeW) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? '#00E5FF' : score >= 50 ? '#FFD700' : '#FF3B30';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} />
        <Circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference - progress}`}
          rotation={-90} origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={[vb.ringScore, { color }]}>{score}</Text>
      <Text style={vb.ringLabel}>TRUST</Text>
    </View>
  );
}


export function ValidationBreakdown() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await api.getValidationBreakdown(token);
        setData(res);
      } catch (e) {
        console.log('ValidationBreakdown fetch error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <View style={vb.container}>
        <ActivityIndicator color="#00E5FF" size="small" />
      </View>
    );
  }

  if (!data || data.total_challenges === 0) {
    return (
      <Animated.View entering={FadeInDown.delay(400)} style={vb.container}>
        <View style={vb.headerRow}>
          <Ionicons name="shield-checkmark" size={14} color="#00E5FF" />
          <Text style={vb.sectionTitle}>TRUST BREAKDOWN</Text>
        </View>
        <View style={vb.emptyWrap}>
          <Text style={vb.emptyText}>Completa la tua prima sfida per iniziare a costruire la tua reputazione</Text>
        </View>
      </Animated.View>
    );
  }

  // Filter out methods with 0% and sort by pct descending
  const activeBreakdown = Object.entries(data.breakdown)
    .filter(([, v]: [string, any]) => v.pct > 0)
    .sort(([, a]: [string, any], [, b]: [string, any]) => b.pct - a.pct);

  return (
    <Animated.View entering={FadeInDown.delay(400)} style={vb.container}>
      <View style={vb.headerRow}>
        <Ionicons name="shield-checkmark" size={14} color="#00E5FF" />
        <Text style={vb.sectionTitle}>TRUST BREAKDOWN</Text>
        <Text style={vb.totalBadge}>{data.total_challenges} SFIDE</Text>
      </View>

      <View style={vb.topRow}>
        {/* Trust Ring */}
        <TrustRing score={data.trust_score} />

        {/* Primary method highlight */}
        <View style={vb.primaryBox}>
          <Text style={vb.primaryLabel}>METODO PRIMARIO</Text>
          <View style={vb.primaryRow}>
            <Ionicons
              name={(METHODS[data.primary_method]?.icon || 'help') as any}
              size={16}
              color={METHODS[data.primary_method]?.color || '#FFF'}
            />
            <Text style={[vb.primaryName, { color: METHODS[data.primary_method]?.color || '#FFF' }]}>
              {METHODS[data.primary_method]?.label || data.primary_method}
            </Text>
          </View>
        </View>
      </View>

      {/* Breakdown bars */}
      <View style={vb.barsWrap}>
        {activeBreakdown.map(([method, val]: [string, any], idx) => {
          const meta = METHODS[method] || { label: method, icon: 'help', color: '#999', glow: false };
          return (
            <View key={method} style={vb.barRow}>
              <View style={vb.barIcon}>
                <Ionicons name={meta.icon as any} size={13} color={meta.color} />
              </View>
              <View style={vb.barInfo}>
                <View style={vb.barLabelRow}>
                  <Text style={[vb.barLabel, meta.glow && { color: meta.color }]}>{meta.label}</Text>
                  <Text style={[vb.barPct, { color: meta.color }]}>{val.pct}%</Text>
                </View>
                <View style={vb.barTrack}>
                  <View style={[vb.barFill, { width: `${Math.max(val.pct, 2)}%`, backgroundColor: meta.color }]} />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}


const vb = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.1)',
    borderRadius: 16, padding: 16, gap: 14
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: {
    color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 2, flex: 1
  },
  totalBadge: {
    color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 1
  },
  emptyWrap: { padding: 16, alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.35)', fontSize: 12, textAlign: 'center', lineHeight: 18 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  ringScore: {
    fontSize: 24,
    fontFamily: "'Plus Jakarta Sans', 'Montserrat', sans-serif",
    fontWeight: '800'
  },
  ringLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 8, fontWeight: '800', letterSpacing: 2, marginTop: -2 },
  primaryBox: { flex: 1, gap: 4 },
  primaryLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  primaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  primaryName: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },

  barsWrap: { gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  barInfo: { flex: 1, gap: 4 },
  barLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  barPct: {
    fontSize: 15,
    fontFamily: "'Plus Jakarta Sans', 'Montserrat', sans-serif",
    fontWeight: '800'
  },
  barTrack: {
    height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' as any
  },
  barFill: { height: 4, borderRadius: 2 }
});
