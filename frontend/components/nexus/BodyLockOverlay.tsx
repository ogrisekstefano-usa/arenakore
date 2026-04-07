/**
 * ARENAKORE — BODY LOCK OVERLAY v2.0 (BIOMETRIC GATE)
 * ════════════════════════════════════════════════════════
 * CRITICAL: The countdown CANNOT start unless allKeypointsVisible
 * has been TRUE for at least 1.5 CONSECUTIVE seconds.
 * 
 * Shows RED warning "INQUADRA TUTTO IL CORPO" while not locked.
 * Shows CYAN pulsing border + "CORPO COMPLETO — LOCKED" when locked.
 * 
 * No auto-start: Only fires onBodyLocked after biometric confirmation.
 * Confidence threshold: 0.85
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Platform
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSequence, Easing, cancelAnimation
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
// Gyroscope lazy-loaded to prevent Expo Go crash

let SW = 390, SH = 844; try { const _d = Dimensions.get('window'); SW = _d.width; SH = _d.height; } catch(e) {}
const CONFIDENCE_THRESHOLD = 0.85;
const LOCK_DURATION_MS = 1500; // 1.5 seconds CONSECUTIVE required
const GYRO_THRESHOLD = 0.5; // rad/s — above this = phone is moving

interface BodySegment {
  key: string;
  label: string;
  detected: boolean;
  confidence: number;
}

interface BodyLockOverlayProps {
  onBodyLocked: () => void;
  onGuidance?: (segment: string) => void;
}

export function BodyLockOverlay({ onBodyLocked, onGuidance }: BodyLockOverlayProps) {
  const [segments, setSegments] = useState<BodySegment[]>([
    { key: 'head', label: 'TESTA', detected: false, confidence: 0 },
    { key: 'torso', label: 'TORSO', detected: false, confidence: 0 },
    { key: 'arms', label: 'BRACCIA', detected: false, confidence: 0 },
    { key: 'legs', label: 'GAMBE', detected: false, confidence: 0 },
    { key: 'feet', label: 'PIEDI', detected: false, confidence: 0 },
  ]);
  const [allVisible, setAllVisible] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockProgress, setLockProgress] = useState(0); // 0-100%
  const [guidanceText, setGuidanceText] = useState('INQUADRA TUTTO IL CORPO');
  const [isMoving, setIsMoving] = useState(false); // Gyroscope motion gate
  
  const lockStartTime = useRef<number | null>(null);
  const lockTimerRef = useRef<any>(null);
  const lockTriggered = useRef(false);

  // Animated values
  const borderOpacity = useSharedValue(0.3);
  const borderHue = useSharedValue(0); // 0=red, 1=cyan
  const lockFlash = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  const warningPulse = useSharedValue(0.7);

  // Red warning pulse while not locked
  useEffect(() => {
    warningPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ), -1, true
    );
    borderOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.2, { duration: 800 })
      ), -1, true
    );
  }, []);

  // ═══ GYROSCOPE MOTION GATE — Block calibration if phone is moving ═══
  useEffect(() => {
    let sub: any = null;
    let stableTimer: any = null;
    try {
      const { Gyroscope } = require('expo-sensors');
      Gyroscope.setUpdateInterval(200);
      sub = Gyroscope.addListener(({ x, y, z }: { x: number; y: number; z: number }) => {
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        if (magnitude > GYRO_THRESHOLD) {
          setIsMoving(true);
          if (stableTimer) { clearTimeout(stableTimer); stableTimer = null; }
          // Auto-clear after 1s of stability
          stableTimer = setTimeout(() => setIsMoving(false), 1000);
        }
      });
    } catch (e) {
      // Gyroscope not available (web/simulator) — skip
      setIsMoving(false);
    }
    return () => {
      if (sub) sub.remove();
      if (stableTimer) clearTimeout(stableTimer);
    };
  }, []);

  // ═══ WEB SIMULATION: Progressive segment detection ═══
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const segmentOrder = ['head', 'torso', 'arms', 'legs', 'feet'];
    let currentIdx = 0;

    const detectInterval = setInterval(() => {
      if (currentIdx >= segmentOrder.length) {
        clearInterval(detectInterval);
        return;
      }

      const segKey = segmentOrder[currentIdx];
      const conf = 0.85 + Math.random() * 0.14;

      setSegments(prev => prev.map(s =>
        s.key === segKey ? { ...s, detected: conf >= CONFIDENCE_THRESHOLD, confidence: conf } : s
      ));

      progressWidth.value = withTiming(((currentIdx + 1) / segmentOrder.length) * 100, { duration: 400 });
      currentIdx++;
    }, 700);

    return () => clearInterval(detectInterval);
  }, []);

  // ═══ BIOMETRIC GATE: 1.5s consecutive detection required ═══
  useEffect(() => {
    const allDetected = segments.every(s => s.detected);
    setAllVisible(allDetected);
    const missingSegments = segments.filter(s => !s.detected);

    if (allDetected) {
      // ═══ MOTION GATE: Block calibration if phone is moving ═══
      if (isMoving) {
        // Phone moving — reset lock timer
        if (lockStartTime.current) {
          lockStartTime.current = null;
          setLockProgress(0);
          if (lockTimerRef.current) {
            clearInterval(lockTimerRef.current);
            lockTimerRef.current = null;
          }
        }
        setGuidanceText('FERMA IL TELEFONO');
        return;
      }

      // All keypoints visible & phone stable — start or continue the 1.5s timer
      if (!lockStartTime.current) {
        lockStartTime.current = Date.now();
        
        // Start the 1.5s lock countdown
        lockTimerRef.current = setInterval(() => {
          if (!lockStartTime.current) return;
          const elapsed = Date.now() - lockStartTime.current;
          const pct = Math.min((elapsed / LOCK_DURATION_MS) * 100, 100);
          setLockProgress(pct);

          if (elapsed >= LOCK_DURATION_MS && !lockTriggered.current) {
            lockTriggered.current = true;
            clearInterval(lockTimerRef.current);
            setIsLocked(true);
            setGuidanceText('CORPO COMPLETO — LOCKED');

            // Cyan border + flash
            borderHue.value = withTiming(1, { duration: 200 });
            borderOpacity.value = withRepeat(
              withSequence(
                withTiming(1, { duration: 200 }),
                withTiming(0.5, { duration: 200 })
              ), 3, true
            );
            lockFlash.value = withSequence(
              withTiming(0.6, { duration: 80 }),
              withTiming(0, { duration: 300 })
            );

            // Fire callback after brief visual confirmation
            setTimeout(() => onBodyLocked(), 600);
          }
        }, 50);
      }

      setGuidanceText('MANTIENI LA POSIZIONE...');
    } else {
      // Body lost — RESET the 1.5s timer
      if (lockStartTime.current) {
        lockStartTime.current = null;
        setLockProgress(0);
        if (lockTimerRef.current) {
          clearInterval(lockTimerRef.current);
          lockTimerRef.current = null;
        }
      }

      // Dynamic RED guidance + TTS callback
      if (missingSegments.length > 0) {
        const missing = missingSegments[0];
        if (onGuidance) onGuidance(missing.key);
        switch (missing.key) {
          case 'feet': setGuidanceText('INQUADRA I PIEDI PER PARTIRE'); break;
          case 'legs': setGuidanceText('INQUADRA LE GAMBE'); break;
          case 'arms': setGuidanceText('ALZA LE BRACCIA'); break;
          case 'torso': setGuidanceText('INQUADRA IL BUSTO'); break;
          default: setGuidanceText('INQUADRA TUTTO IL CORPO');
        }
      }
    }

    return () => {
      if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    };
  }, [segments]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    };
  }, []);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: borderHue.value > 0.5 ? '#00FFFF' : '#FF3B30',
    borderWidth: 2.5,
    opacity: borderOpacity.value
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: lockFlash.value
  }));

  const warningStyle = useAnimatedStyle(() => ({
    opacity: warningPulse.value
  }));

  return (
    <View style={bl$.root}>
      {/* Lock flash */}
      <Animated.View style={[bl$.flash, flashStyle]} pointerEvents="none" />

      {/* Bounding box frame */}
      <Animated.View style={[bl$.boundingBox, borderStyle]}>
        {/* Corner brackets */}
        <View style={[bl$.corner, bl$.topLeft, { borderColor: isLocked ? '#00FFFF' : '#FF3B30' }]} />
        <View style={[bl$.corner, bl$.topRight, { borderColor: isLocked ? '#00FFFF' : '#FF3B30' }]} />
        <View style={[bl$.corner, bl$.bottomLeft, { borderColor: isLocked ? '#00FFFF' : '#FF3B30' }]} />
        <View style={[bl$.corner, bl$.bottomRight, { borderColor: isLocked ? '#00FFFF' : '#FF3B30' }]} />
      </Animated.View>

      {/* GUIDANCE — RED warning / ORANGE motion / CYAN locked */}
      <View style={bl$.guidanceWrap}>
        {isMoving && allVisible ? (
          <Animated.View style={[bl$.guidanceBox, bl$.guidanceOrange, warningStyle]}>
            <Ionicons name="phone-portrait" size={18} color="#FF9500" />
            <Text style={bl$.guidanceTextOrange}>FERMA IL TELEFONO</Text>
          </Animated.View>
        ) : !allVisible ? (
          <Animated.View style={[bl$.guidanceBox, bl$.guidanceRed, warningStyle]}>
            <Ionicons name="warning" size={18} color="#FF3B30" />
            <Text style={bl$.guidanceTextRed}>{guidanceText}</Text>
          </Animated.View>
        ) : isLocked ? (
          <View style={[bl$.guidanceBox, bl$.guidanceCyan]}>
            <Ionicons name="checkmark-circle" size={18} color="#00FFFF" />
            <Text style={bl$.guidanceTextCyan}>CORPO COMPLETO — LOCKED</Text>
          </View>
        ) : (
          <View style={[bl$.guidanceBox, bl$.guidanceYellow]}>
            <Ionicons name="body" size={18} color="#FFD700" />
            <Text style={bl$.guidanceTextYellow}>{guidanceText}</Text>
          </View>
        )}
      </View>

      {/* Segment detection pills */}
      <View style={bl$.segmentRow}>
        {segments.map((seg) => (
          <View key={seg.key} style={[bl$.segPill, seg.detected && bl$.segPillActive]}>
            <Ionicons
              name={seg.detected ? 'checkmark-circle' : 'ellipse-outline'}
              size={11}
              color={seg.detected ? '#00FFFF' : '#666'}
            />
            <Text style={[bl$.segLabel, seg.detected && bl$.segLabelActive]}>
              {seg.label}
            </Text>
          </View>
        ))}
      </View>

      {/* 1.5s Lock Progress Bar */}
      <View style={bl$.lockProgressWrap}>
        <View style={bl$.lockTrack}>
          <View style={[bl$.lockFill, {
            width: `${lockProgress}%` as any,
            backgroundColor: lockProgress >= 100 ? '#00FFFF' : '#FFD700'
          }]} />
        </View>
        <Text style={bl$.lockLabel}>
          {lockProgress >= 100
            ? '✓ BIOMETRIC LOCK'
            : allVisible
              ? `LOCK ${(lockProgress / 100 * 1.5).toFixed(1)}s / 1.5s`
              : 'IN ATTESA ALLINEAMENTO'
          }
        </Text>
      </View>

      {/* Status dot */}
      <View style={bl$.statusRow}>
        <View style={[bl$.statusDot, {
          backgroundColor: isLocked ? '#00FFFF' : allVisible ? '#FFD700' : '#FF3B30'
        }]} />
        <Text style={bl$.statusText}>
          {isLocked
            ? 'FULL BODY LOCKED · AVVIO COUNTDOWN'
            : `RILEVAMENTO · ${segments.filter(s => s.detected).length}/${segments.length} SEGMENTI`
          }
        </Text>
      </View>
    </View>
  );
}

const bl$ = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    justifyContent: 'center',
    alignItems: 'center'
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00FFFF',
    zIndex: 90
  },
  boundingBox: {
    width: SW * 0.65,
    height: SH * 0.60,
    borderRadius: 16,
    position: 'relative'
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24
  },
  topLeft: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  topRight: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  bottomLeft: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  bottomRight: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },

  guidanceWrap: {
    position: 'absolute',
    top: SH * 0.10,
    alignSelf: 'center'
  },
  guidanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5
  },
  guidanceRed: {
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderColor: 'rgba(255,59,48,0.4)'
  },
  guidanceOrange: {
    backgroundColor: 'rgba(255,149,0,0.15)',
    borderColor: 'rgba(255,149,0,0.4)'
  },
  guidanceYellow: {
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderColor: 'rgba(255,215,0,0.3)'
  },
  guidanceCyan: {
    backgroundColor: 'rgba(0,255,255,0.10)',
    borderColor: 'rgba(0,255,255,0.4)'
  },
  guidanceTextRed: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    ...Platform.select({ web: { fontFamily: "'Montserrat', sans-serif" }, default: {} })
  },
  guidanceTextOrange: {
    color: '#FF9500',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    ...Platform.select({ web: { fontFamily: "'Montserrat', sans-serif" }, default: {} })
  },
  guidanceTextYellow: {
    color: '#FFD700',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    ...Platform.select({ web: { fontFamily: "'Montserrat', sans-serif" }, default: {} })
  },
  guidanceTextCyan: {
    color: '#00FFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    ...Platform.select({ web: { fontFamily: "'Montserrat', sans-serif" }, default: {} })
  },

  segmentRow: {
    position: 'absolute',
    bottom: SH * 0.19,
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  segPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  segPillActive: {
    borderColor: 'rgba(0,255,255,0.3)',
    backgroundColor: 'rgba(0,255,255,0.06)'
  },
  segLabel: {
    color: '#666',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  segLabelActive: {
    color: '#00FFFF'
  },

  lockProgressWrap: {
    position: 'absolute',
    bottom: SH * 0.14,
    width: SW * 0.7,
    alignItems: 'center',
    gap: 4
  },
  lockTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden'
  },
  lockFill: {
    height: '100%',
    borderRadius: 2
  },
  lockLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5
  },

  statusRow: {
    position: 'absolute',
    bottom: SH * 0.09,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  statusText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3
  }
});
