/**
 * ARENAKORE LEGACY INITIATION — STEP 2
 * NEXUS 5-BEAT BIO-SCAN: Human-Centric HUD (Minority Report / Iron Man)
 * Camera Live + Puppet-Motion-Deck Overlay + 5 I-Beats + HUD Data + Gold Flash
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, StatusBar, useWindowDimensions, Platform,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Circle, Rect, Text as SvgText, G, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue, withTiming, withSequence, withRepeat, withDelay,
  useAnimatedStyle, FadeIn, FadeInDown, Easing, runOnJS,
} from 'react-native-reanimated';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { api } from '../../utils/api';
import { NexusPoseEngine, type PoseData, type LandmarkPoint } from '../../components/NexusPoseEngine';

// ===================================================================
// PUPPET-MOTION-DECK: 17-POINT COCO SKELETON
// ===================================================================
// Positions as % of scan area — STANDING NEUTRAL (T-pose relaxed)
const POSE_NEUTRAL: [number, number][] = [
  [50, 8],   // 0: nose
  [47, 6],   // 1: left eye
  [53, 6],   // 2: right eye
  [43, 10],  // 3: left ear
  [57, 10],  // 4: right ear
  [36, 22],  // 5: left shoulder
  [64, 22],  // 6: right shoulder
  [28, 36],  // 7: left elbow
  [72, 36],  // 8: right elbow
  [22, 50],  // 9: left wrist
  [78, 50],  // 10: right wrist
  [40, 54],  // 11: left hip
  [60, 54],  // 12: right hip
  [39, 70],  // 13: left knee
  [61, 70],  // 14: right knee
  [38, 86],  // 15: left ankle
  [62, 86],  // 16: right ankle
];

// BEAT 2: Arms raised overhead
const POSE_ARMS_UP: [number, number][] = [
  [50, 8], [47, 6], [53, 6], [43, 10], [57, 10],
  [36, 22], [64, 22],
  [34, 12], [66, 12],   // elbows up
  [40, 2], [60, 2],     // wrists overhead
  [40, 54], [60, 54], [39, 70], [61, 70], [38, 86], [62, 86],
];

// BEAT 3: Arms open (T-pose)
const POSE_ARMS_OPEN: [number, number][] = [
  [50, 8], [47, 6], [53, 6], [43, 10], [57, 10],
  [36, 22], [64, 22],
  [18, 22], [82, 22],   // elbows out
  [8, 22], [92, 22],    // wrists far out
  [40, 54], [60, 54], [39, 70], [61, 70], [38, 86], [62, 86],
];

// BEAT 4: Half squat
const POSE_SQUAT: [number, number][] = [
  [50, 14], [47, 12], [53, 12], [43, 16], [57, 16],
  [36, 28], [64, 28],
  [28, 42], [72, 42],
  [22, 56], [78, 56],
  [40, 58], [60, 58],
  [36, 72], [64, 72],  // knees bent forward
  [38, 88], [62, 88],
];

const CONNECTIONS: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4],
  [3, 5], [4, 6], [5, 6],
  [5, 7], [7, 9],
  [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
];

const POINT_LABELS = [
  'NASO', 'OCC-SX', 'OCC-DX', 'AUR-SX', 'AUR-DX',
  'SPALLA-SX', 'SPALLA-DX', 'GOM-SX', 'GOM-DX',
  'POLSO-SX', 'POLSO-DX', 'ANCA-SX', 'ANCA-DX',
  'GIN-SX', 'GIN-DX', 'CAV-SX', 'CAV-DX',
];

// EMA parameters
const ALPHA = 0.15;
const HYSTERESIS_PX = 3;
const TICK_MS = 60;

// ===================================================================
// BEAT DEFINITIONS
// ===================================================================
type BeatDef = {
  id: number;
  label: string;
  instruction: string;
  targetPose: [number, number][];
  duration: number; // ms
  hudData: { label: string; value: string; position: 'left' | 'right'; yPct: number }[];
};

const BEATS: BeatDef[] = [
  {
    id: 1, label: 'POSA', instruction: 'MANTIENI POSIZIONE NEUTRALE',
    targetPose: POSE_NEUTRAL, duration: 3500,
    hudData: [
      { label: 'STABILITA', value: '98.2%', position: 'left', yPct: 30 },
      { label: 'PUNTI', value: '17/17', position: 'right', yPct: 30 },
      { label: 'BARICENTRO', value: 'CENTRATO', position: 'left', yPct: 55 },
      { label: 'JITTER', value: '< 3PX', position: 'right', yPct: 55 },
    ],
  },
  {
    id: 2, label: 'ALZA', instruction: 'ALZA LE BRACCIA SOPRA LA TESTA',
    targetPose: POSE_ARMS_UP, duration: 3500,
    hudData: [
      { label: 'ANGOLO SPALLE', value: '178\u00B0', position: 'left', yPct: 18 },
      { label: 'DORSALE', value: '12\u00B0', position: 'right', yPct: 25 },
      { label: 'ESTENSIONE', value: '96%', position: 'left', yPct: 42 },
      { label: 'SIMMETRIA', value: '97.4%', position: 'right', yPct: 42 },
    ],
  },
  {
    id: 3, label: 'T-POSE', instruction: 'BRACCIA APERTE — ASSUMI T-POSE',
    targetPose: POSE_ARMS_OPEN, duration: 3500,
    hudData: [
      { label: 'APERTURA', value: '180\u00B0', position: 'left', yPct: 22 },
      { label: 'SIMMETRIA', value: '97%', position: 'right', yPct: 22 },
      { label: 'ALLINEAMENTO', value: 'PERFETTO', position: 'left', yPct: 50 },
      { label: 'TENSIONE', value: '84%', position: 'right', yPct: 50 },
    ],
  },
  {
    id: 4, label: 'SQUAT', instruction: 'ESEGUI MEZZO SQUAT — TIENI',
    targetPose: POSE_SQUAT, duration: 3500,
    hudData: [
      { label: 'FLESS. GINOCCHIA', value: '98%', position: 'left', yPct: 65 },
      { label: 'CENTRO MASSA', value: 'STABILE', position: 'right', yPct: 65 },
      { label: 'ANGOLO SQUAT', value: '82\u00B0', position: 'left', yPct: 45 },
      { label: 'CARICO', value: 'SIMMETRICO', position: 'right', yPct: 45 },
    ],
  },
  {
    id: 5, label: 'DNA', instruction: 'GENERAZIONE KORE DNA...',
    targetPose: POSE_NEUTRAL, duration: 4000,
    hudData: [
      { label: 'VEL', value: '87', position: 'left', yPct: 20 },
      { label: 'FOR', value: '83', position: 'right', yPct: 20 },
      { label: 'RES', value: '91', position: 'left', yPct: 40 },
      { label: 'TEC', value: '88', position: 'right', yPct: 40 },
      { label: 'MEN', value: '94', position: 'left', yPct: 60 },
      { label: 'FLE', value: '79', position: 'right', yPct: 60 },
    ],
  },
];

// ===================================================================
// HUD DATA LABELS (Minority Report floating labels)
// ===================================================================
function HudLabels({ items, scanW, scanH, visible }: { items: BeatDef['hudData']; scanW: number; scanH: number; visible: boolean }) {
  if (!visible) return null;

  return (
    <>
      {items.map((item, i) => {
        const x = item.position === 'left' ? 12 : scanW - 12;
        const y = (item.yPct / 100) * scanH;
        const anchor = item.position === 'left' ? 'start' : 'end';
        const lineX1 = item.position === 'left' ? x + 80 : x - 80;
        const lineX2 = item.position === 'left' ? scanW * 0.35 : scanW * 0.65;

        return (
          <G key={`hud-${i}`} opacity={0.85}>
            {/* Connection line to body area */}
            <Line
              x1={lineX1} y1={y} x2={lineX2} y2={y}
              stroke="#00F2FF" strokeWidth={0.5} strokeDasharray="3,3" opacity={0.3}
            />
            {/* Label background */}
            <Rect
              x={item.position === 'left' ? x - 4 : x - 80}
              y={y - 18}
              width={84} height={32}
              rx={4}
              fill="rgba(0,0,0,0.6)"
              stroke="rgba(0,242,255,0.2)"
              strokeWidth={0.5}
            />
            {/* Label text */}
            <SvgText
              x={x} y={y - 5}
              fill="rgba(0,242,255,0.6)"
              fontSize={7} fontWeight="900"
              textAnchor={anchor}
              letterSpacing={1}
            >
              {item.label}
            </SvgText>
            {/* Value text */}
            <SvgText
              x={x} y={y + 8}
              fill="#FFFFFF"
              fontSize={11} fontWeight="900"
              textAnchor={anchor}
              letterSpacing={0.5}
            >
              {item.value}
            </SvgText>
          </G>
        );
      })}
    </>
  );
}

// ===================================================================
// SCAN LINE OVERLAY (Gold sweeping line)
// ===================================================================
function ScanLineOverlay({ active, scanH }: { active: boolean; scanH: number }) {
  const lineY = useSharedValue(0);

  useEffect(() => {
    if (active) {
      lineY.value = 0;
      lineY.value = withRepeat(
        withTiming(scanH, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
    }
  }, [active, scanH]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lineY.value }],
  }));

  if (!active) return null;

  return (
    <Animated.View style={[scanLine$.container, lineStyle]}>
      <View style={scanLine$.line} />
      <View style={scanLine$.glow} />
    </Animated.View>
  );
}
const scanLine$ = StyleSheet.create({
  container: { position: 'absolute', left: 0, right: 0, height: 3, zIndex: 10 },
  line: { height: 2, backgroundColor: '#D4AF37' },
  glow: {
    height: 20, marginTop: -10,
    backgroundColor: 'rgba(212,175,55,0.15)',
  },
});

// ===================================================================
// BEAT INDICATOR (top pill showing current beat)
// ===================================================================
function BeatIndicator({ currentBeat, totalBeats }: { currentBeat: number; totalBeats: number }) {
  return (
    <View style={bi$.row}>
      {Array.from({ length: totalBeats }, (_, i) => (
        <View
          key={i}
          style={[
            bi$.dot,
            i < currentBeat ? bi$.dotDone : i === currentBeat ? bi$.dotActive : bi$.dotPending,
          ]}
        />
      ))}
    </View>
  );
}
const bi$ = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotDone: { backgroundColor: '#D4AF37' },
  dotActive: { backgroundColor: '#00F2FF', shadowColor: '#00F2FF', shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  dotPending: { backgroundColor: 'rgba(255,255,255,0.1)' },
});

// ===================================================================
// MAIN COMPONENT
// ===================================================================
export default function NexusBioScan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: SW, height: SH } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();

  // Layout
  const HEADER_H = insets.top + 70;
  const FOOTER_H = 140 + insets.bottom;
  const SCAN_W = SW;
  const SCAN_H = SH - HEADER_H - FOOTER_H;

  // ===================================================================
  // STATE — STRICT Biometric Entry Gate (Anti-Ghost Trigger)
  //
  // loading → positioning → verifying → pose_check → countdown → beats → approved
  //
  // POSITIONING: 17 points detected one-by-one (~8-12s). Pulsing "POSITIONING ATHLETE...".
  //   → Only advances when ALL 17 confirmed AND held stable for 1s (confidence gate).
  // VERIFYING: 17/17 detected. Confidence check: skeleton proportions validated for 1s.
  // POSE_CHECK: "BRACCIA LUNGO I FIANCHI — RIMANI IMMOBILE". Athlete must hold neutral
  //   pose with arms at sides for 2 full seconds. Movement resets the 2s timer.
  // COUNTDOWN: 3... 2... 1... If stability < 90% or pose breaks → reset to pose_check.
  // BEATS: 5 I-Beats execute.
  // APPROVED: Gold flash + "KORE DNA GENERATO: APPROVATO!"
  // ===================================================================
  type Phase = 'loading' | 'positioning' | 'verifying' | 'pose_check' | 'countdown' | 'beats' | 'approved';
  const [phase, setPhase] = useState<Phase>('loading');
  const [currentBeat, setCurrentBeat] = useState(0);
  const [detectedPoints, setDetectedPoints] = useState(0);
  const [visibleMask, setVisibleMask] = useState<boolean[]>(new Array(17).fill(false));
  const [stability, setStability] = useState(0);
  const [countdownSec, setCountdownSec] = useState(3);
  const [beatProgress, setBeatProgress] = useState(0);
  const [showHud, setShowHud] = useState(false);
  const [poseHoldTime, setPoseHoldTime] = useState(0);       // 0→2 seconds of neutral hold
  const [confidenceTime, setConfidenceTime] = useState(0);   // 0→1 seconds of 17/17 confidence
  const [poseValid, setPoseValid] = useState(false);          // Is athlete in neutral + still?

  // ── BIOMETRIC GATE: camera must be confirmed ready before detection starts
  const [isScanning, setIsScanning] = useState(false);        // true = camera active, detection enabled
  const [cameraReady, setCameraReady] = useState(false);      // true = CameraView onCameraReady fired

  // ── REAL MEDIAPIPE STATE
  const [realLandmarks, setRealLandmarks] = useState<Array<LandmarkPoint | null> | null>(null);
  const [liveFps, setLiveFps] = useState(0);
  const [centeringWarning, setCenteringWarning] = useState(false);
  const [poseEngineReady, setPoseEngineReady] = useState(false);
  const lastCenterAlertRef = useRef(0);

  // ── SCORE ENGINE REFS & STATE
  // Rolling buffer: last 30 frames of normalized landmark positions (for stability calc)
  const stabilityBufferRef = useRef<Array<Array<{ x: number; y: number }>>>([]);
  const holdTimerRef         = useRef<number | null>(null);
  const usingRealDataRef     = useRef(false);
  const lastRealFrameRef     = useRef(0);
  // pendingApprovalRef: set by Score Engine when 3s hold completes.
  // Checked by a useEffect placed AFTER handleApproval to avoid TDZ.
  const pendingApprovalRef   = useRef(false);
  // poseEngineReadyRef: when true, POSITIONING simulated loop must stop
  const poseEngineReadyRef   = useRef(false);
  // personEntrySinceRef: timestamp when person was first stably detected (3s entry gate)
  const personEntrySinceRef  = useRef<number | null>(null);

  const [poseTimeout, setPoseTimeout]       = useState(false);
  const [koScore, setKoScore]               = useState(0);
  const [holdProgress, setHoldProgress]     = useState(0);
  const [scoreBreakdown, setScoreBreakdown] = useState({ stability: 0, confidence: 0, amplitude: 0 });
  const [triggerApproval, setTriggerApproval] = useState(false); // fires handleApproval asynchronously
  // Refs to read latest score values inside handleApproval (useCallback has [] deps)
  const koScoreRef       = useRef(0);
  const scoreBreakRef    = useRef({ stability: 0, confidence: 0, amplitude: 0 });
  const [cityRef]        = useState('CHICAGO');

  // Keep score refs in sync with state
  useEffect(() => { koScoreRef.current = koScore; }, [koScore]);
  useEffect(() => { scoreBreakRef.current = scoreBreakdown; }, [scoreBreakdown]);

  // Skeleton state
  const ptsRef = useRef<[number, number][]>(
    POSE_NEUTRAL.map(([px, py]) => [
      (px / 100) * SW + (Math.random() - 0.5) * 100,
      (py / 100) * 500 + (Math.random() - 0.5) * 100,
    ])
  );
  const [pts, setPts] = useState<[number, number][]>(ptsRef.current);
  const targetPoseRef = useRef<[number, number][]>(POSE_NEUTRAL);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stabilityRef = useRef(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>('loading');
  const poseHoldStartRef = useRef<number | null>(null);
  const confidenceStartRef = useRef<number | null>(null);
  const isScanningRef = useRef(false); // Sync ref for async callbacks

  // Keep phaseRef in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  // Keep isScanningRef in sync
  useEffect(() => { isScanningRef.current = isScanning; }, [isScanning]);
  // Keep poseEngineReadyRef in sync
  useEffect(() => { poseEngineReadyRef.current = poseEngineReady; }, [poseEngineReady]);

  // ===================================================================
  // SCORE ENGINE — Pure functions (no hooks, safe in callbacks)
  // ===================================================================

  /** Stability: avg std-dev of landmark positions over rolling buffer.
   *  Returns 0 (jitter) → 1 (rock solid). */
  function calcStability(buf: Array<Array<{ x: number; y: number }>>): number {
    if (buf.length < 5) return 0;
    let totalDev = 0;
    const n = buf[0].length;
    for (let k = 0; k < n; k++) {
      const xs = buf.map(f => f[k].x);
      const ys = buf.map(f => f[k].y);
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
      const my = ys.reduce((a, b) => a + b, 0) / ys.length;
      const vx = xs.reduce((a, b) => a + (b - mx) ** 2, 0) / xs.length;
      const vy = ys.reduce((a, b) => a + (b - my) ** 2, 0) / ys.length;
      totalDev += Math.sqrt(vx + vy);
    }
    const avgDev = totalDev / n;
    // Threshold: < 0.002 = perfect, > 0.02 = too jittery
    return Math.max(0, Math.min(1, 1 - avgDev / 0.018));
  }

  /** Amplitude: posture quality measured by shoulder width + torso height ratio. */
  function calcAmplitude(lm: Array<LandmarkPoint | null>): number {
    const lShoulder = lm[5], rShoulder = lm[6];
    const lHip = lm[11],     rHip = lm[12];
    if (!lShoulder || !rShoulder || !lHip || !rHip) return 0;
    // Shoulder span (normalized, ideally 0.25-0.45)
    const spanScore = Math.min(1, Math.abs(rShoulder.x - lShoulder.x) / 0.30);
    // Torso height (shoulder_y to hip_y, ideally 0.20-0.35)
    const torsoH = Math.abs(((lShoulder.y + rShoulder.y) / 2) - ((lHip.y + rHip.y) / 2));
    const torsoScore = Math.min(1, torsoH / 0.25);
    return (spanScore * 0.5 + torsoScore * 0.5);
  }

  // ===================================================================
  // REAL POSE DATA HANDLER — drives skeleton + Score Engine
  // ===================================================================
  const handlePoseData = useCallback(async (data: PoseData) => {
    // CDN TIMEOUT → show manual fallback
    if (data.type === 'timeout') {
      setPoseTimeout(true);
      return;
    }

    // CAMERA DENIED → show explicit permission error, don't proceed without real data
    if (data.type === 'camera_denied') {
      setCameraPermDenied(true);
      setPoseEngineReady(false);
      return;
    }

    // OOM / WASM abort → PARACHUTE: redirect to manual onboarding
    if (data.type === 'oom') {
      router.replace('/onboarding/manual-onboarding');
      return;
    }

    if (data.type === 'ready') {
      setPoseEngineReady(true);
      setCameraReady(true);
      setIsScanning(true);
      usingRealDataRef.current = true;
      return;
    }
    if (data.type === 'error') {
      // Engine error → fallback to simulated
      setCameraReady(true);
      setIsScanning(true);
      return;
    }
    if (data.type !== 'pose') return;

    const { landmarks, fps: newFps, centered, person_detected, visible_count } = data;

    if (newFps && newFps > 0) setLiveFps(newFps);

    lastRealFrameRef.current = Date.now();
    usingRealDataRef.current = true;  // suppress simulated EMA

    if (!landmarks || landmarks.length === 0 || !person_detected) {
      // ── GHOST PREVENTION: ALWAYS clear stale landmarks when person leaves frame.
      // This ensures realLandmarks=null → realPts=null → ZERO skeleton rendered.
      setRealLandmarks(null);
      holdTimerRef.current = null;
      setHoldProgress(0);
      return;
    }

    // ── Update real landmark state (for SVG rendering)
    setRealLandmarks(landmarks);

    // ── REAL MODE: 3-SECOND ENTRY GATE
    // Person must be STABLY detected (visible_count ≥ 12 + centered) for 3 full seconds
    // before POSITIONING advances. This is the biometric wall.
    const ENTRY_REQUIRED_POINTS = 12;   // minimum keypoints to count as "person present"
    const ENTRY_HOLD_MS = 3000;         // must be stable for 3 seconds

    if (phaseRef.current === 'positioning') {
      if ((visible_count ?? 0) >= ENTRY_REQUIRED_POINTS && centered) {
        // Person is in frame and centered → start/continue entry timer
        if (!personEntrySinceRef.current) {
          personEntrySinceRef.current = Date.now();
        }
        const elapsed = Date.now() - personEntrySinceRef.current;
        const progress = Math.min(17, Math.round((elapsed / ENTRY_HOLD_MS) * 17));
        setDetectedPoints(progress);
        setVisibleMask(landmarks.map(l => l !== null && (l.v ?? 0) > 0.4));

        if (elapsed >= ENTRY_HOLD_MS) {
          // 3 seconds achieved → INGRESSO ARENA
          personEntrySinceRef.current = null;
          setDetectedPoints(17);
          // ── HAPTIC: atleta "entrato ufficialmente" nell'Arena
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (_e) {}
          setTimeout(() => {
            if (phaseRef.current !== 'positioning') return;
            confidenceStartRef.current = null;
            setConfidenceTime(0);
            setPhase('verifying');
            stabilityRef.current = 0;
            setStability(0);
          }, 200);
        }
      } else {
        // Person left frame or not centered → RESET entry timer + clear progress
        if (personEntrySinceRef.current) {
          personEntrySinceRef.current = null;
          setDetectedPoints(0);
          setVisibleMask(new Array(17).fill(false));
        }
      }
    }

    // ── SCORE ENGINE ──────────────────────────────────────────────────
    // 1. Update stability buffer (keep last 30 frames)
    const frame2d = landmarks.map(l => ({ x: l?.x ?? 0.5, y: l?.y ?? 0.5 }));
    stabilityBufferRef.current.push(frame2d);
    if (stabilityBufferRef.current.length > 30) {
      stabilityBufferRef.current.shift();
    }

    // 2. Calculate scores
    const stability  = calcStability(stabilityBufferRef.current);
    const confidence = Math.min(1, (visible_count ?? 0) / 17);
    const amplitude  = calcAmplitude(landmarks);

    const kore = Math.round((stability * 0.4 + confidence * 0.4 + amplitude * 0.2) * 100);
    setKoScore(kore);
    setScoreBreakdown({ stability, confidence, amplitude });

    // Update stabilityRef used by pose_check phase
    stabilityRef.current = Math.round(stability * 100);
    setStability(Math.round(stability * 100));
    // ─────────────────────────────────────────────────────────────────

    // ── 3-SECOND HOLD TRIGGER
    // Conditions: confidence > 80% overall AND centered AND in positioning/pose_check phase
    const HOLD_THRESHOLD    = 80;  // kore score must be > 80 to start hold
    const HOLD_DURATION_MS  = 3000;
    const inValidPhase = ['positioning', 'verifying', 'pose_check', 'countdown'].includes(phaseRef.current);

    if (kore > HOLD_THRESHOLD && centered && person_detected && inValidPhase) {
      const now = Date.now();
      if (!holdTimerRef.current) {
        holdTimerRef.current = now;
      }
      const elapsed = now - holdTimerRef.current;
      const progress = Math.min(1, elapsed / HOLD_DURATION_MS);
      setHoldProgress(progress);

      if (elapsed >= HOLD_DURATION_MS && phaseRef.current !== 'beats' && phaseRef.current !== 'approved') {
        // ── GOLD FLASH TRIGGER — 3s hold confirmed ──
        // Set ref flag — checked by useEffect placed AFTER handleApproval to avoid TDZ
        holdTimerRef.current = null;
        setHoldProgress(0);
        pendingApprovalRef.current = true;
        return;
      }
    } else {
      // Reset hold timer if conditions drop
      if (holdTimerRef.current) {
        holdTimerRef.current = null;
        setHoldProgress(0);
      }
    }

    // ── CENTERING WARNING (TTS + gold text)
    if (!centered && person_detected) {
      const now = Date.now();
      if (now - lastCenterAlertRef.current > 4500) {
        lastCenterAlertRef.current = now;
        try {
          Speech.speak("Centrati nell'Arena", { language: 'it-IT', rate: 0.88, pitch: 1.0 });
        } catch (_e) {}
        setCenteringWarning(true);
        setTimeout(() => setCenteringWarning(false), 3000);
      }
    }
  }, []); // stable — uses pendingApprovalRef instead of direct handleApproval call

  // ── Dispatch approval when Score Engine sets the ref flag (avoids TDZ)
  // NOTE: This useEffect intentionally left near handlePoseData so it's close to the trigger logic.
  // The actual handleApproval call is hoisted to a separate effect placed after handleApproval definition.

  // ── Real-to-screen coordinates (MediaPipe normalized → screen pixels)
  const realPts = useMemo<[number, number][] | null>(() => {
    if (!realLandmarks || realLandmarks.length !== 17) return null;
    return realLandmarks.map(l => {
      if (!l) return [SCAN_W / 2, SCAN_H / 2] as [number, number];
      const screenX = (1 - l.x) * SCAN_W;  // mirror horizontally (front camera)
      const screenY = l.y * SCAN_H;
      return [screenX, screenY] as [number, number];
    });
  }, [realLandmarks, SCAN_W, SCAN_H]);

  // Animations
  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const approvedScale = useSharedValue(0.5);
  const approvedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: approvedScale.value }],
    opacity: approvedScale.value > 0.6 ? 1 : 0,
  }));
  const positionPulse = useSharedValue(0.4);
  useEffect(() => {
    positionPulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 700 }), withTiming(0.4, { duration: 700 })),
      -1, false
    );
  }, []);
  const positionPulseStyle = useAnimatedStyle(() => ({ opacity: positionPulse.value }));

  // ── PRIVACY CONSENT — shown before camera activates
  const [showPrivacyConsent, setShowPrivacyConsent] = useState(true);
  const [cameraPermDenied, setCameraPermDenied] = useState(false);

  // ── Request camera permission
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission().then((result) => {
        if (result && !result.granted) {
          setCameraPermDenied(true);
        }
      });
    }
  }, []);

  // ===================================================================
  // EMA SKELETON LOOP — suppressed when real MediaPipe data is flowing
  // ===================================================================
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);

    tickRef.current = setInterval(() => {
      // ── REAL MODE: skip simulated loop if MediaPipe is active
      if (usingRealDataRef.current) {
        // Check if real data is stale (> 1s without a frame = engine stopped)
        if (Date.now() - lastRealFrameRef.current < 1000) return;
        // Stale → fall back to simulated
        usingRealDataRef.current = false;
      }
      const targets = targetPoseRef.current;
      const cur = ptsRef.current;
      let totalJitter = 0;
      let jitterPoints = 0;

      const next: [number, number][] = cur.map(([cx, cy], i) => {
        const isDetected = phaseRef.current === 'positioning' ? visibleMask[i] : true;

        if (!isDetected && phaseRef.current === 'positioning') {
          return [
            cx + (Math.random() - 0.5) * 14,
            cy + (Math.random() - 0.5) * 14,
          ] as [number, number];
        }

        // Noise amplitude per phase
        let noiseAmp = 4;
        if (phaseRef.current === 'verifying') noiseAmp = 2.5;
        if (phaseRef.current === 'pose_check') noiseAmp = 1.8;
        if (phaseRef.current === 'countdown') noiseAmp = 1.2;
        if (phaseRef.current === 'beats') noiseAmp = 3;

        const tx = (targets[i][0] / 100) * SCAN_W + (Math.random() - 0.5) * noiseAmp;
        const ty = (targets[i][1] / 100) * SCAN_H + (Math.random() - 0.5) * noiseAmp;
        const nx = ALPHA * tx + (1 - ALPHA) * cx;
        const ny = ALPHA * ty + (1 - ALPHA) * cy;

        const idealX = (targets[i][0] / 100) * SCAN_W;
        const idealY = (targets[i][1] / 100) * SCAN_H;
        const dist = Math.sqrt((nx - idealX) ** 2 + (ny - idealY) ** 2);
        totalJitter += dist;
        jitterPoints++;

        return [nx, ny] as [number, number];
      });

      ptsRef.current = next;
      setPts([...next]);

      // Stability calculation for verifying / pose_check / countdown
      const calcPhases = ['verifying', 'pose_check', 'countdown'];
      if (jitterPoints > 0 && calcPhases.includes(phaseRef.current)) {
        const avgJitter = totalJitter / jitterPoints;
        const stab = Math.max(0, Math.min(100, Math.round((1 - avgJitter / 10) * 100)));
        stabilityRef.current = Math.round(stabilityRef.current * 0.7 + stab * 0.3);
        setStability(stabilityRef.current);
      }
    }, TICK_MS);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [SCAN_W, SCAN_H, visibleMask]);

  // ===================================================================
  // GATE 1: LOADING → POSITIONING
  // ===================================================================
  useEffect(() => {
    if (phase !== 'loading') return;
    const timer = setTimeout(() => setPhase('positioning'), 1800);
    return () => clearTimeout(timer);
  }, [phase]);

  // ===================================================================
  // GATE 2: POSITIONING — 17-point detection
  // REAL MODE: poseEngineReady=true → this loop does NOT run.
  //   Detection is driven entirely by handlePoseData 3-second entry gate.
  // SIMULATED MODE: poseEngineReady=false → runs the old progressive simulation.
  // ===================================================================
  useEffect(() => {
    if (phase !== 'positioning' || !isScanning) return;
    // ── REAL MODE: MediaPipe WebView is active → skip simulation entirely
    if (poseEngineReadyRef.current) return;

    let count = 0;
    const mask = new Array(17).fill(false);
    const detectionOrder = [5, 6, 11, 12, 0, 7, 8, 13, 14, 9, 10, 15, 16, 1, 2, 3, 4];

    const scheduleNext = () => {
      if (count >= 17) {
        setTimeout(() => {
          if (phaseRef.current !== 'positioning') return;
          confidenceStartRef.current = null;
          setConfidenceTime(0);
          setPhase('verifying');
          stabilityRef.current = 0;
          setStability(0);
        }, 400);
        return;
      }
      const delay = 400 + Math.random() * 250;
      setTimeout(() => {
        if (phaseRef.current !== 'positioning' || !isScanningRef.current) return;
        // Stop simulated loop if real engine became active
        if (poseEngineReadyRef.current) return;
        const idx = detectionOrder[count];
        mask[idx] = true;
        count++;
        setVisibleMask([...mask]);
        setDetectedPoints(count);
        scheduleNext();
      }, delay);
    };

    scheduleNext();
  }, [phase, isScanning, poseEngineReady]); // poseEngineReady in deps stops loop when real engine starts

  // ===================================================================
  // GATE 3: VERIFYING — 17/17 must hold stable with high confidence for 1s
  // If signal "drops" (simulated: stability check), reset to positioning.
  // ===================================================================
  useEffect(() => {
    if (phase !== 'verifying') return;

    const checkInterval = setInterval(() => {
      const stab = stabilityRef.current;

      if (stab >= 85) {
        // Good signal — accumulate confidence
        if (!confidenceStartRef.current) {
          confidenceStartRef.current = Date.now();
        }
        const elapsed = (Date.now() - confidenceStartRef.current) / 1000;
        setConfidenceTime(Math.min(elapsed, 1));

        if (elapsed >= 1.0) {
          // 1 full second of confirmed 17/17 high confidence
          clearInterval(checkInterval);
          setPhase('pose_check');
          poseHoldStartRef.current = null;
          setPoseHoldTime(0);
        }
      } else {
        // Weak signal — reset confidence timer
        confidenceStartRef.current = null;
        setConfidenceTime(0);
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [phase]);

  // ===================================================================
  // GATE 4: POSE_CHECK — "BRACCIA LUNGO I FIANCHI — RIMANI IMMOBILE"
  // Athlete must hold neutral standing pose (arms down) for 2 full seconds.
  // Any significant movement resets the 2s timer instantly.
  // ===================================================================
  useEffect(() => {
    if (phase !== 'pose_check') return;

    const REQUIRED_HOLD_SECONDS = 2;
    const STABILITY_THRESHOLD = 88; // strict

    const checkInterval = setInterval(() => {
      const stab = stabilityRef.current;
      const isStable = stab >= STABILITY_THRESHOLD;

      setPoseValid(isStable);

      if (isStable) {
        if (!poseHoldStartRef.current) {
          poseHoldStartRef.current = Date.now();
        }
        const heldFor = (Date.now() - poseHoldStartRef.current) / 1000;
        setPoseHoldTime(Math.min(heldFor, REQUIRED_HOLD_SECONDS));

        if (heldFor >= REQUIRED_HOLD_SECONDS) {
          // 2 full seconds of immobility confirmed!
          clearInterval(checkInterval);
          setCountdownSec(3);
          setPhase('countdown');
        }
      } else {
        // MOVEMENT DETECTED — reset hold timer instantly
        poseHoldStartRef.current = null;
        setPoseHoldTime(0);
      }
    }, 80);

    return () => clearInterval(checkInterval);
  }, [phase]);

  // ===================================================================
  // GATE 5: COUNTDOWN — 3... 2... 1... Reset to pose_check on movement
  // ===================================================================
  useEffect(() => {
    if (phase !== 'countdown') return;

    let secondsLeft = 3;
    setCountdownSec(3);

    countdownRef.current = setInterval(() => {
      if (stabilityRef.current < 88) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;
        // Reset to pose check — athlete moved!
        poseHoldStartRef.current = null;
        setPoseHoldTime(0);
        setPhase('pose_check');
        return;
      }

      secondsLeft--;
      setCountdownSec(secondsLeft);

      if (secondsLeft <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;

        flashOpacity.value = withSequence(
          withTiming(0.25, { duration: 80 }),
          withTiming(0, { duration: 250 }),
        );

        setPhase('beats');
        setCurrentBeat(0);
        setShowHud(true);
      }
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = null;
    };
  }, [phase]);

  // ===================================================================
  // PHASE: BEATS (5 I-Beats)
  // ===================================================================
  useEffect(() => {
    if (phase !== 'beats') return;
    if (currentBeat >= BEATS.length) {
      handleApproval();
      return;
    }

    const beat = BEATS[currentBeat];
    targetPoseRef.current = beat.targetPose;
    setBeatProgress(0);

    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / beat.duration) * 100);
      setBeatProgress(Math.round(pct));
      if (pct >= 100) {
        clearInterval(progressInterval);
        flashOpacity.value = withSequence(
          withTiming(0.15, { duration: 100 }),
          withTiming(0, { duration: 200 }),
        );
        setTimeout(() => setCurrentBeat(prev => prev + 1), 400);
      }
    }, 50);

    return () => clearInterval(progressInterval);
  }, [phase, currentBeat]);

  // ===================================================================
  // APPROVAL — Quality Check → Gold Flash → Haptics → Save → Navigate
  // ===================================================================
  const handleApproval = useCallback(async () => {
    const finalScore = koScoreRef.current;

    // ── QUALITY GATE: if real MediaPipe data gave a poor score, offer retry
    if (finalScore > 0 && finalScore < 50) {
      Alert.alert(
        'CALIBRAZIONE DISTURBATA',
        `KORE SCORE: ${finalScore}/100\n\nLo scan ha rilevato instabilità eccessiva.\nRiprova per una calibrazione migliore.`,
        [
          {
            text: 'RIPROVA',
            style: 'destructive',
            onPress: () => {
              // Full reset → positioning state
              setPhase('loading');
              setDetectedPoints(0);
              setVisibleMask(new Array(17).fill(false));
              setIsScanning(false);
              setRealLandmarks(null);
              setKoScore(0);
              setHoldProgress(0);
              setPoseEngineReady(false);
              stabilityBufferRef.current = [];
              holdTimerRef.current = null;
              pendingApprovalRef.current = false;
            },
          },
          { text: 'CONTINUA COMUNQUE', style: 'cancel' },
        ],
      );
      return; // wait for user choice
    }

    setPhase('approved');
    setShowHud(false);

    // ── GOLD FLASH visual
    flashOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 500 }),
      withTiming(0.6, { duration: 150 }),
      withTiming(0, { duration: 400 }),
    );

    approvedScale.value = withSequence(
      withTiming(0.5, { duration: 0 }),
      withDelay(300, withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) })),
    );

    // ── HAPTIC COUNTDOWN: micro-vibration ogni secondo (3-2-1 SUCCESS)
    // L'atleta sente fisicamente la pressione del successo
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);    // LOCK
      await new Promise(r => setTimeout(r, 1000));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);    // 3...
      await new Promise(r => setTimeout(r, 1000));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);   // 2...
      await new Promise(r => setTimeout(r, 1000));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // 1 → CERTIFIED
    } catch (_e) {
      // Haptics fallback — non-blocking
    }

    // ── INDESTRUCTIBLE SCAN RESULT SAVE
    // 1. Save to AsyncStorage immediately (offline-safe backup)
    // 2. Try API twice with token (if logged in)
    // 3. If API fails both times: data stays in AsyncStorage for next sync
    const scanPayload = {
      kore_score: koScoreRef.current > 0 ? koScoreRef.current : 74,
      stability:  Math.max(0, Math.min(100, Math.round(scoreBreakRef.current.stability * 100))),
      amplitude:  Math.max(0, Math.min(100, Math.round(scoreBreakRef.current.amplitude * 100))),
      city:       cityRef,
      scan_date:  new Date().toISOString(),
    };

    try {
      // Always save locally first
      await AsyncStorage.setItem('@kore_pending_dna',  JSON.stringify({
        velocita: 87, forza: 83, resistenza: 91, tecnica: 88, mentalita: 94, flessibilita: 79,
      }));
      await AsyncStorage.setItem('@kore_scan_result',  JSON.stringify(scanPayload));
      await AsyncStorage.setItem('@kore_pending_scan', JSON.stringify(scanPayload));

      // Try API (with 2 attempts for indestructibility)
      const savedToken = await AsyncStorage.getItem('@arenakore_token');
      if (savedToken) {
        let saved = false;
        for (let attempt = 0; attempt < 2 && !saved; attempt++) {
          try {
            await api.saveScanResult(scanPayload, savedToken);
            saved = true;
            await AsyncStorage.removeItem('@kore_pending_scan'); // clear backup on success
            // Also trigger bioscan confirm email (fire-and-forget)
            api.notifyBioscanConfirm(savedToken).catch(() => {});
          } catch (_retryErr) {
            if (attempt === 0) await new Promise(r => setTimeout(r, 800)); // wait before retry
          }
        }
        if (!saved) {
          // Fallback: pending_scan stays in AsyncStorage → synced on next login
        }
      }
    } catch (_e) {
      // Non-blocking: Gold Flash and navigation always proceed
    }

    // ── Navigate to Athlete Passport (trofeo digitale) after gold flash
    setTimeout(() => router.push('/onboarding/passport'), 4000);
  }, []);

  // ── Score Engine Gold Flash: fires handleApproval when pendingApprovalRef is set.
  // Placed AFTER handleApproval declaration to avoid Temporal Dead Zone (TDZ) errors.
  useEffect(() => {
    if (pendingApprovalRef.current && phaseRef.current !== 'beats' && phaseRef.current !== 'approved') {
      pendingApprovalRef.current = false;
      handleApproval();
    }
  }, [phase, handleApproval]); // 'phase' change triggers re-check

  // ── HAPTIC PULSE: every 2s while system is searching (no athlete detected yet)
  // Signals to the athlete that Nexus is active and waiting
  useEffect(() => {
    if (phase !== 'positioning' || !isScanning || !poseEngineReady) return;
    const interval = setInterval(async () => {
      // Only pulse if no person is in frame yet
      if (!personEntrySinceRef.current) {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (_e) {}
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [phase, isScanning, poseEngineReady]);

  // ===================================================================
  // DERIVED RENDER STATE
  // ===================================================================
  const skelColor = phase === 'approved' ? '#D4AF37'
    : phase === 'beats' && currentBeat === 4 ? '#D4AF37'
    : phase === 'countdown' ? '#D4AF37'
    : phase === 'pose_check' && poseValid ? '#00F2FF'
    : phase === 'pose_check' && !poseValid ? '#FF453A'
    : '#00F2FF';

  const skelOpacity = phase === 'loading' ? 0.15
    : phase === 'positioning' ? 0.65
    : phase === 'verifying' ? 0.8
    : phase === 'pose_check' ? 0.9
    : phase === 'countdown' ? 0.95
    : 0.85;

  const currentBeatDef = phase === 'beats' && currentBeat < BEATS.length ? BEATS[currentBeat] : null;
  const isPositioning = phase === 'positioning';

  // ── Camera fallback for web
  const isWeb = Platform.OS === 'web';

  // Camera ready callback — enables scanning
  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
    setTimeout(() => setIsScanning(true), 500);
  }, []);

  // Web: NO auto-fallback. Scan starts ONLY when user accepts the Privacy Consent Modal.
  // On physical device: onCameraReady callback handles it.
  // Consent accept button: sets setCameraReady(true) + setIsScanning(true).

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" hidden />

      {/* ── PRIVACY CONSENT MODAL — shown before camera activates ── */}
      {showPrivacyConsent && (
        <View style={[prv$.overlay, { zIndex: 400 }]}>
          <Animated.View entering={FadeInDown.duration(300)} style={prv$.card}>
            <View style={prv$.topBar} />
            <View style={prv$.iconRow}>
              <Ionicons name="lock-closed" size={22} color="#00F2FF" />
              <Text style={prv$.label}>BIO-SECURE PROTOCOL</Text>
            </View>
            <Text style={prv$.msg}>
              Elaborazione biometrica{' '}
              <Text style={prv$.highlight}>100% locale</Text>.{'\n'}
              Nessun dato video viene salvato o inviato ai server.{'\n'}
              Solo vettori numerici anonimi vengono sincronizzati.
            </Text>
            <View style={prv$.row}>
              <TouchableOpacity
                style={prv$.acceptBtn}
                onPress={() => {
                  setShowPrivacyConsent(false);
                  // Manual start: activate scanning after consent
                  if (isWeb) {
                    setCameraReady(true);
                    setIsScanning(true);
                  }
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={14} color="#050505" />
                <Text style={prv$.acceptTxt}>ACCETTA & AVVIA SCANSIONE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={prv$.cancelBtn} onPress={() => router.back()} activeOpacity={0.8}>
                <Text style={prv$.cancelTxt}>ANNULLA</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* ── CAMERA ERROR STATE ── */}
      {cameraPermDenied && !isWeb && (
        <View style={camErr$.overlay} pointerEvents="none">
          <View style={camErr$.box}>
            <Ionicons name="camera-outline" size={28} color="#FF3B30" />
            <Text style={camErr$.title}>CAMERA NON RILEVATA</Text>
            <Text style={camErr$.desc}>CONTROLLA I PERMESSI NELLE IMPOSTAZIONI DEL DISPOSITIVO</Text>
          </View>
        </View>
      )}

      {/* GOLD FLASH OVERLAY */}
      <Animated.View style={[StyleSheet.absoluteFill, s.flash, flashStyle]} pointerEvents="none" />

      {/* ── HEADER ── */}
      <View style={[s.header, { paddingTop: insets.top + 8, height: HEADER_H }]}>
        <View style={s.headerTop}>
          <View style={{ flexDirection: 'row' }}>
            <Text style={s.brand}>ARENA</Text>
            <Text style={[s.brand, { color: '#00F2FF' }]}>KORE</Text>
          </View>
          <View style={s.stepPill}><Text style={s.stepTxt}>02 / 04</Text></View>
        </View>
        {phase === 'beats' && <BeatIndicator currentBeat={currentBeat} totalBeats={5} />}
        {phase === 'positioning' && (
          <View style={s.detectRow}>
            <View style={s.detectDot} />
            <Text style={s.detectTxt}>NEXUS DETECTION: {detectedPoints}/17 PUNTI</Text>
          </View>
        )}
        {phase === 'verifying' && (
          <View style={s.detectRow}>
            <View style={[s.detectDot, { backgroundColor: '#D4AF37' }]} />
            <Text style={[s.detectTxt, { color: '#D4AF37' }]}>VERIFICA SEGNALE: {Math.round(confidenceTime * 100)}%</Text>
          </View>
        )}
        {phase === 'pose_check' && (
          <View style={s.detectRow}>
            <View style={[s.detectDot, { backgroundColor: poseValid ? '#00F2FF' : '#FF453A' }]} />
            <Text style={[s.detectTxt, { color: poseValid ? '#00F2FF' : '#FF453A' }]}>
              {poseValid ? `HOLD: ${poseHoldTime.toFixed(1)}s / 2.0s` : 'MOVIMENTO RILEVATO'}
            </Text>
          </View>
        )}
        {phase === 'countdown' && (
          <View style={s.detectRow}>
            <View style={[s.detectDot, { backgroundColor: '#D4AF37' }]} />
            <Text style={[s.detectTxt, { color: '#D4AF37' }]}>LOCK: {countdownSec}s</Text>
          </View>
        )}
      </View>

      {/* ── CAMERA + SKELETON AREA ── */}
      <View style={[s.scanArea, { width: SCAN_W, height: SCAN_H }]}>

        {/* ── MEDIAPIPE POSE ENGINE — unmounted when approved (frees memory) ── */}
        {!showPrivacyConsent && phase !== 'approved' && (
          <NexusPoseEngine onPoseData={handlePoseData} enabled />
        )}

        {/* Fallback dark grid when engine not yet started or permission denied */}
        {(showPrivacyConsent || (!poseEngineReady && !cameraPermDenied)) && (
          <View style={[StyleSheet.absoluteFill, s.webCamFallback]} pointerEvents="none">
            <View style={s.gridOverlay} />
          </View>
        )}

        {/* Dark overlay for contrast — pointer-events none to never block touches */}
        <View style={[StyleSheet.absoluteFill, s.darkOverlay]} pointerEvents="none" />

        {/* ── CENTRATI NELL'ARENA warning (gold, TTS triggered) ── */}
        {centeringWarning && (
          <Animated.View entering={FadeIn} style={cw$.container} pointerEvents="none">
            <Ionicons name="scan-circle-outline" size={22} color="#D4AF37" />
            <Text style={cw$.txt}>CENTRATI NELL'ARENA</Text>
          </Animated.View>
        )}

        {/* ── Live FPS badge — DEV only ── */}
        {__DEV__ && liveFps > 0 && (
          <View style={fps$.badge} pointerEvents="none">
            <Text style={[fps$.txt, liveFps < 20 && fps$.low]}>{liveFps} FPS</Text>
          </View>
        )}

        {/* NEXUS HUD Frame (corners) */}
        <View style={[s.cornerTL, s.corner]} />
        <View style={[s.cornerTR, s.corner]} />
        <View style={[s.cornerBL, s.corner]} />
        <View style={[s.cornerBR, s.corner]} />

        {/* SCAN LINE (Beat 1 gold sweep) */}
        <ScanLineOverlay active={phase === 'beats' && currentBeat === 0} scanH={SCAN_H} />

        {/* SVG: Skeleton + HUD */}
        <Svg width={SCAN_W} height={SCAN_H} style={StyleSheet.absoluteFill}>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(pct => (
            <Line key={`h-${pct}`} x1={0} y1={SCAN_H * pct} x2={SCAN_W} y2={SCAN_H * pct}
              stroke="rgba(0,242,255,0.04)" strokeWidth={0.5} />
          ))}
          {[0.25, 0.5, 0.75].map(pct => (
            <Line key={`v-${pct}`} x1={SCAN_W * pct} y1={0} x2={SCAN_W * pct} y2={SCAN_H}
              stroke="rgba(0,242,255,0.04)" strokeWidth={0.5} />
          ))}

          {/* ── SKELETON — NEXUS v3.0: ZERO SIMULATION POLICY ── */}
          {(() => {
            // NEXUS v3.0 RULE: NOTHING renders unless:
            // 1. Real MediaPipe WebView is active (poseEngineReady = true)
            // 2. Real landmarks have been confirmed (realPts !== null)
            // If either condition fails → absolute black, no simulation, no fallback.
            const displayPts: [number, number][] | null = poseEngineReady ? realPts : null;

            if (!displayPts) return null; // ZERO SIMULATION — black screen until real data

            return (
              <>
                {/* Skeleton Connections */}
                {CONNECTIONS.map(([a, b], i) => {
                  if (isPositioning && (!visibleMask[a] || !visibleMask[b])) return null;
                  return (
                    <Line
                      key={`conn-${i}`}
                      x1={displayPts[a]?.[0] ?? 0} y1={displayPts[a]?.[1] ?? 0}
                      x2={displayPts[b]?.[0] ?? 0} y2={displayPts[b]?.[1] ?? 0}
                      stroke={skelColor} strokeWidth={realPts ? 2.5 : 2} opacity={skelOpacity * 0.65}
                    />
                  );
                })}

                {/* Keypoints */}
                {displayPts.map(([x, y], i) => {
                  if (isPositioning && !visibleMask[i]) return null;
                  const isHead = i < 5;
                  const conf = realPts && realLandmarks?.[i]?.v;
                  const glow = conf != null ? Math.min(1, conf) : 0.08;
                  return (
                    <G key={`pt-${i}`}>
                      <Circle cx={x} cy={y} r={isHead ? 10 : 8}
                        fill={skelColor} opacity={glow} />
                      <Circle cx={x} cy={y} r={isHead ? 5 : 4}
                        fill={skelColor} opacity={skelOpacity} />
                      <Circle cx={x} cy={y} r={1.5}
                        fill="#FFFFFF" opacity={skelOpacity * 0.9} />
                    </G>
                  );
                })}

                {/* Body silhouette (torso) */}
                {!isPositioning && (
                  <>
                    <Line
                      x1={displayPts[5]?.[0]} y1={displayPts[5]?.[1]}
                      x2={displayPts[11]?.[0]} y2={displayPts[11]?.[1]}
                      stroke={skelColor} strokeWidth={1} opacity={skelOpacity * 0.15} strokeDasharray="4,4"
                    />
                    <Line
                      x1={displayPts[6]?.[0]} y1={displayPts[6]?.[1]}
                      x2={displayPts[12]?.[0]} y2={displayPts[12]?.[1]}
                      stroke={skelColor} strokeWidth={1} opacity={skelOpacity * 0.15} strokeDasharray="4,4"
                    />
                  </>
                )}
              </>
            );
          })()}

          {/* HUD DATA LABELS */}
          {currentBeatDef && (
            <HudLabels
              items={currentBeatDef.hudData}
              scanW={SCAN_W}
              scanH={SCAN_H}
              visible={showHud}
            />
          )}

          {/* Stabilization/PoseCheck HUD: show stability + hold readout */}
          {(phase === 'verifying' || phase === 'pose_check' || phase === 'countdown') && (
            <G>
              <Rect x={SCAN_W / 2 - 60} y={16} width={120} height={28} rx={8}
                fill="rgba(0,0,0,0.6)" stroke={
                  phase === 'countdown' ? 'rgba(212,175,55,0.4)'
                  : phase === 'pose_check' && poseValid ? 'rgba(0,242,255,0.3)'
                  : phase === 'pose_check' && !poseValid ? 'rgba(255,69,58,0.3)'
                  : 'rgba(212,175,55,0.2)'
                } strokeWidth={1} />
              <SvgText x={SCAN_W / 2} y={35}
                fill={
                  phase === 'countdown' ? '#D4AF37'
                  : phase === 'pose_check' && poseValid ? '#00F2FF'
                  : phase === 'pose_check' && !poseValid ? '#FF453A'
                  : '#D4AF37'
                } fontSize={12} fontWeight="900"
                textAnchor="middle" letterSpacing={2}>
                {phase === 'countdown' ? `LOCK ${countdownSec}`
                  : phase === 'pose_check' ? (poseValid ? `HOLD ${poseHoldTime.toFixed(1)}s` : 'FERMO')
                  : `${Math.round(confidenceTime * 100)}%`}
              </SvgText>
            </G>
          )}

          {/* Positioning: 17/17 validation pill on scan area */}
          {phase === 'positioning' && detectedPoints >= 15 && (
            <G>
              <Rect x={SCAN_W / 2 - 70} y={SCAN_H - 36} width={140} height={24} rx={6}
                fill="rgba(0,242,255,0.08)" stroke="rgba(0,242,255,0.25)" strokeWidth={1} />
              <SvgText x={SCAN_W / 2} y={SCAN_H - 20}
                fill="#00F2FF" fontSize={10} fontWeight="900" textAnchor="middle" letterSpacing={2}>
                {detectedPoints}/17 RILEVATI
              </SvgText>
            </G>
          )}

          {/* DNA Generation: pulsing center label */}
          {phase === 'beats' && currentBeat === 4 && (
            <G>
              <Circle cx={SCAN_W / 2} cy={SCAN_H * 0.35} r={40}
                fill="rgba(212,175,55,0.06)" stroke="rgba(212,175,55,0.3)" strokeWidth={1} />
              <Circle cx={SCAN_W / 2} cy={SCAN_H * 0.35} r={25}
                fill="rgba(212,175,55,0.1)" stroke="rgba(212,175,55,0.5)" strokeWidth={0.5} />
              <SvgText x={SCAN_W / 2} y={SCAN_H * 0.35 + 4}
                fill="#D4AF37" fontSize={10} fontWeight="900" textAnchor="middle" letterSpacing={2}>
                DNA
              </SvgText>
            </G>
          )}

          {/* XP Estimation floating */}
          {phase === 'beats' && currentBeat >= 2 && (
            <G opacity={0.6}>
              <SvgText x={SCAN_W - 14} y={SCAN_H * 0.12}
                fill="#D4AF37" fontSize={8} fontWeight="900" textAnchor="end" letterSpacing={1}>
                XP EST: +47
              </SvgText>
            </G>
          )}

          {/* ── KORE SCORE (live, top-right during scanning) ── */}
          {poseEngineReady && koScore > 0 && phase !== 'approved' && (
            <G>
              <Rect x={SCAN_W - 86} y={8} width={78} height={40} rx={8}
                fill="rgba(0,0,0,0.7)" stroke="rgba(212,175,55,0.3)" strokeWidth={1} />
              <SvgText x={SCAN_W - 47} y={24}
                fill="rgba(212,175,55,0.6)" fontSize={8} fontWeight="900" textAnchor="middle" letterSpacing={2}>
                KORE SCORE
              </SvgText>
              <SvgText x={SCAN_W - 47} y={40}
                fill={koScore >= 80 ? '#D4AF37' : koScore >= 50 ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}
                fontSize={14} fontWeight="900" textAnchor="middle" letterSpacing={1}>
                {koScore}
              </SvgText>
            </G>
          )}

          {/* ── HOLD PROGRESS RING (3-second hold indicator) ── */}
          {holdProgress > 0 && holdProgress < 1 && (
            <G>
              <Rect x={SCAN_W / 2 - 80} y={SCAN_H - 44} width={160} height={28} rx={8}
                fill="rgba(0,0,0,0.7)" stroke="rgba(212,175,55,0.4)" strokeWidth={1} />
              <Rect x={SCAN_W / 2 - 76} y={SCAN_H - 36} width={152 * holdProgress} height={12} rx={4}
                fill="#D4AF37" />
              <SvgText x={SCAN_W / 2} y={SCAN_H - 26}
                fill="#D4AF37" fontSize={8} fontWeight="900" textAnchor="middle" letterSpacing={3}>
                GOLD FLASH IN {Math.ceil(3 * (1 - holdProgress))}s
              </SvgText>
            </G>
          )}
        </Svg>

        {/* EMA Filter label (bottom of scan area) */}
        {(phase === 'beats' || phase === 'verifying' || phase === 'pose_check' || phase === 'countdown') && (
          <View style={s.emaLabel}>
            <Text style={s.emaTxt}>EMA {ALPHA} · HYSTERESIS {HYSTERESIS_PX}PX · {TICK_MS}MS</Text>
          </View>
        )}
      </View>

      {/* ── FOOTER ── */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 12, height: FOOTER_H }]}>

        {/* LOADING */}
        {phase === 'loading' && (
          <View style={s.footerCenter}>
            <ActivityIndicator color="#00F2FF" size="small" />
            <Text style={s.loadingTxt}>INIZIALIZZAZIONE NEXUS...</Text>
          </View>
        )}

        {/* POSITIONING — detecting 17 points one by one */}
        {phase === 'positioning' && (
          <Animated.View entering={FadeIn} style={s.footerCenter}>
            {!isScanning ? (
              /* ── BIOMETRIC WALL: Camera not confirmed — waiting for human presence ── */
              <>
                <Animated.View style={[s.positioningRow, positionPulseStyle]}>
                  <View style={[s.positioningDot, { backgroundColor: 'rgba(0,242,255,0.6)' }]} />
                  <Text style={s.positioningTxt}>NEXUS IS SEARCHING FOR ATHLETE...</Text>
                </Animated.View>
                <Text style={s.statusLabel}>POSIZIONATI DAVANTI ALLA CAMERA</Text>
                <Text style={s.detectNote}>IN ATTESA RILEVAMENTO UMANO</Text>

                {/* CDN FALLBACK: visible if MediaPipe model timed out */}
                {poseTimeout && (
                  <TouchableOpacity
                    style={fallback$.btn}
                    onPress={() => { setPoseTimeout(false); setIsScanning(true); }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="refresh-circle-outline" size={14} color="#D4AF37" />
                    <Text style={fallback$.txt}>USA SCAN MANUALE</Text>
                  </TouchableOpacity>
                )}

                {/* ── DEBUG BYPASS: only visible in __DEV__ builds ── */}
                {__DEV__ && (
                  <TouchableOpacity
                    style={dbg$.btn}
                    onPress={() => { setCameraReady(true); setIsScanning(true); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="flash" size={11} color="#FF453A" />
                    <Text style={dbg$.txt}>DEBUG: FORCE SCAN</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              /* ── SCANNING ACTIVE: Real MediaPipe entry gate (3 seconds) ── */
              <>
                <Text style={s.statusLabel}>
                  {poseEngineReady && detectedPoints > 0
                    ? 'NEXUS DETECTED — ANALYZING...'
                    : 'RILEVAMENTO PUPPET-MOTION-DECK'}
                </Text>
                <View style={s.detectBar}>
                  <View style={[
                    s.detectFill,
                    {
                      width: `${(detectedPoints / 17) * 100}%` as any,
                      // Gold bar when entry gate is in progress (real MediaPipe)
                      backgroundColor: poseEngineReady && detectedPoints > 0 ? '#D4AF37' : '#00F2FF',
                    }
                  ]} />
                </View>
                {detectedPoints < 17 ? (
                  <Animated.View style={[s.positioningRow, positionPulseStyle]}>
                    <View style={[s.positioningDot, poseEngineReady && detectedPoints > 0 && { backgroundColor: '#D4AF37' }]} />
                    <Text style={[
                      s.positioningTxt,
                      poseEngineReady && detectedPoints > 0 && { color: '#D4AF37' }
                    ]}>
                      {poseEngineReady && detectedPoints > 0
                        ? `NEXUS DETECTED — ANALYZING...`
                        : 'NEXUS IS SEARCHING FOR ATHLETE...'}
                    </Text>
                  </Animated.View>
                ) : (
                  <Text style={[s.detectNote, { color: '#D4AF37' }]}>17/17 RILEVATI — INGRESSO ARENA</Text>
                )}
                <Text style={s.detectCount}>{detectedPoints} / 17</Text>
              </>
            )}
          </Animated.View>
        )}

        {/* VERIFYING — confidence check: 17/17 for 1 full second */}
        {phase === 'verifying' && (
          <Animated.View entering={FadeIn} style={s.footerCenter}>
            <Text style={[s.statusLabel, { color: '#D4AF37' }]}>VERIFICA FORMA UMANA</Text>
            <View style={s.stabilityRow}>
              <Text style={[s.stabPct, { color: '#D4AF37' }]}>{Math.round(confidenceTime * 100)}%</Text>
              <View style={s.stabBar}>
                <View style={[s.stabFill, { width: `${confidenceTime * 100}%` as any, backgroundColor: '#D4AF37' }]} />
              </View>
            </View>
            <Animated.View style={[s.positioningRow, positionPulseStyle]}>
              <View style={[s.positioningDot, { backgroundColor: '#D4AF37' }]} />
              <Text style={[s.positioningTxt, { color: '#D4AF37' }]}>ANALISI CONFIDENZA SEGNALE...</Text>
            </Animated.View>
          </Animated.View>
        )}

        {/* POSE_CHECK — "Hold neutral pose for 2s" */}
        {phase === 'pose_check' && (
          <Animated.View entering={FadeIn} style={s.footerCenter}>
            <Text style={s.poseCommand}>BRACCIA LUNGO I FIANCHI</Text>
            <Text style={s.poseSubCommand}>RIMANI IMMOBILE</Text>
            <View style={s.poseTimerRow}>
              {/* 2 second hold progress indicator */}
              <View style={s.poseTimerBg}>
                <View style={[
                  s.poseTimerFill,
                  { width: `${(poseHoldTime / 2) * 100}%` as any },
                  poseValid ? {} : { backgroundColor: '#FF453A' },
                ]} />
              </View>
              <Text style={[s.poseTimerText, !poseValid && { color: '#FF453A' }]}>
                {poseHoldTime.toFixed(1)}s / 2.0s
              </Text>
            </View>
            {!poseValid && (
              <Animated.View style={[s.positioningRow, positionPulseStyle]}>
                <Ionicons name="alert-circle" size={12} color="#FF453A" />
                <Text style={s.poseWarning}>MOVIMENTO RILEVATO — TIMER RESETTATO</Text>
              </Animated.View>
            )}
            {poseValid && poseHoldTime > 0.3 && (
              <View style={s.positioningRow}>
                <Ionicons name="checkmark-circle" size={12} color="#00F2FF" />
                <Text style={s.poseOk}>IMMOBILITA IN CORSO...</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* COUNTDOWN — 3... 2... 1... */}
        {phase === 'countdown' && (
          <Animated.View entering={FadeIn} style={s.footerCenter}>
            <Text style={s.countdownLabel}>IMMOBILITA CONFERMATA</Text>
            <Text style={s.countdownBig}>{countdownSec}</Text>
            <View style={s.stabilityRow}>
              <Text style={[s.stabPct, { color: '#D4AF37' }]}>{stability}%</Text>
              <View style={s.stabBar}>
                <View style={[s.stabFill, { width: `${stability}%` as any, backgroundColor: '#D4AF37' }]} />
              </View>
            </View>
            <Text style={s.countdownNote}>NON MUOVERTI — LOCK IN CORSO</Text>
          </Animated.View>
        )}

        {/* BEATS */}
        {phase === 'beats' && currentBeatDef && (
          <Animated.View entering={FadeIn} key={`beat-${currentBeat}`} style={s.footerCenter}>
            <View style={s.beatLabelRow}>
              <View style={[s.beatDot, currentBeat === 4 && { backgroundColor: '#D4AF37' }]} />
              <Text style={s.beatLabel}>BEAT {currentBeatDef.id} — {currentBeatDef.label}</Text>
            </View>
            <Text style={s.beatInstruction}>{currentBeatDef.instruction}</Text>
            <View style={s.beatBar}>
              <View style={[
                s.beatFill,
                { width: `${beatProgress}%` as any },
                currentBeat === 4 && { backgroundColor: '#D4AF37' },
              ]} />
            </View>
            <Text style={s.beatPct}>{beatProgress}%</Text>
          </Animated.View>
        )}

        {/* APPROVED */}
        {phase === 'approved' && (
          <Animated.View style={[s.approvedWrap, approvedStyle]}>
            <Ionicons name="checkmark-circle" size={28} color="#D4AF37" />
            <Text style={s.approvedBig}>KORE DNA GENERATO</Text>
            <Text style={s.approvedSub}>APPROVATO</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

// ===================================================================
// STYLES
// ===================================================================
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },

  // Header
  header: {
    paddingHorizontal: 20, justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(5,5,5,0.95)', zIndex: 20,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#D4AF37', fontSize: 11, fontWeight: '900', letterSpacing: 6 },
  stepPill: {
    backgroundColor: 'rgba(0,242,255,0.08)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.2)',
  },
  stepTxt: { color: '#00F2FF', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  detectRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  detectDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00F2FF' },
  detectTxt: { color: '#00F2FF', fontSize: 9, fontWeight: '900', letterSpacing: 2 },

  // Scan area
  scanArea: { position: 'relative', overflow: 'hidden' },
  webCamFallback: { backgroundColor: '#0A0A0A' },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.04)',
    backgroundColor: 'rgba(0,242,255,0.01)',
  },
  darkOverlay: { backgroundColor: 'rgba(0,0,0,0.35)' },

  // HUD corners
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#00F2FF', zIndex: 5 },
  cornerTL: { top: 8, left: 8, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 8, right: 8, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 8, left: 8, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 8, right: 8, borderBottomWidth: 2, borderRightWidth: 2 },

  // EMA label
  emaLabel: { position: 'absolute', bottom: 6, left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  emaTxt: { color: 'rgba(0,242,255,0.2)', fontSize: 7, fontWeight: '900', letterSpacing: 2 },

  // Flash
  flash: { backgroundColor: '#D4AF37', zIndex: 200, pointerEvents: 'none' as any },

  // Footer
  footer: {
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: 'rgba(5,5,5,0.97)',
    justifyContent: 'center',
  },
  footerCenter: { alignItems: 'center', gap: 8 },

  // Loading
  loadingTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 3 },

  // Detecting / Positioning
  statusLabel: { color: '#00F2FF', fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  detectBar: { width: '100%', height: 4, backgroundColor: '#111', borderRadius: 2, overflow: 'hidden' },
  detectFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  detectNote: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  detectCount: { color: '#00F2FF', fontSize: 26, fontWeight: '900', letterSpacing: 2 },
  positioningRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  positioningDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#00F2FF',
  },
  positioningTxt: { color: '#00F2FF', fontSize: 14, fontWeight: '900', letterSpacing: 3 },

  // Stabilizing
  stabilityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  stabPct: { color: '#00F2FF', fontSize: 28, fontWeight: '900', width: 60, textAlign: 'center' as const },
  stabBar: { flex: 1, height: 5, backgroundColor: '#111', borderRadius: 3, overflow: 'hidden' },
  stabFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 3 },
  tieneTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },

  // Countdown
  countdownLabel: { color: '#D4AF37', fontSize: 9, fontWeight: '900', letterSpacing: 4 },
  countdownBig: { color: '#D4AF37', fontSize: 64, fontWeight: '900', letterSpacing: 2, lineHeight: 68 },
  countdownNote: { color: 'rgba(212,175,55,0.5)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },

  // Pose Check
  poseCommand: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 1, textAlign: 'center' as const },
  poseSubCommand: { color: '#00F2FF', fontSize: 14, fontWeight: '900', letterSpacing: 3, textAlign: 'center' as const },
  poseTimerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  poseTimerBg: { flex: 1, height: 6, backgroundColor: '#111', borderRadius: 3, overflow: 'hidden' },
  poseTimerFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 3 },
  poseTimerText: { color: '#00F2FF', fontSize: 14, fontWeight: '900', width: 80, textAlign: 'right' as const },
  poseWarning: { color: '#FF453A', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  poseOk: { color: '#00F2FF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  // Beats
  beatLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  beatDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00F2FF' },
  beatLabel: { color: '#00F2FF', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  beatInstruction: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  beatBar: { width: '100%', height: 4, backgroundColor: '#111', borderRadius: 2, overflow: 'hidden' },
  beatFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  beatPct: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '900' },

  // Approved
  approvedWrap: { alignItems: 'center', gap: 8 },
  approvedBig: {
    color: '#D4AF37', fontSize: 32, fontWeight: '900',
    letterSpacing: -1, textAlign: 'center',
  },
  approvedSub: {
    color: '#FFFFFF', fontSize: 20, fontWeight: '900',
    letterSpacing: 6, textAlign: 'center',
  },
});

// ── DEBUG BYPASS BUTTON styles (isolated to avoid polluting main StyleSheet)
const dbg$ = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,69,58,0.35)',
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: 'rgba(255,69,58,0.06)',
    marginTop: 8,
  },
  txt: {
    color: '#FF453A', fontSize: 10, fontWeight: '900', letterSpacing: 3,
  },
});

// ── CENTRATI NELL'ARENA warning overlay
const cw$ = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 16, left: 0, right: 0,
    alignItems: 'center', gap: 6, zIndex: 20,
    flexDirection: 'row', justifyContent: 'center',
  },
  txt: {
    color: '#D4AF37', fontSize: 18, fontWeight: '900', letterSpacing: 2,
    textShadowColor: 'rgba(212,175,55,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});

// ── Live FPS badge
const fps$ = StyleSheet.create({
  badge: {
    position: 'absolute', top: 8, left: 8, zIndex: 25,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.15)',
  },
  txt: { color: '#00F2FF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  low: { color: '#FF453A' }, // red when below 20fps
});

// ── CDN FALLBACK — "USA SCAN MANUALE" button
const fallback$ = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.4)',
    borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: 'rgba(212,175,55,0.06)',
    marginTop: 10,
  },
  txt: {
    color: '#D4AF37', fontSize: 12, fontWeight: '900', letterSpacing: 2,
  },
});

// ── PRIVACY CONSENT styles
const prv$ = StyleSheet.create({
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 300,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingBottom: 0,
  },
  card: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 14,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.15)',
  },
  topBar: { height: 2, backgroundColor: '#00F2FF', opacity: 0.6, marginHorizontal: -24, marginTop: -24, marginBottom: 8 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { color: '#00F2FF', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  msg: { color: '#E0E0E0', fontSize: 13, fontWeight: '600', lineHeight: 22 },
  highlight: { color: '#00F2FF', fontWeight: '900' },
  row: { gap: 10 },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#00F2FF', borderRadius: 10, paddingVertical: 16,
  },
  acceptTxt: { color: '#050505', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  cancelBtn: {
    alignItems: 'center', paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
  },
  cancelTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
});

// ── CAMERA ERROR styles
const camErr$ = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  box: {
    alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 16, padding: 28,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.3)',
    marginHorizontal: 32,
  },
  title: { color: '#FF3B30', fontSize: 16, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  desc: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 1, textAlign: 'center', lineHeight: 18 },
});
