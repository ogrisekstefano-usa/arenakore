/**
 * SHARE SHEET — Build 37 · Social Engine
 * ══════════════════════════════════════════════════
 * Bottom sheet modal with:
 * - Social Card preview (captured by ViewShot)
 * - CONDIVIDI button (native share sheet)
 * - SALVA IMMAGINE button
 * - Share analytics counter
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator,
  ScrollView, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, SlideInDown } from 'react-native-reanimated';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { SocialCardOverlay } from './SocialCardOverlay';
import type { SocialCardData } from './SocialCardOverlay';
import { useAuth } from '../contexts/AuthContext';
import { request as apiRequest } from '../utils/api';

const CYAN = '#00E5FF';
const GOLD = '#FFD700';
const GREEN = '#32D74B';
const FLUX_HEX: Record<string, string> = { green: GREEN, cyan: CYAN, gold: GOLD };

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  activityId: string;
}

export function ShareSheet({ visible, onClose, activityId }: ShareSheetProps) {
  const { token } = useAuth();
  const viewShotRef = useRef<ViewShot>(null);
  const [cardData, setCardData] = useState<SocialCardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate the social card data from backend
  useEffect(() => {
    if (visible && activityId && token) {
      setLoading(true);
      setError(null);
      setSaved(false);
      apiRequest('/social/generate-share', {
        method: 'POST',
        body: JSON.stringify({
          activity_id: activityId,
          card_type: 'social_card',
          include_qr: true,
          include_telemetry: false,
        }),
      }, token)
        .then((res: any) => {
          if (res?.share_id) {
            setCardData(res);
          } else {
            setError('Impossibile generare la card');
          }
        })
        .catch(() => setError('Errore di rete'))
        .finally(() => setLoading(false));
    }
  }, [visible, activityId, token]);

  const captureCard = useCallback(async (): Promise<string | null> => {
    try {
      if (!viewShotRef.current) return null;
      const uri = await (viewShotRef.current as any).capture();
      return uri;
    } catch (e) {
      console.warn('[ShareSheet] Capture failed:', e);
      return null;
    }
  }, []);

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const uri = await captureCard();
      if (!uri) {
        Alert.alert('Errore', 'Impossibile catturare la card');
        return;
      }

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Condivisione non disponibile', 'Il tuo dispositivo non supporta la condivisione.');
        return;
      }

      // On web, we might need a different approach
      if (Platform.OS === 'web') {
        // Try the Web Share API
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const file = new File([blob], `arenakore-${cardData?.share_id || 'card'}.png`, { type: 'image/png' });
          if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'ARENAKORE Challenge',
              text: `Prova questa sfida su ArenaKore! ${cardData?.deep_link || ''}`,
            });
          } else {
            // Fallback: open in new tab
            const link = document.createElement('a');
            link.href = uri;
            link.download = `arenakore-${cardData?.share_id || 'card'}.png`;
            link.click();
          }
        } catch (webErr) {
          console.warn('Web share failed:', webErr);
        }
      } else {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Condividi la tua sfida ARENAKORE',
        });
      }
    } catch (e) {
      console.warn('[ShareSheet] Share error:', e);
    } finally {
      setSharing(false);
    }
  }, [captureCard, cardData]);

  const handleSave = useCallback(async () => {
    try {
      const uri = await captureCard();
      if (!uri) {
        Alert.alert('Errore', 'Impossibile catturare la card');
        return;
      }

      if (Platform.OS === 'web') {
        // Download on web
        const link = document.createElement('a');
        link.href = uri;
        link.download = `arenakore-${cardData?.share_id || 'card'}.png`;
        link.click();
        setSaved(true);
      } else {
        // Save to file system for native
        const fileName = `arenakore_${cardData?.share_id || Date.now()}.png`;
        const destPath = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.copyAsync({ from: uri, to: destPath });
        setSaved(true);
        Alert.alert('Salvata!', 'La card è stata salvata.');
      }
    } catch (e) {
      console.warn('[ShareSheet] Save error:', e);
      Alert.alert('Errore', 'Impossibile salvare la card');
    }
  }, [captureCard, cardData]);

  const badgeColor = cardData ? FLUX_HEX[cardData.badge.color] || CYAN : CYAN;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={s.backdropTouch} onPress={onClose} activeOpacity={1} />

        <Animated.View entering={SlideInDown.duration(300)} style={s.sheet}>
          {/* Handle bar */}
          <View style={s.handleBar}>
            <View style={s.handle} />
          </View>

          {/* Header */}
          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <Ionicons name="share-social" size={16} color={GOLD} />
              <Text style={s.headerTitle}>CONDIVIDI RISULTATO</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Card Preview */}
            {loading ? (
              <View style={s.loadingBox}>
                <ActivityIndicator size="small" color={GOLD} />
                <Text style={s.loadingText}>Generazione card...</Text>
              </View>
            ) : error ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={24} color="#FF453A" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : cardData ? (
              <>
                <SocialCardOverlay data={cardData} viewShotRef={viewShotRef} />

                {/* Action Buttons */}
                <View style={s.actionsRow}>
                  <TouchableOpacity
                    style={[s.actionBtn, s.shareBtn, { borderColor: badgeColor + '30' }]}
                    onPress={handleShare}
                    activeOpacity={0.8}
                    disabled={sharing}
                  >
                    {sharing ? (
                      <ActivityIndicator size="small" color={badgeColor} />
                    ) : (
                      <>
                        <Ionicons name="share-social" size={18} color={badgeColor} />
                        <Text style={[s.actionBtnText, { color: badgeColor }]}>CONDIVIDI</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.actionBtn, s.saveBtn]}
                    onPress={handleSave}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={saved ? 'checkmark-circle' : 'download'}
                      size={18}
                      color={saved ? GREEN : 'rgba(255,255,255,0.5)'}
                    />
                    <Text style={[s.actionBtnText, { color: saved ? GREEN : 'rgba(255,255,255,0.5)' }]}>
                      {saved ? 'SALVATA' : 'SALVA'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Deep Link Info */}
                <View style={s.linkInfo}>
                  <Ionicons name="link" size={12} color="rgba(255,255,255,0.1)" />
                  <Text style={s.linkText} numberOfLines={1}>{cardData.deep_link}</Text>
                </View>
              </>
            ) : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%',
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  handleBar: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' },

  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: GOLD, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, alignItems: 'center', gap: 16 },

  loadingBox: { alignItems: 'center', gap: 10, paddingVertical: 60 },
  loadingText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '600' },
  errorBox: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  errorText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '600' },

  actionsRow: {
    flexDirection: 'row', gap: 12, width: '100%',
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1,
  },
  shareBtn: { backgroundColor: 'rgba(0,229,255,0.06)' },
  saveBtn: { borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' },
  actionBtnText: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },

  linkInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    width: '100%',
  },
  linkText: { color: 'rgba(255,255,255,0.1)', fontSize: 10, fontWeight: '600', flex: 1 },
});
