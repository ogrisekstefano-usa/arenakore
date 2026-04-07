/**
 * ARENAKORE — KORE ATLAS
 * Mappa delle performance completate.
 * Placeholder — verrà integrata con MapView in EAS Build.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FM = Platform.select({ web: "'Montserrat', sans-serif", default: undefined });
const FJ = Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined });

export default function KoreAtlasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top + 12 }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#00E5FF" />
        </TouchableOpacity>
        <Text style={s.title}>KORE ATLAS</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Map Placeholder */}
      <View style={s.mapArea}>
        <View style={s.globe}>
          <Ionicons name="globe-outline" size={80} color="rgba(0,229,255,0.25)" />
        </View>
        <Text style={s.comingSoon}>MAPPA INTERATTIVA</Text>
        <Text style={s.sub}>
          Le tue sfide e performance geolocalizzate appariranno qui.
        </Text>
        <View style={s.badge}>
          <Ionicons name="location-outline" size={14} color="#FFD700" />
          <Text style={s.badgeText}>DISPONIBILE CON EAS BUILD</Text>
        </View>
      </View>

      {/* Feature List */}
      <View style={s.features}>
        <FeatureRow icon="pin" label="Pin Performance" desc="Ogni sfida completata viene localizzata" />
        <FeatureRow icon="flame" label="Heatmap Attività" desc="Visualizza le zone di allenamento più calde" />
        <FeatureRow icon="people" label="Crew Zones" desc="Scopri dove si allenano le Crew rivali" />
      </View>
    </View>
  );
}

function FeatureRow({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <View style={s.fRow}>
      <View style={s.fIcon}>
        <Ionicons name={icon as any} size={18} color="#00E5FF" />
      </View>
      <View style={s.fText}>
        <Text style={s.fLabel}>{label}</Text>
        <Text style={s.fDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(0,229,255,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 3, fontFamily: FJ },
  mapArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16,
    marginHorizontal: 24,
    borderRadius: 24, borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.08)',
    backgroundColor: 'rgba(0,229,255,0.02)',
  },
  globe: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(0,229,255,0.04)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.10)',
  },
  comingSoon: {
    color: '#00E5FF', fontSize: 16, fontWeight: '900', letterSpacing: 4, fontFamily: FJ,
  },
  sub: {
    color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '500', fontFamily: FM,
    textAlign: 'center', paddingHorizontal: 40,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)',
  },
  badgeText: { color: '#FFD700', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, fontFamily: FM },
  features: { paddingHorizontal: 24, paddingBottom: 40, gap: 4 },
  fRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  fIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(0,229,255,0.06)', alignItems: 'center', justifyContent: 'center',
  },
  fText: { flex: 1 },
  fLabel: { color: '#FFF', fontSize: 13, fontWeight: '800', letterSpacing: 1, fontFamily: FJ },
  fDesc: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '500', fontFamily: FM, marginTop: 2 },
});
