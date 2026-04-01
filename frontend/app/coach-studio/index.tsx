/**
 * COACH STUDIO — Overview Dashboard
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

function StatCard({ icon, label, value, sub, color = '#00F2FF' }: any) {
  return (
    <View style={s$.statCard}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={s$.statVal}>{value}</Text>
      <Text style={s$.statLabel}>{label}</Text>
      {sub && <Text style={s$.statSub}>{sub}</Text>}
    </View>
  );
}

export default function CoachOverview() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [athletes, setAthletes] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.getCoachAthletes(token),
      api.getCoachCompliance(token),
    ]).then(([a, c]) => {
      setAthletes(a);
      setCompliance(c);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <View style={s$.center}><ActivityIndicator color="#00F2FF" /></View>;

  const avgDna = athletes?.athletes?.length
    ? Math.round(athletes.athletes.reduce((s: number, a: any) => s + a.dna_avg, 0) / athletes.athletes.length)
    : 0;
  const avgCompliance = compliance?.templates?.length
    ? Math.round(compliance.templates.reduce((s: number, t: any) => s + t.compliance_pct, 0) / compliance.templates.length)
    : 0;
  const recentPush = compliance?.templates?.[0];

  return (
    <ScrollView style={s$.root} contentContainerStyle={s$.content}>
      {/* Header */}
      <View style={s$.header}>
        <View>
          <Text style={s$.hello}>BENVENUTO, {(user?.username || 'COACH').toUpperCase()}</Text>
          <Text style={s$.sub}>SHADOW SQUAD · {athletes?.total || 0} ATLETI ATTIVI</Text>
        </View>
        <TouchableOpacity style={s$.pushBtn} onPress={() => router.push('/coach-studio/builder')}>
          <Ionicons name="cloud-upload-outline" size={16} color="#000000" />
          <Text style={s$.pushBtnText}>NUOVO TEMPLATE</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={s$.statsRow}>
        <StatCard icon="people" label="ATLETI" value={athletes?.total || 0} sub={`${athletes?.crew_count || 0} crew`} />
        <StatCard icon="analytics" label="DNA MEDIO" value={avgDna} sub="/100" color="#D4AF37" />
        <StatCard icon="checkmark-circle" label="COMPLIANCE" value={`${avgCompliance}%`} sub="template completion" color="#34C759" />
        <StatCard icon="document-text" label="TEMPLATE" value={compliance?.total || 0} sub="inviati" color="#AF52DE" />
      </View>

      {/* Quick modules */}
      <View style={s$.modulesRow}>
        <TouchableOpacity style={s$.moduleCard} onPress={() => router.push('/coach-studio/athletes')} activeOpacity={0.85}>
          <View style={s$.moduleHeader}>
            <Ionicons name="bar-chart" size={22} color="#00F2FF" />
            <View style={s$.moduleBadge}><Text style={s$.moduleBadgeText}>MODULO 1</Text></View>
          </View>
          <Text style={s$.moduleTitle}>ATHLETE{`\n`}ANALYTICS</Text>
          <Text style={s$.moduleSub}>Tabella avanzata · DNA Radar · Filtri per KORE Score</Text>
          <View style={s$.moduleCta}>
            <Text style={s$.moduleCtaText}>APRI</Text>
            <Ionicons name="arrow-forward" size={14} color="#00F2FF" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s$.moduleCard} onPress={() => router.push('/coach-studio/builder')} activeOpacity={0.85}>
          <View style={s$.moduleHeader}>
            <Ionicons name="construct" size={22} color="#D4AF37" />
            <View style={[s$.moduleBadge, { borderColor: 'rgba(212,175,55,0.3)' }]}><Text style={[s$.moduleBadgeText, { color: '#D4AF37' }]}>MODULO 2</Text></View>
          </View>
          <Text style={s$.moduleTitle}>TEMPLATE{`\n`}BUILDER</Text>
          <Text style={s$.moduleSub}>Editor a blocchi · AI Suggestion · Push to Mobile</Text>
          <View style={s$.moduleCta}>
            <Text style={[s$.moduleCtaText, { color: '#D4AF37' }]}>APRI</Text>
            <Ionicons name="arrow-forward" size={14} color="#D4AF37" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Recent push */}
      {recentPush && (
        <View style={s$.recentPush}>
          <Text style={s$.recentTitle}>ULTIMO TEMPLATE INVIATO</Text>
          <View style={s$.recentRow}>
            <View style={s$.recentInfo}>
              <Text style={s$.recentName}>{recentPush.template_name}</Text>
              <Text style={s$.recentMeta}>{recentPush.crew_name} · {recentPush.completers}/{recentPush.total_athletes} completato</Text>
            </View>
            <View style={[s$.compliancePill, { borderColor: recentPush.compliance_pct >= 70 ? '#34C759' : '#FF9500' }]}>
              <Text style={[s$.compliancePct, { color: recentPush.compliance_pct >= 70 ? '#34C759' : '#FF9500' }]}>{recentPush.compliance_pct}%</Text>
            </View>
          </View>
          <View style={s$.complianceBar}>
            <View style={[s$.complianceFill, { width: `${recentPush.compliance_pct}%` as any, backgroundColor: recentPush.compliance_pct >= 70 ? '#34C759' : '#FF9500' }]} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const s$ = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  content: { padding: 32, gap: 24, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  hello: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  sub: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '300', letterSpacing: 1, marginTop: 4 },
  pushBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#00F2FF', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  pushBtnText: { color: '#000000', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  statsRow: { flexDirection: 'row', gap: 16 },
  statCard: { flex: 1, backgroundColor: '#0A0A0A', borderRadius: 12, padding: 20, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statVal: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  statSub: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '300' },
  modulesRow: { flexDirection: 'row', gap: 16 },
  moduleCard: { flex: 1, backgroundColor: '#0A0A0A', borderRadius: 14, padding: 24, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', minHeight: 180 },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  moduleBadge: { borderWidth: 1, borderColor: 'rgba(0,242,255,0.3)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  moduleBadgeText: { color: '#00F2FF', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  moduleTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 2, lineHeight: 26 },
  moduleSub: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '300', lineHeight: 18 },
  moduleCta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  moduleCtaText: { color: '#00F2FF', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  recentPush: { backgroundColor: '#0A0A0A', borderRadius: 12, padding: 20, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  recentTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recentInfo: { flex: 1 },
  recentName: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  recentMeta: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '300', marginTop: 3 },
  compliancePill: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  compliancePct: { fontSize: 16, fontWeight: '900' },
  complianceBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  complianceFill: { height: '100%', borderRadius: 2 },
});
