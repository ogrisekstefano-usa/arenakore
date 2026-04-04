/**
 * ARENAKORE — SUPPORT PAGE
 * Contatto diretto con il team ARENAKORE.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

const SUPPORT_EMAIL = 'support@arenakore.com';

export default function SupportPage() {
  const router = useRouter();

  const handleEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=ARENAKORE%20Support%20Request`).catch(() => {});
  };

  return (
    <View style={sp$.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#000' }}>
        <View style={sp$.header}>
          <TouchableOpacity onPress={() => router.back()} style={sp$.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={sp$.headerTitle}>SUPPORTO</Text>
        </View>
      </SafeAreaView>

      <View style={sp$.content}>
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={sp$.heroCard}>
          <Ionicons name="headset" size={40} color="#00E5FF" />
          <Text style={sp$.heroTitle}>HAI BISOGNO DI AIUTO?</Text>
          <Text style={sp$.heroDesc}>Il team ARENAKORE è a tua disposizione per qualsiasi problema tecnico, feedback o suggerimento.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <TouchableOpacity style={sp$.emailCard} onPress={handleEmail} activeOpacity={0.85}>
            <View style={sp$.emailIcon}>
              <Ionicons name="mail" size={22} color="#00E5FF" />
            </View>
            <View style={sp$.emailContent}>
              <Text style={sp$.emailLabel}>EMAIL DIRETTA</Text>
              <Text style={sp$.emailAddr}>{SUPPORT_EMAIL}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(300)} style={sp$.faqSection}>
          <Text style={sp$.faqTitle}>FAQ RAPIDE</Text>
          {[
            { q: 'Il mio Apple Watch non si connette', a: 'Vai in Health Hub → FORZA SINCRONIZZAZIONE.' },
            { q: 'Come funziona il punteggio FLUX?', a: 'Guadagni FLUX completando sfide. Più alta la qualità, più FLUX.' },
            { q: 'Il QR Code non viene scansionato', a: 'Assicurati che la luminosità dello schermo sia al massimo.' },
          ].map((faq, i) => (
            <View key={i} style={sp$.faqCard}>
              <Text style={sp$.faqQ}>{faq.q}</Text>
              <Text style={sp$.faqA}>{faq.a}</Text>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const sp$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  content: { paddingHorizontal: 20, paddingTop: 12, gap: 16 },
  heroCard: { alignItems: 'center', gap: 10, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#1C1C1E', backgroundColor: '#0A0A0A' },
  heroTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  heroDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '400', textAlign: 'center', lineHeight: 18 },
  emailCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(0,229,255,0.2)', backgroundColor: 'rgba(0,229,255,0.04)' },
  emailIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0,229,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  emailContent: { flex: 1, gap: 2 },
  emailLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  emailAddr: { color: '#00E5FF', fontSize: 16, fontWeight: '700' },
  faqSection: { gap: 8 },
  faqTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', letterSpacing: 3, marginBottom: 4 },
  faqCard: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1C1C1E', backgroundColor: '#0A0A0A', gap: 4 },
  faqQ: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  faqA: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '400', lineHeight: 16 },
});
