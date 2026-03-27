import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Share, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { RadarChart } from '../../components/RadarChart';
import { useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue, withTiming, withSpring, useAnimatedStyle,
} from 'react-native-reanimated';

const ATTRS = [
  { key: 'velocita',   label: 'Velocità',   icon: '⚡' },
  { key: 'forza',      label: 'Forza',      icon: '💪' },
  { key: 'resistenza', label: 'Resistenza', icon: '🫀' },
  { key: 'agilita',    label: 'Agilità',    icon: '🏃' },
  { key: 'tecnica',    label: 'Tecnica',    icon: '🎯' },
  { key: 'potenza',    label: 'Potenza',    icon: '💥' },
];

function getRoleColor(role?: string) {
  if (role === 'coach') return '#D4AF37';
  if (role === 'palestra') return '#AF52DE';
  return '#00F2FF';
}

export default function DNATab() {
  const { user } = useAuth();
  const dna = user?.dna;

  // Bio-Scan entrance animation
  const scanOpacity = useSharedValue(0);
  const scanScale  = useSharedValue(0.88);
  const scanLine   = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      scanOpacity.value = 0;
      scanScale.value = 0.88;
      scanLine.value = 0;
      scanOpacity.value = withTiming(1, { duration: 550 });
      scanScale.value  = withSpring(1, { damping: 14, stiffness: 100 });
      scanLine.value   = withTiming(1, { duration: 900 });
    }, [])
  );

  const scanStyle  = useAnimatedStyle(() => ({
    opacity: scanOpacity.value,
    transform: [{ scale: scanScale.value }],
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${scanLine.value * 92}%` as any,
    opacity: 1 - scanLine.value,
  }));

  const handleShare = async () => {
    if (!dna || !user) return;
    const stats = ATTRS.map(a => `${a.label}: ${dna[a.key as keyof typeof dna]}`).join(' · ');
    try {
      await Share.share({
        message: `🏆 ARENADARE | ${user.username?.toUpperCase()} — LVL ${user.level} ${user.sport?.toUpperCase()}\n${stats}\nXP: ${user.xp} | #ArenaDare #${user.sport}`,
        title: `${user.username} - ArenaDare Talent Card`,
      });
    } catch (e) {
      Alert.alert('Condivisione non disponibile');
    }
  };

  return (
    <View style={styles.container} testID="dna-tab">
      <StatusBar barStyle="light-content" />
      <Header title="DNA" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.dnaHeader}>
          <Text style={styles.dnaLabel}>ANALISI BIOMETRICA</Text>
          <Text style={styles.dnaSport}>{user?.sport?.toUpperCase() || '—'}</Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user?.role) + '18' }]}>
            <Text style={[styles.roleText, { color: getRoleColor(user?.role) }]}>
              {user?.role?.toUpperCase() || 'ATLETA'}
            </Text>
          </View>
        </View>

        {dna ? (
          <Animated.View style={[styles.chartOuter, scanStyle]}>
            <View style={styles.chartContainer}>
              <RadarChart stats={dna} size={280} />
              {/* Bio-Scan line */}
              <Animated.View style={[styles.scanLine, scanLineStyle]} pointerEvents="none" />
            </View>
          </Animated.View>
        ) : (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>Completa l'onboarding{'\n'}per sbloccare il tuo DNA ⚡</Text>
          </View>
        )}

        {dna && (
          <Animated.View style={[styles.statsGrid, scanStyle]}>
            {ATTRS.map(a => {
              const val = (dna[a.key as keyof typeof dna] as number) || 0;
              return (
                <View key={a.key} style={styles.statCard} testID={`dna-stat-${a.key}`}>
                  <Text style={styles.statIcon}>{a.icon}</Text>
                  <Text style={styles.statLabel}>{a.label}</Text>
                  <Text style={styles.statValue}>{val}</Text>
                  <View style={styles.statBar}>
                    <View style={[styles.statFill, { width: `${val}%` as any }]} />
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        {dna && (
          <Animated.View style={[styles.talentCard, scanStyle]}>
            <View style={styles.talentHeader}>
              <Text style={styles.talentTitle}>TALENT CARD</Text>
              <TouchableOpacity
                testID="talent-card-share-btn"
                onPress={handleShare}
                style={styles.shareBtn}
              >
                <Text style={styles.shareBtnText}>↑ CONDIVIDI</Text>
              </TouchableOpacity>
            </View>
            {[
              { l: 'Username',   v: user?.username || '—' },
              { l: 'Disciplina', v: user?.sport || '—' },
              { l: 'Ruolo',      v: user?.role || '—' },
              { l: 'Level',      v: `LVL ${user?.level || 1}`, gold: true },
              { l: 'XP Totali',  v: `${user?.xp || 0} XP`,    gold: true },
            ].map((row, i) => (
              <View key={i} style={styles.talentRow}>
                <Text style={styles.talentLabel}>{row.l}</Text>
                <Text style={[styles.talentValue, row.gold && { color: '#D4AF37' }]}>{row.v}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  dnaHeader: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, gap: 4 },
  dnaLabel: { color: '#00F2FF', fontSize: 11, fontWeight: '700', letterSpacing: 3 },
  dnaSport: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: -1, textTransform: 'uppercase' },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, marginTop: 4 },
  roleText: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  chartOuter: { overflow: 'hidden' },
  chartContainer: { alignItems: 'center', paddingVertical: 16, position: 'relative' },
  scanLine: {
    position: 'absolute', left: 40, right: 40, height: 1.5,
    backgroundColor: '#00F2FF', opacity: 0.7,
  },
  noData: { padding: 40, alignItems: 'center' },
  noDataText: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 8 },
  statCard: {
    width: '30%', flexGrow: 1, backgroundColor: '#111111',
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#1E1E1E', gap: 3,
  },
  statIcon: { fontSize: 18 },
  statLabel: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  statValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  statBar: { height: 3, backgroundColor: '#1E1E1E', borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  statFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  talentCard: {
    margin: 16, backgroundColor: '#111111', borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.2)', gap: 12, marginTop: 20,
  },
  talentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  talentTitle: { color: '#00F2FF', fontSize: 11, fontWeight: '700', letterSpacing: 3 },
  shareBtn: {
    backgroundColor: 'rgba(0,242,255,0.1)', borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.3)',
  },
  shareBtnText: { color: '#00F2FF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  talentRow: { flexDirection: 'row', justifyContent: 'space-between' },
  talentLabel: { color: '#555', fontSize: 14 },
  talentValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
});
