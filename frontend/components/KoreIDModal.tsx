/**
 * ARENAKORE — KORE ID MODAL v3.0 (GLASSMORPHISM EDITION)
 * Premium identity card with Glassmorphism design.
 * Neon border dynamically changes based on athlete MOOD:
 *   - GREEN (#00FF87): DNA Avg > 80 = BEAST MODE
 *   - CYAN (#00E5FF): DNA Avg 50-80 = STEADY
 *   - ORANGE (#FF9500): DNA Avg 30-50 = RECOVERY
 *   - RED (#FF3B30): DNA Avg < 30 = COLD
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useAuth } from '../contexts/AuthContext';
import { KoreIDSharer } from './KoreIDSharer';

let SW = 390; try { SW = Dimensions.get('window').width; } catch(e) {}
const QR_SIZE = Math.min(SW * 0.45, 180);

interface KoreIDModalProps {
  visible: boolean;
  onClose: () => void;
}

// Mood engine: determines neon color based on DNA average
function getMood(dna: Record<string, number> | null | undefined) {
  if (!dna) return { color: '#00E5FF', label: 'UNKNOWN', icon: 'help-circle' as const };
  const vals = Object.values(dna);
  if (!vals.length) return { color: '#00E5FF', label: 'UNKNOWN', icon: 'help-circle' as const };
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (avg > 80) return { color: '#00FF87', label: 'BEAST MODE', icon: 'flame' as const };
  if (avg > 50) return { color: '#00E5FF', label: 'STEADY', icon: 'pulse' as const };
  if (avg > 30) return { color: '#FF9500', label: 'RECOVERY', icon: 'battery-charging' as const };
  return { color: '#FF3B30', label: 'COLD START', icon: 'snow' as const };
}

export function KoreIDModal({ visible, onClose }: KoreIDModalProps) {
  const { user, token } = useAuth();
  const uid = user?.id || user?._id || 'unknown';
  const username = (user?.username || 'KORE').toUpperCase();
  const isFounder = user?.is_founder || user?.is_admin;
  const flux = user?.ak_credits ?? user?.flux ?? 0;
  const level = user?.level || 1;
  const isCertified = user?.is_nexus_certified;

  const mood = useMemo(() => getMood(user?.dna), [user?.dna]);

  // Rank fetch
  const [rank, setRank] = useState<number | null>(null);
  const [loadingRank, setLoadingRank] = useState(false);

  // Neon pulse animation
  const pulse = useSharedValue(0.5);
  useEffect(() => {
    if (visible) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000 }),
          withTiming(0.5, { duration: 2000 })
        ), -1, false
      );
    }
  }, [visible]);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value
  }));

  // Founder shimmer
  const shimmer = useSharedValue(0.6);
  useEffect(() => {
    if (visible && isFounder) {
      shimmer.value = withRepeat(
        withSequence(withTiming(1, { duration: 1500 }), withTiming(0.6, { duration: 1500 })), -1, false
      );
    }
  }, [visible, isFounder]);
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  // Fetch rank
  useEffect(() => {
    if (visible && token) {
      setLoadingRank(true);
      fetch(`${'https://arenakore-api.onrender.com'}/api/rankings/city?city=GLOBAL`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(d => { setRank(d.my_rank || null); })
        .catch(() => {})
        .finally(() => setLoadingRank(false));
    }
  }, [visible, token]);

  if (!visible) return null;

  const koreNumber = user?.founder_number
    ? String(user.founder_number).padStart(5, '0')
    : String(Math.abs(parseInt((uid || '00001').slice(-5), 16)) % 99999).padStart(5, '0');

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={ki$.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View entering={FadeInDown.duration(400).springify()} style={ki$.cardOuter}>
          <TouchableOpacity activeOpacity={1}>
            {/* Neon border glow */}
            <Animated.View style={[ki$.neonGlow, { borderColor: mood.color }, pulseStyle]} />

            {/* Glassmorphism card */}
            <View style={[ki$.card, { borderColor: mood.color + '40' }]}>
              {/* Glass background effect */}
              {Platform.OS !== 'web' ? (
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
              ) : (
                <View style={[StyleSheet.absoluteFillObject, ki$.webGlass]} />
              )}

              {/* Mood indicator line at top */}
              <View style={[ki$.moodLine, { backgroundColor: mood.color }]} />

              {/* Header */}
              <View style={ki$.header}>
                <View style={ki$.headerLeft}>
                  <Text style={ki$.brand}>ARENAKORE</Text>
                  <Text style={[ki$.title, { color: mood.color }]}>KORE ID</Text>
                </View>
                <View style={ki$.headerRight}>
                  <View style={[ki$.moodBadge, { backgroundColor: mood.color + '15', borderColor: mood.color + '35' }]}>
                    <Ionicons name={mood.icon} size={10} color={mood.color} />
                    <Text style={[ki$.moodText, { color: mood.color }]}>{mood.label}</Text>
                  </View>
                  <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name="close" size={20} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Identity section */}
              <View style={ki$.identSection}>
                <View style={[ki$.avatar, { backgroundColor: user?.avatar_color || mood.color }]}>
                  <Text style={ki$.avatarLetter}>{username[0]}</Text>
                </View>
                <View style={ki$.identInfo}>
                  <Text style={ki$.username} numberOfLines={1}>{username}</Text>
                  <View style={ki$.badgeRow}>
                    {/* ── Competency Badge ── */}
                    {(() => {
                      const tl = user?.training_level || 'Amateur';
                      const compMap: Record<string, { label: string; color: string }> = {
                        'Rookie':   { label: 'ROOKIE',    color: '#8E8E93' },
                        'Amateur':  { label: 'AMATEUR',   color: '#34C759' },
                        'Semi-Pro': { label: 'SEMI-PRO',  color: '#007AFF' },
                        'Pro':      { label: 'PRO',       color: '#FF9500' },
                        'Elite':    { label: 'ELITE',     color: '#FFD700' },
                      };
                      const comp = compMap[tl] || compMap['Amateur'];
                      return (
                        <View style={[ki$.certBadge, { borderColor: comp.color + '40', backgroundColor: comp.color + '10' }]}>
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: comp.color }} />
                          <Text style={[ki$.certText, { color: comp.color }]}>{comp.label}</Text>
                        </View>
                      );
                    })()}
                    {/* ── Sport Icon Badge ── */}
                    {user?.preferred_sport ? (
                      <View style={[ki$.certBadge, { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' }]}>
                        <Text style={{ fontSize: 9 }}>{(() => {
                          const sportIcons: Record<string, string> = {
                            'Basket': '🏀', 'Calcio': '⚽', 'Tennis': '🎾', 'Padel': '🏓', 'Running': '🏃',
                            'CrossFit': '🏋️', 'Fitness': '💪', 'Nuoto': '🏊', 'Boxe': '🥊', 'MMA': '🥋',
                            'Bodybuilding': '🏋️', 'Golf': '⛳', 'Ciclismo': '🚴', 'Atletica': '🏃', 'Rugby': '🏉',
                            'Volley': '🏐', 'Sci': '⛷️', 'Arrampicata': '🧗',
                          };
                          return sportIcons[user.preferred_sport] || '🔥';
                        })()}</Text>
                        <Text style={[ki$.certText, { color: 'rgba(255,255,255,0.6)' }]}>{user.preferred_sport.toUpperCase()}</Text>
                      </View>
                    ) : null}
                    {isFounder && (
                      <Animated.View style={[ki$.founderBadge, shimmerStyle]}>
                        <Ionicons name="star" size={9} color="#FFD700" />
                        <Text style={ki$.founderText}>FOUNDER #{user?.founder_number || '—'}</Text>
                      </Animated.View>
                    )}
                    {isCertified && (
                      <View style={ki$.certBadge}>
                        <Ionicons name="shield-checkmark" size={9} color="#00FF87" />
                        <Text style={ki$.certText}>NEXUS</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* QR Code - centered with glow */}
              <View style={ki$.qrSection}>
                <View style={[ki$.qrFrame, { borderColor: mood.color + '20' }]}>
                  <QRCode
                    value={`arenakore://kore/${uid}`}
                    size={QR_SIZE}
                    color={mood.color}
                    backgroundColor="transparent"
                  />
                </View>
                <Text style={ki$.qrHint}>Mostra per essere scansionato</Text>
              </View>

              {/* Divider */}
              <View style={[ki$.divider, { backgroundColor: mood.color + '15' }]} />

              {/* Identity Details */}
              <View style={{ paddingHorizontal: 20, gap: 6, marginBottom: 8 }}>
                {user?.email ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="mail-outline" size={12} color="rgba(255,255,255,0.35)" />
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '500', letterSpacing: 0.5 }}>{user.email}</Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="finger-print-outline" size={12} color="rgba(255,255,255,0.35)" />
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '500', letterSpacing: 0.5 }}>ID: {uid.substring(0, 12).toUpperCase()}</Text>
                </View>
              </View>

              {/* Stats Grid */}
              <Animated.View entering={FadeInUp.delay(200).duration(300)} style={ki$.statsGrid}>
                <View style={ki$.stat}>
                  <Text style={[ki$.statValue, { color: mood.color }]}>{flux.toLocaleString()}</Text>
                  <Text style={ki$.statLabel}>FLUX</Text>
                </View>
                <View style={[ki$.statDivider, { backgroundColor: mood.color + '15' }]} />
                <View style={ki$.stat}>
                  <Text style={[ki$.statValue, { color: mood.color }]}>LVL {level}</Text>
                  <Text style={ki$.statLabel}>LIVELLO</Text>
                </View>
                <View style={[ki$.statDivider, { backgroundColor: mood.color + '15' }]} />
                <View style={ki$.stat}>
                  {loadingRank ? (
                    <ActivityIndicator color="#FFD700" size="small" />
                  ) : (
                    <Text style={[ki$.statValue, { color: '#FFD700' }]}>
                      {rank ? `#${rank}` : '---'}
                    </Text>
                  )}
                  <Text style={ki$.statLabel}>RANK</Text>
                </View>
                <View style={[ki$.statDivider, { backgroundColor: mood.color + '15' }]} />
                <View style={ki$.stat}>
                  <Text style={[ki$.statValue, { color: mood.color }]}>{user?.total_scans || 0}</Text>
                  <Text style={ki$.statLabel}>SCANS</Text>
                </View>
              </Animated.View>

              {/* Serial */}
              <View style={ki$.serialRow}>
                <Text style={[ki$.serial, { color: mood.color + '60' }]}>KORE #{koreNumber}</Text>
                <Text style={ki$.uid}>{uid.substring(0, 8).toUpperCase()}</Text>
              </View>

              {/* Share KORE ID as Image */}
              <View style={ki$.shareSection}>
                <KoreIDSharer user={user} />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const ki$ = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  cardOuter: { width: '100%', maxWidth: 370, position: 'relative' },

  // Neon outer glow
  neonGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24, borderWidth: 2,
    ...Platform.select({
      web: {},
      default: {}
    })
  },

  // Card
  card: {
    borderRadius: 22, overflow: 'hidden', borderWidth: 1,
    backgroundColor: Platform.OS === 'web' ? 'rgba(10,10,10,0.85)' : 'rgba(5,5,5,0.6)'
  },
  webGlass: { backgroundColor: 'rgba(10,10,10,0.88)' },

  // Mood indicator
  moodLine: { height: 2.5, opacity: 0.8 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 2
  },
  headerLeft: { gap: 0 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '800', letterSpacing: 4 },
  title: { fontSize: 16, fontWeight: '900', letterSpacing: 4 },
  moodBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1
  },
  moodText: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },

  // Identity
  identSection: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10 },
  avatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#000', fontSize: 22, fontWeight: '900' },
  identInfo: { flex: 1, gap: 4 },
  username: { color: '#FFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  founderBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)' },
  founderText: { color: '#FFD700', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  certBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,255,135,0.06)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(0,255,135,0.2)' },
  certText: { color: '#00FF87', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  // QR
  qrSection: { alignItems: 'center', paddingVertical: 14, gap: 8 },
  qrFrame: {
    padding: 16, borderRadius: 18, borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  qrHint: { color: 'rgba(255,255,255,0.12)', fontSize: 10, fontWeight: '600', letterSpacing: 1.5 },

  // Divider
  divider: { height: 1, marginHorizontal: 20 },

  // Stats
  statsGrid: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 16
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 16, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.18)', fontSize: 8, fontWeight: '800', letterSpacing: 2 },
  statDivider: { width: 1, height: 28 },

  // Serial
  serialRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4
  },
  serial: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  uid: {
    color: 'rgba(255,255,255,0.1)', fontSize: 10, fontWeight: '600', letterSpacing: 1,
    ...Platform.select({ web: { fontFamily: 'monospace' }, default: {} })
  },
  // Share section
  shareSection: { paddingHorizontal: 20, paddingBottom: 16 }
});
