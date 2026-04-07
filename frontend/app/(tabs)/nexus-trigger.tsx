/**
 * ARENAKORE — NÈXUS TAB (SAFE MODE)
 * Heavy modules disabled. NEXUS Engine placeholder.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Header } from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';

export default function NexusTriggerScreen() {
  return (
    <View style={s.root}>
      <Header title="NÈXUS" />
      <View style={s.center}>
        <View style={s.iconWrap}>
          <Ionicons name="flash" size={48} color="#00E5FF" />
        </View>
        <Text style={s.title}>NÈXUS ENGINE</Text>
        <Text style={s.sub}>Pronto per l'attivazione</Text>
        <Text style={s.info}>I moduli biometrici verranno caricati{"\n"}quando avvierai una sfida.</Text>
        <View style={s.statusRow}>
          <View style={[s.dot, { backgroundColor: '#00FF87' }]} />
          <Text style={s.statusText}>SISTEMA STABILE</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: '#00E5FF30', alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: '#00E5FF08' },
  title: { color: '#00E5FF', fontSize: 22, fontWeight: '900', letterSpacing: 4 },
  sub: { color: '#FFD700', fontSize: 15, fontWeight: '700', marginTop: 8 },
  info: { color: '#666', fontSize: 13, marginTop: 12, textAlign: 'center', lineHeight: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#00FF8710', borderWidth: 1, borderColor: '#00FF8730' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#00FF87', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
});
