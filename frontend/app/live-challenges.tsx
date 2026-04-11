/**
 * LIVE & RISPONDI — Real-time Arena (Build 35)
 * ══════════════════════════════════════════════
 * Shows live/scheduled challenges + pending responses
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, api } from '../utils/api';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const CYAN = '#00E5FF';
const GOLD = '#FFD700';
const RED = '#FF3B30';
const PURPLE = '#BF5AF2';

export default function LiveChallenges() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveChallenges, setLiveChallenges] = useState<any[]>([]);
  const [respondData, setRespondData] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [liveRes, respondRes] = await Promise.all([
        apiClient('/challenges/live').catch(() => ({ live: [] })),
        apiClient('/challenges/respond-eligible').catch(() => null),
      ]);
      setLiveChallenges(liveRes?.live || []);
      setRespondData(respondRes);
    } catch { /* */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAccept = async (challengeId: string) => {
    if (!token) return;
    try {
      await api.acceptPvPChallenge(challengeId, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      loadData();
    } catch (e: any) {
      console.warn('Accept error:', e);
    }
  };

  const handleRematch = async () => {
    if (!token || !respondData?.rematch) return;
    try {
      const rm = respondData.rematch;
      await api.sendPvPChallenge(rm.opponent_id, rm.discipline || 'power', rm.xp_stake || 100, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      loadData();
    } catch (e: any) {
      console.warn('Rematch error:', e);
    }
  };

  return (
    <View style={ls.container}>
      <StatusBar barStyle="light-content" />
      <View style={[ls.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={ls.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={ls.topTitle}>LIVE ARENA</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={ls.scroll}
        contentContainerStyle={[ls.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
      >
        {/* ═══ RISPONDI Section ═══ */}
        {respondData?.eligible && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={ls.sectionLabel}>RISPONDI</Text>

            {/* Pending challenges */}
            {(respondData?.pending || []).map((p: any, idx: number) => (
              <View key={p.id} style={ls.pendingCard}>
                <View style={ls.pendingLeft}>
                  <Ionicons name="flash" size={18} color={GOLD} />
                  <View style={ls.pendingText}>
                    <Text style={ls.pendingName}>{p.challenger?.toUpperCase()}</Text>
                    <Text style={ls.pendingDiscipline}>{p.discipline?.toUpperCase()} · {p.xp_stake} XP</Text>
                  </View>
                </View>
                <TouchableOpacity style={ls.acceptBtn} activeOpacity={0.85} onPress={() => handleAccept(p.id)}>
                  <Text style={ls.acceptText}>ACCETTA</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Rematch */}
            {respondData?.lost_last && respondData?.rematch && (
              <TouchableOpacity style={ls.rematchCard} activeOpacity={0.85} onPress={handleRematch}>
                <LinearGradient colors={['rgba(255,59,48,0.1)', 'rgba(255,215,0,0.06)']} start={{x:0,y:0}} end={{x:1,y:0}} style={ls.rematchGrad}>
                  <Ionicons name="refresh" size={20} color={RED} />
                  <View style={ls.rematchText}>
                    <Text style={ls.rematchTitle}>RIVINCITA</Text>
                    <Text style={ls.rematchSub}>vs {respondData.rematch.opponent_username?.toUpperCase()} · Stessi parametri</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={GOLD} />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* ═══ LIVE Section ═══ */}
        <Text style={ls.sectionLabel}>SFIDE LIVE</Text>
        {loading ? <ActivityIndicator color={CYAN} style={{ marginTop: 20 }} /> :
          liveChallenges.length === 0 ? (
            <View style={ls.emptyCard}>
              <Ionicons name="radio-outline" size={32} color="rgba(255,255,255,0.08)" />
              <Text style={ls.emptyTitle}>NESSUNA SFIDA LIVE</Text>
              <Text style={ls.emptySub}>Le sfide accettate appariranno qui</Text>
            </View>
          ) : (
            liveChallenges.map((ch, idx) => (
              <Animated.View key={ch.id} entering={FadeInDown.delay(idx * 80).duration(300)}>
                <View style={ls.liveCard}>
                  <View style={[ls.liveDot, { backgroundColor: ch.type === 'pvp' ? CYAN : PURPLE }]} />
                  <View style={ls.liveText}>
                    <Text style={ls.liveName}>vs {(ch.opponent || 'KORE').toUpperCase()}</Text>
                    <Text style={ls.liveMeta}>{ch.discipline?.toUpperCase()} · {ch.status?.toUpperCase()}</Text>
                  </View>
                  <View style={ls.liveTypeBadge}>
                    <Text style={[ls.liveTypeText, { color: ch.type === 'pvp' ? CYAN : PURPLE }]}>{ch.type?.toUpperCase()}</Text>
                  </View>
                </View>
              </Animated.View>
            ))
          )
        }
      </ScrollView>
    </View>
  );
}

const ls = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  sectionLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 12, marginTop: 16 },
  // Pending
  pendingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,215,0,0.04)', borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)' },
  pendingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  pendingText: { gap: 2 },
  pendingName: { color: GOLD, fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  pendingDiscipline: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  acceptBtn: { backgroundColor: GOLD, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  acceptText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  // Rematch
  rematchCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,59,48,0.12)' },
  rematchGrad: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  rematchText: { flex: 1, gap: 2 },
  rematchTitle: { color: RED, fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  rematchSub: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600' },
  // Live
  liveCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { flex: 1, gap: 2 },
  liveName: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  liveMeta: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  liveTypeBadge: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  liveTypeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  emptyCard: { alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  emptyTitle: { color: 'rgba(255,255,255,0.15)', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  emptySub: { color: 'rgba(255,255,255,0.08)', fontSize: 11, fontWeight: '600' },
});
