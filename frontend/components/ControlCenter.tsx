/**
 * ARENAKORE — Global Control Center v4.0
 * FIXES: Proper touch handling (Pressable panel stops backdrop tap propagation),
 * mobile-optimized font sizes, safe area alignment.
 */
import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  SlideInRight, SlideOutRight, Easing,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth, UserRole, ROLE_CONFIG } from '../contexts/AuthContext';
import { profileDevice, getTierLabel, getTrackingMode } from '../utils/DeviceIntelligence';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');
const CYAN = '#00E5FF';
const GOLD = '#FFD700';
const WHITE = '#FFFFFF';
const DIM = 'rgba(255,255,255,0.5)';
const DIM2 = 'rgba(255,255,255,0.3)';

const ROLE_ICONS: Record<UserRole, keyof typeof Ionicons.glyphMap> = {
  ADMIN: 'shield-checkmark',
  GYM_OWNER: 'business',
  COACH: 'fitness',
  ATHLETE: 'person',
};

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'ADMIN',
  GYM_OWNER: 'GYM',
  COACH: 'COACH',
  ATHLETE: 'ATHLETE',
};

// ========== PULSE TICKER ==========
function PulseTicker() {
  const scrollX = useSharedValue(0);
  const TXT = 'LIVE \u2022 ALEX_K PUNCH 98Q \u2022 MAYA_J JOINED BULLS \u2022 WORLD RECORD HALL OF KORE \u2022 3 NEW FOUNDERS \u2022 SHARKS VS WOLVES DUEL \u2022 ';
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

// ========== MENU ITEM ==========
function MenuItem({ icon, label, sub, color, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={st.item} activeOpacity={0.7} onPress={onPress}>
      <View style={[st.iconWrap, { borderColor: color + '22' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={st.itemText}>
        <Text style={st.itemLabel}>{label}</Text>
        <Text style={st.itemSub} numberOfLines={1}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.15)" />
    </TouchableOpacity>
  );
}

// ========== CONTROL CENTER ==========
export function ControlCenter({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, logout, activeRole, setActiveRole } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFounder = user?.is_founder || user?.is_admin;
  const isAdmin = user?.is_admin;
  const ROLES: UserRole[] = ['ADMIN', 'GYM_OWNER', 'COACH', 'ATHLETE'];
  const profile = profileDevice();

  const handleNav = useCallback((route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 150);
  }, [onClose, router]);

  const handleLogout = useCallback(() => {
    onClose();
    setTimeout(() => { logout(); router.replace('/'); }, 150);
  }, [onClose, logout, router]);

  if (!visible) return null;

  // ═══ DYNAMIC MENU BY GHOSTING ROLE ═══
  const menuItems = [
    { icon: 'settings-sharp' as const, label: 'SETTINGS', sub: 'Profilo · Account · Privacy', color: WHITE, route: '/settings' },
    { icon: 'trophy' as const, label: 'FOUNDERS CLUB', sub: isFounder ? `Founder #${user?.founder_number || '—'}` : 'Non Founder', color: GOLD, route: '/founders-club' },
    { icon: 'chatbubble-ellipses' as const, label: 'SUPPORTO', sub: 'support@arenakore.com', color: WHITE, route: '/support' },
  ];

  const roleMenuItems: typeof menuItems = [];
  if (activeRole === 'GYM_OWNER') {
    roleMenuItems.push({ icon: 'people', label: 'GYM HUB', sub: 'Coach & Eventi', color: GOLD, route: '/coach-studio' });
  } else if (activeRole === 'COACH') {
    roleMenuItems.push(
      { icon: 'clipboard', label: 'COACH HUB', sub: 'Template & Gestione Kore', color: CYAN, route: '/coach-studio/builder' },
      { icon: 'people', label: 'I MIEI KORE', sub: 'Gestione Atleti', color: CYAN, route: '/coach-studio/athletes' },
    );
  } else if (activeRole === 'ADMIN') {
    roleMenuItems.push({ icon: 'shield-checkmark', label: 'ADMIN PANEL', sub: 'Pannello admin', color: '#FF3B30', route: '/coach-studio' });
  }

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={st.backdrop}>
        {/* Backdrop blur — tapping this closes the menu */}
        <TouchableOpacity style={st.blurLayer} activeOpacity={1} onPress={onClose} />

        {/* Panel — Pressable stops tap propagation to backdrop */}
        <Animated.View entering={SlideInRight.duration(250)} exiting={SlideOutRight.duration(200)} style={st.panel}>
          <Pressable style={{ flex: 1 }} onPress={() => {}}>
            <LinearGradient colors={['#0A0A0A', '#000000']} style={[st.panelInner, { paddingTop: Math.max(insets.top, 12) + 8 }]}>

              {/* ── HEADER ── */}
              <View style={st.header}>
                <View style={st.headerLeft}>
                  <Text style={st.headerTitle}>CONTROL CENTER</Text>
                  {user?.username && <Text style={st.headerSub}>{user.username.toUpperCase()}</Text>}
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }} style={st.closeBtn}>
                  <Ionicons name="close" size={20} color="rgba(255,255,255,0.45)" />
                </TouchableOpacity>
              </View>

              {/* ── DEVICE TIER ── */}
              <View style={st.tierBadge}>
                <Ionicons name="hardware-chip" size={13} color={CYAN} />
                <View style={{ flex: 1 }}>
                  <Text style={st.tierLabel}>{getTierLabel(profile.tier)}</Text>
                  <Text style={st.tierSub}>{getTrackingMode(profile.tier)}</Text>
                </View>
                <View style={st.tierLiveDot} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                {/* ── MENU ── */}
                {menuItems.map((item, i) => (
                  <MenuItem key={i} icon={item.icon} label={item.label} sub={item.sub} color={item.color} onPress={() => handleNav(item.route)} />
                ))}

                {/* ── ROLE-SPECIFIC ── */}
                {roleMenuItems.length > 0 && (
                  <View style={st.section}>
                    <View style={st.divider} />
                    <Text style={st.sectionTitle}>{activeRole === 'GYM_OWNER' ? 'GYM HUB' : activeRole === 'COACH' ? 'COACH HUB' : 'ADMIN'}</Text>
                    {roleMenuItems.map((item, i) => (
                      <MenuItem key={i} icon={item.icon} label={item.label} sub={item.sub} color={item.color} onPress={() => handleNav(item.route)} />
                    ))}
                  </View>
                )}

                {/* ── FOUNDER PRIDE ── */}
                {isFounder && (
                  <View style={st.founderPride}>
                    <Ionicons name="star" size={14} color={GOLD} />
                    <Text style={st.founderQuote}>YOU ARE ONE OF THE FIRST 100.{'\n'}YOUR LEGACY IS PERMANENT.</Text>
                  </View>
                )}

                {/* ── GHOSTING MODE (ADMIN ONLY) ── */}
                {isAdmin && (
                  <View style={st.adminSection}>
                    <View style={st.divider} />
                    <View style={st.adminHeader}>
                      <Ionicons name="shield-checkmark" size={12} color={CYAN} />
                      <Text style={st.adminTitle}>GHOSTING MODE</Text>
                    </View>
                    <Text style={st.adminSub}>Scegli la prospettiva di visualizzazione</Text>

                    <View style={st.segGrid}>
                      {ROLES.map((role) => {
                        const isActive = activeRole === role;
                        return (
                          <TouchableOpacity
                            key={role}
                            onPress={() => setActiveRole(role)}
                            style={[st.segBtn, isActive && st.segBtnActive]}
                            activeOpacity={0.8}
                          >
                            <Ionicons name={ROLE_ICONS[role]} size={18} color={isActive ? GOLD : 'rgba(255,255,255,0.6)'} />
                            <Text style={[st.segLabel, isActive && st.segLabelActive]}>{ROLE_LABELS[role]}</Text>
                            {isActive && <View style={st.segActiveDot} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View style={st.activeBar}>
                      <Ionicons name={ROLE_ICONS[activeRole]} size={11} color={GOLD} />
                      <Text style={st.activeText}>GHOSTING: {ROLE_CONFIG[activeRole].label.toUpperCase()}</Text>
                    </View>
                  </View>
                )}

                {/* ── LOGOUT ── */}
                <View style={st.divider} />
                <TouchableOpacity style={st.logoutItem} activeOpacity={0.7} onPress={handleLogout}>
                  <View style={[st.iconWrap, { backgroundColor: 'rgba(255,59,48,0.05)', borderColor: 'rgba(255,59,48,0.15)' }]}>
                    <Ionicons name="log-out-outline" size={16} color="rgba(255,59,48,0.7)" />
                  </View>
                  <View style={st.itemText}>
                    <Text style={st.logoutLabel}>LOGOUT</Text>
                    <Text style={st.logoutSub}>Esci dal tuo Legacy</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>

              <PulseTicker />
              <Text style={st.footer}>ARENAKORE v3.0 · BUILD 2026</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, flexDirection: 'row' },
  blurLayer: {
    flex: 1, backgroundColor: 'rgba(0,12,18,0.7)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px) saturate(130%)', WebkitBackdropFilter: 'blur(20px) saturate(130%)' } as any : {}),
  },
  panel: { width: Math.min(SW * 0.78, 320), height: '100%' },
  panelInner: { flex: 1, borderLeftWidth: 1.5, borderLeftColor: '#00E5FF22' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, marginBottom: 14 },
  headerLeft: { flex: 1, gap: 1 },
  headerTitle: { color: WHITE, fontSize: 15, fontWeight: '800', letterSpacing: 3 },
  headerSub: { color: DIM2, fontSize: 12, fontWeight: '400', letterSpacing: 1.5, marginTop: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 18, marginBottom: 16,
    paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#00E5FF15',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,229,255,0.1)',
  },
  tierLabel: { color: CYAN, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  tierSub: { color: DIM, fontSize: 10, fontWeight: '400', letterSpacing: 0.5 },
  tierLiveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#00E5FF' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 18, minHeight: 48 },
  iconWrap: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  itemText: { flex: 1, gap: 1 },
  itemLabel: { color: WHITE, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  itemSub: { color: DIM, fontSize: 11, fontWeight: '400' },
  section: { marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginHorizontal: 18, marginVertical: 6 },
  sectionTitle: { color: GOLD, fontSize: 11, fontWeight: '900', letterSpacing: 3, paddingHorizontal: 18, marginBottom: 2 },
  founderPride: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 18, marginTop: 10, padding: 12, borderRadius: 10,
    backgroundColor: 'rgba(255,215,0,0.03)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.08)',
  },
  founderQuote: { flex: 1, color: GOLD, fontSize: 11, fontWeight: '700', letterSpacing: 0.3, lineHeight: 15, opacity: 0.8 },
  adminSection: { marginTop: 2, paddingHorizontal: 18 },
  adminHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  adminTitle: { color: '#FF3B30', fontSize: 12, fontWeight: '900', letterSpacing: 2.5 },
  adminSub: { color: DIM, fontSize: 11, fontWeight: '400', letterSpacing: 1, marginBottom: 10 },
  segGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10, width: '100%' },
  segBtn: {
    width: '47%', alignItems: 'center', gap: 3, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)',
  },
  segBtnActive: { borderColor: GOLD, backgroundColor: 'rgba(255,215,0,0.06)' },
  segLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, color: '#999' },
  segLabelActive: { color: GOLD },
  segActiveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: GOLD },
  activeBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 6, borderRadius: 6, backgroundColor: 'rgba(255,215,0,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.08)', marginBottom: 6,
  },
  activeText: { fontSize: 10, fontWeight: '900', letterSpacing: 2, color: GOLD },
  logoutItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 18, marginTop: 2 },
  logoutLabel: { color: 'rgba(255,59,48,0.6)', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  logoutSub: { color: 'rgba(255,59,48,0.25)', fontSize: 11 },
  ticker: { height: 18, overflow: 'hidden', borderTopWidth: 1, borderTopColor: '#00E5FF15', justifyContent: 'center' },
  tickerText: { color: CYAN, fontSize: 10, fontWeight: '400', letterSpacing: 0.3, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', opacity: 0.4 },
  footer: { color: '#555', fontSize: 10, fontWeight: '400', letterSpacing: 1.5, paddingHorizontal: 18, paddingBottom: 24 },
});
