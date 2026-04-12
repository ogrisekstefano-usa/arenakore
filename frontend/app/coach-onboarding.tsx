/**
 * COACH ONBOARDING — Build 36 · Candidatura Coach Esclusiva
 * ═══════════════════════════════════════════════════════════
 * ARENAKORE Premium aesthetic. Not a form — an invitation to an elite club.
 * Fields: Bio, Specialties, Certifications, Experience.
 * On submit: POST /api/coach/onboarding → upgrades user to COACH role.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { apiClient } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const GOLD = '#FFD700';
const CYAN = '#00E5FF';
const BG = '#000000';

const SPECIALTY_OPTIONS = [
  'Functional Training', 'HIIT', 'Crossfit', 'Weightlifting',
  'Basket Performance', 'Running Coach', 'Boxing', 'MMA',
  'Calisthenics', 'Yoga & Mobilità', 'Nuoto', 'Golf',
  'Preparazione Atletica', 'Riabilitazione Sportiva', 'Nutrizione Sportiva',
];

const TIER_OPTIONS = [
  { key: 'free', label: 'FREE', desc: 'Accesso base, template limitati', icon: 'leaf' },
  { key: 'standard', label: 'STANDARD', desc: 'Template illimitati, KPI base', icon: 'flash' },
  { key: 'premium', label: 'PREMIUM', desc: 'Video tutorial, KPI avanzati, Badge Verified', icon: 'star' },
  { key: 'elite', label: 'ELITE', desc: 'Accesso completo, AI Coach, Priority Support', icon: 'diamond' },
];

export default function CoachOnboardingScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [bio, setBio] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [certifications, setCertifications] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [selectedTier, setSelectedTier] = useState('standard');
  const [instagram, setInstagram] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleSpecialty = (s: string) => {
    setSelectedSpecialties(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : prev.length < 5 ? [...prev, s] : prev
    );
  };

  const handleSubmit = async () => {
    if (!bio || bio.length < 10) {
      Alert.alert('Bio richiesta', 'Inserisci almeno 10 caratteri per la tua bio professionale.');
      return;
    }
    if (selectedSpecialties.length === 0) {
      Alert.alert('Specialità richieste', 'Seleziona almeno una specialità.');
      return;
    }

    setLoading(true);
    try {
      const certList = certifications
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      const result = await apiClient('/coach/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          professional_bio: bio.trim(),
          specialties: selectedSpecialties,
          certifications: certList,
          years_experience: parseInt(yearsExp) || 0,
          coaching_tier: selectedTier,
          instagram_handle: instagram.trim() || null,
          website_url: website.trim() || null,
        }),
      });

      if (result?.status === 'onboarding_completed') {
        await refreshUser?.();
        Alert.alert(
          '🏆 BENVENUTO COACH',
          'Il tuo profilo professionale è stato creato. Ora puoi creare template e guidare atleti.',
          [{ text: 'ENTRA', onPress: () => router.replace('/(tabs)/nexus-trigger') }]
        );
      }
    } catch (err: any) {
      Alert.alert('Errore', err?.message || 'Errore durante l\'onboarding. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* HEADER */}
          <Animated.View entering={FadeInDown.duration(400)}>
            <LinearGradient colors={['rgba(255,215,0,0.08)', 'transparent']} style={s.headerGrad}>
              <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                <Ionicons name="chevron-back" size={22} color={GOLD} />
              </TouchableOpacity>
              <View style={s.headerCenter}>
                <Ionicons name="shield-checkmark" size={32} color={GOLD} />
                <Text style={s.headerTitle}>COACH CANDIDATURA</Text>
                <Text style={s.headerSub}>ARENA<Text style={{ color: CYAN }}>KORE</Text> · PROGRAMMA ÉLITE</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* INTRO */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={s.introCard}>
            <Text style={s.introText}>
              Stai per entrare nel programma Coach di ARENAKORE.{'\n'}
              I tuoi template saranno disponibili per migliaia di atleti.{'\n'}
              Compila ogni campo con cura — questo è il tuo biglietto da visita.
            </Text>
          </Animated.View>

          {/* BIO PROFESSIONALE */}
          <Animated.View entering={FadeInDown.delay(150).duration(300)}>
            <SectionLabel icon="document-text" title="BIO PROFESSIONALE" required />
            <TextInput
              style={s.textArea}
              placeholder="Descrivi la tua esperienza, il tuo approccio all'allenamento e le tue competenze..."
              placeholderTextColor="rgba(255,255,255,0.15)"
              multiline
              numberOfLines={5}
              maxLength={500}
              value={bio}
              onChangeText={setBio}
              textAlignVertical="top"
            />
            <Text style={s.charCount}>{bio.length}/500</Text>
          </Animated.View>

          {/* SPECIALITÀ */}
          <Animated.View entering={FadeInDown.delay(200).duration(300)}>
            <SectionLabel icon="medal" title="SPECIALITÀ" required />
            <Text style={s.helperText}>Seleziona fino a 5 specialità</Text>
            <View style={s.chipsWrap}>
              {SPECIALTY_OPTIONS.map(sp => {
                const active = selectedSpecialties.includes(sp);
                return (
                  <TouchableOpacity
                    key={sp}
                    style={[s.chip, active && s.chipActive]}
                    onPress={() => toggleSpecialty(sp)}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>{sp}</Text>
                    {active && <Ionicons name="checkmark-circle" size={14} color="#000" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {/* CERTIFICAZIONI */}
          <Animated.View entering={FadeInDown.delay(250).duration(300)}>
            <SectionLabel icon="ribbon" title="CERTIFICAZIONI" />
            <Text style={s.helperText}>Inserisci le tue certificazioni, separate da virgola</Text>
            <TextInput
              style={s.input}
              placeholder="es. CONI Livello 2, CrossFit L1, NASM CPT"
              placeholderTextColor="rgba(255,255,255,0.15)"
              value={certifications}
              onChangeText={setCertifications}
            />
          </Animated.View>

          {/* ANNI DI ESPERIENZA */}
          <Animated.View entering={FadeInDown.delay(300).duration(300)}>
            <SectionLabel icon="time" title="ANNI DI ESPERIENZA" />
            <TextInput
              style={[s.input, { width: 120 }]}
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.15)"
              value={yearsExp}
              onChangeText={setYearsExp}
              keyboardType="numeric"
              maxLength={2}
            />
          </Animated.View>

          {/* COACHING TIER */}
          <Animated.View entering={FadeInDown.delay(350).duration(300)}>
            <SectionLabel icon="layers" title="COACHING TIER" />
            <View style={s.tiersWrap}>
              {TIER_OPTIONS.map(t => {
                const active = selectedTier === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[s.tierCard, active && s.tierCardActive]}
                    onPress={() => setSelectedTier(t.key)}
                    activeOpacity={0.8}
                  >
                    <View style={s.tierHeader}>
                      <Ionicons name={t.icon as any} size={16} color={active ? '#000' : GOLD} />
                      <Text style={[s.tierLabel, active && { color: '#000' }]}>{t.label}</Text>
                    </View>
                    <Text style={[s.tierDesc, active && { color: 'rgba(0,0,0,0.6)' }]}>{t.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {/* SOCIAL */}
          <Animated.View entering={FadeInDown.delay(400).duration(300)}>
            <SectionLabel icon="logo-instagram" title="SOCIAL (Opzionale)" />
            <TextInput
              style={s.input}
              placeholder="@tuo_handle_instagram"
              placeholderTextColor="rgba(255,255,255,0.15)"
              value={instagram}
              onChangeText={setInstagram}
            />
            <TextInput
              style={[s.input, { marginTop: 10 }]}
              placeholder="https://tuosito.com"
              placeholderTextColor="rgba(255,255,255,0.15)"
              value={website}
              onChangeText={setWebsite}
              autoCapitalize="none"
            />
          </Animated.View>

          {/* SUBMIT */}
          <Animated.View entering={FadeInDown.delay(450).duration(300)} style={s.submitSection}>
            <TouchableOpacity
              style={[s.submitBtn, loading && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={18} color="#000" />
                  <Text style={s.submitText}>INVIA CANDIDATURA</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={s.disclaimer}>
              Inviando la candidatura, accetti di sottoporre il tuo profilo alla revisione del team ARENAKORE.
              I Coach verificati riceveranno il badge ✓ VERIFIED.
            </Text>
          </Animated.View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionLabel({ icon, title, required }: { icon: string; title: string; required?: boolean }) {
  return (
    <View style={s.sectionLabelRow}>
      <Ionicons name={icon as any} size={14} color={GOLD} />
      <Text style={s.sectionLabelText}>{title}</Text>
      {required && <Text style={s.required}>*</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  headerGrad: { paddingVertical: 24, paddingHorizontal: 0, borderRadius: 0, marginHorizontal: -24 },
  backBtn: { position: 'absolute', left: 16, top: 16, zIndex: 10, padding: 8 },
  headerCenter: { alignItems: 'center', gap: 8 },
  headerTitle: { color: GOLD, fontSize: 22, fontWeight: '900', letterSpacing: 4 },
  headerSub: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  introCard: { backgroundColor: 'rgba(255,215,0,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)', padding: 16, marginTop: 20, marginBottom: 24 },
  introText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500', lineHeight: 20 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 10 },
  sectionLabelText: { color: GOLD, fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  required: { color: '#FF3B30', fontSize: 14, fontWeight: '900' },
  helperText: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '600', marginBottom: 10 },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', padding: 16, color: '#FFFFFF',
    fontSize: 14, fontWeight: '500', minHeight: 120, textAlignVertical: 'top',
  },
  charCount: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '600', textAlign: 'right', marginTop: 4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', padding: 14, color: '#FFFFFF',
    fontSize: 14, fontWeight: '500',
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)',
  },
  chipActive: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#000' },
  tiersWrap: { gap: 10 },
  tierCard: {
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)',
    backgroundColor: 'rgba(255,215,0,0.03)', padding: 16, gap: 6,
  },
  tierCardActive: { backgroundColor: GOLD, borderColor: GOLD },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierLabel: { color: GOLD, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  tierDesc: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '500' },
  submitSection: { marginTop: 32, gap: 14, alignItems: 'center' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32,
    width: '100%',
  },
  submitText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  disclaimer: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '500', textAlign: 'center', lineHeight: 16, paddingHorizontal: 16 },
});
