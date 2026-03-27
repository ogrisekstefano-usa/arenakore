import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  ActivityIndicator, ImageBackground, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, useSharedValue, withRepeat, withSequence,
  withTiming, useAnimatedStyle, Easing, withDelay,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { playAcceptPing } from '../utils/sounds';
import { GLORY_WALL_BG } from '../utils/images';

const MEDAL_COLORS = {
  1: { bg: 'rgba(212,175,55,0.2)', border: 'rgba(212,175,55,0.5)', text: '#D4AF37', glow: '#D4AF37', emoji: '🥇' },
  2: { bg: 'rgba(192,192,192,0.15)', border: 'rgba(192,192,192,0.4)', text: '#C0C0C0', glow: '#C0C0C0', emoji: '🥈' },
  3: { bg: 'rgba(205,127,50,0.15)', border: 'rgba(205,127,50,0.4)', text: '#CD7F32', glow: '#CD7F32', emoji: '🥉' },
};

const SPORT_ICONS: Record<string, string> = {
  atletica: '🏃', combat: '🥊', acqua: '🌊', team: '⚽',
  fitness: '🏋️', outdoor: '🏔️', mind_body: '🧘', extreme: '🔥',
};

const CATEGORY_LABELS: Record<string, string> = {
  atletica: 'ATLETICA', combat: 'COMBAT', acqua: 'ACQUA', team: 'TEAM',
  fitness: 'FITNESS', outdoor: 'OUTDOOR', mind_body: 'MIND & BODY', extreme: 'EXTREME',
};

type TabType = 'global' | 'sport' | 'crews';

// ===========================
// SHIMMER ANIMATION for Top 3
// ===========================
function ShimmerName({ name, color }: { name: string; color: string }) {
  const shimmerX = useSharedValue(-1);
  useEffect(() => {
    shimmerX.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withDelay(1500, withTiming(-1, { duration: 0 }))
      ), -1, false
    );
  }, []);
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + Math.max(0, 1 - Math.abs(shimmerX.value)) * 0.7,
  }));
  return (
    <Animated.Text style={[giantN$.name, { color }, shimmerStyle]}>
      {name}
    </Animated.Text>
  );
}

const giantN$ = StyleSheet.create({
  name: { fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
});

// ===========================
// GIANT CARD (Top 3)
// ===========================
function GiantCard({ item, medal }: { item: any; medal: typeof MEDAL_COLORS[1] }) {
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ), -1, false
    );
  }, []);
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={[giant$.card, { borderColor: medal.border }]}>
      <View style={giant$.rankBadge}>
        <Text style={giant$.medal}>{medal.emoji}</Text>
        <Text style={[giant$.rankNum, { color: medal.text }]}>#{item.rank}</Text>
      </View>
      <Animated.View style={[giant$.avatarWrap, { borderColor: medal.glow }, glowStyle]}>
        <View style={[giant$.avatar, { backgroundColor: item.avatar_color || '#00F2FF' }]}>
          <Text style={giant$.avatarText}>{item.username?.[0]?.toUpperCase()}</Text>
        </View>
      </Animated.View>
      <ShimmerName name={item.username} color={medal.text} />
      <Text style={giant$.sport}>
        {SPORT_ICONS[item.category] || '⚡'} {item.sport || '—'}
      </Text>
      <View style={[giant$.xpBadge, { backgroundColor: medal.bg }]}>
        <Text style={[giant$.xpText, { color: medal.text }]}>{item.xp?.toLocaleString()} XP</Text>
      </View>
      {(item.is_founder || item.is_admin) && (
        <View style={giant$.founderTag}>
          <Text style={giant$.founderText}>FOUNDER</Text>
        </View>
      )}
    </View>
  );
}

const giant$ = StyleSheet.create({
  card: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 16, paddingHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16,
    borderWidth: 1.5, minHeight: 170,
  },
  rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  medal: { fontSize: 16 },
  rankNum: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  avatarWrap: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 12, elevation: 8,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#050505', fontSize: 18, fontWeight: '900' },
  sport: { color: '#888', fontSize: 10, fontWeight: '600' },
  xpBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginTop: 2 },
  xpText: { fontSize: 12, fontWeight: '900' },
  founderTag: {
    backgroundColor: 'rgba(212,175,55,0.15)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(212,175,55,0.35)',
  },
  founderText: { color: '#D4AF37', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
});

// ===========================
// REGULAR LEADERBOARD ROW
// ===========================
function LeaderRow({ item, index }: { item: any; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(250)}>
      <View style={row$.container}>
        <Text style={[row$.rank, item.rank <= 10 && { color: '#00F2FF' }]}>
          {item.rank}
        </Text>
        <View style={[row$.avatar, { backgroundColor: item.avatar_color || '#00F2FF' }]}>
          <Text style={row$.avatarText}>{item.username?.[0]?.toUpperCase()}</Text>
        </View>
        <View style={row$.info}>
          <View style={row$.nameRow}>
            <Text style={row$.name}>{item.username}</Text>
            {(item.is_founder || item.is_admin) && (
              <View style={row$.founderPill}>
                <Text style={row$.founderPillText}>F</Text>
              </View>
            )}
          </View>
          <Text style={row$.sport}>
            {SPORT_ICONS[item.category] || '⚡'} {item.sport || '—'} · LVL {item.level}
          </Text>
        </View>
        <Text style={row$.xp}>{item.xp?.toLocaleString()}</Text>
      </View>
    </Animated.View>
  );
}

const row$ = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  rank: { color: '#555', fontSize: 14, fontWeight: '900', width: 30, textAlign: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#050505', fontSize: 14, fontWeight: '800' },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  founderPill: {
    backgroundColor: 'rgba(212,175,55,0.2)', width: 16, height: 16,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  founderPillText: { color: '#D4AF37', fontSize: 8, fontWeight: '900' },
  sport: { color: '#555', fontSize: 11 },
  xp: { color: '#D4AF37', fontSize: 14, fontWeight: '900' },
});

// ===========================
// CREW LEADERBOARD ROW
// ===========================
function CrewRow({ item, index }: { item: any; index: number }) {
  const medal = (MEDAL_COLORS as any)[item.rank];
  const catIcon = SPORT_ICONS[item.category] || '🛡️';

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(250)}>
      <View style={[cr$.container, medal && { borderLeftWidth: 3, borderLeftColor: medal.text }]}>
        <Text style={[cr$.rank, medal && { color: medal.text }]}>
          {medal ? medal.emoji : item.rank}
        </Text>
        <View style={cr$.info}>
          <Text style={cr$.name}>{catIcon} {item.name}</Text>
          {item.tagline ? <Text style={cr$.tagline}>{item.tagline}</Text> : null}
          {/* Weighted DNA mini row */}
          {item.weighted_dna && (
            <View style={cr$.dnaRow}>
              {Object.entries(item.weighted_dna).slice(0, 4).map(([k, v]: [string, any]) => (
                <Text key={k} style={cr$.dnaStat}>
                  {k.slice(0, 3).toUpperCase()} {Math.round(v)}
                </Text>
              ))}
            </View>
          )}
        </View>
        <View style={cr$.right}>
          <Text style={cr$.xp}>{item.xp_total?.toLocaleString()}</Text>
          <Text style={cr$.members}>{item.members_count} 👥</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const cr$ = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  rank: { color: '#555', fontSize: 16, fontWeight: '900', width: 32, textAlign: 'center' },
  info: { flex: 1, gap: 3 },
  name: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  tagline: { color: '#888', fontSize: 11, fontStyle: 'italic' },
  dnaRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  dnaStat: { color: '#00F2FF', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  right: { alignItems: 'flex-end', gap: 2 },
  xp: { color: '#D4AF37', fontSize: 14, fontWeight: '900' },
  members: { color: '#555', fontSize: 10 },
});

// ===========================
// MY STATUS BAR (Sticky Footer)
// ===========================
function MyStatusBar({ rankData }: { rankData: any }) {
  const isTop10 = rankData?.is_top_10;
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (isTop10) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ), -1, false
      );
    }
  }, [isTop10]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: isTop10 ? `rgba(0,242,255,${pulseOpacity.value})` : 'rgba(255,255,255,0.06)',
  }));

  if (!rankData) return null;

  const motivText = rankData.next_username
    ? `Rank #${rankData.rank} · Conquista ${rankData.xp_gap} XP per superare ${rankData.next_username}`
    : rankData.rank === 1
      ? `Rank #1 · Sei il Re del KORE! 👑`
      : `Rank #${rankData.rank} · ${rankData.xp} XP totali`;

  return (
    <Animated.View style={[status$.container, borderStyle]}>
      <LinearGradient
        colors={['rgba(5,5,5,0.95)', 'rgba(5,5,5,0.98)']}
        style={status$.grad}
      >
        <View style={status$.row}>
          <View style={status$.rankCircle}>
            <Text style={[status$.rankText, isTop10 && { color: '#00F2FF' }]}>
              #{rankData.rank}
            </Text>
          </View>
          <View style={status$.textCol}>
            <Text style={status$.motiv} numberOfLines={1}>
              {motivText}
            </Text>
            <Text style={status$.sub}>
              {rankData.total} atleti in classifica
            </Text>
          </View>
          {isTop10 && (
            <View style={status$.topBadge}>
              <Text style={status$.topText}>TOP 10</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const status$ = StyleSheet.create({
  container: {
    borderTopWidth: 2, borderColor: 'rgba(255,255,255,0.06)',
  },
  grad: { paddingHorizontal: 16, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(212,175,55,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)',
  },
  rankText: { color: '#D4AF37', fontSize: 14, fontWeight: '900' },
  textCol: { flex: 1, gap: 2 },
  motiv: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  sub: { color: '#555', fontSize: 10 },
  topBadge: {
    backgroundColor: 'rgba(0,242,255,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.3)',
  },
  topText: { color: '#00F2FF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});

// ===========================
// MAIN GLORY WALL COMPONENT
// ===========================
export function GloryWall({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasPlayedTop10 = useRef(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [lb, rank] = await Promise.all([
        api.getLeaderboard(
          activeTab,
          token,
          activeTab === 'sport' && selectedCategory ? selectedCategory : undefined,
        ),
        activeTab !== 'crews'
          ? api.getMyRank(token, activeTab === 'sport' && selectedCategory ? selectedCategory : undefined)
          : Promise.resolve(null),
      ]);
      setLeaderboard(lb);
      setMyRank(rank);

      // Metallic Ping if user is in Top 10
      if (rank?.is_top_10 && !hasPlayedTop10.current) {
        playAcceptPing();
        hasPlayedTop10.current = true;
      }
    } catch (e) {
      // Leaderboard load error silenced for production
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, activeTab, selectedCategory]);

  useEffect(() => {
    if (visible) {
      hasPlayedTop10.current = false;
      loadData();
    }
  }, [visible, loadData]);

  const top3 = activeTab !== 'crews' ? leaderboard.slice(0, 3) : [];
  const rest = activeTab !== 'crews' ? leaderboard.slice(3) : leaderboard;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'global', label: 'GLOBAL' },
    { key: 'sport', label: 'PER SPORT' },
    { key: 'crews', label: 'CREWS' },
  ];

  const categories = Object.keys(CATEGORY_LABELS);

  return (
    <Modal visible={visible} animationType="slide">
      <ImageBackground
        source={{ uri: GLORY_WALL_BG }}
        style={gl$.container}
        imageStyle={{ opacity: 0.4 }}
        blurRadius={8}
      >
        <LinearGradient
          colors={['rgba(5,5,5,0.65)', 'rgba(5,5,5,0.88)', 'rgba(5,5,5,0.97)']}
          locations={[0, 0.25, 0.5]}
          style={gl$.overlay}
        >
          {/* Header */}
          <View style={[gl$.header, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={onClose} style={gl$.backBtn}>
              <Text style={gl$.backText}>← CHIUDI</Text>
            </TouchableOpacity>
            <View style={gl$.titleWrap}>
              <Text style={gl$.titleIcon}>🏛️</Text>
              <Text style={gl$.title}>GLORY WALL</Text>
            </View>
            <View style={{ width: 60 }} />
          </View>

          {/* Tab Switcher */}
          <View style={gl$.tabRow}>
            {tabs.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[gl$.tab, activeTab === t.key && gl$.tabActive]}
                onPress={() => { setActiveTab(t.key); setSelectedCategory(null); }}
              >
                <Text style={[gl$.tabText, activeTab === t.key && gl$.tabTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category Filter (for SPORT tab) */}
          {activeTab === 'sport' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={gl$.catRow}
            >
              <TouchableOpacity
                style={[gl$.catChip, !selectedCategory && gl$.catChipActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[gl$.catChipText, !selectedCategory && gl$.catChipTextActive]}>
                  TUTTI
                </Text>
              </TouchableOpacity>
              {categories.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[gl$.catChip, selectedCategory === c && gl$.catChipActive]}
                  onPress={() => setSelectedCategory(c)}
                >
                  <Text style={gl$.catIcon}>{SPORT_ICONS[c]}</Text>
                  <Text style={[gl$.catChipText, selectedCategory === c && gl$.catChipTextActive]}>
                    {CATEGORY_LABELS[c]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Content */}
          {loading ? (
            <View style={gl$.center}>
              <ActivityIndicator color="#D4AF37" size="large" />
              <Text style={gl$.loadingText}>Caricamento classifica...</Text>
            </View>
          ) : leaderboard.length === 0 ? (
            <View style={gl$.center}>
              <Text style={gl$.emptyIcon}>🏟️</Text>
              <Text style={gl$.emptyTitle}>Nessun atleta in classifica</Text>
              <Text style={gl$.emptySub}>Completa l'onboarding per entrare nel KORE</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => { setRefreshing(true); loadData(); }}
                  tintColor="#D4AF37"
                />
              }
            >
              {/* THE GIANTS (Top 3) - only for user leaderboards */}
              {top3.length > 0 && (
                <>
                  <Text style={gl$.sectionTitle}>👑  THE GIANTS</Text>
                  <View style={gl$.giantsRow}>
                    {top3.map((item, i) => {
                      const medal = (MEDAL_COLORS as any)[item.rank];
                      return medal ? (
                        <GiantCard key={item.id} item={item} medal={medal} />
                      ) : null;
                    })}
                  </View>
                </>
              )}

              {/* Rest of leaderboard */}
              {activeTab === 'crews' ? (
                <>
                  <Text style={gl$.sectionTitle}>🛡️  CREW RANKING</Text>
                  {rest.map((item, i) => (
                    <CrewRow key={item.id} item={item} index={i} />
                  ))}
                </>
              ) : (
                <>
                  {rest.length > 0 && (
                    <Text style={gl$.sectionTitle}>⚔️  THE HUNT</Text>
                  )}
                  {rest.map((item, i) => (
                    <LeaderRow key={item.id} item={item} index={i} />
                  ))}
                </>
              )}
              <View style={{ height: 80 }} />
            </ScrollView>
          )}

          {/* MY STATUS BAR (Sticky Footer) */}
          {activeTab !== 'crews' && myRank && (
            <View style={{ paddingBottom: insets.bottom }}>
              <MyStatusBar rankData={myRank} />
            </View>
          )}
        </LinearGradient>
      </ImageBackground>
    </Modal>
  );
}

const gl$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  overlay: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  backBtn: { padding: 8, width: 60 },
  backText: { color: '#00F2FF', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleIcon: { fontSize: 18 },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 2 },

  // Tabs
  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 3,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: 'rgba(212,175,55,0.15)' },
  tabText: { color: '#555', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  tabTextActive: { color: '#D4AF37' },

  // Category filter
  catRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  catChipActive: { borderColor: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.1)' },
  catIcon: { fontSize: 12 },
  catChipText: { color: '#888', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  catChipTextActive: { color: '#D4AF37' },

  // Section
  sectionTitle: {
    color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 2,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
  },

  // Giants row
  giantsRow: {
    flexDirection: 'row', paddingHorizontal: 12, gap: 8,
  },

  // Empty/Loading
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#555', fontSize: 12, marginTop: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { color: '#555', fontSize: 16, fontWeight: '700' },
  emptySub: { color: '#444', fontSize: 13 },
});
