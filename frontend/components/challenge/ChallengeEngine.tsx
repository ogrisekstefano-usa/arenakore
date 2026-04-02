/**
 * ARENAKORE — CHALLENGE ENGINE
 * Tag Selection → Validation Mode → Manual Entry / Auto / Sensor → THE VERDICT
 * "Estetica del Potere" — Total color immersion based on dominant tag
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  Dimensions, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, withRepeat, withSequence, withTiming, withSpring,
  useAnimatedStyle, FadeIn, FadeInDown, interpolate, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Polygon, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { api } from '../../utils/api';
import { FluxIcon } from '../FluxIcon';

const { width: SW } = Dimensions.get('window');

// ═══ TAG DEFINITIONS ═══
type ChallengeTag = 'POWER' | 'FLOW' | 'PULSE';
type ValidationMode = 'AUTO_COUNT' | 'MANUAL_ENTRY' | 'SENSOR_IMPORT';

const TAG_CONFIG: Record<ChallengeTag, { color: string; icon: string; label: string; desc: string }> = {
  POWER: { color: '#FF3B30', icon: 'flame', label: 'POWER', desc: 'Forza · Potenza · Esplosività' },
  FLOW:  { color: '#00FF87', icon: 'leaf',  label: 'FLOW',  desc: 'Agilità · Tecnica · Fluidità' },
  PULSE: { color: '#00E5FF', icon: 'pulse', label: 'PULSE', desc: 'Velocità · Resistenza · Cardio' },
};

const MODE_CONFIG: Record<ValidationMode, { icon: string; title: string; sub: string; badge: string }> = {
  AUTO_COUNT:    { icon: 'scan',          title: 'NÈXUS VISION',     sub: 'Conteggio rep automatico via camera',      badge: '100% FLUX' },
  MANUAL_ENTRY:  { icon: 'create-outline', title: 'MANUAL ENTRY',    sub: 'Inserisci dati post-allenamento',           badge: '50% FLUX' },
  SENSOR_IMPORT: { icon: 'watch-outline',  title: 'SENSOR IMPORT',   sub: 'Importa da Apple Health / Garmin',          badge: '75% FLUX' },
};

// ═══ MAIN ENGINE PHASES ═══
type EnginePhase = 'tags' | 'validation' | 'manual_entry' | 'sensor_mock' | 'submitting' | 'verdict';

interface ChallengeEngineProps {
  user: any;
  token: string | null;
  exerciseType?: string;
  sessionMode?: string;
  onBack: () => void;
  onAutoScan: (challengeId: string, tags: string[], dominantColor: string) => void;
  onComplete: () => void;
}

export function ChallengeEngine({ user, token, exerciseType = 'squat', sessionMode = 'personal', onBack, onAutoScan, onComplete }: ChallengeEngineProps) {
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

  // Dominant color for immersive theming
  const dominantTag = selectedTags[0] || 'PULSE';
  const dominantColor = TAG_CONFIG[dominantTag]?.color || '#00E5FF';

  // Animations
  const bgPulse = useSharedValue(0.03);
  const headerGlow = useSharedValue(0.4);

  useEffect(() => {
    bgPulse.value = withRepeat(withSequence(
      withTiming(0.08, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.03, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
    ), -1, false);
    headerGlow.value = withRepeat(withSequence(
      withTiming(0.8, { duration: 1000 }),
      withTiming(0.3, { duration: 1000 }),
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

  // ═══ TAG SELECTION PHASE ═══
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

    // Create challenge on backend
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
        // Route to NEXUS scan — pass challenge context
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

  // ═══ SUBMIT MANUAL ENTRY ═══
  const handleManualSubmit = async () => {
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
        has_video_proof: hasVideoProof,
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

  // ═══ RENDER PHASES ═══

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

            {/* Selected tags display */}
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
                  style={[s.primaryBtn, { backgroundColor: dominantColor }]}
                  onPress={handleManualSubmit}
                  activeOpacity={0.85}
                  disabled={isSubmitting}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#000" />
                  <Text style={s.primaryBtnText}>CHIUDI SFIDA</Text>
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

            {/* FLUX Preview */}
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
// THE VERDICT — Post-Challenge Summary Screen
// ═══════════════════════════════════════════════════════════════════

function VerdictScreen({ verdict, dominantColor, onClose }: { verdict: any; dominantColor: string; onClose: () => void }) {
  const heroScale = useSharedValue(0.3);
  const heroOpacity = useSharedValue(0);
  const fluxCount = useSharedValue(0);
  const radarPulse = useSharedValue(1);

  useEffect(() => {
    heroScale.value = withSpring(1, { damping: 8, stiffness: 120 });
    heroOpacity.value = withTiming(1, { duration: 600 });
    fluxCount.value = withTiming(verdict.earned_flux, { duration: 1500, easing: Easing.out(Easing.cubic) });
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
  const isManual = verdict.validation_mode === 'MANUAL_ENTRY';
  const isSensor = verdict.validation_mode === 'SENSOR_IMPORT';
  const multiplierLabel = isManual ? '50%' : isSensor ? '75%' : '100%';

  // Mini DNA Radar for predictions
  const stats = ['velocita', 'forza', 'resistenza', 'agilita', 'tecnica', 'potenza'];
  const cx = 60, cy = 60, r = 45;

  return (
    <View style={v.container}>
      <SafeAreaView style={v.safe}>
        <ScrollView contentContainerStyle={v.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={v.header}>
            <Text style={[v.verdictLabel, { color: dominantColor }]}>THE VERDICT</Text>
            <View style={v.tagsRow}>
              {tags.map((tag: string) => (
                <View key={tag} style={[v.tagPill, { borderColor: TAG_CONFIG[tag as ChallengeTag]?.color || '#555' }]}>
                  <Text style={[v.tagPillText, { color: TAG_CONFIG[tag as ChallengeTag]?.color || '#555' }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Hero Data */}
          <Animated.View style={[v.heroWrap, heroStyle]}>
            <Text style={[v.heroValue, { color: dominantColor }]}>{hero.value || '—'}</Text>
            <Text style={v.heroUnit}>{hero.unit || ''}</Text>
            <Text style={v.heroLabel}>{hero.label || ''}</Text>
          </Animated.View>

          {/* FLUX Calculation — Transparent */}
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

            {/* Upsell for manual */}
            {(isManual || isSensor) && (
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

          {/* DNA Radar Increment Preview */}
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

            {/* Stats list */}
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


// ═══ STYLES ═══

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  colorOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  safe: { flex: 1, zIndex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16, zIndex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, zIndex: 1 },

  // Phase header
  phaseHeader: { alignItems: 'center', gap: 4, marginBottom: 24 },
  phaseLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 4 },
  phaseTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: 5 },
  phaseSub: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '400', textAlign: 'center' },

  // Tags grid
  tagsGrid: { gap: 12, marginBottom: 24 },
  tagCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tagIconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tagLabel: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 3, flex: 0 },
  tagDesc: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '400', flex: 1 },
  tagCheck: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Tags row (selected)
  tagsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 20 },
  tagPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tagPillText: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },

  // Validation modes
  modesCol: { gap: 12, marginBottom: 24 },
  modeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)', position: 'relative',
  },
  modeIconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modeContent: { flex: 1, gap: 2 },
  modeTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  modeSub: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '400' },
  modeBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  modeBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  recommended: { position: 'absolute', top: -8, right: 12, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  recommendedText: { color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  // Input fields
  inputGroup: { gap: 16, marginBottom: 20 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputWrap: { flex: 1, gap: 6 },
  inputLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderRadius: 12,
    color: '#FFFFFF', fontSize: 28, fontWeight: '900', textAlign: 'center',
    paddingVertical: 14, letterSpacing: 2,
  },
  inputUnit: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', letterSpacing: 2, textAlign: 'center' },

  // Proof button
  proofBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.02)', paddingVertical: 14,
  },
  proofText: { color: '#555', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1,
    backgroundColor: 'rgba(255,215,0,0.04)', marginBottom: 20,
  },
  disclaimerContent: { flex: 1, gap: 4 },
  disclaimerTitle: { color: '#FFD700', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  disclaimerText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '400', lineHeight: 17 },
  disclaimerCta: { fontSize: 11, fontWeight: '800', marginTop: 4 },

  // FLUX preview
  fluxPreview: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20, alignItems: 'center', gap: 6 },
  fluxPreviewLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  fluxCalcRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fluxBase: { fontSize: 24, fontWeight: '900' },
  fluxFinal: { fontSize: 32, fontWeight: '900' },
  fluxUnit: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  fluxNote: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '400' },

  // Sensor mock
  sensorMock: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  sensorDevice: {
    flex: 1, alignItems: 'center', gap: 8, padding: 20, borderRadius: 16,
    borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  sensorName: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  sensorStatus: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '400' },
  sensorData: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20, gap: 8 },
  sensorDataTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  sensorRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sensorKey: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  sensorVal: { fontSize: 16, fontWeight: '900' },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 16, marginBottom: 12,
  },
  primaryBtnText: { color: '#000000', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  backText: { color: '#555', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
});

const v = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 20 },

  header: { alignItems: 'center', gap: 8, marginBottom: 20 },
  verdictLabel: { fontSize: 14, fontWeight: '900', letterSpacing: 6 },
  tagsRow: { flexDirection: 'row', gap: 8 },
  tagPill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  tagPillText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },

  // Hero
  heroWrap: { alignItems: 'center', marginBottom: 28, gap: 4 },
  heroValue: { fontSize: 72, fontWeight: '900', letterSpacing: 4 },
  heroUnit: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '900', letterSpacing: 4, marginTop: -8 },
  heroLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '800', letterSpacing: 3 },

  // FLUX card
  fluxCard: { borderWidth: 1, borderRadius: 16, padding: 18, marginBottom: 16, gap: 10 },
  fluxHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fluxTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  fluxCalcBlock: { gap: 6 },
  fluxLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fluxCalcLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
  fluxCalcVal: { fontSize: 16, fontWeight: '900' },
  fluxDivider: { height: 1, marginVertical: 4 },
  fluxFinal: { fontSize: 28, fontWeight: '900' },
  upsell: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
  upsellText: { color: '#FFD700', fontSize: 11, fontWeight: '600', flex: 1, lineHeight: 16 },
  rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  rankBadgeText: { color: '#FF3B30', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  // DNA card
  dnaCard: { borderWidth: 1, borderRadius: 16, padding: 18, marginBottom: 20, alignItems: 'center', gap: 12 },
  dnaTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '900', letterSpacing: 3, alignSelf: 'flex-start' },
  radarWrap: { marginVertical: 8 },
  dnaStats: { width: '100%', gap: 6 },
  dnaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dnaStatName: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', letterSpacing: 2, width: 90 },
  dnaStatCurrent: { color: '#555', fontSize: 14, fontWeight: '900', width: 35, textAlign: 'right' },
  dnaStatPredicted: { fontSize: 14, fontWeight: '900', width: 35, textAlign: 'right' },
  dnaStatIncrement: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  // Close
  closeBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
  closeBtnText: { color: '#000000', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
});
