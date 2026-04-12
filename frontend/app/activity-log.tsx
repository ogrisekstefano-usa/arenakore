/**
 * ARCHIVIO STORICO — Build 37 · Activity Log
 * ═══════════════════════════════════════════════
 * Full-screen Activity Archive with:
 * - Filter tabs: TUTTO / ALLENAMENTO / SFIDA / NÈXUS
 * - Stats header (sessions, flux, certified)
 * - ActivityCard list (expandable with Evidence + Telemetry)
 * - Pull-to-refresh + infinite scroll
 *
 * Nike Premium aesthetic — OLED Black.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, FlatList
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { request as apiRequest } from '../utils/api';
import { ActivityCard } from '../components/ActivityCard';

const GOLD = '#FFD700';
const CYAN = '#00E5FF';
const PURPLE = '#BF5AF2';
const RED = '#FF453A';
const GREEN = '#32D74B';
const BG = '#000000';

// Filter tabs
const FILTERS = [
  { key: 'all', label: 'TUTTO', icon: 'list', color: GOLD },
  { key: 'ALLENAMENTO', label: 'TRAINING', icon: 'barbell', color: CYAN },
  { key: 'SFIDA_UGC', label: 'SFIDA', icon: 'trophy', color: GOLD },
  { key: 'nexus', label: 'NÈXUS', icon: 'shield-checkmark', color: CYAN },
] as const;

async function safeFetch(path: string, token?: string | null): Promise<any> {
  try { return await apiRequest(path, {}, token); }
  catch { return { _error: true }; }
}

export default function ActivityLogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const [filter, setFilter] = useState('all');
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadData = useCallback(async (reset = true) => {
    if (!token) { setLoading(false); return; }
    const newOffset = reset ? 0 : offset;

    let path = `/activity/log?limit=20&offset=${newOffset}`;
    if (filter === 'nexus') {
      path += '&nexus_only=true';
    } else if (filter !== 'all') {
      path += `&tipo=${filter}`;
    }

    const res = await safeFetch(path, token);

    if (!res?._error && Array.isArray(res?.records)) {
      if (reset) {
        setActivities(res.records);
      } else {
        setActivities(prev => [...prev, ...res.records]);
      }
      setTotal(res.total || 0);
      if (res.stats) setStats(res.stats);
    }

    // Also fetch stats separately
    if (reset) {
      const statsRes = await safeFetch('/activity/stats', token);
      if (!statsRes?._error) setStats(statsRes);
    }

    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, [token, filter, offset]);

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    loadData(true);
  }, [filter, token]);

  const onRefresh = () => {
    setRefreshing(true);
    setOffset(0);
    loadData(true);
  };

  const loadMore = () => {
    if (loadingMore || activities.length >= total) return;
    setLoadingMore(true);
    const newOffset = offset + 20;
    setOffset(newOffset);
    loadData(false);
  };

  // Format stats for header
  const totalSessions = stats?.total_sessions || 0;
  const totalFlux = stats?.total_flux || 0;
  const nexusCount = stats?.nexus_verified_count || stats?.certified_count || 0;
  const totalDuration = stats?.total_duration || 0;
  const durationHours = Math.round(totalDuration / 3600 * 10) / 10;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* ═══ HEADER ═══ */}
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>ARCHIVIO STORICO</Text>
          <Text style={s.headerSub}>Registro notarile dell'evoluzione</Text>
        </View>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
      >
        {/* ═══ STATS HEADER ═══ */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: GOLD }]}>{totalSessions}</Text>
            <Text style={s.statLabel}>SESSIONI</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: CYAN }]}>{totalFlux.toLocaleString()}</Text>
            <Text style={s.statLabel}>K-FLUX</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: CYAN }]}>{nexusCount}</Text>
            <Text style={s.statLabel}>CERTIFIED</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: PURPLE }]}>{durationHours}h</Text>
            <Text style={s.statLabel}>DURATA</Text>
          </View>
        </Animated.View>

        {/* ═══ FILTER TABS ═══ */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[s.filterTab, active && { backgroundColor: f.color + '15', borderColor: f.color + '30' }]}
                  activeOpacity={0.7}
                  onPress={() => setFilter(f.key)}
                >
                  <Ionicons name={f.icon as any} size={12} color={active ? f.color : 'rgba(255,255,255,0.25)'} />
                  <Text style={[s.filterText, active && { color: f.color }]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* ═══ ACTIVITY LIST ═══ */}
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="small" color={GOLD} />
            <Text style={s.loadingText}>Caricamento storico...</Text>
          </View>
        ) : activities.length === 0 ? (
          <Animated.View entering={FadeIn.delay(200)} style={s.emptyBox}>
            <Ionicons name="document-text-outline" size={40} color="rgba(255,255,255,0.06)" />
            <Text style={s.emptyTitle}>ARCHIVIO VUOTO</Text>
            <Text style={s.emptySub}>
              {filter === 'nexus'
                ? 'Nessuna sessione con certificazione NÈXUS trovata'
                : 'Completa una sessione per popolare il tuo registro'}
            </Text>
          </Animated.View>
        ) : (
          <>
            <Text style={s.countLabel}>
              {activities.length} di {total} {filter === 'nexus' ? 'sessioni certificate' : 'attività'}
            </Text>
            {activities.map((activity, i) => (
              <ActivityCard key={activity.id || i} activity={activity} index={i} />
            ))}
            {/* Load more */}
            {activities.length < total && (
              <TouchableOpacity style={s.loadMoreBtn} onPress={loadMore} activeOpacity={0.7}>
                {loadingMore ? (
                  <ActivityIndicator size="small" color={GOLD} />
                ) : (
                  <Text style={s.loadMoreText}>CARICA ALTRI</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 4 },

  // Header
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { color: GOLD, fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  headerSub: { color: 'rgba(255,255,255,0.15)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 16, marginBottom: 16, marginTop: 8,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.15)', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.05)' },

  // Filters
  filterScroll: { marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  filterText: {
    color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5,
  },

  // Activity list
  countLabel: {
    color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '700',
    letterSpacing: 1, marginBottom: 12,
  },

  // Loading
  loadingBox: {
    alignItems: 'center', gap: 8, paddingVertical: 40,
  },
  loadingText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '600' },

  // Empty
  emptyBox: {
    alignItems: 'center', gap: 10, paddingVertical: 60,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 18,
  },
  emptyTitle: { color: 'rgba(255,255,255,0.25)', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  emptySub: {
    color: 'rgba(255,255,255,0.12)', fontSize: 11, fontWeight: '500',
    textAlign: 'center', paddingHorizontal: 32,
  },

  // Load more
  loadMoreBtn: {
    alignItems: 'center', paddingVertical: 14,
    backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)',
    marginTop: 8,
  },
  loadMoreText: { color: GOLD, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
});
