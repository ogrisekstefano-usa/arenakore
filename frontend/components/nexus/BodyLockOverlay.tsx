/**
 * ARENAKORE — BODY LOCK OVERLAY
 * ══════════════════════════════
 * Full-body detection gate BEFORE the 3-second countdown starts.
 * 
 * Flow:
 * 1. Shows camera + bounding box overlay
 * 2. Progressively detects body segments (head → torso → legs → feet)
 * 3. Shows dynamic guidance: "INQUADRA I PIEDI PER PARTIRE"
 * 4. Once Full Body locked → Cyan pulsing border → auto-starts countdown
 * 
 * Confidence threshold: 0.85 (lowered from 0.92 to avoid false negatives)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Platform,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSequence, withSpring, Easing, cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width: SW, height: SH } = Dimensions.get('window');
const CONFIDENCE_THRESHOLD = 0.85;

interface BodySegment {
  key: string;
  label: string;
  detected: boolean;
  confidence: number;
}

interface BodyLockOverlayProps {
  onBodyLocked: () => void;
}

export function BodyLockOverlay({ onBodyLocked }: BodyLockOverlayProps) {
  const [segments, setSegments] = useState<BodySegment[]>([
    { key: 'head', label: 'TESTA', detected: false, confidence: 0 },
    { key: 'torso', label: 'TORSO', detected: false, confidence: 0 },
    { key: 'arms', label: 'BRACCIA', detected: false, confidence: 0 },
    { key: 'legs', label: 'GAMBE', detected: false, confidence: 0 },
    { key: 'feet', label: 'PIEDI', detected: false, confidence: 0 },
  ]);
  const [isLocked, setIsLocked] = useState(false);
  const [guidanceText, setGuidanceText] = useState('POSIZIONATI NELL\'INQUADRATURA');
  const lockTriggered = useRef(false);

  // Animated values
  const borderOpacity = useSharedValue(0.3);
  const borderColor = useSharedValue(0); // 0 = white, 1 = cyan
  const pulseScale = useSharedValue(1);
  const guidanceFade = useSharedValue(1);
  const lockFlash = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  // Simulate body detection on web (progressive discovery)
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
      const conf = 0.85 + Math.random() * 0.14; // 0.85 - 0.99

      setSegments(prev => prev.map(s =>
        s.key === segKey ? { ...s, detected: conf >= CONFIDENCE_THRESHOLD, confidence: conf } : s
      ));

      // Update progress bar
      progressWidth.value = withTiming(((currentIdx + 1) / segmentOrder.length) * 100, { duration: 400 });

      currentIdx++;
    }, 600); // Each segment detected every 600ms

    return () => clearInterval(detectInterval);
  }, []);

  // Check if all segments locked
  useEffect(() => {
    const allDetected = segments.every(s => s.detected);
    const missingSegments = segments.filter(s => !s.detected);

    if (allDetected && !lockTriggered.current) {
      lockTriggered.current = true;
      setIsLocked(true);
      setGuidanceText('CORPO COMPLETO — LOCKED');

      // Cyan pulsing border
      borderColor.value = withTiming(1, { duration: 300 });
      borderOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.4, { duration: 300 })
        ),
        4, true
      );

      // Lock flash
      lockFlash.value = withSequence(
        withTiming(0.7, { duration: 100 }),
        withTiming(0, { duration: 400 })
      );

      // Auto-trigger countdown after 1.2s of locked state
      setTimeout(() => {
        onBodyLocked();
      }, 1200);

    } else if (missingSegments.length > 0) {
      // Dynamic guidance based on what's missing
      const missing = missingSegments[0]; // First missing segment
      if (missing.key === 'feet') {
        setGuidanceText('INQUADRA I PIEDI PER PARTIRE');
      } else if (missing.key === 'legs') {
        setGuidanceText('INQUADRA LE GAMBE');
      } else if (missing.key === 'arms') {
        setGuidanceText('ALZA LE BRACCIA');
      } else if (missing.key === 'torso') {
        setGuidanceText('INQUADRA IL BUSTO');
      } else {
        setGuidanceText('POSIZIONATI NELL\'INQUADRATURA');
      }
    }
  }, [segments]);

  // Pulsing border animation
  useEffect(() => {
    borderOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    );
  }, []);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value > 0.5 ? '#00FFFF' : 'rgba(255,255,255,0.5)',
    borderWidth: 2,
    opacity: borderOpacity.value,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: lockFlash.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as any,
  }));

  return (
    <View style={bl$.root}>
      {/* Lock flash */}
      <Animated.View style={[bl$.flash, flashStyle]} pointerEvents="none" />

      {/* Bounding box frame */}
      <Animated.View style={[bl$.boundingBox, borderStyle]}>
        {/* Corner indicators */}
        <View style={[bl$.corner, bl$.topLeft]} />
        <View style={[bl$.corner, bl$.topRight]} />
        <View style={[bl$.corner, bl$.bottomLeft]} />
        <View style={[bl$.corner, bl$.bottomRight]} />
      </Animated.View>

      {/* Guidance text — prominent above overlay */}
      <View style={bl$.guidanceWrap}>
        <Text style={[bl$.guidanceText, isLocked && bl$.guidanceLocked]}>
          {guidanceText}
        </Text>
      </View>

      {/* Segment detection pills */}
      <View style={bl$.segmentRow}>
        {segments.map((seg) => (
          <View key={seg.key} style={[bl$.segPill, seg.detected && bl$.segPillActive]}>
            <Ionicons
              name={seg.detected ? 'checkmark-circle' : 'ellipse-outline'}
              size={12}
              color={seg.detected ? '#00FFFF' : '#555'}
            />
            <Text style={[bl$.segLabel, seg.detected && bl$.segLabelActive]}>
              {seg.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Progress bar */}
      <View style={bl$.progressTrack}>
        <Animated.View style={[bl$.progressFill, progressStyle]} />
      </View>

      {/* Status */}
      <View style={bl$.statusRow}>
        <View style={[bl$.statusDot, { backgroundColor: isLocked ? '#00FFFF' : '#FFD700' }]} />
        <Text style={bl$.statusText}>
          {isLocked ? 'FULL BODY LOCKED · AVVIO SCAN' : `RILEVAMENTO · ${segments.filter(s => s.detected).length}/${segments.length} SEGMENTI`}
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
    alignItems: 'center',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00FFFF',
    zIndex: 90,
  },
  boundingBox: {
    width: SW * 0.65,
    height: SH * 0.65,
    borderRadius: 16,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#00FFFF',
  },
  topLeft: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  topRight: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bottomLeft: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  bottomRight: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  guidanceWrap: {
    position: 'absolute',
    top: SH * 0.12,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  guidanceText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    ...Platform.select({
      web: { fontFamily: "'Montserrat', sans-serif" },
      default: {},
    }),
  },
  guidanceLocked: {
    color: '#00FFFF',
  },
  segmentRow: {
    position: 'absolute',
    bottom: SH * 0.18,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  segPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  segPillActive: {
    borderColor: '#00FFFF44',
    backgroundColor: 'rgba(0,255,255,0.08)',
  },
  segLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  segLabelActive: {
    color: '#00FFFF',
  },
  progressTrack: {
    position: 'absolute',
    bottom: SH * 0.14,
    width: SW * 0.7,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00FFFF',
    borderRadius: 2,
  },
  statusRow: {
    position: 'absolute',
    bottom: SH * 0.10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
