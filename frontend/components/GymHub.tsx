/**
 * ARENAKORE — GYM HUB v1.0
 * Enterprise Engine for Gym Owners
 * Nike Elite Aesthetic: Monochromatic Icons, Bold Fonts, Stadium Luminosity
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Image, RefreshControl, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

// ============================
// DIFFICULTY & EXERCISE CONFIG
// ============================
const DIFF_CFG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  easy:    { label: 'EASY',    color: '#34C759', icon: 'star-outline' },
  medium:  { label: 'MEDIUM',  color: '#FF9500', icon: 'star-half' },
  hard:    { label: 'HARD',    color: '#FF3B30', icon: 'star' },
  extreme: { label: 'EXTREME', color: '#AF52DE', icon: 'flame' },
};

const EX_CFG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  squat: { label: 'DEEP SQUAT', icon: 'barbell' },
  punch: { label: 'EXPLOSIVE PUNCH', icon: 'hand-left' },
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  upcoming:  { label: 'PROSSIMO', color: '#D4AF37', bg: 'rgba(212,175,55,0.15)' },
  live:      { label: 'LIVE',     color: '#FF3B30', bg: 'rgba(255,59,48,0.15)' },
  completed: { label: 'CONCLUSO', color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.06)' },
};

// ============================
// COACH CARD
// ============================
function CoachCard({ coach, onRemove }: { coach: any; onRemove: (id: string) => void }) {
  return (
    <Animated.View entering={FadeInDown.delay(50)}>
      <View style={cc$.cardOuter}>
        <LinearGradient
          colors={['rgba(0,242,255,0.65)', 'rgba(5,5,5,0.95)', 'rgba(5,5,5,0.99)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={cc$.card}
        >
          <View style={cc$.avatar}>
            <Text style={cc$.avatarText}>{coach.username?.[0]?.toUpperCase()}</Text>
          </View>
          <View style={cc$.info}>
            <Text style={cc$.name}>{(coach.username || '').toUpperCase()}</Text>
            <View style={cc$.metaRow}>
              <Ionicons name="barbell" size={10} color="#00F2FF" />
              <Text style={cc$.meta}>{coach.sport || '\u2014'} {'\u00b7'} LVL {coach.level}</Text>
            </View>
            <View style={cc$.metaRow}>
              <Ionicons name="document-text" size={10} color="#D4AF37" />
              <Text style={cc$.meta}>{coach.templates_count || 0} TEMPLATE</Text>
            </View>
          </View>
          <View style={cc$.right}>
            <Text style={cc$.xp}>{coach.xp} XP</Text>
            <TouchableOpacity onPress={() => onRemove(coach.id)} style={cc$.removeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color="rgba(255,59,48,0.5)" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

const cc$ = StyleSheet.create({
  cardOuter: {
    borderRadius: 14, overflow: 'hidden', marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.1)',
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#00F2FF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(0,242,255,0.4)',
  },
  avatarText: { color: '#050505', fontSize: 18, fontWeight: '900' },
  info: { flex: 1, gap: 3 },
  name: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  right: { alignItems: 'flex-end', gap: 8 },
  xp: { color: '#D4AF37', fontSize: 14, fontWeight: '900' },
  removeBtn: { padding: 2 },
});

// ============================
// EVENT CARD (with QR)
// ============================
function EventCard({
  event, onShowQR, onStatusChange, onShowDetail,
}: { event: any; onShowQR: (e: any) => void; onStatusChange: (id: string, s: string) => void; onShowDetail: (e: any) => void }) {
  const statusCfg = STATUS_CFG[event.status] || STATUS_CFG.upcoming;
  const diffCfg = DIFF_CFG[event.difficulty] || DIFF_CFG.medium;
  const exCfg = EX_CFG[event.exercise] || EX_CFG.squat;

  return (
    <Animated.View entering={FadeInDown.delay(80)}>
      <TouchableOpacity style={ev$.cardOuter} onPress={() => onShowDetail(event)} activeOpacity={0.85}>
        <LinearGradient
          colors={event.status === 'live'
            ? ['rgba(255,59,48,0.08)', 'rgba(10,10,10,0.98)', '#050505']
            : ['rgba(0,242,255,0.65)', 'rgba(10,10,10,0.96)', '#050505']}
          start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }}
          style={ev$.card}
        >
          {/* Status Badge */}
          <View style={ev$.topRow}>
            <View style={[ev$.statusBadge, { backgroundColor: statusCfg.bg }]}>
              {event.status === 'live' && <View style={ev$.liveDot} />}
              <Text style={[ev$.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
            <View style={[ev$.diffBadge, { backgroundColor: `${diffCfg.color}20`, borderColor: `${diffCfg.color}50` }]}>
              <Ionicons name={diffCfg.icon} size={10} color={diffCfg.color} />
              <Text style={[ev$.diffText, { color: diffCfg.color }]}>{diffCfg.label}</Text>
            </View>
          </View>

          {/* Title & Info */}
          <Text style={ev$.title}>{(event.title || '').toUpperCase()}</Text>
          {event.description ? <Text style={ev$.desc} numberOfLines={2}>{event.description}</Text> : null}

          <View style={ev$.infoRow}>
            <View style={ev$.infoItem}>
              <Ionicons name="calendar" size={12} color="#00F2FF" />
              <Text style={ev$.infoText}>{event.event_date}</Text>
            </View>
            <View style={ev$.infoItem}>
              <Ionicons name="time" size={12} color="#00F2FF" />
              <Text style={ev$.infoText}>{event.event_time}</Text>
            </View>
            <View style={ev$.infoItem}>
              <Ionicons name={exCfg.icon} size={12} color="#00F2FF" />
              <Text style={ev$.infoText}>{exCfg.label}</Text>
            </View>
          </View>

          <View style={ev$.statsRow}>
            <View style={ev$.statBlock}>
              <Text style={ev$.statVal}>{event.participants_count}</Text>
              <Text style={ev$.statLabel}>/{event.max_participants} ATLETI</Text>
            </View>
            <View style={ev$.statBlock}>
              <Text style={[ev$.statVal, { color: '#D4AF37' }]}>+{event.xp_reward}</Text>
              <Text style={ev$.statLabel}>XP REWARD</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={ev$.actions}>
            <TouchableOpacity style={ev$.qrBtn} onPress={() => onShowQR(event)}>
              <Ionicons name="qr-code" size={16} color="#00F2FF" />
              <Text style={ev$.qrBtnText}>QR CODE</Text>
            </TouchableOpacity>
            {event.status === 'upcoming' && (
              <TouchableOpacity style={ev$.liveBtn} onPress={() => onStatusChange(event.id, 'live')}>
                <Ionicons name="radio" size={14} color="#FF3B30" />
                <Text style={ev$.liveBtnText}>GO LIVE</Text>
              </TouchableOpacity>
            )}
            {event.status === 'live' && (
              <TouchableOpacity style={ev$.endBtn} onPress={() => onStatusChange(event.id, 'completed')}>
                <Ionicons name="checkmark-circle" size={14} color="rgba(255,255,255,0.5)" />
                <Text style={ev$.endBtnText}>CHIUDI</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const ev$ = StyleSheet.create({
  cardOuter: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.65)',
  },
  card: {
    padding: 16, gap: 10,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B30' },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  diffBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  diffText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  desc: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 18 },
  infoRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '400' },
  statsRow: { flexDirection: 'row', gap: 20 },
  statBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statVal: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  qrBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(0,242,255,0.1)', borderRadius: 10, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.65)',
  },
  qrBtnText: { color: '#00F2FF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  liveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(255,59,48,0.1)', borderRadius: 10, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.3)',
  },
  liveBtnText: { color: '#FF3B30', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  endBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  endBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
});

// ============================
// QR CODE FULLSCREEN MODAL
// ============================
function QRModal({ event, visible, onClose }: { event: any; visible: boolean; onClose: () => void }) {
  if (!event) return null;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `ARENAKORE EVENT\n${event.title}\n${event.event_date} ${event.event_time}\nJoin: ${event.join_url || `arenakore.com/join/${event.event_code}`}`,
      });
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={qr$.backdrop}>
        <View style={qr$.card}>
          {/* Header */}
          <View style={qr$.header}>
            <Ionicons name="qr-code" size={18} color="#00F2FF" />
            <Text style={qr$.title}>QR-CORE EVENT</Text>
          </View>

          {/* Event Info */}
          <Text style={qr$.eventTitle}>{event.title}</Text>
          <View style={qr$.metaRow}>
            <Ionicons name="calendar" size={12} color="rgba(255,255,255,0.5)" />
            <Text style={qr$.metaText}>{event.event_date} {'\u00b7'} {event.event_time}</Text>
          </View>
          <View style={qr$.metaRow}>
            <Ionicons name="business" size={12} color="#D4AF37" />
            <Text style={qr$.metaText}>{event.gym_name}</Text>
          </View>

          {/* QR Code Image */}
          {event.qr_base64 ? (
            <View style={qr$.qrContainer}>
              <Image
                source={{ uri: `data:image/png;base64,${event.qr_base64}` }}
                style={qr$.qrImage}
                resizeMode="contain"
              />
              <View style={qr$.qrGlow} />
            </View>
          ) : (
            <View style={qr$.qrPlaceholder}>
              <ActivityIndicator color="#00F2FF" />
            </View>
          )}

          {/* Event Code */}
          <View style={qr$.codeContainer}>
            <Text style={qr$.codeLabel}>EVENT CODE</Text>
            <Text style={qr$.codeValue}>{event.event_code}</Text>
          </View>

          {/* Instructions */}
          <Text style={qr$.instructions}>
            Scansiona il QR per iscriverti automaticamente all'evento e alla palestra
          </Text>

          {/* Actions */}
          <View style={qr$.actionsRow}>
            <TouchableOpacity style={qr$.shareBtn} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={16} color="#D4AF37" />
              <Text style={qr$.shareBtnText}>CONDIVIDI</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={qr$.closeBtn} onPress={onClose}>
            <Text style={qr$.closeBtnText}>CHIUDI</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const qr$ = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 340, backgroundColor: '#0A0A0A', borderRadius: 24, padding: 24,
    alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.65)',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#00F2FF', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  eventTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '600' },
  qrContainer: {
    width: 220, height: 220, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,242,255,0.65)', borderRadius: 16, padding: 8,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.1)', marginVertical: 8,
  },
  qrImage: { width: 200, height: 200, borderRadius: 8 },
  qrGlow: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'transparent',
  },
  qrPlaceholder: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  codeContainer: { alignItems: 'center', gap: 3 },
  codeLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  codeValue: { color: '#00F2FF', fontSize: 24, fontWeight: '900', letterSpacing: 6 },
  instructions: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', lineHeight: 16, paddingHorizontal: 8 },
  actionsRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(212,175,55,0.12)', borderRadius: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)',
  },
  shareBtnText: { color: '#D4AF37', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  closeBtn: { paddingVertical: 8, marginTop: 4 },
  closeBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
});

// ============================
// CREATE EVENT MODAL
// ============================
function CreateEventModal({ visible, onClose, onCreated, token }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [exercise, setExercise] = useState('squat');
  const [difficulty, setDifficulty] = useState('medium');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [maxPart, setMaxPart] = useState('50');
  const [xpReward, setXpReward] = useState('100');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert('Errore', 'Inserisci un titolo'); return; }
    if (!eventDate.trim()) { Alert.alert('Errore', 'Inserisci la data (YYYY-MM-DD)'); return; }
    if (!eventTime.trim()) { Alert.alert('Errore', 'Inserisci l\'ora (HH:MM)'); return; }

    setSaving(true);
    try {
      await api.createGymEvent({
        title: title.trim(),
        description: description.trim(),
        exercise,
        difficulty,
        event_date: eventDate.trim(),
        event_time: eventTime.trim(),
        max_participants: parseInt(maxPart) || 50,
        xp_reward: parseInt(xpReward) || 100,
      }, token);
      resetForm();
      onCreated();
      onClose();
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Impossibile creare evento');
    } finally { setSaving(false); }
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setExercise('squat');
    setDifficulty('medium'); setEventDate(''); setEventTime('');
    setMaxPart('50'); setXpReward('100');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={ce$.backdrop}>
        <ScrollView contentContainerStyle={ce$.scroll}>
          <View style={ce$.card}>
            <View style={ce$.titleRow}>
              <Ionicons name="radio" size={20} color="#FF3B30" />
              <Text style={ce$.title}>CREA EVENTO LIVE</Text>
            </View>
            <Text style={ce$.subtitle}>Mass Event Generator {'\u00b7'} QR-Core</Text>

            <Text style={ce$.label}>NOME EVENTO</Text>
            <TextInput style={ce$.input} value={title} onChangeText={setTitle} placeholder="Es: KORE NIGHT CHALLENGE" placeholderTextColor="#444" />

            <Text style={ce$.label}>DESCRIZIONE (OPZIONALE)</Text>
            <TextInput style={[ce$.input, { height: 60, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="Dettagli evento..." placeholderTextColor="#444" multiline />

            <Text style={ce$.label}>ESERCIZIO</Text>
            <View style={ce$.exRow}>
              {Object.entries(EX_CFG).map(([key, cfg]) => (
                <TouchableOpacity key={key} style={[ce$.exBtn, exercise === key && ce$.exBtnActive]} onPress={() => setExercise(key)}>
                  <Ionicons name={cfg.icon} size={22} color={exercise === key ? '#00F2FF' : 'rgba(255,255,255,0.3)'} />
                  <Text style={[ce$.exLabel, exercise === key && { color: '#00F2FF' }]}>{cfg.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={ce$.label}>{"DIFFICOLT\u00c0"}</Text>
            <View style={ce$.diffRow}>
              {Object.entries(DIFF_CFG).map(([key, cfg]) => (
                <TouchableOpacity key={key} style={[ce$.diffBtn, difficulty === key && { borderColor: cfg.color, backgroundColor: `${cfg.color}15` }]} onPress={() => setDifficulty(key)}>
                  <Ionicons name={cfg.icon} size={10} color={difficulty === key ? cfg.color : 'rgba(255,255,255,0.3)'} />
                  <Text style={[ce$.diffLabel, difficulty === key && { color: cfg.color }]}>{cfg.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={ce$.dateRow}>
              <View style={ce$.dateCol}>
                <Text style={ce$.label}>DATA (YYYY-MM-DD)</Text>
                <TextInput style={ce$.input} value={eventDate} onChangeText={setEventDate} placeholder="2026-04-15" placeholderTextColor="#444" />
              </View>
              <View style={ce$.dateCol}>
                <Text style={ce$.label}>ORA (HH:MM)</Text>
                <TextInput style={ce$.input} value={eventTime} onChangeText={setEventTime} placeholder="20:00" placeholderTextColor="#444" />
              </View>
            </View>

            <View style={ce$.numRow}>
              <View style={{ flex: 1 }}>
                <Text style={ce$.label}>MAX PARTECIPANTI</Text>
                <TextInput style={ce$.input} value={maxPart} onChangeText={setMaxPart} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ce$.label}>XP REWARD</Text>
                <TextInput style={ce$.input} value={xpReward} onChangeText={setXpReward} keyboardType="numeric" />
              </View>
            </View>

            <TouchableOpacity style={ce$.saveBtn} onPress={handleCreate} disabled={saving} activeOpacity={0.8}>
              <LinearGradient colors={['#FF3B30', '#C62828']} style={ce$.saveGrad}>
                {saving ? <ActivityIndicator color="#FFF" /> : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="radio" size={18} color="#FFF" />
                    <Text style={ce$.saveText}>GENERA EVENTO + QR</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { onClose(); resetForm(); }} style={ce$.cancelBtn}>
              <Text style={ce$.cancelText}>ANNULLA</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ce$ = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  scroll: { justifyContent: 'flex-end' },
  card: {
    backgroundColor: '#0A0A0A', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 6, borderWidth: 1, borderColor: 'rgba(255,59,48,0.15)',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { color: '#FF3B30', fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', marginBottom: 8 },
  label: { color: '#00F2FF', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginTop: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: '#FFF', fontSize: 14, fontWeight: '700', borderWidth: 1, borderColor: 'rgba(0,242,255,0.65)',
  },
  exRow: { flexDirection: 'row', gap: 10 },
  exBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)',
  },
  exBtnActive: { borderColor: '#00F2FF', backgroundColor: 'rgba(0,242,255,0.65)' },
  exLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  diffRow: { flexDirection: 'row', gap: 6 },
  diffBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', gap: 2,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)',
  },
  diffLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateCol: { flex: 1 },
  numRow: { flexDirection: 'row', gap: 10 },
  saveBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  saveGrad: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  cancelBtn: { paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
});

// ============================
// ADD COACH MODAL
// ============================
function AddCoachModal({ visible, onClose, onAdded, token }: any) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!username.trim()) return;
    setLoading(true);
    try {
      await api.addGymCoach(username.trim(), token);
      setUsername('');
      onAdded();
      onClose();
      Alert.alert('Coach Associato', `${username} ora fa parte della tua palestra!`);
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Impossibile aggiungere');
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View style={{ backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Ionicons name="person-add" size={18} color="#00F2FF" />
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 }}>ASSOCIA COACH</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center' }}>Inserisci lo username del coach da associare</Text>
          <TextInput
            style={{
              backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
              color: '#FFF', fontSize: 15, borderWidth: 1, borderColor: 'rgba(0,242,255,0.1)',
            }}
            value={username}
            onChangeText={setUsername}
            placeholder="Username coach"
            placeholderTextColor="#444"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[{ backgroundColor: '#00F2FF', borderRadius: 12, paddingVertical: 16, alignItems: 'center' }, !username.trim() && { opacity: 0.3 }]}
            onPress={handleAdd}
            disabled={!username.trim() || loading}
          >
            {loading ? <ActivityIndicator color="#050505" /> : <Text style={{ color: '#050505', fontSize: 14, fontWeight: '900', letterSpacing: 2 }}>ASSOCIA</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600' }}>Annulla</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================
// MAIN GYM HUB COMPONENT
// ============================
export function GymHub() {
  const { token } = useAuth();
  const [gym, setGym] = useState<any>(null);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showAddCoach, setShowAddCoach] = useState(false);
  const [qrEvent, setQrEvent] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<'events' | 'coaches'>('events');

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [g, c, e] = await Promise.all([
        api.getMyGym(token),
        api.getGymCoaches(token),
        api.getGymEvents(token),
      ]);
      setGym(g);
      setCoaches(c);
      setEvents(e);
    } catch (err) { console.log('GymHub load error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRemoveCoach = (coachId: string) => {
    Alert.alert('Rimuovi Coach', 'Rimuovere questo coach dalla palestra?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Rimuovi', style: 'destructive', onPress: async () => {
        try {
          await api.removeGymCoach(coachId, token!);
          loadData();
        } catch (e: any) { Alert.alert('Errore', e?.message); }
      }},
    ]);
  };

  const handleStatusChange = async (eventId: string, newStatus: string) => {
    try {
      await api.updateEventStatus(eventId, newStatus, token!);
      loadData();
    } catch (e: any) { Alert.alert('Errore', e?.message); }
  };

  if (loading) {
    return (
      <View style={hub$.center}>
        <ActivityIndicator color="#D4AF37" size="large" />
        <Text style={hub$.loadingText}>Caricamento Gym Hub...</Text>
      </View>
    );
  }

  const liveEvents = events.filter(e => e.status === 'live');
  const upcomingEvents = events.filter(e => e.status === 'upcoming');
  const pastEvents = events.filter(e => e.status === 'completed');

  return (
    <View style={hub$.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#D4AF37" />}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* GYM PROFILE HERO */}
        <LinearGradient colors={['rgba(212,175,55,0.08)', '#050505']} style={hub$.heroGrad}>
          <View style={hub$.heroContent}>
            <View style={hub$.gymIconWrap}>
              <Ionicons name="business" size={32} color="#D4AF37" />
            </View>
            <Text style={hub$.gymName}>{gym?.name || 'LA TUA PALESTRA'}</Text>
            {gym?.address ? <Text style={hub$.gymAddress}>{gym.address}</Text> : null}
            <View style={hub$.gymStats}>
              <View style={hub$.gymStat}>
                <Text style={hub$.gymStatVal}>{coaches.length}</Text>
                <Text style={hub$.gymStatLabel}>COACH</Text>
              </View>
              <View style={hub$.gymStatDivider} />
              <View style={hub$.gymStat}>
                <Text style={[hub$.gymStatVal, { color: '#FF3B30' }]}>{events.length}</Text>
                <Text style={hub$.gymStatLabel}>EVENTI</Text>
              </View>
              <View style={hub$.gymStatDivider} />
              <View style={hub$.gymStat}>
                <Text style={[hub$.gymStatVal, { color: '#00F2FF' }]}>{gym?.members_count || 1}</Text>
                <Text style={hub$.gymStatLabel}>MEMBRI</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* SECTION TABS */}
        <View style={hub$.tabRow}>
          <TouchableOpacity
            style={[hub$.tab, activeSection === 'events' && hub$.tabActive]}
            onPress={() => setActiveSection('events')}
          >
            <Ionicons name="radio" size={14} color={activeSection === 'events' ? '#FF3B30' : 'rgba(255,255,255,0.35)'} />
            <Text style={[hub$.tabText, activeSection === 'events' && hub$.tabTextActive]}>EVENTI LIVE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[hub$.tab, activeSection === 'coaches' && hub$.tabActive]}
            onPress={() => setActiveSection('coaches')}
          >
            <Ionicons name="people" size={14} color={activeSection === 'coaches' ? '#00F2FF' : 'rgba(255,255,255,0.35)'} />
            <Text style={[hub$.tabText, activeSection === 'coaches' && { color: '#00F2FF' }]}>I MIEI COACH</Text>
          </TouchableOpacity>
        </View>

        {/* ===== EVENTS SECTION ===== */}
        {activeSection === 'events' && (
          <View style={hub$.section}>
            {/* CREATE EVENT CTA */}
            <TouchableOpacity style={hub$.createEventBtn} onPress={() => setShowCreateEvent(true)} activeOpacity={0.85}>
              <LinearGradient colors={['rgba(255,59,48,0.15)', 'rgba(255,59,48,0.05)']} style={hub$.createEventGrad}>
                <Ionicons name="add-circle" size={22} color="#FF3B30" />
                <View style={{ gap: 1 }}>
                  <Text style={hub$.createEventTitle}>CREA EVENTO LIVE</Text>
                  <Text style={hub$.createEventSub}>Genera QR-Core per iscrizione di massa</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* LIVE EVENTS */}
            {liveEvents.length > 0 && (
              <>
                <View style={hub$.sectionRow}>
                  <View style={hub$.livePulse} />
                  <Text style={[hub$.sectionTitle, { color: '#FF3B30' }]}>LIVE ORA</Text>
                </View>
                {liveEvents.map(e => (
                  <EventCard key={e.id} event={e} onShowQR={setQrEvent} onStatusChange={handleStatusChange} onShowDetail={() => {}} />
                ))}
              </>
            )}

            {/* UPCOMING */}
            {upcomingEvents.length > 0 && (
              <>
                <View style={hub$.sectionRow}>
                  <Ionicons name="calendar" size={14} color="#D4AF37" />
                  <Text style={hub$.sectionTitle}>PROSSIMI EVENTI</Text>
                </View>
                {upcomingEvents.map(e => (
                  <EventCard key={e.id} event={e} onShowQR={setQrEvent} onStatusChange={handleStatusChange} onShowDetail={() => {}} />
                ))}
              </>
            )}

            {/* PAST */}
            {pastEvents.length > 0 && (
              <>
                <View style={hub$.sectionRow}>
                  <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.4)" />
                  <Text style={[hub$.sectionTitle, { color: 'rgba(255,255,255,0.4)' }]}>CONCLUSI</Text>
                </View>
                {pastEvents.slice(0, 3).map(e => (
                  <EventCard key={e.id} event={e} onShowQR={setQrEvent} onStatusChange={handleStatusChange} onShowDetail={() => {}} />
                ))}
              </>
            )}

            {events.length === 0 && (
              <View style={hub$.emptyState}>
                <Ionicons name="radio-outline" size={48} color="rgba(255,255,255,0.50)" />
                <Text style={hub$.emptyTitle}>NESSUN EVENTO</Text>
                <Text style={hub$.emptySub}>Crea il tuo primo evento live con QR-Core</Text>
              </View>
            )}
          </View>
        )}

        {/* ===== COACHES SECTION ===== */}
        {activeSection === 'coaches' && (
          <View style={hub$.section}>
            <TouchableOpacity style={hub$.addCoachBtn} onPress={() => setShowAddCoach(true)} activeOpacity={0.85}>
              <LinearGradient colors={['rgba(0,242,255,0.65)', 'rgba(0,242,255,0.65)']} style={hub$.addCoachGrad}>
                <Ionicons name="person-add" size={18} color="#00F2FF" />
                <Text style={hub$.addCoachText}>ASSOCIA NUOVO COACH</Text>
              </LinearGradient>
            </TouchableOpacity>

            {coaches.length > 0 ? (
              <>
                <View style={hub$.sectionRow}>
                  <Ionicons name="fitness" size={14} color="#00F2FF" />
                  <Text style={hub$.sectionTitle}>COACH ASSOCIATI ({coaches.length})</Text>
                </View>
                {coaches.map(c => <CoachCard key={c.id} coach={c} onRemove={handleRemoveCoach} />)}
              </>
            ) : (
              <View style={hub$.emptyState}>
                <Ionicons name="people-outline" size={48} color="rgba(255,255,255,0.50)" />
                <Text style={hub$.emptyTitle}>NESSUN COACH</Text>
                <Text style={hub$.emptySub}>Associa coach alla tua palestra per creare un team</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* MODALS */}
      <CreateEventModal visible={showCreateEvent} onClose={() => setShowCreateEvent(false)} onCreated={loadData} token={token} />
      <AddCoachModal visible={showAddCoach} onClose={() => setShowAddCoach(false)} onAdded={loadData} token={token} />
      <QRModal event={qrEvent} visible={!!qrEvent} onClose={() => setQrEvent(null)} />
    </View>
  );
}

const hub$ = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  heroGrad: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  heroContent: { alignItems: 'center', gap: 8 },
  gymIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(212,175,55,0.12)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(212,175,55,0.3)',
  },
  gymName: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  gymAddress: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  gymStats: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 8 },
  gymStat: { alignItems: 'center', gap: 2 },
  gymStatVal: { color: '#D4AF37', fontSize: 22, fontWeight: '900' },
  gymStatLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  gymStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.08)' },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 3, marginBottom: 12,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
  },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.06)' },
  tabText: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  tabTextActive: { color: '#FF3B30' },
  section: { paddingHorizontal: 16 },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 16, paddingBottom: 10,
  },
  sectionTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' },
  createEventBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,59,48,0.15)' },
  createEventGrad: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  createEventTitle: { color: '#FF3B30', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  createEventSub: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600' },
  addCoachBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(0,242,255,0.65)' },
  addCoachGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 },
  addCoachText: { color: '#00F2FF', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { color: 'rgba(255,255,255,0.35)', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  emptySub: { color: 'rgba(255,255,255,0.60)', fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
