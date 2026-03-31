import React, { useCallback, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, ImageBackground,
  Dimensions, TouchableOpacity, Linking,
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
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,242,255,0.18)', zIndex: 50 },
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: '#00F2FF', shadowColor: '#00F2FF',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 12,
    elevation: 10, zIndex: 51,
  },
  stripes: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  stripe: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(0,242,255,0.35)' },
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
  const [eligibility, setEligibility] = useState<any>(null);
  const [showEvoGlow, setShowEvoGlow] = useState(false);
  // SPRINT 9: Notifications + History
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
    } catch (e) { /* silenced */ }
  };

  const loadEligibility = async () => {
    if (!token) return;
    try {
      const data = await api.getRescanEligibility(token);
      setEligibility(data);
      // Trigger radar expansion animation if any attribute improved
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
    } catch (e) { /* silenced */ }
  };

  const loadNotifications = async () => {
    if (!token) return;
    try {
      const data = await api.getNotifications(token);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (e) { /* silenced */ }
  };

  const loadDnaHistory = async () => {
    if (!token) return;
    try {
      const data = await api.getDnaHistory(token);
      setHistoryScans(data.scans || []);
    } catch (e) { /* silenced */ }
  };

  const handleMarkRead = async (id: string) => {
    if (!token) return;
    try {
      await api.markNotificationRead(token, id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { /* silenced */ }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await api.markNotificationRead(token, 'all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) { /* silenced */ }
  };

  const scanStyle = useAnimatedStyle(() => ({
    opacity: scanOpacity.value,
    transform: [{ scale: scanScale.value }],
  }));

  const radarStyle = useAnimatedStyle(() => ({
    opacity: scanOpacity.value,
    transform: [{ scale: scanScale.value * radarExpand.value }],
  }));

  return (
    <View style={styles.container} testID="dna-tab">
      <StatusBar barStyle="light-content" />
      <Header
        title="DNA"
        rightAction={
          <TouchableOpacity
            onPress={() => setShowNotifDrawer(true)}
            style={styles.notifBell}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="notifications" size={19} color={unreadCount > 0 ? '#00F2FF' : 'rgba(255,255,255,0.4)'} />
            {unreadCount > 0 && (
              <View style={styles.notifBellBadge}>
                <Text style={styles.notifBellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />
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
              <Animated.View style={[styles.chartGlass, radarStyle]}>
                <View style={styles.glassInner}>
                  <RadarChart stats={dna} size={260} glowing={isGlowing || showEvoGlow} recordsBroken={lastRecords} />
                </View>
                {(isGlowing && lastRecords.length > 0) && (
                  <View style={styles.glowBanner}>
                    <Ionicons name="trophy" size={14} color="#D4AF37" />
                    <Text style={styles.glowBannerText}>
                      RECORD: {lastRecords.map(r => r.toUpperCase()).join(' \u00b7 ')}
                    </Text>
                  </View>
                )}
                {showEvoGlow && (
                  <View style={styles.evoBanner}>
                    <Ionicons name="analytics" size={12} color="#00F2FF" />
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
              <Ionicons name="scan" size={36} color="#00F2FF" />
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
              color={eligibility.can_scan ? '#00F2FF' : eligibility.phase === 'locked' ? '#555' : '#D4AF37'}
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

        {/* ====== TALOSFIT PARTNER BANNER — SPRINT 10 ====== */}
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
                colors={['#0B0900', '#100D02', '#0B0900']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.talosBannerGrad}
              >
                {/* Gold top accent line */}
                <View style={styles.talosTopLine} />

                <View style={styles.talosBannerContent}>
                  {/* LEFT: Copy */}
                  <View style={styles.talosLeft}>
                    <View style={styles.talosPartnerBadge}>
                      <Ionicons name="shield-checkmark" size={9} color="#D4AF37" />
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
                      <Ionicons name="arrow-forward" size={11} color="#D4AF37" />
                    </View>
                  </View>

                  {/* RIGHT: Brand mark */}
                  <View style={styles.talosRight}>
                    <View style={styles.talosLogoWrap}>
                      <Text style={styles.talosLogoT}>T</Text>
                    </View>
                    <Text style={styles.talosLogoName}>TALOS</Text>
                    <Text style={styles.talosLogoFit}>FIT</Text>
                  </View>
                </View>

                {/* Cyan bottom accent line */}
                <View style={styles.talosBottomLine} />
              </LinearGradient>
            </TouchableOpacity>
          );
        })()}

        {/* Stat cards — monochromatic Ionicons */}
        {dna && (
          <Animated.View style={[styles.statsGrid, scanStyle]}>
            {ATTRS.map((a, i) => {
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
                    <Ionicons name={a.icon} size={18} color={broken ? '#D4AF37' : improvement > 0 ? '#00F2FF' : a.color} />
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

        {/* ATHLETE PASSPORT */}
        {user && dna && (
          <View style={styles.talentSection}>
            <View style={styles.sectionRow}>
              <Ionicons name="flash" size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.sectionTitle}>ATHLETE PASSPORT</Text>
            </View>
            <TalentCard
              user={user}
              xpEarned={lastChallenge?.xp_earned}
              recordsBroken={lastRecords}
              challengeTitle={lastChallenge?.battle_title}
            />
          </View>
        )}

        {/* ====== DNA HISTORY — SPRINT 9 ====== */}
        {historyScans.length > 0 && (
          <View style={styles.historySectionWrap}>
            <TouchableOpacity
              style={styles.historyToggle}
              onPress={() => setShowHistory(!showHistory)}
              activeOpacity={0.8}
            >
              <View style={styles.historyToggleLeft}>
                <Ionicons name="analytics" size={13} color="#D4AF37" />
                <Text style={styles.historyToggleLabel}>CRONOLOGIA BIO-SIGNATURE</Text>
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
                    const typeBadgeColor = scan.scan_type === 'baseline' ? 'rgba(255,255,255,0.72)' : scan.scan_type === 'validation' ? '#00F2FF' : '#D4AF37';
                    return (
                      <View key={idx} style={styles.timelineRow}>
                        <View style={styles.timelineDotCol}>
                          <View style={[styles.timelineDot, { backgroundColor: idx === 0 ? '#00F2FF' : idx === 1 ? '#D4AF37' : 'rgba(255,255,255,0.3)' }]} />
                          {idx < historyScans.length - 1 && <View style={styles.timelineLine} />}
                        </View>
                        <View style={styles.timelineInfo}>
                          <View style={styles.timelineTopRow}>
                            <Text style={styles.timelineDate}>{scanDate}</Text>
                            <View style={[styles.timelineTypeBadge, { borderColor: typeBadgeColor + '55' }]}>
                              <Text style={[styles.timelineTypeText, { color: typeBadgeColor }]}>
                                {scan.scan_type.toUpperCase()}
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

        <View style={{ height: 32 }} />
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
  container: { flex: 1, backgroundColor: '#050505' },
  heroImage: { width: '100%', minHeight: 480 },
  heroImageStyle: { opacity: 0.35 },
  heroGradient: { flex: 1, paddingTop: 16 },
  dnaHeader: { paddingHorizontal: 24, paddingBottom: 8, gap: 4 },
  dnaLabel: { color: '#00F2FF', fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  dnaSport: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  roleText: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  chartGlass: {
    alignItems: 'center', marginTop: 8, marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden',
  },
  glassInner: { alignItems: 'center' },
  glowBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '100%', backgroundColor: 'rgba(212,175,55,0.08)',
    borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
    justifyContent: 'center', marginTop: 8,
  },
  glowBannerText: { color: '#D4AF37', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  noData: { padding: 40, alignItems: 'center', gap: 12 },
  noDataIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.65)',
    alignItems: 'center', justifyContent: 'center',
  },
  noDataTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 3 },
  noDataText: { color: 'rgba(255,255,255,0.45)', fontSize: 16, textAlign: 'center', lineHeight: 22 },
  firstScanCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'transparent', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.65)',
    marginTop: 4,
  },
  firstScanDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00F2FF' },
  firstScanCtaText: { color: '#00F2FF', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  // Eligibility Banner
  eligibilityBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginTop: 12, marginBottom: 4,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1,
  },
  eligibilityBannerActive: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(0,242,255,0.65)',
  },
  eligibilityBannerLocked: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  eligibilityText: { flex: 1, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  eligibilityTextActive: { color: '#00F2FF' },
  eligibilityTextLocked: { color: 'rgba(255,255,255,0.72)' },
  avgDnaBadge: {
    backgroundColor: 'rgba(212,175,55,0.1)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
  },
  avgDnaText: { color: '#D4AF37', fontSize: 13, fontWeight: '900' },
  // Evolution glow banner
  evoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '100%', backgroundColor: 'transparent',
    borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', marginTop: 8,
  },
  evoBannerText: { color: '#00F2FF', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  // Stat card improvement
  statCardImproved: { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'transparent' },
  statCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  improvBadge: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  improvPos: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)' },
  improvNeg: { backgroundColor: 'rgba(255,69,58,0.08)', borderWidth: 0.5, borderColor: 'rgba(255,69,58,0.2)' },
  improvText: { fontSize: 11, fontWeight: '900' },
  improvTextPos: { color: '#00F2FF' },
  improvTextNeg: { color: '#FF453A' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 8, marginTop: 16 },
  statCard: {
    width: '30%', flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 3,
  },
  statCardBroken: { borderColor: 'rgba(212,175,55,0.25)', backgroundColor: 'rgba(212,175,55,0.03)' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  statValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  statValueBroken: { color: '#D4AF37' },
  statBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  statFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  statFillBroken: { backgroundColor: '#D4AF37' },
  newRecordRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  newRecordBadge: { color: '#D4AF37', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  talentSection: { marginTop: 20 },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF', fontSize: 16, fontWeight: '900',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  // ===== TALOSFIT PARTNER BANNER — SPRINT 10 =====
  talosBannerWrap: {
    marginHorizontal: 14, marginTop: 14,
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.32)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  talosBannerGrad: { overflow: 'hidden' },
  talosTopLine: { height: 2, backgroundColor: '#D4AF37', opacity: 0.8 },
  talosBottomLine: { height: 1, backgroundColor: '#0D0D0D', opacity: 0.25 },
  talosBannerContent: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 18, gap: 14,
  },
  talosLeft: { flex: 1, gap: 7 },
  talosPartnerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.22)',
  },
  talosPartnerText: { color: '#D4AF37', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  talosBannerTitle: {
    color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 1,
    lineHeight: 22,
  },
  talosBannerBody: {
    color: 'rgba(255,255,255,0.45)', fontSize: 14,
    fontWeight: '600', lineHeight: 17,
  },
  talosBannerBodyAccent: {
    color: 'rgba(255,255,255,0.6)', fontWeight: '500',
  },
  talosCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    borderBottomWidth: 1, borderBottomColor: 'rgba(212,175,55,0.4)',
    paddingBottom: 1,
  },
  talosCtaText: { color: '#D4AF37', fontSize: 13, fontWeight: '900', letterSpacing: 2.5 },
  talosRight: { alignItems: 'center', gap: 2, width: 52 },
  talosLogoWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.35)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  talosLogoT: {
    color: '#D4AF37', fontSize: 22, fontWeight: '900', letterSpacing: 0.5,
  },
  talosLogoName: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  talosLogoFit: { color: '#D4AF37', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  // Notification Bell
  notifBell: { position: 'relative', padding: 4 },
  notifBellBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#FF3B30', borderRadius: 7,
    minWidth: 14, height: 14,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBellBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  // History Section
  historySectionWrap: {
    marginHorizontal: 14, marginTop: 16,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.14)',
    backgroundColor: 'rgba(212,175,55,0.03)',
  },
  historyToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  historyToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyToggleLabel: { color: '#D4AF37', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  historyCountBadge: {
    backgroundColor: 'rgba(212,175,55,0.15)', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  historyCountText: { color: '#D4AF37', fontSize: 12, fontWeight: '900' },
  historyContent: { borderTopWidth: 1, borderTopColor: 'rgba(212,175,55,0.1)', paddingBottom: 16 },
  multiRadarWrap: { alignItems: 'center', paddingVertical: 16 },
  timelineWrap: { paddingHorizontal: 16, gap: 0 },
  timelineRow: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  timelineDotCol: { alignItems: 'center', width: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginTop: 4 },
  timelineInfo: { flex: 1, gap: 4 },
  timelineTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineDate: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '400', letterSpacing: 1 },
  timelineTypeBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  timelineTypeText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  timelineAvg: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  timelineAvgVal: { color: 'rgba(255,255,255,0.65)', fontWeight: '900' },
});

const ins$ = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12, backgroundColor: 'rgba(212,175,55,0.05)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(212,175,55,0.18)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { color: '#D4AF37', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  insightText: { color: '#FFFFFF', fontSize: 14, fontWeight: '400', lineHeight: 20, marginBottom: 6 },
  tipText: { color: 'rgba(255,255,255,0.60)', fontSize: 13, fontWeight: '400', lineHeight: 20, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,69,58,0.3)', gap: 2 },
  statLabel: { color: 'rgba(255,255,255,0.50)', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  statVal: { color: '#FF453A', fontSize: 13, fontWeight: '900' },
  templateBtn: { flex: 1, backgroundColor: '#D4AF37', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  templateText: { color: '#050505', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
});

const pvp$ = StyleSheet.create({
  btn: { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#00F2FF', borderRadius: 10, paddingVertical: 13 },
  text: { color: '#050505', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
});

