/**
 * AI COACH ASSISTANT — Injury Risk + Performance Forecasting
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

function RiskBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={rb$.wrap}>
      <View style={rb$.track}>
        <Svg width={`${pct}%` as any} height={6}>
          <Rect x={0} y={0} width="100%" height={6} rx={3} fill={color} />
        </Svg>
      </View>
      <Text style={[rb$.pct, { color }]}>{pct}%</Text>
    </View>
  );
}
const rb$ = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { flex: 1, height: 6, backgroundColor: '#1E1E1E', borderRadius: 3, overflow: 'hidden' },
  pct: { fontSize: 11, fontWeight: '900', width: 32, textAlign: 'right' },
});

export default function AICoachAssistant() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.getCoachAIFull(token)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <View style={ai$.center}><ActivityIndicator color="#00F2FF" /></View>;

  const risks = data?.injury_risks || [];
  const forecasts = data?.forecasts || [];
  const summary = data?.group_summary || {};

  return (
    <ScrollView style={ai$.root} contentContainerStyle={ai$.content}>
      <View style={ai$.pageHeader}>
        <View>
          <Text style={ai$.pageTitle}>AI COACH ASSISTANT</Text>
          <Text style={ai$.pageSub}>Injury Risk Predictor · Performance Forecasting</Text>
        </View>
        <View style={ai$.groupStats}>
          <View style={ai$.groupStat}>
            <Text style={[ai$.groupVal, { color: summary.high_risk > 0 ? '#FF453A' : '#34C759' }]}>{summary.high_risk || 0}</Text>
            <Text style={ai$.groupLabel}>HIGH RISK</Text>
          </View>
          <View style={ai$.groupStat}>
            <Text style={[ai$.groupVal, { color: '#34C759' }]}>{summary.improving || 0}</Text>
            <Text style={ai$.groupLabel}>IMPROVING</Text>
          </View>
          <View style={ai$.groupStat}>
            <Text style={[ai$.groupVal, { color: '#00F2FF' }]}>{summary.total_athletes || 0}</Text>
            <Text style={ai$.groupLabel}>ATLETI</Text>
          </View>
        </View>
      </View>

      <View style={ai$.twoCol}>
        {/* Injury Risks */}
        <View style={ai$.col}>
          <View style={ai$.sectionCard}>
            <View style={ai$.secHeader}>
              <Ionicons name="warning" size={14} color="#FF453A" />
              <Text style={ai$.secTitle}>INJURY RISK PREDICTOR</Text>
            </View>
            {risks.length === 0 ? (
              <View style={ai$.emptyBlock}>
                <Ionicons name="shield-checkmark" size={28} color="#34C759" />
                <Text style={ai$.emptyText}>Nessun rischio rilevato{'\n'}Parametri nella norma</Text>
              </View>
            ) : risks.map((r: any, i: number) => (
              <Animated.View key={r.athlete_id} entering={FadeInDown.delay(i * 60).duration(250)} style={ai$.riskRow}>
                <View style={ai$.riskHeader}>
                  <Text style={ai$.riskAth}>{r.athlete}</Text>
                  <View style={[ai$.riskBadge, { backgroundColor: r.color + '20', borderColor: r.color + '50' }]}>
                    <Text style={[ai$.riskBadgeText, { color: r.color }]}>{r.risk_pct >= 60 ? 'ALTO' : 'MEDIO'}</Text>
                  </View>
                </View>
                <RiskBar pct={r.risk_pct} color={r.color} />
                <View style={ai$.riskDetail}>
                  <View style={ai$.riskMeta}>
                    <Ionicons name="arrow-up" size={10} color="#FF453A" />
                    <Text style={ai$.riskMetaText}>Overload: {r.overloaded}</Text>
                  </View>
                  <View style={ai$.riskMeta}>
                    <Ionicons name="arrow-down" size={10} color="#FF9500" />
                    <Text style={ai$.riskMetaText}>Carente: {r.weak_area}</Text>
                  </View>
                </View>
                <Text style={ai$.riskRec}>{r.recommendation}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Performance Forecasts */}
        <View style={ai$.col}>
          <View style={ai$.sectionCard}>
            <View style={ai$.secHeader}>
              <Ionicons name="telescope" size={14} color="#D4AF37" />
              <Text style={ai$.secTitle}>PERFORMANCE FORECAST 30g</Text>
            </View>
            {forecasts.length === 0 ? (
              <View style={ai$.emptyBlock}>
                <Text style={ai$.emptyText}>Dati insufficienti per la proiezione</Text>
              </View>
            ) : forecasts.map((f: any, i: number) => {
              const trendColors: Record<string, string> = { rising: '#34C759', stable: '#888888', declining: '#FF453A' };
              const trendIcons: Record<string, any> = { rising: 'trending-up', stable: 'remove', declining: 'trending-down' };
              const tc = trendColors[f.trend] || '#888';
              const ti = trendIcons[f.trend] || 'remove';
              const dnaDiff = f.projected_dna - f.current_dna;
              return (
                <Animated.View key={f.athlete_id} entering={FadeInDown.delay(i * 60).duration(250)} style={ai$.forecastRow}>
                  <View style={ai$.forecastLeft}>
                    <View style={ai$.trendRow}>
                      <Ionicons name={ti} size={14} color={tc} />
                      <Text style={ai$.forecastAth}>{f.athlete}</Text>
                    </View>
                    <Text style={ai$.forecastMeta}>{f.scans_per_week}/sett · LVL {f.current_level}→{f.projected_level}</Text>
                  </View>
                  <View style={ai$.forecastRight}>
                    <Text style={[ai$.forecastDna, { color: dnaDiff >= 0 ? '#34C759' : '#FF453A' }]}>
                      {dnaDiff >= 0 ? '+' : ''}{dnaDiff.toFixed(1)}
                    </Text>
                    <Text style={ai$.forecastDnaLabel}>DNA / 30g</Text>
                  </View>
                  <View style={ai$.forecastXp}>
                    <Text style={ai$.forecastXpVal}>+{(f.projected_xp_30d - f.current_xp).toLocaleString()}</Text>
                    <Text style={ai$.forecastXpLabel}>XP previsti</Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={ai$.aiNote}>
        <Ionicons name="hardware-chip" size={14} color="rgba(0,242,255,0.5)" />
        <Text style={ai$.aiNoteText}>AI KORE Engine v2 · Analisi basata su DNA biometrico attuale + frequenza scan · Proiezioni 30 giorni</Text>
      </View>
    </ScrollView>
  );
}

const ai$ = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' }, content: { padding: 28, gap: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  pageTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 4 },
  pageSub: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '300', marginTop: 3 },
  groupStats: { flexDirection: 'row', gap: 16 },
  groupStat: { alignItems: 'center', gap: 3 },
  groupVal: { fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  groupLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  twoCol: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  col: { flex: 1 },
  sectionCard: { backgroundColor: '#0A0A0A', borderRadius: 14, padding: 18, gap: 10, borderWidth: 1, borderColor: '#1E1E1E' },
  secHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  secTitle: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  emptyBlock: { alignItems: 'center', paddingVertical: 30, gap: 12 },
  emptyText: { color: 'rgba(255,255,255,0.25)', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  riskRow: { backgroundColor: '#111', borderRadius: 10, padding: 12, gap: 8 },
  riskHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  riskAth: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '700' },
  riskBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  riskBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  riskDetail: { flexDirection: 'row', gap: 16 },
  riskMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  riskMetaText: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
  riskRec: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '300', lineHeight: 16, borderTopWidth: 1, borderTopColor: '#1E1E1E', paddingTop: 8 },
  forecastRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#111' },
  forecastLeft: { flex: 1, gap: 3 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  forecastAth: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  forecastMeta: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
  forecastRight: { alignItems: 'center' },
  forecastDna: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  forecastDnaLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  forecastXp: { alignItems: 'center', minWidth: 70 },
  forecastXpVal: { color: '#D4AF37', fontSize: 14, fontWeight: '900' },
  forecastXpLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 9, marginTop: 2 },
  aiNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0A0A0A', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#1E1E1E' },
  aiNoteText: { flex: 1, color: 'rgba(0,242,255,0.4)', fontSize: 11, fontWeight: '300' },
});
