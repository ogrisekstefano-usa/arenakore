/**
 * ARENAKORE — Coach Studio v2.0
 * Template Engine Sub-component extracted from crews.tsx
 * Nike Elite Aesthetic
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '../../utils/api';
import { playAcceptPing } from '../../utils/sounds';

const DIFFICULTY_LEVELS: { key: string; label: string; color: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'easy', label: 'EASY', color: '#00FF87', icon: 'star-outline' },
  { key: 'medium', label: 'MEDIUM', color: '#FF9500', icon: 'star-half' },
  { key: 'hard', label: 'HARD', color: '#FF3B30', icon: 'star' },
  { key: 'extreme', label: 'EXTREME', color: '#AF52DE', icon: 'flame' },
];

const EXERCISES: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'squat', label: 'DEEP SQUAT', icon: 'barbell' },
  { key: 'punch', label: 'EXPLOSIVE PUNCH', icon: 'hand-left' },
];

export function CoachStudio({ token, myCrews }: { token: string; myCrews: any[] }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [pushing, setPushing] = useState<string | null>(null);
  const [pushTargetTemplate, setPushTargetTemplate] = useState<any>(null);
  const [showPushModal, setShowPushModal] = useState(false);

  const [name, setName] = useState('');
  const [exercise, setExercise] = useState('squat');
  const [targetTime, setTargetTime] = useState('60');
  const [targetReps, setTargetReps] = useState('10');
  const [xpReward, setXpReward] = useState('50');
  const [difficulty, setDifficulty] = useState('medium');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await api.getTemplates(token);
      setTemplates(data);
    } catch (e) { console.log('Template load error:', e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Errore', 'Inserisci un nome per il template'); return; }
    setSaving(true);
    try {
      await api.createTemplate({ name: name.trim(), exercise, target_time: parseInt(targetTime) || 60, target_reps: parseInt(targetReps) || 10, xp_reward: parseInt(xpReward) || 50, difficulty, description: description.trim() || undefined }, token);
      playAcceptPing();
      setShowCreator(false);
      resetForm();
      loadTemplates();
    } catch (e: any) { Alert.alert('Errore', e?.message || 'Impossibile salvare'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string, templateName: string) => {
    Alert.alert('Elimina Template', `Eliminare "${templateName}"?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        try { await api.deleteTemplate(id, token); loadTemplates(); } catch (e: any) { Alert.alert('Errore', e?.message); }
      }},
    ]);
  };

  const handlePush = async (crewId: string) => {
    if (!pushTargetTemplate) return;
    setPushing(crewId);
    try {
      const result = await api.pushTemplateToCrew(pushTargetTemplate.id, crewId, token);
      playAcceptPing();
      Alert.alert('Sfida Lanciata!', `"${result.template}" inviata a ${result.crew}\n${result.members_reached} Kore raggiunti`);
      setShowPushModal(false);
      setPushTargetTemplate(null);
      loadTemplates();
    } catch (e: any) { Alert.alert('Errore', e?.message || 'Impossibile inviare'); }
    finally { setPushing(null); }
  };

  const resetForm = () => {
    setName(''); setExercise('squat'); setTargetTime('60');
    setTargetReps('10'); setXpReward('50'); setDifficulty('medium'); setDescription('');
  };

  const diffCfg = (key: string) => DIFFICULTY_LEVELS.find(d => d.key === key) || DIFFICULTY_LEVELS[1];

  return (
    <View style={cs$.container}>
      {/* Header */}
      <View style={cs$.header}>
        <Ionicons name="construct" size={28} color="#FFD700" />
        <View>
          <Text style={cs$.headerTitle}>MY STUDIO</Text>
          <Text style={cs$.headerSub}>Template Engine {'\u00b7'} {templates.length} template</Text>
        </View>
      </View>

      {/* Create Template Button */}
      <TouchableOpacity style={cs$.createBtn} onPress={() => setShowCreator(true)} activeOpacity={0.8}>
        <LinearGradient colors={['#FFD700', '#B8962E']} style={cs$.createGrad}>
          <Ionicons name="add-circle" size={20} color="#050505" />
          <Text style={cs$.createText}>CREA NUOVO TEMPLATE SFIDA</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Template Library */}
      {loading ? (
        <ActivityIndicator color="#00E5FF" style={{ marginTop: 40 }} />
      ) : templates.length === 0 ? (
        <View style={cs$.emptyState}>
          <Ionicons name="document-text-outline" size={48} color="rgba(255,255,255,0.2)" />
          <Text style={cs$.emptyTitle}>LIBRERIA VUOTA</Text>
          <Text style={cs$.emptySub}>Crea il tuo primo template per iniziare</Text>
        </View>
      ) : (
        templates.map((t, i) => {
          const dc = diffCfg(t.difficulty);
          const exCfg = EXERCISES.find(e => e.key === t.exercise) || EXERCISES[0];
          return (
            <Animated.View key={t.id} entering={FadeInDown.delay(i * 60)}>
              <View style={cs$.card}>
                <View style={cs$.cardHeader}>
                  <View style={cs$.cardTitleRow}>
                    <Text style={cs$.cardName}>{t.name}</Text>
                    <View style={[cs$.diffBadge, { backgroundColor: `${dc.color}20`, borderColor: `${dc.color}50` }]}>
                      <Text style={[cs$.diffText, { color: dc.color }]}>{dc.label}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(t.id, t.name)} style={cs$.deleteBtn}>
                    <Ionicons name="trash-outline" size={16} color="rgba(255,59,48,0.5)" />
                  </TouchableOpacity>
                </View>
                <View style={cs$.cardStats}>
                  <View style={cs$.statItem}>
                    <Ionicons name={exCfg.icon} size={12} color="#00E5FF" />
                    <Text style={cs$.stat}>{t.exercise === 'squat' ? 'SQUAT' : 'PUNCH'}</Text>
                  </View>
                  <View style={cs$.statItem}>
                    <Ionicons name="timer-outline" size={12} color="rgba(255,255,255,0.5)" />
                    <Text style={cs$.stat}>{t.target_time}s</Text>
                  </View>
                  <View style={cs$.statItem}>
                    <Ionicons name="repeat" size={12} color="rgba(255,255,255,0.5)" />
                    <Text style={cs$.stat}>{t.target_reps} reps</Text>
                  </View>
                  <View style={cs$.statItem}>
                    <Ionicons name="flash" size={12} color="#FFD700" />
                    <Text style={[cs$.stat, { color: '#FFD700' }]}>{t.xp_reward} FLUX</Text>
                  </View>
                </View>
                {t.description ? <Text style={cs$.cardDesc}>{t.description}</Text> : null}
                <View style={cs$.cardFooter}>
                  <Text style={cs$.usesText}>{t.uses_count} invii</Text>
                  <TouchableOpacity style={cs$.pushBtn} onPress={() => { setPushTargetTemplate(t); setShowPushModal(true); }} activeOpacity={0.8}>
                    <Ionicons name="paper-plane" size={14} color="#FFD700" />
                    <Text style={cs$.pushText}>LANCIA SFIDA</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          );
        })
      )}

      {/* ===== CREATE TEMPLATE MODAL ===== */}
      <Modal visible={showCreator} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={ct$.backdrop}>
          <ScrollView contentContainerStyle={ct$.scroll}>
            <View style={ct$.card}>
              <View style={ct$.titleRow}>
                <Ionicons name="construct" size={20} color="#FFD700" />
                <Text style={ct$.title}>CREA TEMPLATE</Text>
              </View>
              <Text style={ct$.subtitle}>Definisci la tua sfida custom</Text>

              <Text style={ct$.label}>NOME SFIDA</Text>
              <TextInput style={ct$.input} value={name} onChangeText={setName} placeholder="Es: Sprint Finale" placeholderTextColor="#555" />

              <Text style={ct$.label}>ESERCIZIO BASE</Text>
              <View style={ct$.exRow}>
                {EXERCISES.map(ex => (
                  <TouchableOpacity key={ex.key} style={[ct$.exBtn, exercise === ex.key && ct$.exBtnActive]} onPress={() => setExercise(ex.key)}>
                    <Ionicons name={ex.icon} size={24} color={exercise === ex.key ? '#00E5FF' : 'rgba(255,255,255,0.3)'} />
                    <Text style={[ct$.exLabel, exercise === ex.key && { color: '#00E5FF' }]}>{ex.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={ct$.label}>{"DIFFICOLT\u00c0"}</Text>
              <View style={ct$.diffRow}>
                {DIFFICULTY_LEVELS.map(d => (
                  <TouchableOpacity key={d.key} style={[ct$.diffBtn, difficulty === d.key && { borderColor: d.color, backgroundColor: `${d.color}15` }]} onPress={() => setDifficulty(d.key)}>
                    <Ionicons name={d.icon} size={12} color={difficulty === d.key ? d.color : 'rgba(255,255,255,0.3)'} />
                    <Text style={[ct$.diffLabel, difficulty === d.key && { color: d.color }]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={ct$.numRow}>
                <View style={ct$.numCol}><Text style={ct$.label}>TEMPO (SEC)</Text><TextInput style={ct$.input} value={targetTime} onChangeText={setTargetTime} keyboardType="numeric" /></View>
                <View style={ct$.numCol}><Text style={ct$.label}>TARGET REPS</Text><TextInput style={ct$.input} value={targetReps} onChangeText={setTargetReps} keyboardType="numeric" /></View>
                <View style={ct$.numCol}><Text style={ct$.label}>FLUX REWARD</Text><TextInput style={ct$.input} value={xpReward} onChangeText={setXpReward} keyboardType="numeric" /></View>
              </View>

              <Text style={ct$.label}>DESCRIZIONE (OPZIONALE)</Text>
              <TextInput style={[ct$.input, { height: 60, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="Istruzioni per i Kore..." placeholderTextColor="#555" multiline />

              <TouchableOpacity style={ct$.saveBtn} onPress={handleCreate} disabled={saving} activeOpacity={0.8}>
                <LinearGradient colors={['#FFD700', '#B8962E']} style={ct$.saveGrad}>
                  {saving ? <ActivityIndicator color="#050505" /> : <Text style={ct$.saveText}>SALVA TEMPLATE</Text>}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowCreator(false); resetForm(); }} style={ct$.cancelBtn}>
                <Text style={ct$.cancelText}>ANNULLA</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== PUSH TO CREW MODAL ===== */}
      <Modal visible={showPushModal} animationType="slide" transparent>
        <View style={ct$.backdrop}>
          <View style={[ct$.card, { maxHeight: '70%' }]}>
            <View style={ct$.titleRow}>
              <Ionicons name="paper-plane" size={20} color="#FFD700" />
              <Text style={ct$.title}>LANCIA SFIDA</Text>
            </View>
            <Text style={ct$.subtitle}>Invia "{pushTargetTemplate?.name}" a una Crew</Text>
            <ScrollView style={{ marginTop: 12 }}>
              {myCrews.length === 0 ? (
                <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 20, fontWeight: '400' }}>Nessuna crew disponibile</Text>
              ) : (
                myCrews.map((crew) => (
                  <TouchableOpacity key={crew.id} style={cs$.pushCrewItem} onPress={() => handlePush(crew.id)} disabled={pushing === crew.id} activeOpacity={0.8}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: '#FFF', fontSize: 19, fontWeight: '900' }}>{crew.name}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: '600' }}>{crew.members_count} Kore {'\u00b7'} {crew.xp_total} FLUX</Text>
                    </View>
                    {pushing === crew.id ? (
                      <ActivityIndicator color="#FFD700" size="small" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ color: '#FFD700', fontSize: 17, fontWeight: '900' }}>INVIA</Text>
                        <Ionicons name="arrow-forward" size={14} color="#FFD700" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity onPress={() => { setShowPushModal(false); setPushTargetTemplate(null); }} style={ct$.cancelBtn}>
              <Text style={ct$.cancelText}>CHIUDI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const cs$ = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  headerTitle: { color: '#FFD700', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  headerSub: { color: '#AAAAAA', fontSize: 15, fontWeight: '400', letterSpacing: 1 },
  createBtn: { borderRadius: 14, overflow: 'hidden' },
  createGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  createText: { color: '#000000', fontSize: 17, fontWeight: '900', letterSpacing: 2 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 19, fontWeight: '900', letterSpacing: 2 },
  emptySub: { color: '#AAAAAA', fontSize: 17, fontWeight: '400' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  diffText: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  deleteBtn: { padding: 4 },
  cardStats: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stat: { color: '#AAAAAA', fontSize: 16, fontWeight: '800' },
  cardDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontStyle: 'italic' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  usesText: { color: '#AAAAAA', fontSize: 15, fontWeight: '400' },
  pushBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,215,0,0.12)', paddingHorizontal: 24, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)'
  },
  pushText: { color: '#FFD700', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
  pushCrewItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.45)'
  }
});

const ct$ = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  scroll: { justifyContent: 'flex-end' },
  card: {
    backgroundColor: '#0A0A0A', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)'
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { color: '#FFD700', fontSize: 20, fontWeight: '900', letterSpacing: 3 },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 17, textAlign: 'center', marginBottom: 8 },
  label: { color: '#00E5FF', fontSize: 14, fontWeight: '900', letterSpacing: 2, marginTop: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12,
    color: '#FFF', fontSize: 19, fontWeight: '400', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)'
  },
  exRow: { flexDirection: 'row', gap: 10 },
  exBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.05)'
  },
  exBtnActive: { borderColor: '#00E5FF', backgroundColor: '#00E5FF22' },
  exLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  diffRow: { flexDirection: 'row', gap: 6 },
  diffBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.05)'
  },
  diffLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  numRow: { flexDirection: 'row', gap: 10 },
  numCol: { flex: 1 },
  saveBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  saveGrad: { paddingVertical: 16, alignItems: 'center' },
  saveText: { color: '#000000', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  cancelBtn: { paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: 'rgba(255,255,255,0.4)', fontSize: 17, fontWeight: '700' }
});
