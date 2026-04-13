import React, { useCallback, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, ImageBackground,
  Dimensions, TouchableOpacity, Linking, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { RadarChart } from '../../components/RadarChart';
import { RadarChartMulti, RadarMultiLegend } from '../../components/RadarChartMulti';
import { NotificationDrawer } from '../../components/notifications/NotificationDrawer';
import { TalentCard } from '../../components/TalentCard';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, {
  useSharedValue, withTiming, withSpring, withSequence, withRepeat,
  useAnimatedStyle, Easing
} from 'react-native-reanimated';
import { api } from '../../utils/api';
import { DNA_HERO_IMAGE } from '../../utils/images';

let SCREEN_W = 390; try { SCREEN_W = Dimensions.get('window').width; } catch(e) {}

const ATTRS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'velocita',   label: 'VELOCITA',   icon: 'flash',           color: '#00E5FF' },
  { key: 'forza',      label: 'FORZA',      icon: 'barbell',         color: '#FFFFFF' },
  { key: 'resistenza', label: 'RESISTENZA', icon: 'heart',           color: '#FF3B30' },
  { key: 'agilita',    label: 'AGILITA',    icon: 'walk',            color: '#00E5FF' },
  { key: 'tecnica',    label: 'TECNICA',    icon: 'navigate-circle', color: '#FFFFFF' },
  { key: 'potenza',    label: 'POTENZA',    icon: 'flash-sharp',     color: '#FFD700' },
];

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
  const screenH = Dimensions.get('window').height;
  const scanLineStyle = useAnimatedStyle(() => ({
    top: scanY.value * screenH,
    opacity: 1 - scanY.value * 0.8
  }));
  const stripesStyle = useAnimatedStyle(() => ({ opacity: stripesOpacity.value }));

  if (!active) return null;

  const parentH = Dimensions.get('window').height;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[gStyles.tint, overlayStyle]} />
      <Animated.View style={[gStyles.scanLine, scanLineStyle]} />
      <Animated.View style={[gStyles.stripes, stripesStyle]}>
        {[0.15, 0.32, 0.48, 0.65, 0.78, 0.91].map((pos, i) => (
          <View key={i} style={[gStyles.stripe, { top: pos * parentH, height: i % 2 === 0 ? 2 : 1 }]} />
        ))}
      </Animated.View>
    </View>
  );
}

const gStyles = StyleSheet.create({
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,229,255,0.18)', zIndex: 50 },
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: '#00E5FF',
    elevation: 10, zIndex: 51
  },
  stripes: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  stripe: { position: 'absolute', left: 0, right: 0, backgroundColor: '#00E5FF22' }
});

// ═══ PERSISTENT BIO-SCANLINES (Continuous monitor effect) ═══
function BioScanlines() {
  const scanY = useSharedValue(0);
  const flicker = useSharedValue(0.15);

  useEffect(() => {
    // Continuous scan line moving top to bottom
    scanY.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.linear }),
      -1, false
    );
    // Subtle flicker of the horizontal lines
    flicker.value = withRepeat(
      withSequence(
        withTiming(0.25, { duration: 800 }),
        withTiming(0.08, { duration: 600 }),
        withTiming(0.18, { duration: 400 }),
        withTiming(0.05, { duration: 700 }),
      ),
      -1, false
    );
  }, []);

  const screenH = Dimensions.get('window').height;
  const scanStyle = useAnimatedStyle(() => ({
    top: scanY.value * screenH,
    opacity: 0.4 - scanY.value * 0.3,
  }));
  const linesStyle = useAnimatedStyle(() => ({
    opacity: flicker.value,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Moving scan line */}
      <Animated.View style={[bioScan.scanLine, scanStyle]} />
      {/* Persistent horizontal scanlines */}
      <Animated.View style={[StyleSheet.absoluteFill, linesStyle]}>
        {Array.from({ length: 40 }).map((_, i) => (
          <View
            key={i}
            style={[bioScan.line, {
              top: i * (screenH / 40),
              height: i % 3 === 0 ? 1.5 : 0.5,
              opacity: i % 5 === 0 ? 0.6 : 0.2,
            }]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const bioScan = StyleSheet.create({
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 1.5,
    backgroundColor: '#00E5FF', zIndex: 2,
  },
  line: {
    position: 'absolute', left: 0, right: 0,
    backgroundColor: 'rgba(0,229,255,0.15)',
  },
});

function getRoleColor(role?: string) {
  if (role === 'coach') return '#FFD700';
  if (role === 'palestra') return '#AF52DE';
  return '#00E5FF';
}

export default function DNATab() {
  const { user, token } = useAuth();
  const router = useRouter();
  const dna = user?.dna;

  const [lastRecords, setLastRecords] = useState<string[]>([]);
  const [isGlowing, setIsGlowing] = useState(false);
  const [lastChallenge, setLastChallenge] = useState<any>(null);
  const [showGlitch, setShowGlitch] = useState(false);
  const [eligibility, setEligibility] = useState<any>(null);
  const [showEvoGlow, setShowEvoGlow] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [historyScans, setHistoryScans] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const scanOpacity = useSharedValue(0);
  const scanScale = useSharedValue(0.88);
  const radarExpand = useSharedValue(1);

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
      loadEligibility();
      loadNotifications();
      loadDnaHistory();
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
    } catch (e) { /* IRONCLAD: silenced */ }
  };

  const loadEligibility = async () => {
    if (!token) return;
    try {
      const data = await api.getRescanEligibility(token);
      setEligibility(data);
      const rates = data.improvement_rates || {};
      const hasImproved = Object.values(rates).some((v: any) => (v as number) > 0);
      if (hasImproved) {
        radarExpand.value = withSequence(
          withTiming(1.09, { duration: 650, easing: Easing.out(Easing.ease) }),
          withSpring(1, { damping: 10, stiffness: 80 })
        );
        setShowEvoGlow(true);
        setTimeout(() => setShowEvoGlow(false), 6000);
      }
    } catch (e) { /* IRONCLAD: silenced */ }
  };

  const loadNotifications = async () => {
    if (!token) return;
    try {
      const data = await api.getNotifications(token);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (e) { /* IRONCLAD: silenced */ }
  };

  const loadDnaHistory = async () => {
    if (!token) return;
    try {
      const data = await api.getDnaHistory(token);
      setHistoryScans(data.scans || []);
    } catch (e) { /* IRONCLAD: silenced */ }
  };

  const handleMarkRead = async (id: string) => {
    if (!token) return;
    try {
      await api.markNotificationRead(token, id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { /* IRONCLAD: silenced */ }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await api.markNotificationRead(token, 'all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) { /* IRONCLAD: silenced */ }
  };

  const scanStyle = useAnimatedStyle(() => ({
    opacity: scanOpacity.value,
    transform: [{ scale: scanScale.value }]
  }));

  const radarStyle = useAnimatedStyle(() => ({
    opacity: scanOpacity.value,
    transform: [{ scale: scanScale.value * radarExpand.value }]
  }));

  return (
    <View style={styles.container} testID="dna-tab">
      <StatusBar barStyle="light-content" />
      <Header title="DNA" />
      <GlitchOverlay active={showGlitch} />
      <BioScanlines />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* HERO SECTION */}
        <ImageBackground source={{ uri: DNA_HERO_IMAGE }} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
          <LinearGradient
            colors={['rgba(5,5,5,0.4)', 'rgba(5,5,5,0.75)', 'rgba(5,5,5,0.98)']}
            locations={[0, 0.5, 0.9]}
            style={styles.heroGradient}
          >
            <View style={styles.dnaHeader}>
              <Text style={styles.dnaLabel}>TALENT CARD</Text>
              <Text style={styles.dnaSport}>DNA UNIVERSALE</Text>
            </View>

            {dna && (
              <Animated.View style={[styles.chartGlass, radarStyle]}>
                <View style={styles.glassInner}>
                  <RadarChart stats={dna} size={320} glowing={isGlowing || showEvoGlow} recordsBroken={lastRecords} />
                </View>
                {(isGlowing && lastRecords.length > 0) && (
                  <View style={styles.glowBanner}>
                    <Ionicons name="trophy" size={14} color="#FFD700" />
                    <Text style={styles.glowBannerText}>
                      RECORD: {lastRecords.map(r => r.toUpperCase()).join(' \u00b7 ')}
                    </Text>
                  </View>
                )}
                {showEvoGlow && (
                  <View style={styles.evoBanner}>
                    <Ionicons name="analytics" size={12} color="#00E5FF" />
                    <Text style={styles.evoBannerText}>BIO-EVOLUZIONE RILEVATA</Text>
                  </View>
                )}
              </Animated.View>
            )}
          </LinearGradient>
        </ImageBackground>

        {!dna && (
          <View style={styles.noData}>
            <View style={styles.noDataIconWrap}>
              <Ionicons name="scan" size={36} color="#00E5FF" />
            </View>
            <Text style={styles.noDataTitle}>DNA NON RILEVATO</Text>
            <Text style={styles.noDataText}>Completa il tuo onboarding per{'\n'}generare la tua firma biometrica</Text>
            <View style={styles.firstScanCta}>
              <View style={styles.firstScanDot} />
              <Text style={styles.firstScanCtaText}>AVVIA PRIMA BIO-SCAN DAL NEXUS</Text>
            </View>
          </View>
        )}

        {/* BIO-EVOLUTION STATUS BANNER */}
        {dna && eligibility && (
          <View style={[
            styles.eligibilityBanner,
            eligibility.can_scan ? styles.eligibilityBannerActive : styles.eligibilityBannerLocked,
          ]}>
            <Ionicons
              name={eligibility.can_scan ? 'flash' : eligibility.phase === 'locked' ? 'lock-closed' : 'time'}
              size={12}
              color={eligibility.can_scan ? '#00E5FF' : eligibility.phase === 'locked' ? '#555' : '#FFD700'}
            />
            <Text style={[
              styles.eligibilityText,
              eligibility.can_scan ? styles.eligibilityTextActive : styles.eligibilityTextLocked,
            ]}>
              {eligibility.message}
            </Text>
            {eligibility.avg_dna > 0 && (
              <View style={styles.avgDnaBadge}>
                <Text style={styles.avgDnaText}>{eligibility.avg_dna}/100</Text>
              </View>
            )}
          </View>
        )}

        {/* TALOSFIT PARTNER BANNER */}
        {dna && (() => {
          const avgDna: number = eligibility?.avg_dna ?? Math.round(
            Object.values(dna as Record<string, number>).reduce((a: number, b: number) => a + b, 0) / 6
          );
          const dynamicLine = avgDna < 50
            ? 'Costruisci le tue basi.'
            : avgDna > 80
            ? 'Raggiungi lo status di Giant.'
            : 'Domina l\'Arena.';
          return (
            <TouchableOpacity
              style={styles.talosBannerWrap}
              onPress={() => Linking.openURL('https://www.talosfit.com')}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#0a0a0a', '#0a0a0a', '#0a0a0a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.talosBannerGrad}
              >
                <View style={styles.talosTopLine} />
                <View style={styles.talosBannerContent}>
                  <View style={styles.talosLeft}>
                    <View style={styles.talosPartnerBadge}>
                      <Ionicons name="shield-checkmark" size={9} color="#FFD700" />
                      <Text style={styles.talosPartnerText}>PARTNER UFFICIALE</Text>
                    </View>
                    <Text style={styles.talosBannerTitle}>EVOLVE YOUR DNA.</Text>
                    <Text style={styles.talosBannerBody}>
                      {dynamicLine}{'\n'}
                      <Text style={styles.talosBannerBodyAccent}>
                        Trova il tuo Coach multidisciplina su TalosFit per dominare l'Arena.
                      </Text>
                    </Text>
                    <View style={styles.talosCta}>
                      <Text style={styles.talosCtaText}>SCOPRI I COACH</Text>
                      <Ionicons name="arrow-forward" size={11} color="#FFD700" />
                    </View>
                  </View>
                  <View style={styles.talosRight}>
                    <View style={styles.talosLogoWrap}>
                      <Text style={styles.talosLogoT}>T</Text>
                    </View>
                    <Text style={styles.talosLogoName}>TALOSFIT</Text>
                  </View>
                </View>
                <View style={styles.talosBottomLine} />
              </LinearGradient>
            </TouchableOpacity>
          );
        })()}

        {/* Stat cards */}
        {dna && (
          <Animated.View style={[styles.statsGrid, scanStyle]}>
            {ATTRS.map((a) => {
              const val = (dna[a.key as keyof typeof dna] as number) || 0;
              const broken = lastRecords.includes(a.key);
              const improvement: number = eligibility?.improvement_rates?.[a.key] || 0;
              const hasImprovement = improvement !== 0;
              return (
                <View key={a.key} style={[
                  styles.statCard,
                  broken && styles.statCardBroken,
                  improvement > 0 && !broken && styles.statCardImproved,
                ]}>
                  <View style={styles.statCardTop}>
                    <Ionicons name={a.icon} size={18} color={broken ? '#FFD700' : improvement > 0 ? '#00E5FF' : a.color} />
                    {hasImprovement && (
                      <View style={[styles.improvBadge, improvement > 0 ? styles.improvPos : styles.improvNeg]}>
                        <Text style={[styles.improvText, improvement > 0 ? styles.improvTextPos : styles.improvTextNeg]}>
                          {improvement > 0 ? '+' : ''}{improvement}%
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.statLabel}>{a.label}</Text>
                  <Text style={[styles.statValue, broken && styles.statValueBroken]}>{val}</Text>
                  <View style={styles.statBar}>
                    <View style={[styles.statFill, { flex: Math.max(val, 0.01) }, broken && styles.statFillBroken]} />
                    <View style={{ flex: Math.max(100 - val, 0.01) }} />
                  </View>
                  {broken && (
                    <View style={styles.newRecordRow}>
                      <Ionicons name="star" size={8} color="#FFD700" />
                      <Text style={styles.newRecordBadge}>RECORD</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* APPLE HEALTH — Quick Access Banner */}
        {dna && (
          <TouchableOpacity
            style={hkBanner.container}
            onPress={() => router.push('/settings/health-hub')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['rgba(255,45,85,0.08)', 'rgba(255,45,85,0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={hkBanner.gradient}
            >
              <View style={hkBanner.left}>
                <View style={hkBanner.iconWrap}>
                  <Ionicons name="heart" size={18} color="#FF2D55" />
                </View>
                <View>
                  <Text style={hkBanner.title}>APPLE HEALTH</Text>
                  <Text style={hkBanner.sub}>Sincronizza passi, BPM e calorie</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* KORE DNA ID */}
        {user && dna && (
          <View style={styles.talentSection}>
            <View style={styles.sectionRow}>
              <Ionicons name="flash" size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.sectionTitle}>TALENT CARD</Text>
            </View>
            <TalentCard
              user={user}
              xpEarned={lastChallenge?.xp_earned}
              recordsBroken={lastRecords}
              challengeTitle={lastChallenge?.battle_title}
            />
          </View>
        )}

        {/* DNA HISTORY */}
        {historyScans.length > 0 && (
          <View style={styles.historySectionWrap}>
            <TouchableOpacity
              style={styles.historyToggle}
              onPress={() => setShowHistory(!showHistory)}
              activeOpacity={0.8}
            >
              <View style={styles.historyToggleLeft}>
                <Ionicons name="analytics" size={13} color="#FFD700" />
                <Text style={styles.historyToggleLabel}>REGISTRO BIO-SIGNATURE</Text>
                <View style={styles.historyCountBadge}>
                  <Text style={styles.historyCountText}>{historyScans.length}</Text>
                </View>
              </View>
              <Ionicons
                name={showHistory ? 'chevron-up' : 'chevron-down'}
                size={14}
                color="rgba(255,255,255,0.72)"
              />
            </TouchableOpacity>

            {showHistory && (
              <View style={styles.historyContent}>
                <View style={styles.multiRadarWrap}>
                  <RadarChartMulti scans={historyScans} size={220} />
                  <RadarMultiLegend scanCount={Math.min(historyScans.length, 3)} />
                </View>

                <View style={styles.timelineWrap}>
                  {[...historyScans].reverse().map((scan, idx) => {
                    const scanDate = scan.scanned_at
                      ? new Date(scan.scanned_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
                      : '\u2014';
                    const avg = scan.dna
                      ? Math.round(Object.values(scan.dna as Record<string, number>).reduce((a: number, b: number) => a + b, 0) / 6)
                      : 0;
                    const typeBadgeColor = scan.scan_type === 'baseline' ? 'rgba(255,255,255,0.72)' : scan.scan_type === 'validation' ? '#00E5FF' : '#FFD700';
                    return (
                      <View key={idx} style={styles.timelineRow}>
                        <View style={styles.timelineDotCol}>
                          <View style={[styles.timelineDot, { backgroundColor: idx === 0 ? '#00E5FF' : idx === 1 ? '#FFD700' : 'rgba(255,255,255,0.3)' }]} />
                          {idx < historyScans.length - 1 && <View style={styles.timelineLine} />}
                        </View>
                        <View style={styles.timelineInfo}>
                          <View style={styles.timelineTopRow}>
                            <Text style={styles.timelineDate}>{scanDate}</Text>
                            <View style={[styles.timelineTypeBadge, { borderColor: typeBadgeColor + '55' }]}>
                              <Text style={[styles.timelineTypeText, { color: typeBadgeColor }]}>
                                {scan.scan_type?.toUpperCase() || 'SCAN'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.timelineAvg}>DNA MEDIO: <Text style={styles.timelineAvgVal}>{avg}/100</Text></Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>DNA ANALYSIS · IRONCLAD NETWORK</Text>
          <Text style={styles.footerVersion}>v2.1.0 — Build 26 · NEXUS</Text>
        </View>
      </ScrollView>

      <NotificationDrawer
        visible={showNotifDrawer}
        onClose={() => setShowNotifDrawer(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  heroImage: { width: '100%', minHeight: 480 },
  heroImageStyle: { opacity: 0.35 },
  heroGradient: { flex: 1, paddingTop: 16 },
  dnaHeader: { paddingHorizontal: 24, paddingBottom: 8, gap: 4 },
  dnaLabel: { color: '#00E5FF', fontSize: 13, fontWeight: '800', letterSpacing: -0.5, lineHeight: 16 },
  dnaSport: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.5, textTransform: 'uppercase', lineHeight: 31 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  roleText: { fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  chartGlass: {
    alignItems: 'center', marginTop: 8, marginHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)'
  },
  glassInner: { alignItems: 'center' },
  glowBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '100%', backgroundColor: 'rgba(255,215,0,0.08)',
    borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
    justifyContent: 'center', marginTop: 8
  },
  glowBannerText: { color: '#FFD700', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  noData: { padding: 40, alignItems: 'center', gap: 12 },
  noDataIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center'
  },
  noDataTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: -0.5, lineHeight: 17 },
  noDataText: { color: '#AAAAAA', fontSize: 18, textAlign: 'center', lineHeight: 22 },
  firstScanCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'transparent', borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginTop: 4
  },
  firstScanDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00E5FF' },
  firstScanCtaText: { color: '#00E5FF', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  eligibilityBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 24, marginTop: 12, marginBottom: 4,
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1
  },
  eligibilityBannerActive: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.07)' },
  eligibilityBannerLocked: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.07)' },
  eligibilityText: { flex: 1, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  eligibilityTextActive: { color: '#00E5FF' },
  eligibilityTextLocked: { color: '#AAAAAA' },
  avgDnaBadge: {
    backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)'
  },
  avgDnaText: { color: '#FFD700', fontSize: 15, fontWeight: '900' },
  evoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '100%', backgroundColor: 'transparent',
    borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', marginTop: 8
  },
  evoBannerText: { color: '#00E5FF', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  statCardImproved: { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'transparent' },
  statCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  improvBadge: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  improvPos: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)' },
  improvNeg: { backgroundColor: 'rgba(255,59,48,0.08)', borderWidth: 0.5, borderColor: 'rgba(255,59,48,0.2)' },
  improvText: { fontSize: 13, fontWeight: '900' },
  improvTextPos: { color: '#00E5FF' },
  improvTextNeg: { color: '#FF3B30' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, gap: 8, marginTop: 16 },
  statCard: {
    width: '30%', flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 3
  },
  statCardBroken: { borderColor: 'rgba(255,215,0,0.25)', backgroundColor: 'rgba(255,215,0,0.03)' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  statValue: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  statValueBroken: { color: '#FFD700' },
  statBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginTop: 2, flexDirection: 'row' },
  statFill: { height: 3, backgroundColor: '#00E5FF', borderRadius: 2 },
  statFillBroken: { backgroundColor: '#FFD700' },
  newRecordRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  newRecordBadge: { color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  talentSection: { marginTop: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingBottom: 12 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: -0.5, textTransform: 'uppercase', lineHeight: 19 },
  // TalosFit Partner
  talosBannerWrap: { marginHorizontal: 24, marginTop: 14, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,215,0,0.32)', elevation: 6 },
  talosBannerGrad: { overflow: 'hidden' },
  talosTopLine: { height: 2, backgroundColor: '#FFD700', opacity: 0.8 },
  talosBottomLine: { height: 1, backgroundColor: '#0a0a0a', opacity: 0.25 },
  talosBannerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 18, gap: 14 },
  talosLeft: { flex: 1, gap: 7 },
  talosPartnerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,215,0,0.22)' },
  talosPartnerText: { color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  talosBannerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.5, lineHeight: 22 },
  talosBannerBody: { color: '#AAAAAA', fontSize: 16, fontWeight: '600', lineHeight: 17 },
  talosBannerBodyAccent: { color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  talosCta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderBottomWidth: 1, borderBottomColor: 'rgba(255,215,0,0.4)', paddingBottom: 1 },
  talosCtaText: { color: '#FFD700', fontSize: 15, fontWeight: '900', letterSpacing: 2.5 },
  talosRight: { alignItems: 'center', gap: 2, width: 52 },
  talosLogoWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,215,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.35)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  talosLogoT: { color: '#FFD700', fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  talosLogoName: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  talosLogoFit: { color: '#FFD700', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  // History
  historySectionWrap: { marginHorizontal: 24, marginTop: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,215,0,0.14)', backgroundColor: 'rgba(255,215,0,0.03)' },
  historyToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14 },
  historyToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyToggleLabel: { color: '#FFD700', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  historyCountBadge: { backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  historyCountText: { color: '#FFD700', fontSize: 14, fontWeight: '900' },
  historyContent: { borderTopWidth: 1, borderTopColor: 'rgba(255,215,0,0.1)', paddingBottom: 16 },
  multiRadarWrap: { alignItems: 'center', paddingVertical: 16 },
  timelineWrap: { paddingHorizontal: 24, gap: 0 },
  timelineRow: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  timelineDotCol: { alignItems: 'center', width: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginTop: 4 },
  timelineInfo: { flex: 1, gap: 4 },
  timelineTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineDate: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '400', letterSpacing: 1 },
  timelineTypeBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  timelineTypeText: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  timelineAvg: { color: 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  timelineAvgVal: { color: '#AAAAAA', fontWeight: '900' },
  // Footer
  footer: { alignItems: 'center', gap: 6, marginTop: 32, paddingBottom: 20 },
  footerText: { color: 'rgba(255,255,255,0.08)', fontSize: 9, fontWeight: '800', letterSpacing: 3 },
  footerVersion: { color: '#00E5FF', fontSize: 10, fontWeight: '700', letterSpacing: 1, opacity: 0.6 },
});

// ═══ APPLE HEALTH BANNER STYLES ═══
const hkBanner = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,45,85,0.15)',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingHorizontal: 16,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,45,85,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sub: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
