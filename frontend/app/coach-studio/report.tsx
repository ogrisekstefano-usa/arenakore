/**
 * NÈXUS TALENT REPORT — Trading Card Style
 * Coach Studio · Aggregated athlete intelligence document
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Polygon, Line, Circle, Text as SvgText,
  Path, G,
} from 'react-native-svg';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, MONT, PJS } from '../../contexts/ThemeContext';
import { api } from '../../utils/api';
import { CertBadge } from '../../components/CertBadge';

const DNA_KEYS = ['velocita', 'forza', 'resistenza', 'agilita', 'tecnica', 'potenza'];
const DNA_LABELS = ['VEL', 'FOR', 'RES', 'AGI', 'TEC', 'POT'];
const DNA_FULL = ['Velocità', 'Forza', 'Resistenza', 'Agilità', 'Tecnica', 'Potenza'];
const AXIS_COLORS = ['#00E5FF', '#FF3B30', '#FFD700', '#00FF87', '#AF52DE', '#FF9500'];

// ── DNA Radar with World Avg Overlay ─────────────────────────────────────────
function ReportRadar({ dna, worldAvg, size = 220 }: { dna: any; worldAvg: any; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 30;
  const n = DNA_KEYS.length;

  const pts = (vals: number[], scale = 1) =>
    DNA_KEYS.map((k, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const v = (vals[i] / 100) * r * scale;
      return [cx + v * Math.cos(angle), cy + v * Math.sin(angle)] as [number, number];
    });

  const grid = pts(new Array(n).fill(100));
  const athletePts = pts(DNA_KEYS.map(k => dna?.[k] ?? 50));
  const worldPts = pts(DNA_KEYS.map(k => worldAvg?.[k] ?? 60));

  return (
    <Svg width={size} height={size}>
      {[0.25, 0.5, 0.75, 1.0].map(lvl => (
        <Polygon key={lvl} points={pts(new Array(n).fill(100), lvl).map(p => p.join(',')).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      ))}
      {grid.map(([x, y], i) => (
        <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      ))}
      {/* World average — gold dashed */}
      <Polygon points={worldPts.map(p => p.join(',')).join(' ')}
        fill="rgba(255,215,0,0.1)" stroke="#FFD700" strokeWidth={1.5}
        strokeDasharray="4,3" opacity={0.7} />
      {/* Athlete — cyan solid */}
      <Polygon points={athletePts.map(p => p.join(',')).join(' ')}
        fill="rgba(0,229,255,0.14)" stroke="#00E5FF" strokeWidth={2.5} />
      {/* Dots on athlete */}
      {athletePts.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={4} fill={AXIS_COLORS[i % AXIS_COLORS.length]} />
      ))}
      {/* Labels */}
      {grid.map(([x, y], i) => {
        const lx = cx + (x - cx) * 1.3, ly = cy + (y - cy) * 1.3;
        return (
          <SvgText key={i} x={lx} y={ly + 4} fontSize={9} fill={AXIS_COLORS[i % AXIS_COLORS.length]}
            textAnchor="middle" fontWeight="bold">{DNA_LABELS[i]}</SvgText>
        );
      })}
    </Svg>
  );
}

// ── KORE Score Arc (compact) ─────────────────────────────────────────────────
function ReportKoreArc({ score, grade, color, size = 120 }: any) {
  const cx = size / 2, cy = size / 2 + 8, R = size / 2 - 14;
  const START = 135, SWEEP = 270;
  const polar = (angle: number) => {
    const rad = (angle - 90) * Math.PI / 180;
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) };
  };
  const arc = (s: number, e: number) => {
    const sp = polar(s), ep = polar(e);
    const large = e - s > 180 ? 1 : 0;
    return `M ${sp.x} ${sp.y} A ${R} ${R} 0 ${large} 1 ${ep.x} ${ep.y}`;
  };
  const scoreAngle = START + (score / 100) * SWEEP;
  return (
    <View style={{ alignItems: 'center', position: 'relative' }}>
      <Svg width={size} height={size + 8}>
        <Path d={arc(START, START + SWEEP)} stroke="rgba(255,255,255,0.06)" strokeWidth={10} fill="none" strokeLinecap="round" />
        {score > 0 && <Path d={arc(START, Math.min(scoreAngle, START + SWEEP - 0.01))} stroke={color} strokeWidth={10} fill="none" strokeLinecap="round" />}
      </Svg>
      <View style={{ position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', height: size }}>
        <Text style={[{ color, fontSize: Math.round(size * 0.26), fontWeight: '900', letterSpacing: 1 }]}>{Math.round(score)}</Text>
        <View style={[{ backgroundColor: color + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: color + '50' }]}>
          <Text style={[{ color, fontSize: 13, fontWeight: '900', letterSpacing: 2 }]}>{grade}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Main Report ───────────────────────────────────────────────────────────────
export default function TalentReportPage() {
  const { athleteId } = useLocalSearchParams<{ athleteId?: string }>();
  const { token } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [coachNote, setCoachNote] = useState('');
  const [noteEditMode, setNoteEditMode] = useState(false);

  const handlePrintPDF = async () => {
    if (!token || !athleteId) return;
    try {
      // Call real backend PDF endpoint
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/report/athlete-pdf/${athleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      // Open in new tab for download/print
      if (typeof window !== 'undefined') {
        const link = document.createElement('a');
        link.href = url;
        link.download = `KORE_PASSPORT_${report?.username || 'EXPORT'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (err) {
      console.warn('[PDF]', err);
      // Fallback to browser print if backend fails
      if (typeof window !== 'undefined') {
        const style = document.createElement('style');
        style.textContent = `@media print { @page { margin: 0; size: A4; } body > * { display: none !important; } body { background: #000 !important; } #nexus-report-card { display: block !important; position: fixed !important; top: 0; left: 0; width: 100% !important; } * { -webkit-print-color-adjust: exact !important; } }`;
        document.head.appendChild(style);
        setTimeout(() => { window.print(); setTimeout(() => style.remove(), 1000); }, 200);
      }
    }
  };

  useEffect(() => {
    if (!token || !athleteId) return;
    api.getTalentReport(athleteId, token)
      .then(d => { setReport(d); setCoachNote(d.coach_note || ''); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [athleteId, token]);

  if (loading || !report) {
    return (
      <View style={[rp$.loading, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color="#00E5FF" size="large" />
        <Text style={[rp$.loadingText, MONT('300'), { color: theme.textTer }]}>Generando il Talent Report...</Text>
      </View>
    );
  }

  const { athlete, kore_score, efficiency_ratio, dna, world_avg_dna, six_axis, injury_risk, scan_trend, forecast_30d } = report;
  const ks = kore_score || {};
  const f30 = forecast_30d || {};

  return (
    <ScrollView style={[rp$.root, { backgroundColor: theme.bg }]} contentContainerStyle={rp$.content}>
      {/* Back button + Export */}
      <View style={rp$.topActions}>
        <TouchableOpacity style={rp$.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={16} color={theme.textTer} />
          <Text style={[rp$.backText, MONT('400'), { color: theme.textTer }]}>Talent Scout</Text>
        </TouchableOpacity>
        {Platform.OS === 'web' && (
          <TouchableOpacity style={rp$.exportBtn} onPress={handlePrintPDF} activeOpacity={0.85}>
            <Ionicons name="document-text" size={14} color="#000" />
            <Text style={rp$.exportBtnText}>EXPORT PDF</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── TRADING CARD ── */}
      <Animated.View
        entering={FadeIn.duration(400)}
        style={[rp$.card, { borderColor: 'rgba(255,255,255,0.07)' }]}
        nativeID="nexus-report-card"
        {...(Platform.OS === 'web' ? { id: 'nexus-report-card', 'data-nexus-card': '1' } as any : {})}
      >

        {/* Card header strip */}
        <View style={rp$.cardStrip}>
          <View style={rp$.stripLeft}>
            <View style={[rp$.stripDot, { backgroundColor: '#00E5FF' }]} />
            <Text style={[rp$.stripTitle, MONT('800')]}>NÈXUS TALENT REPORT</Text>
          </View>
          <Text style={[rp$.stripDate, MONT('300')]}>{new Date(report.generated_at).toLocaleDateString('it-IT')}</Text>
        </View>

        {/* ── ATHLETE IDENTITY ── */}
        <View style={rp$.identity}>
          {/* Avatar */}
          <View style={[rp$.avatarRing, { borderColor: ks.color || '#00E5FF' }]}>
            <View style={[rp$.avatar, { backgroundColor: athlete.avatar_color || '#00E5FF' }]}>
              <Text style={rp$.avatarLetter}>{(athlete.username || '?')[0].toUpperCase()}</Text>
            </View>
          </View>

          {/* Name + meta */}
          <View style={rp$.identInfo}>
            <View style={rp$.nameRow}>
              <Text style={[rp$.athleteName, PJS('800'), { color: '#FFFFFF', fontSize: 26 }]}
                {...(Platform.OS === 'web' ? { 'data-nexus-title': '1' } as any : {})}
              >{athlete.username?.toUpperCase()}</Text>
              <CertBadge certified={athlete.is_nexus_certified} size="sm" />
            </View>
            <Text style={[rp$.athleteMeta, MONT('300'), { color: 'rgba(255,255,255,0.5)' }]}>
              {athlete.city} · LVL {athlete.level} · {athlete.xp?.toLocaleString()} FLUX
            </Text>
            <View style={rp$.statusRow}>
              {athlete.is_free_agent ? (
                <View style={[rp$.statusPill, { backgroundColor: 'rgba(0,255,135,0.1)', borderColor: '#00FF8740' }]}>
                  <Text style={[rp$.statusText, { color: '#00FF87' }]}>⚡ FREE AGENT</Text>
                </View>
              ) : (
                <View style={[rp$.statusPill, { backgroundColor: 'rgba(0,229,255,0.06)', borderColor: '#00E5FF30' }]}>
                  <Text style={[rp$.statusText, { color: '#00E5FF' }]}>🛡 IN CREW</Text>
                </View>
              )}
              <View style={[rp$.statusPill, { backgroundColor: 'rgba(255,215,0,0.08)', borderColor: '#FFD70040' }]}>
                <Text style={[rp$.statusText, { color: '#FFD700' }]}>⚡ EFF {efficiency_ratio}</Text>
              </View>
            </View>
          </View>

          {/* KORE Score */}
          <View style={rp$.koreWrap}>
            <Text style={[rp$.koreLabel, MONT('900'), { color: 'rgba(255,255,255,0.3)' }]}>KORE SCORE</Text>
            <ReportKoreArc score={ks.score || 0} grade={ks.grade || 'B'} color={ks.color || '#00E5FF'} size={110} />
            {ks.penalty_active && (
              <View style={rp$.penalty}>
                <Ionicons name="warning" size={9} color="#FF3B30" />
                <Text style={[rp$.penaltyText, MONT('900')]}>PENALITÀ -{ks.posture_penalty}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── DNA SECTION ── */}
        <View style={rp$.dnaSection}>
          <View style={rp$.dnaSectionLeft}>
            <Text style={[rp$.sectionTitle, MONT('700'), { color: 'rgba(255,255,255,0.30)' }]}>DNA SIGNATURE</Text>
            <ReportRadar dna={dna} worldAvg={world_avg_dna} size={200} />
            <View style={rp$.legend}>
              <View style={rp$.legendItem}><View style={[rp$.legendDot, { backgroundColor: '#00E5FF' }]} /><Text style={[rp$.legendText, MONT('300')]}>Kore</Text></View>
              <View style={rp$.legendItem}><View style={[rp$.legendDot, { backgroundColor: '#FFD700' }]} /><Text style={[rp$.legendText, MONT('300')]}>Media Mondiale</Text></View>
            </View>
          </View>

          {/* 6-axis breakdown */}
          <View style={rp$.dnaBreakdown}>
            <Text style={[rp$.sectionTitle, MONT('700'), { color: 'rgba(255,255,255,0.30)' }]}>BREAKDOWN 6 ASSI</Text>
            {DNA_KEYS.map((k, i) => {
              const val = dna?.[k] ?? 50;
              const worldVal = world_avg_dna?.[k] ?? 60;
              const diff = val - worldVal;
              return (
                <View key={k} style={rp$.axisRow}>
                  <Text style={[rp$.axisLabel, MONT('600'), { color: AXIS_COLORS[i % AXIS_COLORS.length] }]}>{DNA_LABELS[i]}</Text>
                  <View style={rp$.axisBarBg}>
                    {/* World avg line */}
                    <View style={[rp$.axisWorldLine, { left: `${worldVal}%` as any }]} />
                    {/* Athlete fill */}
                    <View style={[rp$.axisBarFill, { width: `${val}%` as any, backgroundColor: AXIS_COLORS[i % AXIS_COLORS.length] }]} />
                  </View>
                  <Text style={[rp$.axisVal, MONT('700'), { color: AXIS_COLORS[i % AXIS_COLORS.length] }]}>{val}</Text>
                  <Text style={[rp$.axisDiff, MONT('300'), { color: diff >= 0 ? '#00FF87' : '#FF3B30' }]}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(0)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── FORECAST & INJURY ── */}
        <View style={rp$.bottomRow}>
          {/* AI Forecast */}
          <View style={rp$.forecastCard}>
            <View style={rp$.forecastHeader}>
              <Ionicons name="hardware-chip" size={13} color="#00E5FF" />
              <Text style={[rp$.sectionTitle, MONT('700'), { color: '#00E5FF' }]}>AI FORECAST 30G</Text>
              <Text style={[MONT('800'), { color: f30.trend_color || '#888', fontSize: 14 }]}>{f30.trend_label}</Text>
            </View>
            <View style={rp$.forecastMetrics}>
              {[
                { label: 'DNA PREV', val: f30.projected_dna, unit: '/100', color: '#00E5FF' },
                { label: 'KORE PREV', val: f30.projected_kore, unit: '/100', color: '#FFD700' },
                { label: 'SCAN/SETT', val: f30.scans_per_week, unit: 'x', color: '#00FF87' },
              ].map(m => (
                <View key={m.label} style={rp$.forecastMetric}>
                  <Text style={[rp$.forecastVal, MONT('800'), { color: m.color }]}>{m.val}{m.unit}</Text>
                  <Text style={[rp$.forecastLabel, MONT('600'), { color: 'rgba(255,255,255,0.3)' }]}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Injury Risk */}
          {injury_risk && (
            <View style={[rp$.injuryCard, { borderColor: injury_risk.color + '30' }]}>
              <View style={rp$.forecastHeader}>
                <Ionicons name="warning" size={13} color={injury_risk.color} />
                <Text style={[rp$.sectionTitle, MONT('700'), { color: injury_risk.color }]}>RISCHIO INFORTUNI</Text>
              </View>
              <Text style={[MONT('800'), { color: injury_risk.color, fontSize: 24 }]}>{injury_risk.risk_pct}%</Text>
              <Text style={[MONT('600'), { color: injury_risk.color, fontSize: 13, letterSpacing: 2 }]}>{injury_risk.level}</Text>
              <Text style={[rp$.injuryRec, MONT('300')]}>{injury_risk.recommendation}</Text>
            </View>
          )}
        </View>

        {/* ── COACH NOTE ── */}
        <View style={rp$.noteSection}>
          <View style={rp$.noteHeader}>
            <Ionicons name="create-outline" size={13} color="rgba(255,255,255,0.35)" />
            <Text style={[rp$.sectionTitle, MONT('700'), { color: 'rgba(255,255,255,0.30)' }]}>NOTE SCOUT</Text>
            <TouchableOpacity onPress={() => setNoteEditMode(e => !e)} style={{ marginLeft: 'auto' as any }}>
              <Ionicons name={noteEditMode ? 'checkmark' : 'pencil'} size={14} color="#FFD700" />
            </TouchableOpacity>
          </View>
          {noteEditMode ? (
            <TextInput
              style={[rp$.noteInput, { backgroundColor: '#0A0A0A', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.07)' }]}
              value={coachNote}
              onChangeText={setCoachNote}
              placeholder="Inserisci note private su questo Kore..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              multiline
              numberOfLines={3}
              {...(Platform.OS === 'web' ? { style: [rp$.noteInput, { backgroundColor: '#0A0A0A', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.07)', outlineStyle: 'none' } as any] } : {})}
            />
          ) : (
            <Text style={[rp$.noteText, MONT('300'), { color: coachNote ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)' }]}>
              {coachNote || 'Nessuna nota ancora. Premi il tasto matita per aggiungere una nota privata.'}
            </Text>
          )}
        </View>

        {/* Card footer */}
        <View style={rp$.cardFooter}>
          <Text style={[rp$.footerText, MONT('300')]}>
            Generato da {report.generated_by?.toUpperCase()} · NÈXUS Intelligence Platform
          </Text>
          <Text style={[rp$.footerText, MONT('300')]}>ID #{athlete.id?.slice(-8).toUpperCase()}</Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const rp$ = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, paddingBottom: 60 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 15, letterSpacing: 1 },
  topActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { fontSize: 15, letterSpacing: 1 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFD700', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 9, shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 10 },
  exportBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  // Trading card
  card: { backgroundColor: '#000000', borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  cardStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0A0A0A', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  stripLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stripDot: { width: 6, height: 6, borderRadius: 3 },
  stripTitle: { color: '#FFFFFF', fontSize: 13, letterSpacing: 4 },
  stripDate: { color: 'rgba(255,255,255,0.25)', fontSize: 13 },
  // Identity
  identity: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  avatarRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#000', fontSize: 28, fontWeight: '900' },
  identInfo: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  athleteName: { letterSpacing: 1 },
  athleteMeta: { fontSize: 14 },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusPill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  koreWrap: { alignItems: 'center', gap: 4 },
  koreLabel: { fontSize: 11, letterSpacing: 3 },
  penalty: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,59,48,0.08)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  penaltyText: { color: '#FF3B30', fontSize: 10, letterSpacing: 1 },
  // DNA section
  dnaSection: { flexDirection: 'row', padding: 20, gap: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  dnaSectionLeft: { alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 11, letterSpacing: 3, marginBottom: 8 },
  legend: { flexDirection: 'row', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  dnaBreakdown: { flex: 1, gap: 8, justifyContent: 'center' },
  axisRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  axisLabel: { width: 30, fontSize: 12, letterSpacing: 1.5 },
  axisBarBg: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', position: 'relative' },
  axisWorldLine: { position: 'absolute', top: 0, bottom: 0, width: 1.5, backgroundColor: '#FFD700', opacity: 0.6 },
  axisBarFill: { height: '100%', borderRadius: 3 },
  axisVal: { fontSize: 15, width: 26, textAlign: 'right' },
  axisDiff: { fontSize: 12, width: 28, textAlign: 'right' },
  // Bottom row
  bottomRow: { flexDirection: 'row', padding: 16, gap: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  forecastCard: { flex: 1, backgroundColor: '#0A0A0A', borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: 'rgba(0,229,255,0.12)' },
  forecastHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  forecastMetrics: { flexDirection: 'row', justifyContent: 'space-around' },
  forecastMetric: { alignItems: 'center', gap: 3 },
  forecastVal: { fontSize: 20 },
  forecastLabel: { fontSize: 10, letterSpacing: 2 },
  injuryCard: { flex: 1, backgroundColor: '#0A0A0A', borderRadius: 12, padding: 14, gap: 6, borderWidth: 1 },
  injuryRec: { color: 'rgba(255,255,255,0.30)', fontSize: 12, lineHeight: 14 },
  // Coach note
  noteSection: { padding: 16, gap: 10 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, minHeight: 80 } as any,
  noteText: { fontSize: 14, lineHeight: 18 },
  // Footer
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', backgroundColor: '#0A0A0A' },
  footerText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, letterSpacing: 0.5 },
});
