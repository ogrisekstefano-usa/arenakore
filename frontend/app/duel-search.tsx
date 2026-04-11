/**
 * ARENAKORE — DUEL SEARCH
 * Cerca avversari per duello 1vs1 con filtri Città, Disciplina, Stato.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';
import { QRScannerModal } from '../components/QRScannerModal';

const DISCIPLINES = ['TUTTI', 'POWER', 'AGILITY', 'ENDURANCE'];
const STATUSES = ['TUTTI', 'ONLINE', 'DISPONIBILE', 'IN SFIDA'];

export default function DuelSearch() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [city, setCity] = useState('');
  const [discipline, setDiscipline] = useState('TUTTI');
  const [status, setStatus] = useState('TUTTI');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [challenging, setChallenging] = useState<string | null>(null);
  const [qrScannerVisible, setQrScannerVisible] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (nickname.trim()) params.set('q', nickname.trim());
      if (city.trim()) params.set('city', city.trim());
      if (discipline !== 'TUTTI') params.set('discipline', discipline.toLowerCase());
      if (status !== 'TUTTI') params.set('status', status.toLowerCase());
      const res = await fetch(`${'https://arenakore-api.onrender.com'}/api/duel/search?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const d = await res.json();
      setResults(d.results || d.athletes || []);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [token, nickname, city, discipline, status]);

  const handleChallenge = async (opponentId: string, opponentName: string) => {
    if (!token) return;
    setChallenging(opponentId);
    try {
      const res = await fetch(`${'https://arenakore-api.onrender.com'}/api/pvp/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ opponent_id: opponentId, exercise_type: discipline !== 'TUTTI' ? discipline.toLowerCase() : 'squat' }),
      });
      if (res.ok) {
        Alert.alert('SFIDA LANCIATA', `Hai sfidato ${opponentName} a duello!\nHa 48h per rispondere.`);
      } else {
        const d = await res.json();
        Alert.alert('Errore', d.detail || 'Impossibile sfidare');
      }
    } catch (e) {
      Alert.alert('Errore', 'Impossibile lanciare la sfida');
    } finally {
      setChallenging(null);
    }
  };

  return (
    <View style={ds$.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#000' }}>
        <View style={ds$.header}>
          <TouchableOpacity onPress={() => router.back()} style={ds$.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#FF3B30" />
          </TouchableOpacity>
          <Text style={ds$.headerTitle}>TROVA AVVERSARIO</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={ds$.scroll} showsVerticalScrollIndicator={false}>
        {/* Search Input with QR Scanner */}
        <View style={ds$.searchRow}>
          <View style={ds$.searchInput}>
            <Ionicons name="search" size={16} color="rgba(255,255,255,0.3)" />
            <TextInput
              style={ds$.input}
              placeholder="Nickname Kore..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={ds$.qrBtn}
              onPress={() => setQrScannerVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="qr-code" size={18} color="#00E5FF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* City Input */}
        <View style={ds$.cityRow}>
          <Ionicons name="location" size={14} color="#FF9500" />
          <TextInput
            style={ds$.cityInput}
            placeholder="Città (opzionale)"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={city}
            onChangeText={setCity}
            autoCapitalize="words"
          />
        </View>

        {/* Discipline Filter */}
        <Text style={ds$.filterLabel}>DISCIPLINA</Text>
        <View style={ds$.filterRow}>
          {DISCIPLINES.map(d => (
            <TouchableOpacity
              key={d}
              style={[ds$.filterChip, discipline === d && ds$.filterChipActive]}
              onPress={() => setDiscipline(d)}
              activeOpacity={0.8}
            >
              <Text style={[ds$.filterChipText, discipline === d && ds$.filterChipTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status Filter */}
        <Text style={ds$.filterLabel}>STATO</Text>
        <View style={ds$.filterRow}>
          {STATUSES.map(s => (
            <TouchableOpacity
              key={s}
              style={[ds$.filterChip, status === s && ds$.filterChipActive]}
              onPress={() => setStatus(s)}
              activeOpacity={0.8}
            >
              <Text style={[ds$.filterChipText, status === s && ds$.filterChipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search Button */}
        <TouchableOpacity style={ds$.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
          <Ionicons name="flash" size={16} color="#000" />
          <Text style={ds$.searchBtnText}>CERCA AVVERSARIO</Text>
        </TouchableOpacity>

        {/* Results */}
        {loading ? (
          <ActivityIndicator color="#FF3B30" size="large" style={{ marginTop: 30 }} />
        ) : searched && results.length === 0 ? (
          <View style={ds$.emptyCard}>
            <Ionicons name="person-outline" size={36} color="rgba(255,255,255,0.12)" />
            <Text style={ds$.emptyTitle}>NESSUN KORE TROVATO</Text>
            <Text style={ds$.emptyDesc}>Prova a modificare i filtri di ricerca.</Text>
          </View>
        ) : (
          results.map((r, i) => (
            <Animated.View key={r.id || i} entering={FadeInDown.delay(i * 60).duration(250)}>
              <View style={ds$.resultCard}>
                <View style={[ds$.avatar, { backgroundColor: r.avatar_color || '#FF3B30' + '20' }]}>
                  <Text style={ds$.avatarLetter}>{(r.username || '?')[0].toUpperCase()}</Text>
                </View>
                <View style={ds$.resultInfo}>
                  <Text style={ds$.resultName}>{r.username || 'Kore'}</Text>
                  <Text style={ds$.resultMeta}>{r.city || '—'} · {r.flux ?? 0} K-FLUX · LVL {r.level ?? 1}</Text>
                </View>
                <TouchableOpacity
                  style={ds$.challengeBtn}
                  onPress={() => handleChallenge(r.id, r.username || 'Kore')}
                  disabled={challenging === r.id}
                  activeOpacity={0.85}
                >
                  {challenging === r.id ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Ionicons name="flash" size={16} color="#000" />
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* QR Scanner Modal */}
      <QRScannerModal
        visible={qrScannerVisible}
        onClose={() => setQrScannerVisible(false)}
        onUserFound={(userData) => {
          setNickname(userData.username || '');
          // Auto-inject found user into results
          setResults([{
            id: userData.id,
            username: userData.username,
            avatar_color: userData.avatar_color,
            level: userData.level,
            flux: userData.flux,
            city: userData.city,
            is_founder: userData.is_founder,
          }]);
          setSearched(true);
        }}
      />
    </View>
  );
}

const ds$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,59,48,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  searchRow: { marginBottom: 10 },
  searchInput: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1C1C1E', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10 },
  input: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '600' },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1C1C1E', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 8, marginBottom: 14 },
  cityInput: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '600' },
  filterLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 6, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#1C1C1E', backgroundColor: '#0A0A0A' },
  filterChipActive: { borderColor: '#FF3B30', backgroundColor: 'rgba(255,59,48,0.10)' },
  filterChipText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  filterChipTextActive: { color: '#FF3B30' },
  searchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF3B30', borderRadius: 12, paddingVertical: 14, marginBottom: 20 },
  searchBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  emptyCard: { alignItems: 'center', gap: 8, padding: 30, borderRadius: 14, borderWidth: 1, borderColor: '#1C1C1E', backgroundColor: '#0A0A0A' },
  emptyTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  emptyDesc: { color: 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: '400', textAlign: 'center' },
  resultCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1C1C1E', backgroundColor: '#0A0A0A', marginBottom: 8 },
  avatar: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  resultInfo: { flex: 1, gap: 2 },
  resultName: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  resultMeta: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '500' },
  challengeBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center' },
  qrBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,229,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)' },
});
