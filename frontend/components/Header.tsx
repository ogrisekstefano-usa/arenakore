/**
 * ARENAKORE — Unified Global Header v2.0
 * ═══════════════════════════════════════
 * LEFT:   Bell icon (Notifications)
 * CENTER: Tab Title (bold)
 * RIGHT:  Multi-Wallet FLUX (Neon / Master / Diamond) + Menu
 *
 * IMPORTANT: This header is shared by ALL tabs.
 * Colors are globally synced via eliteTheme.ts EL constants.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ControlCenter } from './ControlCenter';
import { NotificationSheet, Notification } from './NotificationSheet';
import { EL, FONT_JAKARTA, FONT_MONT } from '../utils/eliteTheme';

// ═══ FLUX WALLET TIERS — Global Color Definitions ═══
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

  // FLUX balances — uses ak_credits as total, split into tiers
  const totalFlux = user?.ak_credits || 0;
  // For now: all flux goes to Neon tier until backend multi-wallet is implemented
  const neonFlux = totalFlux;
  const masterFlux = user?.master_flux || 0;
  const diamondFlux = user?.diamond_flux || 0;

  // Notifications — TODO: fetch from backend
  const notifications: Notification[] = [];

  return (
    <>
      <View style={[h.container, { paddingTop: insets.top + 4 }]}>
        <View style={h.row}>

          {/* ═══ LEFT: Tab Title — aligned left ═══ */}
          <Text style={h.title} numberOfLines={1}>{title}</Text>

          {/* ═══ RIGHT: Multi-Wallet FLUX + Bell + Menu ═══ */}
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
              <Text style={[h.fluxVal, { color: FLUX_TIERS.master.color }]}>
                {masterFlux}
              </Text>
            </View>

            {/* Diamond FLUX */}
            <View style={[h.fluxChip, { borderColor: `${FLUX_TIERS.diamond.color}25` }]}>
              <Ionicons name={FLUX_TIERS.diamond.icon} size={11} color={FLUX_TIERS.diamond.color} />
              <Text style={[h.fluxVal, { color: FLUX_TIERS.diamond.color }]}>
                {diamondFlux}
              </Text>
            </View>

            {rightAction}

            {/* Notification Bell */}
            <TouchableOpacity
              style={h.bellBtn}
              onPress={() => setNotifOpen(true)}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            >
              <Ionicons name="notifications-outline" size={20} color={EL.TEXT_SEC} />
              {notifications.length > 0 && (
                <View style={h.bellDot} />
              )}
            </TouchableOpacity>

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

      {/* Modals */}
      <ControlCenter visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <NotificationSheet
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// STYLES — Globally synced colors from EL (eliteTheme)
// ══════════════════════════════════════════════════════════════
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

  // ─── LEFT: Bell ───
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

  // ─── LEFT: Title ───
  title: {
    fontFamily: FONT_MONT,
    fontWeight: '800',
    fontSize: 18,
    color: EL.TEXT,
    letterSpacing: 2,
    textAlign: 'left',
    flex: 1,
    marginRight: 8,
  },

  // ─── RIGHT: Multi-Wallet + Menu ───
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
