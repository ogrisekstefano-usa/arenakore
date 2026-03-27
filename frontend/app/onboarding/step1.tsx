import React, { useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  Dimensions, ImageBackground, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_IMAGES } from '../../utils/images';

const { width: SCREEN_W } = Dimensions.get('window');

const MACRO_CATEGORIES: { id: string; label: string; ionicon: keyof typeof Ionicons.glyphMap; desc: string; color: string }[] = [
  { id: 'atletica', label: 'ATLETICA', ionicon: 'walk', desc: 'Track & Field', color: '#FF6B00' },
  { id: 'combat', label: 'COMBAT', ionicon: 'hand-left', desc: 'Arti Marziali', color: '#FF3B30' },
  { id: 'acqua', label: 'ACQUA', ionicon: 'water', desc: 'Sport Acquatici', color: '#007AFF' },
  { id: 'team', label: 'TEAM SPORT', ionicon: 'football', desc: 'Sport di Squadra', color: '#34C759' },
  { id: 'fitness', label: 'FITNESS', ionicon: 'barbell', desc: 'Forza & Conditioning', color: '#D4AF37' },
  { id: 'outdoor', label: 'OUTDOOR', ionicon: 'trail-sign', desc: 'Natura & Endurance', color: '#30B0C7' },
  { id: 'mind_body', label: 'MIND & BODY', ionicon: 'leaf', desc: 'Corpo & Mente', color: '#AF52DE' },
  { id: 'extreme', label: 'EXTREME', ionicon: 'flame', desc: 'Oltre il Limite', color: '#FF2D55' },
];

export default function Step1() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Text style={styles.brandA}>ARENA</Text>
          <Text style={styles.brandK}>KORE</Text>
        </View>
        <Text style={styles.stepLabel}>LEVEL 1 DI 3</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '33%' }]} />
        </View>
        <Text style={styles.title}>LA TUA{'\n'}ARENA</Text>
        <Text style={styles.subtitle}>Scegli la tua macro-categoria</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      >
        {MACRO_CATEGORIES.map((cat, i) => (
          <Animated.View
            key={cat.id}
            entering={FadeInDown.delay(i * 60).springify()}
            style={styles.cardWrapper}
          >
            <TouchableOpacity
              testID={`cat-${cat.id}-btn`}
              onPress={() => setSelected(cat.id)}
              style={[
                styles.cardOuter,
                selected === cat.id && { borderColor: cat.color, borderWidth: 2.5 },
              ]}
              activeOpacity={0.85}
            >
              <ImageBackground
                source={{ uri: CATEGORY_IMAGES[cat.id] }}
                style={styles.cardImage}
                imageStyle={styles.cardImageStyle}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(5,5,5,0.7)', 'rgba(5,5,5,0.95)']}
                  locations={[0, 0.4, 0.9]}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardContent}>
                    <Ionicons name={cat.ionicon} size={22} color={selected === cat.id ? cat.color : '#FFFFFF'} />
                    <Text style={[
                      styles.cardLabel,
                      selected === cat.id && { color: cat.color },
                    ]}>{cat.label}</Text>
                    <Text style={styles.cardDesc}>{cat.desc}</Text>
                  </View>
                  {selected === cat.id && (
                    <View style={[styles.selectedDot, { backgroundColor: cat.color }]} />
                  )}
                </LinearGradient>
              </ImageBackground>
            </TouchableOpacity>
          </Animated.View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          testID="step1-continue-btn"
          onPress={() => selected && router.push({ pathname: '/onboarding/step2', params: { category: selected } })}
          style={[styles.continueButton, !selected && styles.continueButtonDisabled]}
          disabled={!selected}
        >
          <Text style={styles.continueButtonText}>CONTINUA →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: { paddingHorizontal: 20, marginBottom: 8 },
  brandRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  brandA: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: -0.5 },
  brandK: { color: '#D4AF37', fontSize: 13, fontWeight: '900', letterSpacing: -0.5 },
  stepLabel: { color: '#00F2FF', fontSize: 10, fontWeight: '700', letterSpacing: 3, marginBottom: 8 },
  progressBar: { height: 2, backgroundColor: '#1E1E1E', borderRadius: 2, marginBottom: 14 },
  progressFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', letterSpacing: -1.5, lineHeight: 36 },
  subtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 4 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8,
  },
  cardWrapper: { width: '48%', marginBottom: 10 },
  cardOuter: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  cardImage: { width: '100%', height: 130 },
  cardImageStyle: { borderRadius: 15, opacity: 0.75 },
  cardGradient: {
    flex: 1, justifyContent: 'flex-end', padding: 12, borderRadius: 15,
  },
  cardContent: { gap: 1 },
  cardIcon: { fontSize: 22 },
  cardLabel: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  cardDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '500' },
  selectedDot: {
    position: 'absolute', top: 10, right: 10,
    width: 10, height: 10, borderRadius: 5,
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: 'rgba(5,5,5,0.95)',
  },
  continueButton: {
    backgroundColor: '#00F2FF', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  continueButtonDisabled: { opacity: 0.3 },
  continueButtonText: { color: '#050505', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
});
