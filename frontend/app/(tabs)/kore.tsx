/**
 * ARENAKORE — KORE TAB v14.1 "SAFETY MODE"
 * ══════════════════════════════════════════
 * ZERO SVG · ZERO Reanimated · ZERO Maps
 * DNA & Silo = HORIZONTAL BARS (Pure CSS View).
 * All biometric data loaded on-demand via CARICA button.
 */
import React, { useState, useCallback, useEffect } from 'react';
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

const FM = Platform.select({ web: "'Montserrat', sans-serif", default: undefined });
const FJ = Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined });

const DNA_COLORS: Record<string, string> = {
  velocita: '#00E5FF', forza: '#FFFFFF', resistenza: '#FF3B30',
  tecnica: '#00FF87', mentalita: '#FFD700', flessibilita: '#AF52DE',
};

const SILO_COLORS: Record<string, string> = {
  Fitness: '#00E5FF', Golf: '#00FF87', Basket: '#FF9500',
  Calcio: '#34C759', MMA: '#FF3B30', Tennis: '#AF52DE', Esplora: '#FFD700',
};

export default function KoreScreen() {
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [koreIdVisible, setKoreIdVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [siloProfile, setSiloProfile] = useState<any>(null);
  const [dnaProfile, setDnaProfile] = useState<Record<string, number> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [challenges, setChallenges] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/certified-templates`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const d = await res.json();
          setChallenges(Array.isArray(d) ? d.slice(0, 5) : []);
        }
      } catch (_) {}
    })();
  }, [token]);

  const loadBiometrics = useCallback(async () => {
    if (!token || loading) return;
    setLoading(true);
    try {
      const [meRes, siloRes] = await Promise.all([
        fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/kore/silo-profile`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (meRes.ok) {
        const me = await meRes.json();
        if (me?.dna && typeof me.dna === 'object' && Object.keys(me.dna).length > 0) {
          setDnaProfile(me.dna);
        }
      }
      if (siloRes.ok) {
        const raw = await siloRes.json();
        setSiloProfile({
          dominant_silo: raw.dominant_silo || 'Fitness',
          dominant_pct: raw.dominant_pct || 0,
          aura_color: raw.aura_color || '#00E5FF',
          title: raw.title || 'Rookie',
          title_tier: raw.title_tier || 'rookie',
          radar: Array.isArray(raw.radar) ? raw.radar : [],
        });
      }
      setLoaded(true);
    } catch (e) { console.log('[KORE]', e); }
    setLoading(false);
  }, [token, loading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (loaded) { setLoaded(false); await loadBiometrics(); }
    setRefreshing(false);
  }, [loaded, loadBiometrics]);

  const un = (user?.username || 'KORE').toUpperCase();
  const sp = user?.preferred_sport || 'Fitness';
  const lv = user?.training_level || 'Intermedio';
  const fl = user?.ak_credits || 0;
  const sc = user?.total_scans || 0;
  const ul = user?.level || 1;
  const ac = siloProfile?.aura_color || '#00E5FF';

  return (
    <View style={s.root}>
      <Header title="KORE" />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E5FF" />}
      >
        {/* ── IDENTITY ── */}
        <View style={s.identity}>
          <View style={[s.avatarRing, { borderColor: ac }]}>
            <Text style={s.avatarL}>{un.charAt(0)}</Text>
          </View>
          <Text style={s.un}>{un}</Text>
          <Text style={s.sub}>{sp.toUpperCase()} · {lv.toUpperCase()}</Text>
          <View style={s.badgeRow}>
            {user?.is_nexus_certified && <View style={s.badge}><Text style={s.badgeTxt}>NÈXUS</Text></View>}
            {user?.is_founder && <View style={[s.badge, { borderColor: '#FFD700' }]}><Text style={[s.badgeTxt, { color: '#FFD700' }]}>FOUNDER</Text></View>}
          </View>
        </View>

        {/* ── STATS ── */}
        <View style={s.statsRow}>
          <SC v={String(sc)} l="SCANS" c="#FFF" />
          <View style={s.div} />
          <SC v={String(fl)} l="FLUX" c="#00E5FF" />
          <View style={s.div} />
          <SC v={`LVL ${ul}`} l="LIVELLO" c="#00FF87" />
        </View>

        {/* ── ACTIONS ── */}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.cyanBtn} onPress={() => router.push('/(tabs)/nexus-trigger')} activeOpacity={0.8}>
            <Ionicons name="flash" size={16} color="#000" />
            <Text style={s.cyanBtnTxt}>NUOVA SFIDA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.outBtn} onPress={() => setKoreIdVisible(true)} activeOpacity={0.8}>
            <Ionicons name="finger-print" size={16} color="#00E5FF" />
            <Text style={s.outBtnTxt}>KORE ID</Text>
          </TouchableOpacity>
        </View>

        {/* ── BIOMETRIC DATA ── */}
        {!loaded ? (
          <TouchableOpacity style={s.loadCard} onPress={loadBiometrics} activeOpacity={0.8} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#00E5FF" />
            ) : (
              <View style={s.loadInner}>
                <Ionicons name="pulse" size={28} color="#00E5FF" />
                <Text style={s.loadTitle}>CARICA ANALISI BIOMETRICA</Text>
                <Text style={s.loadSub}>DNA Radar · Silo Profile · Performance</Text>
                <View style={s.loadBtn}>
                  <Ionicons name="download-outline" size={14} color="#000" />
                  <Text style={s.loadBtnTxt}>CARICA</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View>
            {/* DNA BARS */}
            <View style={s.section}>
              <Text style={s.secTitle}>DNA RADAR</Text>
              {dnaProfile ? (
                <View style={s.bars}>
                  {Object.keys(dnaProfile).map((k) => (
                    <BarRow key={k} label={k.toUpperCase().slice(0, 4)} val={dnaProfile[k]} color={DNA_COLORS[k] || '#00E5FF'} />
                  ))}
                </View>
              ) : (
                <View style={s.emptyI}><Text style={s.emptyT}>Nessun dato DNA disponibile</Text></View>
              )}
            </View>

            {/* SILO BARS */}
            <View style={s.section}>
              <View style={s.secHead}>
                <Text style={s.secTitle}>SILO RADAR</Text>
                {siloProfile?.dominant_silo && (
                  <View style={[s.domBadge, { borderColor: ac + '60' }]}>
                    <Text style={[s.domTxt, { color: ac }]}>{siloProfile.dominant_silo.toUpperCase()} {siloProfile.dominant_pct}%</Text>
                  </View>
                )}
              </View>
              {siloProfile?.radar && siloProfile.radar.length > 0 ? (
                <View style={s.bars}>
                  {siloProfile.radar.map((it: any, i: number) => (
                    <BarRow key={it.silo || i} label={(it.silo || '').toUpperCase().slice(0, 5)} val={it.competency || it.avg_quality || 0} color={SILO_COLORS[it.silo] || it.color || '#00E5FF'} />
                  ))}
                </View>
              ) : (
                <View style={s.emptyI}><Text style={s.emptyT}>Completa sfide per sbloccare il Silo</Text></View>
              )}
            </View>
          </View>
        )}

        {/* ── PROSSIME SFIDE ── */}
        <View style={s.chPanel}>
          <View style={s.chHead}>
            <Ionicons name="flame" size={16} color="#FFD700" />
            <Text style={s.chTitle}>PROSSIME SFIDE</Text>
          </View>
          {challenges.length === 0 ? (
            <View style={s.emptyI}><Text style={s.emptyT}>Nessuna sfida disponibile</Text></View>
          ) : (
            challenges.map((ch: any, i: number) => (
              <TouchableOpacity key={ch._id || i} style={s.chItem} onPress={() => router.push('/(tabs)/nexus-trigger')} activeOpacity={0.8}>
                <Ionicons name={ch.difficulty === 'hard' ? 'flash' : 'fitness'} size={16}
                  color={ch.difficulty === 'hard' ? '#FF3B30' : ch.difficulty === 'medium' ? '#FFD700' : '#00E5FF'} />
                <View style={s.chTxtG}>
                  <Text style={s.chName} numberOfLines={1}>{(ch.exercise || 'Challenge').toUpperCase()}</Text>
                  <Text style={s.chMeta}>{ch.target_reps ? `${ch.target_reps} reps` : ''}{ch.difficulty ? ` · ${ch.difficulty.toUpperCase()}` : ''}</Text>
                </View>
                <View style={s.chFlux}>
                  <Text style={s.chFluxTxt}>+{ch.required_drops || 5}</Text>
                  <Ionicons name="water" size={10} color="#00E5FF" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── QUICK NAV ── */}
        <View style={s.qNav}>
          <TouchableOpacity style={s.navI} onPress={() => router.push('/(tabs)/dna')} activeOpacity={0.8}>
            <Ionicons name="analytics" size={20} color="#00E5FF" />
            <Text style={s.navT}>DNA PROFILE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.navI} onPress={() => router.push('/(tabs)/hall')} activeOpacity={0.8}>
            <Ionicons name="trophy" size={20} color="#FFD700" />
            <Text style={s.navT}>CLASSIFICHE</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {koreIdVisible && <LazyKoreId visible={true} onClose={() => setKoreIdVisible(false)} />}
    </View>
  );
}

// ═══ Sub-components ═══
function SC({ v, l, c }: { v: string; l: string; c: string }) {
  return <View style={s.statBox}><Text style={[s.statN, { color: c }]}>{v}</Text><Text style={s.statL}>{l}</Text></View>;
}

function BarRow({ label, val, color }: { label: string; val: number; color: string }) {
  const w = Math.min(val, 100);
  return (
    <View style={s.barRow}>
      <Text style={s.barLbl}>{label}</Text>
      <View style={s.barTrack}><View style={[s.barFill, { width: `${w}%`, backgroundColor: color }]} /></View>
      <Text style={[s.barVal, { color }]}>{Math.round(w)}</Text>
    </View>
  );
}

function LazyKoreId({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  try { const { KoreIDModal } = require('../../components/KoreIDModal'); return <KoreIDModal visible={visible} onClose={onClose} />; }
  catch (e) { return null; }
}

// ═══ Styles ═══
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingHorizontal: 16 },
  identity: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  avatarRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 8 },
  avatarL: { color: '#FFF', fontSize: 28, fontWeight: '900', fontFamily: FJ },
  un: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: 2, fontFamily: FJ },
  sub: { color: '#888', fontSize: 12, fontWeight: '600', letterSpacing: 1, fontFamily: FM },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#00E5FF' },
  badgeTxt: { color: '#00E5FF', fontSize: 10, fontWeight: '800', letterSpacing: 1, fontFamily: FM },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#111', borderRadius: 16, padding: 18, marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statBox: { alignItems: 'center', gap: 4, flex: 1 },
  statN: { color: '#FFF', fontSize: 20, fontWeight: '900', fontFamily: FJ },
  statL: { color: '#555', fontSize: 9, fontWeight: '700', letterSpacing: 2, fontFamily: FM },
  div: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cyanBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#00E5FF', borderRadius: 12, paddingVertical: 14 },
  cyanBtnTxt: { color: '#000', fontSize: 12, fontWeight: '800', letterSpacing: 1, fontFamily: FM },
  outBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: '#00E5FF' },
  outBtnTxt: { color: '#00E5FF', fontSize: 12, fontWeight: '800', letterSpacing: 1, fontFamily: FM },
  loadCard: { marginTop: 20, backgroundColor: '#111', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: 'rgba(0,229,255,0.12)', alignItems: 'center' },
  loadInner: { alignItems: 'center', gap: 10 },
  loadTitle: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5, fontFamily: FM, textAlign: 'center' },
  loadSub: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '500', fontFamily: FM },
  loadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#00E5FF', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  loadBtnTxt: { color: '#000', fontSize: 11, fontWeight: '800', letterSpacing: 1, fontFamily: FM },
  section: { marginTop: 20, backgroundColor: '#111', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  secTitle: { color: '#00E5FF', fontSize: 13, fontWeight: '800', letterSpacing: 2, fontFamily: FM, marginBottom: 8 },
  domBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  domTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 1, fontFamily: FM },
  emptyI: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyT: { color: 'rgba(255,255,255,0.15)', fontSize: 12, fontWeight: '600', fontFamily: FM, textAlign: 'center' },
  bars: { gap: 10, paddingVertical: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLbl: { color: '#888', fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: FM, width: 42, textAlign: 'right' },
  barTrack: { flex: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5, minWidth: 4 },
  barVal: { fontSize: 13, fontWeight: '900', fontFamily: FJ, width: 30, textAlign: 'right' },
  chPanel: { marginTop: 20, backgroundColor: '#111', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)' },
  chHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  chTitle: { color: '#FFD700', fontSize: 13, fontWeight: '800', letterSpacing: 2, fontFamily: FM },
  chItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  chTxtG: { flex: 1 },
  chName: { color: '#FFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.5, fontFamily: FM },
  chMeta: { color: '#555', fontSize: 10, fontWeight: '600', marginTop: 2, fontFamily: FM },
  chFlux: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  chFluxTxt: { color: '#00E5FF', fontSize: 12, fontWeight: '800', fontFamily: FJ },
  qNav: { flexDirection: 'row', gap: 10, marginTop: 20 },
  navI: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#111', borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  navT: { color: '#FFF', fontSize: 11, fontWeight: '700', letterSpacing: 1, fontFamily: FM },
});
