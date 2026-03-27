import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ControlCenter } from './ControlCenter';

export function Header({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.row}>
          <View style={styles.brand}>
            <Text style={styles.brandArena}>ARENA</Text>
            <Text style={styles.brandKore}>KORE</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.menuBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="menu" size={24} color="#00F2FF" />
          </TouchableOpacity>
        </View>
      </View>
      <ControlCenter visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#050505', paddingHorizontal: 16, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', gap: 3 },
  brandArena: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0 },
  brandKore: { color: '#D4AF37', fontSize: 15, fontWeight: '900', letterSpacing: 0 },
  title: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  menuBtn: { padding: 6 },
});
