/**
 * ARENAKORE — Cinema Results v3.0 (VictoryCard SnapshotEngine)
 * Session completion modal with view-shot share capability.
 * SHARE generates a "VictoryCard" image with mood-based background.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions,
  Share, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot, { captureRef } from 'react-native-view-shot';
import Animated, {
  useSharedValue, withSpring, withTiming, useAnimatedStyle,
  withSequence, withDelay, withRepeat, Easing, FadeInDown,
} from 'react-native-reanimated';

const { width: SW, height: SH } = Dimensions.get('window');

// Mood engine for background color
function getMood(qualityScore: number) {
  if (qualityScore >= 85) return { bg: '#1A0000', accent: '#FF3B30', label: 'POWER', icon: 'flame' as const };
  if (qualityScore >= 65) return { bg: '#001A0A', accent: '#00FF87', label: 'FLOW', icon: 'leaf' as const };
  if (qualityScore >= 40) return { bg: '#00101A', accent: '#00E5FF', label: 'PULSE', icon: 'pulse' as const };
  return { bg: '#0A0A0A', accent: '#888', label: 'WARM UP', icon: 'fitness' as const };
}

export function CinemaResults({ visible, result, user, onClose }: { visible: boolean; result: any; user: any; onClose: () => void }) {
  const slideY = useSharedValue(300);
  const fadeIn = useSharedValue(0);
  const [displayXP, setDisplayXP] = useState(0);
  const founderShimmer = useSharedValue(-1);
  const [sharing, setSharing] = useState(false);
  const victoryRef = useRef<any>(null);

  const mood = useMemo(() => getMood(result?.quality_score || 0), [result?.quality_score]);

  useEffect(() => {
    if (visible && result) {
      slideY.value = withSpring(0, { damping: 15, stiffness: 100 });
      fadeIn.value = withTiming(1, { duration: 400 });
      const target = result.xp_earned || 0;
      let cur = 0; const step = Math.max(1, Math.ceil(target / 30));
      const iv = setInterval(() => { cur += step; if (cur >= target) { cur = target; clearInterval(iv); } setDisplayXP(cur); }, 40);
      founderShimmer.value = withRepeat(withSequence(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), withDelay(900, withTiming(-1, { duration: 0 }))), -1, false);
      return () => clearInterval(iv);
    }
  }, [visible, result]);

  const cs = useAnimatedStyle(() => ({ transform: [{ translateY: slideY.value }], opacity: fadeIn.value }));
  const ss = useAnimatedStyle(() => ({ opacity: 0.35 + Math.max(0, 1 - Math.abs(founderShimmer.value)) * 0.65 }));

  const handleShare = useCallback(async () => {
    if (!victoryRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(victoryRef, { format: 'png', quality: 1 });
      if (Platform.OS === 'web') {
        const w = window.open();
        if (w) w.document.write(`<img src="${uri}" style="max-width:100%"/>`);
      } else {
        await Share.share({
          url: uri,
          message: 'Sfidami su ARENA KORE! https://arenakore.app',
          title: 'ARENAKORE — Risultato Sessione',
        });
      }
    } catch (e) {
      Alert.alert('Errore', 'Impossibile condividere');
    } finally {
      setSharing(false);
    }
  }, []);

  if (!visible || !result) return null;
  const isFounder = user?.is_founder || user?.is_admin;
  const isUGC = !!result.ugc_mode;
  const isMaster = result.is_master_template === true;
  const validationMode = result.validation_mode || (isMaster ? 'STRICT' : 'PERMISSIVE');
  const creatorRole = result.creator_role || 'ATHLETE';

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={cin$.backdrop}>
        <Animated.View style={[cin$.card, cs]}>
          <ScrollView contentContainerStyle={cin$.scroll} showsVerticalScrollIndicator={false}>
            <View style={cin$.titleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flash" size={18} color="#00E5FF" />
                <Text style={cin$.title}>{isUGC ? 'SFIDA COMPLETATA' : 'SESSIONE COMPLETATA'}</Text>
              </View>
              {isFounder && <Animated.View style={[cin$.founderBadge, ss]}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="star" size={10} color="#FFD700" /><Text style={cin$.founderText}>FOUNDER</Text></View></Animated.View>}
            </View>

            {/* UGC: Challenge title + Creator Role Badge */}
            {isUGC && (
              <Animated.View entering={FadeInDown.duration(300)} style={cin$.ugcHeader}>
                {result.ugc_title && <Text style={cin$.ugcTitle}>{result.ugc_title.toUpperCase()}</Text>}
                <View style={[cin$.roleBadge, isMaster ? cin$.coachRoleBadge : cin$.communityRoleBadge]}>
                  <Ionicons
                    name={isMaster ? 'shield-checkmark' : 'people'}
                    size={10}
                    color={isMaster ? '#00FF87' : '#FF9500'}
                  />
                  <Text style={[cin$.roleBadgeText, { color: isMaster ? '#00FF87' : '#FF9500' }]}>
                    {isMaster ? 'COACH CERTIFIED' : 'COMMUNITY CHALLENGE'}
                  </Text>
                </View>
              </Animated.View>
            )}

            <Text style={cin$.username}>{user?.username || 'Kore'}</Text>

            {/* Validation Status Badge */}
            {isUGC && (
              <View style={[cin$.validationBanner, result.is_verified ? cin$.verifiedBanner : cin$.failedBanner]}>
                <Ionicons
                  name={result.is_verified ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={result.is_verified ? '#00FF87' : '#FF3B30'}
                />
                <Text style={[cin$.validationText, { color: result.is_verified ? '#00FF87' : '#FF3B30' }]}>
                  {result.status || (result.is_verified ? 'VERIFIED' : 'UNVERIFIED')}
                </Text>
                <Text style={cin$.validationMode}>
                  {validationMode === 'STRICT' ? 'MODO SEVERO' : 'MODO STANDARD'}
                </Text>
              </View>
            )}

            <View style={cin$.scoreCircle}><Text style={cin$.scoreVal}>{result.quality_score || '\u2014'}</Text><Text style={cin$.scoreLabel}>QUALIT{'\u00c0'}</Text></View>
            <View style={cin$.xpWrap}><Text style={cin$.xpPlus}>+</Text><Text style={cin$.xpVal}>{displayXP}</Text><Text style={cin$.xpUnit}>FLUX</Text></View>

            {/* UGC: Completion Ratio + Discipline Ranking */}
            {isUGC && (
              <View style={cin$.ugcStatsRow}>
                <View style={cin$.stat}>
                  <Text style={cin$.statVal}>{Math.round((result.completion_ratio || 0) * 100)}%</Text>
                  <Text style={cin$.statLabel}>COMPLETAMENTO</Text>
                </View>
                <View style={cin$.stat}>
                  <Text style={cin$.statVal}>{result.total_reps || result.reps_completed || 0}</Text>
                  <Text style={cin$.statLabel}>REPS VALIDE</Text>
                </View>
                {result.discipline_rank > 0 && (
                  <View style={cin$.stat}>
                    <Text style={[cin$.statVal, { color: '#FFD700' }]}>#{result.discipline_rank}</Text>
                    <Text style={cin$.statLabel}>{(result.discipline || 'SILO').toUpperCase()}</Text>
                  </View>
                )}
              </View>
            )}

            {!isUGC && (
              <View style={cin$.statsRow}>
                <View style={cin$.stat}><Text style={cin$.statVal}>{result.reps_completed}</Text><Text style={cin$.statLabel}>REPS</Text></View>
                <View style={cin$.stat}><Text style={[cin$.statVal, { color: '#FFD700' }]}>x{result.quality_multiplier}</Text><Text style={cin$.statLabel}>MULTI</Text></View>
                <View style={cin$.stat}><Text style={cin$.statVal}>{result.base_xp}</Text><Text style={cin$.statLabel}>BASE</Text></View>
              </View>
            )}
            {result.records_broken?.length > 0 && (
              <View style={cin$.record}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Ionicons name="trophy" size={16} color="#FFD700" /><Text style={cin$.recordTitle}>RECORD INFRANTI!</Text></View><Text style={cin$.recordList}>{result.records_broken.join(' \u00b7 ')}</Text></View>
            )}
            {result.level_up && <View style={cin$.level}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Ionicons name="sparkles" size={16} color="#FFD700" /><Text style={cin$.levelText}>LEVEL UP! {'\u2192'} LVL {result.new_level}</Text></View></View>}
            {result.dna && (
              <View style={cin$.dnaRow}>{Object.entries(result.dna).map(([k, v]: [string, any]) => (
                <View key={k} style={cin$.dnaItem}><Text style={cin$.dnaVal}>{Math.round(v)}</Text><Text style={cin$.dnaLabel}>{k.slice(0, 3).toUpperCase()}</Text></View>
              ))}</View>
            )}

            {/* SHARE VICTORY CARD BUTTON */}
            <TouchableOpacity
              style={[cin$.shareBtn, { borderColor: mood.accent + '35' }]}
              onPress={handleShare}
              activeOpacity={0.85}
              disabled={sharing}
            >
              <Ionicons name="share-outline" size={16} color={mood.accent} />
              <Text style={[cin$.shareBtnText, { color: mood.accent }]}>
                {sharing ? 'GENERAZIONE...' : 'SHARE VICTORY CARD'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={cin$.closeBtn} onPress={onClose}><Text style={cin$.closeBtnText}>CHIUDI</Text></TouchableOpacity>
          </ScrollView>
        </Animated.View>

        {/* HIDDEN VICTORY CARD FOR SNAPSHOT */}
        <View style={vic$.offscreen}>
          <ViewShot ref={victoryRef} options={{ format: 'png', quality: 1 }} style={vic$.card}>
            <View style={[vic$.bg, { backgroundColor: mood.bg }]}>
              {/* Mood accent line */}
              <View style={[vic$.accentLine, { backgroundColor: mood.accent }]} />

              {/* Brand */}
              <View style={vic$.brandRow}>
                <Text style={vic$.brandA}>ARENA</Text>
                <Text style={[vic$.brandK, { color: mood.accent }]}>KORE</Text>
              </View>

              {/* Username */}
              <Text style={vic$.username}>{(user?.username || 'KORE').toUpperCase()}</Text>
              {isFounder && <Text style={vic$.founderTag}>FOUNDER #{user?.founder_number || '?'}</Text>}

              {/* Giant Result */}
              <View style={vic$.resultSection}>
                <Text style={[vic$.resultBig, { color: mood.accent }]}>{result.reps_completed || '0'}</Text>
                <Text style={vic$.resultUnit}>REPS</Text>
              </View>

              {/* Quality Score */}
              <View style={vic$.qualRow}>
                <View style={[vic$.qualCircle, { borderColor: mood.accent }]}>
                  <Text style={[vic$.qualVal, { color: mood.accent }]}>{result.quality_score || '—'}</Text>
                </View>
                <View style={vic$.qualInfo}>
                  <Text style={vic$.qualLabel}>QUALITÀ</Text>
                  <Text style={[vic$.moodLabel, { color: mood.accent }]}>{mood.label}</Text>
                </View>
              </View>

              {/* FLUX earned */}
              <View style={vic$.fluxRow}>
                <Text style={vic$.fluxPlus}>+</Text>
                <Text style={[vic$.fluxVal, { color: mood.accent }]}>{result.xp_earned || 0}</Text>
                <Text style={vic$.fluxUnit}>FLUX</Text>
              </View>

              {/* Validation */}
              <View style={vic$.validRow}>
                <Ionicons name="eye" size={14} color="rgba(255,255,255,0.3)" />
                <Text style={vic$.validText}>NEXUS VALIDATED</Text>
              </View>

              {/* Footer */}
              <Text style={vic$.tagline}>Sfidami su ARENA KORE!</Text>
              <Text style={vic$.footer}>arenakore.app</Text>
            </View>
          </ViewShot>
        </View>
      </View>
    </Modal>
  );
}

const cin$ = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(5,5,5,0.96)' },
  card: { width: SW * 0.9, maxHeight: SH * 0.85, backgroundColor: '#0A0A0A', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  scroll: { padding: 24, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  title: { color: '#00E5FF', fontSize: 13, fontWeight: '800', letterSpacing: 4 },
  founderBadge: { backgroundColor: 'rgba(255,215,0,0.2)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FFD700' },
  founderText: { color: '#FFD700', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  // UGC Header
  ugcHeader: { alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 4 },
  ugcTitle: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '800', letterSpacing: 2, textAlign: 'center' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  coachRoleBadge: { backgroundColor: 'rgba(0,255,135,0.10)', borderColor: 'rgba(0,255,135,0.30)' },
  communityRoleBadge: { backgroundColor: 'rgba(255,149,0,0.08)', borderColor: 'rgba(255,149,0,0.20)' },
  roleBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  // Validation Banner
  validationBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginBottom: 10, marginTop: 4 },
  verifiedBanner: { backgroundColor: 'rgba(0,255,135,0.06)', borderColor: 'rgba(0,255,135,0.20)' },
  failedBanner: { backgroundColor: 'rgba(255,59,48,0.06)', borderColor: 'rgba(255,59,48,0.20)' },
  validationText: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  validationMode: { color: 'rgba(255,255,255,0.20)', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginLeft: 'auto' as any },
  // UGC stats
  ugcStatsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginBottom: 10, marginTop: 4 },
  username: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
  scoreCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#00E5FF22', borderWidth: 3, borderColor: '#00E5FF', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  scoreVal: { color: '#FFFFFF', fontSize: 36, fontWeight: '900' },
  scoreLabel: { color: '#00E5FF', fontSize: 7, fontWeight: '400', letterSpacing: 2 },
  xpWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 14 },
  xpPlus: { color: '#FFD700', fontSize: 24, fontWeight: '300' },
  xpVal: { color: '#FFD700', fontSize: 42, fontWeight: '400', fontVariant: ['tabular-nums'] },
  xpUnit: { color: '#8A7020', fontSize: 16, fontWeight: '400', letterSpacing: 2, marginLeft: 4 },
  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginBottom: 10 },
  stat: { alignItems: 'center', gap: 3 },
  statVal: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  record: { width: '100%', backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)', marginBottom: 8, gap: 3 },
  recordTitle: { color: '#FFD700', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  recordList: { color: '#FFD700', fontSize: 12 },
  level: { width: '100%', backgroundColor: '#00E5FF22', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 8 },
  levelText: { color: '#00E5FF', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  dnaRow: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  dnaItem: { alignItems: 'center', gap: 1 },
  dnaVal: { color: '#00E5FF', fontSize: 16, fontWeight: '900' },
  dnaLabel: { color: '#555', fontSize: 7, fontWeight: '700' },
  shareBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 10, paddingVertical: 14, marginTop: 6, borderWidth: 1 },
  shareBtnText: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  closeBtn: { width: '100%', backgroundColor: '#00E5FF', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  closeBtnText: { color: '#000000', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
});

const vic$ = StyleSheet.create({
  offscreen: { position: 'absolute', left: -9999, top: -9999, opacity: 1 },
  card: { width: 360, height: 640 },
  bg: { flex: 1, paddingHorizontal: 24, paddingVertical: 20, justifyContent: 'space-between' },
  accentLine: { height: 3, borderRadius: 2, width: 40, marginBottom: 10 },
  brandRow: { flexDirection: 'row', gap: 6 },
  brandA: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '900', letterSpacing: 5 },
  brandK: { fontSize: 10, fontWeight: '900', letterSpacing: 5 },
  username: { color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginTop: 8 },
  founderTag: { color: '#FFD700', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 2 },
  resultSection: { alignItems: 'center', marginVertical: 8 },
  resultBig: { fontSize: 80, fontWeight: '900', lineHeight: 88 },
  resultUnit: { color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: '800', letterSpacing: 6, marginTop: -4 },
  qualRow: { flexDirection: 'row', alignItems: 'center', gap: 16, alignSelf: 'center' },
  qualCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  qualVal: { fontSize: 22, fontWeight: '900' },
  qualInfo: { gap: 2 },
  qualLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  moodLabel: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  fluxRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 2, marginVertical: 4 },
  fluxPlus: { color: '#FFD700', fontSize: 20, fontWeight: '300' },
  fluxVal: { fontSize: 36, fontWeight: '900' },
  fluxUnit: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '800', letterSpacing: 3, marginLeft: 4 },
  validRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: 4 },
  validText: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  tagline: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600', textAlign: 'center', fontStyle: 'italic' },
  footer: { color: 'rgba(255,255,255,0.1)', fontSize: 10, fontWeight: '800', letterSpacing: 3, textAlign: 'center' },
});
