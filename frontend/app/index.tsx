import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ImageBackground, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedButton } from '../components/AnimatedButton';
import { useAuth } from '../contexts/AuthContext';

export default function AuthLanding() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoading && token && user) {
      if (user.onboarding_completed) {
        router.replace('/(tabs)/core');
      } else {
        router.replace('/onboarding/step1');
      }
    }
  }, [isLoading, token, user]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingArena}>ARENA</Text>
        <Text style={styles.loadingDare}>DARE</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="auth-landing">
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={{ uri: 'https://images.pexels.com/photos/7733627/pexels-photo-7733627.jpeg' }}
        style={styles.bg}
        imageStyle={styles.bgImage}
      >
        <View style={styles.overlay}>
          <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
            <View style={styles.logoContainer}>
              <Text style={styles.tagline}>THE ARENA AWAITS</Text>
              <Text style={styles.appNameArena}>ARENA</Text>
              <Text style={styles.appNameDare}>DARE</Text>
              <Text style={styles.subtitle}>Analisi Biometrica · Performance · Crew</Text>
            </View>
            <View style={styles.buttons}>
              <AnimatedButton
                testID="start-legacy-btn"
                onPress={() => router.push('/register')}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>START LEGACY</Text>
              </AnimatedButton>
              <AnimatedButton
                testID="resume-btn"
                onPress={() => router.push('/login')}
                style={styles.outlineButton}
              >
                <Text style={styles.outlineButtonText}>RESUME</Text>
              </AnimatedButton>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  loadingContainer: {
    flex: 1, backgroundColor: '#050505',
    alignItems: 'center', justifyContent: 'center',
  },
  loadingArena: { fontSize: 56, fontWeight: '900', color: '#FFFFFF', letterSpacing: -2 },
  loadingDare: { fontSize: 56, fontWeight: '900', color: '#D4AF37', letterSpacing: -2 },
  bg: { flex: 1 },
  bgImage: { opacity: 0.35 },
  overlay: { flex: 1, backgroundColor: 'rgba(5,5,5,0.70)' },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  logoContainer: { flex: 1, justifyContent: 'center', alignItems: 'flex-start' },
  tagline: {
    color: '#00F2FF', fontSize: 11, fontWeight: '700',
    letterSpacing: 4, marginBottom: 8, textTransform: 'uppercase',
  },
  appNameArena: {
    color: '#FFFFFF', fontSize: 80, fontWeight: '900',
    letterSpacing: -3, lineHeight: 84, textTransform: 'uppercase',
  },
  appNameDare: {
    color: '#D4AF37', fontSize: 80, fontWeight: '900',
    letterSpacing: -3, lineHeight: 84, textTransform: 'uppercase',
    marginTop: -12,
  },
  subtitle: { color: '#A0A0A0', fontSize: 13, marginTop: 16, letterSpacing: 0.5 },
  buttons: { gap: 12, paddingBottom: 8 },
  primaryButton: {
    backgroundColor: '#00F2FF', borderRadius: 8,
    paddingVertical: 18, alignItems: 'center',
  },
  primaryButtonText: {
    color: '#050505', fontSize: 16, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase',
  },
  outlineButton: {
    backgroundColor: 'transparent', borderRadius: 8,
    paddingVertical: 18, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#00F2FF',
  },
  outlineButtonText: {
    color: '#00F2FF', fontSize: 16, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase',
  },
});
