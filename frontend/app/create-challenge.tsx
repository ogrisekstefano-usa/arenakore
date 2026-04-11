/**
 * CREA SFIDA — Coach Template Engine (Build 35)
 * ════════════════════════════════════════════════
 * Step 1: Select sport & template
 * Step 2: Customize parameters
 * Step 3: Search opponent → Launch challenge
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, TextInput, Alert, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { api, apiClient } from '../utils/api';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const CYAN = '#00E5FF';
const GOLD = '#FFD700';
const RED = '#FF3B30';
const { width: SW } = Dimensions.get('window');

type Step = 'templates' | 'customize' | 'opponent' | 'confirm' | 'sent';

export default function CreateChallenge() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();

  const [step, setStep] = useState<Step>('templates');
  const [templates, setTemplates] = useState<any[]>([]);
  const [sports, setSports] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load templates — static presets always available, server extends them
  const FALLBACK_PRESETS = [
    { id: 'basket_tiri_liberi', sport: 'BASKET', name: 'Tiri Liberi', icon: 'basketball', color: '#FF6B00', description: 'Sessione di tiri liberi cronometrata', fields: [{ key: 'tiri_totali', label: 'Tiri Totali', type: 'number', default: 20, min: 5, max: 100 }, { key: 'tempo_limite', label: 'Tempo Limite (sec)', type: 'number', default: 120, min: 30, max: 600 }], scoring: 'percentuale_canestri', xp_reward: 150, discipline: 'power' },
    { id: 'basket_3_punti', sport: 'BASKET', name: 'Tiro da 3 Punti', icon: 'basketball', color: '#FF6B00', description: 'Challenge da oltre l\'arco dei 3 punti', fields: [{ key: 'tiri_totali', label: 'Tiri da 3', type: 'number', default: 15, min: 5, max: 50 }, { key: 'tempo_limite', label: 'Tempo Limite (sec)', type: 'number', default: 180, min: 60, max: 600 }], scoring: 'percentuale_canestri', xp_reward: 200, discipline: 'agility' },
    { id: 'golf_putting', sport: 'GOLF', name: 'Putting Challenge', icon: 'golf', color: '#2ECC71', description: 'Sfida di precisione sul green', fields: [{ key: 'buche', label: 'Numero Buche', type: 'number', default: 9, min: 3, max: 18 }, { key: 'distanza_mt', label: 'Distanza Media (mt)', type: 'number', default: 3, min: 1, max: 15 }], scoring: 'colpi_totali', xp_reward: 180, discipline: 'agility' },
    { id: 'golf_driving', sport: 'GOLF', name: 'Driving Range', icon: 'golf', color: '#2ECC71', description: 'Massima distanza dal tee', fields: [{ key: 'tiri', label: 'Numero Tiri', type: 'number', default: 10, min: 5, max: 30 }], scoring: 'distanza_media', xp_reward: 170, discipline: 'power' },
    { id: 'fitness_ripetizioni', sport: 'FITNESS', name: 'Max Ripetizioni', icon: 'barbell', color: '#00E5FF', description: 'Massime ripetizioni in tempo limite', fields: [{ key: 'esercizio', label: 'Esercizio', type: 'select', options: ['Push-up', 'Squat', 'Burpee', 'Pull-up', 'Plank Hold'], default: 'Push-up' }, { key: 'tempo_limite', label: 'Tempo Limite (sec)', type: 'number', default: 60, min: 30, max: 300 }], scoring: 'ripetizioni_totali', xp_reward: 160, discipline: 'endurance' },
    { id: 'fitness_circuito', sport: 'FITNESS', name: 'Circuito HIIT', icon: 'fitness', color: '#00E5FF', description: 'Circuito ad alta intensit\u00e0 multi-esercizio', fields: [{ key: 'rounds', label: 'Rounds', type: 'number', default: 3, min: 1, max: 10 }, { key: 'tempo_round', label: 'Tempo per Round (sec)', type: 'number', default: 45, min: 20, max: 120 }], scoring: 'rounds_completati', xp_reward: 200, discipline: 'endurance' },
    { id: 'running_sprint', sport: 'RUNNING', name: 'Sprint Challenge', icon: 'walk', color: '#FFD700', description: 'Corsa sprint a tempo', fields: [{ key: 'distanza_mt', label: 'Distanza (mt)', type: 'number', default: 100, min: 50, max: 1000 }, { key: 'ripetizioni', label: 'Ripetizioni', type: 'number', default: 3, min: 1, max: 10 }], scoring: 'tempo_migliore', xp_reward: 180, discipline: 'agility' },
    { id: 'running_endurance', sport: 'RUNNING', name: 'Endurance Run', icon: 'walk', color: '#FFD700', description: 'Corsa di resistenza a ritmo costante', fields: [{ key: 'tempo_minuti', label: 'Durata (min)', type: 'number', default: 20, min: 5, max: 120 }], scoring: 'distanza_coperta', xp_reward: 200, discipline: 'endurance' },
  ];

  // Immediately set templates from presets (no waiting for network)
  useEffect(() => {
    setTemplates(FALLBACK_PRESETS);
    setSports([...new Set(FALLBACK_PRESETS.map(t => t.sport))]);
    setLoading(false);
  }, []);

  // Select template
  const selectTemplate = (t: any) => {
    setSelectedTemplate(t);
    const defaults: Record<string, any> = {};
    (t.fields || []).forEach((f: any) => { defaults[f.key] = f.default; });
    setCustomFields(defaults);
    setStep('customize');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  // Search opponents
  const searchOpponents = async () => {
    if (!token || searchQuery.length < 2) return;
    setSearching(true);
    try {
      const res = await api.searchUsers(searchQuery, token);
      const users = Array.isArray(res) ? res : (res?.users || []);
      setSearchResults(users.filter((u: any) => u.id !== (user?._id || user?.id)));
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  // Send challenge
  const launchChallenge = async () => {
    if (!token || !selectedTemplate || !selectedOpponent) return;
    setSending(true);
    try {
      await api.sendPvPChallenge(
        selectedOpponent.id,
        selectedTemplate.discipline || 'power',
        selectedTemplate.xp_reward || 100,
        token
      );
      setStep('sent');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      Alert.alert('ERRORE', e?.message || 'Invio sfida fallito');
    } finally {
      setSending(false);
    }
  };

  const filteredTemplates = selectedSport
    ? templates.filter(t => t.sport === selectedSport)
    : templates;

  const SPORT_ICONS: Record<string, string> = {
    BASKET: 'basketball', GOLF: 'golf', FITNESS: 'barbell',
    RUNNING: 'walk', SOCCER: 'football', TENNIS: 'tennisball',
  };

  // ═══ STEP: TEMPLATES ═══
  if (step === 'templates') {
    return (
      <View style={cs.container}>
        <StatusBar barStyle="light-content" />
        <View style={[cs.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={cs.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={cs.topTitle}>CREA SFIDA</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={cs.scroll} contentContainerStyle={[cs.content, { paddingBottom: insets.bottom + 32 }]}>
          {/* Sport Filter */}
          <Text style={cs.sectionLabel}>SPORT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cs.sportRow}>
            <TouchableOpacity
              style={[cs.sportChip, !selectedSport && cs.sportChipActive]}
              onPress={() => setSelectedSport(null)}
            >
              <Text style={[cs.sportChipText, !selectedSport && cs.sportChipTextActive]}>TUTTI</Text>
            </TouchableOpacity>
            {sports.map(sp => (
              <TouchableOpacity
                key={sp}
                style={[cs.sportChip, selectedSport === sp && cs.sportChipActive]}
                onPress={() => setSelectedSport(sp)}
              >
                <Ionicons name={(SPORT_ICONS[sp] || 'trophy') as any} size={14} color={selectedSport === sp ? '#000' : 'rgba(255,255,255,0.3)'} />
                <Text style={[cs.sportChipText, selectedSport === sp && cs.sportChipTextActive]}>{sp}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Templates */}
          <Text style={cs.sectionLabel}>TEMPLATE COACH</Text>
          {loading ? <ActivityIndicator color={CYAN} style={{ marginTop: 20 }} /> :
            filteredTemplates.map((t, idx) => (
              <Animated.View key={t.id} entering={FadeInDown.delay(idx * 60).duration(300)}>
                <TouchableOpacity style={cs.templateCard} activeOpacity={0.85} onPress={() => selectTemplate(t)}>
                  <View style={[cs.templateIcon, { backgroundColor: t.color + '15', borderColor: t.color + '25' }]}>
                    <Ionicons name={(SPORT_ICONS[t.sport] || 'trophy') as any} size={22} color={t.color} />
                  </View>
                  <View style={cs.templateText}>
                    <Text style={cs.templateName}>{t.name}</Text>
                    <Text style={cs.templateDesc}>{t.description}</Text>
                    <View style={cs.templateMeta}>
                      <Text style={[cs.templateSport, { color: t.color }]}>{t.sport}</Text>
                      <Text style={cs.templateXP}>{t.xp_reward} XP</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.15)" />
                </TouchableOpacity>
              </Animated.View>
            ))
          }
        </ScrollView>
      </View>
    );
  }

  // ═══ STEP: CUSTOMIZE ═══
  if (step === 'customize') {
    return (
      <KeyboardAvoidingView style={cs.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <StatusBar barStyle="light-content" />
        <View style={[cs.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => setStep('templates')} style={cs.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={cs.topTitle}>PERSONALIZZA</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={cs.scroll} contentContainerStyle={[cs.content, { paddingBottom: insets.bottom + 32 }]}>
          <View style={cs.customHeader}>
            <Text style={[cs.customName, { color: selectedTemplate?.color }]}>{selectedTemplate?.name}</Text>
            <Text style={cs.customSport}>{selectedTemplate?.sport}</Text>
          </View>

          {(selectedTemplate?.fields || []).map((field: any, idx: number) => (
            <Animated.View key={field.key} entering={FadeInDown.delay(idx * 80).duration(300)} style={cs.fieldCard}>
              <Text style={cs.fieldLabel}>{field.label}</Text>
              {field.type === 'select' ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cs.selectRow}>
                  {(field.options || []).map((opt: string) => (
                    <TouchableOpacity
                      key={opt}
                      style={[cs.selectChip, customFields[field.key] === opt && cs.selectChipActive]}
                      onPress={() => setCustomFields(p => ({ ...p, [field.key]: opt }))}
                    >
                      <Text style={[cs.selectChipText, customFields[field.key] === opt && cs.selectChipTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={cs.numberRow}>
                  <TouchableOpacity
                    style={cs.numBtn}
                    onPress={() => setCustomFields(p => ({ ...p, [field.key]: Math.max(field.min || 0, (p[field.key] || 0) - 1) }))}
                  >
                    <Ionicons name="remove" size={20} color="#fff" />
                  </TouchableOpacity>
                  <Text style={cs.numValue}>{customFields[field.key] || 0}</Text>
                  <TouchableOpacity
                    style={cs.numBtn}
                    onPress={() => setCustomFields(p => ({ ...p, [field.key]: Math.min(field.max || 999, (p[field.key] || 0) + 1) }))}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          ))}

          <TouchableOpacity style={cs.nextBtn} activeOpacity={0.85} onPress={() => setStep('opponent')}>
            <Text style={cs.nextBtnText}>SCEGLI AVVERSARIO</Text>
            <Ionicons name="arrow-forward" size={18} color="#000" />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ═══ STEP: OPPONENT ═══
  if (step === 'opponent') {
    return (
      <KeyboardAvoidingView style={cs.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <StatusBar barStyle="light-content" />
        <View style={[cs.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => setStep('customize')} style={cs.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={cs.topTitle}>LANCIA SFIDA</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={cs.scroll} contentContainerStyle={[cs.content, { paddingBottom: insets.bottom + 32 }]}>
          <View style={cs.searchBar}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.3)" />
            <TextInput
              style={cs.searchInput}
              placeholder="Cerca per username..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchOpponents}
              returnKeyType="search"
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={searchOpponents} style={cs.searchGoBtn}>
              <Text style={cs.searchGoText}>CERCA</Text>
            </TouchableOpacity>
          </View>

          {searching && <ActivityIndicator color={CYAN} style={{ marginTop: 20 }} />}

          {searchResults.map((u, idx) => (
            <Animated.View key={u.id} entering={FadeInDown.delay(idx * 60).duration(300)}>
              <TouchableOpacity
                style={[cs.userCard, selectedOpponent?.id === u.id && cs.userCardSelected]}
                activeOpacity={0.85}
                onPress={() => setSelectedOpponent(u)}
              >
                <View style={cs.userAvatar}>
                  <Text style={cs.userInitial}>{(u.username || 'K')[0].toUpperCase()}</Text>
                </View>
                <View style={cs.userText}>
                  <Text style={cs.userName}>{(u.username || '').toUpperCase()}</Text>
                  <Text style={cs.userCity}>{u.city || 'KORE ATHLETE'}</Text>
                </View>
                {selectedOpponent?.id === u.id && <Ionicons name="checkmark-circle" size={22} color={CYAN} />}
              </TouchableOpacity>
            </Animated.View>
          ))}

          {selectedOpponent && (
            <Animated.View entering={FadeIn.duration(300)}>
              <TouchableOpacity style={cs.launchBtn} activeOpacity={0.85} onPress={launchChallenge} disabled={sending}>
                <LinearGradient colors={[GOLD, '#D4AF37']} start={{x:0,y:0}} end={{x:1,y:1}} style={cs.launchGrad}>
                  <Ionicons name="flash" size={20} color="#000" />
                  <Text style={cs.launchText}>{sending ? 'INVIO...' : 'LANCIA SFIDA'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ═══ STEP: SENT ═══
  return (
    <View style={cs.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#000', '#1A1A00', '#000']} style={cs.sentGrad}>
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={cs.sentCenter}>
          <Ionicons name="flash" size={56} color={GOLD} />
          <Text style={cs.sentTitle}>SFIDA LANCIATA!</Text>
          <Text style={cs.sentSub}>
            {selectedOpponent?.username?.toUpperCase()} riceverà la notifica.
          </Text>
          <Text style={cs.sentTemplate}>{selectedTemplate?.name} · {selectedTemplate?.sport}</Text>

          <TouchableOpacity style={cs.sentDone} activeOpacity={0.85} onPress={() => router.back()}>
            <Text style={cs.sentDoneText}>TORNA AL NÈXUS</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const cs = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  sectionLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 10, marginTop: 8 },
  // Sport chips
  sportRow: { marginBottom: 16 },
  sportChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginRight: 8, backgroundColor: 'rgba(255,255,255,0.02)' },
  sportChipActive: { backgroundColor: GOLD, borderColor: GOLD },
  sportChipText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  sportChipTextActive: { color: '#000' },
  // Template card
  templateCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  templateIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  templateText: { flex: 1, gap: 3 },
  templateName: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  templateDesc: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '600' },
  templateMeta: { flexDirection: 'row', gap: 8, marginTop: 2 },
  templateSport: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  templateXP: { color: GOLD, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  // Customize
  customHeader: { alignItems: 'center', gap: 4, marginBottom: 20, paddingTop: 8 },
  customName: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  customSport: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  fieldCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  fieldLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 },
  selectRow: { flexDirection: 'row' },
  selectChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginRight: 8, backgroundColor: 'rgba(255,255,255,0.02)' },
  selectChipActive: { backgroundColor: CYAN, borderColor: CYAN },
  selectChipText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800' },
  selectChipTextActive: { color: '#000' },
  numberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  numBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  numValue: { color: CYAN, fontSize: 32, fontWeight: '900', minWidth: 60, textAlign: 'center' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: CYAN, borderRadius: 14, paddingVertical: 14, marginTop: 12 },
  nextBtnText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
  // Opponent
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600', paddingVertical: 10 },
  searchGoBtn: { backgroundColor: CYAN, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  searchGoText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, marginBottom: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.04)' },
  userCardSelected: { borderColor: CYAN, backgroundColor: 'rgba(0,229,255,0.05)' },
  userAvatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(0,229,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  userInitial: { color: CYAN, fontSize: 16, fontWeight: '900' },
  userText: { flex: 1, gap: 2 },
  userName: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  userCity: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '700' },
  launchBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 16 },
  launchGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  launchText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  // Sent
  sentGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sentCenter: { alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  sentTitle: { color: GOLD, fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  sentSub: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  sentTemplate: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  sentDone: { backgroundColor: CYAN, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginTop: 20 },
  sentDoneText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
});
