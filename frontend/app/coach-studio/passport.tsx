/**
 * ATHLETE PASSPORT — Read-only profile for ATHLETE role
 * Shows their DNA, FLUX history, challenge history — no edit access
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const DNA_KEYS = ['velocita', 'forza', 'resistenza', 'agilita', 'tecnica', 'potenza'];
const DNA_LABELS = ['VEL', 'FOR', 'RES', 'AGI', 'TEC', 'POT'];
const DNA_FULL = ['Velocità', 'Forza', 'Resistenza', 'Agilità', 'Tecnica', 'Potenza'];

function PassportRadar({ dna }: { dna: any }) {
  const size = 200, cx = 100, cy = 100, r = 80, n = 6;
  const pts = DNA_KEYS.map((k, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const v = ((dna?.[k] ?? 50) / 100) * r;
    return [cx + v * Math.cos(angle), cy + v * Math.sin(angle)];
  });
  const gridPts = DNA_KEYS.map((_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
  return (
    <Svg width={size} height={size}>
      {[0.25, 0.5, 0.75, 1.0].map(lvl => (
        <Polygon key={lvl}
          points={gridPts.map(p => `${cx + (p[0] - cx) * lvl},${cy + (p[1] - cy) * lvl}`).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      ))}
      {gridPts.map(([x, y], i) => <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />)}
      <Polygon points={pts.map(p => p.join(',')).join(' ')} fill="rgba(0,229,255,0.12)" stroke="#00E5FF" strokeWidth={2} />
      {gridPts.map(([x, y], i) => {
        const ax = cx + (x - cx) * 1.22, ay = cy + (y - cy) * 1.22;
        return <SvgText key={i} x={ax} y={ay + 3} fontSize={9} fill="rgba(255,255,255,0.35)" textAnchor="middle" fontWeight="bold">{DNA_LABELS[i]}</SvgText>;
      })}
    </Svg>
  );
}

export default function AthletePasPport() {
  const { token, user } = useAuth();
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !user?.id) { setLoading(false); return; }
    api.getAthleteHistorical(user.id, token)
      .then(d => setHistory(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, user?.id]);

  if (loading) return <View style={p$.center}><ActivityIndicator color="#00E5FF" /></View>;

  const dna = user?.dna || {};
  const dnaAvg = DNA_KEYS.length ? Math.round(DNA_KEYS.reduce((s, k) => s + (dna[k] || 50), 0) / DNA_KEYS.length) : 0;

  return (
    <ScrollView style={p$.root} contentContainerStyle={p$.content}>
      {/* Header */}
      <View style={p$.header}>
        <View style={[p$.avatar, { backgroundColor: user?.avatar_color || '#00E5FF' }]}>
          <Text style={p$.avatarLetter}>{(user?.username || '?')[0].toUpperCase()}</Text>
        </View>
        <View style={p$.headerInfo}>
          <Text style={p$.name}>{user?.username?.toUpperCase() || '—'}</Text>
          <Text style={p$.sub}>LVL {user?.level || 1} · {user?.xp?.toLocaleString() || 0} FLUX</Text>
          <View style={p$.rolePill}>
            <Text style={p$.roleText}>ATHLETE · SOLA LETTURA</Text>
          </View>
        </View>
        <View style={p$.korScore}>
          <Text style={p$.koreVal}>{dnaAvg}</Text>
          <Text style={p$.koreLabel}>KORE</Text>
        </View>
      </View>

      <View style={p$.twoCol}>
        {/* Radar */}
        <View style={p$.radarCard}>
          <Text style={p$.sectionLabel}>DNA SIGNATURE</Text>
          <PassportRadar dna={dna} />
          <View style={p$.dnaGrid}>
            {DNA_KEYS.map((k, i) => (
              <View key={k} style={p$.dnaItem}>
                <Text style={p$.dnaLabel}>{DNA_FULL[i]}</Text>
                <Text style={[p$.dnaVal, { color: (dna[k] || 0) >= 80 ? '#FFD700' : '#00E5FF' }]}>{dna[k] || '—'}</Text>
                <View style={p$.dnaBar}><View style={[p$.dnaFill, { width: `${dna[k] || 0}%` as any }]} /></View>
              </View>
            ))}
          </View>
        </View>

        {/* Stats + message */}
        <View style={p$.statsCol}>
          <View style={p$.infoCard}>
            <Ionicons name="lock-closed" size={18} color="rgba(255,255,255,0.2)" />
            <Text style={p$.infoTitle}>ACCESSO LIMITATO</Text>
            <Text style={p$.infoText}>Come Atleta, hai accesso in sola lettura al tuo Passport DNA.{'\n\n'}Per accedere agli strumenti di creazione e analisi, contatta il tuo Coach o il Manager della palestra per aggiornare il tuo ruolo.</Text>
          </View>

          {/* Quick stats */}
          <View style={p$.statsCard}>
            {[
              { label: 'LIVELLO', val: user?.level || 1, color: '#FFD700' },
              { label: 'FLUX TOTALI', val: (user?.xp || 0).toLocaleString(), color: '#00E5FF' },
              { label: 'DNA MEDIO', val: dnaAvg, color: '#AF52DE' },
            ].map((stat, i) => (
              <Animated.View key={stat.label} entering={FadeInDown.delay(i * 80).duration(200)} style={p$.statRow}>
                <Text style={p$.statLabel}>{stat.label}</Text>
                <Text style={[p$.statVal, { color: stat.color }]}>{stat.val}</Text>
              </Animated.View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const p$ = StyleSheet.create({
  root: { flex: 1 }, content: { padding: 28, gap: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#0A0A0A', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#1E1E1E' },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#000', fontSize: 28, fontWeight: '900' },
  headerInfo: { flex: 1, gap: 4 },
  name: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  sub: { color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: '300', letterSpacing: 1 },
  rolePill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  roleText: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  korScore: { alignItems: 'center' },
  koreVal: { color: '#FFD700', fontSize: 40, fontWeight: '900', letterSpacing: 2 },
  koreLabel: { color: 'rgba(255,215,0,0.5)', fontSize: 12, fontWeight: '900', letterSpacing: 4 },
  twoCol: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  radarCard: { flex: 1, backgroundColor: '#0A0A0A', borderRadius: 14, padding: 18, gap: 16, borderWidth: 1, borderColor: '#1E1E1E', alignItems: 'center' },
  sectionLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '900', letterSpacing: 3, alignSelf: 'flex-start' },
  dnaGrid: { width: '100%', gap: 8 },
  dnaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dnaLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '700', width: 70 },
  dnaVal: { fontSize: 15, fontWeight: '900', width: 28 },
  dnaBar: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  dnaFill: { height: '100%', backgroundColor: '#00E5FF', borderRadius: 2 },
  statsCol: { flex: 1, gap: 14 },
  infoCard: { backgroundColor: '#0A0A0A', borderRadius: 12, padding: 18, gap: 10, borderWidth: 1, borderColor: '#1E1E1E', alignItems: 'center' },
  infoTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  infoText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '300', lineHeight: 18, textAlign: 'center' },
  statsCard: { backgroundColor: '#0A0A0A', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1E1E1E', gap: 0 },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111' },
  statLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  statVal: { fontSize: 22, fontWeight: '900' },
});
