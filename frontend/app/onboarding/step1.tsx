import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedButton } from '../../components/AnimatedButton';

const ROLES = [
  { id: 'atleta', label: 'ATLETA', icon: '🏃', desc: 'Gareggia e traccia le tue performance' },
  { id: 'coach', label: 'COACH', icon: '🎯', desc: 'Allena, crea discipline e programmi' },
  { id: 'palestra', label: 'PALESTRA', icon: '🏋️', desc: 'Gestisci la tua struttura sportiva' },
];

export default function Step1() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.stepLabel}>STEP 1 DI 3</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '33%' }]} />
        </View>
        <Text style={styles.title}>CHI SEI?</Text>
        <Text style={styles.subtitle}>Scegli il tuo ruolo nell'Arena</Text>
      </View>

      <View style={styles.cards}>
        {ROLES.map(role => (
          <AnimatedButton
            key={role.id}
            testID={`role-${role.id}-btn`}
            onPress={() => setSelected(role.id)}
            style={[styles.card, selected === role.id && styles.cardSelected]}
          >
            <Text style={styles.cardIcon}>{role.icon}</Text>
            <Text style={[styles.cardLabel, selected === role.id && styles.cardLabelActive]}>
              {role.label}
            </Text>
            <Text style={styles.cardDesc}>{role.desc}</Text>
          </AnimatedButton>
        ))}
      </View>

      <AnimatedButton
        testID="step1-continue-btn"
        onPress={() => selected && router.push({ pathname: '/onboarding/step2', params: { role: selected } })}
        style={[styles.continueButton, !selected && styles.continueButtonDisabled]}
        disabled={!selected}
      >
        <Text style={styles.continueButtonText}>CONTINUA →</Text>
      </AnimatedButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', paddingHorizontal: 24 },
  header: { marginBottom: 36 },
  stepLabel: { color: '#00F2FF', fontSize: 11, fontWeight: '700', letterSpacing: 3, marginBottom: 8 },
  progressBar: { height: 3, backgroundColor: '#1E1E1E', borderRadius: 2, marginBottom: 24 },
  progressFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  title: { color: '#FFFFFF', fontSize: 44, fontWeight: '900', letterSpacing: -2 },
  subtitle: { color: '#555555', fontSize: 14, marginTop: 6 },
  cards: { flex: 1, gap: 12, justifyContent: 'center' },
  card: {
    backgroundColor: '#111111', borderRadius: 16, padding: 24,
    borderWidth: 1.5, borderColor: '#222222', alignItems: 'center', gap: 8,
  },
  cardSelected: { borderColor: '#00F2FF', backgroundColor: 'rgba(0,229,255,0.07)' },
  cardIcon: { fontSize: 38 },
  cardLabel: { color: '#777777', fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  cardLabelActive: { color: '#00F2FF' },
  cardDesc: { color: '#555555', fontSize: 13, textAlign: 'center' },
  continueButton: {
    backgroundColor: '#00F2FF', borderRadius: 8,
    paddingVertical: 18, alignItems: 'center',
  },
  continueButtonDisabled: { opacity: 0.35 },
  continueButtonText: { color: '#050505', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
});
