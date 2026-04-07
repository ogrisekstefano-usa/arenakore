/**
 * ARENAKORE — DNA TAB (SAFE RESTORE)
 * Header + DNA radar. No heavy native modules.
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

export default function DnaScreen() {
  const { user, token } = useAuth();
  const [dna, setDna] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/dna/history`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setDna(await res.json());
      } catch (_) {}
      setLoading(false);
    })();
  }, [token]);

  const sport = user?.preferred_sport || 'Fitness';

  return (
    <View style={s.root}>
      <Header title="DNA" />
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.section}>ANALISI BIOMETRICA · {sport.toUpperCase()}</Text>
        {loading ? (
          <ActivityIndicator color="#00E5FF" style={{ marginTop: 30 }} />
        ) : !dna || (Array.isArray(dna) && dna.length === 0) ? (
          <View style={s.emptyCard}>
            <Ionicons name="analytics-outline" size={32} color="#333" />
            <Text style={s.emptyText}>Completa una scansione per visualizzare il DNA</Text>
          </View>
        ) : (
          <View style={s.dataCard}>
            <Text style={s.dataTitle}>PROFILO DNA ATTIVO</Text>
            <Text style={s.dataSub}>{Array.isArray(dna) ? dna.length : 0} record biometrici</Text>
          </View>
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
  emptyText: { color: '#555', fontSize: 13, textAlign: 'center' },
  dataCard: { backgroundColor: '#111', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#00E5FF20' },
  dataTitle: { color: '#00E5FF', fontSize: 15, fontWeight: '700' },
  dataSub: { color: '#888', fontSize: 12, marginTop: 4 },
});
