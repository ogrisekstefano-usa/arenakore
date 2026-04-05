/**
 * ARENAKORE — CHALLENGE CREATOR v1.0
 * 4-Step UGC Challenge Creation Flow:
 *   1. TEMPLATE → AMRAP / EMOM / FOR_TIME / TABATA / CUSTOM
 *   2. DEFINIZIONE → Select exercises & params
 *   3. DESTINAZIONE → Solo / Ranked / Friend / Live
 *   4. CERTIFICAZIONE → NEXUS AI / Self / Peer / Device
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Platform, KeyboardAvoidingView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const FONT_J = Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined });
const FONT_M = Platform.select({ web: 'Montserrat, sans-serif', default: undefined });

// ─── TEMPLATES ───
const TEMPLATES = [
  { key: 'AMRAP', label: 'AMRAP', sub: 'As Many Reps As Possible', icon: 'flame' as const, color: '#FF3B30', desc: 'Massime ripetizioni nel tempo.' },
  { key: 'EMOM', label: 'EMOM', sub: 'Every Minute On the Minute', icon: 'timer' as const, color: '#00E5FF', desc: 'Esegui ogni minuto. Riposo = tempo avanzato.' },
  { key: 'FOR_TIME', label: 'FOR TIME', sub: 'Completa il più veloce possibile', icon: 'speedometer' as const, color: '#FFD700', desc: 'Vince chi finisce prima.' },
  { key: 'TABATA', label: 'TABATA', sub: '20s On / 10s Off', icon: 'pulse' as const, color: '#00FF87', desc: '8 round: 20s lavoro, 10s pausa.' },
  { key: 'CUSTOM', label: 'CUSTOM', sub: 'Crea le tue regole', icon: 'construct' as const, color: '#FF9500', desc: 'Libero. Definisci tutto tu.' },
];

// ─── EXERCISES ───
const EXERCISES = [
  'Push-ups', 'Pull-ups', 'Squats', 'Burpees', 'Box Jumps',
  'Deadlifts', 'Lunges', 'Plank Hold', 'Sit-ups', 'Thrusters',
  'Wall Balls', 'Kettlebell Swings', 'Rowing', 'Running', 'Rope Climbs',
];

// ─── DESTINATIONS ───
const DESTINATIONS = [
  { key: 'solo', label: 'SOLO ALLENAMENTO', icon: 'person' as const, color: '#00E5FF', sub: 'Solo tu. Focus puro.' },
  { key: 'ranked', label: 'CLASSIFICA PERSONALE', icon: 'podium' as const, color: '#FFD700', sub: 'Entra nella classifica globale.' },
  { key: 'friend', label: 'SFIDA AMICO / CREW', icon: 'people' as const, color: '#FF3B30', sub: 'Manda il guanto di sfida.' },
  { key: 'live', label: 'CREA LIVE EVENT', icon: 'radio' as const, color: '#00FF87', sub: 'Trasmetti nell\'Arena.' },
];

// ─── CERTIFICATIONS ───
const CERTIFICATIONS = [
  { key: 'nexus_ai', label: 'NÈXUS AI', icon: 'eye' as const, color: '#00E5FF', sub: 'Camera tracking via NÈXUS Engine.' },
  { key: 'self', label: 'AUTO-CERTIFICAZIONE', icon: 'checkmark-circle' as const, color: '#FFD700', sub: 'Inserisci risultati manualmente.' },
  { key: 'peer', label: 'PEER-TO-PEER', icon: 'people-circle' as const, color: '#FF9500', sub: 'Un altro Kore valida dal vivo.' },
  { key: 'device', label: 'DISPOSITIVI TERZI', icon: 'watch' as const, color: '#00FF87', sub: 'Garmin, Apple Watch, Whoop.' },
];

type Step = 1 | 2 | 3 | 4;

interface Exercise {
  name: string;
  target_reps: number;
  target_seconds: number;
  rest_seconds: number;
}

interface ChallengeCreatorProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (challenge: any) => void;
}

export function ChallengeCreator({ visible, onClose, onCreated }: ChallengeCreatorProps) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [template, setTemplate] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [destination, setDestination] = useState<string | null>(null);
  const [certification, setCertification] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [timeCap, setTimeCap] = useState('600');
  const [rounds, setRounds] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep(1); setTemplate(null); setExercises([]); setDestination(null);
    setCertification(null); setTitle(''); setTimeCap('600'); setRounds(''); setSubmitting(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const addExercise = (name: string) => {
    if (exercises.length >= 10) return;
    if (exercises.some(e => e.name === name)) {
      setExercises(exercises.filter(e => e.name !== name));
    } else {
      setExercises([...exercises, { name, target_reps: 10, target_seconds: 0, rest_seconds: 10 }]);
    }
    Haptics.selectionAsync().catch(() => {});
  };

  const updateExercise = (idx: number, field: keyof Exercise, val: number) => {
    const updated = [...exercises];
    updated[idx] = { ...updated[idx], [field]: val };
    setExercises(updated);
  };

  const canNext = (): boolean => {
    if (step === 1) return !!template;
    if (step === 2) return exercises.length > 0 && title.trim().length >= 3;
    if (step === 3) return !!destination;
    if (step === 4) return !!certification;
    return false;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/api/ugc/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          template_type: template,
          exercises,
          destination,
          certification,
          time_cap_seconds: parseInt(timeCap) || 600,
          rounds: rounds ? parseInt(rounds) : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated?.(data.challenge);
        handleClose();
      } else {
        Alert.alert('Errore', data.detail || 'Impossibile creare la sfida');
      }
    } catch {
      Alert.alert('Errore', 'Connessione al server fallita');
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabel = ['', 'TEMPLATE', 'DEFINIZIONE', 'DESTINAZIONE', 'CERTIFICAZIONE'][step];

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={[s.backdrop, { paddingTop: insets.top }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={step > 1 ? () => setStep((step - 1) as Step) : handleClose} style={s.backBtn}>
              <Ionicons name={step > 1 ? 'arrow-back' : 'close'} size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>CREA LA TUA SFIDA</Text>
              <Text style={s.headerStep}>STEP {step}/4 — {stepLabel}</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Progress Bar */}
          <View style={s.progressTrack}>
            <LinearGradient
              colors={['#00E5FF', '#FFD700']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.progressFill, { width: `${(step / 4) * 100}%` as any }]}
            />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            {/* ═══ STEP 1: TEMPLATE ═══ */}
            {step === 1 && (
              <Animated.View entering={FadeIn.duration(300)}>
                <Text style={s.sectionTitle}>Scegli il Framework</Text>
                <Text style={s.sectionSub}>La struttura della tua sfida.</Text>
                {TEMPLATES.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[s.optionCard, template === t.key && { borderColor: t.color, backgroundColor: t.color + '08' }]}
                    onPress={() => { setTemplate(t.key); Haptics.selectionAsync().catch(() => {}); }}
                    activeOpacity={0.8}
                  >
                    <View style={[s.optionIcon, { backgroundColor: t.color + '15' }]}>
                      <Ionicons name={t.icon} size={22} color={t.color} />
                    </View>
                    <View style={s.optionContent}>
                      <Text style={[s.optionLabel, { color: template === t.key ? t.color : '#FFF' }]}>{t.label}</Text>
                      <Text style={s.optionSub}>{t.sub}</Text>
                      <Text style={s.optionDesc}>{t.desc}</Text>
                    </View>
                    {template === t.key && <Ionicons name="checkmark-circle" size={22} color={t.color} />}
                  </TouchableOpacity>
                ))}
              </Animated.View>
            )}

            {/* ═══ STEP 2: DEFINIZIONE ═══ */}
            {step === 2 && (
              <Animated.View entering={FadeIn.duration(300)}>
                <Text style={s.sectionTitle}>Costruisci la Sfida</Text>

                {/* Title */}
                <Text style={s.inputLabel}>NOME SFIDA</Text>
                <TextInput
                  style={s.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Es: Inferno 300"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  maxLength={60}
                />

                {/* Time & Rounds */}
                <View style={s.paramRow}>
                  <View style={s.paramBox}>
                    <Text style={s.inputLabel}>TIME CAP (sec)</Text>
                    <TextInput
                      style={s.textInputSmall}
                      value={timeCap}
                      onChangeText={setTimeCap}
                      keyboardType="numeric"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                    />
                  </View>
                  <View style={s.paramBox}>
                    <Text style={s.inputLabel}>ROUND</Text>
                    <TextInput
                      style={s.textInputSmall}
                      value={rounds}
                      onChangeText={setRounds}
                      keyboardType="numeric"
                      placeholder="∞"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                    />
                  </View>
                </View>

                {/* Exercises */}
                <Text style={[s.inputLabel, { marginTop: 16 }]}>ESERCIZI ({exercises.length}/10)</Text>
                <View style={s.exGrid}>
                  {EXERCISES.map(ex => {
                    const selected = exercises.some(e => e.name === ex);
                    return (
                      <TouchableOpacity
                        key={ex}
                        style={[s.exChip, selected && s.exChipSelected]}
                        onPress={() => addExercise(ex)}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.exChipText, selected && { color: '#0A0A0A' }]}>{ex}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Exercise params */}
                {exercises.map((ex, idx) => (
                  <View key={ex.name} style={s.exParamRow}>
                    <Text style={s.exParamName}>{ex.name}</Text>
                    <View style={s.exParamFields}>
                      <View style={s.exParamField}>
                        <Text style={s.exParamLabel}>REPS</Text>
                        <TextInput
                          style={s.exParamInput}
                          value={String(ex.target_reps)}
                          onChangeText={v => updateExercise(idx, 'target_reps', parseInt(v) || 0)}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={s.exParamField}>
                        <Text style={s.exParamLabel}>SEC</Text>
                        <TextInput
                          style={s.exParamInput}
                          value={String(ex.target_seconds)}
                          onChangeText={v => updateExercise(idx, 'target_seconds', parseInt(v) || 0)}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={s.exParamField}>
                        <Text style={s.exParamLabel}>REST</Text>
                        <TextInput
                          style={s.exParamInput}
                          value={String(ex.rest_seconds)}
                          onChangeText={v => updateExercise(idx, 'rest_seconds', parseInt(v) || 0)}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </Animated.View>
            )}

            {/* ═══ STEP 3: DESTINAZIONE ═══ */}
            {step === 3 && (
              <Animated.View entering={FadeIn.duration(300)}>
                <Text style={s.sectionTitle}>Dove la Lanci?</Text>
                <Text style={s.sectionSub}>Decidi il campo di battaglia.</Text>
                {DESTINATIONS.map(d => (
                  <TouchableOpacity
                    key={d.key}
                    style={[s.optionCard, destination === d.key && { borderColor: d.color, backgroundColor: d.color + '08' }]}
                    onPress={() => { setDestination(d.key); Haptics.selectionAsync().catch(() => {}); }}
                    activeOpacity={0.8}
                  >
                    <View style={[s.optionIcon, { backgroundColor: d.color + '15' }]}>
                      <Ionicons name={d.icon} size={22} color={d.color} />
                    </View>
                    <View style={s.optionContent}>
                      <Text style={[s.optionLabel, { color: destination === d.key ? d.color : '#FFF' }]}>{d.label}</Text>
                      <Text style={s.optionSub}>{d.sub}</Text>
                    </View>
                    {destination === d.key && <Ionicons name="checkmark-circle" size={22} color={d.color} />}
                  </TouchableOpacity>
                ))}
              </Animated.View>
            )}

            {/* ═══ STEP 4: CERTIFICAZIONE ═══ */}
            {step === 4 && (
              <Animated.View entering={FadeIn.duration(300)}>
                <Text style={s.sectionTitle}>Come si Valida?</Text>
                <Text style={s.sectionSub}>Scegli il tuo Trust Engine.</Text>
                {CERTIFICATIONS.map(c => (
                  <TouchableOpacity
                    key={c.key}
                    style={[s.optionCard, certification === c.key && { borderColor: c.color, backgroundColor: c.color + '08' }]}
                    onPress={() => { setCertification(c.key); Haptics.selectionAsync().catch(() => {}); }}
                    activeOpacity={0.8}
                  >
                    <View style={[s.optionIcon, { backgroundColor: c.color + '15' }]}>
                      <Ionicons name={c.icon} size={22} color={c.color} />
                    </View>
                    <View style={s.optionContent}>
                      <Text style={[s.optionLabel, { color: certification === c.key ? c.color : '#FFF' }]}>{c.label}</Text>
                      <Text style={s.optionSub}>{c.sub}</Text>
                    </View>
                    {certification === c.key && <Ionicons name="checkmark-circle" size={22} color={c.color} />}
                  </TouchableOpacity>
                ))}

                {/* Final Summary */}
                {certification && (
                  <Animated.View entering={FadeInDown.delay(200)} style={s.summaryBox}>
                    <Text style={s.summaryTitle}>📋 RIEPILOGO</Text>
                    <Text style={s.summaryLine}>
                      <Text style={s.summaryKey}>Sfida: </Text>{title || '—'}
                    </Text>
                    <Text style={s.summaryLine}>
                      <Text style={s.summaryKey}>Template: </Text>{template}
                    </Text>
                    <Text style={s.summaryLine}>
                      <Text style={s.summaryKey}>Esercizi: </Text>{exercises.map(e => e.name).join(', ') || '—'}
                    </Text>
                    <Text style={s.summaryLine}>
                      <Text style={s.summaryKey}>Destinazione: </Text>{DESTINATIONS.find(d => d.key === destination)?.label || '—'}
                    </Text>
                    <Text style={s.summaryLine}>
                      <Text style={s.summaryKey}>Validazione: </Text>{CERTIFICATIONS.find(c => c.key === certification)?.label || '—'}
                    </Text>
                    <Text style={s.summaryFlux}>
                      FLUX Reward: +{15 + exercises.length * 5} ⚡
                    </Text>
                  </Animated.View>
                )}
              </Animated.View>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Bottom CTA */}
          <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {step < 4 ? (
              <TouchableOpacity
                style={[s.nextBtn, !canNext() && s.nextBtnDisabled]}
                onPress={() => { if (canNext()) setStep((step + 1) as Step); }}
                activeOpacity={0.8}
                disabled={!canNext()}
              >
                <Text style={s.nextBtnText}>AVANTI</Text>
                <Ionicons name="arrow-forward" size={18} color={canNext() ? '#0A0A0A' : 'rgba(255,255,255,0.2)'} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.submitBtn, (!canNext() || submitting) && s.nextBtnDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.8}
                disabled={!canNext() || submitting}
              >
                <Ionicons name="flash" size={18} color="#0A0A0A" />
                <Text style={s.submitBtnText}>{submitting ? 'CREANDO...' : 'LANCIA LA SFIDA'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },
  headerStep: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 2, fontFamily: FONT_M },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 20 },
  progressFill: { height: 3, borderRadius: 2 },
  body: { paddingHorizontal: 20, paddingTop: 24 },

  // Section
  sectionTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.5, fontFamily: FONT_J, marginBottom: 4 },
  sectionSub: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '500', fontFamily: FONT_M, marginBottom: 20 },

  // Option Card
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, marginBottom: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  optionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionContent: { flex: 1 },
  optionLabel: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_J },
  optionSub: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '500', fontFamily: FONT_M, marginTop: 1 },
  optionDesc: { color: 'rgba(255,255,255,0.20)', fontSize: 10, fontWeight: '400', fontFamily: FONT_M, marginTop: 3, fontStyle: 'italic' },

  // Inputs
  inputLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 2, fontFamily: FONT_M, marginBottom: 6 },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    color: '#FFF', fontSize: 16, fontWeight: '700', fontFamily: FONT_J,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 16,
  },
  paramRow: { flexDirection: 'row', gap: 12 },
  paramBox: { flex: 1 },
  textInputSmall: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: '#00E5FF', fontSize: 18, fontWeight: '900', fontFamily: FONT_J, textAlign: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },

  // Exercise chips
  exGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  exChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)',
  },
  exChipSelected: { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
  exChipText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', fontFamily: FONT_M },

  // Exercise params
  exParamRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10,
    padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  exParamName: { flex: 1, color: '#00E5FF', fontSize: 12, fontWeight: '800', fontFamily: FONT_J },
  exParamFields: { flexDirection: 'row', gap: 8 },
  exParamField: { alignItems: 'center' },
  exParamLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 8, fontWeight: '700', letterSpacing: 1.5, fontFamily: FONT_M, marginBottom: 3 },
  exParamInput: {
    width: 50, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', color: '#FFF', fontSize: 14, fontWeight: '900',
    fontFamily: FONT_J, textAlign: 'center',
  },

  // Summary
  summaryBox: {
    marginTop: 20, padding: 18, borderRadius: 16,
    backgroundColor: 'rgba(0,229,255,0.04)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)',
  },
  summaryTitle: { color: '#00E5FF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J, marginBottom: 12 },
  summaryLine: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '500', fontFamily: FONT_M, marginBottom: 4 },
  summaryKey: { color: '#FFF', fontWeight: '800' },
  summaryFlux: { color: '#FFD700', fontSize: 16, fontWeight: '900', fontFamily: FONT_J, marginTop: 12, letterSpacing: 1 },

  // Bottom bar
  bottomBar: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#00E5FF', borderRadius: 16, paddingVertical: 16,
  },
  nextBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.06)' },
  nextBtnText: { color: '#0A0A0A', fontSize: 16, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFD700', borderRadius: 16, paddingVertical: 16,
  },
  submitBtnText: { color: '#0A0A0A', fontSize: 16, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
});
