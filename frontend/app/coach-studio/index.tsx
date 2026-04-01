/**
 * DASHBOARD PANOPTICON — Global command overview
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { KPICard, ActivityHeatmap, AlertRow, SectionHeader } from '../../components/studio/StudioComponents';
import { LiveMonitorPanel } from '../../components/studio/LiveMonitor';
import { useToast } from '../../components/studio/StudioToast';

export default function PanopticonDashboard() {
  const { token, user } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [athletes, setAthletes] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [battles, setBattles] = useState<any>(null);
  const [gymData, setGymData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.getCoachAthletes(token),
      api.getCoachCompliance(token),
      api.getCoachHeatmap(token),
      api.getCoachAlerts(token),
      api.getCoachBattleStats(token),
      api.getGymMe(token),
    ]).then(([a, c, h, al, b, g]) => {
      setAthletes(a); setCompliance(c); setHeatmap(h);
      setAlerts(al); setBattles(b); setGymData(g?.gym);
      // Show critical AI alerts as Toast notifications
      const critical = (al?.alerts || []).filter((x: any) => x.severity === 'danger');
      critical.slice(0, 2).forEach((al: any) => {
        addToast(al.message, 'error', `CRITICAL — ${al.athlete}`);
      });
      const warnings = (al?.alerts || []).filter((x: any) => x.severity === 'warning');
      warnings.slice(0, 1).forEach((al: any) => {
        addToast(al.message, 'warning', `ATTENZIONE — ${al.athlete}`);
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <View style={p$.center}><ActivityIndicator color="#00F2FF" /></View>;

  const avgDna = athletes?.athletes?.length
    ? Math.round(athletes.athletes.reduce((s: number, a: any) => s + a.dna_avg, 0) / athletes.athletes.length) : 0;
  const avgComp = compliance?.templates?.length
    ? Math.round(compliance.templates.reduce((s: number, t: any) => s + t.compliance_pct, 0) / compliance.templates.length) : 0;

  return (
    <ScrollView style={p$.root} contentContainerStyle={p$.content}>
      <View style={p$.pageHeader}>
        <View>
          <Text style={p$.pageTitle}>PANOPTICON</Text>
          <Text style={p$.pageSub}>{user?.username?.toUpperCase()} · SHADOW SQUAD · {athletes?.total || 0} ATLETI</Text>
        </View>
        <TouchableOpacity style={p$.actionBtn} onPress={() => router.push('/coach-studio/builder' as any)}>
          <Ionicons name="add" size={14} color="#000" />
          <Text style={p$.actionBtnText}>NUOVO TEMPLATE</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Row */}
      <View style={p$.kpiRow}>
        <KPICard icon="👥" label="ATLETI ATTIVI" value={athletes?.total || 0} sub={`${athletes?.crew_count || 0} crew`} color="#00F2FF" />
        <KPICard icon="🧬" label="DNA MEDIO" value={avgDna} sub="/ 100 KORE" color="#D4AF37" trend="up" />
        <KPICard icon="⚡" label="COMPLIANCE" value={`${avgComp}%`} sub="template completion" color="#34C759" />
        <KPICard icon="🛡" label="BATTLE W/L" value={`${battles?.wins || 0}/${battles?.losses || 0}`} sub={`${battles?.win_rate || 0}% win rate`} color="#AF52DE" />
        <KPICard icon="📤" label="TEMPLATE" value={compliance?.total || 0} sub="inviati" color="#FF9500" />
      </View>

      {/* Two columns: heatmap + alerts */}
      <View style={p$.twoCol}>
        <View style={p$.col2}>
          {heatmap?.grid && (
            <ActivityHeatmap grid={heatmap.grid} totalScans={heatmap.total_scans} activeDays={heatmap.active_days} />
          )}
        </View>
        <View style={p$.col2}>
          <View style={p$.alertCard}>
            <View style={p$.alertHeader}>
              <Ionicons name="warning" size={14} color="#FF453A" />
              <Text style={p$.alertTitle}>ALERT CENTER</Text>
              {alerts?.critical > 0 && (
                <View style={p$.critBadge}><Text style={p$.critText}>{alerts.critical} CRITICAL</Text></View>
              )}
            </View>
            {(!alerts?.alerts || alerts.alerts.length === 0) ? (
              <View style={p$.alertEmpty}>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                <Text style={p$.alertEmptyText}>Tutti i parametri nella norma</Text>
              </View>
            ) : (
              alerts.alerts.slice(0, 6).map((al: any, i: number) => <AlertRow key={i} alert={al} />)
            )}
          </View>
        </View>
      </View>

      {/* LIVE MONITOR — Real-time scan feed */}
      <View style={p$.section}>
        <SectionHeader title="LIVE MONITOR" sub="Scan in tempo reale — WebSocket + polling" />
        <LiveMonitorPanel gymId={gymData?.id} />
      </View>

      {/* Recent battles */}
      {battles?.battles?.length > 0 && (
        <View style={p$.section}>
          <SectionHeader title="BATTLE RECENTI" sub="Crew battle history" />
          {battles.battles.slice(0, 4).map((b: any) => (
            <View key={b.id} style={p$.battleRow}>
              <View style={[p$.resultPill, { backgroundColor: b.my_result === 'win' ? '#34C75920' : b.my_result === 'loss' ? '#FF453A20' : '#1E1E1E' }]}>
                <Text style={[p$.resultText, { color: b.my_result === 'win' ? '#34C759' : b.my_result === 'loss' ? '#FF453A' : '#888' }]}>
                  {b.my_result === 'win' ? 'WIN' : b.my_result === 'loss' ? 'LOSS' : (b.status || 'ACTIVE').toUpperCase()}
                </Text>
              </View>
              <Text style={p$.battleName}>{b.crew_a} <Text style={p$.battleScore}>{b.score_a}</Text> vs <Text style={p$.battleScore}>{b.score_b}</Text> {b.crew_b}</Text>
              <Text style={p$.battleDate}>{b.started_at?.slice(0, 10)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const p$ = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' }, content: { padding: 28, gap: 22, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pageTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 4 },
  pageSub: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '300', marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#00F2FF', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  actionBtnText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  twoCol: { flexDirection: 'row', gap: 16 },
  col2: { flex: 1 },
  alertCard: { backgroundColor: '#0A0A0A', borderRadius: 12, padding: 16, gap: 6, borderWidth: 1, borderColor: '#1E1E1E', minHeight: 200 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  alertTitle: { flex: 1, color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  critBadge: { backgroundColor: '#FF453A20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#FF453A40' },
  critText: { color: '#FF453A', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  alertEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20 },
  alertEmptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  section: { gap: 8 },
  battleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#111' },
  resultPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, minWidth: 46, alignItems: 'center' },
  resultText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  battleName: { flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '400' },
  battleScore: { color: '#FFF', fontWeight: '900' },
  battleDate: { color: 'rgba(255,255,255,0.25)', fontSize: 11 },
});
