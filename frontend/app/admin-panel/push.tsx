/**
 * ARENAKORE — PUSH NOTIFICATION CENTER
 * Compose and send targeted push campaigns.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/api';

const FM = Platform.select({ web: "'Montserrat', sans-serif", default: undefined });

export default function PushCenter() {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterMinLevel, setFilterMinLevel] = useState('');
  const [filterMaxLevel, setFilterMaxLevel] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterCrew, setFilterCrew] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/push/history', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setHistory(d.campaigns);
      }
    } catch (e) {}
    setLoadingHistory(false);
  }, [token]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      if (Platform.OS === 'web') alert('Titolo e messaggio obbligatori');
      else Alert.alert('Errore', 'Titolo e messaggio obbligatori');
      return;
    }
    setSending(true);
    try {
      const res = await apiFetch('/api/admin/push', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          filter_city: filterCity.trim(),
          filter_min_level: parseInt(filterMinLevel) || 0,
          filter_max_level: parseInt(filterMaxLevel) || 99,
          filter_role: filterRole,
          filter_crew: filterCrew.trim(),
        }),
      });
      if (res.ok) {
        const d = await res.json();
        const msg = `Inviata! Target: ${d.target_count}, Inviate: ${d.sent_count}, Fallite: ${d.failed_count}`;
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Campagna Inviata', msg);
        setTitle(''); setBody('');
        loadHistory();
      }
    } catch (e) { console.error(e); }
    setSending(false);
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>PUSH CENTER</Text>
      <Text style={s.sub}>Invia notifiche push mirate agli utenti ARENAKORE</Text>

      {/* Composer */}
      <View style={s.composer}>
        <Text style={s.sectionTitle}>NUOVA CAMPAGNA</Text>
        
        <Text style={s.label}>TITOLO</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="es. Nuova Challenge Disponibile!" placeholderTextColor="rgba(255,255,255,0.15)" />
        
        <Text style={s.label}>MESSAGGIO</Text>
        <TextInput style={[s.input, s.textarea]} value={body} onChangeText={setBody} placeholder="Corpo della notifica..." placeholderTextColor="rgba(255,255,255,0.15)" multiline numberOfLines={3} />

        <Text style={s.filterTitle}>FILTRI TARGET</Text>
        <View style={s.filterGrid}>
          <View style={s.filterItem}>
            <Text style={s.filterLabel}>CITTÀ</Text>
            <TextInput style={s.filterInput} value={filterCity} onChangeText={setFilterCity} placeholder="Tutte" placeholderTextColor="rgba(255,255,255,0.15)" />
          </View>
          <View style={s.filterItem}>
            <Text style={s.filterLabel}>LVL MIN</Text>
            <TextInput style={s.filterInput} value={filterMinLevel} onChangeText={setFilterMinLevel} placeholder="0" placeholderTextColor="rgba(255,255,255,0.15)" keyboardType="numeric" />
          </View>
          <View style={s.filterItem}>
            <Text style={s.filterLabel}>LVL MAX</Text>
            <TextInput style={s.filterInput} value={filterMaxLevel} onChangeText={setFilterMaxLevel} placeholder="99" placeholderTextColor="rgba(255,255,255,0.15)" keyboardType="numeric" />
          </View>
          <View style={s.filterItem}>
            <Text style={s.filterLabel}>CREW</Text>
            <TextInput style={s.filterInput} value={filterCrew} onChangeText={setFilterCrew} placeholder="Tutte" placeholderTextColor="rgba(255,255,255,0.15)" />
          </View>
        </View>

        <Text style={s.filterLabel}>RUOLO</Text>
        <View style={s.roleFilters}>
          {['all', 'ATHLETE', 'COACH', 'GYM_OWNER'].map(r => (
            <TouchableOpacity key={r} style={[s.roleBtn, filterRole === r && s.roleBtnActive]} onPress={() => setFilterRole(r)}>
              <Text style={[s.roleBtnText, filterRole === r && s.roleBtnTextActive]}>
                {r === 'all' ? 'TUTTI' : r === 'ATHLETE' ? 'ATLETI' : r === 'COACH' ? 'COACH' : 'GYM OWNER'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.sendBtn} onPress={handleSend} disabled={sending} activeOpacity={0.7}>
          {sending ? <ActivityIndicator color="#FFF" /> : (
            <><Ionicons name="send" size={18} color="#FFF" />
            <Text style={s.sendText}>INVIA CAMPAGNA</Text></>
          )}
        </TouchableOpacity>
      </View>

      {/* History */}
      <View style={s.historySection}>
        <Text style={s.sectionTitle}>STORICO CAMPAGNE</Text>
        {loadingHistory ? <ActivityIndicator color="#FF2D55" /> : (
          history.length === 0 ? <Text style={s.empty}>Nessuna campagna inviata</Text> :
          history.map((c, i) => (
            <View key={c._id} style={s.histCard}>
              <View style={s.histHeader}>
                <Text style={s.histTitle}>{c.title}</Text>
                <Text style={s.histDate}>{new Date(c.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <Text style={s.histBody}>{c.body}</Text>
              <View style={s.histStats}>
                <StatPill label="TARGET" value={c.target_count} color="#00E5FF" />
                <StatPill label="INVIATE" value={c.sent_count} color="#30D158" />
                <StatPill label="FALLITE" value={c.failed_count} color="#FF453A" />
              </View>
              {c.filters && (c.filters.city || c.filters.crew || c.filters.role !== 'all') && (
                <View style={s.histFilters}>
                  {c.filters.city ? <Text style={s.histFilter}>Città: {c.filters.city}</Text> : null}
                  {c.filters.crew ? <Text style={s.histFilter}>Crew: {c.filters.crew}</Text> : null}
                  {c.filters.role !== 'all' ? <Text style={s.histFilter}>Ruolo: {c.filters.role}</Text> : null}
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[ps.pill, { borderColor: `${color}30` }]}>
      <Text style={[ps.val, { color }]}>{value}</Text>
      <Text style={ps.label}>{label}</Text>
    </View>
  );
}
const ps = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  val: { fontSize: 14, fontWeight: '900', fontFamily: FM },
  label: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '700', letterSpacing: 1, fontFamily: FM },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { padding: 32 },
  title: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 4, fontFamily: FM },
  sub: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '500', marginTop: 4, marginBottom: 24, fontFamily: FM },
  sectionTitle: { color: '#FF2D55', fontSize: 13, fontWeight: '900', letterSpacing: 3, marginBottom: 16, fontFamily: FM },
  composer: { backgroundColor: '#151515', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', marginBottom: 32 },
  label: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6, marginTop: 12, fontFamily: FM },
  input: { backgroundColor: '#0A0A0A', borderRadius: 10, padding: 14, color: '#FFF', fontSize: 14, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', fontFamily: FM },
  textarea: { minHeight: 80, textAlignVertical: 'top' as const },
  filterTitle: { color: '#FFD700', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginTop: 20, marginBottom: 12, fontFamily: FM },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  filterItem: { width: 170 },
  filterLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4, fontFamily: FM },
  filterInput: { backgroundColor: '#0A0A0A', borderRadius: 8, padding: 10, color: '#FFF', fontSize: 12, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', fontFamily: FM },
  roleFilters: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 20 },
  roleBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)' },
  roleBtnActive: { backgroundColor: 'rgba(255,45,85,0.15)', borderWidth: 1, borderColor: 'rgba(255,45,85,0.3)' },
  roleBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1, fontFamily: FM },
  roleBtnTextActive: { color: '#FF2D55' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FF2D55', paddingVertical: 16, borderRadius: 12, marginTop: 8 },
  sendText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 2, fontFamily: FM },
  historySection: { marginTop: 8 },
  empty: { color: 'rgba(255,255,255,0.2)', fontSize: 13, fontStyle: 'italic', fontFamily: FM },
  histCard: { backgroundColor: '#151515', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  histHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  histTitle: { color: '#FFF', fontSize: 14, fontWeight: '800', fontFamily: FM },
  histDate: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600', fontFamily: FM },
  histBody: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '500', marginBottom: 12, fontFamily: FM },
  histStats: { flexDirection: 'row', gap: 10 },
  histFilters: { flexDirection: 'row', gap: 8, marginTop: 8 },
  histFilter: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '600', fontFamily: FM, backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
});
