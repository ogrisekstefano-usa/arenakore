/**
 * ARENAKORE — HERO INDEX v2.0
 * The Biometric Frontier. DNA-Certified Performance.
 * Video background (expo-av) + Cinematic overlays + Coach/Gym partner section.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  ScrollView, Image, useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, withRepeat, withTiming, withSequence,
  useAnimatedStyle, FadeInDown, FadeIn, Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Circle, Rect, Defs, LinearGradient as SvgGrad, Stop, G } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';

// ── Assets
const VIDEO_URL   = 'https://videos.pexels.com/video-files/4669895/4669895-hd_1280_720_25fps.mp4';
const FALLBACK_BG = 'https://images.unsplash.com/photo-1634042341821-05c4e074cedc?crop=entropy&cs=srgb&fm=jpg&q=85&w=1080';

const GOLD = '#FFD700';
const CYAN = '#00E5FF';
const BG   = '#000000';

// =====================================================================
// ATHLETE BACKGROUND — blurred photo with deep vignette
// =====================================================================
const ATHLETE_BG = 'https://customer-assets.emergentagent.com/job_1cc481b0-9549-42bf-b77d-feaf4ea618cf/artifacts/2wscrljx_WhatsApp%20Image%202026-03-28%20at%2011.06.50.jpeg';
function ScanLine() {
  const { height } = useWindowDimensions();
  const y = useSharedValue(-100);

  useEffect(() => {
    y.value = withRepeat(
      withTiming(height + 100, { duration: 9000, easing: Easing.linear }),
      -1, false,
    );
  }, [height]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }]
  }));

  return (
    <Animated.View style={[scan$.wrap, lineStyle, { pointerEvents: 'none' }]}>
      <View style={scan$.line} />
      <View style={scan$.glow} />
    </Animated.View>
  );
}
const scan$ = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, zIndex: 5 },
  line: { height: 1, backgroundColor: 'rgba(255,215,0,0.4)' },
  glow: { height: 24, backgroundColor: 'rgba(255,215,0,0.06)', marginTop: -12 }
});

// =====================================================================
// METRIC BADGES (animated counters)
// =====================================================================
function MetricBadge({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay)} style={mb$.badge}>
      <Text style={mb$.value}>{value}</Text>
      <Text style={mb$.label}>{label}</Text>
    </Animated.View>
  );
}
const mb$ = StyleSheet.create({
  badge: {
    flex: 1,                          // equal distribution — forces 3 on same row
    alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10,
    backgroundColor: 'rgba(255,215,0,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)', borderRadius: 10,
    minWidth: 0,                      // allow shrinking below natural width
  },
  value: { color: GOLD, fontSize: 18, fontWeight: '900', letterSpacing: 0 },
  label: { color: 'rgba(255,255,255,0.30)', fontSize: 7, fontWeight: '900', letterSpacing: 1.5, marginTop: 2, textAlign: 'center' }
});

// =====================================================================
// MAIN COMPONENT
// =====================================================================
export default function HeroIndex() {
  const { user, token, isLoading } = useAuth();
  const router       = useRouter();
  const insets       = useSafeAreaInsets();
  const { height: SH, width: SW } = useWindowDimensions();
  const [videoError, setVideoError] = useState(false);

  // Auth redirect — BUILD 15: Manual button gate replaces auto-redirect
  // This prevents automatic Dashboard module loading that triggers SpringBoard sandbox
  const [showGate, setShowGate] = useState(false);
  
  useEffect(() => {
    if (!isLoading && token && user) {
      // Instead of auto-redirect, show manual "ENTRA" gate
      setShowGate(true);
    }
  }, [isLoading, token, user]);

  const handleEnterNexus = () => {
    if (user && !user.onboarding_completed) {
      router.replace('/onboarding/choice');
    } else {
      router.replace('/(tabs)/nexus-trigger');
    }
  };

  // ── Gold pulse for brand title
  const glow = useSharedValue(0.6);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, false,
    );
  }, []);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + glow.value * 0.3
  }));

  // ── Loading screen
  const loadingSize = Math.min(52, Math.floor(SW / 8));
  const KORE_BLUE = '#00B4D8';  // KORE signature blue

  // ── Brand animated style — MUST be declared before any conditional return
  const brandArenaStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + glow.value * 0.4
  }));

  if (isLoading) {
    return (
      <View style={s.loadWrap}>
        <StatusBar barStyle="light-content" />
        <View style={s.loadRow}>
          <Text style={[s.loadArena, { fontSize: loadingSize }]}>ARENA</Text>
          <Text style={[s.loadKore, { fontSize: loadingSize }]}>KORE</Text>
        </View>
        <Text style={s.loadSub}>NEXUS INITIALIZING...</Text>
      </View>
    );
  }

  // ══ BUILD 15: Logged-in user gate — manual button to enter Dashboard ══
  if (showGate && user) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" />
        <Image
          source={{ uri: ATHLETE_BG }}
          style={[{ position: 'absolute', top: -80, left: 0, right: 0, bottom: 0, opacity: 0.45 }]}
          blurRadius={6}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)', '#000000']}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 32 }}>
          {/* Chip */}
          <Animated.View entering={FadeInDown.delay(100)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(50,215,75,0.1)', borderWidth: 1, borderColor: 'rgba(50,215,75,0.3)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#32D74B' }} />
            <Text style={{ color: '#32D74B', fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>SESSIONE ATTIVA</Text>
          </Animated.View>

          {/* Brand */}
          <Animated.View entering={FadeInDown.delay(200)} style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 48, fontWeight: '900', letterSpacing: -2 }}>ARENA</Text>
            <Text style={{ color: '#00E5FF', fontSize: 48, fontWeight: '900', letterSpacing: -2 }}>KORE</Text>
          </Animated.View>

          {/* Username */}
          <Animated.View entering={FadeInDown.delay(300)}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '800', letterSpacing: 3, textAlign: 'center' }}>
              {(user.username || 'KORE').toUpperCase()} · {user.role || 'ATHLETE'}
            </Text>
          </Animated.View>

          {/* ENTRA NEL NEXUS — Gold button */}
          <Animated.View entering={FadeInDown.delay(450)} style={{ width: '100%' }}>
            <TouchableOpacity
              testID="gate-enter-nexus-btn"
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
                backgroundColor: '#FFD700', borderRadius: 14, paddingVertical: 20
              }}
              onPress={handleEnterNexus}
              activeOpacity={0.85}
            >
              <Ionicons name="flash" size={22} color="#050505" />
              <Text style={{ color: '#050505', fontSize: 18, fontWeight: '900', letterSpacing: 2 }}>ENTRA NEL NEXUS</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Logout */}
          <Animated.View entering={FadeInDown.delay(550)}>
            <TouchableOpacity onPress={() => { setShowGate(false); }} activeOpacity={0.7}>
              <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '800', letterSpacing: 2 }}>CAMBIA ACCOUNT</Text>
            </TouchableOpacity>
          </Animated.View>

          <Text style={s.versionLabel}>v2.1.0 — Build 18 · NEXUS</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* ── ATHLETE BACKGROUND — shifted up, hood slightly cropped at top edge ── */}
      <Image
        source={{ uri: ATHLETE_BG }}
        style={[{ position: 'absolute', top: -80, left: 0, right: 0, bottom: 0, opacity: 0.75 }]}
        blurRadius={3}
        resizeMode="cover"
      />

      {/* ── GRADIENT — transparent at top, pure black from 55% down ── */}
      <LinearGradient
        colors={[
          'rgba(5,5,5,0)',
          'rgba(5,5,5,0)',
          'rgba(5,5,5,0.35)',
          'rgba(5,5,5,0.88)',
          BG,
          BG,
        ]}
        locations={[0, 0.28, 0.44, 0.62, 0.80, 1]}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' } as any]}
      />

      {/* ── SCAN LINE ANIMATION (gold sweep) ── */}
      <ScanLine />

      {/* ── SCROLLABLE CONTENT ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        bounces
      >
        {/* ══════ HERO ══════ */}
        <View style={[s.hero, { minHeight: SH * 0.72 }]}>
          {/* Decorative corner */}
          <View style={s.cornerTL} />
          <View style={s.cornerTR} />

          {/* Brand — ARENA white + KORE blue */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            style={s.brandRow}
          >
            <Animated.Text style={[s.brandArena, brandArenaStyle]}>ARENA</Animated.Text>
            <Text style={s.brandKore}>KORE</Text>
          </Animated.View>

          {/* Subtitle lines */}
          <Animated.View entering={FadeInDown.delay(450)} style={s.subtitleWrap}>
            <Text style={s.sub1}>THE BIOMETRIC FRONTIER.</Text>
            <Text style={s.sub2}>DNA-CERTIFIED PERFORMANCE.</Text>
          </Animated.View>

          {/* Cyan accent line */}
          <Animated.View entering={FadeIn.delay(600)} style={s.accentLine} />

          {/* Metrics */}
          <Animated.View entering={FadeInDown.delay(650)} style={s.metricsRow}>
            <MetricBadge value="17" label="BIO-POINTS" delay={700} />
            <MetricBadge value="5-BEAT" label="SCAN PROTOCOL" delay={780} />
            <MetricBadge value="100%" label="DNA-CERTIFIED" delay={860} />
          </Animated.View>

          {/* ── CTA AREA ── */}
          <Animated.View entering={FadeInDown.delay(800)} style={s.ctaArea}>
            {/* PRIMARY (GIALLO): INIZIA LA SFIDA CON NEXUS */}
            <TouchableOpacity
              testID="start-nexus-btn"
              style={s.primaryBtn}
              onPress={() => router.push('/onboarding/choice')}
              activeOpacity={0.85}
            >
              <Ionicons name="scan" size={18} color={BG} />
              <Text style={s.primaryBtnTxt}>INIZIA LA SFIDA CON NEXUS</Text>
            </TouchableOpacity>

            {/* SECONDARY (BLU): KORE, RITORNA NELL'ARENA */}
            <TouchableOpacity
              testID="resume-btn"
              style={s.outlineBtn}
              onPress={() => router.push('/login')}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in-outline" size={16} color={CYAN} />
              <Text style={s.outlineBtnTxt}>KORE, RITORNA NELL'ARENA</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ══════ PARTNER / COACH SECTION ══════ */}
        <Animated.View entering={FadeInDown.delay(1000)} style={s.partnerSection}>
          {/* Divider */}
          <View style={s.partnerDivider}>
            <View style={s.divLine} />
            <Text style={s.divTxt}>KORE ECOSYSTEM</Text>
            <View style={s.divLine} />
          </View>

          <View style={s.partnerCard}>
            <LinearGradient
              colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.0)']}
              style={[s.partnerGrad, { backgroundColor: 'rgba(8,8,8,0.97)', borderRadius: 16, borderWidth: 1, borderColor: '#00E5FF22' }]}
            >
              <View style={s.partnerTopGlow} />

              <View style={s.partnerHeader}>
                <Ionicons name="business" size={20} color={CYAN} />
                <View>
                  <Text style={s.partnerLabel}>FOR COACHES & GYMS</Text>
                  <Text style={s.partnerSub}>KORE HUB NETWORK — CHICAGO</Text>
                </View>
              </View>

              <Text style={s.partnerCopy}>
                Certifica i tuoi Kore.{'\n'}
                Domina i ranking di squadra.{'\n'}
                Accedi ai dati biometrici del tuo roster.
              </Text>

              {/* Feature list */}
              {[
                'NEXUS Bio-Scan certificato per squadre',
                'Dashboard coach con DNA analytics',
                'City Ranking Dominance per il tuo gym',
                'QR-Core per eventi di massa',
              ].map((feat, i) => (
                <View key={i} style={s.featRow}>
                  <Ionicons name="checkmark-circle" size={12} color={CYAN} />
                  <Text style={s.featTxt}>{feat}</Text>
                </View>
              ))}

              {/* GYM CTA */}
              <TouchableOpacity
                testID="gym-hub-btn"
                style={s.gymBtn}
                onPress={() => router.push('/onboarding/kore-hub')}
                activeOpacity={0.85}
              >
                <Ionicons name="business-outline" size={16} color={CYAN} />
                <Text style={s.gymBtnTxt}>BECOME A KORE HUB</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* ══════ FOOTER ══════ */}
        <View style={s.footer}>
          <Text style={s.footerTxt}>ARENAKORE · THE CORE OF PERFORMANCE</Text>
          <Text style={s.footerTxt}>CHICAGO BETA · KORE #00001 STEFANO OGRISEK</Text>
          <Text style={s.versionLabel}>v2.1.0 — Build 18 · NEXUS</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// =====================================================================
// STYLES
// =====================================================================
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Loading
  loadWrap: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadRow: { flexDirection: 'row', gap: 6 },
  loadArena: { fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
  loadKore: { fontWeight: '900', color: '#00B4D8', letterSpacing: 0.5 },
  loadSub: { color: 'rgba(255,215,0,0.5)', fontSize: 10, fontWeight: '900', letterSpacing: 5 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },

  // Top badge
  topBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: '#00E5FF44',
    borderRadius: 20, paddingHorizontal: 24, paddingVertical: 7,
    marginBottom: 12
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: CYAN },
  liveTxt: { color: CYAN, fontSize: 9, fontWeight: '900', letterSpacing: 3 },

  // Hero
  hero: {
    justifyContent: 'flex-end',
    paddingBottom: 32,
    gap: 20
  },

  // Decorative corners
  cornerTL: {
    position: 'absolute', top: 0, left: 0,
    width: 24, height: 24,
    borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(255,215,0,0.3)'
  },
  cornerTR: {
    position: 'absolute', top: 0, right: 0,
    width: 24, height: 24,
    borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(255,215,0,0.3)'
  },

  // Brand — ARENA (white) + KORE (blue)
  brandRow: { flexDirection: 'row', alignItems: 'baseline', gap: 0 },
  brandArena: {
    color: '#FFFFFF',
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: -3,
    lineHeight: 60
  },
  brandKore: {
    color: '#00E5FF',                      // KORE = pure CYAN
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: -3,
    lineHeight: 60
  },
  // Keep old brand style for compatibility
  brand: { color: GOLD, fontSize: 58, fontWeight: '900', letterSpacing: -3, lineHeight: 60 },

  // Subtitle
  subtitleWrap: { gap: 2 },
  sub1: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 2
  },
  sub2: {
    color: '#AAAAAA',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 2
  },

  // Accent line
  accentLine: {
    height: 2, width: 56, backgroundColor: GOLD
  },

  // Metrics — 3 badges on single row, equal width
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'stretch'
  },

  // CTAs
  ctaArea: { gap: 12 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: GOLD,
    borderRadius: 10, paddingVertical: 18,
    elevation: 10
  },
  primaryBtnTxt: { color: BG, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderWidth: 1, borderColor: '#00E5FF',
    borderRadius: 10, paddingVertical: 14
  },
  outlineBtnTxt: { color: '#00E5FF', fontSize: 13, fontWeight: '900', letterSpacing: 2 },

  // Partner section
  partnerSection: { marginTop: 8, gap: 16 },
  partnerDivider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  divTxt: { color: '#AAAAAA', fontSize: 11, fontWeight: '400', letterSpacing: 4 },
  partnerCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  partnerGrad: { padding: 20, gap: 14 },
  partnerTopGlow: { height: 2, backgroundColor: CYAN, opacity: 0.5, marginHorizontal: -20, marginTop: -20, marginBottom: 6 },
  partnerHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  partnerLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '400', letterSpacing: 2 },
  partnerSub: { color: '#00E5FF22', fontSize: 11, fontWeight: '400', letterSpacing: 3 },
  partnerCopy: {
    color: '#E0E0E0',
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    letterSpacing: 0.5
  },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featTxt: { color: '#AAAAAA', fontSize: 13, fontWeight: '400', letterSpacing: 1, flex: 1 },
  gymBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'transparent',
    borderRadius: 10, paddingVertical: 16,
    marginTop: 4,
    borderWidth: 1, borderColor: '#00E5FF',
    elevation: 8
  },
  gymBtnTxt: { color: CYAN, fontSize: 14, fontWeight: '900', letterSpacing: 3 },

  // Footer
  footer: { alignItems: 'center', gap: 4, marginTop: 28, paddingBottom: 8 },
  footerTxt: { color: '#AAAAAA', fontSize: 8, fontWeight: '400', letterSpacing: 2 },
  versionLabel: { color: '#00E5FF', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 6, opacity: 0.8 }
});
