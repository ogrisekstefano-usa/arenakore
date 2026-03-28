/**
 * ARENAKORE — HERO INDEX v2.0
 * The Biometric Frontier. DNA-Certified Performance.
 * Video background (expo-av) + Cinematic overlays + Coach/Gym partner section.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  ScrollView, Image, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, withRepeat, withTiming, withSequence,
  useAnimatedStyle, FadeInDown, FadeIn, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Circle, Rect, Defs, LinearGradient as SvgGrad, Stop, G } from 'react-native-svg';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';

// ── Assets
const VIDEO_URL   = 'https://videos.pexels.com/video-files/4669895/4669895-hd_1280_720_25fps.mp4';
const FALLBACK_BG = 'https://images.unsplash.com/photo-1634042341821-05c4e074cedc?crop=entropy&cs=srgb&fm=jpg&q=85&w=1080';

const GOLD = '#D4AF37';
const CYAN = '#00F2FF';
const BG   = '#050505';

// =====================================================================
// ATHLETE BACKGROUND — blurred photo with deep vignette
// =====================================================================
// ── Biometric skeleton keypoints/connections (COCO 17-pt)
const COCO_CONNS = [[0,1],[0,2],[1,3],[2,4],[5,6],[5,7],[7,9],[6,8],[8,10],[5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16]];

function mkPts(cx: number, W: number, H: number): [number,number][] {
  const s = W * 0.062;
  return [
    [cx, H*0.09],[cx-s*0.28,H*0.085],[cx+s*0.28,H*0.085],
    [cx-s*0.55,H*0.095],[cx+s*0.55,H*0.095],
    [cx-s*0.88,H*0.20],[cx+s*0.88,H*0.20],
    [cx-s*1.35,H*0.31],[cx+s*1.35,H*0.31],
    [cx-s*1.48,H*0.42],[cx+s*1.48,H*0.42],
    [cx-s*0.65,H*0.49],[cx+s*0.65,H*0.49],
    [cx-s*0.70,H*0.64],[cx+s*0.70,H*0.64],
    [cx-s*0.70,H*0.79],[cx+s*0.70,H*0.79],
  ] as [number,number][];
}

function BioScanOverlay() {
  const { width: W, height: H } = useWindowDimensions();
  const sweep = useSharedValue(-40);
  useEffect(() => {
    sweep.value = withRepeat(withTiming(H + 40, { duration: 5500, easing: Easing.linear }), -1, false);
  }, [H]);
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sweep.value }] }));

  const f1 = mkPts(W * 0.31, W, H);
  const f2 = mkPts(W * 0.69, W, H);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 3 }]} pointerEvents="none">
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        {[f1, f2].map((pts, fi) => (
          <G key={fi}>
            {COCO_CONNS.map(([a, b], i) => (
              <Line key={i}
                x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]}
                stroke="#D4AF37" strokeWidth={1.2} opacity={0.35}
              />
            ))}
            {pts.map(([x, y], i) => (
              <G key={i}>
                <Circle cx={x} cy={y} r={i < 5 ? 5 : 4} fill="#00F2FF" opacity={0.18} />
                <Circle cx={x} cy={y} r={i < 5 ? 2.5 : 2} fill="#00F2FF" opacity={0.65} />
                <Circle cx={x} cy={y} r={0.8} fill="#FFFFFF" opacity={0.9} />
              </G>
            ))}
          </G>
        ))}
      </Svg>
      {/* Gold sweep line */}
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0 }, sweepStyle]}>
        <View style={{ height: 1.5, backgroundColor: 'rgba(212,175,55,0.5)' }} />
        <View style={{ height: 28, backgroundColor: 'rgba(212,175,55,0.06)', marginTop: -1 }} />
      </Animated.View>
    </View>
  );
}

const ATHLETE_BG = 'https://images.pexels.com/photos/14139779/pexels-photo-14139779.jpeg?auto=compress&cs=tinysrgb&h=1200&w=800';
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
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View style={[scan$.wrap, lineStyle]} pointerEvents="none">
      <View style={scan$.line} />
      <View style={scan$.glow} />
    </Animated.View>
  );
}
const scan$ = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, zIndex: 5 },
  line: { height: 1, backgroundColor: 'rgba(212,175,55,0.4)' },
  glow: { height: 24, backgroundColor: 'rgba(212,175,55,0.06)', marginTop: -12 },
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
    backgroundColor: 'rgba(212,175,55,0.07)',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)', borderRadius: 10,
    minWidth: 0,                      // allow shrinking below natural width
  },
  value: { color: GOLD, fontSize: 18, fontWeight: '900', letterSpacing: 0 },
  label: { color: 'rgba(255,255,255,0.35)', fontSize: 7, fontWeight: '900', letterSpacing: 1.5, marginTop: 2, textAlign: 'center' },
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

  // Auth redirect — Login persistence is automatic via AuthContext + AsyncStorage
  useEffect(() => {
    if (!isLoading && token && user) {
      if (user.onboarding_completed) {
        router.replace('/(tabs)/kore');
      } else {
        router.replace('/onboarding/step1');
      }
    }
  }, [isLoading, token, user]);

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
    textShadowColor: `rgba(212,175,55,${glow.value * 0.7})`,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24 * glow.value,
  }));

  // ── Loading screen
  const loadingSize = Math.min(52, Math.floor(SW / 8));
  const KORE_BLUE = '#00B4D8';  // KORE signature blue

  // ── Brand animated style — MUST be declared before any conditional return
  const brandArenaStyle = useAnimatedStyle(() => ({
    textShadowColor: `rgba(212,175,55,${glow.value * 0.4})`,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16 * glow.value,
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

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* ── ATHLETE BACKGROUND — less blur, more visible ── */}
      <Image
        source={{ uri: ATHLETE_BG }}
        style={[StyleSheet.absoluteFill, { opacity: 0.45 }]}
        blurRadius={5}
        resizeMode="cover"
      />

      {/* ── GRADIENT OVERLAY — softer at top (athletes visible), pure black at bottom ── */}
      <LinearGradient
        colors={[
          'rgba(5,5,5,0.05)',
          'rgba(5,5,5,0.45)',
          'rgba(5,5,5,0.85)',
          'rgba(5,5,5,0.97)',
          BG,
        ]}
        locations={[0, 0.25, 0.52, 0.78, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* ── BIOSCANNER DOT OVERLAY on athletes ── */}
      <BioScanOverlay />

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
            {/* PRIMARY: START NEXUS INITIALIZATION */}
            <TouchableOpacity
              testID="start-nexus-btn"
              style={s.primaryBtn}
              onPress={() => router.push('/onboarding/step1')}
              activeOpacity={0.85}
            >
              <Ionicons name="scan" size={18} color={BG} />
              <Text style={s.primaryBtnTxt}>START NEXUS INITIALIZATION</Text>
            </TouchableOpacity>

            {/* SECONDARY: RESUME SESSION */}
            <TouchableOpacity
              testID="resume-btn"
              style={s.outlineBtn}
              onPress={() => router.push('/login')}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in-outline" size={16} color={CYAN} />
              <Text style={s.outlineBtnTxt}>RESUME SESSION</Text>
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
              colors={['rgba(0,242,255,0.04)', 'rgba(0,242,255,0.01)']}
              style={s.partnerGrad}
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
                Certifica i tuoi atleti.{'\n'}
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
                <Ionicons name="business-outline" size={16} color={BG} />
                <Text style={s.gymBtnTxt}>BECOME A KORE HUB</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* ══════ FOOTER ══════ */}
        <View style={s.footer}>
          <Text style={s.footerTxt}>ARENAKORE · THE CORE OF PERFORMANCE</Text>
          <Text style={s.footerTxt}>CHICAGO BETA · KORE #00001 STEFANO OGRISEK</Text>
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
  loadArena: { fontWeight: '900', color: '#FFFFFF', letterSpacing: -2 },
  loadKore: { fontWeight: '900', color: '#00B4D8', letterSpacing: -2 },
  loadSub: { color: 'rgba(212,175,55,0.5)', fontSize: 10, fontWeight: '900', letterSpacing: 5 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },

  // Top badge
  topBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,242,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.15)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    marginBottom: 12,
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: CYAN },
  liveTxt: { color: CYAN, fontSize: 9, fontWeight: '900', letterSpacing: 3 },

  // Hero
  hero: {
    justifyContent: 'flex-end',
    paddingBottom: 32,
    gap: 20,
  },

  // Decorative corners
  cornerTL: {
    position: 'absolute', top: 0, left: 0,
    width: 24, height: 24,
    borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(212,175,55,0.3)',
  },
  cornerTR: {
    position: 'absolute', top: 0, right: 0,
    width: 24, height: 24,
    borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(212,175,55,0.3)',
  },

  // Brand — ARENA (white) + KORE (blue)
  brandRow: { flexDirection: 'row', alignItems: 'baseline', gap: 0 },
  brandArena: {
    color: '#FFFFFF',
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: -3,
    lineHeight: 60,
  },
  brandKore: {
    color: '#00F2FF',                      // KORE = pure CYAN
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: -3,
    lineHeight: 60,
    textShadowColor: 'rgba(0,242,255,0.75)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  // Keep old brand style for compatibility
  brand: { color: GOLD, fontSize: 58, fontWeight: '900', letterSpacing: -3, lineHeight: 60 },

  // Subtitle
  subtitleWrap: { gap: 2 },
  sub1: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  sub2: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // Accent line
  accentLine: {
    height: 2, width: 56, backgroundColor: GOLD,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8,
  },

  // Metrics — 3 badges on single row, equal width
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'stretch',
  },

  // CTAs
  ctaArea: { gap: 12 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: GOLD,
    borderRadius: 10, paddingVertical: 18,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 14,
    elevation: 10,
  },
  primaryBtnTxt: { color: BG, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'transparent',
    borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.4)',
    borderRadius: 10, paddingVertical: 14,
  },
  outlineBtnTxt: { color: CYAN, fontSize: 13, fontWeight: '900', letterSpacing: 2 },

  // Partner section
  partnerSection: { marginTop: 8, gap: 16 },
  partnerDivider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  divTxt: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '900', letterSpacing: 4 },
  partnerCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,242,255,0.12)' },
  partnerGrad: { padding: 20, gap: 14 },
  partnerTopGlow: { height: 2, backgroundColor: CYAN, opacity: 0.5, marginHorizontal: -20, marginTop: -20, marginBottom: 6 },
  partnerHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  partnerLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  partnerSub: { color: 'rgba(0,242,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  partnerCopy: {
    color: '#E0E0E0',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: 0.5,
  },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featTxt: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '700', letterSpacing: 1, flex: 1 },
  gymBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: CYAN,
    borderRadius: 10, paddingVertical: 16,
    marginTop: 4,
    shadowColor: CYAN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10,
    elevation: 8,
  },
  gymBtnTxt: { color: BG, fontSize: 14, fontWeight: '900', letterSpacing: 3 },

  // Footer
  footer: { alignItems: 'center', gap: 4, marginTop: 28, paddingBottom: 8 },
  footerTxt: { color: 'rgba(255,255,255,0.12)', fontSize: 8, fontWeight: '700', letterSpacing: 2 },
});
