/**
 * ARENAKORE — Global Control Center
 * Accessible from all tabs via the ☰ icon in the Header.
 * Contains: Settings, Founder Pride, GYM HUB, ADMIN Ghosting, Logout.
 */
import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  SlideInRight, SlideOutRight, Easing,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth, UserRole, ROLE_CONFIG } from '../contexts/AuthContext';
import { profileDevice, getTierLabel, getTrackingMode } from '../utils/DeviceIntelligence';

const { width: SW } = Dimensions.get('window');

// ========== PULSE TICKER ==========
function PulseTicker() {
  const scrollX = useSharedValue(0);
  const TXT = '[LIVE] ALEX_K PUNCH (98Q) \u2022 MAYA_J JOINED BULLS \u2022 WORLD RECORD HALL OF KORE \u2022 3 NEW FOUNDERS \u2022 SHARKS VS WOLVES (LIVE) \u2022 ';
  useEffect(() => {
    scrollX.value = withRepeat(withTiming(-SW * 3, { duration: 25000, easing: Easing.linear }), -1, false);
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: scrollX.value }] }));
  return (
    <View style={st.ticker}>
      <Animated.View style={[{ flexDirection: 'row', width: SW * 6 }, s]}>
        <Text style={st.tickerText}>{TXT}{TXT}</Text>
      </Animated.View>
    </View>
  );
}

// ========== CONTROL CENTER ==========
export function ControlCenter({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, logout, activeRole, setActiveRole } = useAuth();
  const router = useRouter();
  const isFounder = user?.is_founder || user?.is_admin;
  const isAdmin = user?.is_admin;
  const ROLES: UserRole[] = ['ADMIN', 'GYM_OWNER', 'COACH', 'ATHLETE'];

  // Device tier (computed once)
  const profile = profileDevice();
  const deviceTier = profile.tier;

  if (!visible) return null;

  const items = [
    { icon: '\ud83e\uddec', label: 'Bio-Signature Scan', sub: 'Ricalibra i sensori' },
    { icon: '\u2699\ufe0f', label: 'Settings', sub: 'Configurazione NEXUS' },
    { icon: '\ud83c\udfc6', label: 'Founders Club', sub: isFounder ? `Founder #${user?.founder_number || '?'}` : 'Non ancora membro' },
    { icon: '\ud83d\udcac', label: 'Supporto', sub: 'Contatta il team KORE' },
  ];

  const gymItems = [
    { icon: '\ud83c\udfdb\ufe0f', label: 'GYM HUB', sub: 'Gestione Coach & Eventi' },
    { icon: '\ud83d\udcca', label: 'Analytics Palestra', sub: 'Iscrizioni, Revenue, Attivit\u00e0' },
  ];

  const handleLogout = () => {
    onClose();
    logout();
    router.replace('/');
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={st.blurLayer} />
        <Animated.View entering={SlideInRight.duration(250)} exiting={SlideOutRight.duration(200)} style={st.panel}>
          <LinearGradient colors={['rgba(8,8,8,0.97)', 'rgba(5,5,5,0.99)']} style={st.panelInner}>
            <View style={st.header}>
              <Text style={st.headerTitle}>CONTROL CENTER</Text>
              <TouchableOpacity onPress={onClose}><Text style={st.closeX}>{'\u2715'}</Text></TouchableOpacity>
            </View>

            {/* Device Tier */}
            <View style={st.tierBadge}>
              <Text style={st.tierLabel}>{getTierLabel(deviceTier)}</Text>
              <Text style={st.tierSub}>{getTrackingMode(deviceTier)}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              {/* Menu Items */}
              {items.map((item, i) => (
                <TouchableOpacity key={i} style={st.item} activeOpacity={0.7}>
                  <Text style={st.itemIcon}>{item.icon}</Text>
                  <View style={st.itemText}>
                    <Text style={st.itemLabel}>{item.label}</Text>
                    <Text style={st.itemSub}>{item.sub}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* GYM HUB — GYM_OWNER role */}
              {activeRole === 'GYM_OWNER' && (
                <View style={st.section}>
                  <View style={st.divider} />
                  <Text style={st.sectionTitle}>{'\ud83c\udfdb\ufe0f'} GYM HUB</Text>
                  {gymItems.map((item, i) => (
                    <TouchableOpacity key={`gym-${i}`} style={st.item} activeOpacity={0.7}>
                      <Text style={st.itemIcon}>{item.icon}</Text>
                      <View style={st.itemText}>
                        <Text style={[st.itemLabel, { color: '#D4AF37' }]}>{item.label}</Text>
                        <Text style={st.itemSub}>{item.sub}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Founder Pride */}
              {isFounder && (
                <View style={st.founderPride}>
                  <Text style={st.founderStar}>{'\u2605'}</Text>
                  <Text style={st.founderQuote}>You are one of the first 100 to enter the Kore. Your legacy is permanent.</Text>
                </View>
              )}

              {/* ADMIN PRIVILEGES — GHOSTING SWITCHER */}
              {isAdmin && (
                <View style={st.adminSection}>
                  <View style={st.divider} />
                  <Text style={st.adminTitle}>{'\ud83d\udd12'} ADMIN PRIVILEGES</Text>
                  <Text style={st.adminSub}>GHOSTING MODE — Cambia ruolo istantaneamente</Text>
                  <View style={st.roleGrid}>
                    {ROLES.map((role) => {
                      const cfg = ROLE_CONFIG[role];
                      const isActive = activeRole === role;
                      return (
                        <TouchableOpacity
                          key={role}
                          style={[st.roleBtn, isActive && { borderColor: cfg.color, backgroundColor: `${cfg.color}15` }]}
                          onPress={() => setActiveRole(role)}
                          activeOpacity={0.7}
                        >
                          <Text style={st.roleIcon}>{cfg.icon}</Text>
                          <Text style={[st.roleLabel, isActive && { color: cfg.color }]}>{cfg.label}</Text>
                          {isActive && <View style={[st.roleDot, { backgroundColor: cfg.color }]} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={st.activeRoleBar}>
                    <Text style={[st.activeRoleText, { color: ROLE_CONFIG[activeRole].color }]}>
                      {ROLE_CONFIG[activeRole].icon} GHOSTING AS: {ROLE_CONFIG[activeRole].label}
                    </Text>
                    <Text style={st.activeRoleDesc}>{ROLE_CONFIG[activeRole].description}</Text>
                  </View>
                </View>
              )}

              {/* LOGOUT */}
              <TouchableOpacity style={st.logoutBtn} activeOpacity={0.7} onPress={handleLogout}>
                <Text style={st.logoutIcon}>{'\ud83d\udeaa'}</Text>
                <View style={st.itemText}>
                  <Text style={st.logoutLabel}>LOGOUT</Text>
                  <Text style={st.logoutSub}>Esci dal tuo Legacy</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <PulseTicker />
            <Text style={st.footer}>ARENAKORE v2.1 {'\u00b7'} NEXUS SYNC</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, flexDirection: 'row' },
  blurLayer: {
    flex: 1, backgroundColor: 'rgba(0,18,25,0.65)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(18px) saturate(120%)', WebkitBackdropFilter: 'blur(18px) saturate(120%)' } as any : {}),
  },
  panel: { width: SW * 0.75, height: '100%' },
  panelInner: { flex: 1, paddingTop: 60, borderLeftWidth: 1.5, borderLeftColor: 'rgba(0,242,255,0.1)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 },
  headerTitle: { color: '#00F2FF', fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  closeX: { color: '#555', fontSize: 22 },
  tierBadge: {
    marginHorizontal: 20, marginBottom: 16, paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: 'rgba(0,242,255,0.04)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.08)', gap: 2,
  },
  tierLabel: { color: '#00F2FF', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  tierSub: { color: '#555', fontSize: 8, fontWeight: '600', letterSpacing: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 20 },
  itemIcon: { fontSize: 22, width: 32 },
  itemText: { flex: 1, gap: 2 },
  itemLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  itemSub: { color: '#555', fontSize: 10 },
  section: { marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(0,242,255,0.06)', marginHorizontal: 20, marginBottom: 12 },
  sectionTitle: { color: '#D4AF37', fontSize: 11, fontWeight: '900', letterSpacing: 2, paddingHorizontal: 20, marginBottom: 4 },
  founderPride: {
    marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: 12,
    backgroundColor: 'rgba(212,175,55,0.06)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.12)',
    alignItems: 'center', gap: 8,
  },
  founderStar: { fontSize: 24, color: '#D4AF37' },
  founderQuote: { color: '#D4AF37', fontSize: 11, fontWeight: '600', fontStyle: 'italic', textAlign: 'center', lineHeight: 17, opacity: 0.85 },
  adminSection: { marginTop: 8, paddingHorizontal: 20 },
  adminTitle: { color: '#FF3B30', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 4 },
  adminSub: { color: '#555', fontSize: 8, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleBtn: {
    width: '47%' as any, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center', gap: 4, position: 'relative' as any,
  },
  roleIcon: { fontSize: 18 },
  roleLabel: { color: '#888', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  roleDot: { position: 'absolute' as any, top: 6, right: 6, width: 6, height: 6, borderRadius: 3 },
  activeRoleBar: {
    marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center', gap: 2,
  },
  activeRoleText: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  activeRoleDesc: { color: '#555', fontSize: 8, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16,
    paddingHorizontal: 20, marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,59,48,0.08)',
  },
  logoutIcon: { fontSize: 20, width: 32 },
  logoutLabel: { color: 'rgba(255,59,48,0.7)', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  logoutSub: { color: 'rgba(255,59,48,0.35)', fontSize: 10 },
  ticker: { height: 22, overflow: 'hidden', borderTopWidth: 1, borderTopColor: 'rgba(0,242,255,0.06)', justifyContent: 'center' },
  tickerText: { color: '#00F2FF', fontSize: 9, fontWeight: '600', letterSpacing: 0.5, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', opacity: 0.7 },
  footer: { color: '#333', fontSize: 9, fontWeight: '600', letterSpacing: 1, paddingHorizontal: 20, paddingBottom: 30 },
});
