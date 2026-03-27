import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, StatusBar, TouchableOpacity,
} from 'react-native';
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
  xpText: { color: '#FFD700', fontSize: 14, fontWeight: '900' },
  unit: { fontSize: 11, color: '#A07000' },
  bar: { height: 4, backgroundColor: '#1A1A1A', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 2 },
});

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  live: { label: '● LIVE', color: '#FF3B30', bg: 'rgba(255,59,48,0.1)' },
  upcoming: { label: '◆ PROSSIMO', color: '#FFD700', bg: 'rgba(255,215,0,0.08)' },
  completed: { label: '✓ CONCLUSO', color: '#3A3A3A', bg: 'rgba(58,58,58,0.2)' },
};

function BattleCard({ battle }: { battle: any }) {
  const s = STATUS_CFG[battle.status] || STATUS_CFG.upcoming;
  return (
    <View style={bc$.card} testID={`battle-card-${battle.id}`}>
      <View style={bc$.row}>
        <View style={[bc$.badge, { backgroundColor: s.bg }]}>
          <Text style={[bc$.badgeText, { color: s.color }]}>{s.label}</Text>
        </View>
        <Text style={bc$.xp}>+{battle.xp_reward} XP</Text>
      </View>
      <Text style={bc$.title}>{battle.title}</Text>
      <Text style={bc$.desc}>{battle.description}</Text>
      <View style={bc$.footer}>
        <Text style={bc$.sport}>{battle.sport}</Text>
        <Text style={bc$.participants}>{battle.participants_count} atleti</Text>
      </View>
    </View>
  );
}

const bc$ = StyleSheet.create({
  card: {
    backgroundColor: '#111111', borderRadius: 12, padding: 16,
    marginHorizontal: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#1E1E1E', gap: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  xp: { color: '#FFD700', fontSize: 13, fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  desc: { color: '#555555', fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sport: { color: '#00E5FF', fontSize: 12, fontWeight: '600' },
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

  const loadBattles = async () => {
    if (!token) return;
    try {
      const data = await api.getBattles(token);
      setBattles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadBattles(); }, [token]);

  return (
    <View style={styles.container} testID="core-tab">
      <StatusBar barStyle="light-content" />
      <Header title="CORE" />
      <XPBar xp={user?.xp || 0} level={user?.level || 1} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#00E5FF" size="large" /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadBattles(); }}
              tintColor="#00E5FF"
            />
          }
        >
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
