/**
 * STAFF MANAGEMENT — GYM_OWNER adds/removes coaches and changes roles
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const ROLE_CFG: Record<string, { color: string; bg: string }> = {
  GYM_OWNER: { color: '#FFD700', bg: 'rgba(255,215,0,0.1)' },
  COACH:     { color: '#00E5FF', bg: 'rgba(0,229,255,0.08)' },
  ATHLETE:   { color: 'rgba(255,255,255,0.30)', bg: 'rgba(255,255,255,0.04)' }
};

export default function StaffManagement() {
  const { token } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('COACH');
  const [adding, setAdding] = useState(false);
  const [removing, setRemovingId] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    try {
      const d = await api.getGymStaff(token);
      setStaff(d.staff || []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const handleAdd = async () => {
    if (!token || !newEmail.trim()) return;
    setAdding(true);
    try {
      const res = await api.addGymStaff(newEmail.trim().toLowerCase(), newRole, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('AGGIUNTO', `${res.username} è ora ${res.role} in ${res.gym}`);
      setNewEmail('');
      load();
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Impossibile aggiungere');
    } finally { setAdding(false); }
  };

  const handleRemove = async (userId: string, username: string) => {
    if (!token) return;
    Alert.alert('RIMUOVI', `Rimuovere ${username} dalla palestra?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'RIMUOVI', style: 'destructive', onPress: async () => {
          setRemovingId(userId);
          try {
            await api.removeGymStaff(userId, token);
            load();
          } catch (e: any) {
            Alert.alert('Errore', e?.message || 'Impossibile rimuovere');
          } finally { setRemovingId(null); }
        }
      }
    ]);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!token) return;
    try {
      await api.updateUserRole(userId, newRole, token);
      load();
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Impossibile cambiare ruolo');
    }
  };

  if (loading) return <View style={s$.center}><ActivityIndicator color="#00E5FF" /></View>;

  return (
    <ScrollView style={s$.root} contentContainerStyle={s$.content}>
      <Text style={s$.pageTitle}>STAFF MANAGEMENT</Text>
      <Text style={s$.pageSub}>Gestisci Coach e ruoli della tua palestra</Text>

      <View style={s$.twoCol}>
        {/* Staff list */}
        <View style={s$.col}>
          <View style={s$.card}>
            <Text style={s$.sectionLabel}>STAFF ATTIVO ({staff.length})</Text>
            {staff.length === 0 ? (
              <View style={s$.empty}>
                <Ionicons name="people-outline" size={28} color="rgba(255,255,255,0.1)" />
                <Text style={s$.emptyText}>Nessuno staff ancora.{'\n'}Aggiungi un Coach usando il form.</Text>
              </View>
            ) : staff.map((member, i) => {
              const rc = ROLE_CFG[member.role] || ROLE_CFG.ATHLETE;
              return (
                <Animated.View key={member.id} entering={FadeInDown.delay(i * 50).duration(200)} style={s$.memberRow}>
                  <View style={[s$.avatar, { backgroundColor: member.role === 'GYM_OWNER' ? '#FFD700' : '#00E5FF' }]}>
                    <Text style={s$.avatarLetter}>{member.username?.[0] || '?'}</Text>
                  </View>
                  <View style={s$.memberInfo}>
                    <Text style={s$.memberName}>{member.username}</Text>
                    <Text style={s$.memberEmail}>{member.email}</Text>
                    <Text style={s$.memberMeta}>LVL {member.level} · {member.xp?.toLocaleString()} FLUX</Text>
                  </View>
                  <View style={s$.actions}>
                    <View style={[s$.roleBadge, { backgroundColor: rc.bg, borderColor: rc.color + '50' }]}>
                      <Text style={[s$.roleText, { color: rc.color }]}>{member.role}</Text>
                    </View>
                    {/* Role switcher */}
                    {member.role !== 'GYM_OWNER' && (
                      <TouchableOpacity
                        style={s$.switchBtn}
                        onPress={() => handleRoleChange(member.id, member.role === 'COACH' ? 'ATHLETE' : 'COACH')}
                      >
                        <Ionicons name="swap-horizontal" size={12} color="rgba(255,255,255,0.3)" />
                        <Text style={s$.switchText}>{member.role === 'COACH' ? '→ ATHLETE' : '→ COACH'}</Text>
                      </TouchableOpacity>
                    )}
                    {member.role !== 'GYM_OWNER' && (
                      <TouchableOpacity
                        style={s$.removeBtn}
                        onPress={() => handleRemove(member.id, member.username)}
                        disabled={removing === member.id}
                      >
                        {removing === member.id
                          ? <ActivityIndicator color="#FF3B30" size="small" />
                          : <Ionicons name="trash-outline" size={14} color="#FF3B30" />}
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Add staff */}
        <View style={s$.rightCol}>
          <View style={s$.card}>
            <Text style={s$.sectionLabel}>AGGIUNGI STAFF</Text>
            <Text style={s$.addDesc}>Inserisci l'email di un utente ARENAKORE registrato per aggiungerlo alla tua palestra.</Text>

            <View style={s$.fieldGroup}>
              <Text style={s$.fieldLabel}>EMAIL UTENTE</Text>
              <TextInput
                style={s$.input}
                placeholder="email@esempio.com"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={newEmail}
                onChangeText={setNewEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={s$.fieldGroup}>
              <Text style={s$.fieldLabel}>RUOLO</Text>
              <View style={s$.roleRow}>
                {['COACH', 'ATHLETE'].map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[s$.roleOption, newRole === r && { borderColor: ROLE_CFG[r].color, backgroundColor: ROLE_CFG[r].bg }]}
                    onPress={() => setNewRole(r)}
                  >
                    <Text style={[s$.roleOptionText, newRole === r && { color: ROLE_CFG[r].color }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[s$.addBtn, (adding || !newEmail.trim()) && s$.addBtnOff]}
              onPress={handleAdd}
              disabled={adding || !newEmail.trim()}
              activeOpacity={0.85}
            >
              {adding ? <ActivityIndicator color="#000" size="small" /> : (
                <><Ionicons name="person-add" size={15} color="#000" /><Text style={s$.addBtnText}>AGGIUNGI ALLA PALESTRA</Text></>
              )}
            </TouchableOpacity>

            <View style={s$.infoBox}>
              <Ionicons name="shield-checkmark" size={13} color="rgba(0,229,255,0.5)" />
              <Text style={s$.infoText}>Solo il GYM_OWNER può aggiungere o rimuovere staff. Ogni Coach può vedere solo i propri Kore.</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const s$ = StyleSheet.create({
  root: { flex: 1 }, content: { padding: 28, gap: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 4 },
  pageSub: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '300' },
  twoCol: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  col: { flex: 1.5 },
  rightCol: { flex: 1 },
  card: { backgroundColor: '#0A0A0A', borderRadius: 14, padding: 18, gap: 12, borderWidth: 1, borderColor: '#1E1E1E' },
  sectionLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 4 },
  empty: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 14, textAlign: 'center', lineHeight: 18 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#111' },
  avatar: { width: 36, height: 36, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#000', fontSize: 18, fontWeight: '900' },
  memberInfo: { flex: 1, gap: 1 },
  memberName: { color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  memberEmail: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '300' },
  memberMeta: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },
  actions: { alignItems: 'flex-end', gap: 6 },
  roleBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roleText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  switchBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  switchText: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '700' },
  removeBtn: { padding: 4 },
  addDesc: { color: 'rgba(255,255,255,0.30)', fontSize: 14, fontWeight: '300', lineHeight: 17 },
  fieldGroup: { gap: 6 },
  fieldLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  input: { backgroundColor: '#111', color: '#FFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: '#1E1E1E', outlineStyle: 'none' } as any,
  roleRow: { flexDirection: 'row', gap: 8 },
  roleOption: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  roleOptionText: { color: 'rgba(255,255,255,0.30)', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#00E5FF', borderRadius: 8, paddingVertical: 12 },
  addBtnOff: { opacity: 0.4 },
  addBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(0,229,255,0.05)', borderRadius: 8, padding: 10 },
  infoText: { flex: 1, color: '#00E5FF22', fontSize: 13, fontWeight: '300', lineHeight: 16 }
});
