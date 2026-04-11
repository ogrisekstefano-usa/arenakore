/**
 * ARENAKORE — Universal Header v5.0 (Build 31)
 * ═══════════════════════════════════════════════
 * NEW LAYOUT (per direttiva utente):
 * LEFT:   Notification Bell (🔔) + "ARENAKORE" text logo
 * CENTER: 3 K-FLUX indicators (clickable → KFluxModal)
 * RIGHT:  Burger Menu (☰)
 *
 * IDENTICO su: NÈXUS, KORE ID, ARENA, CREW, CHALLENGE
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ControlCenter } from './ControlCenter';
import { NotificationSheet, Notification } from './NotificationSheet';
import { KFluxModal } from './KFluxModal';

const GOLD = '#FFD700';
const CYAN = '#00E5FF';
const PURPLE = '#BF5AF2';

interface HeaderProps {
  title?: string;
  rightAction?: React.ReactNode;
}

export function Header({ title, rightAction }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [kfluxOpen, setKfluxOpen] = useState(false);
  const [kfluxTier, setKfluxTier] = useState(0);

  const vitalFlux = user?.ak_credits || 0;
  const performFlux = user?.master_flux || 0;
  const teamFlux = user?.diamond_flux || 0;
  const notifications: Notification[] = [];

  const openKFlux = (tier: number) => {
    setKfluxTier(tier);
    setKfluxOpen(true);
  };

  return (
    <>
      <View style={[h.container, { paddingTop: insets.top + 4 }]}>
        <View style={h.row}>
          {/* ═══ LEFT: Bell + ARENAKORE Logo ═══ */}
          <View style={h.leftGroup}>
            <TouchableOpacity
              style={h.bellBtn}
              onPress={() => setNotifOpen(true)}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            >
              <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.5)" />
              {notifications.length > 0 && <View style={h.bellDot} />}
            </TouchableOpacity>
            <Text style={h.logoText}>ARENA</Text>
            <Text style={h.logoAccent}>KORE</Text>
          </View>

          {/* ═══ CENTER: 3 K-FLUX Indicators (clickable) ═══ */}
          <View style={h.flushGroup}>
            <TouchableOpacity
              style={[h.fluxChip, { borderColor: CYAN + '25' }]}
              onPress={() => openKFlux(0)}
              activeOpacity={0.7}
            >
              <Ionicons name="flash" size={10} color={CYAN} />
              <Text style={[h.fluxVal, { color: CYAN }]}>
                {vitalFlux > 999 ? `${(vitalFlux / 1000).toFixed(1)}k` : vitalFlux}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[h.fluxChip, { borderColor: GOLD + '25' }]}
              onPress={() => openKFlux(1)}
              activeOpacity={0.7}
            >
              <Ionicons name="trophy" size={10} color={GOLD} />
              <Text style={[h.fluxVal, { color: GOLD }]}>{performFlux}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[h.fluxChip, { borderColor: PURPLE + '25' }]}
              onPress={() => openKFlux(2)}
              activeOpacity={0.7}
            >
              <Ionicons name="people" size={10} color={PURPLE} />
              <Text style={[h.fluxVal, { color: PURPLE }]}>{teamFlux}</Text>
            </TouchableOpacity>
          </View>

          {/* ═══ RIGHT: Burger Menu (☰) ═══ */}
          <View style={h.rightGroup}>
            {rightAction}
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
      <KFluxModal
        visible={kfluxOpen}
        onClose={() => setKfluxOpen(false)}
        vitalFlux={vitalFlux}
        performFlux={performFlux}
        teamFlux={teamFlux}
        initialTier={kfluxTier}
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
  // Left — Bell + Logo
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 120,
  },
  bellBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
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
  // Center — 3 K-FLUX
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
  // Right — Menu
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 44,
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
    top: 4,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: '#000',
  },
});
