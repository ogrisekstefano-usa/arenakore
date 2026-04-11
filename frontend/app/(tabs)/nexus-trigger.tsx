/**
 * NEXUS COMMAND CENTER — Build 31 · AUTO-CHECK-IN + GHOST BANNER
 * ═══════════════════════════════════════════════════════════════════
 * 4-Quadrant Grid matching original ExpoGo design:
 * [NEXUS SCAN]  [THE FORGE]
 * [HALL OF KORE] [MY DNA]
 * + KORE Score banner + HealthKit BPM widget + IRONCLAD
 * + Auto-check-in al primo accesso giornaliero
 * + Ghost Banner "Bentornato [Username], check-in effettuato"
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, RefreshControl, Dimensions, Platform, Keyboard,
  ImageBackground
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { apiClient } from '../../utils/api';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn, FadeOut, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW } = Dimensions.get('window');
const GOLD = '#FFD700';
const CYAN = '#00E5FF';
const CARD_W = (SW - 52) / 2;
const CARD_H = CARD_W * 0.75;

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

// ═══ QUADRANT CARD ═══
function QuadrantCard({ title, subtitle, icon, iconColor, image, delay, onPress }: {
  title: string; subtitle: string; icon: string; iconColor: string;
  image: string; delay: number; onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={q$.card}>
        <ImageBackground source={{ uri: image }} style={q$.bg} imageStyle={q$.bgImage}>
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
            locations={[0, 0.5, 1]}
            style={q$.grad}
          >
            {/* Corner brackets */}
            <View style={[q$.bracket, q$.tl]} />
            <View style={[q$.bracket, q$.tr]} />
            <View style={[q$.bracket, q$.bl]} />
            <View style={[q$.bracket, q$.br]} />

            <View style={q$.content}>
              <View style={[q$.iconWrap, { backgroundColor: iconColor + '15' }]}>
                <Ionicons name={icon as any} size={18} color={iconColor} />
              </View>
              <Text style={[q$.title, { color: GOLD }]}>{title}</Text>
              <Text style={q$.subtitle}>{subtitle}</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
}
const q$ = StyleSheet.create({
  card: { width: CARD_W, height: CARD_H, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  bg: { flex: 1 },
  bgImage: { borderRadius: 18, opacity: 0.5 },
  grad: { flex: 1, justifyContent: 'flex-end', padding: 14 },
  bracket: { position: 'absolute', width: 14, height: 14, borderColor: 'rgba(0,229,255,0.3)' },
  tl: { top: 10, left: 10, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  tr: { top: 10, right: 10, borderTopWidth: 1.5, borderRightWidth: 1.5 },
  bl: { bottom: 10, left: 10, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
  br: { bottom: 10, right: 10, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
  content: { gap: 4 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  subtitle: { color: CYAN, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
});

// ═══ HEARTBEAT WIDGET (HealthKit PoC) ═══
function HeartbeatWidget() {
  const [bpm, setBpm] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // HealthKit integration — on real device this reads from Apple Watch
    // For now, show placeholder. In EAS build with react-native-health, this will be live.
    if (Platform.OS === 'ios') {
      try {
        // Attempt HealthKit init — will work only in EAS build with native module
        const AppleHealthKit = require('react-native-health').default;
        if (AppleHealthKit) {
          const permissions = {
            permissions: {
              read: [AppleHealthKit.Constants.Permissions.HeartRate],
              write: [],
            },
          };
          AppleHealthKit.initHealthKit(permissions, (err: any) => {
            if (err) {
              console.log('[HealthKit] Not available:', err);
              return;
            }
            setConnected(true);
            // Poll heart rate every 5 seconds
            const poll = () => {
              const options = {
                unit: 'bpm',
                startDate: new Date(Date.now() - 3600000).toISOString(),
                endDate: new Date().toISOString(),
                limit: 1,
                ascending: false,
              };
              AppleHealthKit.getHeartRateSamples(options, (e: any, results: any[]) => {
                if (!e && results && results.length > 0) {
                  setBpm(Math.round(results[0].value));
                }
              });
            };
            poll();
            const iv = setInterval(poll, 5000);
            return () => clearInterval(iv);
          });
        }
      } catch (e) {
        // Module not available (web preview or dev client without native module)
        console.log('[HealthKit] Module not available in this environment');
      }
    }
  }, []);

  return (
    <View style={hb$.container}>
      <View style={hb$.left}>
        <View style={[hb$.heartDot, connected && bpm ? hb$.heartDotActive : {}]} />
        <Ionicons name="heart" size={16} color={connected && bpm ? '#FF3B30' : 'rgba(255,255,255,0.15)'} />
        <Text style={hb$.label}>
          {connected && bpm ? 'APPLE WATCH' : 'DISPOSITIVO NON CONNESSO'}
        </Text>
      </View>
      <View style={hb$.right}>
        {connected && bpm ? (
          <>
            <Text style={hb$.bpmValue}>{bpm}</Text>
            <Text style={hb$.bpmUnit}>BPM</Text>
          </>
        ) : (
          <View style={hb$.watchIcon}>
            <Ionicons name="watch-outline" size={18} color="rgba(255,255,255,0.12)" />
          </View>
        )}
      </View>
    </View>
  );
}
const hb$ = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,59,48,0.04)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.08)',
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heartDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)' },
  heartDotActive: { backgroundColor: '#FF3B30' },
  label: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  right: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bpmValue: { color: '#FF3B30', fontSize: 24, fontWeight: '900' },
  bpmUnit: { color: 'rgba(255,59,48,0.5)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  watchIcon: { opacity: 0.5 },
});

// ═══ GHOST BANNER — "Bentornato [Username], check-in effettuato" ═══
function GhostBanner({ username, visible }: { username: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <Animated.View
      entering={SlideInUp.duration(600)}
      exiting={FadeOut.duration(800)}
      style={gb$.container}
    >
      <LinearGradient
        colors={['rgba(0,229,255,0.12)', 'rgba(0,229,255,0.03)', 'transparent']}
        style={gb$.gradient}
      >
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
  container: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
  },
  gradient: {
    paddingTop: 8, paddingBottom: 16, paddingHorizontal: 20,
  },
  inner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#00E5FF', alignItems: 'center', justifyContent: 'center',
  },
  textCol: { flex: 1, gap: 1 },
  title: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  sub: { color: 'rgba(0,229,255,0.6)', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
});

// ═══ CARD IMAGES ═══
const QUAD_IMAGES = {
  nexusScan: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?crop=entropy&cs=srgb&fm=jpg&q=75&w=600',
  forge: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?crop=entropy&cs=srgb&fm=jpg&q=75&w=600',
  hall: 'https://images.unsplash.com/photo-1569517282132-25d22f4573e6?crop=entropy&cs=srgb&fm=jpg&q=75&w=600',
  dna: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?crop=entropy&cs=srgb&fm=jpg&q=75&w=600',
};

// ═══ MAIN DASHBOARD ═══
function NexusDashboard() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [koreScore, setKoreScore] = useState<number | null>(null);
  const [eligibility, setEligibility] = useState<any>(null);
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

        // Check if we already showed banner today
        const alreadyShown = await AsyncStorage.getItem(bannerKey).catch(() => null);
        if (alreadyShown === 'true') return;

        // Check if already checked in today
        const todayRes = await apiClient('/checkin/today').catch(() => null);
        if (todayRes && todayRes.checked_in === true) {
          // Already checked in but haven't shown banner this session
          return;
        }

        // Perform silent check-in
        const res = await apiClient('/checkin', { method: 'POST' }).catch(() => null);
        if (res && res.status !== 'error' && !res._error) {
          // Show Ghost Banner
          setShowGhostBanner(true);
          await AsyncStorage.setItem(bannerKey, 'true').catch(() => {});

          // Hide after 5 seconds
          setTimeout(() => {
            setShowGhostBanner(false);
          }, 5000);
        }
      } catch (e) {
        console.log('[AutoCheckin] Silent error:', e);
      }
    };

    // Small delay to let the UI render first
    const timer = setTimeout(autoCheckin, 800);
    return () => clearTimeout(timer);
  }, [token]);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const uid = user?._id || user?.id;
      if (uid) {
        const d = await api.get(`/api/coach/kore-score/${uid}/breakdown`, token);
        if (d && typeof d === 'object' && !d._raw) setKoreScore(d?.total || d?.kore_score || 0);
      }
    } catch { setKoreScore(0); }
    try {
      const e = await api.getRescanEligibility(token);
      if (e && !e._error) setEligibility(e);
    } catch { /* silenced */ }
  }, [token, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const username = (user?.username || 'KORE').toUpperCase();
  const role = user?.role || 'ATHLETE';
  const isFounder = user?.is_founder || user?.is_admin || user?.founder_number;
  const akCredits = user?.ak_credits ?? 0;

  // Countdown for next validation scan
  const nextScanText = eligibility?.can_scan
    ? 'SCAN DISPONIBILE'
    : eligibility?.message || 'BIOMECH STANDBY';

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* ══ GHOST BANNER (Auto-check-in feedback) ══ */}
      <GhostBanner username={username} visible={showGhostBanner} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
      >
        {/* ══ HEADER ══ */}
        <Animated.View entering={FadeIn.duration(500)} style={s.header}>
          <View style={s.headerBrand}>
            <Text style={s.brandLabel}>ARENAKORE</Text>
            <Text style={s.brandTitle}>NEXUS</Text>
            <Text style={s.brandSub}>COMMAND CENTER</Text>
          </View>
          <View style={s.headerRight}>
            {isFounder && (
              <View style={s.founderBadge}>
                <Ionicons name="star" size={10} color={GOLD} />
                <Text style={s.founderText}>FOUNDER</Text>
              </View>
            )}
            <View style={s.akBadge}>
              <Text style={s.akEmoji}>⚡</Text>
              <Text style={s.akValue}>{akCredits}</Text>
            </View>
          </View>
        </Animated.View>

        {/* User identity */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={s.identityRow}>
          <View style={[s.avatar, { backgroundColor: user?.avatar_color || GOLD }]}>
            <Text style={s.avatarLetter}>{username[0]}</Text>
          </View>
          <View style={s.identityInfo}>
            <Text style={s.username}>{username}</Text>
            <View style={s.rolePill}>
              <Ionicons name="shield-checkmark" size={10} color={CYAN} />
              <Text style={s.roleText}>{role.toUpperCase()}</Text>
            </View>
          </View>
        </Animated.View>

        {/* BIOMECH STATUS */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.statusBanner}>
          <View style={s.statusLeft}>
            <View style={[s.statusDot, eligibility?.can_scan ? s.statusDotActive : s.statusDotStandby]} />
            <Text style={s.statusText}>
              {eligibility?.can_scan ? 'FULL BIOMECH ACTIVE' : 'BIOMECH STANDBY'}
            </Text>
          </View>
          <Text style={s.statusCountdown}>{nextScanText}</Text>
        </Animated.View>

        {/* KORE SCORE MINI */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={s.koreMini}>
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

        {/* HEARTBEAT WIDGET */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <HeartbeatWidget />
        </Animated.View>

        {/* ══ 4 QUADRANT GRID ══ */}
        <View style={s.quadGrid}>
          <QuadrantCard
            title="NEXUS SCAN"
            subtitle="BIO-SKELETON TRACKING"
            icon="scan"
            iconColor={CYAN}
            image={QUAD_IMAGES.nexusScan}
            delay={250}
            onPress={() => { /* Will trigger scanning flow */ }}
          />
          <QuadrantCard
            title="THE FORGE"
            subtitle="CREA · SELEZIONA · SFIDA"
            icon="hammer"
            iconColor={GOLD}
            image={QUAD_IMAGES.forge}
            delay={300}
            onPress={() => router.push('/(tabs)/arena')}
          />
          <QuadrantCard
            title="HALL OF KORE"
            subtitle="LEADERBOARD GLOBALE"
            icon="trophy"
            iconColor={GOLD}
            image={QUAD_IMAGES.hall}
            delay={350}
            onPress={() => router.push('/(tabs)/hall')}
          />
          <QuadrantCard
            title="MY DNA"
            subtitle="STATS RADAR BIOMETRICO"
            icon="analytics"
            iconColor={CYAN}
            image={QUAD_IMAGES.dna}
            delay={400}
            onPress={() => router.push('/(tabs)/dna')}
          />
        </View>

        {/* ══ COACH-ONLY: Template & Challenge Creation ══ */}
        {(role === 'COACH' || role === 'coach' || role === 'GYM_OWNER' || role === 'SUPER_ADMIN' || role === 'admin') && (
          <Animated.View entering={FadeInDown.delay(450).duration(400)} style={s.coachSection}>
            <View style={s.coachHeader}>
              <Ionicons name="shield-checkmark" size={12} color={GOLD} />
              <Text style={s.coachTitle}>COACH TOOLS</Text>
            </View>
            <View style={s.coachGrid}>
              <TouchableOpacity style={s.coachBtn} activeOpacity={0.85} onPress={() => router.push('/(tabs)/arena')}>
                <Ionicons name="document-text" size={18} color={GOLD} />
                <Text style={s.coachBtnTitle}>GESTIONE TEMPLATE</Text>
                <Text style={s.coachBtnSub}>Crea e gestisci workout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.coachBtn} activeOpacity={0.85} onPress={() => router.push('/(tabs)/arena')}>
                <Ionicons name="flash" size={18} color={CYAN} />
                <Text style={s.coachBtnTitle}>CREA SFIDA</Text>
                <Text style={s.coachBtnSub}>Lancia una nuova challenge</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* FOOTER */}
        <View style={s.buildInfo}>
          <Text style={s.buildText}>NEXUS COMMAND CENTER · v2.5.0 · Build 31</Text>
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
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerBrand: {},
  brandLabel: { color: 'rgba(255,255,255,0.20)', fontSize: 11, fontWeight: '900', letterSpacing: 5 },
  brandTitle: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', letterSpacing: -1, marginTop: -2 },
  brandSub: { color: 'rgba(255,255,255,0.12)', fontSize: 10, fontWeight: '900', letterSpacing: 4 },
  headerRight: { alignItems: 'flex-end', gap: 8 },
  founderBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
  },
  founderText: { color: GOLD, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  akBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,229,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.12)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  akEmoji: { fontSize: 14 },
  akValue: { color: CYAN, fontSize: 16, fontWeight: '900' },

  // Identity
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: '#000', fontSize: 22, fontWeight: '900' },
  identityInfo: { flex: 1, gap: 4 },
  username: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,229,255,0.06)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  roleText: { color: CYAN, fontSize: 9, fontWeight: '900', letterSpacing: 2 },

  // Status Banner
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusDotActive: { backgroundColor: '#32D74B' },
  statusDotStandby: { backgroundColor: 'rgba(255,255,255,0.15)' },
  statusText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  statusCountdown: { color: CYAN, fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  // KORE Score Mini
  koreMini: {
    backgroundColor: 'rgba(255,215,0,0.03)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)',
    padding: 14, marginBottom: 12, gap: 8,
  },
  koreMiniLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  koreMiniLabel: { color: GOLD, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  koreMiniRight: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  koreMiniValue: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  koreMiniMax: { color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: '700' },
  koreMiniBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' },
  koreMiniBarFill: { height: '100%', borderRadius: 2 },

  // Quadrant Grid
  quadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },

  // Coach Tools (role-based)
  coachSection: { marginBottom: 20, gap: 10 },
  coachHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coachTitle: { color: GOLD, fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  coachGrid: { flexDirection: 'row', gap: 10 },
  coachBtn: {
    flex: 1, backgroundColor: 'rgba(255,215,0,0.04)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)',
    padding: 16, alignItems: 'center', gap: 8,
  },
  coachBtnTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  coachBtnSub: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '600', textAlign: 'center' },

  // Build
  buildInfo: { alignItems: 'center', marginTop: 16, gap: 3, paddingBottom: 20 },
  buildText: { color: 'rgba(255,255,255,0.06)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
});
