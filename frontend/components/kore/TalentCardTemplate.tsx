/**
 * ARENAKORE — TALENT CARD TEMPLATE
 * Elite collectible-style card (9:16) for social export.
 * Designed to look like a FIFA Ultimate Team / Trading Card.
 * Captured via ViewShot → PNG → Share/Save.
 */
import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const FONT_J = Platform.select({ ios: 'PlusJakartaSans-ExtraBold', android: 'PlusJakartaSans-ExtraBold', default: 'Plus Jakarta Sans' });
const FONT_M = Platform.select({ ios: 'Montserrat-Regular', android: 'Montserrat-Regular', default: 'Montserrat' });

const SILO_COLORS: Record<string, string> = {
  'Fitness': '#FF3B30', 'Golf': '#00FF87', 'Padel': '#00B4D8', 'Calcio': '#06D6A0',
  'Tennis': '#FFD700', 'Basket': '#FF9500', 'Running': '#A855F7', 'Nuoto': '#0096C7',
  'Yoga': '#C77DFF', 'CrossFit': '#FF6B6B', 'Boxing': '#E63946', 'MMA': '#D62828', 'Ciclismo': '#48CAE4'
};

const DISC_ICONS: Record<string, string> = {
  'Golf': '⛳', 'Fitness': '🏋️', 'Padel': '🏓', 'Calcio': '⚽', 'Tennis': '🎾',
  'Basket': '🏀', 'Running': '🏃', 'Nuoto': '🏊', 'Yoga': '🧘', 'CrossFit': '💪',
  'Boxing': '🥊', 'MMA': '🥋', 'Ciclismo': '🚴'
};

interface TalentCardData {
  username: string;
  title?: string;              // "ROOKIE" | "CONTENDER" | "MASTER OF GOLF"
  disciplina: string;
  peakSnapshot?: string | null;
  primaryValue: number;
  primaryUnit: string;         // "REPS" | "MIN" | "PTS"
  qualityScore: number;
  romPct?: number | null;
  explosivityPct?: number | null;
  powerOutput?: number | null;
  heartRate?: number | null;
  fluxEarned: number;
  isCertified: boolean;
  isFounder?: boolean;
  founderNumber?: number;
  tipo: string;
  validationStatus?: string;
}

function calculateGlobalRating(data: TalentCardData): number {
  const q = data.qualityScore || 0;
  const rom = data.romPct || 0;
  const expl = data.explosivityPct || 0;
  // Weighted: Quality 50%, ROM 25%, Explosivity 25%
  let base = q * 0.50 + rom * 0.25 + expl * 0.25;
  // Bonus for certified (+3) and high volume (+2)
  if (data.isCertified) base += 3;
  if (data.primaryValue > 30) base += 2;
  return Math.min(Math.round(base), 99);
}

function getRatingColor(rating: number): string {
  if (rating >= 90) return '#FFD700';  // Gold
  if (rating >= 80) return '#00FF87';  // Green
  if (rating >= 70) return '#00E5FF';  // Cyan
  if (rating >= 60) return '#A855F7';  // Purple
  return '#FFFFFF';                     // White
}

export const TalentCardTemplate = forwardRef<View, { data: TalentCardData }>(({ data }, ref) => {
  const siloColor = SILO_COLORS[data.disciplina] || '#00E5FF';
  const discIcon = DISC_ICONS[data.disciplina] || '🏅';
  const rating = calculateGlobalRating(data);
  const ratingColor = getRatingColor(rating);
  const hasPeak = !!data.peakSnapshot;

  // Format primary display
  let primaryDisplay = String(data.primaryValue || 0);
  if (data.primaryUnit === 'MIN' && data.primaryValue > 0) {
    const m = Math.floor(data.primaryValue / 60);
    const ss = Math.round(data.primaryValue % 60);
    primaryDisplay = `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  const kpiStats = [
    { label: 'EXPL', value: data.explosivityPct, color: '#00E5FF' },
    { label: 'ROM', value: data.romPct, color: '#00FF87' },
    { label: 'PWR', value: data.powerOutput, color: '#FFD700' },
    { label: 'BPM', value: data.heartRate, color: '#FF3B30' },
  ].filter(k => k.value != null && k.value > 0);

  // Use top 3 KPIs
  const topKpis = kpiStats.slice(0, 3);

  return (
    <View ref={ref} style={tc.card} collapsable={false}>
      {/* ═══ BACKGROUND LAYER ═══ */}
      <View style={tc.bgLayer}>
        {hasPeak ? (
          <Image source={{ uri: data.peakSnapshot! }} style={tc.bgImage} resizeMode="cover" blurRadius={3} />
        ) : (
          <LinearGradient colors={['#1A1A1A', '#0A0A0A']} style={StyleSheet.absoluteFillObject} />
        )}
        {/* Dark vignette overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* ═══ NEON FRAME BORDER ═══ */}
      <View style={[tc.neonFrame, { borderColor: siloColor + '60' }]}>
        {/* Top glow line */}
        <View style={[tc.glowLineTop, { backgroundColor: siloColor }]} />

        {/* ═══ TOP SECTION — Brand + Discipline ═══ */}
        <View style={tc.topSection}>
          <View style={tc.brandRow}>
            <Text style={tc.brandA}>ARENA</Text>
            <Text style={tc.brandK}>KORE</Text>
          </View>
          <View style={[tc.discBadge, { borderColor: siloColor + '40' }]}>
            <Text style={tc.discEmoji}>{discIcon}</Text>
            <Text style={[tc.discName, { color: siloColor }]}>{data.disciplina.toUpperCase()}</Text>
          </View>
        </View>

        {/* ═══ ATHLETE SECTION — Photo + Rating ═══ */}
        <View style={tc.athleteSection}>
          {/* Rating circle (top-left overlap) */}
          <View style={[tc.ratingContainer, { borderColor: ratingColor }]}>
            <LinearGradient
              colors={[ratingColor + '20', 'rgba(0,0,0,0.9)']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <Text style={[tc.ratingValue, { color: ratingColor }]}>{rating}</Text>
            <Text style={[tc.ratingLabel, { color: ratingColor + '80' }]}>OVR</Text>
          </View>

          {/* Peak photo frame */}
          <View style={[tc.photoFrame, { borderColor: siloColor + '50' }]}>
            {hasPeak ? (
              <Image source={{ uri: data.peakSnapshot! }} style={tc.photoImg} resizeMode="cover" />
            ) : (
              <View style={tc.photoPlaceholder}>
                <Ionicons name="person" size={48} color="rgba(255,255,255,0.08)" />
              </View>
            )}
            {/* Gradient overlay on photo bottom */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={tc.photoGradient}
            />
          </View>

          {/* Title badge */}
          {data.title && (
            <View style={[tc.titleBadge, { backgroundColor: siloColor + '18', borderColor: siloColor + '35' }]}>
              <Text style={[tc.titleText, { color: siloColor }]}>{data.title.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* ═══ USERNAME ═══ */}
        <View style={tc.nameSection}>
          <Text style={tc.username} numberOfLines={1}>{data.username.toUpperCase()}</Text>
          {data.isFounder && (
            <View style={tc.founderBadge}>
              <Text style={tc.founderText}>FOUNDER #{data.founderNumber || '?'}</Text>
            </View>
          )}
        </View>

        {/* ═══ PRIMARY RESULT ═══ */}
        <View style={tc.resultSection}>
          <Text style={tc.resultValue}>{primaryDisplay}</Text>
          <Text style={tc.resultUnit}>{data.primaryUnit}</Text>
        </View>

        {/* ═══ KPI STAT BARS ═══ */}
        <View style={tc.kpiSection}>
          {topKpis.map((kpi, i) => (
            <View key={kpi.label} style={tc.kpiRow}>
              <Text style={tc.kpiLabel}>{kpi.label}</Text>
              <View style={tc.kpiBarTrack}>
                <View style={[tc.kpiBarFill, {
                  width: `${Math.min((kpi.value || 0), 100)}%`,
                  backgroundColor: kpi.color
                }]} />
              </View>
              <Text style={[tc.kpiValue, { color: kpi.color }]}>{Math.round(kpi.value || 0)}</Text>
            </View>
          ))}
          {/* Always show Quality */}
          <View style={tc.kpiRow}>
            <Text style={tc.kpiLabel}>QUA</Text>
            <View style={tc.kpiBarTrack}>
              <View style={[tc.kpiBarFill, {
                width: `${Math.min(data.qualityScore, 100)}%`,
                backgroundColor: '#FFFFFF'
              }]} />
            </View>
            <Text style={[tc.kpiValue, { color: '#FFFFFF' }]}>{Math.round(data.qualityScore)}</Text>
          </View>
        </View>

        {/* ═══ BOTTOM — Validation + Watermark ═══ */}
        <View style={tc.bottomSection}>
          {/* Certified badge */}
          {data.isCertified && (
            <View style={tc.certBadge}>
              <Ionicons name="shield-checkmark" size={10} color="#00FF87" />
              <Text style={tc.certText}>COACH CERTIFIED</Text>
            </View>
          )}
          {/* FLUX earned */}
          <View style={tc.fluxRow}>
            <Ionicons name="flash" size={12} color="#FFD700" />
            <Text style={tc.fluxText}>+{data.fluxEarned} FLUX</Text>
          </View>
          {/* Verification watermark */}
          <View style={tc.verifyRow}>
            <View style={[tc.verifyLine, { backgroundColor: siloColor + '30' }]} />
            <View style={tc.verifyContent}>
              <Ionicons name="eye" size={10} color={siloColor + '50'} />
              <Text style={[tc.verifyText, { color: siloColor + '70' }]}>Verified by NÈXUS AI</Text>
            </View>
            <View style={[tc.verifyLine, { backgroundColor: siloColor + '30' }]} />
          </View>
          {/* Footer branding */}
          <Text style={tc.footer}>arenakore.app</Text>
        </View>

        {/* Bottom glow line */}
        <View style={[tc.glowLineBottom, { backgroundColor: siloColor }]} />
      </View>
    </View>
  );
});

TalentCardTemplate.displayName = 'TalentCardTemplate';

// ═══ STYLES — 360×640 (9:16 ratio) ═══
const tc = StyleSheet.create({
  card: { width: 360, height: 640, backgroundColor: '#050505', overflow: 'hidden' },

  // Background
  bgLayer: { ...StyleSheet.absoluteFillObject },
  bgImage: { width: 360, height: 640 },

  // Neon frame
  neonFrame: {
    flex: 1, margin: 10, borderRadius: 18, borderWidth: 2,
    overflow: 'hidden', justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  glowLineTop: { height: 2, width: '100%', opacity: 0.8 },
  glowLineBottom: { height: 2, width: '100%', opacity: 0.8 },

  // Top
  topSection: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 10
  },
  brandRow: { flexDirection: 'row', gap: 4 },
  brandA: { color: 'rgba(255,255,255,0.40)', fontSize: 11, fontWeight: '900', letterSpacing: 4 },
  brandK: { color: '#00E5FF', fontSize: 11, fontWeight: '900', letterSpacing: 4 },
  discBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  discEmoji: { fontSize: 12 },
  discName: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  // Athlete
  athleteSection: {
    alignItems: 'center', paddingHorizontal: 14, position: 'relative'
  },
  ratingContainer: {
    position: 'absolute', top: -5, left: 20, zIndex: 10,
    width: 54, height: 62, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden'
  },
  ratingValue: { fontSize: 28, fontWeight: '900', lineHeight: 30, fontFamily: FONT_J },
  ratingLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 2, marginTop: -2 },
  photoFrame: {
    width: 260, height: 200, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1.5
  },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  photoGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
  titleBadge: {
    marginTop: 6, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1
  },
  titleText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },

  // Name
  nameSection: { alignItems: 'center', paddingHorizontal: 14 },
  username: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_J },
  founderBadge: {
    marginTop: 3, backgroundColor: 'rgba(255,215,0,0.10)',
    borderRadius: 5, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)'
  },
  founderText: { color: '#FFD700', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },

  // Result
  resultSection: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 },
  resultValue: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', fontFamily: FONT_J },
  resultUnit: { color: 'rgba(255,255,255,0.30)', fontSize: 14, fontWeight: '900', letterSpacing: 3 },

  // KPI bars
  kpiSection: { paddingHorizontal: 20, gap: 5 },
  kpiRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kpiLabel: { color: 'rgba(255,255,255,0.40)', fontSize: 10, fontWeight: '900', width: 30, letterSpacing: 1 },
  kpiBarTrack: {
    flex: 1, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden'
  },
  kpiBarFill: { height: '100%', borderRadius: 3 },
  kpiValue: { fontSize: 13, fontWeight: '900', width: 28, textAlign: 'right', fontFamily: FONT_J },

  // Bottom
  bottomSection: { alignItems: 'center', paddingBottom: 6, gap: 4 },
  certBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,255,135,0.10)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(0,255,135,0.20)'
  },
  certText: { color: '#00FF87', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  fluxRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fluxText: { color: '#FFD700', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  verifyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    width: '80%'
  },
  verifyLine: { flex: 1, height: 1 },
  verifyContent: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifyText: { fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  footer: { color: 'rgba(255,255,255,0.10)', fontSize: 9, fontWeight: '800', letterSpacing: 3 }
});

export type { TalentCardData };
