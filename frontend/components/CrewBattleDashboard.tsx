/**
 * ARENAKORE — CREW BATTLE DASHBOARD v1.0
 * Real-time Power Bar + Mini-Feed durante sfide Crew vs Crew.
 * Weighted average calculation, polling ogni 5s.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  Platform, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeInDown, FadeInRight, useSharedValue, withTiming,
  useAnimatedStyle, Easing, withRepeat, withSequence, interpolateColor
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

const FONT_J = Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined });
const FONT_M = Platform.select({ web: 'Montserrat, sans-serif', default: undefined });

const COLOR_A = '#00E5FF';
const COLOR_B = '#FF3B30';

interface BattleData {
  id: string;
  status: string;
  ends_at: string | null;
  crew_a: {
    name: string; base_score: number; contribution: number;
    total: number; pct: number; active_members: number;
  };
  crew_b: {
    name: string; base_score: number; contribution: number;
    total: number; pct: number; active_members: number;
  };
  feed: Array<{
    username: string; crew_side: string; crew_name: string;
    pts: number; reps: number; quality: number; time: string | null;
  }>;
}

interface Props {
  visible: boolean;
  battleId: string | null;
  onClose: () => void;
}

export function CrewBattleDashboard({ visible, battleId, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [data, setData] = useState<BattleData | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchBattle = useCallback(async () => {
    if (!battleId || !token) return;
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/api/battles/crew/${battleId}/detail`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {} finally { setLoading(false); }
  }, [battleId, token]);

  // Poll every 5 seconds
  useEffect(() => {
    if (visible && battleId) {
      fetchBattle();
      pollRef.current = setInterval(fetchBattle, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [visible, battleId, fetchBattle]);

  // Power bar animation
  const barWidth = useSharedValue(50);
  useEffect(() => {
    if (data) {
      barWidth.value = withTiming(data.crew_a.pct, { duration: 800, easing: Easing.out(Easing.cubic) });
    }
  }, [data?.crew_a.pct]);
  const barAStyle = useAnimatedStyle(() => ({ flex: Math.max(barWidth.value, 0.01) }));
  const barBStyle = useAnimatedStyle(() => ({ flex: Math.max(100 - barWidth.value, 0.01) }));

  // Pulse glow for leading team
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ), -1, true,
    );
  }, []);

  // Countdown
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    if (!data?.ends_at) return;
    const interval = setInterval(() => {
      const diff = new Date(data.ends_at!).getTime() - Date.now();
      if (diff <= 0) { setCountdown('TERMINATA'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [data?.ends_at]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={[s.backdrop, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.backBtn}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>CREW BATTLE</Text>
            <Text style={s.headerSub}>
              {data?.status === 'live' ? '🔴 LIVE' : data?.status?.toUpperCase() || 'LOADING...'}
              {countdown ? ` — ${countdown}` : ''}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {loading && !data ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#00E5FF" />
          </View>
        ) : data ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            {/* ═══ CREW NAMES ═══ */}
            <Animated.View entering={FadeInDown.delay(100)} style={s.crewRow}>
              <View style={s.crewInfo}>
                <View style={[s.crewDot, { backgroundColor: COLOR_A }]} />
                <View>
                  <Text style={[s.crewName, { color: COLOR_A }]}>{data.crew_a.name}</Text>
                  <Text style={s.crewMembers}>{data.crew_a.active_members} attivi</Text>
                </View>
              </View>
              <Text style={s.vs}>VS</Text>
              <View style={[s.crewInfo, { alignItems: 'flex-end' }]}>
                <View>
                  <Text style={[s.crewName, { color: COLOR_B, textAlign: 'right' }]}>{data.crew_b.name}</Text>
                  <Text style={[s.crewMembers, { textAlign: 'right' }]}>{data.crew_b.active_members} attivi</Text>
                </View>
                <View style={[s.crewDot, { backgroundColor: COLOR_B }]} />
              </View>
            </Animated.View>

            {/* ═══ POWER BAR ═══ */}
            <Animated.View entering={FadeInDown.delay(200)} style={s.powerSection}>
              <View style={s.scoreRow}>
                <Text style={[s.scoreNum, { color: COLOR_A }]}>{data.crew_a.total}</Text>
                <Text style={s.scorePct}>{data.crew_a.pct}% — {data.crew_b.pct}%</Text>
                <Text style={[s.scoreNum, { color: COLOR_B }]}>{data.crew_b.total}</Text>
              </View>
              <View style={s.barTrack}>
                <Animated.View style={[s.barA, barAStyle]}>
                  <LinearGradient colors={[COLOR_A + 'AA', COLOR_A]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.barGrad} />
                </Animated.View>
                <Animated.View style={[s.barB, barBStyle]}>
                  <LinearGradient colors={[COLOR_B, COLOR_B + 'AA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.barGrad} />
                </Animated.View>
              </View>
              <View style={s.breakdownRow}>
                <View>
                  <Text style={s.breakLabel}>BASE</Text>
                  <Text style={[s.breakVal, { color: COLOR_A }]}>{data.crew_a.base_score}</Text>
                </View>
                <View>
                  <Text style={s.breakLabel}>CONTRIB.</Text>
                  <Text style={[s.breakVal, { color: COLOR_A }]}>+{data.crew_a.contribution}</Text>
                </View>
                <View style={s.breakDivider} />
                <View>
                  <Text style={[s.breakLabel, { textAlign: 'right' }]}>CONTRIB.</Text>
                  <Text style={[s.breakVal, { color: COLOR_B, textAlign: 'right' }]}>+{data.crew_b.contribution}</Text>
                </View>
                <View>
                  <Text style={[s.breakLabel, { textAlign: 'right' }]}>BASE</Text>
                  <Text style={[s.breakVal, { color: COLOR_B, textAlign: 'right' }]}>{data.crew_b.base_score}</Text>
                </View>
              </View>
            </Animated.View>

            {/* ═══ LIVE FEED ═══ */}
            <Animated.View entering={FadeInDown.delay(350)} style={s.feedSection}>
              <Text style={s.feedTitle}>⚡ LIVE FEED</Text>
              {data.feed.length === 0 ? (
                <Text style={s.feedEmpty}>In attesa di contribuzioni...</Text>
              ) : (
                data.feed.map((entry, i) => {
                  const isA = entry.crew_side === 'A';
                  const col = isA ? COLOR_A : COLOR_B;
                  return (
                    <Animated.View key={i} entering={FadeInRight.delay(i * 60)} style={[s.feedItem, { borderLeftColor: col }]}>
                      <View style={s.feedItemTop}>
                        <Text style={[s.feedUser, { color: col }]}>{entry.username}</Text>
                        <Text style={[s.feedPts, { color: col }]}>+{entry.pts} pts</Text>
                      </View>
                      <Text style={s.feedMsg}>
                        {entry.reps > 0
                          ? `Ha completato ${entry.reps} reps! La ${entry.crew_name} sta accelerando!`
                          : `Contribuzione qualità ${entry.quality}%. ${entry.crew_name} avanza!`}
                      </Text>
                    </Animated.View>
                  );
                })
              )}
            </Animated.View>

            <View style={{ height: 40 }} />
          </ScrollView>
        ) : (
          <View style={s.center}>
            <Ionicons name="alert-circle" size={40} color="rgba(255,255,255,0.2)" />
            <Text style={s.errorText}>Battle non trovata</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)'
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center'
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
  headerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', fontFamily: FONT_M, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '600', fontFamily: FONT_M, marginTop: 12 },
  body: { paddingHorizontal: 16, paddingTop: 20 },

  // Crew names
  crewRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20
  },
  crewInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  crewDot: { width: 10, height: 10, borderRadius: 5 },
  crewName: { fontSize: 16, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_J },
  crewMembers: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '600', fontFamily: FONT_M, marginTop: 1 },
  vs: { color: 'rgba(255,255,255,0.15)', fontSize: 18, fontWeight: '900', fontFamily: FONT_J, marginHorizontal: 12 },

  // Power Bar
  powerSection: {
    padding: 18, borderRadius: 18, marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  scoreNum: { fontSize: 32, fontWeight: '900', fontFamily: FONT_J },
  scorePct: { color: 'rgba(255,255,255,0.20)', fontSize: 12, fontWeight: '800', fontFamily: FONT_J, letterSpacing: 1 },
  barTrack: { flexDirection: 'row', height: 20, borderRadius: 10, overflow: 'hidden', marginBottom: 14 },
  barA: { height: 20, overflow: 'hidden' },
  barB: { height: 20, overflow: 'hidden' },
  barGrad: { flex: 1, borderRadius: 10 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  breakLabel: { color: 'rgba(255,255,255,0.15)', fontSize: 8, fontWeight: '800', letterSpacing: 1.5, fontFamily: FONT_M },
  breakVal: { fontSize: 16, fontWeight: '900', fontFamily: FONT_J, marginTop: 2 },
  breakDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.05)' },

  // Feed
  feedSection: { marginBottom: 20 },
  feedTitle: { color: '#FFD700', fontSize: 14, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J, marginBottom: 12 },
  feedEmpty: { color: 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: '500', fontFamily: FONT_M, textAlign: 'center', paddingVertical: 20 },
  feedItem: {
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 6,
    borderLeftWidth: 3, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  feedItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  feedUser: { fontSize: 13, fontWeight: '900', fontFamily: FONT_J },
  feedPts: { fontSize: 13, fontWeight: '900', fontFamily: FONT_J },
  feedMsg: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '500', fontFamily: FONT_M }
});
