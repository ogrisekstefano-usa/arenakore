/**
 * ARENAKORE — UGC WORKOUT HUD v1.0
 * Real-time overlay during NÈXUS scanning for UGC challenges.
 * Shows current exercise, rep counter, progress bar, and auto-advances.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import Animated, {
  FadeIn, FadeInDown, FadeInUp, FadeOut,
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence,
  Easing
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const FONT_J = Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined });
const FONT_M = Platform.select({ web: 'Montserrat, sans-serif', default: undefined });

export interface UGCExercise {
  name: string;
  target_reps: number;
  target_seconds: number;
}

interface Props {
  exercises: UGCExercise[];
  currentExerciseIndex: number;
  currentReps: number;
  currentQuality: number;
  elapsedSeconds: number;
  challengeTitle: string;
  templateType: string;
  isActive: boolean;
  isVerified: boolean;
  isMasterTemplate?: boolean;
  creatorRole?: string;
}

const TEMPLATE_COLORS: Record<string, string> = {
  AMRAP: '#FF3B30', EMOM: '#00E5FF', FOR_TIME: '#FFD700', TABATA: '#00FF87', CUSTOM: '#FF9500'
};

export function UGCWorkoutHUD({
  exercises, currentExerciseIndex, currentReps, currentQuality,
  elapsedSeconds, challengeTitle, templateType, isActive, isVerified,
  isMasterTemplate = false, creatorRole = 'ATHLETE'
}: Props) {
  const color = TEMPLATE_COLORS[templateType] || '#00E5FF';
  const ex = exercises[currentExerciseIndex];
  const totalExercises = exercises.length;
  const isRepBased = ex && ex.target_reps > 0;
  const target = isRepBased ? ex?.target_reps || 0 : ex?.target_seconds || 0;
  const progress = isRepBased
    ? Math.min(1, currentReps / Math.max(target, 1))
    : Math.min(1, elapsedSeconds / Math.max(target, 1));

  // ── Master Template "strictness" visual cue ──
  const isCoachMode = isMasterTemplate;
  const strictColor = isCoachMode ? '#00FF87' : '#FF9500';

  // ── Rep flash animation ──
  const flashScale = useSharedValue(1);
  const prevRepsRef = useRef(currentReps);

  useEffect(() => {
    if (currentReps > prevRepsRef.current) {
      flashScale.value = withSequence(
        withSpring(1.3, { damping: 5, stiffness: 400 }),
        withSpring(1, { damping: 8 }),
      );
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    }
    prevRepsRef.current = currentReps;
  }, [currentReps]);

  const repAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flashScale.value }]
  }));

  // ── Progress bar animation ──
  const progressWidth = useSharedValue(0);
  useEffect(() => {
    progressWidth.value = withTiming(progress * 100, { duration: 300, easing: Easing.out(Easing.ease) });
  }, [progress]);
  const progressStyle = useAnimatedStyle(() => ({
    width: progressWidth.value * (Dimensions.get('window').width - 48) / 100
  }));

  if (!ex || !isActive) return null;

  const isDone = progress >= 1;
  const isLastExercise = currentExerciseIndex >= totalExercises - 1;

  return (
    <View style={s.container} pointerEvents="none">
      {/* ═══ TOP: Challenge Title + Template ═══ */}
      <Animated.View entering={FadeInDown.duration(300)} style={s.topBar}>
        <View style={[s.templateBadge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
          <Text style={[s.templateText, { color }]}>{templateType}</Text>
        </View>
        <Text style={s.challengeTitle} numberOfLines={1}>{challengeTitle.toUpperCase()}</Text>
        <View style={s.progressChips}>
          {exercises.map((_, i) => (
            <View
              key={i}
              style={[
                s.progressDot,
                i < currentExerciseIndex && { backgroundColor: color },
                i === currentExerciseIndex && { backgroundColor: color, width: 16 },
                i > currentExerciseIndex && { backgroundColor: 'rgba(255,255,255,0.12)' },
              ]}
            />
          ))}
        </View>
      </Animated.View>

      {/* ═══ CENTER: Current Exercise + Giant Counter ═══ */}
      <Animated.View entering={FadeIn.duration(200)} style={s.centerBlock}>
        <Text style={s.exerciseLabel}>
          ESERCIZIO {currentExerciseIndex + 1}/{totalExercises}
        </Text>
        <Text style={[s.exerciseName, { color }]} numberOfLines={1}>
          {ex.name.toUpperCase()}
        </Text>

        {/* Giant Rep Counter */}
        <Animated.View style={[s.counterWrap, repAnimStyle]}>
          <Text style={[s.counterValue, { color: isDone ? '#00FF87' : color }]}>
            {isRepBased ? currentReps : elapsedSeconds}
          </Text>
          <Text style={s.counterSlash}>/</Text>
          <Text style={s.counterTarget}>{target}</Text>
        </Animated.View>

        <Text style={s.counterUnit}>
          {isRepBased ? 'REPS' : 'SECONDI'}
        </Text>

        {/* Progress Bar */}
        <View style={s.progressBarTrack}>
          <Animated.View style={[s.progressBarFill, { backgroundColor: isDone ? '#00FF87' : color }, progressStyle]} />
        </View>

        {/* Status message */}
        {isDone && !isLastExercise && (
          <Animated.View entering={FadeInUp.duration(200)} style={s.nextExWrap}>
            <Ionicons name="chevron-forward" size={14} color="#00FF87" />
            <Text style={s.nextExText}>
              PROSSIMO: {exercises[currentExerciseIndex + 1]?.name.toUpperCase()}
            </Text>
          </Animated.View>
        )}
        {isDone && isLastExercise && (
          <Animated.View entering={FadeInUp.duration(200)} style={s.completedWrap}>
            <Ionicons name="checkmark-circle" size={18} color="#00FF87" />
            <Text style={s.completedText}>SFIDA COMPLETATA!</Text>
          </Animated.View>
        )}
      </Animated.View>

      {/* ═══ BOTTOM: Quality + Verification Badge + Creator Badge ═══ */}
      <View style={s.bottomBar}>
        {/* Creator Role Badge — COACH CERTIFIED or COMMUNITY */}
        <View style={[s.creatorBadge, isCoachMode ? s.coachBadge : s.communityBadge]}>
          <Ionicons
            name={isCoachMode ? 'shield-checkmark' : 'people'}
            size={10}
            color={isCoachMode ? '#00FF87' : '#FF9500'}
          />
          <Text style={[s.creatorBadgeText, { color: isCoachMode ? '#00FF87' : '#FF9500' }]}>
            {isCoachMode ? 'COACH CERTIFIED' : 'COMMUNITY'}
          </Text>
        </View>

        <View style={s.statsRow2}>
          <View style={s.qualBox}>
            <Text style={s.qualLabel}>QUALIT{'\u00c0'}</Text>
            <Text style={[s.qualValue, currentQuality >= (isCoachMode ? 80 : 50) && { color: '#FFD700' }]}>
              {currentQuality}
            </Text>
          </View>
          <View style={s.divider} />
          <View style={s.qualBox}>
            <Text style={s.qualLabel}>MODO</Text>
            <Text style={[s.modeText2, { color: strictColor }]}>
              {isCoachMode ? 'STRICT' : 'STANDARD'}
            </Text>
          </View>
          <View style={s.divider} />
          <View style={s.qualBox}>
            <Text style={s.qualLabel}>STATO</Text>
            <View style={[s.verifyBadge, isVerified ? s.verifiedBadge : s.trackingBadge]}>
              <Ionicons
                name={isVerified ? 'shield-checkmark' : 'radio'}
                size={10}
                color={isVerified ? '#00FF87' : '#FF9500'}
              />
              <Text style={[s.verifyText, { color: isVerified ? '#00FF87' : '#FF9500' }]}>
                {isVerified ? 'VERIFIED' : 'TRACKING'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
    paddingHorizontal: 16
  },

  // ── TOP ──
  topBar: {
    alignItems: 'center', gap: 6
  },
  templateBadge: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1
  },
  templateText: {
    fontSize: 10, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J
  },
  challengeTitle: {
    color: 'rgba(255,255,255,0.50)', fontSize: 13, fontWeight: '800',
    letterSpacing: 2, fontFamily: FONT_M
  },
  progressChips: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4
  },
  progressDot: {
    height: 4, width: 8, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)'
  },

  // ── CENTER ──
  centerBlock: {
    alignItems: 'center', gap: 4
  },
  exerciseLabel: {
    color: 'rgba(255,255,255,0.30)', fontSize: 11, fontWeight: '800',
    letterSpacing: 3, fontFamily: FONT_M
  },
  exerciseName: {
    fontSize: 26, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_J,
    marginBottom: 8
  },
  counterWrap: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4
  },
  counterValue: {
    fontSize: 72, fontWeight: '900', fontFamily: FONT_J,
    lineHeight: 80
  },
  counterSlash: {
    color: 'rgba(255,255,255,0.15)', fontSize: 36, fontWeight: '300'
  },
  counterTarget: {
    color: 'rgba(255,255,255,0.25)', fontSize: 36, fontWeight: '800',
    fontFamily: FONT_J
  },
  counterUnit: {
    color: 'rgba(255,255,255,0.20)', fontSize: 11, fontWeight: '900',
    letterSpacing: 4, fontFamily: FONT_M, marginTop: 2
  },
  progressBarTrack: {
    width: '80%', height: 3, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2, overflow: 'hidden', marginTop: 12
  },
  progressBarFill: {
    height: '100%', borderRadius: 2
  },
  nextExWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(0,255,135,0.06)', borderWidth: 1, borderColor: 'rgba(0,255,135,0.15)'
  },
  nextExText: {
    color: '#00FF87', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, fontFamily: FONT_M
  },
  completedWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    backgroundColor: 'rgba(0,255,135,0.08)', borderWidth: 1, borderColor: 'rgba(0,255,135,0.25)'
  },
  completedText: {
    color: '#00FF87', fontSize: 14, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J
  },

  // ── BOTTOM ──
  bottomBar: {
    alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)'
  },
  creatorBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1
  },
  coachBadge: {
    backgroundColor: 'rgba(0,255,135,0.10)', borderColor: 'rgba(0,255,135,0.30)'
  },
  communityBadge: {
    backgroundColor: 'rgba(255,149,0,0.08)', borderColor: 'rgba(255,149,0,0.20)'
  },
  creatorBadgeText: {
    fontSize: 9, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J
  },
  statsRow2: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14
  },
  modeText2: {
    fontSize: 12, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_J
  },
  qualBox: { alignItems: 'center', gap: 3 },
  qualLabel: {
    color: 'rgba(255,255,255,0.18)', fontSize: 8, fontWeight: '800',
    letterSpacing: 2, fontFamily: FONT_M
  },
  qualValue: {
    color: '#00E5FF', fontSize: 28, fontWeight: '900', fontFamily: FONT_J
  },
  divider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.06)' },
  verifyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1
  },
  verifiedBadge: { backgroundColor: 'rgba(0,255,135,0.08)', borderColor: 'rgba(0,255,135,0.25)' },
  trackingBadge: { backgroundColor: 'rgba(255,149,0,0.08)', borderColor: 'rgba(255,149,0,0.25)' },
  verifyText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J }
});
