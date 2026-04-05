/**
 * ARENAKORE — CHALLENGE SHARE CARD v1.0
 * Nike-style snapshot PNG with QR Code for UGC challenge sharing.
 * Uses react-native-view-shot + react-native-qrcode-svg.
 */
import React, { useRef, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Share, Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const FONT_J = Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined });
const FONT_M = Platform.select({ web: 'Montserrat, sans-serif', default: undefined });

const TEMPLATE_COLORS: Record<string, string> = {
  AMRAP: '#FF3B30', EMOM: '#00E5FF', FOR_TIME: '#FFD700', TABATA: '#00FF87', CUSTOM: '#FF9500',
};
const TEMPLATE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  AMRAP: 'flame', EMOM: 'timer', FOR_TIME: 'speedometer', TABATA: 'pulse', CUSTOM: 'construct',
};

interface Props {
  visible: boolean;
  challenge: any;
  onClose: () => void;
}

export function ChallengeShareCard({ visible, challenge, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const viewRef = useRef<any>(null);
  const [sharing, setSharing] = useState(false);

  const color = challenge ? (TEMPLATE_COLORS[challenge.template_type] || '#00E5FF') : '#00E5FF';
  const icon = challenge ? (TEMPLATE_ICONS[challenge.template_type] || 'flash') : 'flash';
  const qrData = challenge ? `arenakore://challenge/${challenge._id || challenge.id}` : '';
  const exercises = challenge ? (challenge.exercises || []).map((e: any) => e.name).join(' · ') : '';

  const handleShare = useCallback(async () => {
    if (!challenge) return;
    setSharing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      if (Platform.OS === 'web') {
        await Share.share({
          message: `🔥 ${challenge.title} — Sfida creata su ARENAKORE!\n\nEsercizi: ${exercises}\nFLUX Reward: +${challenge.flux_reward}⚡\n\nScansiona il QR nell'app per importarla!`,
        });
      } else {
        const uri = await captureRef(viewRef, { format: 'png', quality: 0.9 });
        await Share.share({ url: uri, message: `🔥 ${challenge.title} — Sfida ARENAKORE` });
      }
    } catch (e) {
      // Fallback to text sharing
      await Share.share({
        message: `🔥 ${challenge.title}\n${exercises}\n+${challenge.flux_reward}⚡ FLUX\n\nSfida su ARENAKORE!`,
      });
    } finally {
      setSharing(false);
    }
  }, [challenge, exercises]);

  if (!challenge) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={s.backdrop}>
        {/* Close */}
        <TouchableOpacity style={[s.closeBtn, { top: insets.top + 10 }]} onPress={onClose}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>

        {/* Snapshot Card */}
        <ViewShot ref={viewRef} options={{ format: 'png', quality: 0.9 }} style={s.cardWrap}>
          <LinearGradient colors={['#0A0A0A', '#111111', '#0A0A0A']} style={s.card}>
            {/* Top badge */}
            <View style={s.topRow}>
              <View style={[s.templateBadge, { backgroundColor: color + '18', borderColor: color + '30' }]}>
                <Ionicons name={icon} size={14} color={color} />
                <Text style={[s.templateText, { color }]}>{challenge.template_type}</Text>
              </View>
              {challenge.discipline && (
                <View style={s.disciplineBadge}>
                  <Text style={s.disciplineText}>{challenge.discipline?.toUpperCase()}</Text>
                </View>
              )}
            </View>

            {/* Title */}
            <Text style={[s.title, { color }]}>{challenge.title}</Text>

            {/* Creator */}
            <View style={s.creatorRow}>
              <Ionicons name="person" size={10} color="rgba(255,255,255,0.3)" />
              <Text style={s.creatorText}>
                by {challenge.creator_name || challenge.original_creator || 'Kore'}
              </Text>
            </View>

            {/* Exercises */}
            <View style={s.exSection}>
              <Text style={s.exLabel}>ESERCIZI</Text>
              {(challenge.exercises || []).slice(0, 6).map((ex: any, i: number) => (
                <View key={i} style={s.exRow}>
                  <View style={[s.exDot, { backgroundColor: color }]} />
                  <Text style={s.exName}>{ex.name}</Text>
                  <Text style={s.exDetail}>
                    {ex.target_reps > 0 ? `${ex.target_reps} reps` : `${ex.target_seconds}s`}
                  </Text>
                </View>
              ))}
            </View>

            {/* Stats */}
            <View style={s.statsRow}>
              <View style={s.statBox}>
                <Text style={[s.statVal, { color: '#FFD700' }]}>+{challenge.flux_reward}⚡</Text>
                <Text style={s.statLabel}>FLUX REWARD</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statBox}>
                <Text style={[s.statVal, { color }]}>{challenge.times_completed || 0}</Text>
                <Text style={s.statLabel}>COMPLETAMENTI</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statBox}>
                <Text style={[s.statVal, { color: '#FF9500' }]}>{challenge.times_shared || 0}</Text>
                <Text style={s.statLabel}>CONDIVISIONI</Text>
              </View>
            </View>

            {/* QR Code */}
            <View style={s.qrSection}>
              <View style={s.qrBox}>
                <QRCode
                  value={qrData}
                  size={120}
                  color={color}
                  backgroundColor="transparent"
                />
              </View>
              <Text style={s.qrHint}>Scansiona per importare questa sfida</Text>
            </View>

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.footerLogo}>ARENA</Text>
              <Text style={[s.footerKore, { color }]}>KORE</Text>
            </View>
          </LinearGradient>
        </ViewShot>

        {/* Share Button */}
        <TouchableOpacity
          style={[s.shareBtn, { backgroundColor: color }]}
          onPress={handleShare}
          activeOpacity={0.8}
          disabled={sharing}
        >
          {sharing ? (
            <ActivityIndicator color="#0A0A0A" />
          ) : (
            <>
              <Ionicons name="share-outline" size={18} color="#0A0A0A" />
              <Text style={s.shareBtnText}>CONDIVIDI SFIDA</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  closeBtn: { position: 'absolute', right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  cardWrap: { width: '100%', maxWidth: 340 },
  card: { borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  templateBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  templateText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },
  disciplineBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  disciplineText: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, fontFamily: FONT_M },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: 0.5, fontFamily: FONT_J, marginBottom: 6 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 20 },
  creatorText: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '600', fontFamily: FONT_M },
  exSection: { marginBottom: 18 },
  exLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '800', letterSpacing: 2.5, fontFamily: FONT_M, marginBottom: 8 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  exDot: { width: 6, height: 6, borderRadius: 3 },
  exName: { flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', fontFamily: FONT_M },
  exDetail: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '800', fontFamily: FONT_J },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  statBox: { alignItems: 'center', gap: 2 },
  statVal: { fontSize: 18, fontWeight: '900', fontFamily: FONT_J },
  statLabel: { color: 'rgba(255,255,255,0.15)', fontSize: 7, fontWeight: '800', letterSpacing: 1.5, fontFamily: FONT_M },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.05)' },
  qrSection: { alignItems: 'center', marginBottom: 16 },
  qrBox: { padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 8 },
  qrHint: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '600', fontFamily: FONT_M },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  footerLogo: { color: 'rgba(255,255,255,0.15)', fontSize: 16, fontWeight: '900', letterSpacing: 4, fontFamily: FONT_J },
  footerKore: { fontSize: 16, fontWeight: '900', letterSpacing: 4, fontFamily: FONT_J },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 16, width: '100%', maxWidth: 340 },
  shareBtnText: { color: '#0A0A0A', fontSize: 15, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
});
