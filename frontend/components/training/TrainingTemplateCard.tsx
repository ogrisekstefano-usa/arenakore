import Haptics from '../../utils/haptics';
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
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const DIFF_CFG: Record<string, { color: string; label: string }> = {
  easy:    { color: '#00FF87', label: 'EASY' },
  medium:  { color: '#FF9500', label: 'MEDIUM' },
  hard:    { color: '#FF3B30', label: 'HARD' },
  extreme: { color: '#AF52DE', label: 'EXTREME' }
};

const EX_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  squat: 'barbell',
  punch: 'hand-left'
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
  const diff = DIFF_CFG[t.difficulty] || { color: '#00E5FF', label: t.difficulty?.toUpperCase() };
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
        trainingFlux: String(t.xp_reward),
        dnaPotential: String(dnaP)
      }
    });
  };

  return (
    <Animated.View entering={FadeInDown.duration(350)} style={c$.section}>
      <View style={c$.sectionHeader}>
        <Animated.View style={[c$.dot, glowStyle]} />
        <Text style={c$.sectionTitle}>SESSION DEL GIORNO</Text>
        {t.already_done_today && (
          <View style={c$.donePill}><Ionicons name="checkmark" size={10} color="#00FF87" /><Text style={c$.doneText}>COMPLETATA</Text></View>
        )}
      </View>

      <View style={c$.card}>
        {/* Name — hero */}
        <Text style={c$.templateName}>{t.name.toUpperCase()}</Text>

        {/* FLUX + difficulty in one line */}
        <View style={c$.metaRow}>
          <Text style={c$.xpBig}>+{t.xp_reward} FLUX</Text>
          <View style={[c$.diffPill, { borderColor: diff.color + '50' }]}>
            <Text style={[c$.diffText, { color: diff.color }]}>{diff.label}</Text>
          </View>
          <Text style={c$.discLabel}>{t.exercise === 'squat' ? 'SQUAT' : 'PUNCH'} · {t.target_reps} REP · {t.target_time}s</Text>
        </View>

        {/* DNA Potential bar */}
        <View style={c$.dnaRow}>
          <Text style={c$.dnaLabel}>DNA POTENTIAL</Text>
          <View style={c$.dnaBar}>
            <View style={[c$.dnaFill, { width: `${dnaP}%` as any }]} />
          </View>
          <Text style={c$.dnaVal}>{dnaP}%</Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[c$.startBtn, t.already_done_today && c$.startBtnDone]}
          onPress={t.already_done_today ? undefined : handleStart}
          activeOpacity={0.85}
        >
          {t.already_done_today ? (
            <><Ionicons name="checkmark-circle" size={16} color="#00FF87" /><Text style={c$.startBtnDoneText}>COMPLETATA OGGI</Text></>
          ) : (
            <><Ionicons name="flash-sharp" size={16} color="#000000" /><Text style={c$.startBtnText}>AVVIA</Text></>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const c$ = StyleSheet.create({
  section: { marginTop: 12, marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, marginBottom: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFD700' },
  sectionTitle: { flex: 1, color: 'rgba(255,255,255,0.30)', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  donePill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doneText: { color: '#00FF87', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  card: { marginHorizontal: 24, backgroundColor: '#000000', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)', gap: 14 },
  templateName: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', letterSpacing: 2, lineHeight: 24 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  xpBig: { color: '#FFD700', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  diffPill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  diffText: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  discLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '300', letterSpacing: 1 },
  dnaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dnaLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  dnaBar: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  dnaFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 2 },
  dnaVal: { color: 'rgba(255,215,0,0.7)', fontSize: 13, fontWeight: '700', width: 34, textAlign: 'right' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFD700', borderRadius: 12, paddingVertical: 16 },
  startBtnDone: { backgroundColor: 'rgba(0,255,135,0.06)', borderWidth: 1, borderColor: 'rgba(0,255,135,0.2)' },
  startBtnText: { color: '#000000', fontSize: 17, fontWeight: '900', letterSpacing: 3 },
  startBtnDoneText: { color: '#00FF87', fontSize: 15, fontWeight: '900', letterSpacing: 2 }
});
