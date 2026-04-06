/**
 * ARENAKORE — ARENA TAB v4.0 — CREW BATTLE ENGINE
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar,
  TouchableOpacity, Dimensions, ImageBackground, ActivityIndicator, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeInDown, useSharedValue,
  withRepeat, withSequence, withTiming, useAnimatedStyle, Easing, withSpring,
  interpolateColor
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { TAB_BACKGROUNDS } from '../../utils/images';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { CrewBattleDashboard } from '../../components/CrewBattleDashboard';
import { ToolLock } from '../../components/KoreVault';
import { ChallengeInviteModal } from '../../components/crew/ChallengeInviteModal';
import { CertBadge } from '../../components/CertBadge';

const { width: SW } = Dimensions.get('window');

const KORE_OF_DAY = {
  username: 'THUNDER_MAN',
  sport: 'MMA',
  achievement: 'RECORD PERSONALE',
  value: '47 REP',
  exercise: 'DEEP SQUAT',
  xp: '+340 FLUX',
  rank: '#12',
  level: 14
};

// DIVISION_UPDATES removed - EliteDivisionUpdates replaced by LiveBattleDashboard


// ========== HERO BANNER ==========
function HeroBanner() {
  const pulse = useSharedValue(0.6);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 2000 }), withTiming(0.6, { duration: 2000 })), -1, false
    );
  }, []);
  const lineStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View entering={FadeIn.duration(500)} style={hero$.wrap}>
      <LinearGradient colors={['#0A0A0A', '#000000']} style={hero$.grad}>
        {/* Corner brackets */}
        <View style={hero$.tlBracket} />
        <View style={hero$.trBracket} />
        <View style={hero$.blBracket} />
        <View style={hero$.brBracket} />

        <View style={hero$.inner}>
          <Text style={hero$.brandLine}>ARENAKORE</Text>
          <Text style={hero$.titleLine}>COMMUNITY{`\n`}HUB</Text>
          <Animated.View style={[hero$.cyanLine, lineStyle]} />
          <Text style={hero$.tagLine}>DOVE L'ELITE SI CONFRONTA</Text>
        </View>

        <View style={hero$.statsRow}>
          {[
            { label: 'KORE ATTIVI', val: '1,240', icon: 'people' as const },
            { label: 'SESSIONI OGGI', val: '384', icon: 'flash' as const },
            { label: 'RECORD BATTUTI', val: '23', icon: 'trophy' as const },
          ].map((s, i) => (
            <View key={i} style={hero$.statItem}>
              <Ionicons name={s.icon} size={14} color="#00E5FF" />
              <Text style={hero$.statVal}>{s.val}</Text>
              <Text style={hero$.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const hero$ = StyleSheet.create({
  wrap: { marginHorizontal: 24, marginTop: 8, marginBottom: 16 },
  grad: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)'
  },
  tlBracket: { position: 'absolute', top: 12, left: 12, width: 20, height: 20, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#00E5FF', opacity: 0.5 },
  trBracket: { position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#00E5FF', opacity: 0.5 },
  blBracket: { position: 'absolute', bottom: 44, left: 12, width: 20, height: 20, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#00E5FF', opacity: 0.25 },
  brBracket: { position: 'absolute', bottom: 44, right: 12, width: 20, height: 20, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#00E5FF', opacity: 0.25 },
  inner: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20, alignItems: 'center', gap: 8 },
  brandLine: { color: '#AAAAAA', fontSize: 13, fontWeight: '900', letterSpacing: 6 },
  titleLine: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center', lineHeight: 41 },
  cyanLine: { width: 60, height: 2, backgroundColor: '#00E5FF', borderRadius: 1 },
  tagLine: { color: 'rgba(255,255,255,0.30)', fontSize: 14, fontWeight: '700', letterSpacing: 3, textAlign: 'center' },
  statsRow: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)'
  },
  statItem: {
    flex: 1, alignItems: 'center', gap: 3, paddingVertical: 12,
    borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.04)'
  },
  statVal: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  statLabel: { color: 'rgba(255,255,255,0.30)', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' }
});

// ========== KORE OF THE DAY ==========
const KORE_HERO = 'https://images.pexels.com/photos/17956257/pexels-photo-17956257.jpeg?auto=compress&cs=tinysrgb&w=800&q=60';

function KoreOfTheDay() {
  return (
    <Animated.View entering={FadeInDown.delay(100)} style={kotd$.container}>
      <ImageBackground source={{ uri: KORE_HERO }} style={kotd$.card} imageStyle={kotd$.cardImage}>
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(5,5,5,0.6)', 'rgba(5,5,5,0.97)']}
          locations={[0, 0.45, 0.85]}
          style={kotd$.grad}
        >
          <View style={kotd$.livePill}>
            <View style={kotd$.liveDot} />
            <Text style={kotd$.liveText}>KORE OF THE DAY</Text>
          </View>

          <View style={kotd$.bottom}>
            <Text style={kotd$.name} numberOfLines={1}>{KORE_OF_DAY.username}</Text>
            <View style={kotd$.detailsRow}>
              <View style={kotd$.avatar}>
                <Text style={kotd$.avatarLetter}>T</Text>
              </View>
              <View style={kotd$.info}>
                <Text style={kotd$.sport}>{KORE_OF_DAY.sport} · RANK {KORE_OF_DAY.rank}</Text>
              </View>
              <View style={kotd$.record}>
                <Text style={kotd$.recordVal}>{KORE_OF_DAY.value}</Text>
                <Text style={kotd$.recordLabel}>{KORE_OF_DAY.achievement}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </Animated.View>
  );
}

const kotd$ = StyleSheet.create({
  container: { marginHorizontal: 24, marginBottom: 8 },
  card: { height: 180, borderRadius: 20, overflow: 'hidden' },
  cardImage: { borderRadius: 20 },
  grad: { flex: 1, justifyContent: 'space-between', padding: 16 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF3B30' },
  liveText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  bottom: { gap: 8 },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  info: { flex: 1, gap: 2 },
  name: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  sport: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '300', letterSpacing: 1.5 },
  record: { alignItems: 'flex-end' },
  recordVal: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', letterSpacing: 0.5 },
  recordLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '300', letterSpacing: 1.5 }
});

// ========== ELITE ACTIVITY FEED — Visual Cards ==========
const FEED_IMAGES = [
  'https://images.pexels.com/photos/35005240/pexels-photo-35005240.jpeg?auto=compress&cs=tinysrgb&w=800&q=60',
  'https://images.unsplash.com/photo-1473091540282-9b846e7965e3?crop=entropy&cs=srgb&fm=jpg&q=75&w=800',
  'https://images.unsplash.com/photo-1528720208104-3d9bd03cc9d4?crop=entropy&cs=srgb&fm=jpg&q=75&w=800',
  'https://images.pexels.com/photos/5930091/pexels-photo-5930091.jpeg?auto=compress&cs=tinysrgb&w=800&q=60',
  'https://images.unsplash.com/photo-1589104666851-dffe3a15aace?crop=entropy&cs=srgb&fm=jpg&q=75&w=800',
];

const ACTION_COLORS: Record<string, string> = {
  'BATTLE VINTA': '#FFD700',
  'NUOVO RECORD': '#00E5FF',
  'LVL 12 RAGGIUNTO': '#AF52DE',
  'CREW BATTLE': '#FF3B30',
  'DNA AGGIORNATO': '#00FF87'
};

function EliteActivityFeed() {
  const [challengeTarget, setChallengeTarget] = useState<any>(null);
  return (
    <View style={{ paddingBottom: 8 }}>
      <View style={ef$.header}>
        <Text style={ef$.title}>ELITE ACTIVITY</Text>
        <View style={ef$.liveLine} />
      </View>
      {ELITE_FEED.map((item, idx) => {
        const acColor = ACTION_COLORS[item.action] || '#FFFFFF';
        return (
          <Animated.View key={item.id} entering={FadeInDown.delay(idx * 90).duration(350)}>
            <ImageBackground
              source={{ uri: FEED_IMAGES[idx % FEED_IMAGES.length] }}
              style={ef$.card}
              imageStyle={ef$.cardImage}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(5,5,5,0.55)', 'rgba(5,5,5,0.96)']}
                locations={[0, 0.3, 0.75]}
                style={ef$.cardGrad}
              >
                {/* Action badge */}
                <View style={[ef$.actionBadge, { borderColor: acColor + '40' }]}>
                  <Text style={[ef$.actionText, { color: acColor }]}>{item.action}</Text>
                </View>

                {/* Bottom row */}
                <View style={ef$.cardBottom}>
                  <View style={ef$.avatarWrap}>
                    <Text style={ef$.avatarLetter}>{item.athlete[0]}</Text>
                  </View>
                  <View style={ef$.cardInfo}>
                    <Text style={ef$.athleteName}>{item.athlete}</Text>
                    <Text style={ef$.athleteSub}>{item.sport}</Text>
                  </View>
                  <View style={ef$.cardRight}>
                    <Text style={ef$.xpText}>{item.xp}</Text>
                    <TouchableOpacity
                      style={ef$.challengeBtn}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setChallengeTarget({ name: item.athlete, weighted_dna: item.dna, id: item.id }); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="flash-sharp" size={11} color="#050505" />
                      <Text style={ef$.challengeText}>1v1</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </Animated.View>
        );
      })}
      <ChallengeInviteModal visible={!!challengeTarget} crew={challengeTarget} onClose={() => setChallengeTarget(null)} />
    </View>
  );
}

const ef$ = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingBottom: 12, paddingTop: 4 },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: -0.5, lineHeight: 19 },
  liveLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  card: { marginHorizontal: 24, marginBottom: 10, height: 130, borderRadius: 16, overflow: 'hidden' },
  cardImage: { borderRadius: 16, opacity: 0.55 },
  cardGrad: { flex: 1, justifyContent: 'space-between', padding: 14 },
  actionBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.3)' },
  actionText: { fontSize: 12, fontWeight: '900', letterSpacing: 2.5 },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  avatarWrap: { width: 36, height: 36, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  cardInfo: { flex: 1, gap: 2 },
  athleteName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  athleteSub: { color: '#AAAAAA', fontSize: 13, fontWeight: '300', letterSpacing: 1 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  xpText: { color: '#FFD700', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  challengeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD700', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6 },
  challengeText: { color: '#000000', fontSize: 13, fontWeight: '900', letterSpacing: 1 }
});

// ========== WAR ROOM — ARENA BATTLE ENGINE ==========
function useCountdown(endsAt: string | null) {
  const [remaining, setRemaining] = useState('');
  const [minsLeft, setMinsLeft] = useState(9999);
  useEffect(() => {
    if (!endsAt) { setRemaining(''); return; }
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('TERMINATA'); setMinsLeft(0); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setMinsLeft(h * 60 + m);
      setRemaining(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [endsAt]);
  return { remaining, minsLeft };
}

function WarBar({ pctA, isMyCrewA, isMyCrewB }: { pctA: number; isMyCrewA: boolean; isMyCrewB: boolean }) {
  const progress = useSharedValue(50);
  const trackW = useSharedValue(SW - 76);
  useEffect(() => { progress.value = withTiming(pctA, { duration: 1000, easing: Easing.out(Easing.cubic) }); }, [pctA]);
  const styleA = useAnimatedStyle(() => ({ width: (progress.value / 100) * trackW.value }));
  return (
    <View style={wb$.container}>
      <View style={wb$.track} onLayout={(e) => { trackW.value = e.nativeEvent.layout.width; }}>
        <Animated.View style={[wb$.fillMine, styleA, isMyCrewA && { backgroundColor: '#00E5FF' }, isMyCrewB && { backgroundColor: '#333' }]} />
      </View>
      <View style={wb$.pctRow}>
        <Text style={[wb$.pct, isMyCrewA && { color: '#00E5FF' }]}>{pctA.toFixed(0)}%</Text>
        <Text style={wb$.pct}>{(100 - pctA).toFixed(0)}%</Text>
      </View>
    </View>
  );
}
const wb$ = StyleSheet.create({
  container: { gap: 6 },
  track: { height: 20, backgroundColor: '#222', borderRadius: 10, overflow: 'hidden' },
  fillMine: { height: 20, backgroundColor: '#00E5FF', borderRadius: 10 },
  pctRow: { flexDirection: 'row', justifyContent: 'space-between' },
  pct: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '700', letterSpacing: 1 }
});

function LiveBattleCard({ battle, onOpenDashboard }: { battle: any; onOpenDashboard: (id: string) => void }) {
  const router = useRouter();
  const { remaining, minsLeft } = useCountdown(battle.ends_at);
  const { crew_a, crew_b } = battle;
  const pctA = crew_a.pct || 50;
  const isMyCrewA = crew_a.is_my_crew;
  const isMyCrewB = crew_b.is_my_crew;
  const isLosing = (isMyCrewA && pctA < 50) || (isMyCrewB && pctA > 50);
  const diff = Math.abs(pctA - 50);
  const isLastPush = minsLeft < 10 && diff < 5 && battle.user_in_battle;
  const isClose = diff < 8;

  const borderGlow = useSharedValue(0.3);
  useEffect(() => {
    if (isLosing) {
      borderGlow.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.3, { duration: 700 })), -1, false);
    } else {
      borderGlow.value = 0.3;
    }
  }, [isLosing]);
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: isLosing
      ? interpolateColor(borderGlow.value, [0, 1], ['rgba(255,59,48,0.1)', 'rgba(255,59,48,1)'])
      : 'rgba(255,255,255,0.06)'
  }));

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={[wrc$.card, borderStyle]}>
      {/* Teams header */}
      <View style={wrc$.teams}>
        <Text style={[wrc$.teamA, isMyCrewA && wrc$.teamMine]} numberOfLines={1}>{crew_a.name}</Text>
        <View style={wrc$.timePill}>
          <View style={wrc$.liveDot} />
          <Text style={wrc$.timer}>{remaining || 'LIVE'}</Text>
        </View>
        <Text style={[wrc$.teamB, isMyCrewB && wrc$.teamMine]} numberOfLines={1}>{crew_b.name}</Text>
      </View>

      {/* War Bar */}
      <WarBar pctA={pctA} isMyCrewA={isMyCrewA} isMyCrewB={isMyCrewB} />

      {/* Scores */}
      <View style={wrc$.scores}>
        <Text style={[wrc$.score, isMyCrewA && { color: '#00E5FF' }]}>{crew_a.score}</Text>
        <Text style={wrc$.scoreDivider}>·</Text>
        <Text style={[wrc$.score, isMyCrewB && { color: '#00E5FF' }]}>{crew_b.score}</Text>
      </View>

      {/* Last Push CTA */}
      {isLastPush ? (
        <TouchableOpacity
          style={wrc$.lastPush}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}); router.push('/(tabs)/nexus-trigger'); }}
          activeOpacity={0.85}
        >
          <Text style={wrc$.lastPushText}>LAST PUSH: SECURE THE VICTORY</Text>
        </TouchableOpacity>
      ) : battle.user_in_battle ? (
        <TouchableOpacity
          style={[wrc$.cta, isLosing && wrc$.ctaLosing]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); router.push('/(tabs)/nexus-trigger'); }}
          activeOpacity={0.85}
        >
          <Ionicons name="flash-sharp" size={13} color={isLosing ? '#FFFFFF' : '#000000'} />
          <Text style={[wrc$.ctaText, isLosing && { color: '#FFFFFF' }]}>
            {isLosing ? 'RECUPERA — FALLO ORA' : 'CONTRIBUISCI ORA'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Dashboard Button */}
      {battle.user_in_battle && (
        <TouchableOpacity
          style={wrc$.dashBtn}
          onPress={() => onOpenDashboard(battle.id)}
          activeOpacity={0.75}
        >
          <Ionicons name="analytics" size={13} color="#00E5FF" />
          <Text style={wrc$.dashBtnText}>DASHBOARD LIVE</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const wrc$ = StyleSheet.create({
  card: { marginHorizontal: 24, marginBottom: 10, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: '#000000' },
  teams: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamA: { flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  teamB: { flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '900', letterSpacing: 1.5, textAlign: 'right' },
  teamMine: { color: '#FFFFFF' },
  timePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,59,48,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  liveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF3B30' },
  timer: { color: '#FF3B30', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  scores: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  score: { color: 'rgba(255,255,255,0.4)', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  scoreDivider: { color: 'rgba(255,255,255,0.1)', fontSize: 18 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#00E5FF', borderRadius: 10, paddingVertical: 12 },
  ctaLosing: { backgroundColor: '#FF3B30' },
  ctaText: { color: '#000000', fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  lastPush: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF3B30', borderRadius: 10, paddingVertical: 14 },
  lastPushText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  dashBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)', borderRadius: 10, paddingVertical: 10, backgroundColor: 'rgba(0,229,255,0.05)' },
  dashBtnText: { color: '#00E5FF', fontSize: 12, fontWeight: '900', letterSpacing: 2 }
});

function LiveBattleDashboard() {
  const { token } = useAuth();
  const [battles, setBattles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardBattleId, setDashboardBattleId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getLiveCrewBattles(token);
      setBattles(Array.isArray(data) ? data : []);
    } catch (_) {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  if (loading) return (
    <View style={lbd$.loadWrap}>
      <ActivityIndicator color="#FF3B30" size="small" />
    </View>
  );

  return (
    <View style={lbd$.section}>
      <View style={lbd$.sectionHeader}>
        <Ionicons name="flash" size={12} color="#FF3B30" />
        <Text style={lbd$.sectionTitle}>BATTLE LIVE</Text>
        <View style={lbd$.countBadge}><Text style={lbd$.countText}>{battles.length} ATTIVE</Text></View>
      </View>
      {battles.length === 0 ? (
        <View style={lbd$.emptyCard}>
          <Text style={lbd$.emptyTitle}>NESSUNA BATTLE ATTIVA</Text>
          <Text style={lbd$.emptySub}>Usa il Matchmaking AI per trovare un avversario</Text>
        </View>
      ) : (
        battles.map(b => (
          <LiveBattleCard key={b.id} battle={b} onOpenDashboard={(id: string) => setDashboardBattleId(id)} />
        ))
      )}
      <CrewBattleDashboard
        visible={!!dashboardBattleId}
        battleId={dashboardBattleId}
        onClose={() => setDashboardBattleId(null)}
      />
    </View>
  );
}

const lbd$ = StyleSheet.create({
  section: { marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingBottom: 10, paddingTop: 4 },
  sectionTitle: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: -0.5, lineHeight: 19 },
  countBadge: { backgroundColor: 'rgba(255,59,48,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,59,48,0.3)' },
  countText: { color: '#FF3B30', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  loadWrap: { height: 60, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { marginHorizontal: 24, backgroundColor: 'rgba(255,59,48,0.04)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,59,48,0.1)', gap: 4 },
  emptyTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  emptySub: { color: 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: '400' }
});

// ========== MATCHMAKING AI PANEL ==========
function MatchmakingPanel() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [challenging, setChallengingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isUnlocked = user?.unlocked_tools?.includes('ai_matchmaker');

  useEffect(() => {
    if (!token) return;
    api.getCrewMatchmake(token)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleChallenge = async (crewId: string, crewName: string) => {
    if (!token) return;
    setChallengingId(crewId);
    try {
      await api.challengeCrew(crewId, token, 24);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('SFIDA LANCIATA', `${crewName} è stata sfidato! La battle dura 24h. Fai un NEXUS Scan per contribuire.`);
      // Refresh
      const newData = await api.getCrewMatchmake(token);
      setData(newData);
    } catch (e: any) {
      Alert.alert('SFIDA FALLITA', e?.message || 'Errore nell\'avviare la battle');
    } finally {
      setChallengingId(null);
    }
  };

  if (loading) return null;
  if (!data?.suggestions?.length && isUnlocked) return null;

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)} style={[mp$.section, { position: 'relative' as any }]}>
      {!isUnlocked && (
        <ToolLock
          toolId="ai_matchmaker"
          toolName="AI MATCHMAKER"
          costAk={500}
          onNavigate={() => router.push('/(tabs)/kore')}
        />
      )}
      {/* Header */}
      <View style={mp$.header}>
        <View style={mp$.headerLeft}>
          <Ionicons name="analytics" size={12} color="#FFD700" />
          <Text style={mp$.title}>MATCHMAKING AI</Text>
        </View>
        {data.has_crew && (
          <View style={mp$.myScorePill}>
            <Text style={mp$.myScoreLabel}>IL TUO KORE</Text>
            <Text style={mp$.myScoreVal}>{data.my_kore_score}</Text>
          </View>
        )}
      </View>

      {!data.has_crew && (
        <View style={mp$.noCrew}>
          <Ionicons name="people" size={16} color="rgba(255,215,0,0.5)" />
          <Text style={mp$.noCrewText}>Unisciti a una Crew per sfidare avversari compatibili</Text>
        </View>
      )}

      {/* Suggested opponents */}
      {data.suggestions.map((opp: any, idx: number) => {
        const diff = opp.score_diff;
        const matchLabel = diff <= 2 ? 'MATCH PERFETTO' : diff <= 8 ? 'MATCH BUONO' : 'MATCH ACCETTABILE';
        const matchColor = diff <= 2 ? '#00E5FF' : diff <= 8 ? '#FFD700' : '#FF9500';
        return (
          <Animated.View key={opp.id} entering={FadeInDown.delay(idx * 80).duration(300)} style={mp$.card}>
            <View style={mp$.cardLeft}>
              <View style={mp$.nameRow}>
                <Text style={mp$.crewName}>{opp.name.toUpperCase()}</Text>
                <View style={[mp$.matchPill, { borderColor: matchColor + '40' }]}>
                  <Text style={[mp$.matchText, { color: matchColor }]}>{matchLabel}</Text>
                </View>
              </View>
              <View style={mp$.metaRow}>
                <Ionicons name="people" size={10} color="rgba(255,255,255,0.3)" />
                <Text style={mp$.meta}>{opp.members_count} Kore</Text>
                <Text style={mp$.meta}>·</Text>
                <Text style={mp$.meta}>KORE {opp.kore_battle_score}</Text>
                {opp.is_stronger && <Text style={[mp$.meta, { color: '#FF9500' }]}>· +{diff} più forti</Text>}
                {!opp.is_stronger && diff > 0 && <Text style={[mp$.meta, { color: '#00E5FF' }]}>· -{diff} più deboli</Text>}
              </View>
            </View>
            {opp.already_challenged ? (
              <View style={mp$.challenged}>
                <Ionicons name="checkmark-circle" size={14} color="#00FF87" />
                <Text style={mp$.challengedText}>IN CORSO</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[mp$.challengeBtn, data.has_crew ? {} : mp$.challengeBtnDisabled]}
                onPress={() => data.has_crew ? handleChallenge(opp.id, opp.name) : null}
                disabled={!data.has_crew || challenging === opp.id}
                activeOpacity={0.8}
              >
                {challenging === opp.id ? (
                  <ActivityIndicator color="#050505" size="small" />
                ) : (
                  <>
                    <Ionicons name="flash-sharp" size={12} color="#050505" />
                    <Text style={mp$.challengeBtnText}>SFIDA</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </Animated.View>
        );
      })}

      <Text style={mp$.footNote}>
        <Ionicons name="shield-checkmark" size={10} color="rgba(0,229,255,0.4)" /> Matchmaking AI — differenza max 35% KORE Score
      </Text>
    </Animated.View>
  );
}

const mp$ = StyleSheet.create({
  section: { marginHorizontal: 24, marginBottom: 12, backgroundColor: 'rgba(255,215,0,0.04)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,215,0,0.14)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#FFD700', fontSize: 15, fontWeight: '900', letterSpacing: 3 },
  myScorePill: { alignItems: 'flex-end', gap: 1 },
  myScoreLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  myScoreVal: { color: '#FFD700', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  noCrew: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  noCrewText: { flex: 1, color: 'rgba(255,215,0,0.5)', fontSize: 14, fontWeight: '400', lineHeight: 17 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  cardLeft: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  crewName: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  matchPill: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  matchText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '400' },
  challengeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFD700', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minWidth: 68 },
  challengeBtnDisabled: { backgroundColor: 'rgba(255,215,0,0.3)' },
  challengeBtnText: { color: '#000000', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  challenged: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  challengedText: { color: '#00FF87', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  footNote: { color: 'rgba(0,229,255,0.3)', fontSize: 12, fontWeight: '400', letterSpacing: 0.5, marginTop: 10, textAlign: 'center' }
});



// ── EliteActivityFeed with Challenge CTA ─────────────────────────
const ELITE_FEED = [
  { id: '1', athlete: 'THUNDER_MAN', action: 'BATTLE VINTA', sport: 'ATLETICA', xp: '+220', dna: { velocita: 88, forza: 82, resistenza: 85, agilita: 80, tecnica: 84, potenza: 86 } },
  { id: '2', athlete: 'MAYA_J', action: 'NUOVO RECORD', sport: 'MMA', xp: '+180', dna: { velocita: 79, forza: 91, resistenza: 83, agilita: 88, tecnica: 77, potenza: 90 } },
  { id: '3', athlete: 'AXEL_V', action: 'SCAN COMPLETATO', sport: 'CROSSFIT', xp: '+150', dna: { velocita: 75, forza: 88, resistenza: 90, agilita: 72, tecnica: 80, potenza: 85 } },
  { id: '4', athlete: 'TORO_94', action: 'CREW BATTLE', sport: 'BOXE', xp: '+200', dna: { velocita: 83, forza: 90, resistenza: 78, agilita: 82, tecnica: 86, potenza: 91 } },
  { id: '5', athlete: 'SARA_K', action: 'DNA AGGIORNATO', sport: 'ATLETICA', xp: '+120', dna: { velocita: 86, forza: 74, resistenza: 88, agilita: 84, tecnica: 82, potenza: 76 } },
];

export default function ArenaTab() {
  const { user } = useAuth();
  const router = useRouter();
  const isCertified = !!(user?.onboarding_completed && user?.dna);

  return (
    <ImageBackground source={{ uri: TAB_BACKGROUNDS.arena }} style={s.container} imageStyle={{ opacity: 0.12 }}>
      <StatusBar barStyle="light-content" />
      <Header title="ARENA" />

      {/* ── URGENCY BANNER for uncertified users ── */}
      {!isCertified && (
        <Animated.View entering={FadeInDown.duration(300)} style={s.urgencyBanner}>
          <View style={s.urgencyLeft}>
            <Ionicons name="warning" size={14} color="#FFD700" />
            <Text style={s.urgencyText}>
              Il tuo talento non è certificato. Completa il NÈXUS Scan per entrare nel Radar degli Scout.
            </Text>
          </View>
          <TouchableOpacity
            style={s.urgencyCta}
            onPress={() => router.push('/onboarding/choice')}
            activeOpacity={0.85}
          >
            <Text style={s.urgencyCtaText}>CERTIFICA</Text>
            <Ionicons name="scan" size={10} color="#000" />
          </TouchableOpacity>
        </Animated.View>
      )}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <LiveBattleDashboard />
        <MatchmakingPanel />
        <HeroBanner />
        <KoreOfTheDay />
        <View style={s.dividerSection}>
          <View style={s.divLine} />
          <Ionicons name="radio" size={10} color="rgba(255,255,255,0.15)" />
          <View style={s.divLine} />
        </View>
        <EliteActivityFeed />
      </ScrollView>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  dividerSection: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  urgencyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,215,0,0.1)', paddingHorizontal: 24, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,215,0,0.25)', gap: 10
  },
  urgencyLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  urgencyText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '300', flex: 1, lineHeight: 15 },
  urgencyCta: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFD700', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  urgencyCtaText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 }
});

const live$ = StyleSheet.create({ card: {} }); // legacy placeholder
