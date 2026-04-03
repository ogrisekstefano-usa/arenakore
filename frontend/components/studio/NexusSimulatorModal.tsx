/**
 * ARENAKORE — NEXUS SIMULATOR MODAL (Coach Studio)
 * ═══════════════════════════════════════════════════
 * Simulates a live NEXUS scan session for demo/presentation purposes.
 * Shows animated skeleton tracking with mock biometric data progression.
 * 
 * Features:
 * - Animated body silhouette with joint markers
 * - Real-time rep counter, quality score, timer progression
 * - Phase progression: CALIBRATING → TRACKING → ANALYZING → COMPLETE
 * - Injects mock event into Live Monitor on completion
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Platform,
} from 'react-native';
import Animated, {
  useSharedValue, withRepeat, withSequence, withTiming, withSpring, withDelay,
  useAnimatedStyle, FadeIn, FadeInDown, Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, PJS, MONT, fz } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const { width: SW } = Dimensions.get('window');

type SimPhase = 'idle' | 'calibrating' | 'tracking' | 'analyzing' | 'complete';

const SKELETON_JOINTS = [
  // Head
  { id: 'head', x: 50, y: 8, r: 5 },
  // Shoulders
  { id: 'l_shoulder', x: 36, y: 22, r: 3 },
  { id: 'r_shoulder', x: 64, y: 22, r: 3 },
  // Elbows
  { id: 'l_elbow', x: 26, y: 38, r: 2.5 },
  { id: 'r_elbow', x: 74, y: 38, r: 2.5 },
  // Wrists
  { id: 'l_wrist', x: 20, y: 52, r: 2 },
  { id: 'r_wrist', x: 80, y: 52, r: 2 },
  // Hips
  { id: 'l_hip', x: 40, y: 52, r: 3 },
  { id: 'r_hip', x: 60, y: 52, r: 3 },
  // Knees
  { id: 'l_knee', x: 38, y: 72, r: 2.5 },
  { id: 'r_knee', x: 62, y: 72, r: 2.5 },
  // Ankles
  { id: 'l_ankle', x: 36, y: 92, r: 2 },
  { id: 'r_ankle', x: 64, y: 92, r: 2 },
];

const SKELETON_BONES: [string, string][] = [
  ['head', 'l_shoulder'], ['head', 'r_shoulder'],
  ['l_shoulder', 'r_shoulder'],
  ['l_shoulder', 'l_elbow'], ['r_shoulder', 'r_elbow'],
  ['l_elbow', 'l_wrist'], ['r_elbow', 'r_wrist'],
  ['l_shoulder', 'l_hip'], ['r_shoulder', 'r_hip'],
  ['l_hip', 'r_hip'],
  ['l_hip', 'l_knee'], ['r_hip', 'r_knee'],
  ['l_knee', 'l_ankle'], ['r_knee', 'r_ankle'],
];

interface NexusSimulatorModalProps {
  visible: boolean;
  onClose: () => void;
  onEventInjected?: (event: any) => void;
}

export function NexusSimulatorModal({ visible, onClose, onEventInjected }: NexusSimulatorModalProps) {
  const { theme, mode } = useTheme();
  const { token } = useAuth();
  const [phase, setPhase] = useState<SimPhase>('idle');
  const [reps, setReps] = useState(0);
  const [quality, setQuality] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [jointOffsets, setJointOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const timerRef = useRef<any>(null);
  const repTimerRef = useRef<any>(null);

  // Animated values
  const skeletonPulse = useSharedValue(0.5);
  const scanLineY = useSharedValue(0);
  const borderGlow = useSharedValue(0.2);
  const completionScale = useSharedValue(0);

  // Reset on visibility change
  useEffect(() => {
    if (!visible) {
      setPhase('idle');
      setReps(0);
      setQuality(0);
      setElapsed(0);
      setConfidence(0);
      setJointOffsets({});
      if (timerRef.current) clearInterval(timerRef.current);
      if (repTimerRef.current) clearInterval(repTimerRef.current);
    }
  }, [visible]);

  // Animations
  useEffect(() => {
    if (!visible) return;
    skeletonPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ), -1, true
    );
    scanLineY.value = withRepeat(
      withTiming(100, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1, true
    );
  }, [visible]);

  // Simulation phases
  const startSimulation = useCallback(() => {
    setPhase('calibrating');
    setConfidence(0);
    
    // Phase 1: Calibrating (3s)
    let cal = 0;
    const calTimer = setInterval(() => {
      cal += 5 + Math.random() * 8;
      if (cal > 100) cal = 100;
      setConfidence(Math.round(cal));
      
      // Simulate joint jitter
      const offsets: Record<string, { dx: number; dy: number }> = {};
      SKELETON_JOINTS.forEach(j => {
        offsets[j.id] = {
          dx: (Math.random() - 0.5) * (cal > 60 ? 1 : 4),
          dy: (Math.random() - 0.5) * (cal > 60 ? 1 : 4),
        };
      });
      setJointOffsets(offsets);
      
      if (cal >= 100) {
        clearInterval(calTimer);
        borderGlow.value = withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(0.4, { duration: 300 }),
        );
        // Move to tracking phase
        setTimeout(() => startTracking(), 500);
      }
    }, 100);
  }, []);

  const startTracking = useCallback(() => {
    setPhase('tracking');
    setReps(0);
    setQuality(0);
    setElapsed(0);

    // Timer
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    // Rep simulation (every 2-4s)
    let repCount = 0;
    const simulateRep = () => {
      repCount++;
      const q = 65 + Math.random() * 30; // 65-95 quality
      setReps(repCount);
      setQuality(prev => prev === 0 ? Math.round(q) : Math.round((prev * (repCount - 1) + q) / repCount));
      
      // Joint movement (squat simulation)
      const offsets: Record<string, { dx: number; dy: number }> = {};
      const isDown = repCount % 2 === 1;
      SKELETON_JOINTS.forEach(j => {
        let dy = (Math.random() - 0.5) * 1.5;
        if (j.id.includes('knee')) dy += isDown ? 8 : -2;
        if (j.id.includes('hip')) dy += isDown ? 5 : -1;
        if (j.id.includes('ankle')) dy += isDown ? 2 : 0;
        offsets[j.id] = { dx: (Math.random() - 0.5) * 1.5, dy };
      });
      setJointOffsets(offsets);

      if (repCount >= 12) {
        // Complete simulation
        if (timerRef.current) clearInterval(timerRef.current);
        if (repTimerRef.current) clearInterval(repTimerRef.current);
        setTimeout(() => finishSimulation(repCount, Math.round((65 + Math.random() * 30 + q) / 2)), 1000);
      }
    };
    
    repTimerRef.current = setInterval(simulateRep, 2000 + Math.random() * 1500);
    // First rep quickly
    setTimeout(simulateRep, 1200);
  }, []);

  const finishSimulation = useCallback(async (finalReps: number, finalQuality: number) => {
    setPhase('analyzing');
    
    // Brief analysis phase
    setTimeout(() => {
      setPhase('complete');
      completionScale.value = withSpring(1, { damping: 8, stiffness: 120 });
      
      // Inject mock event into Live Monitor
      const mockEvent = {
        type: 'scan_complete',
        athlete: 'DEMO KORE',
        avatar_color: '#00E5FF',
        reps: finalReps,
        quality: finalQuality,
        xp_earned: Math.round(finalReps * 3.5 + finalQuality * 0.5),
        timestamp: new Date().toISOString(),
        age_secs: 0,
        isNew: true,
        is_demo: true,
      };
      
      if (onEventInjected) onEventInjected(mockEvent);
      
      // Also try posting to backend for Live Monitor broadcast
      if (token) {
        api.postSimulatedEvent?.({ ...mockEvent }, token).catch(() => {});
      }
    }, 2000);
  }, [token, onEventInjected]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + skeletonPulse.value * 0.6,
  }));

  const scanStyle = useAnimatedStyle(() => ({
    top: `${scanLineY.value}%` as any,
  }));

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(0,229,255,${borderGlow.value})`,
  }));

  const completeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completionScale.value }],
    opacity: completionScale.value,
  }));

  const phaseColor = phase === 'complete' ? '#00FF87' 
    : phase === 'tracking' ? '#00E5FF' 
    : phase === 'analyzing' ? '#FFD700' 
    : '#FF9500';

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={[sim$.overlay, { backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.92)' : 'rgba(0,0,0,0.85)' }]}>
        <View style={[sim$.modal, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={sim$.header}>
            <View style={sim$.headerLeft}>
              <View style={[sim$.statusDot, { backgroundColor: phaseColor }]} />
              <Text style={[sim$.title, MONT('900'), { color: theme.text }]}>SIMULATE NEXUS</Text>
              <Text style={[sim$.subtitle, MONT('400'), { color: theme.textTer }]}>
                {phase === 'idle' ? 'Demo Mode' : phase === 'calibrating' ? 'Calibrazione...' : phase === 'tracking' ? 'Tracking Attivo' : phase === 'analyzing' ? 'Analisi...' : 'Completato'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={sim$.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={theme.textTer} />
            </TouchableOpacity>
          </View>

          {/* Skeleton Viewport */}
          <Animated.View style={[sim$.viewport, borderStyle]}>
            {/* Scan line during calibrating/tracking */}
            {(phase === 'calibrating' || phase === 'tracking') && (
              <Animated.View style={[sim$.scanLine, scanStyle]} />
            )}

            {/* Skeleton SVG */}
            <Animated.View style={[sim$.skeletonWrap, pulseStyle]}>
              <Svg width="100%" height="100%" viewBox="0 0 100 100">
                {/* Bones */}
                {SKELETON_BONES.map(([from, to], i) => {
                  const j1 = SKELETON_JOINTS.find(j => j.id === from)!;
                  const j2 = SKELETON_JOINTS.find(j => j.id === to)!;
                  const o1 = jointOffsets[from] || { dx: 0, dy: 0 };
                  const o2 = jointOffsets[to] || { dx: 0, dy: 0 };
                  return (
                    <Line
                      key={i}
                      x1={j1.x + o1.dx} y1={j1.y + o1.dy}
                      x2={j2.x + o2.dx} y2={j2.y + o2.dy}
                      stroke={phase === 'complete' ? '#00FF87' : '#00E5FF'}
                      strokeWidth={phase === 'idle' ? 0.8 : 1.2}
                      opacity={phase === 'idle' ? 0.3 : 0.7}
                    />
                  );
                })}
                {/* Joints */}
                {SKELETON_JOINTS.map(j => {
                  const o = jointOffsets[j.id] || { dx: 0, dy: 0 };
                  return (
                    <Circle
                      key={j.id}
                      cx={j.x + o.dx} cy={j.y + o.dy} r={j.r}
                      fill={phase === 'complete' ? '#00FF87' : '#00E5FF'}
                      opacity={phase === 'idle' ? 0.2 : (confidence > 50 ? 0.9 : 0.4)}
                    />
                  );
                })}
                {/* Head circle */}
                <Circle
                  cx={50 + (jointOffsets['head']?.dx || 0)}
                  cy={8 + (jointOffsets['head']?.dy || 0)}
                  r={6}
                  fill="none"
                  stroke={phase === 'complete' ? '#00FF87' : '#00E5FF'}
                  strokeWidth={1.5}
                  opacity={phase === 'idle' ? 0.3 : 0.8}
                />
              </Svg>
            </Animated.View>

            {/* Phase overlay text */}
            {phase === 'idle' && (
              <View style={sim$.idleOverlay}>
                <Ionicons name="play-circle" size={48} color={theme.accent} />
                <Text style={[sim$.idleText, MONT('700'), { color: theme.textSec }]}>
                  Premi START per simulare{'\n'}un tracking biometrico
                </Text>
              </View>
            )}

            {/* Completion badge */}
            {phase === 'complete' && (
              <Animated.View style={[sim$.completeBadge, completeStyle]}>
                <Ionicons name="checkmark-circle" size={36} color="#00FF87" />
                <Text style={[sim$.completeText, MONT('900')]}>SCAN COMPLETO</Text>
              </Animated.View>
            )}
          </Animated.View>

          {/* Metrics Row */}
          <View style={sim$.metricsRow}>
            <View style={[sim$.metricCard, { borderColor: theme.cardBorder }]}>
              <Text style={[sim$.metricLabel, MONT('500'), { color: theme.textTer }]}>REPS</Text>
              <Text style={[sim$.metricValue, PJS('800'), { color: phaseColor }]}>{reps}</Text>
            </View>
            <View style={[sim$.metricCard, { borderColor: theme.cardBorder }]}>
              <Text style={[sim$.metricLabel, MONT('500'), { color: theme.textTer }]}>QUALITÀ</Text>
              <Text style={[sim$.metricValue, PJS('800'), { color: quality >= 80 ? '#FFD700' : phaseColor }]}>{quality}%</Text>
            </View>
            <View style={[sim$.metricCard, { borderColor: theme.cardBorder }]}>
              <Text style={[sim$.metricLabel, MONT('500'), { color: theme.textTer }]}>TEMPO</Text>
              <Text style={[sim$.metricValue, PJS('800'), { color: theme.text }]}>{fmt(elapsed)}</Text>
            </View>
            <View style={[sim$.metricCard, { borderColor: theme.cardBorder }]}>
              <Text style={[sim$.metricLabel, MONT('500'), { color: theme.textTer }]}>CONFIDENCE</Text>
              <Text style={[sim$.metricValue, PJS('800'), { color: confidence >= 90 ? '#00FF87' : phaseColor }]}>{confidence}%</Text>
            </View>
          </View>

          {/* Phase Progress Bar */}
          <View style={sim$.progressWrap}>
            {['CALIBRAZIONE', 'TRACKING', 'ANALISI', 'COMPLETATO'].map((label, i) => {
              const phases: SimPhase[] = ['calibrating', 'tracking', 'analyzing', 'complete'];
              const idx = phases.indexOf(phase);
              const isActive = i <= idx;
              const isCurrent = i === idx;
              return (
                <View key={label} style={sim$.phaseStep}>
                  <View style={[sim$.phaseDot, {
                    backgroundColor: isActive ? phaseColor : theme.surface2,
                    borderColor: isCurrent ? phaseColor : 'transparent',
                  }]} />
                  <Text style={[sim$.phaseStepLabel, MONT('600'), {
                    color: isActive ? phaseColor : theme.textTer,
                    fontSize: fz(8, mode),
                  }]}>{label}</Text>
                </View>
              );
            })}
            <View style={[sim$.phaseTrack, { backgroundColor: theme.surface2 }]}>
              <View style={[sim$.phaseFill, {
                backgroundColor: phaseColor,
                width: `${phase === 'idle' ? 0 : phase === 'calibrating' ? 15 : phase === 'tracking' ? 50 : phase === 'analyzing' ? 80 : 100}%` as any,
              }]} />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={sim$.actions}>
            {phase === 'idle' && (
              <TouchableOpacity
                style={[sim$.startBtn, { backgroundColor: theme.accent }]}
                onPress={startSimulation}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={18} color="#000" />
                <Text style={[sim$.startBtnText, MONT('900')]}>START SIMULAZIONE</Text>
              </TouchableOpacity>
            )}
            {phase === 'complete' && (
              <TouchableOpacity
                style={[sim$.startBtn, { backgroundColor: '#00FF87' }]}
                onPress={() => {
                  setPhase('idle');
                  setReps(0);
                  setQuality(0);
                  setElapsed(0);
                  setConfidence(0);
                  setJointOffsets({});
                  completionScale.value = 0;
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={18} color="#000" />
                <Text style={[sim$.startBtnText, MONT('900')]}>RIPETI DEMO</Text>
              </TouchableOpacity>
            )}
            {(phase === 'tracking' || phase === 'calibrating') && (
              <View style={[sim$.liveIndicator, { borderColor: phaseColor + '44' }]}>
                <View style={[sim$.liveDot, { backgroundColor: phaseColor }]} />
                <Text style={[sim$.liveText, MONT('700'), { color: phaseColor }]}>
                  {phase === 'calibrating' ? 'CALIBRAZIONE IN CORSO...' : 'TRACKING LIVE'}
                </Text>
              </View>
            )}
          </View>

          {/* Info note */}
          <Text style={[sim$.note, MONT('300'), { color: theme.textTer }]}>
            Simulazione con dati mock. Ideale per demo e presentazioni ai Kore.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const sim$ = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  title: { fontSize: 16, letterSpacing: 3 },
  subtitle: { fontSize: 12, letterSpacing: 1, marginLeft: 4 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

  viewport: {
    width: '100%',
    aspectRatio: 3 / 4,
    maxHeight: 320,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00E5FF',
    opacity: 0.4,
    zIndex: 10,
  },
  skeletonWrap: {
    flex: 1,
    padding: 16,
  },
  idleOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  idleText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  completeBadge: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  completeText: {
    color: '#00FF87',
    fontSize: 18,
    letterSpacing: 4,
  },

  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  metricLabel: { fontSize: 9, letterSpacing: 1.5 },
  metricValue: { fontSize: 22, letterSpacing: 1 },

  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    paddingTop: 4,
    paddingBottom: 12,
  },
  phaseStep: { alignItems: 'center', gap: 4, zIndex: 2 },
  phaseDot: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 2,
  },
  phaseStepLabel: { letterSpacing: 1 },
  phaseTrack: {
    position: 'absolute',
    top: 8,
    left: 20,
    right: 20,
    height: 3,
    borderRadius: 1.5,
    zIndex: 1,
  },
  phaseFill: {
    height: '100%',
    borderRadius: 1.5,
  },

  actions: {
    alignItems: 'center',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  startBtnText: {
    color: '#000',
    fontSize: 14,
    letterSpacing: 3,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 13, letterSpacing: 2 },

  note: {
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
