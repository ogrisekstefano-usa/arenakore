/**
 * ARENAKORE — HEALTH HUB (External Connectivity)
 * ═══════════════════════════════════════════════
 * Unified dashboard for all external health data sources.
 * Apple Health, Google Health Connect, Strava, BLE Sensors.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { BLERadarScanner } from './BLERadarScanner';

// ═══ LIVE BPM DISPLAY — Compact header widget ═══
export function LiveBPMWidget({ bpm, source }: { bpm: number | null; source?: string }) {
  if (!bpm) return null;
  const color = bpm > 160 ? '#FF3B30' : bpm > 120 ? '#FF9500' : '#34C759';

  return (
    <View style={lb.wrap}>
      <Ionicons name="heart" size={12} color={color} />
      <Text style={[lb.val, { color }]}>{bpm}</Text>
      <Text style={lb.unit}>BPM</Text>
    </View>
  );
}

const lb = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  val: {
    fontSize: 16,
    fontFamily: "'Plus Jakarta Sans', 'Montserrat', sans-serif",
    fontWeight: '800',
  },
  unit: { color: 'rgba(255,255,255,0.35)', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
});


// ═══ MINI BPM CHART ═══
function MiniBPMChart({ data, width = 200, height = 50 }: { data: { t: number; bpm: number }[]; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;

  const maxBpm = Math.max(...data.map(d => d.bpm));
  const minBpm = Math.min(...data.map(d => d.bpm));
  const range = maxBpm - minBpm || 1;
  const maxT = data[data.length - 1].t;
  const minT = data[0].t;
  const tRange = maxT - minT || 1;

  const points = data.map(d => {
    const x = ((d.t - minT) / tRange) * (width - 8) + 4;
    const y = height - 4 - ((d.bpm - minBpm) / range) * (height - 8);
    return `${x},${y}`;
  }).join(' ');

  return (
    <Svg width={width} height={height}>
      <Polyline points={points} fill="none" stroke="#FF2D55" strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}


// ═══ HEALTH HUB SCREEN ═══
export default function HealthHub() {
  const { token } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<any[]>([]);
  const [recentData, setRecentData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showBLEScanner, setShowBLEScanner] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [connRes, dataRes] = await Promise.all([
        api.getHealthConnections(token),
        api.getRecentHealthData(null, token),
      ]);
      setConnections(connRes.connections || []);
      setRecentData(dataRes || []);
    } catch (e) {
      console.log('HealthHub load error:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleConnect = async (source: string) => {
    if (!token) return;
    setSyncing(source);
    try {
      await api.connectHealthService(source, token);
      await loadData();
    } catch (e) {
      Alert.alert('Errore', 'Connessione fallita');
    } finally {
      setSyncing(null);
    }
  };

  const handleStravaDemo = async () => {
    if (!token) return;
    setSyncing('STRAVA');
    try {
      await api.stravaDemoSync(token);
      await loadData();
    } catch (e) {
      Alert.alert('Errore', 'Sincronizzazione demo fallita');
    } finally {
      setSyncing(null);
    }
  };

  const SOURCE_ICONS: Record<string, { icon: string; bgColor: string; description: string }> = {
    APPLE_HEALTH:  { icon: 'heart',    bgColor: '#FF2D55', description: 'Sincronizza BPM, passi e attività da Apple Health' },
    GOOGLE_HEALTH: { icon: 'fitness',  bgColor: '#4285F4', description: 'Importa dati da Google Health Connect' },
    STRAVA:        { icon: 'bicycle',  bgColor: '#FC4C02', description: 'Collega Strava per GPS tracking e attività outdoor' },
    BLE_SENSOR:    { icon: 'watch',    bgColor: '#FF9500', description: 'Accoppia fasce cardio e sensori di potenza via BLE' },
  };

  if (loading) {
    return (
      <SafeAreaView style={hh.safe}>
        <View style={hh.loadingWrap}><ActivityIndicator color="#00E5FF" size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={hh.safe}>
      <ScrollView contentContainerStyle={hh.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={hh.header}>
          <TouchableOpacity onPress={() => router.back()} style={hh.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={hh.headerTextWrap}>
            <Text style={hh.title}>HEALTH HUB</Text>
            <Text style={hh.subtitle}>Connetti i tuoi dispositivi e servizi</Text>
          </View>
        </View>

        {/* Connection Cards */}
        {connections.map((conn, idx) => {
          const meta = SOURCE_ICONS[conn.source] || {};
          const isConnecting = syncing === conn.source;

          return (
            <Animated.View key={conn.source} entering={FadeInDown.delay(idx * 80).duration(400)}>
              <View style={[hh.connCard, conn.connected && { borderColor: conn.color + '40' }]}>
                <View style={hh.connTop}>
                  <View style={[hh.connIcon, { backgroundColor: meta.bgColor + '20' }]}>
                    <Ionicons name={meta.icon as any} size={22} color={meta.bgColor} />
                  </View>
                  <View style={hh.connInfo}>
                    <Text style={hh.connName}>{conn.display_name}</Text>
                    <Text style={hh.connDesc}>{meta.description}</Text>
                  </View>
                  {conn.connected ? (
                    <View style={[hh.statusPill, { backgroundColor: '#34C75918', borderColor: '#34C759' }]}>
                      <View style={hh.statusDot} />
                      <Text style={hh.statusText}>ATTIVO</Text>
                    </View>
                  ) : (
                    <View style={[hh.statusPill, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.15)' }]}>
                      <Text style={[hh.statusText, { color: 'rgba(255,255,255,0.35)' }]}>OFFLINE</Text>
                    </View>
                  )}
                </View>

                {/* Stats row if connected */}
                {conn.connected && (
                  <View style={hh.connStats}>
                    <View style={hh.statItem}>
                      <Text style={hh.statLabel}>SYNC</Text>
                      <Text style={hh.statValue}>{conn.total_syncs}</Text>
                    </View>
                    {conn.last_sync && (
                      <View style={hh.statItem}>
                        <Text style={hh.statLabel}>ULTIMO</Text>
                        <Text style={hh.statValue}>
                          {new Date(conn.last_sync).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Action buttons */}
                <View style={hh.connActions}>
                  {conn.source === 'STRAVA' && !conn.connected ? (
                    <TouchableOpacity
                      style={[hh.connectBtn, { backgroundColor: '#FC4C02' }]}
                      onPress={handleStravaDemo}
                      disabled={isConnecting}
                      activeOpacity={0.85}
                    >
                      {isConnecting ? <ActivityIndicator size="small" color="#FFF" /> : (
                        <>
                          <Ionicons name="bicycle" size={14} color="#FFF" />
                          <Text style={hh.connectBtnText}>COLLEGA STRAVA (DEMO)</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : conn.source === 'BLE_SENSOR' ? (
                    <TouchableOpacity
                      style={[hh.connectBtn, { backgroundColor: conn.connected ? 'rgba(255,149,0,0.15)' : '#FF950020' }]}
                      onPress={() => setShowBLEScanner(!showBLEScanner)}
                      disabled={isConnecting}
                      activeOpacity={0.85}
                    >
                      {isConnecting ? <ActivityIndicator size="small" color="#FF9500" /> : (
                        <>
                          <Ionicons name={conn.connected ? 'bluetooth' : 'search'} size={14} color="#FF9500" />
                          <Text style={[hh.connectBtnText, { color: '#FF9500' }]}>
                            {showBLEScanner ? 'CHIUDI SCANNER' : conn.connected ? 'SENSORE ACCOPPIATO' : 'CERCA SENSORI'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[hh.connectBtn, { backgroundColor: conn.connected ? 'rgba(52,199,89,0.12)' : 'rgba(255,255,255,0.06)' }]}
                      onPress={() => handleConnect(conn.source)}
                      disabled={isConnecting}
                      activeOpacity={0.85}
                    >
                      {isConnecting ? <ActivityIndicator size="small" color="#00E5FF" /> : (
                        <>
                          <Ionicons
                            name={conn.connected ? 'checkmark-circle' : 'link'}
                            size={14}
                            color={conn.connected ? '#34C759' : 'rgba(255,255,255,0.5)'}
                          />
                          <Text style={[hh.connectBtnText, { color: conn.connected ? '#34C759' : 'rgba(255,255,255,0.5)' }]}>
                            {conn.connected ? 'CONNESSO' : 'CONNETTI'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Animated.View>
          );
        })}

        {/* BLE Radar Scanner (expands when user taps "CERCA SENSORI") */}
        {showBLEScanner && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={[hh.connCard, { borderColor: 'rgba(255,149,0,0.25)' }]}>
              <BLERadarScanner onDeviceConnected={(device) => {
                handleConnect('BLE_SENSOR');
                setShowBLEScanner(false);
              }} />
            </View>
          </Animated.View>
        )}

        {/* Recent Data Feed */}
        {recentData.length > 0 && (
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <View style={hh.feedSection}>
              <Text style={hh.feedTitle}>DATI RECENTI</Text>
              {recentData.slice(0, 5).map((d, idx) => (
                <View key={d.id} style={hh.feedItem}>
                  <Ionicons
                    name={(d.source_meta?.icon || 'analytics') as any}
                    size={14}
                    color={d.source_meta?.color || '#00E5FF'}
                  />
                  <View style={hh.feedInfo}>
                    <Text style={hh.feedType}>{d.data_type.replace('_', ' ')}</Text>
                    <Text style={hh.feedMeta}>
                      {d.source_meta?.label} · {d.values?.length || 0} punti
                      {d.correlated_challenge_id ? ' · Correlato' : ''}
                    </Text>
                  </View>
                  <Text style={hh.feedTime}>
                    {new Date(d.ingested_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Trust hierarchy info */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)}>
          <View style={hh.trustInfo}>
            <Ionicons name="shield-checkmark" size={14} color="#00E5FF" />
            <Text style={hh.trustTitle}>GERARCHIA DI TRUST</Text>
          </View>
          <View style={hh.trustLevels}>
            {[
              { label: 'NÈXUS VISION', trust: '100%', color: '#00E5FF', icon: 'eye' },
              { label: 'SENSORE BLE', trust: '92%', color: '#FF9500', icon: 'watch' },
              { label: 'STRAVA', trust: '88%', color: '#FC4C02', icon: 'bicycle' },
              { label: 'APPLE / GOOGLE', trust: '85%', color: '#FF2D55', icon: 'heart' },
              { label: 'MANUALE', trust: '30%', color: '#8E8E93', icon: 'create' },
            ].map((lvl, idx) => (
              <View key={idx} style={hh.trustRow}>
                <Ionicons name={lvl.icon as any} size={12} color={lvl.color} />
                <Text style={[hh.trustLabel, { color: lvl.color }]}>{lvl.label}</Text>
                <View style={hh.trustBarBg}>
                  <View style={[hh.trustBarFill, { width: lvl.trust, backgroundColor: lvl.color }]} />
                </View>
                <Text style={[hh.trustPct, { color: lvl.color }]}>{lvl.trust}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}


const hh = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#121212' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  headerTextWrap: { flex: 1, gap: 2 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },

  connCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16,
    padding: 16, gap: 12,
  },
  connTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  connIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  connInfo: { flex: 1, gap: 3 },
  connName: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  connDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 16 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34C759' },
  statusText: { color: '#34C759', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  connStats: { flexDirection: 'row', gap: 20 },
  statItem: { gap: 2 },
  statLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  statValue: {
    color: '#FFF', fontSize: 16,
    fontFamily: "'Plus Jakarta Sans', 'Montserrat', sans-serif",
    fontWeight: '800',
  },
  connActions: { flexDirection: 'row' },
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, flex: 1,
    justifyContent: 'center',
  },
  connectBtnText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },

  feedSection: { gap: 10, marginTop: 6 },
  feedTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  feedItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12,
  },
  feedInfo: { flex: 1, gap: 2 },
  feedType: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  feedMeta: { color: 'rgba(255,255,255,0.35)', fontSize: 10 },
  feedTime: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700' },

  trustInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 8 },
  trustTitle: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  trustLevels: { gap: 8 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, width: 90 },
  trustBarBg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' as any },
  trustBarFill: { height: 4, borderRadius: 2 },
  trustPct: {
    fontSize: 13, width: 38, textAlign: 'right' as any,
    fontFamily: "'Plus Jakarta Sans', 'Montserrat', sans-serif",
    fontWeight: '800',
  },
});
