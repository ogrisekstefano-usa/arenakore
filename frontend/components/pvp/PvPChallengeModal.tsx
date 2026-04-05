/**
 * ARENAKORE — PvP CHALLENGE MODAL
 * Send a 1v1 challenge: choose discipline + FLUX stake
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const DISCIPLINES = [
  { key: 'power',     label: 'POWER',     sub: 'Squat · 30s · Forza & Potenza',    icon: 'barbell' as const,    color: '#FF3B30' },
  { key: 'agility',   label: 'AGILITY',   sub: 'Punch · 30s · Velocità & Agilità',  icon: 'hand-left' as const,  color: '#00E5FF' },
  { key: 'endurance', label: 'ENDURANCE', sub: 'Squat · 60s · Resistenza massima', icon: 'timer' as const,      color: '#FFD700' },
];

const STAKES = [
  { xp: 50,  label: '50 FLUX',  sub: 'Partita amichevole' },
  { xp: 100, label: '100 FLUX', sub: 'Standard' },
  { xp: 200, label: '200 FLUX', sub: 'Alta posta' },
  { xp: 500, label: '500 FLUX', sub: 'All-in KORE' },
];

interface Props {
  visible: boolean;
  opponent: { id: string; username: string; xp?: number; level?: number } | null;
  onClose: () => void;
  onChallengeSent?: () => void;
}

export function PvPChallengeModal({ visible, opponent, onClose, onChallengeSent }: Props) {
  const { token, user } = useAuth();
  const [discipline, setDiscipline] = useState('power');
  const [stake, setStake] = useState(100);
  const [sending, setSending] = useState(false);

  if (!opponent) return null;

  const selectedDisc = DISCIPLINES.find(d => d.key === discipline)!;
  const canAfford = (user?.xp || 0) >= stake;

  const handleSend = async () => {
    if (!token) return;
    if (!canAfford) {
      Alert.alert('XP INSUFFICIENTI', `Ti servono ${stake} XP. Hai ${user?.xp || 0} FLUX.`);
      return;
    }
    setSending(true);
    try {
      await api.sendPvPChallenge(opponent.id, discipline, stake, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        'SFIDA INVIATA',
        `${opponent.username} ha ricevuto la tua sfida ${selectedDisc.label}!\n${stake} FLUX in palio.`,
        [{ text: 'OK', onPress: () => { onClose(); onChallengeSent?.(); } }]
      );
    } catch (e: any) {
      Alert.alert('ERRORE', e?.message || 'Impossibile inviare la sfida');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={m$.backdrop} activeOpacity={1} onPress={onClose}>
        <Animated.View entering={SlideInDown.duration(350)} style={m$.sheet}>
          <TouchableOpacity activeOpacity={1}>
            {/* Header */}
            <View style={m$.header}>
              <View style={m$.headerLeft}>
                <Ionicons name="flash-sharp" size={18} color="#FF3B30" />
                <Text style={m$.title}>SFIDA PVP</Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            {/* FACE-OFF */}
            <View style={m$.faceOff}>
              {/* My side */}
              <View style={m$.faceCard}>
                <View style={[m$.faceAvatar, { backgroundColor: '#00E5FF' }]}>
                  <Text style={m$.faceLetter}>{(user?.username || 'TU')[0].toUpperCase()}</Text>
                </View>
                <Text style={m$.faceName} numberOfLines={1}>{(user?.username || 'TU').toUpperCase()}</Text>
                <Text style={m$.faceXp}>{user?.xp?.toLocaleString()} FLUX</Text>
              </View>

              {/* VS */}
              <View style={m$.faceVs}>
                <Text style={m$.vsText}>VS</Text>
              </View>

              {/* Opponent */}
              <View style={[m$.faceCard, { alignItems: 'flex-end' }]}>
                <View style={[m$.faceAvatar, { backgroundColor: '#FF3B30' }]}>
                  <Text style={m$.faceLetter}>{opponent.username[0].toUpperCase()}</Text>
                </View>
                <Text style={m$.faceName} numberOfLines={1}>{opponent.username.toUpperCase()}</Text>
                <Text style={m$.faceXp}>{opponent.xp?.toLocaleString() || '?'} FLUX</Text>
              </View>
            </View>

            {/* Discipline selector */}
            <Text style={m$.sectionLabel}>DISCIPLINA</Text>
            {DISCIPLINES.map(d => (
              <TouchableOpacity
                key={d.key}
                style={[m$.discCard, discipline === d.key && { borderColor: d.color, backgroundColor: d.color + '10' }]}
                onPress={() => setDiscipline(d.key)}
                activeOpacity={0.8}
              >
                <Ionicons name={d.icon} size={20} color={discipline === d.key ? d.color : 'rgba(255,255,255,0.35)'} />
                <View style={m$.discInfo}>
                  <Text style={[m$.discLabel, discipline === d.key && { color: d.color }]}>{d.label}</Text>
                  <Text style={m$.discSub}>{d.sub}</Text>
                </View>
                {discipline === d.key && (
                  <Ionicons name="checkmark-circle" size={16} color={d.color} />
                )}
              </TouchableOpacity>
            ))}

            {/* Stake selector */}
            <Text style={m$.sectionLabel}>POSTA IN GIOCO</Text>
            <View style={m$.stakesRow}>
              {STAKES.map(s => (
                <TouchableOpacity
                  key={s.xp}
                  style={[
                    m$.stakeBtn,
                    stake === s.xp && m$.stakeBtnActive,
                    (user?.xp || 0) < s.xp && m$.stakeBtnDisabled,
                  ]}
                  onPress={() => setStake(s.xp)}
                  activeOpacity={0.8}
                >
                  <Text style={[m$.stakeXp, stake === s.xp && { color: '#FFD700' }]}>{s.label}</Text>
                  <Text style={m$.stakeSub}>{s.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Warning */}
            {!canAfford && (
              <View style={m$.warningRow}>
                <Ionicons name="warning" size={12} color="#FF9500" />
                <Text style={m$.warningText}>FLUX insufficienti per questa posta</Text>
              </View>
            )}

            {/* CTA */}
            <TouchableOpacity
              style={[m$.cta, (sending || !canAfford) && m$.ctaDisabled]}
              onPress={handleSend}
              disabled={sending || !canAfford}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator color="#050505" size="small" />
              ) : (
                <>
                  <Ionicons name="flash-sharp" size={18} color="#050505" />
                  <Text style={m$.ctaText}>LANCIA LA SFIDA · {stake} FLUX</Text>
                </>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const m$ = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#000000', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)'
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: '#FF3B30', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  // Face-off
  faceOff: { flexDirection: 'row', alignItems: 'center', marginBottom: 22, paddingVertical: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)' },
  faceCard: { flex: 1, alignItems: 'flex-start', paddingHorizontal: 24, gap: 6 },
  faceAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  faceLetter: { color: '#000000', fontSize: 26, fontWeight: '900' },
  faceName: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  faceXp: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '300', letterSpacing: 1 },
  faceVs: { alignItems: 'center', justifyContent: 'center', width: 44 },
  vsText: { color: '#FFD700', fontSize: 20, fontWeight: '900', letterSpacing: 4 },
  // Legacy (cleanup)
  opponentRow: { display: 'none' },
  opponentAvatar: { display: 'none' },
  opponentLetter: { color: 'transparent' },
  opponentInfo: { display: 'none' },
  opponentName: { color: 'transparent' },
  opponentMeta: { color: 'transparent' },
  vsBadge: { display: 'none' },
  myInfo: { display: 'none' },
  // Section labels
  sectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 10, marginTop: 4 },
  discCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 8
  },
  discInfo: { flex: 1 },
  discLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },
  discSub: { color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: '300', marginTop: 2 },
  stakesRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stakeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)'
  },
  stakeBtnActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.08)' },
  stakeBtnDisabled: { opacity: 0.3 },
  stakeXp: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  stakeSub: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '300', letterSpacing: 0.5, textAlign: 'center', marginTop: 2 },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  warningText: { color: '#FF9500', fontSize: 14, fontWeight: '700' },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#FF3B30', borderRadius: 12, paddingVertical: 16, marginTop: 4
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 2 }
});
