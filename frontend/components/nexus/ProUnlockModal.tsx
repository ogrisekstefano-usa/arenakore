/**
 * ARENAKORE — PRO UNLOCK CINEMATIC MODAL
 * SPRINT 7: One-time cinematic event when bio-signature exceeds 75/100
 * Nike Elite Aesthetic: Zero emoji, Gold/Cyan/White, Bold Sans-Serif, Fullscreen Dark
 */
import React, { useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform,
} from 'react-native';
import Animated, {
  useSharedValue, withRepeat, withSequence, withTiming, withSpring,
  useAnimatedStyle, Easing, interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SW } = Dimensions.get('window');

interface ProUnlockModalProps {
  visible: boolean;
  onClose: () => void;
  avgDna?: number;
}

export function ProUnlockModal({ visible, onClose, avgDna }: ProUnlockModalProps) {
  const glowPulse = useSharedValue(0.3);
  const cardScale = useSharedValue(0.82);
  const lineProgress = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const titleGlowPulse = useSharedValue(0.4);

  useEffect(() => {
    if (visible) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // Card entrance
      cardScale.value = withSpring(1, { damping: 14, stiffness: 90 });
      // Line sweep animation
      lineProgress.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) });
      // Content fade in (delayed)
      contentOpacity.value = withTiming(1, { duration: 900 });
      // Gold glow pulse — continuous
      glowPulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 1200 }), withTiming(0.3, { duration: 1200 })),
        -1, false
      );
      // Title gold pulse
      titleGlowPulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 900 }), withTiming(0.4, { duration: 900 })),
        -1, false
      );
    } else {
      cardScale.value = 0.82;
      lineProgress.value = 0;
      contentOpacity.value = 0;
      glowPulse.value = 0.3;
    }
  }, [visible]);

  const overlayGlowStyle = useAnimatedStyle(() => ({
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: interpolate(glowPulse.value, [0, 1], [0, 0.65]),
    shadowRadius: interpolate(glowPulse.value, [0, 1], [10, 50]),
    elevation: 25,
  }));

  const cardScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const topLineStyle = useAnimatedStyle(() => ({
    width: `${lineProgress.value * 100}%` as any,
  }));

  const bottomLineStyle = useAnimatedStyle(() => ({
    width: `${lineProgress.value * 100}%` as any,
    alignSelf: 'flex-end' as any,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: interpolate(contentOpacity.value, [0, 1], [12, 0]) }],
  }));

  const titleGlowStyle = useAnimatedStyle(() => ({
    textShadowColor: '#D4AF37',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: interpolate(titleGlowPulse.value, [0, 1], [0, 18]),
    opacity: interpolate(titleGlowPulse.value, [0, 1], [0.7, 1]),
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>

        {/* Subtle background grid */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={`h${i}`} style={[styles.gridLine, { top: `${(i + 1) * 12.5}%` as any }]} />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={`v${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 16.6}%` as any }]} />
          ))}
        </View>

        <Animated.View style={[styles.card, overlayGlowStyle, cardScaleStyle]}>
          <LinearGradient
            colors={['#0d0d0d', '#050505', '#020202']}
            style={styles.cardGradient}
          >
            {/* TOP BORDER LINE SWEEP */}
            <View style={styles.borderTrack}>
              <Animated.View style={[styles.borderFillGold, topLineStyle]} />
            </View>

            {/* Status badge */}
            <Animated.View style={[styles.statusRow, contentStyle]}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>BIO-SIGNATURE EVOLVED</Text>
            </Animated.View>

            {/* Main cinematic title */}
            <Animated.View style={[styles.titleBlock, contentStyle]}>
              <Text style={styles.titleLine1}>PRO</Text>
              <Text style={styles.titleLine2}>CHALLENGES</Text>
              <Animated.Text style={[styles.titleLine3, titleGlowStyle]}>
                UNLOCKED
              </Animated.Text>
            </Animated.View>

            {/* DNA Score */}
            {avgDna !== undefined && (
              <Animated.View style={[styles.scoreContainer, contentStyle]}>
                <View style={styles.scoreBadge}>
                  <Ionicons name="analytics" size={13} color="#D4AF37" />
                  <Text style={styles.scoreLabel}>BIO-SCORE MEDIO</Text>
                  <Text style={styles.scoreValue}>{Math.round(avgDna)}/100</Text>
                </View>
              </Animated.View>
            )}

            {/* Divider */}
            <Animated.View style={[styles.dividerRow, contentStyle]}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>ACCESSO COMPLETO</Text>
              <View style={styles.dividerLine} />
            </Animated.View>

            {/* Features unlocked */}
            <Animated.View style={[styles.featuresBlock, contentStyle]}>
              {[
                { icon: 'trophy' as const,    label: 'SFIDE PRO DISPONIBILI'   },
                { icon: 'flash' as const,     label: 'TEMPLATE ELITE SBLOCCATI' },
                { icon: 'star' as const,      label: 'RANKING PRO TIER'         },
              ].map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name={f.icon} size={11} color="#00F2FF" />
                  <Text style={styles.featureText}>{f.label}</Text>
                </View>
              ))}
            </Animated.View>

            {/* CTA BUTTON */}
            <Animated.View style={[contentStyle, { width: '100%' }]}>
              <TouchableOpacity style={styles.ctaBtn} onPress={onClose} activeOpacity={0.8}>
                <LinearGradient
                  colors={['rgba(212,175,55,0.18)', 'rgba(212,175,55,0.06)']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.ctaBtnInner}
                >
                  <Text style={styles.ctaText}>INIZIA A DOMINARE</Text>
                  <Ionicons name="arrow-forward" size={13} color="#D4AF37" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* BOTTOM BORDER LINE SWEEP */}
            <View style={styles.borderTrack}>
              <Animated.View style={[styles.borderFillCyan, bottomLineStyle]} />
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,2,2,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  gridLine: {
    position: 'absolute', left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(0,242,255,0.65)',
  },
  gridLineV: {
    position: 'absolute', top: 0, bottom: 0, width: 1,
    backgroundColor: 'rgba(0,242,255,0.65)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.18)',
  },
  cardGradient: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 18,
  },
  borderTrack: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  borderFillGold: {
    height: '100%',
    backgroundColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  borderFillCyan: {
    height: '100%',
    backgroundColor: '#0D0D0D',
    shadowColor: '#00F2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  statusDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#0D0D0D',
    shadowColor: '#00F2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  statusText: {
    color: '#00F2FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 3,
  },
  titleBlock: {
    alignItems: 'center',
    gap: 2,
  },
  titleLine1: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 8,
    opacity: 0.5,
  },
  titleLine2: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
    lineHeight: 40,
  },
  titleLine3: {
    color: '#D4AF37',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 6,
    lineHeight: 54,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  scoreLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 2,
  },
  scoreValue: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dividerLabel: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2,
  },
  featuresBlock: {
    width: '100%',
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  featureText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  ctaBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  ctaBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  ctaText: {
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
  },
});
