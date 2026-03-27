import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { RadarChart } from '../../components/RadarChart';

const ATTRS = [
  { key: 'velocita', label: 'Velocità', icon: '⚡' },
  { key: 'forza', label: 'Forza', icon: '💪' },
  { key: 'resistenza', label: 'Resistenza', icon: '🫀' },
  { key: 'agilita', label: 'Agilità', icon: '🏃' },
  { key: 'tecnica', label: 'Tecnica', icon: '🎯' },
  { key: 'potenza', label: 'Potenza', icon: '💥' },
];

function getRoleColor(role?: string) {
  if (role === 'coach') return '#FFD700';
  if (role === 'palestra') return '#AF52DE';
  return '#00E5FF';
}

export default function DNATab() {
  const { user } = useAuth();
  const dna = user?.dna;

  return (
    <View style={styles.container} testID="dna-tab">
      <StatusBar barStyle="light-content" />
      <Header title="DNA" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.dnaHeader}>
          <Text style={styles.dnaLabel}>ANALISI BIOMETRICA</Text>
          <Text style={styles.dnaSport}>{user?.sport?.toUpperCase() || '—'}</Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user?.role) + '18' }]}>
            <Text style={[styles.roleText, { color: getRoleColor(user?.role) }]}>
              {user?.role?.toUpperCase() || 'ATLETA'}
            </Text>
          </View>
        </View>

        {dna ? (
          <View style={styles.chartContainer}>
            <RadarChart stats={dna} size={280} />
          </View>
        ) : (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>Completa l'onboarding{'\n'}per sbloccare il tuo DNA ⚡</Text>
          </View>
        )}

        {dna && (
          <View style={styles.statsGrid}>
            {ATTRS.map(a => {
              const val = (dna[a.key as keyof typeof dna] as number) || 0;
              return (
                <View key={a.key} style={styles.statCard} testID={`dna-stat-${a.key}`}>
                  <Text style={styles.statIcon}>{a.icon}</Text>
                  <Text style={styles.statLabel}>{a.label}</Text>
                  <Text style={styles.statValue}>{val}</Text>
                  <View style={styles.statBar}>
                    <View style={[styles.statFill, { width: `${val}%` as any }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {dna && (
          <View style={styles.talentCard}>
            <Text style={styles.talentTitle}>TALENT CARD</Text>
            {[
              { l: 'Username', v: user?.username || '—' },
              { l: 'Disciplina', v: user?.sport || '—' },
              { l: 'Ruolo', v: user?.role || '—' },
              { l: 'Level', v: `LVL ${user?.level || 1}`, gold: true },
              { l: 'XP Totali', v: `${user?.xp || 0} XP`, gold: true },
            ].map((row, i) => (
              <View key={i} style={styles.talentRow}>
                <Text style={styles.talentLabel}>{row.l}</Text>
                <Text style={[styles.talentValue, row.gold && { color: '#FFD700' }]}>
                  {row.v}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  dnaHeader: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, gap: 4 },
  dnaLabel: { color: '#00E5FF', fontSize: 11, fontWeight: '700', letterSpacing: 3 },
  dnaSport: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: -1, textTransform: 'uppercase' },
  roleBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 4, marginTop: 4,
  },
  roleText: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  chartContainer: { alignItems: 'center', paddingVertical: 16 },
  noData: { padding: 40, alignItems: 'center' },
  noDataText: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 8 },
  statCard: {
    width: '30%', flexGrow: 1, backgroundColor: '#111111',
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#1E1E1E', gap: 3,
  },
  statIcon: { fontSize: 18 },
  statLabel: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  statValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  statBar: { height: 3, backgroundColor: '#1E1E1E', borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  statFill: { height: '100%', backgroundColor: '#00E5FF', borderRadius: 2 },
  talentCard: {
    margin: 16, backgroundColor: '#111111', borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)', gap: 12, marginTop: 20,
  },
  talentTitle: { color: '#00E5FF', fontSize: 11, fontWeight: '700', letterSpacing: 3, marginBottom: 4 },
  talentRow: { flexDirection: 'row', justifyContent: 'space-between' },
  talentLabel: { color: '#555', fontSize: 14 },
  talentValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
});
