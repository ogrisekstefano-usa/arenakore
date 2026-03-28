/**
 * ARENAKORE LEGACY INITIATION — STEP 3
 * KORE DNA PROFILING: Altezza, Peso, Età, Livello Allenamento
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

const LEVELS = [
  { id: 'LEGACY', label: 'LEGACY', desc: 'INIZIANTE — Il tuo viaggio comincia ora' },
  { id: 'ELITE',  label: 'ELITE',  desc: 'INTERMEDIO — Spingi oltre i limiti' },
  { id: 'KORE',   label: 'KORE',   desc: 'AVANZATO — Sei già oltre il confine' },
];

export default function LegacyStep3() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [height, setHeight]   = useState('');
  const [weight, setWeight]   = useState('');
  const [age, setAge]         = useState('');
  const [level, setLevel]     = useState<string | null>(null);
  const [error, setError]     = useState('');

  const handleContinue = () => {
    if (!height || !weight || !age || !level) {
      setError('COMPLETA TUTTI I CAMPI PER GENERARE IL TUO PROFILO DNA');
      return;
    }
    const h = parseFloat(height);
    const w = parseFloat(weight);
    const a = parseInt(age);
    if (h < 100 || h > 250) { setError('ALTEZZA NON VALIDA (100–250 CM)'); return; }
    if (w < 30 || w > 300)  { setError('PESO NON VALIDO (30–300 KG)'); return; }
    if (a < 12 || a > 100)  { setError('ETÀ NON VALIDA (12–100)'); return; }
    setError('');
    router.push({
      pathname: '/onboarding/step4',
      params: { height_cm: h, weight_kg: w, age: a, training_level: level },
    });
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle="light-content" />

        {/* Top bar */}
        <View style={s.topBar}>
          <Text style={s.brand}>ARENAKORE</Text>
          <View style={s.stepPill}>
            <Text style={s.stepTxt}>03 / 04</Text>
          </View>
        </View>

        <View style={s.progBar}>
          <View style={[s.progFill, { width: '75%' }]} />
        </View>

        <Animated.View entering={FadeInDown.delay(100)} style={s.titleWrap}>
          <Text style={s.title}>KORE DNA</Text>
          <Text style={s.titleBig}>PROFILING</Text>
          <View style={s.cyanLine} />
        </Animated.View>

        {/* Biometric inputs */}
        <Animated.View entering={FadeInDown.delay(200)} style={s.fieldsGroup}>
          <Text style={s.groupLabel}>PARAMETRI BIOMETRICI</Text>

          <View style={s.fieldRow}>
            <View style={s.fieldHalf}>
              <Text style={s.fieldLabel}>ALTEZZA (CM)</Text>
              <TextInput
                testID="height-input"
                style={s.input}
                value={height}
                onChangeText={setHeight}
                placeholder="180"
                placeholderTextColor="#1A1A1A"
                keyboardType="decimal-pad"
                maxLength={5}
              />
            </View>
            <View style={s.fieldHalf}>
              <Text style={s.fieldLabel}>PESO (KG)</Text>
              <TextInput
                testID="weight-input"
                style={s.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="75"
                placeholderTextColor="#1A1A1A"
                keyboardType="decimal-pad"
                maxLength={5}
              />
            </View>
          </View>

          <View style={s.fieldSingle}>
            <Text style={s.fieldLabel}>ETÀ</Text>
            <TextInput
              testID="age-input"
              style={s.input}
              value={age}
              onChangeText={setAge}
              placeholder="25"
              placeholderTextColor="#1A1A1A"
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        </Animated.View>

        {/* Training Level selector */}
        <Animated.View entering={FadeInDown.delay(350)} style={s.fieldsGroup}>
          <Text style={s.groupLabel}>LIVELLO ALLENAMENTO</Text>
          {LEVELS.map((lv, i) => (
            <TouchableOpacity
              key={lv.id}
              testID={`level-${lv.id}-btn`}
              style={[
                s.levelCard,
                level === lv.id && s.levelCardActive,
              ]}
              onPress={() => setLevel(lv.id)}
              activeOpacity={0.85}
            >
              <View style={s.levelLeft}>
                <Ionicons
                  name={level === lv.id ? 'radio-button-on' : 'radio-button-off'}
                  size={16}
                  color={level === lv.id ? '#00F2FF' : '#333'}
                />
                <View>
                  <Text style={[s.levelLabel, level === lv.id && s.levelLabelActive]}>
                    {lv.label}
                  </Text>
                  <Text style={s.levelDesc}>{lv.desc}</Text>
                </View>
              </View>
              {level === lv.id && (
                <View style={s.levelDot} />
              )}
            </TouchableOpacity>
          ))}
        </Animated.View>

        {!!error && (
          <Text style={s.error}>{error}</Text>
        )}

        <TouchableOpacity
          testID="step3-continue-btn"
          style={s.cta}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-forward" size={16} color="#050505" />
          <Text style={s.ctaTxt}>CONTINUA — CREA KORE ID</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const CYAN = '#00F2FF';
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  content: { paddingHorizontal: 24 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  brand: { color: '#D4AF37', fontSize: 11, fontWeight: '900', letterSpacing: 6 },
  stepPill: {
    backgroundColor: 'rgba(0,242,255,0.08)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.2)',
  },
  stepTxt: { color: CYAN, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  progBar: { height: 2, backgroundColor: '#111', borderRadius: 2, marginBottom: 28, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: CYAN, borderRadius: 2 },
  titleWrap: { marginBottom: 32 },
  title: { color: CYAN, fontSize: 13, fontWeight: '900', letterSpacing: 6 },
  titleBig: { color: '#FFFFFF', fontSize: 44, fontWeight: '900', letterSpacing: -1.5, lineHeight: 48 },
  cyanLine: {
    height: 2, width: 48, backgroundColor: CYAN, marginTop: 16,
    shadowColor: CYAN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
  },
  fieldsGroup: { marginBottom: 28, gap: 14 },
  groupLabel: { color: CYAN, fontSize: 10, fontWeight: '900', letterSpacing: 4 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1, gap: 6 },
  fieldSingle: { gap: 6 },
  fieldLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  input: {
    backgroundColor: '#0D0D0D', borderWidth: 1.5, borderColor: '#1A1A1A',
    borderRadius: 8, padding: 16, color: CYAN,
    fontSize: 22, fontWeight: '900', letterSpacing: 1,
  },
  levelCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0D0D0D', borderWidth: 1.5, borderColor: '#1A1A1A',
    borderRadius: 10, padding: 16,
  },
  levelCardActive: {
    borderColor: CYAN,
    backgroundColor: 'rgba(0,242,255,0.04)',
  },
  levelLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  levelLabel: { color: '#333', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  levelLabelActive: { color: CYAN },
  levelDesc: { color: '#222', fontSize: 9, fontWeight: '700', marginTop: 2, letterSpacing: 1 },
  levelDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: CYAN,
    shadowColor: CYAN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4,
  },
  error: { color: '#FF3B30', fontSize: 12, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginBottom: 16 },
  cta: {
    backgroundColor: CYAN, borderRadius: 8, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  ctaTxt: { color: '#050505', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
});
