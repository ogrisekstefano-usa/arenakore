/**
 * ARENA TAB — Build 21 · STEP-BY-STEP · Hello World
 * ZERO librerie esterne. ZERO animazioni. ZERO nativi.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

const API = 'https://arenakore-api.onrender.com/api';

export default function ArenaTab() {
  const { user, token } = useAuth();
  const [apiResult, setApiResult] = useState<string>('Caricamento...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setApiResult('Nessun token'); setLoading(false); return; }
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 30000);
    fetch(`${API}/battles/crew/live`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ArenaKore/2.1.0 (Build21)',
      },
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(d => setApiResult(JSON.stringify(d, null, 2)))
      .catch(e => setApiResult(`ERRORE: ${e?.message || 'sconosciuto'}`))
      .finally(() => { clearTimeout(tid); setLoading(false); });
  }, [token]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.title}>ARENA</Text>
        <Text style={s.sub}>Build 21 · Step-by-Step · Hello World</Text>
        <View style={s.divider} />
        <Text style={s.label}>UTENTE</Text>
        <Text style={s.value}>{user?.username || '—'} · {user?.role || '—'}</Text>
        <View style={s.divider} />
        <Text style={s.label}>API /battles/crew/live (JSON GREZZO)</Text>
        {loading ? (
          <ActivityIndicator color="#FF453A" style={{ marginTop: 12 }} />
        ) : (
          <Text style={s.json}>{apiResult}</Text>
        )}
        <View style={s.divider} />
        <Text style={s.footer}>Arena Tab operativa · Nessun crash atteso</Text>
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
  json: { color: '#FF453A', fontSize: 11, fontWeight: '500', fontFamily: 'monospace', lineHeight: 16 },
  footer: { color: 'rgba(255,255,255,0.1)', fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 32 },
});
