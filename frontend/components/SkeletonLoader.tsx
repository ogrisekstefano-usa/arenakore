/**
 * ARENAKORE — SkeletonLoader v1.0
 * Animated placeholder shimmer for premium loading UX.
 * Usage: <SkeletonLoader width={200} height={20} />
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, Easing
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const shimmer = useSharedValue(0.3);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1, true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: 'rgba(255,255,255,0.06)',
        },
        animStyle,
        style,
      ]}
    />
  );
}

// Pre-built skeleton patterns
export function SkeletonCard({ height = 130 }: { height?: number }) {
  return (
    <View style={sk.card}>
      <SkeletonLoader width="100%" height={height} borderRadius={16} />
    </View>
  );
}

export function SkeletonRow() {
  return (
    <View style={sk.row}>
      <SkeletonLoader width={36} height={36} borderRadius={18} />
      <View style={sk.rowText}>
        <SkeletonLoader width="60%" height={14} />
        <SkeletonLoader width="40%" height={10} />
      </View>
      <SkeletonLoader width={60} height={28} borderRadius={8} />
    </View>
  );
}

export function SkeletonBattleCard() {
  return (
    <View style={sk.battleCard}>
      <View style={sk.battleHeader}>
        <SkeletonLoader width="30%" height={14} />
        <SkeletonLoader width={60} height={22} borderRadius={8} />
        <SkeletonLoader width="30%" height={14} />
      </View>
      <SkeletonLoader width="100%" height={20} borderRadius={10} />
      <View style={sk.battleScores}>
        <SkeletonLoader width={40} height={22} />
        <SkeletonLoader width={40} height={22} />
      </View>
    </View>
  );
}

const sk = StyleSheet.create({
  card: { marginHorizontal: 24, marginBottom: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  rowText: { flex: 1, gap: 6 },
  battleCard: {
    marginHorizontal: 24, marginBottom: 10, borderRadius: 14,
    padding: 14, gap: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)', backgroundColor: '#000000',
  },
  battleHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  battleScores: {
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4,
  },
});
