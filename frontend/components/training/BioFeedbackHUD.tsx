/**
 * ARENAKORE — BIO-FEEDBACK HUD
 * AI Coach overlay during Training Session scan.
 * - Mostra DNA Potential vs performance attuale
 * - Messaggi AI di intervento (intensità, postura, stanchezza)
 * - Barra progresso verso target reps/tempo
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeOutUp, useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';

export interface BioFeedbackState {
  currentReps: number;
  currentQuality: number;
  elapsedSeconds: number;
  targetReps: number;
  targetTime: number;
  dnaPotential: number;  // 0-100
  isActive: boolean;
}

type AIStatus = 'idle' | 'optimal' | 'increase' | 'decrease' | 'fatigue' | 'posture';

const STATUS_CFG: Record<AIStatus, { icon: keyof typeof Ionicons.glyphMap; color: string; msg: string }> = {
  idle:     { icon: 'scan',          color: 'rgba(255,255,255,0.3)', msg: 'INIZIALIZZAZIONE SENSORI...' },
  optimal:  { icon: 'checkmark-circle', color: '#00F2FF',            msg: 'RITMO OTTIMALE — CONTINUA' },
  increase: { icon: 'trending-up',   color: '#FF9500',               msg: 'AUMENTA L’INTENSITÀ' },
  decrease: { icon: 'trending-down',  color: '#34C759',              msg: 'RIDUCI — MANTIENI IL RITMO' },
  fatigue:  { icon: 'warning',        color: '#FF453A',              msg: 'STANCHEZZA RILEVATA — RESPIRA' },
  posture:  { icon: 'body',           color: '#D4AF37',              msg: 'CORREGGI LA POSTURA — SCHIENA DRITTA' },
};

function getAIStatus(state: BioFeedbackState): AIStatus {
  if (!state.isActive || state.elapsedSeconds < 5) return 'idle';
  const { currentQuality, dnaPotential, currentReps, targetReps, elapsedSeconds, targetTime } = state;

  // Rep rate: expected vs actual
  const expectedRate = targetReps / targetTime;
  const actualRate = elapsedSeconds > 0 ? currentReps / elapsedSeconds : 0;
  const rateRatio = actualRate / Math.max(expectedRate, 0.01);

  // Quality vs DNA potential (potential = theoretical max)
  const qualityRatio = currentQuality / Math.max(dnaPotential, 1);

  if (currentQuality < 30 && state.elapsedSeconds > 10) return 'posture';
  if (rateRatio < 0.5 && elapsedSeconds > 15) return 'fatigue';
  if (qualityRatio < 0.6) return 'increase';
  if (qualityRatio > 1.15) return 'decrease';
  return 'optimal';
}

export function BioFeedbackHUD({ state }: { state: BioFeedbackState }) {
  const { currentReps, currentQuality, elapsedSeconds, targetReps, targetTime, dnaPotential } = state;
  const [aiStatus, setAIStatus] = useState<AIStatus>('idle');
  const [prevMsg, setPrevMsg] = useState('');
  const msgKey = useRef(0);

  const repProgress = useSharedValue(0);
  const timeProgress = useSharedValue(0);
  const qualFill = useSharedValue(0);

  useEffect(() => {
    const newStatus = getAIStatus(state);
    const cfg = STATUS_CFG[newStatus];
    if (cfg.msg !== prevMsg) { msgKey.current++; setPrevMsg(cfg.msg); }
    setAIStatus(newStatus);
    repProgress.value = withTiming(Math.min(1, currentReps / Math.max(targetReps, 1)), { duration: 300 });
    timeProgress.value = withTiming(Math.min(1, elapsedSeconds / Math.max(targetTime, 1)), { duration: 300 });
    qualFill.value = withTiming(currentQuality / 100, { duration: 200 });
  }, [state]);

  const repStyle = useAnimatedStyle(() => ({ width: `${repProgress.value * 100}%` as any }));
  const timeStyle = useAnimatedStyle(() => ({ width: `${timeProgress.value * 100}%` as any }));
  const qualStyle = useAnimatedStyle(() => ({ width: `${qualFill.value * 100}%` as any }));

  const cfg = STATUS_CFG[aiStatus];
  const remaining = Math.max(0, targetTime - elapsedSeconds);
  const repsLeft = Math.max(0, targetReps - currentReps);

  // AI feedback score (0–100): weighted blend of quality + rep efficiency
  const repEfficiency = Math.min(1, currentReps / Math.max(targetReps, 1));
  const aiFeedbackScore = Math.round((currentQuality * 0.6 + repEfficiency * 100 * 0.4));

  return (
    <Animated.View entering={FadeIn.duration(400)} style={bf$.container}>
      {/* AI STATUS */}
      <View style={[bf$.statusRow, { borderColor: cfg.color + '30' }]}>
        <Ionicons name={cfg.icon} size={13} color={cfg.color} />
        <Text key={msgKey.current} style={[bf$.statusMsg, { color: cfg.color }]}>{cfg.msg}</Text>
      </View>

      {/* Targets grid */}
      <View style={bf$.grid}>
        {/* Rep Progress */}
        <View style={bf$.metricCol}>
          <View style={bf$.metricHeader}>
            <Text style={bf$.metricLabel}>REP</Text>
            <Text style={bf$.metricTarget}>/ {targetReps}</Text>
          </View>
          <Text style={[bf$.metricBig, currentReps >= targetReps && { color: '#34C759' }]}>{currentReps}</Text>
          <View style={bf$.miniBar}>
            <Animated.View style={[bf$.miniFill, repStyle, { backgroundColor: currentReps >= targetReps ? '#34C759' : '#00F2FF' }]} />
          </View>
        </View>

        {/* Quality vs DNA */}
        <View style={bf$.metricCol}>
          <View style={bf$.metricHeader}>
            <Text style={bf$.metricLabel}>QUALITÀ</Text>
            <Text style={bf$.metricTarget}>DNA {dnaPotential}%</Text>
          </View>
          <Text style={[bf$.metricBig, { color: currentQuality >= dnaPotential ? '#00F2FF' : '#FF9500' }]}>{currentQuality}%</Text>
          <View style={bf$.miniBar}>
            <Animated.View style={[bf$.miniFill, qualStyle, { backgroundColor: currentQuality >= dnaPotential ? '#00F2FF' : '#FF9500' }]} />
          </View>
        </View>

        {/* Time Remaining */}
        <View style={bf$.metricCol}>
          <View style={bf$.metricHeader}>
            <Text style={bf$.metricLabel}>TEMPO</Text>
            <Text style={bf$.metricTarget}>/ {targetTime}s</Text>
          </View>
          <Text style={[bf$.metricBig, remaining <= 10 && remaining > 0 && { color: '#FF453A' }]}>{remaining}s</Text>
          <View style={bf$.miniBar}>
            <Animated.View style={[bf$.miniFill, timeStyle, { backgroundColor: '#D4AF37' }]} />
          </View>
        </View>
      </View>

      {/* AI Score */}
      <View style={bf$.aiRow}>
        <Text style={bf$.aiLabel}>AI SCORE</Text>
        <Text style={[bf$.aiVal, { color: aiFeedbackScore >= 80 ? '#D4AF37' : aiFeedbackScore >= 60 ? '#00F2FF' : '#FF453A' }]}>{aiFeedbackScore}</Text>
        <View style={bf$.aiBarBg}>
          <View style={[bf$.aiBarFill, { width: `${aiFeedbackScore}%` as any, backgroundColor: aiFeedbackScore >= 80 ? '#D4AF37' : '#00F2FF' }]} />
        </View>
      </View>

      {/* Reps left reminder */}
      {repsLeft > 0 && repsLeft <= 5 && (
        <Text style={bf$.urgentText}>ULTIM{repsLeft === 1 ? 'A' : 'E'} {repsLeft} REP!</Text>
      )}
    </Animated.View>
  );
}

const bf$ = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 175, left: 10, right: 10, zIndex: 35,
    backgroundColor: 'rgba(0,0,0,0.82)', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8,
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  statusMsg: { fontSize: 11, fontWeight: '900', letterSpacing: 2, flex: 1 },
  grid: { flexDirection: 'row', gap: 8 },
  metricCol: { flex: 1, gap: 3 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  metricLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  metricTarget: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '400' },
  metricBig: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  miniBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 2 },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', letterSpacing: 2, width: 56 },
  aiVal: { fontSize: 13, fontWeight: '900', width: 28 },
  aiBarBg: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  aiBarFill: { height: '100%', borderRadius: 2 },
  urgentText: { color: '#FF453A', fontSize: 13, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
});
