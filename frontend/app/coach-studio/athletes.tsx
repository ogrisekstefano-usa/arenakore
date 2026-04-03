/**
 * NÈXUS COMMAND CENTER — ATHLETE CRM (DNA Athletic Hub)
 * Panel 1: Advanced Table  |  Panel 2: Deep Profile  |  Tab: Crew Management
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path as KPath, Circle as KCircle, Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, PJS, MONT, JAKARTA, fz } from '../../contexts/ThemeContext';
import { api } from '../../utils/api';
import { ComparisonView } from '../../components/studio/ComparisonView';

// ── 6-Axis Radar ──────────────────────────────────────────────────────────────
const SIX_AXES = ['endurance', 'power', 'mobility', 'technique', 'recovery', 'agility'];
const SIX_LABELS = ['END', 'POW', 'MOB', 'TEC', 'REC', 'AGI'];
const SIX_COLORS = ['#00E5FF', '#FF3B30', '#00FF87', '#FFD700', '#AF52DE', '#FF9500'];

function SixAxisRadar({ data, size = 180, showLabels = true, compare }: {
  data: Record<string, number>; size?: number; showLabels?: boolean; compare?: Record<string, number>;
}) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 28;
  const n = SIX_AXES.length;

  const pts = (vals: number[], scale = 1) =>
    SIX_AXES.map((k, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const v = (vals[i] / 100) * r * scale;
      return [cx + v * Math.cos(angle), cy + v * Math.sin(angle)] as [number, number];
    });

  const gridPts = pts(new Array(n).fill(100));
  const dataPts = pts(SIX_AXES.map(k => data?.[k] ?? 50));
  const compPts = compare ? pts(SIX_AXES.map(k => compare?.[k] ?? 50)) : null;

  return (
    <Svg width={size} height={size}>
      {/* Grid rings at 25%, 50%, 75%, 100% */}
      {[0.25, 0.5, 0.75, 1.0].map(lvl => (
        <Polygon key={lvl}
          points={pts(new Array(n).fill(100), lvl).map(p => p.join(',')).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1}
        />
      ))}
      {/* Axis lines */}
      {gridPts.map(([x, y], i) => (
        <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      ))}
      {/* Compare polygon (if provided) */}
      {compPts && (
        <Polygon
          points={compPts.map(p => p.join(',')).join(' ')}
          fill="rgba(255,215,0,0.08)" stroke="#FFD700" strokeWidth={1.5} opacity={0.7}
        />
      )}
      {/* Data polygon */}
      <Polygon
        points={dataPts.map(p => p.join(',')).join(' ')}
        fill="rgba(0,229,255,0.12)" stroke="#00E5FF" strokeWidth={2}
      />
      {/* Axis dots */}
      {dataPts.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={3} fill={SIX_COLORS[i % SIX_COLORS.length]} />
      ))}
      {/* Labels */}
      {showLabels && gridPts.map(([x, y], i) => {
        const lx = cx + (x - cx) * 1.28, ly = cy + (y - cy) * 1.28;
        return (
          <SvgText key={i} x={lx} y={ly + 4}
            fontSize={9} fill={SIX_COLORS[i % SIX_COLORS.length]} textAnchor="middle" fontWeight="bold">
            {SIX_LABELS[i]}
          </SvgText>
        );
      })}
    </Svg>
  );
}

// ── KORE SCORE Gauge (SVG circular) ─────────────────────────────────────────
function KoreScoreGauge({ kore, size = 160 }: { kore: any; size?: number }) {
  if (!kore) return null;
  const { score, grade, color, verdict, penalty_active, posture_penalty, breakdown } = kore;

  // SVG arc math: 270° gauge (from 225° to 495°, i.e. -135° to 135° from top)
  const R = size / 2 - 14;
  const cx = size / 2, cy = size / 2 + 8;
  const START_ANGLE = 135, SWEEP = 270;

  const polarToCartesian = (angle: number) => {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) };
  };

  const describeArc = (startAngle: number, endAngle: number) => {
    const s = polarToCartesian(startAngle), e = polarToCartesian(endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  const scoreAngle = START_ANGLE + (score / 100) * SWEEP;
  const trackPath = describeArc(START_ANGLE, START_ANGLE + SWEEP);
  const fillPath  = score > 0 ? describeArc(START_ANGLE, Math.min(scoreAngle, START_ANGLE + SWEEP - 0.01)) : '';

  return (
    <View style={kg$.container}>
      <Svg width={size} height={size + 8}>
        {/* Track */}
        <KPath d={trackPath} stroke="rgba(255,255,255,0.08)" strokeWidth={16} fill="none" strokeLinecap="round" />
        {/* Fill */}
        {score > 0 && <KPath d={fillPath} stroke={color} strokeWidth={16} fill="none" strokeLinecap="round" />}
        {/* Glow dot at current position */}
        {score > 0 && (() => {
          const pos = polarToCartesian(Math.min(scoreAngle, START_ANGLE + SWEEP - 1));
          return <KCircle cx={pos.x} cy={pos.y} r={8} fill={color} />;
        })()}
      </Svg>

      {/* Center text — numero enorme */}
      <View style={[kg$.center, { width: size, top: 8 }]}>
        <Text style={[kg$.score, MONT('800'), { color, fontSize: Math.round(size * 0.30) }]}>{Math.round(score)}</Text>
        <View style={[kg$.gradeBadge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
          <Text style={[kg$.grade, { color }]}>{grade}</Text>
        </View>
        {penalty_active && (
          <View style={kg$.penaltyBadge}>
            <Ionicons name="warning" size={9} color="#FF3B30" />
            <Text style={kg$.penaltyText}>-{posture_penalty} postura</Text>
          </View>
        )}
      </View>

      {/* Verdict */}
      <Text style={[kg$.verdict, { color: 'rgba(255,255,255,0.5)' }]} numberOfLines={2}>{verdict}</Text>

      {/* Component bars */}
      {breakdown && (
        <View style={kg$.bars}>
          {Object.values(breakdown as Record<string, any>).map((b: any) => (
            <View key={b.label} style={kg$.barRow}>
              <Text style={[kg$.barLabel, MONT('300')]}>{b.label}</Text>
              <View style={kg$.barTrack}>
                <View style={[kg$.barFill, { width: `${b.value}%` as any, backgroundColor: b.color }]} />
              </View>
              <Text style={[kg$.barVal, MONT('900'), { color: b.color }]}>{b.value}</Text>
              <Text style={[kg$.barContrib, MONT('300')]}>{b.weight * 100}%→{b.contribution}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── KORE SCORE Gauge Styles ──────────────────────────────────────────────────
const kg$ = StyleSheet.create({
  container: { alignItems: 'center', gap: 8, position: 'relative' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center', gap: 4 },
  score: { fontSize: 38, fontWeight: '900', letterSpacing: 1 },
  gradeBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  grade: { fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  penaltyBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,59,48,0.1)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  penaltyText: { color: '#FF3B30', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  verdict: { fontSize: 12, textAlign: 'center', lineHeight: 14, paddingHorizontal: 8, fontWeight: '300' },
  bars: { width: '100%', gap: 6, paddingHorizontal: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  barLabel: { width: 56, fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.30)' },
  barTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  barVal: { fontSize: 13, width: 32, textAlign: 'right' },
  barContrib: { fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 0.3, width: 56, textAlign: 'right' },
});

// ── Injury Risk Badge ─────────────────────────────────────────────────────────
function RiskBadge({ risk }: { risk: any }) {
  const { theme } = useTheme();
  return (
    <View style={[rb$.badge, { backgroundColor: risk.color + '15', borderColor: risk.color + '45' }]}>
      <View style={[rb$.dot, { backgroundColor: risk.color }]} />
      <Text style={[rb$.text, MONT('900'), { color: risk.color }]}>{risk.level}</Text>
    </View>
  );
}
const rb$ = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  text: { fontSize: 11, letterSpacing: 1.5 },
});

// ── Scan Trend Sparkline ──────────────────────────────────────────────────────
function TrendSparkline({ trend, direction }: { trend: any[]; direction: string }) {
  if (!trend?.length) return null;
  const w = 56, h = 22;
  const max = Math.max(...trend.map(t => t.quality), 100);
  const points = trend.map((t, i) => {
    const x = (i / Math.max(trend.length - 1, 1)) * w;
    const y = h - (t.quality / max) * h;
    return `${x},${y}`;
  }).join(' ');
  const color = direction === 'up' ? '#00FF87' : direction === 'down' ? '#FF3B30' : '#888888';
  return (
    <View style={{ width: w, height: h }}>
      <Svg width={w} height={h}>
        <Polygon points={`0,${h} ${points} ${w},${h}`} fill={color + '18'} />
        <Line x1={0} y1={0} x2={w} y2={0} stroke="rgba(255,255,255,0)" />
        {trend.map((_, i) => {
          const x = (i / Math.max(trend.length - 1, 1)) * w;
          const y = h - (trend[i].quality / max) * h;
          return <Line key={i} x1={x} y1={y} x2={x + 0.1} y2={y + 0.1} stroke={color} strokeWidth={1.5} />;
        })}
      </Svg>
    </View>
  );
}

// ── Deep Profile Panel ────────────────────────────────────────────────────────
function DeepProfilePanel({ athleteId, onClose }: { athleteId: string; onClose: () => void }) {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [koreData, setKoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [ms, setMs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !athleteId) return;
    setLoading(true);
    Promise.all([
      api.getAthleteFullProfile(athleteId, token),
      api.getKoreScoreBreakdown(athleteId, token),
    ]).then(([p, k]) => {
      setProfile(p);
      setKoreData(k?.kore_score || null);
      setMs({ endurance_gps: String(p.multiskill?.endurance_gps || ''), strength_watts: String(p.multiskill?.strength_watts || ''), sleep_score: String(p.multiskill?.sleep_score || ''), hrv_score: String(p.multiskill?.hrv_score || '') });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [athleteId, token]);

  const handleSaveMs = async () => {
    if (!token) return;
    setSaving(true);
    const data: any = {};
    Object.entries(ms).forEach(([k, v]) => { if (v) data[k] = parseFloat(v); });
    try {
      const r = await api.updateAthleteMiltiskill(athleteId, data, token);
      setProfile((p: any) => ({ ...p, six_axis: r.six_axis, multiskill: r.multiskill }));
      setEditMode(false);
    } catch (e: any) { Alert.alert('Errore', e?.message || 'Impossibile salvare'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <View style={[dp$.panel, { backgroundColor: theme.surface, borderColor: theme.border2, alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={theme.accent} />
    </View>
  );
  if (!profile) return null;

  const ir = profile.injury_risk || {};
  const MS_FIELDS = [
    { key: 'endurance_gps',   label: 'GPS Endurance', icon: 'navigate', color: '#00E5FF' },
    { key: 'strength_watts',  label: 'Strength (Watt)', icon: 'barbell', color: '#FF3B30' },
    { key: 'sleep_score',     label: 'Sleep Score', icon: 'moon', color: '#AF52DE' },
    { key: 'hrv_score',       label: 'HRV Score', icon: 'heart', color: '#00FF87' },
  ];

  return (
    <Animated.View entering={FadeIn.duration(250)} style={[dp$.panel, { backgroundColor: theme.surface, borderColor: theme.border2 }]}>
      {/* Header */}
      <View style={dp$.header}>
        <View style={[dp$.avatar, { backgroundColor: profile.avatar_color || theme.accent }]}>
          <Text style={dp$.avatarLetter}>{(profile.username || '?')[0]}</Text>
        </View>
        <View style={dp$.headerInfo}>
          <Text style={[dp$.name, MONT(), { color: theme.text }]}>{profile.username}</Text>
          <Text style={[dp$.meta, MONT('300'), { color: theme.textSec }]}>
            LVL {profile.level} · #{profile.global_rank} Global · {profile.city}
          </Text>
          {profile.crews?.length > 0 && (
            <Text style={[dp$.crewBadge, { color: theme.accent }]}>
              🛡 {profile.crews[0].name}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={onClose} style={dp$.closeBtn}>
          <Ionicons name="close" size={16} color={theme.textTer} />
        </TouchableOpacity>
      </View>

      {/* PDF Export Button */}
      <TouchableOpacity
        style={[dp$.pdfBtn, { backgroundColor: theme.accent + '12', borderColor: theme.accent + '44' }]}
        onPress={() => {
          const url = api.getAthletePdfUrl(athleteId);
          if (typeof window !== 'undefined') {
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.click();
          }
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="document-text" size={14} color={theme.accent} />
        <Text style={[{ color: theme.accent, fontSize: 12, letterSpacing: 1.5 }, MONT('800')]}>EXPORT KORE PASSPORT (PDF)</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* KORE SCORE — Hero metric */}
        {koreData && (
          <View style={[dp$.section, { backgroundColor: koreData.color + '06', borderBottomColor: koreData.color + '20' }]}>
            <View style={dp$.secHeader}>
              <Text style={[dp$.sectionTitle, MONT('900'), { color: koreData.color }]}>KORE SCORE — L'ARBITRO</Text>
              {koreData.penalty_active && (
                <View style={[dp$.penaltyTag, { borderColor: '#FF3B3040' }]}>
                  <Ionicons name="warning" size={10} color="#FF3B30" />
                  <Text style={dp$.penaltyTagText}>PENALITÀ POSTURA</Text>
                </View>
              )}
            </View>
            <KoreScoreGauge kore={koreData} size={170} />
          </View>
        )}

        {/* 6-Axis Radar */}
        <View style={dp$.section}>
          <Text style={[dp$.sectionTitle, MONT('900'), { color: theme.textTer }]}>DNA MULTI-SKILL RADAR</Text>
          <View style={dp$.radarWrap}>
            <SixAxisRadar data={profile.six_axis || {}} size={170} />
          </View>
          {/* Axis breakdown */}
          <View style={dp$.axisGrid}>
            {SIX_AXES.map((k, i) => (
              <View key={k} style={[dp$.axisItem, { backgroundColor: theme.surface2 }]}>
                <Text style={[dp$.axisLabel, MONT('300'), { color: theme.textTer }]}>{SIX_LABELS[i]}</Text>
                <Text style={[dp$.axisVal, MONT('900'), { color: SIX_COLORS[i % SIX_COLORS.length] }]}>
                  {profile.six_axis?.[k] ?? '—'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Injury Risk */}
        <View style={[dp$.section, { backgroundColor: ir.color + '08', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: ir.color + '25' }]}>
          <View style={dp$.riskHeader}>
            <Ionicons name="warning" size={14} color={ir.color} />
            <Text style={[dp$.sectionTitle, MONT('900'), { color: ir.color }]}>INJURY RISK: {ir.level}</Text>
            <Text style={[dp$.riskPct, MONT('900'), { color: ir.color }]}>{ir.risk_pct}%</Text>
          </View>
          <View style={[dp$.riskBar, { backgroundColor: theme.surface2 }]}>
            <View style={[dp$.riskFill, { width: `${ir.risk_pct}%` as any, backgroundColor: ir.color }]} />
          </View>
          <Text style={[dp$.riskRec, MONT('300'), { color: theme.textSec }]}>{ir.recommendation}</Text>
          <View style={dp$.riskDetail}>
            <Text style={[MONT('400'), { color: theme.textTer, fontSize: 12 }]}>⬆ {ir.dominant} · ⬇ {ir.weak}</Text>
            {ir.low_recovery && <View style={[dp$.recovWarn, { borderColor: '#AF52DE40' }]}><Text style={[MONT('300'), { color: '#AF52DE', fontSize: 12 }]}>⚠ Recovery bassa</Text></View>}
          </View>
        </View>

        {/* Scan Trend */}
        <View style={dp$.section}>
          <Text style={[dp$.sectionTitle, MONT('900'), { color: theme.textTer }]}>TREND SCAN NEXUS</Text>
          <View style={dp$.trendRow}>
            <TrendSparkline trend={profile.scan_trend || []} direction={profile.trend_direction} />
            <Text style={[dp$.trendLabel, MONT('300'), { color: profile.trend_direction === 'up' ? '#00FF87' : profile.trend_direction === 'down' ? '#FF3B30' : theme.textTer }]}>
              {profile.trend_direction === 'up' ? '↑ In miglioramento' : profile.trend_direction === 'down' ? '↓ In calo' : '→ Stabile'}
            </Text>
          </View>
        </View>

        {/* External Metrics Editor */}
        <View style={dp$.section}>
          <View style={dp$.secHeader}>
            <Text style={[dp$.sectionTitle, MONT('900'), { color: theme.textTer }]}>METRICHE ESTERNE</Text>
            <TouchableOpacity onPress={() => setEditMode(e => !e)}>
              <Ionicons name={editMode ? 'close' : 'pencil'} size={14} color={theme.textTer} />
            </TouchableOpacity>
          </View>
          {MS_FIELDS.map(f => (
            <View key={f.key} style={dp$.msRow}>
              <Ionicons name={f.icon as any} size={13} color={f.color} />
              <Text style={[dp$.msLabel, MONT('300'), { color: theme.textSec }]}>{f.label}</Text>
              {editMode ? (
                <TextInput
                  style={[dp$.msInput, { backgroundColor: theme.surface2, color: theme.text, borderColor: theme.border }]}
                  value={ms[f.key] || ''}
                  onChangeText={v => setMs(prev => ({ ...prev, [f.key]: v }))}
                  keyboardType="numeric"
                  placeholder="0–100"
                  placeholderTextColor={theme.textTer}
                />
              ) : (
                <Text style={[dp$.msVal, MONT('900'), { color: f.color }]}>
                  {profile.multiskill?.[f.key] ? `${profile.multiskill[f.key]}` : '—'}
                </Text>
              )}
            </View>
          ))}
          {editMode && (
            <TouchableOpacity style={[dp$.saveBtn, { backgroundColor: theme.accent }]} onPress={handleSaveMs} disabled={saving}>
              {saving ? <ActivityIndicator color="#000" size="small" /> : <Text style={[dp$.saveBtnText, MONT('900')]}>SALVA METRICHE</Text>}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const dp$ = StyleSheet.create({
  panel: { width: 310, borderLeftWidth: 1, paddingTop: 16, flexShrink: 0 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 24, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#000', fontSize: 19, fontWeight: '900' },
  headerInfo: { flex: 1, gap: 2 },
  name: { fontSize: 16, letterSpacing: 1 },
  meta: { fontSize: 12, letterSpacing: 0.5 },
  crewBadge: { fontSize: 12, letterSpacing: 1 },
  closeBtn: { padding: 4 },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 24, marginTop: 10, marginBottom: 6,
    borderWidth: 1, borderRadius: 8, paddingVertical: 8,
  },
  section: { paddingHorizontal: 24, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  sectionTitle: { fontSize: 11, letterSpacing: 3 },
  radarWrap: { alignItems: 'center' },
  axisGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  axisItem: { flex: 1, minWidth: 44, alignItems: 'center', borderRadius: 8, paddingVertical: 6 },
  axisLabel: { fontSize: 10, letterSpacing: 1.5 },
  axisVal: { fontSize: 17 },
  riskHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  riskPct: { marginLeft: 'auto' as any, fontSize: 18 },
  riskBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  riskFill: { height: '100%', borderRadius: 2 },
  riskRec: { fontSize: 13, lineHeight: 15 },
  riskDetail: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recovWarn: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trendLabel: { fontSize: 13 },
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  penaltyTag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: 'rgba(255,59,48,0.08)' },
  penaltyTagText: { color: '#FF3B30', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  msRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  msLabel: { flex: 1, fontSize: 13 },
  msVal: { fontSize: 16 },
  msInput: { width: 60, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 14, textAlign: 'right' } as any,
  saveBtn: { borderRadius: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  saveBtnText: { color: '#000', fontSize: 13, letterSpacing: 2 },
});

// ── Crew Panel ────────────────────────────────────────────────────────────────
function CrewPanel() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ATHLETE');
  const [inviteCrewId, setInviteCrewId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try { const d = await api.getCrewManagement(token); setData(d); } catch (_) {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async () => {
    if (!token || !inviteEmail || !inviteCrewId) return;
    setInviting(true);
    try {
      await api.inviteToCrewByEmail(inviteCrewId, inviteEmail.toLowerCase(), inviteRole, token);
      Alert.alert('INVITO INVIATO', `${inviteEmail} ha ricevuto un invito alla crew.`);
      setInviteEmail('');
      load();
    } catch (e: any) { Alert.alert('Errore', e?.message || 'Impossibile inviare invito'); }
    finally { setInviting(false); }
  };

  const handleRespond = async (id: string, action: 'accept' | 'decline') => {
    if (!token) return;
    setRespondingId(id);
    try { await api.respondToCrewInvitation(id, action, token); load(); }
    catch (e: any) { Alert.alert('Errore', e?.message || 'Impossibile rispondere'); }
    finally { setRespondingId(null); }
  };

  if (loading) return <View style={[cp$.root, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={theme.accent} /></View>;

  return (
    <ScrollView style={cp$.root} contentContainerStyle={cp$.content}>
      {/* Crew Cards */}
      {(data?.crews || []).map((crew: any) => (
        <View key={crew.id} style={[cp$.crewCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          {/* Header */}
          <View style={cp$.crewHeader}>
            <View style={cp$.crewName}>
              <Text style={[cp$.crewTitle, MONT(), { color: theme.text }]}>{crew.name}</Text>
              <Text style={[cp$.crewMeta, MONT('300'), { color: theme.textTer }]}>
                {crew.members_count} Kore · DNA {crew.weighted_dna} (pesato) · {crew.battle_wins}V/{crew.battle_total - crew.battle_wins}S
              </Text>
            </View>
            <View style={cp$.crewStats}>
              <Text style={[cp$.crewDnaScore, MONT(), { color: crew.weighted_dna >= 75 ? theme.accentGold : theme.accent }]}>
                {crew.weighted_dna}
              </Text>
              <Text style={[cp$.crewDnaLabel, MONT('300'), { color: theme.textTer }]}>KORE</Text>
            </View>
          </View>

          {/* Avg 6-axis mini radar */}
          {crew.avg_six_axis && (
            <View style={cp$.radarRow}>
              <SixAxisRadar data={crew.avg_six_axis} size={90} showLabels />
              <View style={cp$.axisLabels}>
                {SIX_AXES.map((k, i) => (
                  <View key={k} style={cp$.axisRow}>
                    <Text style={[cp$.axisName, MONT('300'), { color: theme.textTer }]}>{SIX_LABELS[i]}</Text>
                    <View style={cp$.axisBarBg}>
                      <View style={[cp$.axisBarFill, { width: `${crew.avg_six_axis[k]}%` as any, backgroundColor: SIX_COLORS[i % SIX_COLORS.length] }]} />
                    </View>
                    <Text style={[cp$.axisNum, MONT('900'), { color: SIX_COLORS[i % SIX_COLORS.length] }]}>
                      {crew.avg_six_axis[k]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Member list with role badges */}
          <View style={cp$.memberList}>
            {crew.members.slice(0, 6).map((m: any) => (
              <View key={m.id} style={cp$.memberRow}>
                <View style={[cp$.memberAvatar, { backgroundColor: m.avatar_color || theme.accent }]}>
                  <Text style={cp$.memberLetter}>{(m.username || '?')[0]}</Text>
                </View>
                <Text style={[cp$.memberName, { color: theme.text }]} numberOfLines={1}>{m.username}</Text>
                <View style={[cp$.rolePill, {
                  backgroundColor: m.role === 'COACH' ? theme.accent + '15' : m.role === 'OWNER' ? theme.accentGold + '15' : theme.surface2,
                  borderColor: m.role === 'COACH' ? theme.accent + '40' : m.role === 'OWNER' ? theme.accentGold + '40' : theme.border,
                }]}>
                  {m.role === 'COACH' && <Ionicons name="medal" size={9} color={theme.accent} />}
                  {m.role === 'OWNER' && <Ionicons name="shield" size={9} color={theme.accentGold} />}
                  <Text style={[cp$.roleTxt, MONT('900'), { color: m.role === 'COACH' ? theme.accent : m.role === 'OWNER' ? theme.accentGold : theme.textTer }]}>
                    {m.role}
                  </Text>
                </View>
                <Text style={[cp$.memberDna, MONT('900'), { color: theme.textSec }]}>{m.dna_avg}</Text>
              </View>
            ))}
            {crew.members.length > 6 && (
              <Text style={[cp$.moreMem, MONT('300'), { color: theme.textTer }]}>+{crew.members.length - 6} altri...</Text>
            )}
          </View>

          {/* Invite form for this crew */}
          <View style={[cp$.inviteBox, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            <Text style={[cp$.inviteTitle, MONT('900'), { color: theme.textSec }]}>INVIA INVITO (stile Apple Calendar)</Text>
            <TextInput
              style={[cp$.inviteInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="email@kore.com"
              placeholderTextColor={theme.textTer}
              value={inviteCrewId === crew.id ? inviteEmail : ''}
              onFocus={() => setInviteCrewId(crew.id)}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={cp$.roleRow}>
              {['ATHLETE', 'COACH'].map(r => (
                <TouchableOpacity key={r}
                  style={[cp$.roleOpt, inviteRole === r && { borderColor: theme.accent, backgroundColor: theme.accent + '10' }]}
                  onPress={() => setInviteRole(r)}
                >
                  <Text style={[cp$.roleOptTxt, MONT('900'), { color: inviteRole === r ? theme.accent : theme.textTer }]}>{r}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[cp$.inviteBtn, { backgroundColor: inviteEmail && inviteCrewId === crew.id ? theme.accent : theme.surface }]}
                onPress={handleInvite}
                disabled={inviting || !inviteEmail || inviteCrewId !== crew.id}
                activeOpacity={0.85}
              >
                {inviting ? <ActivityIndicator color="#000" size="small" /> : (
                  <><Ionicons name="person-add" size={13} color={inviteEmail && inviteCrewId === crew.id ? '#000' : theme.textTer} />
                  <Text style={[cp$.inviteBtnTxt, MONT('900'), { color: inviteEmail && inviteCrewId === crew.id ? '#000' : theme.textTer }]}>INVITA</Text></>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}

      {/* Pending invitations for me */}
      {data?.pending_for_me?.length > 0 && (
        <View style={[cp$.section, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[cp$.sectionTitle, MONT('900'), { color: theme.textTer }]}>INVITI IN ATTESA PER TE</Text>
          {data.pending_for_me.map((inv: any) => (
            <View key={inv.id} style={cp$.pendingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[cp$.pendingCrew, MONT('700'), { color: theme.text }]}>{inv.crew_name}</Text>
                <Text style={[MONT('300'), { color: theme.textTer, fontSize: 13 }]}>
                  Da {inv.invited_by} · Ruolo: {inv.role}
                </Text>
              </View>
              <TouchableOpacity
                style={[cp$.acceptBtn, { backgroundColor: theme.accent }]}
                onPress={() => handleRespond(inv.id, 'accept')}
                disabled={respondingId === inv.id}
              >
                <Text style={[cp$.acceptTxt, MONT('900')]}>ACCETTA</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[cp$.declineBtn, { borderColor: theme.border }]}
                onPress={() => handleRespond(inv.id, 'decline')}
                disabled={respondingId === inv.id}
              >
                <Text style={[cp$.declineTxt, { color: theme.textTer }]}>Rifiuta</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Sent invitations */}
      {data?.sent_invitations?.length > 0 && (
        <View style={[cp$.section, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[cp$.sectionTitle, MONT('900'), { color: theme.textTer }]}>INVITI INVIATI</Text>
          {data.sent_invitations.slice(0, 5).map((inv: any) => (
            <View key={inv.id} style={cp$.sentRow}>
              <Text style={[MONT('400'), { flex: 1, color: theme.textSec, fontSize: 14 }]}>{inv.invitee}</Text>
              <Text style={[MONT('300'), { color: theme.textTer, fontSize: 13 }]}>{inv.crew_name}</Text>
              <View style={[cp$.statusPill, {
                backgroundColor: inv.status === 'accepted' ? '#00FF8715' : inv.status === 'declined' ? '#FF3B3015' : theme.surface2,
                borderColor: inv.status === 'accepted' ? '#00FF8740' : inv.status === 'declined' ? '#FF3B3040' : theme.border,
              }]}>
                <Text style={[MONT('900'), { fontSize: 10, letterSpacing: 1.5, color: inv.status === 'accepted' ? '#00FF87' : inv.status === 'declined' ? '#FF3B30' : theme.textTer }]}>
                  {(inv.status || 'PENDING').toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const cp$ = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  crewCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
  crewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  crewName: { flex: 1, gap: 3 },
  crewTitle: { fontSize: 18, letterSpacing: 2 },
  crewMeta: { fontSize: 12, letterSpacing: 0.5 },
  crewStats: { alignItems: 'center' },
  crewDnaScore: { fontSize: 28, letterSpacing: 1 },
  crewDnaLabel: { fontSize: 10, letterSpacing: 3 },
  radarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  axisLabels: { flex: 1, gap: 5 },
  axisRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  axisName: { width: 24, fontSize: 11, letterSpacing: 1 },
  axisBarBg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  axisBarFill: { height: '100%', borderRadius: 2 },
  axisNum: { width: 26, fontSize: 12, textAlign: 'right' },
  memberList: { gap: 6 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  memberLetter: { color: '#000', fontSize: 12, fontWeight: '900' },
  memberName: { flex: 1, fontSize: 14, letterSpacing: 0.3 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  roleTxt: { fontSize: 10, letterSpacing: 1.5 },
  memberDna: { fontSize: 14, width: 28, textAlign: 'right' },
  moreMem: { fontSize: 12, textAlign: 'right' },
  inviteBox: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 8 },
  inviteTitle: { fontSize: 11, letterSpacing: 2.5 },
  inviteInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 } as any,
  roleRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  roleOpt: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, borderColor: 'rgba(255,255,255,0.07)' },
  roleOptTxt: { fontSize: 11, letterSpacing: 1.5 },
  inviteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, paddingVertical: 8 },
  inviteBtnTxt: { fontSize: 12, letterSpacing: 1.5 },
  section: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 11, letterSpacing: 3 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  pendingCrew: { fontSize: 15, letterSpacing: 0.5 },
  acceptBtn: { borderRadius: 7, paddingHorizontal: 12, paddingVertical: 7, alignItems: 'center' },
  acceptTxt: { color: '#000', fontSize: 12, letterSpacing: 1.5 },
  declineBtn: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7 },
  declineTxt: { fontSize: 12 },
  sentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  statusPill: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
});

// ── Main Module ───────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: 'kore_score', label: 'KORE' },
  { key: 'injury',     label: 'RISCHIO' },
  { key: 'rank',       label: 'RANK' },
  { key: 'level',      label: 'LVL' },
];
const INJURY_FILTERS = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];

export default function AthletesModule() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('dna_avg');
  const [injuryFilter, setInjuryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'table' | 'crew' | 'compare'>('table');
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const d = await api.getAthletesFullTable(token, sortBy, injuryFilter !== 'ALL' ? injuryFilter : undefined);
      setAthletes(d.athletes || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, [token, sortBy, injuryFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = athletes.filter(a => !search || a.username?.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={[am$.root, { backgroundColor: theme.bg }]}>
      {/* TOP BAR */}
      <View style={[am$.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {/* View switcher */}
        <View style={am$.viewSwitch}>
          {(['table', 'compare', 'crew'] as const).map(v => (
            <TouchableOpacity key={v}
              style={[am$.viewBtn, view === v && { backgroundColor: theme.accent + '18', borderColor: theme.accent + '50' }]}
              onPress={() => setView(v)}
            >
              <Ionicons name={v === 'table' ? 'people' : v === 'compare' ? 'git-compare' : 'shield'} size={14} color={view === v ? theme.accent : theme.textTer} />
              <Text style={[am$.viewBtnTxt, MONT('900'), { color: view === v ? theme.accent : theme.textTer }]}>
                {v === 'table' ? 'KORE CRM' : v === 'compare' ? 'CONFRONTO' : 'CREW PANEL'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {view === 'table' && (
          <View style={am$.filterRow}>
            {/* Search */}
            <View style={[am$.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
              <Ionicons name="search" size={13} color={theme.textTer} />
              <TextInput
                style={[am$.searchInput, MONT('400'), { color: theme.text }]}
                placeholder="Cerca Kore..."
                placeholderTextColor={theme.textTer}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            {/* Sort */}
            {SORT_OPTIONS.map(s => (
              <TouchableOpacity key={s.key}
                style={[am$.sortBtn, sortBy === s.key && { backgroundColor: theme.accent + '15', borderColor: theme.accent + '50' }]}
                onPress={() => setSortBy(s.key)}
              >
                <Text style={[am$.sortTxt, MONT('900'), { color: sortBy === s.key ? theme.accent : theme.textTer }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
            {/* Injury filter */}
            {INJURY_FILTERS.map(f => (
              <TouchableOpacity key={f}
                style={[am$.sortBtn, injuryFilter === f && { borderColor: f === 'HIGH' ? '#FF3B3050' : f === 'MEDIUM' ? '#FF950050' : f === 'LOW' ? '#00FF8750' : theme.accent + '50', backgroundColor: f === 'HIGH' ? '#FF3B3010' : f === 'MEDIUM' ? '#FF950010' : f === 'LOW' ? '#00FF8710' : theme.accent + '10' }]}
                onPress={() => setInjuryFilter(f)}
              >
                <Text style={[am$.sortTxt, MONT('900'), { color: injuryFilter === f ? (f === 'HIGH' ? '#FF3B30' : f === 'MEDIUM' ? '#FF9500' : f === 'LOW' ? '#00FF87' : theme.accent) : theme.textTer }]}>
                  {f === 'ALL' ? 'TUTTI' : f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* CONTENT AREA */}
      {view === 'crew' ? (
        <CrewPanel />
      ) : view === 'compare' ? (
        <ComparisonView athletes={athletes} token={token} />
      ) : (
        <View style={am$.splitView}>
          {/* TABLE */}
          <ScrollView style={am$.tableArea} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={am$.loadWrap}><ActivityIndicator color={theme.accent} /></View>
            ) : (
              <>
                {/* Table header */}
                <View style={[am$.tableHead, { backgroundColor: theme.surface, borderBottomColor: theme.border2 }]}>
                  {['#', 'KORE', 'SCORE', 'RISK', 'SCAN', 'CREW', 'RANK'].map(h => (
                    <Text key={h} style={[am$.th, MONT('900'), { color: theme.textTer, flex: h === 'KORE' ? 2 : undefined }]}>{h}</Text>
                  ))}
                  <View style={{ width: 70 }} />
                </View>
                {filtered.map((a, idx) => (
                  <Animated.View key={a.id} entering={FadeInDown.delay(idx * 20).duration(200)}>
                    <TouchableOpacity
                      style={[am$.tableRow, { borderBottomColor: theme.border }, selectedId === a.id && { backgroundColor: theme.accent + '06' }]}
                      onPress={() => setSelectedId(selectedId === a.id ? null : a.id)}
                      activeOpacity={0.8}
                    >
                      {/* Rank indicator */}
                      {selectedId === a.id && <View style={[am$.rowIndicator, { backgroundColor: theme.accent }]} />}
                      <Text style={[am$.td, MONT('900'), { color: theme.textTer, width: 28, textAlign: 'center' }]}>#{idx + 1}</Text>
                      {/* Athlete */}
                      <View style={[am$.athleteCell, { flex: 2 }]}>
                        <View style={[am$.rowAvatar, { backgroundColor: a.avatar_color || theme.accent }]}>
                          <Text style={am$.rowAvatarLetter}>{(a.username || '?')[0]}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[am$.td, MONT('700'), { color: theme.text }]} numberOfLines={1}>{a.username}</Text>
                          <Text style={[am$.tdSub, MONT('300'), { color: theme.textTer }]}>{a.sport} · LVL {a.level}</Text>
                        </View>
                      </View>
                      {/* KORE SCORE (replaces plain DNA avg) */}
                      <View style={{ width: 56, alignItems: 'center', gap: 2 }}>
                        <Text style={[am$.td, MONT('900'), { color: a.kore_color || (a.dna_avg >= 80 ? theme.accentGold : theme.text), width: 'auto' as any }]}>
                          {a.kore_score || a.dna_avg}
                        </Text>
                        {a.kore_grade && (
                          <View style={[am$.koreGradePill, { backgroundColor: (a.kore_color || theme.accent) + '15', borderColor: (a.kore_color || theme.accent) + '40' }]}>
                            <Text style={[am$.koreGradeText, { color: a.kore_color || theme.accent }]}>{a.kore_grade}</Text>
                          </View>
                        )}
                      </View>
                      {/* Injury */}
                      <View style={{ width: 70 }}>
                        <RiskBadge risk={a.injury_risk} />
                      </View>
                      {/* Scan trend */}
                      <View style={{ width: 50, alignItems: 'center' }}>
                        {a.days_since_scan !== null && a.days_since_scan !== undefined
                          ? <Text style={[am$.tdSub, { color: a.days_since_scan > 7 ? '#FF9500' : '#00FF87' }]}>{a.days_since_scan}g</Text>
                          : <Text style={[am$.tdSub, { color: theme.textTer }]}>—</Text>}
                      </View>
                      {/* Crew */}
                      <Text style={[am$.tdSub, MONT('300'), { color: theme.textSec, width: 80 }]} numberOfLines={1}>
                        {a.crews?.[0] || '—'}
                      </Text>
                      {/* Global rank */}
                      <Text style={[am$.td, MONT('900'), { color: a.global_rank <= 3 ? theme.accentGold : theme.textSec, width: 40, textAlign: 'center' }]}>
                        #{a.global_rank}
                      </Text>
                      {/* Mini radar preview */}
                      <View style={{ width: 44 }}>
                        <SixAxisRadar data={a.six_axis || {}} size={40} showLabels={false} />
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </>
            )}
          </ScrollView>

          {/* DEEP PROFILE (right panel) */}
          {selectedId && (
            <DeepProfilePanel athleteId={selectedId} onClose={() => setSelectedId(null)} />
          )}
        </View>
      )}
    </View>
  );
}

const am$ = StyleSheet.create({
  root: { flex: 1 },
  topBar: { borderBottomWidth: 1, paddingHorizontal: 24, paddingVertical: 10, gap: 10 },
  viewSwitch: { flexDirection: 'row', gap: 8 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'transparent', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  viewBtnTxt: { fontSize: 13, letterSpacing: 1.5 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 160 },
  searchInput: { fontSize: 14, flex: 1, outlineStyle: 'none' } as any,
  sortBtn: { borderWidth: 1, borderColor: 'transparent', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
  sortTxt: { fontSize: 11, letterSpacing: 2 },
  splitView: { flex: 1, flexDirection: 'row' },
  tableArea: { flex: 1 },
  loadWrap: { alignItems: 'center', paddingTop: 40 },
  koreGradePill: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  koreGradeText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  th: { fontSize: 10, letterSpacing: 2.5, width: 50, textAlign: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, gap: 8, position: 'relative' },
  rowIndicator: { position: 'absolute', left: 0, top: 4, bottom: 4, width: 3, borderRadius: 2 },
  athleteCell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowAvatarLetter: { color: '#000', fontSize: 14, fontWeight: '900' },
  td: { fontSize: 15, width: 50, textAlign: 'center' },
  tdSub: { fontSize: 12, letterSpacing: 0.3 },
});
