/**
 * ARENAKORE — Invite Modal
 * Extracted from crews.tsx
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';

export function InviteModal({ visible, onClose, crewId, token }: any) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    if (text.length >= 2) {
      setSearching(true);
      debounce.current = setTimeout(async () => {
        try { const r = await api.searchUsers(text, token); setResults(r); }
        catch { setResults([]); }
        finally { setSearching(false); }
      }, 300);
    } else { setResults([]); }
  };

  const handleInvite = async (username: string) => {
    setInviting(username);
    try {
      await api.inviteToCrew(crewId, username, token);
      Alert.alert('Invito inviato!', `${username} ha ricevuto il tuo invito.`);
      setResults(prev => prev.filter(r => r.username !== username));
    } catch (e: any) { Alert.alert('Errore', e?.message || 'Impossibile invitare'); }
    finally { setInviting(null); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={inv$.backdrop}>
        <View style={inv$.card}>
          <Text style={inv$.title}>INVITA KORE MEMBER</Text>
          <View style={inv$.searchBox}>
            <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" />
            <TextInput testID="invite-search-input" style={inv$.searchInput} value={query} onChangeText={handleSearch} placeholder="Cerca per username..." placeholderTextColor="#444" autoCapitalize="none" />
            {searching && <ActivityIndicator color="#00E5FF" size="small" />}
          </View>
          <ScrollView style={inv$.results}>
            {results.map(u => (
              <View key={u.id} style={inv$.userRow}>
                <View style={[inv$.avatar, { backgroundColor: u.avatar_color }]}>
                  <Text style={inv$.avatarText}>{u.username?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={inv$.userInfo}>
                  <Text style={inv$.userName}>{u.username}</Text>
                  <Text style={inv$.userXP}>LVL {u.level} {'\u00b7'} {u.xp} FLUX</Text>
                </View>
                <TouchableOpacity style={inv$.inviteBtn} onPress={() => handleInvite(u.username)} disabled={inviting === u.username}>
                  {inviting === u.username ? <ActivityIndicator color="#050505" size="small" /> : <Text style={inv$.inviteBtnText}>INVITA</Text>}
                </TouchableOpacity>
              </View>
            ))}
            {query.length >= 2 && results.length === 0 && !searching && (
              <Text style={inv$.noResults}>Nessun utente trovato</Text>
            )}
          </ScrollView>
          <TouchableOpacity style={inv$.closeBtn} onPress={onClose}>
            <Text style={inv$.closeText}>CHIUDI</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const inv$ = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  card: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '70%' },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)'
  },
  searchInput: { flex: 1, color: '#FFF', fontSize: 19, padding: 0 },
  results: { marginTop: 12 },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.45)'
  },
  avatar: { width: 36, height: 36, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#000000', fontSize: 19, fontWeight: '900' },
  userInfo: { flex: 1, gap: 2 },
  userName: { color: '#FFF', fontSize: 19, fontWeight: '800' },
  userXP: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '600' },
  inviteBtn: { backgroundColor: '#00E5FF', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 8 },
  inviteBtnText: { color: '#000000', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  noResults: { color: 'rgba(255,255,255,0.4)', fontSize: 18, textAlign: 'center', padding: 20 },
  closeBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  closeText: { color: 'rgba(255,255,255,0.4)', fontSize: 19, fontWeight: '600' }
});
