import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ControlCenter } from './ControlCenter';
import { FluxIcon, FluxPulse } from './FluxIcon';

const FONT_ACCENT: any = Platform.select({
  web: { fontFamily: "'Plus Jakarta Sans', 'Montserrat', sans-serif" },
  default: {},
});

export function Header({ title, rightAction }: { title: string; rightAction?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const flux = user?.ak_credits || 0;

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.row}>
          <View style={styles.brand}>
            <Text style={styles.brandArena}>ARENA</Text>
            <Text style={styles.brandKore}>KORE</Text>
          </View>

          <View style={styles.rightRow}>
            {/* FLUX PILL — Always Visible Motivation Wallet */}
            <View style={styles.fluxPill}>
              <FluxIcon size={14} color="#00E5FF" />
              <Text style={[styles.fluxNum, FONT_ACCENT]}>{flux.toLocaleString()}</Text>
              <Text style={styles.fluxLabel}>FLUX</Text>
            </View>

            {rightAction}
            <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.menuBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="menu" size={24} color="#00E5FF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <ControlCenter visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#000000', paddingHorizontal: 24, paddingBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', gap: 3 },
  brandArena: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  brandKore: { color: '#FFD700', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn: { padding: 6 },

  // FLUX PILL
  fluxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#00F2FF12',
    borderWidth: 1,
    borderColor: '#00F2FF33',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fluxNum: {
    color: '#00F2FF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fluxLabel: {
    color: '#00F2FF',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1.5,
    opacity: 0.6,
  },
});
