/**
 * ARENAKORE — LEAD & GYM ACTIVATION PANEL
 * Manage inbound gym requests from landing page.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/api';

const FM = Platform.select({ web: "'Montserrat', sans-serif", default: undefined });

interface Lead {
  _id: string;
  gym_name: string;
  city: string;
  address: string;
  email: string;
  phone: string;
  referent_name: string;
  structure_type: string;
  message: string;
  status: string;
  created_at: string;
  notes_admin: string;
}

export default function LeadsPanel() {
  const { token } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/admin/leads?status=${filter}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setLeads(d.leads);
        setCounts(d.counts);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token, filter]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const handleActivate = async (leadId: string) => {
    setActionLoading(leadId);
    try {
      const res = await apiFetch(`/api/admin/leads/${leadId}/activate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_tier: 'pro' }),
      });
      if (res.ok) {
        const d = await res.json();
        if (Platform.OS === 'web') alert(`Palestra attivata! Codice: ${d.gym_code}`);
        else Alert.alert('Attivata!', `Codice palestra: ${d.gym_code}`);
        load();
      }
    } catch (e) { console.error(e); }
    setActionLoading('');
  };

  const handleReject = async (leadId: string) => {
    setActionLoading(leadId);
    try {
      await apiFetch(`/api/admin/leads/${leadId}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Richiesta non approvata' }),
      });
      load();
    } catch (e) { console.error(e); }
    setActionLoading('');
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>LEAD & PALESTRE</Text>
      <Text style={s.sub}>Richieste di attivazione dalla landing page</Text>

      {/* Filter tabs */}
      <View style={s.tabs}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.tab, filter === f && s.tabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.tabText, filter === f && s.tabTextActive]}>
              {f === 'pending' ? `IN ATTESA (${counts.pending})` :
               f === 'approved' ? `APPROVATE (${counts.approved})` :
               f === 'rejected' ? `RIFIUTATE (${counts.rejected})` : 'TUTTE'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color="#FF2D55" style={{ marginTop: 40 }} /> : (
        <View style={s.list}>
          {leads.length === 0 && <Text style={s.empty}>Nessun lead {filter !== 'all' ? filter : ''}</Text>}
          {leads.map(lead => (
            <View key={lead._id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.cardIcon}>
                  <Ionicons name="business" size={20} color="#FF2D55" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.gymName}>{lead.gym_name}</Text>
                  <Text style={s.referent}>{lead.referent_name} — {lead.structure_type}</Text>
                </View>
                <View style={[s.statusBadge, {
                  backgroundColor: lead.status === 'pending' ? 'rgba(255,159,10,0.15)' :
                    lead.status === 'approved' ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.15)'
                }]}>
                  <Text style={[s.statusText, {
                    color: lead.status === 'pending' ? '#FF9F0A' :
                      lead.status === 'approved' ? '#30D158' : '#FF453A'
                  }]}>
                    {lead.status === 'pending' ? 'IN ATTESA' :
                     lead.status === 'approved' ? 'APPROVATA' : 'RIFIUTATA'}
                  </Text>
                </View>
              </View>

              <View style={s.cardBody}>
                <InfoRow icon="location" text={`${lead.city}${lead.address ? ' — ' + lead.address : ''}`} />
                <InfoRow icon="mail" text={lead.email} />
                <InfoRow icon="call" text={lead.phone} />
                {lead.message ? <InfoRow icon="chatbox" text={lead.message} /> : null}
                <InfoRow icon="time" text={new Date(lead.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
              </View>

              {lead.status === 'pending' && (
                <View style={s.actions}>
                  <TouchableOpacity
                    style={s.approveBtn}
                    onPress={() => handleActivate(lead._id)}
                    disabled={actionLoading === lead._id}
                  >
                    {actionLoading === lead._id ? <ActivityIndicator size="small" color="#FFF" /> :
                      <><Ionicons name="checkmark-circle" size={16} color="#FFF" />
                      <Text style={s.btnText}>ATTIVA PALESTRA</Text></>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.rejectBtn}
                    onPress={() => handleReject(lead._id)}
                    disabled={actionLoading === lead._id}
                  >
                    <Ionicons name="close-circle" size={16} color="#FF453A" />
                    <Text style={[s.btnText, { color: '#FF453A' }]}>RIFIUTA</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon as any} size={14} color="rgba(255,255,255,0.3)" />
      <Text style={s.infoText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { padding: 32 },
  title: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 4, fontFamily: FM },
  sub: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '500', marginTop: 4, marginBottom: 24, fontFamily: FM },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)' },
  tabActive: { backgroundColor: 'rgba(255,45,85,0.15)', borderWidth: 1, borderColor: 'rgba(255,45,85,0.3)' },
  tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1, fontFamily: FM },
  tabTextActive: { color: '#FF2D55' },
  list: { gap: 16 },
  empty: { color: 'rgba(255,255,255,0.2)', fontSize: 13, fontStyle: 'italic', fontFamily: FM, marginTop: 40, textAlign: 'center' as const },
  card: { backgroundColor: '#151515', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,45,85,0.1)', alignItems: 'center', justifyContent: 'center' },
  gymName: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 1, fontFamily: FM },
  referent: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', marginTop: 2, fontFamily: FM },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, fontFamily: FM },
  cardBody: { gap: 8, marginBottom: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500', fontFamily: FM },
  actions: { flexDirection: 'row', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#30D158', paddingVertical: 12, borderRadius: 10 },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,69,58,0.1)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,69,58,0.3)' },
  btnText: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 1, fontFamily: FM },
});
