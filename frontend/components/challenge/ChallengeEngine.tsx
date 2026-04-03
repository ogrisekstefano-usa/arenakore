/**
 * ARENAKORE — CHALLENGE ENGINE v2.0
 * Tag Selection → Validation Mode → Manual Entry / Auto / Sensor → Sanity Check → THE VERDICT
 * "Trust Engine" — Biometric Sanity + Verification Badges + Integrity Glow
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  Dimensions, Platform, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, withRepeat, withSequence, withTiming, withSpring, withDelay,
  useAnimatedStyle, FadeIn, FadeInDown, FadeInUp, Easing, interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Polygon, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { api } from '../../utils/api';
import { FluxIcon } from '../FluxIcon';
import { EL, FONT_MONT, FONT_JAKARTA } from '../../utils/eliteTheme';
import { DataOriginLine } from './DataOriginBadge';

const { width: SW } = Dimensions.get('window');

// ═══ TAG DEFINITIONS ═══
type ChallengeTag = 'POWER' | 'FLOW' | 'PULSE';
type ValidationMode = 'AUTO_COUNT' | 'MANUAL_ENTRY' | 'SENSOR_IMPORT';
type ProofType = 'NONE' | 'VIDEO_TIME_CHECK' | 'GPS_IMPORT' | 'PEER_CONFIRMATION';
type VerificationStatus = 'UNVERIFIED' | 'AI_VERIFIED' | 'PROOF_PENDING' | 'SUSPICIOUS' | 'TECH_VERIFIED';

const TAG_CONFIG: Record<ChallengeTag, { color: string; icon: string; label: string; desc: string }> = {
  POWER: { color: '#FF3B30', icon: 'flame', label: 'POWER', desc: 'Forza · Potenza · Esplosività' },
  FLOW:  { color: '#34C759', icon: 'leaf',  label: 'FLOW',  desc: 'Agilità · Tecnica · Fluidità' },
  PULSE: { color: '#007AFF', icon: 'pulse', label: 'PULSE', desc: 'Velocità · Resistenza · Cardio' },
};

const MODE_CONFIG: Record<ValidationMode, { icon: string; title: string; sub: string; badge: string }> = {
  AUTO_COUNT:    { icon: 'scan',          title: 'NÈXUS VISION',     sub: 'Conteggio rep automatico via camera',      badge: '100% FLUX' },
  MANUAL_ENTRY:  { icon: 'create-outline', title: 'MANUAL ENTRY',    sub: 'Inserisci dati post-allenamento',           badge: '50% FLUX' },
  SENSOR_IMPORT: { icon: 'watch-outline',  title: 'SENSOR IMPORT',   sub: 'Importa da Apple Health / Garmin',          badge: '75% FLUX' },
};

const PROOF_OPTIONS: { type: ProofType; icon: string; title: string; sub: string; fluxBoost: string }[] = [
  { type: 'VIDEO_TIME_CHECK', icon: 'videocam', title: 'PROVA VIDEO', sub: 'Registra o carica un video della performance', fluxBoost: '→ 75% FLUX' },
  { type: 'GPS_IMPORT', icon: 'navigate', title: 'GPS IMPORT', sub: 'Importa traccia GPS da Strava / Garmin', fluxBoost: '→ 100% FLUX' },
  { type: 'PEER_CONFIRMATION', icon: 'people', title: 'CONFERMA PEER', sub: 'Un compagno di Crew certifica il tuo risultato', fluxBoost: '→ 75% FLUX' },
];

const VERIFICATION_BADGE_CONFIG: Record<VerificationStatus, { color: string; icon: string; label: string }> = {
  UNVERIFIED:    { color: '#8E8E93', icon: 'shield-outline',    label: 'UNVERIFIED' },
  AI_VERIFIED:   { color: EL.CYAN,   icon: 'shield-checkmark',  label: 'AI VERIFIED' },
  PROOF_PENDING: { color: '#FFD700', icon: 'shield-half',       label: 'PROOF PENDING' },
  SUSPICIOUS:    { color: '#FF9500', icon: 'warning',           label: 'REVISIONE RICHIESTA' },
  TECH_VERIFIED: { color: '#007AFF', icon: 'hardware-chip',     label: 'TECH VERIFIED' },
};

// ═══ MAIN ENGINE PHASES ═══
type EnginePhase = 'tags' | 'validation' | 'manual_entry' | 'sensor_mock' | 'sanity_warning' | 'submitting' | 'verdict';

interface ChallengeEngineProps {
  user: any;
  token: string | null;
  exerciseType?: string;
  sessionMode?: string;
  coachTemplate?: {
    id: string;
    tags: ChallengeTag[];
    validation_mode: ValidationMode;
    exercise: string;
    target_reps?: number;
  } | null;
  onBack: () => void;
  onAutoScan: (challengeId: string, tags: string[], dominantColor: string) => void;
  onComplete: () => void;
}

export function ChallengeEngine({ user, token, exerciseType = 'squat', sessionMode = 'personal', coachTemplate = null, onBack, onAutoScan, onComplete }: ChallengeEngineProps) {
  const [phase, setPhase] = useState<EnginePhase>('tags');
  const [selectedTags, setSelectedTags] = useState<ChallengeTag[]>([]);
  const [validationMode, setValidationMode] = useState<ValidationMode | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<any>(null);

  // Manual entry fields
  const [manualReps, setManualReps] = useState('');
  const [manualSeconds, setManualSeconds] = useState('');
  const [manualKg, setManualKg] = useState('');
  const [hasVideoProof, setHasVideoProof] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trust Engine state
  const [sanityResult, setSanityResult] = useState<any>(null);
  const [selectedProofType, setSelectedProofType] = useState<ProofType>('NONE');
  const [isSanityChecking, setIsSanityChecking] = useState(false);

  // ═══ TEMPLATE AUTHORITY ═══
  // If a coach template exists, auto-inherit tags + validation mode and skip all menus
  useEffect(() => {
    if (!coachTemplate) return;
    // Inherit template settings
    setSelectedTags(coachTemplate.tags || ['POWER']);
    setValidationMode(coachTemplate.validation_mode || 'AUTO_COUNT');
    
    // If template requires NEXUS VISION → skip ALL menus, go straight to camera
    if (coachTemplate.validation_mode === 'AUTO_COUNT') {
      // Auto-trigger NEXUS scan with inherited template data
      const dominantColor = TAG_CONFIG[coachTemplate.tags?.[0] || 'POWER']?.color || '#FF3B30';
      setTimeout(() => {
        onAutoScan(coachTemplate.id, coachTemplate.tags || ['POWER'], dominantColor);
      }, 300);
    } else {
      // For MANUAL or SENSOR modes, skip to the appropriate entry phase
      if (coachTemplate.validation_mode === 'MANUAL_ENTRY') {
        setPhase('manual_entry');
      } else if (coachTemplate.validation_mode === 'SENSOR_IMPORT') {
        setPhase('sensor_mock');
      }
    }
  }, [coachTemplate]);

  // Dominant color for immersive theming
  const dominantTag = selectedTags[0] || 'PULSE';
  const dominantColor = TAG_CONFIG[dominantTag]?.color || '#00E5FF';

  // Animations
  const bgPulse = useSharedValue(0.03);

  useEffect(() => {
    bgPulse.value = withRepeat(withSequence(
      withTiming(0.08, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.03, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
    ), -1, false);
  }, []);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgPulse.value,
  }));

  // Background wrapper — OLED Black with animated colored overlay
  const DarkBase = ({ children }: { children: React.ReactNode }) => (
    <View style={s.container}>
      <Animated.View style={[s.colorOverlay, {
        backgroundColor: dominantTag === 'POWER' ? '#FF3B30' : dominantTag === 'FLOW' ? '#00FF87' : '#00E5FF',
      }, bgStyle]} />
      {children}
    </View>
  );

  // ═══ TAG SELECTION ═══
  const toggleTag = (tag: ChallengeTag) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedTags(prev => {
      if (prev.includes(tag)) return prev.filter(t => t !== tag);
      if (prev.length >= 3) return prev;
      return [...prev, tag];
    });
  };

  const handleTagConfirm = () => {
    if (selectedTags.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPhase('validation');
  };

  // ═══ VALIDATION MODE SELECTION ═══
  const handleModeSelect = async (mode: ValidationMode) => {
    if (!token) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setValidationMode(mode);

    try {
      const res = await api.createChallenge({
        title: `${selectedTags.join(' · ')} ${exerciseType.toUpperCase()}`,
        exercise_type: exerciseType,
        tags: selectedTags,
        validation_mode: mode,
        mode: sessionMode,
      }, token);
      setChallengeId(res.challenge_id);

      if (mode === 'AUTO_COUNT') {
        onAutoScan(res.challenge_id, selectedTags, dominantColor);
      } else if (mode === 'MANUAL_ENTRY') {
        setPhase('manual_entry');
      } else if (mode === 'SENSOR_IMPORT') {
        setPhase('sensor_mock');
      }
    } catch (err) {
      console.error('Challenge create failed:', err);
    }
  };

  // ═══ PRE-FLIGHT SANITY CHECK ═══
  const handlePreFlightCheck = useCallback(async () => {
    if (!token) return;
    setIsSanityChecking(true);
    try {
      const result = await api.sanityCheck({
        exercise_type: exerciseType,
        reps: parseInt(manualReps) || 0,
        seconds: parseFloat(manualSeconds) || 0,
        kg: parseFloat(manualKg) || 0,
      }, token);
      setSanityResult(result);

      if (result.requires_video) {
        // Show motivational warning
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        setPhase('sanity_warning');
      } else {
        // Sanity passed — submit directly
        doManualSubmit('NONE', false);
      }
    } catch (err) {
      console.error('Sanity check failed, submitting anyway:', err);
      doManualSubmit('NONE', false);
    } finally {
      setIsSanityChecking(false);
    }
  }, [token, exerciseType, manualReps, manualSeconds, manualKg]);

  // ═══ SUBMIT MANUAL ENTRY ═══
  const doManualSubmit = async (proofType: ProofType = 'NONE', withVideo: boolean = false) => {
    if (!token || !challengeId) return;
    setIsSubmitting(true);
    setPhase('submitting');

    try {
      const res = await api.completeChallenge({
        challenge_id: challengeId,
        validation_mode: 'MANUAL_ENTRY',
        reps: parseInt(manualReps) || 0,
        seconds: parseFloat(manualSeconds) || 0,
        kg: parseFloat(manualKg) || 0,
        quality_score: 75,
        has_video_proof: withVideo || hasVideoProof,
        proof_type: proofType,
      }, token);
      setVerdict(res.verdict);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => setPhase('verdict'), 600);
    } catch (err) {
      console.error('Challenge complete failed:', err);
      setPhase('manual_entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ═══ SUBMIT SENSOR IMPORT (Mock) ═══
  const handleSensorSubmit = async () => {
    if (!token || !challengeId) return;
    setIsSubmitting(true);
    setPhase('submitting');

    try {
      const res = await api.completeChallenge({
        challenge_id: challengeId,
        validation_mode: 'SENSOR_IMPORT',
        reps: 18,
        seconds: 45,
        kg: 0,
        quality_score: 82,
        has_video_proof: false,
      }, token);
      setVerdict(res.verdict);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => setPhase('verdict'), 600);
    } catch (err) {
      console.error('Challenge complete failed:', err);
      setPhase('sensor_mock');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════
  // RENDER PHASES
  // ═══════════════════════════════════════════

  // PHASE 1: TAG SELECTION
  if (phase === 'tags') {
    return (
      <DarkBase>
        <SafeAreaView style={s.safe}>
          <Animated.View entering={FadeIn.duration(400)} style={s.content}>
            <View style={s.phaseHeader}>
              <Text style={[s.phaseLabel, { color: dominantColor }]}>01 / 03</Text>
              <Text style={s.phaseTitle}>SCEGLI IL MOOD</Text>
              <Text style={s.phaseSub}>Ogni Kore definisce l'identità della sfida</Text>
            </View>

            <View style={s.tagsGrid}>
              {(Object.keys(TAG_CONFIG) as ChallengeTag[]).map(tag => {
                const cfg = TAG_CONFIG[tag];
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      s.tagCard,
                      isSelected && { borderColor: cfg.color, backgroundColor: cfg.color + '12' },
                    ]}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.tagIconWrap, { backgroundColor: cfg.color + (isSelected ? '20' : '08') }]}>
                      <Ionicons name={cfg.icon as any} size={28} color={isSelected ? cfg.color : '#555'} />
                    </View>
                    <Text style={[s.tagLabel, isSelected && { color: cfg.color }]}>{cfg.label}</Text>
                    <Text style={s.tagDesc}>{cfg.desc}</Text>
                    {isSelected && (
                      <View style={[s.tagCheck, { backgroundColor: cfg.color }]}>
                        <Ionicons name="checkmark" size={14} color="#000" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: selectedTags.length > 0 ? dominantColor : '#333', opacity: selectedTags.length > 0 ? 1 : 0.4 }]}
              onPress={handleTagConfirm}
              disabled={selectedTags.length === 0}
              activeOpacity={0.85}
            >
              <Text style={s.primaryBtnText}>CONFERMA TAG</Text>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity onPress={onBack} style={s.backBtn}>
              <Ionicons name="arrow-back" size={14} color="#555" />
              <Text style={s.backText}>TORNA AL NEXUS</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </DarkBase>
    );
  }

  // PHASE 2: VALIDATION MODE
  if (phase === 'validation') {
    return (
      <DarkBase>
        <SafeAreaView style={s.safe}>
          <Animated.View entering={FadeIn.duration(400)} style={s.content}>
            <View style={s.phaseHeader}>
              <Text style={[s.phaseLabel, { color: dominantColor }]}>02 / 03</Text>
              <Text style={s.phaseTitle}>VALIDAZIONE</Text>
              <Text style={s.phaseSub}>Come vuoi certificare i tuoi risultati?</Text>
            </View>

            <View style={s.tagsRow}>
              {selectedTags.map(tag => (
                <View key={tag} style={[s.tagPill, { borderColor: TAG_CONFIG[tag].color }]}>
                  <Ionicons name={TAG_CONFIG[tag].icon as any} size={12} color={TAG_CONFIG[tag].color} />
                  <Text style={[s.tagPillText, { color: TAG_CONFIG[tag].color }]}>{tag}</Text>
                </View>
              ))}
            </View>

            <View style={s.modesCol}>
              {(Object.keys(MODE_CONFIG) as ValidationMode[]).map(mode => {
                const cfg = MODE_CONFIG[mode];
                const isAuto = mode === 'AUTO_COUNT';
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[s.modeCard, isAuto && { borderColor: dominantColor }]}
                    onPress={() => handleModeSelect(mode)}
                    activeOpacity={0.82}
                  >
                    <View style={[s.modeIconWrap, { backgroundColor: (isAuto ? dominantColor : '#555') + '15' }]}>
                      <Ionicons name={cfg.icon as any} size={24} color={isAuto ? dominantColor : '#888'} />
                    </View>
                    <View style={s.modeContent}>
                      <Text style={[s.modeTitle, isAuto && { color: dominantColor }]}>{cfg.title}</Text>
                      <Text style={s.modeSub}>{cfg.sub}</Text>
                    </View>
                    <View style={[s.modeBadge, { borderColor: isAuto ? dominantColor : '#444' }]}>
                      <Text style={[s.modeBadgeText, { color: isAuto ? dominantColor : '#888' }]}>{cfg.badge}</Text>
                    </View>
                    {isAuto && <View style={[s.recommended, { backgroundColor: dominantColor }]}>
                      <Text style={s.recommendedText}>CONSIGLIATO</Text>
                    </View>}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity onPress={() => setPhase('tags')} style={s.backBtn}>
              <Ionicons name="arrow-back" size={14} color="#555" />
              <Text style={s.backText}>INDIETRO</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </DarkBase>
    );
  }

  // PHASE 3B: MANUAL ENTRY
  if (phase === 'manual_entry') {
    return (
      <DarkBase>
        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
              <Animated.View entering={FadeIn.duration(400)}>
                <View style={s.phaseHeader}>
                  <Text style={[s.phaseLabel, { color: dominantColor }]}>03 / 03</Text>
                  <Text style={s.phaseTitle}>INSERISCI DATI</Text>
                </View>

                {/* Anti-Cheat Disclaimer */}
                <View style={[s.disclaimer, { borderColor: '#FFD700' }]}>
                  <Ionicons name="warning" size={18} color="#FFD700" />
                  <View style={s.disclaimerContent}>
                    <Text style={s.disclaimerTitle}>ATTENZIONE — VALIDAZIONE LIMITATA</Text>
                    <Text style={s.disclaimerText}>
                      I risultati manuali senza prova video non concorrono alle Classifiche Pro (Ranked).
                    </Text>
                    <Text style={[s.disclaimerCta, { color: dominantColor }]}>
                      Passa alla validazione NÈXUS per il 100% dei FLUX e il Rank ufficiale.
                    </Text>
                  </View>
                </View>

                {/* Input Fields */}
                <View style={s.inputGroup}>
                  <View style={s.inputRow}>
                    <View style={s.inputWrap}>
                      <Text style={s.inputLabel}>RIPETIZIONI</Text>
                      <TextInput
                        style={[s.input, { borderColor: dominantColor + '44' }]}
                        value={manualReps}
                        onChangeText={setManualReps}
                        placeholder="0"
                        placeholderTextColor="#333"
                        keyboardType="numeric"
                        maxLength={4}
                      />
                      <Text style={s.inputUnit}>REP</Text>
                    </View>
                    <View style={s.inputWrap}>
                      <Text style={s.inputLabel}>TEMPO</Text>
                      <TextInput
                        style={[s.input, { borderColor: dominantColor + '44' }]}
                        value={manualSeconds}
                        onChangeText={setManualSeconds}
                        placeholder="0"
                        placeholderTextColor="#333"
                        keyboardType="numeric"
                        maxLength={5}
                      />
                      <Text style={s.inputUnit}>SEC</Text>
                    </View>
                  </View>
                  <View style={s.inputRow}>
                    <View style={s.inputWrap}>
                      <Text style={s.inputLabel}>PESO</Text>
                      <TextInput
                        style={[s.input, { borderColor: dominantColor + '44' }]}
                        value={manualKg}
                        onChangeText={setManualKg}
                        placeholder="0"
                        placeholderTextColor="#333"
                        keyboardType="decimal-pad"
                        maxLength={5}
                      />
                      <Text style={s.inputUnit}>KG</Text>
                    </View>
                    <TouchableOpacity
                      style={[s.proofBtn, hasVideoProof && { borderColor: dominantColor, backgroundColor: dominantColor + '12' }]}
                      onPress={() => { setHasVideoProof(!hasVideoProof); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={hasVideoProof ? 'videocam' : 'videocam-outline'} size={22} color={hasVideoProof ? dominantColor : '#555'} />
                      <Text style={[s.proofText, hasVideoProof && { color: dominantColor }]}>
                        {hasVideoProof ? 'PROVA VIDEO' : 'UPLOAD PROOF'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* FLUX Preview */}
                <View style={[s.fluxPreview, { borderColor: dominantColor + '33' }]}>
                  <Text style={s.fluxPreviewLabel}>FLUX STIMATI</Text>
                  <View style={s.fluxCalcRow}>
                    <Text style={[s.fluxBase, { textDecorationLine: 'line-through', color: '#555' }]}>
                      {Math.max(10, (parseInt(manualReps) || 0) * 2 + 7 + Math.floor((parseFloat(manualKg) || 0) / 5))}
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color={dominantColor} />
                    <Text style={[s.fluxFinal, { color: dominantColor }]}>
                      {Math.floor(Math.max(10, (parseInt(manualReps) || 0) * 2 + 7 + Math.floor((parseFloat(manualKg) || 0) / 5)) * 0.5)}
                    </Text>
                    <Text style={s.fluxUnit}>FLUX</Text>
                  </View>
                  <Text style={s.fluxNote}>50% — Validazione manuale</Text>
                </View>

                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: dominantColor, opacity: isSanityChecking ? 0.6 : 1 }]}
                  onPress={handlePreFlightCheck}
                  activeOpacity={0.85}
                  disabled={isSubmitting || isSanityChecking}
                >
                  {isSanityChecking ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={18} color="#000" />
                  )}
                  <Text style={s.primaryBtnText}>
                    {isSanityChecking ? 'ANALISI BIOMETRICA...' : 'CHIUDI SFIDA'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setPhase('validation')} style={s.backBtn}>
                  <Ionicons name="arrow-back" size={14} color="#555" />
                  <Text style={s.backText}>CAMBIA MODALITÀ</Text>
                </TouchableOpacity>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </DarkBase>
    );
  }

  // ═══════════════════════════════════════════
  // PHASE 3.5: SANITY WARNING (Trust Engine)
  // ═══════════════════════════════════════════
  if (phase === 'sanity_warning') {
    return (
      <DarkBase>
        <SafeAreaView style={s.safe}>
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeIn.duration(500)}>
              {/* Hero Icon + Motivational Message */}
              <View style={sw.heroSection}>
                <Animated.View entering={FadeInDown.delay(100).springify().damping(12)}>
                  <View style={[sw.rocketWrap, { backgroundColor: dominantColor + '15' }]}>
                    <Text style={sw.rocketEmoji}>🚀</Text>
                  </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(250).duration(500)}>
                  <Text style={[sw.heroTitle, { color: dominantColor }]}>
                    HAI SUPERATO I TUOI LIMITI!
                  </Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(400).duration(500)}>
                  <Text style={sw.heroBody}>
                    Kore, questo risultato è incredibile. Registra una prova video per incidere il tuo nome nella classifica Ranked e sbloccare il 100% dei FLUX.
                  </Text>
                </Animated.View>
              </View>

              {/* Flags Detail */}
              {sanityResult?.flags && sanityResult.flags.length > 0 && (
                <Animated.View entering={FadeInDown.delay(500).duration(400)} style={sw.flagsCard}>
                  <View style={sw.flagsHeader}>
                    <Ionicons name="analytics" size={16} color={EL.CYAN} />
                    <Text style={sw.flagsTitle}>ANALISI BIOMETRICA</Text>
                  </View>
                  {sanityResult.flags.map((flag: string, idx: number) => {
                    const flagLabels: Record<string, string> = {
                      'SPIKE_OVER_PB_REPS': 'Ripetizioni +50% sopra il tuo record personale',
                      'SPIKE_OVER_PB_KG': 'Peso +50% sopra il tuo record personale',
                      'EXCEEDS_WORLD_RECORD_REPS': 'Supera il record mondiale di ripetizioni',
                      'EXCEEDS_WORLD_RECORD_KG': 'Supera il record mondiale di peso',
                      'EXCEEDS_WORLD_RECORD_TIME': 'Supera il record mondiale di durata',
                    };
                    return (
                      <View key={idx} style={sw.flagRow}>
                        <Ionicons name="trending-up" size={14} color="#FFD700" />
                        <Text style={sw.flagText}>{flagLabels[flag] || flag}</Text>
                      </View>
                    );
                  })}
                </Animated.View>
              )}

              {/* Proof Options */}
              <Animated.View entering={FadeInDown.delay(650).duration(400)}>
                <Text style={sw.proofSectionTitle}>SCEGLI COME CERTIFICARTI</Text>
                <View style={sw.proofOptions}>
                  {PROOF_OPTIONS.map((opt) => {
                    const isSelected = selectedProofType === opt.type;
                    return (
                      <TouchableOpacity
                        key={opt.type}
                        style={[
                          sw.proofCard,
                          isSelected && { borderColor: dominantColor, backgroundColor: dominantColor + '08' },
                        ]}
                        onPress={() => {
                          setSelectedProofType(opt.type);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        }}
                        activeOpacity={0.82}
                      >
                        <View style={[sw.proofIconWrap, { backgroundColor: (isSelected ? dominantColor : '#555') + '15' }]}>
                          <Ionicons name={opt.icon as any} size={22} color={isSelected ? dominantColor : '#666'} />
                        </View>
                        <View style={sw.proofContent}>
                          <Text style={[sw.proofTitle, isSelected && { color: dominantColor }]}>{opt.title}</Text>
                          <Text style={sw.proofSub}>{opt.sub}</Text>
                        </View>
                        <View style={[sw.proofBadge, { borderColor: isSelected ? dominantColor : '#333' }]}>
                          <Text style={[sw.proofBadgeText, { color: isSelected ? dominantColor : '#666' }]}>{opt.fluxBoost}</Text>
                        </View>
                        {isSelected && (
                          <View style={[sw.proofCheck, { backgroundColor: dominantColor }]}>
                            <Ionicons name="checkmark" size={12} color="#000" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Animated.View>

              {/* Submit with Proof */}
              <Animated.View entering={FadeInUp.delay(800).duration(400)}>
                {selectedProofType !== 'NONE' && (
                  <TouchableOpacity
                    style={[s.primaryBtn, { backgroundColor: dominantColor }]}
                    onPress={() => doManualSubmit(selectedProofType, selectedProofType === 'VIDEO_TIME_CHECK')}
                    activeOpacity={0.85}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="shield-checkmark" size={18} color="#000" />
                    <Text style={s.primaryBtnText}>INVIA CON PROVA</Text>
                  </TouchableOpacity>
                )}

                {/* Skip without proof */}
                <TouchableOpacity
                  style={[sw.skipBtn, { borderColor: '#333' }]}
                  onPress={() => doManualSubmit('NONE', false)}
                  activeOpacity={0.75}
                >
                  <Text style={sw.skipBtnText}>CONTINUA SENZA PROVA</Text>
                  <Text style={sw.skipBtnSub}>50% FLUX · Non valido per Ranked</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setPhase('manual_entry')} style={s.backBtn}>
                  <Ionicons name="arrow-back" size={14} color="#555" />
                  <Text style={s.backText}>MODIFICA DATI</Text>
                </TouchableOpacity>
              </Animated.View>

              <View style={{ height: 40 }} />
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </DarkBase>
    );
  }

  // PHASE 3C: SENSOR IMPORT MOCK
  if (phase === 'sensor_mock') {
    return (
      <DarkBase>
        <SafeAreaView style={s.safe}>
          <Animated.View entering={FadeIn.duration(400)} style={s.content}>
            <View style={s.phaseHeader}>
              <Text style={[s.phaseLabel, { color: dominantColor }]}>03 / 03</Text>
              <Text style={s.phaseTitle}>SENSOR IMPORT</Text>
              <Text style={s.phaseSub}>Importa dati dal tuo dispositivo</Text>
            </View>

            <View style={s.sensorMock}>
              <View style={[s.sensorDevice, { borderColor: dominantColor + '44' }]}>
                <Ionicons name="watch-outline" size={40} color={dominantColor} />
                <Text style={[s.sensorName, { color: dominantColor }]}>APPLE WATCH</Text>
                <Text style={s.sensorStatus}>Connesso</Text>
              </View>
              <View style={[s.sensorDevice, { borderColor: '#444' }]}>
                <Ionicons name="fitness-outline" size={40} color="#555" />
                <Text style={s.sensorName}>GARMIN</Text>
                <Text style={s.sensorStatus}>Non connesso</Text>
              </View>
            </View>

            <View style={[s.sensorData, { borderColor: dominantColor + '33' }]}>
              <Text style={s.sensorDataTitle}>DATI IMPORTATI</Text>
              <View style={s.sensorRow}><Text style={s.sensorKey}>REP</Text><Text style={[s.sensorVal, { color: dominantColor }]}>18</Text></View>
              <View style={s.sensorRow}><Text style={s.sensorKey}>TEMPO</Text><Text style={[s.sensorVal, { color: dominantColor }]}>00:45</Text></View>
              <View style={s.sensorRow}><Text style={s.sensorKey}>QUALITÀ</Text><Text style={[s.sensorVal, { color: dominantColor }]}>82%</Text></View>
            </View>

            <View style={[s.fluxPreview, { borderColor: dominantColor + '33' }]}>
              <Text style={s.fluxPreviewLabel}>FLUX STIMATI</Text>
              <View style={s.fluxCalcRow}>
                <Text style={[s.fluxBase, { textDecorationLine: 'line-through', color: '#555' }]}>52</Text>
                <Ionicons name="arrow-forward" size={14} color={dominantColor} />
                <Text style={[s.fluxFinal, { color: dominantColor }]}>39</Text>
                <Text style={s.fluxUnit}>FLUX</Text>
              </View>
              <Text style={s.fluxNote}>75% — Sensore esterno</Text>
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: dominantColor }]}
              onPress={handleSensorSubmit}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              <Ionicons name="cloud-upload" size={18} color="#000" />
              <Text style={s.primaryBtnText}>IMPORTA E CHIUDI</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setPhase('validation')} style={s.backBtn}>
              <Ionicons name="arrow-back" size={14} color="#555" />
              <Text style={s.backText}>CAMBIA MODALITÀ</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </DarkBase>
    );
  }

  // PHASE: SUBMITTING
  if (phase === 'submitting') {
    return (
      <DarkBase>
        <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
          <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: 'center', gap: 16 }}>
            <Ionicons name="hourglass" size={48} color={dominantColor} />
            <Text style={[s.phaseTitle, { fontSize: 22 }]}>ELABORAZIONE...</Text>
            <Text style={s.phaseSub}>Calcolo FLUX e incremento DNA</Text>
          </Animated.View>
        </SafeAreaView>
      </DarkBase>
    );
  }

  // PHASE 4: THE VERDICT
  if (phase === 'verdict' && verdict) {
    return <VerdictScreen verdict={verdict} dominantColor={dominantColor} onClose={onComplete} />;
  }

  return null;
}


// ═══════════════════════════════════════════════════════════════════
// VERIFICATION BADGE — Corner badge component
// ═══════════════════════════════════════════════════════════════════
function VerificationBadge({ status, style }: { status: VerificationStatus; style?: any }) {
  const cfg = VERIFICATION_BADGE_CONFIG[status] || VERIFICATION_BADGE_CONFIG.UNVERIFIED;

  return (
    <Animated.View entering={FadeIn.delay(300).duration(400)} style={[vb.badge, { borderColor: cfg.color + '55' }, style]}>
      <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
      <Text style={[vb.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// INTEGRITY OK GLOW — Cinematic Reveal with Ring Explosion
// ═══════════════════════════════════════════════════════════════════
function IntegrityGlowBadge() {
  const scale = useSharedValue(0.1);
  const opacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.5);
  const ringOpacity = useSharedValue(0);
  const ring2Scale = useSharedValue(0.5);
  const ring2Opacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const shieldScale = useSharedValue(0);
  const shieldRotate = useSharedValue(-30);

  useEffect(() => {
    // Phase 1 (0ms): Ring burst explosion outward
    ringScale.value = withDelay(300, withTiming(2.8, { duration: 700, easing: Easing.out(Easing.exp) }));
    ringOpacity.value = withDelay(300, withSequence(
      withTiming(0.7, { duration: 200 }),
      withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }),
    ));
    // Second ring (staggered)
    ring2Scale.value = withDelay(450, withTiming(2.2, { duration: 600, easing: Easing.out(Easing.exp) }));
    ring2Opacity.value = withDelay(450, withSequence(
      withTiming(0.5, { duration: 150 }),
      withTiming(0, { duration: 450, easing: Easing.out(Easing.ease) }),
    ));

    // Phase 2 (500ms): Shield icon springs in with rotation
    shieldScale.value = withDelay(500, withSpring(1, { damping: 8, stiffness: 200 }));
    shieldRotate.value = withDelay(500, withSpring(0, { damping: 12, stiffness: 180 }));

    // Phase 3 (700ms): Badge container scales in
    scale.value = withDelay(700, withSpring(1, { damping: 9, stiffness: 130 }));
    opacity.value = withDelay(700, withTiming(1, { duration: 400 }));

    // Phase 4 (1000ms): Text fades in
    textOpacity.value = withDelay(1000, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }));

    // Phase 5 (1500ms): Eternal glow pulse
    glowOpacity.value = withDelay(1500, withRepeat(
      withSequence(
        withTiming(0.55, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.12, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ), -1, false
    ));

    // Haptic on reveal
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const shieldStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: shieldScale.value },
      { rotate: `${shieldRotate.value}deg` },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={ig.outerWrap}>
      {/* Expanding ring burst 1 */}
      <Animated.View style={[ig.ringBurst, ringStyle]} />
      {/* Expanding ring burst 2 (staggered) */}
      <Animated.View style={[ig.ringBurst2, ring2Style]} />

      <Animated.View style={[ig.container, containerStyle]}>
        {/* Outer glow aura */}
        <Animated.View style={[ig.glowRing, glowStyle]} />
        {/* Inner badge */}
        <View style={ig.innerBadge}>
          <Animated.View style={shieldStyle}>
            <Ionicons name="shield-checkmark" size={22} color={EL.CYAN} />
          </Animated.View>
          <Animated.View style={textStyle}>
            <Text style={ig.badgeText}>INTEGRITY OK</Text>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}


// ═══════════════════════════════════════════════════════════════════
// THE VERDICT — Post-Challenge Summary Screen (v2.0 with Trust Engine)
// ═══════════════════════════════════════════════════════════════════

function VerdictScreen({ verdict, dominantColor, onClose }: { verdict: any; dominantColor: string; onClose: () => void }) {
  const heroScale = useSharedValue(0.3);
  const heroOpacity = useSharedValue(0);
  const radarPulse = useSharedValue(1);

  useEffect(() => {
    heroScale.value = withSpring(1, { damping: 8, stiffness: 120 });
    heroOpacity.value = withTiming(1, { duration: 600 });
    radarPulse.value = withRepeat(withSequence(
      withTiming(1.05, { duration: 1200 }),
      withTiming(1, { duration: 1200 }),
    ), -1, false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
    opacity: heroOpacity.value,
  }));

  const radarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: radarPulse.value }],
  }));

  const hero = verdict.hero_data || {};
  const dna = verdict.dna_predictions || {};
  const tags = verdict.tags || [];
  const verificationStatus: VerificationStatus = verdict.verification_status || 'UNVERIFIED';
  const integrityOk: boolean = verdict.integrity_ok === true;
  const sanityCheck = verdict.sanity_check || {};
  const proofType = verdict.proof_type || 'NONE';
  const isManual = verdict.validation_mode === 'MANUAL_ENTRY';
  const isSensor = verdict.validation_mode === 'SENSOR_IMPORT';

  // Mini DNA Radar for predictions
  const stats = ['velocita', 'forza', 'resistenza', 'agilita', 'tecnica', 'potenza'];
  const cx = 60, cy = 60, r = 45;

  return (
    <View style={v.container}>
      <SafeAreaView style={v.safe}>
        <ScrollView contentContainerStyle={v.scroll} showsVerticalScrollIndicator={false}>

          {/* ═══ HEADER with Verification Badge ═══ */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={v.header}>
            <Text style={[v.verdictLabel, { color: dominantColor }]}>THE VERDICT</Text>
            <View style={v.tagsRow}>
              {tags.map((tag: string) => (
                <View key={tag} style={[v.tagPill, { borderColor: TAG_CONFIG[tag as ChallengeTag]?.color || '#555' }]}>
                  <Text style={[v.tagPillText, { color: TAG_CONFIG[tag as ChallengeTag]?.color || '#555' }]}>{tag}</Text>
                </View>
              ))}
            </View>
            {/* Corner Verification Badge */}
            <VerificationBadge status={verificationStatus} style={{ marginTop: 8 }} />
          </Animated.View>

          {/* ═══ HERO DATA ═══ */}
          <Animated.View style={[v.heroWrap, heroStyle]}>
            <Text style={[v.heroValue, { color: dominantColor }]}>{hero.value || '—'}</Text>
            <Text style={v.heroUnit}>{hero.unit || ''}</Text>
            <Text style={v.heroLabel}>{hero.label || ''}</Text>
          </Animated.View>

          {/* ═══ INTEGRITY OK GLOW (only if integrity passed) ═══ */}
          {integrityOk && (
            <View style={v.integrityWrap}>
              <IntegrityGlowBadge />
            </View>
          )}

          {/* ═══ SANITY CHECK FEEDBACK (if flags exist) ═══ */}
          {sanityCheck.flags && sanityCheck.flags.length > 0 && !integrityOk && (
            <Animated.View entering={FadeInDown.delay(350).duration(400)} style={v.sanityCard}>
              <View style={v.sanityHeader}>
                <Ionicons name="alert-circle" size={16} color="#FFD700" />
                <Text style={v.sanityTitle}>ANALISI INTEGRITÀ</Text>
              </View>
              <Text style={v.sanityMsg}>
                {sanityCheck.message || 'Risultati richiedono verifica aggiuntiva'}
              </Text>
              {proofType !== 'NONE' && (
                <View style={v.proofTypeBadge}>
                  <Ionicons name="document-attach" size={12} color={EL.CYAN} />
                  <Text style={v.proofTypeText}>Prova: {proofType.replace(/_/g, ' ')}</Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* ═══ FLUX Calculation — Transparent ═══ */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={[v.fluxCard, { borderColor: dominantColor + '44' }]}>
            <View style={v.fluxHeader}>
              <FluxIcon size={20} color={dominantColor} />
              <Text style={[v.fluxTitle, { color: dominantColor }]}>FLUX GUADAGNATI</Text>
            </View>

            <View style={v.fluxCalcBlock}>
              {isManual || isSensor ? (
                <>
                  <View style={v.fluxLine}>
                    <Text style={v.fluxCalcLabel}>Base</Text>
                    <Text style={[v.fluxCalcVal, { textDecorationLine: 'line-through', color: '#555' }]}>{verdict.base_flux}</Text>
                  </View>
                  <View style={v.fluxLine}>
                    <Text style={v.fluxCalcLabel}>Moltiplicatore</Text>
                    <Text style={[v.fluxCalcVal, { color: '#FFD700' }]}>×{verdict.flux_multiplier}</Text>
                  </View>
                  <View style={[v.fluxDivider, { backgroundColor: dominantColor + '33' }]} />
                  <View style={v.fluxLine}>
                    <Text style={[v.fluxCalcLabel, { color: '#FFF', fontWeight: '900' }]}>Totale</Text>
                    <Text style={[v.fluxFinal, { color: dominantColor }]}>{verdict.earned_flux}</Text>
                  </View>
                </>
              ) : (
                <View style={v.fluxLine}>
                  <Text style={[v.fluxCalcLabel, { color: '#FFF', fontWeight: '900' }]}>Totale (100%)</Text>
                  <Text style={[v.fluxFinal, { color: dominantColor }]}>{verdict.earned_flux}</Text>
                </View>
              )}
            </View>

            {/* Verification-based multiplier explanation */}
            <View style={v.verificationInfo}>
              <VerificationBadge status={verificationStatus} />
              <Text style={v.verificationMult}>
                {verificationStatus === 'AI_VERIFIED' ? '100% FLUX · Full Rank' :
                 verificationStatus === 'TECH_VERIFIED' ? '90% FLUX · Standard Rank' :
                 verificationStatus === 'PROOF_PENDING' ? '75% FLUX · In attesa verifica' :
                 verificationStatus === 'SUSPICIOUS' ? '25% FLUX · Revisione richiesta' :
                 '50% FLUX · Nessuna prova'}
              </Text>
            </View>

            {/* DATA ORIGIN — Proof of Origin badges */}
            <DataOriginLine sources={
              verdict.proof_type === 'GPS_IMPORT' ? ['STRAVA', 'NEXUS_VISION'] :
              verdict.bpm_correlation?.status === 'BPM_CORRELATED' ? ['BLE_SENSOR', 'NEXUS_VISION'] :
              verdict.proximity_witness?.witness_found ? ['NEXUS_VISION'] :
              verdict.validation_mode === 'MANUAL_ENTRY' ? ['MANUAL'] :
              ['NEXUS_VISION']
            } />

            {/* SUSPICIOUS alert — yellow not red */}
            {verificationStatus === 'SUSPICIOUS' && (
              <View style={[v.upsell, { borderColor: 'rgba(255,149,0,0.2)', backgroundColor: 'rgba(255,149,0,0.06)' }]}>
                <Ionicons name="warning" size={14} color="#FF9500" />
                <Text style={[v.upsellText, { color: '#FF9500' }]}>
                  {verdict.bpm_correlation?.message || 'Dati biometrici anomali. Un coach effettuerà la revisione manuale. Ti diamo il beneficio del dubbio.'}
                </Text>
              </View>
            )}

            {/* Proximity Witness badge */}
            {verdict.proximity_witness?.witness_found && (
              <View style={[v.upsell, { borderColor: 'rgba(175,82,222,0.2)', backgroundColor: 'rgba(175,82,222,0.06)' }]}>
                <Ionicons name="people" size={14} color="#AF52DE" />
                <Text style={[v.upsellText, { color: '#AF52DE' }]}>
                  PROXIMITY WITNESS: {verdict.proximity_witness.witness_username} era a {verdict.proximity_witness.distance_m}m da te. Validazione automatica reciproca.
                </Text>
              </View>
            )}

            {/* Upsell for manual */}
            {verificationStatus === 'UNVERIFIED' && (
              <View style={v.upsell}>
                <Ionicons name="information-circle" size={14} color="#FFD700" />
                <Text style={v.upsellText}>
                  Passa alla validazione NÈXUS per il 100% dei FLUX e il Rank ufficiale.
                </Text>
              </View>
            )}

            {!verdict.ranked_eligible && (
              <View style={[v.rankBadge, { borderColor: '#FF3B30' }]}>
                <Ionicons name="close-circle" size={12} color="#FF3B30" />
                <Text style={v.rankBadgeText}>NON VALIDO PER RANKED</Text>
              </View>
            )}
            {verdict.ranked_eligible && (
              <View style={[v.rankBadge, { borderColor: '#00FF87' }]}>
                <Ionicons name="checkmark-circle" size={12} color="#00FF87" />
                <Text style={[v.rankBadgeText, { color: '#00FF87' }]}>RANKED ELIGIBLE</Text>
              </View>
            )}
          </Animated.View>

          {/* ═══ DNA Radar Increment Preview ═══ */}
          <Animated.View entering={FadeInDown.delay(600).duration(500)} style={[v.dnaCard, { borderColor: dominantColor + '33' }]}>
            <Text style={v.dnaTitle}>INCREMENTO DNA PREVISTO</Text>

            <Animated.View style={[v.radarWrap, radarStyle]}>
              <Svg width={120} height={120}>
                {[1, 0.66, 0.33].map((lv, gi) => (
                  <Polygon key={gi} points={stats.map((_, i) => {
                    const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                    return `${cx + r * lv * Math.cos(a)},${cy + r * lv * Math.sin(a)}`;
                  }).join(' ')} fill="none" stroke={dominantColor} strokeWidth={0.5} opacity={0.2} />
                ))}
                <Polygon points={stats.map((st, i) => {
                  const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                  const v2 = (dna[st]?.current || 50) / 100;
                  return `${cx + r * v2 * Math.cos(a)},${cy + r * v2 * Math.sin(a)}`;
                }).join(' ')} fill={dominantColor + '20'} stroke={dominantColor} strokeWidth={1} opacity={0.5} />
                <Polygon points={stats.map((st, i) => {
                  const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                  const v2 = (dna[st]?.predicted || dna[st]?.current || 50) / 100;
                  return `${cx + r * v2 * Math.cos(a)},${cy + r * v2 * Math.sin(a)}`;
                }).join(' ')} fill={dominantColor + '40'} stroke={dominantColor} strokeWidth={2} />
              </Svg>
            </Animated.View>

            <View style={v.dnaStats}>
              {Object.entries(dna).map(([stat, data]: [string, any]) => (
                <View key={stat} style={v.dnaRow}>
                  <Text style={v.dnaStatName}>{stat.toUpperCase()}</Text>
                  <Text style={v.dnaStatCurrent}>{data.current}</Text>
                  <Ionicons name="arrow-forward" size={10} color={dominantColor} />
                  <Text style={[v.dnaStatPredicted, { color: dominantColor }]}>{data.predicted}</Text>
                  <Text style={[v.dnaStatIncrement, { color: dominantColor }]}>+{data.increment}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Close Button */}
          <TouchableOpacity style={[v.closeBtn, { backgroundColor: dominantColor }]} onPress={onClose} activeOpacity={0.85}>
            <Text style={v.closeBtnText}>TORNA AL NEXUS</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}


// ═══════════════════════════════════════════
// STYLES — Main Engine
// ═══════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  colorOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  safe: { flex: 1, zIndex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16, zIndex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, zIndex: 1 },

  phaseHeader: { alignItems: 'center', gap: 4, marginBottom: 24 },
  phaseLabel: { fontFamily: FONT_MONT, fontSize: 13, fontWeight: '900', letterSpacing: 4 },
  phaseTitle: { fontFamily: FONT_MONT, color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: 5 },
  phaseSub: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '400', textAlign: 'center' },

  tagsGrid: { gap: 12, marginBottom: 24 },
  tagCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1, borderColor: EL.BORDER,
    backgroundColor: EL.CARD_BG,
  },
  tagIconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tagLabel: { fontFamily: FONT_MONT, color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 3, flex: 0 },
  tagDesc: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '400', flex: 1 },
  tagCheck: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  tagsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 20 },
  tagPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tagPillText: { fontFamily: FONT_MONT, fontSize: 11, fontWeight: '900', letterSpacing: 2 },

  modesCol: { gap: 12, marginBottom: 24 },
  modeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16, borderWidth: 1, borderColor: EL.BORDER,
    backgroundColor: EL.CARD_BG, position: 'relative' as const,
  },
  modeIconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modeContent: { flex: 1, gap: 2 },
  modeTitle: { fontFamily: FONT_MONT, color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  modeSub: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '400' },
  modeBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  modeBadgeText: { fontFamily: FONT_MONT, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  recommended: { position: 'absolute' as const, top: -8, right: 12, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  recommendedText: { fontFamily: FONT_MONT, color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  inputGroup: { gap: 16, marginBottom: 20 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputWrap: { flex: 1, gap: 6 },
  inputLabel: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 12, fontWeight: '500', letterSpacing: 0.3 },
  input: {
    backgroundColor: EL.CARD_BG, borderWidth: 1, borderRadius: 12,
    color: '#FFFFFF', fontSize: 28, fontWeight: '800', textAlign: 'center' as const,
    paddingVertical: 14, letterSpacing: 1,
    fontFamily: FONT_JAKARTA,
  },
  inputUnit: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 11, fontWeight: '500', letterSpacing: 1, textAlign: 'center' as const },

  proofBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.02)', paddingVertical: 14,
  },
  proofText: { fontFamily: FONT_MONT, color: '#555', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  disclaimer: {
    flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1,
    backgroundColor: 'rgba(255,215,0,0.04)', marginBottom: 20,
  },
  disclaimerContent: { flex: 1, gap: 4 },
  disclaimerTitle: { fontFamily: FONT_MONT, color: '#FFD700', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  disclaimerText: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '400', lineHeight: 17 },
  disclaimerCta: { fontFamily: FONT_MONT, fontSize: 11, fontWeight: '800', marginTop: 4 },

  fluxPreview: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20, alignItems: 'center', gap: 6 },
  fluxPreviewLabel: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  fluxCalcRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fluxBase: { fontFamily: FONT_JAKARTA, fontSize: 24, fontWeight: '900' },
  fluxFinal: { fontFamily: FONT_JAKARTA, fontSize: 32, fontWeight: '900' },
  fluxUnit: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  fluxNote: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '400' },

  sensorMock: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  sensorDevice: {
    flex: 1, alignItems: 'center', gap: 8, padding: 20, borderRadius: 16,
    borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  sensorName: { fontFamily: FONT_MONT, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  sensorStatus: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '400' },
  sensorData: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20, gap: 8 },
  sensorDataTitle: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  sensorRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sensorKey: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  sensorVal: { fontFamily: FONT_JAKARTA, fontSize: 16, fontWeight: '900' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 16, marginBottom: 12,
  },
  primaryBtnText: { fontFamily: FONT_MONT, color: '#000000', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  backText: { fontFamily: FONT_MONT, color: '#555', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
});


// ═══════════════════════════════════════════
// STYLES — Sanity Warning Phase
// ═══════════════════════════════════════════
const sw = StyleSheet.create({
  heroSection: { alignItems: 'center', gap: 12, marginBottom: 28, paddingTop: 20 },
  rocketWrap: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  rocketEmoji: { fontSize: 40 },
  heroTitle: {
    fontFamily: FONT_MONT, fontSize: 22, fontWeight: '900',
    letterSpacing: 3, textAlign: 'center',
  },
  heroBody: {
    fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.65)',
    fontSize: 15, fontWeight: '400', lineHeight: 22,
    textAlign: 'center', paddingHorizontal: 12,
  },

  flagsCard: {
    backgroundColor: EL.CARD_BG, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)',
    padding: 14, gap: 10, marginBottom: 24,
  },
  flagsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flagsTitle: { fontFamily: FONT_MONT, color: EL.CYAN, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
  flagText: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '400', flex: 1 },

  proofSectionTitle: {
    fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 12,
    fontWeight: '700', letterSpacing: 2, marginBottom: 12, textAlign: 'center',
  },
  proofOptions: { gap: 10, marginBottom: 20 },
  proofCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1, borderColor: EL.BORDER,
    backgroundColor: EL.CARD_BG, position: 'relative' as const,
  },
  proofIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  proofContent: { flex: 1, gap: 2 },
  proofTitle: { fontFamily: FONT_MONT, color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  proofSub: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '400' },
  proofBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  proofBadgeText: { fontFamily: FONT_MONT, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  proofCheck: {
    position: 'absolute' as const, top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },

  skipBtn: {
    borderWidth: 1, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginBottom: 8, gap: 4,
  },
  skipBtnText: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  skipBtnSub: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '400' },
});


// ═══════════════════════════════════════════
// STYLES — Verification Badge
// ═══════════════════════════════════════════
const vb = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  badgeText: { fontFamily: FONT_MONT, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
});


// ═══════════════════════════════════════════
// STYLES — Integrity Glow Badge
// ═══════════════════════════════════════════
const ig = StyleSheet.create({
  outerWrap: {
    alignItems: 'center', justifyContent: 'center',
    marginVertical: 8, height: 60,
  },
  ringBurst: {
    position: 'absolute' as const,
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 2, borderColor: EL.CYAN,
  },
  ringBurst2: {
    position: 'absolute' as const,
    width: 50, height: 50, borderRadius: 25,
    borderWidth: 1.5, borderColor: EL.CYAN,
  },
  container: {
    alignItems: 'center', justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute' as const,
    width: 170, height: 50, borderRadius: 25,
    backgroundColor: EL.CYAN,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore — Web boxShadow for glow
      boxShadow: `0 0 24px ${EL.CYAN}55, 0 0 48px ${EL.CYAN}22`,
    } : {}),
  },
  innerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0A1A1A',
    borderWidth: 1.5, borderColor: EL.CYAN,
    borderRadius: 22, paddingHorizontal: 20, paddingVertical: 11,
  },
  badgeText: {
    fontFamily: FONT_MONT, color: EL.CYAN,
    fontSize: 13, fontWeight: '900', letterSpacing: 3,
  },
});


// ═══════════════════════════════════════════
// STYLES — Verdict Screen
// ═══════════════════════════════════════════
const v = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 20 },

  header: { alignItems: 'center', gap: 8, marginBottom: 20 },
  verdictLabel: { fontFamily: FONT_MONT, fontSize: 14, fontWeight: '900', letterSpacing: 6 },
  tagsRow: { flexDirection: 'row', gap: 8 },
  tagPill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  tagPillText: { fontFamily: FONT_MONT, fontSize: 10, fontWeight: '900', letterSpacing: 2 },

  heroWrap: { alignItems: 'center', marginBottom: 12, gap: 4 },
  heroValue: { fontFamily: FONT_JAKARTA, fontSize: 72, fontWeight: '800', letterSpacing: 2 },
  heroUnit: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 14, fontWeight: '500', letterSpacing: 3, marginTop: -8 },
  heroLabel: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 12, fontWeight: '500', letterSpacing: 2 },

  integrityWrap: { alignItems: 'center', marginBottom: 20 },

  // Sanity feedback card (when integrity NOT ok)
  sanityCard: {
    backgroundColor: EL.CARD_BG, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)',
    padding: 14, gap: 8, marginBottom: 16,
  },
  sanityHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sanityTitle: { fontFamily: FONT_MONT, color: '#FFD700', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  sanityMsg: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '400', lineHeight: 17 },
  proofTypeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: EL.CYAN + '33', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  proofTypeText: { fontFamily: FONT_MONT, color: EL.CYAN, fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  fluxCard: { borderWidth: 1, borderRadius: 16, padding: 18, marginBottom: 16, gap: 10, backgroundColor: EL.CARD_BG },
  fluxHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fluxTitle: { fontFamily: FONT_MONT, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  fluxCalcBlock: { gap: 6 },
  fluxLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fluxCalcLabel: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
  fluxCalcVal: { fontFamily: FONT_JAKARTA, fontSize: 16, fontWeight: '900' },
  fluxDivider: { height: 1, marginVertical: 4 },
  fluxFinal: { fontFamily: FONT_JAKARTA, fontSize: 28, fontWeight: '900' },

  verificationInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 4,
  },
  verificationMult: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 11, fontWeight: '600' },

  upsell: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
  upsellText: { fontFamily: FONT_MONT, color: '#FFD700', fontSize: 11, fontWeight: '600', flex: 1, lineHeight: 16 },
  rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  rankBadgeText: { fontFamily: FONT_MONT, color: '#FF3B30', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  dnaCard: { borderWidth: 1, borderRadius: 16, padding: 18, marginBottom: 20, alignItems: 'center', gap: 12, backgroundColor: EL.CARD_BG },
  dnaTitle: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 12, fontWeight: '500', letterSpacing: 2, alignSelf: 'flex-start' },
  radarWrap: { marginVertical: 8 },
  dnaStats: { width: '100%', gap: 6 },
  dnaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dnaStatName: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 11, fontWeight: '500', letterSpacing: 1, width: 90 },
  dnaStatCurrent: { fontFamily: FONT_JAKARTA, color: '#555', fontSize: 14, fontWeight: '800', width: 35, textAlign: 'right' as const },
  dnaStatPredicted: { fontFamily: FONT_JAKARTA, fontSize: 14, fontWeight: '800', width: 35, textAlign: 'right' as const },
  dnaStatIncrement: { fontFamily: FONT_JAKARTA, fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  closeBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
  closeBtnText: { fontFamily: FONT_MONT, color: '#000000', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
});
