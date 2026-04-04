/**
 * ARENAKORE — KORE TAB v9.0 "THE ENTRY GATE — NEON EDITION"
 * Pulsating neon auras, glassmorphism depth, aggressive micro-copy.
 * Typography: Montserrat 800 titles, Plus Jakarta Sans 800 numerics.
 * Palette: #121212 bg, Cyan #00E5FF, Gold #FFD700, Red #FF3B30, Green #00FF87.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  RefreshControl, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useSharedValue, withRepeat, withSequence, withTiming, withDelay,
  useAnimatedStyle, Easing, interpolateColor,
} from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { KoreIDModal } from '../../components/KoreIDModal';
import { ControlCenter } from '../../components/ControlCenter';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Neon Card with Pulsating Aura ──────────────────────────────────
function NeonActionCard({
  icon, label, sub, motivational, color, gradientStart, gradientEnd,
  onPress, index,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  motivational: string;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  onPress: () => void;
  index: number;
}) {
  // Pulsating neon border glow
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withDelay(
      index * 150,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, true,
      ),
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      pulse.value,
      [0, 1],
      [color + '30', color + 'AA'],
    ),
    ...Platform.select({
      web: {
        boxShadow: `0 0 ${8 + pulse.value * 14}px ${color}${Math.round(15 + pulse.value * 35).toString(16).padStart(2, '0')}`,
      },
      default: {},
    }),
  }));

  // Icon incandescence
  const iconGlow = useAnimatedStyle(() => ({
    ...Platform.select({
      web: {
        boxShadow: `0 0 ${10 + pulse.value * 20}px ${color}${Math.round(20 + pulse.value * 50).toString(16).padStart(2, '0')}`,
      },
      default: {},
    }),
    opacity: 0.85 + pulse.value * 0.15,
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(120 + index * 90).duration(500)}
      style={c.wrap}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.82}>
        <Animated.View style={[c.card, glowStyle]}>
          <LinearGradient
            colors={[gradientStart, gradientEnd, '#0A0A0A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={c.cardGradient}
          >
            {/* Glass overlay */}
            <View style={c.glassOverlay} />

            {/* Icon with incandescence */}
            <Animated.View style={[c.iconBox, { backgroundColor: color + '18' }, iconGlow]}>
              <Ionicons name={icon} size={26} color={color} />
            </Animated.View>

            {/* Label */}
            <Text style={[c.cardLabel, { color }]}>{label}</Text>

            {/* Sub */}
            <Text style={c.cardSub}>{sub}</Text>

            {/* Motivational micro-copy */}
            <Text style={[c.cardMotivational, { color: color + '80' }]}>{motivational}</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

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

  // Wire global callbacks
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

  // ═══ Shimmer for FOUNDER chip ═══
  const shimmer = useSharedValue(0.5);
  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(withTiming(1, { duration: 2200 }), withTiming(0.5, { duration: 2200 })),
      -1, false,
    );
  }, []);
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));
  const isFounder = user?.is_founder || user?.is_admin;

  // ═══ FLUX counter glow ═══
  const fluxGlow = useSharedValue(0);
  useEffect(() => {
    fluxGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true,
    );
  }, []);
  const fluxBadgeStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(fluxGlow.value, [0, 1], ['rgba(255,215,0,0.10)', 'rgba(255,215,0,0.35)']),
    ...Platform.select({
      web: { boxShadow: `0 0 ${4 + fluxGlow.value * 8}px rgba(255,215,0,${0.05 + fluxGlow.value * 0.12})` },
      default: {},
    }),
  }));

  // ═══ 4 MACRO ACTIONS CONFIG ═══
  const ACTIONS = [
    {
      key: 'sfida',
      icon: 'flash' as const,
      label: 'SFIDA IMMEDIATA',
      sub: 'Vai diretto in Arena',
      motivational: 'Nessuna scusa. Solo performance.',
      color: '#FF3B30',
      gradientStart: '#1A0808',
      gradientEnd: '#120404',
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
      motivational: 'Il tuo DNA, la tua Autorità nell\'Arena.',
      color: '#00E5FF',
      gradientStart: '#041418',
      gradientEnd: '#020D10',
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
      motivational: 'Guarda il mondo sfidarsi. Ora.',
      color: '#FFD700',
      gradientStart: '#181408',
      gradientEnd: '#100E04',
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
      motivational: 'Evolvi con i migliori. Segui la guida.',
      color: '#00FF87',
      gradientStart: '#041A0E',
      gradientEnd: '#021008',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        router.push('/reward-store');
      },
    },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* ═══ PREMIUM HEADER ═══ */}
      <Animated.View entering={FadeIn.duration(400)} style={[hdr.container, { paddingTop: insets.top + 10 }]}>
        <View style={hdr.left}>
          <Text style={hdr.greeting} numberOfLines={1}>
            Ciao <Text style={hdr.name}>{firstName}</Text>,
          </Text>
          <Text style={hdr.sub}>pronto a superarti?</Text>
        </View>
        <View style={hdr.right}>
          <Animated.View style={[hdr.fluxBadge, fluxBadgeStyle]}>
            <Ionicons name="flash" size={13} color="#FFD700" />
            <Text style={hdr.fluxVal}>{flux.toLocaleString()}</Text>
          </Animated.View>
          <TouchableOpacity
            onPress={() => setSidebarOpen(true)}
            style={hdr.menuBtn}
            activeOpacity={0.6}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.40)" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00E5FF" />}
        contentContainerStyle={s.scroll}
      >
        {/* ═══ STATUS CHIPS ═══ */}
        <Animated.View entering={FadeInDown.delay(60).duration(400)} style={st.row}>
          <View style={st.lvlChip}>
            <Ionicons name="shield-checkmark" size={11} color="#00E5FF" />
            <Text style={st.lvlText}>LVL {level}</Text>
          </View>
          {user?.is_nexus_certified && (
            <View style={st.nexusChip}>
              <Ionicons name="scan" size={10} color="#00FF87" />
              <Text style={st.nexusText}>NEXUS</Text>
            </View>
          )}
          {isFounder && (
            <Animated.View style={[st.founderChip, shimmerStyle]}>
              <Ionicons name="star" size={10} color="#FFD700" />
              <Text style={st.founderText}>FOUNDER</Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* ═══ 4 NEON MACRO ACTIONS ═══ */}
        <View style={s.grid}>
          {ACTIONS.map((a, i) => (
            <NeonActionCard
              key={a.key}
              icon={a.icon}
              label={a.label}
              sub={a.sub}
              motivational={a.motivational}
              color={a.color}
              gradientStart={a.gradientStart}
              gradientEnd={a.gradientEnd}
              onPress={a.onPress}
              index={i}
            />
          ))}
        </View>

        {/* ═══ QUICK STATS — Glassmorphism Bar ═══ */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={qs.container}>
          <LinearGradient
            colors={['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)', 'transparent']}
            style={qs.gradient}
          >
            <View style={qs.item}>
              <Text style={qs.num}>{totalScans}</Text>
              <Text style={qs.label}>SCANS</Text>
            </View>
            <View style={qs.divider} />
            <View style={qs.item}>
              <Text style={[qs.num, { color: '#FFD700' }]}>{flux.toLocaleString()}</Text>
              <Text style={qs.label}>FLUX</Text>
            </View>
            <View style={qs.divider} />
            <View style={qs.item}>
              <Text style={qs.num}>LVL {level}</Text>
              <Text style={qs.label}>LIVELLO</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ═══ QUICK NAV LINKS ═══ */}
        <Animated.View entering={FadeInUp.delay(600).duration(400)} style={lnk.section}>
          <QuickLink icon="analytics" color="#00E5FF" label="DNA PROFILE" onPress={() => router.push('/(tabs)/dna')} />
          <QuickLink icon="trophy" color="#FFD700" label="CLASSIFICHE" onPress={() => router.push('/(tabs)/hall')} />
          <QuickLink icon="settings-sharp" color="rgba(255,255,255,0.35)" label="IMPOSTAZIONI" onPress={() => router.push('/settings')} />
        </Animated.View>

        <View style={{ height: 44 }} />
      </ScrollView>

      {/* ═══ MODALS ═══ */}
      <KoreIDModal visible={koreIdVisible} onClose={() => setKoreIdVisible(false)} />
      <ControlCenter visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </View>
  );
}

// ─── Quick Link Row ─────────────────────────────────────────────────
function QuickLink({ icon, color, label, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={lnk.row} onPress={onPress} activeOpacity={0.65}>
      <View style={[lnk.iconBox, { backgroundColor: color + '0D' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[lnk.text, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={color + '40'} />
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════

const FONT_JAKARTA = Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined });
const FONT_MONT = Platform.select({ web: 'Montserrat, sans-serif', default: undefined });

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', marginBottom: 24 },
});

// ── HEADER ──
const hdr = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14,
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  left: { flex: 1, gap: 2 },
  greeting: {
    color: 'rgba(255,255,255,0.45)', fontSize: 17,
    fontFamily: FONT_JAKARTA, fontWeight: '500',
  },
  name: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  sub: {
    color: 'rgba(255,255,255,0.20)', fontSize: 13,
    fontFamily: FONT_JAKARTA, fontWeight: '800',
    letterSpacing: 0.3,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fluxBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,215,0,0.05)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1.2, borderColor: 'rgba(255,215,0,0.12)',
  },
  fluxVal: {
    color: '#FFD700', fontSize: 15, fontWeight: '900',
    fontFamily: FONT_JAKARTA, letterSpacing: 0.5,
  },
  menuBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
});

// ── STATUS CHIPS ──
const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  lvlChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,229,255,0.07)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)',
  },
  lvlText: {
    color: '#00E5FF', fontSize: 13, fontWeight: '900', letterSpacing: 1.5,
    fontFamily: FONT_JAKARTA,
  },
  nexusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,255,135,0.05)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(0,255,135,0.15)',
  },
  nexusText: { color: '#00FF87', fontSize: 11, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_MONT },
  founderChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.18)',
  },
  founderText: { color: '#FFD700', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_MONT },
});

// ── NEON CARDS ──
const c = StyleSheet.create({
  wrap: {
    width: '47.5%' as any,
    flexGrow: 0, flexShrink: 0,
  },
  card: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  cardGradient: {
    padding: 16, minHeight: 170,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.015)',
    borderRadius: 20,
  },
  iconBox: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardLabel: {
    fontSize: 14, fontWeight: '900', letterSpacing: 0.5, marginBottom: 2,
    fontFamily: FONT_JAKARTA,
  },
  cardSub: {
    color: 'rgba(255,255,255,0.30)', fontSize: 11, fontWeight: '600',
    fontFamily: FONT_MONT, marginBottom: 6,
  },
  cardMotivational: {
    fontSize: 10, fontWeight: '500', fontStyle: 'italic',
    fontFamily: FONT_MONT, letterSpacing: 0.3, lineHeight: 13,
  },
});

// ── QUICK STATS ──
const qs = StyleSheet.create({
  container: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 20,
  },
  gradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: 18,
  },
  item: { alignItems: 'center', gap: 3 },
  num: {
    color: '#00E5FF', fontSize: 22, fontWeight: '900',
    fontFamily: FONT_JAKARTA,
  },
  label: {
    color: 'rgba(255,255,255,0.18)', fontSize: 9, fontWeight: '800', letterSpacing: 2.5,
    fontFamily: FONT_MONT,
  },
  divider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.04)' },
});

// ── QUICK LINKS ──
const lnk = StyleSheet.create({
  section: { gap: 2, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.025)',
  },
  iconBox: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  text: {
    flex: 1, fontSize: 13, fontWeight: '800', letterSpacing: 1.5,
    fontFamily: FONT_MONT,
  },
});
