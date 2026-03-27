import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  Dimensions, Platform, Modal, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, withRepeat, withSequence, withTiming,
  useAnimatedStyle, withSpring, withDelay, Easing, interpolate,
  FadeIn, FadeInDown, FadeInUp,
} from 'react-native-reanimated';
import Svg, { Line, Rect, Circle, Text as SvgText, G, Polygon } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { playAcceptPing, playRecordBroken } from '../../utils/sounds';
import { MotionAnalyzer, MotionState, ExerciseType, SkeletonPose } from '../../utils/MotionAnalyzer';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const GRID_SIZE = 40;
const COLS = Math.ceil(SCREEN_W / GRID_SIZE);
const ROWS = Math.ceil(SCREEN_H / GRID_SIZE);

// =====================
// HOLOGRAPHIC CYBER GRID — Dynamic background with moving pulse lines
// =====================
function CyberGrid({ pulse, phase }: { pulse: Animated.SharedValue<number>; phase: string }) {
  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.12, phase === 'scanning' ? 0.45 : 0.25]),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]} pointerEvents="none">
      <Svg width={SCREEN_W} height={SCREEN_H}>
        {Array.from({ length: COLS + 1 }).map((_, i) => (
          <Line key={`v-${i}`} x1={i * GRID_SIZE} y1={0} x2={i * GRID_SIZE} y2={SCREEN_H}
            stroke="#00F2FF" strokeWidth={0.4} opacity={0.25} />
        ))}
        {Array.from({ length: ROWS + 1 }).map((_, i) => (
          <Line key={`h-${i}`} x1={0} y1={i * GRID_SIZE} x2={SCREEN_W} y2={i * GRID_SIZE}
            stroke="#00F2FF" strokeWidth={0.4} opacity={0.25} />
        ))}
        <Circle cx={SCREEN_W / 2} cy={SCREEN_H / 2} r={60} stroke="#00F2FF" strokeWidth={1.5} fill="none" opacity={0.5} />
        <Circle cx={SCREEN_W / 2} cy={SCREEN_H / 2} r={90} stroke="#00F2FF" strokeWidth={0.8} fill="none" opacity={0.25} strokeDasharray="8,6" />
        <Line x1={SCREEN_W / 2 - 80} y1={SCREEN_H / 2} x2={SCREEN_W / 2 - 30} y2={SCREEN_H / 2} stroke="#00F2FF" strokeWidth={1.5} opacity={0.6} />
        <Line x1={SCREEN_W / 2 + 30} y1={SCREEN_H / 2} x2={SCREEN_W / 2 + 80} y2={SCREEN_H / 2} stroke="#00F2FF" strokeWidth={1.5} opacity={0.6} />
        <Line x1={SCREEN_W / 2} y1={SCREEN_H / 2 - 80} x2={SCREEN_W / 2} y2={SCREEN_H / 2 - 30} stroke="#00F2FF" strokeWidth={1.5} opacity={0.6} />
        <Line x1={SCREEN_W / 2} y1={SCREEN_H / 2 + 30} x2={SCREEN_W / 2} y2={SCREEN_H / 2 + 80} stroke="#00F2FF" strokeWidth={1.5} opacity={0.6} />
        <Rect x={20} y={80} width={40} height={40} stroke="#00F2FF" strokeWidth={1.5} fill="none" opacity={0.4} />
        <Rect x={SCREEN_W - 60} y={80} width={40} height={40} stroke="#00F2FF" strokeWidth={1.5} fill="none" opacity={0.4} />
        <Rect x={20} y={SCREEN_H - 160} width={40} height={40} stroke="#00F2FF" strokeWidth={1.5} fill="none" opacity={0.4} />
        <Rect x={SCREEN_W - 60} y={SCREEN_H - 160} width={40} height={40} stroke="#00F2FF" strokeWidth={1.5} fill="none" opacity={0.4} />
        <SvgText x={24} y={72} fill="#00F2FF" fontSize={9} fontWeight="bold" opacity={0.6}>ARENAKORE v2.1</SvgText>
        <SvgText x={SCREEN_W - 130} y={72} fill="#00F2FF" fontSize={9} fontWeight="bold" opacity={0.6}>NEXUS SYNC</SvgText>
      </Svg>
    </Animated.View>
  );
}

// =====================
// SENSOR SKELETON — Gold flash on movement
// =====================
function SensorSkeleton({ pose, exerciseType, goldFlash = false }: { pose: SkeletonPose; exerciseType: ExerciseType; goldFlash?: boolean }) {
  const cx = SCREEN_W / 2;
  const baseY = SCREEN_H * 0.38;
  const glowOpacity = 0.3 + pose.intensity * 0.7;
  const boneColor = goldFlash ? '#D4AF37' : '#00F2FF';

  const headY = baseY - 45 + pose.torsoTilt * 5;
  const shoulderY = baseY - 15 + pose.torsoTilt * 8;
  const hipY = baseY + 35 + pose.hipDrop * 15;
  const kneeY = hipY + 35 + pose.kneeAngle * 15;
  const footY = kneeY + 30;
  const armExt = exerciseType === 'punch' ? pose.armExtension * 50 : 15;
  const armY = shoulderY + (exerciseType === 'punch' ? 5 : 15);

  const joints = [
    { x: cx, y: headY },
    { x: cx, y: shoulderY },
    { x: cx - 25 - (exerciseType === 'punch' ? pose.shoulderRotation * 10 : 0), y: shoulderY },
    { x: cx + 25 + (exerciseType === 'punch' ? pose.shoulderRotation * 10 : 0), y: shoulderY },
    { x: cx - 30 - armExt, y: armY },
    { x: cx + 30 + armExt, y: armY },
    { x: cx - 35 - armExt * 1.2, y: armY + 15 },
    { x: cx + 35 + armExt * 1.2, y: armY + 15 },
    { x: cx, y: hipY },
    { x: cx - 15, y: hipY },
    { x: cx + 15, y: hipY },
    { x: cx - 18, y: kneeY },
    { x: cx + 18, y: kneeY },
    { x: cx - 20, y: footY },
    { x: cx + 20, y: footY },
  ];

  const bones = [
    [0, 1], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7],
    [1, 8], [8, 9], [8, 10], [9, 11], [10, 12], [11, 13], [12, 14],
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={SCREEN_W} height={SCREEN_H}>
        <Circle cx={joints[0].x} cy={joints[0].y} r={20}
          fill={boneColor} opacity={glowOpacity * 0.15} />
        <Circle cx={joints[8].x} cy={joints[8].y} r={16}
          fill={boneColor} opacity={glowOpacity * 0.1} />
        {bones.map(([from, to], i) => (
          <Line key={`bone-${i}`}
            x1={joints[from].x} y1={joints[from].y}
            x2={joints[to].x} y2={joints[to].y}
            stroke={boneColor} strokeWidth={2.5}
            opacity={glowOpacity}
            strokeLinecap="round"
          />
        ))}
        {joints.map((j, i) => (
          <G key={`joint-${i}`}>
            <Circle cx={j.x} cy={j.y} r={i === 0 ? 10 : 5}
              fill={boneColor} opacity={glowOpacity * 0.8} />
            <Circle cx={j.x} cy={j.y} r={i === 0 ? 12 : 7}
              stroke={boneColor} strokeWidth={1} fill="none"
              opacity={glowOpacity * 0.4} />
          </G>
        ))}
        <SvgText x={cx - 60} y={baseY - 120} fill={boneColor} fontSize={8}
          fontWeight="bold" opacity={0.5}>
          {goldFlash ? 'MOTION DETECTED \u00b7 GOLD SYNC' : 'KEYPOINTS: 17 \u00b7 TRACKING: ACTIVE'}
        </SvgText>
      </Svg>
    </View>
  );
}

// =====================
// BIO-SCAN TRIGGER — The Hook (Laser + phases)
// =====================
function BioScanTrigger({ onComplete }: { onComplete: () => void }) {
  const laserY = useSharedValue(0);
  const laserGlow = useSharedValue(0.5);
  const [scanPhase, setScanPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  const PHASES = [
    'DETECTING BIO-SIGNATURE',
    'MAPPING KORE POINTS',
    'CALIBRATING SENSORS',
    'READY',
  ];

  useEffect(() => {
    // Laser sweep animation
    laserY.value = withRepeat(
      withTiming(SCREEN_H, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1, true
    );
    laserGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.4, { duration: 600 })
      ), -1, false
    );

    // Progress counter 0 → 100
    let p = 0;
    const progressInterval = setInterval(() => {
      p += 2 + Math.random() * 3;
      if (p > 100) p = 100;
      setProgress(Math.floor(p));
      if (p < 30) setScanPhase(0);
      else if (p < 60) setScanPhase(1);
      else if (p < 90) setScanPhase(2);
      else setScanPhase(3);
      if (p >= 100) clearInterval(progressInterval);
    }, 80);

    // Auto-complete after ~3.5s
    const timer = setTimeout(() => {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onComplete();
    }, 3500);

    return () => { clearInterval(progressInterval); clearTimeout(timer); };
  }, []);

  const laserStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: laserY.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: laserGlow.value,
  }));

  return (
    <View style={bioScan$.overlay}>
      {/* Laser line with intense glow */}
      <Animated.View style={[bioScan$.laserWrap, laserStyle]}>
        <Animated.View style={[bioScan$.laserGlow, glowStyle]} />
        <View style={bioScan$.laserLine} />
        <Animated.View style={[bioScan$.laserGlow, glowStyle]} />
      </Animated.View>

      {/* Scan text */}
      <View style={bioScan$.textCenter}>
        <Animated.Text entering={FadeIn.duration(400)} style={bioScan$.title}>
          INITIALIZING KORE SCAN
        </Animated.Text>
        <Text style={bioScan$.phaseText}>[{PHASES[scanPhase]}]</Text>
        <View style={bioScan$.progressRow}>
          <View style={bioScan$.progressTrack}>
            <View style={[bioScan$.progressFill, { width: `${progress}%` as any }]} />
          </View>
          <Text style={bioScan$.progressText}>{progress}%</Text>
        </View>
        <Text style={bioScan$.subText}>
          {scanPhase < 3 ? 'Mantieni il dispositivo stabile...' : 'SCANSIONE COMPLETA'}
        </Text>
      </View>

      {/* Corner brackets */}
      <View style={[bioScan$.bracket, { top: 60, left: 20 }]}>
        <View style={bioScan$.bracketH} />
        <View style={bioScan$.bracketV} />
      </View>
      <View style={[bioScan$.bracket, { top: 60, right: 20, transform: [{ scaleX: -1 }] }]}>
        <View style={bioScan$.bracketH} />
        <View style={bioScan$.bracketV} />
      </View>
      <View style={[bioScan$.bracket, { bottom: 100, left: 20, transform: [{ scaleY: -1 }] }]}>
        <View style={bioScan$.bracketH} />
        <View style={bioScan$.bracketV} />
      </View>
      <View style={[bioScan$.bracket, { bottom: 100, right: 20, transform: [{ scaleX: -1 }, { scaleY: -1 }] }]}>
        <View style={bioScan$.bracketH} />
        <View style={bioScan$.bracketV} />
      </View>
    </View>
  );
}

const bioScan$ = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, backgroundColor: 'rgba(5,5,5,0.92)', justifyContent: 'center', alignItems: 'center' },
  laserWrap: { position: 'absolute', left: 0, right: 0, height: 6, alignItems: 'center' },
  laserLine: { height: 2, width: '100%', backgroundColor: '#00F2FF' },
  laserGlow: { height: 12, width: '90%', backgroundColor: 'rgba(0,242,255,0.25)', borderRadius: 6 },
  textCenter: { alignItems: 'center', gap: 12 },
  title: { color: '#00F2FF', fontSize: 14, fontWeight: '900', letterSpacing: 5 },
  phaseText: { color: '#D4AF37', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: SCREEN_W * 0.6 },
  progressTrack: { flex: 1, height: 3, backgroundColor: 'rgba(0,242,255,0.15)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  progressText: { color: '#00F2FF', fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'], width: 50 },
  subText: { color: '#555', fontSize: 10, fontWeight: '600', letterSpacing: 1, marginTop: 4 },
  bracket: { position: 'absolute' },
  bracketH: { width: 30, height: 2, backgroundColor: '#00F2FF', opacity: 0.5 },
  bracketV: { width: 2, height: 30, backgroundColor: '#00F2FF', opacity: 0.5 },
});

// =====================
// MINI DNA RADAR — Pulsing on explosive moves
// =====================
function MiniDNARadar({ dna, isExplosive }: { dna: any; isExplosive: boolean }) {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isExplosive) {
      pulseScale.value = withSequence(
        withTiming(1.25, { duration: 150 }),
        withTiming(1, { duration: 300 })
      );
    }
  }, [isExplosive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  if (!dna) return null;

  const stats = ['velocita', 'forza', 'resistenza', 'agilita', 'tecnica', 'potenza'];
  const values = stats.map(s => (dna[s] || 20) / 100);
  const cx = 40, cy = 40, r = 30;

  const points = values.map((v, i) => {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    return `${cx + r * v * Math.cos(angle)},${cy + r * v * Math.sin(angle)}`;
  }).join(' ');

  const gridPoints = [1, 0.66, 0.33].map(level =>
    stats.map((_, i) => {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      return `${cx + r * level * Math.cos(angle)},${cy + r * level * Math.sin(angle)}`;
    }).join(' ')
  );

  // Find potenza index for flare
  const potenzaIdx = 5;
  const potAngle = (Math.PI * 2 * potenzaIdx) / 6 - Math.PI / 2;
  const potX = cx + r * values[potenzaIdx] * Math.cos(potAngle);
  const potY = cy + r * values[potenzaIdx] * Math.sin(potAngle);

  return (
    <Animated.View style={[miniR$.container, animStyle]}>
      <Svg width={80} height={80}>
        {gridPoints.map((gp, i) => (
          <Polygon key={i} points={gp} fill="none" stroke="#00F2FF" strokeWidth={0.5} opacity={0.2} />
        ))}
        <Polygon points={points} fill="rgba(0,242,255,0.1)" stroke="#00F2FF" strokeWidth={1.5} opacity={0.8} />
        {/* Potenza flare on explosive */}
        {isExplosive && (
          <Circle cx={potX} cy={potY} r={6} fill="#00F2FF" opacity={0.9} />
        )}
      </Svg>
      <Text style={miniR$.label}>DNA</Text>
    </Animated.View>
  );
}

const miniR$ = StyleSheet.create({
  container: { position: 'absolute', bottom: 120, left: 12, zIndex: 35, alignItems: 'center' },
  label: { color: '#00F2FF', fontSize: 7, fontWeight: '800', letterSpacing: 2, marginTop: -2 },
});

// =====================
// EXERCISE SELECTOR
// =====================
function ExerciseSelector({ onSelect }: { onSelect: (e: ExerciseType) => void }) {
  return (
    <View style={sel$.container}>
      <Text style={sel$.title}>SELEZIONA ESERCIZIO</Text>
      <Text style={sel$.subtitle}>Scegli il pattern di movimento da analizzare</Text>
      <View style={sel$.row}>
        <TouchableOpacity style={sel$.card} onPress={() => onSelect('squat')} activeOpacity={0.85}>
          <Text style={sel$.icon}>{'\ud83c\udfcb\ufe0f'}</Text>
          <Text style={sel$.name}>DEEP SQUAT</Text>
          <Text style={sel$.desc}>Forza {'\u00b7'} Resistenza {'\u00b7'} Potenza</Text>
        </TouchableOpacity>
        <TouchableOpacity style={sel$.card} onPress={() => onSelect('punch')} activeOpacity={0.85}>
          <Text style={sel$.icon}>{'\ud83e\udd4a'}</Text>
          <Text style={sel$.name}>EXPLOSIVE PUNCH</Text>
          <Text style={sel$.desc}>Velocit{'\u00e0'} {'\u00b7'} Potenza {'\u00b7'} Agilit{'\u00e0'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const sel$ = StyleSheet.create({
  container: { alignItems: 'center', gap: 16 },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  subtitle: { color: '#555', fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  card: {
    flex: 1, alignItems: 'center', gap: 8, paddingVertical: 24,
    backgroundColor: 'rgba(0,242,255,0.04)', borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.15)',
  },
  icon: { fontSize: 32 },
  name: { color: '#00F2FF', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  desc: { color: '#555', fontSize: 9, textAlign: 'center' },
});

// =====================
// COUNTDOWN
// =====================
function Countdown({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(3);
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setTimeout(onComplete, 400);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scale.value = 0.3;
    opacity.value = 0;
    scale.value = withSpring(1, { damping: 8, stiffness: 150 });
    opacity.value = withSequence(withTiming(1, { duration: 200 }), withDelay(500, withTiming(0.4, { duration: 300 })));
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [count]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }], opacity: opacity.value,
  }));

  return (
    <View style={ct$.overlay}>
      <Animated.View style={[ct$.circle, animStyle]}>
        <Text style={ct$.text}>{count === 0 ? 'GO' : count}</Text>
      </Animated.View>
      <Text style={ct$.sub}>{count > 0 ? 'PREPARATI' : 'NEXUS ATTIVATO'}</Text>
    </View>
  );
}

const ct$ = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 25, backgroundColor: 'rgba(5,5,5,0.85)' },
  circle: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(0,242,255,0.08)', borderWidth: 3, borderColor: '#00F2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  text: { color: '#00F2FF', fontSize: 64, fontWeight: '900', letterSpacing: -2 },
  sub: { color: '#888', fontSize: 12, fontWeight: '700', letterSpacing: 3, marginTop: 24 },
});

// =====================
// CINEMA RESULTS — XP Count-up + Founder Shimmer
// =====================
function CinemaResults({ visible, result, user, onClose }: { visible: boolean; result: any; user: any; onClose: () => void }) {
  const slideY = useSharedValue(300);
  const fadeIn = useSharedValue(0);
  const [displayXP, setDisplayXP] = useState(0);
  const [countDone, setCountDone] = useState(false);
  const founderShimmer = useSharedValue(-1);

  useEffect(() => {
    if (visible && result) {
      slideY.value = withSpring(0, { damping: 15, stiffness: 100 });
      fadeIn.value = withTiming(1, { duration: 400 });

      // Fast mechanical XP count-up
      const target = result.xp_earned || 0;
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 30));
      const interval = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(interval);
          setCountDone(true);
        }
        setDisplayXP(current);
      }, 40);

      // Founder shimmer loop every 2 seconds
      founderShimmer.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withDelay(1200, withTiming(-1, { duration: 0 }))
        ), -1, false
      );

      return () => clearInterval(interval);
    }
  }, [visible, result]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }], opacity: fadeIn.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + Math.max(0, 1 - Math.abs(founderShimmer.value)) * 0.6,
  }));

  if (!visible || !result) return null;

  const isFounder = user?.is_founder || user?.is_admin;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={cin$.backdrop}>
        <Animated.View style={[cin$.card, containerStyle]}>
          {/* Title */}
          <View style={cin$.titleRow}>
            <Text style={cin$.title}>{'\u26a1'} SESSIONE COMPLETATA</Text>
            {isFounder && (
              <Animated.View style={[cin$.founderBadge, shimmerStyle]}>
                <Text style={cin$.founderText}>FOUNDER</Text>
              </Animated.View>
            )}
          </View>

          {/* Username */}
          <View style={cin$.userRow}>
            <Text style={cin$.username}>{user?.username || 'Atleta'}</Text>
            {isFounder && (
              <View style={cin$.founderDot} />
            )}
          </View>

          {/* Quality Circle */}
          <View style={cin$.scoreCircle}>
            <Text style={cin$.scoreVal}>{result.quality_score || '\u2014'}</Text>
            <Text style={cin$.scoreLabel}>QUALIT{'\u00c0'}</Text>
          </View>

          {/* XP Count-up — mechanical */}
          <View style={cin$.xpWrap}>
            <Text style={cin$.xpPlus}>+</Text>
            <Text style={cin$.xpVal}>{displayXP}</Text>
            <Text style={cin$.xpUnit}>XP</Text>
          </View>

          {/* Stats row */}
          <View style={cin$.statsRow}>
            <View style={cin$.stat}>
              <Text style={cin$.statVal}>{result.reps_completed}</Text>
              <Text style={cin$.statLabel}>REPS</Text>
            </View>
            <View style={cin$.stat}>
              <Text style={[cin$.statVal, { color: '#D4AF37' }]}>x{result.quality_multiplier}</Text>
              <Text style={cin$.statLabel}>MULTI</Text>
            </View>
            <View style={cin$.stat}>
              <Text style={cin$.statVal}>{result.base_xp}</Text>
              <Text style={cin$.statLabel}>BASE</Text>
            </View>
          </View>

          {/* Breakdown */}
          <View style={cin$.breakdownRow}>
            <Text style={cin$.breakdownText}>Gold: +{result.gold_bonus}</Text>
            <Text style={cin$.breakdownText}>Tempo: +{result.time_bonus}</Text>
          </View>

          {result.records_broken?.length > 0 && (
            <View style={cin$.recordBanner}>
              <Text style={cin$.recordTitle}>{'\ud83c\udfc6'} RECORD INFRANTI!</Text>
              <Text style={cin$.recordList}>{result.records_broken.join(' \u00b7 ')}</Text>
            </View>
          )}

          {result.level_up && (
            <View style={cin$.levelBanner}>
              <Text style={cin$.levelText}>{'\ud83c\udf1f'} LEVEL UP! {'\u2192'} LVL {result.new_level}</Text>
            </View>
          )}

          {result.dna && (
            <View style={cin$.dnaRow}>
              {Object.entries(result.dna).map(([k, v]: [string, any]) => (
                <View key={k} style={cin$.dnaItem}>
                  <Text style={cin$.dnaVal}>{Math.round(v)}</Text>
                  <Text style={cin$.dnaLabel}>{k.slice(0, 3).toUpperCase()}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={cin$.closeBtn} onPress={onClose}>
            <Text style={cin$.closeBtnText}>CHIUDI</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const cin$ = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(5,5,5,0.95)' },
  card: {
    width: SCREEN_W * 0.88, backgroundColor: '#0A0A0A', borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.25)',
    shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 30,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  title: { color: '#00F2FF', fontSize: 11, fontWeight: '800', letterSpacing: 4 },
  founderBadge: {
    backgroundColor: 'rgba(212,175,55,0.2)', borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#D4AF37',
  },
  founderText: { color: '#D4AF37', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  username: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  founderDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D4AF37' },
  scoreCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0,242,255,0.06)', borderWidth: 2.5, borderColor: '#00F2FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  scoreVal: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  scoreLabel: { color: '#00F2FF', fontSize: 7, fontWeight: '700', letterSpacing: 2 },
  xpWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 14 },
  xpPlus: { color: '#D4AF37', fontSize: 22, fontWeight: '300' },
  xpVal: { color: '#D4AF37', fontSize: 42, fontWeight: '900', fontVariant: ['tabular-nums'] },
  xpUnit: { color: '#8A7020', fontSize: 14, fontWeight: '800', letterSpacing: 2, marginLeft: 4 },
  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginBottom: 10 },
  stat: { alignItems: 'center', gap: 3 },
  statVal: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#555', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  breakdownRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  breakdownText: { color: '#555', fontSize: 10, fontWeight: '600' },
  recordBanner: {
    width: '100%', backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: 10, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)', marginBottom: 8, gap: 3,
  },
  recordTitle: { color: '#D4AF37', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  recordList: { color: '#D4AF37', fontSize: 10 },
  levelBanner: {
    width: '100%', backgroundColor: 'rgba(0,242,255,0.08)', borderRadius: 10, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,242,255,0.3)', marginBottom: 8,
  },
  levelText: { color: '#00F2FF', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  dnaRow: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  dnaItem: { alignItems: 'center', gap: 1 },
  dnaVal: { color: '#00F2FF', fontSize: 14, fontWeight: '900' },
  dnaLabel: { color: '#555', fontSize: 7, fontWeight: '700', letterSpacing: 0.5 },
  closeBtn: { width: '100%', backgroundColor: '#00F2FF', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  closeBtnText: { color: '#050505', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
});

// =====================
// SCAN LINE
// =====================
function ScanLine({ active }: { active: boolean }) {
  const translateY = useSharedValue(0);
  useEffect(() => {
    if (active) {
      translateY.value = withRepeat(
        withTiming(SCREEN_H - 200, { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true
      );
    }
  }, [active]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }], opacity: active ? 0.7 : 0,
  }));
  return (
    <Animated.View style={[styles.scanLine, animStyle]} pointerEvents="none">
      <View style={styles.scanLineGradient} />
    </Animated.View>
  );
}

// =====================
// MAIN NEXUS TRIGGER SCREEN
// =====================
export default function NexusTriggerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, updateUser } = useAuth();

  // Phase: bioscan → select → countdown → scanning → results
  const [phase, setPhase] = useState<'bioscan' | 'select' | 'countdown' | 'scanning' | 'results'>('bioscan');
  const [exercise, setExercise] = useState<ExerciseType>('squat');
  const [motionState, setMotionState] = useState<MotionState | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [goldFlash, setGoldFlash] = useState(false);
  const [isExplosive, setIsExplosive] = useState(false);

  const analyzerRef = useRef<MotionAnalyzer | null>(null);
  const accelSubRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastRepCountRef = useRef(0);
  const webCameraRef = useRef<any>(null);

  // Animations
  const gridPulse = useSharedValue(0);
  const triggerGlow = useSharedValue(0);

  useEffect(() => {
    gridPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ), -1, false
    );
    triggerGlow.value = withRepeat(
      withSequence(withTiming(1, { duration: 1200 }), withTiming(0.3, { duration: 1200 })), -1, false
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(triggerGlow.value, [0, 1], [0.3, 0.9]),
    shadowRadius: interpolate(triggerGlow.value, [0, 1], [8, 25]),
  }));

  // ========== THE HAPTIC PUNCH ==========
  useEffect(() => {
    if (!motionState || motionState.reps === 0) return;
    if (motionState.reps === lastRepCountRef.current) return;
    lastRepCountRef.current = motionState.reps;

    if (Platform.OS !== 'web') {
      if (exercise === 'punch') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }

    setGoldFlash(true);
    setTimeout(() => setGoldFlash(false), 350);
  }, [motionState?.reps, exercise]);

  // ========== EXPLOSIVE DETECTION for DNA Radar Pulse ==========
  useEffect(() => {
    if (!motionState) return;
    if (motionState.peakAcceleration > 3.5 && motionState.currentPhase === 'strike') {
      setIsExplosive(true);
      setTimeout(() => setIsExplosive(false), 500);
    }
  }, [motionState?.currentPhase]);

  // ========== WEB CAMERA ==========
  useEffect(() => {
    if (Platform.OS !== 'web' || phase !== 'scanning') return;

    let stream: any = null;
    let videoEl: any = null;
    let canvasEl: any = null;
    let ctx: any = null;
    let prevFrame: any = null;
    let motionInterval: any = null;

    const setupWebCamera = async () => {
      try {
        stream = await (navigator as any).mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });
        videoEl = document.createElement('video');
        videoEl.srcObject = stream;
        videoEl.autoplay = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;opacity:0.25;z-index:0;transform:scaleX(-1);';
        const container = document.getElementById('nexus-camera-bg');
        if (container) { container.appendChild(videoEl); webCameraRef.current = videoEl; }
        await videoEl.play();
        canvasEl = document.createElement('canvas');
        canvasEl.width = 160;
        canvasEl.height = 120;
        ctx = canvasEl.getContext('2d');
        motionInterval = setInterval(() => {
          if (!videoEl || videoEl.readyState < 2 || !ctx) return;
          ctx.drawImage(videoEl, 0, 0, 160, 120);
          const currentFrame = ctx.getImageData(0, 0, 160, 120);
          if (prevFrame) {
            let diff = 0;
            const len = currentFrame.data.length;
            for (let i = 0; i < len; i += 16) diff += Math.abs(currentFrame.data[i] - prevFrame.data[i]);
            if (diff / (len / 16) > 12) {
              setGoldFlash(true);
              setTimeout(() => setGoldFlash(false), 400);
            }
          }
          prevFrame = currentFrame;
        }, 200);
      } catch (e) { /* Camera not available */ }
    };

    setupWebCamera();
    return () => {
      if (motionInterval) clearInterval(motionInterval);
      if (stream) stream.getTracks().forEach((t: any) => t.stop());
      if (videoEl && videoEl.parentNode) videoEl.parentNode.removeChild(videoEl);
      webCameraRef.current = null;
    };
  }, [phase]);

  const handleBioScanComplete = () => setPhase('select');

  const handleSelectExercise = (ex: ExerciseType) => {
    setExercise(ex);
    setPhase('countdown');
  };

  const handleCountdownComplete = async () => {
    setPhase('scanning');
    try {
      if (token) {
        const session = await api.startNexusSession({ exercise_type: exercise }, token);
        setSessionId(session.session_id);
      }
    } catch (e) { /* silenced */ }
    analyzerRef.current = new MotionAnalyzer(exercise);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimer(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    startSensors();
  };

  const startSensors = () => {
    if (Platform.OS !== 'web') {
      try {
        const { startAccelerometer } = require('../../utils/nativeSensors');
        accelSubRef.current = startAccelerometer((data: any) => {
          if (analyzerRef.current) {
            const state = analyzerRef.current.processAccelerometer(data);
            setMotionState({ ...state });
          }
        });
      } catch (e) { /* Not available */ }
    }
  };

  // ========== WEB SIMULATION ==========
  const simDataRef = useRef({ reps: 0, quality: 0, tick: 0, lastRepTick: -100, qualities: [] as number[] });

  useEffect(() => {
    if (phase !== 'scanning' || Platform.OS !== 'web') return;
    const currentExercise = exercise;
    simDataRef.current = { reps: 0, quality: 0, tick: 0, lastRepTick: -100, qualities: [] };

    const simInterval = setInterval(() => {
      const d = simDataRef.current;
      d.tick++;
      const t = d.tick * 0.033;
      let x = 0, y = 0, z = 0;

      if (currentExercise === 'squat') {
        const p = (t * 2.5) % (Math.PI * 2);
        y = Math.sin(p) * 0.8;
        x = Math.sin(t * 7) * 0.03;
        const prevP = ((t - 0.033) * 2.5) % (Math.PI * 2);
        if (Math.sin(prevP) < 0 && Math.sin(p) >= 0 && (d.tick - d.lastRepTick) > 30) {
          d.reps++; d.lastRepTick = d.tick;
          const q = 65 + Math.random() * 30; d.qualities.push(q);
          d.quality = Math.round(d.qualities.reduce((a, b) => a + b) / d.qualities.length);
        }
      } else {
        const cyclePos = t % 1.3;
        if (cyclePos < 0.12) {
          const prog = cyclePos / 0.12;
          x = 4.5 * Math.sin(prog * Math.PI); z = 3.0 * Math.sin(prog * Math.PI);
        } else { x = Math.sin(t * 4) * 0.03; z = 0.02; }
        if (cyclePos > 0.04 && cyclePos < 0.08 && (d.tick - d.lastRepTick) > 25) {
          d.reps++; d.lastRepTick = d.tick;
          const q = 60 + Math.random() * 35; d.qualities.push(q);
          d.quality = Math.round(d.qualities.reduce((a, b) => a + b) / d.qualities.length);
        }
      }

      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const lastQ = d.qualities.length > 0 ? Math.round(d.qualities[d.qualities.length - 1]) : 0;

      setMotionState({
        reps: d.reps, quality: d.quality,
        currentPhase: magnitude > 1 ? (currentExercise === 'squat' ? 'down' : 'strike') : 'idle',
        isInFrame: true,
        peakAcceleration: Math.max(magnitude, 4.5),
        avgAmplitude: d.quality,
        amplitudes: [...d.qualities],
        lastRepQuality: lastQ,
        skeletonPose: {
          torsoTilt: currentExercise === 'squat' ? Math.max(-1, Math.min(1, -y)) : Math.sin(t) * 0.15,
          kneeAngle: currentExercise === 'squat' ? Math.max(0, -y * 1.5) : 0,
          armExtension: currentExercise === 'punch' ? (magnitude > 1 ? 1 : 0) : 0,
          shoulderRotation: currentExercise === 'punch' ? Math.min(1, x * 0.2) : 0,
          hipDrop: currentExercise === 'squat' ? Math.max(0, -y * 1.2) : 0,
          intensity: magnitude > 0.5 ? 0.8 : 0.2,
        },
      });
    }, 50);

    return () => clearInterval(simInterval);
  }, [phase, exercise]);

  const stopSensors = () => {
    if (accelSubRef.current) { accelSubRef.current.remove(); accelSubRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    lastRepCountRef.current = 0;
  };

  const handleStopSession = async () => {
    stopSensors();
    const durationSecs = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const reps = motionState?.reps || 0;
    const quality = motionState?.quality || 50;
    const peakAccel = motionState?.peakAcceleration || 0;
    const avgAmp = motionState?.avgAmplitude || 0;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      if (token && sessionId) {
        const result = await api.completeNexusSession(sessionId, {
          exercise_type: exercise, reps_completed: reps, quality_score: quality,
          duration_seconds: durationSecs, peak_acceleration: peakAccel, avg_amplitude: avgAmp,
        }, token);
        setScanResult(result);
        if (result.user) updateUser(result.user);
        if (result.records_broken?.length > 0) playRecordBroken();
        else playAcceptPing();
      } else {
        setScanResult({
          exercise_type: exercise, reps_completed: reps, quality_score: quality,
          base_xp: reps * 5, quality_multiplier: 1 + (quality / 100) * 2,
          gold_bonus: quality >= 80 ? reps * 2 : 0, time_bonus: Math.min(Math.floor(durationSecs / 10), 20),
          xp_earned: reps * 8 + 10, records_broken: [], level_up: false,
          new_level: user?.level || 1, dna: user?.dna,
        });
        playAcceptPing();
      }
    } catch (e) {
      setScanResult({
        reps_completed: reps, quality_score: quality, xp_earned: reps * 5,
        base_xp: reps * 5, quality_multiplier: 1, gold_bonus: 0, time_bonus: 0,
        records_broken: [], level_up: false, new_level: user?.level || 1,
      });
    }
    setPhase('results');
  };

  const handleResultClose = () => {
    setPhase('bioscan');
    setScanResult(null); setSessionId(null); setMotionState(null); setTimer(0);
  };

  useEffect(() => () => { stopSensors(); }, []);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="nexus-trigger-screen">
      <StatusBar barStyle="light-content" />

      <View style={styles.cameraSimulation} nativeID="nexus-camera-bg" />
      <CyberGrid pulse={gridPulse} phase={phase} />
      <ScanLine active={phase === 'scanning'} />

      {phase === 'scanning' && motionState && (
        <SensorSkeleton pose={motionState.skeletonPose} exerciseType={exercise} goldFlash={goldFlash} />
      )}

      {/* Top HUD */}
      <View style={[styles.topHud, { top: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => { stopSensors(); router.back(); }} style={styles.closeBtn}>
          <Text style={styles.closeText}>{'\u2715'}</Text>
        </TouchableOpacity>
        <View style={styles.hudCenter}>
          <View style={styles.liveIndicator}>
            <View style={[styles.liveDot, phase === 'scanning' && { backgroundColor: '#FF3B30' }]} />
            <Text style={styles.liveText}>
              {phase === 'scanning' ? 'RECORDING' : phase === 'results' ? 'COMPLETE' : phase === 'bioscan' ? 'INITIALIZING' : 'NEXUS READY'}
            </Text>
          </View>
        </View>
        <View style={styles.closeBtn}>
          <Text style={styles.hudFps}>{phase === 'scanning' ? '30Hz' : '\u2014'}</Text>
        </View>
      </View>

      {/* ===== BIO-SCAN PHASE ===== */}
      {phase === 'bioscan' && <BioScanTrigger onComplete={handleBioScanComplete} />}

      {/* ===== SCANNING HUD ===== */}
      {phase === 'scanning' && motionState && (
        <>
          <View style={styles.repCounterWrap}>
            <Text style={styles.repCounterVal}>{motionState.reps}</Text>
            <Text style={styles.repCounterLabel}>REPS</Text>
          </View>

          <View style={styles.timerWrap}>
            <Text style={styles.timerText}>{formatTime(timer)}</Text>
          </View>

          <View style={styles.qualityBar}>
            <View style={styles.qualityTrack}>
              <View style={[styles.qualityFill, { height: `${motionState.quality}%` as any }]} />
            </View>
            <Text style={styles.qualityVal}>{motionState.quality}</Text>
            <Text style={styles.qualityLabel}>Q</Text>
          </View>

          {motionState.lastRepQuality > 0 && (
            <View style={styles.lastRepBadge}>
              <Text style={styles.lastRepText}>
                {motionState.lastRepQuality >= 80 ? '\ud83d\udd25 GOLD' :
                  motionState.lastRepQuality >= 60 ? '\u26a1 BUONO' : '\ud83d\udcaa OK'}
              </Text>
            </View>
          )}

          <View style={styles.xpAccumWrap}>
            <Text style={styles.xpAccumVal}>+{motionState.reps * 5} XP</Text>
          </View>

          {/* MINI DNA RADAR */}
          <MiniDNARadar dna={user?.dna} isExplosive={isExplosive} />

          {!motionState.isInFrame && (
            <View style={styles.outOfFrameWarn}>
              <Text style={styles.outOfFrameText}>{'\u26a0\ufe0f'} ATHLETE OUT OF FRAME</Text>
              <Text style={styles.outOfFrameSub}>REALIGN TO KORE</Text>
            </View>
          )}

          <View style={styles.exerciseLabel}>
            <Text style={styles.exerciseLabelText}>
              {exercise === 'squat' ? '\ud83c\udfcb\ufe0f DEEP SQUAT' : '\ud83e\udd4a EXPLOSIVE PUNCH'}
            </Text>
          </View>

          <TouchableOpacity
            testID="nexus-stop-btn"
            style={[styles.stopBtn, { bottom: insets.bottom + 16 }]}
            onPress={handleStopSession}
          >
            <View style={styles.stopInner}>
              <View style={styles.stopSquare} />
            </View>
            <Text style={styles.stopLabel}>TERMINA SESSIONE</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ===== SELECT PHASE ===== */}
      {phase === 'select' && (
        <View style={styles.centerContent}>
          <ExerciseSelector onSelect={handleSelectExercise} />
        </View>
      )}

      {/* ===== COUNTDOWN ===== */}
      {phase === 'countdown' && <Countdown onComplete={handleCountdownComplete} />}

      {/* Bottom HUD */}
      {phase !== 'results' && phase !== 'countdown' && phase !== 'bioscan' && (
        <View style={[styles.bottomHud, { bottom: phase === 'scanning' ? insets.bottom + 70 : insets.bottom + 16 }]}>
          <View style={styles.hudStat}>
            <Text style={styles.hudStatLabel}>SPORT</Text>
            <Text style={styles.hudStatVal}>{user?.sport?.toUpperCase() || '\u2014'}</Text>
          </View>
          <View style={styles.hudStat}>
            <Text style={styles.hudStatLabel}>LVL</Text>
            <Text style={[styles.hudStatVal, { color: '#D4AF37' }]}>{user?.level || 1}</Text>
          </View>
          <View style={styles.hudStat}>
            <Text style={styles.hudStatLabel}>XP</Text>
            <Text style={[styles.hudStatVal, { color: '#D4AF37' }]}>{user?.xp || 0}</Text>
          </View>
        </View>
      )}

      {/* CINEMA RESULTS */}
      <CinemaResults visible={phase === 'results'} result={scanResult} user={user} onClose={handleResultClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  cameraSimulation: { ...StyleSheet.absoluteFillObject, backgroundColor: '#080808' },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 3, zIndex: 10 },
  scanLineGradient: { flex: 1, backgroundColor: '#00F2FF' },
  topHud: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, zIndex: 20 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#888', fontSize: 22, fontWeight: '300' },
  hudCenter: { alignItems: 'center' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00F2FF' },
  liveText: { color: '#00F2FF', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  hudFps: { color: '#555', fontSize: 10, fontWeight: '700' },
  centerContent: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 15 },
  repCounterWrap: { position: 'absolute', top: 100, left: 0, right: 0, alignItems: 'center', zIndex: 30 },
  repCounterVal: { color: '#D4AF37', fontSize: 72, fontWeight: '900', letterSpacing: -3 },
  repCounterLabel: { color: '#D4AF37', fontSize: 10, fontWeight: '700', letterSpacing: 4, marginTop: -8 },
  timerWrap: { position: 'absolute', top: 80, left: 20, zIndex: 30 },
  timerText: { color: '#00F2FF', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  qualityBar: { position: 'absolute', right: 16, top: SCREEN_H * 0.25, alignItems: 'center', gap: 4, zIndex: 30 },
  qualityTrack: { width: 6, height: 120, backgroundColor: 'rgba(0,242,255,0.1)', borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end' },
  qualityFill: { width: '100%', backgroundColor: '#00F2FF', borderRadius: 3 },
  qualityVal: { color: '#00F2FF', fontSize: 16, fontWeight: '900' },
  qualityLabel: { color: '#555', fontSize: 8, fontWeight: '700' },
  lastRepBadge: { position: 'absolute', top: 200, left: 0, right: 0, alignItems: 'center', zIndex: 30 },
  lastRepText: { color: '#D4AF37', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  xpAccumWrap: { position: 'absolute', top: 80, right: 16, zIndex: 30 },
  xpAccumVal: { color: '#D4AF37', fontSize: 14, fontWeight: '800' },
  outOfFrameWarn: {
    position: 'absolute', top: SCREEN_H * 0.55, left: 20, right: 20,
    backgroundColor: 'rgba(0,242,255,0.12)', borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.4)', padding: 14, alignItems: 'center', zIndex: 35,
  },
  outOfFrameText: { color: '#00F2FF', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  outOfFrameSub: { color: '#00F2FF', fontSize: 9, fontWeight: '600', letterSpacing: 1, opacity: 0.7, marginTop: 3 },
  exerciseLabel: { position: 'absolute', top: SCREEN_H * 0.65, left: 0, right: 0, alignItems: 'center', zIndex: 30 },
  exerciseLabelText: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  stopBtn: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 30 },
  stopInner: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,59,48,0.15)', borderWidth: 3, borderColor: '#FF3B30',
    alignItems: 'center', justifyContent: 'center',
  },
  stopSquare: { width: 20, height: 20, borderRadius: 4, backgroundColor: '#FF3B30' },
  stopLabel: { color: '#FF3B30', fontSize: 9, fontWeight: '700', letterSpacing: 2, marginTop: 6 },
  bottomHud: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 32, zIndex: 20 },
  hudStat: { alignItems: 'center', gap: 2 },
  hudStatLabel: { color: '#555', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  hudStatVal: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});
