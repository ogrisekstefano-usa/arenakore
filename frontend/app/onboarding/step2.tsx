/**
 * ARENAKORE LEGACY INITIATION — STEP 2
 * PUPPET-MOTION-DECK: 17-point EMA skeleton, Hysteresis 3px, 3s validation
 * KORE IDENTIFICATO: ACCESSO AUTORIZZATO
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue, withTiming, withSequence,
  useAnimatedStyle, FadeIn,
} from 'react-native-reanimated';

// ── 17-POINT COCO SKELETON (% of scan area) ─────────────────────────
const TARGET_PCT: [number, number][] = [
  [50, 9],   // 0: nose
  [45, 7],   // 1: left eye
  [55, 7],   // 2: right eye
  [41, 11],  // 3: left ear
  [59, 11],  // 4: right ear
  [36, 23],  // 5: left shoulder
  [64, 23],  // 6: right shoulder
  [27, 37],  // 7: left elbow
  [73, 37],  // 8: right elbow
  [21, 51],  // 9: left wrist
  [79, 51],  // 10: right wrist
  [40, 55],  // 11: left hip
  [60, 55],  // 12: right hip
  [38, 70],  // 13: left knee
  [62, 70],  // 14: right knee
  [36, 85],  // 15: left ankle
  [64, 85],  // 16: right ankle
];

const CONNECTIONS: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4],       // head
  [3, 5], [4, 6], [5, 6],               // neck + shoulders
  [5, 7], [7, 9],                        // left arm
  [6, 8], [8, 10],                       // right arm
  [5, 11], [6, 12], [11, 12],           // torso + hips
  [11, 13], [13, 15],                    // left leg
  [12, 14], [14, 16],                    // right leg
];

// EMA parameters
const ALPHA = 0.12;        // smoothing factor
const HYSTERESIS_PX = 3;   // px tolerance for stability
const STABLE_TICKS = 30;   // 30 × 100ms = 3s
const TICK_MS = 100;

export default function LegacyStep2() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const SCAN_W = width;
  const SCAN_H = height - insets.top - insets.bottom - 160;

  // Compute pixel targets from percentages
  const getTargets = useCallback(() =>
    TARGET_PCT.map(([px, py]) => [
      (px / 100) * SCAN_W,
      (py / 100) * SCAN_H,
    ] as [number, number]), [SCAN_W, SCAN_H]);

  // Initialize with ±25px jitter
  const ptsRef = useRef<[number, number][]>(
    TARGET_PCT.map(([px, py]) => [
      (px / 100) * 390 + (Math.random() - 0.5) * 50,
      (py / 100) * 680 + (Math.random() - 0.5) * 50,
    ])
  );

  const [pts, setPts] = useState<[number, number][]>(ptsRef.current);
  const stableTicksRef = useRef(0);
  const phaseRef = useRef<'scanning' | 'identified'>('scanning');
  const [phase, setPhase] = useState<'scanning' | 'identified'>('scanning');
  const [stablePct, setStablePct] = useState(0);

  // Gold flash
  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));

  useEffect(() => {
    const targets = getTargets();
    ptsRef.current = TARGET_PCT.map(([px, py]) => [
      (px / 100) * SCAN_W + (Math.random() - 0.5) * 50,
      (py / 100) * SCAN_H + (Math.random() - 0.5) * 50,
    ]);

    const interval = setInterval(() => {
      if (phaseRef.current === 'identified') return;

      const cur = ptsRef.current;
      let allWithinHysteresis = true;

      const next: [number, number][] = cur.map(([cx, cy], i) => {
        // Add small noise to target (simulates micro-movement)
        const noisyTx = targets[i][0] + (Math.random() - 0.5) * 5;
        const noisyTy = targets[i][1] + (Math.random() - 0.5) * 5;
        // EMA filter
        const nx = ALPHA * noisyTx + (1 - ALPHA) * cx;
        const ny = ALPHA * noisyTy + (1 - ALPHA) * cy;
        // Check hysteresis
        const dx = Math.abs(nx - targets[i][0]);
        const dy = Math.abs(ny - targets[i][1]);
        if (dx > HYSTERESIS_PX || dy > HYSTERESIS_PX) allWithinHysteresis = false;
        return [nx, ny];
      });

      ptsRef.current = next;
      setPts([...next]);

      if (allWithinHysteresis) {
        stableTicksRef.current = Math.min(STABLE_TICKS, stableTicksRef.current + 1);
      } else {
        stableTicksRef.current = Math.max(0, stableTicksRef.current - 1);
      }

      const pct = Math.round((stableTicksRef.current / STABLE_TICKS) * 100);
      setStablePct(pct);

      if (stableTicksRef.current >= STABLE_TICKS && phaseRef.current === 'scanning') {
        phaseRef.current = 'identified';
        setPhase('identified');
        clearInterval(interval);

        // Gold flash sequence
        flashOpacity.value = withSequence(
          withTiming(0.9, { duration: 250 }),
          withTiming(0, { duration: 600 }),
          withTiming(0.5, { duration: 150 }),
          withTiming(0, { duration: 400 }),
        );

        // Navigate to step 3 after ceremony
        setTimeout(() => router.push('/onboarding/step3'), 3000);
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [SCAN_W, SCAN_H]);

  const skelColor = phase === 'identified' ? '#D4AF37' : '#00F2FF';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" hidden />

      {/* Gold flash overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, s.flash, flashStyle]} />

      {/* Scan header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={s.brand}>ARENAKORE</Text>
        <View style={s.stepPill}>
          <Text style={s.stepTxt}>02 / 04</Text>
        </View>
      </View>

      {/* 17-Point Neon Skeleton */}
      <View style={[s.skelWrap, { width: SCAN_W, height: SCAN_H }]}>
        {/* Scan grid lines */}
        <View style={[StyleSheet.absoluteFill, s.scanGrid]} />

        <Svg width={SCAN_W} height={SCAN_H}>
          {/* Skeleton connections */}
          {CONNECTIONS.map(([a, b], i) => (
            <Line
              key={`conn-${i}`}
              x1={pts[a]?.[0] ?? 0}
              y1={pts[a]?.[1] ?? 0}
              x2={pts[b]?.[0] ?? 0}
              y2={pts[b]?.[1] ?? 0}
              stroke={skelColor}
              strokeWidth={1.5}
              opacity={0.55}
            />
          ))}
          {/* Keypoints */}
          {pts.map(([x, y], i) => (
            <Circle
              key={`pt-${i}`}
              cx={x} cy={y} r={i < 5 ? 6 : 5}
              fill={skelColor}
              opacity={0.95}
            />
          ))}
        </Svg>

        {/* EMA filter label */}
        {phase === 'scanning' && (
          <View style={s.emaLabel}>
            <Text style={s.emaTxt}>EMA FILTER ACTIVE · HYSTERESIS {HYSTERESIS_PX}PX</Text>
          </View>
        )}
      </View>

      {/* Bottom status */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
        {phase === 'scanning' ? (
          <>
            <Text style={s.statusLabel}>CALIBRAZIONE BIOMETRICA</Text>
            <View style={s.stabilityRow}>
              <Text style={s.stabPct}>{stablePct}%</Text>
              <View style={s.stabBar}>
                <View style={[s.stabFill, { width: `${stablePct}%` as any }]} />
              </View>
            </View>
            <Text style={s.tieneTxt}>
              {stablePct >= 50 ? 'TIENI LA POSIZIONE...' : 'RIMANI IMMOBILE DAVANTI ALLA CAMERA'}
            </Text>
          </>
        ) : (
          <Animated.View entering={FadeIn.duration(400)} style={s.identifiedWrap}>
            <Text style={s.identifiedBig}>KORE IDENTIFICATO</Text>
            <Text style={s.identifiedSub}>ACCESSO AUTORIZZATO</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 24, paddingBottom: 12,
  },
  brand: { color: '#D4AF37', fontSize: 11, fontWeight: '900', letterSpacing: 6 },
  stepPill: {
    backgroundColor: 'rgba(0,242,255,0.08)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.2)',
  },
  stepTxt: { color: '#00F2FF', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  skelWrap: { flex: 1, position: 'relative', overflow: 'hidden' },
  scanGrid: {
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.05)',
    backgroundColor: 'rgba(0,242,255,0.01)',
  },
  emaLabel: {
    position: 'absolute', bottom: 8, left: 0, right: 0,
    alignItems: 'center',
  },
  emaTxt: { color: '#2E2E2E', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  flash: { backgroundColor: '#D4AF37', zIndex: 100, pointerEvents: 'none' as any },
  footer: {
    paddingHorizontal: 24, paddingTop: 16, alignItems: 'center', gap: 10,
    backgroundColor: '#050505',
  },
  statusLabel: {
    color: '#00F2FF', fontSize: 10, fontWeight: '900', letterSpacing: 4,
  },
  stabilityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  stabPct: { color: '#00F2FF', fontSize: 22, fontWeight: '900', width: 48 },
  stabBar: {
    flex: 1, height: 4, backgroundColor: '#111', borderRadius: 2, overflow: 'hidden',
  },
  stabFill: {
    height: '100%', backgroundColor: '#00F2FF', borderRadius: 2,
    shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 4,
  },
  tieneTxt: { color: '#333', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  identifiedWrap: { alignItems: 'center', gap: 6 },
  identifiedBig: {
    color: '#D4AF37', fontSize: 32, fontWeight: '900',
    letterSpacing: -1, textAlign: 'center',
  },
  identifiedSub: {
    color: '#FFFFFF', fontSize: 14, fontWeight: '900',
    letterSpacing: 4, textAlign: 'center',
  },
});
