/**
 * NÈXUS COMMAND CENTER — Global Dashboard
 * Widget-based layout · Dual-theme support
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, PJS, MONT, fz } from '../../contexts/ThemeContext';
import { api } from '../../utils/api';
import { ActivityHeatmap, AlertRow } from '../../components/studio/StudioComponents';
import { LiveMonitorPanel } from '../../components/studio/LiveMonitor';
import { NexusSimulatorModal } from '../../components/studio/NexusSimulatorModal';

// ── Widget Shell ──────────────────────────────────────────────────────────────
function Widget({ title, subtitle, icon, iconColor, children, onExpand, span = 1 }: {
  title: string; subtitle?: string; icon?: string; iconColor?: string;
  children: React.ReactNode; onExpand?: () => void; span?: number;
}) {
  const { theme, mode } = useTheme();
  return (
    <View
      style={[
        w$.card,
        { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, flex: span, borderRadius: theme.cardRadius },
        Platform.OS === 'web' && theme.cardShadow ? ({ boxShadow: theme.cardShadowCss } as any) : {},
      ]}
      {...(Platform.OS === 'web' ? { 'data-nexus-card': '1' } as any : {})}
    >
      <View style={w$.header}>
        <View style={w$.headerLeft}>
          {icon && <Ionicons name={icon as any} size={13} color={iconColor || theme.accent} />}
          <Text
            style={[w$.title, PJS('600'), { color: theme.titleColor, fontSize: fz(11, mode) }]}
            {...(Platform.OS === 'web' ? { 'data-nexus-title': '1' } as any : {})}
          >{title}</Text>
          {subtitle && <Text style={[w$.subtitle, MONT('400'), { color: theme.textTer, fontSize: fz(9, mode) }]}>{subtitle}</Text>}
        </View>
        {onExpand && (
          <TouchableOpacity onPress={onExpand}>
            <Ionicons name="expand-outline" size={13} color={theme.textTer} />
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}
import { Platform } from 'react-native';

const w$ = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 18, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { fontSize: 14, letterSpacing: 2 },
  subtitle: { fontSize: 12, letterSpacing: 1, marginLeft: 4 },
});

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPITile({ label, value, sub, color, icon, trend }: any) {
  const { theme } = useTheme();
  return (
    <View style={[kp$.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={kp$.top}>
        <View style={[kp$.iconBg, { backgroundColor: color + '14' }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        {trend && (
          <View style={[kp$.trend, { backgroundColor: trend === 'up' ? theme.positive + '18' : theme.negative + '18' }]}>
            <Ionicons name={trend === 'up' ? 'trending-up' : 'trending-down'} size={10} color={trend === 'up' ? theme.positive : theme.negative} />
          </View>
        )}
      </View>
      <Text style={[kp$.value, MONT(), { color: theme.text }]}>{value}</Text>
      <Text style={[kp$.label, MONT('900'), { color: theme.textTer }]}>{label}</Text>
      {sub && <Text style={[kp$.sub, MONT('300'), { color: theme.textTer }]}>{sub}</Text>}
    </View>
  );
}
const kp$ = StyleSheet.create({
  tile: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 14, gap: 6, minWidth: 120 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBg: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  trend: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 28, letterSpacing: 0.5, lineHeight: 30 },
  label: { fontSize: 11, letterSpacing: 2.5 },
  sub: { fontSize: 12, letterSpacing: 0.5 },
});

// ── Quick Action ──────────────────────────────────────────────────────────────
function QuickAction({ label, icon, color, onPress }: any) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[qa$.btn, { backgroundColor: color + '12', borderColor: color + '35' }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[qa$.label, MONT('900'), { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const qa$ = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, flex: 1 },
  label: { fontSize: 13, letterSpacing: 1.5 },
});

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function GlobalDashboard() {
  const { token, user } = useAuth();
  const { theme, mode } = useTheme();
  const router = useRouter();
  const [athletes, setAthletes] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [battles, setBattles] = useState<any>(null);
  const [gymData, setGymData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSimulator, setShowSimulator] = useState(false);

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
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const avgDna = athletes?.athletes?.length
    ? Math.round(athletes.athletes.reduce((s: number, a: any) => s + a.dna_avg, 0) / athletes.athletes.length) : 0;
  const avgComp = compliance?.templates?.length
    ? Math.round(compliance.templates.reduce((s: number, t: any) => s + t.compliance_pct, 0) / compliance.templates.length) : 0;
  const criticalAlerts = alerts?.alerts?.filter((a: any) => a.severity === 'danger')?.length || 0;

  if (loading) return (
    <View style={[pg$.loading, { backgroundColor: theme.bg }]}>
      <ActivityIndicator color={theme.accent} size="small" />
      <Text style={[pg$.loadingText, MONT('300'), { color: theme.textTer }]}>
        Caricamento dati biometrici...
      </Text>
    </View>
  );

  return (
    <>
    <ScrollView
      style={[pg$.root, { backgroundColor: theme.bg }]}
      contentContainerStyle={pg$.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── PAGE HEADER ── */}
      <Animated.View entering={FadeInDown.duration(300)} style={pg$.pageHeader}>
        <View>
          <Text style={[pg$.greeting, MONT('400'), { color: theme.textSec, fontSize: fz(12, mode) }]}>
            Benvenuto, {user?.username?.toUpperCase()}
          </Text>
          <Text
            style={[pg$.pageTitle, PJS('800'), { color: theme.titleColor, fontSize: fz(22, mode) }]}
            {...(Platform.OS === 'web' ? { 'data-nexus-title': '1' } as any : {})}
          >
            GLOBAL DASHBOARD
          </Text>
        </View>
        <View style={pg$.headerRight}>
          {criticalAlerts > 0 && (
            <View style={[pg$.alertBadge, { backgroundColor: theme.accentRed + '18', borderColor: theme.accentRed + '40' }]}>
              <Ionicons name="warning" size={12} color={theme.accentRed} />
              <Text style={[pg$.alertBadgeText, MONT('900'), { color: theme.accentRed }]}>
                {criticalAlerts} CRITICAL
              </Text>
            </View>
          )}
          <Text style={[pg$.gymName, MONT('300'), { color: theme.textTer }]}>
            {gymData?.name || 'NÈXUS GYM'} · {athletes?.total || 0} Kore
          </Text>
        </View>
      </Animated.View>

      {/* ── KPI ROW ── */}
      <Animated.View entering={FadeInDown.delay(60).duration(300)} style={pg$.kpiRow}>
        <KPITile icon="people" label="KORE ATTIVI" value={athletes?.total || 0} sub={`${athletes?.crew_count || 0} crew`} color={theme.accent} trend="up" />
        <KPITile icon="analytics" label="DNA MEDIO" value={avgDna} sub="/ 100 KORE" color={theme.accentGold} trend="up" />
        <KPITile icon="checkmark-circle" label="COMPLIANCE" value={`${avgComp}%`} sub="template completion" color={theme.positive} />
        <KPITile icon="shield" label="BATTLE W/L" value={`${battles?.wins || 0}/${battles?.losses || 0}`} sub={`${battles?.win_rate || 0}% win rate`} color="#AF52DE" />
        <KPITile icon="document-text" label="TEMPLATE" value={compliance?.total || 0} sub="inviati" color={theme.accentGold} />
      </Animated.View>

      {/* ── WIDGET ROW 1: Heatmap + Alert Center ── */}
      <Animated.View entering={FadeInDown.delay(120).duration(300)} style={pg$.widgetRow}>
        {heatmap?.grid && (
          <Widget title="SCAN ACTIVITY" subtitle="30 giorni" icon="pulse" span={3}>
            <ActivityHeatmap grid={heatmap.grid} totalScans={heatmap.total_scans} activeDays={heatmap.active_days} />
          </Widget>
        )}
        <Widget
          title="ALERT CENTER"
          subtitle={criticalAlerts > 0 ? `${criticalAlerts} critici` : 'Tutto ok'}
          icon="warning"
          iconColor={criticalAlerts > 0 ? theme.accentRed : theme.positive}
          span={2}
          onExpand={() => router.push('/coach-studio/ai' as any)}
        >
          {(!alerts?.alerts || alerts.alerts.length === 0) ? (
            <View style={pg$.emptyState}>
              <Ionicons name="checkmark-circle" size={22} color={theme.positive} />
              <Text style={[pg$.emptyText, MONT('300'), { color: theme.textTer }]}>
                Nessun alert attivo
              </Text>
            </View>
          ) : alerts.alerts.slice(0, 4).map((al: any, i: number) => <AlertRow key={i} alert={al} />)}
        </Widget>
      </Animated.View>

      {/* ── WIDGET ROW 2: Live Monitor + Top Performers ── */}
      <Animated.View entering={FadeInDown.delay(180).duration(300)} style={pg$.widgetRow}>
        <Widget title="LIVE MONITOR" subtitle="Real-time scans" icon="radio" span={3}>
          <LiveMonitorPanel gymId={gymData?.id} />
        </Widget>
        <Widget title="TOP PERFORMERS" subtitle="Per DNA score" icon="trophy" iconColor={theme.accentGold} span={2}>
          {(athletes?.athletes?.slice(0, 5) || []).map((a: any, i: number) => (
            <View key={a.id} style={[pg$.perfRow, { borderBottomColor: theme.border }]}>
              <Text style={[pg$.perfRank, MONT('900'), { color: theme.textTer }]}>#{i + 1}</Text>
              <View style={[pg$.perfAvatar, { backgroundColor: a.avatar_color || theme.accent }]}>
                <Text style={pg$.perfAvatarLetter}>{(a.username || '?')[0]}</Text>
              </View>
              <View style={pg$.perfInfo}>
                <Text style={[pg$.perfName, MONT('700'), { color: theme.text }]} numberOfLines={1}>
                  {a.username}
                </Text>
                <Text style={[pg$.perfSub, MONT('300'), { color: theme.textTer }]}>
                  LVL {a.level} · {a.xp?.toLocaleString()} FLUX
                </Text>
              </View>
              <Text style={[pg$.perfDna, MONT('900'), {
                color: a.dna_avg >= 80 ? theme.accentGold : theme.accent
              }]}>
                {a.dna_avg}
              </Text>
            </View>
          ))}
        </Widget>
      </Animated.View>

      {/* ── QUICK ACTIONS ── */}
      <Animated.View entering={FadeInDown.delay(240).duration(300)}>
        <Widget title="AZIONI RAPIDE" icon="flash" iconColor={theme.accentGold}>
          <View style={pg$.actionRow}>
            <QuickAction label="SIMULATE NEXUS" icon="body" color="#FF2D55" onPress={() => setShowSimulator(true)} />
            <QuickAction label="NUOVO TEMPLATE" icon="add-circle" color={theme.accent} onPress={() => router.push('/coach-studio/builder' as any)} />
            <QuickAction label="SCOUT KORE" icon="star" color={theme.accentGold} onPress={() => router.push('/coach-studio/talent' as any)} />
            <QuickAction label="AI ANALYSIS" icon="hardware-chip" color="#AF52DE" onPress={() => router.push('/coach-studio/ai' as any)} />
            <QuickAction label="CREW BATTLE" icon="shield" color={theme.accentRed} onPress={() => router.push('/coach-studio/crew' as any)} />
          </View>
        </Widget>
      </Animated.View>

      {/* ── RECENT BATTLES ── */}
      {battles?.battles?.length > 0 && (
        <Animated.View entering={FadeInDown.delay(300).duration(300)}>
          <Widget title="BATTLE RECENTI" subtitle="Crew battle history" icon="flash" iconColor={theme.accentRed}>
            {battles.battles.slice(0, 4).map((b: any) => (
              <View key={b.id} style={[pg$.battleRow, { borderBottomColor: theme.border }]}>
                <View style={[pg$.resultPill, {
                  backgroundColor: b.my_result === 'win' ? theme.positive + '18' : b.my_result === 'loss' ? theme.negative + '18' : theme.surface2,
                  borderColor: b.my_result === 'win' ? theme.positive + '40' : b.my_result === 'loss' ? theme.negative + '40' : theme.border,
                }]}>
                  <Text style={[pg$.resultText, MONT('900'), {
                    color: b.my_result === 'win' ? theme.positive : b.my_result === 'loss' ? theme.negative : theme.textTer
                  }]}>
                    {b.my_result === 'win' ? 'WIN' : b.my_result === 'loss' ? 'LOSS' : (b.status || 'ACTIVE').toUpperCase()}
                  </Text>
                </View>
                <Text style={[pg$.battleName, MONT('400'), { color: theme.textSec, flex: 1 }]} numberOfLines={1}>
                  {b.crew_a} <Text style={{ color: theme.text, fontWeight: '900' }}>{b.score_a}</Text>
                  {' vs '}
                  <Text style={{ color: theme.text, fontWeight: '900' }}>{b.score_b}</Text> {b.crew_b}
                </Text>
                <Text style={[pg$.battleDate, MONT('300'), { color: theme.textTer }]}>
                  {b.started_at?.slice(0, 10)}
                </Text>
              </View>
            ))}
          </Widget>
        </Animated.View>
      )}
    </ScrollView>

    {/* ═══ NEXUS SIMULATOR MODAL ═══ */}
    <NexusSimulatorModal
      visible={showSimulator}
      onClose={() => setShowSimulator(false)}
    />
    </>
  );
}

const pg$ = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, gap: 16, paddingBottom: 48 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, letterSpacing: 1 },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  greeting: { fontSize: 14, letterSpacing: 2, marginBottom: 2 },
  pageTitle: { fontSize: 26, letterSpacing: 4 },
  headerRight: { alignItems: 'flex-end', gap: 6 },
  alertBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  alertBadgeText: { fontSize: 11, letterSpacing: 1.5 },
  gymName: { fontSize: 13, letterSpacing: 1 },

  kpiRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  widgetRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },

  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 14 },

  perfRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  perfRank: { width: 20, fontSize: 13, textAlign: 'center' },
  perfAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  perfAvatarLetter: { color: '#000', fontSize: 13, fontWeight: '900' },
  perfInfo: { flex: 1, gap: 1 },
  perfName: { fontSize: 14, letterSpacing: 0.5 },
  perfSub: { fontSize: 12, letterSpacing: 0.5 },
  perfDna: { fontSize: 18 },

  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

  battleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1 },
  resultPill: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, minWidth: 42, alignItems: 'center' },
  resultText: { fontSize: 11, letterSpacing: 1 },
  battleName: { fontSize: 14 },
  battleDate: { fontSize: 12 },
});
