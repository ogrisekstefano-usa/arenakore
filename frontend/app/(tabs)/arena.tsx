/**
 * ARENAKORE — ARENA TAB v2.0
 * COMMUNITY HUB — Nike Elite Feed
 * Zero emoji. Black/Cyan/White. Bold ALL-CAPS.
 */
import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeInDown, useSharedValue,
  withRepeat, withSequence, withTiming, useAnimatedStyle, Easing,
} from 'react-native-reanimated';
import { Header } from '../../components/Header';

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

const DIVISION_UPDATES = [
  { id: '1', athlete: 'MAYA_J',   action: 'BATTLE VINTA',        sport: 'ATLETICA', xp: '+180 XP', time: '14M FA', icon: 'trophy' as const },
  { id: '2', athlete: 'TORO_94',  action: 'NUOVO RECORD',        sport: 'MMA',       xp: '+280 XP', time: '41M FA', icon: 'flash' as const },
  { id: '3', athlete: 'SASHA_V',  action: 'LVL 12 RAGGIUNTO',   sport: 'NUOTO',     xp: '+500 XP', time: '1H FA',  icon: 'arrow-up-circle' as const },
  { id: '4', athlete: 'KIRA_M',   action: 'CREW FONDATA',        sport: 'CROSSFIT',  xp: '+120 XP', time: '2H FA',  icon: 'shield' as const },
  { id: '5', athlete: 'ALEX_K',   action: 'DNA AGGIORNATO',      sport: 'BOXE',      xp: '+200 XP', time: '3H FA',  icon: 'analytics' as const },
  { id: '6', athlete: 'MANU_B',   action: 'SFIDA COMPLETATA',    sport: 'JUDO',      xp: '+160 XP', time: '5H FA',  icon: 'checkmark-circle' as const },
];

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
    borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.1)',
  },
  tlBracket: { position: 'absolute', top: 12, left: 12, width: 20, height: 20, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#00F2FF', opacity: 0.5 },
  trBracket: { position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#00F2FF', opacity: 0.5 },
  blBracket: { position: 'absolute', bottom: 44, left: 12, width: 20, height: 20, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#00F2FF', opacity: 0.25 },
  brBracket: { position: 'absolute', bottom: 44, right: 12, width: 20, height: 20, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#00F2FF', opacity: 0.25 },
  inner: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20, alignItems: 'center', gap: 8 },
  brandLine: { color: 'rgba(255,255,255,0.60)', fontSize: 10, fontWeight: '900', letterSpacing: 6 },
  titleLine: { color: '#FFFFFF', fontSize: 38, fontWeight: '900', letterSpacing: 4, textAlign: 'center', lineHeight: 44 },
  cyanLine: { width: 60, height: 2, backgroundColor: '#00F2FF', borderRadius: 1, shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8 },
  tagLine: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '800', letterSpacing: 4, textAlign: 'center' },
  statsRow: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  statItem: {
    flex: 1, alignItems: 'center', gap: 3, paddingVertical: 12,
    borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.04)',
  },
  statVal: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  statLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 7, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center' },
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
  sectionTitle: { flex: 1, color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,69,58,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,69,58,0.25)' },
  liveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF453A' },
  liveText: { color: '#FF453A', fontSize: 7, fontWeight: '900', letterSpacing: 2 },
  card: {
    marginHorizontal: 16, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.2)',
    shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 }, shadowRadius: 16,
  },
  cardGrad: { padding: 16, gap: 14 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(0,242,255,0.65)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,242,255,0.2)' },
  badgeText: { color: '#00F2FF', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  identRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#00F2FF', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#050505', fontSize: 20, fontWeight: '900' },
  identInfo: { flex: 1, gap: 3 },
  userName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  userSport: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  rankPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  rankText: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  xpPill: { backgroundColor: 'rgba(0,242,255,0.1)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(0,242,255,0.2)' },
  xpVal: { color: '#00F2FF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  achievement: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  achieveLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  achieveVal: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  achieveExer: { color: 'rgba(0,242,255,0.6)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
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
  sectionTitle: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  info: { flex: 1, gap: 2 },
  athlete: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  action: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  right: { alignItems: 'flex-end', gap: 2 },
  xp: { color: '#00F2FF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  time: { color: 'rgba(255,255,255,0.60)', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  sep: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 44 },
});

// ========== MAIN ARENA TAB ==========
export default function ArenaTab() {
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <Header title="ARENA" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* HERO BANNER */}
        <HeroBanner />

        {/* KORE OF THE DAY */}
        <KoreOfTheDay />

        {/* ELITE DIVISION UPDATES */}
        <View style={s.dividerSection}>
          <View style={s.divLine} />
          <Ionicons name="radio" size={10} color="rgba(0,242,255,0.4)" />
          <View style={s.divLine} />
        </View>
        <EliteDivisionUpdates />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  dividerSection: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
});
