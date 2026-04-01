/**
 * COACH STUDIO — TALENT SCOUT
 * DNA-Relative Discovery: identifica atleti con alto potenziale biometrico relativo.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { MiniRadar, SectionHeader } from '../../components/studio/StudioComponents';

const TIER_CFG: Record<string, { color: string; bg: string; icon: string }> = {
  ELITE:  { color: '#D4AF37', bg: 'rgba(212,175,55,0.12)', icon: '👑' },
  PRO:    { color: '#00F2FF', bg: 'rgba(0,242,255,0.08)',  icon: '⭐' },
  RISING: { color: '#34C759', bg: 'rgba(52,199,89,0.08)',  icon: '🔥' },
  SCOUT:  { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)', icon: '🔍' },
};

export default function TalentScout() {
  const { token } = useAuth();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ city: '', sport: '', minDna: '', sortBy: 'relative_score' });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [discovery, myDrafts] = await Promise.all([
        api.getTalentDiscovery(token, {
          city: filters.city || undefined,
          sport: filters.sport || undefined,
          minDna: filters.minDna ? Number(filters.minDna) : undefined,
          sortBy: filters.sortBy,
        }),
        api.getMyDrafts(token),
      ]);
      setAthletes(discovery.athletes || []);
      setDrafts(myDrafts.drafts || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, [token, filters.city, filters.sport, filters.minDna, filters.sortBy]);

  useEffect(() => { load(); }, [load]);

  const handleDraft = async (athlete: any) => {
    if (!token) return;
    if (athlete.already_drafted) return;
    setDraftingId(athlete.id);
    try {
      await api.draftAthlete(athlete.id, token);
      Alert.alert('DRAFTATO', `${athlete.username} ha ricevuto la tua richiesta di coaching remoto.`);
      load();
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Impossibile draftare');
    } finally { setDraftingId(null); }
  };

  return (
    <ScrollView style={t$.root} contentContainerStyle={t$.content}>
      {/* Header */}
      <View style={t$.header}>
        <View>
          <Text style={t$.pageTitle}>TALENT SCOUT</Text>
          <Text style={t$.pageSub}>DNA-Relative Discovery · Individua i diamanti grezzi del talento biometrico</Text>
        </View>
        <View style={t$.draftCount}>
          <Text style={t$.draftCountVal}>{drafts.length}</Text>
          <Text style={t$.draftCountLabel}>DRAFT</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={t$.filters}>
        {[
          { key: 'city', placeholder: 'Filtra per città (es. MILANO)', icon: 'location' },
          { key: 'sport', placeholder: 'Filtra per sport (es. Atletica)', icon: 'barbell' },
          { key: 'minDna', placeholder: 'Min DNA (es. 70)', icon: 'analytics' },
        ].map(f => (
          <View key={f.key} style={t$.filterWrap}>
            <Ionicons name={f.icon as any} size={13} color="rgba(255,255,255,0.3)" />
            <TextInput
              style={t$.filterInput}
              placeholder={f.placeholder}
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={filters[f.key as keyof typeof filters]}
              onChangeText={v => setFilters(prev => ({ ...prev, [f.key]: v }))}
              onSubmitEditing={load}
            />
          </View>
        ))}
        {/* Sort selector */}
        <View style={t$.sortRow}>
          {[
            { val: 'relative_score', label: 'POTENZIALE' },
            { val: 'dna_avg', label: 'DNA' },
            { val: 'level', label: 'LVL' },
          ].map(s => (
            <TouchableOpacity
              key={s.val}
              style={[t$.sortBtn, filters.sortBy === s.val && t$.sortBtnActive]}
              onPress={() => setFilters(prev => ({ ...prev, sortBy: s.val }))}
            >
              <Text style={[t$.sortText, filters.sortBy === s.val && { color: '#D4AF37' }]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={t$.legend}>
        <Text style={t$.legendTitle}>DNA-RELATIVE SCORE</Text>
        <Text style={t$.legendDesc}>Score che premia atleti con alto DNA biometrico rispetto al loro livello. Un atleta LVL 3 con DNA 78 batte un LVL 10 con DNA 78 — è più "diamante grezzo".</Text>
        <View style={t$.tierRow}>
          {Object.entries(TIER_CFG).map(([tier, cfg]) => (
            <View key={tier} style={[t$.tierPill, { backgroundColor: cfg.bg, borderColor: cfg.color + '50' }]}>
              <Text>{cfg.icon}</Text>
              <Text style={[t$.tierLabel, { color: cfg.color }]}>{tier}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Athlete Table */}
      <View style={t$.table}>
        {/* Header */}
        <View style={t$.tableHeader}>
          <Text style={[t$.th, { flex: 1 }]}>ATLETA</Text>
          <Text style={t$.th}>DNA</Text>
          <Text style={t$.th}>SCORE</Text>
          <Text style={t$.th}>TIER</Text>
          <Text style={t$.th}>LVL</Text>
          <View style={{ width: 80 }} />
        </View>

        {loading ? (
          <View style={t$.loadRow}><ActivityIndicator color="#D4AF37" size="small" /></View>
        ) : athletes.length === 0 ? (
          <View style={t$.emptyRow}>
            <Ionicons name="search-outline" size={24} color="rgba(255,255,255,0.1)" />
            <Text style={t$.emptyText}>Nessun atleta trovato con questi filtri</Text>
          </View>
        ) : athletes.map((ath, idx) => {
          const tier = TIER_CFG[ath.talent_tier] || TIER_CFG.SCOUT;
          const isDrafting = draftingId === ath.id;
          return (
            <Animated.View key={ath.id} entering={FadeInDown.delay(idx * 30).duration(200)} style={t$.row}>
              {/* Rank */}
              <Text style={t$.rowRank}>#{idx + 1}</Text>
              {/* Avatar + name */}
              <View style={t$.rowAthlete}>
                <View style={[t$.rowAvatar, { backgroundColor: ath.avatar_color || '#00F2FF' }]}>
                  <Text style={t$.rowAvatarLetter}>{(ath.username || '?')[0].toUpperCase()}</Text>
                </View>
                <View style={t$.rowInfo}>
                  <Text style={t$.rowName}>{ath.username}</Text>
                  <Text style={t$.rowMeta}>{ath.city} · {ath.sport}</Text>
                </View>
                {/* Mini radar */}
                <MiniRadar dna={ath.dna} color={tier.color} size={42} />
              </View>
              {/* DNA */}
              <Text style={[t$.rowDna, { color: ath.dna_avg >= 80 ? '#D4AF37' : '#FFFFFF' }]}>{ath.dna_avg}</Text>
              {/* Relative score */}
              <Text style={[t$.rowScore, { color: tier.color }]}>{ath.relative_score}</Text>
              {/* Tier */}
              <View style={[t$.rowTier, { backgroundColor: tier.bg }]}>
                <Text>{tier.icon}</Text>
                <Text style={[t$.rowTierText, { color: tier.color }]}>{ath.talent_tier}</Text>
              </View>
              {/* Level */}
              <Text style={t$.rowLevel}>LVL {ath.level}</Text>
              {/* Draft button */}
              <TouchableOpacity
                style={[t$.draftBtn, ath.already_drafted && t$.draftBtnDone]}
                onPress={() => handleDraft(ath)}
                disabled={ath.already_drafted || isDrafting}
                activeOpacity={0.8}
              >
                {isDrafting ? <ActivityIndicator color="#000" size="small" /> : (
                  <>
                    <Ionicons name={ath.already_drafted ? 'checkmark-circle' : 'person-add'} size={12} color={ath.already_drafted ? '#34C759' : '#000'} />
                    <Text style={[t$.draftBtnText, ath.already_drafted && { color: '#34C759' }]}>
                      {ath.already_drafted ? 'DRAFTED' : 'DRAFT'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* My Drafts */}
      {drafts.length > 0 && (
        <View style={t$.draftsSection}>
          <SectionHeader title="IL MIO TEAM REMOTO" sub={`${drafts.length} atleti draftati`} />
          {drafts.map(d => (
            <View key={d.draft_id} style={t$.draftRow}>
              <View style={[t$.draftAvatar, { backgroundColor: '#D4AF37' }]}>
                <Text style={t$.draftAvatarLetter}>{(d.username || '?')[0]}</Text>
              </View>
              <View style={t$.draftInfo}>
                <Text style={t$.draftName}>{d.username}</Text>
                <Text style={t$.draftMeta}>{d.city} · DNA {d.dna_avg} · Relative {d.relative_score}</Text>
              </View>
              <View style={[t$.draftStatus, { borderColor: d.status === 'accepted' ? '#34C759' : 'rgba(255,149,0,0.4)' }]}>
                <Text style={[t$.draftStatusText, { color: d.status === 'accepted' ? '#34C759' : '#FF9500' }]}>
                  {d.status?.toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const t$ = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' }, content: { padding: 28, gap: 18, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pageTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 4 },
  pageSub: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '300', marginTop: 3, maxWidth: 400 },
  draftCount: { alignItems: 'center', backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)' },
  draftCountVal: { color: '#D4AF37', fontSize: 24, fontWeight: '900' },
  draftCountLabel: { color: 'rgba(212,175,55,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  filterWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0A0A0A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#1E1E1E' },
  filterInput: { color: '#FFF', fontSize: 12, width: 150, outlineStyle: 'none' } as any,
  sortRow: { flexDirection: 'row', gap: 6 },
  sortBtn: { borderWidth: 1, borderColor: '#1E1E1E', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  sortBtnActive: { borderColor: 'rgba(212,175,55,0.5)', backgroundColor: 'rgba(212,175,55,0.06)' },
  sortText: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  legend: { backgroundColor: '#0A0A0A', borderRadius: 12, padding: 14, gap: 8, borderWidth: 1, borderColor: '#1E1E1E' },
  legendTitle: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  legendDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '300', lineHeight: 16 },
  tierRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tierPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tierLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  table: { backgroundColor: '#0A0A0A', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1E1E1E' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  th: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '900', letterSpacing: 2, width: 60, textAlign: 'center' },
  loadRow: { alignItems: 'center', paddingVertical: 30 },
  emptyRow: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#111' },
  rowRank: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '900', width: 24, textAlign: 'center' },
  rowAthlete: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rowAvatarLetter: { color: '#000', fontSize: 13, fontWeight: '900' },
  rowInfo: { flex: 1 },
  rowName: { color: '#FFF', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  rowMeta: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '300' },
  rowDna: { width: 40, fontSize: 13, fontWeight: '900', textAlign: 'center' },
  rowScore: { width: 50, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  rowTier: { width: 70, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, justifyContent: 'center' },
  rowTierText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  rowLevel: { width: 40, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '400', textAlign: 'center' },
  draftBtn: { width: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#D4AF37', borderRadius: 8, paddingVertical: 7 },
  draftBtnDone: { backgroundColor: 'rgba(52,199,89,0.08)', borderWidth: 1, borderColor: 'rgba(52,199,89,0.3)' },
  draftBtnText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  draftsSection: { gap: 10 },
  draftRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0A0A0A', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#1E1E1E' },
  draftAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  draftAvatarLetter: { color: '#000', fontSize: 14, fontWeight: '900' },
  draftInfo: { flex: 1 },
  draftName: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  draftMeta: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '300', marginTop: 2 },
  draftStatus: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  draftStatusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
});
