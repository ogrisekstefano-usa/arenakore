import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

export function Header({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <Text style={styles.brandArena}>ARENA</Text>
          <Text style={styles.brandKore}>KORE</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={logout} style={styles.avatarBtn}>
          <View style={[styles.avatar, { backgroundColor: user?.avatar_color || '#00F2FF' }]}>
            <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase() || '?'}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#050505', paddingHorizontal: 16, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', gap: 3 },
  brandArena: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: -0.5 },
  brandKore: { color: '#D4AF37', fontSize: 14, fontWeight: '900', letterSpacing: -0.5 },
  title: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  avatarBtn: { padding: 4 },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#050505', fontSize: 14, fontWeight: '900' },
});
