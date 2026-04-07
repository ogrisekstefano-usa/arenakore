/**
 * ARENAKORE — CREW BATTLE LIVE PROGRESS BAR
 * Real-time progress tracking for Crew vs Crew battles
 * Polls every 5 seconds and shows weighted average scores
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, FlatList
} from 'react-native';
import Animated, {
  FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withTiming,
  withRepeat, withSequence, Easing, withSpring
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../utils/api';

let SW = 390; try { SW = Dimensions.get('window').width; } catch(e) {}
const FONT_M = 'Montserrat_800ExtraBold';
const FONT_J = 'PlusJakartaSans_800ExtraBold';

interface MemberStat {
  user_id: string;
  username: string;
  total_pts: number;
  scans: number;
  avg_quality: number;
  total_reps: number;
}

interface CrewData {
  id: string;
  name: string;
  base_score: number;
  contribution: number;
  total_score: number;
  pct: number;
  active_members: number;
  members: MemberStat[];
}

interface BattleState {
  battle_id: string;
  status: string;
  crew_a: CrewData;
  crew_b: CrewData;
  remaining_seconds: number;
  live_feed: any[];
}

interface Props {
  battleId: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  myCrewId?: string;
}

export function CrewBattleProgressBar({ battleId, isExpanded = false, onToggleExpand, myCrewId }: Props) {
  const [state, setState] = useState<BattleState | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animated progress bar — use flex instead of percentage width for native compatibility
  const progressA = useSharedValue(0.5);
  const progressB = useSharedValue(0.5);
  const pulse = useSharedValue(0.8);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.8, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ), -1, false
    );
  }, []);

  const barStyleA = useAnimatedStyle(() => ({
    flex: progressA.value
  }));
  const barStyleB = useAnimatedStyle(() => ({
    flex: progressB.value
  }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const fetchState = useCallback(async () => {
    try {
      const data = await apiClient(`/api/battles/crew/${battleId}/live-state`);
      setState(data);
      progressA.value = withSpring(data.crew_a.pct / 100, { damping: 20, stiffness: 100 });
      progressB.value = withSpring(data.crew_b.pct / 100, { damping: 20, stiffness: 100 });
    } catch (e) {
      console.log('Battle state fetch failed', e);
    } finally {
      setLoading(false);
    }
  }, [battleId]);

  useEffect(() => {
    fetchState();
    pollRef.current = setInterval(fetchState, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchState]);

  if (loading || !state) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={cb$.loader}>
        <Animated.View style={pulseStyle}>
          <Ionicons name="flash" size={18} color="#FF453A" />
        </Animated.View>
        <Text style={cb$.loaderText}>Sincronizzazione battle...</Text>
      </Animated.View>
    );
  }

  const { crew_a, crew_b, remaining_seconds, live_feed } = state;
  const hours = Math.floor(remaining_seconds / 3600);
  const mins = Math.floor((remaining_seconds % 3600) / 60);
  const isMyCrewA = myCrewId === crew_a.id;
  const isMyCrewB = myCrewId === crew_b.id;
  const myPct = isMyCrewA ? crew_a.pct : isMyCrewB ? crew_b.pct : 50;
  const winning = crew_a.total_score > crew_b.total_score ? 'A' : crew_b.total_score > crew_a.total_score ? 'B' : 'TIE';

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={cb$.container}>
      {/* Header */}
      <TouchableOpacity style={cb$.header} activeOpacity={0.7} onPress={onToggleExpand}>
        <Animated.View style={pulseStyle}>
          <Ionicons name="flash" size={14} color="#FF453A" />
        </Animated.View>
        <Text style={cb$.liveTag}>LIVE</Text>
        <Text style={cb$.headerTitle}>{crew_a.name} vs {crew_b.name}</Text>
        <View style={cb$.timerBadge}>
          <Ionicons name="time-outline" size={10} color="#00E5FF" />
          <Text style={cb$.timerText}>{hours}h {mins}m</Text>
        </View>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#555" />
      </TouchableOpacity>

      {/* Progress Bar */}
      <View style={cb$.barContainer}>
        <View style={cb$.barBg}>
          <Animated.View style={[cb$.barA, barStyleA]}>
            <Text style={cb$.barPct}>{Math.round(crew_a.pct)}%</Text>
          </Animated.View>
          <Animated.View style={[cb$.barB, barStyleB]}>
            <Text style={cb$.barPct}>{Math.round(crew_b.pct)}%</Text>
          </Animated.View>
        </View>
      </View>

      {/* Score Row */}
      <View style={cb$.scoreRow}>
        <View style={cb$.scoreBlock}>
          <Text style={[cb$.teamName, isMyCrewA && cb$.myTeam]}>{crew_a.name}</Text>
          <Text style={[cb$.score, winning === 'A' && { color: '#00FF87' }]}>{crew_a.total_score}</Text>
          <Text style={cb$.activeMem}>{crew_a.active_members} attivi</Text>
        </View>
        <View style={cb$.vsCircle}>
          <Text style={cb$.vs}>VS</Text>
        </View>
        <View style={[cb$.scoreBlock, { alignItems: 'flex-end' }]}>
          <Text style={[cb$.teamName, isMyCrewB && cb$.myTeam]}>{crew_b.name}</Text>
          <Text style={[cb$.score, winning === 'B' && { color: '#00FF87' }]}>{crew_b.total_score}</Text>
          <Text style={cb$.activeMem}>{crew_b.active_members} attivi</Text>
        </View>
      </View>

      {/* Expanded: Member Stats + Live Feed */}
      {isExpanded && (
        <Animated.View entering={FadeInDown.duration(300)} style={cb$.expandedSection}>
          {/* Team A Members */}
          <Text style={[cb$.sectionLabel, { color: '#00E5FF' }]}>{crew_a.name} — MEMBRI</Text>
          {crew_a.members.map((m, i) => (
            <View key={m.user_id} style={cb$.memberRow}>
              <Text style={cb$.memberRank}>#{i + 1}</Text>
              <Text style={cb$.memberName}>{m.username}</Text>
              <Text style={cb$.memberPts}>{m.total_pts} pts</Text>
              <Text style={cb$.memberScans}>{m.scans} scan</Text>
            </View>
          ))}

          {/* Team B Members */}
          <Text style={[cb$.sectionLabel, { color: '#FF453A', marginTop: 12 }]}>{crew_b.name} — MEMBRI</Text>
          {crew_b.members.map((m, i) => (
            <View key={m.user_id} style={cb$.memberRow}>
              <Text style={cb$.memberRank}>#{i + 1}</Text>
              <Text style={cb$.memberName}>{m.username}</Text>
              <Text style={cb$.memberPts}>{m.total_pts} pts</Text>
              <Text style={cb$.memberScans}>{m.scans} scan</Text>
            </View>
          ))}

          {/* Live Feed */}
          {live_feed.length > 0 && (
            <>
              <Text style={[cb$.sectionLabel, { color: '#FFD700', marginTop: 12 }]}>ATTIVITÀ LIVE</Text>
              {live_feed.slice(0, 5).map((f, i) => (
                <View key={i} style={cb$.feedRow}>
                  <View style={[cb$.feedDot, { backgroundColor: f.crew_side === 'A' ? '#00E5FF' : '#FF453A' }]} />
                  <Text style={cb$.feedText}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>{f.username}</Text>
                    {' +' + f.pts + ' pts · Q' + f.quality}
                  </Text>
                </View>
              ))}
            </>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const cb$ = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,69,58,0.04)', borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.15)', marginBottom: 12, overflow: 'hidden'
  },
  loader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  loaderText: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  liveTag: { color: '#FF453A', fontSize: 9, fontWeight: '900', letterSpacing: 2, backgroundColor: 'rgba(255,69,58,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  headerTitle: { flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timerText: { color: '#00E5FF', fontSize: 10, fontWeight: '900', fontFamily: FONT_J },
  barContainer: { paddingHorizontal: 14, paddingBottom: 10 },
  barBg: { flexDirection: 'row', height: 22, borderRadius: 11, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)' },
  barA: { height: '100%', backgroundColor: 'rgba(0,229,255,0.30)', justifyContent: 'center', paddingLeft: 8, borderTopLeftRadius: 11, borderBottomLeftRadius: 11 },
  barB: { height: '100%', backgroundColor: 'rgba(255,69,58,0.30)', justifyContent: 'center', alignItems: 'flex-end', paddingRight: 8, borderTopRightRadius: 11, borderBottomRightRadius: 11 },
  barPct: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '900', fontFamily: FONT_J },
  scoreRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12 },
  scoreBlock: { flex: 1 },
  teamName: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  myTeam: { color: '#00E5FF' },
  score: { color: '#fff', fontSize: 22, fontWeight: '900', fontFamily: FONT_J },
  activeMem: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '700' },
  vsCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  vs: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  expandedSection: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  sectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginTop: 10, marginBottom: 6 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  memberRank: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '900', width: 20 },
  memberName: { flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' },
  memberPts: { color: '#FFD700', fontSize: 11, fontWeight: '900', fontFamily: FONT_J },
  memberScans: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '700', width: 50, textAlign: 'right' },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  feedDot: { width: 6, height: 6, borderRadius: 3 },
  feedText: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '600' }
});
