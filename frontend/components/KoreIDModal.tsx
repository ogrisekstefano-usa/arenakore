/**
 * ARENAKORE — KORE ID MODAL
 * QR Code centrale con User ID per identificazione.
 */
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';

const { width: SW } = Dimensions.get('window');
const QR_SIZE = Math.min(SW * 0.55, 220);

interface KoreIDModalProps {
  visible: boolean;
  onClose: () => void;
}

export function KoreIDModal({ visible, onClose }: KoreIDModalProps) {
  const { user } = useAuth();
  const uid = user?._id || user?.id || 'unknown';
  const username = (user?.username || 'KORE').toUpperCase();
  const isFounder = user?.is_founder || user?.is_admin;
  const flux = user?.flux ?? user?.ak_credits ?? 0;

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={ki$.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View entering={FadeInDown.duration(300)} style={ki$.card}>
          <TouchableOpacity activeOpacity={1}>
            {/* Header */}
            <View style={ki$.header}>
              <Text style={ki$.title}>KORE ID</Text>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            {/* Username */}
            <View style={ki$.nameRow}>
              {isFounder && <Ionicons name="star" size={14} color="#FFD700" />}
              <Text style={ki$.username}>{username}</Text>
            </View>

            {/* QR Code */}
            <View style={ki$.qrWrap}>
              <QRCode
                value={`arenakore://kore/${uid}`}
                size={QR_SIZE}
                color="#FFFFFF"
                backgroundColor="transparent"
              />
            </View>

            {/* User ID */}
            <Text style={ki$.uidLabel}>ID</Text>
            <Text style={ki$.uid}>{uid}</Text>

            {/* Stats Row */}
            <View style={ki$.statsRow}>
              <View style={ki$.stat}>
                <Text style={ki$.statValue}>{flux}</Text>
                <Text style={ki$.statLabel}>FLUX</Text>
              </View>
              <View style={ki$.statDivider} />
              <View style={ki$.stat}>
                <Text style={ki$.statValue}>{user?.total_scans || 0}</Text>
                <Text style={ki$.statLabel}>SCANS</Text>
              </View>
              <View style={ki$.statDivider} />
              <View style={ki$.stat}>
                <Text style={[ki$.statValue, { color: user?.is_nexus_certified ? '#00FF87' : '#FF9500' }]}>
                  {user?.is_nexus_certified ? 'YES' : 'NO'}
                </Text>
                <Text style={ki$.statLabel}>NEXUS</Text>
              </View>
            </View>

            {/* Scan instruction */}
            <Text style={ki$.hint}>Mostra questo QR ad un altro Kore o Coach per essere aggiunto.</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const ki$ = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, backgroundColor: '#0A0A0A', borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(0,229,255,0.15)', padding: 24, alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 8 },
  title: { color: '#00E5FF', fontSize: 14, fontWeight: '900', letterSpacing: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  username: { color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  qrWrap: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,229,255,0.1)', backgroundColor: 'rgba(0,229,255,0.03)', marginBottom: 16 },
  uidLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '800', letterSpacing: 3 },
  uid: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 16, ...Platform.select({ web: { fontFamily: 'monospace' }, default: {} }) },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { color: '#00E5FF', fontSize: 18, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.08)' },
  hint: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '400', textAlign: 'center', lineHeight: 15 },
});
