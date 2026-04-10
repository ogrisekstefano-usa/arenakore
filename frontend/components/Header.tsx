/**
 * ARENAKORE — Standard Header v4.0 (Build 28)
 * ═══════════════════════════════════════════════
 * LEFT:   "ARENAKORE" text logo
 * CENTER: 3 FLUSH indicators (clickable → FlushModal)
 * RIGHT:  Notification Bell + Burger Menu (☰)
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ControlCenter } from './ControlCenter';
import { NotificationSheet, Notification } from './NotificationSheet';
import { FlushModal } from './FlushModal';

const GOLD = '#FFD700';
const CYAN = '#00E5FF';
const PURPLE = '#E040FB';

interface HeaderProps {
  title?: string;
  rightAction?: React.ReactNode;
}

export function Header({ title, rightAction }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [flushOpen, setFlushOpen] = useState(false);
  const [flushTier, setFlushTier] = useState(0);

  const neonFlux = user?.ak_credits || 0;
  const masterFlux = user?.master_flux || 0;
  const diamondFlux = user?.diamond_flux || 0;
  const notifications: Notification[] = [];

  const openFlush = (tier: number) => {
    setFlushTier(tier);
    setFlushOpen(true);
  };

  return (
    <>
      <View style={[h.container, { paddingTop: insets.top + 4 }]}>
        <View style={h.row}>
          {/* ═══ LEFT: ARENAKORE Logo ═══ */}
          <View style={h.leftGroup}>
            <Text style={h.logoText}>ARENA</Text>
            <Text style={h.logoAccent}>KORE</Text>
          </View>

          {/* ═══ CENTER: 3 FLUSH Indicators (clickable) ═══ */}
          <View style={h.flushGroup}>
            <TouchableOpacity
              style={[h.fluxChip, { borderColor: CYAN + '25' }]}
              onPress={() => openFlush(0)}
              activeOpacity={0.7}
            >
              <Ionicons name="flash" size={10} color={CYAN} />
              <Text style={[h.fluxVal, { color: CYAN }]}>
                {neonFlux > 999 ? `${(neonFlux / 1000).toFixed(1)}k` : neonFlux}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[h.fluxChip, { borderColor: GOLD + '25' }]}
              onPress={() => openFlush(1)}
              activeOpacity={0.7}
            >
              <Ionicons name="shield-half" size={10} color={GOLD} />
              <Text style={[h.fluxVal, { color: GOLD }]}>{masterFlux}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[h.fluxChip, { borderColor: PURPLE + '25' }]}
              onPress={() => openFlush(2)}
              activeOpacity={0.7}
            >
              <Ionicons name="diamond" size={10} color={PURPLE} />
              <Text style={[h.fluxVal, { color: PURPLE }]}>{diamondFlux}</Text>
            </TouchableOpacity>
          </View>

          {/* ═══ RIGHT: Notifications + Burger ═══ */}
          <View style={h.rightGroup}>
            {rightAction}
            <TouchableOpacity
              style={h.iconBtn}
              onPress={() => setNotifOpen(true)}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            >
              <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.5)" />
              {notifications.length > 0 && <View style={h.bellDot} />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMenuOpen(true)}
              style={h.iconBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="menu" size={22} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ControlCenter visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <NotificationSheet visible={notifOpen} onClose={() => setNotifOpen(false)} notifications={notifications} />
      <FlushModal
        visible={flushOpen}
        onClose={() => setFlushOpen(false)}
        neonFlux={neonFlux}
        masterFlux={masterFlux}
        diamondFlux={diamondFlux}
        initialTier={flushTier}
      />
    </>
  );
}

const h = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  // Left — Logo
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    minWidth: 100,
  },
  logoText: {
    fontWeight: '900',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  logoAccent: {
    fontWeight: '900',
    fontSize: 14,
    color: CYAN,
    letterSpacing: 1,
  },
  // Center — 3 FLUSH
  flushGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  fluxChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  fluxVal: {
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  // Right — Icons
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 80,
    justifyContent: 'flex-end',
  },
  iconBtn: {
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
    borderColor: '#000',
  },
});
