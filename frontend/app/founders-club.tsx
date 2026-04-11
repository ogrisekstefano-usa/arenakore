/**
 * ARENAKORE — FOUNDERS CLUB
 * Legacy Founder card premium.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';

const GOLD = '#FFD700';

export default function FoundersClub() {
  const { user } = useAuth();
  const router = useRouter();
  const isFounder = user?.is_founder || user?.is_admin;
  const founderNum = user?.founder_number || '—';

  return (
    <View style={fc$.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#000' }}>
        <View style={fc$.header}>
          <TouchableOpacity onPress={() => router.back()} style={fc$.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={GOLD} />
          </TouchableOpacity>
          <Text style={fc$.headerTitle}>FOUNDERS CLUB</Text>
        </View>
      </SafeAreaView>

      <View style={fc$.content}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={fc$.card}>
          <View style={fc$.cardGlow} />
          <View style={fc$.cardHeader}>
            <Ionicons name="star" size={28} color={GOLD} />
            <Text style={fc$.cardBadge}>LEGACY FOUNDER</Text>
          </View>
          <Text style={fc$.founderNum}>#{String(founderNum).padStart(3, '0')}</Text>
          <Text style={fc$.founderName}>{(user?.username || 'KORE').toUpperCase()}</Text>

          <View style={fc$.divider} />

          <View style={fc$.perks}>
            <View style={fc$.perk}>
              <Ionicons name="infinite" size={16} color={GOLD} />
              <Text style={fc$.perkText}>Accesso illimitato a tutte le feature PRO</Text>
            </View>
            <View style={fc$.perk}>
              <Ionicons name="diamond" size={16} color={GOLD} />
              <Text style={fc$.perkText}>Badge FOUNDER permanente nel profilo</Text>
            </View>
            <View style={fc$.perk}>
              <Ionicons name="flash" size={16} color={GOLD} />
              <Text style={fc$.perkText}>+50% moltiplicatore K-FLUX su ogni sfida</Text>
            </View>
            <View style={fc$.perk}>
              <Ionicons name="people" size={16} color={GOLD} />
              <Text style={fc$.perkText}>Early access a nuove feature e beta test</Text>
            </View>
            <View style={fc$.perk}>
              <Ionicons name="trophy" size={16} color={GOLD} />
              <Text style={fc$.perkText}>Hall of Fame — La tua eredità è permanente</Text>
            </View>
          </View>
        </Animated.View>

        {!isFounder && (
          <Animated.View entering={FadeInDown.delay(300).duration(300)} style={fc$.lockedCard}>
            <Ionicons name="lock-closed" size={24} color="rgba(255,255,255,0.15)" />
            <Text style={fc$.lockedTitle}>NON SEI UN FOUNDER</Text>
            <Text style={fc$.lockedDesc}>I primi 100 utenti registrati ricevono lo status Legacy Founder permanente.</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const fc$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,215,0,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: GOLD, fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  content: { paddingHorizontal: 20, paddingTop: 12, gap: 16 },
  card: { padding: 24, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.2)', backgroundColor: '#0A0A0A', alignItems: 'center', gap: 8, overflow: 'hidden', position: 'relative' },
  cardGlow: { position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,215,0,0.03)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardBadge: { color: GOLD, fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  founderNum: { color: GOLD, fontSize: 48, fontWeight: '900', letterSpacing: 2, marginTop: 4 },
  founderName: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '700', letterSpacing: 4 },
  divider: { width: '60%', height: 1, backgroundColor: 'rgba(255,215,0,0.1)', marginVertical: 12 },
  perks: { gap: 10, width: '100%', paddingHorizontal: 8 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  perkText: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '500', flex: 1 },
  lockedCard: { alignItems: 'center', gap: 8, padding: 24, borderRadius: 14, borderWidth: 1, borderColor: '#1C1C1E', backgroundColor: '#0A0A0A' },
  lockedTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  lockedDesc: { color: 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: '400', textAlign: 'center', lineHeight: 18 },
});
