import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, StatusBar, TouchableOpacity, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, withRepeat, withSequence, withTiming, useAnimatedStyle, Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { Header } from '../../components/Header';
import { getBattleImage } from '../../utils/images';

function XPBar({ xp, level }: { xp: number; level: number }) {
  const xpForNext = level * 500;
  const progress = Math.min(1, xp / xpForNext);
  return (
    <View style={xp$.container} testID="xp-bar">
      <View style={xp$.row}>
        <Text style={xp$.lvl}>LVL {level}</Text>
        <Text style={xp$.xpText}>{xp} <Text style={xp$.unit}>XP</Text></Text>
        <Text style={xp$.lvl}>LVL {level + 1}</Text>
      </View>
      <View style={xp$.bar}>
        <View style={[xp$.fill, { width: `${progress * 100}%` as any }]} />
      </View>
    </View>
  );
}

const xp$ = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#050505' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  lvl: { color: '#3A3A3A', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  xpText: { color: '#D4AF37', fontSize: 14, fontWeight: '900' },
  unit: { fontSize: 11, color: '#8A7020' },
  bar: { height: 4, backgroundColor: '#1A1A1A', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: 2 },
});

function LiveDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.2, { duration: 650 }), withTiming(1, { duration: 650 })),
      -1, false
    );
  }, []);
  const pStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[bc$.liveDot, pStyle]} />;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; pulse?: boolean }> = {
  live:      { label: 'LIVE',     color: '#FF3B30', bg: 'rgba(255,59,48,0.25)', pulse: true },
  upcoming:  { label: 'PROSSIMO', color: '#D4AF37', bg: 'rgba(212,175,55,0.2)' },
  completed: { label: 'CONCLUSO', color: '#888888', bg: 'rgba(136,136,136,0.2)' },
};

function BattleCard({ battle }: { battle: any }) {
  const s = STATUS_CFG[battle.status] || STATUS_CFG.upcoming;
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(1);

  useEffect(() => {
    if (battle.status === 'live') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.015, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ), -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 900 }),
          withTiming(0.15, { duration: 900 })
        ), -1, false
      );
      badgeScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ), -1, false
      );
    }
  }, [battle.status]);

  const liveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));
  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const imageUri = getBattleImage(battle.sport);

  return (
    <Animated.View style={[
      bc$.card,
      battle.status === 'live' && bc$.cardLive,
      liveStyle,
      battle.status === 'live' && glowStyle,
    ]}>
      <ImageBackground
        source={{ uri: imageUri }}
        style={bc$.imageBg}
        imageStyle={bc$.imageStyle}
      >
        <LinearGradient
          colors={['transparent', 'rgba(5,5,5,0.65)', 'rgba(5,5,5,0.95)']}
          locations={[0, 0.35, 0.85]}
          style={bc$.gradient}
        >
          <View style={bc$.row}>
            <Animated.View style={[bc$.badge, { backgroundColor: s.bg }, battle.status === 'live' && badgeAnimStyle]}>
              {s.pulse && <LiveDot />}
              <Text style={[bc$.badgeText, { color: s.color }]}>{s.label}</Text>
            </Animated.View>
            <View style={bc$.xpBadge}>
              <Text style={bc$.xp}>+{battle.xp_reward} XP</Text>
            </View>
          </View>
          <View style={bc$.textContent}>
            <Text style={bc$.title}>{battle.title}</Text>
            <Text style={bc$.desc} numberOfLines={2}>{battle.description}</Text>
            <View style={bc$.footer}>
              <Text style={bc$.sport}>{battle.sport}</Text>
              <Text style={bc$.participants}>{battle.participants_count} atleti</Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </Animated.View>
  );
}

const bc$ = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  cardLive: {
    shadowColor: '#FF3B30', shadowRadius: 20, elevation: 12,
  },
  imageBg: { width: '100%', height: 200 },
  imageStyle: { borderRadius: 16, opacity: 0.85 },
  gradient: { flex: 1, justifyContent: 'space-between', padding: 16, borderRadius: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    backdropFilter: 'blur(10px)',
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF3B30' },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  xpBadge: {
    backgroundColor: 'rgba(212,175,55,0.2)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  xp: { color: '#D4AF37', fontSize: 12, fontWeight: '800' },
  textContent: { gap: 4 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  desc: { color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sport: { color: '#00F2FF', fontSize: 12, fontWeight: '700' },
  participants: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
});

const MEDALS = [
  { emoji: '\ud83e\udd47', label: 'Oro', count: 2 },
  { emoji: '\ud83e\udd48', label: 'Argento', count: 5 },
  { emoji: '\ud83e\udd49', label: 'Bronzo', count: 3 },
  { emoji: '\ud83c\udf96\ufe0f', label: 'Onore', count: 8 },
];

export default function KoreTab() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [battles, setBattles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const liveCount = battles.filter(b => b.status === 'live').length;

  const loadBattles = async () => {
    if (!token) return;
    try {
      const data = await api.getBattles(token);
      setBattles(data);
    } catch (e) { /* silenced for production */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadBattles(); }, [token]);

  return (
    <View style={styles.container} testID="kore-tab">
      <StatusBar barStyle="light-content" />
      <Header title="KORE" />
      <XPBar xp={user?.xp || 0} level={user?.level || 1} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#00F2FF" size="large" /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadBattles(); }}
              tintColor="#00F2FF"
            />
          }
        >
          {/* HALL OF KORE BANNER */}
          <TouchableOpacity
            testID="hall-of-kore-banner"
            style={styles.hallBanner}
            onPress={() => router.push('/(tabs)/hall')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['rgba(212,175,55,0.12)', 'rgba(212,175,55,0.04)', 'transparent']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.hallGrad}
            >
              <View style={styles.hallLeft}>
                <Text style={styles.hallIcon}>{'\ud83c\udfc6'}</Text>
                <View style={styles.hallTextCol}>
                  <Text style={styles.hallTitle}>HALL OF KORE</Text>
                  <Text style={styles.hallSub}>Classifica Globale {'\u00b7'} Vedi il tuo Rank</Text>
                </View>
              </View>
              <Text style={styles.hallArrow}>{'\u2192'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {liveCount > 0 && (
            <View style={styles.liveBanner} testID="live-banner">
              <LiveDot />
              <Text style={styles.liveBannerText}>{liveCount} BATTLE LIVE</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>{'\u2694\ufe0f'}  BATTLE ARENA</Text>
          {battles.map(b => <BattleCard key={b.id} battle={b} />)}

          <Text style={styles.sectionTitle}>{'\ud83c\udfc5'}  PALMAR{'\u00c8'}S</Text>
          <View style={styles.medalsRow}>
            {MEDALS.map((m, i) => (
              <View key={i} style={styles.medalCard}>
                <Text style={styles.medalEmoji}>{m.emoji}</Text>
                <Text style={styles.medalCount}>{m.count}</Text>
                <Text style={styles.medalLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Hall of KORE Banner
  hallBanner: {
    marginHorizontal: 16, marginTop: 12, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
  },
  hallGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  hallLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hallIcon: { fontSize: 22 },
  hallTextCol: { gap: 1 },
  hallTitle: { color: '#D4AF37', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  hallSub: { color: '#888', fontSize: 10, fontWeight: '600' },
  hallArrow: { color: '#D4AF37', fontSize: 18, fontWeight: '300' },

  liveBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    backgroundColor: 'rgba(255,59,48,0.06)',
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.15)',
  },
  liveBannerText: { color: '#FF3B30', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  sectionTitle: {
    color: '#FFFFFF', fontSize: 12, fontWeight: '800',
    letterSpacing: 2, paddingHorizontal: 16,
    paddingTop: 20, paddingBottom: 12, textTransform: 'uppercase',
  },
  medalsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  medalCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 3,
  },
  medalEmoji: { fontSize: 24 },
  medalCount: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  medalLabel: { color: '#555555', fontSize: 10, fontWeight: '700' },
});
