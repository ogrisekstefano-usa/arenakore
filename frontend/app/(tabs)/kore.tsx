/**
 * KORE TAB — Build 22 · STABILITY OVERDRIVE · Skeleton + Safe Parser
 * IRONCLAD network layer — safe JSON parsing, no crash on server errors
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const API = 'https://arenakore-api.onrender.com/api';

// Safe JSON parser — never crashes on non-JSON responses
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

export default function KoreTab() {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('Nessun token'); setLoading(false); return; }
    safeFetch(`${API}/users/me`, token)
      .then(d => {
        if (d?._error) setError(d.message);
        else setProfile(d);
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.title}>KORE PASSPORT</Text>
        <Text style={s.sub}>Build 22 · Stability Overdrive</Text>
        <View style={s.divider} />

        <Text style={s.label}>IDENTITÀ</Text>
        <Text style={s.value}>{user?.username?.toUpperCase() || '—'}</Text>
        <Text style={s.valueSub}>{user?.email || '—'} · {user?.role || '—'}</Text>
        <View style={s.divider} />

        <Text style={s.label}>DATI PROFILO</Text>
        {loading ? (
          <View style={s.loadRow}>
            <ActivityIndicator size="small" color="#FFD700" />
            <Text style={s.loadText}>Caricamento...</Text>
          </View>
        ) : error ? (
          <View style={s.errorCard}>
            <Ionicons name="cloud-offline-outline" size={16} color="rgba(255,215,0,0.4)" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : profile ? (
          <View style={s.profileCard}>
            {[
              { k: 'SPORT', v: profile?.sport?.toUpperCase() },
              { k: 'AK DROPS', v: `💧 ${profile?.ak_credits ?? 0}` },
              { k: 'KORE ID', v: profile?.kore_id },
              { k: 'RUOLO', v: profile?.role?.toUpperCase() },
            ].map((r, i) => (
              <View key={i} style={s.row}>
                <Text style={s.rowLabel}>{r.k}</Text>
                <Text style={s.rowValue}>{r.v || '—'}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={s.divider} />
        <Text style={s.footer}>KORE Tab operativa · IRONCLAD Network</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  title: { color: '#FFD700', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  sub: { color: '#00E5FF', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 20 },
  label: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 8 },
  value: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  valueSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600', marginTop: 4 },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  loadText: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
  errorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,215,0,0.04)', borderRadius: 10, padding: 14
  },
  errorText: { color: 'rgba(255,215,0,0.5)', fontSize: 12, fontWeight: '600', flex: 1 },
  profileCard: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.08)', overflow: 'hidden'
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)'
  },
  rowLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  rowValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  footer: { color: 'rgba(255,255,255,0.1)', fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 32 },
});
