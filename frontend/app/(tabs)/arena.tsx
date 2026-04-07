/**
 * ISOLATION TEST — ARENA TAB (EMPTY)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ArenaScreen() {
  return (
    <View style={s.root}>
      <Text style={s.title}>ARENA</Text>
      <Text style={s.ok}>BOOT OK — TEST MODE</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#00E5FF', fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  ok: { color: '#00FF87', fontSize: 18, fontWeight: '700', marginTop: 16 },
});
