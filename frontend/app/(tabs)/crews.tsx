/**
 * ARENAKORE — CREWS TAB (SAFE RESTORE)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Header } from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';

export default function CrewsScreen() {
  return (
    <View style={s.root}>
      <Header title="CREWS" />
      <View style={s.center}>
        <Ionicons name="people-outline" size={40} color="#333" />
        <Text style={s.text}>Le tue Crew appariranno qui</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  text: { color: '#555', fontSize: 13 },
});
