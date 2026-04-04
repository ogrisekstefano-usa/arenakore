/**
 * ARENAKORE — KORE TAB v8.0 "THE ENTRY GATE"
 * Minimalist 4-Action Launchpad: Zero friction post-login.
 * Typography: Montserrat 800 titles, Plus Jakarta Sans 800 numerics.
 * Palette: #121212 bg, Cyan #00E5FF, Gold #FFD700, Red #FF3B30, Green #00FF87.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  Dimensions, RefreshControl, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeInDown, useSharedValue, withRepeat,
  withSequence, withTiming, useAnimatedStyle,
} from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { KoreIDModal } from '../../components/KoreIDModal';
import { ControlCenter } from '../../components/ControlCenter';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - 52) / 2;

// ═══════════════════════════════════════════════════════════
// MAIN KORE TAB — "THE ENTRY GATE"
// ═══════════════════════════════════════════════════════════
export default function KoreTab() {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [koreIdVisible, setKoreIdVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Wire global callback for KORE ID modal (used by other components)
  useEffect(() => {
    (globalThis as any).__openKoreIdModal = () => setKoreIdVisible(true);
    (globalThis as any).__openControlCenter = () => setSidebarOpen(true);
    return () => {
      delete (globalThis as any).__openKoreIdModal;
      delete (globalThis as any).__openControlCenter;
    };
  }, []);

  const flux = user?.flux ?? user?.xp ?? 0;
  const firstName = user?.first_name || user?.username || 'Kore';
  const level = user?.level || 1;
  const totalScans = user?.total_scans || 0;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { if (refreshUser) await refreshUser(); } catch (_) {}
    finally { setRefreshing(false); }
  }, [refreshUser]);

  // ═══ 4 MACRO ACTIONS ═══
  const ACTIONS = [
    {
      key: 'sfida',
      icon: 'flash' as const,
      label: 'SFIDA IMMEDIATA',
      sub: 'Vai diretto in Arena',
      color: '#FF3B30',
      bg: 'rgba(255,59,48,0.06)',
      border: 'rgba(255,59,48,0.18)',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        router.push('/(tabs)/nexus-trigger');
      },
    },
    {
      key: 'koreid',
      icon: 'qr-code' as const,
      label: 'IL TUO KORE ID',
      sub: 'Identità · DNA · QR',
      color: '#00E5FF',
      bg: 'rgba(0,229,255,0.06)',
      border: 'rgba(0,229,255,0.18)',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        setKoreIdVisible(true);
      },
    },
    {
      key: 'arena',
      icon: 'people' as const,
      label: 'ARENA LIVE',
      sub: 'Eventi · Duelli · Community',
      color: '#FFD700',
      bg: 'rgba(255,215,0,0.06)',
      border: 'rgba(255,215,0,0.18)',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        router.push('/live-events');
      },
    },
    {
      key: 'programmi',
      icon: 'barbell' as const,
      label: 'SCOPRI PROGRAMMI',
      sub: 'Template · Allenamenti',
      color: '#00FF87',
      bg: 'rgba(0,255,135,0.06)',
      border: 'rgba(0,255,135,0.18)',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        router.push('/reward-store');
      },
    },
  ];

  // ═══ Shimmer animation for FOUNDER badge ═══
  const shimmer = useSharedValue(0.6);
  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(withTiming(1, { duration: 2000 }), withTiming(0.6, { duration: 2000 })),
      -1, false,
    );
  }, []);
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  const isFounder = user?.is_founder || user?.is_admin;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* ═══ MINIMAL HEADER ═══ */}
      <View style={[h.header, { paddingTop: insets.top + 8 }]}>
        <View style={h.headerLeft}>
          <Text style={h.greeting} numberOfLines={1}>
            Ciao <Text style={h.greetingName}>{firstName}</Text>,
          </Text>
          <Text style={h.greetingSub}>la tua Arena ti aspetta.</Text>
        </View>
        <View style={h.headerRight}>
          {/* FLUX Badge */}
          <View style={h.fluxBadge}>
            <Ionicons name="flash" size={12} color="#FFD700" />
            <Text style={h.fluxText}>{flux.toLocaleString()}</Text>
          </View>
          {/* Sidebar Trigger "..." */}
          <TouchableOpacity
            onPress={() => setSidebarOpen(true)}
            style={h.menuBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00E5FF" />}
        contentContainerStyle={s.scroll}
      >
        {/* ═══ STATUS ROW: Level + Badges ═══ */}
        <Animated.View entering={FadeInDown.delay(80)} style={g.statusRow}>
          <View style={g.levelBadge}>
            <Ionicons name="shield-checkmark" size={11} color="#00E5FF" />
            <Text style={g.levelVal}>LVL {level}</Text>
          </View>
          {user?.is_nexus_certified && (
            <View style={g.certChip}>
              <Ionicons name="scan" size={10} color="#00FF87" />
              <Text style={g.certText}>NEXUS</Text>
            </View>
          )}
          {isFounder && (
            <Animated.View style={[g.founderChip, shimmerStyle]}>
              <Ionicons name="star" size={10} color="#FFD700" />
              <Text style={g.founderText}>FOUNDER</Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* ═══ 4 MACRO ACTIONS GRID ═══ */}
        <View style={g.grid}>
          {ACTIONS.map((a, i) => (
            <Animated.View key={a.key} entering={FadeInDown.delay(120 + i * 70)} style={g.cardWrap}>
              <TouchableOpacity
                style={[g.card, { backgroundColor: a.bg, borderColor: a.border }]}
                onPress={a.onPress}
                activeOpacity={0.82}
              >
                <View style={[g.cardIconBox, { backgroundColor: a.color + '12' }]}>
                  <Ionicons name={a.icon} size={26} color={a.color} />
                </View>
                <Text style={[g.cardLabel, { color: a.color }]}>{a.label}</Text>
                <Text style={g.cardSub}>{a.sub}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* ═══ QUICK STATS BAR ═══ */}
        <Animated.View entering={FadeInDown.delay(450)} style={g.statsBar}>
          <View style={g.statItem}>
            <Text style={g.statNum}>{totalScans}</Text>
            <Text style={g.statLabel}>SCANS</Text>
          </View>
          <View style={g.statDivider} />
          <View style={g.statItem}>
            <Text style={[g.statNum, { color: '#FFD700' }]}>{flux.toLocaleString()}</Text>
            <Text style={g.statLabel}>FLUX</Text>
          </View>
          <View style={g.statDivider} />
          <View style={g.statItem}>
            <Text style={g.statNum}>LVL {level}</Text>
            <Text style={g.statLabel}>LIVELLO</Text>
          </View>
        </Animated.View>

        {/* ═══ QUICK NAV LINKS ═══ */}
        <Animated.View entering={FadeInDown.delay(550)} style={g.linksSection}>
          <QuickLink
            icon="analytics"
            color="#00E5FF"
            label="DNA PROFILE"
            onPress={() => router.push('/(tabs)/dna')}
          />
          <QuickLink
            icon="trophy"
            color="#FFD700"
            label="CLASSIFICHE"
            onPress={() => router.push('/(tabs)/hall')}
          />
          <QuickLink
            icon="settings-sharp"
            color="rgba(255,255,255,0.4)"
            label="IMPOSTAZIONI"
            onPress={() => router.push('/settings')}
          />
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ═══ MODALS ═══ */}
      <KoreIDModal visible={koreIdVisible} onClose={() => setKoreIdVisible(false)} />
      <ControlCenter visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </View>
  );
}

// ═══ QUICK LINK ROW ═══
function QuickLink({ icon, color, label, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={g.linkRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[g.linkIcon, { backgroundColor: color + '10' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[g.linkText, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={color + '40'} />
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
});

// ── HEADER ──
const h = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: '#121212',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  headerLeft: { flex: 1, gap: 2 },
  greeting: {
    color: 'rgba(255,255,255,0.5)', fontSize: 16,
    fontFamily: Platform.select({ web: 'Montserrat', default: undefined }),
    fontWeight: '500',
  },
  greetingName: { color: '#FFFFFF', fontWeight: '800' },
  greetingSub: {
    color: 'rgba(255,255,255,0.25)', fontSize: 13,
    fontFamily: Platform.select({ web: 'Montserrat', default: undefined }),
    fontWeight: '400',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fluxBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)',
  },
  fluxText: {
    color: '#FFD700', fontSize: 15, fontWeight: '800',
    fontFamily: Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined }),
    letterSpacing: 0.5,
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
});

// ── GRID & CONTENT ──
const g = StyleSheet.create({
  // Status row
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  levelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,229,255,0.08)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)',
  },
  levelVal: {
    color: '#00E5FF', fontSize: 13, fontWeight: '900', letterSpacing: 1.5,
    fontFamily: Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined }),
  },
  certChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,255,135,0.06)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(0,255,135,0.15)',
  },
  certText: {
    color: '#00FF87', fontSize: 11, fontWeight: '900', letterSpacing: 1,
    fontFamily: Platform.select({ web: 'Montserrat', default: undefined }),
  },
  founderChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)',
  },
  founderText: {
    color: '#FFD700', fontSize: 11, fontWeight: '900', letterSpacing: 1.5,
    fontFamily: Platform.select({ web: 'Montserrat', default: undefined }),
  },
  // 4-card grid
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    marginBottom: 24,
  },
  cardWrap: { width: CARD_W },
  card: {
    borderRadius: 18, padding: 16, borderWidth: 1.5,
    minHeight: 148, justifyContent: 'space-between',
  },
  cardIconBox: {
    width: 50, height: 50, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  cardLabel: {
    fontSize: 14, fontWeight: '800', letterSpacing: 0.5, marginBottom: 3,
    fontFamily: Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined }),
  },
  cardSub: {
    color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '500',
    fontFamily: Platform.select({ web: 'Montserrat', default: undefined }),
  },
  // Stats bar
  statsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16,
    paddingVertical: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
  },
  statItem: { alignItems: 'center', gap: 3 },
  statNum: {
    color: '#00E5FF', fontSize: 22, fontWeight: '900',
    fontFamily: Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined }),
  },
  statLabel: {
    color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '800', letterSpacing: 2.5,
    fontFamily: Platform.select({ web: 'Montserrat', default: undefined }),
  },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.05)' },
  // Quick links
  linksSection: { gap: 2, marginBottom: 8 },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  linkIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  linkText: {
    flex: 1, fontSize: 13, fontWeight: '800', letterSpacing: 1.5,
    fontFamily: Platform.select({ web: 'Montserrat', default: undefined }),
  },
});
