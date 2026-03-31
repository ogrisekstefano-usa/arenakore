import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, ImageBackground, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, useSharedValue, withRepeat, withSequence,
  withTiming, useAnimatedStyle, Easing, withDelay,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { playAcceptPing } from '../utils/sounds';
import { HALL_OF_KORE_BG } from '../utils/images';
import { ControlCenter } from './ControlCenter';
import { PvPChallengeModal } from './pvp/PvPChallengeModal';

const MEDAL_COLORS: Record<number, { bg: string; border: string; text: string; glow: string }> = {
  1: { bg: 'rgba(212,175,55,0.2)', border: 'rgba(212,175,55,0.5)', text: '#D4AF37', glow: '#D4AF37' },
  2: { bg: 'rgba(192,192,192,0.15)', border: 'rgba(192,192,192,0.4)', text: '#C0C0C0', glow: '#C0C0C0' },
  3: { bg: 'rgba(205,127,50,0.15)', border: 'rgba(205,127,50,0.4)', text: '#CD7F32', glow: '#CD7F32' },
};

const SPORT_ICON_MAP: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  atletica: { icon: 'walk', color: '#FF6B00' },
  combat:   { icon: 'hand-left', color: '#FF3B30' },
  acqua:    { icon: 'water', color: '#007AFF' },
  team:     { icon: 'football', color: '#34C759' },
  fitness:  { icon: 'barbell', color: '#D4AF37' },
  outdoor:  { icon: 'trail-sign', color: '#30B0C7' },
  mind_body: { icon: 'leaf', color: '#AF52DE' },
  extreme:  { icon: 'flame', color: '#FF2D55' },
};

const CATEGORY_LABELS: Record<string, string> = {
  atletica: 'ATLETICA', combat: 'COMBAT', acqua: 'ACQUA', team: 'TEAM',
  fitness: 'FITNESS', outdoor: 'OUTDOOR', mind_body: 'MIND & BODY', extreme: 'EXTREME',
};

type TabType = 'global' | 'sport' | 'crews';

// SHIMMER ANIMATION for Top 3
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
  return <Animated.Text style={[{ fontSize: 16, fontWeight: '900', letterSpacing: -0.3, color }, shimmerStyle]}>{name}</Animated.Text>;
}

// GIANT CARD (Top 3)
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
  const glowStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));

  const sportCfg = item.category ? SPORT_ICON_MAP[item.category] : null;

  return (
    <View style={[giant$.card, { borderColor: medal.border }]}>
      <View style={giant$.rankBadge}>
        <Ionicons name="medal" size={16} color={medal.text} />
        <Text style={[giant$.rankNum, { color: medal.text }]}>#{item.rank}</Text>
      </View>
      <Animated.View style={[giant$.avatarWrap, { borderColor: medal.glow }, glowStyle]}>
        <View style={[giant$.avatar, { backgroundColor: item.avatar_color || '#00F2FF' }]}>
          <Text style={giant$.avatarText}>{item.username?.[0]?.toUpperCase()}</Text>
        </View>
      </Animated.View>
      <ShimmerName name={item.username} color={medal.text} />
      <View style={giant$.sportRow}>
        <Ionicons name={sportCfg?.icon || 'flash'} size={10} color={sportCfg?.color || '#00F2FF'} />
        <Text style={giant$.sport}>{item.sport || '\u2014'}</Text>
      </View>
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
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16,
    borderWidth: 1.5, minHeight: 170,
  },
  rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rankNum: { fontSize: 16, fontWeight: '400', letterSpacing: 1 },
  avatarWrap: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 12, elevation: 8,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#050505', fontSize: 18, fontWeight: '900' },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sport: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700' },
  xpBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginTop: 2 },
  xpText: { fontSize: 15, fontWeight: '900' },
  founderTag: {
    backgroundColor: 'rgba(212,175,55,0.15)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(212,175,55,0.35)',
  },
  founderText: { color: '#D4AF37', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});

// REGULAR LEADERBOARD ROW
function LeaderRow({ item, index, onChallenge }: { item: any; index: number; onChallenge?: (item: any) => void }) {
  const sportCfg = item.category ? SPORT_ICON_MAP[item.category] : null;
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(250)}>
      <View style={row$.container}>
        <Text style={[row$.rank, item.rank <= 10 && { color: '#00F2FF' }]}>{item.rank}</Text>
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
          <View style={row$.sportRow}>
            <Ionicons name={sportCfg?.icon || 'flash'} size={10} color={sportCfg?.color || '#00F2FF'} />
            <Text style={row$.sport}>{item.sport || '\u2014'} {'\u00b7'} LVL {item.level}</Text>
          </View>
        </View>
        <View style={row$.right}>
          <Text style={row$.xp}>{item.xp?.toLocaleString()}</Text>
          {onChallenge && (
            <TouchableOpacity style={row$.challengeBtn} onPress={() => onChallenge(item)} activeOpacity={0.8}>
              <Ionicons name="flash-sharp" size={10} color="#050505" />
              <Text style={row$.challengeText}>1v1</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const row$ = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  rank: { color: 'rgba(255,255,255,0.4)', fontSize: 17, fontWeight: '900', width: 30, textAlign: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#050505', fontSize: 17, fontWeight: '900' },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  founderPill: {
    backgroundColor: 'rgba(212,175,55,0.2)', width: 16, height: 16,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  founderPillText: { color: '#D4AF37', fontSize: 11, fontWeight: '900' },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sport: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: 4 },
  xp: { color: '#D4AF37', fontSize: 17, fontWeight: '900' },
  challengeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF453A', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  challengeText: { color: '#050505', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});

// CREW LEADERBOARD ROW
function CrewRow({ item, index }: { item: any; index: number }) {
  const medal = (MEDAL_COLORS as any)[item.rank];
  const sportCfg = item.category ? SPORT_ICON_MAP[item.category] : null;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(250)}>
      <View style={[cr$.container, medal && { borderLeftWidth: 3, borderLeftColor: medal.text }]}>
        <View style={cr$.rankWrap}>
          {medal ? (
            <Ionicons name="medal" size={16} color={medal.text} />
          ) : (
            <Text style={cr$.rank}>{item.rank}</Text>
          )}
        </View>
        <View style={cr$.info}>
          <View style={cr$.nameRow}>
            <Ionicons name={sportCfg?.icon || 'shield'} size={14} color={sportCfg?.color || '#00F2FF'} />
            <Text style={cr$.name}>{item.name}</Text>
          </View>
          {item.tagline ? <Text style={cr$.tagline}>{item.tagline}</Text> : null}
          {item.weighted_dna && (
            <View style={cr$.dnaRow}>
              {Object.entries(item.weighted_dna).slice(0, 4).map(([k, v]: [string, any]) => (
                <Text key={k} style={cr$.dnaStat}>{k.slice(0, 3).toUpperCase()} {Math.round(v)}</Text>
              ))}
            </View>
          )}
        </View>
        <View style={cr$.right}>
          <Text style={cr$.xp}>{item.xp_total?.toLocaleString()}</Text>
          <View style={cr$.membersRow}>
            <Ionicons name="people" size={10} color="rgba(255,255,255,0.4)" />
            <Text style={cr$.members}>{item.members_count}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const cr$ = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  rankWrap: { width: 32, alignItems: 'center' },
  rank: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  tagline: { color: 'rgba(255,255,255,0.45)', fontSize: 16, fontStyle: 'italic' },
  dnaRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  dnaStat: { color: '#00F2FF', fontSize: 14, fontWeight: '400', letterSpacing: 0.5 },
  right: { alignItems: 'flex-end', gap: 2 },
  xp: { color: '#D4AF37', fontSize: 17, fontWeight: '400' },
  membersRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  members: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' },
});

// MY STATUS BAR (Sticky Footer)
function MyStatusBar({ rankData }: { rankData: any }) {
  const isTop10 = rankData?.is_top_10;
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (isTop10) {
      pulseOpacity.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1, false
      );
    }
  }, [isTop10]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: isTop10 ? `rgba(0,242,255,${pulseOpacity.value})` : 'rgba(255,255,255,0.05)',
  }));

  if (!rankData) return null;

  const motivText = rankData.next_username
    ? `Rank #${rankData.rank} \u00b7 Seize ${rankData.xp_gap} XP to enter the Hall of Kore Elite`
    : rankData.rank === 1
      ? `Rank #1 \u00b7 You reign the Hall of Kore`
      : `Rank #${rankData.rank} \u00b7 ${rankData.xp} XP \u00b7 Hall of Kore`;

  return (
    <Animated.View style={[status$.container, borderStyle]}>
      <LinearGradient colors={['rgba(5,5,5,0.95)', 'rgba(5,5,5,0.98)']} style={status$.grad}>
        <View style={status$.row}>
          <View style={status$.rankCircle}>
            <Text style={[status$.rankText, isTop10 && { color: '#00F2FF' }]}>#{rankData.rank}</Text>
          </View>
          <View style={status$.textCol}>
            <Text style={status$.motiv} numberOfLines={1}>{motivText}</Text>
            <Text style={status$.sub}>{rankData.total} atleti in classifica</Text>
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
  container: { borderTopWidth: 2, borderColor: 'rgba(255,255,255,0.05)' },
  grad: { paddingHorizontal: 16, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(212,175,55,0.12)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)',
  },
  rankText: { color: '#D4AF37', fontSize: 17, fontWeight: '900' },
  textCol: { flex: 1, gap: 2 },
  motiv: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '400' },
  topBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  topText: { color: '#00F2FF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
});

// ===========================
// MAIN HALL OF KORE COMPONENT
// ===========================
export function HallOfKore() {
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasPlayedTop10 = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [challengeTarget, setChallengeTarget] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [lb, rank] = await Promise.all([
        api.getLeaderboard(activeTab, token, activeTab === 'sport' && selectedCategory ? selectedCategory : undefined),
        activeTab !== 'crews'
          ? api.getMyRank(token, activeTab === 'sport' && selectedCategory ? selectedCategory : undefined)
          : Promise.resolve(null),
      ]);
      setLeaderboard(lb);
      setMyRank(rank);
      if (rank?.is_top_10 && !hasPlayedTop10.current) {
        playAcceptPing();
        hasPlayedTop10.current = true;
      }
    } catch (e) { /* silenced */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, activeTab, selectedCategory]);

  useEffect(() => { hasPlayedTop10.current = false; loadData(); }, [loadData]);

  const top3 = activeTab !== 'crews' ? leaderboard.slice(0, 3) : [];
  const rest = activeTab !== 'crews' ? leaderboard.slice(3) : leaderboard;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'global', label: 'GLOBAL' },
    { key: 'sport', label: 'PER SPORT' },
    { key: 'crews', label: 'CREWS' },
  ];

  const categories = Object.keys(CATEGORY_LABELS);

  return (
    <>
    <ImageBackground source={{ uri: HALL_OF_KORE_BG }} style={gl$.container} imageStyle={{ opacity: 0.18 }}>
      <LinearGradient
        colors={['rgba(5,5,5,0.65)', 'rgba(5,5,5,0.88)', 'rgba(5,5,5,0.97)']}
        locations={[0, 0.25, 0.5]}
        style={gl$.overlay}
      >
        {/* Header */}
        <View style={[gl$.header, { paddingTop: insets.top + 8 }]}>
          <View style={gl$.titleWrap}>
            <Ionicons name="trophy" size={22} color="#D4AF37" />
            <Text style={gl$.title}>HALL OF KORE</Text>
          </View>
          <TouchableOpacity onPress={() => setMenuOpen(true)} style={{ padding: 6 }}>
            <Ionicons name="menu" size={24} color="#00F2FF" />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={gl$.tabRow}>
          {tabs.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[gl$.tab, activeTab === t.key && gl$.tabActive]}
              onPress={() => { setActiveTab(t.key); setSelectedCategory(null); }}
            >
              <Text style={[gl$.tabText, activeTab === t.key && gl$.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Filter (for SPORT tab) */}
        {activeTab === 'sport' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={gl$.catRow}>
            <TouchableOpacity
              style={[gl$.catChip, !selectedCategory && gl$.catChipActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[gl$.catChipText, !selectedCategory && gl$.catChipTextActive]}>TUTTI</Text>
            </TouchableOpacity>
            {categories.map(c => {
              const cfg = SPORT_ICON_MAP[c];
              return (
                <TouchableOpacity
                  key={c}
                  style={[gl$.catChip, selectedCategory === c && gl$.catChipActive]}
                  onPress={() => setSelectedCategory(c)}
                >
                  {cfg && <Ionicons name={cfg.icon} size={12} color={selectedCategory === c ? '#D4AF37' : cfg.color} />}
                  <Text style={[gl$.catChipText, selectedCategory === c && gl$.catChipTextActive]}>{CATEGORY_LABELS[c]}</Text>
                </TouchableOpacity>
              );
            })}
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
            <Ionicons name="podium" size={40} color="rgba(255,255,255,0.3)" />
            <Text style={gl$.emptyTitle}>Nessun atleta in classifica</Text>
            <Text style={gl$.emptySub}>Completa l'onboarding per entrare nel KORE</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#D4AF37" />}
          >
            {/* THE GIANTS (Top 3) */}
            {top3.length > 0 && (
              <>
                <View style={gl$.sectionRow}>
                  <Ionicons name="diamond" size={14} color="#D4AF37" />
                  <Text style={gl$.sectionTitle}>THE GIANTS</Text>
                </View>
                <View style={gl$.giantsRow}>
                  {top3.map((item) => {
                    const medal = (MEDAL_COLORS as any)[item.rank];
                    return medal ? <GiantCard key={item.id} item={item} medal={medal} /> : null;
                  })}
                </View>
              </>
            )}

            {/* Rest of leaderboard */}
            {activeTab === 'crews' ? (
              <>
                <View style={gl$.sectionRow}>
                  <Ionicons name="shield" size={14} color="#00F2FF" />
                  <Text style={gl$.sectionTitle}>CREW RANKING</Text>
                </View>
                {rest.map((item, i) => <CrewRow key={item.id} item={item} index={i} />)}
              </>
            ) : (
              <>
                {rest.length > 0 && (
                  <View style={gl$.sectionRow}>
                    <Ionicons name="flash" size={14} color="#00F2FF" />
                    <Text style={gl$.sectionTitle}>THE HUNT</Text>
                  </View>
                )}
                {rest.map((item, i) => <LeaderRow key={item.id} item={item} index={i} onChallenge={item.id !== user?.id ? (it) => setChallengeTarget({ id: it.id, username: it.username, xp: it.xp, level: it.level }) : undefined} />)}
              </>
            )}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}

        {/* MY STATUS BAR */}
        {activeTab !== 'crews' && myRank && (
          <View style={{ paddingBottom: insets.bottom }}>
            <MyStatusBar rankData={myRank} />
          </View>
        )}
      </LinearGradient>
    </ImageBackground>
    <ControlCenter visible={menuOpen} onClose={() => setMenuOpen(false)} />
    <PvPChallengeModal
      visible={!!challengeTarget}
      opponent={challengeTarget}
      onClose={() => setChallengeTarget(null)}
      onChallengeSent={() => setChallengeTarget(null)}
    />
    </>
  );
}

const gl$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  overlay: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 3,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: 'rgba(212,175,55,0.15)' },
  tabText: { color: 'rgba(255,255,255,0.72)', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  tabTextActive: { color: '#D4AF37' },
  catRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  catChipActive: { borderColor: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.1)' },
  catChipText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  catChipTextActive: { color: '#D4AF37' },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
  },
  sectionTitle: {
    color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 2,
  },
  giantsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 15, marginTop: 8 },
  emptyTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '800' },
  emptySub: { color: 'rgba(255,255,255,0.3)', fontSize: 16 },
});

const sw$ = StyleSheet.create({
  row: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 4 },
  btn: { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  btnActive: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: '#00F2FF' },
  text: { color: 'rgba(255,255,255,0.50)', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  textActive: { color: '#00F2FF', fontWeight: '900' },
});

const cr2$ = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  info: { flex: 1, gap: 2 },
  label: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  sub: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '400' },
  btn: { backgroundColor: '#00F2FF', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  btnText: { color: '#050505', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
});

