/**
 * DNA TAB — Build 21 · STEP-BY-STEP · Hello World
 * ZERO librerie esterne. ZERO animazioni. ZERO nativi.
 */
import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

export default function DnaTab() {
  const { user } = useAuth();
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <View style={s.content}>
        <Text style={s.title}>DNA</Text>
        <Text style={s.sub}>Build 21 · Step-by-Step · Hello World</Text>
        <View style={s.divider} />
        <Text style={s.label}>UTENTE</Text>
        <Text style={s.value}>{user?.username || '—'}</Text>
        <View style={s.divider} />
        <Text style={s.footer}>DNA Tab operativa · Nessun crash atteso</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { color: '#32D74B', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  sub: { color: '#00E5FF', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 20 },
  label: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 8 },
  value: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footer: { color: 'rgba(255,255,255,0.1)', fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 32 },
});
