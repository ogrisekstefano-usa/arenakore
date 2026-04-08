/**
 * ARENAKORE — CMS EDITOR
 * Manage dynamic app content (announcements, challenge titles, promos).
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/api';

const FM = Platform.select({ web: "'Montserrat', sans-serif", default: undefined });

const CATEGORIES = ['announcement', 'challenge', 'promo', 'system'];
const AUDIENCES = ['all', 'athletes', 'coaches', 'gym_owners'];

interface CMSItem {
  _id: string;
  key: string;
  title: string;
  body: string;
  category: string;
  is_active: boolean;
  target_audience: string;
  priority: number;
  updated_at: string;
}

export default function CMSEditor() {
  const { token } = useAuth();
  const [items, setItems] = useState<CMSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ key: '', title: '', body: '', category: 'announcement', target_audience: 'all', priority: 0 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/cms', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setItems(d.items);
      }
    } catch (e) {}
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.key.trim() || !form.title.trim()) {
      if (Platform.OS === 'web') alert('Chiave e titolo obbligatori');
      else Alert.alert('Errore', 'Chiave e titolo obbligatori');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await apiFetch(`/api/admin/cms/${editId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: form.title, body: form.body, category: form.category, target_audience: form.target_audience, priority: form.priority }),
        });
      } else {
        await apiFetch('/api/admin/cms', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setShowForm(false); setEditId(null);
      setForm({ key: '', title: '', body: '', category: 'announcement', target_audience: 'all', priority: 0 });
      load();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleEdit = (item: CMSItem) => {
    setEditId(item._id);
    setForm({ key: item.key, title: item.title, body: item.body, category: item.category, target_audience: item.target_audience, priority: item.priority });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = Platform.OS === 'web' ? confirm('Eliminare questo contenuto?') : true;
    if (!confirmed) return;
    await apiFetch(`/api/admin/cms/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  const handleToggle = async (item: CMSItem) => {
    await apiFetch(`/api/admin/cms/${item._id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    load();
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.title}>CMS EDITOR</Text>
          <Text style={s.sub}>Gestisci contenuti dinamici dell'app</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => { setShowForm(!showForm); setEditId(null); setForm({ key: '', title: '', body: '', category: 'announcement', target_audience: 'all', priority: 0 }); }}>
          <Ionicons name={showForm ? 'close' : 'add'} size={18} color="#FFF" />
          <Text style={s.addText}>{showForm ? 'CHIUDI' : 'NUOVO'}</Text>
        </TouchableOpacity>
      </View>

      {/* Form */}
      {showForm && (
        <View style={s.form}>
          <Text style={s.formTitle}>{editId ? 'MODIFICA CONTENUTO' : 'NUOVO CONTENUTO'}</Text>

          <Text style={s.label}>CHIAVE UNIVOCA</Text>
          <TextInput style={[s.input, editId ? s.inputDisabled : null]} value={form.key} onChangeText={t => setForm({...form, key: t})} placeholder="es. home_banner_gennaio" placeholderTextColor="rgba(255,255,255,0.15)" editable={!editId} />

          <Text style={s.label}>TITOLO</Text>
          <TextInput style={s.input} value={form.title} onChangeText={t => setForm({...form, title: t})} placeholder="Titolo del contenuto" placeholderTextColor="rgba(255,255,255,0.15)" />

          <Text style={s.label}>CORPO</Text>
          <TextInput style={[s.input, s.textarea]} value={form.body} onChangeText={t => setForm({...form, body: t})} placeholder="Testo del contenuto..." placeholderTextColor="rgba(255,255,255,0.15)" multiline />

          <Text style={s.label}>CATEGORIA</Text>
          <View style={s.chips}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c} style={[s.chip, form.category === c && s.chipActive]} onPress={() => setForm({...form, category: c})}>
                <Text style={[s.chipText, form.category === c && s.chipTextActive]}>{c.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>TARGET</Text>
          <View style={s.chips}>
            {AUDIENCES.map(a => (
              <TouchableOpacity key={a} style={[s.chip, form.target_audience === a && s.chipActive]} onPress={() => setForm({...form, target_audience: a})}>
                <Text style={[s.chipText, form.target_audience === a && s.chipTextActive]}>{a === 'all' ? 'TUTTI' : a.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>PRIORITÀ (0-10)</Text>
          <TextInput style={[s.input, { width: 80 }]} value={String(form.priority)} onChangeText={t => setForm({...form, priority: parseInt(t) || 0})} keyboardType="numeric" />

          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveText}>{editId ? 'AGGIORNA' : 'CREA CONTENUTO'}</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      {loading ? <ActivityIndicator color="#FF2D55" style={{ marginTop: 40 }} /> : (
        <View style={s.list}>
          {items.length === 0 && <Text style={s.empty}>Nessun contenuto CMS creato</Text>}
          {items.map(item => (
            <View key={item._id} style={[s.card, !item.is_active && s.cardInactive]}>
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={s.keyRow}>
                    <Text style={s.itemKey}>{item.key}</Text>
                    <View style={[s.catBadge, { backgroundColor: item.category === 'announcement' ? 'rgba(0,229,255,0.1)' : item.category === 'challenge' ? 'rgba(255,215,0,0.1)' : item.category === 'promo' ? 'rgba(191,90,242,0.1)' : 'rgba(255,255,255,0.05)' }]}>
                      <Text style={[s.catText, { color: item.category === 'announcement' ? '#00E5FF' : item.category === 'challenge' ? '#FFD700' : item.category === 'promo' ? '#BF5AF2' : '#888' }]}>{item.category.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={s.itemTitle}>{item.title}</Text>
                  {item.body ? <Text style={s.itemBody} numberOfLines={2}>{item.body}</Text> : null}
                </View>
                <View style={s.cardActions}>
                  <TouchableOpacity onPress={() => handleToggle(item)} style={s.toggleBtn}>
                    <Ionicons name={item.is_active ? 'eye' : 'eye-off'} size={18} color={item.is_active ? '#30D158' : '#FF453A'} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleEdit(item)} style={s.editBtn}>
                    <Ionicons name="pencil" size={16} color="#00E5FF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item._id)} style={s.delBtn}>
                    <Ionicons name="trash" size={16} color="#FF453A" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.cardMeta}>
                <Text style={s.metaText}>Target: {item.target_audience}</Text>
                <Text style={s.metaText}>Priorità: {item.priority}</Text>
                <Text style={s.metaText}>{new Date(item.updated_at).toLocaleDateString('it-IT')}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { padding: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 4, fontFamily: FM },
  sub: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '500', marginTop: 4, fontFamily: FM },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF2D55', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1, fontFamily: FM },
  form: { backgroundColor: '#151515', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: 'rgba(255,45,85,0.15)', marginBottom: 32 },
  formTitle: { color: '#FF2D55', fontSize: 13, fontWeight: '900', letterSpacing: 3, marginBottom: 8, fontFamily: FM },
  label: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6, marginTop: 14, fontFamily: FM },
  input: { backgroundColor: '#0A0A0A', borderRadius: 10, padding: 14, color: '#FFF', fontSize: 14, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', fontFamily: FM },
  inputDisabled: { opacity: 0.4 },
  textarea: { minHeight: 80, textAlignVertical: 'top' as const },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)' },
  chipActive: { backgroundColor: 'rgba(255,45,85,0.15)', borderWidth: 1, borderColor: 'rgba(255,45,85,0.3)' },
  chipText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1, fontFamily: FM },
  chipTextActive: { color: '#FF2D55' },
  saveBtn: { backgroundColor: '#FF2D55', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  saveText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 2, fontFamily: FM },
  list: { gap: 12 },
  empty: { color: 'rgba(255,255,255,0.2)', fontSize: 13, fontStyle: 'italic', fontFamily: FM, marginTop: 20 },
  card: { backgroundColor: '#151515', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  cardInactive: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', gap: 12 },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  itemKey: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: FM },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  catText: { fontSize: 8, fontWeight: '900', letterSpacing: 1, fontFamily: FM },
  itemTitle: { color: '#FFF', fontSize: 15, fontWeight: '800', fontFamily: FM },
  itemBody: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500', marginTop: 4, fontFamily: FM },
  cardActions: { flexDirection: 'column', gap: 8 },
  toggleBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  editBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(0,229,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  delBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255,69,58,0.08)', alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  metaText: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '600', fontFamily: FM },
});
