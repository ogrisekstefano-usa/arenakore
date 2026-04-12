/**
 * ARENAKORE — COACH CONNECT
 * Permette ai Kore di inviare Bio-Signature al Coach o trovare una Crew.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

export default function CoachConnect() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [crews, setCrews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [gymCode, setGymCode] = useState('');

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const d = await api.getMyCrews(token);
        setCrews(d.crews || []);
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, [token]);

  const handleSendBio = async (crewId: string, coachName: string) => {
    if (!token) return;
    setSending(crewId);
    try {
      // Send bio signature to coach
      const res = await fetch(`${'https://arenakore-api-v2.onrender.com'}/api/coach/receive-bio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ crew_id: crewId }),
      });
      if (res.ok) {
        Alert.alert('BIO-SIGNATURE INVIATA', `I tuoi dati DNA sono stati inviati a ${coachName}.\nIl coach può ora personalizzare il tuo allenamento.`);
      } else {
        Alert.alert('Già inviata', 'La tua Bio-Signature è già aggiornata per questo coach.');
      }
    } catch (e) {
      Alert.alert('Errore', 'Impossibile inviare la Bio-Signature');
    } finally {
      setSending(null);
    }
  };

  const handleJoinGym = async () => {
    if (!gymCode.trim()) { Alert.alert('Inserisci codice', 'Inserisci il codice della palestra.'); return; }
    try {
      const res = await fetch(`${'https://arenakore-api-v2.onrender.com'}/api/gym/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: gymCode.trim().toUpperCase() }),
      });
      const d = await res.json();
      if (res.ok) {
        Alert.alert('ISCRIZIONE COMPLETATA', `Sei entrato nella palestra ${d.gym_name || ''}.\nOra puoi inviare la Bio-Signature al tuo Coach.`);
        setGymCode('');
      } else {
        Alert.alert('Errore', d.detail || 'Codice non valido');
      }
    } catch (e) {
      Alert.alert('Errore', 'Impossibile unirsi alla palestra');
    }
  };

  return (
    <View style={cc$.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#000' }}>
        <View style={cc$.header}>
          <TouchableOpacity onPress={() => router.back()} style={cc$.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#00FF87" />
          </TouchableOpacity>
          <Text style={cc$.headerTitle}>COACH CONNECT</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={cc$.scroll} showsVerticalScrollIndicator={false}>
        {/* My Crews section */}
        <Text style={cc$.sectionLabel}>LE TUE CREW</Text>
        {loading ? (
          <ActivityIndicator color="#00FF87" size="small" style={{ marginVertical: 20 }} />
        ) : crews.length > 0 ? (
          crews.map((crew, i) => (
            <Animated.View key={crew.id || i} entering={FadeInDown.delay(i * 80).duration(300)}>
              <View style={cc$.crewCard}>
                <View style={cc$.crewIcon}>
                  <Ionicons name="people" size={20} color="#00FF87" />
                </View>
                <View style={cc$.crewInfo}>
                  <Text style={cc$.crewName}>{crew.name || 'Crew'}</Text>
                  <Text style={cc$.crewCoach}>Coach: {crew.coach_name || 'N/A'}</Text>
                </View>
                <TouchableOpacity
                  style={cc$.sendBtn}
                  onPress={() => handleSendBio(crew.id, crew.coach_name || 'Coach')}
                  disabled={sending === crew.id}
                  activeOpacity={0.85}
                >
                  {sending === crew.id ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={13} color="#000" />
                      <Text style={cc$.sendBtnText}>INVIA BIO</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))
        ) : (
          <View style={cc$.emptyCard}>
            <Ionicons name="people-outline" size={32} color="rgba(255,255,255,0.15)" />
            <Text style={cc$.emptyTitle}>NESSUNA CREW</Text>
            <Text style={cc$.emptyDesc}>Unisciti a una palestra per connetterti con il tuo Coach.</Text>
          </View>
        )}

        {/* Join Gym section */}
        <Text style={[cc$.sectionLabel, { marginTop: 20 }]}>UNISCITI A UNA PALESTRA</Text>
        <View style={cc$.joinCard}>
          <TextInput
            style={cc$.codeInput}
            placeholder="CODICE PALESTRA"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={gymCode}
            onChangeText={setGymCode}
            autoCapitalize="characters"
            maxLength={10}
          />
          <TouchableOpacity style={cc$.joinBtn} onPress={handleJoinGym} activeOpacity={0.85}>
            <Ionicons name="enter" size={16} color="#000" />
            <Text style={cc$.joinBtnText}>ENTRA</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const cc$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,255,135,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  sectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', letterSpacing: 3, marginBottom: 10 },
  crewCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#1C1C1E', backgroundColor: '#0A0A0A', marginBottom: 8 },
  crewIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0,255,135,0.08)', alignItems: 'center', justifyContent: 'center' },
  crewInfo: { flex: 1, gap: 2 },
  crewName: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  crewCoach: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#00FF87', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  sendBtnText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  emptyCard: { alignItems: 'center', gap: 8, padding: 24, borderRadius: 14, borderWidth: 1, borderColor: '#1C1C1E', backgroundColor: '#0A0A0A' },
  emptyTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  emptyDesc: { color: 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: '400', textAlign: 'center', lineHeight: 18 },
  joinCard: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  codeInput: { flex: 1, backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1C1C1E', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: 3 },
  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#00FF87', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  joinBtnText: { color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});
