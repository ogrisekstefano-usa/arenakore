/**
 * KORE TAB — Build 31 · K-TIMELINE & AUTO-CHECK-IN
 * ═══════════════════════════════════════════════════
 * - Hero Header (Avatar + Username + Mood)
 * - K-Timeline (7 giorni, auto-check-in)
 * - 3 K-Flux Types (Vital/Perform/Team)
 * - DNA Radar Chart
 * - Calendar Modal
 * - Performance History
 *
 * IRONCLAD network layer — safe JSON, no crash.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../utils/api';
import { RadarChart } from '../../components/RadarChart';
import { CertBadge, AKDropsWallet } from '../../components/CertBadge';
import { KoreIDModal } from '../../components/KoreIDModal';
import { CalendarModal } from '../../components/CalendarModal';
import { Header } from '../../components/Header';

const GOLD = '#FFD700';
const CYAN = '#00E5FF';
const PURPLE = '#BF5AF2';
const BG = '#000000';

async function safeFetchApi(path: string, options?: any): Promise<any> {
  try { return await apiClient(path, options); }
  catch (e: any) { return { _error: true, message: e?.message }; }
}

function getMood(dna: Record<string, number> | null | undefined) {
  if (!dna) return { color: CYAN, label: 'SCONOSCIUTO', icon: 'help-circle' as const };
  const vals = Object.values(dna);
  if (!vals.length) return { color: CYAN, label: 'SCONOSCIUTO', icon: 'help-circle' as const };
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (avg > 80) return { color: '#00FF87', label: 'BEAST MODE', icon: 'flame' as const };
  if (avg > 50) return { color: CYAN, label: 'STEADY', icon: 'pulse' as const };
  if (avg > 30) return { color: '#FF9500', label: 'RECOVERY', icon: 'battery-charging' as const };
  return { color: '#FF3B30', label: 'COLD START', icon: 'snow' as const };
}

// ═══ STAT CARD ═══
function StatCard({ value, label, color, icon, delay }: { value: string; label: string; color: string; icon: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(350)} style={sc$.card}>
      <View style={[sc$.iconWrap, { backgroundColor: color + '12' }]}>
        <Ionicons name={icon as any} size={14} color={color} />
      </View>
      <Text style={[sc$.value, { color }]}>{value}</Text>
      <Text style={sc$.label}>{label}</Text>
    </Animated.View>
  );
}
const sc$ = StyleSheet.create({
  card: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.025)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  label: { color: 'rgba(255,255,255,0.25)', fontSize: 7, fontWeight: '900', letterSpacing: 2 },
});

// ═══ K-TIMELINE ═══
function WeekTimeline({ weekData, streak, onTap }: { weekData: Array<{ date: string; day_name: string; checked_in: boolean }>; streak: number; onTap: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  return (
    <TouchableOpacity onPress={onTap} activeOpacity={0.85}>
      <Animated.View entering={FadeInDown.delay(50).duration(350)} style={tw$.container}>
        <View style={tw$.header}>
          <View style={tw$.titleRow}>
            <Ionicons name="flame" size={14} color={GOLD} />
            <Text style={tw$.title}>K-TIMELINE</Text>
          </View>
          <View style={tw$.streakBadge}>
            <Text style={tw$.streakText}>{streak} 🔥</Text>
          </View>
        </View>
        <View style={tw$.daysRow}>
          {weekData.map((d, i) => {
            const isToday = d.date === today;
            return (
              <View key={d.date || i} style={tw$.dayCol}>
                <View style={[tw$.circle, d.checked_in && tw$.circleChecked, isToday && !d.checked_in && tw$.circleToday]}>
                  {d.checked_in ? <Ionicons name="checkmark" size={14} color="#000" /> :
                    <Text style={[tw$.dayNum, isToday && { color: CYAN }]}>{d.date ? parseInt(d.date.split('-')[2]) : '—'}</Text>}
                </View>
                <Text style={[tw$.dayLabel, d.checked_in && tw$.dayLabelChecked, isToday && tw$.dayLabelToday]}>{d.day_name}</Text>
              </View>
            );
          })}
        </View>
        <Text style={tw$.hint}>Tocca per aprire il calendario →</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}
const tw$ = StyleSheet.create({
  container: { marginTop: 16, padding: 16, gap: 14, backgroundColor: 'rgba(255,215,0,0.03)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,215,0,0.10)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: GOLD, fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  streakBadge: { backgroundColor: 'rgba(255,215,0,0.12)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  streakText: { color: GOLD, fontSize: 13, fontWeight: '900' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6, flex: 1 },
  circle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)' },
  circleChecked: { backgroundColor: GOLD, borderColor: GOLD },
  circleToday: { borderColor: CYAN, borderWidth: 2 },
  dayNum: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '700' },
  dayLabel: { color: 'rgba(255,255,255,0.15)', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  dayLabelChecked: { color: GOLD },
  dayLabelToday: { color: CYAN },
  hint: { color: 'rgba(255,255,255,0.12)', fontSize: 9, fontWeight: '600', textAlign: 'center' },
});

// ═══ BIO ROW ═══
function BioRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={br$.row}>
      <View style={br$.left}><Ionicons name={icon as any} size={14} color="rgba(255,255,255,0.25)" /><Text style={br$.label}>{label}</Text></View>
      <Text style={br$.value}>{value}</Text>
    </View>
  );
}
const br$ = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  value: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});

// ═══ RECORD CARD ═══
function RecordCard({ record, index }: { record: any; index: number }) {
  const typeColors: Record<string, string> = { scan: CYAN, challenge: GOLD, pvp: '#FF453A', crew_battle: PURPLE, training: '#32D74B' };
  const color = typeColors[record.tipo] || CYAN;
  const dateStr = record.created_at ? new Date(record.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : '—';
  return (
    <Animated.View entering={FadeInDown.delay(400 + index * 80).duration(300)}>
      <View style={rc$.card}>
        <View style={[rc$.dot, { backgroundColor: color }]} />
        <View style={rc$.info}><Text style={rc$.tipo}>{(record.tipo || 'RECORD').toUpperCase()}</Text><Text style={rc$.disciplina}>{record.disciplina || record.exercise_type || '—'}</Text></View>
        <View style={rc$.right}>{record.kpi?.kore_score != null && <Text style={[rc$.score, { color }]}>{Math.round(record.kpi.kore_score)}</Text>}{record.flux_earned > 0 && <Text style={rc$.flux}>+{record.flux_earned} K-FLUX</Text>}<Text style={rc$.date}>{dateStr}</Text></View>
      </View>
    </Animated.View>
  );
}
const rc$ = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', padding: 14, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 }, info: { flex: 1, gap: 2 },
  tipo: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  disciplina: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  right: { alignItems: 'flex-end', gap: 2 }, score: { fontSize: 16, fontWeight: '900' },
  flux: { color: CYAN, fontSize: 10, fontWeight: '800' }, date: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '600' },
});

function SectionHeader({ icon, title, color = GOLD }: { icon: string; title: string; color?: string }) {
  return (<View style={sh$.row}><Ionicons name={icon as any} size={14} color={color} /><Text style={[sh$.title, { color }]}>{title}</Text></View>);
}
const sh$ = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28, marginBottom: 14 },
  title: { fontSize: 13, fontWeight: '900', letterSpacing: 3 },
});

// ═══════════════════════════════════════════════════════════════
// MAIN KORE TAB
// ═══════════════════════════════════════════════════════════════
export default function KoreTab() {
  const { user, token } = useAuth();
  const { width: SW } = useWindowDimensions();
  const [koreStats, setKoreStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showKoreID, setShowKoreID] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [weekData, setWeekData] = useState<Array<{ date: string; day_name: string; checked_in: boolean }>>([]);
  const [checkinStreak, setCheckinStreak] = useState(0);
  const [checkedToday, setCheckedToday] = useState(false);
  const [fluxVital, setFluxVital] = useState(0);
  const [fluxPerform, setFluxPerform] = useState(0);
  const [fluxTeam, setFluxTeam] = useState(0);

  const mood = getMood(user?.dna);
  const radarSize = Math.min(SW - 48, 280);

  const loadData = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    const [statsRes, histRes, rankRes, weekRes, todayRes, fluxRes] = await Promise.all([
      safeFetchApi('/kore/stats'), safeFetchApi('/kore/history?limit=5'), safeFetchApi('/leaderboard/my-rank'),
      safeFetchApi('/checkin/week'), safeFetchApi('/checkin/today'), safeFetchApi('/flux/balance'),
    ]);
    if (!statsRes?._error) setKoreStats(statsRes);
    if (!histRes?._error && Array.isArray(histRes?.records)) setHistory(histRes.records);
    else if (!histRes?._error && Array.isArray(histRes)) setHistory(histRes);
    if (!rankRes?._error) setRank(rankRes?.rank || null);
    if (!weekRes?._error && Array.isArray(weekRes?.week)) { setWeekData(weekRes.week); setCheckinStreak(weekRes.streak || 0); }
    if (!todayRes?._error) { setCheckedToday(todayRes.checked_in === true); if (todayRes.streak) setCheckinStreak(todayRes.streak); }
    if (!fluxRes?._error) { setFluxVital(fluxRes.vital || 0); setFluxPerform(fluxRes.perform || 0); setFluxTeam(fluxRes.team || 0); }
    setLoading(false); setRefreshing(false);
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);
  const handleRefresh = () => { setRefreshing(true); loadData(); };

  const fetchCalendarHistory = useCallback(async (month: number, year: number): Promise<string[]> => {
    const res = await safeFetchApi(`/checkin/history?month=${month}&year=${year}`);
    return res?.checked_dates || [];
  }, []);

  const username = (user?.username || 'KORE').toUpperCase();
  const totalFlux = fluxVital + fluxPerform + fluxTeam;
  const level = user?.level || 1;
  const totalScans = user?.total_scans || koreStats?.total_scans || 0;
  const hasDna = user?.dna && Object.values(user.dna).some((v: number) => v > 0);
  const koreNumber = user?.founder_number ? String(user.founder_number).padStart(5, '0') : String(Math.abs(parseInt((user?.id || '00001').slice(-5), 16)) % 99999).padStart(5, '0');

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <Header />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={GOLD} />}>

        {/* ══════ HERO HEADER ══════ */}
        <Animated.View entering={FadeInDown.duration(400)} style={s.heroHeader}>
          <View style={s.heroTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="id-card" size={16} color={GOLD} />
              <Text style={s.heroLabel}>KORE ID</Text>
            </View>
            <TouchableOpacity onPress={() => setShowKoreID(true)} style={s.koreIdBtn} activeOpacity={0.7}>
              <Ionicons name="qr-code" size={14} color={CYAN} />
              <Text style={s.koreIdBtnText}>KORE ID</Text>
            </TouchableOpacity>
          </View>
          <View style={s.identityRow}>
            <View style={[s.avatar, { backgroundColor: user?.avatar_color || mood.color }]}>
              <Text style={s.avatarLetter}>{username[0]}</Text>
            </View>
            <View style={s.identityInfo}>
              <Text style={s.username} numberOfLines={1}>{username}</Text>
              <View style={s.badgeRow}>
                <View style={[s.moodBadge, { borderColor: mood.color + '40', backgroundColor: mood.color + '10' }]}>
                  <Ionicons name={mood.icon} size={9} color={mood.color} />
                  <Text style={[s.moodText, { color: mood.color }]}>{mood.label}</Text>
                </View>
                <CertBadge certified={!!user?.is_nexus_certified} size="sm" />
                {(user?.is_founder || user?.is_admin) && (
                  <View style={s.founderBadge}><Ionicons name="star" size={8} color={GOLD} /><Text style={s.founderText}>F#{user?.founder_number || '—'}</Text></View>
                )}
              </View>
              <Text style={s.koreSerial}>KORE #{koreNumber} · {user?.sport?.toUpperCase() || user?.preferred_sport?.toUpperCase() || 'MULTI'}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ══════ K-TIMELINE ══════ */}
        <WeekTimeline weekData={weekData.length > 0 ? weekData : [
          { date: '', day_name: 'LUN', checked_in: false }, { date: '', day_name: 'MAR', checked_in: false },
          { date: '', day_name: 'MER', checked_in: false }, { date: '', day_name: 'GIO', checked_in: false },
          { date: '', day_name: 'VEN', checked_in: false }, { date: '', day_name: 'SAB', checked_in: false },
          { date: '', day_name: 'DOM', checked_in: false },
        ]} streak={checkinStreak} onTap={() => setShowCalendar(true)} />

        {/* ══════ K-FLUX BREAKDOWN (3 Types) ══════ */}
        <SectionHeader icon="flash" title="K-FLUX" color={CYAN} />
        <View style={s.fluxGrid}>
          <StatCard value={String(fluxVital)} label="VITAL" color={CYAN} icon="heart" delay={100} />
          <StatCard value={String(fluxPerform)} label="PERFORM" color={GOLD} icon="trophy" delay={150} />
          <StatCard value={String(fluxTeam)} label="TEAM" color={PURPLE} icon="people" delay={200} />
        </View>

        {/* ══════ STATS GRID ══════ */}
        <View style={s.statsGrid}>
          <StatCard value={totalFlux.toLocaleString()} label="K-FLUX" color={CYAN} icon="flash" delay={250} />
          <StatCard value={`LV ${level}`} label="LIVELLO" color={GOLD} icon="ribbon" delay={300} />
          <StatCard value={rank ? `#${rank}` : '—'} label="RANK" color={PURPLE} icon="podium" delay={350} />
          <StatCard value={String(totalScans)} label="SCANS" color="#32D74B" icon="scan" delay={400} />
        </View>

        {/* ══════ DNA RADAR ══════ */}
        {hasDna ? (<><SectionHeader icon="analytics" title="DNA PROFILE" color={CYAN} />
          <Animated.View entering={FadeIn.delay(300).duration(500)} style={s.radarWrap}>
            <RadarChart stats={user!.dna!} size={radarSize} accentColor={mood.color} glowing={!!user?.is_nexus_certified} mode="dark" />
          </Animated.View></>) : (<><SectionHeader icon="analytics" title="DNA PROFILE" color={CYAN} />
          <Animated.View entering={FadeInDown.delay(300)} style={s.emptyDna}>
            <Ionicons name="body-outline" size={36} color="rgba(255,255,255,0.08)" />
            <Text style={s.emptyDnaTitle}>DNA NON ANCORA MAPPATO</Text>
            <Text style={s.emptyDnaSub}>Completa una scansione NÈXUS per sbloccare il tuo profilo DNA</Text>
          </Animated.View></>)}

        {/* ══════ BIO DATA ══════ */}
        <SectionHeader icon="body" title="BIO DATA" color="#32D74B" />
        <Animated.View entering={FadeInDown.delay(350).duration(350)} style={s.bioCard}>
          <BioRow icon="resize" label="ALTEZZA" value={user?.height_cm ? `${user.height_cm} cm` : '—'} />
          <BioRow icon="scale" label="PESO" value={user?.weight_kg ? `${user.weight_kg} kg` : '—'} />
          <BioRow icon="fitness" label="BMI" value={user?.bmi ? String(user.bmi.toFixed(1)) : '—'} />
          <BioRow icon="calendar" label="ETÀ" value={user?.age ? `${user.age} anni` : '—'} />
          <BioRow icon="person" label="GENERE" value={user?.gender?.toUpperCase() || '—'} />
          <BioRow icon="football" label="SPORT" value={user?.sport?.toUpperCase() || user?.preferred_sport?.toUpperCase() || '—'} />
        </Animated.View>

        {/* ══════ K-FLUX WALLET ══════ */}
        <SectionHeader icon="flash" title="K-FLUX WALLET" color={CYAN} />
        <AKDropsWallet user={user} />

        {/* ══════ PERFORMANCE HISTORY ══════ */}
        <SectionHeader icon="time" title="ULTIME PRESTAZIONI" color={GOLD} />
        {loading ? (<View style={s.loadRow}><ActivityIndicator size="small" color={GOLD} /><Text style={s.loadText}>Caricamento...</Text></View>
        ) : history.length === 0 ? (<View style={s.emptyHistory}>
          <Ionicons name="timer-outline" size={28} color="rgba(255,255,255,0.08)" />
          <Text style={s.emptyHistoryText}>Nessuna prestazione registrata</Text>
          <Text style={s.emptyHistorySub}>Completa una sfida per popolare il tuo storico</Text>
        </View>) : history.map((record, i) => <RecordCard key={record._id || record.id || i} record={record} index={i} />)}

        {/* ══════ FOOTER ══════ */}
        <View style={s.footer}>
          <View style={s.footerLine} />
          <Text style={s.footerText}>KORE ID · IRONCLAD NETWORK</Text>
          <Text style={s.versionLabel}>v2.5.0 — Build 31 · K-TIMELINE</Text>
        </View>
      </ScrollView>

      <KoreIDModal visible={showKoreID} onClose={() => setShowKoreID(false)} />
      <CalendarModal visible={showCalendar} onClose={() => setShowCalendar(false)} fetchHistory={fetchCalendarHistory} streak={checkinStreak} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  heroHeader: { marginTop: 8, gap: 16, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: GOLD, fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  koreIdBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,229,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  koreIdBtnText: { color: CYAN, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#000', fontSize: 26, fontWeight: '900' },
  identityInfo: { flex: 1, gap: 6 },
  username: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  moodBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  moodText: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  founderBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)' },
  founderText: { color: GOLD, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  koreSerial: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '700', letterSpacing: 2 },

  // K-Flux Grid
  fluxGrid: { flexDirection: 'row', gap: 8 },
  statsGrid: { flexDirection: 'row', gap: 8, marginTop: 12 },
  radarWrap: { alignItems: 'center', marginBottom: 8 },
  emptyDna: { alignItems: 'center', gap: 8, paddingVertical: 32, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  emptyDnaTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  emptyDnaSub: { color: 'rgba(255,255,255,0.15)', fontSize: 12, fontWeight: '500', textAlign: 'center', paddingHorizontal: 32 },
  bioCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 16 },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  loadText: { color: GOLD, fontSize: 12, fontWeight: '600' },
  emptyHistory: { alignItems: 'center', gap: 6, paddingVertical: 28, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14 },
  emptyHistoryText: { color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: '700' },
  emptyHistorySub: { color: 'rgba(255,255,255,0.12)', fontSize: 11, fontWeight: '500', textAlign: 'center', paddingHorizontal: 24 },
  footer: { alignItems: 'center', gap: 6, marginTop: 32, paddingBottom: 20 },
  footerLine: { width: 40, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  footerText: { color: 'rgba(255,255,255,0.08)', fontSize: 9, fontWeight: '800', letterSpacing: 3 },
  versionLabel: { color: CYAN, fontSize: 10, fontWeight: '700', letterSpacing: 1, opacity: 0.6, marginTop: 8 },
});
