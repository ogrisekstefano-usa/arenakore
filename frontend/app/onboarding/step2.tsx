/**
 * ARENAKORE LEGACY INITIATION — STEP 2
 * NEXUS 5-BEAT BIO-SCAN: Human-Centric HUD (Minority Report / Iron Man)
 * Camera Live + Puppet-Motion-Deck Overlay + 5 I-Beats + HUD Data + Gold Flash
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, StatusBar, useWindowDimensions, Platform,
  ActivityIndicator,
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
    id: 1, label: 'POSA', instruction: 'TIENI LA POSA (3s)...',
    targetPose: POSE_NEUTRAL, duration: 3500,
    hudData: [
      { label: 'STABILITA', value: '98.2%', position: 'left', yPct: 30 },
      { label: 'PUNTI', value: '17/17', position: 'right', yPct: 30 },
      { label: 'BARICENTRO', value: 'CENTRATO', position: 'left', yPct: 55 },
      { label: 'JITTER', value: '< 3PX', position: 'right', yPct: 55 },
    ],
  },
  {
    id: 2, label: 'ALZA', instruction: 'ALZA LE BRACCIA',
    targetPose: POSE_ARMS_UP, duration: 3500,
    hudData: [
      { label: 'ANGOLO SPALLE', value: '178\u00B0', position: 'left', yPct: 18 },
      { label: 'DORSALE', value: '12\u00B0', position: 'right', yPct: 25 },
      { label: 'ESTENSIONE', value: '96%', position: 'left', yPct: 42 },
      { label: 'SIMMETRIA', value: '97.4%', position: 'right', yPct: 42 },
    ],
  },
  {
    id: 3, label: 'APRI', instruction: 'APRI LE BRACCIA',
    targetPose: POSE_ARMS_OPEN, duration: 3500,
    hudData: [
      { label: 'APERTURA', value: '180\u00B0', position: 'left', yPct: 22 },
      { label: 'SIMMETRIA', value: '97%', position: 'right', yPct: 22 },
      { label: 'ALLINEAMENTO', value: 'PERFETTO', position: 'left', yPct: 50 },
      { label: 'TENSIONE', value: '84%', position: 'right', yPct: 50 },
    ],
  },
  {
    id: 4, label: 'SQUAT', instruction: 'PIEGA LE GAMBE (MEZZO SQUAT)',
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

  // State
  const [phase, setPhase] = useState<'loading' | 'detecting' | 'beats' | 'approved'>('loading');
  const [currentBeat, setCurrentBeat] = useState(0);
  const [detectedPoints, setDetectedPoints] = useState(0);
  const [beatProgress, setBeatProgress] = useState(0);
  const [showHud, setShowHud] = useState(false);

  // Skeleton state
  const ptsRef = useRef<[number, number][]>(
    POSE_NEUTRAL.map(([px, py]) => [
      (px / 100) * SW + (Math.random() - 0.5) * 60,
      (py / 100) * 500 + (Math.random() - 0.5) * 60,
    ])
  );
  const [pts, setPts] = useState<[number, number][]>(ptsRef.current);
  const targetPoseRef = useRef<[number, number][]>(POSE_NEUTRAL);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animations
  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const approvedScale = useSharedValue(0.5);
  const approvedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: approvedScale.value }],
    opacity: approvedScale.value > 0.6 ? 1 : 0,
  }));

  // ── Request camera permission
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission().then(() => {});
    }
  }, []);

  // ── EMA Skeleton loop
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);

    tickRef.current = setInterval(() => {
      const targets = targetPoseRef.current;
      const cur = ptsRef.current;

      const next: [number, number][] = cur.map(([cx, cy], i) => {
        const tx = (targets[i][0] / 100) * SCAN_W + (Math.random() - 0.5) * 4;
        const ty = (targets[i][1] / 100) * SCAN_H + (Math.random() - 0.5) * 4;
        const nx = ALPHA * tx + (1 - ALPHA) * cx;
        const ny = ALPHA * ty + (1 - ALPHA) * cy;
        return [nx, ny];
      });

      ptsRef.current = next;
      setPts([...next]);
    }, TICK_MS);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [SCAN_W, SCAN_H]);

  // ── Phase: DETECTING (simulate point detection)
  useEffect(() => {
    if (phase !== 'loading') return;

    const timer = setTimeout(() => {
      setPhase('detecting');
      // Simulate progressive point detection
      let count = 0;
      const detectInterval = setInterval(() => {
        count += Math.floor(Math.random() * 3) + 1;
        if (count >= 17) {
          count = 17;
          setDetectedPoints(17);
          clearInterval(detectInterval);
          // Points validated! Start beats after short delay
          setTimeout(() => {
            setPhase('beats');
            setCurrentBeat(0);
            setShowHud(true);
          }, 800);
        } else {
          setDetectedPoints(count);
        }
      }, 200);
    }, 1500);

    return () => clearTimeout(timer);
  }, [phase]);

  // ── Phase: BEATS (5 sequential poses)
  useEffect(() => {
    if (phase !== 'beats') return;
    if (currentBeat >= BEATS.length) {
      // ALL BEATS DONE → APPROVAL
      handleApproval();
      return;
    }

    const beat = BEATS[currentBeat];
    targetPoseRef.current = beat.targetPose;
    setBeatProgress(0);

    // Progress timer
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / beat.duration) * 100);
      setBeatProgress(Math.round(pct));
      if (pct >= 100) {
        clearInterval(progressInterval);
        // Small flash between beats
        flashOpacity.value = withSequence(
          withTiming(0.15, { duration: 100 }),
          withTiming(0, { duration: 200 }),
        );
        setTimeout(() => setCurrentBeat(prev => prev + 1), 400);
      }
    }, 50);

    return () => clearInterval(progressInterval);
  }, [phase, currentBeat]);

  // ── Approval sequence
  const handleApproval = useCallback(() => {
    setPhase('approved');
    setShowHud(false);

    // Epic Gold Flash
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

    // Navigate after ceremony
    setTimeout(() => router.push('/onboarding/step3'), 4000);
  }, []);

  // ── Skeleton color based on phase
  const skelColor = phase === 'approved' ? '#D4AF37'
    : phase === 'beats' && currentBeat === 4 ? '#D4AF37'  // DNA beat = gold
    : '#00F2FF';

  const skelOpacity = phase === 'loading' ? 0.3
    : phase === 'detecting' ? 0.5
    : 0.85;

  const currentBeatDef = phase === 'beats' && currentBeat < BEATS.length ? BEATS[currentBeat] : null;

  // ── Camera fallback for web
  const isWeb = Platform.OS === 'web';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" hidden />

      {/* GOLD FLASH OVERLAY */}
      <Animated.View style={[StyleSheet.absoluteFill, s.flash, flashStyle]} pointerEvents="none" />

      {/* ── HEADER ── */}
      <View style={[s.header, { paddingTop: insets.top + 8, height: HEADER_H }]}>
        <View style={s.headerTop}>
          <Text style={s.brand}>ARENAKORE</Text>
          <View style={s.stepPill}><Text style={s.stepTxt}>02 / 04</Text></View>
        </View>
        {phase === 'beats' && <BeatIndicator currentBeat={currentBeat} totalBeats={5} />}
        {phase === 'detecting' && (
          <View style={s.detectRow}>
            <View style={s.detectDot} />
            <Text style={s.detectTxt}>NEXUS DETECTION: {detectedPoints}/17 PUNTI</Text>
          </View>
        )}
      </View>

      {/* ── CAMERA + SKELETON AREA ── */}
      <View style={[s.scanArea, { width: SCAN_W, height: SCAN_H }]}>
        {/* Camera Background */}
        {!isWeb && permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="front"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, s.webCamFallback]}>
            {/* Dark tech-grid background for web preview */}
            <View style={s.gridOverlay} />
          </View>
        )}

        {/* Dark overlay for contrast */}
        <View style={[StyleSheet.absoluteFill, s.darkOverlay]} />

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

          {/* Skeleton Connections */}
          {CONNECTIONS.map(([a, b], i) => (
            <Line
              key={`conn-${i}`}
              x1={pts[a]?.[0] ?? 0} y1={pts[a]?.[1] ?? 0}
              x2={pts[b]?.[0] ?? 0} y2={pts[b]?.[1] ?? 0}
              stroke={skelColor} strokeWidth={2} opacity={skelOpacity * 0.6}
            />
          ))}

          {/* Keypoints */}
          {pts.map(([x, y], i) => (
            <G key={`pt-${i}`}>
              {/* Outer glow */}
              <Circle cx={x} cy={y} r={i < 5 ? 10 : 8}
                fill={skelColor} opacity={skelOpacity * 0.08} />
              {/* Point */}
              <Circle cx={x} cy={y} r={i < 5 ? 5 : 4}
                fill={skelColor} opacity={skelOpacity} />
              {/* Inner bright */}
              <Circle cx={x} cy={y} r={1.5}
                fill="#FFFFFF" opacity={skelOpacity * 0.9} />
            </G>
          ))}

          {/* Body outline silhouette (torso trapezoid) */}
          <Line
            x1={pts[5]?.[0]} y1={pts[5]?.[1]}
            x2={pts[11]?.[0]} y2={pts[11]?.[1]}
            stroke={skelColor} strokeWidth={1} opacity={skelOpacity * 0.15} strokeDasharray="4,4"
          />
          <Line
            x1={pts[6]?.[0]} y1={pts[6]?.[1]}
            x2={pts[12]?.[0]} y2={pts[12]?.[1]}
            stroke={skelColor} strokeWidth={1} opacity={skelOpacity * 0.15} strokeDasharray="4,4"
          />

          {/* HUD DATA LABELS */}
          {currentBeatDef && (
            <HudLabels
              items={currentBeatDef.hudData}
              scanW={SCAN_W}
              scanH={SCAN_H}
              visible={showHud}
            />
          )}

          {/* Validation text: points detected */}
          {phase === 'detecting' && detectedPoints >= 15 && (
            <G>
              <Rect x={SCAN_W / 2 - 70} y={SCAN_H - 36} width={140} height={24} rx={6}
                fill="rgba(0,242,255,0.08)" stroke="rgba(0,242,255,0.25)" strokeWidth={1} />
              <SvgText x={SCAN_W / 2} y={SCAN_H - 20}
                fill="#00F2FF" fontSize={10} fontWeight="900" textAnchor="middle" letterSpacing={2}>
                {detectedPoints}/17 VALIDATI
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
        </Svg>

        {/* EMA Filter label (bottom of scan area) */}
        {phase === 'beats' && (
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

        {/* DETECTING */}
        {phase === 'detecting' && (
          <Animated.View entering={FadeIn} style={s.footerCenter}>
            <Text style={s.statusLabel}>RILEVAMENTO PUPPET-MOTION-DECK</Text>
            <View style={s.detectBar}>
              <View style={[s.detectFill, { width: `${(detectedPoints / 17) * 100}%` as any }]} />
            </View>
            <Text style={s.detectNote}>
              {detectedPoints < 15 ? 'POSIZIONATI AL CENTRO DELLA CAMERA' : 'VALIDAZIONE COMPLETATA'}
            </Text>
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

  // Detecting
  statusLabel: { color: '#00F2FF', fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  detectBar: { width: '100%', height: 4, backgroundColor: '#111', borderRadius: 2, overflow: 'hidden' },
  detectFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  detectNote: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },

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
