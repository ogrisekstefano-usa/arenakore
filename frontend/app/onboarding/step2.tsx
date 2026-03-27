import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedButton } from '../../components/AnimatedButton';

const SPORTS = [
  { id: 'atletica', label: 'Atletica', icon: '🏃' },
  { id: 'nuoto', label: 'Nuoto', icon: '🏊' },
  { id: 'calcio', label: 'Calcio', icon: '⚽' },
  { id: 'basket', label: 'Basket', icon: '🏀' },
  { id: 'tennis', label: 'Tennis', icon: '🎾' },
  { id: 'boxe', label: 'Boxe', icon: '🥊' },
  { id: 'crossfit', label: 'CrossFit', icon: '🔥' },
  { id: 'powerlifting', label: 'Powerlifting', icon: '🏋️' },
  { id: 'ciclismo', label: 'Ciclismo', icon: '🚴' },
  { id: 'ginnastica', label: 'Ginnastica', icon: '🤸' },
  { id: 'pallavolo', label: 'Pallavolo', icon: '🏐' },
  { id: 'mma', label: 'MMA', icon: '🥋' },
];

export default function Step2() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role } = useLocalSearchParams<{ role: string }>();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 32 }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.stepLabel}>STEP 2 DI 3</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '66%' }]} />
        </View>
        <Text style={styles.title}>IL TUO SPORT</Text>
        <Text style={styles.subtitle}>Seleziona la disciplina primaria</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {SPORTS.map(sport => (
            <AnimatedButton
              key={sport.id}
              testID={`sport-${sport.id}-btn`}
              onPress={() => setSelected(sport.id)}
              style={[styles.sportCard, selected === sport.id && styles.sportCardSelected]}
            >
              <Text style={styles.sportIcon}>{sport.icon}</Text>
              <Text style={[styles.sportLabel, selected === sport.id && styles.sportLabelActive]}>
                {sport.label}
              </Text>
            </AnimatedButton>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <AnimatedButton
          testID="step2-continue-btn"
          onPress={() => selected && router.push({ pathname: '/onboarding/step3', params: { role, sport: selected } })}
          style={[styles.continueButton, !selected && styles.continueButtonDisabled]}
          disabled={!selected}
        >
          <Text style={styles.continueButtonText}>CONTINUA →</Text>
        </AnimatedButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: { paddingHorizontal: 24, marginBottom: 20 },
  stepLabel: { color: '#00E5FF', fontSize: 11, fontWeight: '700', letterSpacing: 3, marginBottom: 8 },
  progressBar: { height: 3, backgroundColor: '#1E1E1E', borderRadius: 2, marginBottom: 24 },
  progressFill: { height: '100%', backgroundColor: '#00E5FF', borderRadius: 2 },
  title: { color: '#FFFFFF', fontSize: 44, fontWeight: '900', letterSpacing: -2 },
  subtitle: { color: '#555555', fontSize: 14, marginTop: 6 },
  scroll: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, paddingTop: 4 },
  sportCard: {
    width: '30%', flexGrow: 1,
    backgroundColor: '#111111', borderRadius: 12, padding: 16,
    alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#1E1E1E',
  },
  sportCardSelected: { borderColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.07)' },
  sportIcon: { fontSize: 28 },
  sportLabel: { color: '#777777', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  sportLabelActive: { color: '#00E5FF' },
  footer: {
    paddingHorizontal: 24, paddingTop: 12,
    backgroundColor: '#050505', borderTopWidth: 1, borderTopColor: '#111111',
  },
  continueButton: {
    backgroundColor: '#00E5FF', borderRadius: 8,
    paddingVertical: 18, alignItems: 'center',
  },
  continueButtonDisabled: { opacity: 0.35 },
  continueButtonText: { color: '#050505', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
});
