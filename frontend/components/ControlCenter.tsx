/**
 * ARENAKORE — Global Control Center v3.0
 * NIKE-GRADE: Monochromatic icons, Bold Sans-Serif, Segmented Ghosting.
 * Stadium-at-night luminosity. Zero emoji. Zero color icons.
 */
import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, Dimensions,
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

const { width: SW } = Dimensions.get('window');
const CYAN = '#00F2FF';
const GOLD = '#FFD700';
const WHITE = '#FFFFFF';
const DIM = 'rgba(255,255,255,0.4)';

// Monochromatic icon mapping — no emoji anywhere
const ROLE_ICONS: Record<UserRole, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  ADMIN: { icon: 'shield-checkmark', color: '#FF453A' },
  GYM_OWNER: { icon: 'business', color: GOLD },
  COACH: { icon: 'fitness', color: CYAN },
  ATHLETE: { icon: 'person', color: '#32D74B' },
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

// ========== CONTROL CENTER ==========
export function ControlCenter({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, logout, activeRole, setActiveRole } = useAuth();
  const router = useRouter();
  const isFounder = user?.is_founder || user?.is_admin;
  const isAdmin = user?.is_admin;
  const ROLES: UserRole[] = ['ADMIN', 'GYM_OWNER', 'COACH', 'ATHLETE'];

  const profile = profileDevice();

  if (!visible) return null;

  const menuItems: { icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; color: string }[] = [
    { icon: 'scan', label: 'BIO-SCAN', sub: 'Ricalibra sensori', color: CYAN },
    { icon: 'settings-sharp', label: 'SETTINGS', sub: 'Configurazione NEXUS', color: WHITE },
    { icon: 'trophy', label: 'FOUNDERS CLUB', sub: isFounder ? `Founder #${user?.founder_number || '—'}` : 'Non membro', color: GOLD },
    { icon: 'chatbubble-ellipses', label: 'SUPPORTO', sub: 'Contatta il team', color: WHITE },
  ];

  const handleLogout = () => { onClose(); logout(); router.replace('/'); };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={st.blurLayer} />
        <Animated.View entering={SlideInRight.duration(250)} exiting={SlideOutRight.duration(200)} style={st.panel}>
          <LinearGradient colors={['#080808', '#050505']} style={st.panelInner}>
            {/* Header */}
            <View style={st.header}>
              <Text style={st.headerTitle}>CONTROL CENTER</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={22} color={DIM} />
              </TouchableOpacity>
            </View>

            {/* Tier Badge */}
            <View style={st.tierBadge}>
              <Ionicons name="hardware-chip" size={14} color={CYAN} />
              <View>
                <Text style={st.tierLabel}>{getTierLabel(profile.tier)}</Text>
                <Text style={st.tierSub}>{getTrackingMode(profile.tier)}</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              {/* Menu Items — Monochromatic */}
              {menuItems.map((item, i) => (
                <TouchableOpacity key={i} style={st.item} activeOpacity={0.7}>
                  <View style={st.iconWrap}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <View style={st.itemText}>
                    <Text style={st.itemLabel}>{item.label}</Text>
                    <Text style={st.itemSub}>{item.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.15)" />
                </TouchableOpacity>
              ))}

              {/* GYM HUB — GYM_OWNER */}
              {activeRole === 'GYM_OWNER' && (
                <View style={st.section}>
                  <View style={st.divider} />
                  <Text style={st.sectionTitle}>GYM HUB</Text>
                  <TouchableOpacity style={st.item} activeOpacity={0.7}>
                    <View style={st.iconWrap}><Ionicons name="people" size={18} color={GOLD} /></View>
                    <View style={st.itemText}><Text style={st.itemLabel}>GESTIONE COACH</Text><Text style={st.itemSub}>Assegna ruoli e permessi</Text></View>
                    <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.15)" />
                  </TouchableOpacity>
                  <TouchableOpacity style={st.item} activeOpacity={0.7}>
                    <View style={st.iconWrap}><Ionicons name="calendar" size={18} color={GOLD} /></View>
                    <View style={st.itemText}><Text style={st.itemLabel}>EVENTI</Text><Text style={st.itemSub}>Calendario e competizioni</Text></View>
                    <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.15)" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Founder Pride */}
              {isFounder && (
                <View style={st.founderPride}>
                  <Ionicons name="star" size={18} color={GOLD} />
                  <Text style={st.founderQuote}>YOU ARE ONE OF THE FIRST 100. YOUR LEGACY IS PERMANENT.</Text>
                </View>
              )}

              {/* ===== ADMIN PRIVILEGES — SEGMENTED GHOSTING ===== */}
              {isAdmin && (
                <View style={st.adminSection}>
                  <View style={st.divider} />
                  <View style={st.adminHeader}>
                    <Ionicons name="shield-checkmark" size={14} color="#FF453A" />
                    <Text style={st.adminTitle}>ADMIN PRIVILEGES</Text>
                  </View>
                  <Text style={st.adminSub}>GHOSTING MODE</Text>

                  {/* Segmented Control */}
                  <View style={st.segmented}>
                    {ROLES.map((role) => {
                      const rc = ROLE_ICONS[role];
                      const isActive = activeRole === role;
                      return (
                        <TouchableOpacity
                          key={role}
                          style={[st.segBtn, isActive && { backgroundColor: `${rc.color}18`, borderColor: rc.color }]}
                          onPress={() => setActiveRole(role)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name={rc.icon} size={16} color={isActive ? rc.color : 'rgba(255,255,255,0.25)'} />
                          <Text style={[st.segLabel, isActive && { color: rc.color, opacity: 1 }]}>
                            {role === 'GYM_OWNER' ? 'GYM' : role}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Active Role Indicator */}
                  <View style={st.activeBar}>
                    <Ionicons name={ROLE_ICONS[activeRole].icon} size={12} color={ROLE_ICONS[activeRole].color} />
                    <Text style={[st.activeText, { color: ROLE_ICONS[activeRole].color }]}>
                      GHOSTING: {ROLE_CONFIG[activeRole].label}
                    </Text>
                  </View>
                </View>
              )}

              {/* LOGOUT */}
              <View style={st.divider} />
              <TouchableOpacity style={st.logoutItem} activeOpacity={0.7} onPress={handleLogout}>
                <View style={[st.iconWrap, { backgroundColor: 'rgba(255,69,58,0.06)' }]}>
                  <Ionicons name="log-out-outline" size={18} color="rgba(255,69,58,0.6)" />
                </View>
                <View style={st.itemText}>
                  <Text style={st.logoutLabel}>LOGOUT</Text>
                  <Text style={st.logoutSub}>Esci dal tuo Legacy</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <PulseTicker />
            <Text style={st.footer}>ARENAKORE v2.1</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, flexDirection: 'row' },
  blurLayer: {
    flex: 1, backgroundColor: 'rgba(0,12,18,0.7)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px) saturate(130%)', WebkitBackdropFilter: 'blur(20px) saturate(130%)' } as any : {}),
  },
  panel: { width: SW * 0.78, height: '100%' },
  panelInner: { flex: 1, paddingTop: 60, borderLeftWidth: 1.5, borderLeftColor: 'rgba(0,242,255,0.06)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, marginBottom: 16 },
  headerTitle: { color: WHITE, fontSize: 13, fontWeight: '800', letterSpacing: 4 },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 22, marginBottom: 20,
    paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(0,242,255,0.03)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,242,255,0.06)',
  },
  tierLabel: { color: CYAN, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  tierSub: { color: DIM, fontSize: 7, fontWeight: '600', letterSpacing: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 22 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, gap: 2 },
  itemLabel: { color: WHITE, fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  itemSub: { color: DIM, fontSize: 10, fontWeight: '500' },
  section: { marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginHorizontal: 22, marginVertical: 8 },
  sectionTitle: { color: GOLD, fontSize: 10, fontWeight: '900', letterSpacing: 3, paddingHorizontal: 22, marginBottom: 4 },
  founderPride: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 22, marginTop: 12, padding: 14, borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.04)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.08)',
  },
  founderQuote: { flex: 1, color: GOLD, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, lineHeight: 16, opacity: 0.85 },
  adminSection: { marginTop: 4, paddingHorizontal: 22 },
  adminHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  adminTitle: { color: '#FF453A', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  adminSub: { color: DIM, fontSize: 8, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  segmented: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  segBtn: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)',
  },
  segLabel: { fontSize: 7, fontWeight: '900', letterSpacing: 1.5, color: 'rgba(255,255,255,0.25)', opacity: 0.6 },
  activeBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  activeText: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  logoutItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 22, marginTop: 4 },
  logoutLabel: { color: 'rgba(255,69,58,0.6)', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  logoutSub: { color: 'rgba(255,69,58,0.3)', fontSize: 10 },
  ticker: { height: 22, overflow: 'hidden', borderTopWidth: 1, borderTopColor: 'rgba(0,242,255,0.04)', justifyContent: 'center' },
  tickerText: { color: CYAN, fontSize: 8, fontWeight: '600', letterSpacing: 0.5, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', opacity: 0.5 },
  footer: { color: 'rgba(255,255,255,0.12)', fontSize: 9, fontWeight: '700', letterSpacing: 2, paddingHorizontal: 22, paddingBottom: 30 },
});
