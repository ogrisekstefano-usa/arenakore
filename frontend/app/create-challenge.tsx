/**
 * CREA SFIDA — Template Engine v2 (Build 36)
 * ════════════════════════════════════════════════
 * Step 1: Select source (SYSTEM / BASE / COACH) + sport filter
 * Step 2: BIO-CHECK gate (countdown if scan expired/calibrating)
 * Step 3: Customize parameters
 * Step 4: Search opponent → Launch challenge
 * Step 5: Confirmation
 *
 * ALL TEMPLATES FROM /api/templates/v2/all (no more hardcoded presets)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, TextInput, Alert, ActivityIndicator, Dimensions,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { api, apiClient, request } from '../utils/api';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const CYAN = '#00E5FF';
const GOLD = '#FFD700';
const RED = '#FF3B30';
const PURPLE = '#BF5AF2';
const { width: SW } = Dimensions.get('window');

type Step = 'templates' | 'bio_check' | 'customize' | 'opponent' | 'sent';
type Source = 'system' | 'base' | 'coach';

const SOURCE_CONFIG: Record<Source, { label: string; color: string; icon: string }> = {
  system: { label: 'SYSTEM', color: CYAN, icon: 'shield-checkmark' },
  base: { label: 'BASE', color: GOLD, icon: 'flash' },
  coach: { label: 'COACH', color: PURPLE, icon: 'school' },
};

export default function CreateChallenge() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();

  const [step, setStep] = useState<Step>('templates');
  const [allTemplates, setAllTemplates] = useState<Record<Source, any[]>>({ system: [], base: [], coach: [] });
  const [activeSource, setActiveSource] = useState<Source>('system');
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [bioCheck, setBioCheck] = useState<any>(null);
  const [bioLoading, setBioLoading] = useState(false);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load ALL templates from API
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await request('/templates/v2/all', {}, token);
        if (data && !data._error) {
          setAllTemplates({
            system: data.system || [],
            base: data.base || [],
            coach: data.coach || [],
          });
        }
      } catch (e) {
        console.log('Template load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Get unique disciplines from current source
  const currentTemplates = allTemplates[activeSource] || [];
  const disciplines = [...new Set(currentTemplates.map(t => t.discipline).filter(Boolean))];

  const filteredTemplates = selectedSport
    ? currentTemplates.filter(t => t.discipline === selectedSport)
    : currentTemplates;

  // Select template → run Bio-Check if needed
  const selectTemplate = async (t: any) => {
    setSelectedTemplate(t);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (t.requires_nexus_bio) {
      setStep('bio_check');
      setBioLoading(true);
      setBioCheck(null);
      try {
        const check = await request(`/templates/v2/check-bio/${t.id}?source=${activeSource}`, {}, token);
        setBioCheck(check);
      } catch (e: any) {
        setBioCheck({ allowed: false, reason: e?.message || 'Errore di verifica biometrica', scan_status: 'error' });
      } finally {
        setBioLoading(false);
      }
    } else {
      // No bio needed → go to customize
      const defaults: Record<string, any> = {};
      setCustomFields({
        target_reps: t.target_reps || 10,
        target_time_seconds: t.target_time_seconds || 60,
        rounds: t.rounds || 1,
      });
      setStep('customize');
    }
  };

  // Proceed from bio_check to customize
  const proceedFromBioCheck = () => {
    setCustomFields({
      target_reps: selectedTemplate?.target_reps || 10,
      target_time_seconds: selectedTemplate?.target_time_seconds || 60,
      rounds: selectedTemplate?.rounds || 1,
    });
    setStep('customize');
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
        selectedTemplate.discipline?.toLowerCase() || 'power',
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
          {/* Source Tabs: SYSTEM / BASE / COACH */}
          <View style={cs.sourceRow}>
            {(['system', 'base', 'coach'] as Source[]).map(src => {
              const cfg = SOURCE_CONFIG[src];
              const active = activeSource === src;
              const count = allTemplates[src]?.length || 0;
              return (
                <TouchableOpacity
                  key={src}
                  style={[cs.sourceTab, active && { borderColor: cfg.color, backgroundColor: cfg.color + '10' }]}
                  onPress={() => { setActiveSource(src); setSelectedSport(null); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name={cfg.icon as any} size={14} color={active ? cfg.color : 'rgba(255,255,255,0.2)'} />
                  <Text style={[cs.sourceTabText, active && { color: cfg.color }]}>{cfg.label}</Text>
                  <View style={[cs.sourceBadge, { backgroundColor: active ? cfg.color + '25' : 'rgba(255,255,255,0.04)' }]}>
                    <Text style={[cs.sourceBadgeText, active && { color: cfg.color }]}>{count}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Discipline Filter */}
          {disciplines.length > 0 && (
            <>
              <Text style={cs.sectionLabel}>DISCIPLINA</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cs.sportRow}>
                <TouchableOpacity
                  style={[cs.sportChip, !selectedSport && cs.sportChipActive]}
                  onPress={() => setSelectedSport(null)}
                >
                  <Text style={[cs.sportChipText, !selectedSport && cs.sportChipTextActive]}>TUTTE</Text>
                </TouchableOpacity>
                {disciplines.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[cs.sportChip, selectedSport === d && cs.sportChipActive]}
                    onPress={() => setSelectedSport(d)}
                  >
                    <Text style={[cs.sportChipText, selectedSport === d && cs.sportChipTextActive]}>{d.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Templates */}
          <Text style={cs.sectionLabel}>
            {activeSource === 'system' ? 'SFIDE CERTIFICATE ARENAKORE' :
             activeSource === 'base' ? 'SFIDE RAPIDE 1v1' :
             'TEMPLATE COACH PRO'}
          </Text>

          {loading ? <ActivityIndicator color={CYAN} style={{ marginTop: 20 }} /> :
            filteredTemplates.length === 0 ? (
              <View style={cs.emptyState}>
                <Ionicons name="file-tray-outline" size={32} color="rgba(255,255,255,0.08)" />
                <Text style={cs.emptyText}>Nessun template disponibile</Text>
              </View>
            ) :
            filteredTemplates.map((t, idx) => (
              <Animated.View key={t.id || t.code || idx} entering={FadeInDown.delay(idx * 50).duration(250)}>
                <TouchableOpacity style={cs.templateCard} activeOpacity={0.85} onPress={() => selectTemplate(t)}>
                  <View style={[cs.templateIcon, { backgroundColor: (t.color || CYAN) + '15', borderColor: (t.color || CYAN) + '25' }]}>
                    <Ionicons name={(t.icon || 'flash') as any} size={22} color={t.color || CYAN} />
                  </View>
                  <View style={cs.templateText}>
                    <Text style={cs.templateName}>{t.name}</Text>
                    <Text style={cs.templateDesc} numberOfLines={2}>{t.description}</Text>
                    <View style={cs.templateMeta}>
                      <Text style={[cs.templateSport, { color: t.color || CYAN }]}>{t.discipline?.toUpperCase()}</Text>
                      <Text style={cs.templateXP}>+{t.xp_reward} FLUX</Text>
                      {t.requires_nexus_bio && (
                        <View style={cs.bioBadge}>
                          <Ionicons name="body" size={8} color={RED} />
                          <Text style={cs.bioBadgeText}>BIO</Text>
                        </View>
                      )}
                      {t.difficulty && <Text style={cs.diffBadge}>{t.difficulty.toUpperCase()}</Text>}
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

  // ═══ STEP: BIO-CHECK GATE ═══
  if (step === 'bio_check') {
    const allowed = bioCheck?.allowed;
    const scanStatus = bioCheck?.scan_status;
    const countdown = bioCheck?.countdown;

    return (
      <View style={cs.container}>
        <StatusBar barStyle="light-content" />
        <View style={[cs.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => setStep('templates')} style={cs.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={cs.topTitle}>NEXUS BIO-CHECK</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={cs.bioCenter}>
          {bioLoading ? (
            <>
              <ActivityIndicator size="large" color={CYAN} />
              <Text style={cs.bioLoadText}>Verifica biometrica in corso...</Text>
            </>
          ) : allowed ? (
            <Animated.View entering={FadeIn.duration(500)} style={cs.bioResultCard}>
              <View style={cs.bioIconWrap}>
                <Ionicons name="shield-checkmark" size={48} color="#32D74B" />
              </View>
              <Text style={cs.bioResultTitle}>BIO-SCAN VALIDA</Text>
              <Text style={cs.bioResultReason}>{bioCheck?.reason}</Text>
              {countdown?.days != null && (
                <View style={cs.bioCountdownBadge}>
                  <Ionicons name="time" size={14} color={CYAN} />
                  <Text style={cs.bioCountdownText}>Scade tra {countdown.days} giorni</Text>
                </View>
              )}
              <Text style={cs.bioTemplateName}>{selectedTemplate?.name}</Text>
              <TouchableOpacity style={cs.bioProceedBtn} onPress={proceedFromBioCheck} activeOpacity={0.85}>
                <Text style={cs.bioProceedText}>PROCEDI ALLA SFIDA</Text>
                <Ionicons name="arrow-forward" size={16} color="#000" />
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(500)} style={cs.bioResultCard}>
              <View style={[cs.bioIconWrap, { backgroundColor: 'rgba(255,59,48,0.1)' }]}>
                <Ionicons name="lock-closed" size={48} color={RED} />
              </View>
              <Text style={[cs.bioResultTitle, { color: RED }]}>
                {scanStatus === 'no_scan' ? 'NESSUNA BIO-SCAN' :
                 scanStatus === 'calibrating' ? 'CALIBRAZIONE IN CORSO' :
                 scanStatus === 'expired' ? 'BIO-SCAN SCADUTA' :
                 'ACCESSO BLOCCATO'}
              </Text>
              <Text style={cs.bioResultReason}>{bioCheck?.reason}</Text>

              {/* COUNTDOWN DISPLAY */}
              {countdown?.hours != null && countdown.hours > 0 && (
                <View style={cs.countdownBox}>
                  <Text style={cs.countdownLabel}>RICALIBRAZIONE TRA</Text>
                  <Text style={cs.countdownValue}>
                    {Math.floor(countdown.hours)}h {Math.floor((countdown.hours % 1) * 60).toString().padStart(2, '0')}m
                  </Text>
                  <View style={cs.countdownBarBg}>
                    <View style={[cs.countdownBarFill, { width: `${Math.max(2, ((48 - countdown.hours) / 48) * 100)}%` }]} />
                  </View>
                </View>
              )}
              {countdown?.days === 0 && scanStatus === 'expired' && (
                <View style={cs.countdownBox}>
                  <Text style={cs.countdownLabel}>SCAN SCADUTA</Text>
                  <Text style={cs.countdownValue}>EVOLUZIONE RICHIESTA</Text>
                </View>
              )}

              <Text style={cs.bioTemplateName}>{selectedTemplate?.name}</Text>

              {scanStatus === 'no_scan' && (
                <TouchableOpacity style={[cs.bioProceedBtn, { backgroundColor: CYAN }]}
                  onPress={() => { router.replace('/(tabs)/nexus-trigger'); }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="scan" size={16} color="#000" />
                  <Text style={cs.bioProceedText}>VAI AL NEXUS SCANNER</Text>
                </TouchableOpacity>
              )}
              {scanStatus === 'expired' && (
                <TouchableOpacity style={[cs.bioProceedBtn, { backgroundColor: CYAN }]}
                  onPress={() => { router.replace('/(tabs)/nexus-trigger'); }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="refresh" size={16} color="#000" />
                  <Text style={cs.bioProceedText}>ESEGUI EVOLUZIONE</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={cs.bioBackBtn} onPress={() => setStep('templates')} activeOpacity={0.85}>
                <Text style={cs.bioBackText}>SCEGLI UN ALTRO TEMPLATE</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
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
            <Text style={[cs.customName, { color: selectedTemplate?.color || CYAN }]}>{selectedTemplate?.name}</Text>
            <Text style={cs.customSport}>{selectedTemplate?.discipline?.toUpperCase()}</Text>
            {selectedTemplate?.requires_nexus_bio && (
              <View style={[cs.bioBadge, { marginTop: 4 }]}>
                <Ionicons name="body" size={9} color={RED} />
                <Text style={cs.bioBadgeText}>BIO-SYNC ATTIVA</Text>
              </View>
            )}
          </View>

          {/* Reps */}
          <View style={cs.fieldCard}>
            <Text style={cs.fieldLabel}>RIPETIZIONI TARGET</Text>
            <View style={cs.numberRow}>
              <TouchableOpacity style={cs.numBtn}
                onPress={() => setCustomFields(p => ({ ...p, target_reps: Math.max(1, (p.target_reps || 1) - 1) }))}>
                <Ionicons name="remove" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={cs.numValue}>{customFields.target_reps || 10}</Text>
              <TouchableOpacity style={cs.numBtn}
                onPress={() => setCustomFields(p => ({ ...p, target_reps: Math.min(200, (p.target_reps || 10) + 1) }))}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Time */}
          <View style={cs.fieldCard}>
            <Text style={cs.fieldLabel}>TEMPO LIMITE (SECONDI)</Text>
            <View style={cs.numberRow}>
              <TouchableOpacity style={cs.numBtn}
                onPress={() => setCustomFields(p => ({ ...p, target_time_seconds: Math.max(10, (p.target_time_seconds || 60) - 10) }))}>
                <Ionicons name="remove" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={cs.numValue}>{customFields.target_time_seconds || 60}s</Text>
              <TouchableOpacity style={cs.numBtn}
                onPress={() => setCustomFields(p => ({ ...p, target_time_seconds: Math.min(600, (p.target_time_seconds || 60) + 10) }))}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Rounds */}
          <View style={cs.fieldCard}>
            <Text style={cs.fieldLabel}>ROUNDS</Text>
            <View style={cs.numberRow}>
              <TouchableOpacity style={cs.numBtn}
                onPress={() => setCustomFields(p => ({ ...p, rounds: Math.max(1, (p.rounds || 1) - 1) }))}>
                <Ionicons name="remove" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={cs.numValue}>{customFields.rounds || 1}</Text>
              <TouchableOpacity style={cs.numBtn}
                onPress={() => setCustomFields(p => ({ ...p, rounds: Math.min(10, (p.rounds || 1) + 1) }))}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* KPI Metrics Preview */}
          {selectedTemplate?.kpi_metrics?.length > 0 && (
            <View style={cs.kpiSection}>
              <Text style={cs.fieldLabel}>KPI MISURATI</Text>
              <View style={cs.kpiRow}>
                {selectedTemplate.kpi_metrics.map((kpi: string, i: number) => (
                  <View key={kpi} style={cs.kpiChip}>
                    <Ionicons name="analytics" size={10} color={CYAN} />
                    <Text style={cs.kpiText}>{kpi.replace(/_/g, ' ').toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

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
          {/* Challenge summary */}
          <View style={cs.challengeSummary}>
            <View style={[cs.summaryDot, { backgroundColor: selectedTemplate?.color || CYAN }]} />
            <Text style={cs.summaryName}>{selectedTemplate?.name}</Text>
            <Text style={cs.summaryMeta}>
              {customFields.target_reps} reps · {customFields.target_time_seconds}s · {customFields.rounds}R · +{selectedTemplate?.xp_reward} FLUX
            </Text>
          </View>

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
                <View style={[cs.userAvatar, { backgroundColor: u.avatar_color ? u.avatar_color + '20' : 'rgba(0,229,255,0.1)' }]}>
                  <Text style={[cs.userInitial, { color: u.avatar_color || CYAN }]}>{(u.username || 'K')[0].toUpperCase()}</Text>
                </View>
                <View style={cs.userText}>
                  <Text style={cs.userName}>{(u.username || '').toUpperCase()}</Text>
                  <Text style={cs.userCity}>LVL {u.level || 1} · {u.preferred_sport || u.sport || 'MULTI'}</Text>
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
          <Text style={cs.sentTemplate}>{selectedTemplate?.name} · {selectedTemplate?.discipline}</Text>
          <TouchableOpacity style={cs.sentDone} activeOpacity={0.85} onPress={() => router.back()}>
            <Text style={cs.sentDoneText}>TORNA ALL'ARENA</Text>
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
  sectionLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 10, marginTop: 16 },
  // Source tabs
  sourceRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  sourceTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' },
  sourceTabText: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  sourceBadge: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  sourceBadgeText: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '900' },
  // Sport chips
  sportRow: { marginBottom: 8 },
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
  templateMeta: { flexDirection: 'row', gap: 8, marginTop: 3, alignItems: 'center' },
  templateSport: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  templateXP: { color: GOLD, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  bioBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,59,48,0.08)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)' },
  bioBadgeText: { color: RED, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  diffBadge: { color: 'rgba(255,255,255,0.15)', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyText: { color: 'rgba(255,255,255,0.15)', fontSize: 13, fontWeight: '600' },
  // Bio check
  bioCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  bioLoadText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '600', marginTop: 14 },
  bioResultCard: { alignItems: 'center', gap: 14, width: '100%' },
  bioIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(50,215,75,0.1)', alignItems: 'center', justifyContent: 'center' },
  bioResultTitle: { color: '#32D74B', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  bioResultReason: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  bioCountdownBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,229,255,0.06)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)' },
  bioCountdownText: { color: CYAN, fontSize: 13, fontWeight: '700' },
  bioTemplateName: { color: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  bioProceedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, width: '100%' },
  bioProceedText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  bioBackBtn: { paddingVertical: 10 },
  bioBackText: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  // Countdown box
  countdownBox: { alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,59,48,0.04)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,59,48,0.15)', paddingVertical: 20, paddingHorizontal: 24, width: '100%' },
  countdownLabel: { color: RED, fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  countdownValue: { color: RED, fontSize: 32, fontWeight: '900', letterSpacing: 1 },
  countdownBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, width: '100%', overflow: 'hidden' },
  countdownBarFill: { height: 4, borderRadius: 2, backgroundColor: RED },
  // Customize
  customHeader: { alignItems: 'center', gap: 4, marginBottom: 20, paddingTop: 8 },
  customName: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  customSport: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  fieldCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  fieldLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 },
  numberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  numBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  numValue: { color: CYAN, fontSize: 32, fontWeight: '900', minWidth: 80, textAlign: 'center' },
  kpiSection: { marginTop: 8, gap: 8 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kpiChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,229,255,0.06)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(0,229,255,0.12)' },
  kpiText: { color: CYAN, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: CYAN, borderRadius: 14, paddingVertical: 14, marginTop: 12 },
  nextBtnText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
  // Opponent
  challengeSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryName: { color: '#fff', fontSize: 13, fontWeight: '900', flex: 1 },
  summaryMeta: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600', paddingVertical: 10 },
  searchGoBtn: { backgroundColor: CYAN, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  searchGoText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, marginBottom: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.04)' },
  userCardSelected: { borderColor: CYAN, backgroundColor: 'rgba(0,229,255,0.05)' },
  userAvatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  userInitial: { fontSize: 16, fontWeight: '900' },
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
