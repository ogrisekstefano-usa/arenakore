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
} from 'react-native-reanimated';
import Svg, { Line, Rect, Circle, Text as SvgText, G, Ellipse } from 'react-native-svg';
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
// CYBER GRID OVERLAY
// =====================
function CyberGrid({ pulse }: { pulse: Animated.SharedValue<number> }) {
  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.15, 0.4]),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]} pointerEvents="none">
      <Svg width={SCREEN_W} height={SCREEN_H}>
        {Array.from({ length: COLS + 1 }).map((_, i) => (
          <Line key={`v-${i}`} x1={i * GRID_SIZE} y1={0} x2={i * GRID_SIZE} y2={SCREEN_H}
            stroke="#00F2FF" strokeWidth={0.5} opacity={0.3} />
        ))}
        {Array.from({ length: ROWS + 1 }).map((_, i) => (
          <Line key={`h-${i}`} x1={0} y1={i * GRID_SIZE} x2={SCREEN_W} y2={i * GRID_SIZE}
            stroke="#00F2FF" strokeWidth={0.5} opacity={0.3} />
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
// SENSOR SKELETON — Animated Cyan body that reacts to sensors
// =====================
function SensorSkeleton({ pose, exerciseType }: { pose: SkeletonPose; exerciseType: ExerciseType }) {
  const cx = SCREEN_W / 2;
  const baseY = SCREEN_H * 0.38;
  const glowOpacity = 0.3 + pose.intensity * 0.7;

  // Calculate joint positions based on sensor data
  const headY = baseY - 90 + pose.torsoTilt * 10;
  const shoulderY = baseY - 55 + pose.torsoTilt * 8;
  const hipY = baseY + 20 + pose.hipDrop * 35;
  const kneeY = hipY + 60 - pose.kneeAngle * 25;
  const footY = kneeY + 55 + pose.kneeAngle * 10;

  // Arm positions
  const shoulderSpread = 35;
  const elbowSpread = 50 + pose.armExtension * 30;
  const handSpread = 55 + pose.armExtension * 60;
  const elbowY = shoulderY + 40 - pose.armExtension * 15;
  const handY = elbowY + 35 - pose.armExtension * 20;

  // Rotation offset
  const rotOff = pose.shoulderRotation * 8;

  const joints = [
    // Head
    { x: cx + rotOff, y: headY, r: 12 },
    // Neck
    { x: cx + rotOff, y: headY + 18 },
    // Shoulders
    { x: cx - shoulderSpread + rotOff, y: shoulderY },
    { x: cx + shoulderSpread + rotOff, y: shoulderY },
    // Elbows
    { x: cx - elbowSpread + rotOff * 0.5, y: elbowY },
    { x: cx + elbowSpread + rotOff * 0.5, y: elbowY },
    // Hands
    { x: cx - handSpread + rotOff * 0.3, y: handY },
    { x: cx + handSpread + rotOff * 0.3, y: handY },
    // Hip center
    { x: cx, y: hipY },
    // Hips
    { x: cx - 20, y: hipY },
    { x: cx + 20, y: hipY },
    // Knees
    { x: cx - 22, y: kneeY },
    { x: cx + 22, y: kneeY },
    // Feet
    { x: cx - 25, y: footY },
    { x: cx + 25, y: footY },
  ];

  // Bone connections [from, to]
  const bones = [
    [0, 1],   // head-neck
    [1, 2], [1, 3],   // neck-shoulders
    [2, 4], [3, 5],   // shoulders-elbows
    [4, 6], [5, 7],   // elbows-hands
    [1, 8],            // neck-hip center
    [8, 9], [8, 10],  // hip center-hips
    [9, 11], [10, 12], // hips-knees
    [11, 13], [12, 14], // knees-feet
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={SCREEN_W} height={SCREEN_H}>
        {/* Glow circles behind major joints */}
        <Circle cx={joints[0].x} cy={joints[0].y} r={20}
          fill="#00F2FF" opacity={glowOpacity * 0.15} />
        <Circle cx={joints[8].x} cy={joints[8].y} r={16}
          fill="#00F2FF" opacity={glowOpacity * 0.1} />

        {/* Bones */}
        {bones.map(([from, to], i) => (
          <Line key={`bone-${i}`}
            x1={joints[from].x} y1={joints[from].y}
            x2={joints[to].x} y2={joints[to].y}
            stroke="#00F2FF" strokeWidth={2.5}
            opacity={glowOpacity}
            strokeLinecap="round"
          />
        ))}

        {/* Joints */}
        {joints.map((j, i) => (
          <G key={`joint-${i}`}>
            <Circle cx={j.x} cy={j.y} r={i === 0 ? 10 : 5}
              fill="#00F2FF" opacity={glowOpacity * 0.8} />
            <Circle cx={j.x} cy={j.y} r={i === 0 ? 12 : 7}
              stroke="#00F2FF" strokeWidth={1} fill="none"
              opacity={glowOpacity * 0.4} />
          </G>
        ))}

        {/* Data overlay text */}
        <SvgText x={cx - 60} y={baseY - 120} fill="#00F2FF" fontSize={8}
          fontWeight="bold" opacity={0.5}>
          KEYPOINTS: 17 · TRACKING: ACTIVE
        </SvgText>
      </Svg>
    </View>
  );
}

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
          <Text style={sel$.icon}>🏋️</Text>
          <Text style={sel$.name}>DEEP SQUAT</Text>
          <Text style={sel$.desc}>Forza · Resistenza · Potenza</Text>
        </TouchableOpacity>
        <TouchableOpacity style={sel$.card} onPress={() => onSelect('punch')} activeOpacity={0.85}>
          <Text style={sel$.icon}>🥊</Text>
          <Text style={sel$.name}>EXPLOSIVE PUNCH</Text>
          <Text style={sel$.desc}>Velocità · Potenza · Agilità</Text>
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
// RESULTS MODAL
// =====================
function ResultsModal({ visible, result, onClose }: { visible: boolean; result: any; onClose: () => void }) {
  const slideY = useSharedValue(300);
  const fadeIn = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      slideY.value = withSpring(0, { damping: 15, stiffness: 100 });
      fadeIn.value = withTiming(1, { duration: 400 });
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }], opacity: fadeIn.value,
  }));

  if (!visible || !result) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={res$.backdrop}>
        <Animated.View style={[res$.card, containerStyle]}>
          <Text style={res$.title}>⚡ SESSIONE COMPLETATA</Text>

          <View style={res$.scoreCircle}>
            <Text style={res$.scoreVal}>{result.quality_score || '—'}</Text>
            <Text style={res$.scoreLabel}>QUALITÀ</Text>
          </View>

          <View style={res$.statsRow}>
            <View style={res$.stat}>
              <Text style={res$.statVal}>{result.reps_completed}</Text>
              <Text style={res$.statLabel}>REPS</Text>
            </View>
            <View style={res$.stat}>
              <Text style={[res$.statVal, { color: '#D4AF37' }]}>+{result.xp_earned}</Text>
              <Text style={res$.statLabel}>XP TOTALI</Text>
            </View>
            <View style={res$.stat}>
              <Text style={[res$.statVal, { color: '#D4AF37' }]}>x{result.quality_multiplier}</Text>
              <Text style={res$.statLabel}>MULTI</Text>
            </View>
          </View>

          <View style={res$.breakdownRow}>
            <Text style={res$.breakdownText}>Base: +{result.base_xp}</Text>
            <Text style={res$.breakdownText}>Gold Bonus: +{result.gold_bonus}</Text>
            <Text style={res$.breakdownText}>Tempo: +{result.time_bonus}</Text>
          </View>

          {result.records_broken?.length > 0 && (
            <View style={res$.recordBanner}>
              <Text style={res$.recordTitle}>🏆 RECORD INFRANTI!</Text>
              <Text style={res$.recordList}>{result.records_broken.join(' · ')}</Text>
            </View>
          )}

          {result.level_up && (
            <View style={res$.levelBanner}>
              <Text style={res$.levelText}>🌟 LEVEL UP! → LVL {result.new_level}</Text>
            </View>
          )}

          {result.dna && (
            <View style={res$.dnaRow}>
              {Object.entries(result.dna).map(([k, v]: [string, any]) => (
                <View key={k} style={res$.dnaItem}>
                  <Text style={res$.dnaVal}>{Math.round(v)}</Text>
                  <Text style={res$.dnaLabel}>{k.slice(0, 3).toUpperCase()}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={res$.closeBtn} onPress={onClose}>
            <Text style={res$.closeBtnText}>CHIUDI</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const res$ = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(5,5,5,0.9)' },
  card: {
    width: SCREEN_W * 0.88, backgroundColor: '#111', borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.3)',
  },
  title: { color: '#00F2FF', fontSize: 11, fontWeight: '800', letterSpacing: 4, marginBottom: 16 },
  scoreCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(0,242,255,0.06)', borderWidth: 2.5, borderColor: '#00F2FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  scoreVal: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  scoreLabel: { color: '#00F2FF', fontSize: 7, fontWeight: '700', letterSpacing: 2 },
  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginBottom: 12 },
  stat: { alignItems: 'center', gap: 3 },
  statVal: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#555', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  breakdownRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
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

  // Phase: select → countdown → scanning → results
  const [phase, setPhase] = useState<'select' | 'countdown' | 'scanning' | 'results'>('select');
  const [exercise, setExercise] = useState<ExerciseType>('squat');
  const [motionState, setMotionState] = useState<MotionState | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);

  const analyzerRef = useRef<MotionAnalyzer | null>(null);
  const accelSubRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

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

  // Handle exercise selection
  const handleSelectExercise = (ex: ExerciseType) => {
    setExercise(ex);
    setPhase('countdown');
  };

  // Start session after countdown
  const handleCountdownComplete = async () => {
    setPhase('scanning');

    // Start backend session
    try {
      if (token) {
        const session = await api.startNexusSession({ exercise_type: exercise }, token);
        setSessionId(session.session_id);
      }
    } catch (e) {
      console.log('Session start error:', e);
    }

    // Initialize motion analyzer
    analyzerRef.current = new MotionAnalyzer(exercise);

    // Start timer
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimer(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // Start accelerometer
    startSensors();
  };

  const startSensors = () => {
    if (Platform.OS !== 'web') {
      // Native only: use platform-specific accelerometer module
      try {
        const { startAccelerometer } = require('../../utils/nativeSensors');
        accelSubRef.current = startAccelerometer((data: any) => {
          if (analyzerRef.current) {
            const state = analyzerRef.current.processAccelerometer(data);
            setMotionState({ ...state });
          }
        });
      } catch (e) {
        console.log('Accelerometer not available on native');
      }
    }
    // Web simulation is handled by useEffect below
  };

  // ========== WEB SIMULATION via REFS ==========
  // Use ref to avoid closure issues with setInterval
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
          d.reps++;
          d.lastRepTick = d.tick;
          const q = 65 + Math.random() * 30;
          d.qualities.push(q);
          d.quality = Math.round(d.qualities.reduce((a, b) => a + b) / d.qualities.length);
        }
      } else {
        const cyclePos = t % 1.3;
        if (cyclePos < 0.12) {
          const prog = cyclePos / 0.12;
          x = 4.5 * Math.sin(prog * Math.PI);
          z = 3.0 * Math.sin(prog * Math.PI);
        } else {
          x = Math.sin(t * 4) * 0.03;
          z = 0.02;
        }
        if (cyclePos > 0.04 && cyclePos < 0.08 && (d.tick - d.lastRepTick) > 25) {
          d.reps++;
          d.lastRepTick = d.tick;
          const q = 60 + Math.random() * 35;
          d.qualities.push(q);
          d.quality = Math.round(d.qualities.reduce((a, b) => a + b) / d.qualities.length);
        }
      }

      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const lastQ = d.qualities.length > 0 ? Math.round(d.qualities[d.qualities.length - 1]) : 0;

      setMotionState({
        reps: d.reps,
        quality: d.quality,
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
    }, 50); // 20Hz for smoother state updates

    return () => clearInterval(simInterval);
  }, [phase, exercise]);

  const stopSensors = () => {
    if (accelSubRef.current) {
      accelSubRef.current.remove();
      accelSubRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Complete session
  const handleStopSession = async () => {
    stopSensors();

    const durationSecs = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const reps = motionState?.reps || 0;
    const quality = motionState?.quality || 50;
    const peakAccel = motionState?.peakAcceleration || 0;
    const avgAmp = motionState?.avgAmplitude || 0;

    // Haptic
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      if (token && sessionId) {
        const result = await api.completeNexusSession(sessionId, {
          exercise_type: exercise,
          reps_completed: reps,
          quality_score: quality,
          duration_seconds: durationSecs,
          peak_acceleration: peakAccel,
          avg_amplitude: avgAmp,
        }, token);

        setScanResult(result);

        if (result.user) updateUser(result.user);
        if (result.records_broken?.length > 0) playRecordBroken();
        else playAcceptPing();
      } else {
        // Demo mode fallback
        setScanResult({
          exercise_type: exercise,
          reps_completed: reps,
          quality_score: quality,
          base_xp: reps * 5,
          quality_multiplier: 1 + (quality / 100) * 2,
          gold_bonus: quality >= 80 ? reps * 2 : 0,
          time_bonus: Math.min(Math.floor(durationSecs / 10), 20),
          xp_earned: reps * 8 + 10,
          records_broken: [],
          level_up: false,
          new_level: user?.level || 1,
          dna: user?.dna,
        });
        playAcceptPing();
      }
    } catch (e) {
      console.log('Session complete error:', e);
      setScanResult({
        reps_completed: reps,
        quality_score: quality,
        xp_earned: reps * 5,
        base_xp: reps * 5,
        quality_multiplier: 1,
        gold_bonus: 0,
        time_bonus: 0,
        records_broken: [],
        level_up: false,
        new_level: user?.level || 1,
      });
    }

    setPhase('results');
  };

  const handleResultClose = () => {
    setPhase('select');
    setScanResult(null);
    setSessionId(null);
    setMotionState(null);
    setTimer(0);
  };

  // Cleanup on unmount
  useEffect(() => () => { stopSensors(); }, []);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="nexus-trigger-screen">
      <StatusBar barStyle="light-content" />

      {/* Dark camera background */}
      <View style={styles.cameraSimulation} />

      {/* Cyber Grid */}
      <CyberGrid pulse={gridPulse} />

      {/* Scan Line during scanning */}
      <ScanLine active={phase === 'scanning'} />

      {/* Sensor Skeleton during scanning */}
      {phase === 'scanning' && motionState && (
        <SensorSkeleton pose={motionState.skeletonPose} exerciseType={exercise} />
      )}

      {/* Top HUD */}
      <View style={[styles.topHud, { top: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => { stopSensors(); router.back(); }} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.hudCenter}>
          <View style={styles.liveIndicator}>
            <View style={[styles.liveDot, phase === 'scanning' && { backgroundColor: '#FF3B30' }]} />
            <Text style={styles.liveText}>
              {phase === 'scanning' ? 'RECORDING' : phase === 'results' ? 'COMPLETE' : 'NEXUS READY'}
            </Text>
          </View>
        </View>
        <View style={styles.closeBtn}>
          <Text style={styles.hudFps}>{phase === 'scanning' ? '30Hz' : '—'}</Text>
        </View>
      </View>

      {/* ===== SCANNING HUD ===== */}
      {phase === 'scanning' && motionState && (
        <>
          {/* REP COUNTER — Gold, large, top center */}
          <View style={styles.repCounterWrap}>
            <Text style={styles.repCounterVal}>{motionState.reps}</Text>
            <Text style={styles.repCounterLabel}>REPS</Text>
          </View>

          {/* Timer */}
          <View style={styles.timerWrap}>
            <Text style={styles.timerText}>{formatTime(timer)}</Text>
          </View>

          {/* Quality meter — right side */}
          <View style={styles.qualityBar}>
            <View style={styles.qualityTrack}>
              <View style={[styles.qualityFill, { height: `${motionState.quality}%` as any }]} />
            </View>
            <Text style={styles.qualityVal}>{motionState.quality}</Text>
            <Text style={styles.qualityLabel}>Q</Text>
          </View>

          {/* Last rep quality */}
          {motionState.lastRepQuality > 0 && (
            <View style={styles.lastRepBadge}>
              <Text style={styles.lastRepText}>
                {motionState.lastRepQuality >= 80 ? '🔥 GOLD' :
                  motionState.lastRepQuality >= 60 ? '⚡ BUONO' : '💪 OK'}
              </Text>
            </View>
          )}

          {/* XP accumulation */}
          <View style={styles.xpAccumWrap}>
            <Text style={styles.xpAccumVal}>+{motionState.reps * 5} XP</Text>
          </View>

          {/* OUT OF FRAME WARNING */}
          {!motionState.isInFrame && (
            <View style={styles.outOfFrameWarn}>
              <Text style={styles.outOfFrameText}>⚠️ ATHLETE OUT OF FRAME</Text>
              <Text style={styles.outOfFrameSub}>REALIGN TO KORE</Text>
            </View>
          )}

          {/* Exercise indicator */}
          <View style={styles.exerciseLabel}>
            <Text style={styles.exerciseLabelText}>
              {exercise === 'squat' ? '🏋️ DEEP SQUAT' : '🥊 EXPLOSIVE PUNCH'}
            </Text>
          </View>

          {/* Stop button */}
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

      {/* Bottom HUD (shown in select/scanning) */}
      {phase !== 'results' && phase !== 'countdown' && (
        <View style={[styles.bottomHud, { bottom: phase === 'scanning' ? insets.bottom + 70 : insets.bottom + 16 }]}>
          <View style={styles.hudStat}>
            <Text style={styles.hudStatLabel}>SPORT</Text>
            <Text style={styles.hudStatVal}>{user?.sport?.toUpperCase() || '—'}</Text>
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

      {/* Results Modal */}
      <ResultsModal visible={phase === 'results'} result={scanResult} onClose={handleResultClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  cameraSimulation: { ...StyleSheet.absoluteFillObject, backgroundColor: '#080808' },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 3, zIndex: 10 },
  scanLineGradient: { flex: 1, backgroundColor: '#00F2FF' },

  // Top HUD
  topHud: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, zIndex: 20 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#888', fontSize: 22, fontWeight: '300' },
  hudCenter: { alignItems: 'center' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00F2FF' },
  liveText: { color: '#00F2FF', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  hudFps: { color: '#555', fontSize: 10, fontWeight: '700' },

  // Center content
  centerContent: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 15 },

  // REP COUNTER — Gold, large
  repCounterWrap: {
    position: 'absolute', top: 100, left: 0, right: 0,
    alignItems: 'center', zIndex: 30,
  },
  repCounterVal: { color: '#D4AF37', fontSize: 72, fontWeight: '900', letterSpacing: -3 },
  repCounterLabel: { color: '#D4AF37', fontSize: 10, fontWeight: '700', letterSpacing: 4, marginTop: -8 },

  // Timer
  timerWrap: { position: 'absolute', top: 80, left: 20, zIndex: 30 },
  timerText: { color: '#00F2FF', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // Quality bar — right side vertical
  qualityBar: { position: 'absolute', right: 16, top: SCREEN_H * 0.25, alignItems: 'center', gap: 4, zIndex: 30 },
  qualityTrack: {
    width: 6, height: 120, backgroundColor: 'rgba(0,242,255,0.1)', borderRadius: 3,
    overflow: 'hidden', justifyContent: 'flex-end',
  },
  qualityFill: { width: '100%', backgroundColor: '#00F2FF', borderRadius: 3 },
  qualityVal: { color: '#00F2FF', fontSize: 16, fontWeight: '900' },
  qualityLabel: { color: '#555', fontSize: 8, fontWeight: '700' },

  // Last rep badge
  lastRepBadge: {
    position: 'absolute', top: 200, left: 0, right: 0,
    alignItems: 'center', zIndex: 30,
  },
  lastRepText: { color: '#D4AF37', fontSize: 12, fontWeight: '800', letterSpacing: 2 },

  // XP accumulation
  xpAccumWrap: { position: 'absolute', top: 80, right: 16, zIndex: 30 },
  xpAccumVal: { color: '#D4AF37', fontSize: 14, fontWeight: '800' },

  // Out of frame warning
  outOfFrameWarn: {
    position: 'absolute', top: SCREEN_H * 0.55, left: 20, right: 20,
    backgroundColor: 'rgba(0,242,255,0.12)', borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.4)',
    padding: 14, alignItems: 'center', zIndex: 35,
  },
  outOfFrameText: { color: '#00F2FF', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  outOfFrameSub: { color: '#00F2FF', fontSize: 9, fontWeight: '600', letterSpacing: 1, opacity: 0.7, marginTop: 3 },

  // Exercise label
  exerciseLabel: {
    position: 'absolute', top: SCREEN_H * 0.65, left: 0, right: 0,
    alignItems: 'center', zIndex: 30,
  },
  exerciseLabelText: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 2 },

  // Stop button
  stopBtn: {
    position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 30,
  },
  stopInner: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,59,48,0.15)', borderWidth: 3, borderColor: '#FF3B30',
    alignItems: 'center', justifyContent: 'center',
  },
  stopSquare: { width: 20, height: 20, borderRadius: 4, backgroundColor: '#FF3B30' },
  stopLabel: { color: '#FF3B30', fontSize: 9, fontWeight: '700', letterSpacing: 2, marginTop: 6 },

  // Bottom HUD
  bottomHud: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 32, zIndex: 20 },
  hudStat: { alignItems: 'center', gap: 2 },
  hudStatLabel: { color: '#555', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  hudStatVal: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});
