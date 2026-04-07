/**
 * ARENAKORE — RANK TAB (SAFE RESTORE)
 * Header + leaderboard. No heavy native modules.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Header } from '../../components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const API = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL
  || process.env.EXPO_PUBLIC_BACKEND_URL
  || '';

export default function HallScreen() {
  const { user, token } = useAuth();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/leaderboard`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const d = await res.json(); setLeaders(d.leaderboard || d || []); }
      } catch (_) {}
      setLoading(false);
    })();
  }, [token]);

  return (
    <View style={s.root}>
      <Header title="RANK" />
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.section}>CLASSIFICA GLOBALE</Text>
        {loading ? (
          <ActivityIndicator color="#FFD700" style={{ marginTop: 30 }} />
        ) : leaders.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="trophy-outline" size={32} color="#333" />
            <Text style={s.emptyText}>Classifica vuota</Text>
          </View>
        ) : (
          leaders.slice(0, 20).map((l: any, i: number) => (
            <View key={i} style={[s.row, i === 0 && s.goldRow]}>
              <Text style={[s.rank, i < 3 && { color: '#FFD700' }]}>#{i + 1}</Text>
              <Text style={s.name}>{(l.username || 'KORE').toUpperCase()}</Text>
              <Text style={s.xp}>{l.total_xp || l.xp || 0} XP</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  scroll: { padding: 16, paddingBottom: 100 },
  section: { color: '#FFD700', fontSize: 14, fontWeight: '800', letterSpacing: 3, marginBottom: 16 },
  emptyCard: { backgroundColor: '#111', borderRadius: 16, padding: 32, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#222' },
  emptyText: { color: '#555', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 10, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: '#1a1a1a' },
  goldRow: { borderColor: '#FFD70030', backgroundColor: '#FFD70008' },
  rank: { color: '#888', fontSize: 14, fontWeight: '800', width: 40 },
  name: { color: '#FFF', fontSize: 14, fontWeight: '600', flex: 1 },
  xp: { color: '#00E5FF', fontSize: 13, fontWeight: '700' },
});
