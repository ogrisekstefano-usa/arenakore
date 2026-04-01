/**
 * COACH STUDIO — MODULE 1: ATHLETE ANALYTICS
 * Advanced table + DNA Radar Comparison + Compliance Chart
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon, Line, Circle, Text as SvgText, G, Polyline } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { LineChart, MiniRadar } from '../../components/studio/StudioComponents';

const DNA_KEYS = ['velocita','forza','resistenza','agilita','tecnica','potenza'];
const DNA_LABELS = ['VEL','FOR','RES','AGI','TEC','POT'];
const RADAR_COLORS = ['#00F2FF','#D4AF37','#FF453A','#AF52DE'];

// ── DNA Radar Chart (SVG) ──────────────────────────────────────────────
function DNARadar({ athletes, size = 220 }: { athletes: any[]; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 28;
  const n = DNA_KEYS.length;

  const pts = (vals: number[], scale = 1) =>
    DNA_KEYS.map((k, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const v = (vals[i] / 100) * r * scale;
      return [cx + v * Math.cos(angle), cy + v * Math.sin(angle)] as [number, number];
    });

  const axisPoints = pts(new Array(n).fill(100));
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <Svg width={size} height={size}>
      {/* Grid */}
      {gridLevels.map(lvl => (
        <Polygon
          key={lvl}
          points={pts(new Array(n).fill(100), lvl).map(p => p.join(',')).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1}
        />
      ))}
      {/* Axes */}
      {axisPoints.map(([x, y], i) => (
        <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      ))}
      {/* Athlete polygons */}
      {athletes.map((ath, ai) => {
        const vals = DNA_KEYS.map(k => ath.dna?.[k] ?? 50);
        const ap = pts(vals);
        return (
          <Polygon
            key={ath.id}
            points={ap.map(p => p.join(',')).join(' ')}
            fill={RADAR_COLORS[ai % RADAR_COLORS.length] + '22'}
            stroke={RADAR_COLORS[ai % RADAR_COLORS.length]}
            strokeWidth={2}
            opacity={0.85}
          />
        );
      })}
      {/* Axis labels */}
      {axisPoints.map(([x, y], i) => (
        <SvgText
          key={i} x={x + (x > cx ? 6 : x < cx ? -6 : 0)}
          y={y + (y > cy ? 14 : y < cy ? -6 : 4)}
          fontSize={9} fill="rgba(255,255,255,0.35)" textAnchor="middle"
          fontWeight="bold"
        >{DNA_LABELS[i]}</SvgText>
      ))}
    </Svg>
  );
}

// ── Compliance Bar Chart (SVG) ────────────────────────────────────────
function ComplianceChart({ templates }: { templates: any[] }) {
  const w = 400, barH = 28, gap = 8, padLeft = 130;
  const total = templates.length;
  const svgH = total * (barH + gap) + 20;

  return (
    <View style={cc$.wrap}>
      <Text style={cc$.title}>COMPLIANCE TEMPLATE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={w} height={svgH}>
          {templates.map((t, i) => {
            const y = i * (barH + gap) + 4;
            const barW = ((t.compliance_pct || 0) / 100) * (w - padLeft - 20);
            const col = t.compliance_pct >= 70 ? '#34C759' : t.compliance_pct >= 40 ? '#FF9500' : '#FF453A';
            return (
              <G key={t.push_id}>
                <SvgText x={0} y={y + barH / 2 + 4} fontSize={10} fill="rgba(255,255,255,0.4)" fontWeight="bold">
                  {(t.template_name || '').substring(0, 16).toUpperCase()}
                </SvgText>
                <Polygon
                  points={`${padLeft},${y} ${padLeft + Math.max(barW, 4)},${y} ${padLeft + Math.max(barW, 4)},${y + barH} ${padLeft},${y + barH}`}
                  fill={col + '30'} stroke={col} strokeWidth={1}
                />
                <SvgText x={padLeft + Math.max(barW, 4) + 6} y={y + barH / 2 + 4} fontSize={11} fill={col} fontWeight="bold">
                  {t.compliance_pct}%
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </ScrollView>
    </View>
  );
}

const cc$ = StyleSheet.create({
  wrap: { backgroundColor: '#0A0A0A', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  title: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 16 },
});

// ── Main Athletes Module ───────────────────────────────────────────────
const SORT_COLS = [
  { key: 'username', label: 'ATLETA' },
  { key: 'dna_avg', label: 'KORE' },
  { key: 'level', label: 'LVL' },
  { key: 'xp', label: 'XP' },
  { key: 'compliance_pct', label: '%' },
  { key: 'days_since_scan', label: 'SCAN' },
];

const DNA_SHORT = ['V','F','R','A','T','P'];

export default function AthletesModule() {
  const { token } = useAuth();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [radarAthletes, setRadarAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('dna_avg');
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('desc');
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState('');
  const [deepDiveId, setDeepDiveId] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<any>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [a, c] = await Promise.all([
        api.getCoachAthletes(token, sortBy, sortOrder, minScore ? Number(minScore) : undefined),
        api.getCoachCompliance(token),
      ]);
      setAthletes(a.athletes || []);
      setCompliance(c.templates || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, [token, sortBy, sortOrder, minScore]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selectedIds.length === 0 || !token) { setRadarAthletes([]); return; }
    api.getCoachRadar(selectedIds, token).then(d => setRadarAthletes(d.athletes || [])).catch(() => {});
  }, [selectedIds, token]);

  useEffect(() => {
    if (!deepDiveId || !token) { setHistoricalData(null); return; }
    api.getAthleteHistorical(deepDiveId, token).then(d => setHistoricalData(d)).catch(() => {});
  }, [deepDiveId, token]);

  const handleSort = (key: string) => {
    if (key === sortBy) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortOrder('desc'); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const filtered = athletes.filter(a =>
    !search || a.username.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <View style={m$.center}><ActivityIndicator color="#00F2FF" /></View>;

  return (
    <ScrollView style={m$.root} contentContainerStyle={m$.content}>
      <Text style={m$.pageTitle}>ATHLETE ANALYTICS</Text>

      {/* Filters */}
      <View style={m$.filters}>
        <View style={m$.searchWrap}>
          <Ionicons name="search" size={14} color="rgba(255,255,255,0.3)" />
          <TextInput
            style={m$.searchInput}
            placeholder="Cerca atleta..."
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={m$.searchWrap}>
          <Ionicons name="analytics" size={14} color="rgba(255,255,255,0.3)" />
          <TextInput
            style={m$.searchInput}
            placeholder="Min KORE (es. 60)"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={minScore}
            onChangeText={setMinScore}
            onSubmitEditing={load}
            keyboardType="numeric"
          />
        </View>
        <View style={m$.selectedInfo}>
          <Text style={m$.selectedText}>{selectedIds.length}/4 selezionati per Radar</Text>
          {selectedIds.length > 0 && (
            <TouchableOpacity onPress={() => setSelectedIds([])}>
              <Text style={m$.clearSel}>RESET</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Two-column layout */}
      <View style={m$.cols}>
        {/* LEFT: Table */}
        <View style={m$.tableWrap}>
          {/* Table header */}
          <View style={m$.tableHeader}>
            <View style={m$.chkCol} />
            {SORT_COLS.map(col => (
              <TouchableOpacity
                key={col.key}
                style={[m$.th, col.key === 'username' && m$.thName]}
                onPress={() => handleSort(col.key)}
              >
                <Text style={[m$.thText, sortBy === col.key && { color: '#00F2FF' }]}>{col.label}</Text>
                {sortBy === col.key && (
                  <Ionicons name={sortOrder === 'desc' ? 'chevron-down' : 'chevron-up'} size={10} color="#00F2FF" />
                )}
              </TouchableOpacity>
            ))}
            {DNA_SHORT.map(d => (
              <View key={d} style={m$.thDna}>
                <Text style={m$.thTextSm}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Table rows */}
          {filtered.map((ath, i) => {
            const isSelected = selectedIds.includes(ath.id);
            const selColor = RADAR_COLORS[selectedIds.indexOf(ath.id) % RADAR_COLORS.length];
            return (
              <Animated.View
                key={ath.id}
                entering={FadeInDown.delay(i * 30).duration(200)}
                style={[m$.row, isSelected && { borderColor: selColor + '60', backgroundColor: selColor + '08' }]}
              >
                {/* Select checkbox */}
                <TouchableOpacity style={m$.chkCol} onPress={() => toggleSelect(ath.id)}>
                  <View style={[m$.chk, isSelected && { backgroundColor: selColor, borderColor: selColor }]}>
                    {isSelected && <Ionicons name="checkmark" size={10} color="#000" />}
                  </View>
                </TouchableOpacity>

                {/* Name */}
                <TouchableOpacity style={m$.tdName} onPress={() => setDeepDiveId(ath.id === deepDiveId ? null : ath.id)}>
                  <View style={[m$.avatar, { backgroundColor: ath.avatar_color || '#00F2FF' }]}>
                    <Text style={m$.avatarLetter}>{ath.username[0]}</Text>
                  </View>
                  <Text style={[m$.tdNameText, ath.id === deepDiveId && { color: '#00F2FF' }]} numberOfLines={1}>{ath.username}</Text>
                </TouchableOpacity>

                {/* KORE Score */}
                <Text style={[m$.td, { color: ath.dna_avg >= 80 ? '#D4AF37' : '#FFFFFF' }]}>{ath.dna_avg}</Text>

                {/* Level */}
                <Text style={m$.tdSm}>{ath.level}</Text>

                {/* XP */}
                <Text style={m$.td}>{(ath.xp || 0).toLocaleString()}</Text>

                {/* Compliance */}
                <View style={m$.tdCompliance}>
                  <Text style={[m$.tdSm, { color: ath.compliance_pct >= 70 ? '#34C759' : '#FF9500' }]}>
                    {ath.compliance_pct}%
                  </Text>
                </View>

                {/* Days since scan */}
                <View style={m$.tdScan}>
                  {ath.days_since_scan !== null && ath.days_since_scan !== undefined ? (
                    <Text style={[m$.tdSm, { color: ath.days_since_scan > 7 ? '#FF9500' : '#34C759' }]}>
                      {ath.days_since_scan}g
                    </Text>
                  ) : <Text style={m$.tdSm}>—</Text>}
                </View>

                {/* DNA mini bars */}
                {DNA_KEYS.map(k => (
                  <View key={k} style={m$.dnaMini}>
                    <View style={m$.dnaTrack}>
                      <View style={[m$.dnaFill, { height: `${ath.dna?.[k] ?? 50}%` as any }]} />
                    </View>
                    <Text style={m$.dnaVal}>{ath.dna?.[k] ?? '?'}</Text>
                  </View>
                ))}
              </Animated.View>
            );
          })}
        </View>

        {/* RIGHT: Radar + Compliance */}
        <View style={m$.rightCol}>
          {/* Radar comparison */}
          <View style={m$.radarCard}>
            <Text style={m$.radarTitle}>DNA RADAR — COMPARISON</Text>
            {radarAthletes.length > 0 ? (
              <>
                <DNARadar athletes={radarAthletes} size={220} />
                <View style={m$.radarLegend}>
                  {radarAthletes.map((a, i) => (
                    <View key={a.id} style={m$.legendRow}>
                      <View style={[m$.legendDot, { backgroundColor: RADAR_COLORS[i] }]} />
                      <Text style={m$.legendName}>{a.username}</Text>
                      <Text style={m$.legendAvg}>{a.dna_avg}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={m$.radarEmpty}>
                <Ionicons name="analytics-outline" size={32} color="rgba(255,255,255,0.1)" />
                <Text style={m$.radarEmptyText}>Seleziona fino a 4 atleti{`\n`}dalla tabella per confrontare i DNA</Text>
              </View>
            )}
          </View>

          {/* Compliance chart */}
          {compliance.length > 0 && <ComplianceChart templates={compliance.slice(0, 8)} />}

          {/* Historical Trends Deep Dive */}
          {deepDiveId && (
            <View style={m$.deepDiveCard}>
              <View style={m$.deepDiveHeader}>
                <Text style={m$.deepDiveTitle}>TREND STORICO — {historicalData?.username || '...'}</Text>
                <TouchableOpacity onPress={() => { setDeepDiveId(null); setHistoricalData(null); }}>
                  <Text style={m$.deepDiveClose}>✕</Text>
                </TouchableOpacity>
              </View>
              {historicalData?.months ? (
                <>
                  <LineChart
                    months={historicalData.months}
                    keys={['forza', 'resistenza', 'velocita']}
                    height={150}
                    width={280}
                  />
                  <View style={m$.legendRow}>
                    {[{k:'forza',c:'#FF453A',l:'Forza'},{k:'resistenza',c:'#D4AF37',l:'Resistenza'},{k:'velocita',c:'#00F2FF',l:'Velocità'}].map(item => (
                      <View key={item.k} style={m$.legendItem}>
                        <View style={[m$.legendDot, { backgroundColor: item.c }]} />
                        <Text style={m$.legendText}>{item.l}: {historicalData.current_dna?.[item.k] ?? '?'}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <ActivityIndicator color="#00F2FF" size="small" />
              )}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const m$ = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  content: { padding: 28, paddingBottom: 60, gap: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 4, marginBottom: 4 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0A0A0A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  searchInput: { color: '#FFFFFF', fontSize: 12, width: 140, outlineStyle: 'none' } as any,
  selectedInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 'auto' as any },
  selectedText: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  clearSel: { color: '#FF453A', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  cols: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  tableWrap: { flex: 1, backgroundColor: '#0A0A0A', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111111', paddingVertical: 10, paddingHorizontal: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  chkCol: { width: 24, alignItems: 'center' },
  th: { width: 70, flexDirection: 'row', alignItems: 'center', gap: 3 },
  thName: { flex: 1, minWidth: 120 },
  thText: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  thTextSm: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  thDna: { width: 36, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'transparent', borderRadius: 0, marginHorizontal: 0 },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#000000', fontSize: 11, fontWeight: '900' },
  tdName: { flex: 1, minWidth: 120, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tdNameText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  td: { width: 70, color: '#FFFFFF', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  tdSm: { width: 50, color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '400', textAlign: 'center' },
  tdCompliance: { width: 50, alignItems: 'center' },
  tdScan: { width: 50, alignItems: 'center' },
  dnaMini: { width: 36, alignItems: 'center', gap: 2 },
  dnaTrack: { width: 6, height: 28, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end' },
  dnaFill: { width: 6, backgroundColor: '#00F2FF', borderRadius: 3 },
  dnaVal: { color: 'rgba(255,255,255,0.25)', fontSize: 8, fontWeight: '700', textAlign: 'center' },
  deepDiveCard: { backgroundColor: '#0A0A0A', borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: 'rgba(0,242,255,0.12)' },
  deepDiveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deepDiveTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  deepDiveClose: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '700' },
  legendRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '400' },
  chk: { width: 16, height: 16, borderRadius: 3, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  rightCol: { width: 280, gap: 16 },
  radarCard: { backgroundColor: '#0A0A0A', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center', gap: 12 },
  radarTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', letterSpacing: 3, alignSelf: 'flex-start' },
  radarLegend: { width: '100%', gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendName: { flex: 1, color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  legendAvg: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '400' },
  radarEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 12 },
  radarEmptyText: { color: 'rgba(255,255,255,0.25)', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
