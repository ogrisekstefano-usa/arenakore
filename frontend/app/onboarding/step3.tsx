import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import Animated, {
  useSharedValue, withTiming, withSequence, withSpring,
  useAnimatedStyle, FadeIn,
} from 'react-native-reanimated';

export default function Step3() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useAuth();
  const { category, sport, is_versatile } = useLocalSearchParams<{
    category: string;
    sport: string;
    is_versatile: string;
  }>();
  const [status, setStatus] = useState<'activating' | 'done'>('activating');
  const isVersatile = is_versatile === 'true';

  // Animations
  const pulseScale = useSharedValue(0.5);
  const xpScale = useSharedValue(0);
  const barWidth = useSharedValue(0);

  useEffect(() => {
    pulseScale.value = withSpring(1, { damping: 10, stiffness: 80 });
    barWidth.value = withTiming(100, { duration: 2000 });

    const timer = setTimeout(async () => {
      try {
        await completeOnboarding(
          isVersatile ? 'Kore Member' : 'Kore Member',
          isVersatile ? 'Versatile' : (sport || 'General'),
          category || undefined,
          isVersatile
        );
        setStatus('done');
        xpScale.value = withSpring(1, { damping: 8, stiffness: 120 });
        setTimeout(() => router.replace('/(tabs)/kore'), 2500);
      } catch (e) {
        console.error('Onboarding error:', e);
        router.replace('/(tabs)/kore');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseScale.value,
  }));

  const xpStyle = useAnimatedStyle(() => ({
    transform: [{ scale: xpScale.value }],
    opacity: xpScale.value,
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%` as any,
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.stepLabel}>LEVEL 3 DI 3</Text>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, barStyle]} />
        </View>
      </View>

      <View style={styles.center}>
        <Animated.View style={[styles.iconCircle, pulseStyle]}>
          <Text style={styles.icon}>{isVersatile ? '🌐' : '⚡'}</Text>
        </Animated.View>

        {isVersatile ? (
          <Animated.View entering={FadeIn.delay(400)} style={styles.textBlock}>
            <View style={styles.versatileBadge}>
              <Text style={styles.versatileBadgeText}>KORE UNIVERSAL ADAPTATION ACTIVE</Text>
            </View>
            <Text style={styles.title}>PROFILO{`\n`}VERSATILE</Text>
            <Text style={styles.subtitle}>Il tuo DNA si adatta a ogni disciplina.{`\n`}Nessun limite. Nessuna categoria.</Text>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.delay(400)} style={styles.textBlock}>
            <Text style={styles.title}>PROFILO{`\n`}ATTIVATO</Text>
            <Text style={styles.sportBadge}>{(sport || '').toUpperCase()}</Text>
            <Text style={styles.subtitle}>Il tuo DNA atleta è stato generato.{`\n`}Benvenuto in ArenaKore.</Text>
          </Animated.View>
        )}

        {status === 'done' && (
          <Animated.View style={[styles.xpBanner, xpStyle]}>
            <Text style={styles.xpText}>+100 XP</Text>
            <Text style={styles.xpSub}>BONUS ATTIVAZIONE</Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.brandFooter}>
        <Text style={styles.brandA}>ARENA</Text>
        <Text style={styles.brandK}>KORE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', paddingHorizontal: 24 },
  header: { marginBottom: 24 },
  stepLabel: { color: '#00F2FF', fontSize: 10, fontWeight: '700', letterSpacing: 3, marginBottom: 8 },
  progressBar: { height: 2, backgroundColor: '#1E1E1E', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(0,242,255,0.06)',
    borderWidth: 2, borderColor: '#00F2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 44 },
  textBlock: { alignItems: 'center', gap: 8 },
  versatileBadge: {
    backgroundColor: 'rgba(0,242,255,0.08)',
    borderRadius: 6, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.25)',
  },
  versatileBadgeText: {
    color: '#00F2FF', fontSize: 9, fontWeight: '800', letterSpacing: 2,
  },
  title: {
    color: '#FFFFFF', fontSize: 36, fontWeight: '900',
    letterSpacing: -1.5, textAlign: 'center', lineHeight: 40,
  },
  sportBadge: {
    color: '#D4AF37', fontSize: 14, fontWeight: '800', letterSpacing: 3,
  },
  subtitle: {
    color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 22,
  },
  xpBanner: {
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderRadius: 10, paddingHorizontal: 28, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)',
    alignItems: 'center', gap: 2,
  },
  xpText: { color: '#D4AF37', fontSize: 28, fontWeight: '900' },
  xpSub: { color: '#888', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  brandFooter: {
    flexDirection: 'row', gap: 4, justifyContent: 'center',
  },
  brandA: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: -0.5 },
  brandK: { color: '#D4AF37', fontSize: 14, fontWeight: '900', letterSpacing: -0.5 },
});
