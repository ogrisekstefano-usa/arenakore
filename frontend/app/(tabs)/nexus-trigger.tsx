/**
 * NÈXUS OPERATIVO — Build 31-V2 · REBUILD COMPLETO
 * ════════════════════════════════════════════════════
 * Gerarchia:
 * 1. Header Universale (fisso)
 * 2. Ghost Banner (auto-check-in, 5s)
 * 3. K-Timeline (7 indicatori circolari)
 * 4. Area Notifiche & CTA:
 *    - Banner Sfida Ricevuta
 *    - K-SCAN CTA
 * 5. Grid Operativa (6 bottoni d'azione):
 *    [ALLENAMENTO] [SFIDA]
 *    [LIVE]        [CREW]
 *    [CREA SFIDA]  [RISPONDI]
 * 6. KORE Score compact + HealthKit
 *
 * IRONCLAD network layer — safe JSON, no crash.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, RefreshControl, Dimensions, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { apiClient } from '../../utils/api';
import { Header } from '../../components/Header';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn, FadeOut, SlideInUp } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW } = Dimensions.get('window');
const GOLD = '#FFD700';
const CYAN = '#00E5FF';
const PURPLE = '#BF5AF2';
const RED = '#FF3B30';
const GREEN = '#32D74B';

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
          <Ionicons name="alert-circle" size={48} color={RED} />
          <Text style={{ color: RED, fontSize: 20, fontWeight: '900', marginTop: 12 }}>NEXUS ERROR</Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
            {this.state.errorMsg.slice(0, 150)}
          </Text>
          <TouchableOpacity
            style={{ marginTop: 20, backgroundColor: CYAN, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 }}
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

// ═══ GHOST BANNER — "Bentornato [Username], check-in effettuato" ═══
function GhostBanner({ username, visible }: { username: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <Animated.View entering={SlideInUp.duration(600)} exiting={FadeOut.duration(800)} style={gb$.container}>
      <LinearGradient colors={['rgba(0,229,255,0.12)', 'rgba(0,229,255,0.03)', 'transparent']} style={gb$.gradient}>
        <View style={gb$.inner}>
          <View style={gb$.checkCircle}>
            <Ionicons name="checkmark" size={12} color="#000" />
          </View>
          <View style={gb$.textCol}>
            <Text style={gb$.title}>BENTORNATO {username}</Text>
            <Text style={gb$.sub}>check-in effettuato</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
const gb$ = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  gradient: { paddingTop: 8, paddingBottom: 16, paddingHorizontal: 20 },
  inner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,229,255,0.08)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  checkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: CYAN, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1, gap: 1 },
  title: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  sub: { color: 'rgba(0,229,255,0.6)', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
});

// ═══ 2. K-TIMELINE (7 Indicatori Circolari) ═══
function KTimeline({ weekData, streak }: { weekData: Array<{ date: string; day_name: string; checked_in: boolean }>; streak: number }) {
  const today = new Date().toISOString().split('T')[0];
  return (
    <View style={kt$.container}>
      <View style={kt$.header}>
        <View style={kt$.titleRow}>
          <Ionicons name="flame" size={12} color={GOLD} />
          <Text style={kt$.title}>K-TIMELINE</Text>
        </View>
        <View style={kt$.streakBadge}>
          <Text style={kt$.streakText}>{streak} 🔥</Text>
        </View>
      </View>
      <View style={kt$.days}>
        {weekData.map((d, i) => {
          const isToday = d.date === today;
          return (
            <View key={i} style={kt$.dayCol}>
              <View style={[
                kt$.circle,
                d.checked_in && kt$.circleDone,
                isToday && !d.checked_in && kt$.circleToday,
              ]}>
                {d.checked_in ? (
                  <Ionicons name="checkmark" size={12} color="#000" />
                ) : isToday ? (
                  <View style={kt$.todayDot} />
                ) : (
                  <Text style={kt$.dash}>—</Text>
                )}
              </View>
              <Text style={[kt$.dayLabel, isToday && kt$.dayLabelToday]}>{d.day_name}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
const kt$ = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    padding: 14, marginBottom: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: GOLD, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  streakBadge: { backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  streakText: { color: GOLD, fontSize: 12, fontWeight: '900' },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6 },
  circle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  circleDone: { backgroundColor: CYAN, borderColor: CYAN },
  circleToday: { borderColor: GOLD, borderWidth: 2 },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD },
  dash: { color: 'rgba(255,255,255,0.12)', fontSize: 10, fontWeight: '700' },
  dayLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  dayLabelToday: { color: GOLD },
});

// ═══ 3. BANNER SFIDA RICEVUTA ═══
function PendingChallengeBanner({ pending, onPress }: { pending: any | null; onPress: () => void }) {
  if (!pending) return null;
  return (
    <Animated.View entering={FadeInDown.delay(100).duration(400)}>
      <TouchableOpacity style={pb$.container} activeOpacity={0.85} onPress={onPress}>
        <View style={pb$.iconWrap}>
          <Ionicons name="flash" size={18} color={GOLD} />
        </View>
        <View style={pb$.textCol}>
          <Text style={pb$.title} numberOfLines={1}>
            {pending.challenger || 'ATLETA'} TI HA SFIDATO!
          </Text>
          <Text style={pb$.sub}>Accetta subito la sfida agonistica</Text>
        </View>
        <View style={pb$.arrow}>
          <Ionicons name="chevron-forward" size={18} color={GOLD} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const pb$ = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  textCol: { flex: 1, gap: 2 },
  title: { color: GOLD, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  sub: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '600' },
  arrow: { opacity: 0.6 },
});

// ═══ 4. K-SCAN CTA ═══
function KScanCTA({ onPress }: { onPress: () => void }) {
  return (
    <Animated.View entering={FadeInDown.delay(150).duration(400)}>
      <TouchableOpacity style={ks$.container} activeOpacity={0.85} onPress={onPress}>
        <LinearGradient
          colors={['rgba(0,229,255,0.08)', 'rgba(0,229,255,0.02)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={ks$.gradient}
        >
          <View style={ks$.iconWrap}>
            <Ionicons name="scan" size={22} color={CYAN} />
          </View>
          <View style={ks$.textCol}>
            <Text style={ks$.title}>K-SCAN</Text>
            <Text style={ks$.sub}>Aggiorna la tua identità biometrica</Text>
          </View>
          <View style={ks$.arrow}>
            <Ionicons name="chevron-forward" size={16} color={CYAN} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}
const ks$ = StyleSheet.create({
  container: {
    borderRadius: 14, overflow: 'hidden', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.12)',
  },
  gradient: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  iconWrap: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: 'rgba(0,229,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  textCol: { flex: 1, gap: 2 },
  title: { color: CYAN, fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  sub: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '600' },
  arrow: { opacity: 0.5 },
});

// ═══ 5. ACTION BUTTON ═══
function ActionButton({ icon, title, sub, color, delay, onPress }: {
  icon: string; title: string; sub: string; color: string; delay: number; onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(350)} style={ab$.wrapper}>
      <TouchableOpacity style={[ab$.card, { borderColor: color + '15' }]} activeOpacity={0.85} onPress={onPress}>
        <View style={[ab$.iconWrap, { backgroundColor: color + '10' }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <Text style={[ab$.title, { color }]} numberOfLines={1}>{title}</Text>
        <Text style={ab$.sub} numberOfLines={2}>{sub}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
const ab$ = StyleSheet.create({
  wrapper: {
    flexBasis: '48%',
    flexGrow: 0,
    flexShrink: 0,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 18,
    borderWidth: 1, padding: 16, gap: 8,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  sub: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '600', lineHeight: 14 },
});

// ═══ HEARTBEAT WIDGET (Compact) ═══
function HeartbeatWidget() {
  const [bpm, setBpm] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'ios') {
      try {
        const AHK = require('react-native-health').default;
        if (AHK) {
          AHK.initHealthKit({ permissions: { read: [AHK.Constants.Permissions.HeartRate], write: [] } }, (err: any) => {
            if (!err) { setConnected(true); }
          });
        }
      } catch { /* Not available */ }
    }
  }, []);
  return (
    <View style={hb$.container}>
      <View style={hb$.left}>
        <View style={[hb$.dot, connected ? hb$.dotActive : {}]} />
        <Ionicons name="heart" size={14} color={connected ? RED : 'rgba(255,255,255,0.12)'} />
        <Text style={hb$.label}>{connected ? 'APPLE WATCH' : 'DISPOSITIVO NON CONNESSO'}</Text>
      </View>
      {connected && bpm && (
        <View style={hb$.right}>
          <Text style={hb$.bpm}>{bpm}</Text>
          <Text style={hb$.unit}>BPM</Text>
        </View>
      )}
      {!connected && <Ionicons name="watch-outline" size={16} color="rgba(255,255,255,0.1)" />}
    </View>
  );
}
const hb$ = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,59,48,0.03)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.06)',
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)' },
  dotActive: { backgroundColor: RED },
  label: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  right: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  bpm: { color: RED, fontSize: 20, fontWeight: '900' },
  unit: { color: 'rgba(255,59,48,0.4)', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
});

// ═══ MAIN DASHBOARD ═══
function NexusDashboard() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [koreScore, setKoreScore] = useState<number | null>(null);
  const [weekData, setWeekData] = useState<Array<{ date: string; day_name: string; checked_in: boolean }>>([
    { date: '', day_name: 'LUN', checked_in: false }, { date: '', day_name: 'MAR', checked_in: false },
    { date: '', day_name: 'MER', checked_in: false }, { date: '', day_name: 'GIO', checked_in: false },
    { date: '', day_name: 'VEN', checked_in: false }, { date: '', day_name: 'SAB', checked_in: false },
    { date: '', day_name: 'DOM', checked_in: false },
  ]);
  const [checkinStreak, setCheckinStreak] = useState(0);
  const [pendingChallenge, setPendingChallenge] = useState<any>(null);
  const [showGhostBanner, setShowGhostBanner] = useState(false);
  const checkinDoneRef = useRef(false);

  // ═══ AUTO CHECK-IN (Zero-Friction) ═══
  useEffect(() => {
    if (!token || checkinDoneRef.current) return;
    checkinDoneRef.current = true;
    const autoCheckin = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const bannerKey = `@ak_checkin_banner_${today}`;
        const alreadyShown = await AsyncStorage.getItem(bannerKey).catch(() => null);
        if (alreadyShown === 'true') return;
        const todayRes = await apiClient('/checkin/today').catch(() => null);
        if (todayRes && todayRes.checked_in === true) return;
        const res = await apiClient('/checkin', { method: 'POST' }).catch(() => null);
        if (res && res.status !== 'error' && !res._error) {
          setShowGhostBanner(true);
          await AsyncStorage.setItem(bannerKey, 'true').catch(() => {});
          setTimeout(() => setShowGhostBanner(false), 5000);
        }
      } catch (e) { console.log('[AutoCheckin]', e); }
    };
    const timer = setTimeout(autoCheckin, 800);
    return () => clearTimeout(timer);
  }, [token]);

  const loadData = useCallback(async () => {
    if (!token) return;
    // KORE Score
    try {
      const uid = user?._id || user?.id;
      if (uid) {
        const d = await api.get(`/api/coach/kore-score/${uid}/breakdown`, token);
        if (d && typeof d === 'object' && !d._raw) setKoreScore(d?.total || d?.kore_score || 0);
      }
    } catch { setKoreScore(0); }
    // K-Timeline
    try {
      const weekRes = await apiClient('/checkin/week');
      if (weekRes && Array.isArray(weekRes?.week)) {
        setWeekData(weekRes.week);
        setCheckinStreak(weekRes.streak || 0);
      }
    } catch { /* silenced */ }
    // Pending challenges
    try {
      const duels = await apiClient('/duels/pending');
      if (duels && Array.isArray(duels) && duels.length > 0) {
        setPendingChallenge(duels[0]);
      }
    } catch { /* silenced */ }
  }, [token, user]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const username = (user?.username || 'KORE').toUpperCase();

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <Header />

      {/* ══ GHOST BANNER ══ */}
      <GhostBanner username={username} visible={showGhostBanner} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
      >
        {/* ══ 2. K-TIMELINE ══ */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <KTimeline weekData={weekData} streak={checkinStreak} />
        </Animated.View>

        {/* ══ 3a. BANNER SFIDA RICEVUTA ══ */}
        <PendingChallengeBanner
          pending={pendingChallenge}
          onPress={() => router.push('/duel-search' as any)}
        />

        {/* ══ 3b. K-SCAN CTA ══ */}
        <KScanCTA onPress={() => { /* Will trigger scan flow */ }} />

        {/* ══ 4. GRID OPERATIVA (6 Bottoni) ══ */}
        <View style={s.gridLabel}>
          <Text style={s.gridLabelText}>AZIONI</Text>
        </View>
        <View style={s.actionGrid}>
          <ActionButton
            icon="barbell"
            title="ALLENAMENTO"
            sub="Avvio rapido sessione di base"
            color={CYAN}
            delay={200}
            onPress={() => router.push('/(tabs)/arena' as any)}
          />
          <ActionButton
            icon="trophy"
            title="SFIDA"
            sub="Classifiche & Duelli agonistici"
            color={GOLD}
            delay={250}
            onPress={() => router.push('/duel-search' as any)}
          />
          <ActionButton
            icon="radio"
            title="LIVE"
            sub="Eventi in diretta o programmati"
            color={RED}
            delay={300}
            onPress={() => router.push('/(tabs)/arena' as any)}
          />
          <ActionButton
            icon="people"
            title="CREW"
            sub="Crea Crew, Sfida Membri"
            color={PURPLE}
            delay={350}
            onPress={() => router.push('/crews' as any)}
          />
          <ActionButton
            icon="create"
            title="CREA SFIDA"
            sub="Template Coach certificati"
            color={GOLD}
            delay={400}
            onPress={() => router.push('/(tabs)/arena' as any)}
          />
          <ActionButton
            icon="refresh"
            title="RISPONDI"
            sub="Re-match o reagisci all'ultima sfida"
            color={CYAN}
            delay={450}
            onPress={() => router.push('/duel-search' as any)}
          />
        </View>

        {/* ══ KORE SCORE COMPACT ══ */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={s.koreMini}>
          <View style={s.koreMiniLeft}>
            <Ionicons name="flash" size={14} color={GOLD} />
            <Text style={s.koreMiniLabel}>KORE SCORE</Text>
          </View>
          <View style={s.koreMiniRight}>
            <Text style={s.koreMiniValue}>{koreScore ?? '—'}</Text>
            <Text style={s.koreMiniMax}>/100</Text>
          </View>
          <View style={s.koreMiniBar}>
            <LinearGradient
              colors={[CYAN, GOLD]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.koreMiniBarFill, { width: `${Math.min(koreScore || 0, 100)}%` as any }]}
            />
          </View>
        </Animated.View>

        {/* ══ HEARTBEAT ══ */}
        <Animated.View entering={FadeInDown.delay(550).duration(400)}>
          <HeartbeatWidget />
        </Animated.View>

        {/* FOOTER */}
        <View style={s.buildInfo}>
          <Text style={s.buildText}>NÈXUS OPERATIVO · v2.6.0 · Build 31-V2</Text>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },

  // Grid label
  gridLabel: { marginBottom: 10 },
  gridLabelText: { color: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: '900', letterSpacing: 4 },

  // Action grid (2 columns)
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },

  // KORE Score compact
  koreMini: {
    backgroundColor: 'rgba(255,215,0,0.03)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)',
    padding: 14, marginBottom: 12, gap: 8,
  },
  koreMiniLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  koreMiniLabel: { color: GOLD, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  koreMiniRight: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  koreMiniValue: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  koreMiniMax: { color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: '700' },
  koreMiniBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' },
  koreMiniBarFill: { height: '100%', borderRadius: 2 },

  // Footer
  buildInfo: { alignItems: 'center', marginTop: 16, gap: 3, paddingBottom: 20 },
  buildText: { color: 'rgba(255,255,255,0.06)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
});
