/**
 * ARENAKORE — KORE HUB REGISTRATION
 * Brutalist form for coaches & gyms to join the KORE HUB NETWORK
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { api } from '../../utils/api';

const CYAN = '#00F2FF';
const GOLD = '#D4AF37';
const BG   = '#050505';

const CITIES = [
  'CHICAGO', 'MILANO', 'ROMA', 'TORINO', 'NAPOLI',
  'FIRENZE', 'LONDON', 'PARIS', 'BARCELONA', 'BERLIN',
  'NEW YORK', 'TOKYO', 'DUBAI', 'ALTRA CITTÀ',
];

export default function KoreHubRegistration() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [gymName,  setGymName]  = useState('');
  const [locality, setLocality] = useState('');
  const [email,    setEmail]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!gymName.trim() || !locality || !email.trim()) {
      setError('COMPLETA TUTTI I CAMPI');
      return;
    }
    if (!email.includes('@')) {
      setError('EMAIL NON VALIDA');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.submitHubRequest({ gym_name: gymName.trim(), locality, email: email.trim().toLowerCase() });
      setSuccess(true);
      // Auto-redirect home after 3 seconds with implicit "Richiesta ricevuta, Coach!" message
      setTimeout(() => {
        router.replace('/');
      }, 3000);
    } catch (_e) {
      setError('ERRORE DI CONNESSIONE — RIPROVA');
    } finally {
      setLoading(false);
    }
  }, [gymName, locality, email]);

  if (success) {
    return (
      <View style={[s.root, s.successWrap]}>
        <StatusBar barStyle="light-content" />
        <Animated.View entering={FadeIn} style={s.successCard}>
          <View style={s.successIcon}>
            <Ionicons name="checkmark-circle" size={56} color={CYAN} />
          </View>
          <Text style={s.successTitle}>RICHIESTA RICEVUTA,{'\n'}COACH!</Text>
          <Text style={s.successSub}>
            IL TUO HUB SARÀ CERTIFICATO{'\n'}ENTRO 24 ORE.
          </Text>
          <View style={s.successDivider} />
          <Text style={s.successNote}>
            Riceverai una email di conferma con le credenziali KORE HUB Dashboard.{'\n'}
            Reindirizzamento automatico...
          </Text>
          <TouchableOpacity
            style={s.doneBtn}
            onPress={() => router.replace('/')}
            activeOpacity={0.85}
          >
            <Text style={s.doneBtnTxt}>TORNA ALLA HOME</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle="light-content" />

        {/* Back */}
        <TouchableOpacity style={s.back} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={16} color={CYAN} />
          <Text style={s.backTxt}>INDIETRO</Text>
        </TouchableOpacity>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={s.header}>
          <View style={s.iconBox}>
            <Ionicons name="business" size={28} color={CYAN} />
          </View>
          <Text style={s.title}>KORE HUB</Text>
          <Text style={s.titleBig}>NETWORK</Text>
          <View style={s.accentLine} />
          <Text style={s.subtitle}>
            Certifica i tuoi atleti. Domina i ranking di squadra.{' '}\nUnisciti al protocollo Nexus per palestre di élite.
          </Text>
        </Animated.View>

        {/* Pillars */}
        <Animated.View entering={FadeInDown.delay(200)} style={s.pillarsRow}>
          {[
            { icon: 'scan', txt: 'BIO-SCAN CERTIFICATO' },
            { icon: 'analytics', txt: 'DNA ANALYTICS' },
            { icon: 'trophy', txt: 'CITY DOMINANCE' },
          ].map((p, i) => (
            <View key={i} style={s.pillar}>
              <Ionicons name={p.icon as any} size={18} color={CYAN} />
              <Text style={s.pillarTxt}>{p.txt}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.delay(300)} style={s.form}>
          <Text style={s.sectionLabel}>DATI PALESTRA</Text>

          {/* Nome Palestra */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>NOME PALESTRA</Text>
            <TextInput
              style={s.input}
              value={gymName}
              onChangeText={setGymName}
              placeholder="KORE GYM CHICAGO"
              placeholderTextColor="rgba(0,242,255,0.18)"
              autoCapitalize="characters"
              selectionColor={CYAN}
            />
          </View>

          {/* Locality picker */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>CITTÀ / LOCALITÀ</Text>
            <TouchableOpacity
              style={[s.input, s.picker, locality && s.pickerSelected]}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={locality ? s.pickerValTxt : s.pickerPlaceholder}>
                {locality || 'SELEZIONA CITTÀ'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={CYAN} />
            </TouchableOpacity>
          </View>

          {/* Email */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>EMAIL DI CONTATTO</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="coach@palestra.com"
              placeholderTextColor="rgba(0,242,255,0.18)"
              keyboardType="email-address"
              autoCapitalize="none"
              selectionColor={CYAN}
            />
          </View>

          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={14} color="#FF3B30" />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.submitBtn, loading && s.submitBtnLoading]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Ionicons name={loading ? 'hourglass' : 'business-outline'} size={18} color={BG} />
            <Text style={s.submitTxt}>
              {loading ? 'INVIO IN CORSO...' : 'DIVENTA KORE HUB'}
            </Text>
          </TouchableOpacity>

          <Text style={s.disclaimerTxt}>
            Risponderemo entro 24h con le credenziali di accesso al KORE HUB DASHBOARD.
          </Text>
        </Animated.View>
      </ScrollView>

      {/* City picker modal */}
      <Modal transparent visible={showPicker} animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>SELEZIONA CITTÀ</Text>
            <View style={s.modalDivider} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {CITIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[s.cityOption, c === locality && s.cityOptionActive]}
                  onPress={() => { setLocality(c); setShowPicker(false); }}
                >
                  <Ionicons name="location-outline" size={12} color={c === locality ? CYAN : 'rgba(255,255,255,0.3)'} />
                  <Text style={[s.cityTxt, c === locality && s.cityTxtActive]}>{c}</Text>
                  {c === locality && <Ionicons name="checkmark" size={12} color={CYAN} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 24 },

  // Back
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backTxt: { color: CYAN, fontSize: 11, fontWeight: '900', letterSpacing: 2 },

  // Header
  header: { marginBottom: 24, gap: 6 },
  iconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(0,242,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,242,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { color: CYAN, fontSize: 12, fontWeight: '900', letterSpacing: 6 },
  titleBig: { color: '#FFFFFF', fontSize: 44, fontWeight: '900', letterSpacing: -2, lineHeight: 48 },
  accentLine: { height: 2, width: 48, backgroundColor: CYAN, marginTop: 12, marginBottom: 14, shadowColor: CYAN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 6 },
  subtitle: { color: '#E0E0E0', fontSize: 13, fontWeight: '700', lineHeight: 22, letterSpacing: 0.5 },

  // Pillars
  pillarsRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  pillar: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,242,255,0.04)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(0,242,255,0.1)' },
  pillarTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },

  // Form
  form: { gap: 16 },
  sectionLabel: { color: CYAN, fontSize: 10, fontWeight: '900', letterSpacing: 4 },
  field: { gap: 8 },
  fieldLabel: { color: '#E0E0E0', fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  input: { backgroundColor: 'rgba(0,242,255,0.025)', borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.15)', borderRadius: 10, padding: 16, color: CYAN, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerSelected: { borderColor: CYAN },
  pickerValTxt: { color: CYAN, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  pickerPlaceholder: { color: 'rgba(0,242,255,0.18)', fontSize: 16, fontWeight: '800' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,59,48,0.06)', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)' },
  errorTxt: { color: '#FF3B30', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: CYAN, borderRadius: 10, paddingVertical: 18, shadowColor: CYAN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10 },
  submitBtnLoading: { backgroundColor: 'rgba(0,242,255,0.5)' },
  submitTxt: { color: BG, fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  disclaimerTxt: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 16 },

  // Success
  successWrap: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  successCard: { width: '100%', alignItems: 'center', gap: 12, backgroundColor: 'rgba(0,242,255,0.04)', borderRadius: 20, padding: 32, borderWidth: 1, borderColor: 'rgba(0,242,255,0.15)' },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,242,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: CYAN },
  successTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  successSub: { color: GOLD, fontSize: 16, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  successDivider: { height: 1, width: '100%', backgroundColor: 'rgba(255,255,255,0.06)' },
  successNote: { color: '#E0E0E0', fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 20, letterSpacing: 1 },
  doneBtn: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(0,242,255,0.06)', borderWidth: 1.5, borderColor: CYAN, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32 },
  doneBtnTxt: { color: CYAN, fontSize: 12, fontWeight: '900', letterSpacing: 4 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#0A0A0A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '55%', borderWidth: 1, borderColor: 'rgba(0,242,255,0.1)' },
  modalTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 4, marginBottom: 12 },
  modalDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 8 },
  cityOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  cityOptionActive: { backgroundColor: 'rgba(0,242,255,0.06)', borderRadius: 8, paddingHorizontal: 8 },
  cityTxt: { flex: 1, color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  cityTxtActive: { color: CYAN },
});
