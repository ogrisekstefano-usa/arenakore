/**
 * ARENAKORE LEGACY INITIATION — STEP 1
 * NEXUS BIO-SCAN PROTOCOL: Rito d'iniziazione biometrica
 * VOICE MODULE: "NEXUS SONO PRONTO" keyword activation + TTS response
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, withRepeat, withSequence, withTiming, withDelay,
  useAnimatedStyle, FadeInDown, Easing,
} from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import { VoiceController } from '../../utils/VoiceController';

// ===================================================================
// VOICE ENGINE — Speech Recognition + TTS
// ===================================================================
const KEYWORD = 'nexus sono pronto';
const TTS_RESPONSE = 'Acknowledged, KORE. Initializing DNA Protocol.';

type VoiceState = 'idle' | 'listening' | 'heard' | 'speaking' | 'navigating';

function useVoiceEngine(onActivated: () => void) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const recognitionRef  = useRef<any>(null);
  const stateRef        = useRef<VoiceState>('idle');
  const navigatedRef    = useRef(false);          // single-use navigation guard
  const safetyTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  // ── SAFE NAVIGATE: can only fire once, no matter how many triggers
  const safeNavigate = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    setState('navigating');
    onActivated();
  }, [onActivated]);

  // ── ACTIVATE: fires TTS (best-effort) + 2s safety timeout — ALWAYS navigates
  const activate = useCallback(() => {
    if (navigatedRef.current || stateRef.current === 'navigating') return;

    // Stop any previous recognition / speech
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_e) {}
    }
    try { Speech.stop(); } catch (_e) {}

    setState('heard');

    // Extend safety timeout to 5s (voice file can be ~2-3s)
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = setTimeout(safeNavigate, 5000);

    setState('speaking');

    // ── Play ACKNOWLEDGED with Stefano's voice, navigate only after completion
    VoiceController.playAndWait('ACKNOWLEDGED').then(() => {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
      safeNavigate();
    }).catch(() => safeNavigate());
  }, [safeNavigate]);

  // manualTrigger = activate from any state (mic button + CTA button)
  const manualTrigger = useCallback(() => { activate(); }, [activate]);

  // ── KEYWORD DETECTED (Web Speech API)
  const handleKeywordDetected = useCallback(() => {
    if (navigatedRef.current) return;
    setState('heard');
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_e) {}
    }
    setTimeout(() => activate(), 300);
  }, [activate]);

  // ── Initialize Speech Recognition (Web Speech API only)
  const initRecognition = useCallback(() => {
    if (Platform.OS !== 'web') {
      setMicPermission('granted');
      setState('listening');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setMicPermission('denied');
        setState('listening');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'it-IT';
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setMicPermission('granted');
        if (stateRef.current === 'idle') setState('listening');
      };

      recognition.onresult = (event: any) => {
        let finalT = '';
        let interimT = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) finalT += event.results[i][0].transcript;
          else interimT += event.results[i][0].transcript;
        }
        const combined = (finalT + ' ' + interimT).toLowerCase().trim();
        setTranscript(combined);
        if (combined.includes('nexus') && (combined.includes('pronto') || combined.includes('sono pronto'))) {
          handleKeywordDetected();
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicPermission('denied');
        }
        if (event.error === 'no-speech' || event.error === 'aborted') {
          setTimeout(() => {
            if (stateRef.current === 'listening') {
              try { recognition.start(); } catch (_e) {}
            }
          }, 300);
        }
      };

      recognition.onend = () => {
        if (stateRef.current === 'listening') {
          setTimeout(() => {
            try { recognition.start(); } catch (_e) {}
          }, 300);
        }
      };

      recognitionRef.current = recognition;
      try { recognition.start(); } catch (_e) {}
    } catch (_e) {
      setMicPermission('denied');
      setState('listening');
    }
  }, [handleKeywordDetected]);

  // ── Mount
  useEffect(() => {
    const timer = setTimeout(initRecognition, 500);
    return () => {
      clearTimeout(timer);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_e) {}
      }
      try { Speech.stop(); } catch (_e) {}
    };
  }, [initRecognition]);

  // Fallback: force listening state after 1s (reduced from 2s for ExpoGo responsiveness)
  useEffect(() => {
    const t = setTimeout(() => {
      if (stateRef.current === 'idle') {
        setState('listening');
        setMicPermission('granted');
      }
    }, 1000);
    return () => clearTimeout(t);
  }, []);

  return { state, transcript, micPermission, manualTrigger };
}

// ===================================================================
// WAVEFORM COMPONENT (animated sound bars)
// ===================================================================
function Waveform({ active, color }: { active: boolean; color: string }) {
  const bars = 7;
  const barAnims = Array.from({ length: bars }, () => useSharedValue(0.2));

  useEffect(() => {
    if (active) {
      barAnims.forEach((anim, i) => {
        anim.value = withRepeat(
          withDelay(i * 60,
            withSequence(
              withTiming(0.3 + Math.random() * 0.7, { duration: 200 + Math.random() * 200 }),
              withTiming(0.15 + Math.random() * 0.2, { duration: 200 + Math.random() * 200 }),
            )
          ), -1, true
        );
      });
    } else {
      barAnims.forEach(anim => {
        anim.value = withTiming(0.15, { duration: 300 });
      });
    }
  }, [active]);

  return (
    <View style={wf$.container}>
      {barAnims.map((anim, i) => {
        const barStyle = useAnimatedStyle(() => ({
          height: `${anim.value * 100}%` as any,
          backgroundColor: color,
        }));
        return (
          <Animated.View key={i} style={[wf$.bar, barStyle]} />
        );
      })}
    </View>
  );
}
const wf$ = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 20, gap: 2,
  },
  bar: { width: 3, borderRadius: 1.5, minHeight: 3 },
});

// ===================================================================
// MAIN COMPONENT
// ===================================================================
export default function LegacyStep1() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleNavigate = useCallback(() => {
    router.push('/onboarding/step2');
  }, [router]);

  const { state: voiceState, transcript, micPermission, manualTrigger } = useVoiceEngine(handleNavigate);

  // Force listening state after mount (fallback for headless/blocked browsers)
  const [forceListening, setForceListening] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setForceListening(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const displayVoiceState = forceListening && voiceState === 'idle' ? 'listening' : voiceState;

  // ── Animations
  const pulse = useSharedValue(0.4);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0.4, { duration: 800 })),
      -1, false,
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  // Mic glow animation
  const micGlow = useSharedValue(0.6);
  useEffect(() => {
    micGlow.value = withRepeat(
      withSequence(withTiming(1, { duration: 1200 }), withTiming(0.6, { duration: 1200 })),
      -1, false,
    );
  }, []);
  const micGlowStyle = useAnimatedStyle(() => ({ opacity: micGlow.value }));

  // Voice state color — mic gold = TTS firing, CTA also activates to cyan
  const isGold = displayVoiceState === 'heard' || displayVoiceState === 'speaking' || displayVoiceState === 'navigating';
  const isActivated = isGold;  // CTA becomes cyan when voice engine fires
  const micColor = isGold ? '#D4AF37' : '#00F2FF';
  const isWaveActive = displayVoiceState === 'heard' || displayVoiceState === 'speaking';

  return (
    <View style={[s.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
      <StatusBar barStyle="light-content" />

      {/* Top bar — ARENA white + KORE cyan */}
      <View style={s.topBar}>
        <View style={{ flexDirection: 'row' }}>
          <Text style={[s.brand, { color: '#FFFFFF' }]}>ARENA</Text>
          <Text style={[s.brand, { color: '#00F2FF' }]}>KORE</Text>
        </View>
        <View style={s.stepPill}>
          <Text style={s.stepTxt}>01 / 04</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={s.progBar}>
        <View style={[s.progFill, { width: '25%' }]} />
      </View>

      {/* Hero text — NEXUS CALIBRATION (Gold outer-glow) */}
      <Animated.View entering={FadeInDown.delay(200)} style={s.heroWrap}>
        <Text style={s.heroTagline}>— PROTOCOLLO BIOMETRICO —</Text>
        <Text style={s.heroLine1}>NEXUS</Text>
        <Text style={s.heroLine2}>CALIBRATION</Text>
        <View style={s.goldLine} />
      </Animated.View>

      {/* Body text */}
      <Animated.View entering={FadeInDown.delay(400)} style={s.bodyWrap}>
        <Text style={s.bodyText}>
          IL PROSSIMO STEP GENERERÀ IL TUO KORE DNA.
          POSIZIONATI DAVANTI ALLA CAMERA E RIMANI
          IMMOBILE PER 3 SECONDI PER LA CALIBRAZIONE
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
            <Ionicons name={icon as any} size={12} color="#D4AF37" />
            <Text style={s.specTxt}>{txt}</Text>
          </View>
        ))}
      </Animated.View>

      {/* ══════ VOICE STATUS INDICATOR ══════ */}
      <Animated.View entering={FadeInDown.delay(800)} style={s.voiceSection}>
        {/* Listening indicator */}
        <View style={[s.voiceStatusRow, isGold && s.voiceStatusGold]}>
          <Animated.View style={micGlowStyle}>
            <Ionicons
              name={displayVoiceState === 'speaking' ? 'volume-high' : 'mic'}
              size={14}
              color={micColor}
            />
          </Animated.View>

          {displayVoiceState === 'idle' && (
            <Text style={s.voiceLabel}>NEXUS: INIZIALIZZAZIONE...</Text>
          )}
          {displayVoiceState === 'listening' && (
            <Animated.View style={[s.voiceLabelRow, micGlowStyle]}>
              <Text style={s.voiceLabel}>NEXUS: LISTENING...</Text>
            </Animated.View>
          )}
          {displayVoiceState === 'heard' && (
            <Text style={[s.voiceLabel, { color: '#D4AF37' }]}>KEYWORD RILEVATA</Text>
          )}
          {displayVoiceState === 'speaking' && (
            <Text style={[s.voiceLabel, { color: '#D4AF37' }]}>NEXUS RESPONDING...</Text>
          )}
          {displayVoiceState === 'navigating' && (
            <Text style={[s.voiceLabel, { color: '#D4AF37' }]}>INIZIALIZZAZIONE DNA PROTOCOL...</Text>
          )}

          {/* Waveform */}
          {(isWaveActive) && (
            <Waveform active={true} color="#D4AF37" />
          )}
          {displayVoiceState === 'listening' && (
            <Waveform active={true} color="rgba(0,242,255,0.4)" />
          )}
        </View>

        {/* Keyword hint */}
        {displayVoiceState === 'listening' && (
          <Text style={s.keywordHint}>PRONUNCIA: "NEXUS SONO PRONTO"</Text>
        )}

        {/* Transcript (debug - subtle) */}
        {transcript.length > 0 && displayVoiceState === 'listening' && (
          <Text style={s.transcript} numberOfLines={1}>{transcript.toUpperCase()}</Text>
        )}
      </Animated.View>

      {/* ══════ CTA AREA ══════ */}
      <Animated.View entering={FadeInDown.delay(900)} style={s.ctaWrap}>
        {/* Main START button */}
        <View style={s.ctaRow}>
          <TouchableOpacity
            testID="step1-start-scan-btn"
            style={[s.cta, isActivated && s.ctaActivated]}
            onPress={manualTrigger}
            activeOpacity={0.85}
            disabled={displayVoiceState === 'navigating'}
          >
            <Ionicons
              name="scan"
              size={16}
              color="#050505"
            />
            <Text style={s.ctaTxt}>
              {displayVoiceState === 'navigating' ? 'NEXUS ATTIVATO' : 'INIZIA CALIBRAZIONE'}
            </Text>
          </TouchableOpacity>

          {/* Voice trigger button (mic) */}
          <TouchableOpacity
            style={[s.micBtn, isGold && s.micBtnGold]}
            onPress={manualTrigger}
            activeOpacity={0.7}
            disabled={displayVoiceState === 'speaking' || displayVoiceState === 'navigating'}
          >
            <Animated.View style={micGlowStyle}>
              <Ionicons
                name={isGold ? 'mic' : 'mic-outline'}
                size={20}
                color={isGold ? '#D4AF37' : '#00F2FF'}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Voice activation label */}
        <Text style={s.orLabel}>OPPURE ATTIVA CON LA VOCE</Text>
      </Animated.View>
    </View>
  );
}

// ===================================================================
// STYLES
// ===================================================================
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
    height: 2, backgroundColor: '#111', borderRadius: 2, marginBottom: 28, overflow: 'hidden',
  },
  progFill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: 2 },

  // ── HERO — NEXUS CALIBRATION with Gold Outer-Glow
  heroWrap: { gap: 2, marginBottom: 16 },
  heroTagline: {
    color: 'rgba(212,175,55,0.4)', fontSize: 9, fontWeight: '900',
    letterSpacing: 6, marginBottom: 4,
  },
  heroLine1: {
    color: '#00F2FF',              // NEXUS = CYAN (not gold)
    fontSize: 58, fontWeight: '900',
    letterSpacing: -2, lineHeight: 60,
    textShadowColor: 'rgba(0,242,255,0.65)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  heroLine2: {
    color: '#FFFFFF', fontSize: 42, fontWeight: '900',
    letterSpacing: -1, lineHeight: 46,
    textShadowColor: 'rgba(212,175,55,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  goldLine: {
    height: 2, width: 56, backgroundColor: '#D4AF37', marginTop: 12,
    shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
  },
  // Legacy compatibility (unused but kept to avoid ref errors)
  heroLine3: { color: '#FFFFFF', fontSize: 58, fontWeight: '900', letterSpacing: -2 },
  cyanLine: { height: 2, width: 56, backgroundColor: '#00F2FF', marginBottom: 28 },

  // ── BODY TEXT — Off-White #E0E0E0
  bodyWrap: { marginBottom: 20 },
  bodyText: {
    color: '#E0E0E0', fontSize: 12, fontWeight: '700',
    letterSpacing: 0.5, lineHeight: 20,
  },

  // ── SPEC / WARNING — command center aesthetic
  warningRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  warningDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#D4AF37',
  },
  warningTxt: { color: '#D4AF37', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  specList: { gap: 7, marginBottom: 12 },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  specTxt: { color: '#888', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },

  // Voice section — SALA COMANDI
  voiceSection: { gap: 6, marginBottom: 'auto' as any },
  voiceStatusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,242,255,0.05)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.15)',
  },
  voiceStatusGold: {
    backgroundColor: 'rgba(212,175,55,0.06)',
    borderColor: 'rgba(212,175,55,0.3)',
    shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 10,
  },
  voiceLabelRow: { flexDirection: 'row', alignItems: 'center' },
  voiceLabel: {
    flex: 1, color: '#00F2FF', fontSize: 11, fontWeight: '900', letterSpacing: 2,
  },
  keywordHint: {
    color: 'rgba(212,175,55,0.4)', fontSize: 9, fontWeight: '900',
    letterSpacing: 3, textAlign: 'center',
  },
  transcript: {
    color: 'rgba(255,255,255,0.12)', fontSize: 8, fontWeight: '700',
    letterSpacing: 1, textAlign: 'center',
  },

  // CTA
  ctaWrap: { marginTop: 12, gap: 8 },
  ctaRow: { flexDirection: 'row', gap: 10 },
  cta: {
    flex: 1, backgroundColor: '#D4AF37', borderRadius: 10,
    paddingVertical: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 12,
    shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12,
    elevation: 8,
  },
  ctaActivated: {
    backgroundColor: '#00F2FF',         // Cyan when NEXUS activated
    shadowColor: '#00F2FF',
    shadowOpacity: 0.55,
    shadowRadius: 14,
  },
  ctaGold: { backgroundColor: '#D4AF37', opacity: 0.7 },
  ctaTxt: {
    color: '#050505', fontSize: 14, fontWeight: '900', letterSpacing: 2,
  },
  micBtn: {
    width: 58, height: 58, borderRadius: 10,
    backgroundColor: 'rgba(0,242,255,0.06)',
    borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  micBtnGold: {
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderColor: 'rgba(212,175,55,0.4)',
    shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10,
  },
  orLabel: {
    color: 'rgba(255,255,255,0.15)', fontSize: 9, fontWeight: '800',
    letterSpacing: 2, textAlign: 'center',
  },
});
