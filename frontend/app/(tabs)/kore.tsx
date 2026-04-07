/**
 * ARENAKORE — KORE TAB v11.0 "PREMIUM DASHBOARD"
 * Clean production build. No diagnostic flags.
 * Lazy-loads SiloRadar, KoreIDModal. KORE ATLAS widget included.
 * Defensive programming on all data paths.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeInDown, FadeInUp
} from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import Constants from 'expo-constants';

// ═══ SAFE Dimensions ═══
let SW = 390;
try { SW = Dimensions.get('window').width; } catch (e) {}

// ═══ Lazy imports ═══
let KoreIDModal: any = null;
let SiloRadarComponent: any = null;

try { KoreIDModal = require('../../components/KoreIDModal').KoreIDModal; } catch (e) {}
try { SiloRadarComponent = require('../../components/kore/SiloRadar').SiloRadar; } catch (e) {}

const API = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL
  || process.env.EXPO_PUBLIC_BACKEND_URL
  || '';

const FONT_M = Platform.select({ web: "'Montserrat', sans-serif", default: undefined });
const FONT_J = Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined });

// ═══ SILO PROFILE DATA ═══
interface SiloProfile {
  dominant_silo: string;
  dominant_pct: number;
  dominant_count: number;
  aura_color: string;
  title: string;
  title_tier: string;
  total_challenges_30d: number;
  total_challenges_all: number;
  total_flux_all: number;
  radar: Array<{
    silo: string;
    color: string;
    count: number;
    avg_quality: number;
    competency: number;
  }>;
}

export default function KoreScreen() {
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [koreIdVisible, setKoreIdVisible] = useState(false);
  const [siloProfile, setSiloProfile] = useState<SiloProfile | null>(null);
  const [dnaData, setDnaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const [dnaRes, siloRes] = await Promise.all([
        fetch(`${API}/api/dna/history`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/kore/silo-profile`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (dnaRes.ok) setDnaData(await dnaRes.json());
      if (siloRes.ok) {
        const raw = await siloRes.json();
        // ═══ CRITICAL FIX: Backend returns { radar: [...] }, NOT { silos: [...] }
        setSiloProfile({
          dominant_silo: raw.dominant_silo || 'Fitness',
          dominant_pct: raw.dominant_pct || 0,
          dominant_count: raw.dominant_count || 0,
          aura_color: raw.aura_color || '#00E5FF',
          title: raw.title || 'Rookie',
          title_tier: raw.title_tier || 'rookie',
          total_challenges_30d: raw.total_challenges_30d || 0,
          total_challenges_all: raw.total_challenges_all || 0,
          total_flux_all: raw.total_flux_all || 0,
          radar: Array.isArray(raw.radar) ? raw.radar : [],
        });
      }
    } catch (e) {
      console.log('[KORE] Fetch error:', e);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const username = (user?.username || 'KORE').toUpperCase();
  const sport = user?.preferred_sport || 'Fitness';
  const level = user?.training_level || 'Intermedio';
  const flux = user?.ak_credits || 0;
  const totalScans = user?.total_scans || 0;
  const userLevel = user?.level || 1;
  const dna = user?.dna || {};
  const dnaKeys = Object.keys(dna);

  const titleColor = siloProfile?.title_tier === 'master' ? '#FFD700'
    : siloProfile?.title_tier === 'contender' ? '#007AFF' : '#8E8E93';
  const auraColor = siloProfile?.aura_color || '#00E5FF';

  return (
    <View style={s.root}>
      <Header title="KORE" />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E5FF" />
        }
      >
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#00E5FF" />
          </View>
        ) : (
          <>
            {/* ═══ ATHLETE IDENTITY ═══ */}
            <Animated.View entering={FadeIn.duration(400)} style={s.identity}>
              <View style={[s.avatarRing, { borderColor: auraColor }]}>
                <Text style={s.avatarLetter}>{username.charAt(0)}</Text>
              </View>
              <Text style={s.username}>{username}</Text>
              <Text style={s.subtitle}>{sport.toUpperCase()} · {level.toUpperCase()}</Text>
              {/* DYNAMIC TITLE */}
              {siloProfile && siloProfile.title !== 'Rookie' && (
                <View style={[s.titleBadge, { borderColor: titleColor }]}>
                  <Ionicons name={siloProfile.title_tier === 'master' ? 'star' : 'shield-half'} size={12} color={titleColor} />
                  <Text style={[s.titleBadgeText, { color: titleColor }]}>{siloProfile.title.toUpperCase()}</Text>
                </View>
              )}
              <View style={s.badgeRow}>
                {user?.is_nexus_certified && (
                  <View style={s.badge}><Text style={s.badgeText}>NÈXUS</Text></View>
                )}
                {user?.is_founder && (
                  <View style={[s.badge, { borderColor: '#FFD700' }]}><Text style={[s.badgeText, { color: '#FFD700' }]}>FOUNDER</Text></View>
                )}
              </View>
            </Animated.View>

            {/* ═══ STATS ROW ═══ */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.statsRow}>
              <View style={s.statBox}>
                <Text style={s.statNum}>{totalScans}</Text>
                <Text style={s.statLabel}>SCANS</Text>
              </View>
              <View style={[s.statDivider]} />
              <View style={s.statBox}>
                <Text style={[s.statNum, { color: '#00E5FF' }]}>{flux}</Text>
                <Text style={s.statLabel}>FLUX</Text>
              </View>
              <View style={[s.statDivider]} />
              <View style={s.statBox}>
                <Text style={[s.statNum, { color: '#00FF87' }]}>LVL {userLevel}</Text>
                <Text style={s.statLabel}>LIVELLO</Text>
              </View>
              {siloProfile && siloProfile.total_challenges_30d > 0 && (
                <>
                  <View style={[s.statDivider]} />
                  <View style={s.statBox}>
                    <Text style={[s.statNum, { color: auraColor }]}>{siloProfile.total_challenges_30d}</Text>
                    <Text style={s.statLabel}>30 GIORNI</Text>
                  </View>
                </>
              )}
            </Animated.View>

            {/* ═══ ACTION BUTTONS ═══ */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={s.btnRow}>
              <TouchableOpacity style={s.cyanBtn} onPress={() => router.push('/(tabs)/nexus-trigger')} activeOpacity={0.8}>
                <Ionicons name="flash" size={16} color="#000" />
                <Text style={s.cyanBtnText}>NUOVA SFIDA</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.outlineBtn} onPress={() => setKoreIdVisible(true)} activeOpacity={0.8}>
                <Ionicons name="finger-print" size={16} color="#00E5FF" />
                <Text style={s.outlineBtnText}>KORE ID</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* ═══ DNA RADAR ═══ */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)} style={s.section}>
              <Text style={s.sectionTitle}>DNA RADAR</Text>
              {dnaKeys.length === 0 ? (
                <View style={s.emptyInner}>
                  <Ionicons name="analytics-outline" size={28} color="rgba(255,255,255,0.1)" />
                  <Text style={s.emptyText}>Completa una scansione per visualizzare il DNA</Text>
                </View>
              ) : (
                <DnaRadarInline dna={dna} keys={dnaKeys} />
              )}
            </Animated.View>

            {/* ═══ SILO RADAR ═══ */}
            <Animated.View entering={FadeInDown.delay(400).duration(400)} style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>SILO RADAR</Text>
                {siloProfile && siloProfile.dominant_silo !== 'Fitness' && (
                  <View style={[s.domBadge, { backgroundColor: auraColor + '18', borderColor: auraColor + '40' }]}>
                    <Text style={[s.domText, { color: auraColor }]}>{siloProfile.dominant_silo.toUpperCase()}</Text>
                    <Text style={[s.domPct, { color: auraColor }]}>{siloProfile.dominant_pct}%</Text>
                  </View>
                )}
              </View>
              {SiloRadarComponent ? (
                <SiloRadarComponent
                  data={siloProfile?.radar || []}
                  size={Math.min(SW - 64, 240)}
                  auraColor={auraColor}
                />
              ) : (
                <View style={s.emptyInner}>
                  <Text style={s.emptyText}>Silo Radar non disponibile</Text>
                </View>
              )}
            </Animated.View>

            {/* ═══ KORE ATLAS WIDGET ═══ */}
            <Animated.View entering={FadeInDown.delay(500).duration(400)}>
              <TouchableOpacity
                style={s.atlasCard}
                onPress={() => router.push('/kore-atlas')}
                activeOpacity={0.8}
              >
                <View style={s.atlasIcon}>
                  <Ionicons name="globe-outline" size={28} color="#00E5FF" />
                </View>
                <View style={s.atlasTextGroup}>
                  <Text style={s.atlasTitle}>KORE ATLAS</Text>
                  <Text style={s.atlasSub}>La mappa delle tue performance</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </Animated.View>

            {/* ═══ QUICK NAV ═══ */}
            <Animated.View entering={FadeInUp.delay(600).duration(400)} style={s.quickNav}>
              <TouchableOpacity style={s.navItem} onPress={() => router.push('/(tabs)/dna')} activeOpacity={0.8}>
                <Ionicons name="analytics" size={20} color="#00E5FF" />
                <Text style={s.navText}>DNA PROFILE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.navItem} onPress={() => router.push('/(tabs)/hall')} activeOpacity={0.8}>
                <Ionicons name="trophy" size={20} color="#FFD700" />
                <Text style={s.navText}>CLASSIFICHE</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </ScrollView>

      {/* ═══ MODALS ═══ */}
      {KoreIDModal && (
        <KoreIDModal visible={koreIdVisible} onClose={() => setKoreIdVisible(false)} />
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// DNA RADAR — Inline SVG (no external component dependency)
// ═══════════════════════════════════════════════════════════
function DnaRadarInline({ dna, keys }: { dna: Record<string, number>; keys: string[] }) {
  const radarSize = 200;
  const center = radarSize / 2;
  const maxR = radarSize / 2 - 28;
  const n = Math.max(keys.length, 3);
  const step = (Math.PI * 2) / n;

  const pt = (i: number, v: number) => {
    const a = step * i - Math.PI / 2;
    const r = (Math.min(v, 100) / 100) * maxR;
    return { x: center + r * Math.cos(a), y: center + r * Math.sin(a) };
  };

  const points = keys.map((k, i) => pt(i, dna[k] || 0));
  const poly = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={radarSize} height={radarSize}>
        {[25, 50, 75, 100].map(r => (
          <Circle key={r} cx={center} cy={center} r={(r / 100) * maxR}
            fill="none" stroke="rgba(0,229,255,0.06)" strokeWidth={1} />
        ))}
        {keys.map((_, i) => {
          const ep = pt(i, 100);
          return <Line key={i} x1={center} y1={center} x2={ep.x} y2={ep.y}
            stroke="rgba(255,255,255,0.06)" strokeWidth={1} />;
        })}
        <Polygon points={poly} fill="rgba(0,229,255,0.12)" stroke="#00E5FF" strokeWidth={1.5} />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill="#00E5FF" stroke="#000" strokeWidth={1.5} />
        ))}
        {keys.map((k, i) => {
          const lp = pt(i, 120);
          return (
            <SvgText key={k} x={lp.x} y={lp.y} fill="rgba(255,255,255,0.5)"
              fontSize={8} fontWeight="700" textAnchor="middle">
              {k.toUpperCase().slice(0, 4)}
            </SvgText>
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
        {keys.map(k => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: '#00E5FF', fontSize: 12, fontWeight: '800', fontFamily: FONT_J }}>{dna[k]}</Text>
            <Text style={{ color: '#555', fontSize: 10, fontWeight: '600', fontFamily: FONT_M }}>{k.toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingHorizontal: 16 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },

  // Identity
  identity: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  avatarRing: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 8,
  },
  avatarLetter: { color: '#FFF', fontSize: 28, fontWeight: '900', fontFamily: FONT_J },
  username: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
  subtitle: { color: '#888', fontSize: 12, fontWeight: '600', letterSpacing: 1, fontFamily: FONT_M },
  titleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, marginTop: 6,
  },
  titleBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1, fontFamily: FONT_M },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#00E5FF' },
  badgeText: { color: '#00E5FF', fontSize: 10, fontWeight: '800', letterSpacing: 1, fontFamily: FONT_M },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: '#111', borderRadius: 16, padding: 18, marginTop: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statBox: { alignItems: 'center', gap: 4, flex: 1 },
  statNum: { color: '#FFF', fontSize: 20, fontWeight: '900', fontFamily: FONT_J },
  statLabel: { color: '#555', fontSize: 9, fontWeight: '700', letterSpacing: 2, fontFamily: FONT_M },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cyanBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#00E5FF', borderRadius: 12, paddingVertical: 14,
  },
  cyanBtnText: { color: '#000', fontSize: 12, fontWeight: '800', letterSpacing: 1, fontFamily: FONT_M },
  outlineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: '#00E5FF',
  },
  outlineBtnText: { color: '#00E5FF', fontSize: 12, fontWeight: '800', letterSpacing: 1, fontFamily: FONT_M },

  // Sections
  section: {
    marginTop: 20, backgroundColor: '#111', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: '#00E5FF', fontSize: 13, fontWeight: '800', letterSpacing: 2, fontFamily: FONT_M },
  domBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
  },
  domText: { fontSize: 9, fontWeight: '800', letterSpacing: 1, fontFamily: FONT_M },
  domPct: { fontSize: 9, fontWeight: '800', fontFamily: FONT_J },

  emptyInner: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyText: { color: 'rgba(255,255,255,0.15)', fontSize: 12, fontWeight: '600', fontFamily: FONT_M, textAlign: 'center' },

  // KORE ATLAS
  atlasCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginTop: 16, backgroundColor: 'rgba(0,229,255,0.04)',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.12)',
  },
  atlasIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(0,229,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  atlasTextGroup: { flex: 1 },
  atlasTitle: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_M },
  atlasSub: { color: 'rgba(255,255,255,0.30)', fontSize: 11, fontWeight: '500', marginTop: 1, fontFamily: FONT_M },

  // Quick Nav
  quickNav: { flexDirection: 'row', gap: 10, marginTop: 20 },
  navItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#111', borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  navText: { color: '#FFF', fontSize: 11, fontWeight: '700', letterSpacing: 1, fontFamily: FONT_M },
});
