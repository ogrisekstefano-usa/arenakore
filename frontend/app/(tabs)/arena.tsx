/**
 * ARENAKORE — ARENA TAB v4.0 — CREW BATTLE ENGINE
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar,
  TouchableOpacity, Dimensions, ImageBackground, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeInDown, useSharedValue,
  withRepeat, withSequence, withTiming, useAnimatedStyle, Easing, withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { TAB_BACKGROUNDS } from '../../utils/images';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { ChallengeInviteModal } from '../../components/crew/ChallengeInviteModal';

const { width: SW } = Dimensions.get('window');

const KORE_OF_DAY = {
  username: 'THUNDER_MAN',
  sport: 'MMA',
  achievement: 'RECORD PERSONALE',
  value: '47 REP',
  exercise: 'DEEP SQUAT',
  xp: '+340 XP',
  rank: '#12',
  level: 14,
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
      <LinearGradient colors={['#0A0A0A', '#060606']} style={hero$.grad}>
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
            { label: 'ATLETI ATTIVI', val: '1,240', icon: 'people' as const },
            { label: 'SESSIONI OGGI', val: '384', icon: 'flash' as const },
            { label: 'RECORD BATTUTI', val: '23', icon: 'trophy' as const },
          ].map((s, i) => (
            <View key={i} style={hero$.statItem}>
              <Ionicons name={s.icon} size={14} color="#00F2FF" />
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
  wrap: { marginHorizontal: 16, marginTop: 8, marginBottom: 16 },
  grad: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  tlBracket: { position: 'absolute', top: 12, left: 12, width: 20, height: 20, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#00F2FF', opacity: 0.5 },
  trBracket: { position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#00F2FF', opacity: 0.5 },
  blBracket: { position: 'absolute', bottom: 44, left: 12, width: 20, height: 20, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#00F2FF', opacity: 0.25 },
  brBracket: { position: 'absolute', bottom: 44, right: 12, width: 20, height: 20, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#00F2FF', opacity: 0.25 },
  inner: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20, alignItems: 'center', gap: 8 },
  brandLine: { color: 'rgba(255,255,255,0.60)', fontSize: 13, fontWeight: '900', letterSpacing: 5 },
  titleLine: { color: '#FFFFFF', fontSize: 38, fontWeight: '900', letterSpacing: 4, textAlign: 'center', lineHeight: 44 },
  cyanLine: { width: 60, height: 2, backgroundColor: '#00F2FF', borderRadius: 1, shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8 },
  tagLine: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '700', letterSpacing: 3, textAlign: 'center' },
  statsRow: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  statItem: {
    flex: 1, alignItems: 'center', gap: 3, paddingVertical: 12,
    borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.04)',
  },
  statVal: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  statLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
});

// ========== KORE OF THE DAY ==========
function KoreOfTheDay() {
  const glow = useSharedValue(0.4);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(withTiming(0.9, { duration: 1800, easing: Easing.inOut(Easing.ease) }), withTiming(0.4, { duration: 1800 })), -1, false
    );
  }, []);
  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value,
    borderColor: `rgba(0,242,255,${glow.value * 0.5})`,
  }));

  return (
    <Animated.View entering={FadeInDown.delay(150)} style={kotd$.container}>
      <View style={kotd$.sectionRow}>
        <View style={kotd$.dot} />
        <Text style={kotd$.sectionTitle}>KORE OF THE DAY</Text>
        <View style={kotd$.livePill}>
          <View style={kotd$.liveDot} />
          <Text style={kotd$.liveText}>LIVE</Text>
        </View>
      </View>

      <Animated.View style={[kotd$.card, glowStyle]}>
        <LinearGradient colors={['#0E0E0E', '#080808']} style={kotd$.cardGrad}>
          {/* Badge */}
          <View style={kotd$.badge}>
            <Ionicons name="star" size={10} color="#00F2FF" />
            <Text style={kotd$.badgeText}>ATLETA DEL GIORNO</Text>
          </View>

          {/* Identity */}
          <View style={kotd$.identRow}>
            <View style={kotd$.avatar}>
              <Text style={kotd$.avatarLetter}>T</Text>
            </View>
            <View style={kotd$.identInfo}>
              <Text style={kotd$.userName}>{KORE_OF_DAY.username}</Text>
              <Text style={kotd$.userSport}>{KORE_OF_DAY.sport} · LVL {KORE_OF_DAY.level}</Text>
              <View style={kotd$.rankPill}>
                <Text style={kotd$.rankText}>RANK {KORE_OF_DAY.rank}</Text>
              </View>
            </View>
            <View style={kotd$.xpPill}>
              <Text style={kotd$.xpVal}>{KORE_OF_DAY.xp}</Text>
            </View>
          </View>

          {/* Achievement */}
          <View style={kotd$.achievement}>
            <Ionicons name="flash" size={12} color="#00F2FF" />
            <Text style={kotd$.achieveLabel}>{KORE_OF_DAY.achievement}</Text>
            <View style={{ flex: 1 }} />
            <Text style={kotd$.achieveVal}>{KORE_OF_DAY.value}</Text>
            <Text style={kotd$.achieveExer}>{KORE_OF_DAY.exercise}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const kotd$ = StyleSheet.create({
  container: { marginBottom: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00F2FF', shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 5 },
  sectionTitle: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,69,58,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,69,58,0.25)' },
  liveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF453A' },
  liveText: { color: '#FF453A', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  card: {
    marginHorizontal: 16, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 }, shadowRadius: 16,
  },
  cardGrad: { padding: 16, gap: 14 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'transparent', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,242,255,0.25)' },
  badgeText: { color: '#00F2FF', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  identRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#00F2FF', fontSize: 20, fontWeight: '900' },
  identInfo: { flex: 1, gap: 3 },
  userName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  userSport: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '500', letterSpacing: 1 },
  rankPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  rankText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  xpPill: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  xpVal: { color: '#00F2FF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  achievement: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  achieveLabel: { color: 'rgba(255,255,255,0.70)', fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  achieveVal: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  achieveExer: { color: 'rgba(0,242,255,0.85)', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});

// ========== ELITE DIVISION UPDATES ==========
function EliteDivisionUpdates() {
  return (
    <Animated.View entering={FadeInDown.delay(300)} style={edu$.container}>
      <View style={edu$.sectionRow}>
        <Ionicons name="radio" size={12} color="#FFFFFF" />
        <Text style={edu$.sectionTitle}>ELITE DIVISION UPDATES</Text>
      </View>

      {DIVISION_UPDATES.map((item, i) => (
        <Animated.View key={item.id} entering={FadeInDown.delay(350 + i * 50)}>
          <TouchableOpacity style={edu$.row} activeOpacity={0.75}>
            <View style={edu$.iconWrap}>
              <Ionicons name={item.icon} size={14} color="rgba(255,255,255,0.6)" />
            </View>
            <View style={edu$.info}>
              <Text style={edu$.athlete}>{item.athlete}</Text>
              <Text style={edu$.action}>{item.action} · {item.sport}</Text>
            </View>
            <View style={edu$.right}>
              <Text style={edu$.xp}>{item.xp}</Text>
              <Text style={edu$.time}>{item.time}</Text>
            </View>
          </TouchableOpacity>
          {i < DIVISION_UPDATES.length - 1 && <View style={edu$.sep} />}
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const edu$ = StyleSheet.create({
  container: { marginHorizontal: 16, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  info: { flex: 1, gap: 2 },
  athlete: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  action: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '400', letterSpacing: 0.5 },
  right: { alignItems: 'flex-end', gap: 2 },
  xp: { color: '#00F2FF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  time: { color: 'rgba(255,255,255,0.60)', fontSize: 11, fontWeight: '400', letterSpacing: 0.5 },
  sep: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 44 },
});

// ========== LIVE BATTLE DASHBOARD ==========
function BattleProgressBar({ pctA, isMyCrewA, isMyCrewB }: { pctA: number; isMyCrewA: boolean; isMyCrewB: boolean }) {
  const width = useSharedValue(50);
  useEffect(() => { width.value = withTiming(pctA, { duration: 800, easing: Easing.out(Easing.cubic) }); }, [pctA]);
  const styleA = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));
  const isWinning = isMyCrewA ? pctA > 50 : isMyCrewB ? pctA < 50 : false;
  return (
    <View style={bp$.track}>
      <Animated.View style={[bp$.fillA, styleA, isMyCrewA && { backgroundColor: '#00F2FF' }, !isMyCrewA && isMyCrewB && { backgroundColor: '#FF453A' }]} />
    </View>
  );
}
const bp$ = StyleSheet.create({
  track: { height: 8, backgroundColor: 'rgba(255,69,58,0.3)', borderRadius: 4, overflow: 'hidden' },
  fillA: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 4 },
});

function useCountdown(endsAt: string | null) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!endsAt) { setRemaining(''); return; }
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('TERMINATA'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [endsAt]);
  return remaining;
}

function LiveBattleCard({ battle, onContribute }: { battle: any; onContribute: (id: string) => void }) {
  const router = useRouter();
  const countdown = useCountdown(battle.ends_at);
  const { crew_a, crew_a: { pct: pctA }, crew_b } = battle;
  const myCrewLabel = crew_a.is_my_crew ? crew_a.name : crew_b.is_my_crew ? crew_b.name : null;
  const isWinning = (crew_a.is_my_crew && pctA > 50) || (crew_b.is_my_crew && pctA < 50);
  const pulse = useSharedValue(1);
  useEffect(() => { pulse.value = withRepeat(withSequence(withTiming(1.04, { duration: 900 }), withTiming(1, { duration: 900 })), -1, false); }, []);
  const glow = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={lbc$.card}>
      <LinearGradient colors={['#0E0E0E', '#070707']} style={lbc$.inner}>
        {/* Header */}
        <View style={lbc$.header}>
          <View style={lbc$.livePill}>
            <Animated.View style={[lbc$.liveDot, glow]} />
            <Text style={lbc$.liveText}>LIVE</Text>
          </View>
          <Text style={lbc$.timer}>{countdown || '24H'}</Text>
        </View>

        {/* Teams */}
        <View style={lbc$.teamsRow}>
          <View style={lbc$.teamSide}>
            <Text style={[lbc$.teamName, crew_a.is_my_crew && lbc$.teamMine]} numberOfLines={1}>{crew_a.name}</Text>
            <Text style={lbc$.teamScore}>{crew_a.score}</Text>
          </View>
          <View style={lbc$.vsCol}>
            <Text style={lbc$.vsText}>VS</Text>
          </View>
          <View style={[lbc$.teamSide, { alignItems: 'flex-end' }]}>
            <Text style={[lbc$.teamName, crew_b.is_my_crew && lbc$.teamMine]} numberOfLines={1}>{crew_b.name}</Text>
            <Text style={lbc$.teamScore}>{crew_b.score}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <BattleProgressBar pctA={pctA} isMyCrewA={crew_a.is_my_crew} isMyCrewB={crew_b.is_my_crew} />
        <View style={lbc$.pctRow}>
          <Text style={lbc$.pctText}>{pctA}%</Text>
          <Text style={lbc$.pctText}>{(100 - pctA).toFixed(1)}%</Text>
        </View>

        {/* Status */}
        {myCrewLabel && (
          <View style={[lbc$.statusPill, isWinning ? lbc$.statusWin : lbc$.statusLose]}>
            <Ionicons name={isWinning ? 'trending-up' : 'warning'} size={11} color={isWinning ? '#00F2FF' : '#FF9500'} />
            <Text style={[lbc$.statusText, isWinning ? { color: '#00F2FF' } : { color: '#FF9500' }]}>
              {isWinning ? 'STA VINCENDO' : 'IN SVANTAGGIO — CONTRIBUISCI'}
            </Text>
          </View>
        )}

        {/* CTA */}
        {battle.user_in_battle && (
          <TouchableOpacity
            style={lbc$.cta}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}); router.push('/(tabs)/nexus-trigger'); }}
            activeOpacity={0.85}
          >
            <Ionicons name="flash-sharp" size={14} color="#050505" />
            <Text style={lbc$.ctaText}>CONTRIBUISCI ORA</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const lbc$ = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,69,58,0.3)' },
  inner: { padding: 14, gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,69,58,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,69,58,0.3)' },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FF453A' },
  liveText: { color: '#FF453A', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  timer: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  teamsRow: { flexDirection: 'row', alignItems: 'center' },
  teamSide: { flex: 1, gap: 2 },
  teamName: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  teamMine: { color: '#00F2FF' },
  teamScore: { color: '#D4AF37', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  vsCol: { width: 40, alignItems: 'center' },
  vsText: { color: '#D4AF37', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  pctRow: { flexDirection: 'row', justifyContent: 'space-between' },
  pctText: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statusWin: { backgroundColor: 'rgba(0,242,255,0.07)', borderWidth: 1, borderColor: 'rgba(0,242,255,0.2)' },
  statusLose: { backgroundColor: 'rgba(255,149,0,0.07)', borderWidth: 1, borderColor: 'rgba(255,149,0,0.2)' },
  statusText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF453A', borderRadius: 10, paddingVertical: 12, marginTop: 2 },
  ctaText: { color: '#050505', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
});

function LiveBattleDashboard() {
  const { token } = useAuth();
  const [battles, setBattles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    const iv = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(iv);
  }, [load]);

  if (loading) return (
    <View style={lbd$.loadWrap}>
      <ActivityIndicator color="#FF453A" size="small" />
    </View>
  );

  return (
    <View style={lbd$.section}>
      <View style={lbd$.sectionHeader}>
        <Ionicons name="flash" size={12} color="#FF453A" />
        <Text style={lbd$.sectionTitle}>BATTLE LIVE</Text>
        <View style={lbd$.countBadge}><Text style={lbd$.countText}>{battles.length} ATTIVE</Text></View>
      </View>
      {battles.length === 0 ? (
        <View style={lbd$.emptyCard}>
          <Text style={lbd$.emptyTitle}>NESSUNA BATTLE ATTIVA</Text>
          <Text style={lbd$.emptySub}>Usa il Matchmaking AI per trovare un avversario</Text>
        </View>
      ) : (
        battles.map(b => <LiveBattleCard key={b.id} battle={b} onContribute={() => {}} />)
      )}
    </View>
  );
}

const lbd$ = StyleSheet.create({
  section: { marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 10, paddingTop: 4 },
  sectionTitle: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  countBadge: { backgroundColor: 'rgba(255,69,58,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,69,58,0.3)' },
  countText: { color: '#FF453A', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  loadWrap: { height: 60, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { marginHorizontal: 16, backgroundColor: 'rgba(255,69,58,0.04)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,69,58,0.1)', gap: 4 },
  emptyTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  emptySub: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '400' },
});

// ========== MATCHMAKING AI PANEL ==========
function MatchmakingPanel() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [challenging, setChallengingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
  if (!data?.suggestions?.length) return null;

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)} style={mp$.section}>
      {/* Header */}
      <View style={mp$.header}>
        <View style={mp$.headerLeft}>
          <Ionicons name="analytics" size={12} color="#D4AF37" />
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
          <Ionicons name="people" size={16} color="rgba(212,175,55,0.5)" />
          <Text style={mp$.noCrewText}>Unisciti a una Crew per sfidare avversari compatibili</Text>
        </View>
      )}

      {/* Suggested opponents */}
      {data.suggestions.map((opp: any, idx: number) => {
        const diff = opp.score_diff;
        const matchLabel = diff <= 2 ? 'MATCH PERFETTO' : diff <= 8 ? 'MATCH BUONO' : 'MATCH ACCETTABILE';
        const matchColor = diff <= 2 ? '#00F2FF' : diff <= 8 ? '#D4AF37' : '#FF9500';
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
                <Text style={mp$.meta}>{opp.members_count} membri</Text>
                <Text style={mp$.meta}>·</Text>
                <Text style={mp$.meta}>KORE {opp.kore_battle_score}</Text>
                {opp.is_stronger && <Text style={[mp$.meta, { color: '#FF9500' }]}>· +{diff} più forti</Text>}
                {!opp.is_stronger && diff > 0 && <Text style={[mp$.meta, { color: '#00F2FF' }]}>· -{diff} più deboli</Text>}
              </View>
            </View>
            {opp.already_challenged ? (
              <View style={mp$.challenged}>
                <Ionicons name="checkmark-circle" size={14} color="#34C759" />
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
        <Ionicons name="shield-checkmark" size={10} color="rgba(0,242,255,0.4)" /> Matchmaking AI — differenza max 35% KORE Score
      </Text>
    </Animated.View>
  );
}

const mp$ = StyleSheet.create({
  section: { marginHorizontal: 16, marginBottom: 12, backgroundColor: 'rgba(212,175,55,0.04)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(212,175,55,0.14)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#D4AF37', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  myScorePill: { alignItems: 'flex-end', gap: 1 },
  myScoreLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  myScoreVal: { color: '#D4AF37', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  noCrew: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  noCrewText: { flex: 1, color: 'rgba(212,175,55,0.5)', fontSize: 12, fontWeight: '400', lineHeight: 17 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  cardLeft: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  crewName: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  matchPill: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  matchText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '400' },
  challengeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#D4AF37', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minWidth: 68 },
  challengeBtnDisabled: { backgroundColor: 'rgba(212,175,55,0.3)' },
  challengeBtnText: { color: '#050505', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  challenged: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  challengedText: { color: '#34C759', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  footNote: { color: 'rgba(0,242,255,0.3)', fontSize: 10, fontWeight: '400', letterSpacing: 0.5, marginTop: 10, textAlign: 'center' },
});



// ── EliteActivityFeed with Challenge CTA ─────────────────────────
const ELITE_FEED = [
  { id: '1', athlete: 'THUNDER_MAN', action: 'BATTLE VINTA', sport: 'ATLETICA', xp: '+220', dna: { velocita: 88, forza: 82, resistenza: 85, agilita: 80, tecnica: 84, potenza: 86 } },
  { id: '2', athlete: 'MAYA_J', action: 'NUOVO RECORD', sport: 'MMA', xp: '+180', dna: { velocita: 79, forza: 91, resistenza: 83, agilita: 88, tecnica: 77, potenza: 90 } },
  { id: '3', athlete: 'AXEL_V', action: 'SCAN COMPLETATO', sport: 'CROSSFIT', xp: '+150', dna: { velocita: 75, forza: 88, resistenza: 90, agilita: 72, tecnica: 80, potenza: 85 } },
  { id: '4', athlete: 'TORO_94', action: 'CREW BATTLE', sport: 'BOXE', xp: '+200', dna: { velocita: 83, forza: 90, resistenza: 78, agilita: 82, tecnica: 86, potenza: 91 } },
  { id: '5', athlete: 'SARA_K', action: 'DNA AGGIORNATO', sport: 'ATLETICA', xp: '+120', dna: { velocita: 86, forza: 74, resistenza: 88, agilita: 84, tecnica: 82, potenza: 76 } },
];

function EliteActivityFeed() {
  const [challengeTarget, setChallengeTarget] = useState<any>(null);
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
      <View style={ef$.header}>
        <Ionicons name="pulse" size={12} color="#00F2FF" />
        <Text style={ef$.title}>ELITE ACTIVITY</Text>
      </View>
      {ELITE_FEED.map((item, idx) => (
        <Animated.View key={item.id} entering={FadeInDown.delay(idx * 70)} style={ef$.row}>
          <View style={ef$.left}>
            <Text style={ef$.name}>{item.athlete}</Text>
            <Text style={ef$.sub}>{item.action} · {item.sport} · <Text style={ef$.xp}>{item.xp}</Text></Text>
          </View>
          <TouchableOpacity style={ef$.challengeBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setChallengeTarget({ name: item.athlete, weighted_dna: item.dna, id: item.id }); }} activeOpacity={0.8}>
            <Ionicons name="flash-sharp" size={11} color="#050505" />
            <Text style={ef$.challengeText}>SFIDA</Text>
          </TouchableOpacity>
        </Animated.View>
      ))}
      <ChallengeInviteModal visible={!!challengeTarget} crew={challengeTarget} onClose={() => setChallengeTarget(null)} />
    </View>
  );
}

export default function ArenaTab() {
  return (
    <ImageBackground source={{ uri: TAB_BACKGROUNDS.arena }} style={s.container} imageStyle={{ opacity: 0.10 }}>
      <StatusBar barStyle="light-content" />
      <Header title="ARENA" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* BATTLE LIVE DASHBOARD */}
        <LiveBattleDashboard />

        {/* MATCHMAKING AI */}
        <MatchmakingPanel />

        {/* HERO BANNER */}
        <HeroBanner />

        {/* KORE OF THE DAY */}
        <KoreOfTheDay />

        {/* ELITE ACTIVITY FEED with Challenge CTAs */}
        <View style={s.dividerSection}>
          <View style={s.divLine} />
          <Ionicons name="radio" size={10} color="rgba(0,242,255,0.4)" />
          <View style={s.divLine} />
        </View>
        <EliteActivityFeed />
      </ScrollView>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  dividerSection: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
});

const live$ = StyleSheet.create({ card: {} }); // legacy placeholder

const ef$ = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { color: 'rgba(0,242,255,0.6)', fontSize: 11, fontWeight: '900', letterSpacing: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  left: { flex: 1, gap: 2 },
  name: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  sub: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '400' },
  xp: { color: '#00F2FF', fontWeight: '700' },
  challengeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#D4AF37', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  challengeText: { color: '#050505', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
});
