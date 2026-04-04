/**
 * ARENAKORE — Global Header (Apple Fitness Style)
 * Left: Bold Section Title
 * Right: FLUX Pill + Notifications bell + Menu
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ControlCenter } from './ControlCenter';
import { FluxIcon } from './FluxIcon';
import { EL, FONT_JAKARTA, FONT_MONT } from '../utils/eliteTheme';

export function Header({ title, rightAction }: { title: string; rightAction?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const flux = user?.ak_credits || 0;

  return (
    <>
      <View style={[h.container, { paddingTop: insets.top + 6 }]}>
        <View style={h.row}>
          {/* Left: Bold Title */}
          <Text style={h.title}>{title}</Text>

          {/* Right: FLUX + Bell + Menu */}
          <View style={h.rightGroup}>
            {/* FLUX Pill */}
            <View style={h.fluxPill}>
              <FluxIcon size={13} color={EL.CYAN} />
              <Text style={h.fluxNum}>{flux.toLocaleString()}</Text>
            </View>

            {/* Notifications */}
            <TouchableOpacity style={h.iconBtn} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
              <Ionicons name="notifications-outline" size={20} color={EL.TEXT_SEC} />
            </TouchableOpacity>

            {rightAction}

            {/* Menu */}
            <TouchableOpacity onPress={() => setMenuOpen(true)} style={h.menuBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="ellipsis-horizontal" size={20} color={EL.TEXT_SEC} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <ControlCenter visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

const h = StyleSheet.create({
  container: {
    backgroundColor: EL.BG,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: FONT_MONT,
    fontWeight: '800',
    fontSize: 28,
    color: EL.TEXT,
    letterSpacing: -0.3,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 6,
  },
  menuBtn: {
    padding: 10,
    marginLeft: 2,
  },
  // FLUX Pill — minimal
  fluxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: EL.CYAN_12,
    borderRadius: EL.RADIUS_PILL,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fluxNum: {
    fontFamily: FONT_JAKARTA,
    fontWeight: '700',
    fontSize: 14,
    color: EL.CYAN,
    letterSpacing: 0.3,
  },
});
