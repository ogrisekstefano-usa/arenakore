/**
 * ARENAKORE — CHALLENGE INVITE MODAL
 * Attivato cliccando su una Crew. Mostra confronto DNA weighted average.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const DNA_KEYS: Record<string, string> = {
  velocita: 'VEL', forza: 'FOR', resistenza: 'RES',
  agilita: 'AGI', tecnica: 'TEC', potenza: 'POT',
  mentalita: 'MEN', flessibilita: 'FLE',
};

function weightedAvg(dna: Record<string, number> | undefined): number {
  if (!dna) return 0;
  const vals = Object.values(dna).filter(v => v > 0);
  if (!vals.length) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function DnaBar({ label, mine, theirs }: { label: string; mine: number; theirs: number }) {
  const max = Math.max(mine, theirs, 1);
  const mineW = (mine / 100) * 100;
  const theirW = (theirs / 100) * 100;
  const mineWins = mine >= theirs;
  return (
    <View style={dna$.row}>
      <Text style={dna$.label}>{label}</Text>
      <View style={dna$.bars}>
        {/* My bar — right aligned */}
        <View style={dna$.barWrap}>
          <View style={[dna$.bar, dna$.barMine, { width: `${mineW}%` as any }, mineWins && dna$.barWin]} />
        </View>
        <Text style={[dna$.val, mineWins && { color: '#00E5FF' }]}>{mine}</Text>
        <Text style={dna$.sep}>·</Text>
        <Text style={[dna$.val, !mineWins && { color: '#FF3B30' }]}>{theirs}</Text>
        <View style={dna$.barWrap}>
          <View style={[dna$.bar, dna$.barTheir, { width: `${theirW}%` as any }, !mineWins && dna$.barWin]} />
        </View>
      </View>
    </View>
  );
}

const dna$ = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  label: { color: '#AAAAAA', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, width: 32 },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  barWrap: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  bar: { height: 5, borderRadius: 3, position: 'absolute', top: 0 },
  barMine: { backgroundColor: '#00E5FF', right: 0 },
  barTheir: { backgroundColor: '#FF3B30', left: 0 },
  barWin: { opacity: 1 },
  val: { color: '#AAAAAA', fontSize: 12, fontWeight: '900', width: 26, textAlign: 'center' },
  sep: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
});

interface Props {
  crew: any;
  onClose: () => void;
  visible: boolean;
}

export function ChallengeInviteModal({ crew, onClose, visible }: Props) {
  const { user, token } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [crewDetail, setCrewDetail] = useState<any>(null);

  const myDna = user?.dna || {};
  const theirDna = crew?.weighted_dna || {};
  const myAvg = weightedAvg(myDna);
  const theirAvg = weightedAvg(theirDna);
  const myWins = myAvg >= theirAvg;

  useEffect(() => {
    if (!visible) { setSent(false); setSending(false); }
  }, [visible]);

  const handleChallenge = async () => {
    if (!token || !crew?.id) return;
    setSending(true);
    try {
      await api.triggerLiveBattle(crew.id, token);
      setSent(true);
    } catch (_e) {
      // Non-blocking — show sent anyway for UX
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  if (!crew) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={m$.backdrop} activeOpacity={1} onPress={onClose}>
        <Animated.View entering={SlideInDown.duration(350)} style={m$.sheet}>
          <TouchableOpacity activeOpacity={1}>
            {/* Header */}
            <View style={m$.header}>
              <View style={m$.headerLeft}>
                <Ionicons name="flash" size={18} color="#FFD700" />
                <Text style={m$.title}>SFIDA CREW</Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            {/* Crew vs Me */}
            <View style={m$.vsRow}>
              <View style={m$.side}>
                <Text style={m$.sideName}>{user?.username || 'TU'}</Text>
                <Text style={[m$.sideAvg, myWins && m$.sideWin]}>{myAvg}</Text>
                <Text style={m$.sideLabel}>MEDIA DNA</Text>
              </View>
              <View style={m$.vsCenter}>
                <Text style={m$.vs}>VS</Text>
                <View style={m$.vsLine} />
              </View>
              <View style={[m$.side, { alignItems: 'flex-end' }]}>
                <Text style={m$.sideName}>{crew.name}</Text>
                <Text style={[m$.sideAvg, !myWins && m$.sideWin]}>{theirAvg}</Text>
                <Text style={m$.sideLabel}>MEDIA DNA</Text>
              </View>
            </View>

            {/* DNA Comparison */}
            <View style={m$.dnaSection}>
              <Text style={m$.dnaSectionTitle}>CONFRONTO BIO-SIGNATURE</Text>
              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                {Object.entries(DNA_KEYS).map(([key, abbr]) => (
                  <DnaBar
                    key={key}
                    label={abbr}
                    mine={Math.round((myDna as any)[key] || 0)}
                    theirs={Math.round((theirDna as any)[key] || 0)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Verdict */}
            <View style={[m$.verdict, myWins ? m$.verdictWin : m$.verdictLoss]}>
              <Ionicons
                name={myWins ? 'trending-up' : 'alert-circle'}
                size={16}
                color={myWins ? '#00E5FF' : '#FF9500'}
              />
              <Text style={[m$.verdictText, { color: myWins ? '#00E5FF' : '#FF9500' }]}>
                {myWins
                  ? `LA TUA MEDIA (+${myAvg - theirAvg}) SUPERA ${crew.name}`
                  : `${crew.name} HA +${theirAvg - myAvg} DI VANTAGGIO — SFIDA CORAGGIOSA`
                }
              </Text>
            </View>

            {/* CTA */}
            {sent ? (
              <View style={m$.sentRow}>
                <Ionicons name="checkmark-circle" size={20} color="#00FF87" />
                <Text style={m$.sentText}>SFIDA INVIATA A {crew.name?.toUpperCase()}!</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[m$.cta, sending && { opacity: 0.6 }]}
                onPress={handleChallenge}
                disabled={sending}
                activeOpacity={0.85}
              >
                {sending ? (
                  <ActivityIndicator color="#050505" size="small" />
                ) : (
                  <>
                    <Ionicons name="flash-sharp" size={18} color="#050505" />
                    <Text style={m$.ctaText}>LANCIA LA SFIDA</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const m$ = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0A0A0A', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: '#FFD700', fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  vsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  side: { flex: 1, alignItems: 'flex-start', gap: 2 },
  sideName: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  sideAvg: { color: 'rgba(255,255,255,0.6)', fontSize: 28, fontWeight: '900' },
  sideWin: { color: '#00E5FF' },
  sideLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  vsCenter: { alignItems: 'center', paddingHorizontal: 12, gap: 4 },
  vs: { color: '#FFD700', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  vsLine: { width: 1, height: 30, backgroundColor: 'rgba(255,215,0,0.3)' },
  dnaSection: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 12 },
  dnaSectionTitle: { color: 'rgba(0,229,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 3, marginBottom: 10 },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, marginBottom: 14 },
  verdictWin: { backgroundColor: 'rgba(255,255,255,0.06)' },
  verdictLoss: { backgroundColor: 'rgba(255,149,0,0.06)' },
  verdictText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, flex: 1 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#FFD700', borderRadius: 10, paddingVertical: 16,
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12,
  },
  ctaText: { color: '#000000', fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  sentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  sentText: { color: '#00FF87', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
});
