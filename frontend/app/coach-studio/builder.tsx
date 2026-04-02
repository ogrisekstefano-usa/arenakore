/**
 * NÈXUS COMMAND CENTER — MULTISPORT CHALLENGE BUILDER
 * Tab 1: Visual Timeline  |  Tab 2: Automation Engine  |  Tab 3: Global Leaderboard
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Text as SvgText, G, Line, Polygon } from 'react-native-svg';
import Animated, { FadeInDown, FadeIn, useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, PJS, MONT, fz } from '../../contexts/ThemeContext';
import { api } from '../../utils/api';

// ── Discipline metadata (mirrors backend) ─────────────────────────────────────
const DISC_META: Record<string, { label: string; icon: string; color: string; exercise: string }> = {
  endurance: { label: 'Endurance',  icon: 'navigate',    color: '#00E5FF', exercise: 'GPS Run' },
  power:     { label: 'Power',      icon: 'barbell',     color: '#FF3B30', exercise: 'Squat/Press' },
  mobility:  { label: 'Mobility',   icon: 'body',        color: '#00FF87', exercise: 'Lunge/Stretch' },
  technique: { label: 'Technique',  icon: 'ribbon',      color: '#FFD700', exercise: 'Form Drill' },
  recovery:  { label: 'Recovery',   icon: 'moon',        color: '#AF52DE', exercise: 'Plank/Breath' },
  agility:   { label: 'Agility',    icon: 'flash',       color: '#FF9500', exercise: 'Punch/Sprint' },
  nexus:     { label: 'NÈXUS Bio',  icon: 'scan',        color: '#00E5FF', exercise: 'Bio-Scan' },
};

const TRIGGER_META: Record<string, { label: string; icon: string; unit: string }> = {
  scan_quality_low: { label: 'Qualità scan bassa (<)',   icon: 'alert',          unit: '%' },
  mobility_reduced: { label: 'Mobilità ridotta (<)',     icon: 'body',           unit: '/100' },
  recovery_low:     { label: 'Recovery bassa (<)',       icon: 'moon',           unit: '/100' },
  power_drop:       { label: 'Calo forza (<)',           icon: 'trending-down',  unit: '/100' },
  pvp_win_streak:   { label: 'Streak vittorie PvP (≥)',  icon: 'flame',          unit: 'wins' },
  days_inactive:    { label: 'Atleta inattivo (≥)',      icon: 'time',           unit: 'days' },
};

const ACTION_META = [
  { key: 'assign_recovery',  label: 'Assegna Recovery Flow',  icon: 'moon',             color: '#AF52DE' },
  { key: 'assign_power',     label: 'Assegna Power Protocol', icon: 'barbell',           color: '#FF3B30' },
  { key: 'reduce_intensity', label: 'Riduci Intensità 20%',   icon: 'trending-down',    color: '#FF9500' },
  { key: 'notify_coach',     label: 'Notifica Coach',         icon: 'notifications',    color: '#00E5FF' },
  { key: 'send_alert',       label: 'Alert all\'Atleta',      icon: 'warning',          color: '#FFD700' },
];

// ── Visual Timeline ───────────────────────────────────────────────────────────
function DayColumn({ day, date, onAdd, onRemove, theme }: {
  day: any; date: string; onAdd: () => void; onRemove: () => void; theme: any;
}) {
  const discMeta = day.discipline ? DISC_META[day.discipline] : null;
  const dayDate = new Date(date);
  const dayLabel = dayDate.toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase();
  const dayNum = dayDate.getDate();
  const hasEvent = !!day.discipline;

  return (
    <View style={[dc$.col, { borderColor: theme.border }]}>
      {/* Date header */}
      <View style={[dc$.header, { backgroundColor: theme.surface2 }]}>
        <Text style={[dc$.dayLabel('300'), { color: theme.textTer }]}>{dayLabel}</Text>
        <Text style={[dc$.dayNum, MONT('900'), { color: theme.text }]}>{dayNum}</Text>
        <Text style={[dc$.dayN('300'), { color: theme.textTer }]}>G{day.day}</Text>
      </View>

      {/* Event card or add button */}
      {hasEvent && discMeta ? (
        <View style={[dc$.eventCard, { backgroundColor: discMeta.color + '14', borderColor: discMeta.color + '40' }]}>
          <View style={dc$.eventTop}>
            <Ionicons name={discMeta.icon as any} size={16} color={discMeta.color} />
            <TouchableOpacity onPress={onRemove} style={dc$.removeBtn}>
              <Ionicons name="close-circle" size={13} color={theme.textTer} />
            </TouchableOpacity>
          </View>
          <Text style={[dc$.eventDisc, MONT('900'), { color: discMeta.color }]}>{discMeta.label.toUpperCase()}</Text>
          <Text style={[dc$.eventExercise('300'), { color: theme.textSec }]}>{day.exercise || discMeta.exercise}</Text>
          {day.target_reps && <Text style={[dc$.eventTarget, MONT('700'), { color: theme.text }]}>{day.target_reps} rep</Text>}
          {day.target_time && <Text style={[dc$.eventTarget, MONT('700'), { color: theme.text }]}>{day.target_time}s</Text>}
          {day.notes ? <Text style={[dc$.eventNotes('300'), { color: theme.textTer }]} numberOfLines={2}>{day.notes}</Text> : null}
        </View>
      ) : (
        <TouchableOpacity style={[dc$.addBtn, { borderColor: theme.border }]} onPress={onAdd} activeOpacity={0.7}>
          <Ionicons name="add" size={18} color={theme.textTer} />
          <Text style={[dc$.addLabel('300'), { color: theme.textTer }]}>Aggiungi</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const dc$ = StyleSheet.create({
  col: { width: 110, borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginRight: 8 },
  header: { paddingVertical: 8, alignItems: 'center', gap: 2 },
  dayLabel: { fontSize: 9, letterSpacing: 2 },
  dayNum: { fontSize: 20 },
  dayN: { fontSize: 9, letterSpacing: 1 },
  eventCard: { margin: 6, borderRadius: 8, padding: 8, borderWidth: 1, gap: 4, minHeight: 120 },
  eventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  removeBtn: { padding: 2 },
  eventDisc: { fontSize: 9, letterSpacing: 1.5, marginTop: 2 },
  eventExercise: { fontSize: 10, lineHeight: 13 },
  eventTarget: { fontSize: 13, marginTop: 2 },
  eventNotes: { fontSize: 9, lineHeight: 12, marginTop: 2 },
  addBtn: { margin: 6, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed' as any, height: 120, alignItems: 'center', justifyContent: 'center', gap: 6 },
  addLabel: { fontSize: 10, letterSpacing: 1 },
});

// ── Day Event Editor ──────────────────────────────────────────────────────────
function DayEventEditor({ day, onSave, onClose, theme }: {
  day: any; onSave: (updates: any) => void; onClose: () => void; theme: any;
}) {
  const [disc, setDisc] = useState(day.discipline || '');
  const [reps, setReps] = useState(day.target_reps ? String(day.target_reps) : '');
  const [time, setTime] = useState(day.target_time ? String(day.target_time) : '');
  const [notes, setNotes] = useState(day.notes || '');

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[de$.panel, { backgroundColor: theme.surface, borderColor: theme.accent + '30' }]}>
      <View style={de$.header}>
        <Text style={[de$.title, MONT(), { color: theme.text }]}>GIORNO {day.day}</Text>
        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={16} color={theme.textTer} /></TouchableOpacity>
      </View>
      {/* Discipline selector */}
      <Text style={[de$.label('300'), { color: theme.textTer }]}>DISCIPLINA</Text>
      <View style={de$.discGrid}>
        {Object.entries(DISC_META).map(([k, m]) => (
          <TouchableOpacity key={k}
            style={[de$.discBtn, disc === k && { borderColor: m.color, backgroundColor: m.color + '15' }]}
            onPress={() => setDisc(k)}
          >
            <Ionicons name={m.icon as any} size={14} color={disc === k ? m.color : theme.textTer} />
            <Text style={[de$.discLabel, MONT('900'), { color: disc === k ? m.color : theme.textTer }]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Targets row */}
      <View style={de$.targetsRow}>
        <View style={de$.targetField}>
          <Text style={[de$.label('300'), { color: theme.textTer }]}>REP TARGET</Text>
          <TextInput style={[de$.input, { backgroundColor: theme.surface2, color: theme.text, borderColor: theme.border }]} value={reps} onChangeText={setReps} keyboardType="numeric" placeholder="es. 20" placeholderTextColor={theme.textTer} />
        </View>
        <View style={de$.targetField}>
          <Text style={[de$.label('300'), { color: theme.textTer }]}>DURATA (sec)</Text>
          <TextInput style={[de$.input, { backgroundColor: theme.surface2, color: theme.text, borderColor: theme.border }]} value={time} onChangeText={setTime} keyboardType="numeric" placeholder="es. 60" placeholderTextColor={theme.textTer} />
        </View>
      </View>
      {/* Notes */}
      <Text style={[de$.label('300'), { color: theme.textTer }]}>NOTE COACH</Text>
      <TextInput style={[de$.notesInput, { backgroundColor: theme.surface2, color: theme.text, borderColor: theme.border }]} value={notes} onChangeText={setNotes} placeholder="Istruzione specifica per questo giorno..." placeholderTextColor={theme.textTer} multiline numberOfLines={2} />
      <TouchableOpacity style={[de$.saveBtn, { backgroundColor: disc ? theme.accent : theme.surface2 }]} onPress={() => { if (!disc) return; onSave({ discipline: disc, exercise: DISC_META[disc]?.exercise, target_reps: reps ? parseInt(reps) : null, target_time: time ? parseInt(time) : null, notes }); }} activeOpacity={0.85}>
        <Text style={[de$.saveBtnText, MONT('900'), { color: disc ? '#000' : theme.textTer }]}>SALVA GIORNO</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const de$ = StyleSheet.create({
  panel: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10, marginBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 13, letterSpacing: 3 },
  label: { fontSize: 9, letterSpacing: 3 },
  discGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  discBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, borderColor: 'rgba(255,255,255,0.07)' },
  discLabel: { fontSize: 10, letterSpacing: 1 },
  targetsRow: { flexDirection: 'row', gap: 10 },
  targetField: { flex: 1, gap: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13 } as any,
  notesInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12, minHeight: 52 } as any,
  saveBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontSize: 12, letterSpacing: 2 },
});

// ── Global Leaderboard Chart ──────────────────────────────────────────────────
function GlobalLeaderboardChart({ token }: { token: string }) {
  const { theme } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGlobalChallengeLeaderboard(token)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <View style={lb$.center}><ActivityIndicator color={theme.accent} /></View>;

  const leaderboard = data?.leaderboard || [];

  if (!leaderboard.length) return (
    <View style={[lb$.empty, { backgroundColor: theme.surface }]}>
      <Ionicons name="trophy-outline" size={36} color={theme.textTer} />
      <Text style={[lb$.emptyTitle, MONT(), { color: theme.text }]}>NESSUNA SFIDA ATTIVA</Text>
      <Text style={[lb$.emptyText('300'), { color: theme.textTer }]}>
        Crea e pubblica una sfida per vedere il leaderboard globale in tempo reale.
      </Text>
    </View>
  );

  const maxScore = Math.max(...leaderboard.map((e: any) => e.score), 100);
  const BAR_H = 40, GAP = 8, PAD_LEFT = 120, CHART_W = 500;

  const getColor = (score: number) => score >= 75 ? '#00FF87' : score >= 45 ? '#FF9500' : '#FF3B30';

  return (
    <ScrollView style={lb$.scroll} contentContainerStyle={lb$.content}>
      <View style={[lb$.header, { borderBottomColor: theme.border }]}>
        <Text style={[lb$.headerTitle, MONT(), { color: theme.text }]}>GLOBAL CHALLENGE LEADERBOARD</Text>
        <Text style={[lb$.headerSub('300'), { color: theme.textTer }]}>
          {data?.total_active_challenges} sfide attive · Aggiornamento live
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
        <Svg width={CHART_W} height={leaderboard.length * (BAR_H + GAP) + 30}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(v => {
            const x = PAD_LEFT + (v / maxScore) * (CHART_W - PAD_LEFT - 20);
            return (
              <G key={v}>
                <Line x1={x} y1={0} x2={x} y2={leaderboard.length * (BAR_H + GAP)} stroke={theme.border} strokeWidth={1} />
                <SvgText x={x} y={leaderboard.length * (BAR_H + GAP) + 14} fontSize={8} fill={theme.textTer} textAnchor="middle">{v}</SvgText>
              </G>
            );
          })}

          {leaderboard.map((entry: any, i: number) => {
            const y = i * (BAR_H + GAP);
            const barW = Math.max(4, (entry.score / maxScore) * (CHART_W - PAD_LEFT - 20));
            const color = getColor(entry.score);
            return (
              <G key={entry.crew_id}>
                {/* Label */}
                <SvgText x={PAD_LEFT - 8} y={y + BAR_H / 2 + 4} fontSize={11} fill={theme.text} textAnchor="end" fontWeight="bold">
                  #{i + 1} {entry.crew_name?.substring(0, 12)}
                </SvgText>
                {/* Background bar */}
                <Rect x={PAD_LEFT} y={y + 4} width={CHART_W - PAD_LEFT - 20} height={BAR_H - 8} rx={6} fill={color + '18'} />
                {/* Score bar */}
                <Rect x={PAD_LEFT} y={y + 4} width={barW} height={BAR_H - 8} rx={6} fill={color + '80'} />
                {/* Score text */}
                <SvgText x={PAD_LEFT + barW + 6} y={y + BAR_H / 2 + 4} fontSize={12} fill={color} fontWeight="bold">
                  {entry.score}
                </SvgText>
                {/* Members indicator */}
                <SvgText x={PAD_LEFT + 8} y={y + BAR_H / 2 + 4} fontSize={9} fill="rgba(255,255,255,0.6)">
                  {entry.members_active}/{entry.members_total} · {entry.completion_pct}%
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </ScrollView>

      {/* Legend */}
      <View style={[lb$.legend, { backgroundColor: theme.surface2 }]}>
        {[{ c: '#00FF87', l: 'Eccellente (75+)' }, { c: '#FF9500', l: 'In progressione (45-74)' }, { c: '#FF3B30', l: 'Da migliorare (<45)' }].map(({ c, l }) => (
          <View key={l} style={lb$.legendItem}>
            <View style={[lb$.legendDot, { backgroundColor: c }]} />
            <Text style={[lb$.legendText('300'), { color: theme.textSec }]}>{l}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const lb$ = StyleSheet.create({
  scroll: { flex: 1 }, content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40, borderRadius: 16 },
  emptyTitle: { fontSize: 18, letterSpacing: 3 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  header: { borderBottomWidth: 1, paddingBottom: 12, gap: 4 },
  headerTitle: { fontSize: 16, letterSpacing: 3 },
  headerSub: { fontSize: 11, letterSpacing: 1 },
  legend: { flexDirection: 'row', gap: 16, borderRadius: 10, padding: 12, marginTop: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },
});

// ── Automation Engine ──────────────────────────────────────────────────────────
function AutomationEngine({ challenge, onRulesChange, theme }: {
  challenge: any; onRulesChange: (rules: any[]) => void; theme: any;
}) {
  const [rules, setRules] = useState<any[]>(challenge?.automation_rules || []);

  const addRule = () => {
    const newRule = { id: Date.now().toString(), trigger: 'scan_quality_low', threshold: 60, action: 'assign_recovery', message: '' };
    const updated = [...rules, newRule];
    setRules(updated);
    onRulesChange(updated);
  };

  const updateRule = (idx: number, field: string, value: any) => {
    const updated = rules.map((r, i) => i === idx ? { ...r, [field]: value } : r);
    setRules(updated);
    onRulesChange(updated);
  };

  const removeRule = (idx: number) => {
    const updated = rules.filter((_, i) => i !== idx);
    setRules(updated);
    onRulesChange(updated);
  };

  return (
    <ScrollView style={ae$.root} contentContainerStyle={ae$.content}>
      <View style={ae$.pageHeader}>
        <View>
          <Text style={[ae$.title, MONT(), { color: theme.text }]}>AUTOMATION ENGINE</Text>
          <Text style={[ae$.sub('300'), { color: theme.textTer }]}>
            Regole automatiche: se [condizione] → allora [azione]
          </Text>
        </View>
        <TouchableOpacity style={[ae$.addBtn, { backgroundColor: theme.accent }]} onPress={addRule}>
          <Ionicons name="add" size={14} color="#000" />
          <Text style={[ae$.addBtnText, MONT('900')]}>NUOVA REGOLA</Text>
        </TouchableOpacity>
      </View>

      {rules.length === 0 && (
        <View style={[ae$.empty, { backgroundColor: theme.surface }]}>
          <Ionicons name="hardware-chip-outline" size={32} color={theme.textTer} />
          <Text style={[ae$.emptyTitle, MONT('700'), { color: theme.text }]}>Nessuna regola attiva</Text>
          <Text style={[ae$.emptyText('300'), { color: theme.textTer }]}>
            Le regole si attivano automaticamente basandosi sui dati biometrici degli atleti.
          </Text>
        </View>
      )}

      {rules.map((rule, idx) => {
        const trigMeta = TRIGGER_META[rule.trigger];
        const actMeta = ACTION_META.find(a => a.key === rule.action) || ACTION_META[0];
        return (
          <Animated.View key={rule.id} entering={FadeInDown.delay(idx * 50).duration(200)}
            style={[ae$.ruleCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={ae$.ruleHeader}>
              <View style={[ae$.ruleIndex, { backgroundColor: theme.accent + '20' }]}>
                <Text style={[ae$.ruleIndexText, MONT('900'), { color: theme.accent }]}>R{idx + 1}</Text>
              </View>
              <Text style={[ae$.ruleTitle, MONT('700'), { color: theme.text }]}>REGOLA AUTOMATICA</Text>
              <TouchableOpacity onPress={() => removeRule(idx)}>
                <Ionicons name="trash-outline" size={14} color={theme.accentRed} />
              </TouchableOpacity>
            </View>

            {/* Trigger row */}
            <View style={ae$.condRow}>
              <View style={[ae$.condBadge, { backgroundColor: '#FF9500' + '15' }]}>
                <Text style={[ae$.condBadgeText, MONT('900'), { color: '#FF9500' }]}>SE</Text>
              </View>
              <View style={ae$.condContent}>
                <Text style={[ae$.condLabel('300'), { color: theme.textSec }]}>Trigger:</Text>
                <View style={ae$.selectRow}>
                  {Object.entries(TRIGGER_META).map(([k, m]) => (
                    <TouchableOpacity key={k}
                      style={[ae$.selectOpt, rule.trigger === k && { borderColor: '#FF9500', backgroundColor: '#FF950015' }]}
                      onPress={() => updateRule(idx, 'trigger', k)}
                    >
                      <Ionicons name={m.icon as any} size={10} color={rule.trigger === k ? '#FF9500' : theme.textTer} />
                      <Text style={[ae$.selectOptTxt, MONT('900'), { color: rule.trigger === k ? '#FF9500' : theme.textTer }]}>{m.label.split(' (')[0]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={ae$.threshRow}>
                  <Text style={[ae$.threshLabel('300'), { color: theme.textSec }]}>Soglia:</Text>
                  <TextInput
                    style={[ae$.threshInput, { backgroundColor: theme.surface2, color: '#FF9500', borderColor: '#FF950040' }]}
                    value={String(rule.threshold || '')}
                    onChangeText={v => updateRule(idx, 'threshold', parseInt(v) || 0)}
                    keyboardType="numeric"
                  />
                  <Text style={[ae$.threshUnit('300'), { color: theme.textTer }]}>{trigMeta?.unit || '%'}</Text>
                </View>
              </View>
            </View>

            {/* Arrow */}
            <View style={ae$.arrowRow}>
              <View style={[ae$.arrowLine, { backgroundColor: theme.border }]} />
              <Ionicons name="arrow-down" size={14} color={theme.accent} />
              <View style={[ae$.arrowLine, { backgroundColor: theme.border }]} />
            </View>

            {/* Action row */}
            <View style={ae$.condRow}>
              <View style={[ae$.condBadge, { backgroundColor: theme.accent + '15' }]}>
                <Text style={[ae$.condBadgeText, MONT('900'), { color: theme.accent }]}>ALLORA</Text>
              </View>
              <View style={ae$.condContent}>
                <Text style={[ae$.condLabel('300'), { color: theme.textSec }]}>Azione:</Text>
                <View style={ae$.selectRow}>
                  {ACTION_META.map(a => (
                    <TouchableOpacity key={a.key}
                      style={[ae$.selectOpt, rule.action === a.key && { borderColor: a.color, backgroundColor: a.color + '15' }]}
                      onPress={() => updateRule(idx, 'action', a.key)}
                    >
                      <Ionicons name={a.icon as any} size={10} color={rule.action === a.key ? a.color : theme.textTer} />
                      <Text style={[ae$.selectOptTxt, MONT('900'), { color: rule.action === a.key ? a.color : theme.textTer }]}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>
        );
      })}

      {rules.length > 0 && (
        <View style={[ae$.aiNote, { backgroundColor: theme.accent + '08', borderColor: theme.accent + '20' }]}>
          <Ionicons name="hardware-chip" size={13} color={theme.accent} />
          <Text style={[ae$.aiNoteText('300'), { color: theme.accent + 'CC' }]}>
            Il motore AI valuta queste regole ogni volta che un atleta completa uno scan NÈXUS. Le azioni si attivano entro 60 secondi dal trigger.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const ae$ = StyleSheet.create({
  root: { flex: 1 }, content: { padding: 20, gap: 14, paddingBottom: 48 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 18, letterSpacing: 4 },
  sub: { fontSize: 11, letterSpacing: 0.5, marginTop: 3 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 9 },
  addBtnText: { color: '#000', fontSize: 11, letterSpacing: 1.5 },
  empty: { borderRadius: 14, padding: 32, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 15, letterSpacing: 1 },
  emptyText: { fontSize: 12, textAlign: 'center', lineHeight: 18, maxWidth: 300 },
  ruleCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleIndex: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ruleIndexText: { fontSize: 11 },
  ruleTitle: { flex: 1, fontSize: 12, letterSpacing: 1.5 },
  condRow: { flexDirection: 'row', gap: 10 },
  condBadge: { width: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  condBadgeText: { fontSize: 9, letterSpacing: 2 },
  condContent: { flex: 1, gap: 6 },
  condLabel: { fontSize: 10, letterSpacing: 1.5 },
  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  selectOpt: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, borderColor: 'rgba(255,255,255,0.07)' },
  selectOptTxt: { fontSize: 9, letterSpacing: 1 },
  threshRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  threshLabel: { fontSize: 10, letterSpacing: 1.5 },
  threshInput: { width: 60, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 14, textAlign: 'center' } as any,
  threshUnit: { fontSize: 11 },
  arrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrowLine: { flex: 1, height: 1 },
  aiNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 10, padding: 12 },
  aiNoteText: { flex: 1, fontSize: 11, lineHeight: 16 },
});

// ── Main Challenge Builder ────────────────────────────────────────────────────
export default function TemplateBuilder() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [tab, setTab] = useState<'builder' | 'automation' | 'leaderboard'>('builder');
  const [challenges, setChallenges] = useState<any[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [crews, setCrews] = useState<any[]>([]);
  const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>([]);
  // New challenge form
  const [newName, setNewName] = useState('');
  const [newDays, setNewDays] = useState('7');
  const [showNewForm, setShowNewForm] = useState(false);
  const [localDays, setLocalDays] = useState<any[]>([]);
  const [localRules, setLocalRules] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [clist, crewData] = await Promise.all([
        api.listMultisportChallenges(token),
        api.getCrewManagement(token),
      ]);
      setChallenges(clist.challenges || []);
      setCrews(crewData.crews || []);
    } catch (_) {}
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!token || !newName.trim()) return;
    setCreating(true);
    try {
      const c = await api.createMultisportChallenge(newName.trim(), '', parseInt(newDays) || 7, token);
      setChallenges(prev => [c, ...prev]);
      setSelectedChallenge(c);
      setLocalDays([...c.days]);
      setLocalRules([...(c.automation_rules || [])]);
      setShowNewForm(false);
      setNewName('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) { Alert.alert('Errore', e?.message || 'Impossibile creare'); }
    finally { setCreating(false); }
  };

  const handleSelectChallenge = (c: any) => {
    setSelectedChallenge(c);
    setLocalDays([...c.days]);
    setLocalRules([...(c.automation_rules || [])]);
    setEditingDay(null);
  };

  const handleDaySave = (dayIdx: number, updates: any) => {
    const updated = localDays.map((d, i) => i === dayIdx ? { ...d, ...updates } : d);
    setLocalDays(updated);
    setEditingDay(null);
  };

  const handleDayRemove = (dayIdx: number) => {
    const updated = localDays.map((d, i) => i === dayIdx ? { ...d, discipline: null, exercise: null, target_reps: null, target_time: null, notes: '' } : d);
    setLocalDays(updated);
  };

  const handleSave = async () => {
    if (!token || !selectedChallenge) return;
    setSaving(true);
    try {
      await api.updateChallengeDays(selectedChallenge.id, localDays, token);
      await api.updateChallengeAutomation(selectedChallenge.id, localRules, token);
      await load();
      Alert.alert('SALVATO', 'Sfida aggiornata con successo.');
    } catch (e: any) { Alert.alert('Errore', e?.message || 'Impossibile salvare'); }
    finally { setSaving(false); }
  };

  const handlePush = async () => {
    if (!token || !selectedChallenge || selectedCrewIds.length === 0) {
      Alert.alert('Seleziona crew', 'Seleziona almeno una crew prima di pubblicare.');
      return;
    }
    setPushing(true);
    try {
      const r = await api.pushMultisportChallenge(selectedChallenge.id, selectedCrewIds, token);
      Alert.alert('PUBBLICATA', `Sfida inviata a ${r.crew_count} crew · ${r.notifications_sent} notifiche inviate.`);
      await load();
    } catch (e: any) { Alert.alert('Errore', e?.message || 'Impossibile pubblicare'); }
    finally { setPushing(false); }
  };

  return (
    <View style={[mb$.root, { backgroundColor: theme.bg }]}>
      {/* ── TOP BAR ── */}
      <View style={[mb$.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={mb$.tabs}>
          {[
            { key: 'builder',     icon: 'calendar',       label: 'TIMELINE' },
            { key: 'automation',  icon: 'hardware-chip',  label: 'AUTOMATION' },
            { key: 'leaderboard', icon: 'trophy',         label: 'LEADERBOARD' },
          ].map(t => (
            <TouchableOpacity key={t.key}
              style={[mb$.tabBtn, tab === t.key && { borderBottomWidth: 2, borderBottomColor: theme.accent }]}
              onPress={() => setTab(t.key as any)}
            >
              <Ionicons name={t.icon as any} size={14} color={tab === t.key ? theme.accent : theme.textTer} />
              <Text style={[mb$.tabLabel, MONT('900'), { color: tab === t.key ? theme.accent : theme.textTer }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save / Push CTAs */}
        {tab === 'builder' && selectedChallenge && (
          <View style={mb$.actions}>
            <TouchableOpacity style={[mb$.saveBtn, { borderColor: theme.border }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={theme.accent} size="small" /> : <><Ionicons name="save-outline" size={14} color={theme.accent} /><Text style={[mb$.saveBtnTxt, MONT('900'), { color: theme.accent }]}>SALVA</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={[mb$.pushBtn, { backgroundColor: theme.accent }]} onPress={handlePush} disabled={pushing}>
              {pushing ? <ActivityIndicator color="#000" size="small" /> : <><Ionicons name="cloud-upload" size={14} color="#000" /><Text style={[mb$.pushBtnTxt, MONT('900')]}>PUBBLICA</Text></>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── CONTENT ── */}
      {tab === 'leaderboard' ? (
        <GlobalLeaderboardChart token={token!} />
      ) : (
        <View style={mb$.body}>
          {/* Left: Challenge list */}
          <View style={[mb$.sidePanel, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
            <View style={[mb$.sidePanelHeader, { borderBottomColor: theme.border }]}>
              <Text style={[mb$.sidePanelTitle, MONT(), { color: theme.text }]}>SFIDE</Text>
              <TouchableOpacity onPress={() => setShowNewForm(v => !v)}>
                <Ionicons name={showNewForm ? 'close' : 'add-circle'} size={20} color={theme.accent} />
              </TouchableOpacity>
            </View>

            {/* New challenge form */}
            {showNewForm && (
              <View style={[mb$.newForm, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
                <TextInput style={[mb$.newInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  placeholder="Nome sfida..." placeholderTextColor={theme.textTer} value={newName} onChangeText={setNewName} />
                <View style={mb$.newRow}>
                  <TextInput style={[mb$.newDaysInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                    placeholder="Giorni" placeholderTextColor={theme.textTer} value={newDays} onChangeText={setNewDays} keyboardType="numeric" maxLength={2} />
                  <TouchableOpacity style={[mb$.createBtn, { backgroundColor: newName ? theme.accent : theme.surface2 }]} onPress={handleCreate} disabled={creating || !newName}>
                    {creating ? <ActivityIndicator color="#000" size="small" /> : <Text style={[mb$.createBtnText, MONT('900'), { color: newName ? '#000' : theme.textTer }]}>CREA</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <ScrollView>
              {challenges.length === 0 && (
                <View style={mb$.emptySide}>
                  <Ionicons name="calendar-outline" size={24} color={theme.textTer} />
                  <Text style={[mb$.emptySideText('300'), { color: theme.textTer }]}>Nessuna sfida creata</Text>
                </View>
              )}
              {challenges.map(c => (
                <TouchableOpacity key={c.id}
                  style={[mb$.challengeItem, selectedChallenge?.id === c.id && { backgroundColor: theme.accent + '10', borderRightWidth: 3, borderRightColor: theme.accent }]}
                  onPress={() => handleSelectChallenge(c)}
                >
                  <View style={[mb$.challengeStatus, { backgroundColor: c.status === 'active' ? '#00FF8740' : theme.surface2 }]}>
                    <Text style={[mb$.challengeStatusText, MONT('900'), { color: c.status === 'active' ? '#00FF87' : theme.textTer }]}>
                      {(c.status || 'DRAFT').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[mb$.challengeName, MONT('700'), { color: theme.text }]} numberOfLines={1}>{c.name}</Text>
                  <Text style={[mb$.challengeMeta('300'), { color: theme.textTer }]}>{c.duration_days} giorni · {c.days?.filter((d: any) => d.discipline).length || 0} eventi</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Main area */}
          <View style={mb$.mainArea}>
            {!selectedChallenge ? (
              <View style={mb$.noSelection}>
                <Ionicons name="calendar-outline" size={36} color={theme.textTer} />
                <Text style={[mb$.noSelectionText, MONT('700'), { color: theme.text }]}>Seleziona o crea una sfida</Text>
                <Text style={[mb$.noSelectionSub('300'), { color: theme.textTer }]}>Il tuo challenge builder multidisciplina</Text>
              </View>
            ) : tab === 'automation' ? (
              <AutomationEngine challenge={{ ...selectedChallenge, automation_rules: localRules }} onRulesChange={setLocalRules} theme={theme} />
            ) : (
              <ScrollView style={mb$.builderScroll} contentContainerStyle={mb$.builderContent}>
                {/* Challenge header */}
                <View style={mb$.challengeHeader}>
                  <View>
                    <Text style={[mb$.challengeTitle, MONT(), { color: theme.text }]}>{selectedChallenge.name}</Text>
                    <Text style={[mb$.challengeSubtitle('300'), { color: theme.textTer }]}>
                      {selectedChallenge.duration_days} giorni · {selectedChallenge.start_date?.slice(0, 10) || 'Data da definire'}
                    </Text>
                  </View>
                  {/* Crew selector */}
                  <View style={mb$.crewSelector}>
                    <Text style={[mb$.crewSelectorLabel('300'), { color: theme.textTer }]}>INVIA A CREW:</Text>
                    {crews.map(c => (
                      <TouchableOpacity key={c.id}
                        style={[mb$.crewOpt, selectedCrewIds.includes(c.id) && { borderColor: theme.accent, backgroundColor: theme.accent + '10' }]}
                        onPress={() => setSelectedCrewIds(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                      >
                        {selectedCrewIds.includes(c.id) && <Ionicons name="checkmark" size={10} color={theme.accent} />}
                        <Text style={[mb$.crewOptText, MONT('900'), { color: selectedCrewIds.includes(c.id) ? theme.accent : theme.textTer }]}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* VISUAL TIMELINE */}
                <View style={mb$.timelineSection}>
                  <Text style={[mb$.timelineLabel, MONT('900'), { color: theme.textTer }]}>VISUAL TIMELINE — CLICK GIORNI PER AGGIUNGERE EVENTI</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={mb$.timelineScroll}>
                    {localDays.map((day, idx) => (
                      <DayColumn
                        key={idx}
                        day={day}
                        date={day.date || new Date(Date.now() + idx * 86400000).toISOString()}
                        theme={theme}
                        onAdd={() => setEditingDay(idx)}
                        onRemove={() => handleDayRemove(idx)}
                      />
                    ))}
                  </ScrollView>
                </View>

                {/* Day event editor */}
                {editingDay !== null && (
                  <DayEventEditor
                    day={localDays[editingDay]}
                    theme={theme}
                    onSave={(updates) => handleDaySave(editingDay, updates)}
                    onClose={() => setEditingDay(null)}
                  />
                )}

                {/* Discipline palette legend */}
                <View style={[mb$.palette, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[mb$.paletteTitle, MONT('900'), { color: theme.textTer }]}>PALETTE DISCIPLINE</Text>
                  <View style={mb$.paletteGrid}>
                    {Object.entries(DISC_META).map(([k, m]) => (
                      <View key={k} style={[mb$.paletteItem, { backgroundColor: m.color + '12', borderColor: m.color + '30' }]}>
                        <Ionicons name={m.icon as any} size={12} color={m.color} />
                        <Text style={[mb$.paletteLabel, MONT('900'), { color: m.color }]}>{m.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const mb$ = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 8, borderBottomWidth: 1 },
  tabs: { flexDirection: 'row', gap: 4 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 10 },
  tabLabel: { fontSize: 11, letterSpacing: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  saveBtnTxt: { fontSize: 11, letterSpacing: 1.5 },
  pushBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 8 },
  pushBtnTxt: { color: '#000', fontSize: 11, letterSpacing: 1.5 },
  body: { flex: 1, flexDirection: 'row' },
  sidePanel: { width: 200, borderRightWidth: 1 },
  sidePanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  sidePanelTitle: { fontSize: 11, letterSpacing: 2.5 },
  newForm: { margin: 8, borderRadius: 10, borderWidth: 1, padding: 10, gap: 8 },
  newInput: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13 } as any,
  newRow: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  newDaysInput: { width: 50, borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 7, fontSize: 13, textAlign: 'center' } as any,
  createBtn: { flex: 1, borderRadius: 7, paddingVertical: 8, alignItems: 'center' },
  createBtnText: { fontSize: 11, letterSpacing: 2 },
  emptySide: { alignItems: 'center', paddingTop: 30, gap: 8 },
  emptySideText: { fontSize: 11 },
  challengeItem: { paddingHorizontal: 12, paddingVertical: 10, gap: 3, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  challengeStatus: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 3 },
  challengeStatusText: { fontSize: 8, letterSpacing: 1.5 },
  challengeName: { fontSize: 12, letterSpacing: 0.5 },
  challengeMeta: { fontSize: 9, letterSpacing: 0.3 },
  mainArea: { flex: 1 },
  noSelection: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  noSelectionText: { fontSize: 16, letterSpacing: 2 },
  noSelectionSub: { fontSize: 12 },
  builderScroll: { flex: 1 },
  builderContent: { padding: 18, gap: 16, paddingBottom: 48 },
  challengeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  challengeTitle: { fontSize: 18, letterSpacing: 2 },
  challengeSubtitle: { fontSize: 11, letterSpacing: 0.5, marginTop: 3 },
  crewSelector: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  crewSelectorLabel: { fontSize: 9, letterSpacing: 2 },
  crewOpt: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5, borderColor: 'rgba(255,255,255,0.07)' },
  crewOptText: { fontSize: 9, letterSpacing: 1.5 },
  timelineSection: { gap: 8 },
  timelineLabel: { fontSize: 9, letterSpacing: 3 },
  timelineScroll: { flexGrow: 0 },
  palette: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  paletteTitle: { fontSize: 9, letterSpacing: 3 },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  paletteItem: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  paletteLabel: { fontSize: 9, letterSpacing: 1 },
});
