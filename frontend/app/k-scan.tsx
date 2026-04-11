/**
 * K-SCAN — Puppet Motion Scan (Build 35)
 * ═══════════════════════════════════════════
 * Full-screen WebView scanner with MediaPipe skeleton overlay.
 * Phases: LOADING → POSITIONING → SCANNING → ANALYZING → RESULTS
 * Results feed into K-Rating Bio-Bonus.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ActivityIndicator, Platform, Dimensions, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { api, BACKEND_BASE } from '../utils/api';
import Animated, { FadeIn, FadeInDown, FadeOut, SlideInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';

const { width: SW, height: SH } = Dimensions.get('window');
const CYAN = '#00E5FF';
const GOLD = '#FFD700';
const RED = '#FF3B30';

type ScanPhase = 'idle' | 'loading' | 'positioning' | 'scanning' | 'analyzing' | 'results';

export default function KScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();
  const webViewRef = useRef<WebView>(null);

  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [visibleCount, setVisibleCount] = useState(0);
  const [centered, setCentered] = useState(false);
  const [feetVisible, setFeetVisible] = useState(false);
  const [scanTimer, setScanTimer] = useState(0);
  const [scanData, setScanData] = useState<any>(null);
  const [resultSaved, setResultSaved] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scanStartRef = useRef<number>(0);
  const stableFramesRef = useRef(0);
  const landmarksBufferRef = useRef<any[]>([]);
  const timerRef = useRef<any>(null);

  // Pulse animation for scan border
  const pulse = useSharedValue(0.3);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(0,229,255,${pulse.value})`,
  }));

  const SCANNER_URL = `${BACKEND_BASE}/api/nexus/scanner`;

  // Start scan
  const startScan = () => {
    setPhase('loading');
    setCameraError(null);
    stableFramesRef.current = 0;
    landmarksBufferRef.current = [];
    setScanTimer(0);
    setScanData(null);
    setResultSaved(false);
  };

  // Handle messages from WebView
  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'ready') {
        setPhase('positioning');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }

      if (data.type === 'camera_denied') {
        setCameraError('Accesso camera negato. Abilita nelle Impostazioni.');
        setPhase('idle');
      }

      if (data.type === 'error') {
        if (data.message === 'camera_hang') {
          // Auto-recovery
        } else {
          setCameraError(data.message || 'Errore scanner');
        }
      }

      if (data.type === 'pose') {
        setVisibleCount(data.visible_count || 0);
        setCentered(data.centered || false);
        setFeetVisible(data.feet_visible || false);

        if (phase === 'positioning' && data.person_detected && data.centered) {
          stableFramesRef.current++;
          if (stableFramesRef.current >= 8) {
            // Person stable & centered → start scanning
            setPhase('scanning');
            scanStartRef.current = Date.now();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            // Start timer
            timerRef.current = setInterval(() => {
              const elapsed = Math.floor((Date.now() - scanStartRef.current) / 1000);
              setScanTimer(elapsed);
              if (elapsed >= 10) {
                clearInterval(timerRef.current);
                setPhase('analyzing');
              }
            }, 500);
          }
        } else if (phase === 'positioning') {
          stableFramesRef.current = Math.max(0, stableFramesRef.current - 1);
        }

        // Collect landmarks during scanning
        if (phase === 'scanning' && data.landmarks && data.landmarks.length > 0) {
          landmarksBufferRef.current.push({
            landmarks: data.landmarks,
            visible_count: data.visible_count,
            centered: data.centered,
            feet_visible: data.feet_visible,
            ts: Date.now(),
          });
        }
      }
    } catch (e) {
      // Silent
    }
  }, [phase]);

  // Analyze collected data
  useEffect(() => {
    if (phase !== 'analyzing') return;
    const analyze = async () => {
      const frames = landmarksBufferRef.current;
      if (frames.length < 5) {
        setPhase('results');
        setScanData({ kore_score: 50, stability: 40, amplitude: 40, error: 'Dati insufficienti' });
        return;
      }

      // Calculate metrics from landmark buffer
      const avgVisible = frames.reduce((s, f) => s + f.visible_count, 0) / frames.length;
      const centeredPct = frames.filter(f => f.centered).length / frames.length;
      const feetPct = frames.filter(f => f.feet_visible).length / frames.length;

      // Stability: variance of nose position across frames
      const nosePositions = frames
        .filter(f => f.landmarks[0])
        .map(f => ({ x: f.landmarks[0].x, y: f.landmarks[0].y }));

      let stability = 70;
      if (nosePositions.length > 3) {
        const avgX = nosePositions.reduce((s, p) => s + p.x, 0) / nosePositions.length;
        const avgY = nosePositions.reduce((s, p) => s + p.y, 0) / nosePositions.length;
        const variance = nosePositions.reduce((s, p) =>
          s + Math.pow(p.x - avgX, 2) + Math.pow(p.y - avgY, 2), 0) / nosePositions.length;
        stability = Math.min(100, Math.max(20, 100 - variance * 8000));
      }

      // Amplitude: range of motion (shoulder-to-hip ratio changes)
      let amplitude = 60;
      const shoulderFrames = frames
        .filter(f => f.landmarks[5] && f.landmarks[6] && f.landmarks[11] && f.landmarks[12])
        .map(f => {
          const sw = Math.abs(f.landmarks[5].x - f.landmarks[6].x);
          const hw = Math.abs(f.landmarks[11].x - f.landmarks[12].x);
          return sw + hw;
        });
      if (shoulderFrames.length > 3) {
        const range = Math.max(...shoulderFrames) - Math.min(...shoulderFrames);
        amplitude = Math.min(100, Math.max(20, 50 + range * 500));
      }

      // Kore Score from scan
      const koreRaw = (stability * 0.4 + amplitude * 0.3 + centeredPct * 100 * 0.15 + feetPct * 100 * 0.15);
      const koreScore = Math.min(100, Math.max(10, Math.round(koreRaw)));

      const result = {
        kore_score: koreScore,
        stability: Math.round(stability),
        amplitude: Math.round(amplitude),
        centered_pct: Math.round(centeredPct * 100),
        feet_pct: Math.round(feetPct * 100),
        avg_keypoints: Math.round(avgVisible),
        frames_analyzed: frames.length,
      };

      setScanData(result);
      setPhase('results');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Save to backend
      if (token) {
        try {
          await api.saveScanResult({
            kore_score: koreScore,
            stability: Math.round(stability),
            amplitude: Math.round(amplitude),
          }, token);
          setResultSaved(true);
        } catch (e) {
          console.warn('[K-SCAN] Save failed:', e);
        }
      }
    };
    setTimeout(analyze, 1500);
  }, [phase, token]);

  // Cleanup
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ═══ IDLE STATE ═══
  if (phase === 'idle') {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#000', '#050510', '#000']} style={s.idleGradient}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={s.idleCenter}>
            <Animated.View entering={FadeInDown.duration(600)}>
              <View style={s.scanIconWrap}>
                <Ionicons name="body" size={64} color={CYAN} />
              </View>
              <Text style={s.idleTitle}>K-SCAN</Text>
              <Text style={s.idleSub}>Analisi biometrica in tempo reale</Text>
              <Text style={s.idleDesc}>
                Il Puppet Motion Scan traccia il tuo scheletro digitale{"\n"}
                per calcolare postura, mobilità e reattività.
              </Text>
            </Animated.View>

            <TouchableOpacity style={s.startBtn} activeOpacity={0.85} onPress={startScan}>
              <LinearGradient colors={[CYAN, '#0088AA']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.startBtnGrad}>
                <Ionicons name="scan" size={22} color="#000" />
                <Text style={s.startBtnText}>AVVIA K-SCAN</Text>
              </LinearGradient>
            </TouchableOpacity>

            {cameraError && (
              <Animated.View entering={FadeIn.duration(300)} style={s.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={RED} />
                <Text style={s.errorText}>{cameraError}</Text>
              </Animated.View>
            )}
          </View>

          <Text style={s.idleFooter}>PUPPET MOTION TRACKING · BUILD 35</Text>
        </LinearGradient>
      </View>
    );
  }

  // ═══ RESULTS STATE ═══
  if (phase === 'results' && scanData) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#000', '#001A1A', '#000']} style={s.resultsGrad}>
          <TouchableOpacity style={[s.backBtn, { top: insets.top + 10 }]} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={s.resultsCenter}>
            <Text style={s.resultsLabel}>BIO-SCAN COMPLETATO</Text>

            {/* Big Score */}
            <View style={s.bigScoreWrap}>
              <Text style={s.bigScoreValue}>{scanData.kore_score}</Text>
              <Text style={s.bigScoreMax}>/100</Text>
            </View>

            {/* Metrics Grid */}
            <View style={s.metricsGrid}>
              <View style={s.metricCard}>
                <Ionicons name="shield-checkmark" size={20} color={CYAN} />
                <Text style={s.metricVal}>{scanData.stability}%</Text>
                <Text style={s.metricLabel}>STABILITÀ</Text>
              </View>
              <View style={s.metricCard}>
                <Ionicons name="resize" size={20} color={GOLD} />
                <Text style={[s.metricVal, {color: GOLD}]}>{scanData.amplitude}%</Text>
                <Text style={s.metricLabel}>MOBILITÀ</Text>
              </View>
              <View style={s.metricCard}>
                <Ionicons name="eye" size={20} color="#BF5AF2" />
                <Text style={[s.metricVal, {color: '#BF5AF2'}]}>{scanData.avg_keypoints}</Text>
                <Text style={s.metricLabel}>KEYPOINTS</Text>
              </View>
            </View>

            {/* Status */}
            <View style={s.savedBadge}>
              <Ionicons name={resultSaved ? 'checkmark-circle' : 'time'} size={14} color={resultSaved ? '#32D74B' : GOLD} />
              <Text style={[s.savedText, { color: resultSaved ? '#32D74B' : GOLD }]}>
                {resultSaved ? 'K-RATING AGGIORNATO' : 'SALVATAGGIO...'}
              </Text>
            </View>

            {/* Actions */}
            <View style={s.resultActions}>
              <TouchableOpacity style={s.rescanBtn} onPress={() => { setPhase('idle'); }} activeOpacity={0.85}>
                <Ionicons name="refresh" size={18} color={CYAN} />
                <Text style={s.rescanText}>RIPETI SCAN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.doneBtn} onPress={() => router.back()} activeOpacity={0.85}>
                <Text style={s.doneText}>TORNA AL NÈXUS</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  // ═══ SCANNING STATES (WebView active) ═══
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* WebView Scanner */}
      <WebView
        ref={webViewRef}
        source={{ uri: SCANNER_URL }}
        style={s.webview}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        originWhitelist={['*']}
        onError={(e) => {
          setCameraError('Errore nel caricamento dello scanner');
          setPhase('idle');
        }}
      />

      {/* HUD Overlay */}
      <View style={[s.hudOverlay, { paddingTop: insets.top }]} pointerEvents="box-none">
        {/* Top Bar */}
        <View style={s.hudTop}>
          <TouchableOpacity style={s.hudBackBtn} onPress={() => { setPhase('idle'); router.back(); }}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={s.hudPhaseChip}>
            <View style={[s.hudPhaseDot, {
              backgroundColor: phase === 'loading' ? GOLD :
                phase === 'positioning' ? '#FF9500' :
                phase === 'scanning' ? CYAN : GOLD
            }]} />
            <Text style={s.hudPhaseText}>
              {phase === 'loading' ? 'CARICAMENTO...' :
               phase === 'positioning' ? 'POSIZIONATI AL CENTRO' :
               phase === 'scanning' ? 'SCANSIONE IN CORSO' :
               'ANALISI...'}
            </Text>
          </View>
        </View>

        {/* Center Guide */}
        {phase === 'positioning' && (
          <Animated.View entering={FadeIn.duration(400)} style={s.hudCenterGuide}>
            <Animated.View style={[s.hudScanFrame, pulseStyle]}>
              <View style={s.cornerTL} />
              <View style={s.cornerTR} />
              <View style={s.cornerBL} />
              <View style={s.cornerBR} />
            </Animated.View>
            <Text style={s.hudGuideText}>
              {!centered ? 'CENTRARE IL CORPO' : !feetVisible ? 'MOSTRA I PIEDI' : 'PERFETTO — TIENI LA POSIZIONE'}
            </Text>
          </Animated.View>
        )}

        {/* Scanning HUD */}
        {phase === 'scanning' && (
          <View style={s.hudScanInfo}>
            <Text style={s.hudTimerText}>{scanTimer}s / 10s</Text>
            <View style={s.hudProgressBar}>
              <LinearGradient
                colors={[CYAN, GOLD]}
                start={{x:0,y:0}} end={{x:1,y:0}}
                style={[s.hudProgressFill, { width: `${Math.min(scanTimer * 10, 100)}%` as any }]}
              />
            </View>
          </View>
        )}

        {/* Analyzing overlay */}
        {phase === 'analyzing' && (
          <Animated.View entering={FadeIn.duration(300)} style={s.analyzingOverlay}>
            <ActivityIndicator size="large" color={CYAN} />
            <Text style={s.analyzingText}>ANALISI BIOMETRICA</Text>
            <Text style={s.analyzingSub}>Elaborazione postura, mobilità, reattività...</Text>
          </Animated.View>
        )}

        {/* Bottom Stats */}
        {(phase === 'scanning' || phase === 'positioning') && (
          <View style={[s.hudBottom, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.hudStat}>
              <Ionicons name="body" size={14} color={visibleCount >= 12 ? CYAN : 'rgba(255,255,255,0.2)'} />
              <Text style={[s.hudStatVal, { color: visibleCount >= 12 ? CYAN : 'rgba(255,255,255,0.3)' }]}>{visibleCount}/17</Text>
            </View>
            <View style={s.hudStat}>
              <Ionicons name="locate" size={14} color={centered ? '#32D74B' : 'rgba(255,255,255,0.2)'} />
              <Text style={[s.hudStatVal, { color: centered ? '#32D74B' : 'rgba(255,255,255,0.3)' }]}>{centered ? 'CENTRATO' : 'OFF-CENTER'}</Text>
            </View>
            <View style={s.hudStat}>
              <Ionicons name="footsteps" size={14} color={feetVisible ? '#32D74B' : 'rgba(255,255,255,0.2)'} />
              <Text style={[s.hudStatVal, { color: feetVisible ? '#32D74B' : 'rgba(255,255,255,0.3)' }]}>{feetVisible ? 'PIEDI OK' : 'PIEDI ?'}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1 },
  // Idle
  idleGradient: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 60 },
  backBtn: { position: 'absolute', top: 60, left: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  idleCenter: { alignItems: 'center', gap: 16, paddingHorizontal: 40 },
  scanIconWrap: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(0,229,255,0.06)', borderWidth: 2, borderColor: 'rgba(0,229,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  idleTitle: { color: CYAN, fontSize: 36, fontWeight: '900', letterSpacing: 4 },
  idleSub: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  idleDesc: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '500', textAlign: 'center', lineHeight: 18, marginTop: 8 },
  startBtn: { marginTop: 24, borderRadius: 16, overflow: 'hidden' },
  startBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingVertical: 16 },
  startBtnText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,59,48,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginTop: 16, borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)' },
  errorText: { color: RED, fontSize: 12, fontWeight: '700', flex: 1 },
  idleFooter: { color: 'rgba(255,255,255,0.04)', fontSize: 8, fontWeight: '800', letterSpacing: 2 },
  // HUD
  hudOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  hudTop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  hudBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  hudPhaseChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  hudPhaseDot: { width: 6, height: 6, borderRadius: 3 },
  hudPhaseText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  hudCenterGuide: { alignItems: 'center', gap: 16 },
  hudScanFrame: { width: SW * 0.6, height: SW * 0.85, borderWidth: 2, borderRadius: 20, position: 'relative' },
  cornerTL: { position: 'absolute', top: -1, left: -1, width: 24, height: 24, borderTopWidth: 3, borderLeftWidth: 3, borderColor: CYAN, borderTopLeftRadius: 20 },
  cornerTR: { position: 'absolute', top: -1, right: -1, width: 24, height: 24, borderTopWidth: 3, borderRightWidth: 3, borderColor: CYAN, borderTopRightRadius: 20 },
  cornerBL: { position: 'absolute', bottom: -1, left: -1, width: 24, height: 24, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: CYAN, borderBottomLeftRadius: 20 },
  cornerBR: { position: 'absolute', bottom: -1, right: -1, width: 24, height: 24, borderBottomWidth: 3, borderRightWidth: 3, borderColor: CYAN, borderBottomRightRadius: 20 },
  hudGuideText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  hudScanInfo: { alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  hudTimerText: { color: CYAN, fontSize: 32, fontWeight: '900', fontStyle: 'italic', letterSpacing: -1 },
  hudProgressBar: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  hudProgressFill: { height: '100%', borderRadius: 3 },
  analyzingOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', gap: 16 },
  analyzingText: { color: CYAN, fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  analyzingSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
  hudBottom: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  hudStat: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 10 },
  hudStatVal: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  // Results
  resultsGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  resultsCenter: { alignItems: 'center', gap: 20, paddingHorizontal: 32 },
  resultsLabel: { color: CYAN, fontSize: 11, fontWeight: '900', letterSpacing: 4 },
  bigScoreWrap: { flexDirection: 'row', alignItems: 'baseline' },
  bigScoreValue: { color: CYAN, fontSize: 80, fontWeight: '900', fontStyle: 'italic', letterSpacing: -4, lineHeight: 84 },
  bigScoreMax: { color: 'rgba(0,229,255,0.2)', fontSize: 24, fontWeight: '700', fontStyle: 'italic' },
  metricsGrid: { flexDirection: 'row', gap: 12, marginTop: 8 },
  metricCard: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  metricVal: { color: CYAN, fontSize: 22, fontWeight: '900' },
  metricLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(50,215,75,0.08)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(50,215,75,0.15)' },
  savedText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  resultActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  rescanBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: 'rgba(0,229,255,0.3)', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
  rescanText: { color: CYAN, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  doneBtn: { backgroundColor: CYAN, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
  doneText: { color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});
