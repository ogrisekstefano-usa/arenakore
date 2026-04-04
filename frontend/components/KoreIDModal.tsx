/**
 * ARENAKORE — KORE ID MODAL v2.0
 * Premium identity card with QR Code, Rank, Founder Badge.
 * NIKE-GRADE: Black + Cyan + Gold accents.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';

const { width: SW } = Dimensions.get('window');
const QR_SIZE = Math.min(SW * 0.5, 200);

interface KoreIDModalProps {
  visible: boolean;
  onClose: () => void;
}

export function KoreIDModal({ visible, onClose }: KoreIDModalProps) {
  const { user, token } = useAuth();
  const uid = user?.id || user?._id || 'unknown';
  const username = (user?.username || 'KORE').toUpperCase();
  const isFounder = user?.is_founder || user?.is_admin;
  const flux = user?.flux ?? user?.xp ?? user?.ak_credits ?? 0;
  const level = user?.level || 1;
  const isCertified = user?.is_nexus_certified;

  // Rank data
  const [rank, setRank] = useState<number | null>(null);
  const [loadingRank, setLoadingRank] = useState(false);

  // Shimmer animation for founder badge
  const shimmer = useSharedValue(0.7);
  useEffect(() => {
    if (visible && isFounder) {
      shimmer.value = withRepeat(
        withSequence(withTiming(1, { duration: 1500 }), withTiming(0.7, { duration: 1500 })), -1, false
      );
    }
  }, [visible, isFounder]);
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  // Fetch rank when modal opens
  useEffect(() => {
    if (visible && token) {
      setLoadingRank(true);
      fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/city-ranking?city=GLOBAL`, {
        headers: { 'Authorization': `Bearer ${token}` },
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
        <Animated.View entering={FadeInDown.duration(350).springify()} style={ki$.cardWrap}>
          <TouchableOpacity activeOpacity={1}>
            <LinearGradient colors={['#0C0C0C', '#050505']} style={ki$.card}>
              {/* Cyan glow line */}
              <View style={ki$.topGlow} />

              {/* Header */}
              <View style={ki$.header}>
                <View style={ki$.headerLeft}>
                  <Text style={ki$.brand}>ARENAKORE</Text>
                  <Text style={ki$.title}>KORE ID</Text>
                </View>
                <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={22} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              </View>

              {/* Username + Badges */}
              <View style={ki$.identSection}>
                <View style={[ki$.avatar, { backgroundColor: user?.avatar_color || '#00E5FF' }]}>
                  <Text style={ki$.avatarLetter}>{username[0]}</Text>
                </View>
                <View style={ki$.identInfo}>
                  <Text style={ki$.username} numberOfLines={1}>{username}</Text>
                  <View style={ki$.badgeRow}>
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

              {/* QR Code */}
              <View style={ki$.qrSection}>
                <View style={ki$.qrFrame}>
                  <QRCode
                    value={`arenakore://kore/${uid}`}
                    size={QR_SIZE}
                    color="#00E5FF"
                    backgroundColor="transparent"
                  />
                </View>
                <Text style={ki$.qrHint}>Mostra per essere scansionato</Text>
              </View>

              {/* Divider */}
              <View style={ki$.divider} />

              {/* Stats Grid */}
              <View style={ki$.statsGrid}>
                <View style={ki$.stat}>
                  <Text style={ki$.statValue}>{flux.toLocaleString()}</Text>
                  <Text style={ki$.statLabel}>FLUX</Text>
                </View>
                <View style={ki$.statDivider} />
                <View style={ki$.stat}>
                  <Text style={ki$.statValue}>LVL {level}</Text>
                  <Text style={ki$.statLabel}>LIVELLO</Text>
                </View>
                <View style={ki$.statDivider} />
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
                <View style={ki$.statDivider} />
                <View style={ki$.stat}>
                  <Text style={ki$.statValue}>{user?.total_scans || 0}</Text>
                  <Text style={ki$.statLabel}>SCANS</Text>
                </View>
              </View>

              {/* Serial */}
              <View style={ki$.serialRow}>
                <Text style={ki$.serial}>KORE #{koreNumber}</Text>
                <Text style={ki$.uid}>{uid.substring(0, 8).toUpperCase()}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const ki$ = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  cardWrap: { width: '100%', maxWidth: 360 },
  card: { borderRadius: 22, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(0,229,255,0.12)', padding: 0 },
  topGlow: { height: 2.5, backgroundColor: '#00E5FF', opacity: 0.7 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4 },
  headerLeft: { gap: 0 },
  brand: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '800', letterSpacing: 4 },
  title: { color: '#00E5FF', fontSize: 16, fontWeight: '900', letterSpacing: 4 },
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
  qrFrame: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,229,255,0.08)', backgroundColor: 'rgba(0,0,0,0.4)' },
  qrHint: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '600', letterSpacing: 1.5 },
  // Divider
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 20 },
  // Stats
  statsGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 0 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { color: '#00E5FF', fontSize: 16, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '800', letterSpacing: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' },
  // Serial
  serialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4 },
  serial: { color: 'rgba(0,229,255,0.35)', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  uid: { color: 'rgba(255,255,255,0.12)', fontSize: 10, fontWeight: '600', letterSpacing: 1, ...Platform.select({ web: { fontFamily: 'monospace' }, default: {} }) },
});
