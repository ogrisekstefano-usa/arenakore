/**
 * ARENAKORE — KORE TAB v7.0
 * SOCIAL PASSPORT: Rank Infographic + Affiliations + Action Center + Kore Card + Settings
 * Nike Lab: Black / Cyan / Gold / White. Zero emoji. Bold ALL-CAPS. Ionicons only.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  Dimensions, Linking, Platform, RefreshControl, ActivityIndicator, Modal,
  TextInput, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeInDown, useSharedValue, withRepeat,
  withSequence, withTiming, useAnimatedStyle,
} from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { Header } from '../../components/Header';
import { KoreVault, AKBadge } from '../../components/KoreVault';
import { AKDropsWallet, CertBadge } from '../../components/CertBadge';
import { ValidationBreakdown } from '../../components/challenge/ValidationBreakdown';
import { KoreIDModal } from '../../components/KoreIDModal';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ImageBackground } from 'react-native';
import { TAB_BACKGROUNDS } from '../../utils/images';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW } = Dimensions.get('window');

const DNA_LABELS: Record<string, string> = {
  velocita: 'VEL', forza: 'FOR', resistenza: 'RES',
  agilita: 'AGI', tecnica: 'TEC', potenza: 'POT',
  mentalita: 'MEN', flessibilita: 'FLE',
};
const DNA_COLORS: Record<string, string> = {
  velocita: '#00E5FF', forza: '#FFFFFF', resistenza: '#FF3B30',
  agilita: '#00E5FF', tecnica: '#FFFFFF', potenza: '#FFD700',
  mentalita: '#FFD700', flessibilita: '#00E5FF',
};

const CITIES = [
  'MILANO', 'ROMA', 'TORINO', 'NAPOLI', 'FIRENZE', 'VENEZIA',
  'BOLOGNA', 'GENOVA', 'PALERMO', 'BARI', 'LONDON', 'PARIS',
  'BARCELONA', 'BERLIN', 'NEW YORK', 'CHICAGO', 'TOKYO', 'DUBAI',
];

// ========== CITY DROPDOWN ==========
function CityDropdown({ city, onSelect }: { city: string; onSelect: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={cd$.trigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Ionicons name="location" size={12} color="#00E5FF" />
        <Text style={cd$.cityText}>{city}</Text>
        <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={cd$.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={cd$.sheet}>
            <LinearGradient colors={['#0a0a0a', '#0a0a0a']} style={cd$.sheetInner}>
              <Text style={cd$.sheetTitle}>SELEZIONA CITY</Text>
              <View style={cd$.sheetDivider} />
              <ScrollView showsVerticalScrollIndicator={false}>
                {CITIES.map(c => (
                  <TouchableOpacity key={c} style={[cd$.option, c === city && cd$.optionActive]} onPress={() => { onSelect(c); setOpen(false); }}>
                    <Ionicons name="location-outline" size={12} color={c === city ? '#00E5FF' : 'rgba(255,255,255,0.65)'} />
                    <Text style={[cd$.optionText, c === city && cd$.optionTextActive]}>{c}</Text>
                    {c === city && <Ionicons name="checkmark" size={12} color="#00E5FF" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
const cd$ = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'transparent', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignSelf: 'flex-start' },
  cityText: { color: '#00E5FF', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '50%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  sheetInner: { padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 4, marginBottom: 12 },
  sheetDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 4 },
  optionActive: { backgroundColor: 'transparent', borderRadius: 8, paddingHorizontal: 10 },
  optionText: { flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  optionTextActive: { color: '#00E5FF' },
});

// ========== PASSPORT HEADER ==========
function PassportHeader({ user }: { user: any }) {
  const shimmer = useSharedValue(0.7);
  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(withTiming(1, { duration: 2000 }), withTiming(0.7, { duration: 2000 })), -1, false
    );
  }, []);
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));
  const isFounder = user?.is_founder || user?.is_admin;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={ph$.container}>
      <LinearGradient colors={['#0a0a0a', '#0a0a0a']} style={ph$.card}>
        <View style={ph$.topGlow} />
        <View style={ph$.row}>
          <View style={[ph$.avatar, { backgroundColor: user?.avatar_color || '#00E5FF' }]}>
            <Text style={ph$.avatarLetter}>{(user?.username || 'A')[0].toUpperCase()}</Text>
          </View>
          <View style={ph$.identInfo}>
            <View style={ph$.nameRow}>
              <Text style={ph$.username} numberOfLines={1}>{(user?.username || 'ATHLETE').toUpperCase()}</Text>
              {isFounder && (
                <Animated.View style={[ph$.founderBadge, shimmerStyle]}>
                  <Ionicons name="star" size={8} color="#FFD700" />
                  <Text style={ph$.founderText}>FOUNDER</Text>
                </Animated.View>
              )}
              {/* NÈXUS CERTIFIED badge — pulsating when certified */}
              <Animated.View style={user?.is_nexus_certified ? shimmerStyle : undefined}>
                <CertBadge certified={user?.is_nexus_certified ?? false} size="sm" />
              </Animated.View>
            </View>
            <Text style={ph$.sport}>
              {(user?.sport && user.sport !== 'ATHLETICS'
                ? user.sport : user?.training_level || 'KORE'
              ).toUpperCase()}
            </Text>
            <View style={ph$.badgeRow}>
              <View style={ph$.lvlBadge}>
                <Ionicons name="flash" size={8} color="#00E5FF" />
                <Text style={ph$.lvlText}>LVL {user?.level || 1}</Text>
              </View>
              {user?.pro_unlocked && (
                <View style={ph$.proBadge}>
                  <Ionicons name="diamond" size={8} color="#FFD700" />
                  <Text style={ph$.proText}>PRO</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
const ph$ = StyleSheet.create({
  container: { marginHorizontal: 24, marginTop: 8, marginBottom: 10 },
  card: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  topGlow: { height: 2, backgroundColor: '#00E5FF', opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  avatarLetter: { color: '#000000', fontSize: 22, fontWeight: '900' },
  identInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  username: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.5, flexShrink: 1, lineHeight: 31 },
  founderBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)', flexShrink: 0 },
  founderText: { color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  sport: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  lvlBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'transparent', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  lvlText: { color: '#00E5FF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  proBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,215,0,0.07)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)' },
  proText: { color: '#FFD700', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
});

// ========== RANK INFOGRAPHIC ==========
function RankInfographic({ rankData, city, onCitySelect }: { rankData: any; city: string; onCitySelect: (c: string) => void }) {
  if (!rankData) return null;

  const DominanceBar = ({ pct, color, label }: { pct: number; color: string; label: string }) => {
    const barAnim = useSharedValue(0);
    useEffect(() => { barAnim.value = withTiming(Math.min(pct, 100) / 100, { duration: 1200 }); }, [pct]);
    const barStyle = useAnimatedStyle(() => ({ width: `${barAnim.value * 100}%` as any }));
    return (
      <View style={ri$.barWrap}>
        <Text style={[ri$.barLabel, { color }]}>{label}</Text>
        <View style={ri$.barBg}>
          <Animated.View style={[ri$.barFill, { backgroundColor: color }, barStyle]} />
        </View>
        <Text style={[ri$.barPct, { color }]}>{pct.toFixed(1)}%</Text>
      </View>
    );
  };

  return (
    <Animated.View entering={FadeInDown.delay(100)} style={ri$.container}>
      <View style={ri$.sectionRow}>
        <View style={ri$.dot} />
        <Text style={ri$.title}>RANK INFOGRAPHIC</Text>
      </View>

      <View style={ri$.cardsRow}>
        {/* GLOBAL RANK */}
        <View style={ri$.rankCard}>
          <LinearGradient colors={['#0a0a0a', '#0a0a0a']} style={ri$.rankInner}>
            <View style={ri$.rankIcon}>
              <Ionicons name="globe-outline" size={14} color="#00E5FF" />
            </View>
            <Text style={ri$.rankType}>GLOBAL</Text>
            <Text style={[ri$.rankNum, rankData.global_is_top_10 && { color: '#FFD700' }]}>
              #{rankData.global_rank}
            </Text>
            <Text style={ri$.rankOf}>/ {rankData.global_total}</Text>
            {rankData.global_is_top_10 && (
              <View style={ri$.topBadge}>
                <Ionicons name="trophy" size={8} color="#FFD700" />
                <Text style={ri$.topText}>TOP 10</Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* CITY RANK */}
        <View style={ri$.rankCard}>
          <LinearGradient colors={['#0a0a0a', '#0a0a0a']} style={ri$.rankInner}>
            <View style={ri$.rankIcon}>
              <Ionicons name="location" size={14} color="#FFD700" />
            </View>
            <CityDropdown city={city} onSelect={onCitySelect} />
            <Text style={[ri$.rankNum, { color: rankData.city_is_top_10 ? '#FFD700' : '#FFFFFF' }]}>
              #{rankData.city_rank}
            </Text>
            <Text style={ri$.rankOf}>/ {rankData.city_total}</Text>
            {rankData.city_is_top_10 && (
              <View style={ri$.topBadge}>
                <Ionicons name="trophy" size={8} color="#FFD700" />
                <Text style={ri$.topText}>TOP 10</Text>
              </View>
            )}
          </LinearGradient>
        </View>
      </View>

      {/* DOMINANCE BARS */}
      <View style={ri$.domSection}>
        <DominanceBar pct={rankData.global_percentile} color="#00E5FF" label="GLOBAL" />
        <DominanceBar pct={rankData.city_percentile} color="#FFD700" label={city} />
      </View>

      {/* NEXT RIVAL */}
      {rankData.global_next_username && (
        <View style={ri$.rivalRow}>
          <Ionicons name="arrow-up" size={10} color="rgba(255,255,255,0.4)" />
          <Text style={ri$.rivalText}>
            {rankData.global_xp_gap} FLUX PER SUPERARE {rankData.global_next_username.toUpperCase()}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
const ri$ = StyleSheet.create({
  container: { marginHorizontal: 24, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00E5FF' },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  cardsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  rankCard: { flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  rankInner: { padding: 14, alignItems: 'center', gap: 6 },
  rankIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  rankType: { color: 'rgba(255,255,255,0.70)', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  rankNum: { color: '#00E5FF', fontSize: 36, fontWeight: '900', letterSpacing: 1 },
  rankOf: { color: '#AAAAAA', fontSize: 15, fontWeight: '400', letterSpacing: 1, marginTop: -4 },
  topBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  topText: { color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  domSection: { gap: 8, marginBottom: 8 },
  barWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 70, fontSize: 11, fontWeight: '900', letterSpacing: 2, textAlign: 'right' },
  barBg: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barPct: { width: 42, fontSize: 13, fontWeight: '900', letterSpacing: 0.5, textAlign: 'right' },
  rivalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingLeft: 2 },
  rivalText: { color: 'rgba(255,255,255,0.70)', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
});

// ========== AFFILIATIONS ==========
function Affiliations({ affiliData, token, onRefresh }: { affiliData: any; token: string; onRefresh: () => void }) {
  const [editMode, setEditMode] = useState(false);
  const [school, setSchool] = useState(affiliData?.school || '');
  const [university, setUniversity] = useState(affiliData?.university || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateAffiliations({ school: school || undefined, university: university || undefined }, token);
      setEditMode(false);
      onRefresh();
    } catch (_) {}
    finally { setSaving(false); }
  };

  return (
    <Animated.View entering={FadeInDown.delay(200)} style={af$.container}>
      <View style={af$.sectionRow}>
        <Ionicons name="people" size={13} color="#FFFFFF" />
        <Text style={af$.title}>AFFILIAZIONI</Text>
        <TouchableOpacity onPress={() => setEditMode(!editMode)} style={af$.editBtn}>
          <Ionicons name={editMode ? 'close' : 'create-outline'} size={14} color="#00E5FF" />
        </TouchableOpacity>
      </View>

      {/* School & University */}
      <View style={af$.infoRow}>
        <View style={af$.infoCard}>
          <Ionicons name="school-outline" size={16} color="#00E5FF" />
          {editMode ? (
            <TextInput
              style={af$.input}
              value={school}
              onChangeText={setSchool}
              placeholder="SCUOLA"
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoCapitalize="characters"
            />
          ) : (
            <Text style={af$.infoText}>{affiliData?.school || 'NESSUNA SCUOLA'}</Text>
          )}
        </View>
        <View style={af$.infoCard}>
          <Ionicons name="library-outline" size={16} color="#FFD700" />
          {editMode ? (
            <TextInput
              style={af$.input}
              value={university}
              onChangeText={setUniversity}
              placeholder="UNIVERSITA"
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoCapitalize="characters"
            />
          ) : (
            <Text style={af$.infoText}>{affiliData?.university || 'NESSUNA UNIVERSITA'}</Text>
          )}
        </View>
      </View>

      {editMode && (
        <TouchableOpacity style={af$.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
          {saving ? <ActivityIndicator size="small" color="#050505" /> : <Text style={af$.saveTxt}>SALVA</Text>}
        </TouchableOpacity>
      )}

      {/* Crews */}
      {affiliData?.crews && affiliData.crews.length > 0 && (
        <View style={af$.crewSection}>
          <Text style={af$.crewLabel}>CREWS</Text>
          {affiliData.crews.map((crew: any) => (
            <View key={crew.id} style={af$.crewRow}>
              <View style={[af$.crewDot, crew.is_owner && { backgroundColor: '#FFD700' }]} />
              <Text style={af$.crewName}>{crew.name.toUpperCase()}</Text>
              <Text style={af$.crewMeta}>{crew.members_count} KORE</Text>
              {crew.is_owner && (
                <View style={af$.ownerBadge}>
                  <Text style={af$.ownerText}>OWNER</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {(!affiliData?.crews || affiliData.crews.length === 0) && !editMode && (
        <View style={af$.emptyCrews}>
          <Ionicons name="people-outline" size={18} color="rgba(255,255,255,0.50)" />
          <Text style={af$.emptyText}>NESSUNA CREW</Text>
        </View>
      )}
    </Animated.View>
  );
}
const af$ = StyleSheet.create({
  container: { marginHorizontal: 24, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { flex: 1, color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  editBtn: { padding: 8, backgroundColor: 'transparent', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  infoRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  infoCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  infoText: { color: '#AAAAAA', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, flex: 1 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 1, paddingVertical: 0, borderBottomWidth: 1, borderBottomColor: 'rgba(0,229,255,0.2)' },
  saveBtn: { alignSelf: 'flex-end', backgroundColor: '#00E5FF', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 8, marginBottom: 8 },
  saveTxt: { color: '#000000', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  crewSection: { gap: 6, marginTop: 4 },
  crewLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 4 },
  crewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  crewDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00E5FF' },
  crewName: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
  crewMeta: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  ownerBadge: { backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)' },
  ownerText: { color: '#FFD700', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  emptyCrews: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 16 },
  emptyText: { color: '#AAAAAA', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
});

// ========== ACTION CENTER ==========
function ActionCenter({ actionData }: { actionData: any }) {
  const [tab, setTab] = useState<'hot' | 'pending'>('hot');

  const hotCount = actionData?.hot_count || 0;
  const pendingCount = actionData?.pending_count || 0;
  const items = tab === 'hot' ? (actionData?.hot || []) : (actionData?.pending || []);

  return (
    <Animated.View entering={FadeInDown.delay(300)} style={ac$.container}>
      <View style={ac$.sectionRow}>
        <Ionicons name="pulse" size={13} color="#FF3B30" />
        <Text style={ac$.title}>ACTION CENTER</Text>
      </View>

      {/* Tabs */}
      <View style={ac$.tabs}>
        <TouchableOpacity
          style={[ac$.tab, tab === 'hot' && ac$.tabActive]}
          onPress={() => setTab('hot')}
          activeOpacity={0.8}
        >
          <Ionicons name="flame" size={13} color={tab === 'hot' ? '#FF3B30' : 'rgba(255,255,255,0.3)'} />
          <Text style={[ac$.tabText, tab === 'hot' && ac$.tabTextActive]}>HOT</Text>
          {hotCount > 0 && <View style={ac$.badge}><Text style={ac$.badgeText}>{hotCount}</Text></View>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[ac$.tab, tab === 'pending' && ac$.tabActivePending]}
          onPress={() => setTab('pending')}
          activeOpacity={0.8}
        >
          <Ionicons name="hourglass" size={13} color={tab === 'pending' ? '#FFD700' : 'rgba(255,255,255,0.3)'} />
          <Text style={[ac$.tabText, tab === 'pending' && ac$.tabTextPending]}>PENDING</Text>
          {pendingCount > 0 && <View style={[ac$.badge, { backgroundColor: 'rgba(255,215,0,0.2)' }]}><Text style={[ac$.badgeText, { color: '#FFD700' }]}>{pendingCount}</Text></View>}
        </TouchableOpacity>
      </View>

      {/* Items */}
      {items.length === 0 ? (
        <View style={ac$.empty}>
          <Ionicons name={tab === 'hot' ? 'flame-outline' : 'hourglass-outline'} size={24} color="rgba(255,255,255,0.1)" />
          <Text style={ac$.emptyText}>
            {tab === 'hot' ? 'NESSUNA SFIDA ATTIVA' : 'NESSUNA SFIDA IN ATTESA'}
          </Text>
        </View>
      ) : (
        <View style={ac$.list}>
          {items.map((item: any, idx: number) => (
            <View key={item.id || idx} style={ac$.item}>
              <View style={[ac$.itemDot, {
                backgroundColor: item.type === 'battle' ? '#FF3B30'
                  : item.type === 'gym_event' ? '#00E5FF'
                  : item.type === 'crew_invite' ? '#FFD700'
                  : '#888',
              }]} />
              <View style={ac$.itemContent}>
                <Text style={ac$.itemTitle} numberOfLines={1}>{item.title}</Text>
                <View style={ac$.itemMeta}>
                  {item.sport && <Text style={ac$.itemSport}>{item.sport.toUpperCase()}</Text>}
                  {item.xp_reward > 0 && <Text style={ac$.itemXp}>+{item.xp_reward} FLUX</Text>}
                  {item.status && <Text style={ac$.itemStatus}>{item.status.toUpperCase()}</Text>}
                  {item.from_username && <Text style={ac$.itemFrom}>DA: {item.from_username.toUpperCase()}</Text>}
                  {item.gym_name && <Text style={ac$.itemFrom}>{item.gym_name.toUpperCase()}</Text>}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.50)" />
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}
const ac$ = StyleSheet.create({
  container: { marginHorizontal: 24, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { flex: 1, color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  tabActive: { backgroundColor: 'rgba(255,59,48,0.08)', borderColor: 'rgba(255,59,48,0.25)' },
  tabActivePending: { backgroundColor: 'rgba(255,215,0,0.08)', borderColor: 'rgba(255,215,0,0.25)' },
  tabText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  tabTextActive: { color: '#FF3B30' },
  tabTextPending: { color: '#FFD700' },
  badge: { backgroundColor: 'rgba(255,59,48,0.2)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  badgeText: { color: '#FF3B30', fontSize: 12, fontWeight: '900' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { color: '#AAAAAA', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  list: { gap: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  itemDot: { width: 8, height: 8, borderRadius: 4 },
  itemContent: { flex: 1, gap: 3 },
  itemTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  itemMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  itemSport: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  itemXp: { color: '#FFD700', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  itemStatus: { color: '#00E5FF', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  itemFrom: { color: '#AAAAAA', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
});

// ========== KORE CARD + WALLET ==========
function KoreCard({ user, rankData }: { user: any; rankData: any }) {
  const { token } = useAuth();
  const scanPulse = useSharedValue(0);
  const [walletState, setWalletState] = useState<'idle' | 'loading' | 'success_apple' | 'success_google' | 'error'>('idle');
  const [walletInfo, setWalletInfo] = useState<any>(null);

  useEffect(() => {
    scanPulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 1500 }), withTiming(0, { duration: 1500 })), -1, false
    );
  }, []);
  const scanStyle = useAnimatedStyle(() => ({ opacity: 0.05 + scanPulse.value * 0.08 }));

  const isFounder = user?.is_founder || user?.is_admin;
  const koreNumber = user?.founder_number
    ? String(user.founder_number).padStart(5, '0')
    : String(Math.abs(parseInt((user?.id || '00001').slice(-5), 16)) % 99999).padStart(5, '0');
  const dnaValues = Object.values(user?.dna || {}) as number[];
  const avgDna = dnaValues.length
    ? Math.round(dnaValues.reduce((a: number, b: number) => a + b, 0) / dnaValues.length)
    : 0;

  const handleApple = async () => {
    if (!token || walletState === 'loading') return;
    setWalletState('loading');
    try {
      const result = await api.generateApplePass(token);
      setWalletInfo(result);
      setWalletState('success_apple');
      if (Platform.OS === 'web' && result.pass_b64) {
        try {
          const byteChars = atob(result.pass_b64);
          const byteArr = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
          const blob = new Blob([byteArr], { type: 'application/vnd.apple.pkpass' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = result.filename || 'KORE.pkpass';
          a.click(); URL.revokeObjectURL(url);
        } catch (_e) { /* web fallback */ }
      }
    } catch (_e) {
      setWalletState('error');
    }
  };

  const handleGoogle = async () => {
    if (!token || walletState === 'loading') return;
    setWalletState('loading');
    try {
      const result = await api.generateGooglePass(token);
      setWalletInfo(result);
      setWalletState('success_google');
      if (result.wallet_url) {
        Linking.openURL(result.wallet_url).catch(() => {});
      }
    } catch (_e) {
      setWalletState('error');
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(350)} style={kc$.container}>
      <View style={kc$.sectionRow}>
        <Ionicons name="card" size={12} color="#FFFFFF" />
        <Text style={kc$.sectionTitle}>KORE CARD</Text>
      </View>

      <View style={kc$.card}>
        <LinearGradient colors={['#0a0a0a', '#000000']} style={kc$.cardInner}>
          <Animated.View style={[StyleSheet.absoluteFill, kc$.scanLayer, scanStyle]} />
          <View style={kc$.cardTopGlow} />

          {/* Card header */}
          <View style={kc$.cardHeader}>
            <View>
              <Text style={kc$.brandSm}>ARENAKORE</Text>
              <Text style={kc$.cardType}>KORE ID CARD</Text>
            </View>
            {isFounder && (
              <View style={kc$.founderBadge}>
                <Ionicons name="star" size={9} color="#FFD700" />
                <Text style={kc$.founderText}>FOUNDER</Text>
              </View>
            )}
          </View>

          {/* DNA bars */}
          <View style={kc$.dnaSection}>
            <Text style={kc$.dnaCap}>DNA {avgDna > 0 ? `AVG ${avgDna}` : ''}</Text>
            {Object.entries(user?.dna || {}).slice(0, 6).map(([key, val]: [string, any]) => {
              const color = DNA_COLORS[key] || '#00E5FF';
              return (
                <View key={key} style={kc$.dnaRow}>
                  <Text style={kc$.dnaLabel}>{DNA_LABELS[key] || key.slice(0, 3).toUpperCase()}</Text>
                  <View style={kc$.dnaBar}>
                    <View style={[kc$.dnaFill, { width: `${Math.min(100, val)}%` as any, backgroundColor: color }]} />
                  </View>
                  <Text style={[kc$.dnaVal, { color }]}>{Math.round(val)}</Text>
                </View>
              );
            })}
          </View>

          <View style={kc$.divider} />

          {/* Bottom: QR + Stats */}
          <View style={kc$.bottomRow}>
            <View style={kc$.qrBox}>
              <QRCode value={`arenakore://athlete/${user?.id || 'x'}`} size={56} color="#00E5FF" backgroundColor="#070707" />
            </View>
            <View style={kc$.rightSide}>
              <View style={kc$.bStat}><Text style={kc$.bStatLabel}>FLUX</Text><Text style={kc$.bStatVal}>{((user?.xp || 0) as number).toLocaleString()}</Text></View>
              <View style={kc$.bStat}><Text style={kc$.bStatLabel}>RANK</Text><Text style={[kc$.bStatVal, { color: rankData?.global_is_top_10 ? '#FFD700' : '#00E5FF' }]}>{rankData?.global_rank ? `#${rankData.global_rank}` : '---'}</Text></View>
              <Text style={kc$.serial}>KORE #{koreNumber}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Wallet buttons */}
      <View style={kc$.walletRow}>
        {Platform.OS !== 'android' && (
          <TouchableOpacity style={kc$.appleBtn} onPress={handleApple} activeOpacity={0.85} disabled={walletState === 'loading'}>
            <LinearGradient colors={['#1C1C1E', '#111']} style={kc$.btnInner}>
              {walletState === 'loading' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="phone-portrait" size={15} color="#FFFFFF" />
              )}
              <View>
                <Text style={kc$.btnSm}>ADD TO</Text>
                <Text style={kc$.btnBig}>APPLE WALLET</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={kc$.googleBtn} onPress={handleGoogle} activeOpacity={0.85} disabled={walletState === 'loading'}>
          <LinearGradient colors={['#1A1A1A', '#111']} style={kc$.btnInner}>
            {walletState === 'loading' ? (
              <ActivityIndicator size="small" color="#4285F4" />
            ) : (
              <Ionicons name="card" size={15} color="#4285F4" />
            )}
            <View>
              <Text style={kc$.btnSm}>SAVE TO</Text>
              <Text style={[kc$.btnBig, { color: '#4285F4' }]}>GOOGLE WALLET</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Wallet Modal */}
      <Modal
        transparent
        visible={walletState === 'success_apple' || walletState === 'success_google' || walletState === 'error'}
        animationType="fade"
        onRequestClose={() => setWalletState('idle')}
      >
        <View style={wm$.overlay}>
          <Animated.View entering={FadeInDown.duration(300)} style={wm$.card}>
            <LinearGradient colors={['#0a0a0a', '#0a0a0a']} style={wm$.cardInner}>
              <View style={wm$.topGlow} />
              <View style={[wm$.iconCircle, walletState === 'error' && { borderColor: '#FF3B30' }]}>
                <Ionicons
                  name={walletState === 'success_apple' ? 'phone-portrait' : walletState === 'success_google' ? 'card' : 'close-circle'}
                  size={36}
                  color={walletState === 'success_apple' ? '#FFFFFF' : walletState === 'success_google' ? '#4285F4' : '#FF3B30'}
                />
              </View>
              <Text style={[wm$.title, walletState === 'error' && { color: '#FF3B30' }]}>
                {walletState === 'success_apple' ? 'APPLE WALLET' : walletState === 'success_google' ? 'GOOGLE WALLET' : 'ERRORE'}
              </Text>
              <Text style={wm$.subtitle}>
                {walletState === 'success_apple' ? 'KORE CARD GENERATA' : walletState === 'success_google' ? 'LINK WALLET CREATO' : 'GENERAZIONE FALLITA'}
              </Text>
              {walletInfo && (
                <>
                  <View style={wm$.divider} />
                  <View style={wm$.infoRow}>
                    <Text style={wm$.infoLabel}>KORE</Text>
                    <Text style={wm$.infoVal}>{walletInfo.athlete}</Text>
                  </View>
                  <View style={wm$.infoRow}>
                    <Text style={wm$.infoLabel}>KORE #</Text>
                    <Text style={[wm$.infoVal, { color: '#FFD700' }]}>{walletInfo.kore_number}</Text>
                  </View>
                  <View style={wm$.divider} />
                  <Text style={wm$.note}>
                    {walletState === 'success_apple'
                      ? 'File .pkpass generato. Apri su iPhone per aggiungere al Wallet.'
                      : walletState === 'success_google'
                      ? 'Link Google Wallet aperto. Aggiungi il pass al tuo account.'
                      : ''}
                  </Text>
                </>
              )}
              <TouchableOpacity style={wm$.closeBtn} onPress={() => setWalletState('idle')} activeOpacity={0.85}>
                <Text style={wm$.closeTxt}>CHIUDI</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </Animated.View>
  );
}
const kc$ = StyleSheet.create({
  container: { marginBottom: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingBottom: 10 },
  sectionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: -0.5, lineHeight: 18 },
  card: { marginHorizontal: 24, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardInner: { padding: 14, gap: 10 },
  scanLayer: { borderRadius: 20, backgroundColor: '#0a0a0a', zIndex: 0 },
  cardTopGlow: { height: 2, backgroundColor: '#00E5FF', opacity: 0.6, marginHorizontal: -14, marginTop: -14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandSm: { color: '#AAAAAA', fontSize: 10, fontWeight: '800', letterSpacing: 4 },
  cardType: { color: '#00E5FF', fontSize: 17, fontWeight: '900', letterSpacing: 3 },
  founderBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: '#FFD700', flexShrink: 0 },
  founderText: { color: '#FFD700', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  dnaSection: { gap: 5 },
  dnaCap: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '900', letterSpacing: 3, marginBottom: 4 },
  dnaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dnaLabel: { color: '#AAAAAA', fontSize: 13, fontWeight: '900', letterSpacing: 1.5, width: 32 },
  dnaBar: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
  dnaFill: { height: '100%', borderRadius: 2 },
  dnaVal: { fontSize: 14, fontWeight: '900', letterSpacing: 1, width: 26, textAlign: 'right' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  bottomRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  qrBox: { backgroundColor: '#000000', borderRadius: 8, padding: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  rightSide: { flex: 1, gap: 6 },
  bStat: { gap: 1 },
  bStatLabel: { color: '#AAAAAA', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  bStatVal: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  serial: { color: 'rgba(0,229,255,0.45)', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  walletRow: { flexDirection: 'row', gap: 8, marginHorizontal: 24, marginTop: 8 },
  appleBtn: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  googleBtn: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(66,133,244,0.2)' },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12 },
  btnSm: { color: '#AAAAAA', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  btnBig: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
});

// ========== WALLET MODAL STYLES ==========
const wm$ = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: { width: '100%', maxWidth: 380, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardInner: { padding: 24, alignItems: 'center', gap: 12 },
  topGlow: { height: 2, width: '110%', backgroundColor: '#00E5FF', opacity: 0.6, marginHorizontal: -24, marginTop: -24, marginBottom: 8 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'transparent', borderWidth: 2, borderColor: '#00E5FF', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#00E5FF', fontSize: 21, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center', lineHeight: 25 },
  subtitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center', marginTop: -4 },
  divider: { height: 1, width: '100%', backgroundColor: 'rgba(255,255,255,0.06)' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 4 },
  infoLabel: { color: 'rgba(255,255,255,0.70)', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  infoVal: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  note: { color: 'rgba(0,229,255,0.7)', fontSize: 15, fontWeight: '400', letterSpacing: 1, textAlign: 'center' },
  closeBtn: { marginTop: 6, width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  closeTxt: { color: '#00E5FF', fontSize: 16, fontWeight: '400', letterSpacing: 4 },
});

// ========== CITY RANKING — REAL-TIME KORE_SCORE ==========

const MEDAL_CONFIG: Record<number, { icon: string; color: string }> = {
  1: { icon: 'trophy',  color: '#FFD700' },
  2: { icon: 'medal',   color: '#ABABAB' },
  3: { icon: 'ribbon',  color: '#CD7F32' },
};

function CityRanking({
  token, refreshKey, onRankUpdate,
}: {
  token: string;
  refreshKey: number;
  onRankUpdate?: (rank: number | null, score: number | null, city: string) => void;
}) {
  const [city, setCity] = useState('CHICAGO');
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [cityOpen, setCityOpen] = useState(false);

  // ── GPS: read user's detected city from step3 and use it as default
  useEffect(() => {
    AsyncStorage.getItem('@kore_gps_city').then(gpsCity => {
      if (gpsCity && gpsCity.trim()) setCity(gpsCity.trim().toUpperCase());
    });
  }, []);

  const CITY_LIST = [
    'CHICAGO', 'MILANO', 'ROMA', 'TORINO', 'NAPOLI', 'FIRENZE',
    'LONDON', 'PARIS', 'BARCELONA', 'BERLIN', 'NEW YORK', 'TOKYO', 'DUBAI',
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCityRanking(city, token);
      setData(res);
      // ── Notify parent of user's rank/score for the HUD
      if (onRankUpdate) {
        onRankUpdate(res.my_rank ?? null, res.my_kore_score ?? null, city);
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [city, token, refreshKey, onRankUpdate]);

  useEffect(() => { load(); }, [load]);

  return (
    <Animated.View entering={FadeInDown.delay(250)} style={cr$.container} testID="city-ranking-container">
      {/* Section Header */}
      <View style={cr$.sectionRow}>
        <Ionicons name="trophy" size={13} color="#FFD700" />
        <Text style={cr$.title} testID="city-ranking-title">CITY RANKING</Text>
        {/* City Selector */}
        <TouchableOpacity style={cr$.cityBtn} onPress={() => setCityOpen(true)} activeOpacity={0.8}>
          <Ionicons name="location" size={10} color="#00E5FF" />
          <Text style={cr$.cityBtnText}>{city}</Text>
          <Ionicons name="chevron-down" size={10} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      </View>

      {/* City picker modal */}
      <Modal transparent visible={cityOpen} animationType="fade" onRequestClose={() => setCityOpen(false)}>
        <TouchableOpacity style={cr$.backdrop} activeOpacity={1} onPress={() => setCityOpen(false)}>
          <View style={cr$.sheet}>
            <LinearGradient colors={['#0a0a0a', '#0a0a0a']} style={cr$.sheetInner}>
              <Text style={cr$.sheetTitle}>SELEZIONA CITY</Text>
              <View style={cr$.sheetDivider} />
              <ScrollView showsVerticalScrollIndicator={false}>
                {CITY_LIST.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[cr$.cityOption, c === city && cr$.cityOptionActive]}
                    onPress={() => { setCity(c); setCityOpen(false); }}
                  >
                    <Ionicons name="location-outline" size={11} color={c === city ? '#FFD700' : 'rgba(255,255,255,0.3)'} />
                    <Text style={[cr$.cityOptionText, c === city && { color: '#FFD700' }]}>{c}</Text>
                    {c === city && <Ionicons name="checkmark" size={11} color="#FFD700" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Ranking Card */}
      <View style={cr$.card}>
        <LinearGradient colors={['#0a0a0a', '#000000']} style={cr$.cardInner}>
          <View style={cr$.cardTopBar} />

          {loading ? (
            <View style={cr$.loader}><ActivityIndicator color="#FFD700" size="small" /></View>
          ) : !data || data.total_athletes === 0 ? (
            /* ── Empty: first athlete detected — motivate to dominate ── */
            <View style={cr$.empty}>
              <Ionicons name="flame" size={28} color="#FFD700" />
              <Text style={cr$.emptyTitleFirst}>PRIMO KORE{'\n'}RILEVATO A</Text>
              <Text style={cr$.emptyCity}>{city}</Text>
              <Text style={cr$.emptyDominate}>DOMINA IL RANKING</Text>
            </View>
          ) : (
            <>
              {/* Meta row */}
              <View style={cr$.metaRow}>
                <Text style={cr$.metaCity}>{city}</Text>
                <Text style={cr$.metaCount}>{data.total_athletes} KORE</Text>
              </View>

              {/* Top 10 athletes */}
              {(data.top10 || []).map((athlete: any) => {
                const medal = MEDAL_CONFIG[athlete.rank];
                const isMe = athlete.is_me;
                return (
                  <Animated.View
                    key={athlete.user_id}
                    entering={FadeIn.delay(athlete.rank * 60)}
                    style={[cr$.athleteRow, isMe && cr$.athleteRowMe]}
                  >
                    {/* Medal / Rank */}
                    <View style={cr$.medalBox}>
                      {medal ? (
                        <Ionicons name={medal.icon as any} size={16} color={medal.color} />
                      ) : (
                        <Text style={cr$.rankNum}>{athlete.rank}</Text>
                      )}
                    </View>

                    {/* Avatar dot */}
                    <View style={[cr$.avatarDot, { backgroundColor: athlete.avatar_color || '#00E5FF' }]} />

                    {/* Info */}
                    <View style={cr$.athleteInfo}>
                      <View style={cr$.nameRow}>
                        <Text style={[cr$.athleteName, isMe && cr$.athleteNameMe]} numberOfLines={1}>
                          {athlete.username}
                        </Text>
                        {athlete.is_founder && (
                          <View style={cr$.founderPill}>
                            <Ionicons name="star" size={7} color="#FFD700" />
                            <Text style={cr$.founderPillText}>FOUNDER</Text>
                          </View>
                        )}
                        {isMe && (
                          <View style={cr$.mePill}>
                            <Text style={cr$.mePillText}>TU</Text>
                          </View>
                        )}
                      </View>
                      <Text style={cr$.athleteSub}>
                        DNA {athlete.dna_avg} · LVL {athlete.level}
                      </Text>
                    </View>

                    {/* Score */}
                    <View style={cr$.scoreBox}>
                      <Text style={[
                        cr$.scoreVal,
                        athlete.rank === 1 && { color: '#FFD700' },
                        isMe && { color: '#00E5FF' },
                      ]}>
                        {athlete.kore_score}
                      </Text>
                      <Text style={cr$.scoreLabel}>KORE</Text>
                    </View>
                  </Animated.View>
                );
              })}

              {/* My rank if outside top 10 */}
              {data.my_rank && data.my_rank > 10 && (
                <View style={cr$.myRankRow}>
                  <Text style={cr$.myRankText}>
                    LA TUA POSIZIONE: #{data.my_rank} · SCORE: {data.my_kore_score}
                  </Text>
                </View>
              )}
            </>
          )}
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

const cr$ = StyleSheet.create({
  container: { marginHorizontal: 24, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { flex: 1, color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  cityBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'transparent', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  cityBtnText: { color: '#00E5FF', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  // Modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '50%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  sheetInner: { padding: 20, borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 4, marginBottom: 12 },
  sheetDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 8 },
  cityOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 4 },
  cityOptionActive: { backgroundColor: 'rgba(255,215,0,0.05)', borderRadius: 8, paddingHorizontal: 10 },
  cityOptionText: { flex: 1, color: '#AAAAAA', fontSize: 17, fontWeight: '400', letterSpacing: 1.5 },
  // Card
  card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)' },
  cardInner: { paddingBottom: 8 },
  cardTopBar: { height: 2, backgroundColor: '#FFD700', opacity: 0.7, marginBottom: 12 },
  loader: { paddingVertical: 28, alignItems: 'center' },
  empty: { paddingVertical: 28, alignItems: 'center', gap: 8 },
  emptyText: { color: '#AAAAAA', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  // "First athlete" motivating empty state
  emptyTitleFirst: {
    color: '#AAAAAA', fontSize: 13, fontWeight: '900',
    letterSpacing: 3, textAlign: 'center', lineHeight: 18,
  },
  emptyCity: {
    color: '#FFD700', fontSize: 24, fontWeight: '900', letterSpacing: 2,
    textShadowColor: 'rgba(255,215,0,0.7)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  emptyDominate: {
    color: '#00E5FF22', fontSize: 12, fontWeight: '900', letterSpacing: 5,
  },
  // Meta
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 10 },
  metaCity: { color: '#FFD700', fontSize: 15, fontWeight: '900', letterSpacing: 3 },
  metaCount: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '400', letterSpacing: 2 },
  // Athlete row
  athleteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 24, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.65)',
  },
  athleteRowMe: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, borderBottomWidth: 0, marginHorizontal: 6, marginVertical: 2, borderLeftWidth: 3, borderLeftColor: '#00E5FF' },
  medalBox: { width: 24, alignItems: 'center' },
  rankNum: { color: 'rgba(255,255,255,0.3)', fontSize: 16, fontWeight: '400' },
  avatarDot: { width: 8, height: 8, borderRadius: 4 },
  athleteInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  athleteName: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: 1, flexShrink: 1 },
  athleteNameMe: { color: '#00E5FF' },
  founderPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
  founderPillText: { color: '#FFD700', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  mePill: { backgroundColor: 'transparent', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  mePillText: { color: '#00E5FF', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  athleteSub: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '400', letterSpacing: 1 },
  // Score
  scoreBox: { alignItems: 'flex-end', minWidth: 44 },
  scoreVal: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  scoreLabel: { color: '#AAAAAA', fontSize: 10, fontWeight: '400', letterSpacing: 2 },
  // My rank outside top10
  myRankRow: { paddingHorizontal: 24, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#00E5FF22', alignItems: 'center' },
  myRankText: { color: '#00E5FF22', fontSize: 14, fontWeight: '400', letterSpacing: 2 },
});

// ========== FLUX PROGRESS ==========
function XpProgress({ user }: { user: any }) {
  const xp = (user?.xp || 0) as number;
  const xpPerLevel = 500;
  const pct = ((xp % xpPerLevel) / xpPerLevel) * 100;
  const remaining = xpPerLevel - (xp % xpPerLevel);
  const barAnim = useSharedValue(0);
  useEffect(() => { barAnim.value = withTiming(pct / 100, { duration: 1200 }); }, [pct]);
  const barStyle = useAnimatedStyle(() => ({ width: `${barAnim.value * 100}%` as any }));

  return (
    <Animated.View entering={FadeInDown.delay(450)} style={xp$.container}>
      <View style={xp$.header}>
        <Ionicons name="flash" size={13} color="#FFD700" />
        <Text style={xp$.title}>FLUX PROGRESSION</Text>
        <Text style={xp$.lvl}>LVL {user?.level || 1}</Text>
      </View>
      <View style={xp$.barBg}><Animated.View style={[xp$.barFill, barStyle]} /></View>
      <View style={xp$.meta}>
        <Text style={xp$.current}>{xp.toLocaleString()} FLUX</Text>
        <Text style={xp$.next}>{remaining} AL PROSSIMO LVL</Text>
      </View>
    </Animated.View>
  );
}
const xp$ = StyleSheet.create({
  container: { marginHorizontal: 24, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { flex: 1, color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  lvl: { color: '#FFD700', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  barBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 3 },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  current: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  next: { color: '#AAAAAA', fontSize: 11, fontWeight: '700' },
});


// ── BIO-SCAN STATUS CARD
function BioScanStatusCard({ user, router }: { user: any; router: any }) {
  const lastScan = user?.baseline_scanned_at ? new Date(user.baseline_scanned_at) : null;
  const daysSince = lastScan ? Math.floor((Date.now() - lastScan.getTime()) / 86400000) : 999;
  const needsRescan = daysSince > 7;
  return (
    <Animated.View entering={FadeInDown.delay(120)} style={bsc$.card}>
      <View style={bsc$.row}>
        <Ionicons name="scan-circle" size={20} color={needsRescan ? '#FF3B30' : '#00E5FF'} />
        <View style={bsc$.info}>
          <Text style={bsc$.label}>BIO-SCAN STATUS</Text>
          <Text style={[bsc$.status, needsRescan && { color: '#FF3B30' }]}>
            {lastScan ? (needsRescan ? `${daysSince} GIORNI FA — SCADUTO` : 'CALIBRAZIONE RECENTE') : 'MAI ESEGUITO'}
          </Text>
        </View>
        <TouchableOpacity
          style={[bsc$.btn, needsRescan && bsc$.btnRed]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(()=>{});
            if (needsRescan) {
              router.push('/onboarding/step2');
            } else {
              Share.share({
                message: `Ecco il mio KORE ID su ARENAKORE. Pensi di potermi battere?\n\nhttps://arenakore.app`,
                title: 'ARENAKORE — KORE ID',
              }).catch(() => {});
            }
          }}
          activeOpacity={0.85}
        >
          <Text style={bsc$.btnText}>{needsRescan ? 'RECALIBRATE DNA' : 'SHARE KORE ID'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── OFFERTE SCOUT (Incoming Draft Invitations) ────────────────────────────────
function OfferteScout({ token, refreshUser }: { token: string | null; refreshUser: () => Promise<void> }) {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.getReceivedDrafts(token)
      .then(d => setDrafts((d.drafts || []).filter((dr: any) => dr.status === 'pending')))
      .catch(() => {});
  }, [token]);

  if (!drafts.length) return null;

  const handleRespond = async (draftId: string, action: 'accept' | 'decline') => {
    if (!token) return;
    setResponding(draftId);
    try {
      await api.respondToTalentDraft(draftId, action, token);
      setDrafts(prev => prev.filter(d => d.draft_id !== draftId));
      if (action === 'accept') await refreshUser();
    } catch (_) {}
    finally { setResponding(null); }
  };

  return (
    <Animated.View entering={FadeInDown.duration(350)} style={os$.section}>
      <View style={os$.header}>
        <Ionicons name="star" size={13} color="#FFD700" />
        <Text style={os$.title}>OFFERTE SCOUT</Text>
        <View style={os$.countPill}><Text style={os$.countText}>{drafts.length}</Text></View>
      </View>
      {drafts.map(d => (
        <View key={d.draft_id} style={os$.card}>
          <View style={[os$.coachAvatar, { backgroundColor: d.coach_avatar_color || '#FFD700' }]}>
            <Text style={os$.coachAvatarLetter}>{(d.coach_username || '?')[0].toUpperCase()}</Text>
          </View>
          <View style={os$.info}>
            <Text style={os$.coachName}>🔥 SCOUT ALERT</Text>
            <Text style={os$.message}>Il Coach <Text style={{ color: '#FFD700', fontWeight: '900' }}>{d.coach_username?.toUpperCase()}</Text> ti ha inserito nel suo Radar. Visualizza la proposta.</Text>
          </View>
          <View style={os$.actions}>
            <TouchableOpacity style={os$.acceptBtn} onPress={() => handleRespond(d.draft_id, 'accept')} disabled={responding === d.draft_id}>
              {responding === d.draft_id ? <ActivityIndicator color="#000" size="small" /> : <Text style={os$.acceptText}>ACCETTA</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={os$.declineBtn} onPress={() => handleRespond(d.draft_id, 'decline')} disabled={responding === d.draft_id}>
              <Text style={os$.declineText}>Rifiuta</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const os$ = StyleSheet.create({
  section: { marginHorizontal: 24, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { flex: 1, color: '#FFD700', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  countPill: { backgroundColor: '#FFD700', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { color: '#000', fontSize: 13, fontWeight: '900' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)', marginBottom: 8 },
  coachAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  coachAvatarLetter: { color: '#000', fontSize: 18, fontWeight: '900' },
  info: { flex: 1, gap: 3 },
  coachName: { color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  message: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '300', lineHeight: 15 },
  actions: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  acceptBtn: { backgroundColor: '#00E5FF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', minWidth: 60 },
  acceptText: { color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  declineBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  declineText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '400' },
});

// ── SCOUT VISIBILITY TOGGLE ──────────────────────────────────────────────────
function ScoutVisibilityToggle({ user, token, refreshUser }: { user: any; token: string | null; refreshUser: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const isVisible = user?.scout_visible !== false;
  const isCertified = !!(user?.onboarding_completed && user?.baseline_scanned_at && user?.dna);
  const toggle = async () => {
    if (!token) return;
    setLoading(true);
    try { await api.toggleScoutVisibility(!isVisible, token); await refreshUser(); }
    catch (_) {} finally { setLoading(false); }
  };
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={sv$.card}>
      <View style={sv$.left}>
        <Ionicons name={isVisible ? 'eye' : 'eye-off'} size={18} color={isVisible ? '#00E5FF' : 'rgba(255,255,255,0.35)'} />
        <View style={{ flex: 1 }}>
          <Text style={sv$.title}>VISIBILE AGLI SCOUT</Text>
          <Text style={sv$.sub} numberOfLines={2}>{isVisible ? (isCertified ? '✓ Profilo scoutable — ti vedono i Coach' : '⚠ Non certificato — completa il NÈXUS Scan') : '✗ Nascosto — non appari nelle ricerche Scout'}</Text>
        </View>
      </View>
      <TouchableOpacity style={[sv$.toggle, isVisible ? sv$.toggleOn : sv$.toggleOff]} onPress={toggle} disabled={loading} activeOpacity={0.8}>
        {loading ? <ActivityIndicator color={isVisible ? '#000' : 'rgba(255,255,255,0.5)'} size="small" /> : <View style={[sv$.knob, isVisible && sv$.knobOn]} />}
      </TouchableOpacity>
    </Animated.View>
  );
}
const sv$ = StyleSheet.create({
  card: { marginHorizontal: 24, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 12 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  sub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '300', marginTop: 2, lineHeight: 15 },
  toggle: { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center', alignItems: 'center' },
  toggleOn: { backgroundColor: '#00E5FF' },
  toggleOff: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.4)', position: 'absolute', left: 3 },
  knobOn: { backgroundColor: '#000000', position: 'absolute', right: 3, left: 'auto' as any },
});

// ── GOALS SECTION — Icon Badges
function GoalsSection({ user }: { user: any }) {
  const xp = user?.xp || 0;
  const level = user?.level || 1;
  const xpToNext = level * 500;
  const xpProgress = Math.min(1, (xp % xpToNext) / xpToNext);
  const dnaAvg = user?.dna
    ? Math.round(Object.values(user.dna as Record<string, number>).reduce((a: number, b: number) => a + b, 0) / 6)
    : 0;

  const badges = [
    { icon: 'trophy', label: 'LVL ' + (level + 1), done: xpProgress >= 1, pct: Math.round(xpProgress * 100), color: '#FFD700' },
    { icon: 'location', label: 'TOP 10 CITY', done: xp >= 8000, pct: Math.min(100, Math.round(xp / 80)), color: '#00E5FF' },
    { icon: 'analytics', label: 'DNA 90+', done: dnaAvg >= 90, pct: Math.min(100, Math.round(dnaAvg / 0.9)), color: '#AF52DE' },
    { icon: 'flash', label: 'SCAN COMPLETO', done: !!(user?.dna), pct: user?.dna ? 100 : 0, color: '#FF9500' },
  ];

  return (
    <Animated.View entering={FadeInDown.delay(200)} style={goals$.card}>
      <Text style={goals$.title}>OBIETTIVI</Text>
      <View style={goals$.grid}>
        {badges.map((b, i) => (
          <View key={i} style={[goals$.badge, b.done && goals$.badgeDone]}>
            <Ionicons
              name={b.done ? 'checkmark-circle' : b.icon as any}
              size={20}
              color={b.done ? b.color : 'rgba(255,255,255,0.25)'}
            />
            <Text style={[goals$.badgeLabel, b.done && { color: b.color }]}>{b.label}</Text>
            {!b.done && <Text style={goals$.badgePct}>{b.pct}%</Text>}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ========== MAIN KORE TAB ==========
export default function KoreTab() {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();
  const [rankData, setRankData] = useState<any>(null);
  const [affiliData, setAffiliData] = useState<any>(null);
  const [actionData, setActionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [city, setCity] = useState('MILANO');
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0);
  const [koreIdVisible, setKoreIdVisible] = useState(false);

  // ── MY POSITION HUD state (set by CityRanking via callback)
  const [myHudRank,  setMyHudRank]  = useState<number | null>(null);
  const [myHudScore, setMyHudScore] = useState<number | null>(null);
  const [myHudCity,  setMyHudCity]  = useState<string>('CHICAGO');

  const insets = useSafeAreaInsets();

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [rank, affili, action] = await Promise.all([
        api.getCityRank(city, token).catch(() => null),
        api.getAffiliations(token).catch(() => null),
        api.getActionCenter(token).catch(() => null),
      ]);
      setRankData(rank);
      setAffiliData(affili);
      setActionData(action);
    } catch (_e) { /* silently handle */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, city]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Real-time refresh on tab focus (triggers CityRanking reload after scan)
  useFocusEffect(
    useCallback(() => {
      setRankingRefreshKey(k => k + 1);
    }, [])
  );

  const handleCitySelect = (newCity: string) => {
    setCity(newCity);
    // Rank will auto-reload because city is in loadData dependency
  };

  return (
    <ImageBackground source={{ uri: TAB_BACKGROUNDS.kore }} style={s.container} imageStyle={{ opacity: 0.10, resizeMode: 'cover' }}>
      <StatusBar barStyle="light-content" />
      <Header title="KORE" />
      {loading ? (
        <View style={s.center}><ActivityIndicator color="#00E5FF" size="large" /></View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); setRankingRefreshKey(k => k + 1); }} tintColor="#00E5FF" />}
            contentContainerStyle={{ paddingBottom: myHudRank && myHudRank > 10 ? 130 : 100 }}
          >
            {/* 1. KORE ID CARD */}
            <PassportHeader user={user} />

            {/* KORE ID — Visualizza il tuo QR Code identificativo */}
            <Animated.View entering={FadeInDown.delay(50)} style={kid$.wrap}>
              <TouchableOpacity
                style={kid$.btn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); setKoreIdVisible(true); }}
                activeOpacity={0.85}
              >
                <View style={kid$.iconBox}>
                  <Ionicons name="qr-code" size={16} color="#00E5FF" />
                </View>
                <View style={kid$.txtBox}>
                  <Text style={kid$.btnLabel}>VISUALIZZA KORE ID</Text>
                  <Text style={kid$.btnSub}>QR Code · Identità · Rank</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="rgba(0,229,255,0.4)" />
              </TouchableOpacity>
            </Animated.View>

            {/* BIO-SCAN STATUS */}
          <BioScanStatusCard user={user} router={router} />

          {/* GOALS */}
          <GoalsSection user={user} />
          {/* FLUX Wallet — locked for Fast Entry */}
          <AKDropsWallet user={user} />
          {/* OFFERTE SCOUT — incoming draft invitations */}
          <OfferteScout token={token} refreshUser={refreshUser} />
          {/* Scout Visibility Toggle */}
          <ScoutVisibilityToggle user={user} token={token} refreshUser={refreshUser} />
          <KoreVault />

          {/* 2. RANK INFOGRAPHIC */}
            <RankInfographic rankData={rankData} city={city} onCitySelect={handleCitySelect} />

            {/* 3. CITY RANKING — Real-Time KORE_SCORE */}
            {token && (
              <CityRanking
                token={token}
                refreshKey={rankingRefreshKey}
                onRankUpdate={(rank, score, c) => {
                  setMyHudRank(rank);
                  setMyHudScore(score);
                  setMyHudCity(c);
                }}
              />
            )}

            {/* 4. AFFILIATIONS */}
            <Affiliations affiliData={affiliData} token={token || ''} onRefresh={loadData} />

            {/* 5. ACTION CENTER */}
            <ActionCenter actionData={actionData} />

            {/* 6. KORE CARD + WALLET */}
            <KoreCard user={user} rankData={rankData} />

            {/* 6.5 TRUST BREAKDOWN — Validation Methods */}
            <ValidationBreakdown />

            {/* 6.7 HEALTH HUB — External Connectivity */}
            <Animated.View entering={FadeInDown.delay(450)} style={ps$.wrap}>
              <TouchableOpacity style={[ps$.btn, { borderColor: 'rgba(255,149,0,0.15)' }]} onPress={() => router.push('/settings/health-hub')} activeOpacity={0.8}>
                <Ionicons name="pulse" size={14} color="#FF9500" />
                <Text style={[ps$.txt, { color: '#FF9500' }]}>HEALTH HUB</Text>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600', flex: 1 }}>Dispositivi e servizi</Text>
                <Ionicons name="chevron-forward" size={12} color="rgba(255,149,0,0.4)" />
              </TouchableOpacity>
            </Animated.View>

            {/* 7. PRIVACY SHIELD */}
            <Animated.View entering={FadeInDown.delay(500)} style={ps$.wrap}>
              <TouchableOpacity style={ps$.btn} onPress={() => router.push('/settings/shield')} activeOpacity={0.8}>
                <Ionicons name="shield-checkmark" size={14} color="#00E5FF" />
                <Text style={ps$.txt}>PRIVACY SHIELD</Text>
                <Ionicons name="chevron-forward" size={12} color="rgba(0,229,255,0.4)" />
              </TouchableOpacity>
            </Animated.View>

            {/* 8. FLUX PROGRESS */}
            <XpProgress user={user} />
          </ScrollView>

          {/* ── MY POSITION HUD: fixed bottom bar when outside top 10 ── */}
          {myHudRank !== null && myHudRank > 10 && (
            <Animated.View
              entering={FadeInDown.duration(400)}
              style={[hud$.bar, { paddingBottom: insets.bottom + 8 }]}
            >
              <View style={hud$.inner}>
                <View style={hud$.col}>
                  <Ionicons name="location" size={10} color="#00E5FF" />
                  <Text style={hud$.city}>{myHudCity}</Text>
                </View>
                <View style={[hud$.col, { flex: 1 }]}>
                  <Text style={hud$.label}>LA TUA POSIZIONE</Text>
                  <Text style={hud$.rank}>#{myHudRank} <Text style={hud$.rankSub}>— SCORE: {myHudScore}</Text></Text>
                </View>
                <View style={hud$.col}>
                  <Text style={hud$.hint}>FATTI UNO{'\n'}SCAN</Text>
                  <Ionicons name="arrow-up-circle" size={16} color="#FFD700" />
                </View>
              </View>
            </Animated.View>
          )}
        </>
      )}
      <KoreIDModal visible={koreIdVisible} onClose={() => setKoreIdVisible(false)} />
    </ImageBackground>  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

// Privacy Shield link styles
const ps$ = StyleSheet.create({
  wrap: { marginHorizontal: 24, marginBottom: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'transparent', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  txt: { flex: 1, color: 'rgba(0,229,255,0.7)', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
});

// MY POSITION HUD — fixed bottom bar
const hud$ = StyleSheet.create({
  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(5,5,5,0.96)',
    borderTopWidth: 1.5, borderTopColor: 'rgba(0,229,255,0.2)',
    paddingTop: 12, paddingHorizontal: 24,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  col: { alignItems: 'center', gap: 2 },
  city: { color: '#00E5FF', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  label: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  rank: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  rankSub: { color: '#00E5FF22', fontSize: 14, fontWeight: '700' },
  score: { color: '#FFD700', fontSize: 18, fontWeight: '900' },
  hint: { color: 'rgba(255,215,0,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
});

const bsc$ = StyleSheet.create({
  card: { marginHorizontal: 24, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1, gap: 3 },
  label: { color: '#AAAAAA', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  status: { color: '#00E5FF', fontSize: 15, fontWeight: '700' },
  btn: { backgroundColor: '#00E5FF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  btnRed: { backgroundColor: '#FF3B30' },
  btnText: { color: '#000000', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
});

const goals$ = StyleSheet.create({
  card: { marginHorizontal: 24, marginBottom: 10, backgroundColor: 'rgba(255,215,0,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)' },
  title: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900', letterSpacing: 4, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { flex: 1, minWidth: '44%', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  badgeDone: { borderColor: 'rgba(255,215,0,0.15)', backgroundColor: 'rgba(255,215,0,0.04)' },
  badgeLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  badgePct: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '300', letterSpacing: 1 },
});


// KORE ID Button styles
const kid$ = StyleSheet.create({
  wrap: { marginHorizontal: 24, marginBottom: 8 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(0,229,255,0.04)', borderRadius: 14,
    padding: 14, borderWidth: 1.5, borderColor: 'rgba(0,229,255,0.15)',
  },
  iconBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(0,229,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  txtBox: { flex: 1, gap: 2 },
  btnLabel: { color: '#00E5FF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  btnSub: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '500', letterSpacing: 0.5 },
});