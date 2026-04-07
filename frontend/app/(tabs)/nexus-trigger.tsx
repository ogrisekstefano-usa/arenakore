/**
 * ARENAKORE — NEXUS TRIGGER v5.0 "DEAD CONSOLE"
 * ═══════════════════════════════════════════════
 * ZERO Camera · ZERO Audio · ZERO Animated · ZERO SVG
 * ZERO expo-location · ZERO expo-haptics · ZERO Reanimated
 * 
 * Pure React Native Views. Gray placeholders for hardware features.
 * If this boots on iOS, we reanimate one piece at a time.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Platform, ImageBackground, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import Constants from 'expo-constants';

const API = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL
  || process.env.EXPO_PUBLIC_BACKEND_URL
  || '';

const FM = Platform.select({ web: "'Montserrat', sans-serif", default: undefined });
const FJ = Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined });

type Phase = 'console' | 'bioscan' | 'forge' | 'scanning_placeholder';

export default function NexusTriggerScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('console');
  const [eligibility, setEligibility] = useState<any>(null);
  const [myRank, setMyRank] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ═══ Lightweight data fetch — NO heavy modules ═══
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [eligRes, rankRes] = await Promise.all([
          fetch(`${API}/api/bioscan/eligibility`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
          fetch(`${API}/api/leaderboard/my-rank`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        ]);
        if (eligRes?.ok) setEligibility(await eligRes.json());
        if (rankRes?.ok) setMyRank(await rankRes.json());
      } catch (_) {}
    })();
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Re-fetch lightweight data
    try {
      const res = await fetch(`${API}/api/bioscan/eligibility`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setEligibility(await res.json());
    } catch (_) {}
    setRefreshing(false);
  }, [token]);

  const username = (user?.username || 'ATHLETE').toUpperCase();
  const sport = user?.preferred_sport || 'Fitness';

  // ═══ BIOSCAN PHASE — Gray placeholder (no camera) ═══
  if (phase === 'bioscan') {
    return (
      <View style={s.phaseRoot}>
        <StatusBar barStyle="light-content" />
        <View style={s.grayBox}>
          <Ionicons name="scan-outline" size={48} color="#00E5FF" />
          <Text style={s.phaseTitle}>BIO-SCAN</Text>
          <Text style={s.phaseSub}>Camera disattivata per test stabilità</Text>
          <Text style={s.phaseInfo}>{username} · {sport.toUpperCase()}</Text>
          <View style={s.phaseTag}>
            <Text style={s.phaseTagText}>HARDWARE SILENCED</Text>
          </View>
        </View>
        <TouchableOpacity style={s.backBtn} onPress={() => setPhase('console')} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color="#00E5FF" />
          <Text style={s.backBtnText}>TORNA AL NEXUS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ═══ FORGE PHASE — Gray placeholder ═══
  if (phase === 'forge') {
    return (
      <View style={s.phaseRoot}>
        <StatusBar barStyle="light-content" />
        <View style={s.grayBox}>
          <Ionicons name="construct-outline" size={48} color="#FFD700" />
          <Text style={s.phaseTitle}>THE FORGE</Text>
          <Text style={s.phaseSub}>Protocolli di sfida</Text>
          <View style={s.forgeOptions}>
            <TouchableOpacity style={s.forgeCard} onPress={() => setPhase('scanning_placeholder')} activeOpacity={0.8}>
              <Ionicons name="person" size={20} color="#00E5FF" />
              <Text style={s.forgeLabel}>PERSONAL</Text>
              <Text style={s.forgeSub}>Focus DNA</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.forgeCard} onPress={() => setPhase('scanning_placeholder')} activeOpacity={0.8}>
              <Ionicons name="trophy" size={20} color="#FFD700" />
              <Text style={s.forgeLabel}>POINTS</Text>
              <Text style={s.forgeSub}>Hall of Kore</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.forgeCard} onPress={() => setPhase('scanning_placeholder')} activeOpacity={0.8}>
              <Ionicons name="flash" size={20} color="#FF3B30" />
              <Text style={s.forgeLabel}>LIVE DUEL</Text>
              <Text style={s.forgeSub}>Tempo reale</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={s.backBtn} onPress={() => setPhase('console')} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color="#00E5FF" />
          <Text style={s.backBtnText}>TORNA AL NEXUS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ═══ SCANNING PLACEHOLDER — Camera replaced with gray ═══
  if (phase === 'scanning_placeholder') {
    return (
      <View style={s.phaseRoot}>
        <StatusBar barStyle="light-content" />
        <View style={[s.grayBox, { backgroundColor: '#1A1A1A' }]}>
          <View style={s.cameraPlaceholder}>
            <Ionicons name="videocam-off-outline" size={56} color="#333" />
            <Text style={s.cameraText}>CAMERA SILENCED</Text>
            <Text style={s.cameraInfo}>Zona grigia = Camera disattivata</Text>
          </View>
          <View style={s.scanHUD}>
            <Text style={s.hudLabel}>REPS</Text>
            <Text style={s.hudValue}>0</Text>
            <Text style={s.hudLabel}>QUALITÀ</Text>
            <Text style={s.hudValue}>--</Text>
          </View>
        </View>
        <TouchableOpacity style={s.backBtn} onPress={() => setPhase('console')} activeOpacity={0.8}>
          <Ionicons name="close" size={18} color="#FF3B30" />
          <Text style={[s.backBtnText, { color: '#FF3B30' }]}>ESCI</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ═══ CONSOLE PHASE — Main Dashboard (Pure Views) ═══
  return (
    <View style={s.root}>
      <Header title="NÈXUS" />
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E5FF" />}
      >
        {/* ═══ ELIGIBILITY BANNER ═══ */}
        {eligibility && (
          <View style={[s.eligBanner, eligibility.can_scan ? s.eligActive : s.eligLocked]}>
            <Ionicons
              name={eligibility.can_scan ? 'scan' : 'lock-closed'}
              size={12}
              color={eligibility.can_scan ? '#00E5FF' : '#444'}
            />
            <Text style={[s.eligText, { color: eligibility.can_scan ? '#00E5FF' : '#444' }]}>
              {eligibility.message || 'Caricamento...'}
            </Text>
          </View>
        )}

        {/* ═══ 4 DEFINITIVE CARDS (2x2) — Static Views ═══ */}
        <View style={s.cardsRow}>
          <NexusCard icon="flame" label="SFIDA" sub="Mettiti alla prova" color="#FF3B30" onPress={() => setPhase('forge')} />
          <NexusCard icon="radio" label="LIVE" sub="Entra in Arena" color="#FFD700" onPress={() => setPhase('scanning_placeholder')} />
        </View>
        <View style={s.cardsRow}>
          <NexusCard icon="school" label="COACH" sub="Trova la tua Guida" color="#00FF87" onPress={() => router.push('/(tabs)/arena')} />
          <NexusCard icon="qr-code" label="SCAN & SYNC" sub="Connettiti al Mondo" color="#00E5FF" onPress={() => setPhase('bioscan')} />
        </View>

        {/* ═══ QUICK ACTION BAR ═══ */}
        <View style={s.quickBar}>
          <QuickBtn icon="scan" label="BIOSCAN" color="#007AFF" onPress={() => setPhase('bioscan')} />
          <QuickBtn icon="construct" label="THE FORGE" color="#FFD700" onPress={() => setPhase('forge')} />
          <QuickBtn icon="flash" label="DUELLO" color="#FF3B30" onPress={() => setPhase('scanning_placeholder')} />
          <QuickBtn icon="diamond" label="FLUX" color="#FFD700" onPress={() => {}} />
        </View>

        {/* ═══ PROACTIVE CTAs ═══ */}
        <View style={s.ctaSection}>
          <Text style={s.ctaTitle}>AZIONI PROATTIVE</Text>
          {myRank && (
            <View style={s.ctaCard}>
              <Ionicons name="trending-up" size={16} color="#00E5FF" />
              <Text style={s.ctaText}>Sei #{myRank.rank || '?'} in classifica globale</Text>
            </View>
          )}
          <TouchableOpacity style={s.ctaCard} onPress={() => router.push('/(tabs)/arena')} activeOpacity={0.8}>
            <Ionicons name="people" size={16} color="#FFD700" />
            <Text style={s.ctaText}>Sfida un Crew avversario nell'Arena</Text>
            <Ionicons name="chevron-forward" size={14} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={s.ctaCard} onPress={() => setPhase('forge')} activeOpacity={0.8}>
            <Ionicons name="fitness" size={16} color="#00FF87" />
            <Text style={s.ctaText}>Allena il tuo punto debole</Text>
            <Ionicons name="chevron-forward" size={14} color="#333" />
          </TouchableOpacity>
        </View>

        {/* ═══ HARDWARE STATUS ═══ */}
        <View style={s.hwStatus}>
          <Text style={s.hwTitle}>STATO HARDWARE</Text>
          <HWRow label="Camera" status="SILENCED" color="#FF3B30" />
          <HWRow label="Audio" status="SILENCED" color="#FF3B30" />
          <HWRow label="Haptics" status="SILENCED" color="#FF3B30" />
          <HWRow label="GPS" status="REMOVED" color="#555" />
          <HWRow label="Reanimated" status="DISABLED" color="#FF3B30" />
          <HWRow label="SVG" status="DISABLED" color="#FF3B30" />
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS — Pure View, Zero animation
// ═══════════════════════════════════════════════════════════

function NexusCard({ icon, label, sub, color, onPress }: {
  icon: string; label: string; sub: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.cardIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={s.cardLabel}>{label}</Text>
      <Text style={s.cardSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

function QuickBtn({ icon, label, color, onPress }: {
  icon: string; label: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.quickBtn} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.quickIcon, { backgroundColor: color + '12' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <Text style={s.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function HWRow({ label, status, color }: { label: string; status: string; color: string }) {
  return (
    <View style={s.hwRow}>
      <Text style={s.hwLabel}>{label}</Text>
      <Text style={[s.hwVal, { color }]}>{status}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  // Phase screens
  phaseRoot: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 24 },
  grayBox: {
    backgroundColor: '#111', borderRadius: 20, padding: 32, alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', width: '100%',
  },
  phaseTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 3, fontFamily: FJ },
  phaseSub: { color: '#555', fontSize: 12, fontWeight: '600', fontFamily: FM },
  phaseInfo: { color: '#333', fontSize: 11, fontWeight: '700', letterSpacing: 1, fontFamily: FM },
  phaseTag: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8,
    backgroundColor: 'rgba(255,59,48,0.08)', borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)', marginTop: 8,
  },
  phaseTagText: { color: '#FF3B30', fontSize: 9, fontWeight: '800', letterSpacing: 2, fontFamily: FM },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 24, paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)',
  },
  backBtnText: { color: '#00E5FF', fontSize: 12, fontWeight: '800', letterSpacing: 1, fontFamily: FM },

  // Forge
  forgeOptions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  forgeCard: {
    flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  forgeLabel: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 1, fontFamily: FM },
  forgeSub: { color: '#555', fontSize: 9, fontWeight: '600', fontFamily: FM },

  // Camera placeholder
  cameraPlaceholder: {
    width: '100%', height: 280, backgroundColor: '#0A0A0A', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)',
  },
  cameraText: { color: '#333', fontSize: 14, fontWeight: '900', letterSpacing: 2, fontFamily: FM },
  cameraInfo: { color: '#222', fontSize: 10, fontWeight: '600', fontFamily: FM },
  scanHUD: {
    flexDirection: 'row', gap: 24, marginTop: 16, alignItems: 'center',
  },
  hudLabel: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 2, fontFamily: FM },
  hudValue: { color: '#FFF', fontSize: 28, fontWeight: '900', fontFamily: FJ },

  // Eligibility
  eligBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 8,
    borderWidth: 1,
  },
  eligActive: { borderColor: 'rgba(0,229,255,0.2)', backgroundColor: 'rgba(0,229,255,0.04)' },
  eligLocked: { borderColor: 'rgba(255,255,255,0.04)', backgroundColor: 'rgba(255,255,255,0.02)' },
  eligText: { fontSize: 11, fontWeight: '600', fontFamily: FM, flex: 1 },

  // Cards
  cardsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  card: {
    flex: 1, backgroundColor: '#111', borderRadius: 16, padding: 16,
    gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    minHeight: 120,
  },
  cardIcon: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1, fontFamily: FJ },
  cardSub: { color: '#555', fontSize: 10, fontWeight: '600', fontFamily: FM },

  // Quick bar
  quickBar: {
    flexDirection: 'row', justifyContent: 'space-around', marginTop: 20,
    backgroundColor: '#111', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  quickBtn: { alignItems: 'center', gap: 6 },
  quickIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: { color: '#888', fontSize: 9, fontWeight: '700', letterSpacing: 1, fontFamily: FM },

  // CTAs
  ctaSection: { marginTop: 20 },
  ctaTitle: { color: '#00E5FF', fontSize: 12, fontWeight: '800', letterSpacing: 2, fontFamily: FM, marginBottom: 10 },
  ctaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  ctaText: { color: '#888', fontSize: 11, fontWeight: '600', fontFamily: FM, flex: 1 },

  // HW Status
  hwStatus: {
    marginTop: 20, backgroundColor: '#0D0D0D', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.08)',
  },
  hwTitle: { color: '#FF3B30', fontSize: 11, fontWeight: '800', letterSpacing: 2, fontFamily: FM, marginBottom: 10 },
  hwRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  hwLabel: { color: '#555', fontSize: 11, fontWeight: '600', fontFamily: FM },
  hwVal: { fontSize: 11, fontWeight: '800', letterSpacing: 1, fontFamily: FM },
});
