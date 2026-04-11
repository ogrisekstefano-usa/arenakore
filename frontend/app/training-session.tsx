/**
 * ALLENAMENTO — Quick Training Session (Build 35)
 * ═══════════════════════════════════════════════════
 * Category selection → Timer → RPE → Save → K-Timeline & Vital K-Flux
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, Dimensions, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';
import Animated, { FadeInDown, FadeIn, SlideInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: SW } = Dimensions.get('window');
const CYAN = '#00E5FF';
const GOLD = '#FFD700';
const RED = '#FF3B30';
const PURPLE = '#BF5AF2';

type Phase = 'select' | 'active' | 'rpe' | 'results';

const CATEGORIES = [
  { id: 'cardio', label: 'CARDIO', icon: 'heart', color: RED, desc: 'Corsa, Ciclismo, Nuoto', exercises: ['Corsa', 'Ciclismo', 'Salto Corda', 'Nuoto', 'Camminata Veloce'] },
  { id: 'strength', label: 'STRENGTH', icon: 'barbell', color: GOLD, desc: 'Pesi, Resistenza, Power', exercises: ['Push-up', 'Squat', 'Pull-up', 'Deadlift', 'Bench Press'] },
  { id: 'core', label: 'CORE', icon: 'body', color: PURPLE, desc: 'Addominali, Stabilità, Plank', exercises: ['Plank', 'Crunch', 'Russian Twist', 'Leg Raise', 'Mountain Climber'] },
];

export default function TrainingSession() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [phase, setPhase] = useState<Phase>('select');
  const [category, setCategory] = useState<typeof CATEGORIES[0] | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [rpe, setRpe] = useState(5);
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<any>(null);
  const startRef = useRef<number>(0);

  // Timer pulse
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (phase === 'active') {
      pulse.value = withRepeat(withTiming(1.15, { duration: 600 }), -1, true);
    }
  }, [phase]);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const startSession = (cat: typeof CATEGORIES[0]) => {
    setCategory(cat);
    setPhase('active');
    setSeconds(0);
    startRef.current = Date.now();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    timerRef.current = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
  };

  const stopSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (seconds < 30) {
      Alert.alert('SESSIONE TROPPO BREVE', 'Allenati almeno 30 secondi.');
      return;
    }
    setPhase('rpe');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  };

  const submitSession = async () => {
    if (!token || !category) return;
    setSaving(true);
    try {
      const res = await apiClient('/training/quick-session', {
        method: 'POST',
        body: JSON.stringify({
          category: category.id,
          duration_seconds: seconds,
          rpe,
          exercises: category.exercises.slice(0, 3),
        }),
      });
      setResult(res);
      setPhase('results');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      Alert.alert('ERRORE', e?.message || 'Salvataggio fallito');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // ═══ SELECT PHASE ═══
  if (phase === 'select') {
    return (
      <View style={st.container}>
        <StatusBar barStyle="light-content" />
        <View style={[st.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={st.topTitle}>ALLENAMENTO</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={st.scroll} contentContainerStyle={[st.content, { paddingBottom: insets.bottom + 32 }]}>
          <Text style={st.sectionTitle}>SCEGLI CATEGORIA</Text>
          {CATEGORIES.map((cat, idx) => (
            <Animated.View key={cat.id} entering={FadeInDown.delay(idx * 100).duration(400)}>
              <TouchableOpacity style={st.catCard} activeOpacity={0.85} onPress={() => startSession(cat)}>
                <LinearGradient
                  colors={[cat.color + '15', 'rgba(0,0,0,0)']}
                  start={{x:0,y:0}} end={{x:1,y:1}}
                  style={st.catGrad}
                >
                  <View style={[st.catIcon, { backgroundColor: cat.color + '15', borderColor: cat.color + '25' }]}>
                    <Ionicons name={cat.icon as any} size={28} color={cat.color} />
                  </View>
                  <View style={st.catText}>
                    <Text style={[st.catLabel, { color: cat.color }]}>{cat.label}</Text>
                    <Text style={st.catDesc}>{cat.desc}</Text>
                  </View>
                  <Ionicons name="play-circle" size={32} color={cat.color} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ═══ ACTIVE PHASE ═══
  if (phase === 'active') {
    return (
      <View style={st.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#000', category?.color + '08', '#000']} style={st.activeGrad}>
          <View style={st.activeTop}>
            <Text style={[st.activeCategory, { color: category?.color }]}>{category?.label}</Text>
            <Text style={st.activeHint}>SESSIONE IN CORSO</Text>
          </View>

          <View style={st.timerCenter}>
            <Animated.View style={pulseStyle}>
              <Text style={[st.timerText, { color: category?.color }]}>{formatTime(seconds)}</Text>
            </Animated.View>
            <View style={st.timerBar}>
              <LinearGradient
                colors={[category?.color || CYAN, GOLD]}
                start={{x:0,y:0}} end={{x:1,y:0}}
                style={[st.timerBarFill, { width: `${Math.min(seconds / 18, 100)}%` as any }]}
              />
            </View>
          </View>

          <TouchableOpacity style={[st.stopBtn, { borderColor: category?.color }]} activeOpacity={0.85} onPress={stopSession}>
            <Ionicons name="stop" size={24} color={category?.color} />
            <Text style={[st.stopText, { color: category?.color }]}>STOP SESSIONE</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  // ═══ RPE PHASE ═══
  if (phase === 'rpe') {
    return (
      <View style={st.container}>
        <StatusBar barStyle="light-content" />
        <View style={st.rpeCenter}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={st.rpeTitle}>INTENSITÀ PERCEPITA</Text>
            <Text style={st.rpeSub}>Quanto è stato impegnativo? (RPE 1-10)</Text>

            <View style={st.rpeRow}>
              {[1,2,3,4,5,6,7,8,9,10].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[st.rpeDot, rpe === v && { backgroundColor: v <= 3 ? '#32D74B' : v <= 6 ? GOLD : v <= 8 ? '#FF9500' : RED, borderColor: 'transparent' }]}
                  onPress={() => { setRpe(v); Haptics.selectionAsync().catch(() => {}); }}
                >
                  <Text style={[st.rpeDotText, rpe === v && { color: '#000' }]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={st.rpeLabels}>
              <Text style={[st.rpeLabelText, { color: '#32D74B' }]}>FACILE</Text>
              <Text style={[st.rpeLabelText, { color: GOLD }]}>MEDIO</Text>
              <Text style={[st.rpeLabelText, { color: RED }]}>MASSIMO</Text>
            </View>

            <Text style={st.rpeDuration}>{formatTime(seconds)} · {category?.label}</Text>

            <TouchableOpacity style={st.rpeSubmit} activeOpacity={0.85} onPress={submitSession} disabled={saving}>
              <Text style={st.rpeSubmitText}>{saving ? 'SALVATAGGIO...' : 'CONFERMA'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  }

  // ═══ RESULTS PHASE ═══
  return (
    <View style={st.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#000', '#001A0A', '#000']} style={st.resultsGrad}>
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={st.resultsContent}>
          <View style={st.resultCheck}>
            <Ionicons name="checkmark-circle" size={48} color="#32D74B" />
          </View>
          <Text style={st.resultTitle}>SESSIONE COMPLETATA</Text>
          <Text style={st.resultCat}>{category?.label} · {formatTime(seconds)}</Text>

          <View style={st.resultCards}>
            <View style={st.resultCard}>
              <Ionicons name="flash" size={20} color={CYAN} />
              <Text style={[st.resultCardVal, { color: CYAN }]}>+{result?.vital_flux_earned || 0}</Text>
              <Text style={st.resultCardLabel}>VITAL K-FLUX</Text>
            </View>
            <View style={st.resultCard}>
              <Ionicons name="star" size={20} color={GOLD} />
              <Text style={[st.resultCardVal, { color: GOLD }]}>+{result?.xp_earned || 0}</Text>
              <Text style={st.resultCardLabel}>XP EARNED</Text>
            </View>
          </View>

          <View style={st.resultTimeline}>
            <Ionicons name="checkmark-circle" size={16} color="#32D74B" />
            <Text style={st.resultTimelineText}>K-Timeline check-in validato</Text>
          </View>

          <TouchableOpacity style={st.resultDoneBtn} activeOpacity={0.85} onPress={() => router.back()}>
            <Text style={st.resultDoneText}>TORNA AL NÈXUS</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  sectionTitle: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 16 },
  catCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  catGrad: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
  catIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  catText: { flex: 1, gap: 3 },
  catLabel: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  catDesc: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '600' },
  // Active
  activeGrad: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 80 },
  activeTop: { alignItems: 'center', gap: 4 },
  activeCategory: { fontSize: 14, fontWeight: '900', letterSpacing: 4 },
  activeHint: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  timerCenter: { alignItems: 'center', gap: 16 },
  timerText: { fontSize: 72, fontWeight: '900', fontStyle: 'italic', letterSpacing: -3, lineHeight: 76 },
  timerBar: { width: SW * 0.6, height: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  timerBarFill: { height: '100%', borderRadius: 3 },
  stopBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14 },
  stopText: { fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  // RPE
  rpeCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  rpeTitle: { color: CYAN, fontSize: 16, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
  rpeSub: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  rpeRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', flexWrap: 'wrap' },
  rpeDot: { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  rpeDotText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '900' },
  rpeLabels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 12 },
  rpeLabelText: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  rpeDuration: { color: 'rgba(255,255,255,0.15)', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 20 },
  rpeSubmit: { backgroundColor: CYAN, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 14, marginTop: 24 },
  rpeSubmitText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
  // Results
  resultsGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  resultsContent: { alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  resultCheck: { marginBottom: 8 },
  resultTitle: { color: '#32D74B', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  resultCat: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  resultCards: { flexDirection: 'row', gap: 12, marginTop: 8 },
  resultCard: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, paddingVertical: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  resultCardVal: { fontSize: 24, fontWeight: '900' },
  resultCardLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  resultTimeline: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(50,215,75,0.08)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(50,215,75,0.15)' },
  resultTimelineText: { color: '#32D74B', fontSize: 11, fontWeight: '800' },
  resultDoneBtn: { backgroundColor: CYAN, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  resultDoneText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
});
