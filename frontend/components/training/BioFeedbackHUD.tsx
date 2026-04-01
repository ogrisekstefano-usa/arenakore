/**
 * ARENAKORE — BIO-FEEDBACK HUD v2.0
 * AI Coach: messaggi grandi, centrati, 1.5s poi spariscono.
 * "Senti la tensione — non leggere i dati."
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeIn, FadeOut, useSharedValue, withTiming, withSequence, useAnimatedStyle,
} from 'react-native-reanimated';

export interface BioFeedbackState {
  currentReps: number;
  currentQuality: number;
  elapsedSeconds: number;
  targetReps: number;
  targetTime: number;
  dnaPotential: number;
  isActive: boolean;
}

type AIStatus = 'idle' | 'optimal' | 'increase' | 'decrease' | 'fatigue' | 'posture' | 'almost' | 'last';

const AI_MESSAGES: Record<AIStatus, { msg: string; color: string }> = {
  idle:     { msg: '',              color: '#FFFFFF' },
  optimal:  { msg: 'TIENICI.',      color: '#00F2FF' },
  increase: { msg: 'PIÙ FORTE.',    color: '#FF9500' },
  decrease: { msg: 'RESPIRA.',      color: '#34C759' },
  fatigue:  { msg: 'NON MOLLARE.', color: '#FF453A' },
  posture:  { msg: 'SCHIENA.',      color: '#D4AF37' },
  almost:   { msg: 'CI SIAMO.',     color: '#00F2FF' },
  last:     { msg: 'ULTIMA!',       color: '#FF453A' },
};

function getAIStatus(state: BioFeedbackState): AIStatus {
  if (!state.isActive || state.elapsedSeconds < 4) return 'idle';
  const { currentQuality, dnaPotential, currentReps, targetReps, elapsedSeconds, targetTime } = state;
  const repsLeft = targetReps - currentReps;
  const timeLeft = targetTime - elapsedSeconds;
  const expectedRate = targetReps / Math.max(targetTime, 1);
  const actualRate = currentReps / Math.max(elapsedSeconds, 1);

  if (repsLeft === 1) return 'last';
  if (repsLeft <= 3 && repsLeft > 0) return 'almost';
  if (currentQuality < 30 && elapsedSeconds > 8) return 'posture';
  if (actualRate < expectedRate * 0.5 && elapsedSeconds > 12) return 'fatigue';
  if (currentQuality / Math.max(dnaPotential, 1) < 0.6) return 'increase';
  if (currentQuality / Math.max(dnaPotential, 1) > 1.1) return 'decrease';
  return 'optimal';
}

export function BioFeedbackHUD({ state }: { state: BioFeedbackState }) {
  const [shownMsg, setShownMsg] = useState<{ msg: string; color: string; key: number } | null>(null);
  const lastStatus = useRef<AIStatus>('idle');
  const msgTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI score 0-100
  const repEff = Math.min(1, state.currentReps / Math.max(state.targetReps, 1));
  const aiFeedbackScore = Math.round(state.currentQuality * 0.6 + repEff * 100 * 0.4);
  const remaining = Math.max(0, state.targetTime - state.elapsedSeconds);

  useEffect(() => {
    const status = getAIStatus(state);
    if (status === lastStatus.current || status === 'idle') return;
    lastStatus.current = status;
    const cfg = AI_MESSAGES[status];
    if (!cfg.msg) return;
    const key = Date.now();
    setShownMsg({ msg: cfg.msg, color: cfg.color, key });
    if (msgTimeout.current) clearTimeout(msgTimeout.current);
    msgTimeout.current = setTimeout(() => setShownMsg(null), 1500);
  }, [state.elapsedSeconds]);

  return (
    <View style={bf$.container} pointerEvents="none">
      {/* Minimal corner data */}
      <View style={bf$.corners}>
        <Text style={bf$.corner}>{state.currentReps}<Text style={bf$.cornerUnit}> REP</Text></Text>
        <Text style={bf$.corner}>{remaining}<Text style={bf$.cornerUnit}>s</Text></Text>
      </View>

      {/* Big centered AI message */}
      {shownMsg && (
        <Animated.View
          key={shownMsg.key}
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(400)}
          style={bf$.msgWrap}
        >
          <Text style={[bf$.msg, { color: shownMsg.color }]}>{shownMsg.msg}</Text>
        </Animated.View>
      )}

      {/* AI Score bar (bottom) */}
      <View style={bf$.scoreRow}>
        <Text style={bf$.scoreLabel}>AI</Text>
        <View style={bf$.scoreBar}>
          <View style={[bf$.scoreFill, { width: `${aiFeedbackScore}%` as any, backgroundColor: aiFeedbackScore >= 80 ? '#D4AF37' : '#00F2FF' }]} />
        </View>
        <Text style={[bf$.scoreVal, { color: aiFeedbackScore >= 80 ? '#D4AF37' : '#00F2FF' }]}>{aiFeedbackScore}</Text>
      </View>
    </View>
  );
}

const bf$ = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 170, left: 0, right: 0, zIndex: 35,
    alignItems: 'center', paddingHorizontal: 16,
  },
  corners: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
  corner: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  cornerUnit: { fontSize: 12, fontWeight: '300', letterSpacing: 2, color: 'rgba(255,255,255,0.4)' },
  msgWrap: { alignItems: 'center', marginBottom: 16 },
  msg: { fontSize: 42, fontWeight: '900', letterSpacing: 6, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: 8 },
  scoreLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '900', letterSpacing: 2, width: 16 },
  scoreBar: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 2 },
  scoreVal: { fontSize: 13, fontWeight: '900', width: 28, textAlign: 'right' },
});

