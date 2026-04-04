/**
 * ARENAKORE — SETTINGS SCREEN
 * Tab: Profilo, Account, Dati Fisici, Privacy
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

const TABS = ['PROFILO', 'ACCOUNT', 'DATI FISICI', 'PRIVACY'] as const;
type TabKey = typeof TABS[number];

const GENDER_OPTIONS = ['M', 'F', 'ALTRO'];
const LANG_OPTIONS = ['IT', 'EN', 'ES', 'DE'];

export default function SettingsScreen() {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('PROFILO');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', username: '',
    email: '', weight: '', height: '',
    gender: 'M', language: 'IT',
  });

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        email: user.email || '',
        weight: user.weight ? String(user.weight) : '',
        height: user.height ? String(user.height) : '',
        gender: user.gender || 'M',
        language: user.language || 'IT',
      });
    }
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!token) return;
    setSaving(true);
    try {
      const body: any = {};
      if (tab === 'PROFILO') {
        body.first_name = form.first_name.trim();
        body.last_name = form.last_name.trim();
        body.username = form.username.trim();
        body.language = form.language;
      } else if (tab === 'DATI FISICI') {
        body.weight = parseFloat(form.weight) || null;
        body.height = parseFloat(form.height) || null;
        body.gender = form.gender;
      }
      const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/auth/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        Alert.alert('SALVATO', 'Profilo aggiornato con successo.');
        if (refreshUser) refreshUser();
      } else {
        const d = await res.json();
        Alert.alert('Errore', d.detail || 'Impossibile salvare');
      }
    } catch (e) {
      Alert.alert('Errore', 'Errore di rete');
    } finally {
      setSaving(false);
    }
  }, [token, tab, form]);

  const F = ({ label, value, field, editable = true, keyboardType = 'default' as any }: any) => (
    <View style={se$.fieldWrap}>
      <Text style={se$.fieldLabel}>{label}</Text>
      <TextInput
        style={[se$.fieldInput, !editable && se$.fieldReadOnly]}
        value={value}
        onChangeText={editable ? (v: string) => setForm(p => ({ ...p, [field]: v })) : undefined}
        editable={editable}
        placeholderTextColor="rgba(255,255,255,0.15)"
        keyboardType={keyboardType}
        selectionColor="#00E5FF"
      />
    </View>
  );

  const ChipRow = ({ options, selected, field }: { options: string[]; selected: string; field: string }) => (
    <View style={se$.chipRow}>
      {options.map(o => (
        <TouchableOpacity
          key={o}
          style={[se$.chip, selected === o && se$.chipActive]}
          onPress={() => setForm(p => ({ ...p, [field]: o }))}
          activeOpacity={0.8}
        >
          <Text style={[se$.chipText, selected === o && se$.chipTextActive]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={se$.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#000' }}>
        <View style={se$.header}>
          <TouchableOpacity onPress={() => router.back()} style={se$.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#00E5FF" />
          </TouchableOpacity>
          <Text style={se$.headerTitle}>SETTINGS</Text>
        </View>
      </SafeAreaView>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={se$.tabBar} contentContainerStyle={se$.tabBarContent}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[se$.tabItem, tab === t && se$.tabItemActive]} onPress={() => setTab(t)} activeOpacity={0.8}>
            <Text style={[se$.tabText, tab === t && se$.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={se$.scroll} showsVerticalScrollIndicator={false}>
          {tab === 'PROFILO' && (
            <>
              <F label="NOME" value={form.first_name} field="first_name" />
              <F label="COGNOME" value={form.last_name} field="last_name" />
              <F label="USERNAME" value={form.username} field="username" />
              <F label="EMAIL" value={form.email} field="email" editable={false} />
              <Text style={se$.fieldLabel}>LINGUA</Text>
              <ChipRow options={LANG_OPTIONS} selected={form.language} field="language" />
            </>
          )}

          {tab === 'ACCOUNT' && (
            <>
              <F label="EMAIL" value={form.email} field="email" editable={false} />
              <View style={se$.infoCard}>
                <Ionicons name="information-circle" size={18} color="rgba(255,255,255,0.3)" />
                <Text style={se$.infoText}>Per cambiare email o password, contatta il supporto.</Text>
              </View>
              <TouchableOpacity style={se$.dangerBtn} onPress={() => Alert.alert('Conferma', 'Vuoi eliminare il tuo account? Questa azione è irreversibile.', [{ text: 'Annulla' }, { text: 'Elimina', style: 'destructive' }])} activeOpacity={0.85}>
                <Ionicons name="trash" size={16} color="#FF3B30" />
                <Text style={se$.dangerText}>ELIMINA ACCOUNT</Text>
              </TouchableOpacity>
            </>
          )}

          {tab === 'DATI FISICI' && (
            <>
              <F label="PESO (KG)" value={form.weight} field="weight" keyboardType="decimal-pad" />
              <F label="ALTEZZA (CM)" value={form.height} field="height" keyboardType="number-pad" />
              <Text style={se$.fieldLabel}>SESSO</Text>
              <ChipRow options={GENDER_OPTIONS} selected={form.gender} field="gender" />
            </>
          )}

          {tab === 'PRIVACY' && (
            <>
              <View style={se$.privacyCard}>
                <Ionicons name="eye-off" size={20} color="#00E5FF" />
                <View style={{ flex: 1 }}>
                  <Text style={se$.privacyTitle}>PROFILO VISIBILE</Text>
                  <Text style={se$.privacyDesc}>I Coach e i Kore possono trovarti nella ricerca.</Text>
                </View>
              </View>
              <View style={se$.privacyCard}>
                <Ionicons name="shield-checkmark" size={20} color="#00FF87" />
                <View style={{ flex: 1 }}>
                  <Text style={se$.privacyTitle}>DATI BIOMETRICI</Text>
                  <Text style={se$.privacyDesc}>I tuoi dati DNA sono criptati e accessibili solo a te e ai Coach autorizzati.</Text>
                </View>
              </View>
            </>
          )}

          {/* Save Button (only for editable tabs) */}
          {(tab === 'PROFILO' || tab === 'DATI FISICI') && (
            <TouchableOpacity style={se$.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#000" /> : (
                <><Ionicons name="checkmark" size={18} color="#000" /><Text style={se$.saveBtnText}>SALVA</Text></>
              )}
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const se$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,229,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  tabBar: { maxHeight: 42 },
  tabBarContent: { paddingHorizontal: 16, gap: 6 },
  tabItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#1C1C1E' },
  tabItemActive: { borderColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.08)' },
  tabText: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  tabTextActive: { color: '#00E5FF' },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 6 },
  fieldInput: { backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1C1C1E', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#FFF', fontSize: 16, fontWeight: '600' },
  fieldReadOnly: { opacity: 0.4 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#1C1C1E', backgroundColor: '#0A0A0A' },
  chipActive: { borderColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.08)' },
  chipText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  chipTextActive: { color: '#00E5FF' },
  infoCard: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1C1C1E', backgroundColor: '#0A0A0A', marginBottom: 16 },
  infoText: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '400', flex: 1, lineHeight: 18 },
  privacyCard: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1C1C1E', backgroundColor: '#0A0A0A', marginBottom: 10 },
  privacyTitle: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
  privacyDesc: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '400', lineHeight: 16, marginTop: 2 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,59,48,0.3)', borderRadius: 12, paddingVertical: 14, marginTop: 20 },
  dangerText: { color: '#FF3B30', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#00E5FF', borderRadius: 12, paddingVertical: 14, marginTop: 12 },
  saveBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
});
