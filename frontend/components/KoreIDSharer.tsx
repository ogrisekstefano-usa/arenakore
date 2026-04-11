/**
 * ARENAKORE — KORE ID SHARER (SnapshotEngine v1.0)
 * Generates a 1080x1920 vertical "Black Card" image for sharing.
 * Uses react-native-view-shot to capture the rendered View.
 * Elements: DNA Radar (Cyan), QR Code, Badge Founder, Nome, Rank.
 * Fixed text: "Il mio DNA. La mia Autorità."
 */
import React, { useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import { shareImageWithText } from '../utils/shareHelper';

interface KoreIDSharerProps {
  user: any;
  onShareStart?: () => void;
  onShareEnd?: () => void;
}

// Simple DNA Radar Chart rendered with SVG
function DNARadar({ dna, color, size }: { dna: Record<string, number>; color: string; size: number }) {
  const keys = Object.keys(dna);
  if (!keys.length) return null;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const n = keys.length;

  // Create polygon points
  const points = keys.map((k, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const val = Math.min(100, Math.max(0, dna[k])) / 100;
    const px = cx + r * val * Math.cos(angle);
    const py = cy + r * val * Math.sin(angle);
    return `${px},${py}`;
  }).join(' ');

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {rings.map((ring) => (
        <Circle key={ring} cx={cx} cy={cy} r={r * ring} fill="none" stroke="rgba(0,229,255,0.08)" strokeWidth={0.5} />
      ))}
      {/* Axis lines */}
      {keys.map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x2 = cx + r * Math.cos(angle);
        const y2 = cy + r * Math.sin(angle);
        return <Line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(0,229,255,0.06)" strokeWidth={0.5} />;
      })}
      {/* Data polygon */}
      <Polygon points={points} fill={color + '20'} stroke={color} strokeWidth={2} />
      {/* Data points */}
      {keys.map((k, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const val = Math.min(100, Math.max(0, dna[k])) / 100;
        const px = cx + r * val * Math.cos(angle);
        const py = cy + r * val * Math.sin(angle);
        return <Circle key={k} cx={px} cy={py} r={3} fill={color} />;
      })}
      {/* Labels */}
      {keys.map((k, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + (r + 16) * Math.cos(angle);
        const ly = cy + (r + 16) * Math.sin(angle);
        return (
          <SvgText
            key={k} x={lx} y={ly}
            fill="rgba(255,255,255,0.3)" fontSize={8} fontWeight="700"
            textAnchor="middle" alignmentBaseline="central"
          >
            {k.slice(0, 4).toUpperCase()}
          </SvgText>
        );
      })}
    </Svg>
  );
}

export function KoreIDSharer({ user, onShareStart, onShareEnd }: KoreIDSharerProps) {
  const viewRef = useRef<any>(null);
  const uid = user?.id || user?._id || 'unknown';
  const username = (user?.username || 'KORE').toUpperCase();
  const isFounder = user?.is_founder || user?.is_admin;
  const flux = user?.ak_credits ?? user?.flux ?? 0;
  const level = user?.level || 1;
  const dna = user?.dna || {};

  const mood = useMemo(() => {
    const vals = Object.values(dna) as number[];
    if (!vals.length) return { color: '#00E5FF', label: 'STEADY' };
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (avg > 80) return { color: '#00FF87', label: 'BEAST MODE' };
    if (avg > 50) return { color: '#00E5FF', label: 'STEADY' };
    if (avg > 30) return { color: '#FF9500', label: 'RECOVERY' };
    return { color: '#FF3B30', label: 'COLD START' };
  }, [dna]);

  const handleShare = useCallback(async () => {
    if (!viewRef.current) return;
    onShareStart?.();
    try {
      const uri = await captureRef(viewRef, { format: 'png', quality: 1 });
      await shareImageWithText(uri, 'Sfidami su ARENAKORE! https://arenakore.app', 'ARENAKORE — KORE ID');
    } catch (e) {
      Alert.alert('Errore', 'Impossibile generare l\'immagine');
    } finally {
      onShareEnd?.();
    }
  }, [onShareStart, onShareEnd]);

  return (
    <>
      {/* Hidden renderable card (off-screen for capture) */}
      <View style={sh$.offscreen}>
        <ViewShot ref={viewRef} options={{ format: 'png', quality: 1 }} style={sh$.card}>
          {/* Black Card Background */}
          <View style={sh$.bg}>
            {/* Neon top accent */}
            <View style={[sh$.topLine, { backgroundColor: mood.color }]} />

            {/* Header */}
            <View style={sh$.header}>
              <Text style={sh$.brand}>ARENAKORE</Text>
              <Text style={[sh$.idLabel, { color: mood.color }]}>KORE ID</Text>
            </View>

            {/* Name + Badges */}
            <View style={sh$.identSection}>
              <View style={[sh$.avatar, { backgroundColor: user?.avatar_color || mood.color }]}>
                <Text style={sh$.avatarLetter}>{username[0]}</Text>
              </View>
              <View style={sh$.nameBlock}>
                <Text style={sh$.username}>{username}</Text>
                <View style={sh$.badgeRow}>
                  {isFounder && (
                    <View style={sh$.founderBadge}>
                      <Text style={sh$.founderText}>FOUNDER #{user?.founder_number || '—'}</Text>
                    </View>
                  )}
                  <View style={[sh$.moodBadge, { backgroundColor: mood.color + '15', borderColor: mood.color + '40' }]}>
                    <Text style={[sh$.moodText, { color: mood.color }]}>{mood.label}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* DNA Radar */}
            {Object.keys(dna).length > 0 && (
              <View style={sh$.radarSection}>
                <DNARadar dna={dna} color={mood.color} size={180} />
              </View>
            )}

            {/* QR Code */}
            <View style={sh$.qrSection}>
              <QRCode
                value={`arenakore://kore/${uid}`}
                size={120}
                color={mood.color}
                backgroundColor="transparent"
              />
            </View>

            {/* Stats */}
            <View style={sh$.statsRow}>
              <View style={sh$.stat}>
                <Text style={[sh$.statVal, { color: mood.color }]}>{flux.toLocaleString()}</Text>
                <Text style={sh$.statLabel}>FLUX</Text>
              </View>
              <View style={sh$.stat}>
                <Text style={[sh$.statVal, { color: mood.color }]}>LVL {level}</Text>
                <Text style={sh$.statLabel}>LIVELLO</Text>
              </View>
            </View>

            {/* Tagline */}
            <Text style={sh$.tagline}>Il mio DNA. La mia Autorità.</Text>

            {/* Footer */}
            <Text style={sh$.footer}>arenakore.app</Text>
          </View>
        </ViewShot>
      </View>

      {/* Visible Share button */}
      <TouchableOpacity style={[sh$.shareBtn, { borderColor: mood.color + '30' }]} onPress={handleShare} activeOpacity={0.85}>
        <Ionicons name="share-outline" size={16} color={mood.color} />
        <Text style={[sh$.shareBtnText, { color: mood.color }]}>SHARE KORE ID</Text>
      </TouchableOpacity>
    </>
  );
}

const sh$ = StyleSheet.create({
  offscreen: {
    position: 'absolute', left: -9999, top: -9999,
    opacity: 1, // Must be visible for capture
  },
  card: { width: 360, height: 640 },
  bg: {
    flex: 1, backgroundColor: '#050505',
    paddingHorizontal: 24, paddingVertical: 20,
    justifyContent: 'space-between'
  },
  topLine: { height: 3, borderRadius: 2, width: 40, marginBottom: 16 },
  header: { gap: 0 },
  brand: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '800', letterSpacing: 5 },
  idLabel: { fontSize: 18, fontWeight: '900', letterSpacing: 5 },
  // Identity
  identSection: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#000', fontSize: 20, fontWeight: '900' },
  nameBlock: { flex: 1, gap: 4 },
  username: { color: '#FFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  badgeRow: { flexDirection: 'row', gap: 6 },
  founderBadge: { backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  founderText: { color: '#FFD700', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  moodBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  moodText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  // Radar
  radarSection: { alignItems: 'center', marginVertical: 4 },
  // QR
  qrSection: { alignItems: 'center', marginVertical: 4 },
  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginVertical: 4 },
  stat: { alignItems: 'center', gap: 2 },
  statVal: { fontSize: 18, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '800', letterSpacing: 2 },
  // Tagline
  tagline: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600', textAlign: 'center', fontStyle: 'italic', letterSpacing: 0.5 },
  // Footer
  footer: { color: 'rgba(255,255,255,0.1)', fontSize: 10, fontWeight: '800', letterSpacing: 3, textAlign: 'center' },
  // Button
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 14,
    backgroundColor: 'rgba(0,229,255,0.04)', borderWidth: 1,
    marginTop: 8
  },
  shareBtnText: { fontSize: 14, fontWeight: '900', letterSpacing: 2 }
});
