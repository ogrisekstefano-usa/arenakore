/**
 * ARENAKORE — SAFE BOOT TEST
 * Minimal screen to verify Expo Go boots without crash.
 * No native modules, no heavy imports, pure React Native core.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SafeTestScreen() {
  return (
    <View style={s.root}>
      <Text style={s.title}>ARENAKORE</Text>
      <Text style={s.sub}>BOOT TEST — OK</Text>
      <Text style={s.info}>Se vedi questo, il boot è riuscito.</Text>
      <Text style={s.info}>Nessun modulo nativo caricato.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#00E5FF', fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  sub: { color: '#FFD700', fontSize: 16, fontWeight: '700', marginTop: 12 },
  info: { color: '#888', fontSize: 13, marginTop: 8 },
});
