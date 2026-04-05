/**
 * ARENAKORE — BIO-FEEDBACK HUD v3.0
 * "BRUCIA!" experience: messaggi 48px, colori DNA-dinamici, zero rumore visivo.
 * Verde = sopra media DNA · Arancione = sotto · Rosso = affaticamento
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  FadeIn, FadeOut, useSharedValue, withTiming, withSequence,
  useAnimatedStyle, Easing, withRepeat,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');

export interface BioFeedbackState {
  currentReps: number;
  currentQuality: number;
  elapsedSeconds: number;
  targetReps: number;
  targetTime: number;
  dnaPotential: number;
  isActive: boolean;
  isMasterTemplate?: boolean;
  exerciseName?: string;
}

type AIStatus = 'idle' | 'optimal' | 'increase' | 'fatigue' | 'posture' | 'almost' | 'last' | 'go';

// ── Dynamic color: verde se sopra DNA potential, arancione se sotto ────────────
function getDynamicColor(quality: number, dnaPotential: number): string {
  const ratio = quality / Math.max(dnaPotential, 1);
  if (ratio >= 1.0) return '#00FF87';   // green: at or above potential
  if (ratio >= 0.7) return '#FF9500';   // orange: below potential
  return '#FF3B30';                      // red: significantly below
}

// ── Energetic messages (no period = more urgent) ──────────────────────────────
const AI_MESSAGES: Record<AIStatus, string[]> = {
  idle:     [''],
  optimal:  ['TIENICI.', 'PERFETTO.', 'RITMO.'],
  increase: ['BRUCIA!', 'PIÙ FORTE!', 'SPINGI!', 'ADESSO!', 'CARICA!'],
  fatigue:  ['NON MOLLARE.', 'RESPIRA.', 'RESISTI.'],
  posture:  ['SCHIENA!', 'POSTURA!', 'DRITTA!'],
  almost:   ['QUASI FATTA!', 'CI SIAMO!', 'ANCORA UN PO!'],
  last:     ['ULTIMA!', 'VAI!', 'FALLA!'],
  go:       ['VIA!', 'GO!', 'INIZIA!'],
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)] || '';
}

function getAIStatus(state: BioFeedbackState): AIStatus {
  if (!state.isActive || state.elapsedSeconds < 3) return 'idle';
  const { currentQuality, dnaPotential, currentReps, targetReps, elapsedSeconds, targetTime } = state;
  const repsLeft = targetReps - currentReps;
  const expectedRate = targetReps / Math.max(targetTime, 1);
  const actualRate = currentReps / Math.max(elapsedSeconds, 1);
  const qualityRatio = currentQuality / Math.max(dnaPotential, 1);

  if (repsLeft === 1) return 'last';
  if (repsLeft <= 3 && repsLeft > 0) return 'almost';
  if (currentQuality < 25 && elapsedSeconds > 8) return 'posture';
  if (actualRate < expectedRate * 0.45 && elapsedSeconds > 10) return 'fatigue';
  if (qualityRatio < 0.65) return 'increase';
  return 'optimal';
}

// ── REP Counter (enormous, bottom-left) ──────────────────────────────────────
function RepCounter({ reps, targetReps, dnaPotential, quality }: {
  reps: number; targetReps: number; dnaPotential: number; quality: number;
}) {
  const color = getDynamicColor(quality, dnaPotential);
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.18, { duration: 80, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 120 })
    );
  }, [reps]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[rc$.wrap, style]}>
      <Text style={[rc$.reps, { color }]}>{reps}</Text>
      <Text style={rc$.target}>/ {targetReps}</Text>
    </Animated.View>
  );
}

const rc$ = StyleSheet.create({
  wrap: { alignItems: 'flex-end' },
  reps: { fontSize: 72, fontWeight: '900', letterSpacing: -2, lineHeight: 72, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
  target: { color: 'rgba(255,255,255,0.2)', fontSize: 18, fontWeight: '300', letterSpacing: 1 },
});

// ── Time Arc (top, minimal) ───────────────────────────────────────────────────
function TimeDisplay({ remaining, targetTime }: { remaining: number; targetTime: number }) {
  const isUrgent = remaining <= 10 && remaining > 0;
  return (
    <View style={td$.wrap}>
      <Text style={[td$.time, { color: isUrgent ? '#FF3B30' : 'rgba(255,255,255,0.5)' }]}>
        {remaining}
        <Text style={td$.unit}>s</Text>
      </Text>
    </View>
  );
}
const td$ = StyleSheet.create({
  wrap: {},
  time: { fontSize: 32, fontWeight: '900', letterSpacing: 1 },
  unit: { fontSize: 16, fontWeight: '300', color: 'rgba(255,255,255,0.3)' },
});

// ── Main HUD ──────────────────────────────────────────────────────────────────
export function BioFeedbackHUD({ state }: { state: BioFeedbackState }) {
  const [shownMsg, setShownMsg] = useState<{ msg: string; color: string; key: number } | null>(null);
  const lastStatus = useRef<AIStatus>('idle');
  const msgTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const remaining = Math.max(0, state.targetTime - state.elapsedSeconds);
  const dynColor = getDynamicColor(state.currentQuality, state.dnaPotential);
  const isMaster = state.isMasterTemplate === true;

  // ── "COACH CERTIFIED" aura pulse ──
  const auraGlow = useSharedValue(0.5);
  useEffect(() => {
    if (isMaster) {
      auraGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ), -1, false
      );
    }
  }, [isMaster]);
  const auraStyle = useAnimatedStyle(() => ({
    opacity: auraGlow.value,
  }));

  useEffect(() => {
    const status = getAIStatus(state);
    if (status === lastStatus.current || status === 'idle') return;
    lastStatus.current = status;
    const msgs = AI_MESSAGES[status];
    const msg = pickRandom(msgs);
    if (!msg) return;
    // Color: green above potential, orange below, red for fatigue
    const color = status === 'fatigue' || status === 'posture' ? '#FF3B30'
      : status === 'almost' || status === 'last' ? '#00E5FF'
      : dynColor;
    const key = Date.now();
    setShownMsg({ msg, color, key });
    if (msgTimeout.current) clearTimeout(msgTimeout.current);
    msgTimeout.current = setTimeout(() => setShownMsg(null), 1000);
  }, [state.elapsedSeconds]);

  return (
    <View style={bf$.container} pointerEvents="none">
      {/* ── TOP: COACH CERTIFIED BADGE + Exercise Name ── */}
      <View style={bf$.topRow}>
        <View style={bf$.topLeft}>
          {/* Coach Certified Badge with green aura */}
          {isMaster && (
            <Animated.View style={[bf$.coachBadge, auraStyle]}>
              <View style={bf$.coachBadgeInner}>
                <Ionicons name="shield-checkmark" size={12} color="#00FF87" />
                <Text style={bf$.coachBadgeText}>COACH CERTIFIED</Text>
              </View>
            </Animated.View>
          )}
          {/* Exercise Name */}
          {state.exerciseName ? (
            <Text style={bf$.exerciseName}>{state.exerciseName.toUpperCase()}</Text>
          ) : null}
        </View>
        <TimeDisplay remaining={remaining} targetTime={state.targetTime} />
      </View>

      {/* Giant centered AI message — FULL SCREEN IMPACT */}
      {shownMsg && (
        <Animated.View
          key={shownMsg.key}
          entering={FadeIn.duration(80)}
          exiting={FadeOut.duration(350)}
          style={bf$.msgOverlay}
        >
          <Text style={[bf$.msg, { color: shownMsg.color }]}>{shownMsg.msg}</Text>
        </Animated.View>
      )}

      {/* ── BOTTOM: REP COUNTER (huge) + Quality indicator for Coach ── */}
      <View style={bf$.bottomRow}>
        {isMaster && (
          <View style={bf$.qualityRow}>
            <View style={[bf$.qualDot, { backgroundColor: state.currentQuality >= 80 ? '#00FF87' : state.currentQuality >= 50 ? '#FF9500' : '#FF3B30' }]} />
            <Text style={[bf$.qualText, { color: state.currentQuality >= 80 ? '#00FF87' : state.currentQuality >= 50 ? '#FF9500' : '#FF3B30' }]}>
              {state.currentQuality >= 80 ? 'VALID' : 'STRICT'}
            </Text>
          </View>
        )}
        <RepCounter
          reps={state.currentReps}
          targetReps={state.targetReps}
          dnaPotential={state.dnaPotential}
          quality={state.currentQuality}
        />
      </View>
    </View>
  );
}

const bf$ = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 35,
  },
  topRow: {
    position: 'absolute', top: 80, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  topLeft: {
    gap: 6,
  },
  // ── Coach Certified Badge ──
  coachBadge: {
    borderRadius: 8, overflow: 'hidden',
  },
  coachBadgeInner: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,255,135,0.12)',
    borderWidth: 1, borderColor: 'rgba(0,255,135,0.40)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  coachBadgeText: {
    color: '#00FF87', fontSize: 10, fontWeight: '900', letterSpacing: 2,
  },
  exerciseName: {
    color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '800',
    letterSpacing: 3, marginTop: 2,
  },
  msgOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  msg: {
    fontSize: 52, fontWeight: '900', letterSpacing: 8,
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
    textAlign: 'center',
  },
  bottomRow: {
    position: 'absolute', bottom: 220, right: 24,
    alignItems: 'flex-end', gap: 6,
  },
  // ── Quality indicator for Coach Strict mode ──
  qualityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.40)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  qualDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  qualText: {
    fontSize: 10, fontWeight: '900', letterSpacing: 1.5,
  },
});
