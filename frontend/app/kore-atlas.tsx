/**
 * KORE ATLAS — Interactive Geo-Map of all Performance Records
 * Full-screen dark mode Leaflet map via WebView.
 * Smart Zoom: fitBounds on all pins.
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ActivityIndicator, Platform, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { WebView } from 'react-native-webview';
import { apiClient } from '../utils/api';

const { width: W, height: H } = Dimensions.get('window');
const FONT_M = Platform.select({ ios: 'Montserrat_800ExtraBold', android: 'Montserrat_800ExtraBold', default: 'Montserrat, sans-serif' });
const FONT_B = Platform.select({ ios: 'Montserrat_400Regular', android: 'Montserrat_400Regular', default: 'Montserrat, sans-serif' });

interface AtlasPin {
  id: string;
  lat: number;
  lng: number;
  city: string;
  sport: string;
  tipo: string;
  quality: number;
  flux: number;
  date: string | null;
}

export default function KoreAtlasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [pins, setPins] = useState<AtlasPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) fetchAtlasData();
  }, [token]);

  const fetchAtlasData = async () => {
    try {
      if (!token) {
        console.log('[Atlas] No token available');
        setLoading(false);
        return;
      }
      const API = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';
      const res = await fetch(`${API}/kore/atlas`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setPins(data.pins || []);
      } else {
        console.log('[Atlas] API error:', res.status);
      }
    } catch (e) {
      console.log('[Atlas] fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  // Generate Leaflet HTML with dark tiles and pins
  const generateMapHTML = () => {
    const pinData = JSON.stringify(pins);

    // Default center: Italy if no pins
    const defaultLat = 41.9028;
    const defaultLng = 12.4964;
    const defaultZoom = 5;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #121212; overflow: hidden; }
    #map { width: 100vw; height: 100vh; }
    .pin-popup {
      font-family: 'Montserrat', system-ui, sans-serif;
      color: #FFF;
      background: rgba(18,18,18,0.95);
      border: 1px solid rgba(0,229,255,0.3);
      border-radius: 12px;
      padding: 10px 14px;
      min-width: 160px;
    }
    .pin-popup .city { font-size: 14px; font-weight: 800; color: #00E5FF; letter-spacing: 1px; }
    .pin-popup .sport { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 2px; }
    .pin-popup .quality { font-size: 18px; font-weight: 900; color: #FFD700; margin-top: 4px; }
    .pin-popup .date { font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 3px; }
    .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; border-radius: 0 !important; }
    .leaflet-popup-tip { display: none; }
    .leaflet-popup-close-button { color: #FFF !important; font-size: 16px !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var pins = ${pinData};
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([${defaultLat}, ${defaultLng}], ${defaultZoom});

    // Dark mode tiles (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    // Zoom control bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Custom pin icon
    function createPinIcon(quality) {
      var color = quality >= 80 ? '#FFD700' : quality >= 60 ? '#00E5FF' : quality >= 40 ? '#00FF87' : '#FF3B30';
      return L.divIcon({
        className: '',
        html: '<div style="width:16px;height:16px;border-radius:50%;background:' + color + ';border:2px solid #FFF;box-shadow:0 0 12px ' + color + '60;"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -12]
      });
    }

    var bounds = [];
    pins.forEach(function(pin) {
      if (pin.lat && pin.lng) {
        var marker = L.marker([pin.lat, pin.lng], { icon: createPinIcon(pin.quality) }).addTo(map);
        var dateStr = pin.date ? new Date(pin.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
        var popup = '<div class="pin-popup">' +
          '<div class="city">' + (pin.city || 'POSIZIONE') + '</div>' +
          '<div class="sport">' + pin.sport + ' · ' + pin.tipo + '</div>' +
          '<div class="quality">Q ' + Math.round(pin.quality) + '</div>' +
          (pin.flux > 0 ? '<div class="sport">+' + pin.flux + ' FLUX</div>' : '') +
          '<div class="date">' + dateStr + '</div>' +
        '</div>';
        marker.bindPopup(popup);
        bounds.push([pin.lat, pin.lng]);
      }
    });

    // Smart Zoom: fitBounds
    if (bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 14);
      } else {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }
  </script>
</body>
</html>`;
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Top Bar ── */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={s.titleGroup}>
          <Ionicons name="globe-outline" size={18} color="#00E5FF" />
          <Text style={s.title}>KORE ATLAS</Text>
        </View>
        <View style={s.pinCount}>
          <Ionicons name="location" size={12} color="#FFD700" />
          <Text style={s.pinCountText}>{pins.length}</Text>
        </View>
      </View>

      {/* ── Map ── */}
      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#00E5FF" />
          <Text style={s.loadingText}>Caricamento Atlas...</Text>
        </View>
      ) : pins.length === 0 ? (
        <View style={s.emptyContainer}>
          <Ionicons name="globe-outline" size={56} color="rgba(255,255,255,0.1)" />
          <Text style={s.emptyTitle}>ATLAS VUOTO</Text>
          <Text style={s.emptyDesc}>
            Completa protocolli con la geolocalizzazione attiva per popolare la tua mappa.
          </Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={s.emptyBtnText}>TORNA AL KORE ID</Text>
          </TouchableOpacity>
        </View>
      ) : Platform.OS === 'web' ? (
        <iframe
          srcDoc={generateMapHTML()}
          style={{ flex: 1, width: '100%', height: '100%', border: 'none' } as any}
        />
      ) : (
        <WebView
          source={{ html: generateMapHTML() }}
          style={s.webview}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={s.loadingOverlay}>
              <ActivityIndicator size="large" color="#00E5FF" />
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#121212',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  titleGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: {
    color: '#FFF', fontSize: 16, fontWeight: '900',
    letterSpacing: 2, fontFamily: FONT_M,
  },
  pinCount: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
  },
  pinCountText: {
    color: '#FFD700', fontSize: 13, fontWeight: '800', fontFamily: FONT_M,
  },
  webview: { flex: 1 },
  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '600', fontFamily: FONT_B,
  },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_M,
  },
  emptyDesc: {
    color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '500',
    textAlign: 'center', lineHeight: 20, fontFamily: FONT_B,
  },
  emptyBtn: {
    marginTop: 12, backgroundColor: '#00E5FF', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  emptyBtnText: {
    color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_M,
  },
});
