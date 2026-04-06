import Haptics from '../../utils/haptics';
/**
 * ARENAKORE — POST-RACE VALIDATION (QR KORE CROSS-CHECK)
 * ═══════════════════════════════════════════════════════
 * Il rito di validazione d'élite post-sfida.
 * - MY QR: Mostra il tuo QR code + PIN a 6 cifre
 * - SCAN: Camera scanner per leggere QR dei compagni (+ fallback codice)
 * - PROGRESS: Ring circolare animato (Conferme: X/Y)
 * - STATUS: Provvisorio → Ufficiale (con glow transition)
 * 
 * Typography: Plus Jakarta Sans 800 (titoli), Montserrat 600 (dati)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  Dimensions, Platform, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, withRepeat, withSequence, withTiming, withSpring, withDelay,
  useAnimatedStyle, FadeIn, FadeInDown, FadeInUp, Easing
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../../utils/api';
import { FluxIcon } from '../FluxIcon';
import { EL, FONT_MONT, FONT_JAKARTA } from '../../utils/eliteTheme';

// ═══ LAZY LOAD expo-camera to prevent Expo Go crash ═══
let CameraViewLazy: any = null;
let useCameraPermissionsLazy: any = null;
try {
  const mod = require('expo-camera');
  CameraViewLazy = mod.CameraView;
  useCameraPermissionsLazy = mod.useCameraPermissions;
} catch (e) {
  console.warn('[PostRaceValidation] expo-camera not available');
}

const { width: SW } = Dimensions.get('window');

// ═══ Types ═══
type ValidationPhase = 'my_qr' | 'scan' | 'manual_code' | 'result';

interface PostRaceValidationProps {
  user: any;
  token: string | null;
  challengeId: string;
  declaredScore: { reps: number; seconds: number; kg: number };
  totalParticipants: number;
  challengeType?: 'OPEN_LIVE' | 'CLOSED_LIVE';
  tags?: string[];
  onComplete: () => void;
  onBack: () => void;
}

const TAG_COLORS: Record<string, string> = {
  POWER: '#FF3B30',
  FLOW: '#34C759',
  PULSE: '#007AFF'
};

// ═══════════════════════════════════════════════════════════════
// CIRCULAR PROGRESS RING (SVG)
// ═══════════════════════════════════════════════════════════════
function ProgressRing({
  confirmations, threshold, size = 160, strokeWidth = 6, color = EL.CYAN
}: {
  confirmations: number; threshold: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(confirmations / Math.max(threshold, 1), 1);
  const strokeDashoffset = circumference * (1 - progress);

  const isComplete = confirmations >= threshold;
  const ringColor = isComplete ? '#34C759' : color;

  // Pulse animation for complete
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (isComplete) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ), -1, false,
      );
    }
  }, [isComplete]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }]
  }));

  return (
    <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, pulseStyle]}>
      <Svg width={size} height={size}>
        {/* Background ring */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
          opacity={0.9}
        />
        {/* Glow segments for each confirmation */}
        {Array.from({ length: confirmations }).map((_, idx) => {
          const angle = (360 / Math.max(threshold, 1)) * idx - 90;
          const rad = (angle * Math.PI) / 180;
          const dotX = size / 2 + radius * Math.cos(rad);
          const dotY = size / 2 + radius * Math.sin(rad);
          return (
            <Circle
              key={idx}
              cx={dotX} cy={dotY} r={strokeWidth * 0.8}
              fill={ringColor}
              opacity={0.7}
            />
          );
        })}
      </Svg>
      {/* Center content */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={pr.ringCount}>{confirmations}</Text>
        <Text style={pr.ringDivider}>/{threshold}</Text>
        <Text style={[pr.ringLabel, isComplete && { color: '#34C759' }]}>
          {isComplete ? 'UFFICIALE' : 'CONFERME'}
        </Text>
      </View>
    </Animated.View>
  );
}


// ═══════════════════════════════════════════════════════════════
// STATUS BADGE (Provvisorio / Ufficiale / Annullato)
// ═══════════════════════════════════════════════════════════════
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: string; label: string }> = {
    provisional: { color: '#FFD700', icon: 'time-outline', label: 'PROVVISORIO' },
    official:    { color: '#34C759', icon: 'shield-checkmark', label: 'UFFICIALE' },
    annulled:    { color: '#FF3B30', icon: 'close-circle', label: 'ANNULLATO' }
  };
  const c = config[status] || config.provisional;

  // Glow animation for official
  const glow = useSharedValue(0.2);
  useEffect(() => {
    if (status === 'official') {
      glow.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1000 }),
          withTiming(0.2, { duration: 1000 }),
        ), -1, false,
      );
    }
  }, [status]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: status === 'official' ? glow.value : 0
  }));

  return (
    <View style={sb.container}>
      <Animated.View style={[sb.glowBg, { backgroundColor: c.color }, glowStyle]} />
      <View style={[sb.badge, { borderColor: c.color + '55' }]}>
        <Ionicons name={c.icon as any} size={16} color={c.color} />
        <Text style={[sb.text, { color: c.color }]}>{c.label}</Text>
      </View>
    </View>
  );
}


// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT — PostRaceValidation
// ═══════════════════════════════════════════════════════════════
export function PostRaceValidation({
  user, token, challengeId, declaredScore, totalParticipants, challengeType = 'CLOSED_LIVE',
  tags = ['POWER'], onComplete, onBack
}: PostRaceValidationProps) {

  const [phase, setPhase] = useState<ValidationPhase>('my_qr');
  const [qrData, setQrData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissionsLazy ? useCameraPermissionsLazy() : [null, async () => {}];
  const [scanned, setScanned] = useState(false);

  // Polling for live status updates
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dominantColor = TAG_COLORS[tags[0]] || EL.CYAN;
  const confirmations = qrData?.confirmations || 0;
  const threshold = qrData?.threshold || 2;
  const isOfficial = qrData?.status === 'official';
  const remainingSeconds = qrData?.remaining_seconds || 0;

  // ═══ GENERATE QR ON MOUNT ═══
  useEffect(() => {
    generateQR();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ═══ START POLLING when we have QR data ═══
  useEffect(() => {
    if (qrData && !isOfficial && qrData.status !== 'annulled') {
      pollRef.current = setInterval(pollStatus, 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [qrData?.status]);

  const generateQR = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await api.qrGenerate({
        challenge_id: challengeId,
        declared_reps: declaredScore.reps,
        declared_seconds: declaredScore.seconds,
        declared_kg: declaredScore.kg,
        total_participants: totalParticipants,
        challenge_type: challengeType
      }, token);
      setQrData(res);
    } catch (err) {
      console.error('QR generate failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, challengeId, declaredScore, totalParticipants, challengeType]);

  const pollStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.qrStatus(challengeId, token);
      setQrData((prev: any) => ({ ...prev, ...res }));

      if (res.status === 'official') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (pollRef.current) clearInterval(pollRef.current);
      }
      if (res.status === 'annulled') {
        if (pollRef.current) clearInterval(pollRef.current);
      }

      // Also fetch participants
      const pRes = await api.qrParticipants(challengeId, token);
      if (pRes?.participants) setParticipants(pRes.participants);
    } catch (err) {
      console.error('Status poll error:', err);
    }
  }, [token, challengeId]);

  // ═══ SCAN QR CODE ═══
  const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (scanned || isValidating) return;
    setScanned(true);
    setIsValidating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    try {
      const res = await api.qrValidate({ qr_token: data }, token!);
      setScanResult(res);
      setPhase('result');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      const msg = err?.message || err?.detail || 'Errore validazione QR';
      Alert.alert('QR Non Valido', msg);
      setScanned(false);
    } finally {
      setIsValidating(false);
    }
  }, [scanned, isValidating, token]);

  // ═══ MANUAL CODE SUBMIT ═══
  const handleManualSubmit = useCallback(async () => {
    if (!manualCode || manualCode.length !== 6 || isValidating) return;
    setIsValidating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const res = await api.qrValidate({ pin_code: manualCode }, token!);
      setScanResult(res);
      setPhase('result');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      const msg = err?.message || err?.detail || 'Codice non valido';
      Alert.alert('Codice Non Valido', msg);
    } finally {
      setIsValidating(false);
    }
  }, [manualCode, isValidating, token]);


  // ═══════════════════════════════════════════
  // RENDER: MY QR CODE (Main Phase)
  // ═══════════════════════════════════════════
  if (phase === 'my_qr') {
    return (
      <View style={s.container}>
        <SafeAreaView style={s.safe}>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

            {/* Header */}
            <Animated.View entering={FadeIn.duration(400)} style={s.header}>
              <Text style={s.headerLabel}>POST-RACE</Text>
              <Text style={s.headerTitle}>VALIDAZIONE</Text>
              <View style={s.tagsRow}>
                {tags.map(t => (
                  <View key={t} style={[s.tagPill, { borderColor: TAG_COLORS[t] || '#555' }]}>
                    <Text style={[s.tagPillText, { color: TAG_COLORS[t] || '#555' }]}>{t}</Text>
                  </View>
                ))}
                <View style={[s.typeBadge, { borderColor: challengeType === 'CLOSED_LIVE' ? EL.CYAN : EL.ORANGE }]}>
                  <Ionicons name={challengeType === 'CLOSED_LIVE' ? 'lock-closed' : 'globe'} size={10} color={challengeType === 'CLOSED_LIVE' ? EL.CYAN : EL.ORANGE} />
                  <Text style={[s.typeBadgeText, { color: challengeType === 'CLOSED_LIVE' ? EL.CYAN : EL.ORANGE }]}>
                    {challengeType === 'CLOSED_LIVE' ? 'CLOSED' : 'OPEN'}
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Status Badge */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ alignItems: 'center', marginBottom: 16 }}>
              <StatusBadge status={qrData?.status || 'provisional'} />
            </Animated.View>

            {/* Progress Ring */}
            <Animated.View entering={FadeInDown.delay(300).duration(500)} style={s.ringSection}>
              <ProgressRing
                confirmations={confirmations}
                threshold={threshold}
                size={170}
                strokeWidth={7}
                color={dominantColor}
              />
              <Text style={s.ringHelp}>
                {isOfficial
                  ? 'Il tuo risultato è stato certificato dalla Crew!'
                  : qrData?.status === 'annulled'
                    ? 'Risultato annullato — nessuna conferma ricevuta in tempo'
                    : `Fai scansionare il tuo QR da ${threshold - confirmations} compagn${threshold - confirmations === 1 ? 'o' : 'i'} per certificare`}
              </Text>
            </Animated.View>

            {/* Declared Score Card */}
            <Animated.View entering={FadeInDown.delay(400).duration(400)} style={[s.scoreCard, { borderColor: dominantColor + '33' }]}>
              <Text style={s.scoreCardTitle}>PUNTEGGIO DICHIARATO</Text>
              <View style={s.scoreRow}>
                {declaredScore.reps > 0 && (
                  <View style={s.scorePiece}>
                    <Text style={[s.scoreValue, { color: dominantColor }]}>{declaredScore.reps}</Text>
                    <Text style={s.scoreUnit}>REP</Text>
                  </View>
                )}
                {declaredScore.seconds > 0 && (
                  <View style={s.scorePiece}>
                    <Text style={[s.scoreValue, { color: dominantColor }]}>{declaredScore.seconds}</Text>
                    <Text style={s.scoreUnit}>SEC</Text>
                  </View>
                )}
                {declaredScore.kg > 0 && (
                  <View style={s.scorePiece}>
                    <Text style={[s.scoreValue, { color: dominantColor }]}>{declaredScore.kg}</Text>
                    <Text style={s.scoreUnit}>KG</Text>
                  </View>
                )}
              </View>
            </Animated.View>

            {/* QR Code Display */}
            {isLoading ? (
              <ActivityIndicator size="large" color={dominantColor} style={{ marginVertical: 30 }} />
            ) : qrData ? (
              <Animated.View entering={FadeInDown.delay(500).duration(500)} style={s.qrSection}>
                <View style={s.qrCard}>
                  <View style={s.qrWrapper}>
                    <QRCode
                      value={qrData.qr_token || 'arenakore'}
                      size={SW * 0.48}
                      backgroundColor="#FFFFFF"
                      color="#000000"
                      quietZone={8}
                    />
                  </View>
                  <View style={s.pinRow}>
                    <Ionicons name="keypad" size={14} color={EL.CYAN} />
                    <Text style={s.pinLabel}>CODICE PIN:</Text>
                    <Text style={s.pinValue}>{qrData.pin_code || '------'}</Text>
                  </View>
                </View>
                <Text style={s.qrHelp}>Mostra questo QR ai compagni di sfida per la validazione</Text>
              </Animated.View>
            ) : null}

            {/* Timer for expiration */}
            {qrData?.status === 'provisional' && remainingSeconds > 0 && (
              <Animated.View entering={FadeIn.duration(300)} style={s.timerCard}>
                <Ionicons name="hourglass-outline" size={14} color="#FFD700" />
                <Text style={s.timerText}>
                  Tempo rimasto: {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
                </Text>
              </Animated.View>
            )}

            {/* Participants List */}
            {participants.length > 0 && (
              <Animated.View entering={FadeInDown.delay(600).duration(400)} style={s.participantsSection}>
                <Text style={s.sectionTitle}>PARTECIPANTI</Text>
                {participants.map((p, idx) => (
                  <View key={idx} style={[s.participantRow, p.is_me && { borderColor: dominantColor + '44' }]}>
                    <View style={[s.participantAvatar, { backgroundColor: dominantColor + '15' }]}>
                      <Ionicons name={p.is_me ? 'person' : 'people-outline'} size={16} color={p.is_me ? dominantColor : '#666'} />
                    </View>
                    <View style={s.participantInfo}>
                      <Text style={[s.participantName, p.is_me && { color: dominantColor }]}>
                        {p.username} {p.is_me ? '(TU)' : ''}
                      </Text>
                      <Text style={s.participantScore}>
                        {p.declared_score?.reps || 0} REP · {p.declared_score?.kg || 0} KG
                      </Text>
                    </View>
                    <View style={[s.participantStatus, { borderColor: p.status === 'official' ? '#34C759' : p.status === 'annulled' ? '#FF3B30' : '#FFD700' }]}>
                      <Text style={[s.participantStatusText, {
                        color: p.status === 'official' ? '#34C759' : p.status === 'annulled' ? '#FF3B30' : '#FFD700'
                      }]}>
                        {p.confirmations}/{p.threshold}
                      </Text>
                    </View>
                  </View>
                ))}
              </Animated.View>
            )}

            {/* FLUX Reward Info */}
            <Animated.View entering={FadeInDown.delay(700).duration(400)} style={s.rewardCard}>
              <FluxIcon size={16} color={EL.CYAN} />
              <Text style={s.rewardText}>
                {isOfficial
                  ? `+${qrData?.flux_earned || 0} FLUX certificati!`
                  : 'Scansiona i QR dei compagni per +5 FLUX ciascuno'}
              </Text>
            </Animated.View>

            {/* Action Buttons */}
            <Animated.View entering={FadeInUp.delay(800).duration(400)} style={s.actions}>
              {!isOfficial && qrData?.status !== 'annulled' && (
                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: dominantColor }]}
                  onPress={() => setPhase('scan')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="qr-code-outline" size={20} color="#000" />
                  <Text style={s.primaryBtnText}>SCANSIONA QR COMPAGNO</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={s.secondaryBtn} onPress={onComplete} activeOpacity={0.8}>
                <Text style={s.secondaryBtnText}>
                  {isOfficial ? 'TORNA AL NEXUS' : 'CHIUDI (Attendi conferme in background)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.backBtn} onPress={onBack}>
                <Ionicons name="arrow-back" size={14} color="#555" />
                <Text style={s.backText}>INDIETRO</Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }


  // ═══════════════════════════════════════════
  // RENDER: CAMERA SCANNER
  // ═══════════════════════════════════════════
  if (phase === 'scan') {
    const hasPermission = permission?.granted;

    return (
      <View style={s.container}>
        <SafeAreaView style={s.safe}>
          <Animated.View entering={FadeIn.duration(400)} style={s.scanContent}>

            <Text style={s.scanTitle}>SCANSIONA QR KORE</Text>
            <Text style={s.scanSub}>Inquadra il QR code del tuo compagno di sfida</Text>

            {/* Camera View */}
            <View style={s.cameraContainer}>
              {hasPermission && CameraViewLazy ? (
                <View style={s.camera}>
                  <CameraViewLazy
                    style={StyleSheet.absoluteFillObject}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  />
                  {/* Scan overlay frame */}
                  <View style={s.scanOverlay}>
                    <View style={s.scanFrame}>
                      <View style={[s.scanCorner, s.scanCornerTL]} />
                      <View style={[s.scanCorner, s.scanCornerTR]} />
                      <View style={[s.scanCorner, s.scanCornerBL]} />
                      <View style={[s.scanCorner, s.scanCornerBR]} />
                    </View>
                    {isValidating && (
                      <View style={s.scanLoadingOverlay}>
                        <ActivityIndicator size="large" color={EL.CYAN} />
                        <Text style={s.scanLoadingText}>VALIDAZIONE...</Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <View style={s.noCameraCard}>
                  <Ionicons name="camera-outline" size={48} color="#555" />
                  <Text style={s.noCameraText}>Camera non disponibile</Text>
                  <TouchableOpacity style={[s.grantBtn, { backgroundColor: dominantColor }]} onPress={requestPermission}>
                    <Text style={s.grantBtnText}>CONCEDI PERMESSO</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {scanned && !isValidating && (
              <TouchableOpacity
                style={[s.rescanBtn, { borderColor: dominantColor }]}
                onPress={() => setScanned(false)}
              >
                <Ionicons name="refresh" size={16} color={dominantColor} />
                <Text style={[s.rescanBtnText, { color: dominantColor }]}>SCANSIONA DI NUOVO</Text>
              </TouchableOpacity>
            )}

            {/* Fallback: Manual Code Entry */}
            <TouchableOpacity
              style={s.fallbackToggle}
              onPress={() => setPhase('manual_code')}
              activeOpacity={0.7}
            >
              <Ionicons name="help-circle-outline" size={14} color="#8E8E93" />
              <Text style={s.fallbackText}>Problemi con la camera? Inserisci il codice</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.backBtn} onPress={() => { setPhase('my_qr'); setScanned(false); }}>
              <Ionicons name="arrow-back" size={14} color="#555" />
              <Text style={s.backText}>TORNA AL MIO QR</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }


  // ═══════════════════════════════════════════
  // RENDER: MANUAL CODE ENTRY (Fallback)
  // ═══════════════════════════════════════════
  if (phase === 'manual_code') {
    return (
      <View style={s.container}>
        <SafeAreaView style={s.safe}>
          <Animated.View entering={FadeIn.duration(400)} style={s.manualContent}>
            <Ionicons name="keypad" size={48} color={dominantColor} />
            <Text style={s.manualTitle}>INSERISCI CODICE PIN</Text>
            <Text style={s.manualSub}>Chiedi al tuo compagno il codice a 6 cifre mostrato sotto il QR</Text>

            <TextInput
              style={[s.pinInput, { borderColor: manualCode.length === 6 ? dominantColor : '#333' }]}
              value={manualCode}
              onChangeText={(t) => setManualCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor="#333"
              keyboardType="numeric"
              maxLength={6}
              textAlign="center"
            />

            <Text style={s.pinDigitCount}>{manualCode.length}/6</Text>

            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: dominantColor, opacity: manualCode.length === 6 ? 1 : 0.4 }]}
              onPress={handleManualSubmit}
              disabled={manualCode.length !== 6 || isValidating}
              activeOpacity={0.85}
            >
              {isValidating ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="checkmark-circle" size={18} color="#000" />
              )}
              <Text style={s.primaryBtnText}>{isValidating ? 'VALIDAZIONE...' : 'CONFERMA'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.backBtn} onPress={() => { setPhase('scan'); setManualCode(''); }}>
              <Ionicons name="arrow-back" size={14} color="#555" />
              <Text style={s.backText}>TORNA ALLO SCANNER</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }


  // ═══════════════════════════════════════════
  // RENDER: SCAN RESULT FEEDBACK
  // ═══════════════════════════════════════════
  if (phase === 'result' && scanResult) {
    return (
      <View style={s.container}>
        <SafeAreaView style={s.safe}>
          <Animated.View entering={FadeIn.duration(500)} style={s.resultContent}>

            <Animated.View entering={FadeInDown.delay(100).springify().damping(10)}>
              <View style={[s.resultIcon, { backgroundColor: '#34C75915' }]}>
                <Ionicons name="checkmark-circle" size={56} color="#34C759" />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250).duration(400)}>
              <Text style={s.resultTitle}>CONFERMA REGISTRATA!</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).duration(400)} style={[s.resultCard, { borderColor: dominantColor + '33' }]}>
              <View style={s.resultRow}>
                <Text style={s.resultLabel}>KORE CONFERMATO</Text>
                <Text style={[s.resultValue, { color: dominantColor }]}>{scanResult.target_user}</Text>
              </View>
              <View style={s.resultDivider} />
              <View style={s.resultRow}>
                <Text style={s.resultLabel}>STATO</Text>
                <Text style={[s.resultValue, { color: scanResult.target_official ? '#34C759' : '#FFD700' }]}>
                  {scanResult.target_official ? 'UFFICIALE ✓' : `${scanResult.confirmations}/${scanResult.threshold}`}
                </Text>
              </View>
              <View style={s.resultDivider} />
              <View style={s.resultRow}>
                <Text style={s.resultLabel}>IL TUO REWARD</Text>
                <View style={s.resultFlux}>
                  <FluxIcon size={14} color={EL.CYAN} />
                  <Text style={[s.resultFluxValue, { color: EL.CYAN }]}>+{scanResult.scanner_flux_reward}</Text>
                  <Text style={s.resultFluxLabel}>FLUX</Text>
                </View>
              </View>
            </Animated.View>

            {scanResult.target_official && (
              <Animated.View entering={FadeInDown.delay(600).duration(400)} style={s.officialBanner}>
                <Ionicons name="trophy" size={18} color="#FFD700" />
                <Text style={s.officialBannerText}>
                  Hai contribuito a certificare il risultato di {scanResult.target_user}!
                </Text>
              </Animated.View>
            )}

            <Animated.View entering={FadeInUp.delay(700).duration(400)} style={s.actions}>
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: dominantColor }]}
                onPress={() => { setPhase('my_qr'); setScanResult(null); setScanned(false); setManualCode(''); pollStatus(); }}
                activeOpacity={0.85}
              >
                <Ionicons name="arrow-back" size={18} color="#000" />
                <Text style={s.primaryBtnText}>TORNA AL MIO QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.secondaryBtn}
                onPress={() => { setPhase('scan'); setScanResult(null); setScanned(false); }}
                activeOpacity={0.8}
              >
                <Text style={s.secondaryBtnText}>SCANSIONA UN ALTRO</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  return null;
}


// ═══════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════

// Progress Ring styles
const pr = StyleSheet.create({
  ringCount: { fontFamily: FONT_JAKARTA, color: '#FFFFFF', fontSize: 48, fontWeight: '800', letterSpacing: 1 },
  ringDivider: { fontFamily: FONT_MONT, color: '#555', fontSize: 18, fontWeight: '600', marginTop: -6 },
  ringLabel: { fontFamily: FONT_MONT, color: '#FFD700', fontSize: 11, fontWeight: '800', letterSpacing: 3, marginTop: 4 }
});

// Status Badge styles
const sb = StyleSheet.create({
  container: { position: 'relative' as const, alignItems: 'center' },
  glowBg: { position: 'absolute' as const, width: 140, height: 36, borderRadius: 18 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 7
  },
  text: { fontFamily: FONT_JAKARTA, fontSize: 13, fontWeight: '800', letterSpacing: 3 }
});

// Main styles
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 16 },

  header: { alignItems: 'center', gap: 4, marginBottom: 12 },
  headerLabel: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 12, fontWeight: '600', letterSpacing: 3 },
  headerTitle: { fontFamily: FONT_JAKARTA, color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: 4 },
  tagsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  tagPill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  tagPillText: { fontFamily: FONT_MONT, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontFamily: FONT_MONT, fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  ringSection: { alignItems: 'center', gap: 12, marginBottom: 20 },
  ringHelp: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '400', textAlign: 'center', paddingHorizontal: 20, lineHeight: 19 },

  scoreCard: { backgroundColor: EL.CARD_BG, borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20, alignItems: 'center', gap: 8 },
  scoreCardTitle: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 11, fontWeight: '600', letterSpacing: 2 },
  scoreRow: { flexDirection: 'row', gap: 24 },
  scorePiece: { alignItems: 'center', gap: 2 },
  scoreValue: { fontFamily: FONT_JAKARTA, fontSize: 32, fontWeight: '800' },
  scoreUnit: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 10, fontWeight: '600', letterSpacing: 2 },

  qrSection: { alignItems: 'center', gap: 10, marginBottom: 16 },
  qrCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center', gap: 12 },
  qrWrapper: { borderRadius: 8, overflow: 'hidden' },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: EL.CARD_BG, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  pinLabel: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  pinValue: { fontFamily: FONT_JAKARTA, color: EL.CYAN, fontSize: 18, fontWeight: '800', letterSpacing: 4 },
  qrHelp: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '400', textAlign: 'center' },

  timerCard: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 16 },
  timerText: { fontFamily: FONT_MONT, color: '#FFD700', fontSize: 13, fontWeight: '600' },

  participantsSection: { marginBottom: 16, gap: 8 },
  sectionTitle: { fontFamily: FONT_JAKARTA, color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  participantRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: EL.CARD_BG, borderRadius: 12, borderWidth: 1, borderColor: EL.BORDER,
    padding: 12
  },
  participantAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  participantInfo: { flex: 1, gap: 2 },
  participantName: { fontFamily: FONT_MONT, color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  participantScore: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 11, fontWeight: '500' },
  participantStatus: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  participantStatusText: { fontFamily: FONT_JAKARTA, fontSize: 12, fontWeight: '800' },

  rewardCard: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 20, paddingVertical: 8 },
  rewardText: { fontFamily: FONT_MONT, color: EL.CYAN, fontSize: 13, fontWeight: '600' },

  actions: { gap: 10, marginBottom: 8 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 16
  },
  primaryBtnText: { fontFamily: FONT_JAKARTA, color: '#000000', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  secondaryBtn: {
    borderRadius: 12, borderWidth: 1, borderColor: '#333',
    paddingVertical: 14, alignItems: 'center'
  },
  secondaryBtnText: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  backText: { fontFamily: FONT_MONT, color: '#555', fontSize: 13, fontWeight: '800', letterSpacing: 2 },

  // Scanner styles
  scanContent: { flex: 1, paddingHorizontal: 24, paddingTop: 16, alignItems: 'center', gap: 12 },
  scanTitle: { fontFamily: FONT_JAKARTA, color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: 3 },
  scanSub: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '400', textAlign: 'center' },
  cameraContainer: {
    width: SW - 64, height: SW - 64, borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#0A0A0A', marginVertical: 12
  },
  camera: { flex: 1 },
  scanOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: {
    width: 200, height: 200,
    position: 'relative' as const
  },
  scanCorner: {
    position: 'absolute' as const,
    width: 30, height: 30,
    borderColor: EL.CYAN
  },
  scanCornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  scanCornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  scanCornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  scanCornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  scanLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', gap: 8
  },
  scanLoadingText: { fontFamily: FONT_MONT, color: EL.CYAN, fontSize: 12, fontWeight: '900', letterSpacing: 3 },

  noCameraCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: EL.CARD_BG
  },
  noCameraText: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 14, fontWeight: '500' },
  grantBtn: { borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  grantBtnText: { fontFamily: FONT_MONT, color: '#000', fontSize: 13, fontWeight: '800', letterSpacing: 1 },

  rescanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10
  },
  rescanBtnText: { fontFamily: FONT_MONT, fontSize: 13, fontWeight: '700', letterSpacing: 1 },

  fallbackToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  fallbackText: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 12, fontWeight: '500' },

  // Manual code styles
  manualContent: { flex: 1, paddingHorizontal: 24, paddingTop: 40, alignItems: 'center', gap: 12 },
  manualTitle: { fontFamily: FONT_JAKARTA, color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: 3, marginTop: 8 },
  manualSub: { fontFamily: FONT_MONT, color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '400', textAlign: 'center', paddingHorizontal: 20 },
  pinInput: {
    backgroundColor: EL.CARD_BG, borderWidth: 2, borderRadius: 16,
    color: '#FFFFFF', fontSize: 36, fontWeight: '800',
    fontFamily: FONT_JAKARTA, letterSpacing: 12,
    paddingVertical: 18, paddingHorizontal: 30,
    width: '80%', marginTop: 16
  },
  pinDigitCount: { fontFamily: FONT_MONT, color: '#555', fontSize: 12, fontWeight: '600' },

  // Result styles
  resultContent: { flex: 1, paddingHorizontal: 24, paddingTop: 32, alignItems: 'center', gap: 16 },
  resultIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontFamily: FONT_JAKARTA, color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: 3 },
  resultCard: { backgroundColor: EL.CARD_BG, borderRadius: 14, borderWidth: 1, padding: 16, width: '100%', gap: 12 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultLabel: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  resultValue: { fontFamily: FONT_JAKARTA, fontSize: 16, fontWeight: '800' },
  resultDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  resultFlux: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultFluxValue: { fontFamily: FONT_JAKARTA, fontSize: 18, fontWeight: '800' },
  resultFluxLabel: { fontFamily: FONT_MONT, color: '#8E8E93', fontSize: 11, fontWeight: '600', letterSpacing: 1 },

  officialBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    width: '100%'
  },
  officialBannerText: { fontFamily: FONT_MONT, color: '#FFD700', fontSize: 13, fontWeight: '500', flex: 1 }
});
