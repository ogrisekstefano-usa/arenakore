/**
 * ARENAKORE — FLUX ICON & PULSE ANIMATION
 * ═══════════════════════════════════════════════════════════════
 * FluxIcon: Two kinetic arrows forming an infinity loop (SVG)
 * FluxPulse: Glow animation on balance change
 * Dark Mode: Cyan Neon (#00FFFF) | Light Mode: Electric Blue (#2563EB)
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSequence, withRepeat, Easing
} from 'react-native-reanimated';

// ── FLUX ICON (Two kinetic arrows → infinity loop) ──────────────────────────
interface FluxIconProps {
  size?: number;
  color?: string;
}

export function FluxIcon({ size = 20, color = '#00FFFF' }: FluxIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Infinity loop made of two kinetic arrows */}
      <Path
        d="M8 12C8 9.79 9.79 8 12 8C13.1 8 14.1 8.45 14.83 9.17L16.24 7.76C15.14 6.67 13.64 6 12 6C8.69 6 6 8.69 6 12H3L6.5 15.5L10 12H8Z"
        fill={color}
      />
      <Path
        d="M16 12C16 14.21 14.21 16 12 16C10.9 16 9.9 15.55 9.17 14.83L7.76 16.24C8.86 17.33 10.36 18 12 18C15.31 18 18 15.31 18 12H21L17.5 8.5L14 12H16Z"
        fill={color}
      />
    </Svg>
  );
}

// ── FLUX PULSE ANIMATION ──────────────────────────────────────────────────────
interface FluxPulseProps {
  children: React.ReactNode;
  active: boolean;
  color?: string;
}

export function FluxPulse({ children, active, color = '#00FFFF' }: FluxPulseProps) {
  const glowOpacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      // Pulse glow 3 times then fade
      glowOpacity.value = withSequence(
        withTiming(0.6, { duration: 200 }),
        withTiming(0.15, { duration: 300 }),
        withTiming(0.5, { duration: 200 }),
        withTiming(0.1, { duration: 300 }),
        withTiming(0.4, { duration: 200 }),
        withTiming(0, { duration: 500 }),
      );
      scale.value = withSequence(
        withTiming(1.08, { duration: 150, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 250 }),
      );
    }
  }, [active]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: 1.6 }]
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <View style={p$.wrap}>
      <Animated.View style={[p$.glow, { backgroundColor: color }, glowStyle]} />
      <Animated.View style={contentStyle}>
        {children}
      </Animated.View>
    </View>
  );
}

const p$ = StyleSheet.create({
  wrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 32, height: 32, borderRadius: 16 }
});
