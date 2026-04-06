/**
 * ARENAKORE — ONBOARDING CHOICE (IL BIVIO)
 * L'utente sceglie come creare il proprio KORE ID:
 *   A) SCANSIONE BIOMETRICA (AI) → step2.tsx (NEXUS Scanner)
 *   B) REGISTRAZIONE VELOCE (Manuale) → manual-onboarding.tsx
 */
import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing
} from 'react-native-reanimated';
import Svg, { Line, Circle, Rect, G } from 'react-native-svg';

const CYAN = '#00E5FF';
const GOLD = '#FFD700';
const BG   = '#0A0A0A';
const FONT_M = Platform.select({ ios: 'Montserrat', android: 'Montserrat', default: 'Montserrat' });

// ── SCANNER LASER ANIMATION ──
function ScannerLaser({ width, height }: { width: number; height: number }) {
  const scanY = useSharedValue(0);

  useEffect(() => {
    scanY.value = withRepeat(
      withSequence(
        withTiming(height - 4, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.quad) })
      ),
      -1, false
    );
  }, [height]);

  const laserStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: scanY.value,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: CYAN,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
  }));

  return (
    <View style={laser$.container}>
      {/* Grid lines */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {[0.25, 0.5, 0.75].map(p => (
          <Line key={`h${p}`} x1={0} y1={height * p} x2={width} y2={height * p}
            stroke="rgba(0,229,255,0.12)" strokeWidth={0.5} />
        ))}
        {[0.25, 0.5, 0.75].map(p => (
          <Line key={`v${p}`} x1={width * p} y1={0} x2={width * p} y2={height}
            stroke="rgba(0,229,255,0.12)" strokeWidth={0.5} />
        ))}
        {/* Body silhouette */}
        <G opacity={0.2}>
          <Circle cx={width / 2} cy={height * 0.12} r={18} stroke={CYAN} strokeWidth={1.5} fill="none" />
          <Line x1={width / 2} y1={height * 0.2} x2={width / 2} y2={height * 0.55}
            stroke={CYAN} strokeWidth={1.5} />
          <Line x1={width * 0.3} y1={height * 0.35} x2={width * 0.7} y2={height * 0.35}
            stroke={CYAN} strokeWidth={1.5} />
          <Line x1={width / 2} y1={height * 0.55} x2={width * 0.35} y2={height * 0.85}
            stroke={CYAN} strokeWidth={1.5} />
          <Line x1={width / 2} y1={height * 0.55} x2={width * 0.65} y2={height * 0.85}
            stroke={CYAN} strokeWidth={1.5} />
        </G>
        {/* Corner brackets */}
        <G stroke={CYAN} strokeWidth={2} opacity={0.5}>
          <Line x1={4} y1={4} x2={24} y2={4} />
          <Line x1={4} y1={4} x2={4} y2={24} />
          <Line x1={width - 4} y1={4} x2={width - 24} y2={4} />
          <Line x1={width - 4} y1={4} x2={width - 4} y2={24} />
          <Line x1={4} y1={height - 4} x2={24} y2={height - 4} />
          <Line x1={4} y1={height - 4} x2={4} y2={height - 24} />
          <Line x1={width - 4} y1={height - 4} x2={width - 24} y2={height - 4} />
          <Line x1={width - 4} y1={height - 4} x2={width - 4} y2={height - 24} />
        </G>
      </Svg>
      {/* Animated laser line */}
      <Animated.View style={laserStyle} />
    </View>
  );
}

export default function OnboardingChoice() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Pulsing glow for recommended badge
  const pulseVal = useSharedValue(0.5);
  useEffect(() => {
    pulseVal.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0.5, { duration: 1200 })
      ), -1, false
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseVal.value }));

  return (
    <View style={[s.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar barStyle="light-content" />

      {/* ── CLOSE BUTTON ── */}
      <TouchableOpacity
        style={s.closeBtn}
        onPress={() => router.replace('/')}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={22} color="#FF3B30" />
      </TouchableOpacity>

      {/* ── HEADER ── */}
      <Animated.View entering={FadeInDown.delay(100).duration(600)} style={s.headerBlock}>
        <View style={s.brandRow}>
          <Text style={s.brandW}>ARENA</Text>
          <Text style={s.brandC}>KORE</Text>
        </View>
        <Text style={s.title}>CREA IL TUO KORE ID</Text>
        <Text style={s.subtitle}>SCEGLI COME INIZIARE LA TUA LEGACY</Text>
      </Animated.View>

      {/* ── OPTION A: BIOMETRIC SCAN (RECOMMENDED) ── */}
      <Animated.View entering={FadeInDown.delay(300).duration(600)}>
        <TouchableOpacity
          style={s.cardPrimary}
          activeOpacity={0.85}
          onPress={() => router.push('/onboarding/step2')}
        >
          {/* Recommended Badge */}
          <Animated.View style={[s.recBadge, pulseStyle]}>
            <Ionicons name="shield-checkmark" size={10} color="#000" />
            <Text style={s.recTxt}>CONSIGLIATA</Text>
          </Animated.View>

          {/* Scanner animation */}
          <View style={s.scannerBox}>
            <ScannerLaser width={120} height={140} />
          </View>

          <View style={s.cardContent}>
            <View style={s.cardTitleRow}>
              <Ionicons name="body-outline" size={22} color={CYAN} />
              <Text style={s.cardTitle}>SCANSIONE BIOMETRICA</Text>
            </View>
            <Text style={s.cardDesc}>
              Analizza la tua struttura fisica e simmetria con l'AI NÈXUS per un profilo d'élite.
            </Text>
            <View style={s.ctaRow}>
              <Text style={s.ctaPrimary}>GENERA KORE ID CON AI</Text>
              <Ionicons name="arrow-forward" size={16} color="#000" />
            </View>
          </View>

          {/* Badge features */}
          <View style={s.featureRow}>
            <View style={s.featurePill}>
              <Ionicons name="checkmark-circle" size={12} color={CYAN} />
              <Text style={s.featureTxt}>VERIFIED</Text>
            </View>
            <View style={s.featurePill}>
              <Ionicons name="analytics" size={12} color={GOLD} />
              <Text style={s.featureTxt}>DNA SCORE</Text>
            </View>
            <View style={s.featurePill}>
              <Ionicons name="flash" size={12} color={GOLD} />
              <Text style={s.featureTxt}>+50 FLUX</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* ── DIVIDER ── */}
      <View style={s.divider}>
        <View style={s.divLine} />
        <Text style={s.divTxt}>OPPURE</Text>
        <View style={s.divLine} />
      </View>

      {/* ── OPTION B: FAST REGISTRATION ── */}
      <Animated.View entering={FadeInUp.delay(500).duration(600)}>
        <TouchableOpacity
          style={s.cardSecondary}
          activeOpacity={0.85}
          onPress={() => router.push({ pathname: '/onboarding/register-profile', params: { is_nexus_certified: 'false' } })}
        >
          <View style={s.cardContent}>
            <View style={s.cardTitleRow}>
              <Ionicons name="pencil-outline" size={20} color="rgba(255,255,255,0.6)" />
              <Text style={s.cardTitleSec}>REGISTRAZIONE VELOCE</Text>
            </View>
            <Text style={s.cardDescSec}>
              Imposta il tuo profilo ora con altezza, peso e livello. Potrai fare la scansione in seguito.
            </Text>
            <View style={s.ctaRowSec}>
              <Text style={s.ctaSecondary}>INSERISCI DATI MANUALMENTE</Text>
              <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.5)" />
            </View>
          </View>

          {/* Not verified badge */}
          <View style={s.notVerifiedRow}>
            <Ionicons name="alert-circle-outline" size={12} color="#FF9500" />
            <Text style={s.notVerifiedTxt}>KORE ID NON VERIFICATO — POTRAI SCANNERIZZARE IN SEGUITO</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── STYLES ──
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  brandW: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 4,
    fontFamily: FONT_M,
  },
  brandC: {
    fontSize: 14,
    fontWeight: '900',
    color: CYAN,
    letterSpacing: 4,
    fontFamily: FONT_M,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 3,
    textAlign: 'center',
    fontFamily: FONT_M,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 2,
    marginTop: 6,
    fontFamily: FONT_M,
  },

  // ── OPTION A: Primary (Biometric)
  cardPrimary: {
    backgroundColor: 'rgba(0,229,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.25)',
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  recBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: CYAN,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 5,
  },
  recTxt: {
    fontSize: 8,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1.5,
    fontFamily: FONT_M,
  },
  scannerBox: {
    width: 120,
    height: 140,
    alignSelf: 'center',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardContent: {
    gap: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: CYAN,
    letterSpacing: 2,
    fontFamily: FONT_M,
  },
  cardDesc: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 17,
    fontFamily: FONT_M,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CYAN,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  ctaPrimary: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 2,
    fontFamily: FONT_M,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featureTxt: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    fontFamily: FONT_M,
  },

  // ── DIVIDER
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  divLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  divTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 3,
    fontFamily: FONT_M,
  },

  // ── OPTION B: Secondary (Manual)
  cardSecondary: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
  },
  cardTitleSec: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    fontFamily: FONT_M,
  },
  cardDescSec: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.35)',
    lineHeight: 17,
    fontFamily: FONT_M,
  },
  ctaRowSec: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  ctaSecondary: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    fontFamily: FONT_M,
  },
  notVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,150,0,0.1)',
  },
  notVerifiedTxt: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,150,0,0.5)',
    letterSpacing: 1,
    flex: 1,
    fontFamily: FONT_M,
  },
});

const laser$ = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.85)',
    overflow: 'hidden',
  },
});
