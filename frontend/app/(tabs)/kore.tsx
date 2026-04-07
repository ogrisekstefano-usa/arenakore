/**
 * ARENAKORE — KORE TAB (DIAGNOSTIC MODE)
 * Progressive component activation with atomic logging.
 * Enable components ONE BY ONE to find the crash trigger.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

// ══════════════════════════════════════════════════════════
// PROGRESSIVE ACTIVATION FLAGS — Enable ONE at a time
// ══════════════════════════════════════════════════════════
const ENABLE_HERO = true;          // Hero image section
const ENABLE_STATS = true;         // Stats row (SCANS, FLUX, LVL)
const ENABLE_DNA_RADAR = true;     // DNA Radar inline (no SVG component)
const ENABLE_KORE_ID_BTN = true;   // KORE ID button
const ENABLE_KORE_ID_MODAL = true; // KoreIDModal import & render
const ENABLE_SILO_RADAR = false;    // SiloRadar import & render
const ENABLE_CONTROL_CENTER = false; // ControlCenter sidebar
// ══════════════════════════════════════════════════════════

// Lazy imports — only loaded when flag is true
let KoreIDModal: any = null;
let SiloRadar: any = null;
let ControlCenter: any = null;

if (ENABLE_KORE_ID_MODAL) {
  try {
    KoreIDModal = require('../../components/KoreIDModal').KoreIDModal;
    console.log('[KORE_DIAG] KoreIDModal loaded OK');
  } catch (e: any) {
    console.log('[KORE_DIAG] KoreIDModal FAILED:', e.message);
  }
}
if (ENABLE_SILO_RADAR) {
  try {
    SiloRadar = require('../../components/kore/SiloRadar').SiloRadar;
    console.log('[KORE_DIAG] SiloRadar loaded OK');
  } catch (e: any) {
    console.log('[KORE_DIAG] SiloRadar FAILED:', e.message);
  }
}
if (ENABLE_CONTROL_CENTER) {
  try {
    ControlCenter = require('../../components/ControlCenter').ControlCenter;
    console.log('[KORE_DIAG] ControlCenter loaded OK');
  } catch (e: any) {
    console.log('[KORE_DIAG] ControlCenter FAILED:', e.message);
  }
}

const API = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL
  || process.env.EXPO_PUBLIC_BACKEND_URL
  || '';

export default function KoreScreen() {
  console.log('[KORE_DIAG] ═══ KORE_TAB_RENDER_START ═══');

  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [koreIdVisible, setKoreIdVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dnaData, setDnaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  console.log('[KORE_DIAG] hooks OK, user:', user?.username);

  useEffect(() => {
    console.log('[KORE_DIAG] useEffect mount — fetching data');
    if (!token) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API}/api/dna/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDnaData(data);
          console.log('[KORE_DIAG] DNA data loaded OK');
        }
      } catch (e: any) {
        console.log('[KORE_DIAG] DNA fetch error:', e.message);
      }
      setLoading(false);
    })();
  }, [token]);

  const username = (user?.username || 'KORE').toUpperCase();
  const sport = user?.preferred_sport || 'Fitness';
  const level = user?.training_level || 'Intermedio';
  const flux = user?.ak_credits || 0;
  const totalScans = user?.total_scans || 0;
  const userLevel = user?.level || 1;

  console.log('[KORE_DIAG] data ready, rendering JSX...');

  return (
    <View style={s.root}>
      <Header title="KORE" />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ RAW DATA SECTION (ALWAYS VISIBLE) ═══ */}
        <View style={s.rawData}>
          <Text style={s.rawTitle}>{username}</Text>
          <Text style={s.rawSub}>{sport.toUpperCase()} · {level.toUpperCase()}</Text>
          {user?.is_nexus_certified && (
            <View style={s.badge}><Text style={s.badgeText}>NÈXUS</Text></View>
          )}
          {user?.is_founder && (
            <View style={[s.badge, { borderColor: '#FFD700' }]}><Text style={[s.badgeText, { color: '#FFD700' }]}>FOUNDER</Text></View>
          )}
        </View>

        {/* ═══ STATS ROW ═══ */}
        {ENABLE_STATS && (() => {
          console.log('[KORE_DIAG] LOG_STATS_START');
          return (
            <View style={s.statsRow}>
              <View style={s.statBox}>
                <Text style={s.statNum}>{totalScans}</Text>
                <Text style={s.statLabel}>SCANS</Text>
              </View>
              <View style={s.statBox}>
                <Text style={[s.statNum, { color: '#00E5FF' }]}>{flux}</Text>
                <Text style={s.statLabel}>FLUX</Text>
              </View>
              <View style={s.statBox}>
                <Text style={[s.statNum, { color: '#00FF87' }]}>LVL {userLevel}</Text>
                <Text style={s.statLabel}>LIVELLO</Text>
              </View>
            </View>
          );
        })()}

        {/* ═══ DNA RADAR (TEXT ONLY — no SVG) ═══ */}
        {ENABLE_DNA_RADAR && (() => {
          console.log('[KORE_DIAG] LOG_DNA_START');
          const dna = user?.dna || {};
          return (
            <View style={s.section}>
              <Text style={s.sectionTitle}>DNA RADAR</Text>
              <View style={s.dnaGrid}>
                {Object.entries(dna).map(([key, val]: [string, any]) => (
                  <View key={key} style={s.dnaItem}>
                    <Text style={s.dnaLabel}>{key.toUpperCase()}</Text>
                    <View style={s.dnaBar}>
                      <View style={[s.dnaFill, { width: `${Math.min(val || 0, 100)}%` }]} />
                    </View>
                    <Text style={s.dnaVal}>{val || 0}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* ═══ KORE ID BUTTON ═══ */}
        {ENABLE_KORE_ID_BTN && (() => {
          console.log('[KORE_DIAG] LOG_KOREID_BTN_START');
          return (
            <View style={s.btnRow}>
              <TouchableOpacity style={s.cyanBtn} onPress={() => router.push('/(tabs)/nexus-trigger')}>
                <Ionicons name="scan" size={16} color="#000" />
                <Text style={s.cyanBtnText}>NUOVA SCANSIONE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.outlineBtn} onPress={() => { console.log('[KORE_DIAG] KORE_ID_OPEN'); setKoreIdVisible(true); }}>
                <Ionicons name="finger-print" size={16} color="#00E5FF" />
                <Text style={s.outlineBtnText}>KORE ID</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* ═══ SILO RADAR ═══ */}
        {ENABLE_SILO_RADAR && SiloRadar && (() => {
          console.log('[KORE_DIAG] LOG_SILO_START');
          try {
            return <SiloRadar />;
          } catch (e: any) {
            console.log('[KORE_DIAG] SiloRadar RENDER FAILED:', e.message);
            return <Text style={{ color: 'red', padding: 16 }}>SiloRadar Error: {e.message}</Text>;
          }
        })()}

        {/* ═══ QUICK NAV ═══ */}
        <View style={s.quickNav}>
          <TouchableOpacity style={s.navItem} onPress={() => router.push('/(tabs)/dna')}>
            <Ionicons name="analytics" size={20} color="#00E5FF" />
            <Text style={s.navText}>DNA PROFILE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.navItem} onPress={() => router.push('/(tabs)/hall')}>
            <Ionicons name="trophy" size={20} color="#FFD700" />
            <Text style={s.navText}>CLASSIFICHE</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ═══ MODALS ═══ */}
      {ENABLE_KORE_ID_MODAL && KoreIDModal && (() => {
        console.log('[KORE_DIAG] LOG_KOREID_MODAL_RENDER');
        return <KoreIDModal visible={koreIdVisible} onClose={() => setKoreIdVisible(false)} />;
      })()}

      {ENABLE_CONTROL_CENTER && ControlCenter && (() => {
        console.log('[KORE_DIAG] LOG_CONTROL_CENTER_RENDER');
        return <ControlCenter visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />;
      })()}

      {console.log('[KORE_DIAG] ═══ KORE_TAB_RENDER_END ═══')}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  scroll: { padding: 16 },
  rawData: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  rawTitle: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: 2 },
  rawSub: { color: '#888', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#00E5FF', marginTop: 4 },
  badgeText: { color: '#00E5FF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#111', borderRadius: 16, padding: 20, marginTop: 12, borderWidth: 1, borderColor: '#1a1a1a' },
  statBox: { alignItems: 'center', gap: 4 },
  statNum: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  section: { marginTop: 20, backgroundColor: '#111', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1a1a1a' },
  sectionTitle: { color: '#00E5FF', fontSize: 13, fontWeight: '800', letterSpacing: 2, marginBottom: 12 },
  dnaGrid: { gap: 8 },
  dnaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dnaLabel: { color: '#888', fontSize: 11, fontWeight: '600', width: 80, letterSpacing: 1 },
  dnaBar: { flex: 1, height: 6, backgroundColor: '#222', borderRadius: 3, overflow: 'hidden' },
  dnaFill: { height: '100%', backgroundColor: '#00E5FF', borderRadius: 3 },
  dnaVal: { color: '#00E5FF', fontSize: 12, fontWeight: '700', width: 30, textAlign: 'right' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cyanBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#00E5FF', borderRadius: 12, paddingVertical: 14 },
  cyanBtnText: { color: '#000', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  outlineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: '#00E5FF' },
  outlineBtnText: { color: '#00E5FF', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  quickNav: { flexDirection: 'row', gap: 10, marginTop: 20 },
  navItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#111', borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: '#1a1a1a' },
  navText: { color: '#FFF', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
});
