/**
 * ARENAKORE — KORE DNA ID
 * KORE ID: trofeo digitale del biometric scan.
 * Layout: KORE ID · DNA SCORE gigante · Barre Stabilità/Ampiezza · Badge CERTIFIED IN CITY
 * CTA: DOWNLOAD KORE ID (cattura il card come immagine) + CONTINUA REGISTRAZIONE
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  useWindowDimensions, Share, Platform, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, useSharedValue, withRepeat, withSequence, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

// ── Design tokens
const GOLD   = '#FFD700';
const CYAN   = '#00E5FF';
const BG     = '#000000';
const CARD   = '#0a0a0a';

interface ScanResult {
  kore_score:  number;
  stability:   number;  // 0-100
  amplitude:   number;  // 0-100
  city:        string;
  scan_date:   string;
}

// ── Animated bar (brutalist) ──────────────────────────────────────
function BiometricBar({ value, color, label }: { value: number; color: string; label: string }) {
  const barWidth = useSharedValue(0);
  const trackW = useSharedValue(200);
  useEffect(() => {
    barWidth.value = withTiming(value, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [value]);
  const barStyle = useAnimatedStyle(() => ({
    width: (barWidth.value / 100) * trackW.value,
    backgroundColor: color
  }));
  return (
    <View style={bar$.row}>
      <View style={bar$.labelBox}>
        <Text style={[bar$.label, { color }]}>{label}</Text>
        <Text style={[bar$.val, { color }]}>{value}%</Text>
      </View>
      <View style={bar$.track} onLayout={(e) => { trackW.value = e.nativeEvent.layout.width; }}>
        <Animated.View style={[bar$.fill, barStyle]} />
      </View>
    </View>
  );
}
const bar$ = StyleSheet.create({
  row: { gap: 6, marginBottom: 14 },
  labelBox: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  val:   { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  track: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  fill:  { height: 6, borderRadius: 3 }
});

// ── Main ──────────────────────────────────────────────────────────
export default function PassportScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const cardRef = useRef<View>(null);

  const [result, setResult]       = useState<ScanResult | null>(null);
  const [sharing, setSharing]     = useState(false);
  const [downloadOk, setDownloadOk] = useState(false);

  // ── Gold pulse on DNA SCORE
  const glow = useSharedValue(0.6);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
  }, []);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + glow.value * 0.4,
  }));

  // Load scan result from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@kore_scan_result');
        if (raw) {
          setResult(JSON.parse(raw));
        } else {
          // Fallback defaults if no scan data (e.g., simulated mode)
          setResult({
            kore_score: 74,
            stability:  82,
            amplitude:  68,
            city:       'CHICAGO',
            scan_date:  new Date().toISOString()
          });
        }
      } catch (_) {
        setResult({ kore_score: 74, stability: 82, amplitude: 68, city: 'CHICAGO', scan_date: new Date().toISOString() });
      }
    })();
  }, []);

  const handleContinue = useCallback(() => {
    router.push('/onboarding/step3');
  }, [router]);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || sharing) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 0.95 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'ARENAKORE — KORE DNA ID'
        });
      } else {
        // Fallback: native Share sheet
        await Share.share({
          message: `ARENAKORE — KORE DNA ID\n\nDNA SCORE: ${result?.kore_score}/100\nSTABILITÀ: ${result?.stability}% | AMPIEZZA: ${result?.amplitude}%\nCERTIFIED IN ${result?.city}\n${result ? formatDate(result.scan_date) : ''}\n\nhttps://arena-scan-lab.preview.emergentagent.com`,
          title: 'KORE DNA ID'
        });
      }
      setDownloadOk(true);
      setTimeout(() => setDownloadOk(false), 2500);
    } catch (_e) {
      // Share cancelled or error — non-blocking
    } finally {
      setSharing(false);
    }
  }, [sharing, result]);

  if (!result) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={CYAN} size="large" />
      </View>
    );
  }

  const scanDt    = new Date(result.scan_date);
  const formDate  = formatDate(result.scan_date);
  const previewId = String(Math.abs(scanDt.getTime()) % 99999).padStart(5, '0');
  const scoreGrade = result.kore_score >= 85 ? 'ELITE' : result.kore_score >= 70 ? 'ADVANCED' : 'LEGACY';

  return (
    <View style={[s.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <StatusBar barStyle="light-content" />

      {/* TOP: BRAND + STEP */}
      <Animated.View entering={FadeIn.delay(100)} style={s.topRow}>
        <View style={{ flexDirection: 'row' }}>
          <Text style={[s.brand, { color: '#FFFFFF' }]}>ARENA</Text>
          <Text style={[s.brand, { color: CYAN }]}>KORE</Text>
        </View>
        <View style={s.stepPill}>
          <Text style={s.stepTxt}>DNA KORE ID</Text>
        </View>
      </Animated.View>

      {/* ──────────────── KORE ID CARD ──────────────── */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={[s.cardWrap, { width: W - 32 }]}>
        {/* The View ref for screenshot capture */}
        <View ref={cardRef} style={s.card} collapsable={false}>
          {/* Top cyan bar */}
          <View style={s.cardTopBar} />

          {/* Header: logo + date */}
          <View style={s.cardHeader}>
            <View>
              <Text style={s.cardBrandArena}>ARENA<Text style={{ color: CYAN }}>KORE</Text></Text>
              <Text style={s.cardLabel}>BIOMETRIC DNA KORE ID</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text style={s.cardDate}>{formDate}</Text>
              <Text style={s.cardCity}>
                <Ionicons name="location" size={8} color={CYAN} /> {result.city}
              </Text>
            </View>
          </View>

          <View style={s.cardDivider} />

          {/* KORE ID */}
          <View style={s.idRow}>
            <View style={s.idBadge}>
              <Text style={s.idLabel}>KORE ID</Text>
              <Text style={s.idNum}>#{previewId}</Text>
            </View>
            <View style={s.gradeBadge}>
              <Text style={s.gradeLabel}>GRADE</Text>
              <Text style={[s.gradeVal, { color: result.kore_score >= 85 ? GOLD : CYAN }]}>{scoreGrade}</Text>
            </View>
          </View>

          {/* ── DNA SCORE gigante ── */}
          <View style={s.scoreWrap}>
            <Animated.Text style={[s.scoreBig, glowStyle]}>
              {result.kore_score}
            </Animated.Text>
            <Text style={s.scoreSubLabel}>KORE SCORE</Text>
            {/* Score arc indicator */}
            <View style={s.scoreArc}>
              <View style={[s.scoreArcFill, { width: `${result.kore_score}%` }]} />
            </View>
          </View>

          <View style={s.cardDivider} />

          {/* ── BIOMETRIC BARS ── */}
          <View style={s.barsWrap}>
            <Text style={s.barsSectionLabel}>BIO-SIGNATURE METRICS</Text>
            <BiometricBar value={result.stability} color={CYAN}  label="STABILITÀ" />
            <BiometricBar value={result.amplitude} color={GOLD}  label="AMPIEZZA" />
            <BiometricBar
              value={Math.min(100, Math.round((result.stability * 0.5 + result.amplitude * 0.5)))}
              color="rgba(255,255,255,0.4)"
              label="POSTURA GENERALE"
            />
          </View>

          <View style={s.cardDivider} />

          {/* ── LOCATION BADGE ── */}
          <View style={s.locBadge}>
            <View style={s.locDot} />
            <View>
              <Text style={s.locTitle}>CERTIFIED IN {result.city}</Text>
              <Text style={s.locSub}>{formDate} · NEXUS PROTOCOL v2</Text>
            </View>
            <Ionicons name="shield-checkmark" size={18} color={GOLD} />
          </View>

          {/* Bottom scan pattern */}
          <View style={s.scanLine}>
            {Array.from({ length: 20 }).map((_, i) => (
              <View key={i} style={[s.scanTick, i % 4 === 0 && s.scanTickTall]} />
            ))}
          </View>
        </View>
      </Animated.View>

      {/* ──────────────── CTAs ──────────────── */}
      <Animated.View entering={FadeInDown.delay(500)} style={s.ctaArea}>
        {/* DOWNLOAD KORE ID */}
        <TouchableOpacity
          style={[s.downloadBtn, downloadOk && s.downloadOk]}
          onPress={handleDownload}
          disabled={sharing}
          activeOpacity={0.85}
        >
          {sharing ? (
            <ActivityIndicator color={BG} size="small" />
          ) : (
            <>
              <Ionicons name={downloadOk ? 'checkmark-circle' : 'download'} size={18} color={BG} />
              <Text style={s.downloadTxt}>
                {downloadOk ? 'KORE ID SALVATO' : 'DOWNLOAD KORE ID'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* CONTINUA */}
        <TouchableOpacity style={s.continueBtn} onPress={handleContinue} activeOpacity={0.8}>
          <Ionicons name="arrow-forward" size={16} color={CYAN} />
          <Text style={s.continueTxt}>CONTINUA — CREA KORE ID</Text>
        </TouchableOpacity>

        <Text style={s.footerNote}>
          IL TUO KORE ID DEFINITIVO SARÀ ASSEGNATO DOPO LA REGISTRAZIONE
        </Text>
      </Animated.View>
    </View>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).toUpperCase();
  } catch {
    return new Date().toLocaleDateString('it-IT').toUpperCase();
  }
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, paddingHorizontal: 24 },

  // Top bar
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  brand: { fontSize: 13, fontWeight: '900', letterSpacing: 4 },
  stepPill: { backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
  stepTxt: { color: GOLD, fontSize: 11, fontWeight: '400', letterSpacing: 3 },

  // Card wrapper
  cardWrap: { flex: 1, maxHeight: 520, alignSelf: 'center' },
  card: {
    backgroundColor: CARD,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
    flex: 1
  },
  cardTopBar: { height: 3, backgroundColor: GOLD },
  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 24 },

  // Header
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16 },
  cardBrandArena: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  cardLabel: { color: 'rgba(255,215,0,0.5)', fontSize: 8, fontWeight: '900', letterSpacing: 3, marginTop: 2 },
  cardDate: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '400', letterSpacing: 1 },
  cardCity: { color: CYAN, fontSize: 11, fontWeight: '400', letterSpacing: 2 },

  // ID row
  idRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  idBadge: { gap: 2 },
  idLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '400', letterSpacing: 4 },
  idNum: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  gradeBadge: { alignItems: 'flex-end', gap: 2 },
  gradeLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900', letterSpacing: 4 },
  gradeVal: { fontSize: 14, fontWeight: '400', letterSpacing: 2 },

  // DNA Score
  scoreWrap: { alignItems: 'center', paddingVertical: 12, gap: 4 },
  scoreBig: {
    color: GOLD, fontSize: 80, fontWeight: '400', letterSpacing: -4, lineHeight: 84
  },
  scoreSubLabel: { color: 'rgba(255,215,0,0.6)', fontSize: 10, fontWeight: '900', letterSpacing: 5 },
  scoreArc: { height: 4, width: 160, backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  scoreArcFill: { height: 4, backgroundColor: GOLD, borderRadius: 2 },

  // Bars section
  barsWrap: { padding: 14, paddingBottom: 8 },
  barsSectionLabel: { color: '#00E5FF22', fontSize: 8, fontWeight: '900', letterSpacing: 4, marginBottom: 10 },

  // Location badge
  locBadge: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  locDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: CYAN },
  locTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  locSub: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '400', letterSpacing: 1, marginTop: 2 },

  // Scan pattern bottom
  scanLine: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 24, paddingBottom: 10, gap: 3, marginTop: 4 },
  scanTick: { width: 2, height: 4, backgroundColor: '#00E5FF22', borderRadius: 1 },
  scanTickTall: { height: 10, backgroundColor: 'rgba(255,255,255,0.3)' },

  // CTAs
  ctaArea: { gap: 10, marginTop: 14 },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: GOLD, borderRadius: 10, paddingVertical: 17,
    elevation: 8
  },
  downloadOk: { backgroundColor: '#32D74B' },
  downloadTxt: { color: BG, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 10, paddingVertical: 14
  },
  continueTxt: { color: CYAN, fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  footerNote: { color: '#AAAAAA', fontSize: 11, fontWeight: '400', textAlign: 'center', letterSpacing: 1 }
});
