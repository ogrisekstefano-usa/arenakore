/**
 * ARENAKORE — MY ATHLETES TAB (SAFE RESTORE)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Header } from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';

export default function MyAthletesScreen() {
  return (
    <View style={s.root}>
      <Header title="I MIEI KORE" />
      <View style={s.center}>
        <Ionicons name="person-outline" size={40} color="#333" />
        <Text style={s.text}>I tuoi atleti appariranno qui</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  text: { color: '#555', fontSize: 13 },
});
