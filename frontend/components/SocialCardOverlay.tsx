/**
 * SOCIAL CARD OVERLAY — Build 37 · Social Engine
 * ══════════════════════════════════════════════════
 * Renders a premium shareable card for Instagram Stories & social media.
 * 
 * Structure:
 * ┌─────────────────────────────────┐
 * │  ARENAKORE logo                │
 * │  ┌───────────────────────────┐ │
 * │  │  Screenshot / Gradient BG │ │
 * │  │                           │ │
 * │  │  ┌─ NEXUS VERIFIED ─────┐ │ │
 * │  │  │  Badge (color-coded)  │ │ │
 * │  │  └──────────────────────┘ │ │
 * │  └───────────────────────────┘ │
 * │  Exercise Name      RESULT     │
 * │  +XXX K-FLUX         ●●●       │
 * │  Username · LVL X              │
 * │  ┌─────────┐                   │
 * │  │ QR Code │  PROVA ORA        │
 * │  └─────────┘                   │
 * └─────────────────────────────────┘
 */
import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 40;
const CARD_H = CARD_W * 1.6; // Instagram Story-ish ratio

const CYAN = '#00E5FF';
const GOLD = '#FFD700';
const GREEN = '#32D74B';
const BG = '#000000';

const FLUX_HEX: Record<string, string> = { green: GREEN, cyan: CYAN, gold: GOLD };

export interface SocialCardData {
  share_id: string;
  deep_link: string;
  qr_url: string;
  user: { username: string; level: number; preferred_sport?: string; is_nexus_certified?: boolean };
  activity: {
    tipo: string;
    template_name: string;
    disciplina: string;
    exercise_type: string;
    result?: { type?: string; value?: number; unit?: string };
    flux_earned: number;
    flux_color: string;
    flux_badge_label: string;
    nexus_verified: boolean;
    duration_seconds?: number;
    completed_at?: string;
  };
  media: { screenshots: string[]; has_screenshots: boolean; thumbnail?: string };
  badge: { text: string; color: string; hex: string };
  kpi_highlights?: { quality_score?: number; explosivity_pct?: number; rom_pct?: number };
}

interface SocialCardOverlayProps {
  data: SocialCardData;
  viewShotRef: React.RefObject<ViewShot>;
}

function formatDuration(sec?: number): string {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  return m > 0 ? `${m}min` : `${sec}s`;
}

export function SocialCardOverlay({ data, viewShotRef }: SocialCardOverlayProps) {
  const badgeColor = FLUX_HEX[data.badge.color] || CYAN;
  const resultVal = data.activity.result?.value;
  const resultUnit = data.activity.result?.unit || '';
  const hasBG = data.media.has_screenshots && data.media.screenshots.length > 0;

  return (
    <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.95 }} style={cs.viewShot}>
      <View style={cs.card}>
        {/* ═══ BACKGROUND ═══ */}
        {hasBG ? (
          <Image
            source={{ uri: data.media.thumbnail || `data:image/jpeg;base64,${data.media.screenshots[0]}` }}
            style={cs.bgImage}
            resizeMode="cover"
          />
        ) : null}
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.85)',
            hasBG ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.95)',
            'rgba(0,0,0,0.92)',
          ]}
          style={cs.bgGradient}
        />

        {/* ═══ HEADER — ARENAKORE LOGO ═══ */}
        <View style={cs.headerRow}>
          <View style={cs.logoRow}>
            <Ionicons name="flash" size={14} color={CYAN} />
            <Text style={cs.logoArena}>ARENA</Text>
            <Text style={cs.logoKore}>KORE</Text>
          </View>
          <Text style={cs.headerSport}>{data.activity.disciplina.toUpperCase()}</Text>
        </View>

        {/* ═══ MAIN CONTENT ═══ */}
        <View style={cs.mainContent}>
          {/* Badge — NEXUS VERIFIED */}
          <View style={[cs.nexusBadge, { borderColor: badgeColor + '40', backgroundColor: badgeColor + '10' }]}>
            <Ionicons
              name={data.activity.nexus_verified ? 'shield-checkmark' : 'checkmark-circle'}
              size={12}
              color={badgeColor}
            />
            <Text style={[cs.nexusBadgeText, { color: badgeColor }]}>{data.badge.text}</Text>
          </View>

          {/* Template Name */}
          <Text style={cs.templateName} numberOfLines={2}>
            {data.activity.template_name}
          </Text>

          {/* Exercise Type */}
          <Text style={cs.exerciseType}>
            {data.activity.exercise_type?.toUpperCase()}
          </Text>

          {/* Result + K-Flux */}
          <View style={cs.resultRow}>
            {resultVal != null && (
              <View style={cs.resultBlock}>
                <Text style={[cs.resultValue, { color: badgeColor }]}>{resultVal}</Text>
                <Text style={cs.resultUnit}>{resultUnit.toUpperCase()}</Text>
              </View>
            )}
            <View style={[cs.fluxBadge, { backgroundColor: badgeColor + '12', borderColor: badgeColor + '25' }]}>
              <Ionicons name="flash" size={16} color={badgeColor} />
              <Text style={[cs.fluxValue, { color: badgeColor }]}>+{data.activity.flux_earned}</Text>
              <Text style={cs.fluxLabel}>K-FLUX</Text>
            </View>
          </View>

          {/* KPI Highlights */}
          {data.kpi_highlights && (
            <View style={cs.kpiRow}>
              {data.kpi_highlights.quality_score != null && (
                <View style={cs.kpiItem}>
                  <Text style={cs.kpiLabel}>QUALITÀ</Text>
                  <Text style={[cs.kpiValue, { color: GREEN }]}>{Math.round(data.kpi_highlights.quality_score)}%</Text>
                </View>
              )}
              {data.kpi_highlights.explosivity_pct != null && (
                <View style={cs.kpiItem}>
                  <Text style={cs.kpiLabel}>POWER</Text>
                  <Text style={[cs.kpiValue, { color: GOLD }]}>{Math.round(data.kpi_highlights.explosivity_pct)}%</Text>
                </View>
              )}
              {data.kpi_highlights.rom_pct != null && (
                <View style={cs.kpiItem}>
                  <Text style={cs.kpiLabel}>ROM</Text>
                  <Text style={[cs.kpiValue, { color: CYAN }]}>{Math.round(data.kpi_highlights.rom_pct)}%</Text>
                </View>
              )}
            </View>
          )}

          {/* Duration */}
          {data.activity.duration_seconds != null && data.activity.duration_seconds > 0 && (
            <Text style={cs.duration}>{formatDuration(data.activity.duration_seconds)}</Text>
          )}
        </View>

        {/* ═══ FOOTER — User + QR ═══ */}
        <View style={cs.footer}>
          <View style={cs.footerLeft}>
            {/* User info */}
            <View style={cs.userRow}>
              <View style={[cs.userAvatar, { borderColor: badgeColor + '40' }]}>
                <Text style={cs.userInitials}>
                  {data.user.username.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={cs.userInfo}>
                <Text style={cs.userName}>{data.user.username}</Text>
                <Text style={cs.userLevel}>LVL {data.user.level} · {data.activity.flux_badge_label}</Text>
              </View>
            </View>
            {/* CTA */}
            <View style={[cs.ctaBlock, { borderColor: badgeColor + '30' }]}>
              <Ionicons name="arrow-forward-circle" size={14} color={badgeColor} />
              <Text style={[cs.ctaText, { color: badgeColor }]}>PROVA ORA</Text>
            </View>
          </View>

          {/* QR Code */}
          <View style={cs.qrWrapper}>
            <View style={cs.qrInner}>
              <QRCode
                value={data.qr_url || data.deep_link || 'https://arenakore.app'}
                size={72}
                color={badgeColor}
                backgroundColor="transparent"
              />
            </View>
            <Text style={cs.qrLabel}>SCAN TO PLAY</Text>
          </View>
        </View>

        {/* ═══ BOTTOM BAR ═══ */}
        <View style={cs.bottomBar}>
          <Text style={cs.bottomText}>arenakore.app</Text>
          <Text style={cs.bottomDot}>·</Text>
          <Text style={cs.bottomText}>{data.share_id.toUpperCase()}</Text>
        </View>
      </View>
    </ViewShot>
  );
}

const cs = StyleSheet.create({
  viewShot: { alignItems: 'center' },
  card: {
    width: CARD_W,
    minHeight: CARD_H,
    backgroundColor: BG,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  bgGradient: {
    ...StyleSheet.absoluteFillObject,
  },

  // Header
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
    zIndex: 2,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  logoArena: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  logoKore: { color: CYAN, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  headerSport: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '800', letterSpacing: 2 },

  // Main
  mainContent: {
    flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 14,
    zIndex: 2,
  },
  nexusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1,
  },
  nexusBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  templateName: {
    color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: 1,
    lineHeight: 34,
  },
  exerciseType: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '800', letterSpacing: 3 },

  resultRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 8,
  },
  resultBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  resultValue: { fontSize: 52, fontWeight: '900' },
  resultUnit: { color: 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: '800' },
  fluxBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
  },
  fluxValue: { fontSize: 18, fontWeight: '900' },
  fluxLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '800', letterSpacing: 1 },

  kpiRow: {
    flexDirection: 'row', gap: 16, paddingTop: 4,
  },
  kpiItem: { gap: 2 },
  kpiLabel: { color: 'rgba(255,255,255,0.15)', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  kpiValue: { fontSize: 16, fontWeight: '900' },

  duration: { color: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: '700' },

  // Footer
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, paddingBottom: 14, paddingTop: 16,
    zIndex: 2,
  },
  footerLeft: { flex: 1, gap: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userAvatar: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  userInitials: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  userInfo: { gap: 2 },
  userName: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  userLevel: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  ctaBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  ctaText: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },

  qrWrapper: { alignItems: 'center', gap: 6 },
  qrInner: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  qrLabel: { color: 'rgba(255,255,255,0.15)', fontSize: 7, fontWeight: '900', letterSpacing: 2 },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
    zIndex: 2,
  },
  bottomText: { color: 'rgba(255,255,255,0.1)', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  bottomDot: { color: 'rgba(255,255,255,0.06)', fontSize: 8 },
});
