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
        router.replace('/(tabs)/kore');
      } else {
        router.replace('/onboarding/step1');
      }
    }
  }, [isLoading, token, user]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingRow}>
          <Text style={styles.loadingArena}>ARENA</Text>
          <Text style={styles.loadingKore}>KORE</Text>
        </View>
        <Text style={styles.loadingSub}>The Core of Performance</Text>
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
              <Text style={styles.tagline}>THE CORE OF PERFORMANCE</Text>
              <View style={styles.nameRow}>
                <Text style={styles.appNameArena}>ARENA</Text>
                <Text style={styles.appNameKore}>KORE</Text>
              </View>
              <View style={styles.dividerLine} />
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
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  loadingRow: { flexDirection: 'row', gap: 6 },
  loadingArena: { fontSize: 48, fontWeight: '900', color: '#FFFFFF', letterSpacing: -2 },
  loadingKore: { fontSize: 48, fontWeight: '900', color: '#D4AF37', letterSpacing: -2 },
  loadingSub: { color: '#555', fontSize: 12, fontWeight: '600', letterSpacing: 3, textTransform: 'uppercase' },
  bg: { flex: 1 },
  bgImage: { opacity: 0.30 },
  overlay: { flex: 1, backgroundColor: 'rgba(5,5,5,0.72)' },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  logoContainer: { flex: 1, justifyContent: 'center', alignItems: 'flex-start' },
  tagline: {
    color: '#00F2FF', fontSize: 10, fontWeight: '700',
    letterSpacing: 5, marginBottom: 12, textTransform: 'uppercase',
  },
  nameRow: { flexDirection: 'row', gap: 8 },
  appNameArena: {
    color: '#FFFFFF', fontSize: 72, fontWeight: '900',
    letterSpacing: -3, lineHeight: 78, textTransform: 'uppercase',
  },
  appNameKore: {
    color: '#D4AF37', fontSize: 72, fontWeight: '900',
    letterSpacing: -3, lineHeight: 78, textTransform: 'uppercase',
  },
  dividerLine: {
    width: 48, height: 2, backgroundColor: '#D4AF37',
    marginTop: 16, marginBottom: 12, opacity: 0.6,
  },
  subtitle: { color: '#888', fontSize: 13, letterSpacing: 0.5 },
  buttons: { gap: 12, paddingBottom: 8 },
  primaryButton: {
    backgroundColor: '#00F2FF', borderRadius: 8,
    paddingVertical: 18, alignItems: 'center',
  },
  primaryButtonText: {
    color: '#050505', fontSize: 16, fontWeight: '800', letterSpacing: 2,
  },
  outlineButton: {
    backgroundColor: 'transparent', borderRadius: 8,
    paddingVertical: 18, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#00F2FF',
  },
  outlineButtonText: {
    color: '#00F2FF', fontSize: 16, fontWeight: '800', letterSpacing: 2,
  },
});
