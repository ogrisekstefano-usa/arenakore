/**
 * HUB MAP — Build 37 · Mappa Geolocalizzata & Hub Sportivi
 * ═══════════════════════════════════════════════════════════
 * Interactive map using Leaflet.js inside WebView for cross-platform support.
 * Shows Hub pins with type-specific colors, active challenge badges,
 * and a bottom sheet Hub Info Card.
 *
 * Three pillars:
 * 1. GEOLOCALIZZAZIONE ATTIVA — User position + Hub pins
 * 2. SFIDE NEI DINTORNI — Active challenges at each Hub
 * 3. INFO HUB — Name, Photo, Rating, Coaches, Challenges
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator,
  ScrollView, Image, Dimensions, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, SlideInDown } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { request as apiRequest } from '../utils/api';

const { width: SW, height: SH } = Dimensions.get('window');
const CYAN = '#00E5FF';
const GOLD = '#FFD700';
const GREEN = '#32D74B';
const RED = '#FF453A';
const PURPLE = '#BF5AF2';
const BG = '#000000';

// Default center: Milan, Italy
const DEFAULT_LAT = 45.4642;
const DEFAULT_LNG = 9.1900;

interface Hub {
  id: string;
  name: string;
  hub_type: string;
  type_label: string;
  type_icon: string;
  type_color: string;
  description?: string;
  photo_url?: string;
  address?: string;
  city?: string;
  latitude: number;
  longitude: number;
  rating_avg: number;
  rating_count: number;
  specialties: string[];
  amenities: string[];
  coaches_count: number;
  athletes_count: number;
  active_challenges: number;
  is_verified: boolean;
  coaches?: any[];
  active_challenges_list?: any[];
  coach_templates?: any[];
}

async function safeFetch(path: string, token?: string | null): Promise<any> {
  try { return await apiRequest(path, {}, token); }
  catch { return { _error: true }; }
}

// ── Hub Type Filter Chips
const HUB_FILTERS = [
  { key: 'all', label: 'TUTTI', icon: 'locate', color: GOLD },
  { key: 'gym', label: 'GYM', icon: 'barbell', color: CYAN },
  { key: 'crossfit', label: 'CROSSFIT', icon: 'flame', color: '#FF6B00' },
  { key: 'boxing', label: 'BOXING', icon: 'fitness', color: RED },
  { key: 'mma', label: 'MMA', icon: 'flash', color: PURPLE },
  { key: 'basketball', label: 'BASKET', icon: 'basketball', color: GOLD },
  { key: 'outdoor', label: 'OUTDOOR', icon: 'sunny', color: GOLD },
];

// ── Generate Leaflet HTML for WebView
function generateMapHTML(hubs: Hub[], userLat: number, userLng: number): string {
  const markers = hubs.map(h => {
    const challengeBadge = h.active_challenges > 0
      ? `<span style="background:${GOLD};color:#000;font-size:9px;font-weight:900;padding:1px 5px;border-radius:4px;margin-left:4px;">${h.active_challenges} LIVE</span>`
      : '';
    return `
      L.circleMarker([${h.latitude}, ${h.longitude}], {
        radius: ${h.active_challenges > 0 ? 10 : 7},
        fillColor: '${h.type_color}',
        color: '${h.type_color}',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.7
      })
      .addTo(map)
      .bindPopup('<div style="font-family:system-ui;min-width:180px;"><strong style="font-size:13px;">${h.name.replace(/'/g, "\\'")}</strong><br/><span style="color:${h.type_color};font-size:10px;font-weight:800;letter-spacing:1px;">${h.type_label.toUpperCase()}</span>${challengeBadge}<br/><span style="font-size:11px;color:#888;">⭐ ${h.rating_avg} · ${h.athletes_count} atleti</span><br/><span style="font-size:10px;color:#aaa;">${(h.address || '').replace(/'/g, "\\'")}</span></div>', {className: 'ak-popup'})
      .on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'hub_select', hub_id:'${h.id}'}));
      });
    `;
  }).join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #0a0a0a; }
    .leaflet-container { background: #0a0a0a !important; }
    .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.75) contrast(1.2) saturate(0.3); }
    .leaflet-control-zoom a { background: #1a1a1a !important; color: #00E5FF !important; border-color: #222 !important; }
    .leaflet-popup-content-wrapper { background: #111 !important; color: #fff !important; border: 1px solid #222; border-radius: 12px !important; }
    .leaflet-popup-tip { background: #111 !important; }
    .ak-popup .leaflet-popup-content { margin: 10px 12px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [${userLat}, ${userLng}],
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    // User position marker
    L.circleMarker([${userLat}, ${userLng}], {
      radius: 8,
      fillColor: '#00E5FF',
      color: '#00E5FF',
      weight: 3,
      opacity: 1,
      fillOpacity: 0.4
    }).addTo(map).bindPopup('<strong style="color:#00E5FF;">LA TUA POSIZIONE</strong>');

    // Pulsating ring around user
    L.circle([${userLat}, ${userLng}], {
      radius: 150,
      fillColor: '#00E5FF',
      color: '#00E5FF',
      weight: 1,
      opacity: 0.15,
      fillOpacity: 0.05
    }).addTo(map);

    // Hub markers
    ${markers}
  </script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════
// HUB INFO CARD (Bottom Sheet)
// ═══════════════════════════════════════════════════════════
function HubInfoCard({ hub, onClose, user, router }: { hub: Hub | null; onClose: () => void; user?: any; router?: any }) {
  if (!hub) return null;
  const isAdminOrCoach = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'GYM_OWNER' || user?.role === 'COACH';

  return (
    <Animated.View entering={SlideInDown.duration(300)} style={hs.card}>
      {/* Handle */}
      <View style={hs.handle}><View style={hs.handleBar} /></View>

      {/* Close */}
      <TouchableOpacity style={hs.closeBtn} onPress={onClose}>
        <Ionicons name="close" size={18} color="rgba(255,255,255,0.3)" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={hs.scrollContent}>
        {/* Photo */}
        {hub.photo_url ? (
          <Image source={{ uri: hub.photo_url }} style={hs.photo} resizeMode="cover" />
        ) : (
          <View style={[hs.photo, { backgroundColor: hub.type_color + '15', alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name={hub.type_icon as any} size={32} color={hub.type_color} />
          </View>
        )}

        {/* Name + Type */}
        <Text style={hs.name}>{hub.name}</Text>
        <View style={hs.typeRow}>
          <View style={[hs.typeBadge, { backgroundColor: hub.type_color + '12', borderColor: hub.type_color + '25' }]}>
            <Ionicons name={hub.type_icon as any} size={12} color={hub.type_color} />
            <Text style={[hs.typeText, { color: hub.type_color }]}>{hub.type_label}</Text>
          </View>
          {hub.is_verified && (
            <View style={hs.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={10} color={CYAN} />
              <Text style={hs.verifiedText}>VERIFICATO</Text>
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View style={hs.statsRow}>
          <View style={hs.stat}>
            <Text style={[hs.statVal, { color: GOLD }]}>⭐ {hub.rating_avg}</Text>
            <Text style={hs.statLabel}>{hub.rating_count} VOTI</Text>
          </View>
          <View style={hs.statDivider} />
          <View style={hs.stat}>
            <Text style={[hs.statVal, { color: CYAN }]}>{hub.athletes_count}</Text>
            <Text style={hs.statLabel}>ATLETI</Text>
          </View>
          <View style={hs.statDivider} />
          <View style={hs.stat}>
            <Text style={[hs.statVal, { color: PURPLE }]}>{hub.coaches_count}</Text>
            <Text style={hs.statLabel}>COACH</Text>
          </View>
          <View style={hs.statDivider} />
          <View style={hs.stat}>
            <Text style={[hs.statVal, { color: hub.active_challenges > 0 ? GREEN : 'rgba(255,255,255,0.15)' }]}>
              {hub.active_challenges}
            </Text>
            <Text style={hs.statLabel}>SFIDE LIVE</Text>
          </View>
        </View>

        {/* Description */}
        {hub.description && <Text style={hs.desc}>{hub.description}</Text>}

        {/* Address */}
        {hub.address && (
          <View style={hs.addressRow}>
            <Ionicons name="location" size={14} color="rgba(255,255,255,0.15)" />
            <Text style={hs.addressText}>{hub.address}</Text>
          </View>
        )}

        {/* Specialties */}
        {hub.specialties && hub.specialties.length > 0 && (
          <View style={hs.tagsRow}>
            {hub.specialties.map((s, i) => (
              <View key={i} style={hs.tag}>
                <Text style={hs.tagText}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Coaches */}
        {hub.coaches && hub.coaches.length > 0 && (
          <>
            <Text style={hs.sectionTitle}>COACH RESIDENTI</Text>
            {hub.coaches.map((c: any, i: number) => (
              <View key={i} style={hs.coachRow}>
                <View style={hs.coachAvatar}>
                  <Text style={hs.coachInitials}>{(c.username || 'C').slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={hs.coachInfo}>
                  <Text style={hs.coachName}>{c.username}</Text>
                  <Text style={hs.coachSpecialty}>
                    {(c.specialties || []).join(' · ') || c.preferred_sport}
                  </Text>
                </View>
                {c.verified && <Ionicons name="shield-checkmark" size={14} color={CYAN} />}
                {c.rating_avg > 0 && (
                  <Text style={hs.coachRating}>⭐ {c.rating_avg}</Text>
                )}
              </View>
            ))}
          </>
        )}

        {/* Active Challenges */}
        {hub.active_challenges_list && hub.active_challenges_list.length > 0 && (
          <>
            <Text style={hs.sectionTitle}>SFIDE ATTIVE</Text>
            {hub.active_challenges_list.map((ch: any, i: number) => (
              <View key={i} style={hs.challengeRow}>
                <Ionicons name="flash" size={14} color={GREEN} />
                <View style={hs.challengeInfo}>
                  <Text style={hs.challengeExercise}>{ch.exercise}</Text>
                  <Text style={hs.challengeStatus}>{ch.status} · {ch.challenger}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Coach Templates */}
        {hub.coach_templates && hub.coach_templates.length > 0 && (
          <>
            <Text style={hs.sectionTitle}>TEMPLATE COACH</Text>
            {hub.coach_templates.map((t: any, i: number) => (
              <View key={i} style={hs.templateRow}>
                <Ionicons name="document-text" size={14} color={PURPLE} />
                <View style={hs.templateInfo}>
                  <Text style={hs.templateName}>{t.name}</Text>
                  <Text style={hs.templateMeta}>{t.exercise} · {t.difficulty}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ═══ QR CHECK-IN ACTIONS ═══ */}
        <View style={hs.qrActionsRow}>
          {isAdminOrCoach && (
            <TouchableOpacity
              style={[hs.qrBtn, { backgroundColor: 'rgba(0,255,135,0.08)', borderColor: 'rgba(0,255,135,0.2)' }]}
              activeOpacity={0.8}
              onPress={() => router?.push({ pathname: '/hub-checkin-qr', params: { hub_id: hub.id, hub_name: hub.name } } as any)}
            >
              <Ionicons name="qr-code" size={18} color="#00FF87" />
              <Text style={[hs.qrBtnText, { color: '#00FF87' }]}>GENERA QR</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[hs.qrBtn, { backgroundColor: 'rgba(0,229,255,0.08)', borderColor: 'rgba(0,229,255,0.2)' }]}
            activeOpacity={0.8}
            onPress={() => router?.push('/qr-checkin' as any)}
          >
            <Ionicons name="scan" size={18} color={CYAN} />
            <Text style={[hs.qrBtnText, { color: CYAN }]}>CHECK-IN</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN MAP SCREEN
// ═══════════════════════════════════════════════════════════
export default function HubMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [filteredHubs, setFilteredHubs] = useState<Hub[]>([]);
  const [selectedHub, setSelectedHub] = useState<Hub | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLat, setUserLat] = useState(DEFAULT_LAT);
  const [userLng, setUserLng] = useState(DEFAULT_LNG);
  const [filter, setFilter] = useState('all');
  const [locationGranted, setLocationGranted] = useState(false);
  const webViewRef = useRef<any>(null);

  // Get user location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setLocationGranted(true);
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLat(loc.coords.latitude);
          setUserLng(loc.coords.longitude);
        }
      } catch (e) {
        console.log('[HubMap] Location permission denied, using default');
      }
    })();
  }, []);

  // Load hubs
  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await safeFetch(`/hubs/nearby?lat=${userLat}&lng=${userLng}&radius=50`, token);
      if (res?._error || !res?.hubs) {
        // Fallback: get all hubs
        const allRes = await safeFetch('/hubs/all', token);
        if (!allRes?._error && allRes?.hubs) {
          setHubs(allRes.hubs);
          setFilteredHubs(allRes.hubs);
        }
      } else {
        setHubs(res.hubs);
        setFilteredHubs(res.hubs);
      }
      setLoading(false);
    })();
  }, [userLat, userLng]);

  // Apply filter
  useEffect(() => {
    if (filter === 'all') {
      setFilteredHubs(hubs);
    } else {
      setFilteredHubs(hubs.filter(h => h.hub_type === filter));
    }
  }, [filter, hubs]);

  // Handle WebView messages (hub selection)
  const onWebViewMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'hub_select' && data.hub_id) {
        // Fetch full hub detail
        const detail = await safeFetch(`/hubs/${data.hub_id}`, token);
        if (!detail?._error) {
          setSelectedHub(detail);
        }
      }
    } catch (e) {
      console.warn('[HubMap] WebView message parse error:', e);
    }
  }, [token]);

  const mapHTML = generateMapHTML(filteredHubs, userLat, userLng);

  return (
    <SafeAreaView style={ms.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={ms.header}>
        <TouchableOpacity onPress={() => router.back()} style={ms.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={ms.headerCenter}>
          <Text style={ms.headerTitle}>MAPPA HUB</Text>
          <Text style={ms.headerSub}>
            {filteredHubs.length} hub {filter !== 'all' ? `(${filter})` : ''} nel raggio
          </Text>
        </View>
        <TouchableOpacity style={ms.locateBtn} onPress={() => {
          // Re-center to user location
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`map.setView([${userLat}, ${userLng}], 13); true;`);
          }
        }}>
          <Ionicons name="locate" size={18} color={CYAN} />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <Animated.View entering={FadeInDown.delay(50).duration(300)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ms.filterScroll} contentContainerStyle={ms.filterRow}>
          {HUB_FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[ms.filterChip, active && { backgroundColor: f.color + '15', borderColor: f.color + '30' }]}
                activeOpacity={0.7}
                onPress={() => setFilter(f.key)}
              >
                <Ionicons name={f.icon as any} size={12} color={active ? f.color : 'rgba(255,255,255,0.2)'} />
                <Text style={[ms.filterText, active && { color: f.color }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Map */}
      <View style={ms.mapContainer}>
        {loading ? (
          <View style={ms.loadingBox}>
            <ActivityIndicator size="small" color={GOLD} />
            <Text style={ms.loadingText}>Caricamento mappa...</Text>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ html: mapHTML }}
            style={ms.webview}
            originWhitelist={['*']}
            onMessage={onWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            bounces={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Hub Info Card */}
      {selectedHub && (
        <HubInfoCard hub={selectedHub} onClose={() => setSelectedHub(null)} user={user} router={router} />
      )}
    </SafeAreaView>
  );
}

// ═══ Map Screen Styles ═══
const ms = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { color: GOLD, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  headerSub: { color: 'rgba(255,255,255,0.15)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  locateBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,229,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.12)',
  },
  filterScroll: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  filterText: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  mapContainer: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '600' },
});

// ═══ Hub Info Card Styles ═══
const hs = StyleSheet.create({
  card: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0A0A0A', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: SH * 0.55, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  handle: { alignItems: 'center', paddingTop: 10 },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' },
  closeBtn: {
    position: 'absolute', top: 12, right: 16, width: 32, height: 32,
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center', zIndex: 5,
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30, gap: 12 },
  photo: { width: '100%', height: 140, borderRadius: 14 },
  name: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  typeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: 'rgba(0,229,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.12)',
  },
  verifiedText: { color: CYAN, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  stat: { alignItems: 'center', gap: 3 },
  statVal: { fontSize: 16, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.12)', fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.04)' },
  desc: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '500', lineHeight: 17 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressText: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '600', flex: 1 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  tagText: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700' },
  sectionTitle: {
    color: GOLD, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 6,
  },
  coachRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  coachAvatar: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(191,90,242,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(191,90,242,0.15)',
  },
  coachInitials: { color: PURPLE, fontSize: 11, fontWeight: '900' },
  coachInfo: { flex: 1, gap: 2 },
  coachName: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  coachSpecialty: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '600' },
  coachRating: { color: GOLD, fontSize: 11, fontWeight: '800' },
  challengeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 6,
  },
  challengeInfo: { flex: 1, gap: 1 },
  challengeExercise: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  challengeStatus: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '600' },
  templateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 6,
  },
  templateInfo: { flex: 1, gap: 1 },
  templateName: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  templateMeta: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '600' },
  // QR Check-in actions
  qrActionsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  qrBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
  },
  qrBtnText: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
});
