/**
 * CERTIFIED BY PROS — TalosFit Master Template Section
 * Mostra template certificati da coach professionisti.
 * Lock: richiede FLUX + livello minimo.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, useSharedValue, withSequence, withTiming, withRepeat, useAnimatedStyle, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const DIFF_CFG: Record<string, { color: string }> = {
  hard:    { color: '#FF3B30' },
  extreme: { color: '#AF52DE' },
};

const DISC_LABELS: Record<string, string> = {
  power: 'POWER', agility: 'AGILITY', endurance: 'ENDURANCE',
};

export function CertifiedByPros() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const ak = user?.ak_credits ?? 0;
  const level = user?.level ?? 1;

  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withSequence(withTiming(1, { duration: 1500, easing: Easing.linear }), withTiming(0, { duration: 0 })), -1, false);
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await api.getCertifiedTemplates(token);
      setTemplates(d.templates || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleUnlock = async (t: any) => {
    if (!token) return;
    if (!t.meets_level) {
      Alert.alert('LIVELLO INSUFFICIENTE', `Devi essere LVL ${t.required_level} per sbloccare questo programma. Sei LVL ${level}.`);
      return;
    }
    if (!t.can_afford) {
      Alert.alert('INSUFFICIENTI', `Servono ${t.required_drops} FLUX. Ne hai ${ak}.\nFai Scan Nexus per guadagnarli.`);
      return;
    }
    setUnlocking(t.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    try {
      const result = await api.unlockCertifiedTemplate(t.id, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        '🏆 PROGRAMMA SBLOCCATO',
        `${result.template_name}\nCertificato da ${result.certified_by}\n\n${result.ak_drops} drops rimanenti`,
        [{ text: 'INIZIA ORA', onPress: () => router.push({ pathname: '/(tabs)/nexus-trigger', params: { trainingPushId: t.id } }) }]
      );
      load();
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Impossibile sbloccare');
    } finally { setUnlocking(false as any); }
  };

  const handleStart = (t: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push({
      pathname: '/(tabs)/nexus-trigger',
      params: {
        trainingPushId: t.id || 'coach_template',
        trainingExercise: t.exercise,
        trainingTargetReps: String(t.target_reps),
        trainingTargetTime: String(t.target_time),
        trainingName: t.name,
        trainingFlux: String(t.xp_reward),
        dnaPotential: '75',
      },
    });
  };

  if (loading) return null;
  if (!templates.length) return null;

  return (
    <View style={cp$.section}>
      {/* Header */}
      <View style={cp$.header}>
        <View style={cp$.certBadge}>
          <Ionicons name="shield-checkmark" size={12} color="#FFD700" />
          <Text style={cp$.certText}>CERTIFIED BY PROS</Text>
        </View>
        <Text style={cp$.orgText}>powered by TalosFit™</Text>
      </View>
      <Text style={cp$.subtitle}>Template generati da AI, certificati da coach Elite</Text>

      {templates.map((t, idx) => {
        const isUnlocking = unlocking === t.id;
        const diff = DIFF_CFG[t.difficulty] || { color: '#FF9500' };

        return (
          <Animated.View key={t.id} entering={FadeInDown.delay(idx * 80).duration(300)} style={[cp$.card, t.is_unlocked && cp$.cardUnlocked]}>
            {/* Certified ribbon */}
            <View style={cp$.ribbon}>
              <Ionicons name="shield-checkmark" size={10} color="#FFD700" />
              <Text style={cp$.ribbonText}>{t.certified_by} · TalosFit</Text>
            </View>

            {/* Template name + difficulty */}
            <View style={cp$.titleRow}>
              <Text style={cp$.templateName}>{t.name.toUpperCase()}</Text>
              <View style={[cp$.diffBadge, { borderColor: diff.color + '50' }]}>
                <Text style={[cp$.diffText, { color: diff.color }]}>{t.difficulty.toUpperCase()}</Text>
              </View>
            </View>

            {/* Description */}
            <Text style={cp$.desc}>{t.description}</Text>

            {/* Stats row */}
            <View style={cp$.statsRow}>
              <View style={cp$.stat}>
                <Text style={cp$.statVal}>{t.target_reps}</Text>
                <Text style={cp$.statLabel}>REP</Text>
              </View>
              <View style={cp$.stat}>
                <Text style={cp$.statVal}>{t.target_time}s</Text>
                <Text style={cp$.statLabel}>DURATA</Text>
              </View>
              <View style={cp$.stat}>
                <Text style={[cp$.statVal, { color: '#FFD700' }]}>+{t.xp_reward}</Text>
                <Text style={cp$.statLabel}>FLUX</Text>
              </View>
              <View style={cp$.stat}>
                <Text style={[cp$.statVal, { color: '#00E5FF' }]}>{DISC_LABELS[t.discipline] || t.discipline}</Text>
                <Text style={cp$.statLabel}>FOCUS</Text>
              </View>
            </View>

            {/* Lock / CTA */}
            {t.is_unlocked ? (
              <TouchableOpacity style={cp$.startBtn} onPress={() => handleStart(t)} activeOpacity={0.85}>
                <Ionicons name="flash-sharp" size={15} color="#000" />
                <Text style={cp$.startBtnText}>AVVIA PROGRAMMA</Text>
              </TouchableOpacity>
            ) : (
              <View style={cp$.lockSection}>
                <View style={cp$.lockReqs}>
                  <View style={[cp$.req, !t.can_afford && cp$.reqFail]}>
                    <Text style={[cp$.reqText, { color: t.can_afford ? '#00FF87' : '#FF3B30' }]}>
                      {t.required_drops} {t.can_afford ? '✓' : `(hai ${ak})`}
                    </Text>
                  </View>
                  <View style={[cp$.req, !t.meets_level && cp$.reqFail]}>
                    <Text style={[cp$.reqText, { color: t.meets_level ? '#00FF87' : '#FF3B30' }]}>
                      LVL {t.required_level} {t.meets_level ? '✓' : `(sei LVL ${level})`}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[cp$.unlockBtn, (!t.can_unlock) && cp$.unlockBtnOff]}
                  onPress={() => handleUnlock(t)}
                  disabled={isUnlocking}
                  activeOpacity={0.85}
                >
                  {isUnlocking ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <>
                      <Ionicons name="lock-open" size={14} color={t.can_unlock ? '#000' : 'rgba(255,255,255,0.3)'} />
                      <Text style={[cp$.unlockBtnText, !t.can_unlock && { color: 'rgba(255,255,255,0.3)' }]}>
                        SBLOCCA · {t.required_drops}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}

const cp$ = StyleSheet.create({
  section: { marginTop: 16, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 4 },
  certBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)' },
  certText: { color: '#FFD700', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  orgText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '300', fontStyle: 'italic' },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '300', paddingHorizontal: 24, marginBottom: 10 },
  card: { marginHorizontal: 24, marginBottom: 10, backgroundColor: 'rgba(255,215,0,0.04)', borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)' },
  cardUnlocked: { borderColor: 'rgba(0,255,135,0.25)', backgroundColor: 'rgba(0,255,135,0.03)' },
  ribbon: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ribbonText: { color: 'rgba(255,215,0,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  templateName: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  diffBadge: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  diffText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  desc: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '300', lineHeight: 16 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, paddingVertical: 8 },
  statVal: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  lockSection: { gap: 8 },
  lockReqs: { flexDirection: 'row', gap: 10 },
  req: { flex: 1, backgroundColor: 'rgba(0,255,135,0.06)', borderRadius: 6, paddingVertical: 5, paddingHorizontal: 8, borderWidth: 1, borderColor: 'rgba(0,255,135,0.15)', alignItems: 'center' },
  reqFail: { backgroundColor: 'rgba(255,59,48,0.06)', borderColor: 'rgba(255,59,48,0.2)' },
  reqText: { fontSize: 13, fontWeight: '700' },
  unlockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFD700', borderRadius: 12, paddingVertical: 13 },
  unlockBtnOff: { backgroundColor: 'rgba(255,255,255,0.06)' },
  unlockBtnText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#00FF87', borderRadius: 12, paddingVertical: 13 },
  startBtnText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
});
