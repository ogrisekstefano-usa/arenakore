/**
 * ARENAKORE — Governance Modals
 * 1. TemplateRequestModal: "Manca un Template? Chiedilo ai Coach"
 * 2. CategoryProposalModal: "+ Proponi Nuova Disciplina"
 * 3. RequestListModal: View & upvote existing requests
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ScrollView, Platform, ActivityIndicator, KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';

const FONT_M = Platform.select({ web: 'Montserrat, sans-serif', default: undefined });
const FONT_J = Platform.select({ web: "'Plus Jakarta Sans', sans-serif", default: undefined });
const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

// ═══════════════════════════════════════════════════════════
//  TEMPLATE REQUEST MODAL
// ═══════════════════════════════════════════════════════════
interface TemplateRequestProps {
  visible: boolean;
  onClose: () => void;
  discipline: string;
}

export function TemplateRequestModal({ visible, onClose, discipline }: TemplateRequestProps) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!token || !discipline) return;
    setLoadingList(true);
    try {
      const res = await fetch(`${BACKEND}/api/requests/template?discipline=${discipline}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setRequests(await res.json());
    } catch {}
    setLoadingList(false);
  }, [token, discipline]);

  useEffect(() => { if (visible) { fetchRequests(); setSent(false); setDescription(''); } }, [visible]);

  const handleSubmit = async () => {
    if (!description.trim() || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/requests/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ discipline, description: description.trim() })
      });
      if (res.ok) {
        setSent(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        fetchRequests();
      }
    } catch {}
    setLoading(false);
  };

  const handleUpvote = async (id: string) => {
    if (!token) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const res = await fetch(`${BACKEND}/api/requests/${id}/upvote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchRequests();
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={tm.backdrop}>
          <View style={[tm.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <LinearGradient colors={['#1A1A1A', '#0E0E0E']} style={StyleSheet.absoluteFillObject} />
            {/* Header */}
            <View style={tm.header}>
              <View style={tm.headerLeft}>
                <View style={[tm.discBadge, { backgroundColor: 'rgba(255,59,48,0.08)', borderColor: 'rgba(255,59,48,0.20)' }]}>
                  <Ionicons name="fitness" size={12} color="#FF3B30" />
                  <Text style={[tm.discText, { color: '#FF3B30' }]}>{discipline.toUpperCase()}</Text>
                </View>
                <Text style={tm.title}>RICHIEDI TEMPLATE</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={tm.closeBtn}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.40)" />
              </TouchableOpacity>
            </View>

            <Text style={tm.subtitle}>Manca un Template? Chiedilo ai Coach certificati di {discipline}.</Text>

            {/* Input */}
            {!sent ? (
              <Animated.View entering={FadeIn.duration(300)} style={tm.inputWrap}>
                <TextInput
                  style={tm.input}
                  placeholder="Descrivi il template di cui hai bisogno..."
                  placeholderTextColor="rgba(255,255,255,0.18)"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  maxLength={300}
                  numberOfLines={3}
                />
                <View style={tm.inputFooter}>
                  <Text style={tm.charCount}>{description.length}/300</Text>
                  <TouchableOpacity
                    style={[tm.sendBtn, !description.trim() && { opacity: 0.3 }]}
                    onPress={handleSubmit}
                    disabled={!description.trim() || loading}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <>
                        <Ionicons name="send" size={13} color="#000" />
                        <Text style={tm.sendText}>INVIA</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInUp.duration(300)} style={tm.sentBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#00FF87" />
                <Text style={tm.sentText}>Richiesta inviata ai Coach di {discipline}!</Text>
              </Animated.View>
            )}

            {/* Existing requests */}
            <View style={tm.listHeader}>
              <Text style={tm.listTitle}>RICHIESTE DELLA COMMUNITY</Text>
              <Text style={tm.listCount}>{requests.length}</Text>
            </View>
            {loadingList ? (
              <ActivityIndicator color="#00E5FF" style={{ marginTop: 20 }} />
            ) : (
              <ScrollView style={tm.list} showsVerticalScrollIndicator={false}>
                {requests.length === 0 ? (
                  <View style={tm.emptyWrap}>
                    <Ionicons name="document-text-outline" size={28} color="rgba(255,255,255,0.08)" />
                    <Text style={tm.emptyText}>Nessuna richiesta per {discipline}. Sii il primo!</Text>
                  </View>
                ) : (
                  requests.map((req, i) => (
                    <Animated.View key={req._id} entering={FadeInDown.delay(i * 50).duration(250)} style={tm.reqCard}>
                      <View style={tm.reqContent}>
                        <Text style={tm.reqUser}>@{req.username}</Text>
                        <Text style={tm.reqDesc} numberOfLines={3}>{req.description}</Text>
                        <Text style={tm.reqStatus}>{req.status?.toUpperCase()}</Text>
                      </View>
                      <TouchableOpacity style={[tm.voteBtn, req.user_voted && tm.votedBtn]} onPress={() => handleUpvote(req._id)}>
                        <Ionicons name={req.user_voted ? 'arrow-up' : 'arrow-up-outline'} size={16} color={req.user_voted ? '#00E5FF' : 'rgba(255,255,255,0.3)'} />
                        <Text style={[tm.voteCount, req.user_voted && { color: '#00E5FF' }]}>{req.vote_count}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
//  CATEGORY PROPOSAL MODAL
// ═══════════════════════════════════════════════════════════
interface CategoryProposalProps {
  visible: boolean;
  onClose: () => void;
}

export function CategoryProposalModal({ visible, onClose }: CategoryProposalProps) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [motivation, setMotivation] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [proposals, setProposals] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const fetchProposals = useCallback(async () => {
    if (!token) return;
    setLoadingList(true);
    try {
      const res = await fetch(`${BACKEND}/api/requests/category`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setProposals(await res.json());
    } catch {}
    setLoadingList(false);
  }, [token]);

  useEffect(() => { if (visible) { fetchProposals(); setSent(false); setName(''); setMotivation(''); setError(''); } }, [visible]);

  const handleSubmit = async () => {
    if (!name.trim() || !token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND}/api/requests/category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category_name: name.trim(), motivation: motivation.trim() })
      });
      if (res.ok) {
        setSent(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        fetchProposals();
      } else if (res.status === 409) {
        setError('Questa disciplina è già stata proposta. Usa il voto +1!');
      }
    } catch {}
    setLoading(false);
  };

  const handleUpvote = async (id: string) => {
    if (!token) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const res = await fetch(`${BACKEND}/api/requests/${id}/upvote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchProposals();
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={tm.backdrop}>
          <View style={[tm.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <LinearGradient colors={['#1A1A1A', '#0E0E0E']} style={StyleSheet.absoluteFillObject} />
            {/* Header */}
            <View style={tm.header}>
              <View style={tm.headerLeft}>
                <View style={[tm.discBadge, { backgroundColor: 'rgba(0,229,255,0.08)', borderColor: 'rgba(0,229,255,0.20)' }]}>
                  <Ionicons name="add-circle" size={12} color="#00E5FF" />
                  <Text style={[tm.discText, { color: '#00E5FF' }]}>NUOVA</Text>
                </View>
                <Text style={tm.title}>PROPONI DISCIPLINA</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={tm.closeBtn}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.40)" />
              </TouchableOpacity>
            </View>

            <Text style={tm.subtitle}>Proponi una nuova disciplina per l'Arena. Verrà valutata dagli Admin.</Text>

            {!sent ? (
              <Animated.View entering={FadeIn.duration(300)} style={tm.inputWrap}>
                <TextInput
                  style={[tm.input, { minHeight: 44, maxHeight: 44 }]}
                  placeholder="Nome disciplina (es. Padel, CrossFit, Surf)"
                  placeholderTextColor="rgba(255,255,255,0.18)"
                  value={name}
                  onChangeText={setName}
                  maxLength={50}
                />
                <TextInput
                  style={[tm.input, { marginTop: 10 }]}
                  placeholder="Motivazione (opzionale)"
                  placeholderTextColor="rgba(255,255,255,0.18)"
                  value={motivation}
                  onChangeText={setMotivation}
                  multiline
                  maxLength={200}
                  numberOfLines={2}
                />
                {error ? <Text style={tm.errorText}>{error}</Text> : null}
                <View style={[tm.inputFooter, { marginTop: 8 }]}>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity
                    style={[tm.sendBtn, { backgroundColor: '#00E5FF' }, !name.trim() && { opacity: 0.3 }]}
                    onPress={handleSubmit}
                    disabled={!name.trim() || loading}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <>
                        <Ionicons name="rocket" size={13} color="#000" />
                        <Text style={tm.sendText}>PROPONI</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInUp.duration(300)} style={tm.sentBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#00FF87" />
                <Text style={tm.sentText}>Proposta inviata! Gli Admin la valuteranno.</Text>
              </Animated.View>
            )}

            {/* Existing proposals */}
            <View style={tm.listHeader}>
              <Text style={tm.listTitle}>PROPOSTE ATTIVE</Text>
              <Text style={tm.listCount}>{proposals.length}</Text>
            </View>
            {loadingList ? (
              <ActivityIndicator color="#00E5FF" style={{ marginTop: 20 }} />
            ) : (
              <ScrollView style={tm.list} showsVerticalScrollIndicator={false}>
                {proposals.length === 0 ? (
                  <View style={tm.emptyWrap}>
                    <Ionicons name="bulb-outline" size={28} color="rgba(255,255,255,0.08)" />
                    <Text style={tm.emptyText}>Nessuna proposta ancora. Sii il primo!</Text>
                  </View>
                ) : (
                  proposals.map((p, i) => (
                    <Animated.View key={p._id} entering={FadeInDown.delay(i * 50).duration(250)} style={tm.reqCard}>
                      <View style={tm.reqContent}>
                        <Text style={[tm.reqUser, { color: '#00E5FF' }]}>📍 {p.category_name}</Text>
                        {p.motivation ? <Text style={tm.reqDesc} numberOfLines={2}>{p.motivation}</Text> : null}
                        <Text style={tm.reqMeta}>@{p.username} · {p.status?.toUpperCase()}</Text>
                      </View>
                      <TouchableOpacity style={[tm.voteBtn, p.user_voted && tm.votedBtn]} onPress={() => handleUpvote(p._id)}>
                        <Ionicons name={p.user_voted ? 'arrow-up' : 'arrow-up-outline'} size={16} color={p.user_voted ? '#00E5FF' : 'rgba(255,255,255,0.3)'} />
                        <Text style={[tm.voteCount, p.user_voted && { color: '#00E5FF' }]}>{p.vote_count}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════
const tm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden', maxHeight: '88%', paddingHorizontal: 20, paddingTop: 20
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  discBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1
  },
  discText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },
  title: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_M },
  closeBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center'
  },
  subtitle: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '500', lineHeight: 18, marginBottom: 16 },
  inputWrap: {},
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', color: '#FFF', fontSize: 14, fontWeight: '500',
    paddingHorizontal: 16, paddingVertical: 12, minHeight: 80, textAlignVertical: 'top',
    fontFamily: FONT_M
  },
  inputFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  charCount: { color: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: '600' },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FF3B30', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10
  },
  sendText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },
  sentBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,255,135,0.06)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(0,255,135,0.15)',
    marginBottom: 16
  },
  sentText: { color: '#00FF87', fontSize: 13, fontWeight: '700', flex: 1 },
  errorText: { color: '#FF3B30', fontSize: 12, fontWeight: '600', marginTop: 6 },
  listHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 20, marginBottom: 12
  },
  listTitle: { color: 'rgba(255,255,255,0.30)', fontSize: 11, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_M },
  listCount: { color: 'rgba(255,255,255,0.20)', fontSize: 12, fontWeight: '900', fontFamily: FONT_J },
  list: { flex: 1 },
  emptyWrap: { alignItems: 'center', gap: 8, paddingVertical: 30 },
  emptyText: { color: 'rgba(255,255,255,0.15)', fontSize: 13, fontWeight: '500', textAlign: 'center' },
  reqCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)'
  },
  reqContent: { flex: 1, gap: 3 },
  reqUser: { color: '#FFD700', fontSize: 11, fontWeight: '900', letterSpacing: 0.5, fontFamily: FONT_J },
  reqDesc: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '500', lineHeight: 18 },
  reqStatus: { color: 'rgba(255,255,255,0.15)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginTop: 2 },
  reqMeta: { color: 'rgba(255,255,255,0.20)', fontSize: 10, fontWeight: '600', marginTop: 2 },
  voteBtn: {
    alignItems: 'center', gap: 2,
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    marginLeft: 10
  },
  votedBtn: {
    backgroundColor: 'rgba(0,229,255,0.06)', borderColor: 'rgba(0,229,255,0.15)'
  },
  voteCount: { color: 'rgba(255,255,255,0.30)', fontSize: 13, fontWeight: '900', fontFamily: FONT_J }
});
