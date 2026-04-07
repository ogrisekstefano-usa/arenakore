/**
 * ARENAKORE — ARENA TAB (SAFE RESTORE)
 * Header + basic content. No heavy modules.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Header } from '../../components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { EL, FONT_MONT } from '../../utils/eliteTheme';
import Constants from 'expo-constants';

const API = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL
  || process.env.EXPO_PUBLIC_BACKEND_URL
  || '';

export default function ArenaScreen() {
  const { user, token, activeRole } = useAuth();
  const [battles, setBattles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/battles/crew/live`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setBattles(await res.json());
      } catch (_) {}
      setLoading(false);
    })();
  }, [token]);

  return (
    <View style={s.root}>
      <Header title={activeRole === 'GYM_OWNER' ? 'GYM HUB' : activeRole === 'COACH' ? 'LO STADIO' : 'ARENA'} />
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.section}>BATTAGLIE LIVE</Text>
        {loading ? (
          <ActivityIndicator color="#00E5FF" style={{ marginTop: 30 }} />
        ) : battles.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="flash-outline" size={32} color="#333" />
            <Text style={s.emptyText}>Nessuna battaglia attiva</Text>
          </View>
        ) : (
          battles.map((b: any, i: number) => (
            <View key={i} style={s.card}>
              <Text style={s.cardTitle}>{b.crew_a_name || 'CREW A'} vs {b.crew_b_name || 'CREW B'}</Text>
              <Text style={s.cardSub}>{b.status || 'IN CORSO'}</Text>
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
  section: { color: '#00E5FF', fontSize: 14, fontWeight: '800', letterSpacing: 3, marginBottom: 16 },
  emptyCard: { backgroundColor: '#111', borderRadius: 16, padding: 32, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#222' },
  emptyText: { color: '#555', fontSize: 13 },
  card: { backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#1a1a1a' },
  cardTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  cardSub: { color: '#888', fontSize: 12, marginTop: 4 },
});
