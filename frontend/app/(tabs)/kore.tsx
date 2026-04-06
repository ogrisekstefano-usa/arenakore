/**
 * ARENAKORE — KORE TAB v10.0 "NIKE DYNAMIC DASHBOARD"
 * 4 Macro-Cards with cross-fade athlete imagery (3s cycle).
 * Dark vignette overlay, pulsating 1px neon aura.
 * Typography: Plus Jakarta Sans 800 titles, Montserrat body.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  RefreshControl, Platform, Image, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useSharedValue, withRepeat, withSequence, withTiming, withDelay,
  useAnimatedStyle, Easing, interpolateColor
} from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { KoreIDModal } from '../../components/KoreIDModal';
import { ControlCenter } from '../../components/ControlCenter';
import { ChallengeCreator } from '../../components/ChallengeCreator';
import { FluxGenerator } from '../../components/FluxGenerator';
import { ChallengeShareCard } from '../../components/ChallengeShareCard';
import { ChallengePreviewModal } from '../../components/ChallengePreviewModal';
import { QRScannerModal } from '../../components/QRScannerModal';
import { PerformanceDetailModal } from '../../components/kore/PerformanceDetailModal';
import { SiloRadar } from '../../components/kore/SiloRadar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../utils/api';
import { getSportHeroImages, getSportAuraColor, getSportIcon, getSportDisplayName, getSportAvatarPlaceholder } from '../../utils/sportAssets';

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

// ─── COMPETENCY LEVEL CONFIG ───
const COMP_LEVELS: Record<string, { label: string; color: string }> = {
  'Rookie':   { label: 'ROOKIE',    color: '#8E8E93' },
  'Amateur':  { label: 'AMATEUR',   color: '#34C759' },
  'Semi-Pro': { label: 'SEMI-PRO',  color: '#007AFF' },
  'Pro':      { label: 'PRO',       color: '#FF9500' },
  'Elite':    { label: 'ELITE',     color: '#FFD700' },
};

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
  ]
};

// ═══ DYNAMIC IMAGE CARD ═══
function DynamicNeonCard({
  images, label, sub, color, onPress, index
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
      default: {}
    })
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
  const [shopVisible, setShopVisible] = useState(false);
  const [myChallenges, setMyChallenges] = useState<any[]>([]);
  const [activeDiscipline, setActiveDiscipline] = useState<string | null>(null);
  const [shareChallenge, setShareChallenge] = useState<any>(null);
  const [previewChallenge, setPreviewChallenge] = useState<any>(null);
  const [scannerVisible, setScannerVisible] = useState(false);

  // ── WAR LOG: Performance Records ──
  const [warLog, setWarLog] = useState<any[]>([]);
  const [warLogStats, setWarLogStats] = useState<any>({});
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [loadingWarLog, setLoadingWarLog] = useState(false);
  const [selectedPerformance, setSelectedPerformance] = useState<any>(null);
  const [siloProfile, setSiloProfile] = useState<any>(null);

  useEffect(() => {
    (globalThis as any).__openKoreIdModal = () => setKoreIdVisible(true);
    (globalThis as any).__openControlCenter = () => setSidebarOpen(true);
    return () => {
      delete (globalThis as any).__openKoreIdModal;
      delete (globalThis as any).__openControlCenter;
    };
  }, []);

  const flux = user?.ak_credits ?? user?.flux ?? 0;
  const firstName = user?.first_name || user?.username || 'Kore';
  const level = user?.level || 1;
  const totalScans = user?.total_scans || 0;

  const fetchMyChallenges = useCallback(async () => {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/api/ugc/mine`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyChallenges(data.challenges || []);
      }
    } catch {}
  }, [token]);

  const fetchWarLog = useCallback(async () => {
    if (!token) return;
    setLoadingWarLog(true);
    try {
      const filterMap: Record<string, string> = {
        'Validati': 'SFIDA_UGC',
        'Live': 'LIVE_ARENA',
        'Crew': 'CREW_BATTLE',
        'Allenamenti': 'ALLENAMENTO',
        'Duelli': 'DUELLO'
      };
      const tipoFilter = activeFilter ? filterMap[activeFilter] : undefined;
      const result = await api.getKoreHistory(token, { limit: 50, tipo: tipoFilter });
      setWarLog(result.records || []);
      setWarLogStats(result.stats || {});
    } catch {}
    setLoadingWarLog(false);
  }, [token, activeFilter]);

  useEffect(() => { if (token) fetchMyChallenges(); }, [token, fetchMyChallenges]);
  useEffect(() => { if (token) fetchWarLog(); }, [token, fetchWarLog]);
  useEffect(() => {
    if (!token) return;
    (async () => {
      try { const sp = await api.getSiloProfile(token); setSiloProfile(sp); } catch {}
    })();
  }, [token]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (refreshUser) await refreshUser();
      await Promise.all([fetchMyChallenges(), fetchWarLog()]);
      try { const sp = await api.getSiloProfile(token); setSiloProfile(sp); } catch {}
    } catch (_) {}
    finally { setRefreshing(false); }
  }, [refreshUser, fetchMyChallenges, fetchWarLog, token]);

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
      default: {}
    })
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

  // ─── SPORT IDENTITY DATA (must be before avatarPulse animation) ───
  const userSport = user?.preferred_sport || user?.sport || 'Fitness';
  const sportHeroImages = getSportHeroImages(userSport);
  const userProfilePic = user?.profile_picture;
  const userCoverPhoto = user?.cover_photo;
  const HERO_IMAGES = userCoverPhoto
    ? [userCoverPhoto]
    : sportHeroImages;
  const DNA_BG = sportHeroImages[2] || 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&q=40';
  const sportAura = getSportAuraColor(userSport);
  const sportIcon = getSportIcon(userSport);
  const sportDisplayName = getSportDisplayName(userSport);
  // Avatar: User Photo > Sport Placeholder > Abstract Fallback
  const avatarSource = userProfilePic || getSportAvatarPlaceholder(userSport);

  // Pre-compute safe color strings for the neon ring animation
  const ringColorDim = sportAura + '50';
  const ringColorBright = sportAura + 'CC';

  // Neon ring pulse for avatar — SAFE for native worklets
  const avatarPulse = useSharedValue(0);
  useEffect(() => {
    avatarPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
      ), -1, true,
    );
  }, []);
  const avatarRingStyle = useAnimatedStyle(() => {
    const opacity = 0.3 + avatarPulse.value * 0.5;
    return {
      opacity
    };
  });

  // Card actions
  const CARDS = [
    { key: 'sfida', images: CARD_IMAGES.sfida, label: 'SFIDA ORA', sub: 'Mettiti alla prova.', color: '#FF3B30',
      onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}); router.push('/(tabs)/nexus-trigger'); } },
    { key: 'koreid', images: CARD_IMAGES.koreid, label: 'KORE ID', sub: 'La tua identità digitale.', color: '#00E5FF',
      onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); setKoreIdVisible(true); } },
    { key: 'arena', images: CARD_IMAGES.arena, label: 'LIVE ARENA', sub: 'Entra nell\'Arena LIVE!', color: '#FFD700',
      onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); router.push('/live-events'); } },
    { key: 'coach', images: CARD_IMAGES.coach, label: 'COACH', sub: 'Preparati con il Coach.', color: '#00FF87',
      onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); router.push('/reward-store'); } },
  ];

  const [heroIdx, setHeroIdx] = useState(0);
  const heroFadeA = useSharedValue(1);
  const heroFadeB = useSharedValue(0);
  const heroShowA = useRef(true);

  // Cross-fade HERO images — ONLY if no user cover photo (sport defaults rotate)
  useEffect(() => {
    // If user has their own cover photo, keep it fixed — NO transition
    if (userCoverPhoto) return;
    if (HERO_IMAGES.length <= 1) return;
    const interval = setInterval(() => {
      if (heroShowA.current) {
        heroFadeB.value = withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) });
        heroFadeA.value = withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) });
      } else {
        heroFadeA.value = withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) });
        heroFadeB.value = withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) });
      }
      heroShowA.current = !heroShowA.current;
      setHeroIdx(p => (p + 1) % HERO_IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [userCoverPhoto, HERO_IMAGES.length]);

  const heroStyleA = useAnimatedStyle(() => ({ opacity: heroFadeA.value }));
  const heroStyleB = useAnimatedStyle(() => ({ opacity: heroFadeB.value }));
  const heroImgA = HERO_IMAGES[heroIdx];
  const heroImgB = HERO_IMAGES[(heroIdx + 1) % HERO_IMAGES.length];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <Header title="KORE" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00E5FF" />}
        contentContainerStyle={{ paddingBottom: 90 }}
      >
        {/* ═══ NIKE HERO BANNER ═══ */}
        <View style={hero.container}>
          {/* Cross-fading images */}
          <Animated.View style={[hero.imgLayer, heroStyleA]}>
            <Image source={{ uri: heroImgA }} style={hero.img} resizeMode="cover" />
          </Animated.View>
          <Animated.View style={[hero.imgLayer, heroStyleB]}>
            <Image source={{ uri: heroImgB }} style={hero.img} resizeMode="cover" />
          </Animated.View>
          {/* Heavy gradient vignette — VELINA NERA 30% + gradient */}
          <View style={StyleSheet.absoluteFillObject}>
            {/* Base solid black velina at 30% */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.30)', zIndex: 1 }]} />
            {/* Gradient from bottom for text legibility */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.80)', '#0A0A0A']}
              locations={[0, 0.25, 0.65, 1]}
              style={[StyleSheet.absoluteFillObject, { zIndex: 2 }]}
            />
          </View>
          {/* Hero content — IDENTITY BLOCK */}
          <View style={hero.content}>
            {/* ── AVATAR + IDENTITY ROW ── */}
            <Animated.View entering={FadeIn.duration(600)} style={hero.identityBlock}>
              {/* Circular Avatar with Neon Ring */}
              <TouchableOpacity onPress={() => router.push('/settings')} activeOpacity={0.85}>
                <Animated.View style={[hero.avatarRing, { borderColor: ringColorBright }, avatarRingStyle]}>
                  <Image source={{ uri: avatarSource }} style={hero.avatarImg} resizeMode="cover" />
                  {/* Sport icon overlay badge */}
                  <View style={[hero.avatarBadge, { backgroundColor: sportAura }]}>
                    <Text style={hero.avatarBadgeText}>{sportIcon}</Text>
                  </View>
                </Animated.View>
              </TouchableOpacity>
              {/* Name + Title + Sport column */}
              <View style={hero.identityInfo}>
                <Text style={hero.heroName} numberOfLines={1}>{firstName}</Text>
                {/* ── COMPETENCY BADGE ── */}
                {(() => {
                  const cl = user?.training_level || 'Amateur';
                  const comp = COMP_LEVELS[cl] || COMP_LEVELS['Amateur'];
                  return (
                    <View style={[hero.titleChip, { borderColor: comp.color + '40' }]}>
                      <View style={[hero.titleDot, { backgroundColor: comp.color }]} />
                      <Text style={[hero.titleText, { color: comp.color }]}>{comp.label}</Text>
                    </View>
                  );
                })()}
                <View style={[hero.sportChip, { borderColor: sportAura + '35', backgroundColor: sportAura + '10' }]}>
                  <Text style={hero.sportChipIcon}>{sportIcon}</Text>
                  <Text style={[hero.sportChipText, { color: sportAura }]}>{sportDisplayName.toUpperCase()}</Text>
                </View>
              </View>
            </Animated.View>
            {/* Status chips */}
            <Animated.View entering={FadeIn.delay(150).duration(400)} style={hero.chips}>
              <View style={hero.lvlChip}>
                <Ionicons name="shield-checkmark" size={10} color="#00E5FF" />
                <Text style={hero.chipText}>LVL {level}</Text>
              </View>
              {user?.is_nexus_certified && (
                <View style={hero.nexusChip}>
                  <Ionicons name="scan" size={9} color="#00FF87" />
                  <Text style={[hero.chipText, { color: '#00FF87' }]}>NÈXUS</Text>
                </View>
              )}
              {isFounder && (
                <Animated.View style={[hero.founderChip, shimmerStyle]}>
                  <Ionicons name="star" size={9} color="#FFD700" />
                  <Text style={[hero.chipText, { color: '#FFD700' }]}>FOUNDER</Text>
                </Animated.View>
              )}
            </Animated.View>
            <Text style={hero.tagline}>IL TUO CORPO. LA TUA ARENA.</Text>
          </View>
        </View>

        <View style={s.body}>
          {/* ═══ QUICK STATS ROW ═══ */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={qs.container}>
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
          </Animated.View>

          {/* ═══ DNA RADAR — Nike-style with BG image ═══ */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={dna.section}>
            <View style={dna.radarCard}>
              <Image source={{ uri: DNA_BG }} style={dna.bgImage} resizeMode="cover" />
              <LinearGradient
                colors={['rgba(10,10,10,0.4)', 'rgba(10,10,10,0.75)', 'rgba(10,10,10,0.95)']}
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={dna.inner}>
                <View style={dna.radarHeader}>
                  <View style={dna.radarBadge}>
                    <Ionicons name="analytics" size={14} color="#00E5FF" />
                    <Text style={dna.radarBadgeText}>DNA RADAR</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/dna')} activeOpacity={0.7}>
                    <Text style={dna.viewAll}>VEDI TUTTO →</Text>
                  </TouchableOpacity>
                </View>
                <View style={dna.statsRow}>
                  <View style={dna.statItem}>
                    <Text style={dna.statValue}>{user?.dna?.avg_dna || '—'}</Text>
                    <Text style={dna.statLabel}>DNA SCORE</Text>
                  </View>
                  <View style={dna.statDivider} />
                  <View style={dna.statItem}>
                    <Text style={[dna.statValue, { color: '#FFD700' }]}>{user?.dna?.peak_power || '—'}</Text>
                    <Text style={dna.statLabel}>PEAK POWER</Text>
                  </View>
                  <View style={dna.statDivider} />
                  <View style={dna.statItem}>
                    <Text style={[dna.statValue, { color: '#00FF87' }]}>{user?.dna?.endurance || '—'}</Text>
                    <Text style={dna.statLabel}>ENDURANCE</Text>
                  </View>
                </View>
                <View style={dna.actionRow}>
                  <TouchableOpacity style={dna.scanBtn} onPress={() => router.push('/(tabs)/nexus-trigger')} activeOpacity={0.85}>
                    <Ionicons name="scan" size={14} color="#000" />
                    <Text style={dna.scanBtnText}>NUOVA SCANSIONE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={dna.idBtn} onPress={() => setKoreIdVisible(true)} activeOpacity={0.85}>
                    <Ionicons name="person-circle" size={14} color="#00E5FF" />
                    <Text style={dna.idBtnText}>KORE ID</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ═══ SILO IDENTITY — Competency Radar ═══ */}
          {siloProfile && siloProfile.radar && siloProfile.radar.length > 0 && (
            <Animated.View entering={FadeInDown.delay(250).duration(400)} style={si.section}>
              <View style={[si.card, { borderColor: (siloProfile.aura_color || '#00E5FF') + '12' }]}>
                <LinearGradient
                  colors={[(siloProfile.aura_color || '#00E5FF') + '06', 'transparent']}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
                <View style={si.header}>
                  <View>
                    <Text style={si.title}>SILO RADAR</Text>
                    <Text style={si.sub}>Competenza per disciplina · Ultimi 30 giorni</Text>
                  </View>
                  <View style={si.domBadge}>
                    <View style={[si.domDot, { backgroundColor: siloProfile.aura_color }]} />
                    <Text style={[si.domText, { color: siloProfile.aura_color }]}>{siloProfile.dominant_silo}</Text>
                    <Text style={si.domPct}>{siloProfile.dominant_pct}%</Text>
                  </View>
                </View>
                <SiloRadar data={siloProfile.radar} auraColor={siloProfile.aura_color} size={240} />
                <View style={si.statsRow}>
                  <View style={si.statItem}>
                    <Text style={si.statVal}>{siloProfile.total_challenges_30d}</Text>
                    <Text style={si.statLabel}>30 GIORNI</Text>
                  </View>
                  <View style={si.statItem}>
                    <Text style={[si.statVal, { color: '#FFD700' }]}>{siloProfile.total_flux_all}</Text>
                    <Text style={si.statLabel}>FLUX TOTALI</Text>
                  </View>
                  <View style={si.statItem}>
                    <Text style={[si.statVal, { color: siloProfile.aura_color }]}>{siloProfile.radar.length}</Text>
                    <Text style={si.statLabel}>SILO ATTIVI</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* ═══ KORE LEDGER — Registro Certificato ═══ */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={wl.section}>
            <View style={wl.headerRow}>
              <View>
                <Text style={wl.title}>KORE LEDGER</Text>
                <Text style={wl.sub}>{warLog.length} movimenti certificati</Text>
              </View>
              {warLogStats.total_sessions > 0 && (
                <View style={wl.statPill}>
                  <Text style={wl.statPillNum}>{warLogStats.avg_quality || 0}</Text>
                  <Text style={wl.statPillLabel}>AVG Q</Text>
                </View>
              )}
            </View>

            {/* Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={wl.filterRow}>
              {['Tutte', 'Validati', 'Live', 'Crew', 'Allenamenti', 'Duelli'].map((f) => {
                const isActive = (f === 'Tutte' && !activeFilter) || activeFilter === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[wl.filterPill, isActive && wl.filterPillActive]}
                    onPress={() => setActiveFilter(f === 'Tutte' ? null : f)}
                    activeOpacity={0.7}
                  >
                    <Text style={[wl.filterText, isActive && wl.filterTextActive]}>{f.toUpperCase()}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loadingWarLog ? (
              <View style={wl.emptyCard}>
                <ActivityIndicator color="#00E5FF" size="small" />
                <Text style={wl.emptyText}>Caricamento...</Text>
              </View>
            ) : warLog.length === 0 ? (
              <View style={wl.emptyCard}>
                <Ionicons name="document-text-outline" size={28} color="rgba(255,255,255,0.15)" />
                <Text style={wl.emptyText}>Nessun movimento nel Ledger</Text>
                <Text style={wl.emptySub}>Completa un protocollo per iniziare a riempire il tuo Kore Ledger.</Text>
              </View>
            ) : (
              warLog.map((rec, i) => (
                <PerformanceCard key={rec.id || i} record={rec} index={i} onPress={() => setSelectedPerformance(rec)} />
              ))
            )}
          </Animated.View>

          {/* ═══ I MIEI PROTOCOLLI ═══ */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)} style={ugc.section}>
            <View style={ugc.headerRow}>
              <View>
                <Text style={ugc.title}>I MIEI PROTOCOLLI</Text>
                <Text style={ugc.sub}>{myChallenges.length} protocolli creati</Text>
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
                <Ionicons name="document-text-outline" size={28} color="rgba(255,255,255,0.15)" />
                <Text style={ugc.emptyText}>Crea il tuo primo protocollo</Text>
                <Text style={ugc.emptySub}>Forgialo in The Forge, certificalo nel tuo Kore Ledger.</Text>
              </TouchableOpacity>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ugc.listScroll}>
                {myChallenges
                  .filter(ch => !activeDiscipline || ch.discipline === activeDiscipline)
                  .slice(0, 10).map((ch) => (
                  <UGCCard
                    key={ch._id}
                    challenge={ch}
                    userFlux={flux}
                    onStart={() => {
                      router.push({
                        pathname: '/(tabs)/nexus-trigger',
                        params: {
                          ugcChallengeId: ch._id || ch.id,
                          ugcTitle: ch.title || ch.name,
                          ugcExercises: JSON.stringify(ch.exercises || []),
                          ugcTemplateType: ch.template_type || 'CUSTOM',
                          ugcFluxReward: String(ch.flux_reward || 15),
                          ugcCreatorRole: ch.creator_role || 'ATHLETE',
                          ugcIsMaster: ch.is_master_template ? 'true' : 'false'
                        }
                      });
                    }}
                    onInvite={() => {}}
                    onLive={() => router.push('/live-events')}
                    onShare={() => { setShareChallenge(ch); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); }}
                  />
                ))}
                {myChallenges.filter(ch => !activeDiscipline || ch.discipline === activeDiscipline).length === 0 && (
                  <View style={ugc.emptyCard}>
                    <Ionicons name="filter" size={22} color="rgba(255,255,255,0.15)" />
                    <Text style={ugc.emptyText}>Nessun protocollo in questo silo</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </Animated.View>

          {/* ═══ QUICK NAV LINKS ═══ */}
          <Animated.View entering={FadeInUp.delay(400).duration(400)} style={lnk.section}>
            <QuickLink icon="analytics" color="#00E5FF" label="DNA PROFILE" onPress={() => router.push('/(tabs)/dna')} />
            <QuickLink icon="trophy" color="#FFD700" label="CLASSIFICHE" onPress={() => router.push('/(tabs)/hall')} />
            <QuickLink icon="settings-sharp" color="rgba(255,255,255,0.35)" label="IMPOSTAZIONI" onPress={() => router.push('/settings')} />
          </Animated.View>
        </View>
      </ScrollView>

      <KoreIDModal visible={koreIdVisible} onClose={() => setKoreIdVisible(false)} />
      <ControlCenter visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ChallengeCreator
        visible={creatorVisible}
        onClose={() => setCreatorVisible(false)}
        onCreated={() => fetchMyChallenges()}
      />
      <FluxGenerator
        visible={shopVisible}
        onClose={() => setShopVisible(false)}
        onPurchased={() => {}}
      />
      <ChallengeShareCard
        visible={!!shareChallenge}
        challenge={shareChallenge}
        onClose={() => setShareChallenge(null)}
      />
      <ChallengePreviewModal
        visible={!!previewChallenge}
        challengeData={previewChallenge}
        onClose={() => setPreviewChallenge(null)}
        onImported={() => { fetchMyChallenges(); setPreviewChallenge(null); }}
      />
      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onUserFound={(userData) => { setKoreIdVisible(true); }}
        onChallengeFound={(challengeData) => { setPreviewChallenge(challengeData); }}
      />
      <PerformanceDetailModal
        visible={!!selectedPerformance}
        record={selectedPerformance}
        onClose={() => setSelectedPerformance(null)}
      />
    </View>
  );
}

// ─── Performance Card (WAR LOG) ─────────────────────────────────────
const TIPO_CONFIG: Record<string, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  'SFIDA_UGC':    { color: '#FF3B30', label: 'SFIDA',       icon: 'flame' },
  'LIVE_ARENA':   { color: '#FFD700', label: 'LIVE',        icon: 'radio' },
  'ALLENAMENTO':  { color: '#00FF87', label: 'TRAINING',    icon: 'barbell' },
  'COACH_PROGRAM':{ color: '#00FF87', label: 'COACH',       icon: 'school' },
  'CREW_BATTLE':  { color: '#A855F7', label: 'CREW',        icon: 'people' },
  'DUELLO':       { color: '#FF9500', label: 'DUELLO',      icon: 'flash' }
};
const DISC_ICONS: Record<string, string> = {
  'Golf': '⛳', 'Fitness': '🏋️', 'Padel': '🏓', 'Calcio': '⚽', 'Tennis': '🎾',
  'Basket': '🏀', 'Running': '🏃', 'Nuoto': '🏊', 'Yoga': '🧘', 'CrossFit': '💪',
  'Boxing': '🥊', 'MMA': '🥋', 'Ciclismo': '🚴'
};

function PerformanceCard({ record, index, onPress }: { record: any; index: number; onPress?: () => void }) {
  const cfg = TIPO_CONFIG[record.tipo] || TIPO_CONFIG['ALLENAMENTO'];
  const kpi = record.kpi || {};
  const pr = kpi.primary_result || {};
  const snapPeak = record.snapshots?.peak;
  const discIcon = DISC_ICONS[record.disciplina] || '🏅';
  const isCrew = record.modalita === 'CREW';

  // Format primary result display
  let primaryDisplay = '—';
  let primaryUnit = '';
  if (pr.type === 'REPS' && pr.value > 0) {
    primaryDisplay = String(pr.value);
    primaryUnit = 'REPS';
  } else if (pr.type === 'TEMPO' && pr.value > 0) {
    const m = Math.floor(pr.value / 60);
    const ss = Math.round(pr.value % 60);
    primaryDisplay = `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    primaryUnit = 'MIN';
  } else if (pr.type === 'PUNTEGGIO' && pr.value > 0) {
    primaryDisplay = String(Math.round(pr.value));
    primaryUnit = 'PTS';
  }

  // Time ago
  const completedAt = record.completed_at ? new Date(record.completed_at) : null;
  let timeAgo = '';
  if (completedAt) {
    const diff = Date.now() - completedAt.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) timeAgo = `${mins}min fa`;
    else if (mins < 1440) timeAgo = `${Math.floor(mins / 60)}h fa`;
    else timeAgo = `${Math.floor(mins / 1440)}g fa`;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)} style={pc.card}>
      {/* PEAK snapshot background */}
      {snapPeak ? (
        <Image source={{ uri: snapPeak }} style={pc.bgImg} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[cfg.color + '12', '#0A0A0A']}
          style={pc.bgGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      {/* Dark overlay gradient */}
      <LinearGradient
        colors={['rgba(10,10,10,0.3)', 'rgba(10,10,10,0.65)', 'rgba(10,10,10,0.92)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header row */}
      <View style={pc.header}>
        <View style={[pc.tipoBadge, { backgroundColor: cfg.color + '20', borderColor: cfg.color + '35' }]}>
          <Ionicons name={cfg.icon} size={10} color={cfg.color} />
          <Text style={[pc.tipoBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <View style={pc.discBadge}>
          <Text style={pc.discIcon}>{discIcon}</Text>
          <Text style={pc.discText}>{record.disciplina || 'Fitness'}</Text>
        </View>
      </View>

      {/* Center focus — primary result */}
      <View style={pc.center}>
        <Text style={pc.primaryVal}>{primaryDisplay}</Text>
        {primaryUnit ? <Text style={pc.primaryUnit}>{primaryUnit}</Text> : null}
        {record.is_certified && (
          <View style={pc.certBadge}>
            <Ionicons name="shield-checkmark" size={9} color="#00FF87" />
            <Text style={pc.certText}>CERTIFIED</Text>
          </View>
        )}
      </View>

      {/* Footer KPIs */}
      <View style={pc.footer}>
        <View style={pc.kpiRow}>
          {kpi.quality_score != null && kpi.quality_score > 0 && (
            <View style={pc.kpiItem}>
              <Text style={pc.kpiVal}>{Math.round(kpi.quality_score)}%</Text>
              <Text style={pc.kpiLabel}>QUALITY</Text>
            </View>
          )}
          {kpi.rom_pct != null && (
            <View style={pc.kpiItem}>
              <Text style={pc.kpiVal}>{Math.round(kpi.rom_pct)}%</Text>
              <Text style={pc.kpiLabel}>ROM</Text>
            </View>
          )}
          {kpi.explosivity_pct != null && (
            <View style={pc.kpiItem}>
              <Text style={pc.kpiVal}>{Math.round(kpi.explosivity_pct)}%</Text>
              <Text style={pc.kpiLabel}>EXPL.</Text>
            </View>
          )}
          {kpi.power_output != null && kpi.power_output > 0 && (
            <View style={pc.kpiItem}>
              <Text style={pc.kpiVal}>{Math.round(kpi.power_output)}</Text>
              <Text style={pc.kpiLabel}>POWER</Text>
            </View>
          )}
          {kpi.heart_rate_avg != null && kpi.heart_rate_avg > 0 && (
            <View style={pc.kpiItem}>
              <Text style={[pc.kpiVal, { color: '#FF3B30' }]}>{Math.round(kpi.heart_rate_avg)}</Text>
              <Text style={pc.kpiLabel}>BPM</Text>
            </View>
          )}
          {record.flux_earned > 0 && (
            <View style={pc.kpiItem}>
              <Text style={[pc.kpiVal, { color: '#FFD700' }]}>+{record.flux_earned}</Text>
              <Text style={pc.kpiLabel}>FLUX</Text>
            </View>
          )}
        </View>
        <View style={pc.footerBottom}>
          <Text style={pc.timeAgo}>{timeAgo}</Text>
          <View style={[pc.modeBadge, isCrew ? { backgroundColor: 'rgba(168,85,247,0.15)' } : {}]}>
            <Ionicons name={isCrew ? 'people' : 'person'} size={9} color={isCrew ? '#A855F7' : 'rgba(255,255,255,0.35)'} />
            <Text style={[pc.modeText, isCrew ? { color: '#A855F7' } : {}]}>
              {isCrew ? (record.crew_id ? 'CREW' : 'CREW') : 'INDIVIDUALE'}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
    </TouchableOpacity>
  );
}

// ─── UGC Card (Horizontal Scroll) ──────────────────────────────────
const PUBLISH_FEES: Record<string, number> = { solo: 0, ranked: 50, friend: 25, live: 100 };
const TEMPLATE_COLORS: Record<string, string> = {
  AMRAP: '#FF3B30', EMOM: '#00E5FF', FOR_TIME: '#FFD700', TABATA: '#00FF87', CUSTOM: '#FF9500'
};
const TEMPLATE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  AMRAP: 'flame', EMOM: 'timer', FOR_TIME: 'speedometer', TABATA: 'pulse', CUSTOM: 'construct'
};

function UGCCard({ challenge, onStart, onInvite, onLive, onShare, userFlux }: {
  challenge: any; onStart: () => void; onInvite: () => void; onLive: () => void; onShare: () => void; userFlux: number;
}) {
  const color = TEMPLATE_COLORS[challenge.template_type] || '#00E5FF';
  const icon = TEMPLATE_ICONS[challenge.template_type] || 'flash';
  const inviteFee = PUBLISH_FEES['friend'];
  const liveFee = PUBLISH_FEES['live'];
  const canInvite = userFlux >= inviteFee;
  const canLive = userFlux >= liveFee;

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
          <TouchableOpacity
            style={[ugc.actionBtn, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }]}
            onPress={onShare}
          >
            <Ionicons name="share-social" size={11} color={color} />
            <Text style={[ugc.actionText, { color: color + '90' }]}>SHARE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[ugc.actionBtn, {
              backgroundColor: canInvite ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
              borderColor: canInvite ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
              opacity: canInvite ? 1 : 0.4,
              paddingHorizontal: 6
            }]}
            onPress={canInvite ? onInvite : undefined}
            disabled={!canInvite}
          >
            <Ionicons name="person-add" size={12} color="rgba(255,255,255,0.4)" />
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
  body: { paddingHorizontal: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', marginBottom: 20 }
});

// ── NIKE HERO BANNER ──
const hero = StyleSheet.create({
  container: {
    height: 280,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 4
  },
  imgLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0
  },
  img: { width: '100%', height: '100%' },
  topRow: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10
  },
  topActions: {
    flexDirection: 'row', alignItems: 'center', gap: 8
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
  },
  fluxBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1.2, borderColor: 'rgba(255,215,0,0.18)'
  },
  fluxVal: { color: '#FFD700', fontSize: 15, fontWeight: '900', fontFamily: FONT_J, letterSpacing: 0.5 },
  content: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    zIndex: 10
  },
  chips: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10
  },
  lvlChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,229,255,0.12)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4
  },
  nexusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,255,135,0.10)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4
  },
  founderChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,215,0,0.10)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4
  },
  chipText: {
    color: '#00E5FF', fontSize: 10, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_J
  },
  tagline: {
    color: 'rgba(255,255,255,0.30)', fontSize: 11, fontWeight: '900',
    letterSpacing: 4, fontFamily: FONT_M, marginTop: 6
  },
  // ═══ IDENTITY BLOCK (Avatar + Name + Title) ═══
  identityBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12
  },
  avatarRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'visible'
  },
  avatarImg: {
    width: 68, height: 68, borderRadius: 34
  },
  avatarBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0A0A0A'
  },
  avatarBadgeText: { fontSize: 12 },
  identityInfo: {
    flex: 1, gap: 4
  },
  heroName: {
    color: '#FFFFFF', fontSize: 26, fontWeight: '900', fontFamily: FONT_M,
    letterSpacing: -0.5
  },
  titleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.35)'
  },
  titleDot: { width: 7, height: 7, borderRadius: 4 },
  titleText: { fontSize: 10, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
  sportChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 4,
    alignSelf: 'flex-start'
  },
  sportChipIcon: { fontSize: 12 },
  sportChipText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J }
});

// ── DYNAMIC CARDS ──
const cd = StyleSheet.create({
  wrap: { width: '48%', flexGrow: 0, flexShrink: 0 },
  card: {
    borderRadius: 18, overflow: 'hidden', height: 180,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative'
  },
  imgLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1
  },
  img: { width: '100%', height: '100%' },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2
  },
  content: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 14, paddingBottom: 14,
    zIndex: 3
  },
  label: {
    fontSize: 16, fontWeight: '900', letterSpacing: 1,
    fontFamily: FONT_J, marginBottom: 2
  },
  sub: {
    color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600',
    fontFamily: FONT_M, lineHeight: 14
  }
});

const qs = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 16,
    marginTop: 4
  },
  item: { alignItems: 'center', gap: 3, flex: 1 },
  num: { color: '#00E5FF', fontSize: 22, fontWeight: '900', fontFamily: FONT_J },
  label: { color: 'rgba(255,255,255,0.22)', fontSize: 9, fontWeight: '800', letterSpacing: 2, fontFamily: FONT_M },
  divider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.05)' }
});

const lnk = StyleSheet.create({
  section: { gap: 2, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.025)'
  },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, fontSize: 13, fontWeight: '800', letterSpacing: 1.5, fontFamily: FONT_M }
});

const ugc = StyleSheet.create({
  section: { marginBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },
  sub: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '500', fontFamily: FONT_M, marginTop: 2 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#00E5FF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8
  },
  createBtnText: { color: '#0A0A0A', fontSize: 12, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },
  emptyCard: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 30, borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.015)'
  },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '700', fontFamily: FONT_J, marginTop: 10 },
  emptySub: { color: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: '500', fontFamily: FONT_M, marginTop: 3 },
  listScroll: { gap: 10, paddingRight: 20 },
  card: {
    width: 200, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)'
  },
  cardGrad: { padding: 14, minHeight: 140, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8
  },
  cardBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_J },
  cardFlux: { fontSize: 12, fontWeight: '900', fontFamily: FONT_J },
  cardTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5, fontFamily: FONT_J, marginBottom: 3 },
  cardExercises: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '500', fontFamily: FONT_M, marginBottom: 10 },
  cardActions: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, borderWidth: 1
  },
  actionText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5, fontFamily: FONT_J }
});

// ── DISCIPLINE SELECTOR ──
const dsc = StyleSheet.create({
  scroll: { gap: 8, paddingBottom: 14 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)'
  },
  chipActive: { backgroundColor: '#FFF', borderColor: '#FFF' },
  chipText: {
    color: 'rgba(255,255,255,0.50)', fontSize: 11, fontWeight: '800',
    letterSpacing: 1, fontFamily: FONT_J
  },
  chipTextActive: { color: '#0A0A0A' }
});

// ── DNA RADAR (Nike-style with BG image) ──
const dna = StyleSheet.create({
  section: { marginBottom: 16 },
  radarCard: {
    borderRadius: 18, overflow: 'hidden',
    position: 'relative',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.08)'
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%', height: '100%'
  },
  inner: {
    padding: 16, gap: 14,
    position: 'relative', zIndex: 5
  },
  radarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  radarBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,229,255,0.06)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.12)'
  },
  radarBadgeText: { color: '#00E5FF', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  viewAll: { color: 'rgba(0,229,255,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: 8
  },
  statItem: { alignItems: 'center', gap: 3 },
  statValue: { color: '#00E5FF', fontSize: 26, fontWeight: '900', fontFamily: FONT_J },
  statLabel: { color: 'rgba(255,255,255,0.18)', fontSize: 8, fontWeight: '800', letterSpacing: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.04)' },
  actionRow: { flexDirection: 'row', gap: 10 },
  scanBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#00E5FF', borderRadius: 12, paddingVertical: 10
  },
  scanBtnText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },
  idBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(0,229,255,0.06)', borderRadius: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)'
  },
  idBtnText: { color: '#00E5FF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J }
});

// ── WAR LOG ──
const wl = StyleSheet.create({
  section: { marginBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
  sub: { color: 'rgba(255,255,255,0.22)', fontSize: 11, fontWeight: '500', fontFamily: FONT_M, marginTop: 2 },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,229,255,0.08)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.12)'
  },
  statPillNum: { color: '#00E5FF', fontSize: 14, fontWeight: '900', fontFamily: FONT_J },
  statPillLabel: { color: 'rgba(0,229,255,0.50)', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  filterRow: { gap: 8, paddingBottom: 14 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
    borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  filterPillActive: { backgroundColor: '#FFF', borderColor: '#FFF' },
  filterText: { color: 'rgba(255,255,255,0.40)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },
  filterTextActive: { color: '#0A0A0A' },
  emptyCard: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 40, borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.015)'
  },
  emptyText: { color: 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: '700', fontFamily: FONT_J, marginTop: 10 },
  emptySub: { color: 'rgba(255,255,255,0.12)', fontSize: 11, fontWeight: '500', fontFamily: FONT_M, marginTop: 3 }
});

// ── PERFORMANCE CARD ──
const pc = StyleSheet.create({
  card: {
    borderRadius: 18, overflow: 'hidden', marginBottom: 12,
    borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative', minHeight: 170
  },
  bgImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%', height: '100%'
  },
  bgGrad: {
    ...StyleSheet.absoluteFillObject
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 14,
    position: 'relative', zIndex: 5
  },
  tipoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1
  },
  tipoBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, fontFamily: FONT_J },
  discBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4
  },
  discIcon: { fontSize: 14 },
  discText: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: FONT_M },
  center: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10,
    position: 'relative', zIndex: 5
  },
  primaryVal: {
    color: '#FFFFFF', fontSize: 42, fontWeight: '900', fontFamily: FONT_J,
    letterSpacing: 2,
    ...Platform.select({
      web: { textShadow: '0 0 20px rgba(255,255,255,0.25)' } as any,
      default: {}
    })
  },
  primaryUnit: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '900',
    letterSpacing: 3, fontFamily: FONT_J, marginTop: -2
  },
  certBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6,
    backgroundColor: 'rgba(0,255,135,0.10)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(0,255,135,0.20)'
  },
  certText: { color: '#00FF87', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },
  footer: {
    paddingHorizontal: 14, paddingBottom: 14,
    position: 'relative', zIndex: 5
  },
  kpiRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    flexWrap: 'wrap',
    marginBottom: 8
  },
  kpiItem: { alignItems: 'center', gap: 2 },
  kpiVal: { color: '#00E5FF', fontSize: 13, fontWeight: '900', fontFamily: FONT_J },
  kpiLabel: { color: 'rgba(255,255,255,0.20)', fontSize: 7, fontWeight: '800', letterSpacing: 1.5 },
  footerBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  timeAgo: { color: 'rgba(255,255,255,0.18)', fontSize: 10, fontWeight: '600', fontFamily: FONT_M },
  modeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3
  },
  modeText: { color: 'rgba(255,255,255,0.30)', fontSize: 8, fontWeight: '800', letterSpacing: 1, fontFamily: FONT_J }
});


// ── SILO IDENTITY ──
const si = StyleSheet.create({
  section: { marginBottom: 16 },
  card: {
    borderRadius: 20, overflow: 'hidden', padding: 16,
    borderWidth: 1.2, position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.015)'
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
  sub: { color: 'rgba(255,255,255,0.20)', fontSize: 10, fontWeight: '500', fontFamily: FONT_M, marginTop: 2 },
  domBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5
  },
  domDot: { width: 8, height: 8, borderRadius: 4 },
  domText: { fontSize: 10, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_J },
  domPct: { color: 'rgba(255,255,255,0.30)', fontSize: 9, fontWeight: '800', fontFamily: FONT_J },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around', marginTop: 16,
    paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)'
  },
  statItem: { alignItems: 'center' },
  statVal: { color: '#FFF', fontSize: 18, fontWeight: '900', fontFamily: FONT_J },
  statLabel: { color: 'rgba(255,255,255,0.20)', fontSize: 8, fontWeight: '800', letterSpacing: 1.5, marginTop: 2 }
});
