/**
 * NEXUS EVIDENCE BOX — Build 37
 * ═══════════════════════════════════
 * Mini Gallery: 3 screenshots from Puppet Motion Deck
 * Each image has a "NEXUS CERTIFIED" overlay watermark
 * Tappable to view full-size.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Modal,
  Dimensions, ScrollView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW } = Dimensions.get('window');
const CYAN = '#00E5FF';
const GOLD = '#FFD700';

interface NexusEvidenceBoxProps {
  screenshots: string[];   // base64 strings or URIs
  certified?: boolean;
}

export function NexusEvidenceBox({ screenshots, certified = true }: NexusEvidenceBoxProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (!screenshots || screenshots.length === 0) {
    return (
      <View style={s.emptyBox}>
        <Ionicons name="images-outline" size={24} color="rgba(255,255,255,0.08)" />
        <Text style={s.emptyText}>NESSUNA EVIDENZA NEXUS</Text>
      </View>
    );
  }

  const labels = ['START', 'PEAK', 'FINISH'];

  return (
    <>
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Ionicons name="scan" size={12} color={CYAN} />
            <Text style={s.headerTitle}>NEXUS EVIDENCE</Text>
          </View>
          {certified && (
            <View style={s.certBadge}>
              <Ionicons name="shield-checkmark" size={10} color={CYAN} />
              <Text style={s.certText}>CERTIFIED</Text>
            </View>
          )}
        </View>

        {/* Gallery Row */}
        <View style={s.galleryRow}>
          {screenshots.slice(0, 3).map((uri, idx) => (
            <TouchableOpacity
              key={idx}
              style={s.thumbWrapper}
              activeOpacity={0.8}
              onPress={() => setSelectedIdx(idx)}
            >
              <Image
                source={{ uri: uri.startsWith('data:') ? uri : `data:image/jpeg;base64,${uri}` }}
                style={s.thumb}
                resizeMode="cover"
              />
              {/* NEXUS CERTIFIED Overlay */}
              {certified && (
                <LinearGradient
                  colors={['transparent', 'rgba(0,229,255,0.12)', 'rgba(0,229,255,0.25)']}
                  style={s.certOverlay}
                >
                  <View style={s.certStamp}>
                    <Ionicons name="shield-checkmark" size={10} color={CYAN} />
                    <Text style={s.certStampText}>NÈXUS</Text>
                  </View>
                </LinearGradient>
              )}
              {/* Label */}
              <View style={s.labelBadge}>
                <Text style={s.labelText}>{labels[idx] || `#${idx + 1}`}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Full-Screen Viewer Modal */}
      <Modal visible={selectedIdx !== null} transparent animationType="fade">
        <View style={s.modalBg}>
          <TouchableOpacity style={s.modalClose} onPress={() => setSelectedIdx(null)}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          {selectedIdx !== null && (
            <Animated.View entering={ZoomIn.duration(300)} style={s.modalContent}>
              <Image
                source={{
                  uri: screenshots[selectedIdx]?.startsWith('data:')
                    ? screenshots[selectedIdx]
                    : `data:image/jpeg;base64,${screenshots[selectedIdx]}`
                }}
                style={s.modalImage}
                resizeMode="contain"
              />
              <View style={s.modalLabel}>
                <Text style={s.modalLabelText}>
                  {labels[selectedIdx]} · FRAME {selectedIdx + 1}/3
                </Text>
                {certified && (
                  <View style={s.modalCertBadge}>
                    <Ionicons name="shield-checkmark" size={14} color={CYAN} />
                    <Text style={s.modalCertText}>NEXUS CERTIFIED</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}
          {/* Dot indicators */}
          <View style={s.dotRow}>
            {screenshots.slice(0, 3).map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setSelectedIdx(i)}>
                <View style={[s.dot, i === selectedIdx && s.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,229,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.10)',
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { color: CYAN, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  certBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,229,255,0.08)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)',
  },
  certText: { color: CYAN, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  galleryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  thumbWrapper: {
    flex: 1,
    aspectRatio: 0.75,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.08)',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  certOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 6,
  },
  certStamp: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },
  certStampText: { color: CYAN, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  labelBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },
  labelText: { color: 'rgba(255,255,255,0.7)', fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
  emptyBox: {
    alignItems: 'center', gap: 6, paddingVertical: 24,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  emptyText: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '800', letterSpacing: 2 },

  // Modal
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalClose: {
    position: 'absolute', top: 60, right: 20, zIndex: 10,
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  modalContent: { width: SW - 32, alignItems: 'center', gap: 16 },
  modalImage: { width: SW - 40, height: SW * 1.2, borderRadius: 16 },
  modalLabel: { alignItems: 'center', gap: 8 },
  modalLabelText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  modalCertBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,229,255,0.08)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)',
  },
  modalCertText: { color: CYAN, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  dotRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotActive: { backgroundColor: CYAN, width: 20 },
});
