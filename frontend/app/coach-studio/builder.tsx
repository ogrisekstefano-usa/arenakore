/**
 * COACH STUDIO — MODULE 2: TEMPLATE BUILDER
 * Block editor + AI Suggestion + Push to Mobile
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const EXERCISE_PALETTE = [
  { key: 'squat',   label: 'DEEP SQUAT',       icon: 'barbell',   color: '#00F2FF', dna: ['Forza', 'Potenza'] },
  { key: 'punch',   label: 'EXPLOSIVE PUNCH',  icon: 'hand-left', color: '#D4AF37', dna: ['Velocità', 'Agilità'] },
  { key: 'sprint',  label: 'SPRINT BURST',      icon: 'flash',     color: '#FF9500', dna: ['Velocità', 'Potenza'] },
  { key: 'plank',   label: 'ISOMETRIC HOLD',   icon: 'body',      color: '#AF52DE', dna: ['Resistenza', 'Tecnica'] },
  { key: 'lunge',   label: 'POWER LUNGE',      icon: 'walk',      color: '#34C759', dna: ['Agilità', 'Resistenza'] },
  { key: 'press',   label: 'SHOULDER PRESS',   icon: 'fitness',   color: '#FF453A', dna: ['Forza', 'Tecnica'] },
];

const DIFF_OPTIONS = [
  { key: 'easy', label: 'EASY', color: '#34C759' },
  { key: 'medium', label: 'MEDIUM', color: '#FF9500' },
  { key: 'hard', label: 'HARD', color: '#FF3B30' },
  { key: 'extreme', label: 'EXTREME', color: '#AF52DE' },
];

interface Block {
  id: string;
  exercise: string;
  label: string;
  reps: number;
  duration_seconds: number;
  sets: number;
  rest_seconds: number;
  color: string;
}

export default function TemplateBuilder() {
  const { token } = useAuth();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [xpReward, setXpReward] = useState('150');
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;
    api.getCoachAthletes(token).then(d => setAthletes(d.athletes || [])).catch(() => {});
  }, [token]);

  const addBlock = (ex: typeof EXERCISE_PALETTE[0]) => {
    const block: Block = {
      id: Date.now().toString(),
      exercise: ex.key,
      label: ex.label,
      reps: 12,
      duration_seconds: 40,
      sets: 3,
      rest_seconds: 45,
      color: ex.color,
    };
    setBlocks(prev => [...prev, block]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const removeBlock = (id: string) => setBlocks(prev => prev.filter(b => b.id !== id));
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setBlocks(prev => { const a = [...prev]; [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; return a; });
  };
  const moveDown = (idx: number) => {
    setBlocks(prev => { if (idx >= prev.length - 1) return prev; const a = [...prev]; [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; return a; });
  };
  const updateBlock = (id: string, field: keyof Block, value: any) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const getAISuggestion = async () => {
    if (!token) return;
    setLoadingAI(true);
    try {
      const data = await api.getCoachAISuggestion(selectedAthletes, token);
      setAiSuggestion(data.suggestion);
      // Auto-populate blocks from AI suggestion
      if (data.suggestion?.blocks) {
        const newBlocks: Block[] = data.suggestion.blocks.map((b: any, i: number) => ({
          id: Date.now().toString() + i,
          exercise: b.exercise,
          label: b.exercise.toUpperCase(),
          reps: b.reps,
          duration_seconds: b.duration_seconds,
          sets: b.sets,
          rest_seconds: b.rest_seconds,
          color: EXERCISE_PALETTE.find(e => e.key === b.exercise)?.color || '#00F2FF',
        }));
        setBlocks(newBlocks);
        if (!templateName) setTemplateName(`AI SESSION — ${data.suggestion.intensity?.toUpperCase() || 'MEDIUM'}`);
      }
    } catch (_) { Alert.alert('AI Error', 'Impossibile generare suggerimento'); }
    finally { setLoadingAI(false); }
  };

  const autoScale = () => {
    if (athletes.length === 0 || selectedAthletes.length === 0) return;
    const selected = athletes.filter(a => selectedAthletes.includes(a.id));
    const avgKore = selected.reduce((s, a) => s + a.dna_avg, 0) / selected.length;
    // Auto-set difficulty based on group KORE
    if (avgKore >= 80) setDifficulty('extreme');
    else if (avgKore >= 68) setDifficulty('hard');
    else if (avgKore >= 55) setDifficulty('medium');
    else setDifficulty('easy');
    // Auto-set XP reward
    setXpReward(String(Math.round(avgKore * 2.5)));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const pushTemplate = async () => {
    if (!token) return;
    if (!templateName.trim()) { Alert.alert('Errore', 'Inserisci un nome per il template'); return; }
    if (blocks.length === 0) { Alert.alert('Errore', 'Aggiungi almeno un esercizio'); return; }
    if (selectedAthletes.length === 0) { Alert.alert('Errore', 'Seleziona almeno un atleta'); return; }

    setPushing(true);
    // Use the first block's exercise/reps/duration as primary for the template
    const primary = blocks[0];
    try {
      await api.createTemplate({
        name: templateName,
        exercise: primary.exercise,
        target_time: primary.duration_seconds * primary.sets,
        target_reps: primary.reps * primary.sets,
        xp_reward: Number(xpReward) || 150,
        difficulty,
        description: blocks.map(b => `${b.label}: ${b.reps} reps x${b.sets}`).join(', '),
      }, token);
      Alert.alert('TEMPLATE CREATO', `"${templateName}" salvato. Usa Push nel tab Template per inviarlo.`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Impossibile salvare il template');
    } finally { setPushing(false); }
  };

  const totalDuration = blocks.reduce((s, b) => s + b.duration_seconds * b.sets + b.rest_seconds * (b.sets - 1), 0);

  return (
    <ScrollView style={b$.root} contentContainerStyle={b$.content}>
      <View style={b$.header}>
        <View>
          <Text style={b$.title}>TEMPLATE BUILDER</Text>
          <Text style={b$.sub}>Assembla, calibra con AI, invia al mobile</Text>
        </View>
        <View style={b$.headerBtns}>
          <TouchableOpacity
            style={[b$.scaleBtn, selectedAthletes.length === 0 && b$.pushBtnDisabled]}
            onPress={autoScale}
            disabled={selectedAthletes.length === 0}
            activeOpacity={0.85}
          >
            <Ionicons name="options" size={14} color="#D4AF37" />
            <Text style={b$.scaleBtnText}>AUTO-SCALE DNA</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[b$.pushBtn, pushing && b$.pushBtnDisabled]}
            onPress={pushTemplate}
            disabled={pushing}
            activeOpacity={0.85}
          >
            {pushing ? <ActivityIndicator color="#000" size="small" /> : (
              <><Ionicons name="cloud-upload" size={16} color="#000000" /><Text style={b$.pushBtnText}>PUSH TO ATHLETE</Text></>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={b$.cols}>
        {/* LEFT: Editor */}
        <View style={b$.editorCol}>
          {/* Template metadata */}
          <View style={b$.metaCard}>
            <Text style={b$.sectionLabel}>NOME SESSIONE</Text>
            <TextInput
              style={b$.nameInput}
              placeholder="es. POWER PROTOCOL — GIORNO 1"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={templateName}
              onChangeText={setTemplateName}
            />
            <View style={b$.metaRow}>
              <View style={b$.metaField}>
                <Text style={b$.metaLabel}>DIFFICOLTÀ</Text>
                <View style={b$.diffRow}>
                  {DIFF_OPTIONS.map(d => (
                    <TouchableOpacity
                      key={d.key}
                      style={[b$.diffBtn, difficulty === d.key && { borderColor: d.color, backgroundColor: d.color + '15' }]}
                      onPress={() => setDifficulty(d.key)}
                    >
                      <Text style={[b$.diffBtnText, difficulty === d.key && { color: d.color }]}>{d.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={b$.metaField}>
                <Text style={b$.metaLabel}>XP REWARD</Text>
                <TextInput
                  style={b$.xpInput}
                  value={xpReward}
                  onChangeText={setXpReward}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Exercise palette */}
          <View style={b$.palette}>
            <Text style={b$.sectionLabel}>ESERCIZI — clicca per aggiungere</Text>
            <View style={b$.paletteGrid}>
              {EXERCISE_PALETTE.map(ex => (
                <TouchableOpacity
                  key={ex.key}
                  style={[b$.paletteItem, { borderColor: ex.color + '40' }]}
                  onPress={() => addBlock(ex)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={ex.icon as any} size={20} color={ex.color} />
                  <Text style={b$.paletteLabel}>{ex.label}</Text>
                  <Text style={b$.paletteDna}>{ex.dna.join(' · ')}</Text>
                  <View style={[b$.addDot, { backgroundColor: ex.color }]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Workout blocks */}
          <View style={b$.blocksArea}>
            <View style={b$.blocksHeader}>
              <Text style={b$.sectionLabel}>
                SESSIONE · {blocks.length} BLOCCHI · ~{Math.round(totalDuration / 60)} MIN
              </Text>
              {blocks.length > 0 && (
                <TouchableOpacity onPress={() => setBlocks([])}>
                  <Text style={b$.clearText}>SVUOTA</Text>
                </TouchableOpacity>
              )}
            </View>

            {blocks.length === 0 ? (
              <View style={b$.emptyBlocks}>
                <Ionicons name="add-circle-outline" size={28} color="rgba(255,255,255,0.1)" />
                <Text style={b$.emptyText}>Clicca un esercizio per aggiungerlo{`\n`}oppure usa l'AI per generare la sessione</Text>
              </View>
            ) : (
              blocks.map((block, idx) => (
                <Animated.View key={block.id} entering={FadeInDown.duration(200)} style={[b$.block, { borderLeftColor: block.color }]}>
                  <View style={b$.blockHeader}>
                    <View style={[b$.blockIcon, { backgroundColor: block.color + '20' }]}>
                      <Ionicons name={EXERCISE_PALETTE.find(e => e.key === block.exercise)?.icon as any || 'flash'} size={16} color={block.color} />
                    </View>
                    <Text style={[b$.blockName, { color: block.color }]}>{block.label}</Text>
                    <View style={b$.blockControls}>
                      <TouchableOpacity onPress={() => moveUp(idx)}><Ionicons name="chevron-up" size={14} color="rgba(255,255,255,0.3)" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => moveDown(idx)}><Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.3)" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => removeBlock(block.id)}><Ionicons name="close" size={14} color="#FF453A" /></TouchableOpacity>
                    </View>
                  </View>
                  <View style={b$.blockParams}>
                    {[{l:'REPS', f:'reps' as const}, {l:'SEC', f:'duration_seconds' as const}, {l:'SERIE', f:'sets' as const}, {l:'PAUSA', f:'rest_seconds' as const}].map(p => (
                      <View key={p.f} style={b$.param}>
                        <Text style={b$.paramLabel}>{p.l}</Text>
                        <TextInput
                          style={b$.paramInput}
                          value={String(block[p.f])}
                          onChangeText={v => updateBlock(block.id, p.f, parseInt(v) || 0)}
                          keyboardType="numeric"
                        />
                      </View>
                    ))}
                  </View>
                </Animated.View>
              ))
            )}
          </View>
        </View>

        {/* RIGHT: AI Panel + Athletes */}
        <View style={b$.rightCol}>
          {/* AI Suggestion */}
          <View style={b$.aiCard}>
            <View style={b$.aiHeader}>
              <Ionicons name="hardware-chip" size={18} color="#00F2FF" />
              <Text style={b$.aiTitle}>AI SUGGESTION</Text>
            </View>
            <Text style={b$.aiDesc}>Seleziona gli atleti e lascia che l'AI calibri la sessione in base al loro DNA medio.</Text>
            <TouchableOpacity
              style={[b$.aiBtn, loadingAI && b$.aiBtnDisabled]}
              onPress={getAISuggestion}
              disabled={loadingAI}
              activeOpacity={0.85}
            >
              {loadingAI ? <ActivityIndicator color="#000" size="small" /> : (
                <><Ionicons name="sparkles" size={15} color="#000000" /><Text style={b$.aiBtnText}>GENERA SESSIONE AI</Text></>
              )}
            </TouchableOpacity>
            {aiSuggestion && (
              <View style={b$.aiResult}>
                <Text style={b$.aiResultTitle}>AI ANALYSIS</Text>
                <Text style={b$.aiNote}>{aiSuggestion.ai_note}</Text>
                <View style={b$.aiStats}>
                  <View style={b$.aiStat}><Text style={b$.aiStatVal}>{aiSuggestion.group_mean}</Text><Text style={b$.aiStatLabel}>DNA MEDIO</Text></View>
                  <View style={b$.aiStat}><Text style={[b$.aiStatVal, { color: '#FF9500' }]}>{aiSuggestion.focus_label?.toUpperCase()}</Text><Text style={b$.aiStatLabel}>FOCUS</Text></View>
                  <View style={b$.aiStat}><Text style={b$.aiStatVal}>{aiSuggestion.total_duration_min} min</Text><Text style={b$.aiStatLabel}>DURATA</Text></View>
                </View>
              </View>
            )}
          </View>

          {/* Athletes selector */}
          <View style={b$.athletesCard}>
            <Text style={b$.sectionLabel}>SELEZIONA ATLETI ({selectedAthletes.length})</Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {athletes.map(ath => {
                const isSelected = selectedAthletes.includes(ath.id);
                return (
                  <TouchableOpacity
                    key={ath.id}
                    style={[b$.athRow, isSelected && b$.athRowSelected]}
                    onPress={() => setSelectedAthletes(prev =>
                      prev.includes(ath.id) ? prev.filter(x => x !== ath.id) : [...prev, ath.id]
                    )}
                    activeOpacity={0.8}
                  >
                    <View style={[b$.athAvatar, { backgroundColor: ath.avatar_color || '#00F2FF' }]}>
                      <Text style={b$.athLetter}>{ath.username[0]}</Text>
                    </View>
                    <View style={b$.athInfo}>
                      <Text style={[b$.athName, isSelected && { color: '#00F2FF' }]}>{ath.username}</Text>
                      <Text style={b$.athDna}>DNA {ath.dna_avg} · LVL {ath.level}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={16} color="#00F2FF" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const b$ = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  content: { padding: 28, gap: 20, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 4 },
  sub: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '300', marginTop: 3 },
  headerBtns: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  scaleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(212,175,55,0.12)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)' },
  scaleBtnText: { color: '#D4AF37', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  pushBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#00F2FF', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 11 },
  pushBtnDisabled: { opacity: 0.5 },
  pushBtnText: { color: '#000000', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  cols: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  editorCol: { flex: 1, gap: 16 },
  rightCol: { width: 300, gap: 16 },
  sectionLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 10 },
  metaCard: { backgroundColor: '#0A0A0A', borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  nameInput: { backgroundColor: '#111111', color: '#FFFFFF', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontWeight: '700', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', outlineStyle: 'none' } as any,
  metaRow: { flexDirection: 'row', gap: 16 },
  metaField: { flex: 1, gap: 6 },
  metaLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  diffRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  diffBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  diffBtnText: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  xpInput: { backgroundColor: '#111111', color: '#D4AF37', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, fontWeight: '900', borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)', outlineStyle: 'none', width: 100 } as any,
  palette: { backgroundColor: '#0A0A0A', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paletteItem: { width: '30%', backgroundColor: '#111111', borderRadius: 10, padding: 12, borderWidth: 1, gap: 6, position: 'relative' },
  paletteLabel: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  paletteDna: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '300' },
  addDot: { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3 },
  blocksArea: { backgroundColor: '#0A0A0A', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', minHeight: 200 },
  blocksHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  clearText: { color: '#FF453A', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  emptyBlocks: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  block: { backgroundColor: '#111111', borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 3, gap: 8 },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  blockIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  blockName: { flex: 1, fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  blockControls: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  blockParams: { flexDirection: 'row', gap: 10 },
  param: { flex: 1, gap: 4 },
  paramLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 8, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  paramInput: { backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 14, fontWeight: '900', textAlign: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', outlineStyle: 'none' } as any,
  aiCard: { backgroundColor: '#0A0A0A', borderRadius: 12, padding: 18, gap: 12, borderWidth: 1, borderColor: 'rgba(0,242,255,0.12)' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiTitle: { color: '#00F2FF', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  aiDesc: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '300', lineHeight: 18 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#00F2FF', borderRadius: 8, paddingVertical: 11 },
  aiBtnDisabled: { opacity: 0.5 },
  aiBtnText: { color: '#000000', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  aiResult: { backgroundColor: '#111111', borderRadius: 8, padding: 12, gap: 8 },
  aiResultTitle: { color: 'rgba(0,242,255,0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  aiNote: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '300', lineHeight: 16 },
  aiStats: { flexDirection: 'row', gap: 12, justifyContent: 'space-around' },
  aiStat: { alignItems: 'center', gap: 3 },
  aiStatVal: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  aiStatLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  athletesCard: { backgroundColor: '#0A0A0A', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  athRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  athRowSelected: { backgroundColor: 'rgba(0,242,255,0.05)', borderRadius: 8 },
  athAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  athLetter: { color: '#000000', fontSize: 12, fontWeight: '900' },
  athInfo: { flex: 1 },
  athName: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  athDna: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '300' },
});
