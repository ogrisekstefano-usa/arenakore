/**
 * ARENAKORE — MANUAL ONBOARDING (REGISTRAZIONE VELOCE)
 * Inserimento manuale: Altezza, Peso, Livello Competenza.
 * Genera KORE ID non verificato (biometric_verified: false).
 * L'utente potrà fare la scansione biometrica in seguito dal NÈXUS.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CYAN = '#00E5FF';
const GOLD = '#FFD700';
const BG   = '#0A0A0A';
const FONT_M = Platform.select({ ios: 'Montserrat', android: 'Montserrat', default: 'Montserrat' });

const LEVELS = [
  { key: 'ROOKIE',   label: 'ROOKIE',    desc: 'PRINCIPIANTE' },
  { key: 'AMATEUR',  label: 'AMATEUR',   desc: 'INTERMEDIO' },
  { key: 'SEMI_PRO', label: 'SEMI-PRO',  desc: 'AVANZATO' },
  { key: 'PRO',      label: 'PRO',       desc: 'PROFESSIONISTA' },
  { key: 'ELITE',    label: 'ELITE',     desc: 'LIVELLO ÉLITE' },
];

export default function ManualOnboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [height, setHeight]         = useState('');
  const [weight, setWeight]         = useState('');
  const [level, setLevel]           = useState('AMATEUR');
  const [error,  setError]          = useState('');

  const handleContinue = useCallback(async () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);

    if (!height || !weight) { setError('COMPILA ALTEZZA E PESO'); return; }
    if (h < 100 || h > 250) { setError('ALTEZZA NON VALIDA (100-250 CM)'); return; }
    if (w < 30  || w > 300) { setError('PESO NON VALIDO (30-300 KG)');    return; }

    // Save manual result → NOT biometric verified
    const manualResult = {
      kore_score:         50,
      stability:          50,
      amplitude:          50,
      city:               'N/A',
      scan_date:          new Date().toISOString(),
      manual:             true,
      biometric_verified: false,
      height_cm:          h,
      weight_kg:          w,
      training_level:     level,
    };
    await AsyncStorage.setItem('@kore_scan_result', JSON.stringify(manualResult));

    setError('');
    router.push({
      pathname: '/onboarding/step3',
      params: { height_cm: h, weight_kg: w, training_level: level, biometric_verified: 'false' }
    });
  }, [height, weight, level, router]);

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── TOP BAR ── */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={18} color={CYAN} />
          </TouchableOpacity>
          <View style={s.brandRow}>
            <Text style={s.brandW}>ARENA</Text>
            <Text style={s.brandC}>KORE</Text>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.replace('/')} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* ── HEADER ── */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={s.header}>
          <Text style={s.title}>REGISTRAZIONE</Text>
          <Text style={s.titleBig}>VELOCE</Text>
          <View style={s.accentLine} />
        </Animated.View>

        {/* ── NOT VERIFIED BANNER ── */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={s.warnBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#FF9500" />
          <Text style={s.warnTxt}>
            KORE ID NON VERIFICATO — POTRAI ATTIVARE LA SCANSIONE BIOMETRICA DAL NÈXUS IN QUALSIASI MOMENTO
          </Text>
        </Animated.View>

        {/* ── FORM ── */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={s.form}>
          {/* Height */}
          <View style={s.field}>
            <Text style={s.label}>ALTEZZA (CM)</Text>
            <TextInput
              style={s.input} value={height} onChangeText={setHeight}
              placeholder="180" placeholderTextColor="rgba(0,229,255,0.15)"
              keyboardType="decimal-pad" maxLength={5} selectionColor={CYAN}
            />
          </View>

          {/* Weight */}
          <View style={s.field}>
            <Text style={s.label}>PESO (KG)</Text>
            <TextInput
              style={s.input} value={weight} onChangeText={setWeight}
              placeholder="75" placeholderTextColor="rgba(0,229,255,0.15)"
              keyboardType="decimal-pad" maxLength={5} selectionColor={CYAN}
            />
          </View>

          {/* Competency Level */}
          <View style={s.field}>
            <Text style={s.label}>LIVELLO COMPETENZA</Text>
            <View style={s.levelGrid}>
              {LEVELS.map((l) => {
                const active = level === l.key;
                return (
                  <TouchableOpacity
                    key={l.key}
                    style={[s.levelBtn, active && s.levelBtnActive]}
                    onPress={() => setLevel(l.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.levelLabel, active && s.levelLabelActive]}>{l.label}</Text>
                    <Text style={[s.levelDesc, active && s.levelDescActive]}>{l.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Error */}
          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={14} color="#FF3B30" />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          )}

          {/* CTA */}
          <TouchableOpacity style={s.cta} onPress={handleContinue} activeOpacity={0.85}>
            <Ionicons name="person-add-outline" size={18} color="#000" />
            <Text style={s.ctaTxt}>CONTINUA</Text>
          </TouchableOpacity>

          <Text style={s.note}>
            KORE SCORE BASE: 50/100{'\n'}
            LA SCANSIONE BIOMETRICA SBLOCCHERÀ IL PUNTEGGIO REALE
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 24 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandW: { fontSize: 12, fontWeight: '900', color: '#FFF', letterSpacing: 3, fontFamily: FONT_M },
  brandC: { fontSize: 12, fontWeight: '900', color: CYAN, letterSpacing: 3, fontFamily: FONT_M },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Header
  header: { marginBottom: 16, gap: 2 },
  title:  { color: CYAN, fontSize: 13, fontWeight: '600', letterSpacing: 5, fontFamily: FONT_M },
  titleBig: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_M },
  accentLine: { height: 2, width: 40, backgroundColor: CYAN, marginTop: 8, marginBottom: 4 },

  // Warning banner
  warnBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,150,0,0.04)',
    borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,150,0,0.15)',
    marginBottom: 20,
  },
  warnTxt: {
    flex: 1, color: 'rgba(255,150,0,0.6)', fontSize: 9,
    fontWeight: '700', letterSpacing: 1, lineHeight: 14, fontFamily: FONT_M,
  },

  // Form
  form:  { gap: 16 },
  field: { gap: 8 },
  label: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '900', letterSpacing: 3, fontFamily: FONT_M },
  input: {
    backgroundColor: 'rgba(0,229,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, padding: 14,
    color: CYAN, fontSize: 22, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_M,
  },

  // Level selector
  levelGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  levelBtn: {
    flexBasis: '30%', flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 10,
    alignItems: 'center', gap: 2,
  },
  levelBtnActive: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderColor: CYAN,
  },
  levelLabel: {
    fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.5, fontFamily: FONT_M,
  },
  levelLabelActive: { color: CYAN },
  levelDesc: {
    fontSize: 8, fontWeight: '600', color: 'rgba(255,255,255,0.15)',
    letterSpacing: 1, fontFamily: FONT_M,
  },
  levelDescActive: { color: 'rgba(0,229,255,0.5)' },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,59,48,0.06)',
    borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)',
  },
  errorTxt: { color: '#FF3B30', fontSize: 12, fontWeight: '800', letterSpacing: 1, fontFamily: FONT_M },

  // CTA
  cta: {
    backgroundColor: CYAN, borderRadius: 10, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  ctaTxt: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_M },

  note: {
    color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '500',
    textAlign: 'center', lineHeight: 15, letterSpacing: 1, fontFamily: FONT_M,
  },
});
