import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { RadarChart } from '../../components/RadarChart';
import { TalentCard } from '../../components/TalentCard';
import { useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue, withTiming, withSpring, useAnimatedStyle,
} from 'react-native-reanimated';
import { api } from '../../utils/api';

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
  const { user, token } = useAuth();
  const dna = user?.dna;

  // Track last challenge for glow effect
  const [lastRecords, setLastRecords] = useState<string[]>([]);
  const [isGlowing, setIsGlowing] = useState(false);
  const [lastChallenge, setLastChallenge] = useState<any>(null);

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

      // Check for recent challenge results
      loadRecentChallenge();
    }, [])
  );

  const loadRecentChallenge = async () => {
    if (!token) return;
    try {
      const history = await api.getChallengeHistory(token);
      if (history && history.length > 0) {
        const latest = history[0];
        setLastChallenge(latest);
        if (latest.records_broken && latest.records_broken.length > 0) {
          setLastRecords(latest.records_broken);
          setIsGlowing(true);
          // Stop glowing after 8 seconds
          setTimeout(() => setIsGlowing(false), 8000);
        }
      }
    } catch (e) {
      console.log('History load error:', e);
    }
  };

  const scanStyle  = useAnimatedStyle(() => ({
    opacity: scanOpacity.value,
    transform: [{ scale: scanScale.value }],
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${scanLine.value * 92}%` as any,
    opacity: 1 - scanLine.value,
  }));

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
              <RadarChart
                stats={dna}
                size={280}
                glowing={isGlowing}
                recordsBroken={lastRecords}
              />
              {/* Bio-Scan line */}
              <Animated.View style={[styles.scanLine, scanLineStyle]} pointerEvents="none" />
            </View>
            {isGlowing && lastRecords.length > 0 && (
              <View style={styles.glowBanner}>
                <Text style={styles.glowBannerText}>
                  🏆 RECORD INFRANTI: {lastRecords.map(r => r.toUpperCase()).join(' · ')}
                </Text>
              </View>
            )}
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
              const broken = lastRecords.includes(a.key);
              return (
                <View key={a.key} style={[styles.statCard, broken && styles.statCardBroken]} testID={`dna-stat-${a.key}`}>
                  <Text style={styles.statIcon}>{a.icon}</Text>
                  <Text style={styles.statLabel}>{a.label}</Text>
                  <Text style={[styles.statValue, broken && styles.statValueBroken]}>{val}</Text>
                  <View style={styles.statBar}>
                    <View style={[styles.statFill, { width: `${val}%` as any }, broken && styles.statFillBroken]} />
                  </View>
                  {broken && <Text style={styles.newRecordBadge}>★ RECORD</Text>}
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* GLORY SHOT — Talent Card with QR */}
        {user && dna && (
          <View style={styles.talentSection}>
            <Text style={styles.sectionTitle}>⚡  GLORY SHOT</Text>
            <TalentCard
              user={user}
              xpEarned={lastChallenge?.xp_earned}
              recordsBroken={lastRecords}
              challengeTitle={lastChallenge?.battle_title}
            />
          </View>
        )}

        <View style={{ height: 32 }} />
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
  glowBanner: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)',
    alignItems: 'center',
  },
  glowBannerText: { color: '#D4AF37', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  noData: { padding: 40, alignItems: 'center' },
  noDataText: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 8 },
  statCard: {
    width: '30%', flexGrow: 1, backgroundColor: '#111111',
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#1E1E1E', gap: 3,
  },
  statCardBroken: {
    borderColor: 'rgba(212,175,55,0.35)',
    backgroundColor: 'rgba(212,175,55,0.04)',
  },
  statIcon: { fontSize: 18 },
  statLabel: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  statValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  statValueBroken: { color: '#D4AF37' },
  statBar: { height: 3, backgroundColor: '#1E1E1E', borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  statFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  statFillBroken: { backgroundColor: '#D4AF37' },
  newRecordBadge: { color: '#D4AF37', fontSize: 8, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  talentSection: { marginTop: 20 },
  sectionTitle: {
    color: '#FFFFFF', fontSize: 12, fontWeight: '800',
    letterSpacing: 2, paddingHorizontal: 16,
    paddingBottom: 12, textTransform: 'uppercase',
  },
});
