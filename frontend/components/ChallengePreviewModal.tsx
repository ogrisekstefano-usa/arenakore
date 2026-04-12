import Haptics from '../utils/haptics';
/**
 * ARENAKORE — CHALLENGE PREVIEW MODAL v1.0
 * Shows challenge details after QR scan, with "IMPORTA" button.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Platform,
  ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

const FONT_J = Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined });
const FONT_M = Platform.select({ web: 'Montserrat, sans-serif', default: undefined });

const TEMPLATE_COLORS: Record<string, string> = {
  AMRAP: '#FF3B30', EMOM: '#00E5FF', FOR_TIME: '#FFD700', TABATA: '#00FF87', CUSTOM: '#FF9500'
};

interface Props {
  visible: boolean;
  challengeData: any;
  onClose: () => void;
  onImported?: () => void;
}

export function ChallengePreviewModal({ visible, challengeData, onClose, onImported }: Props) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  if (!challengeData) return null;

  const color = TEMPLATE_COLORS[challengeData.template_type] || '#00E5FF';

  const handleImport = async () => {
    if (importing || imported) return;
    setImporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    try {
      const backendUrl = 'https://arenakore-api-v2.onrender.com';
      const res = await fetch(`${backendUrl}/api/ugc/${challengeData.id}/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setImported(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onImported?.();
      } else {
        Alert.alert('Info', data.status === 'already_imported' ? 'Sfida già importata!' : (data.detail || 'Errore'));
        if (data.status === 'already_imported') setImported(true);
      }
    } catch {
      Alert.alert('Errore', 'Connessione fallita');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={[s.backdrop, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animated.View entering={FadeIn.duration(300)} style={s.header}>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>PROTOCOLLO TROVATO</Text>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Main Card */}
          <Animated.View entering={FadeInDown.delay(150)}>
            <LinearGradient
              colors={[color + '10', '#0E0E0E', '#0A0A0A']}
              style={[s.card, { borderColor: color + '25' }]}
            >
              {/* Template + Discipline */}
              <View style={s.badgeRow}>
                <View style={[s.badge, { backgroundColor: color + '18', borderColor: color + '30' }]}>
                  <Text style={[s.badgeText, { color }]}>{challengeData.template_type}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }]}>
                  <Text style={[s.badgeText, { color: 'rgba(255,255,255,0.4)' }]}>{challengeData.discipline}</Text>
                </View>
              </View>

              {/* Title */}
              <Text style={[s.title, { color }]}>{challengeData.title}</Text>

              {/* Creator */}
              <View style={s.creatorRow}>
                <Ionicons name="person-circle" size={16} color={color + '60'} />
                <Text style={s.creatorText}>
                  Creata da <Text style={{ color, fontWeight: '800' }}>{challengeData.creator_name}</Text>
                  {challengeData.creator_level > 1 ? ` · LVL ${challengeData.creator_level}` : ''}
                </Text>
              </View>

              {/* Exercises */}
              <View style={s.exSection}>
                <Text style={s.exLabel}>ESERCIZI</Text>
                {(challengeData.exercises || []).map((ex: any, i: number) => (
                  <View key={i} style={s.exRow}>
                    <View style={[s.exNum, { backgroundColor: color + '15' }]}>
                      <Text style={[s.exNumText, { color }]}>{i + 1}</Text>
                    </View>
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
                  <Text style={[s.statVal, { color: '#FFD700' }]}>+{challengeData.flux_reward}⚡</Text>
                  <Text style={s.statLabel}>K-FLUX REWARD</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statBox}>
                  <Text style={[s.statVal, { color }]}>{challengeData.times_completed}</Text>
                  <Text style={s.statLabel}>COMPLETAMENTI</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Import Button */}
          <Animated.View entering={FadeInDown.delay(300)}>
            <TouchableOpacity
              style={[s.importBtn, imported ? s.importedBtn : { backgroundColor: color }]}
              onPress={handleImport}
              activeOpacity={0.8}
              disabled={importing || imported}
            >
              {importing ? (
                <ActivityIndicator color="#0A0A0A" />
              ) : imported ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#00FF87" />
                  <Text style={[s.importBtnText, { color: '#00FF87' }]}>IMPORTATA!</Text>
                </>
              ) : (
                <>
                  <Ionicons name="download" size={18} color="#0A0A0A" />
                  <Text style={s.importBtnText}>IMPORTA NEL LEDGER</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0A0A0A' },
  body: { paddingHorizontal: 16, paddingTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  closeBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFD700', fontSize: 16, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
  card: { borderRadius: 20, padding: 20, borderWidth: 1.5, marginBottom: 20 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },
  title: { fontSize: 26, fontWeight: '900', fontFamily: FONT_J, letterSpacing: 0.5, marginBottom: 8 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  creatorText: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '500', fontFamily: FONT_M },
  exSection: { marginBottom: 16 },
  exLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '800', letterSpacing: 2.5, fontFamily: FONT_M, marginBottom: 10 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  exNum: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  exNumText: { fontSize: 12, fontWeight: '900', fontFamily: FONT_J },
  exName: { flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '700', fontFamily: FONT_M },
  exDetail: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '800', fontFamily: FONT_J },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  statBox: { alignItems: 'center', gap: 3 },
  statVal: { fontSize: 20, fontWeight: '900', fontFamily: FONT_J },
  statLabel: { color: 'rgba(255,255,255,0.15)', fontSize: 8, fontWeight: '800', letterSpacing: 1.5, fontFamily: FONT_M },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.05)' },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 16 },
  importedBtn: { backgroundColor: 'rgba(0,255,135,0.08)', borderWidth: 1, borderColor: 'rgba(0,255,135,0.2)' },
  importBtnText: { color: '#0A0A0A', fontSize: 15, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J }
});
