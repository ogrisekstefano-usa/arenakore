/**
 * ARENAKORE — TEAM COMPARISON VIEW (Coach CRM)
 * ═══════════════════════════════════════════════
 * Select up to 3 athletes → Overlay DNA Radars → Gap Analysis Table
 * 
 * Colors: Kore 1 = #FF3B30 (Red), Kore 2 = #007AFF (Blue), Kore 3 = #34C759 (Green)
 * Typography: Plus Jakarta Sans 800 (titles), Montserrat 600 (data)
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Dimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Polygon, Line, Text as SvgText } from 'react-native-svg';
import { api } from '../../utils/api';
import { useTheme, MONT, JAKARTA } from '../../contexts/ThemeContext';

const COMPARE_COLORS = ['#FF3B30', '#007AFF', '#34C759'];
const STATS = ['endurance', 'power', 'mobility', 'technique', 'recovery', 'agility'];
const STAT_LABELS: Record<string, string> = {
  endurance: 'RESISTENZA', power: 'POTENZA', mobility: 'AGILITÀ',
  technique: 'TECNICA', recovery: 'RECUPERO', agility: 'VELOCITÀ',
};

interface ComparisonViewProps {
  athletes: any[]; // full athlete list for selection
  token: string | null;
}

// ═══ MULTI-RADAR OVERLAY (SVG) ═══
function MultiRadarChart({
  athletes, size = 300,
}: {
  athletes: { username: string; six_axis: Record<string, number>; color: string }[];
  size?: number;
}) {
  const { theme } = useTheme();
  const cx = size / 2, cy = size / 2;
  const r = size * 0.38;
  const n = STATS.length;

  const getPoint = (val: number, idx: number) => {
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
    const norm = Math.min(val, 100) / 100;
    return { x: cx + r * norm * Math.cos(angle), y: cy + r * norm * Math.sin(angle) };
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {/* Grid rings */}
        {[1, 0.75, 0.5, 0.25].map((lv, gi) => (
          <Polygon key={gi} points={STATS.map((_, i) => {
            const a = (Math.PI * 2 * i) / n - Math.PI / 2;
            return `${cx + r * lv * Math.cos(a)},${cy + r * lv * Math.sin(a)}`;
          }).join(' ')} fill="none" stroke={theme.border} strokeWidth={0.5} opacity={0.4} />
        ))}

        {/* Axis lines */}
        {STATS.map((_, i) => {
          const a = (Math.PI * 2 * i) / n - Math.PI / 2;
          return (
            <Line key={i} x1={cx} y1={cy}
              x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)}
              stroke={theme.border} strokeWidth={0.5} opacity={0.3} />
          );
        })}

        {/* Athlete polygons (overlaid, semi-transparent) */}
        {athletes.map((athlete, aidx) => {
          const points = STATS.map((stat, i) => {
            const p = getPoint(athlete.six_axis[stat] || 50, i);
            return `${p.x},${p.y}`;
          }).join(' ');

          return (
            <React.Fragment key={aidx}>
              <Polygon
                points={points}
                fill={athlete.color + '20'}
                stroke={athlete.color}
                strokeWidth={2}
                opacity={0.85}
              />
              {/* Vertex dots */}
              {STATS.map((stat, i) => {
                const p = getPoint(athlete.six_axis[stat] || 50, i);
                return (
                  <Circle key={i} cx={p.x} cy={p.y} r={3.5}
                    fill={athlete.color} opacity={0.9} />
                );
              })}
            </React.Fragment>
          );
        })}

        {/* Axis labels */}
        {STATS.map((stat, i) => {
          const a = (Math.PI * 2 * i) / n - Math.PI / 2;
          const labelR = r + 22;
          const lx = cx + labelR * Math.cos(a);
          const ly = cy + labelR * Math.sin(a);
          return (
            <SvgText key={stat} x={lx} y={ly}
              fill={theme.textSec}
              fontSize={9} fontWeight="800" textAnchor="middle" alignmentBaseline="central"
            >
              {STAT_LABELS[stat] || stat.toUpperCase()}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}


export function ComparisonView({ athletes: allAthletes, token }: ComparisonViewProps) {
  const { theme } = useTheme();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev; // Max 3
      return [...prev, id];
    });
    setComparisonData(null); // Reset on selection change
  };

  const loadComparison = useCallback(async () => {
    if (!token || selectedIds.length < 2) return;
    setIsLoading(true);
    try {
      const res = await api.compareAthletes(selectedIds, token);
      setComparisonData(res);
    } catch (err) {
      console.error('Comparison load failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedIds]);

  const selectedAthletes = selectedIds.map(id => allAthletes.find(a => a.id === id)).filter(Boolean);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={cs.scroll} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(400)}>

        {/* Header */}
        <View style={cs.header}>
          <Text style={[cs.title, JAKARTA('800'), { color: theme.text }]}>TEAM COMPARISON</Text>
          <Text style={[cs.sub, MONT('400'), { color: theme.textTer }]}>
            Seleziona da 2 a 3 atleti per confrontare i profili DNA
          </Text>
        </View>

        {/* Athlete Selector */}
        <View style={cs.selectorSection}>
          <Text style={[cs.selectorTitle, MONT('800'), { color: theme.textSec }]}>
            SELEZIONA KORE ({selectedIds.length}/3)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cs.selectorRow}>
            {allAthletes.map((a, idx) => {
              const isSelected = selectedIds.includes(a.id);
              const colorIdx = isSelected ? selectedIds.indexOf(a.id) : -1;
              const accentColor = colorIdx >= 0 ? COMPARE_COLORS[colorIdx] : theme.border;

              return (
                <TouchableOpacity
                  key={a.id}
                  style={[
                    cs.athleteChip,
                    { borderColor: accentColor, backgroundColor: isSelected ? accentColor + '10' : theme.surface },
                  ]}
                  onPress={() => toggleSelect(a.id)}
                  activeOpacity={0.8}
                >
                  <View style={[cs.chipAvatar, { backgroundColor: isSelected ? accentColor : a.avatar_color || '#555' }]}>
                    <Text style={cs.chipAvatarText}>{(a.username || '?')[0]}</Text>
                  </View>
                  <View style={cs.chipInfo}>
                    <Text style={[cs.chipName, MONT('700'), { color: isSelected ? accentColor : theme.text }]} numberOfLines={1}>
                      {a.username}
                    </Text>
                    <Text style={[cs.chipSub, MONT('400'), { color: theme.textTer }]}>
                      KORE {a.kore_score || a.dna_avg} · LVL {a.level}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={[cs.chipCheck, { backgroundColor: accentColor }]}>
                      <Ionicons name="checkmark" size={12} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Compare Button */}
        {selectedIds.length >= 2 && !comparisonData && (
          <TouchableOpacity
            style={[cs.compareBtn, { backgroundColor: theme.accent }]}
            onPress={loadComparison}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator size="small" color="#000" /> : (
              <Ionicons name="git-compare" size={18} color="#000" />
            )}
            <Text style={[cs.compareBtnText, JAKARTA('800')]}>
              {isLoading ? 'ANALISI IN CORSO...' : 'CONFRONTA PROFILI'}
            </Text>
          </TouchableOpacity>
        )}

        {/* RESULTS */}
        {comparisonData && (
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>

            {/* Legend */}
            <View style={cs.legend}>
              {comparisonData.athletes.map((a: any, idx: number) => (
                <View key={a.id} style={cs.legendItem}>
                  <View style={[cs.legendDot, { backgroundColor: COMPARE_COLORS[idx] }]} />
                  <Text style={[cs.legendName, MONT('700'), { color: COMPARE_COLORS[idx] }]}>{a.username}</Text>
                  <Text style={[cs.legendScore, JAKARTA('800'), { color: theme.textSec }]}>KORE {a.kore_score}</Text>
                </View>
              ))}
            </View>

            {/* RADAR OVERLAY */}
            <View style={[cs.radarCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[cs.radarTitle, JAKARTA('800'), { color: theme.text }]}>DNA RADAR OVERLAY</Text>
              <MultiRadarChart
                athletes={comparisonData.athletes.map((a: any, idx: number) => ({
                  ...a, color: COMPARE_COLORS[idx],
                }))}
                size={Math.min(Dimensions.get('window').width - 100, 360)}
              />
            </View>

            {/* GAP ANALYSIS TABLE */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)} style={[cs.gapCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[cs.gapTitle, JAKARTA('800'), { color: theme.text }]}>GAP ANALYSIS</Text>

              {/* Table header */}
              <View style={[cs.gapHeader, { borderBottomColor: theme.border }]}>
                <Text style={[cs.gapTh, MONT('900'), { color: theme.textTer, flex: 1 }]}>STAT</Text>
                {comparisonData.athletes.map((a: any, idx: number) => (
                  <Text key={a.id} style={[cs.gapTh, MONT('900'), { color: COMPARE_COLORS[idx], width: 90, textAlign: 'center' }]}>
                    {a.username.slice(0, 10)}
                  </Text>
                ))}
                <Text style={[cs.gapTh, MONT('900'), { color: theme.textTer, width: 60, textAlign: 'center' }]}>GAP</Text>
              </View>

              {/* Table rows */}
              {comparisonData.gap_analysis.map((row: any, ridx: number) => {
                const maxVal = Math.max(...row.athletes.map((a: any) => a.value));
                const minVal = Math.min(...row.athletes.map((a: any) => a.value));
                const gapPct = maxVal > 0 ? Math.round(((maxVal - minVal) / maxVal) * 100) : 0;

                return (
                  <View key={row.stat} style={[cs.gapRow, { borderBottomColor: theme.border }]}>
                    <Text style={[cs.gapStatName, MONT('700'), { color: theme.textSec, flex: 1 }]}>{row.label}</Text>
                    {row.athletes.map((a: any, aidx: number) => {
                      const isLeader = a.is_leader;
                      const isCritical = a.diff_pct <= -15;
                      const textColor = isLeader ? '#34C759' : isCritical ? '#FF3B30' : theme.text;
                      return (
                        <View key={a.username} style={{ width: 90, alignItems: 'center' }}>
                          <Text style={[cs.gapValue, JAKARTA('800'), { color: textColor }]}>{a.value}</Text>
                          {!isLeader && (
                            <Text style={[cs.gapDiff, MONT('600'), { color: isCritical ? '#FF3B30' : '#FFD700' }]}>
                              {a.diff_pct > 0 ? '+' : ''}{a.diff_pct}%
                            </Text>
                          )}
                          {isLeader && (
                            <Text style={[cs.gapLeader, MONT('800')]}>LEADER</Text>
                          )}
                        </View>
                      );
                    })}
                    <View style={{ width: 60, alignItems: 'center' }}>
                      <Text style={[cs.gapPct, JAKARTA('800'), {
                        color: gapPct > 20 ? '#FF3B30' : gapPct > 10 ? '#FFD700' : '#34C759',
                      }]}>
                        {gapPct}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Animated.View>

            {/* Summary insight */}
            <View style={[cs.insightCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="analytics" size={18} color={theme.accent} />
              <View style={cs.insightContent}>
                <Text style={[cs.insightTitle, MONT('800'), { color: theme.text }]}>INSIGHT AUTOMATICO</Text>
                <Text style={[cs.insightText, MONT('400'), { color: theme.textSec }]}>
                  {(() => {
                    const gap = comparisonData.gap_analysis;
                    const worstGap = gap.reduce((max: any, g: any) => {
                      const diff = Math.max(...g.athletes.map((a: any) => a.value)) - Math.min(...g.athletes.map((a: any) => a.value));
                      return diff > (max?.diff || 0) ? { ...g, diff } : max;
                    }, null);
                    if (!worstGap) return 'Profili equilibrati.';
                    return `Il gap maggiore è in ${worstGap.label} (${Math.round(worstGap.diff)} punti). Consigliato: programma di allenamento mirato per riequilibrare il gruppo.`;
                  })()}
                </Text>
              </View>
            </View>

            {/* Reset button */}
            <TouchableOpacity
              style={[cs.resetBtn, { borderColor: theme.border }]}
              onPress={() => { setComparisonData(null); setSelectedIds([]); }}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={14} color={theme.textTer} />
              <Text style={[cs.resetBtnText, MONT('700'), { color: theme.textTer }]}>NUOVO CONFRONTO</Text>
            </TouchableOpacity>

          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </Animated.View>
    </ScrollView>
  );
}


// ═══════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════
const cs = StyleSheet.create({
  scroll: { padding: 24 },
  header: { gap: 4, marginBottom: 20 },
  title: { fontSize: 22, letterSpacing: 3 },
  sub: { fontSize: 13, lineHeight: 19 },

  selectorSection: { marginBottom: 20, gap: 10 },
  selectorTitle: { fontSize: 12, letterSpacing: 2 },
  selectorRow: { gap: 8, paddingBottom: 4 },
  athleteChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    minWidth: 160,
  },
  chipAvatar: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chipAvatarText: { color: '#000', fontSize: 14, fontWeight: '900' },
  chipInfo: { flex: 1, gap: 1 },
  chipName: { fontSize: 14, letterSpacing: 0.5 },
  chipSub: { fontSize: 11, letterSpacing: 0.3 },
  chipCheck: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  compareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 14, marginBottom: 20,
  },
  compareBtnText: { color: '#000', fontSize: 15, letterSpacing: 2 },

  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { fontSize: 13, letterSpacing: 0.5 },
  legendScore: { fontSize: 12 },

  radarCard: {
    borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 16,
    alignItems: 'center', gap: 12,
  },
  radarTitle: { fontSize: 14, letterSpacing: 2, alignSelf: 'flex-start' },

  gapCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
  gapTitle: { fontSize: 14, letterSpacing: 2, marginBottom: 12 },
  gapHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, marginBottom: 4 },
  gapTh: { fontSize: 10, letterSpacing: 2 },
  gapRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5 },
  gapStatName: { fontSize: 12, letterSpacing: 1 },
  gapValue: { fontSize: 18 },
  gapDiff: { fontSize: 10, letterSpacing: 0.5, marginTop: 2 },
  gapLeader: { fontSize: 9, color: '#34C759', letterSpacing: 1.5, marginTop: 2 },
  gapPct: { fontSize: 16 },

  insightCard: {
    flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 14,
    padding: 16, marginBottom: 16,
  },
  insightContent: { flex: 1, gap: 4 },
  insightTitle: { fontSize: 12, letterSpacing: 1.5 },
  insightText: { fontSize: 13, lineHeight: 19 },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingVertical: 12,
  },
  resetBtnText: { fontSize: 13, letterSpacing: 1.5 },
});
