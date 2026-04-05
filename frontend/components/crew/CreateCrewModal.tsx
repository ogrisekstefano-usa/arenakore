/**
 * ARENAKORE — Create Crew Modal
 * Extracted from crews.tsx
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { playCrewCreated } from '../../utils/sounds';

const CATEGORIES_MAP: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  atletica:  { icon: 'walk',      color: '#FF6B00' },
  combat:    { icon: 'hand-left', color: '#FF3B30' },
  acqua:     { icon: 'water',     color: '#007AFF' },
  team:      { icon: 'football',  color: '#00FF87' },
  fitness:   { icon: 'barbell',   color: '#FFD700' },
  outdoor:   { icon: 'trail-sign', color: '#30B0C7' },
  mind_body: { icon: 'leaf',      color: '#AF52DE' },
  extreme:   { icon: 'flame',     color: '#FF2D55' }
};

export function CreateCrewModal({ visible, onClose, onCreated, token }: any) {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api.createCrew({ name: name.trim(), tagline: tagline.trim(), category: category || undefined }, token);
      playCrewCreated();
      setName(''); setTagline(''); setCategory(null);
      onCreated();
      onClose();
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Impossibile creare la Crew');
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={m$.backdrop}>
        <View style={m$.card}>
          <Text style={m$.title}>FONDA LA TUA CREW</Text>
          <Text style={m$.subtitle}>Crea la tua trib{'\u00f9'} su ArenaKore</Text>

          <TextInput testID="crew-name-input" style={m$.input} value={name} onChangeText={setName} placeholder="Nome Crew (es. Chicago Hoopers)" placeholderTextColor="#444" maxLength={30} />
          <TextInput style={m$.input} value={tagline} onChangeText={setTagline} placeholder="Tagline (opzionale)" placeholderTextColor="#444" maxLength={50} />

          <Text style={m$.catTitle}>CATEGORIA</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={m$.catRow}>
            {Object.entries(CATEGORIES_MAP).map(([id, cfg]) => (
              <TouchableOpacity
                key={id}
                onPress={() => setCategory(id)}
                style={[m$.catChip, category === id && { borderColor: cfg.color, backgroundColor: `${cfg.color}15` }]}
              >
                <Ionicons name={cfg.icon} size={16} color={category === id ? cfg.color : 'rgba(255,255,255,0.4)'} />
                <Text style={[m$.catLabel, category === id && { color: cfg.color }]}>{id.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity testID="create-crew-btn" style={[m$.createBtn, !name.trim() && { opacity: 0.3 }]} onPress={handleCreate} disabled={!name.trim() || loading}>
            {loading ? <ActivityIndicator color="#050505" /> : <Text style={m$.createBtnText}>FONDA CREW</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={m$.cancelBtn} onPress={onClose}>
            <Text style={m$.cancelText}>Annulla</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export { CATEGORIES_MAP };

const m$ = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  card: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 12 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  subtitle: { color: '#AAAAAA', fontSize: 18, marginBottom: 4 },
  input: {
    backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14,
    color: '#FFFFFF', fontSize: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)'
  },
  catTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '800', letterSpacing: 2, marginTop: 4 },
  catRow: { gap: 8, paddingVertical: 4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2A2A2A'
  },
  catLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  createBtn: { backgroundColor: '#FFD700', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  createBtnText: { color: '#000000', fontSize: 17, fontWeight: '900', letterSpacing: 2 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: 'rgba(255,255,255,0.4)', fontSize: 19, fontWeight: '600' }
});
