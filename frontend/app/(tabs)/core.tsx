import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue, withRepeat, withSequence, withTiming, useAnimatedStyle,
} from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { Header } from '../../components/Header';

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

// Pulsing live indicator
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
  live:      { label: 'LIVE',     color: '#FF3B30', bg: 'rgba(255,59,48,0.12)', pulse: true },
  upcoming:  { label: 'PROSSIMO', color: '#D4AF37', bg: 'rgba(212,175,55,0.1)' },
  completed: { label: 'CONCLUSO', color: '#3A3A3A', bg: 'rgba(58,58,58,0.2)' },
};

function BattleCard({ battle }: { battle: any }) {
  const s = STATUS_CFG[battle.status] || STATUS_CFG.upcoming;
  return (
    <View
      style={[bc$.card, battle.status === 'live' && bc$.cardLive]}
      testID={`battle-card-${battle.id}`}
    >
      <View style={bc$.row}>
        <View style={[bc$.badge, { backgroundColor: s.bg }]}>
          {s.pulse && <LiveDot />}
          <Text style={[bc$.badgeText, { color: s.color }]}>{s.label}</Text>
        </View>
        <Text style={bc$.xp}>+{battle.xp_reward} XP</Text>
      </View>
      <Text style={bc$.title}>{battle.title}</Text>
      <Text style={bc$.desc}>{battle.description}</Text>
      <View style={bc$.footer}>
        <Text style={bc$.sport}>{battle.sport}</Text>
        <Text style={bc$.participants}>👥 {battle.participants_count} atleti</Text>
      </View>
    </View>
  );
}

const bc$ = StyleSheet.create({
  card: {
    backgroundColor: '#111111', borderRadius: 14, padding: 16,
    marginHorizontal: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#1E1E1E', gap: 8,
  },
  cardLive: { borderColor: 'rgba(255,59,48,0.25)' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 5, paddingHorizontal: 10, paddingVertical: 4,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF3B30' },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  xp: { color: '#D4AF37', fontSize: 13, fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  desc: { color: '#555555', fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  sport: { color: '#00F2FF', fontSize: 12, fontWeight: '600' },
  participants: { color: '#444', fontSize: 12 },
});

const MEDALS = [
  { emoji: '🥇', label: 'Oro', count: 2 },
  { emoji: '🥈', label: 'Argento', count: 5 },
  { emoji: '🥉', label: 'Bronzo', count: 3 },
  { emoji: '🎖️', label: 'Onore', count: 8 },
];

export default function CoreTab() {
  const { user, token } = useAuth();
  const [battles, setBattles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const liveCount = battles.filter(b => b.status === 'live').length;

  const loadBattles = async () => {
    if (!token) return;
    try {
      const data = await api.getBattles(token);
      setBattles(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadBattles(); }, [token]);

  return (
    <View style={styles.container} testID="core-tab">
      <StatusBar barStyle="light-content" />
      <Header title="CORE" />
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
          {liveCount > 0 && (
            <View style={styles.liveBanner} testID="live-banner">
              <LiveDot />
              <Text style={styles.liveBannerText}>{liveCount} BATTLE IN CORSO ADESSO</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>⚔️  BATTLE LIVE</Text>
          {battles.map(b => <BattleCard key={b.id} battle={b} />)}

          <Text style={styles.sectionTitle}>🏅  MEDAGLIE</Text>
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
  liveBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, marginBottom: 0,
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.25)',
  },
  liveBannerText: { color: '#FF3B30', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  sectionTitle: {
    color: '#FFFFFF', fontSize: 12, fontWeight: '800',
    letterSpacing: 2, paddingHorizontal: 16,
    paddingTop: 20, paddingBottom: 12, textTransform: 'uppercase',
  },
  medalsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  medalCard: {
    flex: 1, backgroundColor: '#111111', borderRadius: 10, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#1E1E1E', gap: 3,
  },
  medalEmoji: { fontSize: 24 },
  medalCount: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  medalLabel: { color: '#555555', fontSize: 10, fontWeight: '700' },
});
