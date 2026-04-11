import Haptics from '../../utils/haptics';
/**
 * ARENAKORE — PvP PENDING CARD
 * Shows pending/active PvP challenges in NEXUS console
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const DISC_COLORS: Record<string, string> = { power: '#FF3B30', agility: '#00E5FF', endurance: '#FFD700' };
const DISC_ICONS: Record<string, any> = { power: 'barbell', agility: 'hand-left', endurance: 'timer' };

export function PvPPendingCard() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await api.getPvPPending(token);
      setData(d);
    } catch (_) {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return null;

  const received = data?.received || [];
  const active = data?.active || [];
  const sent = (data?.sent || []).slice(0, 2);

  if (!received.length && !active.length && !sent.length) return null;

  const handleAccept = async (id: string) => {
    if (!token) return;
    setActioning(id);
    try {
      await api.acceptPvPChallenge(id, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      load();
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Impossibile accettare');
    } finally { setActioning(null); }
  };

  const handleDecline = async (id: string) => {
    if (!token) return;
    setActioning(id);
    try {
      await api.declinePvPChallenge(id, token);
      load();
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Impossibile rifiutare');
    } finally { setActioning(null); }
  };

  const handleStartScan = (challengeId: string) => {
    router.push({ pathname: '/(tabs)/nexus-trigger', params: { pvpChallengeId: challengeId } });
  };

  return (
    <View style={p$.section}>
      <View style={p$.sectionHeader}>
        <View style={p$.dot} />
        <Text style={p$.sectionTitle}>SFIDE PVP</Text>
        {(received.length + active.length) > 0 && (
          <View style={p$.badgeCount}>
            <Text style={p$.badgeText}>{received.length + active.length}</Text>
          </View>
        )}
      </View>

      {/* Received challenges */}
      {received.map((ch: any, idx: number) => (
        <Animated.View key={ch.id} entering={FadeInDown.delay(idx * 60).duration(250)} style={p$.card}>
          <View style={[p$.disciplineBar, { backgroundColor: DISC_COLORS[ch.discipline] + '20', borderColor: DISC_COLORS[ch.discipline] + '40' }]}>
            <Ionicons name={DISC_ICONS[ch.discipline] || 'flash'} size={12} color={DISC_COLORS[ch.discipline]} />
            <Text style={[p$.disciplineText, { color: DISC_COLORS[ch.discipline] }]}>{ch.discipline_label}</Text>
            <View style={p$.stakePill}><Text style={p$.stakeText}>{ch.xp_stake} FLUX</Text></View>
          </View>
          <View style={p$.cardBody}>
            <Text style={p$.challengerName}>{ch.challenger_username.toUpperCase()}</Text>
            <Text style={p$.cardSub}>ti ha sfidato in {ch.discipline_label}</Text>
          </View>
          <View style={p$.actionsRow}>
            <TouchableOpacity
              style={p$.acceptBtn}
              onPress={() => handleAccept(ch.id)}
              disabled={actioning === ch.id}
            >
              {actioning === ch.id ? <ActivityIndicator color="#050505" size="small" /> : <Text style={p$.acceptText}>ACCETTA</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={p$.declineBtn} onPress={() => handleDecline(ch.id)} disabled={actioning === ch.id}>
              <Text style={p$.declineText}>RIFIUTA</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      ))}

      {/* Active challenges — user's turn to scan */}
      {active.map((ch: any, idx: number) => {
        const myRole = ch.challenger_id === user?.id ? 'challenger' : 'challenged';
        const myResult = myRole === 'challenger' ? ch.challenger_result : ch.challenged_result;
        const canScan = !myResult && (ch.status === 'accepted' || (ch.status === 'challenger_done' && myRole === 'challenged'));
        return (
          <Animated.View key={ch.id} entering={FadeInDown.delay(idx * 60).duration(250)} style={p$.activeCard}>
            <View style={p$.activeHeader}>
              <Ionicons name="flash" size={12} color="#FF3B30" />
              <Text style={p$.activeLabel}>SFIDA ATTIVA</Text>
              <View style={p$.discPill}>
                <Text style={[p$.discPillText, { color: DISC_COLORS[ch.discipline] }]}>{ch.discipline_label}</Text>
              </View>
            </View>
            <Text style={p$.opponentText}>
              vs {myRole === 'challenger' ? ch.challenged_username : ch.challenger_username}
            </Text>
            {ch.status === 'challenger_done' && myRole === 'challenged' && (
              <View style={p$.ghostAvail}>
                <Ionicons name="eye" size={10} color="rgba(0,229,255,0.7)" />
                <Text style={p$.ghostAvailText}>GHOST DISPONIBILE — vedi il risultato del rivale</Text>
              </View>
            )}
            {canScan ? (
              <TouchableOpacity style={p$.scanBtn} onPress={() => handleStartScan(ch.id)} activeOpacity={0.85}>
                <Ionicons name="scan" size={14} color="#050505" />
                <Text style={p$.scanBtnText}>INIZIA IL TUO SCAN</Text>
              </TouchableOpacity>
            ) : myResult ? (
              <View style={p$.waitingRow}>
                <Ionicons name="time" size={12} color="rgba(255,255,255,0.3)" />
                <Text style={p$.waitingText}>Attendi il risultato dell'avversario...</Text>
              </View>
            ) : null}
          </Animated.View>
        );
      })}

      {/* Sent (waiting for response) */}
      {sent.map((ch: any) => (
        <View key={ch.id} style={p$.sentRow}>
          <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.3)" />
          <Text style={p$.sentText}>
            Sfida inviata a {ch.challenged_username} · {ch.discipline_label} · {ch.xp_stake} XP
          </Text>
        </View>
      ))}
    </View>
  );
}

const p$ = StyleSheet.create({
  section: { marginTop: 10, marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, marginBottom: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FF3B30' },
  sectionTitle: { flex: 1, color: '#AAAAAA', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  badgeCount: { backgroundColor: '#FF3B30', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  card: { marginHorizontal: 24, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)', gap: 8 },
  disciplineBar: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  disciplineText: { flex: 1, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  stakePill: { backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  stakeText: { color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  cardBody: { gap: 2 },
  challengerName: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  cardSub: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '400' },
  actionsRow: { flexDirection: 'row', gap: 8 },
  acceptBtn: { flex: 1, backgroundColor: '#00E5FF', borderRadius: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', minHeight: 38 },
  acceptText: { color: '#000000', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
  declineBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  declineText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  activeCard: { marginHorizontal: 24, marginBottom: 8, backgroundColor: 'rgba(255,59,48,0.06)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,59,48,0.25)', gap: 6 },
  activeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeLabel: { flex: 1, color: '#FF3B30', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  discPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(255,255,255,0.06)' },
  discPillText: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  opponentText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '700' },
  ghostAvail: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,229,255,0.06)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  ghostAvailText: { color: 'rgba(0,229,255,0.7)', fontSize: 13, fontWeight: '700' },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF3B30', borderRadius: 10, paddingVertical: 12 },
  scanBtnText: { color: '#000000', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  waitingText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '400' },
  sentRow: { marginHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  sentText: { color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: '400' }
});
