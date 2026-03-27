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
  FadeIn, FadeInDown, SlideInRight, SlideOutRight,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Circle, Text as SvgText, G, Polygon } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { playAcceptPing, playRecordBroken, startBioScanHum, playBioMatchPing } from '../../utils/sounds';
import { MotionAnalyzer, MotionState, ExerciseType, SkeletonPose } from '../../utils/MotionAnalyzer';
import { profileDevice, DeviceProfile, DeviceTier, getTierLabel, getTrackingMode } from '../../utils/DeviceIntelligence';

const { width: SW, height: SH } = Dimensions.get('window');

// Nike-style dramatic athlete images
const FORGE_IMAGES = {
  personal: 'https://images.unsplash.com/photo-1710736460914-4a7f22d736c4?w=800&q=60',
  battle: 'https://images.unsplash.com/photo-1709315957145-a4bad1feef28?w=800&q=60',
  duel: 'https://images.pexels.com/photos/1075935/pexels-photo-1075935.jpeg?w=800&q=60',
};

// Console button dramatic images
const CONSOLE_IMAGES = {
  scan: 'https://images.unsplash.com/photo-1710736460914-4a7f22d736c4?w=800&q=60',
  forge: 'https://images.unsplash.com/photo-1698788067684-2053c651bfed?w=800&q=60',
  hall: 'https://images.unsplash.com/photo-1590285372176-c3ff4d8c9399?w=800&q=60',
  dna: 'https://images.pexels.com/photos/7479526/pexels-photo-7479526.jpeg?w=800&q=60',
};

// ========== CYBER GRID (subtle holographic) ==========
function CyberGrid({ intensity }: { intensity: number }) {
  const G = 45;
  const cols = Math.ceil(SW / G) + 1;
  const rows = Math.ceil(SH / G) + 1;
  const op = 0.08 + intensity * 0.15;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={SW} height={SH}>
        {Array.from({ length: cols }).map((_, i) => (
          <Line key={`v${i}`} x1={i * G} y1={0} x2={i * G} y2={SH} stroke="#00F2FF" strokeWidth={0.3} opacity={op * 0.6} />
        ))}
        {Array.from({ length: rows }).map((_, i) => (
          <Line key={`h${i}`} x1={0} y1={i * G} x2={SW} y2={i * G} stroke="#00F2FF" strokeWidth={0.3} opacity={op * 0.6} />
        ))}
        <Circle cx={SW / 2} cy={SH * 0.4} r={55} stroke="#00F2FF" strokeWidth={1} fill="none" opacity={op} />
        <Circle cx={SW / 2} cy={SH * 0.4} r={85} stroke="#00F2FF" strokeWidth={0.6} fill="none" opacity={op * 0.5} strokeDasharray="6,5" />
        <SvgText x={20} y={68} fill="#00F2FF" fontSize={8} fontWeight="bold" opacity={0.4}>ARENAKORE v2.1</SvgText>
        <SvgText x={SW - 110} y={68} fill="#00F2FF" fontSize={8} fontWeight="bold" opacity={0.4}>NEXUS SYNC</SvgText>
      </Svg>
    </View>
  );
}

// ========== NEON TRAIL SYSTEM (HIGH TIER ONLY) ==========
// Stores recent positions of fists/feet for luminous afterglow trail
const NEON_TRAIL_LENGTH = 8;
let _neonTrail: Array<{ x: number; y: number; age: number }> = [];
function pushNeonTrail(x: number, y: number) {
  _neonTrail.unshift({ x, y, age: 0 });
  _neonTrail = _neonTrail.slice(0, NEON_TRAIL_LENGTH).map(p => ({ ...p, age: p.age + 1 }));
}

// ========== DIGITAL SHADOW SKELETON ==========
// Tier-adaptive: HIGH=Full Biomech, STANDARD=Motion Anchored, LEGACY=Shadow Mode
function DigitalShadow({ pose, exercise, goldFlash, motionActive, deviceTier }: {
  pose: SkeletonPose; exercise: ExerciseType; goldFlash: boolean; motionActive: boolean; deviceTier: DeviceTier;
}) {
  const cx = SW / 2, baseY = SH * 0.38;
  const isHigh = deviceTier === 'high';
  const isLegacy = deviceTier === 'legacy';
  const active = motionActive ? 1 : 0;
  const intensity = motionActive ? (0.4 + pose.intensity * 0.6) : (isLegacy ? 0.08 : 0.15);
  const col = goldFlash ? '#D4AF37' : '#00F2FF';

  // Idle vs active poses
  const tilt = pose.torsoTilt * active;
  const knee = pose.kneeAngle * active;
  const arm = exercise === 'punch' ? pose.armExtension * active : 0;
  const hip = pose.hipDrop * active;
  const sr = exercise === 'punch' ? pose.shoulderRotation * active * 10 : 0;
  const armExt = exercise === 'punch' ? arm * 50 : 15 * active;

  const headY = baseY - 48 + tilt * 5;
  const shoulderY = baseY - 18 + tilt * 8;
  const hipY = baseY + 32 + hip * 15;
  const kneeY = hipY + 38 + knee * 15;
  const footY = kneeY + 32;
  const armY = shoulderY + (exercise === 'punch' ? 5 : 15);

  const joints = [
    { x: cx, y: headY },                              // 0: head
    { x: cx, y: shoulderY },                           // 1: neck
    { x: cx - 25 - sr, y: shoulderY },                 // 2: L shoulder
    { x: cx + 25 + sr, y: shoulderY },                 // 3: R shoulder
    { x: cx - 30 - armExt, y: armY },                  // 4: L elbow
    { x: cx + 30 + armExt, y: armY },                  // 5: R elbow
    { x: cx - 35 - armExt * 1.2, y: armY + 16 },      // 6: L wrist
    { x: cx + 35 + armExt * 1.2, y: armY + 16 },      // 7: R wrist
    { x: cx, y: hipY },                                // 8: spine base
    { x: cx - 16, y: hipY },                           // 9: L hip
    { x: cx + 16, y: hipY },                           // 10: R hip
    { x: cx - 20, y: kneeY },                          // 11: L knee
    { x: cx + 20, y: kneeY },                          // 12: R knee
    { x: cx - 22, y: footY },                          // 13: L ankle
    { x: cx + 22, y: footY },                          // 14: R ankle
    { x: cx - 40 - armExt * 1.3, y: armY + 26 },      // 15: L hand
    { x: cx + 40 + armExt * 1.3, y: armY + 26 },      // 16: R hand
  ];

  const bones = [[0,1],[1,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,15],[7,16],[1,8],[8,9],[8,10],[9,11],[10,12],[11,13],[12,14]];

  // HIGH tier: Track hand positions for Neon Trail
  if (isHigh && motionActive && exercise === 'punch') {
    pushNeonTrail(joints[15].x, joints[15].y);
    pushNeonTrail(joints[16].x, joints[16].y);
  } else if (!motionActive) {
    _neonTrail = [];
  }

  // LEGACY tier: Render simplified skeleton (only major bones, no glow)
  const legacyBones = [[0,1],[1,8],[2,6],[3,7],[9,13],[10,14]]; // Simplified 6-bone skeleton
  const renderBones = isLegacy ? legacyBones : bones;
  const renderJoints = isLegacy
    ? [joints[0], joints[1], joints[6], joints[7], joints[8], joints[13], joints[14]] // 7 key joints
    : joints;
  const boneWidth = isHigh ? (motionActive ? 3.5 : 2.5) : (isLegacy ? 1.5 : (motionActive ? 3 : 2));
  const jointBase = isHigh ? 6 : (isLegacy ? 3 : 5);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={SW} height={SH}>
        {/* HIGH TIER: Neon Trail — glowing afterimages of fists */}
        {isHigh && _neonTrail.map((p, i) => (
          <Circle key={`trail-${i}`} cx={p.x} cy={p.y}
            r={14 - p.age * 1.2}
            fill={goldFlash ? '#D4AF37' : '#00F2FF'}
            opacity={Math.max(0, 0.4 - p.age * 0.05)}
          />
        ))}

        {/* HIGH TIER: Biomechanical spine glow line */}
        {isHigh && (
          <Line x1={joints[0].x} y1={joints[0].y} x2={joints[8].x} y2={joints[8].y}
            stroke={col} strokeWidth={1} opacity={intensity * 0.15} strokeDasharray="4,4"
          />
        )}

        {/* Head glow — scaled by tier */}
        {!isLegacy && (
          <Circle cx={joints[0].x} cy={joints[0].y} r={isHigh ? 28 : 24} fill={col} opacity={intensity * (isHigh ? 0.15 : 0.12)} />
        )}

        {/* Bones */}
        {renderBones.map(([f, t], i) => (
          <Line key={i}
            x1={joints[f].x} y1={joints[f].y} x2={joints[t].x} y2={joints[t].y}
            stroke={col} strokeWidth={boneWidth} opacity={intensity}
            strokeLinecap="round"
          />
        ))}

        {/* Joints */}
        {(isLegacy ? renderJoints : joints).map((j, i) => (
          <G key={i}>
            <Circle cx={j.x} cy={j.y}
              r={(!isLegacy && i === 0) ? 12 : jointBase}
              fill={col} opacity={intensity * 0.9}
            />
            {/* HIGH TIER: Outer glow rings on all joints when active */}
            {isHigh && motionActive && (
              <Circle cx={j.x} cy={j.y}
                r={(!isLegacy && i === 0) ? 18 : 10}
                stroke={col} strokeWidth={1.5} fill="none"
                opacity={intensity * 0.25}
              />
            )}
            {/* STANDARD TIER: Subtle glow rings only when active */}
            {!isHigh && !isLegacy && motionActive && (
              <Circle cx={j.x} cy={j.y}
                r={i === 0 ? 16 : 8}
                stroke={col} strokeWidth={1} fill="none"
                opacity={intensity * 0.3}
              />
            )}
          </G>
        ))}

        {/* HIGH TIER: Neon Trail glow haze for punches */}
        {isHigh && motionActive && exercise === 'punch' && (
          <>
            <Circle cx={joints[15].x} cy={joints[15].y} r={20}
              fill={col} opacity={intensity * 0.2} />
            <Circle cx={joints[16].x} cy={joints[16].y} r={20}
              fill={col} opacity={intensity * 0.2} />
          </>
        )}

        {/* Status text with tier indicator */}
        <SvgText x={cx - 80} y={baseY - 130} fill={col} fontSize={8} fontWeight="bold" opacity={0.5}>
          {motionActive
            ? (goldFlash ? `${getTierLabel(deviceTier)} \u00b7 GOLD FLASH` : `${getTrackingMode(deviceTier)}`)
            : `${getTierLabel(deviceTier)} \u00b7 AWAITING MOTION`}
        </SvgText>
      </Svg>
    </View>
  );
}

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
            {isFounder && <Text style={bio$.founderGlow}>{'\u2605'} FOUNDER #{user?.founder_number || '?'}</Text>}
          </>
        )}
      </View>
      {/* Corner brackets */}
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
  bioLabel: { color: '#555', fontSize: 8, fontWeight: '700', letterSpacing: 2 },
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

// ========== NEXUS CONSOLE — Cinematic Central Hub ==========
function NexusConsole({ user, onScan, onForge, deviceTier }: {
  user: any; onScan: () => void; onForge: () => void; deviceTier: DeviceTier;
}) {
  const router = useRouter();
  const isFounder = user?.is_founder || user?.is_admin;
  const founderShimmer = useSharedValue(0.7);

  useEffect(() => {
    founderShimmer.value = withRepeat(
      withSequence(withTiming(1, { duration: 1500 }), withTiming(0.7, { duration: 1500 })), -1, false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({ opacity: founderShimmer.value }));

  const buttons = [
    { key: 'scan', icon: '\ud83e\uddec', title: 'NEXUS SCAN', sub: 'BIO-SKELETON TRACKING', image: CONSOLE_IMAGES.scan, action: onScan },
    { key: 'forge', icon: '\ud83d\udee0\ufe0f', title: 'THE FORGE', sub: 'CREA \u00b7 SELEZIONA \u00b7 SFIDA', image: CONSOLE_IMAGES.forge, action: onForge },
    { key: 'hall', icon: '\ud83c\udfc6', title: 'HALL OF KORE', sub: 'LEADERBOARD GLOBALE', image: CONSOLE_IMAGES.hall, action: () => router.push('/(tabs)/hall') },
    { key: 'dna', icon: '\ud83d\udcca', title: 'MY DNA', sub: 'STATS RADAR BIOMETRICO', image: CONSOLE_IMAGES.dna, action: () => router.push('/(tabs)/dna') },
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
              <Text style={cn$.founderText}>{'\u2605'} FOUNDER</Text>
            </Animated.View>
          )}
          <View style={cn$.tierRow}>
            <View style={cn$.tierDot} />
            <Text style={cn$.tierText}>{getTierLabel(deviceTier)} ACTIVE</Text>
          </View>
        </View>
        <ScrollView style={cn$.scroll} contentContainerStyle={cn$.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={cn$.grid}>
            {buttons.map((btn) => (
              <TouchableOpacity key={btn.key} style={cn$.card} activeOpacity={0.85} onPress={btn.action}>
                <ImageBackground source={{ uri: btn.image }} style={cn$.cardBg} imageStyle={cn$.cardImage}>
                  <LinearGradient colors={['rgba(5,5,5,0.15)', 'rgba(5,5,5,0.6)', 'rgba(5,5,5,0.97)']} locations={[0, 0.35, 0.85]} style={cn$.cardGradient}>
                    <Text style={cn$.cardIcon}>{btn.icon}</Text>
                    <View style={cn$.cardBottom}>
                      <Text style={cn$.cardTitle}>{btn.title}</Text>
                      <Text style={cn$.cardSub}>{btn.sub}</Text>
                    </View>
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
  brandLabel: { color: '#333', fontSize: 9, fontWeight: '800', letterSpacing: 4 },
  title: { color: '#D4AF37', fontSize: 32, fontWeight: '900', letterSpacing: 8 },
  subtitle: { color: '#00F2FF', fontSize: 11, fontWeight: '700', letterSpacing: 4, opacity: 0.7 },
  founderBadge: {
    marginTop: 6, paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.08)',
  },
  founderText: { color: '#D4AF37', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  tierDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00F2FF' },
  tierText: { color: '#00F2FF', fontSize: 8, fontWeight: '800', letterSpacing: 2, opacity: 0.6 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 10 },
  card: {
    width: (SW - 44) / 2, height: (SW - 44) / 2 * 1.15, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.08)',
  },
  cardBg: { flex: 1 },
  cardImage: { borderRadius: 16 },
  cardGradient: { flex: 1, justifyContent: 'space-between', padding: 16 },
  cardIcon: { fontSize: 32 },
  cardBottom: { gap: 4 },
  cardTitle: { color: '#D4AF37', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  cardSub: { color: '#00F2FF', fontSize: 8, fontWeight: '700', letterSpacing: 1.5, opacity: 0.7 },
});


// ========== CHALLENGE FORGE — Nike Style ==========
type ForgeMode = 'personal' | 'battle' | 'duel';

function ForgeCard({ mode, title, subtitle, image, iconEl, onPress }: {
  mode: string; title: string; subtitle: string; image: string; iconEl: React.ReactNode; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={fg$.card} onPress={onPress} activeOpacity={0.85}>
      <ImageBackground source={{ uri: image }} style={fg$.imageBg} imageStyle={fg$.imageStyle}>
        <LinearGradient
          colors={['rgba(5,5,5,0.1)', 'rgba(5,5,5,0.55)', 'rgba(5,5,5,0.95)']}
          locations={[0, 0.3, 0.78]}
          style={fg$.gradient}
        >
          <View style={fg$.cardTop}>{iconEl}</View>
          <View style={fg$.cardBottom}>
            <Text style={fg$.cardTitle}>{title}</Text>
            <Text style={fg$.cardSub}>{subtitle}</Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}

function ChallengeForge({ onSelect, user }: { onSelect: (mode: ForgeMode, exercise: ExerciseType) => void; user: any }) {
  const [mode, setMode] = useState<ForgeMode | null>(null);
  const [showTemplateCreator, setShowTemplateCreator] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateExercise, setTemplateExercise] = useState<ExerciseType>('squat');
  const [templateDuration, setTemplateDuration] = useState('60');
  const [templateReps, setTemplateReps] = useState('10');
  const isAdmin = user?.is_admin || user?.role === 'coach';
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
            <Text style={fg$.exIcon}>{'\ud83c\udfcb\ufe0f'}</Text>
            <Text style={fg$.exName}>DEEP SQUAT</Text>
            <Text style={fg$.exDesc}>Forza {'\u00b7'} Potenza</Text>
          </TouchableOpacity>
          <TouchableOpacity style={fg$.exCard} onPress={() => onSelect(mode, 'punch')} activeOpacity={0.8}>
            <Text style={fg$.exIcon}>{'\ud83e\udd4a'}</Text>
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
        <ForgeCard mode="personal" title="PERSONAL TRAINING" subtitle={"Focus DNA \u00b7 Migliora le tue stats atletiche"}
          image={FORGE_IMAGES.personal} onPress={() => setMode('personal')}
          iconEl={<Animated.View style={dnaS}><Text style={fg$.forgeIcon}>{'\ud83e\uddec'}</Text></Animated.View>}
        />
        <ForgeCard mode="battle" title="POINTS BATTLE" subtitle={"Hall of Kore \u00b7 XP massimo per scalare il Rank"}
          image={FORGE_IMAGES.battle} onPress={() => setMode('battle')}
          iconEl={<View style={fg$.iconRow}><Text style={fg$.forgeIcon}>{'\ud83c\udfc6'}</Text><Animated.View style={flameS}><Text style={fg$.flameSmall}>{'\ud83d\udd25'}</Text></Animated.View></View>}
        />
        <ForgeCard mode="duel" title="LIVE DUEL" subtitle={"Tempo reale \u00b7 Sfida un avversario"}
          image={FORGE_IMAGES.duel} onPress={() => setMode('duel')}
          iconEl={<Animated.View style={boltS}><Text style={fg$.forgeIcon}>{'\u26a1\u26a1'}</Text></Animated.View>}
        />
      </View>
      {/* GESTIONE TEMPLATE — Admin/Coach Premium only */}
      {isAdmin && (
        <View style={fg$.templateSection}>
          <View style={fg$.templateDivider} />
          <Text style={fg$.templateHeader}>GESTIONE TEMPLATE</Text>
          <TouchableOpacity style={fg$.createTemplateBtn} onPress={() => setShowTemplateCreator(true)} activeOpacity={0.8}>
            <Text style={fg$.createTemplatePlus}>+</Text>
            <Text style={fg$.createTemplateText}>CREA NUOVO TEMPLATE SFIDA</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Template Creator Modal */}
      <Modal visible={showTemplateCreator} transparent animationType="slide">
        <View style={fg$.modalOverlay}>
          <View style={fg$.modalContent}>
            <Text style={fg$.modalTitle}>{'\ud83d\udee0\ufe0f'} CREA TEMPLATE</Text>
            <Text style={fg$.modalLabel}>NOME TEMPLATE</Text>
            <TextInput style={fg$.modalInput} value={templateName} onChangeText={setTemplateName} placeholder="Es: Sprint Finale" placeholderTextColor="#555" />
            <Text style={fg$.modalLabel}>ESERCIZIO</Text>
            <View style={fg$.modalRow}>
              <TouchableOpacity style={[fg$.modalChoice, templateExercise === 'squat' && fg$.modalChoiceActive]} onPress={() => setTemplateExercise('squat')}>
                <Text style={fg$.modalChoiceText}>{'\ud83c\udfcb\ufe0f'} SQUAT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[fg$.modalChoice, templateExercise === 'punch' && fg$.modalChoiceActive]} onPress={() => setTemplateExercise('punch')}>
                <Text style={fg$.modalChoiceText}>{'\ud83e\udd4a'} PUNCH</Text>
              </TouchableOpacity>
            </View>
            <Text style={fg$.modalLabel}>TEMPO (SEC)</Text>
            <TextInput style={fg$.modalInput} value={templateDuration} onChangeText={setTemplateDuration} keyboardType="numeric" placeholderTextColor="#555" />
            <Text style={fg$.modalLabel}>REPS TARGET</Text>
            <TextInput style={fg$.modalInput} value={templateReps} onChangeText={setTemplateReps} keyboardType="numeric" placeholderTextColor="#555" />
            <TouchableOpacity style={fg$.saveBtn} onPress={() => { setShowTemplateCreator(false); setTemplateName(''); }} activeOpacity={0.8}>
              <Text style={fg$.saveBtnText}>SALVA TEMPLATE</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowTemplateCreator(false)} style={fg$.cancelBtn}>
              <Text style={fg$.cancelText}>ANNULLA</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const fg$ = StyleSheet.create({
  container: { alignItems: 'center', gap: 12, paddingHorizontal: 16, width: '100%' },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 5 },
  sub: { color: '#666', fontSize: 11, marginBottom: 4 },
  cardsCol: { width: '100%', gap: 10 },
  card: { width: '100%', height: 130, borderRadius: 16, overflow: 'hidden' },
  imageBg: { width: '100%', height: '100%' },
  imageStyle: { borderRadius: 16, opacity: 0.7 },
  gradient: { flex: 1, justifyContent: 'space-between', padding: 16 },
  cardTop: { alignSelf: 'flex-start' },
  cardBottom: { gap: 2 },
  cardTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  cardSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  forgeIcon: { fontSize: 24 },
  flameSmall: { fontSize: 14, marginLeft: -4, marginTop: -6 },
  iconRow: { flexDirection: 'row', alignItems: 'flex-start' },
  // Exercise select
  selectWrap: { alignItems: 'center', gap: 14, paddingHorizontal: 20, width: '100%' },
  selectTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 4 },
  selectSub: { color: '#666', fontSize: 11, textAlign: 'center' },
  exRow: { flexDirection: 'row', gap: 12, width: '100%' },
  exCard: {
    flex: 1, alignItems: 'center', gap: 8, paddingVertical: 28,
    backgroundColor: 'rgba(0,242,255,0.03)', borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.12)',
  },
  exIcon: { fontSize: 36 },
  exName: { color: '#00F2FF', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  exDesc: { color: '#555', fontSize: 9 },
  backBtn: { marginTop: 8 },
  backText: { color: '#555', fontSize: 11, fontWeight: '700' },
  // Template Management
  templateSection: { width: '100%', paddingHorizontal: 0, marginTop: 12 },
  templateDivider: { height: 1, backgroundColor: 'rgba(212,175,55,0.1)', marginBottom: 12 },
  templateHeader: { color: '#D4AF37', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 10, textAlign: 'center' },
  createTemplateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.25)',
    borderStyle: 'dashed' as any, backgroundColor: 'rgba(212,175,55,0.04)',
  },
  createTemplatePlus: { color: '#D4AF37', fontSize: 22, fontWeight: '300' },
  createTemplateText: { color: '#D4AF37', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  // Template Creator Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', backgroundColor: '#0A0A0A', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(212,175,55,0.15)', gap: 12 },
  modalTitle: { color: '#D4AF37', fontSize: 18, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
  modalLabel: { color: '#00F2FF', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginTop: 4 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, color: '#FFF', fontSize: 14, fontWeight: '700', borderWidth: 1, borderColor: 'rgba(0,242,255,0.1)' },
  modalRow: { flexDirection: 'row', gap: 10 },
  modalChoice: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' },
  modalChoiceActive: { borderColor: '#00F2FF', backgroundColor: 'rgba(0,242,255,0.08)' },
  modalChoiceText: { color: '#FFF', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  saveBtn: { backgroundColor: '#D4AF37', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#050505', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  cancelBtn: { paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
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

// ========== PULSE TICKER (tier-aware: disabilita animazione su LEGACY) ==========
function PulseTicker({ reduced }: { reduced?: boolean }) {
  const scrollX = useSharedValue(0);
  const TXT = '[LIVE FEED] LONDON: ALEX_K COMPLETED EXPLOSIVE PUNCH (98Q) \u2022 CHICAGO: MAYA_J JOINED CREW BULLS \u2022 TOKYO: NEW WORLD RECORD IN HALL OF KORE \u2022 BERLIN: 3 NEW FOUNDERS REGISTERED \u2022 MIAMI: CREW SHARKS VS WOLVES (LIVE DUEL) \u2022 ';
  useEffect(() => {
    if (!reduced) {
      scrollX.value = withRepeat(withTiming(-SW * 3, { duration: 25000, easing: Easing.linear }), -1, false);
    }
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: scrollX.value }] }));
  if (reduced) {
    return (
      <View style={{ height: 22, overflow: 'hidden', borderTopWidth: 1, borderTopColor: 'rgba(0,242,255,0.06)', justifyContent: 'center' }}>
        <Text numberOfLines={1} style={{ color: '#00F2FF', fontSize: 9, fontWeight: '600', letterSpacing: 0.5, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', opacity: 0.5, paddingHorizontal: 8 }}>[LIVE FEED] LONDON: ALEX_K PUNCH (98Q) {'\u2022'} TOKYO: WORLD RECORD</Text>
      </View>
    );
  }
  return (
    <View style={{ height: 22, overflow: 'hidden', borderTopWidth: 1, borderTopColor: 'rgba(0,242,255,0.06)', justifyContent: 'center' }}>
      <Animated.View style={[{ flexDirection: 'row', width: SW * 6 }, s]}>
        <Text style={{ color: '#00F2FF', fontSize: 9, fontWeight: '600', letterSpacing: 0.5, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', opacity: 0.7 }}>{TXT}{TXT}</Text>
      </Animated.View>
    </View>
  );
}

// ========== BURGER MENU with GLASS + FOUNDER PRIDE (tier-aware) ==========
function BurgerMenu({ visible, onClose, user, onLogout, deviceTier }: { visible: boolean; onClose: () => void; user: any; onLogout: () => void; deviceTier: DeviceTier }) {
  if (!visible) return null;
  const isFounder = user?.is_founder || user?.is_admin;
  const isLegacy = deviceTier === 'legacy';
  const items = [
    { icon: '\ud83e\uddec', label: 'Bio-Signature Scan', sub: 'Ricalibra i sensori' },
    { icon: '\u2699\ufe0f', label: 'Settings', sub: 'Configurazione NEXUS' },
    { icon: '\ud83c\udfc6', label: 'Founders Club', sub: isFounder ? `Founder #${user?.founder_number || '?'}` : 'Non ancora membro' },
    { icon: '\ud83d\udcac', label: 'Supporto', sub: 'Contatta il team KORE' },
  ];
  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={bm$.backdrop} activeOpacity={1} onPress={onClose}>
        {/* LEGACY: simple dark overlay. HIGH/STANDARD: blur effect */}
        <View style={isLegacy ? bm$.blurLayerLegacy : bm$.blurLayer} />
        <Animated.View entering={SlideInRight.duration(250)} exiting={SlideOutRight.duration(200)} style={bm$.panel}>
          <LinearGradient colors={['rgba(8,8,8,0.97)', 'rgba(5,5,5,0.99)']} style={bm$.panelInner}>
            <View style={bm$.header}>
              <Text style={bm$.headerTitle}>CONTROL CENTER</Text>
              <TouchableOpacity onPress={onClose}><Text style={bm$.closeX}>{'\u2715'}</Text></TouchableOpacity>
            </View>
            {/* Device Tier Badge */}
            <View style={bm$.tierBadge}>
              <Text style={bm$.tierLabel}>{getTierLabel(deviceTier)}</Text>
              <Text style={bm$.tierSub}>{getTrackingMode(deviceTier)}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {items.map((item, i) => (
                <TouchableOpacity key={i} style={bm$.item} activeOpacity={0.7}>
                  <Text style={bm$.itemIcon}>{item.icon}</Text>
                  <View style={bm$.itemText}><Text style={bm$.itemLabel}>{item.label}</Text><Text style={bm$.itemSub}>{item.sub}</Text></View>
                </TouchableOpacity>
              ))}
              {isFounder && (
                <View style={bm$.founderPride}>
                  <Text style={bm$.founderStar}>{'\u2605'}</Text>
                  <Text style={bm$.founderQuote}>You are one of the first 100 to enter the Kore. Your legacy is permanent.</Text>
                </View>
              )}
              {/* LOGOUT — Red opaque */}
              <TouchableOpacity style={bm$.logoutBtn} activeOpacity={0.7} onPress={onLogout}>
                <Text style={bm$.logoutIcon}>{'\ud83d\udeaa'}</Text>
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
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(18px) saturate(120%)', WebkitBackdropFilter: 'blur(18px) saturate(120%)' } as any : {}),
  },
  blurLayerLegacy: {
    flex: 1, backgroundColor: 'rgba(0,8,12,0.85)',
  },
  panel: { width: SW * 0.72, height: '100%' },
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
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  itemIcon: { fontSize: 20, width: 32 },
  itemText: { flex: 1, gap: 2 },
  itemLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  itemSub: { color: '#555', fontSize: 10 },
  founderPride: {
    margin: 20, backgroundColor: 'rgba(212,175,55,0.05)', borderRadius: 14,
    padding: 18, borderWidth: 1, borderColor: 'rgba(212,175,55,0.12)', alignItems: 'center', gap: 10,
  },
  founderStar: { color: '#D4AF37', fontSize: 22 },
  founderQuote: { color: '#D4AF37', fontSize: 11, fontWeight: '600', fontStyle: 'italic', textAlign: 'center', lineHeight: 17, opacity: 0.85 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16,
    paddingHorizontal: 20, marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,59,48,0.08)',
  },
  logoutIcon: { fontSize: 20, width: 32 },
  logoutLabel: { color: 'rgba(255,59,48,0.7)', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  logoutSub: { color: 'rgba(255,59,48,0.35)', fontSize: 10 },
  footer: { color: '#333', fontSize: 9, fontWeight: '600', letterSpacing: 1, paddingHorizontal: 20, paddingBottom: 30 },
});

// ========== CINEMA RESULTS ==========
function CinemaResults({ visible, result, user, onClose }: { visible: boolean; result: any; user: any; onClose: () => void }) {
  const slideY = useSharedValue(300);
  const fadeIn = useSharedValue(0);
  const [displayXP, setDisplayXP] = useState(0);
  const founderShimmer = useSharedValue(-1);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (visible && result) {
      slideY.value = withSpring(0, { damping: 15, stiffness: 100 });
      fadeIn.value = withTiming(1, { duration: 400 });
      const target = result.xp_earned || 0;
      let cur = 0; const step = Math.max(1, Math.ceil(target / 30));
      const iv = setInterval(() => { cur += step; if (cur >= target) { cur = target; clearInterval(iv); } setDisplayXP(cur); }, 40);
      // Founder shimmer every 1.5s
      founderShimmer.value = withRepeat(withSequence(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), withDelay(900, withTiming(-1, { duration: 0 }))), -1, false);
      return () => clearInterval(iv);
    }
  }, [visible, result]);

  const cs = useAnimatedStyle(() => ({ transform: [{ translateY: slideY.value }], opacity: fadeIn.value }));
  const ss = useAnimatedStyle(() => ({ opacity: 0.35 + Math.max(0, 1 - Math.abs(founderShimmer.value)) * 0.65 }));

  if (!visible || !result) return null;
  const isFounder = user?.is_founder || user?.is_admin;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={cin$.backdrop}>
        <Animated.View style={[cin$.card, cs]}>
          <ScrollView contentContainerStyle={cin$.scroll} showsVerticalScrollIndicator={false}>
            <View style={cin$.titleRow}>
              <Text style={cin$.title}>{'\u26a1'} SESSIONE COMPLETATA</Text>
              {isFounder && <Animated.View style={[cin$.founderBadge, ss]}><Text style={cin$.founderText}>{'\u2605'} FOUNDER</Text></Animated.View>}
            </View>
            <Text style={cin$.username}>{user?.username || 'Atleta'}</Text>
            <View style={cin$.scoreCircle}><Text style={cin$.scoreVal}>{result.quality_score || '\u2014'}</Text><Text style={cin$.scoreLabel}>QUALIT{'\u00c0'}</Text></View>
            <View style={cin$.xpWrap}><Text style={cin$.xpPlus}>+</Text><Text style={cin$.xpVal}>{displayXP}</Text><Text style={cin$.xpUnit}>XP</Text></View>
            <View style={cin$.statsRow}>
              <View style={cin$.stat}><Text style={cin$.statVal}>{result.reps_completed}</Text><Text style={cin$.statLabel}>REPS</Text></View>
              <View style={cin$.stat}><Text style={[cin$.statVal, { color: '#D4AF37' }]}>x{result.quality_multiplier}</Text><Text style={cin$.statLabel}>MULTI</Text></View>
              <View style={cin$.stat}><Text style={cin$.statVal}>{result.base_xp}</Text><Text style={cin$.statLabel}>BASE</Text></View>
            </View>
            {result.records_broken?.length > 0 && (
              <View style={cin$.record}><Text style={cin$.recordTitle}>{'\ud83c\udfc6'} RECORD INFRANTI!</Text><Text style={cin$.recordList}>{result.records_broken.join(' \u00b7 ')}</Text></View>
            )}
            {result.level_up && <View style={cin$.level}><Text style={cin$.levelText}>{'\ud83c\udf1f'} LEVEL UP! {'\u2192'} LVL {result.new_level}</Text></View>}
            {result.dna && (
              <View style={cin$.dnaRow}>{Object.entries(result.dna).map(([k, v]: [string, any]) => (
                <View key={k} style={cin$.dnaItem}><Text style={cin$.dnaVal}>{Math.round(v)}</Text><Text style={cin$.dnaLabel}>{k.slice(0, 3).toUpperCase()}</Text></View>
              ))}</View>
            )}
            <TouchableOpacity style={cin$.shareBtn} onPress={() => setShowShare(!showShare)} activeOpacity={0.85}>
              <Text style={cin$.shareBtnText}>{'\u2191'} SHARE GLORY SHOT</Text>
            </TouchableOpacity>
            {showShare && (
              <Animated.View entering={FadeInDown.duration(300)} style={cin$.shareCard}>
                <Text style={cin$.shareLogo}>ARENAKORE</Text>
                <Text style={cin$.shareTag}>Hall of Kore</Text>
                <View style={cin$.shareLine} />
                <Text style={cin$.shareScore}>Quality: {result.quality_score} {'\u00b7'} +{result.xp_earned} XP {'\u00b7'} {result.reps_completed} Reps</Text>
                <Text style={cin$.shareFounder}>
                  {isFounder ? `Founder #${user?.founder_number || '?'}` : user?.username} {'\u2014'} Performance Logged in Chicago
                </Text>
              </Animated.View>
            )}
            <TouchableOpacity style={cin$.closeBtn} onPress={onClose}><Text style={cin$.closeBtnText}>CHIUDI</Text></TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const cin$ = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(5,5,5,0.96)' },
  card: { width: SW * 0.9, maxHeight: SH * 0.85, backgroundColor: '#0A0A0A', borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.2)', shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.12, shadowRadius: 25 },
  scroll: { padding: 24, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  title: { color: '#00F2FF', fontSize: 11, fontWeight: '800', letterSpacing: 4 },
  founderBadge: { backgroundColor: 'rgba(212,175,55,0.2)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#D4AF37' },
  founderText: { color: '#D4AF37', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  username: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
  scoreCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,242,255,0.06)', borderWidth: 3, borderColor: '#00F2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  scoreVal: { color: '#FFFFFF', fontSize: 36, fontWeight: '900' },
  scoreLabel: { color: '#00F2FF', fontSize: 7, fontWeight: '700', letterSpacing: 2 },
  xpWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 14 },
  xpPlus: { color: '#D4AF37', fontSize: 22, fontWeight: '300' },
  xpVal: { color: '#D4AF37', fontSize: 42, fontWeight: '900', fontVariant: ['tabular-nums'] },
  xpUnit: { color: '#8A7020', fontSize: 14, fontWeight: '800', letterSpacing: 2, marginLeft: 4 },
  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginBottom: 10 },
  stat: { alignItems: 'center', gap: 3 },
  statVal: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#555', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  record: { width: '100%', backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)', marginBottom: 8, gap: 3 },
  recordTitle: { color: '#D4AF37', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  recordList: { color: '#D4AF37', fontSize: 10 },
  level: { width: '100%', backgroundColor: 'rgba(0,242,255,0.08)', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,242,255,0.3)', marginBottom: 8 },
  levelText: { color: '#00F2FF', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  dnaRow: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  dnaItem: { alignItems: 'center', gap: 1 },
  dnaVal: { color: '#00F2FF', fontSize: 14, fontWeight: '900' },
  dnaLabel: { color: '#555', fontSize: 7, fontWeight: '700' },
  shareBtn: { width: '100%', backgroundColor: 'rgba(212,175,55,0.1)', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 6, borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)' },
  shareBtnText: { color: '#D4AF37', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  shareCard: { width: '100%', backgroundColor: 'rgba(212,175,55,0.05)', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: 'rgba(212,175,55,0.15)', gap: 4 },
  shareLogo: { color: '#D4AF37', fontSize: 16, fontWeight: '900', letterSpacing: 4 },
  shareTag: { color: '#888', fontSize: 9, fontWeight: '600', letterSpacing: 2 },
  shareLine: { width: 40, height: 1, backgroundColor: 'rgba(212,175,55,0.3)', marginVertical: 6 },
  shareScore: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  shareFounder: { color: '#D4AF37', fontSize: 10, fontWeight: '600', fontStyle: 'italic', textAlign: 'center' },
  closeBtn: { width: '100%', backgroundColor: '#00F2FF', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  closeBtnText: { color: '#050505', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
});

// ========== SCAN LINE ==========
function ScanLine({ active }: { active: boolean }) {
  const ty = useSharedValue(0);
  useEffect(() => { if (active) ty.value = withRepeat(withTiming(SH - 200, { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true); }, [active]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }], opacity: active ? 0.6 : 0 }));
  return <Animated.View style={[{ position: 'absolute', left: 0, right: 0, height: 3, zIndex: 10 }, s]} pointerEvents="none"><View style={{ flex: 1, backgroundColor: '#00F2FF' }} /></Animated.View>;
}

// ========== MAIN SCREEN ==========
export default function NexusTriggerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, updateUser, logout } = useAuth();

  const [phase, setPhase] = useState<'console' | 'bioscan' | 'forge' | 'countdown' | 'scanning' | 'results'>('console');
  const [exercise, setExercise] = useState<ExerciseType>('squat');
  const [forgeMode, setForgeMode] = useState<ForgeMode>('personal');
  const [motionState, setMotionState] = useState<MotionState | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [goldFlash, setGoldFlash] = useState(false);
  const [isExplosive, setIsExplosive] = useState(false);
  const [motionActive, setMotionActive] = useState(false);
  const [burgerOpen, setBurgerOpen] = useState(false);

  // ===== DEVICE INTELLIGENCE LAYER =====
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile | null>(null);
  useEffect(() => {
    const profile = profileDevice();
    setDeviceProfile(profile);
    console.log(`[ARENAKORE] Device Intelligence: ${profile.tier.toUpperCase()} | ${profile.model} | ${profile.cpuCores} cores | ${profile.ramGB}GB RAM`);
  }, []);
  const deviceTier: DeviceTier = deviceProfile?.tier || 'standard';

  const analyzerRef = useRef<MotionAnalyzer | null>(null);
  const accelSubRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastRepRef = useRef(0);
  const motionTimeoutRef = useRef<any>(null);

  // Haptic Punch
  useEffect(() => {
    if (!motionState || motionState.reps === 0 || motionState.reps === lastRepRef.current) return;
    lastRepRef.current = motionState.reps;
    if (Platform.OS !== 'web') Haptics.impactAsync(exercise === 'punch' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium);
    setGoldFlash(true); setTimeout(() => setGoldFlash(false), 350);
  }, [motionState?.reps]);

  // Explosive detection + motion-active state for skeleton
  useEffect(() => {
    if (!motionState) return;
    const mag = motionState.peakAcceleration || 0;
    if (motionState.currentPhase !== 'idle' && mag > 1) {
      setMotionActive(true);
      if (motionTimeoutRef.current) clearTimeout(motionTimeoutRef.current);
      motionTimeoutRef.current = setTimeout(() => setMotionActive(false), 600);
    }
    if (mag > 3.5 && motionState.currentPhase === 'strike') {
      setIsExplosive(true); setTimeout(() => setIsExplosive(false), 500);
    }
  }, [motionState?.currentPhase, motionState?.peakAcceleration]);

  // Web camera motion detection
  useEffect(() => {
    if (Platform.OS !== 'web' || phase !== 'scanning') return;
    let stream: any, videoEl: any, motionIv: any, prevFrame: any;
    (async () => {
      try {
        stream = await (navigator as any).mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
        videoEl = document.createElement('video');
        videoEl.srcObject = stream; videoEl.autoplay = true; videoEl.muted = true; videoEl.playsInline = true;
        videoEl.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;opacity:0.15;z-index:0;transform:scaleX(-1);';
        const c = document.getElementById('nexus-cam'); if (c) c.appendChild(videoEl);
        await videoEl.play();
        const cv = document.createElement('canvas'); cv.width = 160; cv.height = 120; const ctx = cv.getContext('2d');
        motionIv = setInterval(() => {
          if (!videoEl || videoEl.readyState < 2 || !ctx) return;
          ctx.drawImage(videoEl, 0, 0, 160, 120);
          const f = ctx.getImageData(0, 0, 160, 120);
          if (prevFrame) {
            let d = 0; for (let i = 0; i < f.data.length; i += 16) d += Math.abs(f.data[i] - prevFrame.data[i]);
            const avgDiff = d / (f.data.length / 16);
            if (avgDiff > 10) {
              setMotionActive(true);
              if (motionTimeoutRef.current) clearTimeout(motionTimeoutRef.current);
              motionTimeoutRef.current = setTimeout(() => setMotionActive(false), 600);
              if (avgDiff > 18) { setGoldFlash(true); setTimeout(() => setGoldFlash(false), 400); }
            }
          }
          prevFrame = f;
        }, 200);
      } catch (_) {}
    })();
    return () => { if (motionIv) clearInterval(motionIv); if (stream) stream.getTracks().forEach((t: any) => t.stop()); if (videoEl?.parentNode) videoEl.parentNode.removeChild(videoEl); };
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

  // Console is the entry point
  if (phase === 'console') {
    return (
      <NexusConsole
        user={user}
        onScan={() => setPhase('bioscan')}
        onForge={() => setPhase('forge')}
        deviceTier={deviceTier}
      />
    );
  }

  return (
    <View style={st.container} testID="nexus-trigger-screen">
      <StatusBar barStyle="light-content" />
      <View style={st.camBg} nativeID="nexus-cam" />
      <CyberGrid intensity={phase === 'scanning' ? 1 : 0.3} />
      <ScanLine active={phase === 'scanning'} />

      {phase === 'scanning' && motionState && (
        <DigitalShadow pose={motionState.skeletonPose} exercise={exercise} goldFlash={goldFlash} motionActive={motionActive} deviceTier={deviceTier} />
      )}

      {/* Top HUD */}
      <View style={[st.topHud, { top: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => { stopSensors(); setPhase('console'); }} style={st.hudBtn}><Text style={st.closeX}>{'\u2715'}</Text></TouchableOpacity>
        <View style={st.livePill}>
          <View style={[st.liveDot, phase === 'scanning' && { backgroundColor: '#FF3B30' }]} />
          <Text style={st.liveText}>{phase === 'scanning' ? 'RECORDING' : phase === 'bioscan' ? 'INITIALIZING' : phase === 'forge' ? 'FORGE' : 'NEXUS'}</Text>
        </View>
        <TouchableOpacity onPress={() => setBurgerOpen(true)} style={st.hudBtn}><Text style={st.menuIcon}>{'\u2630'}</Text></TouchableOpacity>
      </View>

      {phase === 'bioscan' && <BioScanTrigger user={user} onComplete={() => {
        // From NEXUS SCAN: go to quick exercise select then countdown
        setPhase('forge');
      }} />}
      {phase === 'forge' && <View style={st.centerContent}><ChallengeForge onSelect={handleForgeSelect} user={user} /></View>}
      {phase === 'countdown' && <Countdown onComplete={handleCountdownDone} />}

      {phase === 'scanning' && motionState && (
        <>
          <View style={st.repWrap}><Text style={st.repVal}>{motionState.reps}</Text><Text style={st.repLabel}>REPS</Text></View>
          <View style={st.timerWrap}><Text style={st.timerText}>{fmt(timer)}</Text></View>
          <View style={st.qualBar}>
            <View style={st.qualTrack}><View style={[st.qualFill, { height: `${motionState.quality}%` as any }]} /></View>
            <Text style={st.qualVal}>{motionState.quality}</Text><Text style={st.qualLabel}>Q</Text>
          </View>
          {motionState.lastRepQuality > 0 && <View style={st.lastRep}><Text style={st.lastRepText}>{motionState.lastRepQuality >= 80 ? '\ud83d\udd25 GOLD' : motionState.lastRepQuality >= 60 ? '\u26a1 BUONO' : '\ud83d\udcaa OK'}</Text></View>}
          <View style={st.xpAcc}><Text style={st.xpAccVal}>+{motionState.reps * 5} XP</Text></View>
          <MiniDNARadar dna={user?.dna} explosive={isExplosive} />
          <View style={st.exLabel}><Text style={st.exLabelText}>{exercise === 'squat' ? '\ud83c\udfcb\ufe0f DEEP SQUAT' : '\ud83e\udd4a EXPLOSIVE PUNCH'}{forgeMode !== 'personal' ? ` \u00b7 ${forgeMode === 'battle' ? 'POINTS BATTLE' : 'LIVE DUEL'}` : ''}</Text></View>
          <TouchableOpacity testID="nexus-stop-btn" style={[st.stopBtn, { bottom: insets.bottom + 16 }]} onPress={handleStop}>
            <View style={st.stopInner}><View style={st.stopSq} /></View>
            <Text style={st.stopLabel}>TERMINA SESSIONE</Text>
          </TouchableOpacity>
        </>
      )}

      <CinemaResults visible={phase === 'results'} result={scanResult} user={user} onClose={handleResultClose} />
      <BurgerMenu visible={burgerOpen} onClose={() => setBurgerOpen(false)} user={user} onLogout={() => { setBurgerOpen(false); stopSensors(); logout(); router.replace('/'); }} deviceTier={deviceTier} />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  camBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#060606' },
  topHud: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, zIndex: 20 },
  hudBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeX: { color: '#888', fontSize: 22, fontWeight: '300' },
  menuIcon: { color: '#00F2FF', fontSize: 20, fontWeight: '700' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00F2FF' },
  liveText: { color: '#00F2FF', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  centerContent: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 15, paddingHorizontal: 4 },
  repWrap: { position: 'absolute', top: 100, left: 0, right: 0, alignItems: 'center', zIndex: 30 },
  repVal: { color: '#D4AF37', fontSize: 72, fontWeight: '900', letterSpacing: -3 },
  repLabel: { color: '#D4AF37', fontSize: 10, fontWeight: '700', letterSpacing: 4, marginTop: -8 },
  timerWrap: { position: 'absolute', top: 80, left: 20, zIndex: 30 },
  timerText: { color: '#00F2FF', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  qualBar: { position: 'absolute', right: 16, top: SH * 0.25, alignItems: 'center', gap: 4, zIndex: 30 },
  qualTrack: { width: 6, height: 120, backgroundColor: 'rgba(0,242,255,0.1)', borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end' },
  qualFill: { width: '100%', backgroundColor: '#00F2FF', borderRadius: 3 },
  qualVal: { color: '#00F2FF', fontSize: 16, fontWeight: '900' },
  qualLabel: { color: '#555', fontSize: 8, fontWeight: '700' },
  lastRep: { position: 'absolute', top: 200, left: 0, right: 0, alignItems: 'center', zIndex: 30 },
  lastRepText: { color: '#D4AF37', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  xpAcc: { position: 'absolute', top: 80, right: 16, zIndex: 30 },
  xpAccVal: { color: '#D4AF37', fontSize: 14, fontWeight: '800' },
  exLabel: { position: 'absolute', top: SH * 0.65, left: 0, right: 0, alignItems: 'center', zIndex: 30 },
  exLabelText: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  stopBtn: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 30 },
  stopInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,59,48,0.12)', borderWidth: 3, borderColor: '#FF3B30', alignItems: 'center', justifyContent: 'center' },
  stopSq: { width: 20, height: 20, borderRadius: 4, backgroundColor: '#FF3B30' },
  stopLabel: { color: '#FF3B30', fontSize: 9, fontWeight: '700', letterSpacing: 2, marginTop: 6 },
});
