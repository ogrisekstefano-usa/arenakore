import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  Dimensions, Platform, Modal, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, withRepeat, withSequence, withTiming,
  useAnimatedStyle, withSpring, withDelay, runOnJS,
  Easing, interpolate,
} from 'react-native-reanimated';
import Svg, { Line, Rect, Circle, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { sendScanCompleteNotification, sendXPRewardNotification } from '../../utils/notifications';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const GRID_SIZE = 40;
const COLS = Math.ceil(SCREEN_W / GRID_SIZE);
const ROWS = Math.ceil(SCREEN_H / GRID_SIZE);

// =====================
// CYBER GRID OVERLAY (SVG)
// =====================
function CyberGrid({ pulse }: { pulse: Animated.SharedValue<number> }) {
  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.15, 0.4]),
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]} pointerEvents="none">
      <Svg width={SCREEN_W} height={SCREEN_H}>
        {/* Vertical lines */}
        {Array.from({ length: COLS + 1 }).map((_, i) => (
          <Line
            key={`v-${i}`}
            x1={i * GRID_SIZE} y1={0}
            x2={i * GRID_SIZE} y2={SCREEN_H}
            stroke="#00F2FF" strokeWidth={0.5} opacity={0.3}
          />
        ))}
        {/* Horizontal lines */}
        {Array.from({ length: ROWS + 1 }).map((_, i) => (
          <Line
            key={`h-${i}`}
            x1={0} y1={i * GRID_SIZE}
            x2={SCREEN_W} y2={i * GRID_SIZE}
            stroke="#00F2FF" strokeWidth={0.5} opacity={0.3}
          />
        ))}
        {/* Center crosshair */}
        <Circle cx={SCREEN_W / 2} cy={SCREEN_H / 2} r={60} stroke="#00F2FF" strokeWidth={1.5} fill="none" opacity={0.5} />
        <Circle cx={SCREEN_W / 2} cy={SCREEN_H / 2} r={90} stroke="#00F2FF" strokeWidth={0.8} fill="none" opacity={0.25} strokeDasharray="8,6" />
        <Line x1={SCREEN_W / 2 - 80} y1={SCREEN_H / 2} x2={SCREEN_W / 2 - 30} y2={SCREEN_H / 2} stroke="#00F2FF" strokeWidth={1.5} opacity={0.6} />
        <Line x1={SCREEN_W / 2 + 30} y1={SCREEN_H / 2} x2={SCREEN_W / 2 + 80} y2={SCREEN_H / 2} stroke="#00F2FF" strokeWidth={1.5} opacity={0.6} />
        <Line x1={SCREEN_W / 2} y1={SCREEN_H / 2 - 80} x2={SCREEN_W / 2} y2={SCREEN_H / 2 - 30} stroke="#00F2FF" strokeWidth={1.5} opacity={0.6} />
        <Line x1={SCREEN_W / 2} y1={SCREEN_H / 2 + 30} x2={SCREEN_W / 2} y2={SCREEN_H / 2 + 80} stroke="#00F2FF" strokeWidth={1.5} opacity={0.6} />
        {/* Corner brackets */}
        <Rect x={20} y={80} width={40} height={40} stroke="#00F2FF" strokeWidth={1.5} fill="none" opacity={0.4} />
        <Rect x={SCREEN_W - 60} y={80} width={40} height={40} stroke="#00F2FF" strokeWidth={1.5} fill="none" opacity={0.4} />
        <Rect x={20} y={SCREEN_H - 160} width={40} height={40} stroke="#00F2FF" strokeWidth={1.5} fill="none" opacity={0.4} />
        <Rect x={SCREEN_W - 60} y={SCREEN_H - 160} width={40} height={40} stroke="#00F2FF" strokeWidth={1.5} fill="none" opacity={0.4} />
        {/* HUD text */}
        <SvgText x={24} y={72} fill="#00F2FF" fontSize={9} fontWeight="bold" opacity={0.6}>ARENAKORE v2.1</SvgText>
        <SvgText x={SCREEN_W - 120} y={72} fill="#00F2FF" fontSize={9} fontWeight="bold" opacity={0.6}>BIOMETRIC SCAN</SvgText>
      </Svg>
    </Animated.View>
  );
}

// =====================
// SCAN LINE ANIMATION
// =====================
function ScanLine({ active }: { active: boolean }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (active) {
      translateY.value = withRepeat(
        withTiming(SCREEN_H - 200, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
    }
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: active ? 0.7 : 0,
  }));

  return (
    <Animated.View style={[styles.scanLine, animStyle]} pointerEvents="none">
      <View style={styles.scanLineGradient} />
    </Animated.View>
  );
}

// =====================
// COUNTDOWN COMPONENT
// =====================
function Countdown({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(3);
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  const doHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          doHaptic();
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
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(500, withTiming(0.4, { duration: 300 }))
    );
    doHaptic();
  }, [count]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.countdownOverlay}>
      <Animated.View style={[styles.countdownCircle, animStyle]}>
        <Text style={styles.countdownText}>
          {count === 0 ? 'START' : count}
        </Text>
      </Animated.View>
      <Text style={styles.countdownSub}>
        {count > 0 ? 'PREPARATI' : 'NEXUS ATTIVATO'}
      </Text>
    </View>
  );
}

// =====================
// RESULTS MODAL
// =====================
function ResultsModal({
  visible, result, onClose,
}: {
  visible: boolean;
  result: any;
  onClose: () => void;
}) {
  const slideY = useSharedValue(300);
  const fadeIn = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      slideY.value = withSpring(0, { damping: 15, stiffness: 100 });
      fadeIn.value = withTiming(1, { duration: 400 });
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
    opacity: fadeIn.value,
  }));

  if (!visible || !result) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.resultBackdrop}>
        <Animated.View style={[styles.resultCard, containerStyle]}>
          <Text style={styles.resultTitle}>⚡ SCAN COMPLETATO</Text>

          <View style={styles.resultScoreCircle}>
            <Text style={styles.resultScoreVal}>{result.performance_score?.toFixed(1) || '—'}</Text>
            <Text style={styles.resultScoreLabel}>SCORE</Text>
          </View>

          <View style={styles.resultRow}>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatLabel}>XP BASE</Text>
              <Text style={styles.resultStatVal}>+{result.base_xp}</Text>
            </View>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatLabel}>BONUS</Text>
              <Text style={[styles.resultStatVal, { color: '#D4AF37' }]}>+{result.perf_bonus + result.time_bonus}</Text>
            </View>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatLabel}>TOTALE</Text>
              <Text style={[styles.resultStatVal, { color: '#00F2FF' }]}>+{result.xp_earned}</Text>
            </View>
          </View>

          {result.records_broken?.length > 0 && (
            <View style={styles.recordBanner}>
              <Text style={styles.recordTitle}>🏆 RECORD INFRANTI!</Text>
              <Text style={styles.recordList}>
                {result.records_broken.map((r: string) => r.toUpperCase()).join(' · ')}
              </Text>
            </View>
          )}

          {result.level_up && (
            <View style={styles.levelUpBanner}>
              <Text style={styles.levelUpText}>🌟 LEVEL UP! → LVL {result.new_level}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.resultCloseBtn} onPress={onClose}>
            <Text style={styles.resultCloseBtnText}>CHIUDI</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// =====================
// PERMISSION MODAL (Apple-style)
// =====================
function PermissionModal({
  visible, onAllow, onDeny,
}: {
  visible: boolean;
  onAllow: () => void;
  onDeny: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.permBackdrop}>
        <View style={styles.permCard}>
          <View style={styles.permIconCircle}>
            <Text style={styles.permIcon}>📷</Text>
          </View>
          <Text style={styles.permTitle}>Accesso Fotocamera</Text>
          <Text style={styles.permDesc}>
            ArenaKore utilizza la fotocamera per la{'\n'}scansione biometrica Nexus Sync
          </Text>
          <TouchableOpacity style={styles.permAllowBtn} onPress={onAllow}>
            <Text style={styles.permAllowText}>CONSENTI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.permDenyBtn} onPress={onDeny}>
            <Text style={styles.permDenyText}>Non ora</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// =====================
// MAIN NEXUS TRIGGER SCREEN
// =====================
export default function NexusTriggerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, updateUser } = useAuth();

  // State machine: idle → permission → countdown → scanning → results
  const [phase, setPhase] = useState<'idle' | 'permission' | 'countdown' | 'scanning' | 'results'>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<any>(null);
  const [showPermModal, setShowPermModal] = useState(false);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animations
  const gridPulse = useSharedValue(0);
  const triggerScale = useSharedValue(1);
  const triggerGlow = useSharedValue(0);
  const hudOpacity = useSharedValue(1);

  // Start grid pulse
  useEffect(() => {
    gridPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1, false
    );
    triggerGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0.3, { duration: 1200 })
      ),
      -1, false
    );
  }, []);

  const triggerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: triggerScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(triggerGlow.value, [0, 1], [0.3, 0.9]),
    shadowRadius: interpolate(triggerGlow.value, [0, 1], [8, 25]),
  }));

  const hudAnimStyle = useAnimatedStyle(() => ({
    opacity: hudOpacity.value,
  }));

  // Handle scan start
  const handleStartScan = () => {
    if (Platform.OS === 'web') {
      // On web, skip camera permission, go straight to countdown
      setPhase('countdown');
    } else {
      setShowPermModal(true);
      setPhase('permission');
    }
  };

  const handlePermissionAllow = () => {
    setShowPermModal(false);
    setPhase('countdown');
  };

  const handlePermissionDeny = () => {
    setShowPermModal(false);
    setPhase('idle');
  };

  const handleCountdownComplete = () => {
    setPhase('scanning');
    startScan();
  };

  const startScan = () => {
    setScanProgress(0);
    let progress = 0;
    scanTimerRef.current = setInterval(() => {
      progress += 2;
      setScanProgress(progress);
      if (progress >= 100) {
        if (scanTimerRef.current) clearInterval(scanTimerRef.current);
        completeScan();
      }
    }, 100);
  };

  const completeScan = async () => {
    // Haptic feedback for completion
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      if (token) {
        const result = await api.completeChallenge({
          performance_score: Math.random() * 30 + 70,
          duration_seconds: 5,
        }, token);
        setScanResult(result);

        // Update user in context
        if (result.user) {
          updateUser(result.user);
        }

        // Send notifications
        sendScanCompleteNotification(result.performance_score);
        if (result.records_broken?.length > 0) {
          sendXPRewardNotification(result.xp_earned, result.records_broken, user?.sport);
        }
      }
    } catch (e) {
      console.log('Challenge complete error:', e);
      // Mock result for demo
      setScanResult({
        performance_score: 87.3,
        xp_earned: 125,
        base_xp: 75,
        perf_bonus: 35,
        time_bonus: 15,
        records_broken: ['velocita', 'potenza'],
        level_up: false,
        new_level: user?.level || 1,
      });
    }
    setPhase('results');
  };

  const handleResultClose = () => {
    setPhase('idle');
    setScanResult(null);
    setScanProgress(0);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="nexus-trigger-screen">
      <StatusBar barStyle="light-content" />

      {/* Simulated camera background */}
      <View style={styles.cameraSimulation}>
        <View style={styles.cameraNoise} />
      </View>

      {/* Cyber Grid Overlay */}
      <CyberGrid pulse={gridPulse} />

      {/* Scan Line */}
      <ScanLine active={phase === 'scanning'} />

      {/* Top HUD */}
      <Animated.View style={[styles.topHud, { top: insets.top + 8 }, hudAnimStyle]}>
        <TouchableOpacity testID="nexus-close-btn" onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.hudCenter}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>
              {phase === 'scanning' ? 'SCANNING' : phase === 'results' ? 'COMPLETE' : 'NEXUS READY'}
            </Text>
          </View>
        </View>
        <View style={styles.closeBtn}>
          <Text style={styles.hudFps}>
            {phase === 'scanning' ? '30fps' : '—'}
          </Text>
        </View>
      </Animated.View>

      {/* Scan progress bar */}
      {phase === 'scanning' && (
        <View style={[styles.scanProgressBar, { top: insets.top + 52 }]}>
          <View style={[styles.scanProgressFill, { width: `${scanProgress}%` as any }]} />
          <Text style={styles.scanProgressText}>{scanProgress}%</Text>
        </View>
      )}

      {/* Center content based on phase */}
      {phase === 'idle' && (
        <View style={styles.centerContent}>
          <Animated.View style={triggerAnimStyle}>
            <TouchableOpacity
              testID="nexus-start-scan"
              onPress={handleStartScan}
              onPressIn={() => { triggerScale.value = withSpring(0.9, { damping: 12 }); }}
              onPressOut={() => { triggerScale.value = withSpring(1, { damping: 12 }); }}
              activeOpacity={1}
            >
              <Animated.View style={[styles.triggerButton, glowStyle]}>
                <Text style={styles.triggerIcon}>⚡</Text>
                <Text style={styles.triggerLabel}>TRIGGER</Text>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.triggerHint}>Premi per attivare lo scan biometrico</Text>
        </View>
      )}

      {phase === 'countdown' && (
        <Countdown onComplete={handleCountdownComplete} />
      )}

      {phase === 'scanning' && (
        <View style={styles.centerContent}>
          <View style={styles.scanActiveCircle}>
            <ActivityIndicator color="#00F2FF" size="large" />
            <Text style={styles.scanActiveText}>ANALISI IN CORSO</Text>
            <Text style={styles.scanActiveSub}>Elaborazione dati biometrici...</Text>
          </View>
        </View>
      )}

      {/* Bottom HUD */}
      <Animated.View style={[styles.bottomHud, { bottom: insets.bottom + 16 }, hudAnimStyle]}>
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
      </Animated.View>

      {/* Permission Modal */}
      <PermissionModal
        visible={showPermModal}
        onAllow={handlePermissionAllow}
        onDeny={handlePermissionDeny}
      />

      {/* Results Modal */}
      <ResultsModal
        visible={phase === 'results'}
        result={scanResult}
        onClose={handleResultClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },

  // Camera simulation
  cameraSimulation: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0A',
  },
  cameraNoise: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080808',
    opacity: 0.9,
  },

  // Scan line
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 3, zIndex: 10,
  },
  scanLineGradient: {
    flex: 1,
    backgroundColor: '#00F2FF',
    shadowColor: '#00F2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },

  // Top HUD
  topHud: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, zIndex: 20,
  },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#888', fontSize: 22, fontWeight: '300' },
  hudCenter: { alignItems: 'center' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00F2FF' },
  liveText: { color: '#00F2FF', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  hudFps: { color: '#555', fontSize: 10, fontWeight: '700' },

  // Scan progress
  scanProgressBar: {
    position: 'absolute', left: 20, right: 20, height: 3,
    backgroundColor: '#1A1A1A', borderRadius: 2, zIndex: 20, overflow: 'hidden',
  },
  scanProgressFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  scanProgressText: {
    position: 'absolute', right: 0, top: 6, color: '#00F2FF',
    fontSize: 10, fontWeight: '800', letterSpacing: 1,
  },

  // Center content
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', zIndex: 15,
  },

  // Trigger button
  triggerButton: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(0,242,255,0.08)',
    borderWidth: 2.5, borderColor: '#00F2FF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#00F2FF',
    shadowOffset: { width: 0, height: 0 },
    elevation: 15,
  },
  triggerIcon: { fontSize: 40, marginBottom: 2 },
  triggerLabel: { color: '#00F2FF', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  triggerHint: { color: '#555', fontSize: 12, marginTop: 24, letterSpacing: 0.5 },

  // Countdown
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', zIndex: 25,
    backgroundColor: 'rgba(5,5,5,0.85)',
  },
  countdownCircle: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(0,242,255,0.08)',
    borderWidth: 3, borderColor: '#00F2FF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 30, elevation: 15,
  },
  countdownText: { color: '#00F2FF', fontSize: 64, fontWeight: '900', letterSpacing: -2 },
  countdownSub: { color: '#888', fontSize: 12, fontWeight: '700', letterSpacing: 3, marginTop: 24 },

  // Scan active
  scanActiveCircle: { alignItems: 'center', gap: 16 },
  scanActiveText: { color: '#00F2FF', fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  scanActiveSub: { color: '#555', fontSize: 12 },

  // Bottom HUD
  bottomHud: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 32, zIndex: 20,
  },
  hudStat: { alignItems: 'center', gap: 2 },
  hudStatLabel: { color: '#555', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  hudStatVal: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },

  // Permission modal
  permBackdrop: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  permCard: {
    width: SCREEN_W * 0.78, backgroundColor: '#1A1A1A',
    borderRadius: 16, padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  permIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,242,255,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  permIcon: { fontSize: 30 },
  permTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  permDesc: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  permAllowBtn: {
    width: '100%', backgroundColor: '#00F2FF', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginBottom: 10,
  },
  permAllowText: { color: '#050505', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  permDenyBtn: { paddingVertical: 8 },
  permDenyText: { color: '#888', fontSize: 14 },

  // Results modal
  resultBackdrop: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(5,5,5,0.9)',
  },
  resultCard: {
    width: SCREEN_W * 0.85, backgroundColor: '#111111',
    borderRadius: 20, padding: 28, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.3)',
  },
  resultTitle: {
    color: '#00F2FF', fontSize: 12, fontWeight: '800', letterSpacing: 4, marginBottom: 20,
  },
  resultScoreCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(0,242,255,0.06)',
    borderWidth: 2.5, borderColor: '#00F2FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  resultScoreVal: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  resultScoreLabel: { color: '#00F2FF', fontSize: 8, fontWeight: '700', letterSpacing: 2 },
  resultRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginBottom: 20 },
  resultStat: { alignItems: 'center', gap: 4 },
  resultStatLabel: { color: '#555', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  resultStatVal: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  recordBanner: {
    width: '100%', backgroundColor: 'rgba(212,175,55,0.08)',
    borderRadius: 10, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)', marginBottom: 12, gap: 4,
  },
  recordTitle: { color: '#D4AF37', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  recordList: { color: '#D4AF37', fontSize: 11, fontWeight: '600' },
  levelUpBanner: {
    width: '100%', backgroundColor: 'rgba(0,242,255,0.08)',
    borderRadius: 10, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.3)', marginBottom: 12,
  },
  levelUpText: { color: '#00F2FF', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  resultCloseBtn: {
    width: '100%', backgroundColor: '#00F2FF', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  resultCloseBtnText: { color: '#050505', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
});
