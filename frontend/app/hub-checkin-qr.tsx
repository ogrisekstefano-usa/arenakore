/**
 * ARENAKORE — HUB CHECK-IN QR GENERATOR (Build 38 · Prompt 5)
 * ═══════════════════════════════════════════════════════════════
 * Admin/Coach view: Generate and display the daily QR code for their Hub.
 * Athletes scan this code to register physical attendance.
 * 
 * Features:
 * - Daily auto-rotating QR token
 * - Live counter of today's check-ins
 * - Configurable K-Flux reward
 * - Brutalist Neon aesthetic
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Platform, StatusBar, Dimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

// QR Code SVG - lazy loaded
let QRCode: any = null;
try { QRCode = require('react-native-qrcode-svg').default; } catch {}

const { width: SW } = Dimensions.get('window');
const CYAN = '#00E5FF';
const GREEN = '#00FF87';
const GOLD = '#FFD700';
const QR_SIZE = Math.min(SW - 80, 280);

export default function HubCheckinQR() {
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ hub_id?: string; hub_name?: string }>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [hubName, setHubName] = useState(params.hub_name || 'Hub');
  const [todayDate, setTodayDate] = useState('');
  const [checkinsToday, setCheckinsToday] = useState(0);
  const [fluxReward, setFluxReward] = useState(50);
  const [error, setError] = useState<string | null>(null);

  // Pulse animation for QR border
  const pulseOpacity = useSharedValue(0.3);
  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ), -1, true
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  const loadQR = useCallback(async () => {
    if (!params.hub_id) {
      setError('Hub non specificato');
      setLoading(false);
      return;
    }
    if (!token) {
      // Auth still loading — wait and retry
      setTimeout(() => loadQR(), 1000);
      return;
    }

    try {
      // Generate or retrieve today's QR
      const qrRes = await api.generateHubQR(params.hub_id, token);
      if (qrRes && qrRes.qr_payload) {
        setQrPayload(qrRes.qr_payload);
        setHubName(qrRes.hub_name || params.hub_name || 'Hub');
        setTodayDate(qrRes.date || '');
      }

      // Get status (checkin count)
      const statusRes = await api.getHubQRStatus(params.hub_id, token);
      if (statusRes && !statusRes._error) {
        setCheckinsToday(statusRes.checkins_today || 0);
        setFluxReward(statusRes.flux_reward || 50);
      }
    } catch (err: any) {
      setError(err?.message || 'Errore generazione QR');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, params.hub_id]);

  useEffect(() => { loadQR(); }, [loadQR]);

  const handleRefresh = () => { setRefreshing(true); loadQR(); };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>QR CHECK-IN</Text>
          <Text style={s.headerSub}>{hubName.toUpperCase()}</Text>
        </View>
        <View style={s.liveBadge}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={GREEN} />}
      >
        {loading ? (
          <View style={s.centerBox}>
            <ActivityIndicator color={GREEN} size="large" />
            <Text style={s.loadingText}>GENERAZIONE QR...</Text>
          </View>
        ) : error ? (
          <Animated.View entering={FadeIn.duration(300)} style={s.errorBox}>
            <Ionicons name="warning" size={48} color="#FF3B30" />
            <Text style={s.errorTitle}>ERRORE</Text>
            <Text style={s.errorDesc}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={loadQR} activeOpacity={0.8}>
              <Text style={s.retryBtnText}>RIPROVA</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <>
            {/* QR Code Display */}
            <Animated.View entering={FadeInDown.duration(500)} style={s.qrWrapper}>
              {/* Glow border */}
              <Animated.View style={[s.qrGlow, pulseStyle]} />

              <View style={s.qrCard}>
                <View style={s.qrInner}>
                  {QRCode && qrPayload ? (
                    <QRCode
                      value={qrPayload}
                      size={QR_SIZE}
                      backgroundColor="#000000"
                      color={GREEN}
                      logo={undefined}
                    />
                  ) : (
                    <View style={[s.qrPlaceholder, { width: QR_SIZE, height: QR_SIZE }]}>
                      <Ionicons name="qr-code" size={80} color="rgba(0,255,135,0.15)" />
                      <Text style={s.qrPlaceholderText}>QR NON DISPONIBILE SU WEB</Text>
                      <Text style={s.qrPlaceholderSub}>Usa l'app mobile per visualizzare il QR</Text>
                    </View>
                  )}
                </View>

                {/* Date stamp */}
                <View style={s.dateRow}>
                  <Ionicons name="calendar" size={14} color={GREEN} />
                  <Text style={s.dateText}>VALIDO SOLO OGGI — {todayDate}</Text>
                </View>
              </View>
            </Animated.View>

            {/* Instruction */}
            <Animated.View entering={FadeInDown.duration(500).delay(100)} style={s.instrCard}>
              <Ionicons name="scan" size={28} color={CYAN} />
              <View style={{ flex: 1 }}>
                <Text style={s.instrTitle}>MOSTRA AGLI ATLETI</Text>
                <Text style={s.instrDesc}>
                  Gli atleti scansionano questo QR per registrare la presenza fisica e guadagnare K-Flux Verdi.
                </Text>
              </View>
            </Animated.View>

            {/* Stats Row */}
            <Animated.View entering={FadeInDown.duration(500).delay(200)} style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={[s.statValue, { color: GREEN }]}>{checkinsToday}</Text>
                <Text style={s.statLabel}>CHECK-IN OGGI</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statValue, { color: GOLD }]}>+{fluxReward}</Text>
                <Text style={s.statLabel}>K-FLUX / CHECK-IN</Text>
              </View>
            </Animated.View>

            {/* How it works */}
            <Animated.View entering={FadeInDown.duration(500).delay(300)} style={s.howCard}>
              <Text style={s.howTitle}>COME FUNZIONA</Text>
              {[
                { icon: 'qr-code', text: 'Mostra il QR all\'atleta al suo arrivo' },
                { icon: 'scan', text: 'L\'atleta scansiona con la sua app' },
                { icon: 'flash', text: `+${fluxReward} K-Flux Verdi erogati istantaneamente` },
                { icon: 'flame', text: 'Streak di continuità: 7gg = bonus 1.5x!' },
              ].map((step, i) => (
                <View key={i} style={s.howStep}>
                  <View style={s.howNum}>
                    <Text style={s.howNumText}>{i + 1}</Text>
                  </View>
                  <Ionicons name={step.icon as any} size={18} color={GREEN} />
                  <Text style={s.howText}>{step.text}</Text>
                </View>
              ))}
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  headerSub: { color: 'rgba(0,255,135,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 1 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,255,135,0.08)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(0,255,135,0.2)' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00FF87' },
  liveText: { color: '#00FF87', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  errorBox: { alignItems: 'center', gap: 12, paddingVertical: 60 },
  errorTitle: { color: '#FF3B30', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  errorDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center' },
  retryBtn: { backgroundColor: 'rgba(0,229,255,0.15)', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(0,229,255,0.3)' },
  retryBtnText: { color: CYAN, fontSize: 14, fontWeight: '800', letterSpacing: 2 },

  // QR
  qrWrapper: { alignItems: 'center', position: 'relative' },
  qrGlow: {
    position: 'absolute', top: -4, left: (SW - QR_SIZE) / 2 - 32,
    width: QR_SIZE + 48, height: QR_SIZE + 120, borderRadius: 24,
    borderWidth: 2, borderColor: '#00FF87',
  },
  qrCard: {
    backgroundColor: '#0A0A0A', borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(0,255,135,0.2)', gap: 16, width: '100%',
  },
  qrInner: { backgroundColor: '#000', borderRadius: 12, padding: 12 },
  qrPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  qrPlaceholderText: { color: 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  qrPlaceholderSub: { color: 'rgba(255,255,255,0.12)', fontSize: 12, textAlign: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { color: 'rgba(0,255,135,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },

  // Instruction
  instrCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(0,229,255,0.04)', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.1)',
  },
  instrTitle: { color: '#FFF', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  instrDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 18, marginTop: 2 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#0A0A0A', borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statValue: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  statLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800', letterSpacing: 2 },

  // How it works
  howCard: {
    backgroundColor: '#0A0A0A', borderRadius: 16, padding: 20, gap: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  howTitle: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  howStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  howNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,255,135,0.1)', alignItems: 'center', justifyContent: 'center' },
  howNumText: { color: '#00FF87', fontSize: 12, fontWeight: '900' },
  howText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, flex: 1, lineHeight: 18 },
});
