/**
 * NÈXUS PREMIUM — Build 32 · NIKE AESTHETIC REBUILD
 * ════════════════════════════════════════════════════
 * Design: "Nike Premium" — L'atleta e l'azione sono centrali.
 * 
 * Gerarchia:
 * 1. Header Universale
 * 2. Ghost Banner (auto-check-in, 5s)
 * 3. K-Timeline (7 indicatori) + K-SCAN CTA
 * 4. Banner Sfida Ricevuta (se pendente)
 * 5. Hero Card Grid (6 azioni con foto sport + vignette)
 * 6. KORE Score compact + HealthKit
 *
 * IRONCLAD network layer — safe JSON, no crash.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, RefreshControl, Dimensions, Platform, ImageBackground, Image
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
import { RPESelector } from '../../components/RPESelector';

const { width: SW } = Dimensions.get('window');
const GOLD = '#FFD700';
const CYAN = '#00E5FF';
const PURPLE = '#BF5AF2';
const RED = '#FF3B30';

// ═══ SPORT PHOTO POOL — BUILD 36: Unique images per sport, NO repeats ═══
const SPORT_PHOTOS = {
  training: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=75&auto=format',
  ],
  challenge: [
    'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=600&q=75&auto=format',
  ],
  live: [
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&q=75&auto=format',
  ],
  crew: [
    'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=600&q=75&auto=format',
  ],
  create: [
    'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=600&q=75&auto=format',
  ],
  respond: [
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=75&auto=format',
  ],
};

function getRandomPhoto(category: keyof typeof SPORT_PHOTOS): string {
  const photos = SPORT_PHOTOS[category];
  return photos[Math.floor(Math.random() * photos.length)];
}

// ═══ ERROR BOUNDARY ═══
class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: any) { super(props); this.state = { hasError: false, errorMsg: '' }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, errorMsg: error.message }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[NEXUS CRASH]', error.message);
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

// ═══ GHOST BANNER ═══
function GhostBanner({ username, visible }: { username: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <Animated.View entering={SlideInUp.duration(600)} exiting={FadeOut.duration(800)} style={gb$.container}>
      <View style={gb$.inner}>
        <View style={gb$.checkCircle}><Ionicons name="checkmark" size={12} color="#000" /></View>
        <View style={gb$.textCol}>
          <Text style={gb$.title}>BENTORNATO {username}</Text>
          <Text style={gb$.sub}>check-in effettuato</Text>
        </View>
      </View>
    </Animated.View>
  );
}
const gb$ = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingHorizontal: 20, paddingTop: 8 },
  inner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,229,255,0.1)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  checkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: CYAN, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1, gap: 1 },
  title: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  sub: { color: 'rgba(0,229,255,0.6)', fontSize: 11, fontWeight: '600' },
});

// ═══ K-TIMELINE (Compact) ═══
function KTimeline({ weekData, streak }: { weekData: Array<{ date: string; day_name: string; checked_in: boolean }>; streak: number }) {
  const today = new Date().toISOString().split('T')[0];
  // Count checked-in days this week
  const checkedCount = weekData.filter(d => d.checked_in).length;

  return (
    <View style={kt$.container}>
      <View style={kt$.header}>
        <View style={kt$.titleRow}>
          <Ionicons name="calendar" size={11} color={GOLD} />
          <Text style={kt$.title}>K-TIMELINE</Text>
        </View>
        <View style={kt$.counterBadge}>
          <Text style={kt$.counterNum}>{checkedCount}</Text>
          <Text style={kt$.counterSlash}>/7</Text>
        </View>
      </View>
      <View style={kt$.days}>
        {weekData.map((d, i) => {
          const isToday = d.date === today;
          return (
            <View key={i} style={kt$.dayCol}>
              <View style={[kt$.circle, d.checked_in && kt$.done, isToday && !d.checked_in && kt$.today]}>
                {d.checked_in ? <Ionicons name="checkmark" size={10} color="#000" /> :
                 isToday ? <View style={kt$.todayDot} /> : <Text style={kt$.dash}>—</Text>}
              </View>
              <Text style={[kt$.dayLabel, isToday && { color: GOLD }]}>{d.day_name}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
const kt$ = StyleSheet.create({
  container: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 12, marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { color: GOLD, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  counterBadge: { flexDirection: 'row', alignItems: 'baseline' },
  counterNum: { color: CYAN, fontSize: 18, fontWeight: '900' },
  counterSlash: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '800' },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 4 },
  circle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: CYAN, borderColor: CYAN },
  today: { borderColor: GOLD, borderWidth: 2 },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: GOLD },
  dash: { color: 'rgba(255,255,255,0.1)', fontSize: 9 },
  dayLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
});

// ═══ K-SCAN CTA (Clean, Nike style) ═══
function KScanCTA({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={ks$.container} activeOpacity={0.85} onPress={onPress}>
      <View style={ks$.icon}><Ionicons name="scan" size={18} color={CYAN} /></View>
      <View style={ks$.text}>
        <Text style={ks$.title}>K-SCAN</Text>
        <Text style={ks$.sub}>Aggiorna identità biometrica</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color="rgba(0,229,255,0.3)" />
    </TouchableOpacity>
  );
}
const ks$ = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,229,255,0.04)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.1)',
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(0,229,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
  title: { color: CYAN, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  sub: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '600' },
});

// ═══ PENDING CHALLENGE BANNER (Nike Style) ═══
function ChallengeBanner({ pending, onPress }: { pending: any | null; onPress: () => void }) {
  if (!pending) return null;
  return (
    <Animated.View entering={FadeInDown.delay(80).duration(400)}>
      <TouchableOpacity style={cb$.container} activeOpacity={0.85} onPress={onPress}>
        <LinearGradient colors={['rgba(255,215,0,0.12)', 'rgba(255,215,0,0.03)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={cb$.gradient}>
          <Ionicons name="flash" size={16} color={GOLD} />
          <Text style={cb$.text} numberOfLines={1}>
            <Text style={cb$.bold}>{(pending.challenger || 'ATLETA').toUpperCase()}</Text> ti ha sfidato! Accetta subito...
          </Text>
          <Ionicons name="chevron-forward" size={14} color={GOLD} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}
const cb$ = StyleSheet.create({
  container: { borderRadius: 12, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)' },
  gradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11 },
  text: { flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  bold: { color: GOLD, fontWeight: '900' },
});

// ═══ HERO CARD (Nike Premium) ═══
function HeroCard({ icon, title, sub, color, imageUri, delay, onPress, size }: {
  icon: string; title: string; sub: string; color: string; imageUri: string;
  delay: number; onPress: () => void; size: 'half' | 'full';
}) {
  const cardHeight = size === 'full' ? 140 : 155;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500)} style={size === 'half' ? hc$.halfWrapper : hc$.fullWrapper}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[hc$.card, { height: cardHeight }]}>
        <ImageBackground
          source={{ uri: imageUri }}
          style={hc$.imageBg}
          imageStyle={hc$.imageStyle}
          resizeMode="cover"
        >
          {/* Vignette dark overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)']}
            locations={[0, 0.4, 1]}
            style={hc$.vignette}
          >
            {/* Icon top-left */}
            <View style={[hc$.iconCircle, { backgroundColor: color + '20', borderColor: color + '30' }]}>
              <Ionicons name={icon as any} size={18} color={color} />
            </View>

            {/* Text bottom */}
            <View style={hc$.textArea}>
              <Text style={[hc$.title, { color }]}>{title}</Text>
              <Text style={hc$.sub}>{sub}</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
}
const hc$ = StyleSheet.create({
  halfWrapper: {
    width: '48%',
  },
  fullWrapper: {
    width: '100%',
  },
  card: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  imageBg: { flex: 1, width: '100%', height: '100%' },
  imageStyle: { borderRadius: 20 },
  vignette: {
    flex: 1, justifyContent: 'space-between', padding: 14,
    borderRadius: 20,
  },
  iconCircle: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, alignSelf: 'flex-start',
  },
  textArea: { gap: 2 },
  title: { fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
  sub: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
});

// HeartbeatWidget REMOVED — Build 34 (K-Rating replaces it)

// ═══ MAIN DASHBOARD ═══
function NexusDashboard() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [koreScore, setKoreScore] = useState<number | null>(null);
  const [koreData, setKoreData] = useState<any>(null);
  const [showRPE, setShowRPE] = useState(false);
  const [weekData, setWeekData] = useState([
    { date: '', day_name: 'LUN', checked_in: false }, { date: '', day_name: 'MAR', checked_in: false },
    { date: '', day_name: 'MER', checked_in: false }, { date: '', day_name: 'GIO', checked_in: false },
    { date: '', day_name: 'VEN', checked_in: false }, { date: '', day_name: 'SAB', checked_in: false },
    { date: '', day_name: 'DOM', checked_in: false },
  ]);
  const [checkinStreak, setCheckinStreak] = useState(0);
  const [pendingChallenge, setPendingChallenge] = useState<any>(null);
  const [showGhostBanner, setShowGhostBanner] = useState(false);
  const [respondEligible, setRespondEligible] = useState(false);
  const checkinDoneRef = useRef(false);

  // Random photo selection per render/refresh
  const [photoKey, setPhotoKey] = useState(0);
  const cardPhotos = useMemo(() => ({
    training: getRandomPhoto('training'),
    challenge: getRandomPhoto('challenge'),
    live: getRandomPhoto('live'),
    crew: getRandomPhoto('crew'),
    create: getRandomPhoto('create'),
    respond: getRandomPhoto('respond'),
  }), [photoKey]);

  // ═══ AUTO CHECK-IN ═══
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
      } catch { /* silent */ }
    };
    const timer = setTimeout(autoCheckin, 800);
    return () => clearTimeout(timer);
  }, [token]);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const uid = user?._id || user?.id;
      if (uid) {
        const d = await api.get(`/api/coach/kore-score/${uid}/breakdown`, token);
        if (d && typeof d === 'object' && !d._raw) {
          const ks = d?.kore_score || d;
          setKoreScore(ks?.score || ks?.total || 0);
          setKoreData(ks);
        }
      }
    } catch { setKoreScore(0); }
    try {
      const weekRes = await apiClient('/checkin/week');
      if (weekRes && Array.isArray(weekRes?.week)) { setWeekData(weekRes.week); setCheckinStreak(weekRes.streak || 0); }
    } catch { /* */ }
    try {
      const duels = await apiClient('/duels/pending');
      if (duels && Array.isArray(duels) && duels.length > 0) setPendingChallenge(duels[0]);
    } catch { /* */ }
    try {
      const resp = await apiClient('/challenges/respond-eligible');
      if (resp && resp.eligible) setRespondEligible(true);
      else setRespondEligible(false);
    } catch { /* */ }
  }, [token, user]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = async () => {
    setRefreshing(true);
    setPhotoKey(k => k + 1); // Rotate photos on refresh
    await loadData();
    setRefreshing(false);
  };

  const handleRPESubmit = async (rpe: number) => {
    try {
      await apiClient('/activity/rpe', { method: 'POST', body: JSON.stringify({ rpe }) });
      setShowRPE(false);
      loadData();
    } catch { setShowRPE(false); }
  };


  const username = (user?.username || 'KORE').toUpperCase();

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <Header />
      <GhostBanner username={username} visible={showGhostBanner} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
      >
        {/* K-TIMELINE */}
        <KTimeline weekData={weekData} streak={checkinStreak} />

        {/* ═══ K-RATING PROMINENTE (0-1000) — NIKE PREMIUM ═══ */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.kRatingCard}>
          <View style={s.kRatingHeader}>
            <Text style={s.kRatingLabel}>K-RATING</Text>
            {koreData?.bio_verified ? (
              <View style={s.bioVerifiedBadge}>
                <Ionicons name="shield-checkmark" size={10} color={CYAN} />
                <Text style={s.bioVerifiedText}>BIO-VERIFIED</Text>
              </View>
            ) : (
              <TouchableOpacity style={s.rpeBadge} onPress={() => setShowRPE(true)} activeOpacity={0.7}>
                <Text style={s.rpeBadgeText}>⚡ RPE</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={s.kRatingRow}>
            <Text style={s.kRatingValue}>{(koreScore !== null && koreScore > 0) ? koreScore : '---'}</Text>
            <View style={s.kRatingMaxWrap}>
              <Text style={s.kRatingSlash}>/</Text>
              <Text style={s.kRatingMax}>1000</Text>
            </View>
            {(koreScore === null || koreScore === 0) && (
              <TouchableOpacity style={s.kScanInvite} activeOpacity={0.8} onPress={() => router.push('/k-scan' as any)}>
                <Ionicons name="scan" size={12} color={CYAN} />
                <Text style={s.kScanInviteText}>AVVIA K-SCAN</Text>
              </TouchableOpacity>
            )}
            {koreScore !== null && koreScore > 0 && koreData?.weekly_trend !== undefined && koreData.weekly_trend !== 0 && (
              <View style={[s.trendBadge, koreData.weekly_trend > 0 ? s.trendUp : s.trendDown]}>
                <Ionicons name={koreData.weekly_trend > 0 ? 'trending-up' : 'trending-down'} size={14} color={koreData.weekly_trend > 0 ? '#32D74B' : '#FF453A'} />
                <Text style={[s.trendText, koreData.weekly_trend > 0 ? s.trendTextUp : s.trendTextDown]}>
                  {koreData.weekly_trend > 0 ? '+' : ''}{koreData.weekly_trend}
                </Text>
              </View>
            )}
          </View>
          <View style={s.kRatingBar}>
            <LinearGradient
              colors={[CYAN, GOLD]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.kRatingBarFill, { width: `${koreScore !== null ? Math.min(koreScore / 10, 100) : 0}%` as any }]}
            />
          </View>
          {/* Breakdown */}
          {koreData?.breakdown && (
            <View style={s.breakdownRow}>
              {Object.values(koreData.breakdown).map((p: any, i: number) => (
                <View key={i} style={s.breakdownPillar}>
                  <View style={[s.breakdownDot, { backgroundColor: p.color }]} />
                  <Text style={s.breakdownLabel}>{p.label}</Text>
                  <Text style={[s.breakdownVal, { color: p.color }]}>{p.contribution}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* ═══ HERO CARD GRID — 4 Sport Cards ═══ */}
        <View style={s.heroGrid}>
          <HeroCard
            icon="barbell"
            title="ALLENAMENTO"
            sub="Sessione rapida con timer & RPE"
            color={CYAN}
            imageUri={cardPhotos.training}
            delay={100}
            size="half"
            onPress={() => router.push('/training-session' as any)}
          />
          <HeroCard
            icon="trophy"
            title="SFIDA"
            sub="Classifiche & Duelli Agonistici"
            color={GOLD}
            imageUri={cardPhotos.challenge}
            delay={150}
            size="half"
            onPress={() => router.push('/duel-search' as any)}
          />
          <HeroCard
            icon="radio"
            title="LIVE"
            sub="Sfide in corso & programmate"
            color={RED}
            imageUri={cardPhotos.live}
            delay={200}
            size="half"
            onPress={() => router.push('/live-challenges' as any)}
          />
          <HeroCard
            icon="people"
            title="CREW"
            sub="Gestisci il tuo Branco"
            color={GOLD}
            imageUri={cardPhotos.crew}
            delay={250}
            size="half"
            onPress={() => router.push('/crews' as any)}
          />
        </View>

        {/* ═══ DIVIDER — BUILD 36 ═══ */}
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginHorizontal: 4, marginBottom: 12 }} />

        {/* ═══ ACTION CARDS — Crea Sfida + K-Scan (Separated) ═══ */}
        <View style={s.heroGrid}>
          <HeroCard
            icon="create"
            title="CREA SFIDA"
            sub="Template Coach Professionali"
            color={GOLD}
            imageUri={cardPhotos.create}
            delay={300}
            size="half"
            onPress={() => router.push('/create-challenge' as any)}
          />
          {respondEligible ? (
            <HeroCard
              icon="refresh"
              title="RISPONDI"
              sub="Rivincita o Sfida Pendente!"
              color={RED}
              imageUri={cardPhotos.respond}
              delay={350}
              size="half"
              onPress={() => router.push('/live-challenges' as any)}
            />
          ) : (
            <HeroCard
              icon="body"
              title="K-SCAN"
              sub="Bio-Analisi Puppet Motion"
              color={CYAN}
              imageUri={cardPhotos.respond}
              delay={350}
              size="half"
              onPress={() => router.push('/k-scan' as any)}
            />
          )}
        </View>

        {/* FOOTER */}
        <View style={s.footer}>
          <Text style={s.footerText}>ARENAKORE · v3.6.0 · Build 36</Text>
        </View>
      </ScrollView>

      {/* RPE SELECTOR MODAL */}
      <RPESelector
        visible={showRPE}
        onClose={() => setShowRPE(false)}
        onSubmit={handleRPESubmit}
      />
    </View>
  );
}

export default function NexusTriggerSafe() {
  return (
    <DashboardErrorBoundary>
      <NexusDashboard />
    </DashboardErrorBoundary>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 10 },

  // Hero grid
  heroGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginBottom: 16,
  },

  // K-RATING PROMINENTE — BUILD 36: Bigger text, no purple
  kRatingCard: {
    backgroundColor: 'rgba(0,229,255,0.04)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.12)',
    padding: 20, marginBottom: 16, gap: 12,
  },
  kRatingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kRatingLabel: { color: CYAN, fontSize: 14, fontWeight: '900', letterSpacing: 4 },
  kRatingRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, flexWrap: 'wrap' },
  kRatingValue: {
    color: CYAN, fontSize: 80, fontWeight: '900',
    letterSpacing: -4, lineHeight: 84,
    fontStyle: 'italic',
  },
  kRatingMaxWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 0, marginLeft: 2 },
  kRatingSlash: { color: 'rgba(0,229,255,0.2)', fontSize: 36, fontWeight: '300', fontStyle: 'italic' },
  kRatingMax: { color: 'rgba(0,229,255,0.2)', fontSize: 26, fontWeight: '700', fontStyle: 'italic' },
  kRatingBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' },
  kRatingBarFill: { height: '100%', borderRadius: 3 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 12 },
  trendUp: { backgroundColor: 'rgba(50,215,75,0.12)' },
  trendDown: { backgroundColor: 'rgba(255,69,58,0.12)' },
  trendText: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  trendTextUp: { color: '#32D74B' },
  trendTextDown: { color: '#FF453A' },
  kScanInvite: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,229,255,0.08)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 12, borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)' },
  kScanInviteText: { color: CYAN, fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  // Bio / RPE badges — BUILD 36: RPE is amber (not purple)
  bioVerifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,229,255,0.08)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)',
  },
  bioVerifiedText: { color: CYAN, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  rpeBadge: {
    backgroundColor: 'rgba(255,159,10,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,159,10,0.2)',
  },
  rpeBadgeText: { color: '#FF9F0A', fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  // Breakdown — BUILD 36: Bigger text
  breakdownRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  breakdownPillar: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  breakdownDot: { width: 6, height: 6, borderRadius: 3 },
  breakdownLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  breakdownVal: { fontSize: 13, fontWeight: '900' },

  footer: { alignItems: 'center', marginTop: 12, paddingBottom: 16 },
  footerText: { color: 'rgba(255,255,255,0.04)', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
});
