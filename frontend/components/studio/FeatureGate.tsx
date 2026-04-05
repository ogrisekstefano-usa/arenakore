/**
 * FEATURE GATE — Locks enterprise-only features with upgrade overlay
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

interface FeatureGateProps {
  children: React.ReactNode;
  featureKey: string;
  features: Record<string, boolean> | null | undefined;
  onUpgrade?: () => void;
}

export function FeatureGate({ children, featureKey, features, onUpgrade }: FeatureGateProps) {
  // If features not loaded yet (null/undefined) or feature is allowed: show children
  if (!features || features[featureKey] !== false) {
    return <>{children}</>;
  }

  return (
    <View style={fg$.container}>
      {/* Blurred/dimmed content */}
      <View style={fg$.blurred} pointerEvents="none">
        {children}
      </View>
      {/* Lock overlay */}
      <Animated.View entering={FadeIn.duration(300)} style={fg$.overlay}>
        <Ionicons name="lock-closed" size={28} color="#FFD700" />
        <Text style={fg$.title}>ENTERPRISE ONLY</Text>
        <Text style={fg$.subtitle}>UPGRADE TO UNLOCK</Text>
        {onUpgrade && (
          <TouchableOpacity style={fg$.upgradeBtn} onPress={onUpgrade} activeOpacity={0.85}>
            <Ionicons name="arrow-up-circle" size={14} color="#000" />
            <Text style={fg$.upgradeBtnText}>UPGRADE PLAN</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const fg$ = StyleSheet.create({
  container: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  blurred: { opacity: 0.08 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)'
  },
  title: { color: '#FFD700', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  subtitle: { color: 'rgba(255,255,255,0.30)', fontSize: 14, fontWeight: '300', letterSpacing: 1.5 },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFD700', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 8, marginTop: 4 },
  upgradeBtnText: { color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 }
});
