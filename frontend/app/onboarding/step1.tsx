/**
 * ARENAKORE LEGACY INITIATION — STEP 1
 * NEXUS BIO-SCAN PROTOCOL: Rito d'iniziazione biometrica
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue, withRepeat, withSequence, withTiming,
  useAnimatedStyle, FadeInDown,
} from 'react-native-reanimated';

export default function LegacyStep1() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Pulsing dot animation
  const pulse = useSharedValue(0.4);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 }),
      ), -1, false,
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={[s.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
      <StatusBar barStyle="light-content" />

      {/* Top bar */}
      <View style={s.topBar}>
        <Text style={s.brand}>ARENAKORE</Text>
        <View style={s.stepPill}>
          <Text style={s.stepTxt}>01 / 04</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={s.progBar}>
        <View style={[s.progFill, { width: '25%' }]} />
      </View>

      {/* Hero text */}
      <Animated.View entering={FadeInDown.delay(200)} style={s.heroWrap}>
        <Text style={s.heroLine1}>NEXUS</Text>
        <Text style={s.heroLine2}>BIO-SCAN</Text>
        <Text style={s.heroLine3}>PROTOCOL</Text>
      </Animated.View>

      <View style={s.cyanLine} />

      {/* Body text */}
      <Animated.View entering={FadeInDown.delay(400)} style={s.bodyWrap}>
        <Text style={s.bodyText}>
          IL PROSSIMO STEP GENERERÀ IL TUO KORE DNA.{' '}
          POSIZIONATI DAVANTI ALLA CAMERA E RIMANI{' '}
          IMMOBILE PER 3 SECONDI PER LA CALIBRAZIONE{' '}
          BIOMETRICA.
        </Text>
      </Animated.View>

      {/* Warning indicators */}
      <Animated.View entering={FadeInDown.delay(600)} style={s.warningRow}>
        <Animated.View style={[s.warningDot, pulseStyle]} />
        <Text style={s.warningTxt}>SISTEMA DI RICONOSCIMENTO ATTIVO</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(700)} style={s.specList}>
        {[
          ['analytics', '17 PUNTI BIOMETRICI'],
          ['pulse', 'FILTRO EMA — JITTER HYSTERESIS 3PX'],
          ['timer', 'VALIDAZIONE 3 SECONDI'],
          ['flash', 'GOLD FLASH: KORE IDENTIFICATO'],
        ].map(([icon, txt], i) => (
          <View key={i} style={s.specRow}>
            <Ionicons name={icon as any} size={12} color="#00F2FF" />
            <Text style={s.specTxt}>{txt}</Text>
          </View>
        ))}
      </Animated.View>

      {/* CTA */}
      <Animated.View entering={FadeInDown.delay(900)} style={s.ctaWrap}>
        <TouchableOpacity
          testID="step1-start-scan-btn"
          style={s.cta}
          onPress={() => router.push('/onboarding/step2')}
          activeOpacity={0.85}
        >
          <Ionicons name="scan" size={16} color="#050505" />
          <Text style={s.ctaTxt}>INIZIA CALIBRAZIONE</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505', paddingHorizontal: 24 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  brand: { color: '#D4AF37', fontSize: 11, fontWeight: '900', letterSpacing: 6 },
  stepPill: {
    backgroundColor: 'rgba(0,242,255,0.08)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.2)',
  },
  stepTxt: { color: '#00F2FF', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  progBar: {
    height: 2, backgroundColor: '#111', borderRadius: 2, marginBottom: 32, overflow: 'hidden',
  },
  progFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  heroWrap: { gap: 2, marginBottom: 20 },
  heroLine1: {
    color: '#FFFFFF', fontSize: 58, fontWeight: '900',
    letterSpacing: -2, lineHeight: 62,
  },
  heroLine2: {
    color: '#00F2FF', fontSize: 58, fontWeight: '900',
    letterSpacing: -2, lineHeight: 62,
  },
  heroLine3: {
    color: '#FFFFFF', fontSize: 58, fontWeight: '900',
    letterSpacing: -2, lineHeight: 62,
  },
  cyanLine: {
    height: 2, width: 56, backgroundColor: '#00F2FF', marginBottom: 28,
    shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 8,
  },
  bodyWrap: { marginBottom: 32 },
  bodyText: {
    color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '800',
    letterSpacing: 1, lineHeight: 22,
  },
  warningRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24,
  },
  warningDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#00F2FF',
    shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 6,
  },
  warningTxt: { color: '#00F2FF', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  specList: { gap: 10, marginBottom: 'auto' as any },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  specTxt: { color: '#333', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  ctaWrap: { marginTop: 32 },
  cta: {
    backgroundColor: '#00F2FF', borderRadius: 8,
    paddingVertical: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  ctaTxt: {
    color: '#050505', fontSize: 14, fontWeight: '900', letterSpacing: 3,
  },
});
