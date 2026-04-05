/**
 * ARENAKORE — FLUX STORE MODAL
 * Purchase FLUX packages with Squad Boost mechanic
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet,
  Dimensions, ActivityIndicator, Alert,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../utils/api';

const { width: SW } = Dimensions.get('window');
const FONT_M = 'Montserrat_800ExtraBold';
const FONT_J = 'PlusJakartaSans_800ExtraBold';

interface FluxPackage {
  id: string;
  label: string;
  flux: number;
  price_label: string;
  crew_boost_pct: number;
  crew_bonus_per_member: number;
  crew_members_count: number;
  total_crew_bonus: number;
  has_crew_boost: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userFlux: number;
  onPurchase: (pkg: any) => void;
}

const PKG_ICONS: Record<string, string> = {
  spark: 'flash-outline',
  kinetic: 'flash',
  power: 'rocket',
  ultra: 'diamond',
};

const PKG_COLORS: Record<string, string> = {
  spark: '#888888',
  kinetic: '#00E5FF',
  power: '#FFD700',
  ultra: '#FF2D55',
};

export function FluxStoreModal({ visible, onClose, userFlux, onPurchase }: Props) {
  const [packages, setPackages] = useState<FluxPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [hasCrew, setHasCrew] = useState(false);
  const [crewName, setCrewName] = useState('');
  const [fees, setFees] = useState<Record<string, number>>({});

  const loadPackages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient('/api/flux/packages');
      if (res.packages) {
        setPackages(res.packages);
        setHasCrew(res.has_crew);
        setCrewName(res.crew_name || '');
        setFees(res.publish_fees || {});
      }
    } catch (e) {
      console.log('Failed to load packages', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) loadPackages();
  }, [visible, loadPackages]);

  const handlePurchase = async (pkgId: string) => {
    setPurchasing(pkgId);
    try {
      const res = await apiClient('/api/flux/purchase', {
        method: 'POST',
        body: JSON.stringify({ package_id: pkgId }),
      });
      if (res.status === 'purchased') {
        onPurchase(res);
        Alert.alert(
          '⚡ FLUX Acquistati!',
          `+${res.flux_added} FLUX${res.crew_boost?.active ? `\n\n🔥 Squad Boost: +${res.crew_boost.bonus_per_member} FLUX a ${res.crew_boost.members_boosted} membri di ${res.crew_boost.crew_name}` : ''}`,
        );
      }
    } catch (e: any) {
      Alert.alert('Errore', e.message || 'Acquisto fallito');
    } finally {
      setPurchasing(null);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={s.backdrop}>
        <Animated.View entering={ZoomIn.duration(300)} style={s.card}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Ionicons name="flash" size={18} color="#FFD700" />
              <Text style={s.title}>FLUX STORE</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          </View>

          {/* Current Balance */}
          <View style={s.balanceRow}>
            <Text style={s.balanceLabel}>BILANCIO ATTUALE</Text>
            <Text style={s.balanceValue}>{userFlux}</Text>
            <Text style={s.balanceUnit}>FLUX</Text>
          </View>

          {/* Crew Status */}
          {hasCrew && (
            <Animated.View entering={FadeIn.duration(300)} style={s.crewBanner}>
              <Ionicons name="people" size={14} color="#00E5FF" />
              <Text style={s.crewText}>Crew: <Text style={{ color: '#fff' }}>{crewName}</Text></Text>
              <Text style={s.crewBoostLabel}>SQUAD BOOST ATTIVO</Text>
            </Animated.View>
          )}

          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator size="large" color="#00E5FF" style={{ marginTop: 40 }} />
            ) : (
              <>
                {/* Packages */}
                {packages.map((pkg, i) => {
                  const color = PKG_COLORS[pkg.id] || '#00E5FF';
                  const icon = PKG_ICONS[pkg.id] || 'flash';
                  const isPurchasing = purchasing === pkg.id;
                  const isFree = pkg.price_label === 'Gratuito';

                  return (
                    <Animated.View key={pkg.id} entering={FadeInDown.delay(i * 80).duration(300)}>
                      <TouchableOpacity
                        style={[s.pkgCard, { borderColor: color + '44' }]}
                        activeOpacity={0.8}
                        onPress={() => handlePurchase(pkg.id)}
                        disabled={isPurchasing}
                      >
                        <View style={s.pkgTop}>
                          <View style={[s.pkgIconWrap, { backgroundColor: color + '15' }]}>
                            <Ionicons name={icon as any} size={22} color={color} />
                          </View>
                          <View style={s.pkgInfo}>
                            <Text style={[s.pkgLabel, { color }]}>{pkg.label.toUpperCase()}</Text>
                            <Text style={s.pkgFlux}>{pkg.flux} FLUX</Text>
                          </View>
                          <View style={s.pkgPriceWrap}>
                            {isPurchasing ? (
                              <ActivityIndicator size="small" color={color} />
                            ) : (
                              <Text style={[s.pkgPrice, { color }]}>{pkg.price_label}</Text>
                            )}
                          </View>
                        </View>

                        {/* Squad Boost info */}
                        {pkg.has_crew_boost && hasCrew && (
                          <View style={[s.boostRow, { borderTopColor: color + '22' }]}>
                            <Ionicons name="rocket" size={12} color={color} />
                            <Text style={[s.boostText, { color: color + 'CC' }]}>
                              SQUAD BOOST: +{pkg.crew_bonus_per_member} FLUX × {pkg.crew_members_count} membri = {pkg.total_crew_bonus} FLUX
                            </Text>
                          </View>
                        )}
                        {pkg.has_crew_boost && !hasCrew && (
                          <View style={[s.boostRow, { borderTopColor: '#333' }]}>
                            <Ionicons name="lock-closed" size={12} color="#555" />
                            <Text style={[s.boostText, { color: '#555' }]}>
                              Entra in una Crew per attivare Squad Boost ({pkg.crew_boost_pct}%)
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}

                {/* Publishing Fees Info */}
                <View style={s.feeSection}>
                  <Text style={s.feeTitle}>COSTI PUBBLICAZIONE</Text>
                  {Object.entries(fees).map(([dest, fee]) => (
                    <View key={dest} style={s.feeRow}>
                      <Text style={s.feeDest}>{dest.toUpperCase()}</Text>
                      <Text style={[s.feeCost, fee === 0 && { color: '#00FF87' }]}>
                        {fee === 0 ? 'GRATUITO' : `${fee} FLUX`}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  card: { width: SW * 0.92, maxHeight: '85%', backgroundColor: '#0A0A0A', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#FFD700', fontSize: 14, fontWeight: '900', letterSpacing: 4, fontFamily: FONT_M },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, paddingVertical: 16 },
  balanceLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  balanceValue: { color: '#FFD700', fontSize: 36, fontWeight: '900', fontFamily: FONT_J },
  balanceUnit: { color: 'rgba(255,215,0,0.5)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  crewBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 8, backgroundColor: 'rgba(0,229,255,0.05)', marginHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,229,255,0.10)' },
  crewText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700' },
  crewBoostLabel: { color: '#00E5FF', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginLeft: 'auto' as any },
  scroll: { flex: 1, paddingHorizontal: 14, paddingBottom: 20 },
  pkgCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, marginTop: 12, overflow: 'hidden' },
  pkgTop: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  pkgIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pkgInfo: { flex: 1 },
  pkgLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 3, fontFamily: FONT_M },
  pkgFlux: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', marginTop: 2, fontFamily: FONT_J },
  pkgPriceWrap: { alignItems: 'flex-end' },
  pkgPrice: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  boostRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1 },
  boostText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  feeSection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  feeTitle: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 10, textAlign: 'center' },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 8 },
  feeDest: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  feeCost: { color: '#FFD700', fontSize: 12, fontWeight: '900', fontFamily: FONT_J },
});
