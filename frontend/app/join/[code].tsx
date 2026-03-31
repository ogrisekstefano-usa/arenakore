/**
 * ARENAKORE — QR-CORE Deep Link Landing v1.0
 * Nike Elite Aesthetic: Scansiona QR → Iscrizione evento → NEXUS
 * Zero emoji. Ionicons only. Bold Sans-Serif.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
  StatusBar, Alert, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const { width: SW } = Dimensions.get('window');
const PENDING_EVENT_KEY = '@arenakore_pending_event';

const DIFF_MAP: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  easy:    { label: 'EASY',    color: '#34C759', icon: 'star-outline' },
  medium:  { label: 'MEDIUM',  color: '#FF9500', icon: 'star-half' },
  hard:    { label: 'HARD',    color: '#FF3B30', icon: 'star' },
  extreme: { label: 'EXTREME', color: '#AF52DE', icon: 'flame' },
};

const EX_MAP: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  squat: { label: 'DEEP SQUAT', icon: 'barbell' },
  punch: { label: 'EXPLOSIVE PUNCH', icon: 'hand-left' },
};

type EnrollState = 'loading' | 'preview' | 'enrolling' | 'enrolled' | 'already' | 'error';

export default function JoinEventScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { token, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [state, setState] = useState<EnrollState>('loading');
  const [event, setEvent] = useState<any>(null);
  const [enrollResult, setEnrollResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 1) Fetch event preview (public)
  const fetchPreview = useCallback(async () => {
    if (!code) { setState('error'); setErrorMsg('Codice evento mancante'); return; }
    try {
      const data = await api.getEventPreview(code);
      setEvent(data);
      if (token) {
        // Auto-enroll immediately
        autoEnroll(code, token);
      } else {
        setState('preview');
      }
    } catch (e: any) {
      setState('error');
      setErrorMsg(e?.message || 'Evento non trovato o codice scaduto');
    }
  }, [code, token]);

  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  // 2) Auto-enroll
  const autoEnroll = async (eventCode: string, userToken: string) => {
    setState('enrolling');
    try {
      const result = await api.enrollViaEventCode(eventCode, userToken);
      setEnrollResult(result);
      setState(result.status === 'already_enrolled' ? 'already' : 'enrolled');
      // Clear any pending code
      await AsyncStorage.removeItem(PENDING_EVENT_KEY);
    } catch (e: any) {
      setState('error');
      setErrorMsg(e?.message || 'Errore durante l\'iscrizione');
    }
  };

  // 3) Save pending code and redirect to login
  const handleLoginRedirect = async () => {
    if (code) {
      await AsyncStorage.setItem(PENDING_EVENT_KEY, code);
    }
    router.push('/login');
  };

  // 4) Navigate to NEXUS tab
  const goToNexus = () => {
    router.replace('/(tabs)/nexus-trigger');
  };

  const diff = DIFF_MAP[event?.difficulty] || DIFF_MAP.medium;
  const ex = EX_MAP[event?.exercise] || EX_MAP.squat;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0A0A0A', '#050505']} style={StyleSheet.absoluteFill} />

      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={18} color="#00F2FF" />
        <Text style={styles.backText}>INDIETRO</Text>
      </TouchableOpacity>

      {/* LOADING */}
      {state === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator color="#00F2FF" size="large" />
          <Text style={styles.loadingText}>CARICAMENTO EVENTO...</Text>
        </View>
      )}

      {/* ENROLLING */}
      {state === 'enrolling' && (
        <View style={styles.center}>
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={styles.enrollingCircle}>
              <ActivityIndicator color="#00F2FF" size="large" />
            </View>
          </Animated.View>
          <Text style={styles.enrollingText}>ISCRIZIONE IN CORSO...</Text>
          <Text style={styles.enrollingSub}>Connessione al QR-Core</Text>
        </View>
      )}

      {/* ENROLLED SUCCESS */}
      {(state === 'enrolled' || state === 'already') && (
        <View style={styles.center}>
          <Animated.View entering={FadeInDown.duration(500)} style={styles.successCard}>
            <LinearGradient colors={['rgba(0,242,255,0.65)', 'rgba(0,242,255,0.65)']} style={styles.successGrad}>
              <View style={styles.successIconWrap}>
                <Ionicons name={state === 'enrolled' ? 'checkmark-circle' : 'information-circle'} size={48} color={state === 'enrolled' ? '#00F2FF' : '#D4AF37'} />
              </View>
              <Text style={styles.successTitle}>
                {state === 'enrolled' ? 'ISCRITTO!' : 'GIA\' ISCRITTO'}
              </Text>
              <Text style={styles.successSub}>
                {state === 'enrolled'
                  ? `Sei iscritto a "${enrollResult?.title || event?.title}"`
                  : `Sei gia\' iscritto a questo evento`}
              </Text>
              {enrollResult?.gym_name && (
                <View style={styles.gymBadge}>
                  <Ionicons name="business" size={14} color="#D4AF37" />
                  <Text style={styles.gymBadgeText}>{enrollResult.gym_name}</Text>
                </View>
              )}
              {state === 'enrolled' && enrollResult?.xp_reward && (
                <View style={styles.xpBadge}>
                  <Ionicons name="flash" size={14} color="#D4AF37" />
                  <Text style={styles.xpBadgeText}>+{enrollResult.xp_reward} XP IN PALIO</Text>
                </View>
              )}
              <TouchableOpacity style={styles.nexusBtn} onPress={goToNexus} activeOpacity={0.85}>
                <LinearGradient colors={['#00F2FF', '#009DB3']} style={styles.nexusBtnGrad}>
                  <Ionicons name="flash" size={18} color="#050505" />
                  <Text style={styles.nexusBtnText}>VAI AL NEXUS</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      )}

      {/* PREVIEW (not logged in) */}
      {state === 'preview' && event && (
        <View style={styles.previewContainer}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.previewCard}>
            <LinearGradient colors={['rgba(0,242,255,0.65)', '#0A0A0A']} style={styles.previewGrad}>
              {/* Header */}
              <View style={styles.previewHeader}>
                <Ionicons name="qr-code" size={20} color="#00F2FF" />
                <Text style={styles.previewHeaderText}>QR-CORE EVENT</Text>
              </View>

              {/* Status + Difficulty */}
              <View style={styles.previewBadgeRow}>
                <View style={[styles.statusBadge, event.status === 'live' && { backgroundColor: 'rgba(255,59,48,0.15)' }]}>
                  {event.status === 'live' && <View style={styles.liveDot} />}
                  <Text style={[styles.statusText, event.status === 'live' && { color: '#FF3B30' }]}>
                    {event.status === 'live' ? 'LIVE' : event.status === 'upcoming' ? 'PROSSIMO' : 'CONCLUSO'}
                  </Text>
                </View>
                <View style={[styles.diffBadge, { backgroundColor: `${diff.color}20`, borderColor: `${diff.color}50` }]}>
                  <Ionicons name={diff.icon} size={10} color={diff.color} />
                  <Text style={[styles.diffText, { color: diff.color }]}>{diff.label}</Text>
                </View>
              </View>

              {/* Title */}
              <Text style={styles.previewTitle}>{event.title}</Text>
              {event.description ? <Text style={styles.previewDesc}>{event.description}</Text> : null}

              {/* Info */}
              <View style={styles.previewInfoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar" size={14} color="#00F2FF" />
                  <Text style={styles.infoText}>{event.event_date}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="time" size={14} color="#00F2FF" />
                  <Text style={styles.infoText}>{event.event_time}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name={ex.icon} size={14} color="#00F2FF" />
                  <Text style={styles.infoText}>{ex.label}</Text>
                </View>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statBlock}>
                  <Text style={styles.statVal}>{event.participants_count}</Text>
                  <Text style={styles.statLabel}>/{event.max_participants} ATLETI</Text>
                </View>
                <View style={styles.statBlock}>
                  <Text style={[styles.statVal, { color: '#D4AF37' }]}>+{event.xp_reward}</Text>
                  <Text style={styles.statLabel}>XP REWARD</Text>
                </View>
              </View>

              {/* Gym */}
              {event.gym?.name && (
                <View style={styles.gymInfo}>
                  <Ionicons name="business" size={16} color="#D4AF37" />
                  <Text style={styles.gymName}>{event.gym.name}</Text>
                </View>
              )}

              {/* CTA: Login */}
              <View style={styles.ctaSection}>
                <Text style={styles.ctaLabel}>ACCEDI PER ISCRIVERTI</Text>
                <TouchableOpacity style={styles.loginBtn} onPress={handleLoginRedirect} activeOpacity={0.85}>
                  <LinearGradient colors={['#00F2FF', '#009DB3']} style={styles.loginBtnGrad}>
                    <Ionicons name="log-in" size={18} color="#050505" />
                    <Text style={styles.loginBtnText}>ACCEDI / REGISTRATI</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={styles.ctaSub}>
                  Dopo il login sarai iscritto automaticamente
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      )}

      {/* ERROR */}
      {state === 'error' && (
        <View style={styles.center}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.errorCard}>
            <Ionicons name="alert-circle" size={48} color="#FF3B30" />
            <Text style={styles.errorTitle}>ERRORE</Text>
            <Text style={styles.errorMsg}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchPreview}>
              <Text style={styles.retryText}>RIPROVA</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backText: { color: '#00F2FF', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginTop: 16 },
  enrollingCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0,242,255,0.65)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  enrollingText: { color: '#00F2FF', fontSize: 14, fontWeight: '900', letterSpacing: 2, marginTop: 20 },
  enrollingSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 },
  // Success
  successCard: { width: '100%', borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.65)' },
  successGrad: { padding: 28, alignItems: 'center', gap: 12 },
  successIconWrap: { marginBottom: 4 },
  successTitle: { color: '#00F2FF', fontSize: 24, fontWeight: '900', letterSpacing: 4 },
  successSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', fontWeight: '600' },
  gymBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(212,175,55,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
  },
  gymBadgeText: { color: '#D4AF37', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  xpBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  xpBadgeText: { color: '#D4AF37', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  nexusBtn: { width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  nexusBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16,
  },
  nexusBtnText: { color: '#050505', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  // Preview
  previewContainer: { flex: 1, paddingHorizontal: 16, paddingBottom: 24, justifyContent: 'center' },
  previewCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)' },
  previewGrad: { padding: 24, gap: 14 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  previewHeaderText: { color: '#00F2FF', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  previewBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(212,175,55,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B30' },
  statusText: { color: '#D4AF37', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  diffBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  diffText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  previewTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  previewDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 18 },
  previewInfoRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 24 },
  statBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statVal: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  gymInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.15)',
  },
  gymName: { color: '#D4AF37', fontSize: 14, fontWeight: '800' },
  ctaSection: { alignItems: 'center', gap: 10, marginTop: 4 },
  ctaLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  loginBtn: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  loginBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16,
  },
  loginBtnText: { color: '#050505', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  ctaSub: { color: 'rgba(255,255,255,0.3)', fontSize: 10, textAlign: 'center', fontWeight: '600' },
  // Error
  errorCard: { alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,59,48,0.06)', borderRadius: 20, padding: 32, borderWidth: 1, borderColor: 'rgba(255,59,48,0.15)' },
  errorTitle: { color: '#FF3B30', fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  errorMsg: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', fontWeight: '600' },
  retryBtn: { backgroundColor: 'rgba(255,59,48,0.15)', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,59,48,0.3)' },
  retryText: { color: '#FF3B30', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
});
