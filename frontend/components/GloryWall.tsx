import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, ImageBackground, RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, useSharedValue, withRepeat, withSequence,
  withTiming, useAnimatedStyle, Easing, withDelay
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { api } from '../utils/api';
import { playAcceptPing } from '../utils/sounds';
import { HALL_OF_KORE_BG } from '../utils/images';
import { ControlCenter } from './ControlCenter';
import { PvPChallengeModal } from './pvp/PvPChallengeModal';
import { CertBadge } from './CertBadge';

const MEDAL_COLORS: Record<number, { bg: string; border: string; text: string; glow: string }> = {
  1: { bg: 'rgba(255,215,0,0.2)', border: 'rgba(255,215,0,0.5)', text: '#FFD700', glow: '#FFD700' },
  2: { bg: 'rgba(192,192,192,0.15)', border: 'rgba(192,192,192,0.4)', text: '#C0C0C0', glow: '#C0C0C0' },
  3: { bg: 'rgba(205,127,50,0.15)', border: 'rgba(205,127,50,0.4)', text: '#CD7F32', glow: '#CD7F32' }
};

const SPORT_ICON_MAP: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  atletica: { icon: 'walk', color: '#FF6B00' },
  combat:   { icon: 'hand-left', color: '#FF3B30' },
  acqua:    { icon: 'water', color: '#007AFF' },
  team:     { icon: 'football', color: '#00FF87' },
  fitness:  { icon: 'barbell', color: '#FFD700' },
  outdoor:  { icon: 'trail-sign', color: '#30B0C7' },
  mind_body: { icon: 'leaf', color: '#AF52DE' },
  extreme:  { icon: 'flame', color: '#FF2D55' }
};

const CATEGORY_LABELS: Record<string, string> = {
  atletica: 'ATLETICA', combat: 'COMBAT', acqua: 'ACQUA', team: 'TEAM',
  fitness: 'FITNESS', outdoor: 'OUTDOOR', mind_body: 'MIND & BODY', extreme: 'EXTREME'
};

type TabType = 'global' | 'sport' | 'crews' | 'the_hunt';

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
    opacity: 0.3 + Math.max(0, 1 - Math.abs(shimmerX.value)) * 0.7
  }));
  return <Animated.Text style={[{ fontSize: 13, fontWeight: '800', letterSpacing: -0.3, color }, shimmerStyle]} numberOfLines={1}>{name}</Animated.Text>;
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
        <View style={[giant$.avatar, { backgroundColor: item.avatar_color || '#00E5FF' }]}>
          <Text style={giant$.avatarText}>{item.username?.[0]?.toUpperCase()}</Text>
        </View>
      </Animated.View>
      <ShimmerName name={item.username} color={medal.text} />
      <View style={giant$.sportRow}>
        <Ionicons name={sportCfg?.icon || 'flash'} size={10} color={sportCfg?.color || '#00E5FF'} />
        <Text style={giant$.sport}>{item.sport || '\u2014'}</Text>
      </View>
      <View style={[giant$.xpBadge, { backgroundColor: medal.bg }]}>
        <Text style={[giant$.xpText, { color: medal.text }]}>{item.xp?.toLocaleString()} FLUX</Text>
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
    flex: 1, alignItems: 'center', gap: 3, paddingVertical: 12, paddingHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16,
    borderWidth: 1, minHeight: 155
  },
  rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rankNum: { fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  avatarWrap: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', elevation: 8
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#000000', fontSize: 16, fontWeight: '900' },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sport: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' },
  xpBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 1 },
  xpText: { fontSize: 11, fontWeight: '800' },
  founderTag: {
    backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: 'rgba(255,215,0,0.35)'
  },
  founderText: { color: '#FFD700', fontSize: 9, fontWeight: '800', letterSpacing: 1 }
});

// REGULAR LEADERBOARD ROW
function LeaderRow({ item, index, onChallenge }: { item: any; index: number; onChallenge?: (item: any) => void }) {
  const sportCfg = item.category ? SPORT_ICON_MAP[item.category] : null;
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(250)}>
      <View style={row$.container}>
        <Text style={[row$.rank, item.rank <= 10 && { color: '#00E5FF' }]}>{item.rank}</Text>
        <View style={[row$.avatar, { backgroundColor: item.avatar_color || '#00E5FF' }]}>
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
            {item.is_nexus_certified && (
              <View style={row$.certMini}>
                <Ionicons name="shield-checkmark" size={8} color="#00E5FF" />
              </View>
            )}
          </View>
          <View style={row$.sportRow}>
            <Ionicons name={sportCfg?.icon || 'flash'} size={10} color={sportCfg?.color || '#00E5FF'} />
            <Text style={row$.sport}>{item.preferred_sport || item.sport || '—'} · LVL {item.level}</Text>
          </View>
        </View>
        <View style={row$.right}>
          <Text style={row$.xp}>{(item.flux || item.xp || 0).toLocaleString()}</Text>
          <Text style={row$.fluxLabel}>K-FLUX</Text>
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
    paddingHorizontal: 24, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)'
  },
  rank: { color: 'rgba(255,255,255,0.4)', fontSize: 19, fontWeight: '900', width: 30, textAlign: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#000000', fontSize: 19, fontWeight: '900' },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  founderPill: {
    backgroundColor: 'rgba(255,215,0,0.2)', width: 16, height: 16,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center'
  },
  founderPillText: { color: '#FFD700', fontSize: 13, fontWeight: '900' },
  certMini: { width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(0,229,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#00E5FF22' },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sport: { color: '#AAAAAA', fontSize: 16, fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: 4 },
  xp: { color: '#FFD700', fontSize: 19, fontWeight: '900' },
  challengeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF3B30', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  challengeText: { color: '#000000', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  fluxLabel: { color: 'rgba(255,215,0,0.35)', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
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
            <Ionicons name={sportCfg?.icon || 'shield'} size={14} color={sportCfg?.color || '#00E5FF'} />
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
    paddingHorizontal: 24, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)'
  },
  rankWrap: { width: 32, alignItems: 'center' },
  rank: { color: 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
  tagline: { color: '#AAAAAA', fontSize: 18, fontStyle: 'italic' },
  dnaRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  dnaStat: { color: '#00E5FF', fontSize: 16, fontWeight: '400', letterSpacing: 0.5 },
  right: { alignItems: 'flex-end', gap: 2 },
  xp: { color: '#FFD700', fontSize: 19, fontWeight: '900' },
  membersRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  members: { color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: '700' }
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
    borderColor: isTop10 ? `rgba(0,229,255,${pulseOpacity.value})` : 'rgba(255,255,255,0.05)'
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
            <Text style={[status$.rankText, isTop10 && { color: '#00E5FF' }]}>#{rankData.rank}</Text>
          </View>
          <View style={status$.textCol}>
            <Text style={status$.motiv} numberOfLines={1}>{motivText}</Text>
            <Text style={status$.sub}>{rankData.total} Kore in classifica</Text>
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
  container: { borderTopWidth: 2, borderColor: 'rgba(255,255,255,0.07)' },
  grad: { paddingHorizontal: 24, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,215,0,0.12)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)'
  },
  rankText: { color: '#FFD700', fontSize: 19, fontWeight: '900' },
  textCol: { flex: 1, gap: 2 },
  motiv: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: '400' },
  topBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
  },
  topText: { color: '#00E5FF', fontSize: 14, fontWeight: '900', letterSpacing: 1 }
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
  const [verifiedOnly, setVerifiedOnly] = useState(false); // Verified-Only toggle
  const [refreshing, setRefreshing] = useState(false);
  const hasPlayedTop10 = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [challengeTarget, setChallengeTarget] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (activeTab === 'the_hunt') {
        // THE HUNT: Load from dedicated system_templates endpoint
        const [huntRes, huntRank] = await Promise.all([
          api.getTheHuntLeaderboard(token),
          api.getMyHuntRank(token),
        ]);
        if (huntRes && huntRes.leaderboard) {
          setLeaderboard(huntRes.leaderboard);
        } else {
          setLeaderboard([]);
        }
        if (huntRank) {
          setMyRank({
            rank: huntRank.rank,
            total: huntRank.total,
            xp: huntRank.hunt_flux,
            is_top_10: huntRank.rank <= 10 && huntRank.is_ranked,
            is_ranked: huntRank.is_ranked,
          });
        }
      } else {
        const [lb, rank] = await Promise.all([
          api.getLeaderboard(activeTab, token, activeTab === 'sport' && selectedCategory ? selectedCategory : undefined),
          activeTab !== 'crews'
            ? api.getMyRank(token, activeTab === 'sport' && selectedCategory ? selectedCategory : undefined)
            : Promise.resolve(null),
        ]);
        setLeaderboard(lb);
        setMyRank(rank);
      }
      if (myRank?.is_top_10 && !hasPlayedTop10.current) {
        playAcceptPing();
        hasPlayedTop10.current = true;
      }
    } catch (e) { /* silenced */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, activeTab, selectedCategory]);

  useEffect(() => { hasPlayedTop10.current = false; loadData(); }, [loadData]);

  const top3 = (activeTab !== 'crews') ? leaderboard.slice(0, 3) : [];
  const restAll = (activeTab !== 'crews') ? leaderboard.slice(3) : leaderboard;
  const rest = verifiedOnly ? restAll.filter((a: any) => a.is_nexus_certified) : restAll;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'the_hunt', label: '🏆 THE HUNT' },
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
            <Ionicons name="trophy" size={22} color="#FFD700" />
            <Text style={gl$.title}>HALL OF KORE</Text>
          </View>
          {/* Menu removed — uses only ••• from top Header */}
        </View>

        {/* ROW 1: Scope Tabs (GLOBAL / SPORT / CREWS) */}
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
        {/* ROW 2: Sport Filters (always visible) + Verified toggle */}
        <View style={gl$.filterRow2}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={gl$.filterChipsRow}>
            {activeTab === 'sport' ? (
              <>
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
                      {cfg && <Ionicons name={cfg.icon} size={12} color={selectedCategory === c ? '#FFD700' : cfg.color} />}
                      <Text style={[gl$.catChipText, selectedCategory === c && gl$.catChipTextActive]}>{CATEGORY_LABELS[c]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : (
              <View style={gl$.filterPlaceholder}>
                <Ionicons name="filter" size={12} color="rgba(255,255,255,0.2)" />
                <Text style={gl$.filterPlaceholderText}>Seleziona "PER SPORT" per filtrare</Text>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity
            style={[gl$.verifiedToggle, verifiedOnly && gl$.verifiedToggleOn]}
            onPress={() => setVerifiedOnly(v => !v)}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark" size={11} color={verifiedOnly ? '#000' : '#00E5FF'} />
            <Text style={[gl$.verifiedText, verifiedOnly && { color: '#000' }]}>VERIFIED</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={gl$.center}>
            <ActivityIndicator color="#FFD700" size="large" />
            <Text style={gl$.loadingText}>Caricamento classifica...</Text>
          </View>
        ) : leaderboard.length === 0 ? (
          <View style={gl$.center}>
            <Ionicons name="podium" size={40} color="rgba(255,255,255,0.3)" />
            <Text style={gl$.emptyTitle}>Nessun Kore in classifica</Text>
            <Text style={gl$.emptySub}>Completa l'onboarding per entrare nel KORE</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#FFD700" />}
          >
            {/* THE GIANTS (Top 3) — skip for the_hunt to avoid showing generic data */}
            {top3.length > 0 && activeTab !== 'the_hunt' && (
              <>
                <View style={gl$.sectionRow}>
                  <Ionicons name="diamond" size={14} color="#FFD700" />
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

            {/* THE HUNT dedicated top-3 podium */}
            {activeTab === 'the_hunt' && top3.length > 0 && (
              <>
                <View style={gl$.sectionRow}>
                  <Ionicons name="flame" size={14} color="#FFD700" />
                  <Text style={gl$.sectionTitle}>TOP HUNTERS</Text>
                </View>
                <View style={gl$.giantsRow}>
                  {top3.map((item) => {
                    const medal = (MEDAL_COLORS as any)[item.rank];
                    // For THE HUNT, use hunt_flux as the display XP
                    const huntItem = { ...item, xp: item.hunt_flux || item.xp, id: item.user_id || item.id };
                    return medal ? <GiantCard key={huntItem.id} item={huntItem} medal={medal} /> : null;
                  })}
                </View>
              </>
            )}

            {/* Rest of leaderboard */}
            {activeTab === 'crews' ? (
              <>
                <View style={gl$.sectionRow}>
                  <Ionicons name="shield" size={14} color="#00E5FF" />
                  <Text style={gl$.sectionTitle}>CREW RANKING</Text>
                </View>
                {rest.map((item, i) => <CrewRow key={item.id} item={item} index={i} />)}
              </>
            ) : activeTab === 'the_hunt' ? (
              <>
                {rest.length > 0 && (
                  <View style={gl$.sectionRow}>
                    <Ionicons name="flash" size={14} color="#00FF87" />
                    <Text style={gl$.sectionTitle}>SYSTEM TEMPLATES ONLY</Text>
                  </View>
                )}
                {rest.map((item, i) => {
                  const huntItem = { ...item, xp: item.hunt_flux || item.xp, id: item.user_id || item.id };
                  return (
                    <View key={huntItem.id} style={verifiedOnly && item.is_nexus_certified ? gl$.certifiedRow : undefined}>
                      <LeaderRow item={huntItem} index={i} onChallenge={undefined} />
                    </View>
                  );
                })}
              </>
            ) : (
              <>
                {rest.length > 0 && (
                  <View style={gl$.sectionRow}>
                    <Ionicons name="flash" size={14} color="#00E5FF" />
                    <Text style={gl$.sectionTitle}>THE HUNT</Text>
                  </View>
                )}
                {rest.map((item, i) => (
                  <View key={item.id} style={verifiedOnly && item.is_nexus_certified ? gl$.certifiedRow : undefined}>
                    <LeaderRow item={item} index={i} onChallenge={item.id !== user?.id ? (it) => setChallengeTarget({ id: it.id, username: it.username, xp: it.xp, level: it.level }) : undefined} />
                  </View>
                ))}
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
  container: { flex: 1, backgroundColor: '#000000' },
  overlay: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingBottom: 10
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 4 },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 24, gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 3,
    alignItems: 'center'
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: 'rgba(255,215,0,0.15)' },
  tabText: { color: '#AAAAAA', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  tabTextActive: { color: '#FFD700' },
  // Verified Only toggle
  verifiedToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#00E5FF22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: 'rgba(0,229,255,0.04)' },
  verifiedToggleOn: { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
  verifiedText: { color: '#00E5FF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  // Filter Row 2
  filterRow2: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, gap: 8 },
  filterChipsRow: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingRight: 8 },
  filterPlaceholder: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  filterPlaceholderText: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '600' },
  // Certified row glow border
  certifiedRow: { borderLeftWidth: 2, borderLeftColor: '#00E5FF', borderRadius: 4 },
  catRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 6, flexDirection: 'row', alignItems: 'center' },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#3A3A3A', backgroundColor: 'rgba(30,30,30,0.8)'
  },
  catChipActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.15)' },
  catChipText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  catChipTextActive: { color: '#FFD700' },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 10
  },
  sectionTitle: {
    color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 2
  },
  giantsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 17, marginTop: 8 },
  emptyTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: '800' },
  emptySub: { color: 'rgba(255,255,255,0.3)', fontSize: 18 }
});

const sw$ = StyleSheet.create({
  row: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 12, gap: 4 },
  btn: { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center' },
  btnActive: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: '#00E5FF' },
  text: { color: '#AAAAAA', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  textActive: { color: '#00E5FF', fontWeight: '900' }
});

const cr2$ = StyleSheet.create({
  card: { marginHorizontal: 24, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  info: { flex: 1, gap: 2 },
  label: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  sub: { color: '#AAAAAA', fontSize: 11, fontWeight: '400' },
  btn: { backgroundColor: '#00E5FF', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 9 },
  btnText: { color: '#000000', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 }
});

