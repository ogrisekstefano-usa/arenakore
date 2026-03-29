/**
 * ARENAKORE — PRIVACY SHIELD
 * Three pillars: On-Device Analysis, Data Encryption, Zero-Marketing
 * Ghost Mode toggle + Biometric Wipe button
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Alert, Switch, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const CYAN = '#00F2FF';
const GOLD = '#D4AF37';
const BG   = '#050505';

const PILLARS = [
  {
    icon: 'phone-portrait-outline' as const,
    color: CYAN,
    title: 'ON-DEVICE ANALYSIS',
    desc: 'Elaborazione biometrica 100% locale. Il tuo DNA score non lascia mai il dispositivo durante la scansione. Solo vettori numerici anonimi sono sincronizzati.',
  },
  {
    icon: 'lock-closed' as const,
    color: GOLD,
    title: 'DATA ENCRYPTION',
    desc: 'Tutti i dati trasmessi usano crittografia AES-256. Le password sono hashate con bcrypt (irreversibile). Zero MD5, zero plaintext storage.',
  },
  {
    icon: 'shield-checkmark' as const,
    color: '#32D74B',
    title: 'ZERO-MARKETING POLICY',
    desc: 'I tuoi dati non vengono mai venduti o ceduti a terzi. ARENAKORE non usa analytics di terze parti. Nessun cookie di tracciamento.',
  },
];

export default function PrivacyShield() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token, updateUser } = useAuth();

  // ── Read initial ghost_mode directly from AuthContext user (now typed correctly)
  const [ghostMode, setGhostMode] = useState<boolean>(Boolean(user?.ghost_mode));
  const [ghostLoading, setGhostLoading] = useState(false);
  const [wipingData, setWipingData] = useState(false);

  const handleGhostToggle = useCallback(async (val: boolean) => {
    if (!token || !user) return;
    setGhostLoading(true);
    // 1. Optimistic local state update (instant UI feedback)
    setGhostMode(val);
    // 2. Immediately update AuthContext so City Ranking reacts on next focus
    updateUser({ ...user, ghost_mode: val });
    try {
      // 3. Persist to backend
      await api.toggleGhostMode(val, token);
      // No refreshUser() needed — we already updated via updateUser()
    } catch (_e) {
      // Revert both local state AND AuthContext on error
      setGhostMode(!val);
      updateUser({ ...user, ghost_mode: !val });
    } finally {
      setGhostLoading(false);
    }
  }, [token, user, updateUser]);

  const handleWipe = useCallback(() => {
    Alert.alert(
      'ELIMINA DATI BIOMETRICI',
      'Questa azione cancellerà permanentemente il tuo DNA Score, le bio-scan history e i permessi camera/mic. Il profilo base (nome, XP, livello) rimarrà intatto.\n\nAzione IRREVERSIBILE.',
      [
        { text: 'ANNULLA', style: 'cancel' },
        {
          text: 'ELIMINA',
          style: 'destructive',
          onPress: async () => {
            if (!token || !user) return;
            setWipingData(true);
            try {
              const result = await api.wipeBiometricData(token);
              // Update AuthContext immediately with wiped user data
              if (result?.user) {
                updateUser(result.user);
              } else {
                updateUser({ ...user, dna: undefined, camera_enabled: false, mic_enabled: false });
              }
              Alert.alert('COMPLETATO', 'DATI BIOMETRICI ELIMINATI. PROFILO BASE MANTENUTO.');
            } catch (_e) {
              Alert.alert('ERRORE', 'Impossibile completare la cancellazione.');
            } finally {
              setWipingData(false);
            }
          },
        },
      ]
    );
  }, [token, refreshUser]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity style={s.back} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={16} color={CYAN} />
          <Text style={s.backTxt}>KORE</Text>
        </TouchableOpacity>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={s.header}>
          <View style={s.shieldIcon}>
            <Ionicons name="shield-checkmark" size={32} color={CYAN} />
          </View>
          <Text style={s.title}>PRIVACY</Text>
          <Text style={s.titleBig}>SHIELD</Text>
          <View style={s.accentLine} />
          <Text style={s.subtitle}>PROTOCOLLO DI SICUREZZA MILITARE ARENAKORE</Text>
        </Animated.View>

        {/* Three pillars */}
        {PILLARS.map((p, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(200 + i * 80)} style={[s.pillar, { borderColor: `${p.color}22` }]}>
            <View style={[s.pillarIcon, { backgroundColor: `${p.color}10` }]}>
              <Ionicons name={p.icon} size={20} color={p.color} />
            </View>
            <View style={s.pillarBody}>
              <Text style={[s.pillarTitle, { color: p.color }]}>{p.title}</Text>
              <Text style={s.pillarDesc}>{p.desc}</Text>
            </View>
          </Animated.View>
        ))}

        {/* Ghost Mode */}
        <Animated.View entering={FadeInDown.delay(500)} style={s.ghostCard}>
          <View style={s.ghostHeader}>
            <View style={s.ghostIconBox}>
              <Ionicons name="eye-off" size={20} color="#888" />
            </View>
            <View style={s.ghostInfo}>
              <Text style={s.ghostTitle}>MODALITÀ GHOST</Text>
              <Text style={s.ghostDesc}>
                Appari nei ranking come KORE #XXXXX.{' '}\nNome e identità nascosti al pubblico.
              </Text>
            </View>
            {ghostLoading ? (
              <ActivityIndicator color={CYAN} size="small" />
            ) : (
              <Switch
                value={ghostMode}
                onValueChange={handleGhostToggle}
                trackColor={{ false: '#1A1A1A', true: 'rgba(0,242,255,0.3)' }}
                thumbColor={ghostMode ? CYAN : '#555'}
                ios_backgroundColor="#1A1A1A"
              />
            )}
          </View>
          {ghostMode && (
            <View style={s.ghostActive}>
              <Ionicons name="eye-off-outline" size={12} color="#888" />
              <Text style={s.ghostActiveTxt}>IDENTITÀ MASCHERATA NEI RANKING PUBBLICI</Text>
            </View>
          )}
        </Animated.View>

        {/* Wipe Button */}
        <Animated.View entering={FadeInDown.delay(600)} style={s.wipeSection}>
          <Text style={s.wipeLabel}>ZONA PERICOLO</Text>
          <TouchableOpacity
            style={[s.wipeBtn, wipingData && s.wipeBtnLoading]}
            onPress={handleWipe}
            disabled={wipingData}
            activeOpacity={0.8}
          >
            {wipingData ? (
              <ActivityIndicator color="#FF3B30" size="small" />
            ) : (
              <Ionicons name="trash-outline" size={16} color="#FF3B30" />
            )}
            <Text style={s.wipeBtnTxt}>ELIMINA DATI BIOMETRICI</Text>
          </TouchableOpacity>
          <Text style={s.wipeNote}>
            Cancella DNA Score, bio-scan history e permessi biometrici.{' '}\nProfilo base mantenuto. Azione irreversibile.
          </Text>
        </Animated.View>

        {/* Footer */}
        <View style={s.footer}>
          <Ionicons name="shield" size={12} color="rgba(0,242,255,0.2)" />
          <Text style={s.footerTxt}>ARENAKORE PRIVACY SHIELD v2.0 · GDPR COMPLIANT</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 24 },

  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backTxt: { color: CYAN, fontSize: 11, fontWeight: '900', letterSpacing: 2 },

  header: { marginBottom: 28, gap: 4, alignItems: 'flex-start' },
  shieldIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: 'rgba(0,242,255,0.65)', borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { color: CYAN, fontSize: 11, fontWeight: '900', letterSpacing: 6 },
  titleBig: { color: '#FFFFFF', fontSize: 44, fontWeight: '900', letterSpacing: 0.5, lineHeight: 48 },
  accentLine: { height: 2, width: 48, backgroundColor: CYAN, marginTop: 12, marginBottom: 14, shadowColor: CYAN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6 },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 3 },

  pillar: { flexDirection: 'row', gap: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1 },
  pillarIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pillarBody: { flex: 1, gap: 6 },
  pillarTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  pillarDesc: { color: '#E0E0E0', fontSize: 11, fontWeight: '700', lineHeight: 18 },

  ghostCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 24, gap: 10 },
  ghostHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ghostIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  ghostInfo: { flex: 1, gap: 2 },
  ghostTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  ghostDesc: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '500', lineHeight: 18 },
  ghostActive: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(136,136,136,0.1)', borderRadius: 8, padding: 10 },
  ghostActiveTxt: { color: '#888', fontSize: 9, fontWeight: '900', letterSpacing: 2 },

  wipeSection: { gap: 10, marginBottom: 28 },
  wipeLabel: { color: '#FF3B30', fontSize: 9, fontWeight: '900', letterSpacing: 4 },
  wipeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(255,59,48,0.06)', borderWidth: 1.5, borderColor: 'rgba(255,59,48,0.3)', borderRadius: 10, paddingVertical: 16 },
  wipeBtnLoading: { opacity: 0.5 },
  wipeBtnTxt: { color: '#FF3B30', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  wipeNote: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '500', textAlign: 'center', lineHeight: 18 },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingTop: 8 },
  footerTxt: { color: 'rgba(0,242,255,0.2)', fontSize: 8, fontWeight: '700', letterSpacing: 2 },
});
