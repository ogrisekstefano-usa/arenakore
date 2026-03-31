/**
 * ARENAKORE — PvP CHALLENGE MODAL
 * Send a 1v1 challenge: choose discipline + XP stake
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const DISCIPLINES = [
  { key: 'power',     label: 'POWER',     sub: 'Squat · 30s · Forza & Potenza',    icon: 'barbell' as const,    color: '#FF453A' },
  { key: 'agility',   label: 'AGILITY',   sub: 'Punch · 30s · Velocità & Agilità',  icon: 'hand-left' as const,  color: '#00F2FF' },
  { key: 'endurance', label: 'ENDURANCE', sub: 'Squat · 60s · Resistenza massima', icon: 'timer' as const,      color: '#D4AF37' },
];

const STAKES = [
  { xp: 50,  label: '50 XP',  sub: 'Partita amichevole' },
  { xp: 100, label: '100 XP', sub: 'Standard' },
  { xp: 200, label: '200 XP', sub: 'Alta posta' },
  { xp: 500, label: '500 XP', sub: 'All-in KORE' },
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
      Alert.alert('XP INSUFFICIENTI', `Ti servono ${stake} XP. Hai ${user?.xp || 0} XP.`);
      return;
    }
    setSending(true);
    try {
      await api.sendPvPChallenge(opponent.id, discipline, stake, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        'SFIDA INVIATA',
        `${opponent.username} ha ricevuto la tua sfida ${selectedDisc.label}!\n${stake} XP in palio.`,
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
                <Ionicons name="flash-sharp" size={18} color="#FF453A" />
                <Text style={m$.title}>SFIDA PVP</Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            {/* Opponent */}
            <View style={m$.opponentRow}>
              <View style={m$.opponentAvatar}>
                <Text style={m$.opponentLetter}>{opponent.username[0].toUpperCase()}</Text>
              </View>
              <View style={m$.opponentInfo}>
                <Text style={m$.opponentName}>{opponent.username.toUpperCase()}</Text>
                <Text style={m$.opponentMeta}>LVL {opponent.level || 1} · {opponent.xp?.toLocaleString() || '0'} XP</Text>
              </View>
              <View style={m$.vsBadge}><Text style={m$.vsText}>VS</Text></View>
              <View style={m$.myInfo}>
                <Text style={m$.opponentName}>{(user?.username || 'TU').toUpperCase()}</Text>
                <Text style={m$.opponentMeta}>LVL {user?.level || 1} · {user?.xp?.toLocaleString() || '0'} XP</Text>
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
                  <Text style={[m$.stakeXp, stake === s.xp && { color: '#D4AF37' }]}>{s.label}</Text>
                  <Text style={m$.stakeSub}>{s.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Warning */}
            {!canAfford && (
              <View style={m$.warningRow}>
                <Ionicons name="warning" size={12} color="#FF9500" />
                <Text style={m$.warningText}>XP insufficienti per questa posta</Text>
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
                  <Text style={m$.ctaText}>LANCIA LA SFIDA · {stake} XP</Text>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0A0A0A', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, borderWidth: 1.5, borderColor: 'rgba(255,69,58,0.25)',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: '#FF453A', fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  opponentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12 },
  opponentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00F2FF', alignItems: 'center', justifyContent: 'center' },
  opponentLetter: { color: '#050505', fontSize: 18, fontWeight: '900' },
  opponentInfo: { flex: 1 },
  opponentName: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  opponentMeta: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '400' },
  vsBadge: { paddingHorizontal: 8 },
  vsText: { color: '#D4AF37', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  myInfo: { flex: 1, alignItems: 'flex-end' },
  sectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 10, marginTop: 4 },
  discCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 8,
  },
  discInfo: { flex: 1 },
  discLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  discSub: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '400', marginTop: 2 },
  stakesRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stakeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  stakeBtnActive: { borderColor: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.08)' },
  stakeBtnDisabled: { opacity: 0.35 },
  stakeXp: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  stakeSub: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '400', letterSpacing: 0.5, textAlign: 'center', marginTop: 2 },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  warningText: { color: '#FF9500', fontSize: 12, fontWeight: '700' },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#FF453A', borderRadius: 12, paddingVertical: 16, marginTop: 4,
    shadowColor: '#FF453A', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: '#050505', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
});
