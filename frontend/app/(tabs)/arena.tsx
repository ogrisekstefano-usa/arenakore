/**
 * ARENA TAB — Build 22 · STABILITY OVERDRIVE · Skeleton + Safe Parser
 * IRONCLAD network layer — safe JSON parsing, no crash on server errors
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const API = 'https://arenakore-api.onrender.com/api';

async function safeFetch(url: string, token: string): Promise<any> {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ArenaKore/2.1.0 (Build22)',
      },
      signal: controller.signal,
    });
    clearTimeout(tid);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      const text = await res.text().catch(() => '');
      return { _error: true, message: `Server: ${text.slice(0, 100) || res.status}` };
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { _error: true, message: err?.detail || `HTTP ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { _error: true, message: e?.name === 'AbortError' ? 'Timeout 20s' : (e?.message || 'Errore di rete') };
  }
}

export default function ArenaTab() {
  const { user, token } = useAuth();
  const [battles, setBattles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('Nessun token'); setLoading(false); return; }
    safeFetch(`${API}/battles/crew/live`, token)
      .then(d => {
        if (d?._error) setError(d.message);
        else if (Array.isArray(d)) setBattles(d);
        else if (d?.battles && Array.isArray(d.battles)) setBattles(d.battles);
        else setBattles([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.title}>ARENA</Text>
        <Text style={s.sub}>Build 22 · Stability Overdrive</Text>
        <View style={s.divider} />

        <Text style={s.label}>UTENTE</Text>
        <Text style={s.value}>{user?.username?.toUpperCase() || '—'} · {user?.role || '—'}</Text>
        <View style={s.divider} />

        <Text style={s.label}>BATTAGLIE LIVE</Text>
        {loading ? (
          <View style={s.loadRow}>
            <ActivityIndicator size="small" color="#FF453A" />
            <Text style={s.loadText}>Caricamento...</Text>
          </View>
        ) : error ? (
          <View style={s.errorCard}>
            <Ionicons name="cloud-offline-outline" size={16} color="rgba(255,69,58,0.4)" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : battles.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="flame-outline" size={28} color="rgba(255,255,255,0.12)" />
            <Text style={s.emptyText}>Nessuna battaglia attiva</Text>
          </View>
        ) : (
          battles.map((b: any, i: number) => (
            <View key={b?._id || i} style={s.battleCard}>
              <Ionicons name="flame" size={16} color="#FF453A" />
              <Text style={s.battleText}>{b?.crew_a?.name || 'Crew A'} vs {b?.crew_b?.name || 'Crew B'}</Text>
            </View>
          ))
        )}

        <View style={s.divider} />
        <Text style={s.footer}>Arena Tab operativa · IRONCLAD Network</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  title: { color: '#FF453A', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  sub: { color: '#00E5FF', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 20 },
  label: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 8 },
  value: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  loadText: { color: '#FF453A', fontSize: 12, fontWeight: '600' },
  errorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,69,58,0.04)', borderRadius: 10, padding: 14
  },
  errorText: { color: 'rgba(255,69,58,0.5)', fontSize: 12, fontWeight: '600', flex: 1 },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 24, alignItems: 'center'
  },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '700', marginTop: 8 },
  battleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,69,58,0.04)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,69,58,0.08)', padding: 14, marginBottom: 8
  },
  battleText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  footer: { color: 'rgba(255,255,255,0.1)', fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 32 },
});
