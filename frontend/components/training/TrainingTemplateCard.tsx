/**
 * ARENAKORE — TRAINING TEMPLATE CARD
 * Shown in NEXUS console when Coach has pushed a session.
 * Tapping START launches the training session mode.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, useSharedValue, withRepeat, withSequence, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const DIFF_CFG: Record<string, { color: string; label: string }> = {
  easy:    { color: '#34C759', label: 'EASY' },
  medium:  { color: '#FF9500', label: 'MEDIUM' },
  hard:    { color: '#FF3B30', label: 'HARD' },
  extreme: { color: '#AF52DE', label: 'EXTREME' },
};

const EX_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  squat: 'barbell',
  punch: 'hand-left',
};

export function TrainingTemplateCard() {
  const { token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const pulse = useSharedValue(0.6);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1400 }), withTiming(0.6, { duration: 1400 })), -1, false);
  }, []);
  const glowStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await api.getMyTemplate(token);
      setData(d);
    } catch (_) {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return null;
  if (!data?.template) return null;

  const t = data.template;
  const diff = DIFF_CFG[t.difficulty] || { color: '#00F2FF', label: t.difficulty?.toUpperCase() };
  const dnaP = data.relevant_potential || 0;

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    router.push({
      pathname: '/(tabs)/nexus-trigger',
      params: {
        trainingPushId: t.push_id,
        trainingExercise: t.exercise,
        trainingTargetReps: String(t.target_reps),
        trainingTargetTime: String(t.target_time),
        trainingName: t.name,
        trainingXp: String(t.xp_reward),
        dnaPotential: String(dnaP),
      },
    });
  };

  return (
    <Animated.View entering={FadeInDown.duration(350)} style={c$.section}>
      <View style={c$.sectionHeader}>
        <Animated.View style={[c$.dot, glowStyle]} />
        <Text style={c$.sectionTitle}>TEMPLATE DEL GIORNO</Text>
        {t.already_done_today && (
          <View style={c$.donePill}><Ionicons name="checkmark" size={10} color="#34C759" /><Text style={c$.doneText}>COMPLETATO</Text></View>
        )}
      </View>

      <View style={c$.card}>
        {/* Top row: name + difficulty */}
        <View style={c$.topRow}>
          <Text style={c$.templateName} numberOfLines={1}>{t.name.toUpperCase()}</Text>
          <View style={[c$.diffPill, { borderColor: diff.color + '50' }]}>
            <Text style={[c$.diffText, { color: diff.color }]}>{diff.label}</Text>
          </View>
        </View>

        {/* Coach */}
        <View style={c$.coachRow}>
          <Ionicons name="person" size={10} color="rgba(212,175,55,0.7)" />
          <Text style={c$.coachText}>COACH: {t.coach_name.toUpperCase()}</Text>
        </View>

        {/* Exercise + targets */}
        <View style={c$.targetsRow}>
          <View style={c$.targetItem}>
            <Ionicons name={EX_ICONS[t.exercise] || 'flash'} size={18} color="#00F2FF" />
            <Text style={c$.targetLabel}>{t.exercise === 'squat' ? 'DEEP SQUAT' : 'EXPLOSIVE PUNCH'}</Text>
          </View>
          <View style={c$.targetItem}>
            <Text style={c$.targetVal}>{t.target_reps}</Text>
            <Text style={c$.targetUnit}>REP</Text>
          </View>
          <View style={c$.targetItem}>
            <Text style={c$.targetVal}>{t.target_time}</Text>
            <Text style={c$.targetUnit}>SEC</Text>
          </View>
          <View style={c$.targetItem}>
            <Text style={[c$.targetVal, { color: '#D4AF37' }]}>+{t.xp_reward}</Text>
            <Text style={c$.targetUnit}>XP</Text>
          </View>
        </View>

        {/* DNA Potential bar */}
        <View style={c$.dnaRow}>
          <Text style={c$.dnaLabel}>DNA POTENTIAL</Text>
          <View style={c$.dnaBar}>
            <View style={[c$.dnaFill, { width: `${dnaP}%` as any }]} />
          </View>
          <Text style={c$.dnaVal}>{dnaP}%</Text>
        </View>

        {/* Completions */}
        <Text style={c$.completions}>{t.completions_count} atleti hanno completato questa sessione</Text>

        {/* CTA */}
        <TouchableOpacity
          style={[c$.startBtn, t.already_done_today && c$.startBtnDone]}
          onPress={t.already_done_today ? undefined : handleStart}
          activeOpacity={0.85}
        >
          {t.already_done_today ? (
            <><Ionicons name="checkmark-circle" size={16} color="#34C759" /><Text style={c$.startBtnDoneText}>SESSIONE COMPLETATA OGGI</Text></>
          ) : (
            <><Ionicons name="flash-sharp" size={16} color="#050505" /><Text style={c$.startBtnText}>AVVIA SESSIONE ALLENAMENTO</Text></>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const c$ = StyleSheet.create({
  section: { marginTop: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#D4AF37', shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6 },
  sectionTitle: { flex: 1, color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  donePill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doneText: { color: '#34C759', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  card: { marginHorizontal: 16, backgroundColor: 'rgba(212,175,55,0.05)', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.2)', gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  templateName: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  diffPill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  diffText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  coachText: { color: 'rgba(212,175,55,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  targetsRow: { flexDirection: 'row', gap: 8 },
  targetItem: { flex: 1, alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  targetLabel: { color: 'rgba(0,242,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  targetVal: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  targetUnit: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  dnaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dnaLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  dnaBar: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  dnaFill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: 2 },
  dnaVal: { color: '#D4AF37', fontSize: 12, fontWeight: '900', width: 36, textAlign: 'right' },
  completions: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '400' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#D4AF37', borderRadius: 12, paddingVertical: 14, shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10 },
  startBtnDone: { backgroundColor: 'rgba(52,199,89,0.08)', borderWidth: 1, borderColor: 'rgba(52,199,89,0.2)' },
  startBtnText: { color: '#050505', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  startBtnDoneText: { color: '#34C759', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
});
