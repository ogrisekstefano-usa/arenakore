import Haptics from '../utils/haptics';
/**
 * ARENAKORE — FLUX GENERATOR v1.0 "NIKE ELITE SHOP"
 * Premium FLUX recharge with Crew Squad Boost.
 * Tiers: SPARK, KINETIC, CORE, DOMINATION.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, Platform, ActivityIndicator, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

const FONT_J = Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined });
const FONT_M = Platform.select({ web: 'Montserrat, sans-serif', default: undefined });

const TIERS = [
  {
    key: 'SPARK', flux: 1000, crew_pct: 0,
    label: 'SPARK', tagline: 'Accendi la fiamma.',
    icon: 'flash-outline' as const,
    colors: ['#1A1A1A', '#222222'] as [string, string],
    accent: '#FFD700', border: 'rgba(255,215,0,0.15)',
    badge: null
  },
  {
    key: 'KINETIC', flux: 3000, crew_pct: 5,
    label: 'KINETIC', tagline: '+5% Squad Boost per la Crew.',
    icon: 'rocket-outline' as const,
    colors: ['#0D1A1F', '#0A1318'] as [string, string],
    accent: '#00E5FF', border: 'rgba(0,229,255,0.20)',
    badge: 'POPULAR'
  },
  {
    key: 'CORE', flux: 7500, crew_pct: 10,
    label: 'CORE', tagline: '+10% Squad Boost. Il cuore della Crew.',
    icon: 'shield-checkmark' as const,
    colors: ['#0D1F0D', '#081408'] as [string, string],
    accent: '#00FF87', border: 'rgba(0,255,135,0.20)',
    badge: 'BEST VALUE'
  },
  {
    key: 'DOMINATION', flux: 20000, crew_pct: 15,
    label: 'DOMINATION', tagline: '+15% Boost + Sponsor Slot Arena.',
    icon: 'diamond' as const,
    colors: ['#1F0D0D', '#180808'] as [string, string],
    accent: '#FF3B30', border: 'rgba(255,59,48,0.25)',
    badge: 'ELITE'
  },
];

interface FluxGeneratorProps {
  visible: boolean;
  onClose: () => void;
  onPurchased?: () => void;
}

export function FluxGenerator({ visible, onClose, onPurchased }: FluxGeneratorProps) {
  const insets = useSafeAreaInsets();
  const { user, token, refreshUser } = useAuth();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [successTier, setSuccessTier] = useState<any>(null);

  const userFlux = user?.ak_credits ?? user?.flux ?? 0;

  const handlePurchase = async (tier: typeof TIERS[0]) => {
    if (purchasing) return;
    setPurchasing(tier.key);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    try {
      const backendUrl = 'https://arenakore-api-v2.onrender.com';
      const res = await fetch(`${backendUrl}/api/flux/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ tier: tier.key })
      });
      const data = await res.json();
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setSuccessTier({ ...tier, ...data });
        if (refreshUser) await refreshUser();
        onPurchased?.();
      } else {
        Alert.alert('Errore', data.detail || 'Acquisto fallito');
      }
    } catch {
      Alert.alert('Errore', 'Connessione fallita');
    } finally {
      setPurchasing(null);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessTier(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={[s.backdrop, { paddingTop: insets.top }]}>
        {/* SUCCESS OVERLAY */}
        {successTier && (
          <Animated.View entering={FadeIn.duration(400)} style={s.successOverlay}>
            <LinearGradient colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.98)']} style={s.successGrad}>
              <Animated.View entering={FadeInDown.delay(200)}>
                <Ionicons name="flash" size={64} color={successTier.accent} />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(400)} style={s.successContent}>
                <Text style={[s.successTitle, { color: successTier.accent }]}>
                  +{successTier.flux_added?.toLocaleString()} FLUX
                </Text>
                <Text style={s.successSub}>
                  Tier {successTier.key} attivato!
                </Text>
                {successTier.crew_bonus_total > 0 && (
                  <View style={[s.crewBoostBadge, { borderColor: successTier.accent + '30' }]}>
                    <Ionicons name="people" size={16} color={successTier.accent} />
                    <Text style={[s.crewBoostText, { color: successTier.accent }]}>
                      SQUAD BOOST: +{successTier.crew_bonus_total} K-FLUX alla Crew!
                    </Text>
                  </View>
                )}
                <Text style={s.successBalance}>
                  Nuovo Saldo: {successTier.new_balance?.toLocaleString()} ⚡
                </Text>
              </Animated.View>
              <TouchableOpacity style={[s.closeSuccessBtn, { borderColor: successTier.accent }]} onPress={handleCloseSuccess}>
                <Text style={[s.closeSuccessBtnText, { color: successTier.accent }]}>CHIUDI</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )}

        {/* HEADER */}
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.backBtn}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>K-FLUX GENERATOR</Text>
            <Text style={s.headerSub}>Inietta energia nel tuo DNA.</Text>
          </View>
          <View style={s.balanceBadge}>
            <Ionicons name="flash" size={12} color="#FFD700" />
            <Text style={s.balanceText}>{userFlux.toLocaleString()}</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {/* Publishing Fees Info */}
          <Animated.View entering={FadeInDown.delay(100)} style={s.feesCard}>
            <Text style={s.feesTitle}>COSTI DI PUBBLICAZIONE</Text>
            <View style={s.feesGrid}>
              <FeeChip label="SOLO" fee={0} color="#00E5FF" />
              <FeeChip label="AMICO" fee={25} color="#FF3B30" />
              <FeeChip label="RANKED" fee={50} color="#FFD700" />
              <FeeChip label="LIVE" fee={100} color="#00FF87" />
            </View>
          </Animated.View>

          {/* TIER CARDS */}
          {TIERS.map((tier, i) => (
            <Animated.View key={tier.key} entering={FadeInDown.delay(200 + i * 80)}>
              <TouchableOpacity
                style={[s.tierCard, { borderColor: tier.border }]}
                onPress={() => handlePurchase(tier)}
                activeOpacity={0.85}
                disabled={!!purchasing}
              >
                <LinearGradient colors={tier.colors} style={s.tierGrad}>
                  {tier.badge && (
                    <View style={[s.tierBadge, { backgroundColor: tier.accent }]}>
                      <Text style={s.tierBadgeText}>{tier.badge}</Text>
                    </View>
                  )}
                  <View style={s.tierTop}>
                    <View style={[s.tierIconBox, { backgroundColor: tier.accent + '12' }]}>
                      <Ionicons name={tier.icon} size={24} color={tier.accent} />
                    </View>
                    <View style={s.tierInfo}>
                      <Text style={[s.tierLabel, { color: tier.accent }]}>{tier.label}</Text>
                      <Text style={s.tierTagline}>{tier.tagline}</Text>
                    </View>
                  </View>
                  <View style={s.tierBottom}>
                    <Text style={[s.tierFlux, { color: tier.accent }]}>
                      {tier.flux.toLocaleString()} ⚡
                    </Text>
                    {purchasing === tier.key ? (
                      <ActivityIndicator color={tier.accent} />
                    ) : (
                      <View style={[s.tierBtn, { backgroundColor: tier.accent }]}>
                        <Text style={s.tierBtnText}>RICARICA</Text>
                      </View>
                    )}
                  </View>
                  {tier.crew_pct > 0 && (
                    <View style={s.crewRow}>
                      <Ionicons name="people" size={12} color={tier.accent + '60'} />
                      <Text style={[s.crewLabel, { color: tier.accent + '60' }]}>
                        +{tier.crew_pct}% Squad Boost automatico
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function FeeChip({ label, fee, color }: { label: string; fee: number; color: string }) {
  return (
    <View style={[s.feeChip, { borderColor: color + '20' }]}>
      <Text style={[s.feeLabel, { color: color + '80' }]}>{label}</Text>
      <Text style={[s.feeVal, { color }]}>{fee === 0 ? 'FREE' : `${fee}⚡`}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)'
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center'
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#FFD700', fontSize: 16, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
  headerSub: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '500', fontFamily: FONT_M, marginTop: 2 },
  balanceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)'
  },
  balanceText: { color: '#FFD700', fontSize: 14, fontWeight: '900', fontFamily: FONT_J },
  body: { paddingHorizontal: 16, paddingTop: 16 },

  // Fees
  feesCard: {
    padding: 14, borderRadius: 14, marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)'
  },
  feesTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800', letterSpacing: 2.5, fontFamily: FONT_M, marginBottom: 10 },
  feesGrid: { flexDirection: 'row', gap: 8 },
  feeChip: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)'
  },
  feeLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1.5, fontFamily: FONT_M, marginBottom: 2 },
  feeVal: { fontSize: 14, fontWeight: '900', fontFamily: FONT_J },

  // Tier Cards
  tierCard: { borderRadius: 18, overflow: 'hidden', marginBottom: 12, borderWidth: 1.5 },
  tierGrad: { padding: 18, position: 'relative' },
  tierBadge: {
    position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8
  },
  tierBadgeText: { color: '#0A0A0A', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },
  tierTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  tierIconBox: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tierInfo: { flex: 1 },
  tierLabel: { fontSize: 18, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },
  tierTagline: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '500', fontFamily: FONT_M, marginTop: 2 },
  tierBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tierFlux: { fontSize: 28, fontWeight: '900', fontFamily: FONT_J },
  tierBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  tierBtnText: { color: '#0A0A0A', fontSize: 13, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
  crewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  crewLabel: { fontSize: 10, fontWeight: '600', fontFamily: FONT_M },

  // Success
  successOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  successGrad: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  successContent: { alignItems: 'center', marginTop: 20 },
  successTitle: { fontSize: 40, fontWeight: '900', fontFamily: FONT_J, letterSpacing: 1 },
  successSub: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600', fontFamily: FONT_M, marginTop: 6 },
  crewBoostBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)'
  },
  crewBoostText: { fontSize: 13, fontWeight: '800', fontFamily: FONT_J },
  successBalance: { color: 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: '700', fontFamily: FONT_J, marginTop: 16 },
  closeSuccessBtn: {
    marginTop: 30, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5
  },
  closeSuccessBtnText: { fontSize: 14, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J }
});
