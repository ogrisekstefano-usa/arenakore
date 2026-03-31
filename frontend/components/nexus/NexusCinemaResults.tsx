/**
 * ARENAKORE — Cinema Results v2.0
 * Session completion modal
 * Extracted from nexus-trigger.tsx
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, withSpring, withTiming, useAnimatedStyle,
  withSequence, withDelay, withRepeat, Easing, FadeInDown,
} from 'react-native-reanimated';

const { width: SW, height: SH } = Dimensions.get('window');

export function CinemaResults({ visible, result, user, onClose }: { visible: boolean; result: any; user: any; onClose: () => void }) {
  const slideY = useSharedValue(300);
  const fadeIn = useSharedValue(0);
  const [displayXP, setDisplayXP] = useState(0);
  const founderShimmer = useSharedValue(-1);
  const [showShare, setShowShare] = useState(false);

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

  if (!visible || !result) return null;
  const isFounder = user?.is_founder || user?.is_admin;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={cin$.backdrop}>
        <Animated.View style={[cin$.card, cs]}>
          <ScrollView contentContainerStyle={cin$.scroll} showsVerticalScrollIndicator={false}>
            <View style={cin$.titleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flash" size={18} color="#00F2FF" />
                <Text style={cin$.title}>SESSIONE COMPLETATA</Text>
              </View>
              {isFounder && <Animated.View style={[cin$.founderBadge, ss]}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="star" size={10} color="#D4AF37" /><Text style={cin$.founderText}>FOUNDER</Text></View></Animated.View>}
            </View>
            <Text style={cin$.username}>{user?.username || 'Atleta'}</Text>
            <View style={cin$.scoreCircle}><Text style={cin$.scoreVal}>{result.quality_score || '\u2014'}</Text><Text style={cin$.scoreLabel}>QUALIT{'\u00c0'}</Text></View>
            <View style={cin$.xpWrap}><Text style={cin$.xpPlus}>+</Text><Text style={cin$.xpVal}>{displayXP}</Text><Text style={cin$.xpUnit}>XP</Text></View>
            <View style={cin$.statsRow}>
              <View style={cin$.stat}><Text style={cin$.statVal}>{result.reps_completed}</Text><Text style={cin$.statLabel}>REPS</Text></View>
              <View style={cin$.stat}><Text style={[cin$.statVal, { color: '#D4AF37' }]}>x{result.quality_multiplier}</Text><Text style={cin$.statLabel}>MULTI</Text></View>
              <View style={cin$.stat}><Text style={cin$.statVal}>{result.base_xp}</Text><Text style={cin$.statLabel}>BASE</Text></View>
            </View>
            {result.records_broken?.length > 0 && (
              <View style={cin$.record}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Ionicons name="trophy" size={16} color="#D4AF37" /><Text style={cin$.recordTitle}>RECORD INFRANTI!</Text></View><Text style={cin$.recordList}>{result.records_broken.join(' \u00b7 ')}</Text></View>
            )}
            {result.level_up && <View style={cin$.level}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Ionicons name="sparkles" size={16} color="#D4AF37" /><Text style={cin$.levelText}>LEVEL UP! {'\u2192'} LVL {result.new_level}</Text></View></View>}
            {result.dna && (
              <View style={cin$.dnaRow}>{Object.entries(result.dna).map(([k, v]: [string, any]) => (
                <View key={k} style={cin$.dnaItem}><Text style={cin$.dnaVal}>{Math.round(v)}</Text><Text style={cin$.dnaLabel}>{k.slice(0, 3).toUpperCase()}</Text></View>
              ))}</View>
            )}
            <TouchableOpacity style={cin$.shareBtn} onPress={() => setShowShare(!showShare)} activeOpacity={0.85}>
              <Text style={cin$.shareBtnText}>{'\u2191'} SHARE ATHLETE PASSPORT</Text>
            </TouchableOpacity>
            {showShare && (
              <Animated.View entering={FadeInDown.duration(300)} style={cin$.shareCard}>
                <Text style={cin$.shareLogo}>ARENAKORE</Text>
                <Text style={cin$.shareTag}>Hall of Kore</Text>
                <View style={cin$.shareLine} />
                <Text style={cin$.shareScore}>Quality: {result.quality_score} {'\u00b7'} +{result.xp_earned} XP {'\u00b7'} {result.reps_completed} Reps</Text>
                <Text style={cin$.shareFounder}>
                  {isFounder ? `Founder #${user?.founder_number || '?'}` : user?.username} {'\u2014'} Performance Logged in Chicago
                </Text>
              </Animated.View>
            )}
            <TouchableOpacity style={cin$.closeBtn} onPress={onClose}><Text style={cin$.closeBtnText}>CHIUDI</Text></TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const cin$ = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(5,5,5,0.96)' },
  card: { width: SW * 0.9, maxHeight: SH * 0.85, backgroundColor: '#0A0A0A', borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.12, shadowRadius: 25 },
  scroll: { padding: 24, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  title: { color: '#00F2FF', fontSize: 11, fontWeight: '800', letterSpacing: 4 },
  founderBadge: { backgroundColor: 'rgba(212,175,55,0.2)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#D4AF37' },
  founderText: { color: '#D4AF37', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  username: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
  scoreCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,242,255,0.65)', borderWidth: 3, borderColor: '#00F2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  scoreVal: { color: '#FFFFFF', fontSize: 36, fontWeight: '900' },
  scoreLabel: { color: '#00F2FF', fontSize: 7, fontWeight: '400', letterSpacing: 2 },
  xpWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 14 },
  xpPlus: { color: '#D4AF37', fontSize: 22, fontWeight: '300' },
  xpVal: { color: '#D4AF37', fontSize: 42, fontWeight: '400', fontVariant: ['tabular-nums'] },
  xpUnit: { color: '#8A7020', fontSize: 14, fontWeight: '400', letterSpacing: 2, marginLeft: 4 },
  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginBottom: 10 },
  stat: { alignItems: 'center', gap: 3 },
  statVal: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#555', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  record: { width: '100%', backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)', marginBottom: 8, gap: 3 },
  recordTitle: { color: '#D4AF37', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  recordList: { color: '#D4AF37', fontSize: 10 },
  level: { width: '100%', backgroundColor: 'rgba(0,242,255,0.65)', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 8 },
  levelText: { color: '#00F2FF', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  dnaRow: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  dnaItem: { alignItems: 'center', gap: 1 },
  dnaVal: { color: '#00F2FF', fontSize: 14, fontWeight: '900' },
  dnaLabel: { color: '#555', fontSize: 7, fontWeight: '700' },
  shareBtn: { width: '100%', backgroundColor: 'rgba(212,175,55,0.1)', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 6, borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)' },
  shareBtnText: { color: '#D4AF37', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  shareCard: { width: '100%', backgroundColor: 'rgba(212,175,55,0.05)', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: 'rgba(212,175,55,0.15)', gap: 4 },
  shareLogo: { color: '#D4AF37', fontSize: 16, fontWeight: '900', letterSpacing: 4 },
  shareTag: { color: '#888', fontSize: 9, fontWeight: '600', letterSpacing: 2 },
  shareLine: { width: 40, height: 1, backgroundColor: 'rgba(212,175,55,0.3)', marginVertical: 6 },
  shareScore: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  shareFounder: { color: '#D4AF37', fontSize: 10, fontWeight: '600', fontStyle: 'italic', textAlign: 'center' },
  closeBtn: { width: '100%', backgroundColor: '#00F2FF', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  closeBtnText: { color: '#050505', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
});
