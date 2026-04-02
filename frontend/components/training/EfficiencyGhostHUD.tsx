/**
 * ARENAKORE — EFFICIENCY GHOST HUD
 * ═══════════════════════════════════════════════════════════════
 * "LIVE GHOST" — L'atleta combatte contro la sua versione migliore.
 * 
 * Efficiency Ratio = (current_quality / DNA_average) * 100
 * < 100% → RED ELITE (#FF3B30) — "SOTTO DNA"
 * 100-119% → CYAN (#00E5FF) — "AL DNA"
 * >= 120% → GOLD FLASH (#FFD700) + ⚡ — "SOPRA DNA!"
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, withTiming, withSequence, withRepeat,
  useAnimatedStyle, Easing, FadeIn,
} from 'react-native-reanimated';

interface Props {
  currentQuality: number;
  dnaBaseline: number;
  isActive: boolean;
}

function getGhostColor(ratio: number): string {
  if (ratio >= 120) return '#FFD700';    // Gold Flash — SOPRA DNA
  if (ratio >= 100) return '#00E5FF';    // Cyan — AL DNA
  return '#FF3B30';                       // Red Elite — SOTTO DNA
}

function getGhostLabel(ratio: number): string {
  if (ratio >= 140) return 'DOMINANTE ⚡';
  if (ratio >= 120) return 'SOPRA DNA ⚡';
  if (ratio >= 100) return 'AL TUO DNA';
  if (ratio >= 80)  return 'SOTTO DNA';
  return 'RISCHIO';
}

export function EfficiencyGhostHUD({ currentQuality, dnaBaseline, isActive }: Props) {
  const ratio = dnaBaseline > 0 ? Math.round((currentQuality / dnaBaseline) * 100) : 0;
  const color = getGhostColor(ratio);
  const label = getGhostLabel(ratio);
  const isGold = ratio >= 120;

  // Gold flash pulse animation
  const pulse = useSharedValue(1);
  const flashOpacity = useSharedValue(0);

  useEffect(() => {
    if (isGold && isActive) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 300 }),
        ),
        -1, true
      );
      flashOpacity.value = withRepeat(
        withSequence(
          withTiming(0.25, { duration: 200 }),
          withTiming(0, { duration: 400 }),
        ),
        -1, false
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
      flashOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isGold, isActive]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  if (!isActive || dnaBaseline <= 0) return null;

  return (
    <View style={g$.container} pointerEvents="none">
      {/* Gold flash overlay */}
      {isGold && (
        <Animated.View style={[g$.goldFlash, flashStyle]} />
      )}

      <Animated.View
        entering={FadeIn.duration(200)}
        style={g$.hudWrap}
      >
        <Text style={g$.label}>EFFICIENCY</Text>
        <Animated.View style={pulseStyle}>
          <Text style={[g$.ratio, { color }]}>{ratio}%</Text>
        </Animated.View>
        <View style={[g$.tagWrap, { backgroundColor: color + '22', borderColor: color + '44' }]}>
          <Text style={[g$.tag, { color }]}>{label}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const g$ = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    left: 20,
    zIndex: 40,
  },
  goldFlash: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    bottom: -100,
    backgroundColor: '#FFD700',
    borderRadius: 200,
  },
  hudWrap: {
    alignItems: 'flex-start',
    gap: 2,
  },
  label: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 4,
  },
  ratio: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 44,
  },
  tagWrap: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
  },
  tag: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
