/**
 * ARENAKORE — TILT GUIDE OVERLAY
 * Pre-scan positioning system for 3-meter athlete UX.
 *
 * FLOW:
 * 1. Gyroscope reads tilt angle (DeviceMotion)
 * 2. Bubble level shows if angle is correct (~15° from flat)
 * 3. Voice: "Inclinazione perfetta. Ora allontanati di 3 metri"
 * 4. Flash beacon (screen pulsing white) + ping audio
 * 5. Countdown → scan starts automatically
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, withRepeat, withSequence, withTiming, withSpring,
  useAnimatedStyle, Easing, FadeIn, FadeOut,
  interpolate, Extrapolation
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DeviceMotion, DeviceMotionMeasurement } from 'expo-sensors';
import { RemoteUXEngine } from '../utils/RemoteUXEngine';

const { width: SW, height: SH } = Dimensions.get('window');
const CYAN = '#00E5FF';
const GREEN = '#00FF87';
const ORANGE = '#FF9500';
const RED = '#FF3B30';

// ── Tilt analysis ────────────────────────────────────────────────────────────
const TARGET_ANGLE = 15;   // degrees from horizontal
const TOLERANCE    = 6;    // ± degrees accepted
const MIN_ANGLE    = TARGET_ANGLE - TOLERANCE;   //  9°
const MAX_ANGLE    = TARGET_ANGLE + TOLERANCE;   // 21°

// PHONE A TERRA: threshold for flat detection
const FLAT_THRESHOLD = 8;  // degrees — phone is essentially flat on ground

function analyzeTilt(rotationBeta: number): {
  angleDeg: number;
  isCorrect: boolean;
  isFlat: boolean;
  status: 'flat' | 'too_flat' | 'ok' | 'too_steep';
  quality: number; // 0-1 (1 = perfect center)
} {
  // rotation.beta in radians (front-back) → convert to degrees
  const angleDeg = Math.abs(rotationBeta * (180 / Math.PI));
  const isFlat = angleDeg < FLAT_THRESHOLD;
  const isCorrect = (angleDeg >= MIN_ANGLE && angleDeg <= MAX_ANGLE) || isFlat;
  let status: 'flat' | 'too_flat' | 'ok' | 'too_steep';
  if (isFlat) status = 'flat';
  else if (angleDeg < MIN_ANGLE) status = 'too_flat';
  else if (angleDeg > MAX_ANGLE) status = 'too_steep';
  else status = 'ok';
  // Quality: 1 at TARGET_ANGLE or flat, fades toward edges
  const dist = isFlat ? 0 : Math.abs(angleDeg - TARGET_ANGLE);
  const quality = isCorrect ? Math.max(0, 1 - dist / TOLERANCE) : 0;
  return { angleDeg: Math.round(angleDeg), isCorrect, isFlat, status, quality };
}

// ── BubbleLevel component ────────────────────────────────────────────────────
function BubbleLevel({ tiltAngle, isCorrect }: { tiltAngle: number; isCorrect: boolean }) {
  const TRACK_W = 220, TRACK_H = 60;
  const BUBBLE_R = 22;
  // Map tiltAngle 0-40° to horizontal position in track
  const progress = Math.min(1, Math.max(0, tiltAngle / 40));
  const targetProgress = TARGET_ANGLE / 40;
  const bubbleX = useSharedValue(progress * (TRACK_W - BUBBLE_R * 2) + BUBBLE_R);
  const bubbleColor = useSharedValue(0);

  useEffect(() => {
    const targetX = progress * (TRACK_W - BUBBLE_R * 2) + BUBBLE_R;
    bubbleX.value = withSpring(targetX, { damping: 18, stiffness: 120 });
    bubbleColor.value = withTiming(isCorrect ? 1 : 0, { duration: 300 });
  }, [tiltAngle, isCorrect]);

  const bubbleStyle = useAnimatedStyle(() => ({
    left: bubbleX.value - BUBBLE_R,
    backgroundColor: `rgba(${interpolate(bubbleColor.value, [0, 1], [255, 0])}, ${interpolate(bubbleColor.value, [0, 1], [149, 242])}, ${interpolate(bubbleColor.value, [0, 1], [0, 255])}, 0.9)` ? CYAN : ORANGE
  }));

  // Target zone indicator
  const zoneLeft = (MIN_ANGLE / 40) * (TRACK_W - BUBBLE_R * 2) + BUBBLE_R;
  const zoneRight = (MAX_ANGLE / 40) * (TRACK_W - BUBBLE_R * 2) + BUBBLE_R;
  const zoneWidth = zoneRight - zoneLeft;

  return (
    <View style={bl$.container}>
      <Text style={bl$.label}>INCLINAZIONE TELEFONO</Text>
      {/* Track */}
      <View style={[bl$.track, { width: TRACK_W, height: TRACK_H }]}>
        {/* Target zone */}
        <View style={[bl$.targetZone, { left: zoneLeft - BUBBLE_R, width: zoneWidth + BUBBLE_R * 2 }]} />
        {/* Target marker */}
        <View style={[bl$.targetLine, { left: (TARGET_ANGLE / 40) * (TRACK_W - BUBBLE_R * 2) + BUBBLE_R }]} />
        {/* Bubble */}
        <Animated.View style={[bl$.bubble, { width: BUBBLE_R * 2, height: BUBBLE_R * 2, borderRadius: BUBBLE_R, top: (TRACK_H - BUBBLE_R * 2) / 2 }, bubbleStyle]} />
      </View>
      {/* Labels */}
      <View style={bl$.labels}>
        <Text style={bl$.labelSub}>PIATTO</Text>
        <Text style={[bl$.angleVal, { color: isCorrect ? CYAN : ORANGE }]}>{tiltAngle}°</Text>
        <Text style={bl$.labelSub}>VERTICALE</Text>
      </View>
      {/* Feedback text */}
      <Text style={[bl$.feedback, { color: isCorrect ? GREEN : ORANGE }]}>
        {isCorrect ? '✓ ANGOLO PERFETTO' : tiltAngle < TARGET_ANGLE ? '▲ INCLINA VERSO DI TE' : '▼ ABBASSA LEGGERMENTE'}
      </Text>
    </View>
  );
}

const bl$ = StyleSheet.create({
  container: { alignItems: 'center', gap: 8 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  track: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' },
  targetZone: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(0,229,255,0.1)', borderRadius: 20 },
  targetLine: { position: 'absolute', top: 8, bottom: 8, width: 2, backgroundColor: CYAN, opacity: 0.6 },
  bubble: { position: 'absolute', elevation: 4 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', width: 220, paddingHorizontal: 4 },
  labelSub: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '300', letterSpacing: 1 },
  angleVal: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  feedback: { fontSize: 14, fontWeight: '900', letterSpacing: 2, marginTop: 4 }
});

// ── ScreenFlash beacon ────────────────────────────────────────────────────────
function ScreenFlash({ active }: { active: boolean }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 60, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 180, easing: Easing.in(Easing.ease) }),
          withTiming(0, { duration: 360 }),   // pause between flashes
        ),
        -1, false
      );
    } else {
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [active]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!active) return null;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, { backgroundColor: '#FFFFFF', zIndex: 200 }, style]}
      pointerEvents="none"
    />
  );
}

// ── Main TiltGuideOverlay ─────────────────────────────────────────────────────
interface Props {
  onReady: () => void;   // Called when tilt is OK + countdown done → start scan
  onSkip: () => void;    // Skip tilt check entirely
  lang?: 'it' | 'en' | 'es';
}

type TiltPhase = 'tilt_check' | 'tilt_ok' | 'countdown' | 'flash_beacon';

export function TiltGuideOverlay({ onReady, onSkip, lang = 'it' }: Props) {
  const [tiltAngle, setTiltAngle] = useState(0);
  const [tiltOk, setTiltOk] = useState(false);
  const [tiltQuality, setTiltQuality] = useState(0);
  const [phase, setPhase] = useState<TiltPhase>('tilt_check');
  const [countdown, setCountdown] = useState(5);
  const [gyroAvailable, setGyroAvailable] = useState(true);

  // refs to avoid stale closures
  const phaseRef = useRef<TiltPhase>('tilt_check');
  const tiltOkRef = useRef(false);
  const flatRef = useRef(false);
  const flatStableMs = useRef(0);
  const stabilizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTiltStatus = useRef<string>('');

  useEffect(() => {
    RemoteUXEngine.setLang(lang);
    RemoteUXEngine.clearCooldowns();
    RemoteUXEngine.speak('tilt_welcome', 0);
  }, []);

  // ── Gyroscope ──
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    const setup = async () => {
      try {
        const available = await DeviceMotion.isAvailableAsync();
        if (!available) {
          setGyroAvailable(false);
          // No gyro — skip to flash beacon immediately
          setTimeout(() => { setPhase('tilt_ok'); }, 500);
          return;
        }
        DeviceMotion.setUpdateInterval(80);
        sub = DeviceMotion.addListener((data: DeviceMotionMeasurement) => {
          if (!data.rotation) return;
          const { isCorrect, angleDeg, status, quality, isFlat } = analyzeTilt(data.rotation.beta || 0);
          setTiltAngle(angleDeg);
          setTiltQuality(quality);
          setTiltOk(isCorrect);
          tiltOkRef.current = isCorrect;
          flatRef.current = isFlat;

          // ── PHONE A TERRA: Auto-detect flat phone ──
          if (isFlat && phaseRef.current === 'tilt_check') {
            flatStableMs.current += 80;
            if (flatStableMs.current >= 1500) {
              // Phone confirmed flat for 1.5s → AUTO TRIGGER
              phaseRef.current = 'tilt_ok';
              setPhase('tilt_ok');
              RemoteUXEngine.speakRaw(
                lang === 'it' ? 'NEXUS ATTIVATO. POSIZIONATI A 3 METRI.'
                : lang === 'es' ? 'NEXUS ACTIVADO. POSICIÓNATE A 3 METROS.'
                : 'NEXUS ACTIVATED. POSITION YOURSELF 3 METERS AWAY.'
              );
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              RemoteUXEngine.ping.startSequence(0.1);
              return;
            }
          } else if (!isFlat) {
            flatStableMs.current = 0;
          }

          // Voice feedback on status change (original tilt mode)
          if (status !== lastTiltStatus.current) {
            lastTiltStatus.current = status;
            if (status === 'flat') {
              // Phone going flat — give feedback
              RemoteUXEngine.speak('tilt_ok', 0);
            } else if (status === 'too_flat') RemoteUXEngine.speak('tilt_too_flat');
            else if (status === 'too_steep') RemoteUXEngine.speak('tilt_too_steep');
            else if (status === 'ok') {
              RemoteUXEngine.speak('tilt_ok', 0);
              if (stabilizeTimer.current) clearTimeout(stabilizeTimer.current);
              stabilizeTimer.current = setTimeout(() => {
                if (tiltOkRef.current && phaseRef.current === 'tilt_check') {
                  phaseRef.current = 'tilt_ok';
                  setPhase('tilt_ok');
                  RemoteUXEngine.ping.startSequence(0.1);
                }
              }, 1200);
            }
          }

          // Update ping quality
          if (phaseRef.current === 'flash_beacon') {
            RemoteUXEngine.ping.updateQuality(quality);
          }
        });
      } catch (e) {
        setGyroAvailable(false);
        setTimeout(() => {
          phaseRef.current = 'tilt_ok';
          setPhase('tilt_ok');
        }, 800);
      }
    };
    setup();
    return () => {
      sub?.remove();
      if (stabilizeTimer.current) clearTimeout(stabilizeTimer.current);
    };
  }, []);

  // ── Phase: tilt_ok → countdown ──
  useEffect(() => {
    if (phase !== 'tilt_ok') return;
    // Start countdown
    phaseRef.current = 'countdown';
    setPhase('countdown');
    setCountdown(5);
  }, [phase === 'tilt_ok']); // eslint-disable-line

  // ── Phase: countdown → flash_beacon ──
  useEffect(() => {
    if (phase !== 'countdown') return;
    let cnt = 5;
    const iv = setInterval(() => {
      cnt--;
      setCountdown(cnt);
      if (cnt <= 3) {
        const keys = ['scan_counting_3', 'scan_counting_2', 'scan_counting_1'] as const;
        const key = keys[3 - cnt] || 'scan_counting_1';
        RemoteUXEngine.speak(key as any, 0);
        Haptics.impactAsync(cnt === 1 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      if (cnt <= 0) {
        clearInterval(iv);
        phaseRef.current = 'flash_beacon';
        setPhase('flash_beacon');
        RemoteUXEngine.ping.startSequence(0.3);
        setTimeout(() => RemoteUXEngine.speak('scan_starting', 0), 200);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [phase === 'countdown']); // eslint-disable-line

  // ── Phase: flash_beacon → auto-start after 8s ──
  useEffect(() => {
    if (phase !== 'flash_beacon') return;
    const timeout = setTimeout(() => {
      RemoteUXEngine.ping.stopSequence();
      RemoteUXEngine.stop();
      onReady();
    }, 8000);
    return () => clearTimeout(timeout);
  }, [phase === 'flash_beacon']); // eslint-disable-line

  const handleSkip = () => {
    RemoteUXEngine.ping.stopSequence();
    RemoteUXEngine.stop();
    onSkip();
  };

  const handleStartNow = () => {
    if (phase !== 'flash_beacon') return;
    RemoteUXEngine.ping.stopSequence();
    RemoteUXEngine.stop();
    onReady();
  };

  return (
    <View style={styles.root}>
      {/* Screen Flash beacon */}
      <ScreenFlash active={phase === 'flash_beacon'} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerDot} />
          <Text style={styles.headerTitle}>POSIZIONAMENTO SCAN</Text>
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>SALTA</Text>
            <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>

        {/* Phase: tilt_check */}
        {phase === 'tilt_check' && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.phase}>
            <Text style={styles.instruction}>
              {gyroAvailable
                ? tiltOk
                  ? 'TELEFONO RILEVATO · POSIZIONAMENTO IN CORSO...'
                  : 'Appoggia il telefono a terra o inclinalo verso di te'
                : 'Posiziona il telefono sul supporto, poi allontanati'}
            </Text>

            {gyroAvailable && (
              <>
                <BubbleLevel tiltAngle={tiltAngle} isCorrect={tiltOk} />
                <View style={styles.tiltDiagram}>
                  <Ionicons name="phone-portrait" size={32} color={tiltOk ? CYAN : 'rgba(255,255,255,0.3)'}
                    style={{ transform: [{ rotate: `${-(tiltAngle)}deg` }] }} />
                  <View style={styles.groundLine} />
                </View>
                {tiltAngle < FLAT_THRESHOLD && (
                  <Text style={[styles.feedback, { color: GREEN }]}>
                    📱 TELEFONO A TERRA RILEVATO
                  </Text>
                )}
              </>
            )}

            <Text style={styles.tipText}>
              📱 A TERRA: Appoggialo piatto → auto-start{'\n'}📐 SU SUPPORTO: ~15° dall'orizzontale
            </Text>
          </Animated.View>
        )}

        {/* Phase: countdown */}
        {phase === 'countdown' && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.phase}>
            <Text style={styles.instruction}>Allontanati di 3 metri e posizionati di fronte al telefono</Text>
            <View style={styles.countdownWrap}>
              <Text style={styles.countdownNum}>{countdown}</Text>
              <Text style={styles.countdownLabel}>SECONDI PER POSIZIONARSI</Text>
            </View>
            <View style={styles.distanceGuide}>
              <Ionicons name="walk" size={24} color="rgba(255,255,255,0.3)" />
              <View style={styles.distanceLine} />
              <Ionicons name="phone-portrait" size={20} color={CYAN} />
              <Text style={styles.distanceLabel}>3 METRI</Text>
            </View>
          </Animated.View>
        )}

        {/* Phase: flash_beacon */}
        {phase === 'flash_beacon' && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.phase}>
            <Text style={styles.bigInstruction}>RESTA FERMO</Text>
            <Text style={styles.bigSub}>Lo scan sta iniziando{'\n'}Il telefono pulsa come segnale</Text>

            <View style={styles.beaconInfo}>
              <View style={styles.beaconRow}>
                <Ionicons name="volume-high" size={16} color={CYAN} />
                <Text style={styles.beaconText}>Ping sonori: sentili aumentare di frequenza</Text>
              </View>
              <View style={styles.beaconRow}>
                <Ionicons name="flash" size={16} color="#FFF" />
                <Text style={styles.beaconText}>Flash visivo: schermo bianco pulsante</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.startNowBtn} onPress={handleStartNow} activeOpacity={0.85}>
              <Ionicons name="scan" size={16} color="#000" />
              <Text style={styles.startNowText}>INIZIA ORA</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 100
  },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 60, gap: 24 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: CYAN },
  headerTitle: { flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  skipBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  skipText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },

  phase: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  instruction: { color: 'rgba(255,255,255,0.75)', fontSize: 18, fontWeight: '300', textAlign: 'center', lineHeight: 22, letterSpacing: 0.5, maxWidth: 280 },

  // Tilt diagram
  tiltDiagram: { alignItems: 'center', position: 'relative', height: 60 },
  groundLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  tipText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '300', textAlign: 'center', letterSpacing: 0.3, lineHeight: 20 },
  feedback: { fontSize: 15, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },

  // Countdown
  countdownWrap: { alignItems: 'center', gap: 8 },
  countdownNum: { color: CYAN, fontSize: 140, fontWeight: '800', letterSpacing: -2, lineHeight: 148 },
  countdownLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '900', letterSpacing: 4 },
  distanceGuide: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distanceLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)', maxWidth: 120, borderStyle: 'dashed' },
  distanceLabel: { color: '#00E5FF22', fontSize: 14, fontWeight: '900', letterSpacing: 2 },

  // Flash beacon
  bigInstruction: { color: '#FFFFFF', fontSize: 40, fontWeight: '900', letterSpacing: 6, textAlign: 'center' },
  bigSub: { color: '#AAAAAA', fontSize: 17, fontWeight: '300', textAlign: 'center', lineHeight: 22, letterSpacing: 0.5 },
  beaconInfo: { gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  beaconRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  beaconText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '300', flex: 1 },
  startNowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: CYAN, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, alignSelf: 'stretch', marginTop: 8 },
  startNowText: { color: '#000', fontSize: 17, fontWeight: '900', letterSpacing: 3 }
});
