import Haptics from '../../utils/haptics';
import { TAB_BACKGROUNDS } from '../../utils/images';
/**
 * ARENAKORE — NEXUS TRIGGER TAB v3.2 (Camera Lazy-Load Fix)
 * Nike Elite Aesthetic — Motion tracking, Bio-scan, Challenge Forge
 * Heavy sub-components extracted to /components/nexus/
 * 
 * CRITICAL: Do NOT import CameraView/useCameraPermissions at top-level.
 * It crashes Expo Go during module initialization. Camera is lazy-loaded
 * via NativeCameraPreview component only when entering scanning phases.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  Dimensions, Platform, Modal, ScrollView, ImageBackground, TextInput, Image, BackHandler,
  Animated as RNAnimated
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue, withRepeat, withSequence, withTiming,
  useAnimatedStyle, withSpring, withDelay, Easing, interpolate, interpolateColor,
  FadeIn, FadeInDown, FadeInUp
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Text as SvgText, Polygon } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, UserRole, ROLE_CONFIG } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { playAcceptPing, playRecordBroken, startBioScanHum, playBioMatchPing } from '../../utils/sounds';
import { playChargingSound, playCountTick, playStartBeep } from '../../utils/ChargingAudio';
import { MotionAnalyzer, MotionState, ExerciseType, SkeletonPose } from '../../utils/MotionAnalyzer';
import { profileDevice, DeviceProfile, DeviceTier, getTierLabel, getTrackingMode } from '../../utils/DeviceIntelligence';
import { RemoteUXEngine } from '../../utils/RemoteUXEngine';
import { FluxIcon } from '../../components/FluxIcon';
import { Header } from '../../components/Header';
import { BodyLockOverlay } from '../../components/nexus/BodyLockOverlay';
import { ExitButton } from '../../components/nexus/ExitButton';
import { LiveBPMWidget } from '../../components/health/HealthHub';
import { useVoiceCommands, speakCoach, cancelCoachSpeech } from '../../utils/VoiceCommandEngine';
import { PanopticonBridge } from '../../components/nexus/PanopticonBridge';
import { NativeCameraPreview } from '../../components/nexus/NativeCameraPreview';
import { getSportHeroImages, getSportAuraColor } from '../../utils/sportAssets';

// Extracted sub-components
import { CyberGrid, DigitalShadow, ScanLine } from '../../components/nexus/NexusVisuals';
import { BurgerMenu } from '../../components/nexus/NexusBurgerMenu';
import { CinemaResults } from '../../components/nexus/NexusCinemaResults';
import { ProUnlockModal } from '../../components/nexus/ProUnlockModal';
import { PvPPendingCard } from '../../components/pvp/PvPPendingCard';
import { TrainingTemplateCard } from '../../components/training/TrainingTemplateCard';
import { BioFeedbackHUD, BioFeedbackState } from '../../components/training/BioFeedbackHUD';
import { UGCWorkoutHUD, UGCExercise } from '../../components/training/UGCWorkoutHUD';
import { EfficiencyGhostHUD } from '../../components/training/EfficiencyGhostHUD';
import { AKBadge } from '../../components/KoreVault';
import { CertifiedByPros } from '../../components/training/CertifiedByPros';
import { TiltGuideOverlay } from '../../components/TiltGuideOverlay';
import { ChallengeEngine } from '../../components/challenge/ChallengeEngine';
import { PostRaceValidation } from '../../components/challenge/PostRaceValidation';
import { QRScannerModal } from '../../components/QRScannerModal';
import { ChallengePreviewModal } from '../../components/ChallengePreviewModal';
import { TemplateRequestModal, CategoryProposalModal } from '../../components/GovernanceModals';
import { FluxStoreModal } from '../../components/FluxStoreModal';
import { CrewBattleProgressBar } from '../../components/CrewBattleProgressBar';

let SW = 390, SH = 844; try { const _d = Dimensions.get('window'); SW = _d.width; SH = _d.height; } catch(e) {}

// Nike-style dramatic athlete images
const FORGE_IMAGES = {
  personal: 'https://images.unsplash.com/photo-1710736460914-4a7f22d736c4?w=800&q=60',
  battle: 'https://images.unsplash.com/photo-1709315957145-a4bad1feef28?w=800&q=60',
  duel: 'https://images.pexels.com/photos/1075935/pexels-photo-1075935.jpeg?w=800&q=60'
};

const CONSOLE_IMAGES = {
  scan: 'https://images.unsplash.com/photo-1710736460914-4a7f22d736c4?w=800&q=60',
  forge: 'https://images.unsplash.com/photo-1698788067684-2053c651bfed?w=800&q=60',
  hall: 'https://images.unsplash.com/photo-1590285372176-c3ff4d8c9399?w=800&q=60',
  dna: 'https://images.pexels.com/photos/7479526/pexels-photo-7479526.jpeg?w=800&q=60'
};

// ========== BIO-SCAN TRIGGER ==========
function BioScanTrigger({ user, onComplete, onCancel }: { user: any; onComplete: () => void; onCancel?: () => void }) {
  const laserY = useSharedValue(0);
  const laserGlow = useSharedValue(0.5);
  const [progress, setProgress] = useState(0);
  const [scanPhase, setScanPhase] = useState(0);
  const [matchText, setMatchText] = useState('');
  const [showMatch, setShowMatch] = useState(false);
  const [readyToStart, setReadyToStart] = useState(false);
  const matchTimerRef = useRef<any>(null);

  const PHASES = ['SCANNING BIOMETRICS', 'DETECTING BIO-SIGNATURE', 'MAPPING KORE POINTS', 'CALIBRATING SENSORS'];
  const fullMatch = `${(user?.username || 'ATHLETE').toUpperCase()} \u00b7 KORE ATHLETE`;

  useEffect(() => {
    laserY.value = withRepeat(withTiming(SH, { duration: 1600, easing: Easing.inOut(Easing.ease) }), -1, true);
    laserGlow.value = withRepeat(withSequence(withTiming(1, { duration: 500 }), withTiming(0.3, { duration: 500 })), -1, false);
    const stopHum = startBioScanHum();
    let p = 0;
    const pi = setInterval(() => {
      p += 2 + Math.random() * 3;
      if (p > 100) p = 100;
      setProgress(Math.floor(p));
      if (p < 25) setScanPhase(0); else if (p < 50) setScanPhase(1); else if (p < 75) setScanPhase(2); else setScanPhase(3);
      if (p >= 100) { clearInterval(pi); if (stopHum) stopHum(); startTypewriter(); }
    }, 60);
    return () => { clearInterval(pi); if (stopHum) stopHum(); if (matchTimerRef.current) clearTimeout(matchTimerRef.current); };
  }, []);

  const startTypewriter = () => {
    setShowMatch(true);
    let idx = 0;
    const tw = setInterval(() => {
      idx++;
      const revealed = fullMatch.slice(0, idx);
      const scramble = idx < fullMatch.length
        ? revealed + String.fromCharCode(33 + Math.random() * 60) + String.fromCharCode(33 + Math.random() * 60)
        : revealed;
      setMatchText(scramble);
      if (idx >= fullMatch.length) {
        clearInterval(tw);
        setMatchText(fullMatch);
        playBioMatchPing();
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        // NO AUTO-START — show explicit "AVVIA ORA" button
        setReadyToStart(true);
      }
    }, 45);
  };

  const ls = useAnimatedStyle(() => ({ transform: [{ translateY: laserY.value }] }));
  const gs = useAnimatedStyle(() => ({ opacity: laserGlow.value }));

  return (
    <ImageBackground source={{ uri: TAB_BACKGROUNDS.nexus }} style={bio$.overlay} imageStyle={{ opacity: 0.10 }}>
      <TouchableOpacity 
        style={{ position: 'absolute', top: 12, right: 16, zIndex: 99, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}
        onPress={() => onCancel ? onCancel() : undefined}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
      <Animated.View style={[bio$.laserWrap, ls]}>
        <Animated.View style={[bio$.laserGlow, gs]} />
        <View style={bio$.laserLine} />
        <Animated.View style={[bio$.laserGlow, gs]} />
      </Animated.View>
      <View style={bio$.center}>
        {!showMatch ? (
          <>
            <Text style={bio$.title}>SCANNING BIOMETRICS...</Text>
            <Text style={bio$.phase}>[{PHASES[scanPhase]}]</Text>
            <View style={bio$.bioRow}>
              <View style={bio$.bioItem}><Text style={bio$.bioLabel}>SPORT</Text><Text style={bio$.bioVal}>{user?.sport?.toUpperCase() || '---'}</Text></View>
              <View style={bio$.bioItem}><Text style={bio$.bioLabel}>LVL</Text><Text style={bio$.bioVal}>{user?.level || 1}</Text></View>
              <View style={bio$.bioItem}><Text style={bio$.bioLabel}>CLASS</Text><Text style={bio$.bioVal}>{user?.is_pro ? 'PRO' : 'STD'}</Text></View>
            </View>
            <View style={bio$.progressRow}>
              <View style={bio$.progressTrack}><View style={[bio$.progressFill, { width: `${progress}%` as any }]} /></View>
              <Text style={bio$.progressPct}>{progress}%</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={bio$.matchLabel}>BIO-SIGNATURE MATCHED</Text>
            <Text style={bio$.matchText}>{matchText}</Text>
            {readyToStart && (
              <TouchableOpacity style={bio$.avviaBtn} onPress={onComplete} activeOpacity={0.7}>
                <Text style={bio$.avviaBtnText}>AVVIA ORA</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
      <View style={[bio$.bracket, { top: 60, left: 20 }]}><View style={bio$.bH} /><View style={bio$.bV} /></View>
      <View style={[bio$.bracket, { top: 60, right: 20, transform: [{ scaleX: -1 }] }]}><View style={bio$.bH} /><View style={bio$.bV} /></View>
      <View style={[bio$.bracket, { bottom: 100, left: 20, transform: [{ scaleY: -1 }] }]}><View style={bio$.bH} /><View style={bio$.bV} /></View>
      <View style={[bio$.bracket, { bottom: 100, right: 20, transform: [{ scaleX: -1 }, { scaleY: -1 }] }]}><View style={bio$.bH} /><View style={bio$.bV} /></View>
    </ImageBackground>
  );
}

const bio$ = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, backgroundColor: 'rgba(5,5,5,0.94)', justifyContent: 'center', alignItems: 'center' },
  laserWrap: { position: 'absolute', left: 0, right: 0, height: 6, alignItems: 'center' },
  laserLine: { height: 2, width: '100%', backgroundColor: '#0a0a0a' },
  laserGlow: { height: 16, width: '85%', backgroundColor: '#00E5FF22', borderRadius: 8 },
  center: { alignItems: 'center', gap: 14, paddingHorizontal: 32 },
  title: { color: '#00E5FF', fontSize: 19, fontWeight: '900', letterSpacing: 4 },
  phase: { color: '#FFD700', fontSize: 15, fontWeight: '700', letterSpacing: 2 },
  bioRow: { flexDirection: 'row', gap: 24, marginTop: 4 },
  bioItem: { alignItems: 'center', gap: 2 },
  bioLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '400', letterSpacing: 2 },
  bioVal: { color: '#00E5FF', fontSize: 18, fontWeight: '900' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: SW * 0.55, marginTop: 8 },
  progressTrack: { flex: 1, height: 3, backgroundColor: 'rgba(0,229,255,0.15)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#0a0a0a', borderRadius: 2 },
  progressPct: { color: '#00E5FF', fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'], width: 50 },
  matchLabel: { color: '#00E5FF', fontSize: 16, fontWeight: '400', letterSpacing: 4 },
  matchText: { color: '#FFD700', fontSize: 20, fontWeight: '900', letterSpacing: 2, fontVariant: ['tabular-nums'], textAlign: 'center' },
  avviaBtn: { marginTop: 20, paddingHorizontal: 40, paddingVertical: 14, backgroundColor: '#00E5FF', borderRadius: 12 },
  avviaBtnText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  bracket: { position: 'absolute' },
  bH: { width: 30, height: 2, backgroundColor: '#00E5FF', opacity: 0.5 },
  bV: { width: 2, height: 30, backgroundColor: '#00E5FF', opacity: 0.5 }
});

// ========== NEXUS PROACTIVE ENGINE — 6 CTA CARDS ==========
interface ProactiveCTACard {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  borderColor: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaColor: string;
  action: () => void;
}

function NexusProactiveCTAs({ user, eligibility, myRank, myCrews, onScan, onNavigate }: {
  user: any; eligibility: any; myRank: any; myCrews: any[]; onScan: () => void;
  onNavigate: (r: string) => void;
}) {
  const cards: ProactiveCTACard[] = [];

  // 1. SFIDA IL RIVALE — solo se c'è un utente sopra in classifica
  if (myRank?.next_username) {
    cards.push({
      id: 'rival', icon: 'flash-sharp', iconColor: '#FFD700', borderColor: '#FFD700',
      title: 'SFIDA IL RIVALE',
      subtitle: `${myRank.next_username.toUpperCase()} · ${myRank.xp_gap || '?'} FLUX sopra di te`,
      cta: 'SFIDA ORA', ctaColor: '#FFD700',
      action: () => onNavigate('/(tabs)/arena')
    });
  }

  // 2. BOOST YOUR CREW — se sei in una crew
  if (myCrews && myCrews.length > 0) {
    cards.push({
      id: 'crew', icon: 'people', iconColor: '#FF6B00', borderColor: '#FF6B00',
      title: 'BOOST CREW',
      subtitle: `${(myCrews[0]?.name || 'TUA CREW').toUpperCase()} · Contribuisci al ranking globale`,
      cta: 'CONTRIBUISCI', ctaColor: '#FF6B00',
      action: () => onNavigate('/(tabs)/kore')
    });
  }

  // 3. RE-CERTIFY DNA — se scan > 7 giorni fa o mai fatto
  const daysSince = eligibility?.days_since_last_scan;
  const needsRecert = daysSince === undefined || daysSince === null || daysSince >= 7;
  if (needsRecert) {
    cards.push({
      id: 'recertify', icon: 'scan', iconColor: '#FF9500', borderColor: '#FF9500',
      title: daysSince >= 7 ? `DNA SCADUTO · ${daysSince}G` : 'CERTIFICA IL DNA',
      subtitle: daysSince >= 7 ? 'Bio-Signature non aggiornata. Ricertifica ora.' : 'Effettua il tuo primo BIO-SCAN',
      cta: 'RICERTIFICA', ctaColor: '#FF9500',
      action: onScan
    });
  }

  // 4. SYNC TO GLOBAL RANK — mostra sempre il gap al rank successivo
  if (myRank?.rank && myRank.rank > 1) {
    cards.push({
      id: 'sync', icon: 'trending-up', iconColor: '#00E5FF', borderColor: '#00E5FF',
      title: 'SCALA LA CLASSIFICA',
      subtitle: `Rank #${myRank.rank} · ${myRank.xp_gap || '?'} FLUX alla vetta della Hall`,
      cta: 'GUADAGNA FLUX', ctaColor: '#00E5FF',
      action: () => onNavigate('/(tabs)/hall')
    });
  }

  // 5. CLAIM YOUR REWARD — badge e medaglie
  cards.push({
    id: 'reward', icon: 'medal', iconColor: '#AF52DE', borderColor: '#AF52DE',
    title: 'RISCATTA REWARD',
    subtitle: 'Badge eksklusivi · Medaglie KORE disponibili',
    cta: 'RISCATTA', ctaColor: '#AF52DE',
    action: () => onNavigate('/reward-store')
  });

  // 6. PUSH TO COACH
  cards.push({
    id: 'coach', icon: 'send', iconColor: '#00FF87', borderColor: '#00FF87',
    title: 'PUSH AL COACH',
    subtitle: myCrews && myCrews.length > 0
      ? 'Invia la tua Bio-Signature al Coach per il workout'
      : 'Unisciti a una Crew con un Coach KORE',
    cta: myCrews && myCrews.length > 0 ? 'INVIA DATI' : 'TROVA CREW',
    ctaColor: '#00FF87',
    action: () => onNavigate('/coach-connect')
  });

  if (cards.length === 0) return null;

  return (
    <View style={pro$.section}>
      <View style={pro$.sectionHeader}>
        <View style={pro$.sectionDot} />
        <Text style={pro$.sectionTitle}>AZIONI PROATTIVE</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pro$.scroll}>
        {cards.map((card) => (
          <TouchableOpacity key={card.id} style={[pro$.card, { borderLeftColor: card.borderColor }]} onPress={card.action} activeOpacity={0.82}>
            <Ionicons name={card.icon} size={18} color={card.iconColor} />
            <Text style={pro$.cardTitle}>{card.title}</Text>
            <Text style={pro$.cardSub} numberOfLines={2}>{card.subtitle}</Text>
            <View style={[pro$.ctaBtn, { borderColor: card.ctaColor }]}>
              <Text style={[pro$.ctaText, { color: card.ctaColor }]}>{card.cta}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const pro$ = StyleSheet.create({
  section: { marginTop: 12, marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, marginBottom: 10 },
  sectionDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#00E5FF' },
  sectionTitle: { color: '#AAAAAA', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  scroll: { paddingHorizontal: 24, gap: 10, paddingBottom: 4 },
  card: {
    width: SW * 0.68, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderLeftWidth: 3, gap: 6
  },
  cardTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
  cardSub: { color: '#AAAAAA', fontSize: 14, fontWeight: '400', lineHeight: 16 },
  ctaBtn: { marginTop: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  ctaText: { fontSize: 13, fontWeight: '900', letterSpacing: 2 }
});

// ========== AI PROMPT BANNER — Contextual Tool Discovery ==========
function AIPromptBanner() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [prompts, setPrompts] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!token || dismissed) return;
    api.getAIPrompt(token)
      .then(d => setPrompts(d.prompts || []))
      .catch(() => {});
  }, [token]);

  if (!prompts.length || dismissed) return null;
  const p = prompts[0]; // Show first prompt

  return (
    <Animated.View entering={FadeInDown.delay(600).duration(350)} style={apb$.card}>
      <View style={[apb$.bar, { backgroundColor: p.color }]} />
      <View style={apb$.body}>
        <View style={apb$.header}>
          <Ionicons name={p.icon || 'flash'} size={14} color={p.color} />
          <Text style={[apb$.title, { color: p.color }]}>{p.title}</Text>
          <TouchableOpacity onPress={() => setDismissed(true)} style={{ alignSelf: 'flex-end' }}>
            <Ionicons name="close" size={14} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>
        <Text style={apb$.message}>{p.message}</Text>
        {p.cta && (
          <TouchableOpacity
            style={[apb$.cta, { borderColor: p.color + '60' }]}
            onPress={() => { setDismissed(true); router.push('/(tabs)/kore'); }}
            activeOpacity={0.8}
          >
            <Text style={[apb$.ctaText, { color: p.color }]}>{p.cta}</Text>
            <Ionicons name="arrow-forward" size={11} color={p.color} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const apb$ = StyleSheet.create({
  card: { marginHorizontal: 24, marginTop: 10, marginBottom: 4, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  bar: { width: 3 },
  body: { flex: 1, padding: 12, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  message: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '300', lineHeight: 16 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  ctaText: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 }
});

// ========== GHOST SESSION HUD (PvP Mode) ==========
function GhostSessionHUD({ ghost, currentReps, currentQuality, exercise }: {
  ghost: { username: string; reps: number; quality_score: number };
  currentReps: number;
  currentQuality: number;
  exercise: ExerciseType;
}) {
  const isLeading = currentReps > ghost.reps || (currentReps === ghost.reps && currentQuality >= ghost.quality_score);
  const leadPulse = useSharedValue(1);
  useEffect(() => {
    leadPulse.value = withRepeat(withSequence(withTiming(1.08, { duration: 600 }), withTiming(1, { duration: 600 })), -1, false);
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: leadPulse.value }] }));

  return (
    <Animated.View entering={FadeIn.duration(400)} style={ghost$.container}>
      {/* Ghost indicator */}
      <View style={ghost$.ghostRow}>
        <Ionicons name="eye" size={11} color="rgba(0,229,255,0.6)" />
        <Text style={ghost$.ghostLabel}>GHOST: {ghost.username.toUpperCase()}</Text>
      </View>
      {/* Target reps */}
      <View style={ghost$.compRow}>
        <View style={ghost$.statCol}>
          <Text style={ghost$.statLabel}>TUO</Text>
          <Text style={[ghost$.statVal, { color: isLeading ? '#00E5FF' : '#FF3B30' }]}>{currentReps}</Text>
        </View>
        <View style={ghost$.divider} />
        <View style={ghost$.statCol}>
          <Text style={ghost$.statLabel}>GHOST</Text>
          <Text style={[ghost$.statVal, { color: 'rgba(255,255,255,0.4)' }]}>{ghost.reps}</Text>
        </View>
      </View>
      {/* Status badge */}
      <Animated.View style={[ghost$.statusBadge, isLeading ? ghost$.statusWin : ghost$.statusLose, pulseStyle]}>
        <Ionicons name={isLeading ? 'trending-up' : 'trending-down'} size={10} color={isLeading ? '#00E5FF' : '#FF3B30'} />
        <Text style={[ghost$.statusText, { color: isLeading ? '#00E5FF' : '#FF3B30' }]}>
          {isLeading
            ? currentReps > ghost.reps ? `+${currentReps - ghost.reps} AVANTI` : 'IN PARITÀ'
            : `${ghost.reps - currentReps} DA RECUPERARE`}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const ghost$ = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 170, right: 10, zIndex: 35,
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: '#00E5FF22', gap: 6, minWidth: 120
  },
  ghostRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ghostLabel: { color: '#00E5FF22', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statCol: { alignItems: 'center', gap: 1, flex: 1 },
  statLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  statVal: { fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  divider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusWin: { backgroundColor: 'rgba(0,229,255,0.08)' },
  statusLose: { backgroundColor: 'rgba(255,59,48,0.08)' },
  statusText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 }
});

// ========== NEXUS CONSOLE ==========
function NexusConsole({ user, onScan, onForge, onPillarAction, deviceTier, eligibility, myRank, myCrews, onTemplateReq, onCategoryProposal, onFluxStore, cameraFacing, setCameraFacing }: {
  user: any; onScan: () => void; onForge: () => void; onPillarAction: (key: string) => void;
  deviceTier: DeviceTier; eligibility: any; myRank: any; myCrews: any[];
  onTemplateReq: (disc: string) => void; onCategoryProposal: () => void; onFluxStore: () => void;
  cameraFacing: 'user' | 'environment'; setCameraFacing: (fn: any) => void;
}) {
  const router = useRouter();
  const { width: screenWidth } = Dimensions.get('window');

  // ─── 4 DEFINITIVE CARDS ───
  const userSport = user?.preferred_sport || user?.sport || 'Fitness';
  const sportHeroImgs = getSportHeroImages(userSport);
  const sportAura = getSportAuraColor(userSport);

  const NEXUS_CARDS = [
    {
      key: 'sfida', label: 'SFIDA', sub: 'Mettiti alla prova.',
      color: sportAura || '#FF3B30', icon: 'flame' as keyof typeof Ionicons.glyphMap,
      images: sportHeroImgs,
      action: () => { onPillarAction('sfida_hub'); }
    },
    {
      key: 'live', label: 'LIVE', sub: 'Entra in Arena.',
      color: '#FFD700', icon: 'radio' as keyof typeof Ionicons.glyphMap,
      images: [
        'https://images.unsplash.com/photo-1599995730539-695f5717b24c?w=600&q=50',
        'https://images.unsplash.com/photo-1577416412292-747c6607f055?w=600&q=50',
        'https://images.unsplash.com/photo-1519879709058-11082644047d?w=600&q=50',
      ],
      action: () => { onPillarAction('live'); }
    },
    {
      key: 'coach', label: 'COACH', sub: 'Trova la tua Guida.',
      color: '#00FF87', icon: 'school' as keyof typeof Ionicons.glyphMap,
      images: [
        'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=600&q=50',
        'https://images.unsplash.com/photo-1550345332-09e3ac987658?w=600&q=50',
        'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&q=50',
      ],
      action: () => { onPillarAction('coach_hub'); }
    },
    {
      key: 'scanSync', label: 'SCAN & SYNC', sub: 'Connettiti al Mondo.',
      color: '#00E5FF', icon: 'qr-code' as keyof typeof Ionicons.glyphMap,
      images: [
        'https://images.unsplash.com/photo-1656785139062-0a4f174467a4?w=600&q=50',
        'https://images.unsplash.com/photo-1601113329251-0aebe217bdbe?w=600&q=50',
        'https://images.unsplash.com/photo-1652532678111-85849708e1f4?w=600&q=50',
      ],
      action: () => { onPillarAction('scan_sync'); }
    },
  ];

  return (
    <View style={cn$.container} testID="nexus-console">
      <Header title="NÈXUS" />
      <SafeAreaView style={cn$.safe} edges={['left', 'right', 'bottom']}>
        {/* Tier indicator */}
        <View style={cn$.tierBar}>
          <View style={cn$.tierDot} /><Text style={cn$.tierText}>{getTierLabel(deviceTier)}</Text>
        </View>
        <ScrollView style={cn$.scroll} contentContainerStyle={cn$.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Bio-Scan Eligibility */}
          {eligibility && (
            <View style={[cn$.eligBanner, eligibility.can_scan ? cn$.eligBannerActive : cn$.eligBannerLocked]}>
              <Ionicons
                name={eligibility.can_scan ? 'scan' : eligibility.phase === 'locked' ? 'lock-closed' : 'time-outline'}
                size={12}
                color={eligibility.can_scan ? '#00E5FF' : eligibility.phase === 'locked' ? '#444' : '#FFD700'}
              />
              <Text style={[cn$.eligText, eligibility.can_scan ? cn$.eligTextActive : cn$.eligTextLocked]}>
                {eligibility.message}
              </Text>
              {eligibility.can_scan && <View style={cn$.eligReadyDot} />}
            </View>
          )}

          {/* ═══ 4 DEFINITIVE CARDS (2x2 explicit rows) ═══ */}
          <View style={{ flexDirection: 'row', marginTop: 12, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <NexusHubCard
                images={NEXUS_CARDS[0].images} label={NEXUS_CARDS[0].label} sub={NEXUS_CARDS[0].sub}
                color={NEXUS_CARDS[0].color} icon={NEXUS_CARDS[0].icon} onPress={NEXUS_CARDS[0].action} index={0}
              />
            </View>
            <View style={{ flex: 1 }}>
              <NexusHubCard
                images={NEXUS_CARDS[1].images} label={NEXUS_CARDS[1].label} sub={NEXUS_CARDS[1].sub}
                color={NEXUS_CARDS[1].color} icon={NEXUS_CARDS[1].icon} onPress={NEXUS_CARDS[1].action} index={1}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 10, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <NexusHubCard
                images={NEXUS_CARDS[2].images} label={NEXUS_CARDS[2].label} sub={NEXUS_CARDS[2].sub}
                color={NEXUS_CARDS[2].color} icon={NEXUS_CARDS[2].icon} onPress={NEXUS_CARDS[2].action} index={2}
              />
            </View>
            <View style={{ flex: 1 }}>
              <NexusHubCard
                images={NEXUS_CARDS[3].images} label={NEXUS_CARDS[3].label} sub={NEXUS_CARDS[3].sub}
                color={NEXUS_CARDS[3].color} icon={NEXUS_CARDS[3].icon} onPress={NEXUS_CARDS[3].action} index={3}
              />
            </View>
          </View>

          {/* ═══ QUICK ACTION BAR ═══ */}
          <View style={cn$.quickBar}>
            <TouchableOpacity style={cn$.quickBtn} onPress={() => setCameraFacing(prev => prev === 'user' ? 'environment' : 'user')} activeOpacity={0.8}>
              <View style={[cn$.quickIcon, { backgroundColor: 'rgba(0,229,255,0.10)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.25)' }]}>
                <Ionicons name="camera-reverse" size={16} color="#00E5FF" />
              </View>
              <Text style={[cn$.quickLabel, { color: '#00E5FF' }]}>{cameraFacing === 'user' ? 'FRONT' : 'REAR'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={cn$.quickBtn} onPress={onScan} activeOpacity={0.8}>
              <View style={[cn$.quickIcon, { backgroundColor: 'rgba(0,122,255,0.08)' }]}>
                <Ionicons name="scan" size={16} color="#007AFF" />
              </View>
              <Text style={cn$.quickLabel}>BIOSCAN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={cn$.quickBtn} onPress={onForge} activeOpacity={0.8}>
              <View style={[cn$.quickIcon, { backgroundColor: 'rgba(255,215,0,0.08)' }]}>
                <Ionicons name="construct" size={16} color="#FFD700" />
              </View>
              <Text style={cn$.quickLabel}>THE FORGE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={cn$.quickBtn} onPress={() => onPillarAction('duel')} activeOpacity={0.8}>
              <View style={[cn$.quickIcon, { backgroundColor: 'rgba(255,59,48,0.08)' }]}>
                <Ionicons name="flash" size={16} color="#FF3B30" />
              </View>
              <Text style={cn$.quickLabel}>DUELLO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={cn$.quickBtn} onPress={onFluxStore} activeOpacity={0.8}>
              <View style={[cn$.quickIcon, { backgroundColor: 'rgba(255,215,0,0.10)' }]}>
                <Ionicons name="diamond" size={16} color="#FFD700" />
              </View>
              <Text style={cn$.quickLabel}>FLUX</Text>
            </TouchableOpacity>
          </View>

          <NexusProactiveCTAs user={user} eligibility={eligibility} myRank={myRank} myCrews={myCrews} onScan={onScan} onNavigate={(r) => router.push(r as any)} />

          {/* ═══ PANOPTICON — Coach/GYM_OWNER Web Bridge ═══ */}
          {(user?.role === 'COACH' || user?.role === 'GYM_OWNER' || user?.is_admin) && (
            <PanopticonBridge />
          )}

          {/* ═══ DISCIPLINE EXPLORER + GOVERNANCE CTAs ═══ */}
          <View style={cn$.discSection}>
            <View style={cn$.discHeader}>
              <Text style={cn$.discTitle}>DISCIPLINE</Text>
              <Text style={cn$.discSub}>Filtra o richiedi</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cn$.discScroll}>
              {[
                { key: 'Fitness', icon: 'barbell' as keyof typeof Ionicons.glyphMap, color: '#FF3B30' },
                { key: 'Golf', icon: 'golf' as keyof typeof Ionicons.glyphMap, color: '#00FF87' },
                { key: 'Basket', icon: 'basketball' as keyof typeof Ionicons.glyphMap, color: '#FF9500' },
                { key: 'Calcio', icon: 'football' as keyof typeof Ionicons.glyphMap, color: '#34C759' },
                { key: 'Tennis', icon: 'tennisball' as keyof typeof Ionicons.glyphMap, color: '#FFD700' },
                { key: 'Nuoto', icon: 'water' as keyof typeof Ionicons.glyphMap, color: '#007AFF' },
              ].map(d => (
                <TouchableOpacity
                  key={d.key}
                  style={cn$.discChip}
                  activeOpacity={0.7}
                  onPress={() => {
                    onTemplateReq(d.key);
                    Haptics.selectionAsync().catch(() => {});
                  }}
                >
                  <Ionicons name={d.icon} size={14} color={d.color} />
                  <Text style={[cn$.discChipText, { color: d.color }]}>{d.key.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
              {/* + PROPONI NUOVA DISCIPLINA */}
              <TouchableOpacity
                style={[cn$.discChip, cn$.proposeChip]}
                activeOpacity={0.7}
                onPress={() => { onCategoryProposal(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); }}
              >
                <Ionicons name="add-circle" size={14} color="#00E5FF" />
                <Text style={[cn$.discChipText, { color: '#00E5FF' }]}>+ PROPONI</Text>
              </TouchableOpacity>
            </ScrollView>
            {/* CTA: Manca un template? */}
            <TouchableOpacity
              style={cn$.templateCTA}
              activeOpacity={0.8}
              onPress={() => { onTemplateReq('Fitness'); }}
            >
              <Ionicons name="help-circle" size={16} color="rgba(255,255,255,0.30)" />
              <Text style={cn$.templateCTAText}>Manca un Template? Chiedilo ai Coach</Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.15)" />
            </TouchableOpacity>
          </View>

          <PvPPendingCard />
          <TrainingTemplateCard />
          <CertifiedByPros />
          <AIPromptBanner />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ═══ NEXUS HUB CARD — Cross-fade images with neon aura ═══
function NexusHubCard({
  images, label, sub, color, icon, onPress, index
}: {
  images: string[]; label: string; sub: string; color: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void; index: number;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const fadeA = useSharedValue(1);
  const fadeB = useSharedValue(0);
  const showA = useRef(true);

  useEffect(() => {
    const interval = setInterval(() => {
      if (showA.current) {
        fadeB.value = withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) });
        fadeA.value = withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) });
      } else {
        fadeA.value = withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) });
        fadeB.value = withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) });
      }
      showA.current = !showA.current;
      setActiveIdx(prev => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  const styleA = useAnimatedStyle(() => ({ opacity: fadeA.value }));
  const styleB = useAnimatedStyle(() => ({ opacity: fadeB.value }));

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withDelay(
      index * 200,
      withRepeat(withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ), -1, true),
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(pulse.value, [0, 1], [color + '20', color + '80']),
    ...Platform.select({
      web: { boxShadow: `0 0 ${4 + pulse.value * 12}px ${color}${Math.round(10 + pulse.value * 30).toString(16).padStart(2, '0')}` },
      default: {}
    })
  }));

  const imgA = images[activeIdx];
  const imgB = images[(activeIdx + 1) % images.length];

  return (
    <View style={cn$.hubCardOuter}>
      <Animated.View entering={FadeInDown.delay(100 + index * 120).duration(500)}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
          <Animated.View style={[cn$.hubCard, glowStyle]}>
            {/* Image A */}
          <Animated.View style={[cn$.hubImgLayer, styleA]}>
            <Image source={{ uri: imgA }} style={cn$.hubImg} resizeMode="cover" />
          </Animated.View>
          {/* Image B */}
          <Animated.View style={[cn$.hubImgLayer, styleB]}>
            <Image source={{ uri: imgB }} style={cn$.hubImg} resizeMode="cover" />
          </Animated.View>
          {/* Vignette */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.92)']}
            locations={[0, 0.25, 0.6, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Icon badge */}
          <View style={[cn$.hubIconWrap, { backgroundColor: color + '18', borderColor: color + '30' }]}>
            <Ionicons name={icon} size={14} color={color} />
          </View>
          {/* Content */}
          <View style={cn$.hubContent}>
            <Text style={[cn$.hubLabel, { color }]}>{label}</Text>
            <Text style={cn$.hubSub}>{sub}</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const cn$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 8, paddingHorizontal: 20 },
  brandLabel: { color: '#8E8E93', fontSize: 12, fontWeight: '500', letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { color: '#8E8E93', fontSize: 12, fontWeight: '500', letterSpacing: 2, opacity: 0.85 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  tierBar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 20, paddingVertical: 4 },
  tierDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#007AFF' },
  tierText: { color: '#8E8E93', fontSize: 11, fontWeight: '500', letterSpacing: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },

  // ═══ 4 DEFINITIVE CARDS (2x2) ═══
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    justifyContent: 'space-between'
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12
  },
  hubCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    backgroundColor: '#121212',
    position: 'relative',
    height: 190
  },
  hubCardOuter: {
    flex: 1
  },
  hubImgLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0
  },
  hubImg: {
    width: '100%',
    height: '100%'
  },
  hubIconWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 5
  },
  hubContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 2,
    zIndex: 5
  },
  hubLabel: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5
  },
  hubSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3
  },

  // ═══ QUICK ACTION BAR ═══
  quickBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 8
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)'
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  quickLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5
  },

  // ═══ DISCIPLINE EXPLORER + GOVERNANCE ═══
  discSection: { marginTop: 16 },
  discHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  discTitle: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  discSub: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '600' },
  discScroll: { gap: 8, paddingBottom: 8 },
  discChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)'
  },
  proposeChip: {
    backgroundColor: 'rgba(0,229,255,0.04)', borderColor: 'rgba(0,229,255,0.12)',
    borderStyle: 'dashed' as any
  },
  discChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  templateCTA: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
    marginTop: 8
  },
  templateCTAText: { flex: 1, color: 'rgba(255,255,255,0.30)', fontSize: 12, fontWeight: '700' },

  // BIO-SCAN ELIGIBILITY BANNER
  eligBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10,
    borderWidth: 1, marginTop: 10, marginBottom: 2
  },
  eligBannerActive: { backgroundColor: 'transparent', borderColor: '#00E5FF' },
  eligBannerLocked: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.07)' },
  eligText: { flex: 1, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  eligTextActive: { color: '#00E5FF' },
  eligTextLocked: { color: 'rgba(255,255,255,0.3)' },
  eligReadyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00E5FF' }
});

// ========== THE FORGE ==========
type ForgeMode = 'personal' | 'battle' | 'duel';

function ForgeCard({ title, subtitle, image, iconEl, onPress }: {
  title: string; subtitle: string; image: string; iconEl: React.ReactNode; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={fg$.card} onPress={onPress} activeOpacity={0.85}>
      <ImageBackground source={{ uri: image }} style={fg$.imageBg} imageStyle={fg$.imageStyle}>
        <LinearGradient colors={['rgba(5,5,5,0.1)', 'rgba(5,5,5,0.55)', 'rgba(5,5,5,0.95)']} locations={[0, 0.3, 0.78]} style={fg$.gradient}>
          <View style={fg$.cardTop}>{iconEl}</View>
          <View style={fg$.cardBottom}><Text style={fg$.cardTitle}>{title}</Text><Text style={fg$.cardSub}>{subtitle}</Text></View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}

function ChallengeForge({ onSelect, user }: { onSelect: (mode: ForgeMode, exercise: ExerciseType) => void; user: any }) {
  const [mode, setMode] = useState<ForgeMode | null>(null);
  const pulseDNA = useSharedValue(1);
  const flameFlicker = useSharedValue(0.6);
  const boltFlash = useSharedValue(0);

  useEffect(() => {
    pulseDNA.value = withRepeat(withSequence(withTiming(1.2, { duration: 900 }), withTiming(1, { duration: 900 })), -1, false);
    flameFlicker.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.5, { duration: 400 })), -1, false);
    boltFlash.value = withRepeat(withSequence(withTiming(1, { duration: 300 }), withTiming(0.2, { duration: 700 })), -1, false);
  }, []);

  const dnaS = useAnimatedStyle(() => ({ transform: [{ scale: pulseDNA.value }] }));
  const flameS = useAnimatedStyle(() => ({ opacity: flameFlicker.value }));
  const boltS = useAnimatedStyle(() => ({ opacity: boltFlash.value }));

  if (mode) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={fg$.selectWrap}>
        <Text style={fg$.selectTitle}>SELEZIONA PROTOCOLLO</Text>
        <Text style={fg$.selectSub}>
          {mode === 'personal' ? 'Focus DNA \u2014 Migliora le tue stats' : mode === 'battle' ? 'FLUX Massimo \u2014 Scala il Rank' : 'Combatti in tempo reale'}
        </Text>
        <View style={fg$.exRow}>
          <TouchableOpacity style={fg$.exCard} onPress={() => onSelect(mode, 'squat')} activeOpacity={0.8}>
            <Ionicons name="barbell" size={36} color="#00E5FF" />
            <Text style={fg$.exName}>DEEP SQUAT</Text>
            <Text style={fg$.exDesc}>Forza {'\u00b7'} Potenza</Text>
          </TouchableOpacity>
          <TouchableOpacity style={fg$.exCard} onPress={() => onSelect(mode, 'punch')} activeOpacity={0.8}>
            <Ionicons name="hand-left" size={36} color="#00E5FF" />
            <Text style={fg$.exName}>EXPLOSIVE PUNCH</Text>
            <Text style={fg$.exDesc}>Velocit{'\u00e0'} {'\u00b7'} Agilit{'\u00e0'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setMode(null)} style={fg$.backBtn}>
          <Ionicons name="arrow-back" size={14} color="#555" />
          <Text style={fg$.backText}>INDIETRO</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(400)} style={fg$.container}>
      <Text style={fg$.title}>THE FORGE</Text>
      <Text style={fg$.sub}>Scegli il tuo protocollo</Text>
      <View style={fg$.cardsCol}>
        <ForgeCard title="PERSONAL TRAINING" subtitle={"Focus DNA \u00b7 Migliora le tue stats atletiche"}
          image={FORGE_IMAGES.personal} onPress={() => setMode('personal')}
          iconEl={<Animated.View style={dnaS}><Ionicons name="analytics" size={24} color="#00E5FF" /></Animated.View>}
        />
        <ForgeCard title="POINTS BATTLE" subtitle={"Hall of Kore \u00b7 FLUX massimo per scalare il Rank"}
          image={FORGE_IMAGES.battle} onPress={() => setMode('battle')}
          iconEl={<View style={fg$.iconRow}><Ionicons name="trophy" size={24} color="#FFD700" /><Animated.View style={flameS}><Ionicons name="flame" size={14} color="#FF3B30" style={{ marginLeft: -4, marginTop: -6 }} /></Animated.View></View>}
        />
        <ForgeCard title="LIVE DUEL" subtitle={"Tempo reale \u00b7 Sfida un avversario"}
          image={FORGE_IMAGES.duel} onPress={() => setMode('duel')}
          iconEl={<Animated.View style={boltS}><Ionicons name="flash" size={24} color="#00E5FF" /></Animated.View>}
        />
      </View>
    </Animated.View>
  );
}

const fg$ = StyleSheet.create({
  container: { alignItems: 'center', gap: 12, paddingHorizontal: 24, width: '100%' },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: 5 },
  sub: { color: '#AAAAAA', fontSize: 19, marginBottom: 4, fontWeight: '400' },
  cardsCol: { width: '100%', gap: 10 },
  card: { width: '100%', height: 130, borderRadius: 16, overflow: 'hidden' },
  imageBg: { width: '100%', height: '100%' },
  imageStyle: { borderRadius: 16, opacity: 0.7 },
  gradient: { flex: 1, justifyContent: 'space-between', padding: 16 },
  cardTop: { alignSelf: 'flex-start' },
  cardBottom: { gap: 2 },
  cardTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  cardSub: { color: '#AAAAAA', fontSize: 19, fontWeight: '400' },
  iconRow: { flexDirection: 'row', alignItems: 'flex-start' },
  selectWrap: { alignItems: 'center', gap: 14, paddingHorizontal: 20, width: '100%' },
  selectTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: 4 },
  selectSub: { color: '#AAAAAA', fontSize: 19, textAlign: 'center', fontWeight: '400' },
  exRow: { flexDirection: 'row', gap: 12, width: '100%' },
  exCard: {
    flex: 1, alignItems: 'center', gap: 8, paddingVertical: 28,
    backgroundColor: 'rgba(0,229,255,0.05)', borderRadius: 16, borderWidth: 1, borderColor: '#00E5FF'
  },
  exName: { color: '#00E5FF', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  exDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 19, fontWeight: '400' },
  backBtn: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: '#555', fontSize: 17, fontWeight: '800', letterSpacing: 1 }
});

// ========== MINI DNA RADAR ==========
function MiniDNARadar({ dna, explosive }: { dna: any; explosive: boolean }) {
  const ps = useSharedValue(1);
  useEffect(() => { if (explosive) ps.value = withSequence(withTiming(1.3, { duration: 150 }), withTiming(1, { duration: 300 })); }, [explosive]);
  const as = useAnimatedStyle(() => ({ transform: [{ scale: ps.value }] }));
  if (!dna) return null;
  const stats = ['velocita', 'forza', 'resistenza', 'agilita', 'tecnica', 'potenza'];
  const vals = stats.map(s => (dna[s] || 20) / 100);
  const cx = 38, cy = 38, r = 28;
  const pts = vals.map((v, i) => { const a = (Math.PI * 2 * i) / 6 - Math.PI / 2; return `${cx + r * v * Math.cos(a)},${cy + r * v * Math.sin(a)}`; }).join(' ');
  const grid = [1, 0.66, 0.33].map(lv => stats.map((_, i) => { const a = (Math.PI * 2 * i) / 6 - Math.PI / 2; return `${cx + r * lv * Math.cos(a)},${cy + r * lv * Math.sin(a)}`; }).join(' '));
  const pAngle = (Math.PI * 2 * 5) / 6 - Math.PI / 2;
  return (
    <Animated.View style={[{ position: 'absolute', bottom: 130, left: 10, zIndex: 35 }, as]}>
      <Svg width={76} height={76}>
        {grid.map((g, i) => <Polygon key={i} points={g} fill="none" stroke="#00E5FF" strokeWidth={0.5} opacity={0.2} />)}
        <Polygon points={pts} fill="rgba(0,229,255,0.65)" stroke="#00E5FF" strokeWidth={1.5} opacity={0.8} />
        {explosive && <Circle cx={cx + r * vals[5] * Math.cos(pAngle)} cy={cy + r * vals[5] * Math.sin(pAngle)} r={6} fill="#00E5FF" opacity={0.9} />}
      </Svg>
      <Text style={{ color: '#00E5FF', fontSize: 12, fontWeight: '800', letterSpacing: 2, textAlign: 'center', marginTop: -2 }}>DNA</Text>
    </Animated.View>
  );
}

// ========== PUPPET-MOTION-DECK: SMOOTH VALIDATION (3s) ==========
// Moving average + 10% tolerance + no-reset on micro-movements
const STABILITY_THRESHOLD = 0.82;
const TARGET_STABLE_MS = 3000;

function SmoothedValidation({ exercise, onComplete }: { exercise: ExerciseType; onComplete: () => void }) {
  const [stability, setStability] = useState(0);
  const [validatedMs, setValidatedMs] = useState(0);
  const [phase, setPhase] = useState<'init' | 'validating' | 'done'>('init');
  const [statusMsg, setStatusMsg] = useState('INIZIALIZZAZIONE SENSORI...');

  // Reanimated values
  const progressAnim = useSharedValue(0);
  const stabilityAnim = useSharedValue(0);
  const glowAnim = useSharedValue(0.25);
  const screenFlash = useSharedValue(0);
  const doneScale = useSharedValue(0);

  // Refs: progress never resets for micro-movements
  const validatedMsRef = useRef(0);
  const bufferRef = useRef<number[]>([]);
  const activeRef = useRef(true);

  useEffect(() => {
    const t0 = Date.now();

    // Phase 1: sensor init (0.8s)
    const initTimer = setTimeout(() => {
      if (!activeRef.current) return;
      setPhase('validating');
      setStatusMsg('TIENI LA POSIZIONE');
    }, 800);

    // 100ms tick — moving average stability model
    const tick = setInterval(() => {
      if (!activeRef.current) return;
      const elapsed = (Date.now() - t0) / 1000;

      // Simulate realistic build-up with 10-sample moving average
      const base = Math.min(1, Math.max(0, (elapsed - 0.8) / 1.4));
      const noise = (Math.random() - 0.5) * 0.22;
      const raw = Math.max(0, Math.min(1, base + noise));

      // Moving average (10 samples = 1s window → ignores micro-tremors)
      bufferRef.current.push(raw);
      if (bufferRef.current.length > 10) bufferRef.current.shift();
      const avg = bufferRef.current.reduce((a, b) => a + b, 0) / bufferRef.current.length;

      setStability(avg);
      stabilityAnim.value = withTiming(avg, { duration: 80 });
      glowAnim.value = withTiming(0.25 + avg * 0.75, { duration: 80 });

      // KEY: advance only when stable — PAUSE (not reset) when unstable
      if (avg >= STABILITY_THRESHOLD) {
        validatedMsRef.current = Math.min(TARGET_STABLE_MS, validatedMsRef.current + 100);
        setValidatedMs(validatedMsRef.current);
        progressAnim.value = withTiming(validatedMsRef.current / TARGET_STABLE_MS, { duration: 100 });
        setStatusMsg('ANALISI IN CORSO');
      } else {
        setStatusMsg(avg < 0.4 ? 'CENTRARE IL CORPO' : 'TIENI LA POSIZIONE');
      }

      // Completion
      if (validatedMsRef.current >= TARGET_STABLE_MS) {
        clearInterval(tick);
        activeRef.current = false;
        setPhase('done');
        // Gold flash sequence
        screenFlash.value = withSequence(
          withTiming(1, { duration: 120 }),
          withTiming(0.5, { duration: 180 }),
          withTiming(0.85, { duration: 120 }),
          withTiming(0, { duration: 900 })
        );
        // Done card scale-in
        doneScale.value = withSequence(
          withTiming(1.15, { duration: 300 }),
          withTiming(1, { duration: 200 })
        );
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => { onComplete(); }, 2200);
      }
    }, 100);

    return () => { activeRef.current = false; clearTimeout(initTimer); clearInterval(tick); };
  }, []);

  const progressStyle = useAnimatedStyle(() => ({ width: progressAnim.value * (SW - 64) }));
  const stabStyle = useAnimatedStyle(() => ({ width: stabilityAnim.value * (SW - 64) }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowAnim.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: screenFlash.value }));
  const doneStyle = useAnimatedStyle(() => ({ transform: [{ scale: doneScale.value }], opacity: doneScale.value }));

  const pct = Math.round((validatedMs / TARGET_STABLE_MS) * 100);
  const isStable = stability >= STABILITY_THRESHOLD;

  // ── COMPLETION STATE ──
  if (phase === 'done') {
    return (
      <View style={smv$.overlay}>
        <Animated.View style={[StyleSheet.absoluteFill, smv$.flashGold, flashStyle]} />
        <Animated.View style={[smv$.doneWrap, doneStyle]}>
          <View style={smv$.doneCircle}>
            <Ionicons name="shield-checkmark" size={64} color="#FFD700" />
          </View>
          <Text style={smv$.doneTitle}>KORE IDENTIFICATO</Text>
          <View style={smv$.doneDivider} />
          <Text style={smv$.doneAccess}>ACCESSO AUTORIZZATO</Text>
          <Text style={smv$.doneDesc}>AVVIO TRACKING BIOMETRICO IN CORSO...</Text>
        </Animated.View>
      </View>
    );
  }

  // ── VALIDATION STATE ──
  return (
    <View style={smv$.overlay}>
      <Animated.View style={[StyleSheet.absoluteFill, smv$.flashGold, flashStyle]} />

      <View style={smv$.content}>
        {/* Phase label */}
        <Text style={smv$.phaseLabel}>
          {phase === 'init' ? 'INIZIALIZZAZIONE SENSORI' : 'PUPPET·MOTION·DECK ATTIVO'}
        </Text>

        {/* Icon + neon glow */}
        <Animated.View style={[smv$.iconCircle, glowStyle]}>
          <Ionicons name={exercise === 'squat' ? 'body' : 'hand-left'} size={56} color="#00E5FF" />
        </Animated.View>

        {/* Main status message — GIANT */}
        <Text style={[smv$.mainMsg, { color: isStable ? '#00E5FF' : '#FFFFFF' }]}>
          {statusMsg}
        </Text>

        {/* Exercise hint */}
        <Text style={smv$.hint}>
          {exercise === 'squat'
            ? 'PIEDI ALLA LARGHEZZA DELLE SPALLE'
            : 'GUARDIA ALTA · PUGNI PRONTI'}
        </Text>

        {/* Stability bar */}
        <View style={smv$.section}>
          <View style={smv$.barRow}>
            <Text style={smv$.barLabel}>STABILITÀ CORPO</Text>
            <Text style={[smv$.barPct, { color: isStable ? '#00E5FF' : 'rgba(255,255,255,0.4)' }]}>
              {Math.round(stability * 100)}%
            </Text>
          </View>
          <View style={smv$.barBg}>
            <Animated.View style={[smv$.stabFill, stabStyle, {
              backgroundColor: isStable ? '#00E5FF' : '#FF3B30'
            }]} />
          </View>
        </View>

        {/* Progress countdown bar */}
        <View style={smv$.section}>
          <View style={smv$.barRow}>
            <Text style={smv$.barLabel}>VALIDAZIONE POSTURA</Text>
            <Text style={smv$.progressPct}>{pct}%</Text>
          </View>
          <View style={smv$.progressBg}>
            <Animated.View style={[smv$.progressFill, progressStyle]} />
          </View>
          <Text style={smv$.progressNote}>
            {isStable ? 'STABILE — VALIDAZIONE IN CORSO' : 'IN PAUSA — NON RESETTATO'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const smv$ = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center'
  },
  flashGold: { backgroundColor: '#FFD700', zIndex: 31 },
  content: { alignItems: 'center', gap: 22, paddingHorizontal: 32, width: '100%' },
  phaseLabel: { color: 'rgba(0,229,255,0.55)', fontSize: 16, fontWeight: '900', letterSpacing: 5, textAlign: 'center' },
  iconCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(0,229,255,0.06)',
    borderWidth: 2.5, borderColor: '#00E5FF',
    alignItems: 'center', justifyContent: 'center'
  },
  mainMsg: { fontSize: 34, fontWeight: '900', letterSpacing: 4, textAlign: 'center' },
  hint: { color: '#00E5FF22', fontSize: 18, fontWeight: '800', letterSpacing: 2.5, textAlign: 'center', marginTop: -8 },
  section: { width: '100%', gap: 8 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  barPct: { fontSize: 17, fontWeight: '900', letterSpacing: 2 },
  barBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2.5, overflow: 'hidden' },
  stabFill: { height: 5, borderRadius: 2.5 },
  progressBg: { height: 7, backgroundColor: 'rgba(0,229,255,0.15)', borderRadius: 3.5, overflow: 'hidden' },
  progressFill: {
    height: 7, borderRadius: 3.5, backgroundColor: '#00E5FF'
  },
  progressPct: { color: '#00E5FF', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  progressNote: { color: 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: '800', letterSpacing: 2.5, textAlign: 'center' },
  // Done state
  doneWrap: { alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  doneCircle: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: 3, borderColor: '#FFD700',
    alignItems: 'center', justifyContent: 'center'
  },
  doneTitle: { color: '#FFD700', fontSize: 38, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
  doneDivider: { width: 80, height: 2.5, backgroundColor: '#FFD700', borderRadius: 1.5 },
  doneAccess: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', letterSpacing: 5, textAlign: 'center' },
  doneDesc: { color: '#AAAAAA', fontSize: 17, fontWeight: '800', letterSpacing: 3, textAlign: 'center' }
});

// ========== COUNTDOWN ==========
// ========== BATTLE INTRO OVERLAY (Cinematic Countdown) ==========

function BattleIntroOverlay({ user, pvpChallenge, onComplete }: {
  user: any;
  pvpChallenge?: any;
  onComplete: () => void;
}) {
  const [count, setCount] = useState(3);
  const [showGo, setShowGo] = useState(false);
  const leftX = useSharedValue(-SW);
  const rightX = useSharedValue(SW);
  const flashOpacity = useSharedValue(0);
  const countScale = useSharedValue(0.2);
  const countOpacity = useSharedValue(0);
  const chargingCleanupRef = useRef<(() => void) | null>(null);

  const opponent = pvpChallenge?.ghost
    ? { username: pvpChallenge.challenger_username || 'AVVERSARIO', color: '#FF3B30' }
    : { username: 'AI NEXUS', color: '#FFD700' };

  useEffect(() => {
    // Slide in avatars
    leftX.value = withSpring(0, { damping: 14, stiffness: 100 });
    rightX.value = withSpring(0, { damping: 14, stiffness: 100 });

    // ═══ START CHARGING AUDIO (Rising Pitch 200Hz→800Hz, 3 seconds) ═══
    const chargingCleanup = playChargingSound(3.0);
    chargingCleanupRef.current = chargingCleanup;

    let cnt = 3;
    const tick = () => {
      Haptics.impactAsync(cnt === 1 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      // ═══ COUNT TICK AUDIO (rising pitch per tick) ═══
      playCountTick(cnt);
      // Cyan flash
      flashOpacity.value = withSequence(withTiming(0.6, { duration: 60 }), withTiming(0, { duration: 220 }));
      // Count animation
      countScale.value = 0.1;
      countOpacity.value = 1;
      countScale.value = withSpring(1, { damping: 6, stiffness: 200 });
      countOpacity.value = withSequence(withTiming(1, { duration: 100 }), withDelay(400, withTiming(0, { duration: 200 })));

      cnt--;
      setCount(cnt);

      if (cnt <= 0) {
        // GO! — ═══ FINAL START BEEP (sharp, metallic, 1000Hz) ═══
        setShowGo(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        playStartBeep();
        flashOpacity.value = withSequence(withTiming(0.9, { duration: 50 }), withTiming(0, { duration: 400 }));
        setTimeout(() => { setShowGo(false); onComplete(); }, 600);
        return;
      }
      setTimeout(tick, 1000);
    };
    const startTimer = setTimeout(tick, 600); // brief pause for avatars to slide in
    return () => {
      clearTimeout(startTimer);
      // Cleanup charging sound if component unmounts early
      if (chargingCleanupRef.current) {
        chargingCleanupRef.current();
      }
    };
  }, []);

  const leftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: leftX.value }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: rightX.value }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const countStyle = useAnimatedStyle(() => ({ transform: [{ scale: countScale.value }], opacity: countOpacity.value }));

  const userColor = user?.avatar_color || '#00E5FF';

  return (
    <View style={bi$.root}>
      {/* Cyan flash */}
      <Animated.View style={[bi$.flash, flashStyle]} pointerEvents="none" />

      {/* Gradient split background */}
      <LinearGradient
        colors={[userColor + '18', 'rgba(0,0,0,0.96)', opponent.color + '18']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Left: User avatar */}
      <Animated.View style={[bi$.avatarLeft, leftStyle]}>
        <View style={[bi$.avatarCircle, { backgroundColor: userColor }]}>
          <Text style={bi$.avatarLetter}>{(user?.username || 'TU')[0].toUpperCase()}</Text>
        </View>
        <Text style={bi$.avatarName}>{(user?.username || 'TU').toUpperCase()}</Text>
        <View style={[bi$.avatarBadge, { borderColor: userColor + '60' }]}>
          <Text style={[bi$.avatarBadgeTxt, { color: userColor }]}>LVL {user?.level || 1}</Text>
        </View>
      </Animated.View>

      {/* Center: VS + Countdown */}
      <View style={bi$.center}>
        {!showGo && count > 0 && (
          <Animated.Text style={[bi$.countNum, countStyle, { color: '#00E5FF' }]}>{count}</Animated.Text>
        )}
        {showGo && (
          <Animated.Text style={[bi$.countNum, { color: '#00FF87', fontSize: 72 }]}>VIA!</Animated.Text>
        )}
        <Text style={bi$.vsText}>VS</Text>
      </View>

      {/* Right: Opponent avatar */}
      <Animated.View style={[bi$.avatarRight, rightStyle]}>
        <View style={[bi$.avatarCircle, { backgroundColor: opponent.color }]}>
          <Text style={bi$.avatarLetter}>{(pvpChallenge?.challenged_username || opponent.username)[0].toUpperCase()}</Text>
        </View>
        <Text style={bi$.avatarName}>{(pvpChallenge?.challenged_username || opponent.username).toUpperCase()}</Text>
        <View style={[bi$.avatarBadge, { borderColor: opponent.color + '60' }]}>
          <Text style={[bi$.avatarBadgeTxt, { color: opponent.color }]}>
            {pvpChallenge ? 'CHALLENGER' : 'AI NEXUS'}
          </Text>
        </View>
      </Animated.View>

      {/* Bottom label */}
      <Text style={bi$.bottomLabel}>{count > 0 ? 'PREPARATI' : 'NEXUS ATTIVATO'}</Text>
    </View>
  );
}

const bi$ = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 40, backgroundColor: '#000000' },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00E5FF', zIndex: 45 },
  avatarLeft: { position: 'absolute', left: 20, alignItems: 'center', gap: 8 },
  avatarRight: { position: 'absolute', right: 20, alignItems: 'center', gap: 8 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', elevation: 12 },
  avatarLetter: { color: '#000', fontSize: 32, fontWeight: '900' },
  avatarName: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  avatarBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  avatarBadgeTxt: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  center: { alignItems: 'center', gap: 8 },
  countNum: { fontSize: 110, fontWeight: '900', letterSpacing: -4, lineHeight: 110 },
  vsText: { color: 'rgba(255,255,255,0.2)', fontSize: 15, fontWeight: '900', letterSpacing: 6, marginTop: 4 },
  bottomLabel: { position: 'absolute', bottom: 80, color: 'rgba(255,255,255,0.30)', fontSize: 15, fontWeight: '900', letterSpacing: 4 }
});

// ========== GHOST SHADOW (Silhouette during scan) ==========
function GhostShadow({ isAhead, currentReps, ghostReps }: {
  isAhead: boolean;
  currentReps: number;
  ghostReps: number;
}) {
  const gap = Math.abs(currentReps - ghostReps);
  const intensity = Math.min(0.3, 0.1 + gap * 0.03);
  const translateX = useSharedValue(isAhead ? SW * 0.15 : -SW * 0.1);

  useEffect(() => {
    translateX.value = withTiming(isAhead ? SW * 0.15 : -SW * 0.1, { duration: 600 });
  }, [isAhead]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  return (
    <Animated.View style={[gs$.container, style]} pointerEvents="none">
      <Ionicons name="body" size={160} color={isAhead ? '#00E5FF' : '#FF9500'} style={{ opacity: intensity }} />
      {gap > 0 && (
        <View style={[gs$.gap, { borderColor: isAhead ? '#00FF87' : '#FF3B30' }]}>
          <Text style={[gs$.gapText, { color: isAhead ? '#00FF87' : '#FF3B30' }]}>
            {isAhead ? `+${gap}` : `-${gap}`}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const gs$ = StyleSheet.create({
  container: { position: 'absolute', top: 150, left: 0, right: 0, alignItems: 'center', zIndex: 30 },
  gap: { position: 'absolute', top: 20, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  gapText: { fontSize: 18, fontWeight: '900', letterSpacing: 2 }
});

// ========== FLUX RAIN ==========
function AKDropsRain({ drops, visible }: { drops: number; visible: boolean }) {
  const count = Math.min(Math.max(drops, 3), 25);
  const anims = useRef(
    Array.from({ length: count }, (_, i) => ({
      y: new RNAnimated.Value(-80),
      x: new RNAnimated.Value(40 + Math.random() * (SW - 80)),
      opacity: new RNAnimated.Value(0),
      rotate: new RNAnimated.Value(0)
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;
    anims.forEach((a, i) => {
      a.y.setValue(-80 - Math.random() * 100);
      a.x.setValue(40 + Math.random() * (SW - 80));
      a.opacity.setValue(1);
      a.rotate.setValue(0);
      RNAnimated.sequence([
        RNAnimated.delay(i * 60 + Math.random() * 200),
        RNAnimated.parallel([
          RNAnimated.timing(a.y, { toValue: 500 + Math.random() * 200, duration: 1800 + Math.random() * 600, useNativeDriver: true }),
          RNAnimated.timing(a.rotate, { toValue: (Math.random() - 0.5) * 4, duration: 2000, useNativeDriver: true }),
          RNAnimated.sequence([
            RNAnimated.timing(a.opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
            RNAnimated.delay(1200),
            RNAnimated.timing(a.opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    });
  }, [visible]);

  if (!visible) return null;
  return (
    <View style={dr$.container} pointerEvents="none">
      {anims.map((a, i) => (
        <RNAnimated.Text key={i} style={[dr$.drop, {
          transform: [{ translateY: a.y }, { translateX: a.x }, { rotate: a.rotate.interpolate({ inputRange: [-4, 4], outputRange: ['-720deg', '720deg'] }) }],
          opacity: a.opacity
        }]}>
         
        </RNAnimated.Text>
      ))}
      <View style={dr$.badge}>
        <Text style={dr$.badgeText}>+{drops}</Text>
      </View>
    </View>
  );
}

const dr$ = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 55 },
  drop: { position: 'absolute', top: 0, left: 0, fontSize: 28 },
  badge: { position: 'absolute', top: 340, alignSelf: 'center', backgroundColor: 'rgba(0,229,255,0.15)', borderRadius: 20, borderWidth: 2, borderColor: '#00E5FF', paddingHorizontal: 24, paddingVertical: 10 },
  badgeText: { color: '#00E5FF', fontSize: 28, fontWeight: '900', letterSpacing: 4 }
});

// ========== VICTORY OVERLAY ==========
function VictoryOverlay({ visible, xpChange }: { visible: boolean; xpChange?: number }) {
  const glow = useSharedValue(0.5);
  useEffect(() => {
    if (!visible) return;
    glow.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.5, { duration: 700 })), -1, false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [visible]);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.8 + glow.value * 0.2
  }));
  if (!visible) return null;
  return (
    <Animated.View style={[vo$.container, glowStyle]} pointerEvents="none">
      <Ionicons name="trophy" size={48} color="#FFD700" />
      <Text style={vo$.victory}>VICTORY</Text>
      {xpChange && xpChange > 0 && (
        <Text style={vo$.xp}>+{xpChange} FLUX</Text>
      )}
    </Animated.View>
  );
}

const vo$ = StyleSheet.create({
  container: { position: 'absolute', top: 80, alignSelf: 'center', alignItems: 'center', gap: 8, zIndex: 50 },
  victory: { color: '#FFD700', fontSize: 42, fontWeight: '900', letterSpacing: 6 },
  xp: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', letterSpacing: 2 }
});

// ========== ORIGINAL COUNTDOWN (kept as fallback) ==========
function Countdown({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(3);
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);
  useEffect(() => {
    const iv = setInterval(() => {
      setCount(p => { if (p <= 1) { clearInterval(iv); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setTimeout(onComplete, 400); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    scale.value = 0.3; opacity.value = 0;
    scale.value = withSpring(1, { damping: 8, stiffness: 150 });
    opacity.value = withSequence(withTiming(1, { duration: 200 }), withDelay(500, withTiming(0.4, { duration: 300 })));
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [count]);
  const as = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  return (
    <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 25, backgroundColor: 'rgba(5,5,5,0.88)' }}>
      <Animated.View style={[{ width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(5,5,5,0.95)', borderWidth: 3, borderColor: '#00E5FF', alignItems: 'center', justifyContent: 'center' }, as]}>
        <Text style={{ color: '#00E5FF', fontSize: 64, fontWeight: '900' }}>{count === 0 ? 'GO' : count}</Text>
      </Animated.View>
      <Text style={{ color: '#888', fontSize: 17, fontWeight: '700', letterSpacing: 3, marginTop: 24 }}>{count > 0 ? 'PREPARATI' : 'NEXUS ATTIVATO'}</Text>
    </View>
  );
}

// ========== LIVE WAITING ROOM ==========
function LiveWaitingRoom({ user, token, onBack, onMatchFound }: {
  user: any; token: string | null; onBack: () => void; onMatchFound: (battleId: string) => void;
}) {
  const [status, setStatus] = useState<'idle' | 'searching' | 'matched' | 'expired'>('idle');
  const [queueData, setQueueData] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const pulseAnim = useSharedValue(0.5);
  const ringScale = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(withSequence(withTiming(1, { duration: 800 }), withTiming(0.5, { duration: 800 })), -1, false);
    ringScale.value = withRepeat(withSequence(withTiming(1.3, { duration: 1500 }), withTiming(1, { duration: 1500 })), -1, false);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseAnim.value }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: ringScale.value }], opacity: interpolate(ringScale.value, [1, 1.3], [0.4, 0]) }));

  const joinQueue = async () => {
    if (!token) return;
    setStatus('searching');
    try {
      const res = await api.joinLiveQueue({ exercise_type: 'squat', discipline: 'power' }, token);
      setQueueData(res);
      if (res.status === 'matched') {
        setStatus('matched');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setTimeout(() => onMatchFound(res.battle_id), 2000);
      }
    } catch (_) {}
  };

  // Poll for match every 3s
  useEffect(() => {
    if (status !== 'searching' || !token) return;
    const iv = setInterval(async () => {
      setElapsed(p => p + 3);
      try {
        const res = await api.getLiveQueueStatus(token);
        if (res.status === 'matched') {
          setStatus('matched');
          setQueueData(res);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          clearInterval(iv);
          setTimeout(() => onMatchFound(res.battle_id), 2000);
        } else if (res.status === 'expired' || res.status === 'not_in_queue') {
          setStatus('expired');
          clearInterval(iv);
        }
      } catch (_) {}
    }, 3000);
    return () => clearInterval(iv);
  }, [status, token]);

  const handleLeave = async () => {
    if (token) await api.leaveLiveQueue(token).catch(() => {});
    onBack();
  };

  return (
    <View style={lw$.container}>
      <CyberGrid intensity={0.15} />
      <SafeAreaView style={lw$.safe}>
        <View style={lw$.header}>
          <Ionicons name="radio" size={28} color="#FF6B00" />
          <Text style={lw$.title}>LIVE ARENA</Text>
          <Text style={lw$.subtitle}>WAITING ROOM</Text>
        </View>

        <View style={lw$.center}>
          {status === 'idle' && (
            <Animated.View entering={FadeIn.duration(400)} style={lw$.idleWrap}>
              <View style={lw$.iconCircle}>
                <Ionicons name="radio" size={48} color="#FF6B00" />
              </View>
              <Text style={lw$.idleText}>ENTRA NELLA CODA LIVE</Text>
              <Text style={lw$.idleSub}>Verrai abbinato a un avversario in tempo reale per una sfida dal vivo.</Text>
              <TouchableOpacity style={lw$.joinBtn} onPress={joinQueue} activeOpacity={0.85}>
                <Ionicons name="flash" size={18} color="#000" />
                <Text style={lw$.joinBtnText}>CERCA AVVERSARIO</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {status === 'searching' && (
            <Animated.View entering={FadeIn.duration(300)} style={lw$.searchWrap}>
              <View style={lw$.searchCircle}>
                <Animated.View style={[lw$.ring, ringStyle]} />
                <Animated.View style={[lw$.pulseIcon, pulseStyle]}>
                  <Ionicons name="radio" size={40} color="#FF6B00" />
                </Animated.View>
              </View>
              <Text style={lw$.searchText}>RICERCA IN CORSO...</Text>
              <Text style={lw$.searchTimer}>{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</Text>
              <Text style={lw$.searchSub}>Posizione in coda: {queueData?.position || '—'}</Text>
            </Animated.View>
          )}

          {status === 'matched' && (
            <Animated.View entering={FadeIn.duration(300)} style={lw$.matchWrap}>
              <Ionicons name="checkmark-circle" size={64} color="#00FF87" />
              <Text style={lw$.matchText}>MATCH TROVATO!</Text>
              <Text style={lw$.matchOpp}>{queueData?.opponent_username?.toUpperCase() || 'AVVERSARIO'}</Text>
              <Text style={lw$.matchSub}>Preparati per la sfida live...</Text>
            </Animated.View>
          )}

          {status === 'expired' && (
            <Animated.View entering={FadeIn.duration(300)} style={lw$.expiredWrap}>
              <Ionicons name="time-outline" size={48} color="#FF3B30" />
              <Text style={lw$.expiredText}>CODA SCADUTA</Text>
              <Text style={lw$.expiredSub}>Nessun avversario trovato. Riprova.</Text>
              <TouchableOpacity style={lw$.joinBtn} onPress={() => { setStatus('idle'); setElapsed(0); }} activeOpacity={0.85}>
                <Text style={lw$.joinBtnText}>RIPROVA</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        <TouchableOpacity onPress={handleLeave} style={lw$.backBtn}>
          <Ionicons name="arrow-back" size={16} color="#555" />
          <Text style={lw$.backText}>TORNA AL NEXUS</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const lw$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 24, gap: 4 },
  title: { color: '#FF6B00', fontSize: 28, fontWeight: '900', letterSpacing: 6 },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '800', letterSpacing: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  // Idle
  idleWrap: { alignItems: 'center', gap: 16 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,107,0,0.08)', borderWidth: 2, borderColor: '#FF6B00', alignItems: 'center', justifyContent: 'center' },
  idleText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
  idleSub: { color: '#AAAAAA', fontSize: 14, fontWeight: '400', textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF6B00', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  joinBtnText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  // Searching
  searchWrap: { alignItems: 'center', gap: 16 },
  searchCircle: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#FF6B00' },
  pulseIcon: {},
  searchText: { color: '#FF6B00', fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  searchTimer: { color: '#FFFFFF', fontSize: 42, fontWeight: '900', letterSpacing: 2 },
  searchSub: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  // Matched
  matchWrap: { alignItems: 'center', gap: 12 },
  matchText: { color: '#00FF87', fontSize: 24, fontWeight: '900', letterSpacing: 4 },
  matchOpp: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  matchSub: { color: '#AAAAAA', fontSize: 14, fontWeight: '400' },
  // Expired
  expiredWrap: { alignItems: 'center', gap: 12 },
  expiredText: { color: '#FF3B30', fontSize: 20, fontWeight: '900', letterSpacing: 3 },
  expiredSub: { color: '#AAAAAA', fontSize: 14, fontWeight: '400' },
  // Back
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  backText: { color: '#555', fontSize: 14, fontWeight: '800', letterSpacing: 2 }
});

// ========== MAIN SCREEN ==========
export default function NexusTriggerScreen() {
  const { user, token, logout, activeRole, setActiveRole, updateUser } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Camera permission handled lazily via NativeCameraPreview component
  const [phase, setPhase] = useState<'console' | 'bioscan' | 'forge' | 'challenge_engine' | 'tilt_setup' | 'body_lock' | 'countdown' | 'stabilizing' | 'scanning' | 'results' | 'live_queue' | 'qr_validation'>('console');
  const [exercise, setExercise] = useState<ExerciseType>('squat');
  const [forgeMode, setForgeMode] = useState<ForgeMode>('personal');
  const [sessionMode, setSessionMode] = useState<'scan' | 'practice' | 'ranked'>('scan');
  const [challengeContext, setChallengeContext] = useState<{ id: string; tags: string[]; color: string } | null>(null);
  const [qrContext, setQrContext] = useState<{ challengeId: string; score: { reps: number; seconds: number; kg: number }; totalParticipants: number; tags: string[]; challengeType: 'OPEN_LIVE' | 'CLOSED_LIVE' } | null>(null);
  const [motionState, setMotionState] = useState<MotionState | null>(null);
  const [motionActive, setMotionActive] = useState(false);
  const [goldFlash, setGoldFlash] = useState(false);
  const [timer, setTimer] = useState(0);
  const [scanResult, setScanResult] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [deviceTier, setDeviceTier] = useState<DeviceTier>('standard');
  // SPRINT 7: Bio-Evolution Engine
  const [eligibility, setEligibility] = useState<any>(null);
  const [showProUnlock, setShowProUnlock] = useState(false);
  const [bioscanResult, setBioscanResult] = useState<any>(null);
  const [myRank, setMyRank] = useState<any>(null);
  const [myCrews, setMyCrews] = useState<any[]>([]);
  // SPRINT NEXUS: DNA Baseline for Live Ghost Efficiency Ratio
  const [dnaBaseline, setDnaBaseline] = useState<number>(50); // pre-fetched DNA average
  // PvP Ghost Session
  const { pvpChallengeId } = useLocalSearchParams<{ pvpChallengeId?: string }>();
  const [pvpChallenge, setPvpChallenge] = useState<any>(null);
  // Training Session (Coach Template)
  const params = useLocalSearchParams<{
    trainingPushId?: string; trainingExercise?: string;
    trainingTargetReps?: string; trainingTargetTime?: string;
    trainingName?: string; trainingFlux?: string; dnaPotential?: string;
    ugcChallengeId?: string; ugcTitle?: string; ugcExercises?: string;
    ugcTemplateType?: string; ugcFluxReward?: string;
    ugcCreatorRole?: string; ugcIsMaster?: string;
  }>();
  const isTrainingMode = !!params.trainingPushId;
  const trainingTargetReps = parseInt(params.trainingTargetReps || '20', 10);
  const trainingTargetTime = parseInt(params.trainingTargetTime || '60', 10);
  const dnaPotential = parseFloat(params.dnaPotential || '70');

  // ─── UGC CHALLENGE MODE ───
  const isUGCMode = !!params.ugcChallengeId;
  const ugcExercises: UGCExercise[] = React.useMemo(() => {
    try { return params.ugcExercises ? JSON.parse(params.ugcExercises) : []; }
    catch { return []; }
  }, [params.ugcExercises]);
  const [ugcExerciseIndex, setUgcExerciseIndex] = useState(0);
  const [ugcExerciseReps, setUgcExerciseReps] = useState(0);
  const [ugcAllCompleted, setUgcAllCompleted] = useState(false);
  const ugcRepsPerExercise = useRef<{ name: string; reps_done: number; quality: number }[]>([]);
  const [scannerFromNexus, setScannerFromNexus] = useState(false);
  const [nexusChallengePreview, setNexusChallengePreview] = useState<any>(null);
  const [templateReqDiscipline, setTemplateReqDiscipline] = useState('');
  const [showTemplateReq, setShowTemplateReq] = useState(false);
  const [showCategoryProposal, setShowCategoryProposal] = useState(false);
  const [showFluxStore, setShowFluxStore] = useState(false);
  const [expandedBattleId, setExpandedBattleId] = useState<string | null>(null);
  // Dopamine layer: FLUX Rain + Victory
  const [showDropsRain, setShowDropsRain] = useState(false);
  const [dropsEarned, setDropsEarned] = useState(0);
  const [isVictory, setIsVictory] = useState(false);

  // ═══ KORE ATLAS: GPS capture for geo-tagged performance records ═══
  const geoRef = useRef<{ latitude: number; longitude: number; city_name: string } | null>(null);
  const geoFetchedRef = useRef(false);

  // Capture geolocation lazily when challenge starts (countdown or scanning phase)
  useEffect(() => {
    if ((phase === 'countdown' || phase === 'scanning') && !geoFetchedRef.current) {
      geoFetchedRef.current = true;
      (async () => {
        try {
          const ExpoLocation = require('expo-location');
          const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
          const [geo] = await ExpoLocation.reverseGeocodeAsync(pos.coords);
          const city = (geo?.city || geo?.subregion || geo?.region || '').toUpperCase().trim();
          geoRef.current = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            city_name: city || 'UNKNOWN',
          };
        } catch (_) {
          // GPS unavailable — non-blocking, record saved without geo
        }
      })();
    }
    // Reset geo when going back to console
    if (phase === 'console') {
      geoFetchedRef.current = false;
      geoRef.current = null;
    }
  }, [phase]);

  // ═══ AUTO-SNAPSHOT: PEAK capture at ~50% reps ═══
  useEffect(() => {
    if (phase !== 'scanning' || Platform.OS !== 'web') return;
    const reps = motionState?.reps || 0;
    const targetReps = isUGCMode
      ? ugcExercises.reduce((s, e) => s + (e.target_reps || 0), 0)
      : (trainingTargetReps || 20);
    const midpoint = Math.max(3, Math.floor(targetReps / 2));

    if (!snapshotTakenRef.current.peak && reps >= midpoint && videoElRef.current) {
      const base64 = captureSnapshot(videoElRef.current, 'PEAK');
      if (base64) {
        setSnapshots(prev => ({ ...prev, peak: base64 }));
        snapshotTakenRef.current.peak = true;
      }
    }
  }, [motionState?.reps, phase]);

  // ═══ Reset snapshots when starting a new scan ═══
  useEffect(() => {
    if (phase === 'countdown' || phase === 'stabilizing') {
      setSnapshots({});
      snapshotTakenRef.current = { start: false, peak: false, finish: false };
    }
  }, [phase]);

  const analyzerRef = useRef<MotionAnalyzer | null>(null);
  const startTimeRef = useRef(0);
  const timerRef = useRef<any>(null);
  const lastRepRef = useRef(0);
  const accelSubRef = useRef<any>(null);
  const motionTimeoutRef = useRef<any>(null);

  // ═══ DUAL-CAM SYSTEM ═══
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const videoElRef = useRef<any>(null);
  const streamRef = useRef<any>(null);

  // ═══ AUTO-SNAPSHOT ENGINE — 3 shots per challenge ═══
  const [snapshots, setSnapshots] = useState<{ start?: string; peak?: string; finish?: string }>({});
  const snapshotTakenRef = useRef<{ start: boolean; peak: boolean; finish: boolean }>({ start: false, peak: false, finish: false });
  const peakThreshold = useRef(0); // midpoint rep count for peak capture

  // ── Snapshot capture: draw video frame to canvas + watermark ──
  const captureSnapshot = useCallback((videoEl: any, label: string): string | null => {
    if (Platform.OS !== 'web' || !videoEl || videoEl.readyState < 2) return null;
    try {
      const w = 720; const h = 960;
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      if (!ctx) return null;
      // Draw video frame (cropped to fill)
      const vw = videoEl.videoWidth || 640;
      const vh = videoEl.videoHeight || 480;
      const scale = Math.max(w / vw, h / vh);
      const sw = w / scale; const sh = h / scale;
      const sx = (vw - sw) / 2; const sy = (vh - sh) / 2;
      ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, w, h);
      // Watermark: ARENA KORE bottom-right
      ctx.save();
      ctx.font = '700 16px Montserrat, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.textAlign = 'right';
      ctx.fillText('ARENA KORE', w - 20, h - 20);
      // Shot label top-left
      ctx.font = '900 12px Montserrat, sans-serif';
      ctx.fillStyle = 'rgba(0,229,255,0.6)';
      ctx.textAlign = 'left';
      ctx.fillText(label, 20, 30);
      ctx.restore();
      return cv.toDataURL('image/jpeg', 0.85);
    } catch {
      return null;
    }
  }, []);

  // ═══ UGC DYNAMIC REPS TRACKER — Auto-advance between exercises ═══
  useEffect(() => {
    if (!isUGCMode || phase !== 'scanning' || ugcExercises.length === 0) return;
    const currentEx = ugcExercises[ugcExerciseIndex];
    if (!currentEx) return;

    const totalReps = motionState?.reps || 0;
    // Calculate reps for the CURRENT exercise only
    const previousExReps = ugcRepsPerExercise.current.reduce((sum, e) => sum + e.reps_done, 0);
    const currentExReps = Math.max(0, totalReps - previousExReps);
    setUgcExerciseReps(currentExReps);

    // Auto-advance when target reached
    if (currentEx.target_reps > 0 && currentExReps >= currentEx.target_reps) {
      // Record this exercise
      ugcRepsPerExercise.current.push({
        name: currentEx.name,
        reps_done: currentExReps,
        quality: motionState?.quality || 0
      });

      if (ugcExerciseIndex < ugcExercises.length - 1) {
        // Move to next exercise
        setUgcExerciseIndex(prev => prev + 1);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      } else {
        // All exercises completed!
        setUgcAllCompleted(true);
        // Auto-stop after 1.5s for dopamine moment
        setTimeout(() => handleStop(), 1500);
      }
    }
  }, [motionState?.reps, phase, ugcExerciseIndex, isUGCMode]);

  // ═══ VOICE COMMAND ENGINE ═══
  const isVoiceActive = ['body_lock', 'countdown', 'scanning', 'tilt_setup', 'bioscan'].includes(phase);
  const bodyLockedRef = useRef(false); // Track body lock state for voice "VIA"
  const [bodyLockedUI, setBodyLockedUI] = useState(false); // Re-render trigger for "Dì VIA" prompt
  const [isProntoConfirmed, setIsProntoConfirmed] = useState(false); // "PRONTO" gate before "VIA"
  const [liveBpm, setLiveBpm] = useState<number | null>(null); // HealthKit live BPM

  const handleVoiceCommand = useCallback((cmd: 'PRONTO' | 'VIA' | 'ESCI' | null) => {
    if (!cmd) return;
    switch (cmd) {
      case 'PRONTO':
        // If in console → start bioscan
        if (phase === 'console') {
          setSessionMode('scan');
          setPhase('bioscan');
        }
        // If body_lock and body is locked → confirm readiness
        if (phase === 'body_lock' && bodyLockedRef.current) {
          setIsProntoConfirmed(true);
          speakCoach("Pronto confermato. Dì VIA per partire.", 'it-IT');
        }
        break;
      case 'VIA':
        // Start countdown — ONLY if body locked AND "PRONTO" was confirmed
        if (phase === 'body_lock' && bodyLockedRef.current && isProntoConfirmed) {
          setPhase('countdown');
        }
        break;
      case 'ESCI':
        // Emergency exit
        handleEmergencyExit();
        break;
    }
  }, [phase, isProntoConfirmed]);

  const { isListening } = useVoiceCommands({
    enabled: isVoiceActive,
    onCommand: handleVoiceCommand
  });

  // ═══ EMERGENCY EXIT ═══
  const handleEmergencyExit = useCallback(() => {
    cancelCoachSpeech();
    // Clear all timers
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (motionTimeoutRef.current) { clearTimeout(motionTimeoutRef.current); motionTimeoutRef.current = null; }
    // Reset all scan & challenge state → back to console
    setPhase('console');
    setMotionState(null);
    setMotionActive(false);
    setScanResult(null);
    setSessionId(null);
    setChallengeContext(null);
    setShowDropsRain(false);
    setIsVictory(false);
    bodyLockedRef.current = false;
    setBodyLockedUI(false);
    setIsProntoConfirmed(false);
    setTimer(0);
    setSessionMode('scan');
    setForgeMode('personal');
    // Camera/MediaPipe cleanup is handled by React unmount of NativeCameraPreview
    // since phase='console' removes it from the render tree
  }, []);

  // ═══ ANDROID BACK BUTTON INTERCEPT ═══
  // Prevent hardware back from navigating to KORE — reset to console instead
  useEffect(() => {
    if (phase === 'console') return; // allow default back on console view
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleEmergencyExit();
      return true; // prevent default (navigating away from NÈXUS tab)
    });
    return () => sub.remove();
  }, [phase, handleEmergencyExit]);

  // LAZY DEVICE PROFILING: Only profile when entering a scan-related phase
  // (NOT on mount — prevents native module initialization at boot)
  useEffect(() => {
    if (['bioscan', 'tilt_setup', 'body_lock', 'countdown', 'scanning'].includes(phase) && deviceTier === 'standard') {
      try {
        const dp = profileDevice();
        setDeviceTier(dp.tier);
      } catch (_) { /* fallback stays 'standard' */ }
    }
  }, [phase]);

  // SPRINT 7: Fetch bio-scan eligibility on mount
  useEffect(() => {
    if (!token) return;
    api.getRescanEligibility(token)
      .then(data => setEligibility(data))
      .catch(() => {});
    api.getMyRank(token)
      .then(data => setMyRank(data))
      .catch(() => {});
    api.getMyCrews(token)
      .then(data => setMyCrews(Array.isArray(data) ? data : (data?.crews || [])))
      .catch(() => {});
  }, [token]);

  // PvP: fetch challenge details if pvpChallengeId param is present
  useEffect(() => {
    if (!pvpChallengeId || !token) return;
    api.getPvPChallenge(pvpChallengeId, token)
      .then(data => {
        setPvpChallenge(data);
        // Auto-set exercise from discipline
        if (data.exercise) setExercise(data.exercise as ExerciseType);
        // Auto-start forge flow
        setPhase('forge');
      })
      .catch(() => {});
  }, [pvpChallengeId, token]);

  // Training session: auto-set exercise and go to forge on mount
  useEffect(() => {
    if (!isTrainingMode) return;
    if (params.trainingExercise) setExercise(params.trainingExercise as ExerciseType);
    setForgeMode('personal');
    setPhase('tilt_setup'); // Go through tilt guide even for training sessions
  }, [isTrainingMode]);

  // ═══ UGC CHALLENGE: Auto-start scan flow when arriving with UGC params ═══
  useEffect(() => {
    if (!isUGCMode || ugcExercises.length === 0) return;
    // Reset UGC tracking state
    setUgcExerciseIndex(0);
    setUgcExerciseReps(0);
    setUgcAllCompleted(false);
    ugcRepsPerExercise.current = [];
    // Set exercise type based on first UGC exercise name heuristic
    const firstName = (ugcExercises[0]?.name || '').toLowerCase();
    if (firstName.includes('squat') || firstName.includes('lunge') || firstName.includes('jump')) {
      setExercise('squat');
    } else {
      setExercise('punch');
    }
    setForgeMode('personal');
    setPhase('tilt_setup'); // Go through tilt → body_lock → countdown → scanning
  }, [isUGCMode]);

  // Web camera & motion detection — DUAL-CAM + AUTO-SNAPSHOT ENGINE
  useEffect(() => {
    if (phase !== 'scanning' || Platform.OS !== 'web') return;
    let localStream: any; let videoEl: any; let motionIv: any; let prevFrame: any;
    const isFront = cameraFacing === 'user';
    (async () => {
      try {
        localStream = await (navigator as any).mediaDevices.getUserMedia({
          video: { facingMode: cameraFacing, width: 640, height: 480 }
        });
        videoEl = document.createElement('video');
        videoEl.srcObject = localStream; videoEl.muted = true; videoEl.playsInline = true;
        // Front camera: mirrored. Rear camera: normal
        videoEl.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;object-fit:cover;z-index:0;${isFront ? 'transform:scaleX(-1);' : ''}opacity:1;`;
        videoEl.id = 'nexus-video-el';
        const c = document.getElementById('nexus-cam');
        if (c) c.appendChild(videoEl);
        else document.body.prepend(videoEl);
        await videoEl.play();
        // Store refs for snapshot access
        videoElRef.current = videoEl;
        streamRef.current = localStream;

        // ── AUTO-SNAPSHOT: START shot (after 1.5s to let camera stabilize) ──
        setTimeout(() => {
          if (!snapshotTakenRef.current.start && videoEl && videoEl.readyState >= 2) {
            const base64 = captureSnapshot(videoEl, 'START');
            if (base64) {
              setSnapshots(prev => ({ ...prev, start: base64 }));
              snapshotTakenRef.current.start = true;
            }
          }
        }, 1500);

        // Motion detection canvas
        const cv = document.createElement('canvas'); cv.width = 160; cv.height = 120; const ctx = cv.getContext('2d');
        motionIv = setInterval(() => {
          if (!videoEl || videoEl.readyState < 2 || !ctx) return;
          ctx.drawImage(videoEl, 0, 0, 160, 120);
          const f = ctx.getImageData(0, 0, 160, 120);
          if (prevFrame) {
            let d = 0; for (let i = 0; i < f.data.length; i += 16) d += Math.abs(f.data[i] - prevFrame.data[i]);
            const avgDiff = d / (f.data.length / 16);
            if (avgDiff > 8) {
              setMotionActive(true);
              if (motionTimeoutRef.current) clearTimeout(motionTimeoutRef.current);
              motionTimeoutRef.current = setTimeout(() => setMotionActive(false), 500);
              if (avgDiff > 16) { setGoldFlash(true); setTimeout(() => setGoldFlash(false), 350); }
            }
          }
          prevFrame = f;
        }, 150);
      } catch (_) {}
    })();
    return () => {
      if (motionIv) clearInterval(motionIv);
      if (localStream) localStream.getTracks().forEach((t: any) => t.stop());
      const oldVid = document.getElementById('nexus-video-el');
      if (oldVid?.parentNode) oldVid.parentNode.removeChild(oldVid);
      videoElRef.current = null;
      streamRef.current = null;
    };
  }, [phase, cameraFacing]);

  const handleForgeSelect = (mode: ForgeMode, ex: ExerciseType) => { setForgeMode(mode); setExercise(ex); setPhase('tilt_setup'); };

  const handleCountdownDone = () => {
    setPhase('stabilizing');
  };

  const handleStabilizingComplete = async () => {
    setPhase('scanning');
    try {
      if (token) {
        const s = await api.startNexusSession({ exercise_type: exercise }, token);
        setSessionId(s.session_id);
        // ── SPRINT NEXUS: Pre-fetch DNA baseline for Live Ghost ──
        const dna = user?.dna || {};
        const vals = Object.values(dna).filter((v: any) => typeof v === 'number' && v > 0);
        const avg = vals.length > 0 ? (vals as number[]).reduce((a, b) => a + b, 0) / vals.length : 50;
        setDnaBaseline(Math.round(avg));
      }
    } catch (_) {}
    analyzerRef.current = new MotionAnalyzer(exercise);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setTimer(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    if (Platform.OS !== 'web') {
      try { const { startAccelerometer } = require('../../utils/nativeSensors'); accelSubRef.current = startAccelerometer((d: any) => { if (analyzerRef.current) setMotionState({ ...analyzerRef.current.processAccelerometer(d) }); }); } catch (_) {}
    }
  };

  // Web simulation
  const simRef = useRef({ reps: 0, quality: 0, tick: 0, lastRepTick: -100, qualities: [] as number[] });
  useEffect(() => {
    if (phase !== 'scanning' || Platform.OS !== 'web') return;
    simRef.current = { reps: 0, quality: 0, tick: 0, lastRepTick: -100, qualities: [] };
    const ex = exercise;
    const iv = setInterval(() => {
      const d = simRef.current; d.tick++;
      const t = d.tick * 0.033; let x = 0, y = 0, z = 0;
      if (ex === 'squat') {
        const p = (t * 2.5) % (Math.PI * 2); y = Math.sin(p) * 0.8; x = Math.sin(t * 7) * 0.03;
        if (Math.sin(((t - 0.033) * 2.5) % (Math.PI * 2)) < 0 && Math.sin(p) >= 0 && (d.tick - d.lastRepTick) > 30) { d.reps++; d.lastRepTick = d.tick; const q = 65 + Math.random() * 30; d.qualities.push(q); d.quality = Math.round(d.qualities.reduce((a, b) => a + b) / d.qualities.length); }
      } else {
        const cp = t % 1.3;
        if (cp < 0.12) { const pr = cp / 0.12; x = 4.5 * Math.sin(pr * Math.PI); z = 3 * Math.sin(pr * Math.PI); }
        if (cp > 0.04 && cp < 0.08 && (d.tick - d.lastRepTick) > 25) { d.reps++; d.lastRepTick = d.tick; const q = 60 + Math.random() * 35; d.qualities.push(q); d.quality = Math.round(d.qualities.reduce((a, b) => a + b) / d.qualities.length); }
      }
      const mag = Math.sqrt(x * x + y * y + z * z);
      setMotionState({
        reps: d.reps, quality: d.quality, currentPhase: mag > 1 ? (ex === 'squat' ? 'down' : 'strike') : 'idle',
        isInFrame: true, peakAcceleration: Math.max(mag, 4.5), avgAmplitude: d.quality, amplitudes: [...d.qualities],
        lastRepQuality: d.qualities.length > 0 ? Math.round(d.qualities[d.qualities.length - 1]) : 0,
        skeletonPose: { torsoTilt: ex === 'squat' ? Math.max(-1, Math.min(1, -y)) : Math.sin(t) * 0.15, kneeAngle: ex === 'squat' ? Math.max(0, -y * 1.5) : 0, armExtension: ex === 'punch' ? (mag > 1 ? 1 : 0) : 0, shoulderRotation: ex === 'punch' ? Math.min(1, x * 0.2) : 0, hipDrop: ex === 'squat' ? Math.max(0, -y * 1.2) : 0, intensity: mag > 0.5 ? 0.8 : 0.2 }
      });
    }, 50);
    return () => clearInterval(iv);
  }, [phase, exercise]);

  const stopSensors = () => { if (accelSubRef.current) { accelSubRef.current.remove(); accelSubRef.current = null; } if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } lastRepRef.current = 0; };

  const handleStop = async () => {
    stopSensors();
    const dur = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const reps = motionState?.reps || 0, qual = motionState?.quality || 50, peak = motionState?.peakAcceleration || 0, avg = motionState?.avgAmplitude || 0;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // ── AUTO-SNAPSHOT: FINISH shot ──
    if (Platform.OS === 'web' && !snapshotTakenRef.current.finish && videoElRef.current) {
      const base64 = captureSnapshot(videoElRef.current, 'FINISH');
      if (base64) {
        setSnapshots(prev => ({ ...prev, finish: base64 }));
        snapshotTakenRef.current.finish = true;
      }
    }

    // Training Session Mode: submit to /challenges/complete with template data
    if (isTrainingMode && token && params.trainingPushId) {
      const repEff = Math.min(1, reps / Math.max(trainingTargetReps, 1));
      const aiFeedbackScore = Math.round(qual * 0.6 + repEff * 100 * 0.4);
      try {
        const r = await api.completeTrainingSession({
          template_push_id: params.trainingPushId,
          reps_completed: reps,
          quality_score: qual,
          duration_seconds: dur,
          ai_feedback_score: aiFeedbackScore,
          performance_score: qual
        }, token);
        setScanResult({ ...r, training_mode: true, is_master_template: true, exercise_type: exercise, reps_completed: reps, quality_score: qual, ai_feedback_score: aiFeedbackScore, training_name: params.trainingName, snapshots });
        if (r.user) updateUser(r.user);
        // FLUX Rain — connected to real server value
        const realDrops = r.ak_drops_earned || r.ak_credits_earned || Math.max(Math.round(reps * 0.8), 5);
        setDropsEarned(realDrops); setShowDropsRain(true);
        setIsVictory(true);
        setTimeout(() => setShowDropsRain(false), 3000);
        if (r.coach_notified) playBioMatchPing(); else playAcceptPing();
      } catch (_) {
        setScanResult({ training_mode: true, is_master_template: true, exercise_type: exercise, reps_completed: reps, quality_score: qual, xp_earned: 0, snapshots });
        playAcceptPing();
      }
      setPhase('results');
      return;
    }

    // ═══ UGC CHALLENGE MODE: Submit to /ugc/{id}/complete with validation ═══
    if (isUGCMode && token && params.ugcChallengeId) {
      // Record the final exercise if not already recorded
      const currentEx = ugcExercises[ugcExerciseIndex];
      if (currentEx) {
        const previousExReps = ugcRepsPerExercise.current.reduce((sum, e) => sum + e.reps_done, 0);
        const currentExReps = Math.max(0, reps - previousExReps);
        ugcRepsPerExercise.current.push({
          name: currentEx.name,
          reps_done: currentExReps,
          quality: qual
        });
      }
      const totalTargetReps = ugcExercises.reduce((sum, e) => sum + (e.target_reps || 0), 0);
      const isMotionTracked = reps > 0 && qual > 0;
      try {
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
        const res = await fetch(`${backendUrl}/api/ugc/${params.ugcChallengeId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            exercises_completed: ugcRepsPerExercise.current,
            total_reps: reps,
            avg_quality: qual,
            duration_seconds: dur,
            motion_tracked: isMotionTracked
          })
        });
        const r = await res.json();
        setScanResult({
          ...r,
          ugc_mode: true,
          ugc_title: params.ugcTitle,
          ugc_template: params.ugcTemplateType,
          exercise_type: exercise,
          reps_completed: reps,
          quality_score: qual,
          xp_earned: r.flux_earned || 0,
          is_verified: r.is_verified,
          flux_earned: r.flux_earned,
          snapshots
        });
        if (r.user) updateUser(r.user);
        // FLUX Rain + Victory based on verification
        const ugcDrops = r.flux_earned || Math.max(Math.round(reps * 0.5), 3);
        setDropsEarned(ugcDrops); setShowDropsRain(true);
        setIsVictory(r.is_verified === true);
        setTimeout(() => setShowDropsRain(false), 3000);
        if (r.is_verified) playRecordBroken(); else playAcceptPing();
      } catch (_) {
        setScanResult({ ugc_mode: true, ugc_title: params.ugcTitle, exercise_type: exercise, reps_completed: reps, quality_score: qual, xp_earned: 0, snapshots });
        playAcceptPing();
      }
      // Reset UGC state
      setUgcExerciseIndex(0);
      setUgcExerciseReps(0);
      setUgcAllCompleted(false);
      ugcRepsPerExercise.current = [];
      setPhase('results');
      return;
    }

    // PvP Mode: submit to PvP endpoint instead of regular session
    if (pvpChallengeId && token) {
      try {
        const pvpResult = await api.submitPvPResult(pvpChallengeId, {
          reps, quality_score: qual, duration_seconds: dur, peak_acceleration: peak
        }, token);
        setScanResult({ ...pvpResult, pvp_mode: true, exercise_type: exercise, reps_completed: reps, quality_score: qual, xp_earned: pvpResult.xp_change || 0 });
        // FLUX Rain + Victory for PvP
        const pvpDrops = pvpResult.ak_drops_earned || pvpResult.ak_credits_earned || Math.max(Math.round(reps * 0.6), 3);
        setDropsEarned(pvpDrops); setShowDropsRain(true);
        setIsVictory((pvpResult.xp_change || 0) > 0);
        setTimeout(() => setShowDropsRain(false), 3000);
        playAcceptPing();
      } catch (_) {
        setScanResult({ pvp_mode: true, exercise_type: exercise, reps_completed: reps, quality_score: qual, xp_earned: 0 });
      }
      setPhase('results');
      return;
    }

    try {
      if (token && sessionId) {
        const r = await api.completeNexusSession(sessionId, { exercise_type: exercise, reps_completed: reps, quality_score: qual, duration_seconds: dur, peak_acceleration: peak, avg_amplitude: avg }, token);
        setScanResult(r); if (r.user) updateUser(r.user); if (r.records_broken?.length > 0) playRecordBroken(); else playAcceptPing();
        // FLUX Rain + Victory for regular Nexus
        const nexusDrops = r.ak_drops_earned || r.ak_credits_earned || Math.max(Math.round(reps * 0.5), 3);
        setDropsEarned(nexusDrops); setShowDropsRain(true);
        setIsVictory((r.xp_earned || 0) > 0);
        setTimeout(() => setShowDropsRain(false), 3000);
      } else {
        setScanResult({ exercise_type: exercise, reps_completed: reps, quality_score: qual, base_xp: reps * 5, quality_multiplier: 1 + (qual / 100) * 2, gold_bonus: qual >= 80 ? reps * 2 : 0, time_bonus: Math.min(Math.floor(dur / 10), 20), xp_earned: reps * 8 + 10, records_broken: [], level_up: false, new_level: user?.level || 1, dna: user?.dna });
        playAcceptPing();
      }
    } catch (_) {
      setScanResult({ reps_completed: reps, quality_score: qual, xp_earned: reps * 5, base_xp: reps * 5, quality_multiplier: 1, gold_bonus: 0, time_bonus: 0, records_broken: [], level_up: false, new_level: user?.level || 1 });
    }
    setPhase('results');
  };

  const handleResultClose = () => { setPhase('console'); setScanResult(null); setSessionId(null); setMotionState(null); setTimer(0); setMotionActive(false); setIsVictory(false); setDropsEarned(0); setSessionMode('scan'); };
  useEffect(() => () => { stopSensors(); }, []);
  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // ═══ PERFORMANCE RECORD — fire-and-forget snapshot enrichment ═══
  useEffect(() => {
    if (phase !== 'results' || !scanResult || !token) return;
    (async () => {
      try {
        const isCrew = !!scanResult.crew_id;
        let tipo = 'ALLENAMENTO';
        if (scanResult.training_mode) tipo = 'COACH_PROGRAM';
        else if (scanResult.ugc_mode) tipo = 'SFIDA_UGC';
        else if (scanResult.pvp_mode) tipo = 'DUELLO';
        else if (isCrew) tipo = 'CREW_BATTLE';

        const primaryValue = scanResult.reps_completed ?? scanResult.reps ?? 0;
        const qualScore = scanResult.quality_score ?? 0;

        await api.savePerformanceRecord({
          tipo,
          modalita: isCrew ? 'CREW' : 'INDIVIDUALE',
          crew_id: scanResult.crew_id,
          disciplina: user?.sport || 'Fitness',
          exercise_type: scanResult.exercise_type || exercise,
          snapshots: snapshots && (snapshots.start || snapshots.peak || snapshots.finish) ? snapshots : undefined,
          kpi: {
            primary_result: { type: primaryValue > 0 ? 'REPS' : 'PUNTEGGIO', value: primaryValue, unit: primaryValue > 0 ? 'rep' : '%' },
            quality_score: qualScore,
            rom_pct: scanResult.rom_pct,
            explosivity_pct: scanResult.explosivity_pct,
            power_output: scanResult.power_output,
            heart_rate_avg: scanResult.heart_rate_avg,
            heart_rate_peak: scanResult.heart_rate_peak
          },
          is_certified: !!scanResult.is_master_template,
          template_name: scanResult.training_name || scanResult.ugc_title,
          validation_status: scanResult.verification_status || (scanResult.is_verified ? 'AI_VERIFIED' : 'UNVERIFIED'),
          flux_earned: scanResult.flux_earned || scanResult.xp_earned || 0,
          duration_seconds: timer,
          extra_meta: geoRef.current ? {
            latitude: geoRef.current.latitude,
            longitude: geoRef.current.longitude,
            city_name: geoRef.current.city_name,
          } : undefined
        }, token);
      } catch (_) { /* silent — backend already has core record, this enriches with snapshots */ }
    })();
  }, [phase === 'results' && !!scanResult]);

  // ═══ PILLAR ACTION HANDLER ═══
  const handlePillarAction = (key: string) => {
    switch (key) {
      case 'sfida_hub':
        // Opens the Challenge Engine for UGC creation / community challenges
        setSessionMode('practice');
        setPhase('challenge_engine');
        break;
      case 'practice':
        setSessionMode('practice');
        setPhase('challenge_engine');
        break;
      case 'ranked':
        setSessionMode('ranked');
        setPhase('challenge_engine');
        break;
      case 'duel':
        router.push('/duel-search');
        break;
      case 'live':
        router.push('/live-events');
        break;
      case 'coach_hub':
        // Navigate to coach discovery / master templates
        router.push('/coach-connect');
        break;
      case 'scan_sync':
        // Open Universal QR Scanner from NÈXUS
        setScannerFromNexus(true);
        break;
      default:
        break;
    }
  };

  if (phase === 'console') {
    return (
      <View style={{ flex: 1 }}>
        <NexusConsole
          user={user}
          onScan={() => { setSessionMode('scan'); setPhase('bioscan'); }}
          onForge={() => { setSessionMode('scan'); setPhase('forge'); }}
          onPillarAction={handlePillarAction}
          deviceTier={deviceTier}
          eligibility={eligibility}
          myRank={myRank}
          myCrews={myCrews}
          onTemplateReq={(disc: string) => { setTemplateReqDiscipline(disc); setShowTemplateReq(true); }}
          onCategoryProposal={() => setShowCategoryProposal(true)}
          onFluxStore={() => setShowFluxStore(true)}
          cameraFacing={cameraFacing}
          setCameraFacing={setCameraFacing}
        />
        <TemplateRequestModal
          visible={showTemplateReq}
          onClose={() => setShowTemplateReq(false)}
          discipline={templateReqDiscipline}
        />
        <CategoryProposalModal
          visible={showCategoryProposal}
          onClose={() => setShowCategoryProposal(false)}
        />
        <FluxStoreModal
          visible={showFluxStore}
          onClose={() => setShowFluxStore(false)}
          userFlux={user?.ak_credits || 0}
          onPurchase={(res: any) => {
            if (res.user) {
              // Refresh user state would be done via AuthContext
            }
            setShowFluxStore(false);
          }}
        />
      </View>
    );
  }

  // ═══ CHALLENGE ENGINE PHASE ═══
  if (phase === 'challenge_engine') {
    return (
      <ChallengeEngine
        user={user}
        token={token}
        exerciseType={exercise}
        sessionMode={sessionMode === 'practice' ? 'personal' : sessionMode === 'ranked' ? 'ranked' : 'personal'}
        onBack={() => { setPhase('console'); setSessionMode('scan'); }}
        onAutoScan={(challengeId, tags, color) => {
          setChallengeContext({ id: challengeId, tags, color });
          setPhase('tilt_setup');
        }}
        onComplete={() => { setPhase('console'); setSessionMode('scan'); setChallengeContext(null); }}
      />
    );
  }

  // ═══ LIVE WAITING ROOM PHASE ═══
  if (phase === 'live_queue') {
    return <LiveWaitingRoom user={user} token={token} onBack={() => setPhase('console')} onMatchFound={(battleId) => {
      // Future: start a live 1v1 scanning session
      setPhase('forge');
    }} />;
  }

  // ═══ QR KORE CROSS-CHECK VALIDATION PHASE ═══
  if (phase === 'qr_validation' && qrContext) {
    return (
      <PostRaceValidation
        user={user}
        token={token}
        challengeId={qrContext.challengeId}
        declaredScore={qrContext.score}
        totalParticipants={qrContext.totalParticipants}
        challengeType={qrContext.challengeType}
        tags={qrContext.tags}
        onComplete={() => { setPhase('console'); setQrContext(null); }}
        onBack={() => { setPhase('console'); setQrContext(null); }}
      />
    );
  }

  if (phase === 'tilt_setup') {
    return (
      <TiltGuideOverlay
        lang="it"
        onReady={() => setPhase('body_lock')}
        onSkip={() => setPhase('body_lock')}
      />
    );
  }

  if (phase === 'body_lock') {
    return (
      <View style={main$.container}>
        <StatusBar barStyle="light-content" />
        {/* ═══ NATIVE CAMERA PREVIEW — Body Lock Phase (Lazy-loaded) ═══ */}
        <NativeCameraPreview facing={cameraFacing === 'user' ? 'front' : 'back'} />
        <View style={main$.cameraOverlay} />
        <CyberGrid intensity={0.3} />
        <BodyLockOverlay
          onBodyLocked={() => {
            bodyLockedRef.current = true;
            setBodyLockedUI(true);
            speakCoach("Pronto. Dì VIA per iniziare la sfida.", 'it-IT');
            // ═══ HARD-LOCK: NO auto-start. Countdown ONLY via voice "VIA" or manual tap ═══
          }}
          onGuidance={(msg: string) => {
            // TTS Coach guidance during calibration
            if (msg === 'feet') speakCoach("Spostati indietro. Inquadra i piedi.", 'it-IT');
            else if (msg === 'legs') speakCoach("Inquadra le gambe.", 'it-IT');
            else if (msg === 'torso') speakCoach("Inquadra il busto.", 'it-IT');
          }}
        />
        <ExitButton onExit={handleEmergencyExit} />

        {/* ═══ DUAL-CAM TOGGLE — Pre-Scan Camera Switch ═══ */}
        <View style={main$.preScanCamToggle}>
          <TouchableOpacity
            style={main$.dualCamBtn}
            onPress={() => setCameraFacing(prev => prev === 'user' ? 'environment' : 'user')}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-reverse" size={24} color="#00E5FF" />
            <Text style={main$.dualCamLabel}>
              {cameraFacing === 'user' ? 'FRONTALE' : 'POSTERIORE'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ═══ Voice prompt — 2-step: "PRONTO" → "VIA" ═══ */}
        {bodyLockedUI && !isProntoConfirmed && (
          <View style={main$.voicePrompt}>
            <TouchableOpacity
              style={[main$.voicePromptBox, { borderColor: 'rgba(255,165,0,0.35)', backgroundColor: 'rgba(255,165,0,0.08)' }]}
              onPress={() => { setIsProntoConfirmed(true); speakCoach("Pronto confermato. Dì VIA per partire.", 'it-IT'); }}
              activeOpacity={0.8}
            >
              <Ionicons name="mic" size={20} color="#FF9500" />
              <Text style={[main$.voicePromptText, { color: '#FF9500' }]}>DÌ "PRONTO" O TOCCA</Text>
            </TouchableOpacity>
          </View>
        )}
        {bodyLockedUI && isProntoConfirmed && (
          <View style={main$.voicePrompt}>
            <TouchableOpacity
              style={main$.voicePromptBox}
              onPress={() => setPhase('countdown')}
              activeOpacity={0.8}
            >
              <Ionicons name="mic" size={20} color="#00FF87" />
              <Text style={main$.voicePromptText}>DÌ "VIA" O TOCCA</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Voice indicator */}
        {isListening && (
          <View style={main$.voiceIndicator}>
            <Ionicons name="mic" size={14} color="#00FFFF" />
            <Text style={main$.voiceText}>VOCE ATTIVA</Text>
          </View>
        )}
      </View>
    );
  }

  if (phase === 'forge') {
    return (
      <View style={main$.container}>
        <CyberGrid intensity={0.2} />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center' }}>
          <ChallengeForge onSelect={handleForgeSelect} user={user} />
          <TouchableOpacity onPress={() => setPhase('console')} style={main$.cancelWrap}><Text style={main$.cancelText}>{'\u2190'} TORNA AL NEXUS</Text></TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // Scanning / Countdown / BioScan / Results
  const skeleton: SkeletonPose = motionState?.skeletonPose || { torsoTilt: 0, kneeAngle: 0, armExtension: 0, shoulderRotation: 0, hipDrop: 0, intensity: 0.15 };

  // ═══ NATIVE CAMERA FACING MAPPING ═══
  const nativeCamFacing = cameraFacing === 'user' ? 'front' as const : 'back' as const;
  const showNativeCamera = ['scanning', 'countdown', 'stabilizing'].includes(phase);

  return (
    <View style={main$.container}>
      <StatusBar barStyle="light-content" />
      {/* ═══ EXIT BUTTON — Always accessible during scan phases ═══ */}
      <ExitButton onExit={handleEmergencyExit} />
      {/* ═══ NATIVE CAMERA PREVIEW — Scanning/Countdown/Stabilizing (Lazy-loaded) ═══ */}
      {showNativeCamera && (
        <NativeCameraPreview facing={nativeCamFacing} />
      )}
      {/* SPRINT 5: Camera-transparent dark overlay at 0.3 opacity */}
      <View style={main$.cameraOverlay} />
      {/* ⌚ Live BPM Telemetry — Shows during active scan phases */}
      {(phase === 'scanning' || phase === 'countdown' || phase === 'body_lock') && (
        <View style={main$.bpmOverlay}>
          <LiveBPMWidget bpm={liveBpm} source="watch" />
        </View>
      )}
      <CyberGrid intensity={motionActive ? 0.5 : 0.2} scanning={phase === 'scanning' || phase === 'stabilizing'} />
      <DigitalShadow pose={skeleton} exercise={exercise} goldFlash={goldFlash} motionActive={motionActive} deviceTier={deviceTier} />
      <ScanLine active={phase === 'scanning'} />
      {phase === 'scanning' && <MiniDNARadar dna={user?.dna} explosive={motionActive} />}
      {/* Ghost Shadow during PvP (positional silhouette) */}
      {phase === 'scanning' && pvpChallenge?.ghost && (
        <GhostShadow
          isAhead={(motionState?.reps || 0) > pvpChallenge.ghost.reps}
          currentReps={motionState?.reps || 0}
          ghostReps={pvpChallenge.ghost.reps}
        />
      )}
      {/* PvP HUD: numeric ghost comparison */}
      {phase === 'scanning' && pvpChallenge?.ghost && (
        <GhostSessionHUD
          ghost={pvpChallenge.ghost}
          currentReps={motionState?.reps || 0}
          currentQuality={motionState?.quality || 0}
          exercise={exercise}
        />
      )}
      {/* Training Session Bio-Feedback HUD */}
      {phase === 'scanning' && isTrainingMode && (
        <BioFeedbackHUD state={{
          currentReps: motionState?.reps || 0,
          currentQuality: motionState?.quality || 0,
          elapsedSeconds: timer,
          targetReps: trainingTargetReps,
          targetTime: trainingTargetTime,
          dnaPotential,
          isActive: true,
          isMasterTemplate: true,
          exerciseName: params.trainingExercise || params.trainingName || ''
        }} />
      )}

      {/* ═══ UGC CHALLENGE DYNAMIC HUD — Exercise-by-exercise tracking ═══ */}
      {phase === 'scanning' && isUGCMode && ugcExercises.length > 0 && (
        <UGCWorkoutHUD
          exercises={ugcExercises}
          currentExerciseIndex={ugcExerciseIndex}
          currentReps={ugcExerciseReps}
          currentQuality={motionState?.quality || 0}
          elapsedSeconds={timer}
          challengeTitle={params.ugcTitle || 'UGC CHALLENGE'}
          templateType={params.ugcTemplateType || 'CUSTOM'}
          isActive={true}
          isVerified={(motionState?.reps || 0) > 0 && (motionState?.quality || 0) >= (params.ugcIsMaster === 'true' ? 80 : 50)}
          isMasterTemplate={params.ugcIsMaster === 'true'}
          creatorRole={params.ugcCreatorRole || 'ATHLETE'}
        />
      )}

      {/* SPRINT NEXUS: EFFICIENCY GHOST HUD — DNA-Relative Live Ratio */}
      {phase === 'scanning' && (
        <EfficiencyGhostHUD
          currentQuality={motionState?.quality || 0}
          dnaBaseline={dnaBaseline}
          isActive={true}
        />
      )}

      {/* PUPPET-MOTION-DECK: SMOOTH VALIDATION */}
      {phase === 'stabilizing' && (
        <SmoothedValidation exercise={exercise} onComplete={handleStabilizingComplete} />
      )}
      {phase === 'bioscan' && <BioScanTrigger user={user} onCancel={handleEmergencyExit} onComplete={async () => {
        setPhase('forge');
        // SPRINT 7: Record bioscan snapshot + check PRO unlock
        if (token) {
          const prevPro = user?.pro_unlocked;
          try {
            const result = await api.completeBioscan(token);
            if (result.user) updateUser(result.user);
            if (result.pro_newly_unlocked || (result.pro_unlocked && !prevPro)) {
              setBioscanResult(result);
              setShowProUnlock(true);
            }
            // Refresh eligibility
            const elig = await api.getRescanEligibility(token);
            setEligibility(elig);
          } catch (_) { /* silenced — user goes to forge regardless */ }
        }
      }} />}
      {/* ── CINEMATIC BATTLE INTRO (replaces plain countdown) ── */}
      {phase === 'countdown' && (
        <BattleIntroOverlay
          user={user}
          pvpChallenge={pvpChallengeId ? pvpChallenge : undefined}
          onComplete={handleCountdownDone}
        />
      )}

      {/* SPRINT 5: Military/Tech HUD — Corner Layout */}
      {phase === 'scanning' && (
        <SafeAreaView style={hud$.container}>
          <View nativeID="nexus-cam" />

          {/* TOP-LEFT: Timer */}
          <View style={hud$.topLeft}>
            <Text style={hud$.cornerLabel}>ELAPSED</Text>
            <Text style={hud$.timerVal}>{fmt(timer)}</Text>
            <View style={hud$.timerBar}>
              <View style={[hud$.timerBarFill, { width: `${Math.min(100, (timer / 120) * 100)}%` as any }]} />
            </View>
          </View>

          {/* TOP-RIGHT: Exercise & Mode */}
          <View style={hud$.topRight}>
            <Text style={hud$.cornerLabel}>PROTOCOL</Text>
            <Text style={hud$.exerciseVal}>{exercise === 'squat' ? 'DEEP SQUAT' : 'EXPLOSIVE PUNCH'}</Text>
            <View style={hud$.modeBadge}>
              <Ionicons name={forgeMode === 'personal' ? 'analytics' : forgeMode === 'battle' ? 'trophy' : 'flash'} size={10} color="#FFD700" />
              <Text style={hud$.modeText}>{forgeMode.toUpperCase()}</Text>
            </View>
          </View>

          {/* CENTER: Last Rep Feedback */}
          <View style={hud$.centerFeedback}>
            {motionState?.lastRepQuality ? (
              <Animated.View entering={FadeInDown.duration(200)} key={motionState.reps} style={hud$.repFeedback}>
                <View style={[hud$.repFeedbackDot, motionState.lastRepQuality >= 80 && { backgroundColor: '#FFD700' }]} />
                <Text style={[hud$.repFeedbackText, motionState.lastRepQuality >= 80 && { color: '#FFD700' }]}>
                  REP #{motionState.reps} {'\u2014'} Q{motionState.lastRepQuality}
                </Text>
              </Animated.View>
            ) : (
              <View style={hud$.phaseIndicator}>
                <View style={[hud$.phaseDot, motionActive && { backgroundColor: '#00E5FF' }]} />
                <Text style={[hud$.phaseText, motionActive && { color: '#00E5FF' }]}>
                  {motionActive ? 'TRACKING ACTIVE' : 'AWAITING MOTION'}
                </Text>
              </View>
            )}
          </View>

          {/* BOTTOM-LEFT: Reps Counter */}
          <View style={hud$.bottomLeft}>
            <Text style={hud$.cornerLabel}>REPS</Text>
            <Text style={hud$.repsVal}>{motionState?.reps || 0}</Text>
            <Text style={hud$.repsUnit}>COMPLETED</Text>
          </View>

          {/* BOTTOM-RIGHT: Quality Score */}
          <View style={hud$.bottomRight}>
            <Text style={hud$.cornerLabel}>QUALITY</Text>
            <Text style={[hud$.qualityVal, (motionState?.quality || 0) >= 80 && { color: '#FFD700' }]}>{motionState?.quality || 0}</Text>
            <Text style={hud$.qualityUnit}>AVG SCORE</Text>
          </View>

          {/* BOTTOM-CENTER: Cam Toggle + Stop Button */}
          <View style={hud$.stopWrap}>
            {/* DUAL-CAM TOGGLE */}
            <TouchableOpacity
              style={hud$.camToggle}
              onPress={() => setCameraFacing(prev => prev === 'user' ? 'environment' : 'user')}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-reverse" size={22} color="#00E5FF" />
              <Text style={hud$.camToggleText}>
                {cameraFacing === 'user' ? 'FRONT' : 'REAR'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={hud$.stopBtn} onPress={handleStop} activeOpacity={0.85}>
              <View style={hud$.stopDot} />
              <Text style={hud$.stopText}>STOP SESSION</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* ── DOPAMINE LAYER: FLUX Rain + Victory ── */}
      <AKDropsRain drops={dropsEarned} visible={showDropsRain} />
      <VictoryOverlay
        visible={phase === 'results' && isVictory}
        xpChange={scanResult?.xp_change}
      />

      <CinemaResults visible={phase === 'results'} result={scanResult} user={user} onClose={handleResultClose} />
      <ProUnlockModal
        visible={showProUnlock}
        onClose={() => setShowProUnlock(false)}
        avgDna={bioscanResult?.avg_dna}
      />
      <BurgerMenu visible={showMenu} onClose={() => setShowMenu(false)} user={user} onLogout={logout} deviceTier={deviceTier} activeRole={activeRole} onRoleSwitch={setActiveRole} />

      {/* ═══ SCAN & SYNC — Universal QR Scanner from NÈXUS ═══ */}
      <QRScannerModal
        visible={scannerFromNexus}
        onClose={() => setScannerFromNexus(false)}
        onUserFound={() => {}}
        onChallengeFound={(challengeData: any) => {
          setScannerFromNexus(false);
          setNexusChallengePreview(challengeData);
        }}
      />
      <ChallengePreviewModal
        visible={!!nexusChallengePreview}
        challengeData={nexusChallengePreview}
        onClose={() => setNexusChallengePreview(null)}
        onImported={() => { setNexusChallengePreview(null); }}
      />
      <TemplateRequestModal
        visible={showTemplateReq}
        onClose={() => setShowTemplateReq(false)}
        discipline={templateReqDiscipline}
      />
      <CategoryProposalModal
        visible={showCategoryProposal}
        onClose={() => setShowCategoryProposal(false)}
      />
    </View>
  );
}

const main$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,5,0.3)',
    zIndex: 1
  },
  cancelWrap: { alignItems: 'center', marginTop: 20 },
  cancelText: { color: '#555', fontSize: 17, fontWeight: '700', letterSpacing: 1 },
  // ⌚ BPM overlay — top-right during scanning
  bpmOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    right: 16,
    zIndex: 999
  },
  // Voice-Command indicator (bottom-left during body_lock / scanning)
  voiceIndicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 56 : 24,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 999
  },
  voiceText: {
    color: '#00FFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2
  },
  // "Dì VIA" prompt after body lock
  voicePrompt: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 72,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999
  },
  voicePromptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,255,135,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,255,135,0.35)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  voicePromptText: {
    color: '#00FF87',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3
  },
  // ═══ PRE-SCAN DUAL-CAM TOGGLE ═══
  preScanCamToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 16,
    zIndex: 999
  },
  dualCamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,229,255,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,229,255,0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  dualCamLabel: {
    color: '#00E5FF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2
  }
});

// SPRINT 5: Military/Tech Corner HUD
const hud$ = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20
  },
  // TOP-LEFT: Timer
  topLeft: {
    position: 'absolute', top: 56, left: 14,
    gap: 3
  },
  cornerLabel: {
    color: '#00E5FF22', fontSize: 13, fontWeight: '900',
    letterSpacing: 3
  },
  timerVal: {
    color: '#00E5FF', fontSize: 28, fontWeight: '900',
    fontVariant: ['tabular-nums'], letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  timerBar: {
    width: 80, height: 2, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1, overflow: 'hidden'
  },
  timerBarFill: {
    height: '100%', backgroundColor: '#00E5FF', borderRadius: 1
  },
  // TOP-RIGHT: Exercise & Mode
  topRight: {
    position: 'absolute', top: 56, right: 14,
    alignItems: 'flex-end', gap: 3
  },
  exerciseVal: {
    color: '#FFFFFF', fontSize: 17, fontWeight: '900',
    letterSpacing: 2
  },
  modeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)'
  },
  modeText: {
    color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 1.5
  },
  // CENTER: Rep Feedback
  centerFeedback: {
    position: 'absolute', top: 380, left: 0, right: 0,
    alignItems: 'center'
  },
  repFeedback: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8,
    paddingHorizontal: 24, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  repFeedbackDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#00E5FF'
  },
  repFeedbackText: {
    color: '#00E5FF', fontSize: 17, fontWeight: '800', letterSpacing: 2
  },
  phaseIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 6
  },
  phaseDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  phaseText: {
    color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '800', letterSpacing: 2
  },
  // BOTTOM-LEFT: Reps
  bottomLeft: {
    position: 'absolute', bottom: 160, left: 14,
    gap: 2
  },
  repsVal: {
    color: '#00E5FF', fontSize: 48, fontWeight: '900',
    fontVariant: ['tabular-nums'], letterSpacing: 1,
    lineHeight: 50
  },
  repsUnit: {
    color: '#00E5FF22', fontSize: 12, fontWeight: '900', letterSpacing: 2
  },
  // BOTTOM-RIGHT: Quality
  bottomRight: {
    position: 'absolute', bottom: 160, right: 14,
    alignItems: 'flex-end', gap: 2
  },
  qualityVal: {
    color: '#00E5FF', fontSize: 48, fontWeight: '900',
    fontVariant: ['tabular-nums'], letterSpacing: 1,
    lineHeight: 50
  },
  qualityUnit: {
    color: '#00E5FF22', fontSize: 12, fontWeight: '900', letterSpacing: 2
  },
  // BOTTOM: Stop Button
  stopWrap: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    flexDirection: 'row', gap: 10, alignItems: 'center'
  },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(255,59,48,0.12)', borderRadius: 14, paddingVertical: 18, flex: 1,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.35)'
  },
  camToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,229,255,0.10)', paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(0,229,255,0.30)'
  },
  camToggleText: {
    color: '#00E5FF', fontSize: 11, fontWeight: '900', letterSpacing: 2
  },
  stopDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30'
  },
  stopText: {
    color: '#FF3B30', fontSize: 19, fontWeight: '900', letterSpacing: 3
  }
});
const crewMsg$ = StyleSheet.create({
  container: { marginHorizontal: 20, marginBottom: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  text: { color: '#AAAAAA', fontSize: 15, fontWeight: '400', textAlign: 'center', lineHeight: 20 },
  cta: { color: '#00E5FF', fontWeight: '700' }
});
