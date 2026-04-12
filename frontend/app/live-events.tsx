/**
 * ARENAKORE — LIVE EVENTS
 * Lista eventi live e scheduler per creare eventi futuri.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';

const EXERCISE_TYPES = ['SQUAT', 'PUSHUP', 'PLANK', 'BURPEE', 'LUNGE'];

export default function LiveEvents() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', exercise: 'SQUAT', max_participants: '8', scheduled_minutes: '30', visibility: 'OPEN' });

  const loadEvents = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${'https://arenakore-api-v2.onrender.com'}/api/live-events`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const d = await res.json();
      setEvents(d.events || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleCreate = async () => {
    if (!form.title.trim()) { Alert.alert('Titolo richiesto'); return; }
    setCreating(true);
    try {
      const res = await fetch(`${'https://arenakore-api-v2.onrender.com'}/api/live-events/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title.trim(),
          exercise_type: form.exercise.toLowerCase(),
          max_participants: parseInt(form.max_participants) || 8,
          scheduled_in_minutes: parseInt(form.scheduled_minutes) || 30,
          visibility: form.visibility.toLowerCase(),
        }),
      });
      if (res.ok) {
        Alert.alert('EVENTO CREATO', 'Il tuo evento live è stato programmato!');
        setShowCreate(false);
        setForm({ title: '', exercise: 'SQUAT', max_participants: '8', scheduled_minutes: '30', visibility: 'OPEN' });
        loadEvents();
      } else {
        const d = await res.json();
        Alert.alert('Errore', d.detail || 'Impossibile creare evento');
      }
    } catch (e) {
      Alert.alert('Errore', 'Errore di rete');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    try {
      const res = await fetch(`${'https://arenakore-api-v2.onrender.com'}/api/live-events/${eventId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        Alert.alert('ISCRITTO', 'Sei stato iscritto all\'evento!');
        loadEvents();
      } else {
        const d = await res.json();
        Alert.alert('Errore', d.detail || 'Impossibile iscriversi');
      }
    } catch (e) {
      Alert.alert('Errore', 'Errore di rete');
    }
  };

  return (
    <View style={le$.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#000' }}>
        <View style={le$.header}>
          <TouchableOpacity onPress={() => router.back()} style={le$.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#007AFF" />
          </TouchableOpacity>
          <Text style={le$.headerTitle}>LIVE ARENA</Text>
          <TouchableOpacity style={le$.createBtn} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={16} color="#000" />
            <Text style={le$.createBtnText}>NUOVO</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={le$.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color="#007AFF" size="large" style={{ marginTop: 40 }} />
        ) : events.length === 0 ? (
          <View style={le$.emptyCard}>
            <Ionicons name="radio-outline" size={40} color="rgba(255,255,255,0.12)" />
            <Text style={le$.emptyTitle}>NESSUN EVENTO LIVE</Text>
            <Text style={le$.emptyDesc}>Crea il primo evento live e sfida i Kore della tua città!</Text>
            <TouchableOpacity style={le$.emptyBtn} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
              <Ionicons name="add-circle" size={16} color="#000" />
              <Text style={le$.emptyBtnText}>CREA EVENTO</Text>
            </TouchableOpacity>
          </View>
        ) : (
          events.map((ev, i) => {
            const isOwner = ev.creator_id === user?._id || ev.creator_id === user?.id;
            const isFull = (ev.participants?.length || 0) >= (ev.max_participants || 8);
            return (
              <Animated.View key={ev.id || i} entering={FadeInDown.delay(i * 60).duration(250)}>
                <View style={le$.eventCard}>
                  <View style={le$.eventTop}>
                    <View style={le$.eventBadge}>
                      <Ionicons name="radio" size={10} color="#007AFF" />
                      <Text style={le$.eventBadgeText}>LIVE</Text>
                    </View>
                    <Text style={le$.eventExercise}>{(ev.exercise_type || 'SQUAT').toUpperCase()}</Text>
                  </View>
                  <Text style={le$.eventTitle}>{ev.title || 'Live Event'}</Text>
                  <View style={le$.eventMeta}>
                    <View style={le$.metaItem}>
                      <Ionicons name="people" size={12} color="rgba(255,255,255,0.35)" />
                      <Text style={le$.metaText}>{ev.participants?.length || 0}/{ev.max_participants || 8}</Text>
                    </View>
                    <View style={le$.metaItem}>
                      <Ionicons name="time" size={12} color="rgba(255,255,255,0.35)" />
                      <Text style={le$.metaText}>{ev.scheduled_time || 'Tra poco'}</Text>
                    </View>
                    <View style={le$.metaItem}>
                      <Ionicons name="person" size={12} color="rgba(255,255,255,0.35)" />
                      <Text style={le$.metaText}>{ev.creator_name || 'Organizzatore'}</Text>
                    </View>
                  </View>
                  {!isOwner && !isFull && (
                    <TouchableOpacity style={le$.joinBtn} onPress={() => handleJoinEvent(ev.id)} activeOpacity={0.85}>
                      <Text style={le$.joinBtnText}>PARTECIPA</Text>
                    </TouchableOpacity>
                  )}
                  {isFull && <Text style={le$.fullText}>COMPLETO</Text>}
                </View>
              </Animated.View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* CREATE EVENT MODAL */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <View style={le$.modalOverlay}>
          <View style={le$.modalContent}>
            <View style={le$.modalHeader}>
              <Text style={le$.modalTitle}>NUOVO EVENTO LIVE</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            <Text style={le$.formLabel}>TITOLO</Text>
            <TextInput
              style={le$.formInput}
              placeholder="Nome dell'evento..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={form.title}
              onChangeText={v => setForm(p => ({ ...p, title: v }))}
            />

            <Text style={le$.formLabel}>ESERCIZIO</Text>
            <View style={le$.exerciseRow}>
              {EXERCISE_TYPES.map(ex => (
                <TouchableOpacity
                  key={ex}
                  style={[le$.exChip, form.exercise === ex && le$.exChipActive]}
                  onPress={() => setForm(p => ({ ...p, exercise: ex }))}
                  activeOpacity={0.8}
                >
                  <Text style={[le$.exChipText, form.exercise === ex && le$.exChipTextActive]}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={le$.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={le$.formLabel}>PARTECIPANTI MAX</Text>
                <TextInput
                  style={le$.formInput}
                  placeholder="8"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={form.max_participants}
                  onChangeText={v => setForm(p => ({ ...p, max_participants: v }))}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={le$.formLabel}>TRA (MINUTI)</Text>
                <TextInput
                  style={le$.formInput}
                  placeholder="30"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={form.scheduled_minutes}
                  onChangeText={v => setForm(p => ({ ...p, scheduled_minutes: v }))}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Text style={le$.formLabel}>PARTECIPAZIONE</Text>
            <View style={le$.exerciseRow}>
              {['OPEN', 'AMICI', 'CREW'].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[le$.exChip, form.visibility === v && le$.exChipActive]}
                  onPress={() => setForm(p => ({ ...p, visibility: v }))}
                  activeOpacity={0.8}
                >
                  <Text style={[le$.exChipText, form.visibility === v && le$.exChipTextActive]}>
                    {v === 'OPEN' ? '🌐 OPEN' : v === 'AMICI' ? '👥 AMICI' : '🛡 CREW'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={le$.submitBtn} onPress={handleCreate} disabled={creating} activeOpacity={0.85}>
              {creating ? <ActivityIndicator color="#000" /> : (
                <><Ionicons name="radio" size={16} color="#000" /><Text style={le$.submitBtnText}>CREA EVENTO</Text></>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const le$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,122,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#007AFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  createBtnText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  emptyCard: { alignItems: 'center', gap: 10, padding: 30, borderRadius: 16, borderWidth: 1, borderColor: '#1C1C1E', backgroundColor: '#0A0A0A', marginTop: 20 },
  emptyTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  emptyDesc: { color: 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: '400', textAlign: 'center', lineHeight: 18 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#007AFF', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginTop: 6 },
  emptyBtnText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  eventCard: { borderRadius: 14, borderWidth: 1, borderColor: '#1C1C1E', backgroundColor: '#0A0A0A', padding: 14, gap: 8, marginBottom: 10 },
  eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,122,255,0.10)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  eventBadgeText: { color: '#007AFF', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  eventExercise: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  eventTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  eventMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '600' },
  joinBtn: { backgroundColor: '#007AFF', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  joinBtnText: { color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  fullText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '800', letterSpacing: 2, textAlign: 'center', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  formLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 3, marginTop: 4 },
  formInput: { backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1C1C1E', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#FFF', fontSize: 15, fontWeight: '600' },
  exerciseRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  exChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#1C1C1E', backgroundColor: '#0A0A0A' },
  exChipActive: { borderColor: '#007AFF', backgroundColor: 'rgba(0,122,255,0.10)' },
  exChipText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  exChipTextActive: { color: '#007AFF' },
  twoCol: { flexDirection: 'row', gap: 12 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#007AFF', borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  submitBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
});
