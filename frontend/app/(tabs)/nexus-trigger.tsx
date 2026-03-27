import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function NexusTriggerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="nexus-trigger-screen">
      <StatusBar barStyle="light-content" />
      <TouchableOpacity testID="nexus-close-btn" onPress={() => router.back()} style={styles.closeBtn}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
      <View style={styles.center}>
        <View style={styles.circle}>
          <Text style={styles.circleIcon}>⚡</Text>
        </View>
        <Text style={styles.title}>NEXUS TRIGGER</Text>
        <Text style={styles.subtitle}>Analisi Biometrica Real-time</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PROSSIMAMENTE</Text>
        </View>
        <Text style={styles.desc}>
          Il motore Nexus Sync analizzerà i tuoi{'\n'}
          movimenti in tempo reale con MediaPipe AI
        </Text>
        <View style={styles.featuresList}>
          {['📐 Analisi postura', '⚡ 15fps realtime', '📊 Output Parquet S3', '🧬 DNA update'].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  closeBtn: { alignSelf: 'flex-end', padding: 20 },
  closeText: { color: '#555', fontSize: 22 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  circle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#111111', borderWidth: 2, borderColor: '#FFD700',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 24, elevation: 10,
  },
  circleIcon: { fontSize: 46 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  subtitle: { color: '#888', fontSize: 14, textAlign: 'center' },
  badge: {
    backgroundColor: 'rgba(255,215,0,0.08)', borderWidth: 1,
    borderColor: '#FFD700', borderRadius: 6, paddingHorizontal: 16, paddingVertical: 6,
  },
  badgeText: { color: '#FFD700', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  desc: { color: '#444', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  featuresList: { gap: 8, alignSelf: 'stretch' },
  featureRow: {
    backgroundColor: '#111111', borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  featureText: { color: '#888', fontSize: 13 },
});
