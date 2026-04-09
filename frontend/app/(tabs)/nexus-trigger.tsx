/**
 * ARENA NEXUS — SAFE DASHBOARD (Build #16)
 * ═══════════════════════════════════════════
 * Ultra-lightweight entry point to bypass iOS SpringBoard memory kill.
 * 
 * RULES:
 * - ZERO heavy sub-component imports at module level
 * - ZERO Reanimated withRepeat animations
 * - ZERO external images at boot (only loaded on demand)
 * - ZERO native module calls (camera, haptics, sensors)
 * - All data fetched AFTER mount via progressive loading
 * - ErrorBoundary wraps everything
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, Dimensions, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const { width: SW } = Dimensions.get('window');

// ═══════════════════════════════════════════
// ERROR BOUNDARY — Catches any crash in the Dashboard
// ═══════════════════════════════════════════
class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error.message || 'Unknown crash' };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[NEXUS CRASH]', error.message, info.componentStack?.slice(0, 300));
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={crashStyles.wrap}>
          <StatusBar barStyle="light-content" />
          <Ionicons name="alert-circle" size={56} color="#FF3B30" />
          <Text style={crashStyles.title}>NEXUS ERROR</Text>
          <Text style={crashStyles.msg}>{this.state.errorMsg.slice(0, 200)}</Text>
          <TouchableOpacity
            style={crashStyles.retryBtn}
            onPress={() => this.setState({ hasError: false, errorMsg: '' })}
          >
            <Text style={crashStyles.retryTxt}>RIPROVA</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const crashStyles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { color: '#FF3B30', fontSize: 22, fontWeight: '900', letterSpacing: 2, marginTop: 16 },
  msg: { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 18 },
  retryBtn: { marginTop: 24, backgroundColor: '#00E5FF', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  retryTxt: { color: '#050505', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
});

// ═══════════════════════════════════════════
// SAFE DASHBOARD COMPONENT
// ═══════════════════════════════════════════
function SafeDashboard() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Progressive data loading — one at a time
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [scansLoading, setScansLoading] = useState(true);
  const [koreScore, setKoreScore] = useState<number | null>(null);
  const [koreLoading, setKoreLoading] = useState(true);
  const [pendingChallenges, setPendingChallenges] = useState<any[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(true);

  // Phase 1: Load user stats (lightweight)
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await api.get('/api/users/me', token);
      setStats(res);
    } catch (e) {
      console.warn('[Dashboard] Stats load failed:', e);
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  // Phase 2: Load KORE Score
  const loadKoreScore = useCallback(async () => {
    try {
      setKoreLoading(true);
      const uid = user?._id || user?.id;
      if (!uid) return;
      const res = await api.get(`/api/coach/kore-score/${uid}/breakdown`, token);
      setKoreScore(res?.total || res?.kore_score || 0);
    } catch (e) {
      console.warn('[Dashboard] KoreScore load failed:', e);
      setKoreScore(0);
    } finally {
      setKoreLoading(false);
    }
  }, [token, user]);

  // Phase 3: Load recent scans
  const loadRecentScans = useCallback(async () => {
    try {
      setScansLoading(true);
      const res = await api.get('/api/scans?limit=3', token);
      setRecentScans(Array.isArray(res) ? res.slice(0, 3) : []);
    } catch (e) {
      console.warn('[Dashboard] Scans load failed:', e);
    } finally {
      setScansLoading(false);
    }
  }, [token]);

  // Phase 4: Load pending challenges
  const loadChallenges = useCallback(async () => {
    try {
      setChallengesLoading(true);
      const res = await api.get('/api/challenges/pending', token);
      setPendingChallenges(Array.isArray(res) ? res : []);
    } catch (e) {
      console.warn('[Dashboard] Challenges load failed:', e);
    } finally {
      setChallengesLoading(false);
    }
  }, [token]);

  // Progressive loader — each phase starts AFTER the previous finishes
  useEffect(() => {
    let cancelled = false;
    const loadProgressively = async () => {
      if (cancelled) return;
      await loadStats();
      if (cancelled) return;
      // Small delay between phases to avoid main thread spikes
      await new Promise(r => setTimeout(r, 300));
      await loadKoreScore();
      if (cancelled) return;
      await new Promise(r => setTimeout(r, 300));
      await loadRecentScans();
      if (cancelled) return;
      await new Promise(r => setTimeout(r, 300));
      await loadChallenges();
    };
    loadProgressively();
    return () => { cancelled = true; };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    await loadKoreScore();
    await loadRecentScans();
    await loadChallenges();
    setRefreshing(false);
  };

  const username = (user?.username || 'KORE').toUpperCase();
  const role = user?.role || 'ATHLETE';
  const sport = user?.sport || 'ATHLETICS';
  const akCredits = stats?.ak_credits ?? user?.ak_credits ?? 0;

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
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.greeting}>NEXUS COMMAND</Text>
            <Text style={s.username}>{username}</Text>
            <View style={s.roleBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#00E5FF" />
              <Text style={s.roleText}>{role}</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <View style={s.akBadge}>
              <Text style={s.akIcon}>💧</Text>
              <Text style={s.akValue}>{akCredits}</Text>
            </View>
          </View>
        </View>

        {/* ══ KORE SCORE CARD ══ */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="flash" size={18} color="#FFD700" />
            <Text style={s.cardTitle}>KORE SCORE</Text>
          </View>
          {koreLoading ? (
            <View style={s.loadingRow}>
              <ActivityIndicator size="small" color="#00E5FF" />
              <Text style={s.loadingText}>Calcolo in corso...</Text>
            </View>
          ) : (
            <View style={s.scoreRow}>
              <Text style={s.scoreValue}>{koreScore ?? 0}</Text>
              <Text style={s.scoreLabel}>/ 100</Text>
            </View>
          )}
          <View style={s.scoreBar}>
            <LinearGradient
              colors={['#00E5FF', '#FFD700']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.scoreBarFill, { width: `${Math.min(koreScore || 0, 100)}%` as any }]}
            />
          </View>
        </View>

        {/* ══ SPORT BADGE ══ */}
        <View style={s.sportCard}>
          <Ionicons name="medal" size={20} color="#FFD700" />
          <Text style={s.sportName}>{sport.toUpperCase()}</Text>
          <View style={{ flex: 1 }} />
          <View style={s.statusDot} />
          <Text style={s.statusText}>ONLINE</Text>
        </View>

        {/* ══ QUICK ACTIONS ══ */}
        <Text style={s.sectionTitle}>AZIONI RAPIDE</Text>
        <View style={s.actionsGrid}>
          <TouchableOpacity style={s.actionCard} activeOpacity={0.8}>
            <View style={[s.actionIcon, { backgroundColor: 'rgba(0,229,255,0.1)' }]}>
              <Ionicons name="body" size={24} color="#00E5FF" />
            </View>
            <Text style={s.actionLabel}>SCAN</Text>
            <Text style={s.actionSub}>Biomeccanica</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} activeOpacity={0.8}>
            <View style={[s.actionIcon, { backgroundColor: 'rgba(255,215,0,0.1)' }]}>
              <Ionicons name="fitness" size={24} color="#FFD700" />
            </View>
            <Text style={s.actionLabel}>TRAINING</Text>
            <Text style={s.actionSub}>Allenamento</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} activeOpacity={0.8}>
            <View style={[s.actionIcon, { backgroundColor: 'rgba(255,69,58,0.1)' }]}>
              <Ionicons name="flame" size={24} color="#FF453A" />
            </View>
            <Text style={s.actionLabel}>DUEL</Text>
            <Text style={s.actionSub}>Sfida 1v1</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} activeOpacity={0.8}>
            <View style={[s.actionIcon, { backgroundColor: 'rgba(50,215,75,0.1)' }]}>
              <Ionicons name="qr-code" size={24} color="#32D74B" />
            </View>
            <Text style={s.actionLabel}>QR</Text>
            <Text style={s.actionSub}>Scansiona</Text>
          </TouchableOpacity>
        </View>

        {/* ══ RECENT SCANS ══ */}
        <Text style={s.sectionTitle}>SCANSIONI RECENTI</Text>
        {scansLoading ? (
          <View style={s.loadingCard}>
            <ActivityIndicator size="small" color="#00E5FF" />
            <Text style={s.loadingText}>Caricamento scansioni...</Text>
          </View>
        ) : recentScans.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="scan-outline" size={32} color="rgba(255,255,255,0.15)" />
            <Text style={s.emptyText}>Nessuna scansione recente</Text>
            <Text style={s.emptyHint}>Avvia una scansione biomeccanica per iniziare</Text>
          </View>
        ) : (
          recentScans.map((scan, i) => (
            <View key={scan._id || i} style={s.scanCard}>
              <View style={s.scanLeft}>
                <Text style={s.scanExercise}>{(scan.exercise || 'SCAN').toUpperCase()}</Text>
                <Text style={s.scanDate}>
                  {scan.created_at ? new Date(scan.created_at).toLocaleDateString('it-IT') : '—'}
                </Text>
              </View>
              <View style={s.scanRight}>
                <Text style={s.scanReps}>{scan.reps ?? '—'}</Text>
                <Text style={s.scanRepsLabel}>REPS</Text>
              </View>
            </View>
          ))
        )}

        {/* ══ PENDING CHALLENGES ══ */}
        <Text style={s.sectionTitle}>SFIDE IN ATTESA</Text>
        {challengesLoading ? (
          <View style={s.loadingCard}>
            <ActivityIndicator size="small" color="#FFD700" />
            <Text style={s.loadingText}>Caricamento sfide...</Text>
          </View>
        ) : pendingChallenges.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="flash-outline" size={32} color="rgba(255,255,255,0.15)" />
            <Text style={s.emptyText}>Nessuna sfida in attesa</Text>
            <Text style={s.emptyHint}>Sfida un atleta scansionando il suo QR KORE</Text>
          </View>
        ) : (
          pendingChallenges.map((ch, i) => (
            <View key={ch._id || i} style={s.challengeCard}>
              <View style={s.challengeIcon}>
                <Ionicons name="flame" size={18} color="#FF453A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.challengeName}>{(ch.exercise || ch.type || 'DUEL').toUpperCase()}</Text>
                <Text style={s.challengeStatus}>{ch.status || 'PENDING'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </View>
          ))
        )}

        {/* ══ BUILD INFO ══ */}
        <View style={s.buildInfo}>
          <Text style={s.buildText}>ARENA NEXUS · v2.0.2 · Build 16 · Safe Dashboard</Text>
          <Text style={s.buildText}>Lightweight Mode · {Platform.OS.toUpperCase()}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════
// EXPORT — Wrapped in ErrorBoundary
// ═══════════════════════════════════════════
export default function NexusTriggerSafe() {
  return (
    <DashboardErrorBoundary>
      <SafeDashboard />
    </DashboardErrorBoundary>
  );
}

// ═══════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  greeting: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  username: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
    backgroundColor: 'rgba(0,229,255,0.06)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start'
  },
  roleText: { color: '#00E5FF', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  akBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,215,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8
  },
  akIcon: { fontSize: 16 },
  akValue: { color: '#FFD700', fontSize: 18, fontWeight: '900' },

  // KORE Score Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    padding: 20, marginBottom: 16
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 12 },
  scoreValue: { color: '#FFFFFF', fontSize: 48, fontWeight: '900', letterSpacing: -2 },
  scoreLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 18, fontWeight: '700' },
  scoreBar: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden'
  },
  scoreBarFill: { height: '100%', borderRadius: 3 },

  // Sport card
  sportCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,215,0,0.05)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24
  },
  sportName: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#32D74B' },
  statusText: { color: '#32D74B', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  // Section titles
  sectionTitle: {
    color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900',
    letterSpacing: 3, marginBottom: 12, marginTop: 8
  },

  // Actions grid
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  actionCard: {
    width: (SW - 42) / 2, backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    padding: 16
  },
  actionIcon: {
    width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12
  },
  actionLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  actionSub: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '600', marginTop: 2 },

  // Loading states
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  loadingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12,
    padding: 20, marginBottom: 8
  },
  loadingText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '600' },

  // Empty states
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
    padding: 28, alignItems: 'center', marginBottom: 8
  },
  emptyText: { color: 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: '800', marginTop: 10 },
  emptyHint: { color: 'rgba(255,255,255,0.12)', fontSize: 11, fontWeight: '600', marginTop: 6, textAlign: 'center' },

  // Scan cards
  scanCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(0,229,255,0.04)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.08)',
    padding: 16, marginBottom: 8
  },
  scanLeft: { flex: 1 },
  scanExercise: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  scanDate: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '600', marginTop: 4 },
  scanRight: { alignItems: 'center' },
  scanReps: { color: '#00E5FF', fontSize: 22, fontWeight: '900' },
  scanRepsLabel: { color: 'rgba(0,229,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },

  // Challenge cards
  challengeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,69,58,0.04)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,69,58,0.08)',
    padding: 16, marginBottom: 8
  },
  challengeIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,69,58,0.1)',
    alignItems: 'center', justifyContent: 'center'
  },
  challengeName: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  challengeStatus: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '600', marginTop: 2 },

  // Build info
  buildInfo: { alignItems: 'center', marginTop: 32, gap: 4 },
  buildText: { color: 'rgba(255,255,255,0.08)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
});
