/**
 * ARENAKORE — QR KORE CHECK-IN SCANNER (Build 38 · Prompt 5)
 * ═══════════════════════════════════════════════════════════════
 * Athlete-facing QR scanner for physical gym check-in.
 * 
 * Flow:
 *   1. Camera opens → Scan QR → Validate with backend
 *   2. Success → NEON-ELITE celebration with Green K-Flux rain
 *   3. Already checked in → Friendly message
 *   4. Error → Red badge with retry
 * 
 * Aesthetic: Full-screen camera with brutalist HUD overlay
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform, Dimensions, StatusBar, Vibration,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn, FadeInDown, FadeInUp, FadeOut, ZoomIn,
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, withDelay, runOnJS, Easing,
} from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

// Deferred camera load
function getCameraModule() {
  try { return require('expo-camera'); } catch { return null; }
}

// Deferred location
function getLocationModule() {
  try { return require('expo-location'); } catch { return null; }
}

const { width: SW, height: SH } = Dimensions.get('window');
const SCAN_SIZE = SW * 0.65;
const GREEN = '#00FF87';
const CYAN = '#00E5FF';
const GOLD = '#FFD700';

// ═══════════════════════════════════════════════════════════════
// K-FLUX RAIN PARTICLE — Individual animated flux droplet
// ═══════════════════════════════════════════════════════════════
function FluxParticle({ index, total }: { index: number; total: number }) {
  const startX = Math.random() * SW;
  const delay = index * 80;
  const duration = 1800 + Math.random() * 1200;
  const size = 4 + Math.random() * 6;

  const translateY = useSharedValue(-50);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(delay, withTiming(SH + 50, { duration, easing: Easing.in(Easing.ease) }));
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(duration * 0.6, withTiming(0, { duration: duration * 0.4 }))
    ));
    scale.value = withDelay(delay, withSequence(
      withTiming(1.2, { duration: 200 }),
      withTiming(1, { duration: 300 })
    ));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[
      { position: 'absolute', left: startX, top: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: GREEN },
      animStyle,
    ]} />
  );
}

// ═══════════════════════════════════════════════════════════════
// SUCCESS CELEBRATION — Neon-Elite Full-Screen Overlay
// ═══════════════════════════════════════════════════════════════
function CheckinSuccessOverlay({ hubName, fluxEarned, streak, bonusActive, onDismiss }: {
  hubName: string; fluxEarned: number; streak: number; bonusActive: boolean; onDismiss: () => void;
}) {
  const glowOpacity = useSharedValue(0);
  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(withTiming(0.4, { duration: 800 }), withTiming(0.1, { duration: 800 })),
      -1, true
    );
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, []);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <View style={cs.overlay}>
      {/* K-Flux Rain */}
      {Array.from({ length: 30 }).map((_, i) => (
        <FluxParticle key={i} index={i} total={30} />
      ))}

      {/* Green radial glow */}
      <Animated.View style={[cs.radialGlow, glowStyle]} />

      {/* Content */}
      <View style={cs.content}>
        {/* Checkmark */}
        <Animated.View entering={ZoomIn.duration(400).delay(200)} style={cs.checkCircle}>
          <Ionicons name="checkmark" size={48} color="#000" />
        </Animated.View>

        {/* Title */}
        <Animated.Text entering={FadeInDown.duration(400).delay(400)} style={cs.title}>
          CHECK-IN{'\n'}REGISTRATO
        </Animated.Text>

        {/* Hub Name */}
        <Animated.View entering={FadeInDown.duration(400).delay(500)} style={cs.hubBadge}>
          <Ionicons name="location" size={14} color={GREEN} />
          <Text style={cs.hubName}>{hubName.toUpperCase()}</Text>
        </Animated.View>

        {/* Flux Earned — BIG */}
        <Animated.View entering={FadeInUp.duration(500).delay(600)} style={cs.fluxBox}>
          <Text style={cs.fluxPlus}>+</Text>
          <Text style={cs.fluxValue}>{fluxEarned}</Text>
          <View style={{ gap: 2, marginLeft: 8 }}>
            <Text style={cs.fluxLabel}>K-FLUX</Text>
            <Text style={cs.fluxSub}>VERDI</Text>
          </View>
        </Animated.View>

        {/* Streak */}
        <Animated.View entering={FadeInDown.duration(400).delay(800)} style={cs.streakRow}>
          <Ionicons name="flame" size={18} color={GOLD} />
          <Text style={cs.streakText}>STREAK: {streak} GIORNI</Text>
          {bonusActive && (
            <View style={cs.bonusBadge}>
              <Text style={cs.bonusText}>1.5x BONUS!</Text>
            </View>
          )}
        </Animated.View>

        {/* Dismiss */}
        <Animated.View entering={FadeIn.duration(300).delay(1200)}>
          <TouchableOpacity style={cs.dismissBtn} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={cs.dismissText}>CONTINUA</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 100, justifyContent: 'center', alignItems: 'center' },
  radialGlow: {
    position: 'absolute', width: SW * 1.5, height: SW * 1.5, borderRadius: SW * 0.75,
    backgroundColor: 'rgba(0,255,135,0.03)', top: SH * 0.1,
  },
  content: { alignItems: 'center', gap: 16, zIndex: 10 },
  checkCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: GREEN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20 },
      android: { elevation: 12 },
      default: {},
    }),
  },
  title: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: 3, textAlign: 'center', lineHeight: 40 },
  hubBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,255,135,0.08)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(0,255,135,0.2)',
  },
  hubName: { color: GREEN, fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  fluxBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,255,135,0.06)', borderRadius: 20, paddingHorizontal: 28, paddingVertical: 16,
    borderWidth: 2, borderColor: 'rgba(0,255,135,0.3)', marginTop: 8,
  },
  fluxPlus: { color: GREEN, fontSize: 36, fontWeight: '300' },
  fluxValue: { color: GREEN, fontSize: 56, fontWeight: '900', letterSpacing: -2 },
  fluxLabel: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  fluxSub: { color: GREEN, fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  streakText: { color: GOLD, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  bonusBadge: { backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  bonusText: { color: GOLD, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  dismissBtn: {
    backgroundColor: GREEN, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 16, marginTop: 20,
  },
  dismissText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
});

// ═══════════════════════════════════════════════════════════════
// ALREADY CHECKED OVERLAY
// ═══════════════════════════════════════════════════════════════
function AlreadyCheckedOverlay({ hubName, onDismiss }: { hubName: string; onDismiss: () => void }) {
  return (
    <View style={[cs.overlay, { backgroundColor: 'rgba(0,0,0,0.88)' }]}>
      <View style={cs.content}>
        <Animated.View entering={ZoomIn.duration(300)} style={[cs.checkCircle, { backgroundColor: CYAN }]}>
          <Ionicons name="checkmark-done" size={40} color="#000" />
        </Animated.View>
        <Animated.Text entering={FadeInDown.duration(300).delay(200)} style={[cs.title, { fontSize: 24, color: CYAN }]}>
          GIÀ REGISTRATO{'\n'}OGGI
        </Animated.Text>
        <Animated.View entering={FadeInDown.duration(300).delay(300)} style={[cs.hubBadge, { borderColor: 'rgba(0,229,255,0.2)', backgroundColor: 'rgba(0,229,255,0.08)' }]}>
          <Ionicons name="location" size={14} color={CYAN} />
          <Text style={[cs.hubName, { color: CYAN }]}>{hubName.toUpperCase()}</Text>
        </Animated.View>
        <Animated.Text entering={FadeIn.duration(300).delay(400)} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 }}>
          Hai già registrato la tua presenza oggi. Torna domani per continuare la streak!
        </Animated.Text>
        <TouchableOpacity style={[cs.dismissBtn, { backgroundColor: CYAN }]} onPress={onDismiss} activeOpacity={0.8}>
          <Text style={cs.dismissText}>OK, CAPITO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN SCANNER COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function QRCheckinScanner() {
  const { token, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [CameraViewComp, setCameraViewComp] = useState<any>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAlready, setShowAlready] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const processedRef = useRef(false);

  // Scan line animation
  const scanLineY = useSharedValue(0);
  useEffect(() => {
    scanLineY.value = withRepeat(
      withSequence(
        withTiming(SCAN_SIZE - 4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ), -1, false
    );
  }, []);
  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  // Initialize camera
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = getCameraModule();
        if (!mod || !mounted) return;
        setCameraViewComp(() => mod.CameraView);
        const result = await (mod.Camera?.requestCameraPermissionsAsync?.() || mod.requestCameraPermissionsAsync?.());
        if (mounted && result?.granted) {
          setPermissionGranted(true);
          setScanning(true);
        }
      } catch (e) {
        console.warn('[QRCheckin] Camera init failed:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleBarCodeScanned = useCallback(async (result: any) => {
    if (processedRef.current || loading) return;

    const raw = result.data || '';
    if (!raw.startsWith('arenakore://checkin/')) {
      // Not a check-in QR — ignore silently
      return;
    }

    processedRef.current = true;
    setScanning(false);
    setLoading(true);
    setError(null);

    // Haptic feedback
    try { Vibration.vibrate(50); } catch {}

    try {
      // Get current location (optional)
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const locMod = getLocationModule();
        if (locMod) {
          const { status } = await locMod.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await locMod.getCurrentPositionAsync({ accuracy: locMod.Accuracy?.Balanced || 3 });
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
          }
        }
      } catch {}

      // Call backend
      const res = await api.scanCheckin({ qr_payload: raw, latitude: lat, longitude: lng }, token!);

      if (res.already_checked_in) {
        setShowAlready(true);
        setSuccessData({ hub_name: res.hub_name || 'Hub' });
      } else if (res.success) {
        setShowSuccess(true);
        setSuccessData({
          hub_name: res.hub_name || 'Hub',
          flux_earned: res.flux_earned || 50,
          streak: res.streak || 1,
          bonus_active: res.bonus_active || false,
        });
        // Haptic feedback for success
        try { Vibration.vibrate([0, 100, 50, 100]); } catch {}
      }
    } catch (err: any) {
      setError(err?.message || 'Errore durante il check-in');
      setTimeout(() => {
        processedRef.current = false;
        setError(null);
        setScanning(true);
      }, 3000);
    } finally {
      setLoading(false);
    }
  }, [token, loading]);

  const handleDismissSuccess = () => {
    setShowSuccess(false);
    setShowAlready(false);
    setSuccessData(null);
    router.back();
  };

  const handleReset = () => {
    processedRef.current = false;
    setError(null);
    setScanning(true);
  };

  // Web fallback
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>QR CHECK-IN</Text>
        </View>
        <View style={s.webFallback}>
          <Ionicons name="scan" size={64} color="rgba(0,255,135,0.15)" />
          <Text style={s.webFallbackTitle}>SCANSIONE DISPONIBILE SOLO SU MOBILE</Text>
          <Text style={s.webFallbackDesc}>
            Apri l'app ARENAKORE sul tuo telefono per scansionare il QR Check-in del tuo Hub.
          </Text>
          <TouchableOpacity style={s.webBackBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={s.webBackText}>TORNA INDIETRO</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={s.safe}>
      <StatusBar barStyle="light-content" />

      {/* Camera */}
      {permissionGranted && CameraViewComp ? (
        <CameraViewComp
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color={GREEN} size="large" />
          <Text style={{ color: 'rgba(255,255,255,0.3)', marginTop: 8, fontSize: 13, fontWeight: '700' }}>
            {!permissionGranted ? 'AUTORIZZAZIONE CAMERA...' : 'CARICAMENTO...'}
          </Text>
        </View>
      )}

      {/* HUD Overlay */}
      <View style={s.hudOverlay} pointerEvents="box-none">
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>QR CHECK-IN</Text>
            <Text style={s.headerSub}>SCANSIONA IL QR DEL TUO HUB</Text>
          </View>
          <View style={s.scanBadge}>
            <View style={[s.scanDot, scanning && { backgroundColor: GREEN }]} />
            <Text style={[s.scanBadgeText, scanning && { color: GREEN }]}>
              {scanning ? 'ATTIVO' : loading ? 'VERIFICA...' : 'PAUSA'}
            </Text>
          </View>
        </View>

        {/* Scan Frame */}
        <View style={s.scanCenter}>
          <View style={s.scanFrame}>
            {/* Animated scan line */}
            {scanning && (
              <Animated.View style={[s.scanLine, scanLineStyle]} />
            )}
            {/* Corner brackets */}
            <View style={[s.corner, s.cTL]} />
            <View style={[s.corner, s.cTR]} />
            <View style={[s.corner, s.cBL]} />
            <View style={[s.corner, s.cBR]} />
          </View>

          {/* Loading indicator */}
          {loading && (
            <Animated.View entering={FadeIn.duration(200)} style={s.loadingBubble}>
              <ActivityIndicator color={GREEN} size="small" />
              <Text style={s.loadingText}>VERIFICA CHECK-IN...</Text>
            </Animated.View>
          )}

          {/* Error */}
          {error && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={s.errorBubble}>
              <Ionicons name="close-circle" size={16} color="#FF3B30" />
              <Text style={s.errorText}>{error}</Text>
            </Animated.View>
          )}
        </View>

        {/* Bottom hint */}
        <View style={[s.bottomHint, { paddingBottom: insets.bottom + 20 }]}>
          <Ionicons name="information-circle" size={16} color="rgba(255,255,255,0.2)" />
          <Text style={s.hintText}>
            Inquadra il QR KORE CHECK-IN mostrato dal tuo Hub
          </Text>
        </View>
      </View>

      {/* Success Overlay */}
      {showSuccess && successData && (
        <CheckinSuccessOverlay
          hubName={successData.hub_name}
          fluxEarned={successData.flux_earned}
          streak={successData.streak}
          bonusActive={successData.bonus_active}
          onDismiss={handleDismissSuccess}
        />
      )}

      {/* Already Checked Overlay */}
      {showAlready && successData && (
        <AlreadyCheckedOverlay
          hubName={successData.hub_name}
          onDismiss={handleDismissSuccess}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  hudOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, gap: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  headerSub: { color: 'rgba(0,255,135,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 1 },
  scanBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  scanDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  scanBadgeText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },

  // Scan frame
  scanCenter: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16 },
  scanFrame: {
    width: SCAN_SIZE, height: SCAN_SIZE, position: 'relative',
  },
  scanLine: {
    position: 'absolute', left: 4, right: 4, height: 2,
    backgroundColor: GREEN, borderRadius: 1,
    ...Platform.select({
      ios: { shadowColor: GREEN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8 },
      default: {},
    }),
  },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: GREEN },
  cTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  cTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },

  loadingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(0,255,135,0.2)',
  },
  loadingText: { color: GREEN, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  errorBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,59,48,0.15)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,59,48,0.3)',
  },
  errorText: { color: '#FF3B30', fontSize: 13, fontWeight: '800', letterSpacing: 1 },

  // Bottom
  bottomHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 24, paddingTop: 16, backgroundColor: 'rgba(0,0,0,0.5)',
  },
  hintText: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },

  // Web fallback
  webFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  webFallbackTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  webFallbackDesc: { color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  webBackBtn: { backgroundColor: 'rgba(0,255,135,0.1)', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(0,255,135,0.2)', marginTop: 8 },
  webBackText: { color: GREEN, fontSize: 14, fontWeight: '800', letterSpacing: 2 },
});
