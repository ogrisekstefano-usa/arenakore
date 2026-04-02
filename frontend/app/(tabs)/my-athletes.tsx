/**
 * ARENAKORE — MY ATHLETES TAB (COACH view)
 * Mostrata solo quando role === 'COACH'
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar,
  TouchableOpacity, ActivityIndicator, RefreshControl, ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { Header } from '../../components/Header';
import { TAB_BACKGROUNDS } from '../../utils/images';

const DNA_KEYS = ['velocita','forza','resistenza','agilita','tecnica','potenza'];

function dnaAvg(dna: any) {
  if (!dna) return 0;
  const vals = DNA_KEYS.map(k => Number(dna[k] || 0)).filter(v => v > 0);
  return vals.length ? Math.round(vals.reduce((a,b) => a+b,0) / vals.length) : 0;
}

export default function MyAthletes() {
  const { token } = useAuth();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const lb = await api.getLeaderboard('global', token);
      setAthletes(Array.isArray(lb) ? lb.slice(0, 20) : []);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  return (
    <ImageBackground source={{ uri: TAB_BACKGROUNDS.kore }} style={s.root} imageStyle={{ opacity: 0.10 }}>
      <StatusBar barStyle="light-content" />
      <Header title="I MIEI ATLETI" />
      {loading ? (
        <View style={s.center}><ActivityIndicator color="#00E5FF" size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#00E5FF" />}
        >
          <Text style={s.sectionTitle}>ROSTER — {athletes.length} ATLETI</Text>
          {athletes.map((a, idx) => {
            const avg = dnaAvg(a.dna);
            return (
              <View key={a.id || idx} style={s.card}>
                <View style={s.rankBox}>
                  <Text style={s.rank}>#{idx + 1}</Text>
                </View>
                <View style={s.info}>
                  <Text style={s.name}>{a.username}</Text>
                  <Text style={s.sub}>{a.sport || 'ATHLETE'} · LVL {a.level || 1}</Text>
                </View>
                <View style={s.stats}>
                  <Text style={s.xp}>{a.xp || 0} XP</Text>
                  {avg > 0 && (
                    <View style={s.dnaChip}>
                      <Text style={s.dnaChipText}>DNA {avg}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={s.actionBtn}>
                  <Ionicons name="bar-chart" size={14} color="#00E5FF" />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: {
    color: 'rgba(0,229,255,0.5)', fontSize: 11, fontWeight: '900',
    letterSpacing: 4, marginBottom: 14,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  rankBox: { width: 32, alignItems: 'center' },
  rank: { color: '#AAAAAA', fontSize: 13, fontWeight: '900' },
  info: { flex: 1, gap: 2 },
  name: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  sub: { color: '#AAAAAA', fontSize: 12, fontWeight: '400' },
  stats: { alignItems: 'flex-end', gap: 4 },
  xp: { color: '#FFD700', fontSize: 13, fontWeight: '900' },
  dnaChip: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  dnaChipText: { color: '#00E5FF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  actionBtn: { padding: 8 },
});
