import React, { useCallback, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, ImageBackground,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { RadarChart } from '../../components/RadarChart';
import { TalentCard } from '../../components/TalentCard';
import { useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue, withTiming, withSpring, withSequence,
  withDelay, useAnimatedStyle, Easing,
} from 'react-native-reanimated';
import { api } from '../../utils/api';
import { DNA_HERO_IMAGE } from '../../utils/images';

const { width: SCREEN_W } = Dimensions.get('window');

const ATTRS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'velocita',   label: 'VELOCITA',   icon: 'flash',           color: '#00F2FF' },
  { key: 'forza',      label: 'FORZA',      icon: 'barbell',         color: '#FFFFFF' },
  { key: 'resistenza', label: 'RESISTENZA', icon: 'heart',           color: '#FF453A' },
  { key: 'agilita',    label: 'AGILITA',    icon: 'walk',            color: '#00F2FF' },
  { key: 'tecnica',    label: 'TECNICA',    icon: 'navigate-circle', color: '#FFFFFF' },
  { key: 'potenza',    label: 'POTENZA',    icon: 'flash-sharp',     color: '#FFD700' },
];

// GLITCH OVERLAY
function GlitchOverlay({ active }: { active: boolean }) {
  const glitchOpacity = useSharedValue(0);
  const scanY = useSharedValue(0);
  const stripesOpacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      glitchOpacity.value = withSequence(
        withTiming(0.7, { duration: 50 }), withTiming(0, { duration: 30 }),
        withTiming(0.5, { duration: 40 }), withTiming(0, { duration: 30 }),
        withTiming(0.3, { duration: 60 }), withTiming(0, { duration: 90 }),
      );
      scanY.value = 0;
      scanY.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) });
      stripesOpacity.value = withSequence(
        withTiming(0.6, { duration: 80 }), withTiming(0, { duration: 120 }),
        withTiming(0.3, { duration: 60 }), withTiming(0, { duration: 100 }),
      );
    }
  }, [active]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: glitchOpacity.value }));
  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${scanY.value * 100}%` as any,
    opacity: 1 - scanY.value * 0.8,
  }));
  const stripesStyle = useAnimatedStyle(() => ({ opacity: stripesOpacity.value }));

  if (!active) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[gStyles.tint, overlayStyle]} />
      <Animated.View style={[gStyles.scanLine, scanLineStyle]} />
      <Animated.View style={[gStyles.stripes, stripesStyle]}>
        {[0.15, 0.32, 0.48, 0.65, 0.78, 0.91].map((pos, i) => (
          <View key={i} style={[gStyles.stripe, { top: `${pos * 100}%` as any, height: i % 2 === 0 ? 2 : 1 }]} />
        ))}
      </Animated.View>
    </View>
  );
}

const gStyles = StyleSheet.create({
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,242,255,0.08)', zIndex: 50 },
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: '#00F2FF', shadowColor: '#00F2FF',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 12,
    elevation: 10, zIndex: 51,
  },
  stripes: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  stripe: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(0,242,255,0.12)' },
});

function getRoleColor(role?: string) {
  if (role === 'coach') return '#D4AF37';
  if (role === 'palestra') return '#AF52DE';
  return '#00F2FF';
}

export default function DNATab() {
  const { user, token } = useAuth();
  const dna = user?.dna;

  const [lastRecords, setLastRecords] = useState<string[]>([]);
  const [isGlowing, setIsGlowing] = useState(false);
  const [lastChallenge, setLastChallenge] = useState<any>(null);
  const [showGlitch, setShowGlitch] = useState(false);

  const scanOpacity = useSharedValue(0);
  const scanScale = useSharedValue(0.88);

  useFocusEffect(
    useCallback(() => {
      setShowGlitch(false);
      setTimeout(() => setShowGlitch(true), 50);
      setTimeout(() => setShowGlitch(false), 450);
      scanOpacity.value = 0;
      scanScale.value = 0.88;
      scanOpacity.value = withTiming(1, { duration: 550 });
      scanScale.value = withSpring(1, { damping: 14, stiffness: 100 });
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
          setTimeout(() => setIsGlowing(false), 8000);
        }
      }
    } catch (e) { /* silenced */ }
  };

  const scanStyle = useAnimatedStyle(() => ({
    opacity: scanOpacity.value,
    transform: [{ scale: scanScale.value }],
  }));

  return (
    <View style={styles.container} testID="dna-tab">
      <StatusBar barStyle="light-content" />
      <Header title="DNA" />
      <GlitchOverlay active={showGlitch} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HERO SECTION */}
        <ImageBackground source={{ uri: DNA_HERO_IMAGE }} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
          <LinearGradient
            colors={['rgba(5,5,5,0.4)', 'rgba(5,5,5,0.75)', 'rgba(5,5,5,0.98)']}
            locations={[0, 0.5, 0.9]}
            style={styles.heroGradient}
          >
            <View style={styles.dnaHeader}>
              <Text style={styles.dnaLabel}>ANALISI BIOMETRICA</Text>
              <Text style={styles.dnaSport}>{user?.sport?.toUpperCase() || '\u2014'}</Text>
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user?.role) + '18' }]}>
                <Text style={[styles.roleText, { color: getRoleColor(user?.role) }]}>
                  {user?.role?.toUpperCase() || 'KORE MEMBER'}
                </Text>
              </View>
            </View>

            {dna && (
              <Animated.View style={[styles.chartGlass, scanStyle]}>
                <View style={styles.glassInner}>
                  <RadarChart stats={dna} size={260} glowing={isGlowing} recordsBroken={lastRecords} />
                </View>
                {isGlowing && lastRecords.length > 0 && (
                  <View style={styles.glowBanner}>
                    <Ionicons name="trophy" size={14} color="#D4AF37" />
                    <Text style={styles.glowBannerText}>
                      RECORD: {lastRecords.map(r => r.toUpperCase()).join(' \u00b7 ')}
                    </Text>
                  </View>
                )}
              </Animated.View>
            )}
          </LinearGradient>
        </ImageBackground>

        {!dna && (
          <View style={styles.noData}>
            <Ionicons name="flash" size={28} color="#00F2FF" />
            <Text style={styles.noDataText}>Completa l'onboarding{'\n'}per sbloccare il tuo DNA</Text>
          </View>
        )}

        {/* Stat cards — monochromatic Ionicons */}
        {dna && (
          <Animated.View style={[styles.statsGrid, scanStyle]}>
            {ATTRS.map((a, i) => {
              const val = (dna[a.key as keyof typeof dna] as number) || 0;
              const broken = lastRecords.includes(a.key);
              return (
                <View key={a.key} style={[styles.statCard, broken && styles.statCardBroken]}>
                  <Ionicons name={a.icon} size={18} color={broken ? '#D4AF37' : a.color} />
                  <Text style={styles.statLabel}>{a.label}</Text>
                  <Text style={[styles.statValue, broken && styles.statValueBroken]}>{val}</Text>
                  <View style={styles.statBar}>
                    <View style={[styles.statFill, { width: `${val}%` as any }, broken && styles.statFillBroken]} />
                  </View>
                  {broken && (
                    <View style={styles.newRecordRow}>
                      <Ionicons name="star" size={8} color="#D4AF37" />
                      <Text style={styles.newRecordBadge}>RECORD</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* GLORY SHOT */}
        {user && dna && (
          <View style={styles.talentSection}>
            <View style={styles.sectionRow}>
              <Ionicons name="flash" size={14} color="#00F2FF" />
              <Text style={styles.sectionTitle}>GLORY SHOT</Text>
            </View>
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
  heroImage: { width: '100%', minHeight: 480 },
  heroImageStyle: { opacity: 0.35 },
  heroGradient: { flex: 1, paddingTop: 16 },
  dnaHeader: { paddingHorizontal: 24, paddingBottom: 8, gap: 4 },
  dnaLabel: { color: '#00F2FF', fontSize: 10, fontWeight: '800', letterSpacing: 3 },
  dnaSport: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: -1, textTransform: 'uppercase' },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  roleText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  chartGlass: {
    alignItems: 'center', marginTop: 8, marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden',
  },
  glassInner: { alignItems: 'center' },
  glowBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '100%', backgroundColor: 'rgba(212,175,55,0.08)',
    borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
    justifyContent: 'center', marginTop: 8,
  },
  glowBannerText: { color: '#D4AF37', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  noData: { padding: 40, alignItems: 'center', gap: 10 },
  noDataText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 22, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 8, marginTop: 16 },
  statCard: {
    width: '30%', flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 3,
  },
  statCardBroken: { borderColor: 'rgba(212,175,55,0.25)', backgroundColor: 'rgba(212,175,55,0.03)' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  statValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  statValueBroken: { color: '#D4AF37' },
  statBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  statFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  statFillBroken: { backgroundColor: '#D4AF37' },
  newRecordRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  newRecordBadge: { color: '#D4AF37', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  talentSection: { marginTop: 20 },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF', fontSize: 13, fontWeight: '900',
    letterSpacing: 2, textTransform: 'uppercase',
  },
});
