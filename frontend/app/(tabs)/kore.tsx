/**
 * KORE TAB — Build 36 · DYNAMIC ATHLETE PROFILE
 * ═══════════════════════════════════════════════
 * - Hero Header (Dynamic Avatar + Username + Mood Badges)
 * - K-Timeline (7 giorni, auto-check-in)
 * - K-Flux Inline (synced from /api/flux/balance)
 * - Rank + Level Progress (replaces BIO DATA)
 * - DNA Radar Chart
 * - K-Flux Wallet (earning history)
 * - Performance History (real data)
 *
 * NO FOOTER. NO BIO DATA HERE. BIOMETRICS → Settings.
 * ALL DATA DYNAMIC. K-FLUX SYNCED GLOBALLY.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, useWindowDimensions, ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../utils/api';
import { RadarChart } from '../../components/RadarChart';
import { CertBadge, AKDropsWallet } from '../../components/CertBadge';
import { KoreIDModal } from '../../components/KoreIDModal';
import { CalendarModal } from '../../components/CalendarModal';
import { Header } from '../../components/Header';

// ═══ SPORT → HERO PHOTO MAP ═══
const SPORT_HERO_PHOTOS: Record<string, string> = {
  basket: 'https://images.unsplash.com/photo-1587296104393-8db6cda4418d?w=800&q=80',
  basketball: 'https://images.unsplash.com/photo-1587296104393-8db6cda4418d?w=800&q=80',
  running: 'https://images.unsplash.com/photo-1539620027837-6e457cff51dc?w=800&q=80',
  atletica: 'https://images.unsplash.com/photo-1539620027837-6e457cff51dc?w=800&q=80',
  corsa: 'https://images.unsplash.com/photo-1539620027837-6e457cff51dc?w=800&q=80',
  fitness: 'https://images.unsplash.com/photo-1709315957145-a4bad1feef28?w=800&q=80',
  gym: 'https://images.unsplash.com/photo-1709315957145-a4bad1feef28?w=800&q=80',
  palestra: 'https://images.unsplash.com/photo-1709315957145-a4bad1feef28?w=800&q=80',
  golf: 'https://images.unsplash.com/photo-1634152557768-b5bb22302a56?w=800&q=80',
  calcio: 'https://images.unsplash.com/photo-1634152557768-b5bb22302a56?w=800&q=80',
  football: 'https://images.unsplash.com/photo-1634152557768-b5bb22302a56?w=800&q=80',
  default: 'https://images.unsplash.com/photo-1545115399-9e02335e0933?w=800&q=80',
};
function getHeroPhoto(sport?: string): string {
  if (!sport) return SPORT_HERO_PHOTOS.default;
  return SPORT_HERO_PHOTOS[sport.toLowerCase().trim()] || SPORT_HERO_PHOTOS.default;
}

const GOLD = '#FFD700';
const CYAN = '#00E5FF';
const PURPLE = '#BF5AF2';
const BG = '#000000';

async function safeFetchApi(path: string, options?: any): Promise<any> {
  try { return await apiClient(path, options); }
  catch { return { _error: true }; }
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

// ═══ K-TIMELINE ═══
function WeekTimeline({ weekData, streak, onTap }: { weekData: Array<{ date: string; day_name: string; checked_in: boolean }>; streak: number; onTap: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const checkedCount = weekData.filter(d => d.checked_in).length;
  return (
    <TouchableOpacity onPress={onTap} activeOpacity={0.85}>
      <Animated.View entering={FadeInDown.delay(50).duration(350)} style={tw$.container}>
        <View style={tw$.header}>
          <View style={tw$.titleRow}>
            <Ionicons name="flame" size={14} color={GOLD} />
            <Text style={tw$.title}>K-TIMELINE</Text>
          </View>
          <View style={tw$.streakBadge}>
            <Text style={tw$.streakText}>{checkedCount}/7 🔥 {streak}</Text>
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
      </Animated.View>
    </TouchableOpacity>
  );
}
const tw$ = StyleSheet.create({
  container: { marginTop: 16, padding: 16, gap: 14, backgroundColor: 'rgba(255,215,0,0.03)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,215,0,0.10)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: GOLD, fontSize: 12, fontWeight: '900', letterSpacing: 3 },
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
        <View style={rc$.info}>
          <Text style={rc$.tipo}>{(record.tipo || 'RECORD').toUpperCase()}</Text>
          <Text style={rc$.disciplina}>{record.disciplina || record.exercise_type || '—'}</Text>
        </View>
        <View style={rc$.right}>
          {record.kpi?.kore_score != null && <Text style={[rc$.score, { color }]}>{Math.round(record.kpi.kore_score)}</Text>}
          {record.flux_earned > 0 && <Text style={rc$.flux}>+{record.flux_earned} K-FLUX</Text>}
          <Text style={rc$.date}>{dateStr}</Text>
        </View>
      </View>
    </Animated.View>
  );
}
const rc$ = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', padding: 14, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 }, info: { flex: 1, gap: 2 },
  tipo: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  disciplina: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  right: { alignItems: 'flex-end', gap: 2 },
  score: { fontSize: 18, fontWeight: '900' },
  flux: { color: CYAN, fontSize: 11, fontWeight: '800' },
  date: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '600' },
});

function SectionHeader({ icon, title, color = GOLD }: { icon: string; title: string; color?: string }) {
  return (<View style={sh$.row}><Ionicons name={icon as any} size={14} color={color} /><Text style={[sh$.title, { color }]}>{title}</Text></View>);
}
const sh$ = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28, marginBottom: 14 },
  title: { fontSize: 13, fontWeight: '900', letterSpacing: 3 },
});

// ═══ LEVEL PROGRESS BAR ═══
function LevelProgressCard({ level, progress, kFlux, nextThreshold, fluxToNext, rank }: {
  level: number; progress: number; kFlux: number; nextThreshold: number; fluxToNext: number; rank: number | null;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)}>
      <View style={lp$.card}>
        <View style={lp$.topRow}>
          <View style={lp$.rankBox}>
            <Ionicons name="podium" size={18} color={PURPLE} />
            <Text style={lp$.rankLabel}>RANK</Text>
            <Text style={lp$.rankVal}>#{rank || '—'}</Text>
          </View>
          <View style={lp$.levelBox}>
            <Text style={lp$.lvlTag}>LVL</Text>
            <Text style={lp$.lvlVal}>{level}</Text>
          </View>
          <View style={lp$.rankBox}>
            <Ionicons name="flash" size={18} color={CYAN} />
            <Text style={lp$.rankLabel}>K-FLUX</Text>
            <Text style={[lp$.rankVal, { color: CYAN }]}>{kFlux.toLocaleString()}</Text>
          </View>
        </View>
        {/* Progress bar */}
        <View style={lp$.barBg}>
          <View style={[lp$.barFill, { width: `${Math.min(100, progress * 100)}%` }]} />
        </View>
        <View style={lp$.botRow}>
          <Text style={lp$.nextText}>LVL {level + 1}</Text>
          <Text style={lp$.nextFlux}>{fluxToNext.toLocaleString()} FLUX restanti</Text>
        </View>
      </View>
    </Animated.View>
  );
}
const lp$ = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 18, gap: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rankBox: { alignItems: 'center', gap: 3 },
  rankLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  rankVal: { color: PURPLE, fontSize: 20, fontWeight: '900' },
  levelBox: { alignItems: 'center', backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 16, width: 72, height: 72, justifyContent: 'center', borderWidth: 2, borderColor: GOLD + '40' },
  lvlTag: { color: GOLD, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  lvlVal: { color: GOLD, fontSize: 28, fontWeight: '900' },
  barBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: GOLD },
  botRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextText: { color: GOLD, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  nextFlux: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '700' },
});

// ═══════════════════════════════════════════════════════════════
// MAIN KORE TAB
// ═══════════════════════════════════════════════════════════════
export default function KoreTab() {
  const { user, token } = useAuth();
  const { width: SW } = useWindowDimensions();
  const [history, setHistory] = useState<any[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showKoreID, setShowKoreID] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [weekData, setWeekData] = useState<Array<{ date: string; day_name: string; checked_in: boolean }>>([]);
  const [checkinStreak, setCheckinStreak] = useState(0);
  const [fluxVital, setFluxVital] = useState(0);
  const [fluxPerform, setFluxPerform] = useState(0);
  const [fluxTeam, setFluxTeam] = useState(0);
  const [levelInfo, setLevelInfo] = useState({ level: 1, progress: 0, k_flux: 0, next_threshold: 100, flux_to_next: 100 });

  const mood = getMood(user?.dna);
  const radarSize = Math.min(SW - 48, 280);

  const loadData = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    const [histRes, rankRes, weekRes, todayRes, fluxRes] = await Promise.all([
      safeFetchApi('/kore/history?limit=8'),
      safeFetchApi('/leaderboard/my-rank'),
      safeFetchApi('/checkin/week'),
      safeFetchApi('/checkin/today'),
      safeFetchApi('/flux/balance'),
    ]);
    if (!histRes?._error && Array.isArray(histRes?.records)) setHistory(histRes.records);
    else if (!histRes?._error && Array.isArray(histRes)) setHistory(histRes);
    if (!rankRes?._error) setRank(rankRes?.rank || null);
    if (!weekRes?._error && Array.isArray(weekRes?.week)) {
      setWeekData(weekRes.week);
      setCheckinStreak(weekRes.streak || 0);
    }
    if (!todayRes?._error && todayRes.streak) setCheckinStreak(todayRes.streak);
    if (!fluxRes?._error) {
      setFluxVital(fluxRes.vital || 0);
      setFluxPerform(fluxRes.perform || 0);
      setFluxTeam(fluxRes.team || 0);
      setLevelInfo({
        level: fluxRes.level || 1,
        progress: fluxRes.progress || 0,
        k_flux: fluxRes.k_flux || fluxRes.total || 0,
        next_threshold: fluxRes.next_threshold || 100,
        flux_to_next: fluxRes.flux_to_next || 100,
      });
    }
    setLoading(false);
    setRefreshing(false);
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);
  const handleRefresh = () => { setRefreshing(true); loadData(); };

  const fetchCalendarHistory = useCallback(async (month: number, year: number): Promise<string[]> => {
    const res = await safeFetchApi(`/checkin/history?month=${month}&year=${year}`);
    return res?.checked_dates || [];
  }, []);

  const username = (user?.username || 'KORE').toUpperCase();
  const totalFlux = levelInfo.k_flux || (fluxVital + fluxPerform + fluxTeam);
  const hasDna = user?.dna && Object.values(user.dna).some((v: number) => v > 0);

  // ═══ AVATAR INITIALS ═══
  const getInitials = () => {
    const name = user?.username || '';
    if (!name) return 'AK';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };
  const avatarInitials = getInitials();
  const heroPhotoUri = getHeroPhoto(user?.sport || user?.preferred_sport);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <Header />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={GOLD} />}>

        {/* ══════ HERO HEADER ══════ */}
        <Animated.View entering={FadeInDown.duration(400)} style={s.heroWrapper}>
          <ImageBackground source={{ uri: heroPhotoUri }} style={s.heroBanner} imageStyle={s.heroBannerImage} resizeMode="cover">
            <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']} style={s.heroGradient}>
              {/* Top Row — KORE label + QR Button */}
              <View style={s.heroTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="id-card" size={18} color={GOLD} />
                  <Text style={s.heroLabel}>KORE</Text>
                </View>
                <TouchableOpacity onPress={() => setShowKoreID(true)} style={s.koreIdBtn} activeOpacity={0.7}>
                  <Ionicons name="qr-code" size={14} color={CYAN} />
                  <Text style={s.koreIdBtnText}>KORE ID</Text>
                </TouchableOpacity>
              </View>

              {/* Identity Row — Avatar + Info */}
              <View style={s.identityRow}>
                <View style={[s.avatar, { backgroundColor: user?.avatar_color || mood.color }]}>
                  <Text style={s.avatarInitials}>{avatarInitials}</Text>
                </View>
                <View style={s.identityInfo}>
                  <Text style={s.username} numberOfLines={1}>{username}</Text>
                  <View style={s.badgeRow}>
                    {/* BEAST MODE badge only if DNA avg > 80 */}
                    {mood.label === 'BEAST MODE' && (
                      <View style={[s.moodBadge, { borderColor: mood.color + '40', backgroundColor: mood.color + '10' }]}>
                        <Ionicons name={mood.icon} size={9} color={mood.color} />
                        <Text style={[s.moodText, { color: mood.color }]}>{mood.label}</Text>
                      </View>
                    )}
                    {/* NEXUS CERTIFIED only if scan done */}
                    <CertBadge certified={!!user?.is_nexus_certified} size="sm" />
                    {(user?.is_founder || user?.is_admin) && (
                      <View style={s.founderBadge}>
                        <Ionicons name="star" size={9} color={GOLD} />
                        <Text style={s.founderText}>FOUNDER #{user?.founder_number || '—'}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.koreSerial}>
                    LVL {levelInfo.level} · {totalFlux.toLocaleString()} K-FLUX · {user?.preferred_sport?.toUpperCase() || user?.sport?.toUpperCase() || 'MULTI'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </Animated.View>

        {/* ══════ K-TIMELINE ══════ */}
        <WeekTimeline weekData={weekData.length > 0 ? weekData : [
          { date: '', day_name: 'LUN', checked_in: false }, { date: '', day_name: 'MAR', checked_in: false },
          { date: '', day_name: 'MER', checked_in: false }, { date: '', day_name: 'GIO', checked_in: false },
          { date: '', day_name: 'VEN', checked_in: false }, { date: '', day_name: 'SAB', checked_in: false },
          { date: '', day_name: 'DOM', checked_in: false },
        ]} streak={checkinStreak} onTap={() => setShowCalendar(true)} />

        {/* ══════ RANK + LEVEL PROGRESS (Replaces BIO DATA) ══════ */}
        <SectionHeader icon="podium" title="RANK & LIVELLO" color={PURPLE} />
        <LevelProgressCard
          level={levelInfo.level}
          progress={levelInfo.progress}
          kFlux={totalFlux}
          nextThreshold={levelInfo.next_threshold}
          fluxToNext={levelInfo.flux_to_next}
          rank={rank}
        />

        {/* ══════ K-FLUX BREAKDOWN (Flat Premium Inline) ══════ */}
        <View style={s.fluxInlineSection}>
          <View style={s.fluxInlineHeader}>
            <Ionicons name="flash" size={14} color={CYAN} />
            <Text style={s.fluxInlineTitle}>K-FLUX</Text>
            <View style={{ flex: 1 }} />
            <Text style={s.fluxTotalInline}>{totalFlux.toLocaleString()}</Text>
          </View>
          <View style={s.fluxInlineRow}>
            <View style={s.fluxInlineItem}>
              <Ionicons name="heart" size={18} color={CYAN} />
              <Text style={[s.fluxInlineVal, { color: CYAN }]}>{fluxVital.toLocaleString()}</Text>
              <Text style={s.fluxInlineLabel}>VITAL</Text>
            </View>
            <View style={s.fluxInlineDivider} />
            <View style={s.fluxInlineItem}>
              <Ionicons name="trophy" size={18} color={GOLD} />
              <Text style={[s.fluxInlineVal, { color: GOLD }]}>{fluxPerform.toLocaleString()}</Text>
              <Text style={s.fluxInlineLabel}>PERFORM</Text>
            </View>
            <View style={s.fluxInlineDivider} />
            <View style={s.fluxInlineItem}>
              <Ionicons name="people" size={18} color={PURPLE} />
              <Text style={[s.fluxInlineVal, { color: PURPLE }]}>{fluxTeam.toLocaleString()}</Text>
              <Text style={s.fluxInlineLabel}>TEAM</Text>
            </View>
          </View>
        </View>

        {/* ══════ DNA RADAR ══════ */}
        {hasDna ? (
          <>
            <SectionHeader icon="analytics" title="DNA PROFILE" color={CYAN} />
            <Animated.View entering={FadeIn.delay(300).duration(500)} style={s.radarWrap}>
              <RadarChart stats={user!.dna!} size={radarSize} accentColor={mood.color} glowing={!!user?.is_nexus_certified} mode="dark" />
            </Animated.View>
          </>
        ) : (
          <>
            <SectionHeader icon="analytics" title="DNA PROFILE" color={CYAN} />
            <Animated.View entering={FadeInDown.delay(300)} style={s.emptyDna}>
              <Ionicons name="body-outline" size={36} color="rgba(255,255,255,0.08)" />
              <Text style={s.emptyDnaTitle}>DNA NON ANCORA MAPPATO</Text>
              <Text style={s.emptyDnaSub}>Completa una scansione NÈXUS per sbloccare il tuo profilo DNA</Text>
            </Animated.View>
          </>
        )}

        {/* ══════ K-FLUX WALLET ══════ */}
        <SectionHeader icon="flash" title="K-FLUX WALLET" color={CYAN} />
        <AKDropsWallet user={user} />

        {/* ══════ PERFORMANCE HISTORY ══════ */}
        <SectionHeader icon="time" title="ULTIME PRESTAZIONI" color={GOLD} />
        {loading ? (
          <View style={s.loadRow}>
            <ActivityIndicator size="small" color={GOLD} />
            <Text style={s.loadText}>Caricamento...</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={s.emptyHistory}>
            <Ionicons name="timer-outline" size={28} color="rgba(255,255,255,0.08)" />
            <Text style={s.emptyHistoryText}>Nessuna prestazione registrata</Text>
            <Text style={s.emptyHistorySub}>Completa una sfida per popolare il tuo storico</Text>
          </View>
        ) : history.map((record, i) => <RecordCard key={record._id || record.id || i} record={record} index={i} />)}

        <View style={{ height: 100 }} />
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
  heroWrapper: { marginTop: 0, marginHorizontal: -20, overflow: 'hidden' },
  heroBanner: { width: '100%', minHeight: 190 },
  heroBannerImage: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  heroGradient: { flex: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18, gap: 14, minHeight: 190, justifyContent: 'flex-end' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: GOLD, fontSize: 15, fontWeight: '900', letterSpacing: 3 },
  koreIdBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.35)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  koreIdBtnText: { color: CYAN, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },
  avatarInitials: { color: '#000', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  identityInfo: { flex: 1, gap: 5 },
  username: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  moodBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  moodText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  founderBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)' },
  founderText: { color: GOLD, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  koreSerial: { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  // K-Flux Flat Premium Inline
  fluxInlineSection: { marginTop: 24, marginBottom: 4 },
  fluxInlineHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  fluxInlineTitle: { color: CYAN, fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  fluxTotalInline: { color: CYAN, fontSize: 18, fontWeight: '900' },
  fluxInlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  fluxInlineItem: { alignItems: 'center', gap: 4, flex: 1 },
  fluxInlineVal: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  fluxInlineLabel: { color: 'rgba(255,255,255,0.18)', fontSize: 9, fontWeight: '900', letterSpacing: 2.5 },
  fluxInlineDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.05)' },

  radarWrap: { alignItems: 'center', marginBottom: 8 },
  emptyDna: { alignItems: 'center', gap: 8, paddingVertical: 32, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  emptyDnaTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  emptyDnaSub: { color: 'rgba(255,255,255,0.15)', fontSize: 12, fontWeight: '500', textAlign: 'center', paddingHorizontal: 32 },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  loadText: { color: GOLD, fontSize: 12, fontWeight: '600' },
  emptyHistory: { alignItems: 'center', gap: 6, paddingVertical: 28, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14 },
  emptyHistoryText: { color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: '700' },
  emptyHistorySub: { color: 'rgba(255,255,255,0.12)', fontSize: 11, fontWeight: '500', textAlign: 'center', paddingHorizontal: 24 },
});
