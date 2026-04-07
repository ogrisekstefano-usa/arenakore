/**
 * ARENAKORE — Nexus BurgerMenu v2.0
 * Extracted from nexus-trigger.tsx
 */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
  Dimensions, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, withRepeat, withTiming, useAnimatedStyle, Easing,
  SlideInRight, SlideOutRight
} from 'react-native-reanimated';
import { UserRole, ROLE_CONFIG } from '../../contexts/AuthContext';
import { DeviceTier, getTierLabel, getTrackingMode } from '../../utils/DeviceIntelligence';

let SW = 390; try { SW = Dimensions.get('window').width; } catch(e) {}

// ========== PULSE TICKER ==========
export function PulseTicker({ reduced }: { reduced?: boolean }) {
  const scrollX = useSharedValue(0);
  const TXT = '[LIVE FEED] LONDON: ALEX_K COMPLETED EXPLOSIVE PUNCH (98Q) \u2022 CHICAGO: MAYA_J JOINED CREW BULLS \u2022 TOKYO: NEW WORLD RECORD IN HALL OF KORE \u2022 BERLIN: 3 NEW FOUNDERS REGISTERED \u2022 MIAMI: CREW SHARKS VS WOLVES (LIVE DUEL) \u2022 ';
  React.useEffect(() => {
    if (!reduced) {
      scrollX.value = withRepeat(withTiming(-SW * 3, { duration: 25000, easing: Easing.linear }), -1, false);
    }
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: scrollX.value }] }));
  if (reduced) {
    return (
      <View style={{ height: 22, overflow: 'hidden', borderTopWidth: 1, borderTopColor: '#00E5FF22', justifyContent: 'center' }}>
        <Text numberOfLines={1} style={{ color: '#00E5FF', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', opacity: 0.5, paddingHorizontal: 8 }}>[LIVE FEED] LONDON: ALEX_K PUNCH (98Q) {'\u2022'} TOKYO: WORLD RECORD</Text>
      </View>
    );
  }
  return (
    <View style={{ height: 22, overflow: 'hidden', borderTopWidth: 1, borderTopColor: '#00E5FF22', justifyContent: 'center' }}>
      <Animated.View style={[{ flexDirection: 'row', width: SW * 6 }, s]}>
        <Text style={{ color: '#00E5FF', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', opacity: 0.7 }}>{TXT}{TXT}</Text>
      </Animated.View>
    </View>
  );
}

// ========== BURGER MENU ==========
export function BurgerMenu({ visible, onClose, user, onLogout, deviceTier, activeRole, onRoleSwitch }: {
  visible: boolean; onClose: () => void; user: any; onLogout: () => void; deviceTier: DeviceTier;
  activeRole: UserRole; onRoleSwitch: (role: UserRole) => void;
}) {
  if (!visible) return null;
  const isFounder = user?.is_founder || user?.is_admin;
  const isAdmin = user?.is_admin;
  const isLegacy = deviceTier === 'legacy';
  const ROLES: UserRole[] = ['ADMIN', 'GYM_OWNER', 'COACH', 'ATHLETE'];

  const items: { iconName: keyof typeof Ionicons.glyphMap; iconColor: string; label: string; sub: string }[] = [
    { iconName: 'scan', iconColor: '#00E5FF', label: 'Bio-Signature Scan', sub: 'Ricalibra i sensori' },
    { iconName: 'settings-sharp', iconColor: '#FFFFFF', label: 'Settings', sub: 'Configurazione NEXUS' },
    { iconName: 'trophy', iconColor: '#FFD700', label: 'Founders Club', sub: isFounder ? `Founder #${user?.founder_number || '?'}` : 'Non ancora Founder' },
    { iconName: 'chatbubble-ellipses', iconColor: '#FFFFFF', label: 'Supporto', sub: 'Contatta il team KORE' },
  ];

  const gymItems: { iconName: keyof typeof Ionicons.glyphMap; iconColor: string; label: string; sub: string }[] = [
    { iconName: 'business', iconColor: '#FFD700', label: 'GYM HUB', sub: 'Gestione Coach & Eventi' },
    { iconName: 'bar-chart', iconColor: '#00E5FF', label: 'Analytics Palestra', sub: 'Iscrizioni, Revenue, Attivit\u00e0' },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={bm$.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={isLegacy ? bm$.blurLayerLegacy : bm$.blurLayer} />
        <Animated.View entering={SlideInRight.duration(250)} exiting={SlideOutRight.duration(200)} style={bm$.panel}>
          <LinearGradient colors={['rgba(8,8,8,0.97)', 'rgba(5,5,5,0.99)']} style={bm$.panelInner}>
            <View style={bm$.header}>
              <Text style={bm$.headerTitle}>CONTROL CENTER</Text>
              <TouchableOpacity onPress={onClose}><Text style={bm$.closeX}>{'\u2715'}</Text></TouchableOpacity>
            </View>
            <View style={bm$.tierBadge}>
              <Text style={bm$.tierLabel}>{getTierLabel(deviceTier)}</Text>
              <Text style={bm$.tierSub}>{getTrackingMode(deviceTier)}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {items.map((item, i) => (
                <TouchableOpacity key={i} style={bm$.item} activeOpacity={0.7}>
                  <Ionicons name={item.iconName} size={18} color={item.iconColor} />
                  <View style={bm$.itemText}><Text style={bm$.itemLabel}>{item.label}</Text><Text style={bm$.itemSub}>{item.sub}</Text></View>
                </TouchableOpacity>
              ))}
              {activeRole === 'GYM_OWNER' && (
                <View style={bm$.gymSection}>
                  <View style={bm$.sectionDivider} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                    <Ionicons name="business" size={16} color="#FFD700" />
                    <Text style={bm$.sectionTitle}>GYM HUB</Text>
                  </View>
                  {gymItems.map((item, i) => (
                    <TouchableOpacity key={`gym-${i}`} style={bm$.item} activeOpacity={0.7}>
                      <Ionicons name={item.iconName} size={18} color={item.iconColor} />
                      <View style={bm$.itemText}><Text style={[bm$.itemLabel, { color: '#FFD700' }]}>{item.label}</Text><Text style={bm$.itemSub}>{item.sub}</Text></View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {isFounder && (
                <View style={bm$.founderPride}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={bm$.founderQuote}>You are one of the first 100 to enter the Kore. Your legacy is permanent.</Text>
                </View>
              )}
              {isAdmin && (
                <View style={bm$.adminSection}>
                  <View style={bm$.sectionDivider} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="shield-checkmark" size={16} color="#FF3B30" />
                    <Text style={bm$.adminTitle}>ADMIN PRIVILEGES</Text>
                  </View>
                  <Text style={bm$.adminSub}>GHOSTING MODE {'\u2014'} Cambia ruolo istantaneamente</Text>
                  <View style={bm$.roleGrid}>
                    {ROLES.map((role) => {
                      const cfg = ROLE_CONFIG[role];
                      const isActive = activeRole === role;
                      const roleIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
                        ADMIN: 'shield-checkmark', GYM_OWNER: 'business', COACH: 'fitness', ATHLETE: 'person'
                      };
                      return (
                        <TouchableOpacity key={role} style={[bm$.roleBtn, isActive && { borderColor: cfg.color, backgroundColor: `${cfg.color}15` }]} onPress={() => onRoleSwitch(role)} activeOpacity={0.7}>
                          <Ionicons name={roleIcons[role]} size={18} color={isActive ? cfg.color : 'rgba(255,255,255,0.4)'} />
                          <Text style={[bm$.roleLabel, isActive && { color: cfg.color }]}>{cfg.label}</Text>
                          {isActive && <View style={[bm$.roleDot, { backgroundColor: cfg.color }]} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={bm$.activeRoleBar}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name={({ ADMIN: 'shield-checkmark', GYM_OWNER: 'business', COACH: 'fitness', ATHLETE: 'person' } as Record<string, any>)[activeRole]} size={14} color={ROLE_CONFIG[activeRole].color} />
                      <Text style={[bm$.activeRoleText, { color: ROLE_CONFIG[activeRole].color }]}>GHOSTING: {ROLE_CONFIG[activeRole].label}</Text>
                    </View>
                    <Text style={bm$.activeRoleDesc}>{ROLE_CONFIG[activeRole].description}</Text>
                  </View>
                </View>
              )}
              <TouchableOpacity style={bm$.logoutBtn} activeOpacity={0.7} onPress={onLogout}>
                <Ionicons name="log-out-outline" size={18} color="#FF3B30" />
                <View style={bm$.itemText}>
                  <Text style={bm$.logoutLabel}>LOGOUT</Text>
                  <Text style={bm$.logoutSub}>Esci dal tuo Legacy</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
            <PulseTicker reduced={isLegacy} />
            <Text style={bm$.footer}>ARENAKORE v2.1 {'\u00b7'} NEXUS SYNC</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const bm$ = StyleSheet.create({
  backdrop: { flex: 1, flexDirection: 'row' },
  blurLayer: {
    flex: 1, backgroundColor: 'rgba(0,18,25,0.65)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(18px) saturate(120%)', WebkitBackdropFilter: 'blur(18px) saturate(120%)' } as any : {})
  },
  blurLayerLegacy: { flex: 1, backgroundColor: 'rgba(0,8,12,0.85)' },
  panel: { width: SW * 0.72, height: '100%' },
  panelInner: { flex: 1, paddingTop: 60, borderLeftWidth: 1.5, borderLeftColor: 'rgba(0,229,255,0.1)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 },
  headerTitle: { color: '#00E5FF', fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  closeX: { color: '#555', fontSize: 24 },
  tierBadge: {
    marginHorizontal: 20, marginBottom: 16, paddingVertical: 8, paddingHorizontal: 24,
    backgroundColor: '#00E5FF22', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 2
  },
  tierLabel: { color: '#00E5FF', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  tierSub: { color: '#555', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  itemText: { flex: 1, gap: 2 },
  itemLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  itemSub: { color: '#555', fontSize: 12 },
  founderPride: {
    margin: 20, backgroundColor: 'rgba(255,215,0,0.05)', borderRadius: 14,
    padding: 18, borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)', alignItems: 'center', gap: 10
  },
  founderQuote: { color: '#FFD700', fontSize: 13, fontWeight: '600', fontStyle: 'italic', textAlign: 'center', lineHeight: 17, opacity: 0.85 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16,
    paddingHorizontal: 20, marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,59,48,0.08)'
  },
  logoutLabel: { color: 'rgba(255,59,48,0.7)', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  logoutSub: { color: 'rgba(255,59,48,0.35)', fontSize: 12 },
  adminSection: { marginTop: 8, paddingHorizontal: 20 },
  sectionDivider: { height: 1, backgroundColor: 'rgba(255,59,48,0.08)', marginBottom: 12 },
  sectionTitle: { color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  adminTitle: { color: '#FF3B30', fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 4 },
  adminSub: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleBtn: {
    width: '47%' as any, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center', gap: 4, position: 'relative' as any
  },
  roleLabel: { color: '#888', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  roleDot: { position: 'absolute' as any, top: 6, right: 6, width: 6, height: 6, borderRadius: 3 },
  activeRoleBar: {
    marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center', gap: 2
  },
  activeRoleText: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  activeRoleDesc: { color: '#555', fontSize: 10, fontWeight: '600' },
  gymSection: { marginTop: 4 },
  footer: { color: '#333', fontSize: 11, fontWeight: '600', letterSpacing: 1, paddingHorizontal: 20, paddingBottom: 30 }
});
