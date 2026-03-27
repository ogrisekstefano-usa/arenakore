import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, withTiming, withSpring, useAnimatedStyle,
} from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';

export default function Step3() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role, sport } = useLocalSearchParams<{ role: string; sport: string }>();
  const { completeOnboarding } = useAuth();

  const xpScale = useSharedValue(0.4);
  const xpOpacity = useSharedValue(0);
  const subOpacity = useSharedValue(0);

  useEffect(() => {
    const run = async () => {
      try {
        await completeOnboarding(role || 'atleta', sport || 'atletica');
      } catch (e) {
        console.error('Onboarding error:', e);
      }
      xpOpacity.value = withTiming(1, { duration: 600 });
      xpScale.value = withSpring(1, { damping: 10, stiffness: 100 });
      setTimeout(() => {
        subOpacity.value = withTiming(1, { duration: 500 });
      }, 700);
      setTimeout(() => {
        router.replace('/(tabs)/core');
      }, 3000);
    };
    run();
  }, []);

  const xpStyle = useAnimatedStyle(() => ({
    opacity: xpOpacity.value,
    transform: [{ scale: xpScale.value }],
  }));

  const subStyle = useAnimatedStyle(() => ({ opacity: subOpacity.value }));

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.center}>
        <Animated.View style={[styles.xpContainer, xpStyle]}>
          <Text style={styles.plus}>+</Text>
          <Text style={styles.xpNumber}>100</Text>
          <Text style={styles.xpLabel}>XP</Text>
        </Animated.View>
        <Animated.View style={[styles.subContainer, subStyle]}>
          <Text style={styles.welcome}>BENVENUTO NELL'ARENA</Text>
          <Text style={styles.desc}>Il tuo Legacy è iniziato ⚡</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 32 },
  xpContainer: { alignItems: 'center' },
  plus: {
    color: '#D4AF37', fontSize: 36, fontWeight: '900',
    textShadowColor: 'rgba(255,215,0,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  xpNumber: {
    color: '#D4AF37', fontSize: 110, fontWeight: '900',
    letterSpacing: -5, lineHeight: 110,
    textShadowColor: 'rgba(255,215,0,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  xpLabel: {
    color: '#D4AF37', fontSize: 40, fontWeight: '900', letterSpacing: 6,
    textShadowColor: 'rgba(255,215,0,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  subContainer: { alignItems: 'center', gap: 8 },
  welcome: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 2, textAlign: 'center' },
  desc: { color: '#666666', fontSize: 14, textAlign: 'center' },
});
