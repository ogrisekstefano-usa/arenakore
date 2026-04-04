/**
 * ARENAKORE — REWARD STORE
 * Badge, medaglie e ricompense KORE disponibili.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

const REWARDS = [
  { id: 'badge_first_scan', icon: 'scan', color: '#00E5FF', title: 'PRIMO SCAN', desc: 'Completa il tuo primo NEXUS Scan biometrico', flux: 0, requirement: '1 Scan' },
  { id: 'badge_10_scans', icon: 'medal', color: '#FFD700', title: '10 SCAN CLUB', desc: 'Raggiungi 10 scan biometrici completati', flux: 50, requirement: '10 Scans' },
  { id: 'badge_streak_7', icon: 'flame', color: '#FF6B00', title: 'STREAK 7 GIORNI', desc: '7 giorni consecutivi di attività', flux: 100, requirement: '7-day streak' },
  { id: 'badge_duel_win', icon: 'flash', color: '#FF3B30', title: 'DUEL WINNER', desc: 'Vinci il tuo primo duello 1vs1', flux: 25, requirement: '1 Duel Won' },
  { id: 'badge_crew_mvp', icon: 'shield', color: '#AF52DE', title: 'CREW MVP', desc: 'Diventa MVP della tua Crew in una battaglia', flux: 75, requirement: 'Crew MVP' },
  { id: 'badge_certified', icon: 'shield-checkmark', color: '#00FF87', title: 'NEXUS CERTIFIED', desc: 'Ottieni la certificazione NEXUS completa', flux: 200, requirement: 'NEXUS Certification' },
  { id: 'badge_flux_1000', icon: 'diamond', color: '#FFD700', title: '1000 FLUX', desc: 'Accumula 1000 FLUX totali', flux: 0, requirement: '1000 FLUX earned' },
  { id: 'badge_top10', icon: 'podium', color: '#FF9500', title: 'TOP 10 CITY', desc: 'Entra nella Top 10 della tua città', flux: 150, requirement: 'City Top 10' },
];

export default function RewardStore() {
  const { user, token } = useAuth();
  const router = useRouter();
  const flux = user?.flux ?? user?.ak_credits ?? 0;
  const [earned, setEarned] = useState<string[]>([]);

  useEffect(() => {
    // Mock: check which badges the user has earned
    const e: string[] = [];
    if (user?.total_scans >= 1) e.push('badge_first_scan');
    if (user?.total_scans >= 10) e.push('badge_10_scans');
    if (user?.is_nexus_certified) e.push('badge_certified');
    if ((user?.flux || user?.ak_credits || 0) >= 1000) e.push('badge_flux_1000');
    setEarned(e);
  }, [user]);

  return (
    <View style={rs$.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#000' }}>
        <View style={rs$.header}>
          <TouchableOpacity onPress={() => router.back()} style={rs$.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#00E5FF" />
          </TouchableOpacity>
          <Text style={rs$.headerTitle}>REWARD STORE</Text>
          <View style={rs$.fluxBadge}>
            <Ionicons name="water" size={12} color="#00E5FF" />
            <Text style={rs$.fluxText}>{flux}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={rs$.scroll} showsVerticalScrollIndicator={false}>
        <Text style={rs$.sectionLabel}>BADGE & MEDAGLIE DISPONIBILI</Text>
        {REWARDS.map((r, i) => {
          const isEarned = earned.includes(r.id);
          return (
            <Animated.View key={r.id} entering={FadeInDown.delay(i * 60).duration(300)}>
              <View style={[rs$.card, isEarned && rs$.cardEarned, { borderColor: isEarned ? r.color + '40' : '#1C1C1E' }]}>
                <View style={[rs$.iconWrap, { backgroundColor: isEarned ? r.color + '15' : '#0A0A0A' }]}>
                  <Ionicons name={r.icon as any} size={24} color={isEarned ? r.color : '#444'} />
                </View>
                <View style={rs$.cardContent}>
                  <View style={rs$.cardTop}>
                    <Text style={[rs$.cardTitle, isEarned && { color: '#FFF' }]}>{r.title}</Text>
                    {isEarned && (
                      <View style={[rs$.earnedBadge, { backgroundColor: r.color + '20', borderColor: r.color + '40' }]}>
                        <Ionicons name="checkmark" size={10} color={r.color} />
                        <Text style={[rs$.earnedText, { color: r.color }]}>OTTENUTO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={rs$.cardDesc}>{r.desc}</Text>
                  <View style={rs$.cardBottom}>
                    <Text style={rs$.reqText}>{r.requirement}</Text>
                    {r.flux > 0 && <Text style={rs$.fluxReward}>+{r.flux} FLUX</Text>}
                  </View>
                </View>
              </View>
            </Animated.View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const rs$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,229,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  fluxBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,229,255,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)' },
  fluxText: { color: '#00E5FF', fontSize: 14, fontWeight: '900' },
  scroll: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
  sectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', letterSpacing: 3, marginBottom: 4, marginTop: 4 },
  card: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, backgroundColor: '#0A0A0A' },
  cardEarned: { backgroundColor: '#0D0D0D' },
  iconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
  earnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  earnedText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  cardDesc: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '400', lineHeight: 16 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  reqText: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  fluxReward: { color: '#FFD700', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
});
