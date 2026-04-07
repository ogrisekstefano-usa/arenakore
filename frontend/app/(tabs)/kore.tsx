/**
 * KORE TAB — GHOST MODE
 * ZERO imports pesanti. Solo testo statico.
 * Scopo: isolare se il crash NÈXUS viene da questa tab.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function KoreScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Text style={s.title}>KORE TAB</Text>
      <Text style={s.sub}>MEMORY SAVER MODE</Text>
      <Text style={s.info}>Componenti disattivati per test stabilità NÈXUS</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#00E5FF', fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  sub: { color: '#FFD700', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginTop: 8 },
  info: { color: '#555', fontSize: 11, marginTop: 16, textAlign: 'center', paddingHorizontal: 40 },
});
