/**
 * FLUSH DETAIL MODAL — Build 28
 * ═══════════════════════════════
 * Blur-backed modal showing FLUSH tier details:
 * - Name, current value, goal progress
 * - Unlockable features at next level
 */
import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const GOLD = '#FFD700';
const CYAN = '#00E5FF';
const PURPLE = '#E040FB';

interface FlushTier {
  key: string;
  name: string;
  icon: string;
  color: string;
  value: number;
  goal: number;
  perks: string[];
}

const TIERS: FlushTier[] = [
  {
    key: 'neon', name: 'NEON FLUX', icon: 'flash', color: CYAN, value: 0, goal: 1000,
    perks: [
      'Sblocca AI Matchmaker (500 K-FLUX)',
      'Accesso Template Coach Certificati',
      'Partecipazione Crew Battle',
      'Custom Avatar Frame',
    ],
  },
  {
    key: 'master', name: 'MASTER FLUX', icon: 'shield-half', color: GOLD, value: 0, goal: 100,
    perks: [
      'Crea Template Premium',
      'Pubblica sfide personalizzate',
      'Accesso Hall of Fame Elite',
      'Badge "Master" nel profilo',
    ],
  },
  {
    key: 'diamond', name: 'DIAMOND FLUX', icon: 'diamond', color: PURPLE, value: 0, goal: 50,
    perks: [
      'Status "Diamond" permanente',
      'Priorità nel Matchmaking AI',
      'Sblocco tutte le Skin',
      'Accesso anticipato nuove funzioni',
    ],
  },
];

interface FlushModalProps {
  visible: boolean;
  onClose: () => void;
  neonFlux: number;
  masterFlux: number;
  diamondFlux: number;
  initialTier?: number; // 0 = neon, 1 = master, 2 = diamond
}

export function FlushModal({ visible, onClose, neonFlux, masterFlux, diamondFlux, initialTier = 0 }: FlushModalProps) {
  const [activeTier, setActiveTier] = React.useState(initialTier);

  React.useEffect(() => { setActiveTier(initialTier); }, [initialTier]);

  const values = [neonFlux, masterFlux, diamondFlux];
  const tier = { ...TIERS[activeTier], value: values[activeTier] };
  const progress = Math.min((tier.value / tier.goal) * 100, 100);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={Platform.OS === 'ios' ? 60 : 30} tint="dark" style={StyleSheet.absoluteFill}>
        <TouchableOpacity style={fm.backdrop} activeOpacity={1} onPress={onClose}>
          <Animated.View entering={FadeInDown.duration(300)} style={fm.card}>
            <TouchableOpacity activeOpacity={1}>
              {/* Tier selector */}
              <View style={fm.tierTabs}>
                {TIERS.map((t, i) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[fm.tierTab, activeTier === i && { borderColor: t.color, backgroundColor: t.color + '10' }]}
                    onPress={() => setActiveTier(i)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={t.icon as any} size={14} color={activeTier === i ? t.color : 'rgba(255,255,255,0.3)'} />
                    <Text style={[fm.tierTabLabel, activeTier === i && { color: t.color }]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Active tier detail */}
              <Animated.View entering={FadeIn.duration(200)} key={tier.key} style={fm.detail}>
                <View style={[fm.iconCircle, { backgroundColor: tier.color + '12' }]}>
                  <Ionicons name={tier.icon as any} size={32} color={tier.color} />
                </View>
                <Text style={[fm.tierName, { color: tier.color }]}>{tier.name}</Text>

                {/* Value */}
                <View style={fm.valueRow}>
                  <Text style={[fm.valueNum, { color: tier.color }]}>{tier.value.toLocaleString()}</Text>
                  <Text style={fm.valueGoal}>/ {tier.goal.toLocaleString()}</Text>
                </View>

                {/* Progress bar */}
                <View style={fm.progressTrack}>
                  <View style={[fm.progressFill, { width: `${progress}%`, backgroundColor: tier.color }]} />
                </View>
                <Text style={fm.progressLabel}>{progress.toFixed(0)}% verso il prossimo livello</Text>

                {/* Perks */}
                <View style={fm.perksSection}>
                  <Text style={fm.perksTitle}>VANTAGGI SBLOCCABILI</Text>
                  {tier.perks.map((perk, i) => (
                    <View key={i} style={fm.perkRow}>
                      <Ionicons name="checkmark-circle" size={14} color={tier.value >= (tier.goal * (i + 1) / tier.perks.length) ? tier.color : 'rgba(255,255,255,0.12)'} />
                      <Text style={[fm.perkText, tier.value >= (tier.goal * (i + 1) / tier.perks.length) && { color: 'rgba(255,255,255,0.7)' }]}>{perk}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>

              {/* Close */}
              <TouchableOpacity style={fm.closeBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={fm.closeBtnText}>CHIUDI</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
}

const fm = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 380, backgroundColor: 'rgba(10,10,10,0.95)',
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  tierTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  tierTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 14, borderBottomWidth: 2, borderColor: 'transparent',
  },
  tierTabLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  detail: { padding: 24, alignItems: 'center', gap: 12 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  tierName: { fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  valueNum: { fontSize: 42, fontWeight: '900', letterSpacing: -1 },
  valueGoal: { color: 'rgba(255,255,255,0.2)', fontSize: 16, fontWeight: '700' },
  progressTrack: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '600' },
  perksSection: { width: '100%', marginTop: 8, gap: 10 },
  perksTitle: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 4 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  perkText: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '600', flex: 1 },
  closeBtn: { alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  closeBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
});
