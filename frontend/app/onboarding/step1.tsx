import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, withSpring, withTiming, useAnimatedStyle,
  FadeIn, FadeInDown,
} from 'react-native-reanimated';
import { api } from '../../utils/api';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 56) / 2;

const MACRO_CATEGORIES = [
  { id: 'atletica', label: 'ATLETICA', icon: '🏃', color: '#FF6B00', desc: 'Track & Field' },
  { id: 'combat', label: 'COMBAT', icon: '🥊', color: '#FF3B30', desc: 'Arti Marziali' },
  { id: 'acqua', label: 'ACQUA', icon: '🌊', color: '#007AFF', desc: 'Sport Acquatici' },
  { id: 'team', label: 'TEAM SPORT', icon: '⚽', color: '#34C759', desc: 'Sport di Squadra' },
  { id: 'fitness', label: 'FITNESS', icon: '🏋️', color: '#D4AF37', desc: 'Forza & Conditioning' },
  { id: 'outdoor', label: 'OUTDOOR', icon: '🏔️', color: '#30B0C7', desc: 'Natura & Endurance' },
  { id: 'mind_body', label: 'MIND & BODY', icon: '🧘', color: '#AF52DE', desc: 'Corpo & Mente' },
  { id: 'extreme', label: 'EXTREME', icon: '🔥', color: '#FF2D55', desc: 'Oltre il Limite' },
];

export default function Step1() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
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
        <Text style={styles.title}>LA TUA{`\n`}ARENA</Text>
        <Text style={styles.subtitle}>Scegli la tua macro-categoria</Text>
      </View>

      <View style={styles.grid}>
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
                styles.card,
                selected === cat.id && { borderColor: cat.color, backgroundColor: `${cat.color}08` },
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.cardIcon}>{cat.icon}</Text>
              <Text style={[
                styles.cardLabel,
                selected === cat.id && { color: cat.color },
              ]}>{cat.label}</Text>
              <Text style={styles.cardDesc}>{cat.desc}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      <View style={styles.footer}>
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
  container: { flex: 1, backgroundColor: '#050505', paddingHorizontal: 20 },
  header: { marginBottom: 16 },
  brandRow: { flexDirection: 'row', gap: 4, marginBottom: 16 },
  brandA: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: -0.5 },
  brandK: { color: '#D4AF37', fontSize: 13, fontWeight: '900', letterSpacing: -0.5 },
  stepLabel: { color: '#00F2FF', fontSize: 10, fontWeight: '700', letterSpacing: 3, marginBottom: 8 },
  progressBar: { height: 2, backgroundColor: '#1E1E1E', borderRadius: 2, marginBottom: 16 },
  progressFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  title: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', letterSpacing: -1.5, lineHeight: 40 },
  subtitle: { color: '#555', fontSize: 13, marginTop: 6 },
  grid: {
    flex: 1, flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', paddingTop: 8,
    paddingHorizontal: 4,
  },
  cardWrapper: { width: '48%', marginBottom: 10 },
  card: {
    backgroundColor: '#111111',
    borderRadius: 14, padding: 16, gap: 4,
    borderWidth: 1.5, borderColor: '#1E1E1E',
  },
  cardIcon: { fontSize: 28 },
  cardLabel: { color: '#888', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  cardDesc: { color: '#444', fontSize: 10, fontWeight: '500' },
  footer: { paddingTop: 12 },
  continueButton: {
    backgroundColor: '#00F2FF', borderRadius: 8,
    paddingVertical: 16, alignItems: 'center',
  },
  continueButtonDisabled: { opacity: 0.3 },
  continueButtonText: { color: '#050505', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
});
