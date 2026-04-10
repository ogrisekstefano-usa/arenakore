/**
 * NEXUS COMMAND — Build 22 · STABILITY OVERDRIVE
 * Full visual Dashboard with IRONCLAD background data loading.
 * 
 * RULES:
 * - ZERO native modules (no camera, haptics, sensors)
 * - ZERO Reanimated withRepeat/infinite loops
 * - ZERO heavy sub-component imports
 * - Data loads in background — UI never blocks
 * - Every section has a loading state + error fallback
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, Dimensions, Platform, Keyboard
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width: SW } = Dimensions.get('window');

// ═══ ERROR BOUNDARY ═══
class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: any) { super(props); this.state = { hasError: false, errorMsg: '' }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, errorMsg: error.message }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[NEXUS CRASH]', error.message, info.componentStack?.slice(0, 200));
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="alert-circle" size={48} color="#FF3B30" />
          <Text style={{ color: '#FF3B30', fontSize: 20, fontWeight: '900', marginTop: 12 }}>NEXUS ERROR</Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
            {this.state.errorMsg.slice(0, 150)}
          </Text>
          <TouchableOpacity
            style={{ marginTop: 20, backgroundColor: '#00E5FF', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 }}
            onPress={() => this.setState({ hasError: false, errorMsg: '' })}
          >
            <Text style={{ color: '#050505', fontSize: 13, fontWeight: '900' }}>RIPROVA</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ═══ SECTION LOADER — reusable loading/error state ═══
function SectionLoader({ loading, error, color = '#00E5FF' }: { loading: boolean; error: string | null; color?: string }) {
  if (loading) return (
    <View style={s.sectionLoading}>
      <ActivityIndicator size="small" color={color} />
      <Text style={[s.sectionLoadingText, { color }]}>Caricamento...</Text>
    </View>
  );
  if (error) return (
    <View style={s.sectionError}>
      <Ionicons name="cloud-offline-outline" size={14} color="rgba(255,255,255,0.2)" />
      <Text style={s.sectionErrorText}>{error}</Text>
    </View>
  );
  return null;
}

// ═══ MAIN DASHBOARD ═══
function NexusDashboard() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Progressive data states — each independent
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [koreScore, setKoreScore] = useState<number | null>(null);
  const [koreLoading, setKoreLoading] = useState(true);
  const [koreError, setKoreError] = useState<string | null>(null);

  const [scans, setScans] = useState<any[]>([]);
  const [scansLoading, setScansLoading] = useState(true);
  const [scansError, setScansError] = useState<string | null>(null);

  // ── LOADERS (each wrapped in try/catch, never throws) ──
  const loadProfile = useCallback(async () => {
    try {
      setProfileLoading(true); setProfileError(null);
      const d = await api.get('/api/users/me', token);
      if (d && typeof d === 'object' && !d._raw && !d._parseError) setProfile(d);
      else setProfileError('Dati profilo non disponibili');
    } catch (e: any) { setProfileError(e?.message || 'Errore'); }
    finally { setProfileLoading(false); }
  }, [token]);

  const loadKoreScore = useCallback(async () => {
    try {
      setKoreLoading(true); setKoreError(null);
      const uid = user?._id || user?.id;
      if (!uid) { setKoreScore(0); return; }
      const d = await api.get(`/api/coach/kore-score/${uid}/breakdown`, token);
      if (d && typeof d === 'object' && !d._raw) setKoreScore(d?.total || d?.kore_score || 0);
      else setKoreScore(0);
    } catch { setKoreScore(0); }
    finally { setKoreLoading(false); }
  }, [token, user]);

  const loadScans = useCallback(async () => {
    try {
      setScansLoading(true); setScansError(null);
      const d = await api.get('/api/scans?limit=3', token);
      setScans(Array.isArray(d) ? d.slice(0, 3) : []);
    } catch (e: any) { setScansError(e?.message || 'Errore'); setScans([]); }
    finally { setScansLoading(false); }
  }, [token]);

  // Progressive loader — background, never blocks UI
  useEffect(() => {
    let c = false;
    const go = async () => {
      if (c) return;
      await loadProfile();
      if (c) return;
      await new Promise(r => setTimeout(r, 200));
      await loadKoreScore();
      if (c) return;
      await new Promise(r => setTimeout(r, 200));
      await loadScans();
    };
    go();
    return () => { c = true; };
  }, []);

  const onRefresh = async () => {
    Keyboard.dismiss();
    setRefreshing(true);
    await loadProfile();
    await loadKoreScore();
    await loadScans();
    setRefreshing(false);
  };

  const username = (profile?.username || user?.username || 'KORE').toUpperCase();
  const role = profile?.role || user?.role || 'ATHLETE';
  const sport = (profile?.sport || user?.sport || 'ATHLETICS').toUpperCase();
  const akCredits = profile?.ak_credits ?? user?.ak_credits ?? 0;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E5FF" />}
      >
        {/* ══ HEADER ══ */}
        <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.greeting}>NEXUS COMMAND</Text>
            <Text style={s.username}>{username}</Text>
            <View style={s.roleBadge}>
              <Ionicons name="shield-checkmark" size={11} color="#00E5FF" />
              <Text style={s.roleText}>{role}</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <View style={s.akBadge}>
              <Text style={s.akEmoji}>💧</Text>
              <Text style={s.akValue}>{akCredits}</Text>
            </View>
            <View style={s.sportPill}>
              <Ionicons name="medal" size={12} color="#FFD700" />
              <Text style={s.sportText}>{sport}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ══ KORE SCORE ══ */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={s.koreCard}>
            <View style={s.koreHeader}>
              <Ionicons name="flash" size={18} color="#FFD700" />
              <Text style={s.koreTitle}>KORE SCORE</Text>
              <View style={{ flex: 1 }} />
              <View style={[s.statusDot, { backgroundColor: profileLoading ? '#FFD700' : '#32D74B' }]} />
              <Text style={[s.statusLabel, { color: profileLoading ? '#FFD700' : '#32D74B' }]}>
                {profileLoading ? 'SYNC' : 'LIVE'}
              </Text>
            </View>
            {koreLoading ? (
              <SectionLoader loading={true} error={null} color="#FFD700" />
            ) : koreError ? (
              <SectionLoader loading={false} error={koreError} />
            ) : (
              <>
                <View style={s.koreScoreRow}>
                  <Text style={s.koreScoreValue}>{koreScore ?? 0}</Text>
                  <Text style={s.koreScoreMax}>/ 100</Text>
                </View>
                <View style={s.koreBar}>
                  <LinearGradient
                    colors={['#00E5FF', '#FFD700']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[s.koreBarFill, { width: `${Math.min(koreScore || 0, 100)}%` as any }]}
                  />
                </View>
              </>
            )}
          </View>
        </Animated.View>

        {/* ══ QUICK ACTIONS ══ */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={s.sectionTitle}>AZIONI RAPIDE</Text>
          <View style={s.actionsGrid}>
            {[
              { icon: 'body', label: 'SCAN', sub: 'Biomeccanica', bg: 'rgba(0,229,255,0.08)', color: '#00E5FF' },
              { icon: 'fitness', label: 'TRAINING', sub: 'Allenamento', bg: 'rgba(255,215,0,0.08)', color: '#FFD700' },
              { icon: 'flame', label: 'DUEL', sub: 'Sfida 1v1', bg: 'rgba(255,69,58,0.08)', color: '#FF453A' },
              { icon: 'qr-code', label: 'QR', sub: 'Scansiona', bg: 'rgba(50,215,75,0.08)', color: '#32D74B' },
            ].map((a, i) => (
              <TouchableOpacity key={i} style={s.actionCard} activeOpacity={0.8}>
                <View style={[s.actionIcon, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon as any} size={24} color={a.color} />
                </View>
                <Text style={s.actionLabel}>{a.label}</Text>
                <Text style={s.actionSub}>{a.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ══ RECENT SCANS ══ */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <Text style={s.sectionTitle}>SCANSIONI RECENTI</Text>
          {scansLoading ? (
            <SectionLoader loading={true} error={null} />
          ) : scansError ? (
            <SectionLoader loading={false} error={scansError} />
          ) : scans.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="scan-outline" size={28} color="rgba(255,255,255,0.12)" />
              <Text style={s.emptyText}>Nessuna scansione recente</Text>
            </View>
          ) : (
            scans.map((scan, i) => (
              <View key={scan._id || i} style={s.scanCard}>
                <View style={s.scanIconWrap}>
                  <Ionicons name="body" size={18} color="#00E5FF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.scanExercise}>{(scan.exercise || 'SCAN').toUpperCase()}</Text>
                  <Text style={s.scanDate}>
                    {scan.created_at ? new Date(scan.created_at).toLocaleDateString('it-IT') : '—'}
                  </Text>
                </View>
                <View style={s.scanRepsWrap}>
                  <Text style={s.scanRepsVal}>{scan.reps ?? '—'}</Text>
                  <Text style={s.scanRepsLabel}>REPS</Text>
                </View>
              </View>
            ))
          )}
        </Animated.View>

        {/* ══ PROFILE CARD ══ */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <Text style={s.sectionTitle}>PROFILO</Text>
          {profileLoading ? (
            <SectionLoader loading={true} error={null} />
          ) : profileError ? (
            <SectionLoader loading={false} error={profileError} />
          ) : (
            <View style={s.profileCard}>
              {[
                { label: 'USERNAME', value: profile?.username },
                { label: 'EMAIL', value: profile?.email },
                { label: 'SPORT', value: profile?.sport?.toUpperCase() },
                { label: 'KORE ID', value: profile?.kore_id },
                { label: 'AK DROPS', value: `💧 ${profile?.ak_credits ?? 0}` },
              ].map((row, i) => (
                <View key={i} style={s.profileRow}>
                  <Text style={s.profileLabel}>{row.label}</Text>
                  <Text style={s.profileValue}>{row.value || '—'}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* ══ BUILD INFO ══ */}
        <View style={s.buildInfo}>
          <Text style={s.buildText}>ARENA NEXUS · v2.1.0 · Build 22 · STABILITY OVERDRIVE</Text>
          <Text style={s.buildText}>IRONCLAD Network · {Platform.OS.toUpperCase()}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══ EXPORT ═══
export default function NexusTriggerSafe() {
  return (
    <DashboardErrorBoundary>
      <NexusDashboard />
    </DashboardErrorBoundary>
  );
}

// ═══ STYLES ═══
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end', gap: 8 },
  greeting: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  username: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', letterSpacing: -1, marginTop: 2 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
    backgroundColor: 'rgba(0,229,255,0.06)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start'
  },
  roleText: { color: '#00E5FF', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  akBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,215,0,0.06)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6
  },
  akEmoji: { fontSize: 14 },
  akValue: { color: '#FFD700', fontSize: 16, fontWeight: '900' },
  sportPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,215,0,0.04)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4
  },
  sportText: { color: 'rgba(255,215,0,0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  // KORE Score
  koreCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)',
    padding: 18, marginBottom: 20
  },
  koreHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  koreTitle: { color: '#FFD700', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  koreScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 10 },
  koreScoreValue: { color: '#FFFFFF', fontSize: 44, fontWeight: '900', letterSpacing: -2 },
  koreScoreMax: { color: 'rgba(255,255,255,0.25)', fontSize: 16, fontWeight: '700' },
  koreBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' },
  koreBarFill: { height: '100%', borderRadius: 3 },

  // Section titles
  sectionTitle: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 10, marginTop: 4 },

  // Section states
  sectionLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  sectionLoadingText: { fontSize: 11, fontWeight: '600' },
  sectionError: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 14, marginBottom: 8
  },
  sectionErrorText: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '600', flex: 1 },

  // Actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  actionCard: {
    width: (SW - 42) / 2, backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', padding: 14
  },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  actionSub: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '600', marginTop: 2 },

  // Empty
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12,
    padding: 24, alignItems: 'center', marginBottom: 8
  },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '700', marginTop: 8 },

  // Scan cards
  scanCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(0,229,255,0.03)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.06)', padding: 14, marginBottom: 8
  },
  scanIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(0,229,255,0.08)', alignItems: 'center', justifyContent: 'center'
  },
  scanExercise: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  scanDate: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '600', marginTop: 2 },
  scanRepsWrap: { alignItems: 'center' },
  scanRepsVal: { color: '#00E5FF', fontSize: 20, fontWeight: '900' },
  scanRepsLabel: { color: 'rgba(0,229,255,0.4)', fontSize: 8, fontWeight: '900', letterSpacing: 2 },

  // Profile
  profileCard: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', overflow: 'hidden', marginBottom: 8
  },
  profileRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)'
  },
  profileLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  profileValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // Build
  buildInfo: { alignItems: 'center', marginTop: 28, gap: 3 },
  buildText: { color: 'rgba(255,255,255,0.06)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
});
