import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
          <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.menuBtn}>
            <Text style={styles.menuIcon}>{'\u2630'}</Text>
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
  brandArena: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: -0.5 },
  brandKore: { color: '#D4AF37', fontSize: 14, fontWeight: '900', letterSpacing: -0.5 },
  title: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  menuBtn: { padding: 6 },
  menuIcon: { color: '#00F2FF', fontSize: 22, fontWeight: '700' },
});
