/**
 * ARENAKORE LEGACY INITIATION — STEP 3
 * KORE DNA PROFILING: Altezza, Peso, Età, Livello Allenamento
 * GPS: Detects real city on mount → overwrites CHICAGO in passport on next render
 * Visual: Gold outer-glow title · Off-white labels (#E0E0E0) · Cyan neon containers
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Design tokens
const CYAN   = '#00F2FF';
const GOLD   = '#D4AF37';
const BG     = '#050505';
const CARD   = 'rgba(0,242,255,0.025)';
const BORDER = 'rgba(0,242,255,0.65)';
const BORDER_ACTIVE = CYAN;

const LEVELS = [
  {
    id: 'LEGACY', label: 'LEGACY',
    desc: 'INIZIANTE — Il tuo viaggio comincia ora',
    icon: 'leaf-outline' as const,
  },
  {
    id: 'ELITE', label: 'ELITE',
    desc: 'INTERMEDIO — Spingi oltre i limiti',
    icon: 'flash-outline' as const,
  },
  {
    id: 'KORE', label: 'KORE',
    desc: 'AVANZATO — Sei già oltre il confine',
    icon: 'diamond-outline' as const,
  },
];

// ── Focused-input hook (for neon glow on active input)
function useInputFocus() {
  const [focused, setFocused] = useState<string | null>(null);
  const onFocus = useCallback((id: string) => setFocused(id), []);
  const onBlur  = useCallback(() => setFocused(null), []);
  return { focused, onFocus, onBlur };
}

export default function LegacyStep3() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { focused, onFocus, onBlur } = useInputFocus();

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge]       = useState('');
  const [level, setLevel]   = useState<string | null>(null);
  const [error, setError]   = useState('');
  const [ghostMode, setGhostMode] = useState(false);
  const [detectedCity, setDetectedCity] = useState<string>('CHICAGO');

  // ── GPS: detect real city on mount, update scan result for passport
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const [geo] = await Location.reverseGeocodeAsync(pos.coords);
        const city = (geo?.city || geo?.subregion || geo?.region || 'CHICAGO')
          .toUpperCase()
          .trim();

        setDetectedCity(city);

        // Update scan result with real city (passport will show it on next render)
        const existing = await AsyncStorage.getItem('@kore_scan_result');
        if (existing) {
          const parsed = JSON.parse(existing);
          await AsyncStorage.setItem('@kore_scan_result', JSON.stringify({ ...parsed, city }));
        }
        // Also save as standalone GPS city for step4 registration
        await AsyncStorage.setItem('@kore_gps_city', city);
      } catch (_e) {
        // GPS unavailable — keep CHICAGO as fallback, non-blocking
      }
    })();
  }, []);

  const handleContinue = useCallback(() => {
    if (!height || !weight || !age || !level) {
      setError('COMPLETA TUTTI I CAMPI PER GENERARE IL TUO PROFILO DNA');
      return;
    }
    const h = parseFloat(height);
    const w = parseFloat(weight);
    const a = parseInt(age);
    if (h < 100 || h > 250) { setError('ALTEZZA NON VALIDA (100–250 CM)'); return; }
    if (w < 30  || w > 300) { setError('PESO NON VALIDO (30–300 KG)');     return; }
    if (a < 12  || a > 100) { setError('ETÀ NON VALIDA (12–100)');          return; }
    setError('');
    router.push({
      pathname: '/onboarding/step4',
      params: { height_cm: h, weight_kg: w, age: a, training_level: level, ghost_mode: ghostMode ? '1' : '0', city: detectedCity },
    });
  }, [height, weight, age, level, router]);

  const inputStyle = (id: string) => [
    s.input,
    focused === id && s.inputFocused,
  ];

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle="light-content" />

        {/* ── Top bar ── */}
        <View style={s.topBar}>
          <Text style={s.brand}>ARENAKORE</Text>
          <View style={s.stepPill}>
            <Text style={s.stepTxt}>03 / 04</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={s.progBar}>
          <View style={[s.progFill, { width: '75%' }]} />
        </View>

        {/* ── TITLE with Gold Glow ── */}
        <Animated.View entering={FadeInDown.delay(100)} style={s.titleWrap}>
          <Text style={s.titleLine1}>KORE DNA</Text>
          <Text style={s.titleLine2}>PROFILING</Text>
          <View style={s.accentLine} />
          <Text style={s.subtitle}>
            I TUOI PARAMETRI BIOMETRICI CALIBRANO{'\n'}
            LA BIO-SIGNATURE DEL NEXUS PROTOCOL.
          </Text>
        </Animated.View>

        {/* ── BIOMETRIC INPUTS ── */}
        <Animated.View entering={FadeInDown.delay(200)} style={s.group}>
          <View style={s.groupHeader}>
            <View style={s.groupDot} />
            <Text style={s.groupLabel}>PARAMETRI BIOMETRICI</Text>
          </View>

          {/* Height + Weight row */}
          <View style={s.fieldRow}>
            <View style={s.fieldHalf}>
              <Text style={s.fieldLabel}>ALTEZZA (CM)</Text>
              <TextInput
                testID="height-input"
                style={inputStyle('height')}
                value={height}
                onChangeText={setHeight}
                onFocus={() => onFocus('height')}
                onBlur={onBlur}
                placeholder="180"
                placeholderTextColor="rgba(0,242,255,0.65)"
                keyboardType="decimal-pad"
                maxLength={5}
                selectionColor={CYAN}
              />
            </View>
            <View style={s.fieldHalf}>
              <Text style={s.fieldLabel}>PESO (KG)</Text>
              <TextInput
                testID="weight-input"
                style={inputStyle('weight')}
                value={weight}
                onChangeText={setWeight}
                onFocus={() => onFocus('weight')}
                onBlur={onBlur}
                placeholder="75"
                placeholderTextColor="rgba(0,242,255,0.65)"
                keyboardType="decimal-pad"
                maxLength={5}
                selectionColor={CYAN}
              />
            </View>
          </View>

          {/* Age */}
          <View>
            <Text style={s.fieldLabel}>ETÀ</Text>
            <TextInput
              testID="age-input"
              style={inputStyle('age')}
              value={age}
              onChangeText={setAge}
              onFocus={() => onFocus('age')}
              onBlur={onBlur}
              placeholder="25"
              placeholderTextColor="rgba(0,242,255,0.65)"
              keyboardType="number-pad"
              maxLength={3}
              selectionColor={CYAN}
            />
          </View>
        </Animated.View>

        {/* ── TRAINING LEVEL ── */}
        <Animated.View entering={FadeInDown.delay(350)} style={s.group}>
          <View style={s.groupHeader}>
            <View style={s.groupDot} />
            <Text style={s.groupLabel}>LIVELLO ALLENAMENTO</Text>
          </View>

          {LEVELS.map((lv) => {
            const isActive = level === lv.id;
            return (
              <TouchableOpacity
                key={lv.id}
                testID={`level-${lv.id}-btn`}
                style={[s.levelCard, isActive && s.levelCardActive]}
                onPress={() => setLevel(lv.id)}
                activeOpacity={0.8}
              >
                <View style={s.levelLeft}>
                  <View style={[s.levelIconBox, isActive && s.levelIconBoxActive]}>
                    <Ionicons
                      name={isActive ? 'radio-button-on' : lv.icon}
                      size={16}
                      color={isActive ? CYAN : 'rgba(255,255,255,0.3)'}
                    />
                  </View>
                  <View style={s.levelTextGroup}>
                    <Text style={[s.levelLabel, isActive && s.levelLabelActive]}>
                      {lv.label}
                    </Text>
                    <Text style={[s.levelDesc, isActive && s.levelDescActive]}>
                      {lv.desc}
                    </Text>
                  </View>
                </View>
                {isActive && <View style={s.levelGlow} />}
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* ── Error ── */}
        {!!error && (
          <Animated.View entering={FadeInDown} style={s.errorBox}>
            <Ionicons name="alert-circle" size={14} color="#FF3B30" />
            <Text style={s.errorText}>{error}</Text>
          </Animated.View>
        )}

        {/* ── CTA ── */}
        <Animated.View entering={FadeInDown.delay(500)}>
          {/* Ghost Mode toggle */}
          <View style={s.ghostWrap}>
            <View style={s.ghostLeft}>
              <Ionicons name="eye-off-outline" size={16} color="#888" />
              <View style={s.ghostText}>
                <Text style={s.ghostTitle}>MODALITÀ GHOST</Text>
                <Text style={s.ghostDesc}>Appari nei ranking come KORE #XXXXX</Text>
              </View>
            </View>
            <Switch
              value={ghostMode}
              onValueChange={setGhostMode}
              trackColor={{ false: '#1A1A1A', true: 'rgba(0,242,255,0.3)' }}
              thumbColor={ghostMode ? '#00F2FF' : '#555'}
              ios_backgroundColor="#1A1A1A"
            />
          </View>

          <TouchableOpacity
            testID="step3-continue-btn"
            style={s.cta}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={18} color={BG} />
            <Text style={s.ctaTxt}>CONTINUA — CREA KORE ID</Text>
          </TouchableOpacity>
          <Text style={s.ctaNote}>
            PROSSIMO: FORGIA IL TUO KORE ID
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 24 },

  // Header
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  brand: { color: GOLD, fontSize: 11, fontWeight: '900', letterSpacing: 6 },
  stepPill: { backgroundColor: 'rgba(0,242,255,0.65)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(0,242,255,0.2)' },
  stepTxt: { color: CYAN, fontSize: 10, fontWeight: '900', letterSpacing: 2 },

  // Progress
  progBar: { height: 2, backgroundColor: '#111', borderRadius: 2, marginBottom: 32, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: CYAN, borderRadius: 2 },

  // Title — GOLD OUTER-GLOW
  titleWrap: { marginBottom: 32, gap: 0 },
  titleLine1: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 8,
    // Gold outer-glow
    textShadowColor: 'rgba(212,175,55,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  titleLine2: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 0.5,
    lineHeight: 52,
    // Subtle gold shadow for depth
    textShadowColor: 'rgba(212,175,55,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginTop: 2,
  },
  accentLine: {
    height: 2,
    width: 52,
    backgroundColor: GOLD,
    marginTop: 14,
    marginBottom: 16,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    lineHeight: 18,
  },

  // Group
  group: { marginBottom: 28, gap: 14 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: CYAN },
  groupLabel: { color: CYAN, fontSize: 10, fontWeight: '900', letterSpacing: 4 },

  // Fields
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1, gap: 7 },
  fieldLabel: {
    color: '#E0E0E0',            // off-white — highly readable on dark bg
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 3,
  },

  // Input — Cyan neon container
  input: {
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 16,
    color: CYAN,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
  inputFocused: {
    borderColor: CYAN,
    backgroundColor: 'rgba(0,242,255,0.65)',
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // Level cards
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 16,
  },
  levelCardActive: {
    borderColor: CYAN,
    backgroundColor: 'rgba(0,242,255,0.65)',
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  levelLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  levelIconBox: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  levelIconBoxActive: {
    backgroundColor: 'rgba(0,242,255,0.65)',
    borderColor: 'rgba(0,242,255,0.65)',
  },
  levelTextGroup: { gap: 3 },
  levelLabel: {
    color: 'rgba(255,255,255,0.45)',  // off-white (inactive)
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  levelLabelActive: { color: CYAN },
  levelDesc: {
    color: '#888888',               // visible gray — not invisible anymore
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  levelDescActive: { color: 'rgba(0,242,255,0.6)' },
  levelGlow: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: CYAN,
    shadowColor: CYAN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4,
  },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,59,48,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)',
    borderRadius: 8, padding: 12, marginBottom: 16,
  },
  errorText: { color: '#FF3B30', fontSize: 11, fontWeight: '800', letterSpacing: 1, flex: 1 },

  // Ghost mode styles
  ghostWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 12 },
  ghostLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  ghostText: { flex: 1, gap: 2 },
  ghostTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  ghostDesc: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  cta: {
    backgroundColor: CYAN,
    borderRadius: 10,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaTxt: { color: BG, fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  ctaNote: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 10,
  },
});
