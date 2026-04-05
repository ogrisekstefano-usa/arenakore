/**
 * CREW STRATEGIST — Battle Control & Weighted Average Calculator
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { SectionHeader } from '../../components/studio/StudioComponents';

const RESULT_CFG: Record<string, { color: string; bg: string; label: string }> = {
  win:    { color: '#00FF87', bg: '#00FF8720', label: 'VITTORIA' },
  loss:   { color: '#FF3B30', bg: '#FF3B3020', label: 'SCONFITTA' },
  active: { color: '#00E5FF', bg: '#00E5FF20', label: 'LIVE' },
  tie:    { color: '#888888', bg: '#88888820', label: 'PAREGGIO' }
};

export default function CrewStrategist() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedSim, setSelectedSim] = useState<string[]>([]);
  const [simResult, setSimResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.getCoachBattleStats(token),
      api.getCoachAthletes(token),
    ]).then(([s, a]) => {
      setStats(s); setAthletes(a.athletes || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const runSimulation = async () => {
    if (!token || selectedSim.length === 0) return;
    setSimulating(true);
    try {
      const result = await api.simulateCrewBattle(selectedSim, token);
      setSimResult(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Simulazione fallita');
    } finally { setSimulating(false); }
  };

  if (loading) return <View style={c$.center}><ActivityIndicator color="#00E5FF" /></View>;

  const winRateColor = (stats?.win_rate || 0) >= 50 ? '#00FF87' : (stats?.win_rate || 0) >= 30 ? '#FF9500' : '#FF3B30';

  return (
    <ScrollView style={c$.root} contentContainerStyle={c$.content}>
      <Text style={c$.pageTitle}>CREW STRATEGIST</Text>

      <View style={c$.twoCol}>
        {/* LEFT: Battle History */}
        <View style={c$.leftCol}>
          <SectionHeader title="BATTLE HISTORY" sub="Risultati crew battles" />
          <View style={c$.statsRow}>
            <View style={c$.statBox}>
              <Text style={[c$.statVal, { color: '#00FF87' }]}>{stats?.wins || 0}</Text>
              <Text style={c$.statLabel}>VITTORIE</Text>
            </View>
            <View style={c$.statBox}>
              <Text style={[c$.statVal, { color: '#FF3B30' }]}>{stats?.losses || 0}</Text>
              <Text style={c$.statLabel}>SCONFITTE</Text>
            </View>
            <View style={c$.statBox}>
              <Text style={[c$.statVal, { color: winRateColor }]}>{stats?.win_rate || 0}%</Text>
              <Text style={c$.statLabel}>WIN RATE</Text>
            </View>
          </View>
          <View style={c$.battleList}>
            {(!stats?.battles || stats.battles.length === 0) ? (
              <View style={c$.empty}>
                <Ionicons name="shield-outline" size={28} color="rgba(255,255,255,0.1)" />
                <Text style={c$.emptyText}>Nessuna battle ancora.{'\n'}Vai in ARENA per sfidarti.</Text>
              </View>
            ) : (
              stats.battles.map((b: any, i: number) => {
                const cfg = RESULT_CFG[b.my_result] || RESULT_CFG.active;
                return (
                  <Animated.View key={b.id} entering={FadeInDown.delay(i * 40).duration(200)} style={c$.battleRow}>
                    <View style={[c$.pill, { backgroundColor: cfg.bg, borderColor: cfg.color + '50' }]}>
                      <Text style={[c$.pillText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <View style={c$.battleInfo}>
                      <Text style={c$.battleMatch}>{b.crew_a} vs {b.crew_b}</Text>
                      <Text style={c$.battleScore}>{b.score_a} · {b.score_b}</Text>
                    </View>
                    <Text style={c$.battleDate}>{b.started_at?.slice(0, 10) || '—'}</Text>
                  </Animated.View>
                );
              })
            )}
          </View>
        </View>

        {/* RIGHT: Weighted Average Simulator */}
        <View style={c$.rightCol}>
          <SectionHeader title="SIMULATORE" sub="Weighted Average Calculator" />
          <View style={c$.simCard}>
            <Text style={c$.simDesc}>Seleziona Kore per calcolare il KORE Battle Score della crew simulata.</Text>
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {athletes.map(ath => {
                const isSelected = selectedSim.includes(ath.id);
                return (
                  <TouchableOpacity
                    key={ath.id}
                    style={[c$.athRow, isSelected && c$.athRowSel]}
                    onPress={() => setSelectedSim(prev =>
                      prev.includes(ath.id) ? prev.filter(x => x !== ath.id) : [...prev, ath.id]
                    )}
                    activeOpacity={0.8}
                  >
                    <View style={[c$.athAvatar, { backgroundColor: ath.avatar_color || '#00E5FF' }]}>
                      <Text style={c$.athLetter}>{ath.username[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[c$.athName, isSelected && { color: '#00E5FF' }]}>{ath.username}</Text>
                      <Text style={c$.athMeta}>KORE {ath.dna_avg} · {ath.xp?.toLocaleString()} FLUX</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={16} color="#00E5FF" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[c$.simBtn, (simulating || selectedSim.length === 0) && c$.simBtnOff]}
              onPress={runSimulation}
              disabled={simulating || selectedSim.length === 0}
              activeOpacity={0.85}
            >
              {simulating ? <ActivityIndicator color="#000" size="small" /> : (
                <><Ionicons name="calculator" size={15} color="#000" /><Text style={c$.simBtnText}>CALCOLA SCORE ({selectedSim.length} Kore)</Text></>
              )}
            </TouchableOpacity>

            {simResult && (
              <View style={c$.simResult}>
                <Text style={c$.simResultLabel}>KORE BATTLE SCORE SIMULATO</Text>
                <Text style={c$.simScore}>{simResult.score}</Text>
                <Text style={[c$.simIntensity, { color: simResult.intensity === 'high' ? '#00FF87' : simResult.intensity === 'medium' ? '#FF9500' : '#FF3B30' }]}>
                  {(simResult.intensity || '').toUpperCase()} INTENSITY
                </Text>
                <Text style={c$.simNote}>{simResult.note}</Text>
                <View style={c$.breakdownList}>
                  {simResult.breakdown?.map((b: any, i: number) => (
                    <View key={i} style={c$.breakdownRow}>
                      <Text style={c$.breakdownName}>{b.username}</Text>
                      <Text style={c$.breakdownScore}>KORE {b.kore_score}</Text>
                      <Text style={c$.breakdownXp}>{b.xp?.toLocaleString()} FLUX</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const c$ = StyleSheet.create({
  root: { flex: 1 }, content: { padding: 28, gap: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 4, marginBottom: 4 },
  twoCol: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  leftCol: { flex: 1.2, gap: 12 },
  rightCol: { flex: 1, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: '#0A0A0A', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1E1E1E' },
  statVal: { fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  statLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 4 },
  battleList: { backgroundColor: '#0A0A0A', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1E1E1E' },
  battleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: '#111' },
  pill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  battleInfo: { flex: 1, gap: 2 },
  battleMatch: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700' },
  battleScore: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '300' },
  battleDate: { color: 'rgba(255,255,255,0.2)', fontSize: 13 },
  empty: { alignItems: 'center', padding: 30, gap: 12 },
  emptyText: { color: 'rgba(255,255,255,0.25)', fontSize: 14, textAlign: 'center', lineHeight: 18 },
  simCard: { backgroundColor: '#0A0A0A', borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: '#1E1E1E' },
  simDesc: { color: 'rgba(255,255,255,0.30)', fontSize: 14, fontWeight: '300', lineHeight: 17 },
  athRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#111' },
  athRowSel: { backgroundColor: '#00E5FF0A', borderRadius: 8 },
  athAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  athLetter: { color: '#000', fontSize: 14, fontWeight: '900' },
  athName: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700' },
  athMeta: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '300' },
  simBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFD700', borderRadius: 8, paddingVertical: 11 },
  simBtnOff: { opacity: 0.4 },
  simBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  simResult: { backgroundColor: '#111', borderRadius: 10, padding: 14, gap: 6 },
  simResultLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  simScore: { color: '#00E5FF', fontSize: 40, fontWeight: '900', letterSpacing: 2 },
  simIntensity: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  simNote: { color: 'rgba(255,255,255,0.30)', fontSize: 13, fontWeight: '300', lineHeight: 16 },
  breakdownList: { gap: 4 },
  breakdownRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 4 },
  breakdownName: { flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' },
  breakdownScore: { color: '#FFD700', fontSize: 13, fontWeight: '700' },
  breakdownXp: { color: 'rgba(255,255,255,0.25)', fontSize: 12 }
});
