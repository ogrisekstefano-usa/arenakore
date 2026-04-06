/**
 * ARENAKORE — Unified Global Header v3.0
 * ═══════════════════════════════════════
 * LEFT:   Bell icon (Notifications)
 * CENTER: Tab Title (bold, centered)
 * RIGHT:  Multi-Wallet FLUX (Neon / Master / Diamond)
 *
 * IMPORTANT: This header is shared by ALL tabs.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ControlCenter } from './ControlCenter';
import { NotificationSheet, Notification } from './NotificationSheet';
import { EL, FONT_JAKARTA, FONT_MONT } from '../utils/eliteTheme';

// ═══ FLUX WALLET TIERS ═══
const FLUX_TIERS = {
  neon:    { icon: 'flash' as const,         color: '#00E5FF', label: 'N' },
  master:  { icon: 'shield-half' as const,   color: '#FFD700', label: 'M' },
  diamond: { icon: 'diamond' as const,       color: '#E040FB', label: 'D' },
};

interface HeaderProps {
  title: string;
  rightAction?: React.ReactNode;
}

export function Header({ title, rightAction }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const neonFlux = user?.ak_credits || 0;
  const masterFlux = user?.master_flux || 0;
  const diamondFlux = user?.diamond_flux || 0;

  const notifications: Notification[] = [];

  return (
    <>
      <View style={[h.container, { paddingTop: insets.top + 4 }]}>
        <View style={h.row}>

          {/* ═══ LEFT: Notification Bell ═══ */}
          <View style={h.leftGroup}>
            <TouchableOpacity
              style={h.bellBtn}
              onPress={() => setNotifOpen(true)}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            >
              <Ionicons name="notifications-outline" size={20} color={EL.TEXT_SEC} />
              {notifications.length > 0 && <View style={h.bellDot} />}
            </TouchableOpacity>
          </View>

          {/* ═══ CENTER: Tab Title ═══ */}
          <Text style={h.title} numberOfLines={1}>{title}</Text>

          {/* ═══ RIGHT: Multi-Wallet FLUX ═══ */}
          <View style={h.rightGroup}>
            {/* Neon FLUX */}
            <View style={[h.fluxChip, { borderColor: `${FLUX_TIERS.neon.color}25` }]}>
              <Ionicons name={FLUX_TIERS.neon.icon} size={11} color={FLUX_TIERS.neon.color} />
              <Text style={[h.fluxVal, { color: FLUX_TIERS.neon.color }]}>
                {neonFlux > 999 ? `${(neonFlux / 1000).toFixed(1)}k` : neonFlux}
              </Text>
            </View>

            {/* Master FLUX */}
            <View style={[h.fluxChip, { borderColor: `${FLUX_TIERS.master.color}25` }]}>
              <Ionicons name={FLUX_TIERS.master.icon} size={11} color={FLUX_TIERS.master.color} />
              <Text style={[h.fluxVal, { color: FLUX_TIERS.master.color }]}>{masterFlux}</Text>
            </View>

            {/* Diamond FLUX */}
            <View style={[h.fluxChip, { borderColor: `${FLUX_TIERS.diamond.color}25` }]}>
              <Ionicons name={FLUX_TIERS.diamond.icon} size={11} color={FLUX_TIERS.diamond.color} />
              <Text style={[h.fluxVal, { color: FLUX_TIERS.diamond.color }]}>{diamondFlux}</Text>
            </View>

            {rightAction}

            {/* Menu ••• */}
            <TouchableOpacity
              onPress={() => setMenuOpen(true)}
              style={h.menuBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={EL.TEXT_SEC} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ControlCenter visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <NotificationSheet visible={notifOpen} onClose={() => setNotifOpen(false)} notifications={notifications} />
    </>
  );
}

const h = StyleSheet.create({
  container: {
    backgroundColor: EL.BG,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },

  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 44,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: EL.BG,
  },

  title: {
    fontFamily: FONT_MONT,
    fontWeight: '800',
    fontSize: 16,
    color: EL.TEXT,
    letterSpacing: 2,
    textAlign: 'center',
    flex: 1,
  },

  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fluxChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  fluxVal: {
    fontFamily: FONT_JAKARTA,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  menuBtn: {
    padding: 8,
    marginLeft: 2,
  },
});
