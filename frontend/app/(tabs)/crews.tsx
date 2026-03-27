import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert, RefreshControl,
  KeyboardAvoidingView, Platform, ImageBackground, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, FadeInRight, SlideOutLeft,
  Layout, Easing, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { Header } from '../../components/Header';
import { playAcceptPing, playDecline, playCrewCreated } from '../../utils/sounds';

const CATEGORIES_MAP: Record<string, { icon: string; color: string }> = {
  atletica: { icon: '🏃', color: '#FF6B00' },
  combat: { icon: '🥊', color: '#FF3B30' },
  acqua: { icon: '🌊', color: '#007AFF' },
  team: { icon: '⚽', color: '#34C759' },
  fitness: { icon: '🏋️', color: '#D4AF37' },
  outdoor: { icon: '🏔️', color: '#30B0C7' },
  mind_body: { icon: '🧘', color: '#AF52DE' },
  extreme: { icon: '🔥', color: '#FF2D55' },
};

// WoW dramatic athlete group photos for immersive crew cards
const CREW_PHOTOS = [
  'https://images.unsplash.com/photo-1582086772405-6e2dcef428d4?w=800&q=60',
  'https://images.unsplash.com/photo-1529478562208-d4c746edcb79?w=800&q=60',
  'https://images.unsplash.com/photo-1710736460914-4a7f22d736c4?w=800&q=60',
  'https://images.unsplash.com/photo-1698788067684-2053c651bfed?w=800&q=60',
];

const { width: CREW_SW } = Dimensions.get('window');

// ===========================
// COACH GOLD BADGE COMPONENT
// ===========================
function CoachBadge() {
  return (
    <View style={badge$.container}>
      <Text style={badge$.icon}>👑</Text>
      <Text style={badge$.text}>COACH</Text>
    </View>
  );
}

const badge$ = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.4)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  icon: { fontSize: 10 },
  text: { color: '#D4AF37', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
});

// ===========================
// CREATE CREW MODAL
// ===========================
function CreateCrewModal({ visible, onClose, onCreated, token }: any) {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api.createCrew({ name: name.trim(), tagline: tagline.trim(), category: category || undefined }, token);
      playCrewCreated();
      setName(''); setTagline(''); setCategory(null);
      onCreated();
      onClose();
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Impossibile creare la Crew');
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={m$.backdrop}>
        <View style={m$.card}>
          <Text style={m$.title}>FONDA LA TUA CREW</Text>
          <Text style={m$.subtitle}>Crea la tua tribù su ArenaKore</Text>

          <TextInput
            testID="crew-name-input"
            style={m$.input}
            value={name}
            onChangeText={setName}
            placeholder="Nome Crew (es. Chicago Hoopers)"
            placeholderTextColor="#444"
            maxLength={30}
          />
          <TextInput
            style={m$.input}
            value={tagline}
            onChangeText={setTagline}
            placeholder="Tagline (opzionale)"
            placeholderTextColor="#444"
            maxLength={50}
          />

          <Text style={m$.catTitle}>CATEGORIA</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={m$.catRow}>
            {Object.entries(CATEGORIES_MAP).map(([id, cfg]) => (
              <TouchableOpacity
                key={id}
                onPress={() => setCategory(id)}
                style={[m$.catChip, category === id && { borderColor: cfg.color, backgroundColor: `${cfg.color}15` }]}
              >
                <Text style={m$.catIcon}>{cfg.icon}</Text>
                <Text style={[m$.catLabel, category === id && { color: cfg.color }]}>{id.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            testID="create-crew-btn"
            style={[m$.createBtn, !name.trim() && { opacity: 0.3 }]}
            onPress={handleCreate}
            disabled={!name.trim() || loading}
          >
            {loading ? <ActivityIndicator color="#050505" /> :
              <Text style={m$.createBtnText}>FONDA CREW</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={m$.cancelBtn} onPress={onClose}>
            <Text style={m$.cancelText}>Annulla</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const m$ = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  card: {
    backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 12,
  },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  subtitle: { color: '#555', fontSize: 13, marginBottom: 4 },
  input: {
    backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  catTitle: { color: '#888', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
  catRow: { gap: 8, paddingVertical: 4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#2A2A2A',
  },
  catIcon: { fontSize: 16 },
  catLabel: { color: '#888', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  createBtn: {
    backgroundColor: '#D4AF37', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  createBtnText: { color: '#050505', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: '#555', fontSize: 14 },
});

// ===========================
// COACH STUDIO — Template Engine
// ===========================
const DIFFICULTY_LEVELS = [
  { key: 'easy', label: 'EASY', color: '#34C759', icon: '\u2605' },
  { key: 'medium', label: 'MEDIUM', color: '#FF9500', icon: '\u2605\u2605' },
  { key: 'hard', label: 'HARD', color: '#FF3B30', icon: '\u2605\u2605\u2605' },
  { key: 'extreme', label: 'EXTREME', color: '#AF52DE', icon: '\ud83d\udd25' },
];

const EXERCISES = [
  { key: 'squat', label: 'DEEP SQUAT', icon: '\ud83c\udfcb\ufe0f' },
  { key: 'punch', label: 'EXPLOSIVE PUNCH', icon: '\ud83e\udd4a' },
];

function CoachStudio({ token, myCrews }: { token: string; myCrews: any[] }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [pushing, setPushing] = useState<string | null>(null);
  const [pushTargetTemplate, setPushTargetTemplate] = useState<any>(null);
  const [showPushModal, setShowPushModal] = useState(false);

  // Creator state
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
    } catch (e) {
      console.log('Template load error:', e);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Errore', 'Inserisci un nome per il template'); return; }
    setSaving(true);
    try {
      await api.createTemplate({
        name: name.trim(),
        exercise,
        target_time: parseInt(targetTime) || 60,
        target_reps: parseInt(targetReps) || 10,
        xp_reward: parseInt(xpReward) || 50,
        difficulty,
        description: description.trim() || undefined,
      }, token);
      playAcceptPing();
      setShowCreator(false);
      resetForm();
      loadTemplates();
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Impossibile salvare');
    } finally { setSaving(false); }
  };

  const handleDelete = (id: string, templateName: string) => {
    Alert.alert('Elimina Template', `Eliminare "${templateName}"?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        try {
          await api.deleteTemplate(id, token);
          loadTemplates();
        } catch (e: any) { Alert.alert('Errore', e?.message); }
      }},
    ]);
  };

  const handlePush = async (crewId: string) => {
    if (!pushTargetTemplate) return;
    setPushing(crewId);
    try {
      const result = await api.pushTemplateToCrew(pushTargetTemplate.id, crewId, token);
      playAcceptPing();
      Alert.alert('Sfida Lanciata!', `"${result.template}" inviata a ${result.crew}\n${result.members_reached} atleti raggiunti`);
      setShowPushModal(false);
      setPushTargetTemplate(null);
      loadTemplates();
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Impossibile inviare');
    } finally { setPushing(null); }
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
        <Text style={cs$.headerIcon}>{'\ud83d\udee0\ufe0f'}</Text>
        <View>
          <Text style={cs$.headerTitle}>MY STUDIO</Text>
          <Text style={cs$.headerSub}>Template Engine {'\u00b7'} {templates.length} template</Text>
        </View>
      </View>

      {/* Create Template Button */}
      <TouchableOpacity style={cs$.createBtn} onPress={() => setShowCreator(true)} activeOpacity={0.8}>
        <LinearGradient colors={['#D4AF37', '#B8962E']} style={cs$.createGrad}>
          <Text style={cs$.createPlus}>+</Text>
          <Text style={cs$.createText}>CREA NUOVO TEMPLATE SFIDA</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Template Library */}
      {loading ? (
        <ActivityIndicator color="#00F2FF" style={{ marginTop: 40 }} />
      ) : templates.length === 0 ? (
        <View style={cs$.emptyState}>
          <Text style={cs$.emptyIcon}>{'\ud83d\udcdd'}</Text>
          <Text style={cs$.emptyTitle}>LIBRERIA VUOTA</Text>
          <Text style={cs$.emptySub}>Crea il tuo primo template per iniziare</Text>
        </View>
      ) : (
        templates.map((t, i) => {
          const dc = diffCfg(t.difficulty);
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
                    <Text style={cs$.deleteIcon}>{'\ud83d\uddd1\ufe0f'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={cs$.cardStats}>
                  <Text style={cs$.stat}>{t.exercise === 'squat' ? '\ud83c\udfcb\ufe0f' : '\ud83e\udd4a'} {t.exercise === 'squat' ? 'SQUAT' : 'PUNCH'}</Text>
                  <Text style={cs$.stat}>{'\u23f1'} {t.target_time}s</Text>
                  <Text style={cs$.stat}>{'\ud83d\udd01'} {t.target_reps} reps</Text>
                  <Text style={[cs$.stat, { color: '#D4AF37' }]}>{'\u26a1'} {t.xp_reward} XP</Text>
                </View>
                {t.description ? <Text style={cs$.cardDesc}>{t.description}</Text> : null}
                <View style={cs$.cardFooter}>
                  <Text style={cs$.usesText}>{t.uses_count} invii</Text>
                  <TouchableOpacity
                    style={cs$.pushBtn}
                    onPress={() => { setPushTargetTemplate(t); setShowPushModal(true); }}
                    activeOpacity={0.8}
                  >
                    <Text style={cs$.pushIcon}>{'\ud83d\ude80'}</Text>
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
              <Text style={ct$.title}>{'\ud83d\udee0\ufe0f'} CREA TEMPLATE</Text>
              <Text style={ct$.subtitle}>Definisci la tua sfida custom</Text>

              <Text style={ct$.label}>NOME SFIDA</Text>
              <TextInput style={ct$.input} value={name} onChangeText={setName} placeholder="Es: Sprint Finale" placeholderTextColor="#555" />

              <Text style={ct$.label}>ESERCIZIO BASE</Text>
              <View style={ct$.exRow}>
                {EXERCISES.map(ex => (
                  <TouchableOpacity key={ex.key} style={[ct$.exBtn, exercise === ex.key && ct$.exBtnActive]} onPress={() => setExercise(ex.key)}>
                    <Text style={ct$.exIcon}>{ex.icon}</Text>
                    <Text style={[ct$.exLabel, exercise === ex.key && { color: '#00F2FF' }]}>{ex.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={ct$.label}>{"DIFFICOLT\u00c0"}</Text>
              <View style={ct$.diffRow}>
                {DIFFICULTY_LEVELS.map(d => (
                  <TouchableOpacity key={d.key} style={[ct$.diffBtn, difficulty === d.key && { borderColor: d.color, backgroundColor: `${d.color}15` }]} onPress={() => setDifficulty(d.key)}>
                    <Text style={{ fontSize: 10 }}>{d.icon}</Text>
                    <Text style={[ct$.diffLabel, difficulty === d.key && { color: d.color }]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={ct$.numRow}>
                <View style={ct$.numCol}>
                  <Text style={ct$.label}>TEMPO (SEC)</Text>
                  <TextInput style={ct$.input} value={targetTime} onChangeText={setTargetTime} keyboardType="numeric" />
                </View>
                <View style={ct$.numCol}>
                  <Text style={ct$.label}>TARGET REPS</Text>
                  <TextInput style={ct$.input} value={targetReps} onChangeText={setTargetReps} keyboardType="numeric" />
                </View>
                <View style={ct$.numCol}>
                  <Text style={ct$.label}>XP REWARD</Text>
                  <TextInput style={ct$.input} value={xpReward} onChangeText={setXpReward} keyboardType="numeric" />
                </View>
              </View>

              <Text style={ct$.label}>DESCRIZIONE (OPZIONALE)</Text>
              <TextInput style={[ct$.input, { height: 60, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="Istruzioni per gli atleti..." placeholderTextColor="#555" multiline />

              <TouchableOpacity style={ct$.saveBtn} onPress={handleCreate} disabled={saving} activeOpacity={0.8}>
                <LinearGradient colors={['#D4AF37', '#B8962E']} style={ct$.saveGrad}>
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
            <Text style={ct$.title}>{'\ud83d\ude80'} LANCIA SFIDA</Text>
            <Text style={ct$.subtitle}>Invia "{pushTargetTemplate?.name}" a una Crew</Text>
            <ScrollView style={{ marginTop: 12 }}>
              {myCrews.length === 0 ? (
                <Text style={{ color: '#555', textAlign: 'center', marginTop: 20 }}>Nessuna crew disponibile</Text>
              ) : (
                myCrews.map((crew) => (
                  <TouchableOpacity
                    key={crew.id}
                    style={cs$.pushCrewItem}
                    onPress={() => handlePush(crew.id)}
                    disabled={pushing === crew.id}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>{crew.name}</Text>
                      <Text style={{ color: '#555', fontSize: 10 }}>{crew.members_count} membri {'\u00b7'} {crew.xp_total} XP</Text>
                    </View>
                    {pushing === crew.id ? (
                      <ActivityIndicator color="#D4AF37" size="small" />
                    ) : (
                      <Text style={{ color: '#D4AF37', fontSize: 12, fontWeight: '900' }}>INVIA {'\u27a1'}</Text>
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
  container: { flex: 1, paddingHorizontal: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  headerIcon: { fontSize: 32 },
  headerTitle: { color: '#D4AF37', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  headerSub: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  createBtn: { borderRadius: 14, overflow: 'hidden' },
  createGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  createPlus: { color: '#050505', fontSize: 24, fontWeight: '300' },
  createText: { color: '#050505', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: '#555', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  emptySub: { color: '#333', fontSize: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, gap: 10,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.06)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardName: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  diffText: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  deleteBtn: { padding: 4 },
  deleteIcon: { fontSize: 16 },
  cardStats: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  stat: { color: '#888', fontSize: 11, fontWeight: '700' },
  cardDesc: { color: '#555', fontSize: 11, fontStyle: 'italic' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  usesText: { color: '#333', fontSize: 10, fontWeight: '700' },
  pushBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(212,175,55,0.12)', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)',
  },
  pushIcon: { fontSize: 14 },
  pushText: { color: '#D4AF37', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  pushCrewItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
});

const ct$ = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  scroll: { justifyContent: 'flex-end' },
  card: {
    backgroundColor: '#0A0A0A', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 8, borderWidth: 1, borderColor: 'rgba(212,175,55,0.1)',
  },
  title: { color: '#D4AF37', fontSize: 18, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
  subtitle: { color: '#555', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  label: { color: '#00F2FF', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginTop: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: '#FFF', fontSize: 14, fontWeight: '700', borderWidth: 1, borderColor: 'rgba(0,242,255,0.08)',
  },
  exRow: { flexDirection: 'row', gap: 10 },
  exBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)',
  },
  exBtnActive: { borderColor: '#00F2FF', backgroundColor: 'rgba(0,242,255,0.06)' },
  exIcon: { fontSize: 24 },
  exLabel: { color: '#888', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  diffRow: { flexDirection: 'row', gap: 6 },
  diffBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', gap: 2,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)',
  },
  diffLabel: { color: '#888', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  numRow: { flexDirection: 'row', gap: 10 },
  numCol: { flex: 1 },
  saveBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  saveGrad: { paddingVertical: 16, alignItems: 'center' },
  saveText: { color: '#050505', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  cancelBtn: { paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: '#555', fontSize: 12, fontWeight: '700' },
});



// ===========================
// INVITE MODAL
// ===========================
function InviteModal({ visible, onClose, crewId, token }: any) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    if (text.length >= 2) {
      setSearching(true);
      debounce.current = setTimeout(async () => {
        try {
          const r = await api.searchUsers(text, token);
          setResults(r);
        } catch { setResults([]); }
        finally { setSearching(false); }
      }, 300);
    } else {
      setResults([]);
    }
  };

  const handleInvite = async (username: string) => {
    setInviting(username);
    try {
      await api.inviteToCrew(crewId, username, token);
      Alert.alert('Invito inviato!', `${username} ha ricevuto il tuo invito.`);
      setResults(prev => prev.filter(r => r.username !== username));
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Impossibile invitare');
    } finally { setInviting(null); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={inv$.backdrop}>
        <View style={inv$.card}>
          <Text style={inv$.title}>INVITA KORE MEMBER</Text>
          <View style={inv$.searchBox}>
            <Text style={inv$.searchIcon}>🔍</Text>
            <TextInput
              testID="invite-search-input"
              style={inv$.searchInput}
              value={query}
              onChangeText={handleSearch}
              placeholder="Cerca per username..."
              placeholderTextColor="#444"
              autoCapitalize="none"
            />
            {searching && <ActivityIndicator color="#00F2FF" size="small" />}
          </View>

          <ScrollView style={inv$.results}>
            {results.map(u => (
              <View key={u.id} style={inv$.userRow}>
                <View style={[inv$.avatar, { backgroundColor: u.avatar_color }]}>
                  <Text style={inv$.avatarText}>{u.username?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={inv$.userInfo}>
                  <Text style={inv$.userName}>{u.username}</Text>
                  <Text style={inv$.userXP}>LVL {u.level} · {u.xp} XP</Text>
                </View>
                <TouchableOpacity
                  style={inv$.inviteBtn}
                  onPress={() => handleInvite(u.username)}
                  disabled={inviting === u.username}
                >
                  {inviting === u.username
                    ? <ActivityIndicator color="#050505" size="small" />
                    : <Text style={inv$.inviteBtnText}>INVITA</Text>}
                </TouchableOpacity>
              </View>
            ))}
            {query.length >= 2 && results.length === 0 && !searching && (
              <Text style={inv$.noResults}>Nessun utente trovato</Text>
            )}
          </ScrollView>

          <TouchableOpacity style={inv$.closeBtn} onPress={onClose}>
            <Text style={inv$.closeText}>CHIUDI</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const inv$ = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  card: {
    backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '70%',
  },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1A1A1A', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14, padding: 0 },
  results: { marginTop: 12 },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#050505', fontSize: 14, fontWeight: '800' },
  userInfo: { flex: 1, gap: 2 },
  userName: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  userXP: { color: '#555', fontSize: 11 },
  inviteBtn: {
    backgroundColor: '#00F2FF', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8,
  },
  inviteBtnText: { color: '#050505', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  noResults: { color: '#555', fontSize: 13, textAlign: 'center', padding: 20 },
  closeBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  closeText: { color: '#555', fontSize: 14 },
});

// ===========================
// CREW HUB (Detail View)
// ===========================
function CrewHub({ crew, onClose, token }: { crew: any; onClose: () => void; token: string }) {
  const [detail, setDetail] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const catCfg = crew.category ? CATEGORIES_MAP[crew.category] : null;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [d, f] = await Promise.all([
        api.getCrewDetail(crew.id, token),
        api.getCrewFeed(crew.id, token),
      ]);
      setDetail(d);
      setFeed(f);
    } catch (e) {
      // Production: error silenced
    }
    finally { setLoading(false); }
  };

  return (
    <Modal visible animationType="slide">
      <View style={hub$.container}>
        <StatusBar barStyle="light-content" />
        <View style={hub$.header}>
          <TouchableOpacity onPress={onClose} style={hub$.backBtn}>
            <Text style={hub$.backText}>← INDIETRO</Text>
          </TouchableOpacity>
          <View style={hub$.headerRight}>
            {crew.is_owner && (
              <TouchableOpacity onPress={() => setShowInvite(true)} style={hub$.inviteHdrBtn}>
                <Text style={hub$.inviteHdrText}>+ INVITA</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <LinearGradient
          colors={[catCfg?.color ? `${catCfg.color}15` : 'rgba(0,242,255,0.06)', '#050505']}
          style={hub$.heroGrad}
        >
          <View style={hub$.crewInfo}>
            {catCfg && (
              <View style={[hub$.catBadge, { backgroundColor: `${catCfg.color}20`, borderColor: `${catCfg.color}40` }]}>
                <Text style={hub$.catBadgeIcon}>{catCfg.icon}</Text>
                <Text style={[hub$.catBadgeText, { color: catCfg.color }]}>{crew.category?.toUpperCase()}</Text>
              </View>
            )}
            <Text style={hub$.crewName}>{crew.name}</Text>
            {crew.tagline ? <Text style={hub$.crewTagline}>{crew.tagline}</Text> : null}
            <View style={hub$.statsRow}>
              <View style={hub$.stat}>
                <Text style={hub$.statVal}>{crew.members_count}</Text>
                <Text style={hub$.statLabel}>MEMBRI</Text>
              </View>
              <View style={hub$.stat}>
                <Text style={[hub$.statVal, { color: '#D4AF37' }]}>{crew.xp_total}</Text>
                <Text style={hub$.statLabel}>XP TOTALI</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={hub$.center}><ActivityIndicator color="#00F2FF" size="large" /></View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* CREW DNA AVERAGE */}
            {detail?.crew_dna_average && (
              <>
                <Text style={hub$.sectionTitle}>DNA MEDIA CREW (WEIGHTED)</Text>
                <View style={hub$.dnaRow}>
                  {Object.entries(detail.crew_dna_average).map(([key, val]: [string, any]) => (
                    <View key={key} style={hub$.dnaItem}>
                      <Text style={hub$.dnaVal}>{Math.round(val)}</Text>
                      <Text style={hub$.dnaLabel}>{key.slice(0, 3).toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* MEMBERS */}
            <Text style={hub$.sectionTitle}>MEMBRI</Text>
            {detail?.members?.map((m: any, i: number) => (
              <Animated.View key={m.id} entering={FadeInDown.delay(i * 60)}>
                <View style={hub$.memberRow}>
                  {/* Avatar with Coach ring */}
                  <View style={m.is_coach ? hub$.coachAvatarWrap : undefined}>
                    <View style={[hub$.memberAvatar, { backgroundColor: m.avatar_color }, m.is_coach && hub$.coachAvatarBorder]}>
                      <Text style={hub$.memberAvatarText}>{m.username?.[0]?.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={hub$.memberInfo}>
                    <View style={hub$.memberNameRow}>
                      <Text style={hub$.memberName}>{m.username}</Text>
                      {m.is_coach && <CoachBadge />}
                    </View>
                    <Text style={hub$.memberSport}>{m.sport || '—'} · LVL {m.level}</Text>
                  </View>
                  <View style={hub$.memberXP}>
                    <Text style={hub$.memberXPVal}>{m.xp}</Text>
                    <Text style={hub$.memberXPLabel}>XP</Text>
                  </View>
                </View>
              </Animated.View>
            ))}

            {/* ACTIVITY FEED */}
            <Text style={hub$.sectionTitle}>ACTIVITY FEED</Text>
            {feed.length === 0 && (
              <Text style={hub$.emptyFeed}>Nessuna attività ancora. Inizia una sfida!</Text>
            )}
            {feed.map((e: any, i: number) => (
              <Animated.View key={e.id} entering={FadeInRight.delay(i * 50)}>
                <View style={hub$.feedItem}>
                  <View style={[hub$.feedDot, e.type === 'member_joined' && { backgroundColor: '#34C759' }]} />
                  <View style={hub$.feedContent}>
                    <Text style={hub$.feedMsg}>{e.message}</Text>
                    <Text style={hub$.feedTime}>
                      {e.created_at ? new Date(e.created_at).toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : ''}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            ))}
            <View style={{ height: 32 }} />
          </ScrollView>
        )}

        <InviteModal
          visible={showInvite}
          onClose={() => setShowInvite(false)}
          crewId={crew.id}
          token={token}
        />
      </View>
    </Modal>
  );
}

const hub$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  backBtn: { padding: 8 },
  backText: { color: '#00F2FF', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  headerRight: {},
  inviteHdrBtn: { backgroundColor: 'rgba(0,242,255,0.1)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(0,242,255,0.3)' },
  inviteHdrText: { color: '#00F2FF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroGrad: { paddingHorizontal: 20, paddingVertical: 20 },
  crewInfo: { gap: 6 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  catBadgeIcon: { fontSize: 14 },
  catBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  crewName: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  crewTagline: { color: '#888', fontSize: 14, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', gap: 24, marginTop: 10 },
  stat: { gap: 1 },
  statVal: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#555', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: '#888', fontSize: 10, fontWeight: '700', letterSpacing: 3, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },

  // DNA weighted average row
  dnaRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingBottom: 8 },
  dnaItem: { alignItems: 'center', gap: 2 },
  dnaVal: { color: '#00F2FF', fontSize: 18, fontWeight: '900' },
  dnaLabel: { color: '#555', fontSize: 8, fontWeight: '700', letterSpacing: 1 },

  // Member rows with Coach badge
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  coachAvatarWrap: { borderRadius: 22, padding: 2, borderWidth: 1.5, borderColor: '#D4AF37' },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  coachAvatarBorder: {},
  memberAvatarText: { color: '#050505', fontSize: 14, fontWeight: '800' },
  memberInfo: { flex: 1, gap: 3 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  memberSport: { color: '#555', fontSize: 11 },
  memberXP: { alignItems: 'center' },
  memberXPVal: { color: '#D4AF37', fontSize: 16, fontWeight: '900' },
  memberXPLabel: { color: '#555', fontSize: 8, fontWeight: '700', letterSpacing: 1 },

  emptyFeed: { color: '#444', fontSize: 13, textAlign: 'center', padding: 24 },
  feedItem: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 8 },
  feedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00F2FF', marginTop: 4 },
  feedContent: { flex: 1, gap: 2 },
  feedMsg: { color: '#CCCCCC', fontSize: 13 },
  feedTime: { color: '#444', fontSize: 10 },
});

// ===========================
// MAIN CREWS TAB
// ===========================
export default function CrewsTab() {
  const { user, token, activeRole } = useAuth();
  const [myCrews, setMyCrews] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState<any>(null);

  // Track dismissed invite IDs for slide-out animation
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const loadData = async () => {
    if (!token) return;
    try {
      const [crews, inv] = await Promise.all([
        api.getMyCrews(token),
        api.getPendingInvites(token),
      ]);
      setMyCrews(crews);
      setInvites(inv);
      setDismissedIds(new Set());
    } catch (e) {
      // Production: error silenced
    }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadData(); }, [token]);

  const handleAccept = useCallback(async (inviteId: string) => {
    // Slide-out animation: mark as dismissed first
    setDismissedIds(prev => new Set(prev).add(inviteId));
    playAcceptPing();

    // Small delay for animation, then API call
    setTimeout(async () => {
      try {
        await api.acceptInvite(inviteId, token!);
        setInvites(prev => prev.filter(i => i.id !== inviteId));
        loadData();
      } catch (e: any) {
        // Revert if failed
        setDismissedIds(prev => {
          const copy = new Set(prev);
          copy.delete(inviteId);
          return copy;
        });
        Alert.alert('Errore', e?.message || 'Impossibile accettare');
      }
    }, 350);
  }, [token]);

  const handleDecline = useCallback(async (inviteId: string) => {
    setDismissedIds(prev => new Set(prev).add(inviteId));
    playDecline();

    setTimeout(async () => {
      setInvites(prev => prev.filter(i => i.id !== inviteId));
      try {
        await api.declineInvite(inviteId, token!);
      } catch {}
    }, 350);
  }, [token]);

  return (
    <View style={s.container} testID="crews-tab">
      <StatusBar barStyle="light-content" />
      <Header title={activeRole === 'COACH' ? 'MY STUDIO' : 'LA TRIBÙ'} />

      {/* COACH MODE: Show Coach Studio */}
      {activeRole === 'COACH' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#D4AF37" />}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <CoachStudio token={token!} myCrews={myCrews} />
        </ScrollView>
      ) : loading ? (
        <View style={s.center}><ActivityIndicator color="#00F2FF" size="large" /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#00F2FF" />}
        >
          {/* PENDING INVITES */}
          {invites.length > 0 && (
            <>
              <Text style={s.sectionTitle}>📩  INVITI RICEVUTI</Text>
              {invites.map((inv, i) => {
                const cfg = inv.crew_category ? CATEGORIES_MAP[inv.crew_category] : null;
                const isDismissed = dismissedIds.has(inv.id);

                return (
                  <Animated.View
                    key={inv.id}
                    entering={FadeInDown.delay(i * 80)}
                    exiting={SlideOutLeft.duration(300).easing(Easing.bezierFn(0.25, 0.1, 0.25, 1))}
                    layout={Layout.springify().damping(15)}
                  >
                    {!isDismissed && (
                      <View style={s.inviteCard}>
                        <View style={s.inviteHeader}>
                          {cfg && <Text style={s.inviteIcon}>{cfg.icon}</Text>}
                          <View style={s.inviteInfo}>
                            <Text style={s.inviteCrew}>{inv.crew_name}</Text>
                            <Text style={s.inviteFrom}>da {inv.from_username}</Text>
                          </View>
                        </View>
                        <View style={s.inviteActions}>
                          <TouchableOpacity style={s.acceptBtn} onPress={() => handleAccept(inv.id)}>
                            <Text style={s.acceptText}>✓ ACCETTA</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={s.declineBtn} onPress={() => handleDecline(inv.id)}>
                            <Text style={s.declineText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </Animated.View>
                );
              })}
            </>
          )}

          {/* MY CREWS */}
          <Text style={s.sectionTitle}>🛡️  LE MIE CREW</Text>
          {myCrews.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>🏟️</Text>
              <Text style={s.emptyTitle}>Nessuna Crew</Text>
              <Text style={s.emptySub}>Fonda la tua tribù o accetta un invito</Text>
            </View>
          ) : (
            myCrews.map((crew, i) => {
              const cfg = crew.category ? CATEGORIES_MAP[crew.category] : null;
              const bgImage = CREW_PHOTOS[i % CREW_PHOTOS.length];
              return (
                <Animated.View key={crew.id} entering={FadeInDown.delay(i * 80)}>
                  <TouchableOpacity style={s.crewCard} onPress={() => setSelectedCrew(crew)} activeOpacity={0.85}>
                    <ImageBackground source={{ uri: bgImage }} style={s.crewCardBg} imageStyle={s.crewCardImage}>
                      <LinearGradient
                        colors={['rgba(5,5,5,0.1)', 'rgba(5,5,5,0.5)', 'rgba(5,5,5,0.95)']}
                        locations={[0, 0.35, 0.85]}
                        style={s.crewGrad}
                      >
                        <View style={s.crewHeader}>
                          {cfg && (
                            <View style={[s.crewCatBadge, { backgroundColor: `${cfg.color}20`, borderColor: `${cfg.color}40` }]}>
                              <Text style={{ fontSize: 20 }}>{cfg.icon}</Text>
                            </View>
                          )}
                          {crew.is_owner && (
                            <View style={s.ownerBadge}>
                              <Text style={s.ownerText}>{'\u2605'} FOUNDER</Text>
                            </View>
                          )}
                        </View>
                        <View style={s.crewBottom}>
                          <Text style={s.crewName}>{crew.name}</Text>
                          {crew.tagline ? <Text style={s.crewTagline}>{crew.tagline}</Text> : null}
                          <View style={s.crewStats}>
                            <Text style={s.crewStatText}>{'\ud83d\udc65'} {crew.members_count} MEMBRI</Text>
                            <Text style={[s.crewStatText, { color: '#D4AF37' }]}>{'\u26a1'} {crew.xp_total} XP</Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </ImageBackground>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB — Create Crew */}
      <TouchableOpacity testID="create-crew-fab" style={s.fab} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
        <Text style={s.fabText}>+ FONDA CREW</Text>
      </TouchableOpacity>

      <CreateCrewModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadData}
        token={token}
      />

      {selectedCrew && (
        <CrewHub crew={selectedCrew} onClose={() => { setSelectedCrew(null); loadData(); }} token={token!} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: {
    color: '#FFFFFF', fontSize: 12, fontWeight: '800',
    letterSpacing: 2, paddingHorizontal: 16,
    paddingTop: 20, paddingBottom: 10, textTransform: 'uppercase',
  },

  // Invites
  inviteCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  inviteIcon: { fontSize: 22 },
  inviteInfo: { flex: 1, gap: 1 },
  inviteCrew: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  inviteFrom: { color: '#888', fontSize: 12 },
  inviteActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    flex: 1, backgroundColor: 'rgba(212,175,55,0.15)',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.35)',
  },
  acceptText: { color: '#D4AF37', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  declineBtn: {
    width: 44, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  declineText: { color: '#555', fontSize: 16, fontWeight: '300' },

  // Empty state
  emptyState: { alignItems: 'center', padding: 40, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { color: '#555', fontSize: 16, fontWeight: '700' },
  emptySub: { color: '#444', fontSize: 13, textAlign: 'center' },

  // Crew cards — Immersive Nike-grade
  crewCard: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 18, overflow: 'hidden',
    height: 180, borderWidth: 1, borderColor: 'rgba(0,242,255,0.08)',
  },
  crewCardBg: { flex: 1 },
  crewCardImage: { borderRadius: 18 },
  crewGrad: { flex: 1, padding: 16, justifyContent: 'space-between' },
  crewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  crewCatBadge: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  crewBottom: { gap: 4 },
  crewName: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  crewTagline: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontStyle: 'italic' },
  ownerBadge: {
    backgroundColor: 'rgba(212,175,55,0.2)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1.5, borderColor: '#D4AF37',
  },
  ownerText: { color: '#D4AF37', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  crewStats: { flexDirection: 'row', gap: 16, marginTop: 4 },
  crewStatText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  // FAB
  fab: {
    position: 'absolute', bottom: 90, left: 16, right: 16,
    backgroundColor: '#D4AF37', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  fabText: { color: '#050505', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
});
