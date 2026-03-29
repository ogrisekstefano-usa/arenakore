/**
 * ARENAKORE — MANUAL ONBOARDING
 * Fallback biometrico: se MediaPipe crasha (OOM) l'atleta inserisce i dati a mano.
 * Genera un Passport con DNA values di default.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CYAN = '#00F2FF';
const GOLD = '#D4AF37';
const BG   = '#050505';

export default function ManualOnboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age,    setAge]    = useState('');
  const [error,  setError]  = useState('');

  const handleContinue = useCallback(async () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    const a = parseInt(age);

    if (!height || !weight || !age) { setError('COMPILA TUTTI I CAMPI'); return; }
    if (h < 100 || h > 250) { setError('ALTEZZA NON VALIDA'); return; }
    if (w < 30  || w > 300) { setError('PESO NON VALIDO');    return; }
    if (a < 12  || a > 100) { setError('ETÀ NON VALIDA');     return; }

    // Save a manual scan result with neutral DNA (50% each stat)
    const manualResult = {
      kore_score: 50,
      stability:  50,
      amplitude:  50,
      city:       'CHICAGO',
      scan_date:  new Date().toISOString(),
      manual:     true,
    };
    await AsyncStorage.setItem('@kore_scan_result', JSON.stringify(manualResult));

    setError('');
    router.push({
      pathname: '/onboarding/step3',
      params: { height_cm: h, weight_kg: w, age: a, training_level: 'LEGACY' },
    });
  }, [height, weight, age, router]);

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity style={s.back} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={16} color={CYAN} />
          <Text style={s.backTxt}>INDIETRO</Text>
        </TouchableOpacity>

        {/* Alert banner */}
        <Animated.View entering={FadeInDown.delay(100)} style={s.alertBanner}>
          <Ionicons name="warning-outline" size={18} color={GOLD} />
          <View style={s.alertBody}>
            <Text style={s.alertTitle}>SCANNER NON DISPONIBILE</Text>
            <Text style={s.alertDesc}>
              Il motore biometrico richiede più risorse di quelle disponibili su questo dispositivo.
              Inserisci i tuoi dati manualmente per generare il KORE Passport.
            </Text>
          </View>
        </Animated.View>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(200)} style={s.header}>
          <Text style={s.title}>MANUAL</Text>
          <Text style={s.titleBig}>ONBOARDING</Text>
          <View style={s.accentLine} />
          <Text style={s.subtitle}>
            I TUOI DATI FISICI GENERANO UN PROFILO DNA DI BASE.
          </Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.delay(350)} style={s.form}>
          <View style={s.field}>
            <Text style={s.label}>ALTEZZA (CM)</Text>
            <TextInput
              style={s.input} value={height} onChangeText={setHeight}
              placeholder="180" placeholderTextColor="rgba(0,242,255,0.2)"
              keyboardType="decimal-pad" maxLength={5} selectionColor={CYAN}
            />
          </View>
          <View style={s.field}>
            <Text style={s.label}>PESO (KG)</Text>
            <TextInput
              style={s.input} value={weight} onChangeText={setWeight}
              placeholder="75" placeholderTextColor="rgba(0,242,255,0.2)"
              keyboardType="decimal-pad" maxLength={5} selectionColor={CYAN}
            />
          </View>
          <View style={s.field}>
            <Text style={s.label}>ETÀ</Text>
            <TextInput
              style={s.input} value={age} onChangeText={setAge}
              placeholder="25" placeholderTextColor="rgba(0,242,255,0.2)"
              keyboardType="number-pad" maxLength={3} selectionColor={CYAN}
            />
          </View>

          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={14} color="#FF3B30" />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          )}

          <TouchableOpacity style={s.cta} onPress={handleContinue} activeOpacity={0.85}>
            <Ionicons name="person-add-outline" size={18} color={BG} />
            <Text style={s.ctaTxt}>GENERA KORE PASSPORT</Text>
          </TouchableOpacity>

          <Text style={s.note}>
            KORE SCORE: 50/100 DI DEFAULT{'\n'}
            POTRAI FARE UNO SCAN COMPLETO DOPO LA REGISTRAZIONE
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 24 },
  back:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backTxt: { color: CYAN, fontSize: 13, fontWeight: '400', letterSpacing: 2 },

  alertBanner: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: 'rgba(212,175,55,0.06)',
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
    marginBottom: 28,
  },
  alertBody: { flex: 1, gap: 4 },
  alertTitle: { color: GOLD, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  alertDesc:  { color: '#E0E0E0', fontSize: 13, fontWeight: '400', lineHeight: 18 },

  header: { marginBottom: 28, gap: 4 },
  title:  { color: CYAN, fontSize: 14, fontWeight: '400', letterSpacing: 6 },
  titleBig: { color: '#FFFFFF', fontSize: 38, fontWeight: '400', letterSpacing: 0.5, lineHeight: 42 },
  accentLine: { height: 2, width: 48, backgroundColor: CYAN, marginTop: 12, marginBottom: 14, shadowColor: CYAN, shadowOffset: {width:0,height:0}, shadowOpacity:0.8, shadowRadius:6 },
  subtitle: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, lineHeight: 18 },

  form:  { gap: 16 },
  field: { gap: 8 },
  label: { color: '#E0E0E0', fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  input: { backgroundColor: 'rgba(0,242,255,0.025)', borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.65)', borderRadius: 10, padding: 16, color: CYAN, fontSize: 22, fontWeight: '900', letterSpacing: 1 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,59,48,0.06)', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)' },
  errorTxt: { color: '#FF3B30', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  cta: { backgroundColor: GOLD, borderRadius: 10, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: GOLD, shadowOffset: {width:0,height:0}, shadowOpacity:0.5, shadowRadius:12, elevation: 8 },
  ctaTxt: { color: BG, fontSize: 14, fontWeight: '900', letterSpacing: 2 },

  note: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '400', textAlign: 'center', lineHeight: 16 },
});
