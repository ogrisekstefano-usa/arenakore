/**
 * ARENAKORE — KORE TAB v10.0 "NIKE DYNAMIC DASHBOARD"
 * 4 Macro-Cards with cross-fade athlete imagery (3s cycle).
 * Dark vignette overlay, pulsating 1px neon aura.
 * Typography: Plus Jakarta Sans 800 titles, Montserrat body.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  RefreshControl, Platform, Image, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useSharedValue, withRepeat, withSequence, withTiming, withDelay,
  useAnimatedStyle, Easing, interpolateColor,
} from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { KoreIDModal } from '../../components/KoreIDModal';
import { ControlCenter } from '../../components/ControlCenter';
import { ChallengeCreator } from '../../components/ChallengeCreator';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FONT_J = Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined });
const FONT_M = Platform.select({ web: 'Montserrat, sans-serif', default: undefined });

// ─── SPORT DISCIPLINES ───
const DISCIPLINES = [
  { key: 'Fitness', icon: 'barbell' as const, color: '#FF3B30' },
  { key: 'Bodybuilding', icon: 'body' as const, color: '#FF9500' },
  { key: 'Golf', icon: 'golf' as const, color: '#00FF87' },
  { key: 'Basket', icon: 'basketball' as const, color: '#FFD700' },
  { key: 'Tennis', icon: 'tennisball' as const, color: '#00E5FF' },
  { key: 'Running', icon: 'walk' as const, color: '#FF6EC7' },
];

// ─── IMAGE SETS PER CARD ───
const CARD_IMAGES = {
  sfida: [
    'https://images.unsplash.com/photo-1636581563711-cd454f1bf99a?w=600&q=50',
    'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&q=50',
    'https://images.unsplash.com/photo-1663791088119-07535b0fafeb?w=600&q=50',
  ],
  koreid: [
    'https://images.unsplash.com/photo-1656785139062-0a4f174467a4?w=600&q=50',
    'https://images.unsplash.com/photo-1601113329251-0aebe217bdbe?w=600&q=50',
    'https://images.unsplash.com/photo-1652532678111-85849708e1f4?w=600&q=50',
  ],
  arena: [
    'https://images.unsplash.com/photo-1599995730539-695f5717b24c?w=600&q=50',
    'https://images.unsplash.com/photo-1577416412292-747c6607f055?w=600&q=50',
    'https://images.unsplash.com/photo-1519879709058-11082644047d?w=600&q=50',
  ],
  coach: [
    'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=600&q=50',
    'https://images.unsplash.com/photo-1550345332-09e3ac987658?w=600&q=50',
    'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&q=50',
  ],
};

// ═══ DYNAMIC IMAGE CARD ═══
function DynamicNeonCard({
  images, label, sub, color, onPress, index,
}: {
  images: string[];
  label: string;
  sub: string;
  color: string;
  onPress: () => void;
  index: number;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const fadeA = useSharedValue(1);
  const fadeB = useSharedValue(0);
  const showA = useRef(true);

  // Cross-fade cycle every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (showA.current) {
        fadeB.value = withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) });
        fadeA.value = withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) });
      } else {
        fadeA.value = withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) });
        fadeB.value = withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) });
      }
      showA.current = !showA.current;
      setActiveIdx(prev => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  const styleA = useAnimatedStyle(() => ({ opacity: fadeA.value }));
  const styleB = useAnimatedStyle(() => ({ opacity: fadeB.value }));

  // Pulsating neon border
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withDelay(
      index * 200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        ), -1, true,
      ),
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(pulse.value, [0, 1], [color + '20', color + '80']),
    ...Platform.select({
      web: { boxShadow: `0 0 ${4 + pulse.value * 12}px ${color}${Math.round(10 + pulse.value * 30).toString(16).padStart(2, '0')}` },
      default: {},
    }),
  }));

  const imgA = images[activeIdx];
  const imgB = images[(activeIdx + 1) % images.length];

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 100).duration(500)} style={cd.wrap}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <Animated.View style={[cd.card, glowStyle]}>
          {/* Image Layer A */}
          <Animated.View style={[cd.imgLayer, styleA]}>
            <Image source={{ uri: imgA }} style={cd.img} resizeMode="cover" />
          </Animated.View>
          {/* Image Layer B */}
          <Animated.View style={[cd.imgLayer, styleB]}>
            <Image source={{ uri: imgB }} style={cd.img} resizeMode="cover" />
          </Animated.View>
          {/* Vignette */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.92)']}
            locations={[0, 0.3, 0.65, 1]}
            style={cd.vignette}
          />
          {/* Content */}
          <View style={cd.content}>
            <Text style={[cd.label, { color }]}>{label}</Text>
            <Text style={cd.sub}>{sub}</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN KORE TAB
// ═══════════════════════════════════════════════════════════
export default function KoreTab() {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [koreIdVisible, setKoreIdVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [creatorVisible, setCreatorVisible] = useState(false);
  const [myChallenges, setMyChallenges] = useState<any[]>([]);
  const [activeDiscipline, setActiveDiscipline] = useState<string | null>(null);

  useEffect(() => {
    (globalThis as any).__openKoreIdModal = () => setKoreIdVisible(true);
    (globalThis as any).__openControlCenter = () => setSidebarOpen(true);
    return () => {
      delete (globalThis as any).__openKoreIdModal;
      delete (globalThis as any).__openControlCenter;
    };
  }, []);

  const flux = user?.flux ?? user?.xp ?? 0;
  const firstName = user?.first_name || user?.username || 'Kore';
  const level = user?.level || 1;
  const totalScans = user?.total_scans || 0;

  const fetchMyChallenges = useCallback(async () => {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/api/ugc/mine`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyChallenges(data.challenges || []);
      }
    } catch {}
  }, [token]);

  useEffect(() => { if (token) fetchMyChallenges(); }, [token, fetchMyChallenges]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (refreshUser) await refreshUser();
      await fetchMyChallenges();
    } catch (_) {}
    finally { setRefreshing(false); }
  }, [refreshUser, fetchMyChallenges]);

  // FLUX badge glow
  const fluxGlow = useSharedValue(0);
  useEffect(() => {
    fluxGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ), -1, true,
    );
  }, []);
  const fluxBadgeStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(fluxGlow.value, [0, 1], ['rgba(255,215,0,0.08)', 'rgba(255,215,0,0.30)']),
    ...Platform.select({
      web: { boxShadow: `0 0 ${3 + fluxGlow.value * 8}px rgba(255,215,0,${0.04 + fluxGlow.value * 0.10})` },
      default: {},
    }),
  }));

  // Founder shimmer
  const shimmer = useSharedValue(0.5);
  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(withTiming(1, { duration: 2200 }), withTiming(0.5, { duration: 2200 })),
      -1, false,
    );
  }, []);
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));
  const isFounder = user?.is_founder || user?.is_admin;

  // Card actions
  const CARDS = [
    { key: 'sfida', images: CARD_IMAGES.sfida, label: 'SFIDA ORA', sub: 'Mettiti alla prova.', color: '#FF3B30',
      onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}); router.push('/(tabs)/nexus-trigger'); } },
    { key: 'koreid', images: CARD_IMAGES.koreid, label: 'KORE ID', sub: 'La tua identità digitale.', color: '#00E5FF',
      onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); setKoreIdVisible(true); } },
    { key: 'arena', images: CARD_IMAGES.arena, label: 'LIVE ARENA', sub: 'Le sfide LIVE, entra in Arena!', color: '#FFD700',
      onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); router.push('/live-events'); } },
    { key: 'coach', images: CARD_IMAGES.coach, label: 'COACH', sub: 'Preparati per le sfide.', color: '#00FF87',
      onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); router.push('/reward-store'); } },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* ═══ HEADER ═══ */}
      <Animated.View entering={FadeIn.duration(400)} style={[hdr.container, { paddingTop: insets.top + 10 }]}>
        <View style={hdr.left}>
          <Text style={hdr.greeting} numberOfLines={1}>
            Ciao <Text style={hdr.name}>{firstName}</Text>,
          </Text>
          <Text style={hdr.sub}>pronto a superarti?</Text>
        </View>
        <View style={hdr.right}>
          <Animated.View style={[hdr.fluxBadge, fluxBadgeStyle]}>
            <Ionicons name="flash" size={13} color="#FFD700" />
            <Text style={hdr.fluxVal}>{flux.toLocaleString()}</Text>
          </Animated.View>
          <TouchableOpacity
            onPress={() => setSidebarOpen(true)}
            style={hdr.menuBtn}
            activeOpacity={0.6}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.40)" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00E5FF" />}
        contentContainerStyle={s.scroll}
      >
        {/* ═══ STATUS CHIPS ═══ */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={st.row}>
          <View style={st.lvlChip}>
            <Ionicons name="shield-checkmark" size={11} color="#00E5FF" />
            <Text style={st.lvlText}>LVL {level}</Text>
          </View>
          {user?.is_nexus_certified && (
            <View style={st.nexusChip}>
              <Ionicons name="scan" size={10} color="#00FF87" />
              <Text style={st.nexusText}>NEXUS</Text>
            </View>
          )}
          {isFounder && (
            <Animated.View style={[st.founderChip, shimmerStyle]}>
              <Ionicons name="star" size={10} color="#FFD700" />
              <Text style={st.founderText}>FOUNDER</Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* ═══ DISCIPLINE SELECTOR ═══ */}
        <Animated.View entering={FadeInDown.delay(70).duration(400)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dsc.scroll}>
            <TouchableOpacity
              style={[dsc.chip, !activeDiscipline && dsc.chipActive]}
              onPress={() => { setActiveDiscipline(null); Haptics.selectionAsync().catch(() => {}); }}
              activeOpacity={0.7}
            >
              <Ionicons name="grid" size={13} color={!activeDiscipline ? '#0A0A0A' : 'rgba(255,255,255,0.45)'} />
              <Text style={[dsc.chipText, !activeDiscipline && dsc.chipTextActive]}>TUTTI</Text>
            </TouchableOpacity>
            {DISCIPLINES.map(d => {
              const active = activeDiscipline === d.key;
              return (
                <TouchableOpacity
                  key={d.key}
                  style={[dsc.chip, active && { backgroundColor: d.color, borderColor: d.color }]}
                  onPress={() => { setActiveDiscipline(d.key); Haptics.selectionAsync().catch(() => {}); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name={d.icon} size={13} color={active ? '#0A0A0A' : d.color} />
                  <Text style={[dsc.chipText, active && { color: '#0A0A0A' }]}>{d.key.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* ═══ 4 DYNAMIC CARDS ═══ */}
        <View style={s.grid}>
          {CARDS.map((c, i) => (
            <DynamicNeonCard
              key={c.key}
              images={c.images}
              label={c.label}
              sub={c.sub}
              color={c.color}
              onPress={c.onPress}
              index={i}
            />
          ))}
        </View>

        {/* ═══ QUICK STATS ═══ */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={qs.container}>
          <LinearGradient
            colors={['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)', 'transparent']}
            style={qs.gradient}
          >
            <View style={qs.item}>
              <Text style={qs.num}>{totalScans}</Text>
              <Text style={qs.label}>SCANS</Text>
            </View>
            <View style={qs.divider} />
            <View style={qs.item}>
              <Text style={[qs.num, { color: '#FFD700' }]}>{flux.toLocaleString()}</Text>
              <Text style={qs.label}>FLUX</Text>
            </View>
            <View style={qs.divider} />
            <View style={qs.item}>
              <Text style={qs.num}>LVL {level}</Text>
              <Text style={qs.label}>LIVELLO</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ═══ LE MIE SFIDE ═══ */}
        <Animated.View entering={FadeInDown.delay(550).duration(400)} style={ugc.section}>
          <View style={ugc.headerRow}>
            <View>
              <Text style={ugc.title}>LE MIE SFIDE</Text>
              <Text style={ugc.sub}>{myChallenges.length} sfide create</Text>
            </View>
            <TouchableOpacity
              style={ugc.createBtn}
              onPress={() => { setCreatorVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#0A0A0A" />
              <Text style={ugc.createBtnText}>CREA</Text>
            </TouchableOpacity>
          </View>

          {myChallenges.length === 0 ? (
            <TouchableOpacity style={ugc.emptyCard} onPress={() => setCreatorVisible(true)} activeOpacity={0.8}>
              <Ionicons name="construct-outline" size={28} color="rgba(255,255,255,0.15)" />
              <Text style={ugc.emptyText}>Crea la tua prima sfida</Text>
              <Text style={ugc.emptySub}>Diventa il protagonista dell'Arena.</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ugc.listScroll}>
              {myChallenges
                .filter(ch => !activeDiscipline || ch.discipline === activeDiscipline)
                .slice(0, 10).map((ch) => (
                <UGCCard
                  key={ch._id}
                  challenge={ch}
                  onStart={() => router.push('/(tabs)/nexus-trigger')}
                  onInvite={() => {}}
                  onLive={() => router.push('/live-events')}
                />
              ))}
              {myChallenges.filter(ch => !activeDiscipline || ch.discipline === activeDiscipline).length === 0 && (
                <View style={ugc.emptyCard}>
                  <Ionicons name="filter" size={22} color="rgba(255,255,255,0.15)" />
                  <Text style={ugc.emptyText}>Nessuna sfida in questo silo</Text>
                </View>
              )}
            </ScrollView>
          )}
        </Animated.View>

        {/* ═══ QUICK NAV LINKS ═══ */}
        <Animated.View entering={FadeInUp.delay(600).duration(400)} style={lnk.section}>
          <QuickLink icon="analytics" color="#00E5FF" label="DNA PROFILE" onPress={() => router.push('/(tabs)/dna')} />
          <QuickLink icon="trophy" color="#FFD700" label="CLASSIFICHE" onPress={() => router.push('/(tabs)/hall')} />
          <QuickLink icon="settings-sharp" color="rgba(255,255,255,0.35)" label="IMPOSTAZIONI" onPress={() => router.push('/settings')} />
        </Animated.View>

        <View style={{ height: 44 }} />
      </ScrollView>

      <KoreIDModal visible={koreIdVisible} onClose={() => setKoreIdVisible(false)} />
      <ControlCenter visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ChallengeCreator
        visible={creatorVisible}
        onClose={() => setCreatorVisible(false)}
        onCreated={() => fetchMyChallenges()}
      />
    </View>
  );
}

// ─── UGC Card (Horizontal Scroll) ──────────────────────────────────
const TEMPLATE_COLORS: Record<string, string> = {
  AMRAP: '#FF3B30', EMOM: '#00E5FF', FOR_TIME: '#FFD700', TABATA: '#00FF87', CUSTOM: '#FF9500',
};
const TEMPLATE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  AMRAP: 'flame', EMOM: 'timer', FOR_TIME: 'speedometer', TABATA: 'pulse', CUSTOM: 'construct',
};

function UGCCard({ challenge, onStart, onInvite, onLive }: {
  challenge: any; onStart: () => void; onInvite: () => void; onLive: () => void;
}) {
  const color = TEMPLATE_COLORS[challenge.template_type] || '#00E5FF';
  const icon = TEMPLATE_ICONS[challenge.template_type] || 'flash';
  return (
    <View style={[ugc.card, { borderColor: color + '25' }]}>
      <LinearGradient colors={[color + '0A', '#0A0A0A']} style={ugc.cardGrad}>
        <View style={ugc.cardTop}>
          <View style={[ugc.cardBadge, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={12} color={color} />
            <Text style={[ugc.cardBadgeText, { color }]}>{challenge.template_type}</Text>
          </View>
          <Text style={[ugc.cardFlux, { color: '#FFD700' }]}>+{challenge.flux_reward}⚡</Text>
        </View>
        <Text style={[ugc.cardTitle, { color }]} numberOfLines={1}>{challenge.title}</Text>
        <Text style={ugc.cardExercises} numberOfLines={1}>
          {(challenge.exercises || []).map((e: any) => e.name).join(' · ') || '—'}
        </Text>
        <View style={ugc.cardActions}>
          <TouchableOpacity style={[ugc.actionBtn, { backgroundColor: color + '15', borderColor: color + '30' }]} onPress={onStart}>
            <Ionicons name="play" size={12} color={color} />
            <Text style={[ugc.actionText, { color }]}>AVVIA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[ugc.actionBtn, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }]} onPress={onInvite}>
            <Ionicons name="person-add" size={11} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
          <TouchableOpacity style={[ugc.actionBtn, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }]} onPress={onLive}>
            <Ionicons name="radio" size={11} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Quick Link Row ─────────────────────────────────────────────────
function QuickLink({ icon, color, label, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; color: string; label: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={lnk.row} onPress={onPress} activeOpacity={0.65}>
      <View style={[lnk.iconBox, { backgroundColor: color + '0D' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[lnk.text, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={color + '40'} />
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', marginBottom: 20 },
});

const hdr = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  left: { flex: 1, gap: 2 },
  greeting: { color: 'rgba(255,255,255,0.45)', fontSize: 17, fontFamily: FONT_J, fontWeight: '500' },
  name: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  sub: { color: 'rgba(255,255,255,0.20)', fontSize: 13, fontFamily: FONT_J, fontWeight: '800', letterSpacing: 0.3 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fluxBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,215,0,0.05)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1.2, borderColor: 'rgba(255,215,0,0.12)',
  },
  fluxVal: { color: '#FFD700', fontSize: 15, fontWeight: '900', fontFamily: FONT_J, letterSpacing: 0.5 },
  menuBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
});

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  lvlChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,229,255,0.07)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)',
  },
  lvlText: { color: '#00E5FF', fontSize: 13, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },
  nexusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,255,135,0.05)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(0,255,135,0.15)',
  },
  nexusText: { color: '#00FF87', fontSize: 11, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_M },
  founderChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.18)',
  },
  founderText: { color: '#FFD700', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_M },
});

// ── DYNAMIC CARDS ──
const cd = StyleSheet.create({
  wrap: { width: '48%' as any, flexGrow: 0, flexShrink: 0 },
  card: {
    borderRadius: 18, overflow: 'hidden', height: 180,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  imgLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  img: { width: '100%', height: '100%' },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  content: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 14, paddingBottom: 14,
    zIndex: 3,
  },
  label: {
    fontSize: 16, fontWeight: '900', letterSpacing: 1,
    fontFamily: FONT_J, marginBottom: 2,
  },
  sub: {
    color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600',
    fontFamily: FONT_M, lineHeight: 14,
  },
});

const qs = StyleSheet.create({
  container: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 20,
  },
  gradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: 18,
  },
  item: { alignItems: 'center', gap: 3 },
  num: { color: '#00E5FF', fontSize: 22, fontWeight: '900', fontFamily: FONT_J },
  label: { color: 'rgba(255,255,255,0.18)', fontSize: 9, fontWeight: '800', letterSpacing: 2.5, fontFamily: FONT_M },
  divider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.04)' },
});

const lnk = StyleSheet.create({
  section: { gap: 2, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.025)',
  },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, fontSize: 13, fontWeight: '800', letterSpacing: 1.5, fontFamily: FONT_M },
});

const ugc = StyleSheet.create({
  section: { marginBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },
  sub: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '500', fontFamily: FONT_M, marginTop: 2 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#00E5FF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  createBtnText: { color: '#0A0A0A', fontSize: 12, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },
  emptyCard: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 30, borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '700', fontFamily: FONT_J, marginTop: 10 },
  emptySub: { color: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: '500', fontFamily: FONT_M, marginTop: 3 },
  listScroll: { gap: 10, paddingRight: 20 },
  card: {
    width: 200, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardGrad: { padding: 14, minHeight: 140, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  cardBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_J },
  cardFlux: { fontSize: 12, fontWeight: '900', fontFamily: FONT_J },
  cardTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5, fontFamily: FONT_J, marginBottom: 3 },
  cardExercises: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '500', fontFamily: FONT_M, marginBottom: 10 },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  actionText: { fontSize: 10, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_J },
});

// ── DISCIPLINE SELECTOR ──
const dsc = StyleSheet.create({
  scroll: { gap: 8, paddingBottom: 14 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipActive: { backgroundColor: '#FFF', borderColor: '#FFF' },
  chipText: {
    color: 'rgba(255,255,255,0.50)', fontSize: 11, fontWeight: '800',
    letterSpacing: 1, fontFamily: FONT_J,
  },
  chipTextActive: { color: '#0A0A0A' },
});
