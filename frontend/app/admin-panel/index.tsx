/**
 * ARENAKORE — SUPER ADMIN DASHBOARD
 * Platform-wide KPIs and overview.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/api';

const FM = Platform.select({ web: "'Montserrat', sans-serif", default: undefined });

interface DashboardData {
  total_users: number;
  total_gyms: number;
  total_scans: number;
  recent_scans_30d: number;
  total_challenges: number;
  total_crews: number;
  pending_leads: number;
  new_users_30d: number;
  role_distribution: { athletes: number; coaches: number; gym_owners: number };
  top_cities: { city: string; count: number }[];
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
    setRefreshing(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#FF2D55" /></View>;

  const d = data;
  if (!d) return <View style={s.center}><Text style={s.err}>Errore caricamento dashboard</Text></View>;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FF2D55" />}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>COMMAND CENTER</Text>
        <Text style={s.sub}>Panoramica globale della piattaforma ARENAKORE</Text>
      </View>

      {/* KPI Grid */}
      <View style={s.grid}>
        <KPICard icon="people" label="UTENTI TOTALI" value={d.total_users} color="#FF2D55" />
        <KPICard icon="business" label="PALESTRE" value={d.total_gyms} color="#00E5FF" />
        <KPICard icon="body" label="SCANSIONI" value={d.total_scans} color="#FFD700" />
        <KPICard icon="flash" label="SCAN 30G" value={d.recent_scans_30d} color="#30D158" />
        <KPICard icon="trophy" label="SFIDE" value={d.total_challenges} color="#BF5AF2" />
        <KPICard icon="people-circle" label="CREW" value={d.total_crews} color="#FF9F0A" />
        <KPICard icon="person-add" label="NUOVI 30G" value={d.new_users_30d} color="#64D2FF" />
        <KPICard icon="hourglass" label="LEAD PENDING" value={d.pending_leads} color={d.pending_leads > 0 ? '#FF453A' : '#30D158'} highlight={d.pending_leads > 0} />
      </View>

      {/* Role Distribution */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>DISTRIBUZIONE RUOLI</Text>
        <View style={s.roleRow}>
          <RoleBar label="ATLETI" count={d.role_distribution.athletes} total={d.total_users} color="#00E5FF" />
          <RoleBar label="COACH" count={d.role_distribution.coaches} total={d.total_users} color="#FFD700" />
          <RoleBar label="GYM OWNER" count={d.role_distribution.gym_owners} total={d.total_users} color="#FF2D55" />
        </View>
      </View>

      {/* Top Cities */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>TOP CITTÀ</Text>
        {d.top_cities.map((c, i) => (
          <View key={i} style={s.cityRow}>
            <Text style={s.cityRank}>#{i + 1}</Text>
            <Text style={s.cityName}>{c.city}</Text>
            <View style={s.cityBarWrap}>
              <View style={[s.cityBar, { width: `${Math.min(100, (c.count / Math.max(1, d.top_cities[0]?.count)) * 100)}%` }]} />
            </View>
            <Text style={s.cityCount}>{c.count}</Text>
          </View>
        ))}
        {d.top_cities.length === 0 && <Text style={s.empty}>Nessun dato città disponibile</Text>}
      </View>
    </ScrollView>
  );
}

function KPICard({ icon, label, value, color, highlight }: { icon: string; label: string; value: number; color: string; highlight?: boolean }) {
  return (
    <View style={[s.kpi, highlight && { borderColor: color, borderWidth: 1 }]}>
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={[s.kpiValue, { color }]}>{value.toLocaleString()}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

function RoleBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={s.roleItem}>
      <View style={s.roleLabelRow}>
        <Text style={[s.roleLabel, { color }]}>{label}</Text>
        <Text style={s.roleCount}>{count} ({pct}%)</Text>
      </View>
      <View style={s.roleBarBg}>
        <View style={[s.roleBarFg, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { padding: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A' },
  err: { color: '#FF453A', fontSize: 13, fontWeight: '700', fontFamily: FM },
  header: { marginBottom: 32 },
  title: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 4, fontFamily: FM },
  sub: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '500', marginTop: 4, fontFamily: FM },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 40 },
  kpi: {
    width: 180, backgroundColor: '#151515', borderRadius: 16, padding: 20,
    gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  kpiValue: { fontSize: 32, fontWeight: '900', fontFamily: FM },
  kpiLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, fontFamily: FM },
  section: { marginBottom: 32 },
  sectionTitle: { color: '#FF2D55', fontSize: 13, fontWeight: '900', letterSpacing: 3, marginBottom: 16, fontFamily: FM },
  roleRow: { gap: 16 },
  roleItem: { marginBottom: 12 },
  roleLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  roleLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, fontFamily: FM },
  roleCount: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', fontFamily: FM },
  roleBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3 },
  roleBarFg: { height: 6, borderRadius: 3 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  cityRank: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '800', width: 24, fontFamily: FM },
  cityName: { color: '#FFF', fontSize: 13, fontWeight: '700', width: 120, letterSpacing: 1, fontFamily: FM },
  cityBarWrap: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2 },
  cityBar: { height: 4, backgroundColor: '#FF2D55', borderRadius: 2 },
  cityCount: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', width: 40, textAlign: 'right' as const, fontFamily: FM },
  empty: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontStyle: 'italic', fontFamily: FM },
});
