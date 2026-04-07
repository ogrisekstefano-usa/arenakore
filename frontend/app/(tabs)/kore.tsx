/**
 * ARENAKORE — KORE TAB v12.0 "LIGHT-FIRST"
 * ══════════════════════════════════════════
 * ZERO SVG / ZERO Reanimated al boot.
 * Radar e grafici caricati SOLO su pressione utente.
 * Risolve crash iOS Expo Go per saturazione memoria.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

const API = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL
  || process.env.EXPO_PUBLIC_BACKEND_URL
  || '';

const FONT_M = Platform.select({ web: "'Montserrat', sans-serif", default: undefined });
const FONT_J = Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined });

// ═══ NO SVG / NO Reanimated import at top level ═══

export default function KoreScreen() {
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ═══ On-Demand Loading States ═══
  const [koreIdVisible, setKoreIdVisible] = useState(false);
  const [biometricsLoaded, setBiometricsLoaded] = useState(false);
  const [biometricsLoading, setBiometricsLoading] = useState(false);
  const [siloProfile, setSiloProfile] = useState<any>(null);
  const [dnaData, setDnaData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ═══ LAZY: Only fetch + render when user presses "CARICA ANALISI" ═══
  const loadBiometrics = useCallback(async () => {
    if (!token || biometricsLoading) return;
    setBiometricsLoading(true);
    try {
      const [dnaRes, siloRes] = await Promise.all([
        fetch(`${API}/api/dna/history`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/kore/silo-profile`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (dnaRes.ok) setDnaData(await dnaRes.json());
      if (siloRes.ok) {
        const raw = await siloRes.json();
        setSiloProfile({
          dominant_silo: raw.dominant_silo || 'Fitness',
          dominant_pct: raw.dominant_pct || 0,
          aura_color: raw.aura_color || '#00E5FF',
          title: raw.title || 'Rookie',
          title_tier: raw.title_tier || 'rookie',
          total_challenges_30d: raw.total_challenges_30d || 0,
          total_challenges_all: raw.total_challenges_all || 0,
          radar: Array.isArray(raw.radar) ? raw.radar : [],
        });
      }
      setBiometricsLoaded(true);
    } catch (e) {
      console.log('[KORE] Fetch error:', e);
    }
    setBiometricsLoading(false);
  }, [token, biometricsLoading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (biometricsLoaded) {
      setBiometricsLoaded(false);
      await loadBiometrics();
    }
    setRefreshing(false);
  }, [biometricsLoaded, loadBiometrics]);

  const openKoreId = useCallback(() => setKoreIdVisible(true), []);
  const closeKoreId = useCallback(() => setKoreIdVisible(false), []);

  const username = (user?.username || 'KORE').toUpperCase();
  const sport = user?.preferred_sport || 'Fitness';
  const level = user?.training_level || 'Intermedio';
  const flux = user?.ak_credits || 0;
  const totalScans = user?.total_scans || 0;
  const userLevel = user?.level || 1;
  const dna = user?.dna || {};
  const dnaKeys = Object.keys(dna);
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
        {/* ═══ ATHLETE IDENTITY — Lightweight Static ═══ */}
        <View style={s.identity}>
          <View style={s.avatarRing}>
            <Text style={s.avatarLetter}>{username.charAt(0)}</Text>
          </View>
          <Text style={s.username}>{username}</Text>
          <Text style={s.subtitle}>{sport.toUpperCase()} · {level.toUpperCase()}</Text>
          <View style={s.badgeRow}>
            {user?.is_nexus_certified && (
              <View style={s.badge}><Text style={s.badgeText}>NÈXUS</Text></View>
            )}
            {user?.is_founder && (
              <View style={[s.badge, { borderColor: '#FFD700' }]}>
                <Text style={[s.badgeText, { color: '#FFD700' }]}>FOUNDER</Text>
              </View>
            )}
          </View>
        </View>

        {/* ═══ STATS ROW — Pure Text, Zero Animation ═══ */}
        <View style={s.statsRow}>
          <StatCell value={String(totalScans)} label="SCANS" color="#FFF" />
          <View style={s.statDivider} />
          <StatCell value={String(flux)} label="FLUX" color="#00E5FF" />
          <View style={s.statDivider} />
          <StatCell value={`LVL ${userLevel}`} label="LIVELLO" color="#00FF87" />
        </View>

        {/* ═══ ACTION BUTTONS ═══ */}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.cyanBtn} onPress={() => router.push('/(tabs)/nexus-trigger')} activeOpacity={0.8}>
            <Ionicons name="flash" size={16} color="#000" />
            <Text style={s.cyanBtnText}>NUOVA SFIDA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.outlineBtn} onPress={openKoreId} activeOpacity={0.8}>
            <Ionicons name="finger-print" size={16} color="#00E5FF" />
            <Text style={s.outlineBtnText}>KORE ID</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ BIOMETRIC RADAR — ON-DEMAND ONLY ═══ */}
        {!biometricsLoaded ? (
          <TouchableOpacity style={s.loadCard} onPress={loadBiometrics} activeOpacity={0.8} disabled={biometricsLoading}>
            {biometricsLoading ? (
              <ActivityIndicator size="small" color="#00E5FF" />
            ) : (
              <>
                <View style={s.loadIconBox}>
                  <Ionicons name="analytics" size={32} color="#00E5FF" />
                </View>
                <Text style={s.loadTitle}>CARICA ANALISI BIOMETRICA</Text>
                <Text style={s.loadSub}>DNA Radar · Silo Radar · Performance</Text>
                <View style={s.loadBtnInner}>
                  <Ionicons name="download-outline" size={14} color="#000" />
                  <Text style={s.loadBtnText}>CARICA</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <>
            {/* ═══ DNA RADAR — Lazy SVG ═══ */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>DNA RADAR</Text>
              {dnaKeys.length === 0 ? (
                <View style={s.emptyInner}>
                  <Text style={s.emptyText}>Completa una scansione per visualizzare il DNA</Text>
                </View>
              ) : (
                <LazyDnaRadar dna={dna} keys={dnaKeys} />
              )}
            </View>

            {/* ═══ SILO RADAR — Lazy SVG ═══ */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>SILO RADAR</Text>
                {siloProfile?.dominant_silo && siloProfile.dominant_silo !== 'Fitness' && (
                  <View style={[s.domBadge, { borderColor: auraColor + '40' }]}>
                    <Text style={[s.domText, { color: auraColor }]}>
                      {siloProfile.dominant_silo.toUpperCase()} {siloProfile.dominant_pct}%
                    </Text>
                  </View>
                )}
              </View>
              <LazySiloRadar data={siloProfile?.radar || []} auraColor={auraColor} />
            </View>
          </>
        )}

        {/* ═══ KORE ATLAS — Static Widget (No WebView) ═══ */}
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
            <Text style={s.atlasSub}>Mappa delle tue performance</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>

        {/* ═══ QUICK NAV ═══ */}
        <View style={s.quickNav}>
          <TouchableOpacity style={s.navItem} onPress={() => router.push('/(tabs)/dna')} activeOpacity={0.8}>
            <Ionicons name="analytics" size={20} color="#00E5FF" />
            <Text style={s.navText}>DNA PROFILE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.navItem} onPress={() => router.push('/(tabs)/hall')} activeOpacity={0.8}>
            <Ionicons name="trophy" size={20} color="#FFD700" />
            <Text style={s.navText}>CLASSIFICHE</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ═══ KORE ID MODAL — Lazy loaded only when opened ═══ */}
      {koreIdVisible && <LazyKoreIdModal visible={true} onClose={closeKoreId} />}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// LAZY WRAPPERS — require() only when rendered
// ═══════════════════════════════════════════════════════════

function StatCell({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={s.statBox}>
      <Text style={[s.statNum, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function LazyKoreIdModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  try {
    const { KoreIDModal } = require('../../components/KoreIDModal');
    return <KoreIDModal visible={visible} onClose={onClose} />;
  } catch (e) {
    return null;
  }
}

function LazyDnaRadar({ dna, keys }: { dna: Record<string, number>; keys: string[] }) {
  try {
    const { default: Svg, Polygon, Line, Circle, Text: SvgText } = require('react-native-svg');
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
          {[25, 50, 75, 100].map((r: number) => (
            <Circle key={r} cx={center} cy={center} r={(r / 100) * maxR}
              fill="none" stroke="rgba(0,229,255,0.06)" strokeWidth={1} />
          ))}
          {keys.map((_: string, i: number) => {
            const ep = pt(i, 100);
            return <Line key={i} x1={center} y1={center} x2={ep.x} y2={ep.y}
              stroke="rgba(255,255,255,0.06)" strokeWidth={1} />;
          })}
          <Polygon points={poly} fill="rgba(0,229,255,0.12)" stroke="#00E5FF" strokeWidth={1.5} />
          {points.map((p: { x: number; y: number }, i: number) => (
            <Circle key={i} cx={p.x} cy={p.y} r={3} fill="#00E5FF" stroke="#000" strokeWidth={1.5} />
          ))}
          {keys.map((k: string, i: number) => {
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
          {keys.map((k: string) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#00E5FF', fontSize: 12, fontWeight: '800', fontFamily: FONT_J }}>{dna[k]}</Text>
              <Text style={{ color: '#555', fontSize: 10, fontWeight: '600', fontFamily: FONT_M }}>{k.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  } catch (e) {
    return <View style={s.emptyInner}><Text style={s.emptyText}>Radar non disponibile</Text></View>;
  }
}

function LazySiloRadar({ data, auraColor }: { data: any[]; auraColor: string }) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <View style={s.emptyInner}><Text style={s.emptyText}>Completa sfide per sbloccare il Silo Radar</Text></View>;
  }
  try {
    const { SiloRadar } = require('../../components/kore/SiloRadar');
    return <SiloRadar data={data} size={200} auraColor={auraColor} />;
  } catch (e) {
    return <View style={s.emptyInner}><Text style={s.emptyText}>Silo Radar non disponibile</Text></View>;
  }
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const FONT_M_S = Platform.select({ web: "'Montserrat', sans-serif", default: undefined });
const FONT_J_S = Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined });

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingHorizontal: 16 },

  // Identity
  identity: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  avatarRing: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2, borderColor: '#00E5FF',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 8,
  },
  avatarLetter: { color: '#FFF', fontSize: 28, fontWeight: '900', fontFamily: FONT_J_S },
  username: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J_S },
  subtitle: { color: '#888', fontSize: 12, fontWeight: '600', letterSpacing: 1, fontFamily: FONT_M_S },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#00E5FF' },
  badgeText: { color: '#00E5FF', fontSize: 10, fontWeight: '800', letterSpacing: 1, fontFamily: FONT_M_S },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: '#111', borderRadius: 16, padding: 18, marginTop: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statBox: { alignItems: 'center', gap: 4, flex: 1 },
  statNum: { color: '#FFF', fontSize: 20, fontWeight: '900', fontFamily: FONT_J_S },
  statLabel: { color: '#555', fontSize: 9, fontWeight: '700', letterSpacing: 2, fontFamily: FONT_M_S },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cyanBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#00E5FF', borderRadius: 12, paddingVertical: 14,
  },
  cyanBtnText: { color: '#000', fontSize: 12, fontWeight: '800', letterSpacing: 1, fontFamily: FONT_M_S },
  outlineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: '#00E5FF',
  },
  outlineBtnText: { color: '#00E5FF', fontSize: 12, fontWeight: '800', letterSpacing: 1, fontFamily: FONT_M_S },

  // Load Card — The "CARICA ANALISI BIOMETRICA" button
  loadCard: {
    marginTop: 20, backgroundColor: '#111', borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)',
    alignItems: 'center', gap: 10,
  },
  loadIconBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,229,255,0.06)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  loadTitle: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_M_S, textAlign: 'center' },
  loadSub: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '500', fontFamily: FONT_M_S },
  loadBtnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#00E5FF', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8,
  },
  loadBtnText: { color: '#000', fontSize: 11, fontWeight: '800', letterSpacing: 1, fontFamily: FONT_M_S },

  // Sections
  section: {
    marginTop: 20, backgroundColor: '#111', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: '#00E5FF', fontSize: 13, fontWeight: '800', letterSpacing: 2, fontFamily: FONT_M_S },
  domBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
  },
  domText: { fontSize: 9, fontWeight: '800', letterSpacing: 1, fontFamily: FONT_M_S },
  emptyInner: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyText: { color: 'rgba(255,255,255,0.15)', fontSize: 12, fontWeight: '600', fontFamily: FONT_M_S, textAlign: 'center' },

  // KORE ATLAS — Static widget
  atlasCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginTop: 20, backgroundColor: 'rgba(0,229,255,0.04)',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.12)',
  },
  atlasIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(0,229,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  atlasTextGroup: { flex: 1 },
  atlasTitle: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_M_S },
  atlasSub: { color: 'rgba(255,255,255,0.30)', fontSize: 11, fontWeight: '500', marginTop: 1, fontFamily: FONT_M_S },

  // Quick Nav
  quickNav: { flexDirection: 'row', gap: 10, marginTop: 20 },
  navItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#111', borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  navText: { color: '#FFF', fontSize: 11, fontWeight: '700', letterSpacing: 1, fontFamily: FONT_M_S },
});
