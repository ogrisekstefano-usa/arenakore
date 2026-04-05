/**
 * ARENAKORE — Performance Detail Modal
 * Full-screen detail view for a WAR LOG performance record.
 * Gallery (3 snapshots swipe), Comparative Bar Chart vs PR, Social Export, Re-Challenge.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity,
  Image, Platform, ActivityIndicator, Share, Dimensions, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { api } from '../../utils/api';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { TalentCardTemplate } from './TalentCardTemplate';
import type { TalentCardData } from './TalentCardTemplate';

const FONT_J = Platform.select({ ios: 'PlusJakartaSans-ExtraBold', android: 'PlusJakartaSans-ExtraBold', default: 'Plus Jakarta Sans' });
const FONT_M = Platform.select({ ios: 'Montserrat-Regular', android: 'Montserrat-Regular', default: 'Montserrat' });
const { width: SCREEN_W } = Dimensions.get('window');

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

interface Props {
  visible: boolean;
  record: any;
  onClose: () => void;
}

export function PerformanceDetailModal({ visible, record, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const router = useRouter();
  const [prData, setPrData] = useState<any>(null);
  const [loadingPr, setLoadingPr] = useState(false);
  const [activeSnap, setActiveSnap] = useState(0);
  const [exporting, setExporting] = useState(false);
  const talentCardRef = useRef<any>(null);
  const [siloProfile, setSiloProfile] = useState<any>(null);

  const cfg = TIPO_CONFIG[record?.tipo] || TIPO_CONFIG['ALLENAMENTO'];
  const kpi = record?.kpi || {};
  const pr = kpi.primary_result || {};
  const discIcon = DISC_ICONS[record?.disciplina] || '🏅';
  const snapshotsArr: { key: string; label: string; uri: string | null }[] = [
    { key: 'start', label: 'START', uri: record?.snapshots?.start || null },
    { key: 'peak', label: 'PEAK', uri: record?.snapshots?.peak || null },
    { key: 'finish', label: 'FINISH', uri: record?.snapshots?.finish || null },
  ];
  const hasSnapshots = snapshotsArr.some(s => s.uri);

  // Fetch PR for comparison
  useEffect(() => {
    if (!visible || !record || !token) return;
    (async () => {
      setLoadingPr(true);
      try {
        const data = await api.getPersonalRecord(token, record.exercise_type || 'squat', record.disciplina || 'Fitness');
        setPrData(data);
      } catch {}
      setLoadingPr(false);
    })();
    // Fetch silo profile for title
    (async () => {
      try { const sp = await api.getSiloProfile(token); setSiloProfile(sp); } catch {}
    })();
  }, [visible, record?.id]);

  // Format primary result
  let primaryDisplay = '—';
  let primaryUnit = '';
  if (pr.type === 'REPS' && pr.value > 0) { primaryDisplay = String(pr.value); primaryUnit = 'REPS'; }
  else if (pr.type === 'TEMPO' && pr.value > 0) {
    const m = Math.floor(pr.value / 60);
    const ss = Math.round(pr.value % 60);
    primaryDisplay = `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    primaryUnit = 'MIN';
  } else if (pr.type === 'PUNTEGGIO' && pr.value > 0) {
    primaryDisplay = String(Math.round(pr.value));
    primaryUnit = 'PTS';
  }

  // PR comparison values
  const myVal = pr.value || 0;
  const prVal = prData?.pr?.primary_result?.value || myVal;
  const myQual = kpi.quality_score || 0;
  const prQual = prData?.best_quality?.quality_score || myQual;
  const avgVal = prData?.avg_stats?.avg_value || myVal;
  const avgQual = prData?.avg_stats?.avg_quality || myQual;

  // Time ago
  const completedAt = record?.completed_at ? new Date(record.completed_at) : null;
  let dateStr = '';
  if (completedAt) {
    dateStr = completedAt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // Handle Social Export
  const handleSocialExport = useCallback(async () => {
    setExporting(true);
    try {
      const shareData = [
        `🏋️ ARENA KORE — PERFORMANCE`,
        `━━━━━━━━━━━━━━━━`,
        `${cfg.label} | ${record?.disciplina || 'Fitness'}`,
        `${primaryDisplay} ${primaryUnit}`,
        `Quality: ${myQual}%`,
        record?.is_certified ? '✅ COACH CERTIFIED' : '',
        `FLUX Earned: +${record?.flux_earned || 0}`,
        `━━━━━━━━━━━━━━━━`,
        `#ArenaKore #Performance`,
      ].filter(Boolean).join('\n');

      await Share.share({
        message: shareData,
        title: 'ARENA KORE Performance'
      });
    } catch {}
    setExporting(false);
  }, [record]);

  // Handle Re-Challenge
  const handleReChallenge = useCallback(() => {
    onClose();
    setTimeout(() => {
      router.push({
        pathname: '/(tabs)/nexus-trigger',
        params: {
          reChallengeExercise: record?.exercise_type || 'squat',
          reChallengeDisciplina: record?.disciplina || 'Fitness',
          reChallengeTemplate: record?.template_name || '',
          reChallengeTipo: record?.tipo || 'ALLENAMENTO'
        }
      });
    }, 300);
  }, [record]);

  // Handle Talent Card Export
  const handleTalentCardExport = useCallback(async () => {
    if (!talentCardRef.current) return;
    setExporting(true);
    try {
      const uri = await captureRef(talentCardRef, { format: 'png', quality: 1 });
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = uri;
        link.download = `ARENAKORE_TALENT_${Date.now()}.png`;
        link.click();
      } else {
        await Share.share({
          url: uri,
          message: 'La mia Talent Card su ARENA KORE! 🏆',
          title: 'ARENA KORE — Talent Card'
        });
      }
    } catch {
      Alert.alert('Errore', 'Impossibile generare la Talent Card');
    }
    setExporting(false);
  }, []);

  if (!record) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={[ds.root, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#0A0A0A', '#050505']} style={StyleSheet.absoluteFillObject} />

        {/* Top Bar */}
        <View style={ds.topBar}>
          <TouchableOpacity onPress={onClose} style={ds.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={[ds.tipoBadge, { backgroundColor: cfg.color + '15', borderColor: cfg.color + '30' }]}>
            <Ionicons name={cfg.icon} size={11} color={cfg.color} />
            <Text style={[ds.tipoBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <View style={ds.discBadgeTop}>
            <Text style={ds.discIconTop}>{discIcon}</Text>
            <Text style={ds.discTextTop}>{record.disciplina || 'Fitness'}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* ═══ SNAPSHOT GALLERY ═══ */}
          {hasSnapshots ? (
            <Animated.View entering={FadeIn.duration(400)} style={ds.gallerySection}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_W - 32));
                  setActiveSnap(idx);
                }}
                contentContainerStyle={{ gap: 0 }}
              >
                {snapshotsArr.filter(s => s.uri).map((snap, i) => (
                  <View key={snap.key} style={ds.snapItem}>
                    <Image source={{ uri: snap.uri! }} style={ds.snapImg} resizeMode="cover" />
                    <LinearGradient
                      colors={['transparent', 'rgba(10,10,10,0.8)']}
                      style={ds.snapGrad}
                    />
                    <View style={ds.snapLabel}>
                      <Text style={ds.snapLabelText}>{snap.label}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              {/* Dots */}
              <View style={ds.dots}>
                {snapshotsArr.filter(s => s.uri).map((_, i) => (
                  <View key={i} style={[ds.dot, activeSnap === i && ds.dotActive]} />
                ))}
              </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(400)} style={ds.noSnapSection}>
              <LinearGradient
                colors={[cfg.color + '10', '#0A0A0A']}
                style={ds.noSnapGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.10)" />
              <Text style={ds.noSnapText}>Nessuno snapshot disponibile</Text>
            </Animated.View>
          )}

          {/* ═══ PRIMARY RESULT ═══ */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={ds.resultCard}>
            <Text style={ds.resultLabel}>RISULTATO</Text>
            <View style={ds.resultRow}>
              <Text style={ds.resultVal}>{primaryDisplay}</Text>
              <Text style={ds.resultUnit}>{primaryUnit}</Text>
            </View>
            {record.is_certified && (
              <View style={ds.certBadge}>
                <Ionicons name="shield-checkmark" size={11} color="#00FF87" />
                <Text style={ds.certText}>COACH CERTIFIED</Text>
              </View>
            )}
            <Text style={ds.dateText}>{dateStr}</Text>
          </Animated.View>

          {/* ═══ KPI GRID ═══ */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={ds.kpiGrid}>
            {kpi.quality_score != null && kpi.quality_score > 0 && (
              <View style={ds.kpiBox}>
                <Text style={ds.kpiBoxVal}>{Math.round(kpi.quality_score)}%</Text>
                <Text style={ds.kpiBoxLabel}>QUALITY</Text>
              </View>
            )}
            {kpi.rom_pct != null && (
              <View style={ds.kpiBox}>
                <Text style={ds.kpiBoxVal}>{Math.round(kpi.rom_pct)}%</Text>
                <Text style={ds.kpiBoxLabel}>ROM</Text>
              </View>
            )}
            {kpi.explosivity_pct != null && (
              <View style={ds.kpiBox}>
                <Text style={ds.kpiBoxVal}>{Math.round(kpi.explosivity_pct)}%</Text>
                <Text style={ds.kpiBoxLabel}>EXPLOSIVITY</Text>
              </View>
            )}
            {kpi.power_output != null && kpi.power_output > 0 && (
              <View style={ds.kpiBox}>
                <Text style={ds.kpiBoxVal}>{Math.round(kpi.power_output)}</Text>
                <Text style={ds.kpiBoxLabel}>POWER</Text>
              </View>
            )}
            {kpi.heart_rate_avg != null && kpi.heart_rate_avg > 0 && (
              <View style={ds.kpiBox}>
                <Text style={[ds.kpiBoxVal, { color: '#FF3B30' }]}>{Math.round(kpi.heart_rate_avg)}</Text>
                <Text style={ds.kpiBoxLabel}>AVG BPM</Text>
              </View>
            )}
            {record.flux_earned > 0 && (
              <View style={ds.kpiBox}>
                <Text style={[ds.kpiBoxVal, { color: '#FFD700' }]}>+{record.flux_earned}</Text>
                <Text style={ds.kpiBoxLabel}>FLUX</Text>
              </View>
            )}
          </Animated.View>

          {/* ═══ COMPARATIVE BAR CHART vs PR ═══ */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={ds.chartSection}>
            <Text style={ds.chartTitle}>VS RECORD PERSONALE</Text>
            {loadingPr ? (
              <ActivityIndicator color="#00E5FF" style={{ paddingVertical: 20 }} />
            ) : (
              <View style={ds.chartGrid}>
                {/* Primary value comparison */}
                <ComparisonBar
                  label={primaryUnit || 'VALORE'}
                  current={myVal}
                  pr={prVal}
                  avg={avgVal}
                  color={cfg.color}
                />
                {/* Quality comparison */}
                <ComparisonBar
                  label="QUALITY"
                  current={myQual}
                  pr={prQual}
                  avg={avgQual}
                  color="#00E5FF"
                />
              </View>
            )}
            {prData?.avg_stats?.total_attempts && (
              <Text style={ds.chartSub}>
                Basato su {prData.avg_stats.total_attempts} tentativi in {record.disciplina}
              </Text>
            )}
          </Animated.View>

          {/* ═══ ACTIONS ═══ */}
          <Animated.View entering={FadeInUp.delay(300).duration(400)} style={ds.actionsSection}>
            <TouchableOpacity
              style={[ds.actionBtn, { backgroundColor: cfg.color }]}
              onPress={handleReChallenge}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={16} color="#000" />
              <Text style={ds.actionBtnText}>SFIDA DI NUOVO</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={ds.talentCardBtn}
              onPress={handleTalentCardExport}
              disabled={exporting}
              activeOpacity={0.85}
            >
              {exporting ? (
                <ActivityIndicator color="#FFD700" size="small" />
              ) : (
                <>
                  <Ionicons name="card" size={15} color="#FFD700" />
                  <Text style={ds.talentCardBtnText}>GENERA TALENT CARD</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[ds.actionBtnOutline, { borderColor: '#00E5FF' }]}
              onPress={handleSocialExport}
              disabled={exporting}
              activeOpacity={0.85}
            >
              {exporting ? (
                <ActivityIndicator color="#00E5FF" size="small" />
              ) : (
                <>
                  <Ionicons name="share-social" size={15} color="#00E5FF" />
                  <Text style={[ds.actionBtnOutlineText, { color: '#00E5FF' }]}>EXPORT PER SOCIAL</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* ═══ HIDDEN TALENT CARD — 9:16 Format for Export ═══ */}
        <View style={ds.offscreen}>
          <ViewShot ref={talentCardRef} options={{ format: 'png', quality: 1 }} style={{ width: 360, height: 640 }}>
            <TalentCardTemplate data={{
              username: user?.username || 'KORE',
              title: siloProfile?.title,
              disciplina: record?.disciplina || 'Fitness',
              peakSnapshot: record?.snapshots?.peak,
              primaryValue: pr.value || 0,
              primaryUnit: primaryUnit || 'REPS',
              qualityScore: myQual,
              romPct: kpi.rom_pct,
              explosivityPct: kpi.explosivity_pct,
              powerOutput: kpi.power_output,
              heartRate: kpi.heart_rate_avg,
              fluxEarned: record?.flux_earned || 0,
              isCertified: record?.is_certified || false,
              isFounder: user?.is_admin,
              founderNumber: user?.founder_number,
              tipo: record?.tipo || 'ALLENAMENTO',
              validationStatus: record?.validation_status
            }} />
          </ViewShot>
        </View>
      </View>
    </Modal>
  );
}

// ── Comparison Bar Sub-component ──
function ComparisonBar({ label, current, pr, avg, color }: {
  label: string; current: number; pr: number; avg: number; color: string;
}) {
  const maxVal = Math.max(current, pr, avg, 1);
  const currentPct = (current / maxVal) * 100;
  const prPct = (pr / maxVal) * 100;
  const avgPct = (avg / maxVal) * 100;
  const isNewPR = current >= pr && current > 0;

  return (
    <View style={bar.container}>
      <View style={bar.labelRow}>
        <Text style={bar.label}>{label}</Text>
        {isNewPR && (
          <View style={bar.prBadge}>
            <Text style={bar.prBadgeText}>NEW PR!</Text>
          </View>
        )}
      </View>
      {/* Current */}
      <View style={bar.barRow}>
        <Text style={[bar.barLabel, { color }]}>TU</Text>
        <View style={bar.barTrack}>
          <View style={[bar.barFill, { width: `${Math.min(currentPct, 100)}%`, backgroundColor: color }]} />
        </View>
        <Text style={[bar.barVal, { color }]}>{Math.round(current)}</Text>
      </View>
      {/* PR */}
      <View style={bar.barRow}>
        <Text style={bar.barLabel}>PR</Text>
        <View style={bar.barTrack}>
          <View style={[bar.barFill, { width: `${Math.min(prPct, 100)}%`, backgroundColor: '#FFD700' }]} />
        </View>
        <Text style={bar.barVal}>{Math.round(pr)}</Text>
      </View>
      {/* Average */}
      <View style={bar.barRow}>
        <Text style={bar.barLabel}>AVG</Text>
        <View style={bar.barTrack}>
          <View style={[bar.barFill, { width: `${Math.min(avgPct, 100)}%`, backgroundColor: 'rgba(255,255,255,0.20)' }]} />
        </View>
        <Text style={bar.barVal}>{Math.round(avg)}</Text>
      </View>
    </View>
  );
}

// ═══ STYLES ═══
const ds = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
  },
  tipoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1
  },
  tipoBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, fontFamily: FONT_J },
  discBadgeTop: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    flex: 1, justifyContent: 'flex-end'
  },
  discIconTop: { fontSize: 16 },
  discTextTop: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', letterSpacing: 1, fontFamily: FONT_M },

  // Gallery
  gallerySection: { marginBottom: 16, paddingHorizontal: 16 },
  snapItem: {
    width: SCREEN_W - 32, height: 220, borderRadius: 16, overflow: 'hidden',
    position: 'relative'
  },
  snapImg: { width: '100%', height: '100%' },
  snapGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  snapLabel: {
    position: 'absolute', bottom: 10, left: 14,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4
  },
  snapLabelText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotActive: { backgroundColor: '#00E5FF', width: 18 },

  // No snapshot fallback
  noSnapSection: {
    height: 140, marginHorizontal: 16, marginBottom: 16, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed',
    position: 'relative'
  },
  noSnapGrad: { ...StyleSheet.absoluteFillObject },
  noSnapText: { color: 'rgba(255,255,255,0.15)', fontSize: 12, fontWeight: '600', marginTop: 8, fontFamily: FONT_M },

  // Primary result
  resultCard: {
    marginHorizontal: 16, marginBottom: 16,
    alignItems: 'center', paddingVertical: 20,
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  resultLabel: { color: 'rgba(255,255,255,0.20)', fontSize: 10, fontWeight: '900', letterSpacing: 3, fontFamily: FONT_M, marginBottom: 4 },
  resultRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  resultVal: { color: '#FFF', fontSize: 56, fontWeight: '900', fontFamily: FONT_J },
  resultUnit: { color: 'rgba(255,255,255,0.30)', fontSize: 16, fontWeight: '900', letterSpacing: 3, fontFamily: FONT_J },
  certBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8,
    backgroundColor: 'rgba(0,255,135,0.10)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(0,255,135,0.20)'
  },
  certText: { color: '#00FF87', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },
  dateText: { color: 'rgba(255,255,255,0.18)', fontSize: 11, fontWeight: '600', fontFamily: FONT_M, marginTop: 8 },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, marginBottom: 16
  },
  kpiBox: {
    flex: 1, minWidth: 90, alignItems: 'center', paddingVertical: 14,
    borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  kpiBoxVal: { color: '#00E5FF', fontSize: 20, fontWeight: '900', fontFamily: FONT_J },
  kpiBoxLabel: { color: 'rgba(255,255,255,0.20)', fontSize: 8, fontWeight: '800', letterSpacing: 2, marginTop: 3 },

  // Comparison Chart
  chartSection: {
    marginHorizontal: 16, marginBottom: 20, paddingVertical: 16, paddingHorizontal: 14,
    borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  chartTitle: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J, marginBottom: 16 },
  chartGrid: { gap: 20 },
  chartSub: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '500', fontFamily: FONT_M, textAlign: 'center', marginTop: 14 },

  // Actions
  actionsSection: { paddingHorizontal: 16, gap: 10, marginTop: 4 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 14
  },
  actionBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
  actionBtnOutline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, backgroundColor: 'rgba(0,229,255,0.04)'
  },
  actionBtnOutlineText: { fontSize: 13, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
  offscreen: { position: 'absolute', left: -9999, top: -9999, opacity: 1 },
  talentCardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.30)',
    backgroundColor: 'rgba(255,215,0,0.06)'
  },
  talentCardBtnText: { color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J }
});

const bar = StyleSheet.create({
  container: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
  prBadge: {
    backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: 5,
    paddingHorizontal: 6, paddingVertical: 2
  },
  prBadgeText: { color: '#FFD700', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '800', width: 24, letterSpacing: 0.5 },
  barTrack: {
    flex: 1, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden'
  },
  barFill: { height: '100%', borderRadius: 4 },
  barVal: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '900', width: 32, textAlign: 'right', fontFamily: FONT_J }
});
