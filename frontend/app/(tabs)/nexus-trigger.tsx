/**
 * ARENAKORE — NEXUS TRIGGER TAB v3.0 (Refactored)
 * Nike Elite Aesthetic — Motion tracking, Bio-scan, Challenge Forge
 * Heavy sub-components extracted to /components/nexus/
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  Dimensions, Platform, Modal, ScrollView, ImageBackground, TextInput,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, withRepeat, withSequence, withTiming,
  useAnimatedStyle, withSpring, withDelay, Easing, interpolate,
  FadeIn, FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Text as SvgText, Polygon } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, UserRole, ROLE_CONFIG } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { playAcceptPing, playRecordBroken, startBioScanHum, playBioMatchPing } from '../../utils/sounds';
import { MotionAnalyzer, MotionState, ExerciseType, SkeletonPose } from '../../utils/MotionAnalyzer';
import { profileDevice, DeviceProfile, DeviceTier, getTierLabel, getTrackingMode } from '../../utils/DeviceIntelligence';

// Extracted sub-components
import { CyberGrid, DigitalShadow, ScanLine } from '../../components/nexus/NexusVisuals';
import { BurgerMenu } from '../../components/nexus/NexusBurgerMenu';
import { CinemaResults } from '../../components/nexus/NexusCinemaResults';
import { ProUnlockModal } from '../../components/nexus/ProUnlockModal';

const { width: SW, height: SH } = Dimensions.get('window');

// Nike-style dramatic athlete images
const FORGE_IMAGES = {
  personal: 'https://images.unsplash.com/photo-1710736460914-4a7f22d736c4?w=800&q=60',
  battle: 'https://images.unsplash.com/photo-1709315957145-a4bad1feef28?w=800&q=60',
  duel: 'https://images.pexels.com/photos/1075935/pexels-photo-1075935.jpeg?w=800&q=60',
};

const CONSOLE_IMAGES = {
  scan: 'https://images.unsplash.com/photo-1710736460914-4a7f22d736c4?w=800&q=60',
  forge: 'https://images.unsplash.com/photo-1698788067684-2053c651bfed?w=800&q=60',
  hall: 'https://images.unsplash.com/photo-1590285372176-c3ff4d8c9399?w=800&q=60',
  dna: 'https://images.pexels.com/photos/7479526/pexels-photo-7479526.jpeg?w=800&q=60',
};

// ========== BIO-SCAN TRIGGER ==========
function BioScanTrigger({ user, onComplete }: { user: any; onComplete: () => void }) {
  const laserY = useSharedValue(0);
  const laserGlow = useSharedValue(0.5);
  const [progress, setProgress] = useState(0);
  const [scanPhase, setScanPhase] = useState(0);
  const [matchText, setMatchText] = useState('');
  const [showMatch, setShowMatch] = useState(false);
  const matchTimerRef = useRef<any>(null);

  const PHASES = ['SCANNING BIOMETRICS', 'DETECTING BIO-SIGNATURE', 'MAPPING KORE POINTS', 'CALIBRATING SENSORS'];
  const isFounder = user?.is_founder || user?.is_admin;
  const fullMatch = `${(user?.username || 'ATHLETE').toUpperCase()} \u00b7 ${isFounder ? 'FOUNDER' : 'KORE ATHLETE'}`;

  useEffect(() => {
    laserY.value = withRepeat(withTiming(SH, { duration: 1600, easing: Easing.inOut(Easing.ease) }), -1, true);
    laserGlow.value = withRepeat(withSequence(withTiming(1, { duration: 500 }), withTiming(0.3, { duration: 500 })), -1, false);
    const stopHum = startBioScanHum();
    let p = 0;
    const pi = setInterval(() => {
      p += 2 + Math.random() * 3;
      if (p > 100) p = 100;
      setProgress(Math.floor(p));
      if (p < 25) setScanPhase(0); else if (p < 50) setScanPhase(1); else if (p < 75) setScanPhase(2); else setScanPhase(3);
      if (p >= 100) { clearInterval(pi); if (stopHum) stopHum(); startTypewriter(); }
    }, 60);
    return () => { clearInterval(pi); if (stopHum) stopHum(); if (matchTimerRef.current) clearTimeout(matchTimerRef.current); };
  }, []);

  const startTypewriter = () => {
    setShowMatch(true);
    let idx = 0;
    const tw = setInterval(() => {
      idx++;
      const revealed = fullMatch.slice(0, idx);
      const scramble = idx < fullMatch.length
        ? revealed + String.fromCharCode(33 + Math.random() * 60) + String.fromCharCode(33 + Math.random() * 60)
        : revealed;
      setMatchText(scramble);
      if (idx >= fullMatch.length) {
        clearInterval(tw);
        setMatchText(fullMatch);
        playBioMatchPing();
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        matchTimerRef.current = setTimeout(onComplete, 1200);
      }
    }, 45);
  };

  const ls = useAnimatedStyle(() => ({ transform: [{ translateY: laserY.value }] }));
  const gs = useAnimatedStyle(() => ({ opacity: laserGlow.value }));

  return (
    <View style={bio$.overlay}>
      <Animated.View style={[bio$.laserWrap, ls]}>
        <Animated.View style={[bio$.laserGlow, gs]} />
        <View style={bio$.laserLine} />
        <Animated.View style={[bio$.laserGlow, gs]} />
      </Animated.View>
      <View style={bio$.center}>
        {!showMatch ? (
          <>
            <Text style={bio$.title}>SCANNING BIOMETRICS...</Text>
            <Text style={bio$.phase}>[{PHASES[scanPhase]}]</Text>
            <View style={bio$.bioRow}>
              <View style={bio$.bioItem}><Text style={bio$.bioLabel}>SPORT</Text><Text style={bio$.bioVal}>{user?.sport?.toUpperCase() || '---'}</Text></View>
              <View style={bio$.bioItem}><Text style={bio$.bioLabel}>LVL</Text><Text style={bio$.bioVal}>{user?.level || 1}</Text></View>
              <View style={bio$.bioItem}><Text style={bio$.bioLabel}>CLASS</Text><Text style={bio$.bioVal}>{user?.is_pro ? 'PRO' : 'STD'}</Text></View>
            </View>
            <View style={bio$.progressRow}>
              <View style={bio$.progressTrack}><View style={[bio$.progressFill, { width: `${progress}%` as any }]} /></View>
              <Text style={bio$.progressPct}>{progress}%</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={bio$.matchLabel}>BIO-SIGNATURE MATCHED</Text>
            <Text style={bio$.matchText}>{matchText}</Text>
            {isFounder && <Text style={bio$.founderGlow}><Ionicons name="star" size={12} color="#D4AF37" /> FOUNDER #{user?.founder_number || '?'}</Text>}
          </>
        )}
      </View>
      <View style={[bio$.bracket, { top: 60, left: 20 }]}><View style={bio$.bH} /><View style={bio$.bV} /></View>
      <View style={[bio$.bracket, { top: 60, right: 20, transform: [{ scaleX: -1 }] }]}><View style={bio$.bH} /><View style={bio$.bV} /></View>
      <View style={[bio$.bracket, { bottom: 100, left: 20, transform: [{ scaleY: -1 }] }]}><View style={bio$.bH} /><View style={bio$.bV} /></View>
      <View style={[bio$.bracket, { bottom: 100, right: 20, transform: [{ scaleX: -1 }, { scaleY: -1 }] }]}><View style={bio$.bH} /><View style={bio$.bV} /></View>
    </View>
  );
}

const bio$ = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, backgroundColor: 'rgba(5,5,5,0.94)', justifyContent: 'center', alignItems: 'center' },
  laserWrap: { position: 'absolute', left: 0, right: 0, height: 6, alignItems: 'center' },
  laserLine: { height: 2, width: '100%', backgroundColor: '#00F2FF' },
  laserGlow: { height: 16, width: '85%', backgroundColor: 'rgba(0,242,255,0.25)', borderRadius: 8 },
  center: { alignItems: 'center', gap: 14, paddingHorizontal: 32 },
  title: { color: '#00F2FF', fontSize: 14, fontWeight: '900', letterSpacing: 4 },
  phase: { color: '#D4AF37', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  bioRow: { flexDirection: 'row', gap: 24, marginTop: 4 },
  bioItem: { alignItems: 'center', gap: 2 },
  bioLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '700', letterSpacing: 2 },
  bioVal: { color: '#00F2FF', fontSize: 16, fontWeight: '900' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: SW * 0.55, marginTop: 8 },
  progressTrack: { flex: 1, height: 3, backgroundColor: 'rgba(0,242,255,0.15)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  progressPct: { color: '#00F2FF', fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'], width: 50 },
  matchLabel: { color: '#00F2FF', fontSize: 11, fontWeight: '700', letterSpacing: 4 },
  matchText: { color: '#D4AF37', fontSize: 18, fontWeight: '900', letterSpacing: 2, fontVariant: ['tabular-nums'], textAlign: 'center' },
  founderGlow: { color: '#D4AF37', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginTop: 4 },
  bracket: { position: 'absolute' },
  bH: { width: 30, height: 2, backgroundColor: '#00F2FF', opacity: 0.5 },
  bV: { width: 2, height: 30, backgroundColor: '#00F2FF', opacity: 0.5 },
});

// ========== NEXUS CONSOLE ==========
function NexusConsole({ user, onScan, onForge, deviceTier, eligibility }: {
  user: any; onScan: () => void; onForge: () => void; deviceTier: DeviceTier; eligibility: any;
}) {
  const router = useRouter();
  const isFounder = user?.is_founder || user?.is_admin;
  const founderShimmer = useSharedValue(0.7);
  useEffect(() => { founderShimmer.value = withRepeat(withSequence(withTiming(1, { duration: 1500 }), withTiming(0.7, { duration: 1500 })), -1, false); }, []);
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: founderShimmer.value }));

  const CONSOLE_ICONS: Record<string, { ionName: keyof typeof Ionicons.glyphMap; color: string }> = {
    scan: { ionName: 'scan', color: '#00F2FF' }, forge: { ionName: 'construct', color: '#D4AF37' },
    hall: { ionName: 'trophy', color: '#D4AF37' }, dna: { ionName: 'analytics', color: '#00F2FF' },
  };
  const buttons = [
    { key: 'scan', title: 'NEXUS SCAN', sub: 'BIO-SKELETON TRACKING', image: CONSOLE_IMAGES.scan, action: onScan },
    { key: 'forge', title: 'THE FORGE', sub: 'CREA \u00b7 SELEZIONA \u00b7 SFIDA', image: CONSOLE_IMAGES.forge, action: onForge },
    { key: 'hall', title: 'HALL OF KORE', sub: 'LEADERBOARD GLOBALE', image: CONSOLE_IMAGES.hall, action: () => router.push('/(tabs)/hall') },
    { key: 'dna', title: 'MY DNA', sub: 'STATS RADAR BIOMETRICO', image: CONSOLE_IMAGES.dna, action: () => router.push('/(tabs)/dna') },
  ];

  return (
    <View style={cn$.container} testID="nexus-console">
      <CyberGrid intensity={0.3} />
      <SafeAreaView style={cn$.safe}>
        <View style={cn$.header}>
          <Text style={cn$.brandLabel}>ARENAKORE</Text>
          <Text style={cn$.title}>NEXUS</Text>
          <Text style={cn$.subtitle}>COMMAND CENTER</Text>
          {isFounder && (
            <Animated.View style={[cn$.founderBadge, shimmerStyle]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="star" size={10} color="#D4AF37" /><Text style={cn$.founderText}>FOUNDER</Text></View>
            </Animated.View>
          )}
          <View style={cn$.tierRow}><View style={cn$.tierDot} /><Text style={cn$.tierText}>{getTierLabel(deviceTier)} ACTIVE</Text></View>
        </View>
        <ScrollView style={cn$.scroll} contentContainerStyle={cn$.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Bio-Scan Eligibility Status */}
          {eligibility && (
            <View style={[
              cn$.eligBanner,
              eligibility.can_scan ? cn$.eligBannerActive : cn$.eligBannerLocked,
            ]}>
              <Ionicons
                name={eligibility.can_scan ? 'scan' : eligibility.phase === 'locked' ? 'lock-closed' : 'time-outline'}
                size={12}
                color={eligibility.can_scan ? '#00F2FF' : eligibility.phase === 'locked' ? '#444' : '#D4AF37'}
              />
              <Text style={[cn$.eligText, eligibility.can_scan ? cn$.eligTextActive : cn$.eligTextLocked]}>
                {eligibility.message}
              </Text>
              {eligibility.can_scan && (
                <View style={cn$.eligReadyDot} />
              )}
            </View>
          )}
          <View style={cn$.grid}>
            {buttons.map((btn) => (
              <TouchableOpacity key={btn.key} style={cn$.card} activeOpacity={0.85} onPress={btn.action}>
                <ImageBackground source={{ uri: btn.image }} style={cn$.cardBg} imageStyle={cn$.cardImage}>
                  <LinearGradient colors={['rgba(5,5,5,0.15)', 'rgba(5,5,5,0.6)', 'rgba(5,5,5,0.97)']} locations={[0, 0.35, 0.85]} style={cn$.cardGradient}>
                    <Ionicons name={CONSOLE_ICONS[btn.key].ionName} size={32} color={CONSOLE_ICONS[btn.key].color} />
                    <View style={cn$.cardBottom}><Text style={cn$.cardTitle}>{btn.title}</Text><Text style={cn$.cardSub}>{btn.sub}</Text></View>
                  </LinearGradient>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const cn$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  safe: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 16, paddingBottom: 8, gap: 2 },
  brandLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '800', letterSpacing: 4 },
  title: { color: '#D4AF37', fontSize: 32, fontWeight: '900', letterSpacing: 8 },
  subtitle: { color: '#00F2FF', fontSize: 11, fontWeight: '700', letterSpacing: 4, opacity: 0.85 },
  founderBadge: { marginTop: 6, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.08)' },
  founderText: { color: '#D4AF37', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  tierDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00F2FF' },
  tierText: { color: '#00F2FF', fontSize: 8, fontWeight: '800', letterSpacing: 2, opacity: 0.6 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 10 },
  card: { width: (SW - 44) / 2, height: (SW - 44) / 2 * 1.15, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,242,255,0.08)' },
  cardBg: { flex: 1 },
  cardImage: { borderRadius: 16 },
  cardGradient: { flex: 1, justifyContent: 'space-between', padding: 16 },
  cardBottom: { gap: 4 },
  cardTitle: { color: '#D4AF37', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  cardSub: { color: '#00F2FF', fontSize: 8, fontWeight: '700', letterSpacing: 1.5, opacity: 0.7 },
  // BIO-SCAN ELIGIBILITY BANNER
  eligBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, marginTop: 10, marginBottom: 2,
  },
  eligBannerActive: { backgroundColor: 'rgba(0,242,255,0.05)', borderColor: 'rgba(0,242,255,0.18)' },
  eligBannerLocked: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' },
  eligText: { flex: 1, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  eligTextActive: { color: '#00F2FF' },
  eligTextLocked: { color: 'rgba(255,255,255,0.3)' },
  eligReadyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00F2FF', shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4 },
});

// ========== CHALLENGE FORGE ==========
type ForgeMode = 'personal' | 'battle' | 'duel';

function ForgeCard({ title, subtitle, image, iconEl, onPress }: {
  title: string; subtitle: string; image: string; iconEl: React.ReactNode; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={fg$.card} onPress={onPress} activeOpacity={0.85}>
      <ImageBackground source={{ uri: image }} style={fg$.imageBg} imageStyle={fg$.imageStyle}>
        <LinearGradient colors={['rgba(5,5,5,0.1)', 'rgba(5,5,5,0.55)', 'rgba(5,5,5,0.95)']} locations={[0, 0.3, 0.78]} style={fg$.gradient}>
          <View style={fg$.cardTop}>{iconEl}</View>
          <View style={fg$.cardBottom}><Text style={fg$.cardTitle}>{title}</Text><Text style={fg$.cardSub}>{subtitle}</Text></View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}

function ChallengeForge({ onSelect, user }: { onSelect: (mode: ForgeMode, exercise: ExerciseType) => void; user: any }) {
  const [mode, setMode] = useState<ForgeMode | null>(null);
  const pulseDNA = useSharedValue(1);
  const flameFlicker = useSharedValue(0.6);
  const boltFlash = useSharedValue(0);

  useEffect(() => {
    pulseDNA.value = withRepeat(withSequence(withTiming(1.2, { duration: 900 }), withTiming(1, { duration: 900 })), -1, false);
    flameFlicker.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.5, { duration: 400 })), -1, false);
    boltFlash.value = withRepeat(withSequence(withTiming(1, { duration: 300 }), withTiming(0.2, { duration: 700 })), -1, false);
  }, []);

  const dnaS = useAnimatedStyle(() => ({ transform: [{ scale: pulseDNA.value }] }));
  const flameS = useAnimatedStyle(() => ({ opacity: flameFlicker.value }));
  const boltS = useAnimatedStyle(() => ({ opacity: boltFlash.value }));

  if (mode) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={fg$.selectWrap}>
        <Text style={fg$.selectTitle}>SELEZIONA SFIDA</Text>
        <Text style={fg$.selectSub}>
          {mode === 'personal' ? 'Focus DNA \u2014 Migliora le tue stats' : mode === 'battle' ? 'XP Massimo \u2014 Scala il Rank' : 'Combatti in tempo reale'}
        </Text>
        <View style={fg$.exRow}>
          <TouchableOpacity style={fg$.exCard} onPress={() => onSelect(mode, 'squat')} activeOpacity={0.8}>
            <Ionicons name="barbell" size={36} color="#00F2FF" />
            <Text style={fg$.exName}>DEEP SQUAT</Text>
            <Text style={fg$.exDesc}>Forza {'\u00b7'} Potenza</Text>
          </TouchableOpacity>
          <TouchableOpacity style={fg$.exCard} onPress={() => onSelect(mode, 'punch')} activeOpacity={0.8}>
            <Ionicons name="hand-left" size={36} color="#00F2FF" />
            <Text style={fg$.exName}>EXPLOSIVE PUNCH</Text>
            <Text style={fg$.exDesc}>Velocit{'\u00e0'} {'\u00b7'} Agilit{'\u00e0'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setMode(null)} style={fg$.backBtn}><Text style={fg$.backText}>{'\u2190'} INDIETRO</Text></TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(400)} style={fg$.container}>
      <Text style={fg$.title}>CHALLENGE FORGE</Text>
      <Text style={fg$.sub}>Scegli la tua sfida</Text>
      <View style={fg$.cardsCol}>
        <ForgeCard title="PERSONAL TRAINING" subtitle={"Focus DNA \u00b7 Migliora le tue stats atletiche"}
          image={FORGE_IMAGES.personal} onPress={() => setMode('personal')}
          iconEl={<Animated.View style={dnaS}><Ionicons name="analytics" size={24} color="#00F2FF" /></Animated.View>}
        />
        <ForgeCard title="POINTS BATTLE" subtitle={"Hall of Kore \u00b7 XP massimo per scalare il Rank"}
          image={FORGE_IMAGES.battle} onPress={() => setMode('battle')}
          iconEl={<View style={fg$.iconRow}><Ionicons name="trophy" size={24} color="#D4AF37" /><Animated.View style={flameS}><Ionicons name="flame" size={14} color="#FF3B30" style={{ marginLeft: -4, marginTop: -6 }} /></Animated.View></View>}
        />
        <ForgeCard title="LIVE DUEL" subtitle={"Tempo reale \u00b7 Sfida un avversario"}
          image={FORGE_IMAGES.duel} onPress={() => setMode('duel')}
          iconEl={<Animated.View style={boltS}><Ionicons name="flash" size={24} color="#00F2FF" /></Animated.View>}
        />
      </View>
    </Animated.View>
  );
}

const fg$ = StyleSheet.create({
  container: { alignItems: 'center', gap: 12, paddingHorizontal: 16, width: '100%' },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 5 },
  sub: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginBottom: 4 },
  cardsCol: { width: '100%', gap: 10 },
  card: { width: '100%', height: 130, borderRadius: 16, overflow: 'hidden' },
  imageBg: { width: '100%', height: '100%' },
  imageStyle: { borderRadius: 16, opacity: 0.7 },
  gradient: { flex: 1, justifyContent: 'space-between', padding: 16 },
  cardTop: { alignSelf: 'flex-start' },
  cardBottom: { gap: 2 },
  cardTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  cardSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  iconRow: { flexDirection: 'row', alignItems: 'flex-start' },
  selectWrap: { alignItems: 'center', gap: 14, paddingHorizontal: 20, width: '100%' },
  selectTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 4 },
  selectSub: { color: 'rgba(255,255,255,0.55)', fontSize: 11, textAlign: 'center' },
  exRow: { flexDirection: 'row', gap: 12, width: '100%' },
  exCard: {
    flex: 1, alignItems: 'center', gap: 8, paddingVertical: 28,
    backgroundColor: 'rgba(0,242,255,0.03)', borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.12)',
  },
  exName: { color: '#00F2FF', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  exDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 9 },
  backBtn: { marginTop: 8 },
  backText: { color: '#555', fontSize: 11, fontWeight: '700' },
});

// ========== MINI DNA RADAR ==========
function MiniDNARadar({ dna, explosive }: { dna: any; explosive: boolean }) {
  const ps = useSharedValue(1);
  useEffect(() => { if (explosive) ps.value = withSequence(withTiming(1.3, { duration: 150 }), withTiming(1, { duration: 300 })); }, [explosive]);
  const as = useAnimatedStyle(() => ({ transform: [{ scale: ps.value }] }));
  if (!dna) return null;
  const stats = ['velocita', 'forza', 'resistenza', 'agilita', 'tecnica', 'potenza'];
  const vals = stats.map(s => (dna[s] || 20) / 100);
  const cx = 38, cy = 38, r = 28;
  const pts = vals.map((v, i) => { const a = (Math.PI * 2 * i) / 6 - Math.PI / 2; return `${cx + r * v * Math.cos(a)},${cy + r * v * Math.sin(a)}`; }).join(' ');
  const grid = [1, 0.66, 0.33].map(lv => stats.map((_, i) => { const a = (Math.PI * 2 * i) / 6 - Math.PI / 2; return `${cx + r * lv * Math.cos(a)},${cy + r * lv * Math.sin(a)}`; }).join(' '));
  const pAngle = (Math.PI * 2 * 5) / 6 - Math.PI / 2;
  return (
    <Animated.View style={[{ position: 'absolute', bottom: 130, left: 10, zIndex: 35 }, as]}>
      <Svg width={76} height={76}>
        {grid.map((g, i) => <Polygon key={i} points={g} fill="none" stroke="#00F2FF" strokeWidth={0.5} opacity={0.2} />)}
        <Polygon points={pts} fill="rgba(0,242,255,0.08)" stroke="#00F2FF" strokeWidth={1.5} opacity={0.8} />
        {explosive && <Circle cx={cx + r * vals[5] * Math.cos(pAngle)} cy={cy + r * vals[5] * Math.sin(pAngle)} r={6} fill="#00F2FF" opacity={0.9} />}
      </Svg>
      <Text style={{ color: '#00F2FF', fontSize: 7, fontWeight: '800', letterSpacing: 2, textAlign: 'center', marginTop: -2 }}>DNA</Text>
    </Animated.View>
  );
}

// ========== COUNTDOWN ==========
function Countdown({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(3);
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);
  useEffect(() => {
    const iv = setInterval(() => {
      setCount(p => { if (p <= 1) { clearInterval(iv); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setTimeout(onComplete, 400); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    scale.value = 0.3; opacity.value = 0;
    scale.value = withSpring(1, { damping: 8, stiffness: 150 });
    opacity.value = withSequence(withTiming(1, { duration: 200 }), withDelay(500, withTiming(0.4, { duration: 300 })));
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [count]);
  const as = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  return (
    <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 25, backgroundColor: 'rgba(5,5,5,0.88)' }}>
      <Animated.View style={[{ width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(0,242,255,0.06)', borderWidth: 3, borderColor: '#00F2FF', alignItems: 'center', justifyContent: 'center' }, as]}>
        <Text style={{ color: '#00F2FF', fontSize: 64, fontWeight: '900' }}>{count === 0 ? 'GO' : count}</Text>
      </Animated.View>
      <Text style={{ color: '#888', fontSize: 12, fontWeight: '700', letterSpacing: 3, marginTop: 24 }}>{count > 0 ? 'PREPARATI' : 'NEXUS ATTIVATO'}</Text>
    </View>
  );
}

// ========== MAIN SCREEN ==========
export default function NexusTriggerScreen() {
  const { user, token, logout, activeRole, setActiveRole, updateUser } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'console' | 'bioscan' | 'forge' | 'countdown' | 'scanning' | 'results'>('console');
  const [exercise, setExercise] = useState<ExerciseType>('squat');
  const [forgeMode, setForgeMode] = useState<ForgeMode>('personal');
  const [motionState, setMotionState] = useState<MotionState | null>(null);
  const [motionActive, setMotionActive] = useState(false);
  const [goldFlash, setGoldFlash] = useState(false);
  const [timer, setTimer] = useState(0);
  const [scanResult, setScanResult] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [deviceTier, setDeviceTier] = useState<DeviceTier>('standard');
  // SPRINT 7: Bio-Evolution Engine
  const [eligibility, setEligibility] = useState<any>(null);
  const [showProUnlock, setShowProUnlock] = useState(false);
  const [bioscanResult, setBioscanResult] = useState<any>(null);

  const analyzerRef = useRef<MotionAnalyzer | null>(null);
  const startTimeRef = useRef(0);
  const timerRef = useRef<any>(null);
  const lastRepRef = useRef(0);
  const accelSubRef = useRef<any>(null);
  const motionTimeoutRef = useRef<any>(null);

  useEffect(() => { const dp = profileDevice(); setDeviceTier(dp.tier); }, []);

  // SPRINT 7: Fetch bio-scan eligibility on mount
  useEffect(() => {
    if (!token) return;
    api.getRescanEligibility(token)
      .then(data => setEligibility(data))
      .catch(() => {});
  }, [token]);

  // Web camera & motion detection — SPRINT 5: Camera VISIBLE, overlay reduced
  useEffect(() => {
    if (phase !== 'scanning' || Platform.OS !== 'web') return;
    let stream: any; let videoEl: any; let motionIv: any; let prevFrame: any;
    (async () => {
      try {
        stream = await (navigator as any).mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
        videoEl = document.createElement('video');
        videoEl.srcObject = stream; videoEl.muted = true; videoEl.playsInline = true;
        // SPRINT 5: Make camera VISIBLE as full-screen background (mirrored)
        videoEl.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;object-fit:cover;z-index:0;transform:scaleX(-1);opacity:1;';
        const c = document.getElementById('nexus-cam');
        if (c) c.appendChild(videoEl);
        else document.body.prepend(videoEl);
        await videoEl.play();
        // Motion detection canvas (hidden, uses low-res for performance)
        const cv = document.createElement('canvas'); cv.width = 160; cv.height = 120; const ctx = cv.getContext('2d');
        motionIv = setInterval(() => {
          if (!videoEl || videoEl.readyState < 2 || !ctx) return;
          ctx.drawImage(videoEl, 0, 0, 160, 120);
          const f = ctx.getImageData(0, 0, 160, 120);
          if (prevFrame) {
            let d = 0; for (let i = 0; i < f.data.length; i += 16) d += Math.abs(f.data[i] - prevFrame.data[i]);
            const avgDiff = d / (f.data.length / 16);
            if (avgDiff > 8) {
              setMotionActive(true);
              if (motionTimeoutRef.current) clearTimeout(motionTimeoutRef.current);
              motionTimeoutRef.current = setTimeout(() => setMotionActive(false), 500);
              if (avgDiff > 16) { setGoldFlash(true); setTimeout(() => setGoldFlash(false), 350); }
            }
          }
          prevFrame = f;
        }, 150);
      } catch (_) {}
    })();
    return () => {
      if (motionIv) clearInterval(motionIv);
      if (stream) stream.getTracks().forEach((t: any) => t.stop());
      if (videoEl?.parentNode) videoEl.parentNode.removeChild(videoEl);
    };
  }, [phase]);

  const handleForgeSelect = (mode: ForgeMode, ex: ExerciseType) => { setForgeMode(mode); setExercise(ex); setPhase('countdown'); };

  const handleCountdownDone = async () => {
    setPhase('scanning');
    try { if (token) { const s = await api.startNexusSession({ exercise_type: exercise }, token); setSessionId(s.session_id); } } catch (_) {}
    analyzerRef.current = new MotionAnalyzer(exercise);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setTimer(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    if (Platform.OS !== 'web') {
      try { const { startAccelerometer } = require('../../utils/nativeSensors'); accelSubRef.current = startAccelerometer((d: any) => { if (analyzerRef.current) setMotionState({ ...analyzerRef.current.processAccelerometer(d) }); }); } catch (_) {}
    }
  };

  // Web simulation
  const simRef = useRef({ reps: 0, quality: 0, tick: 0, lastRepTick: -100, qualities: [] as number[] });
  useEffect(() => {
    if (phase !== 'scanning' || Platform.OS !== 'web') return;
    simRef.current = { reps: 0, quality: 0, tick: 0, lastRepTick: -100, qualities: [] };
    const ex = exercise;
    const iv = setInterval(() => {
      const d = simRef.current; d.tick++;
      const t = d.tick * 0.033; let x = 0, y = 0, z = 0;
      if (ex === 'squat') {
        const p = (t * 2.5) % (Math.PI * 2); y = Math.sin(p) * 0.8; x = Math.sin(t * 7) * 0.03;
        if (Math.sin(((t - 0.033) * 2.5) % (Math.PI * 2)) < 0 && Math.sin(p) >= 0 && (d.tick - d.lastRepTick) > 30) { d.reps++; d.lastRepTick = d.tick; const q = 65 + Math.random() * 30; d.qualities.push(q); d.quality = Math.round(d.qualities.reduce((a, b) => a + b) / d.qualities.length); }
      } else {
        const cp = t % 1.3;
        if (cp < 0.12) { const pr = cp / 0.12; x = 4.5 * Math.sin(pr * Math.PI); z = 3 * Math.sin(pr * Math.PI); }
        if (cp > 0.04 && cp < 0.08 && (d.tick - d.lastRepTick) > 25) { d.reps++; d.lastRepTick = d.tick; const q = 60 + Math.random() * 35; d.qualities.push(q); d.quality = Math.round(d.qualities.reduce((a, b) => a + b) / d.qualities.length); }
      }
      const mag = Math.sqrt(x * x + y * y + z * z);
      setMotionState({
        reps: d.reps, quality: d.quality, currentPhase: mag > 1 ? (ex === 'squat' ? 'down' : 'strike') : 'idle',
        isInFrame: true, peakAcceleration: Math.max(mag, 4.5), avgAmplitude: d.quality, amplitudes: [...d.qualities],
        lastRepQuality: d.qualities.length > 0 ? Math.round(d.qualities[d.qualities.length - 1]) : 0,
        skeletonPose: { torsoTilt: ex === 'squat' ? Math.max(-1, Math.min(1, -y)) : Math.sin(t) * 0.15, kneeAngle: ex === 'squat' ? Math.max(0, -y * 1.5) : 0, armExtension: ex === 'punch' ? (mag > 1 ? 1 : 0) : 0, shoulderRotation: ex === 'punch' ? Math.min(1, x * 0.2) : 0, hipDrop: ex === 'squat' ? Math.max(0, -y * 1.2) : 0, intensity: mag > 0.5 ? 0.8 : 0.2 },
      });
    }, 50);
    return () => clearInterval(iv);
  }, [phase, exercise]);

  const stopSensors = () => { if (accelSubRef.current) { accelSubRef.current.remove(); accelSubRef.current = null; } if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } lastRepRef.current = 0; };

  const handleStop = async () => {
    stopSensors();
    const dur = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const reps = motionState?.reps || 0, qual = motionState?.quality || 50, peak = motionState?.peakAcceleration || 0, avg = motionState?.avgAmplitude || 0;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (token && sessionId) {
        const r = await api.completeNexusSession(sessionId, { exercise_type: exercise, reps_completed: reps, quality_score: qual, duration_seconds: dur, peak_acceleration: peak, avg_amplitude: avg }, token);
        setScanResult(r); if (r.user) updateUser(r.user); if (r.records_broken?.length > 0) playRecordBroken(); else playAcceptPing();
      } else {
        setScanResult({ exercise_type: exercise, reps_completed: reps, quality_score: qual, base_xp: reps * 5, quality_multiplier: 1 + (qual / 100) * 2, gold_bonus: qual >= 80 ? reps * 2 : 0, time_bonus: Math.min(Math.floor(dur / 10), 20), xp_earned: reps * 8 + 10, records_broken: [], level_up: false, new_level: user?.level || 1, dna: user?.dna });
        playAcceptPing();
      }
    } catch (_) {
      setScanResult({ reps_completed: reps, quality_score: qual, xp_earned: reps * 5, base_xp: reps * 5, quality_multiplier: 1, gold_bonus: 0, time_bonus: 0, records_broken: [], level_up: false, new_level: user?.level || 1 });
    }
    setPhase('results');
  };

  const handleResultClose = () => { setPhase('console'); setScanResult(null); setSessionId(null); setMotionState(null); setTimer(0); setMotionActive(false); };
  useEffect(() => () => { stopSensors(); }, []);
  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (phase === 'console') {
    return <NexusConsole user={user} onScan={() => setPhase('bioscan')} onForge={() => setPhase('forge')} deviceTier={deviceTier} eligibility={eligibility} />;
  }

  if (phase === 'forge') {
    return (
      <View style={main$.container}>
        <CyberGrid intensity={0.2} />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center' }}>
          <ChallengeForge onSelect={handleForgeSelect} user={user} />
          <TouchableOpacity onPress={() => setPhase('console')} style={main$.cancelWrap}><Text style={main$.cancelText}>{'\u2190'} TORNA AL NEXUS</Text></TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // Scanning / Countdown / BioScan / Results
  const skeleton: SkeletonPose = motionState?.skeletonPose || { torsoTilt: 0, kneeAngle: 0, armExtension: 0, shoulderRotation: 0, hipDrop: 0, intensity: 0.15 };

  return (
    <View style={main$.container}>
      <StatusBar barStyle="light-content" />
      {/* SPRINT 5: Camera-transparent dark overlay at 0.3 opacity */}
      <View style={main$.cameraOverlay} />
      <CyberGrid intensity={motionActive ? 0.5 : 0.2} scanning={phase === 'scanning'} />
      <DigitalShadow pose={skeleton} exercise={exercise} goldFlash={goldFlash} motionActive={motionActive} deviceTier={deviceTier} />
      <ScanLine active={phase === 'scanning'} />
      {phase === 'scanning' && <MiniDNARadar dna={user?.dna} explosive={motionActive} />}
      {phase === 'bioscan' && <BioScanTrigger user={user} onComplete={async () => {
        setPhase('forge');
        // SPRINT 7: Record bioscan snapshot + check PRO unlock
        if (token) {
          const prevPro = user?.pro_unlocked;
          try {
            const result = await api.completeBioscan(token);
            if (result.user) updateUser(result.user);
            if (result.pro_newly_unlocked || (result.pro_unlocked && !prevPro)) {
              setBioscanResult(result);
              setShowProUnlock(true);
            }
            // Refresh eligibility
            const elig = await api.getRescanEligibility(token);
            setEligibility(elig);
          } catch (_) { /* silenced — user goes to forge regardless */ }
        }
      }} />}
      {phase === 'countdown' && <Countdown onComplete={handleCountdownDone} />}

      {/* SPRINT 5: Military/Tech HUD — Corner Layout */}
      {phase === 'scanning' && (
        <SafeAreaView style={hud$.container}>
          <View nativeID="nexus-cam" />

          {/* TOP-LEFT: Timer */}
          <View style={hud$.topLeft}>
            <Text style={hud$.cornerLabel}>ELAPSED</Text>
            <Text style={hud$.timerVal}>{fmt(timer)}</Text>
            <View style={hud$.timerBar}>
              <View style={[hud$.timerBarFill, { width: `${Math.min(100, (timer / 120) * 100)}%` as any }]} />
            </View>
          </View>

          {/* TOP-RIGHT: Exercise & Mode */}
          <View style={hud$.topRight}>
            <Text style={hud$.cornerLabel}>PROTOCOL</Text>
            <Text style={hud$.exerciseVal}>{exercise === 'squat' ? 'DEEP SQUAT' : 'EXPLOSIVE PUNCH'}</Text>
            <View style={hud$.modeBadge}>
              <Ionicons name={forgeMode === 'personal' ? 'analytics' : forgeMode === 'battle' ? 'trophy' : 'flash'} size={10} color="#D4AF37" />
              <Text style={hud$.modeText}>{forgeMode.toUpperCase()}</Text>
            </View>
          </View>

          {/* CENTER: Last Rep Feedback */}
          <View style={hud$.centerFeedback}>
            {motionState?.lastRepQuality ? (
              <Animated.View entering={FadeInDown.duration(200)} key={motionState.reps} style={hud$.repFeedback}>
                <View style={[hud$.repFeedbackDot, motionState.lastRepQuality >= 80 && { backgroundColor: '#D4AF37' }]} />
                <Text style={[hud$.repFeedbackText, motionState.lastRepQuality >= 80 && { color: '#D4AF37' }]}>
                  REP #{motionState.reps} {'\u2014'} Q{motionState.lastRepQuality}
                </Text>
              </Animated.View>
            ) : (
              <View style={hud$.phaseIndicator}>
                <View style={[hud$.phaseDot, motionActive && { backgroundColor: '#00F2FF' }]} />
                <Text style={[hud$.phaseText, motionActive && { color: '#00F2FF' }]}>
                  {motionActive ? 'TRACKING ACTIVE' : 'AWAITING MOTION'}
                </Text>
              </View>
            )}
          </View>

          {/* BOTTOM-LEFT: Reps Counter */}
          <View style={hud$.bottomLeft}>
            <Text style={hud$.cornerLabel}>REPS</Text>
            <Text style={hud$.repsVal}>{motionState?.reps || 0}</Text>
            <Text style={hud$.repsUnit}>COMPLETED</Text>
          </View>

          {/* BOTTOM-RIGHT: Quality Score */}
          <View style={hud$.bottomRight}>
            <Text style={hud$.cornerLabel}>QUALITY</Text>
            <Text style={[hud$.qualityVal, (motionState?.quality || 0) >= 80 && { color: '#D4AF37' }]}>{motionState?.quality || 0}</Text>
            <Text style={hud$.qualityUnit}>AVG SCORE</Text>
          </View>

          {/* BOTTOM-CENTER: Stop Button */}
          <View style={hud$.stopWrap}>
            <TouchableOpacity style={hud$.stopBtn} onPress={handleStop} activeOpacity={0.85}>
              <View style={hud$.stopDot} />
              <Text style={hud$.stopText}>STOP SESSION</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      <CinemaResults visible={phase === 'results'} result={scanResult} user={user} onClose={handleResultClose} />
      <ProUnlockModal
        visible={showProUnlock}
        onClose={() => setShowProUnlock(false)}
        avgDna={bioscanResult?.avg_dna}
      />
      <BurgerMenu visible={showMenu} onClose={() => setShowMenu(false)} user={user} onLogout={logout} deviceTier={deviceTier} activeRole={activeRole} onRoleSwitch={setActiveRole} />
    </View>
  );
}

const main$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,5,0.3)',
    zIndex: 1,
  },
  cancelWrap: { alignItems: 'center', marginTop: 20 },
  cancelText: { color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});

// SPRINT 5: Military/Tech Corner HUD
const hud$ = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  // TOP-LEFT: Timer
  topLeft: {
    position: 'absolute', top: 56, left: 14,
    gap: 3,
  },
  cornerLabel: {
    color: 'rgba(0,242,255,0.5)', fontSize: 8, fontWeight: '900',
    letterSpacing: 3,
  },
  timerVal: {
    color: '#00F2FF', fontSize: 28, fontWeight: '900',
    fontVariant: ['tabular-nums'], letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  timerBar: {
    width: 80, height: 2, backgroundColor: 'rgba(0,242,255,0.15)',
    borderRadius: 1, overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%', backgroundColor: '#00F2FF', borderRadius: 1,
  },
  // TOP-RIGHT: Exercise & Mode
  topRight: {
    position: 'absolute', top: 56, right: 14,
    alignItems: 'flex-end', gap: 3,
  },
  exerciseVal: {
    color: '#FFFFFF', fontSize: 12, fontWeight: '900',
    letterSpacing: 2,
  },
  modeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)',
  },
  modeText: {
    color: '#D4AF37', fontSize: 8, fontWeight: '900', letterSpacing: 1.5,
  },
  // CENTER: Rep Feedback
  centerFeedback: {
    position: 'absolute', top: '45%' as any, left: 0, right: 0,
    alignItems: 'center',
  },
  repFeedback: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.2)',
  },
  repFeedbackDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#00F2FF',
  },
  repFeedbackText: {
    color: '#00F2FF', fontSize: 12, fontWeight: '800', letterSpacing: 2,
  },
  phaseIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  phaseDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  phaseText: {
    color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800', letterSpacing: 2,
  },
  // BOTTOM-LEFT: Reps
  bottomLeft: {
    position: 'absolute', bottom: 160, left: 14,
    gap: 2,
  },
  repsVal: {
    color: '#00F2FF', fontSize: 48, fontWeight: '900',
    fontVariant: ['tabular-nums'], letterSpacing: 1,
    lineHeight: 50,
  },
  repsUnit: {
    color: 'rgba(0,242,255,0.35)', fontSize: 7, fontWeight: '900', letterSpacing: 2,
  },
  // BOTTOM-RIGHT: Quality
  bottomRight: {
    position: 'absolute', bottom: 160, right: 14,
    alignItems: 'flex-end', gap: 2,
  },
  qualityVal: {
    color: '#00F2FF', fontSize: 48, fontWeight: '900',
    fontVariant: ['tabular-nums'], letterSpacing: 1,
    lineHeight: 50,
  },
  qualityUnit: {
    color: 'rgba(0,242,255,0.35)', fontSize: 7, fontWeight: '900', letterSpacing: 2,
  },
  // BOTTOM: Stop Button
  stopWrap: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
  },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(255,59,48,0.12)', borderRadius: 14, paddingVertical: 18,
    borderWidth: 1.5, borderColor: 'rgba(255,59,48,0.35)',
  },
  stopDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF453A',
  },
  stopText: {
    color: '#FF453A', fontSize: 14, fontWeight: '900', letterSpacing: 3,
  },
});
