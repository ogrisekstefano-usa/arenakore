/**
 * STAFF HUB — GYM_OWNER Command Center for Coach Management
 * Dual-theme · Montserrat · Full Coach Analytics Table
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, MONT } from '../../contexts/ThemeContext';
import { api } from '../../utils/api';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════
interface StaffMember {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  level: number;
  xp: number;
  avatar_color: string;
  sport: string;
  athlete_count: number;
  sessions_coached: number;
  last_active: string | null;
  joined_at: string | null;
  is_nexus_certified: boolean;
}

interface StaffData {
  staff: StaffMember[];
  coaches_count: number;
  athletes_total: number;
  gym_name: string;
  gym_code: string;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
function timeAgo(isoDate: string | null): string {
  if (!isoDate) return 'Mai';
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}g fa`;
  return `${Math.floor(days / 30)}M fa`;
}

function isActive(lastActive: string | null): boolean {
  if (!lastActive) return false;
  return Date.now() - new Date(lastActive).getTime() < 7 * 24 * 60 * 60 * 1000; // 7 days
}

// ═══════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════
function StatCard({ icon, label, value, color, theme, delay }: {
  icon: string; label: string; value: string | number;
  color: string; theme: any; delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(300)} style={[
      stat$.card,
      { backgroundColor: theme.surface, borderColor: theme.border2 }
    ]}>
      <View style={[stat$.iconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[stat$.value, MONT('800'), { color: theme.text }]}>{value}</Text>
      <Text style={[stat$.label, MONT('400'), { color: theme.textTer }]}>{label}</Text>
    </Animated.View>
  );
}

const stat$ = StyleSheet.create({
  card: { flex: 1, minWidth: 140, borderRadius: 14, padding: 16, borderWidth: 1, gap: 6 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 28, letterSpacing: -0.5 },
  label: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' as any },
});

// ═══════════════════════════════════════════════════════════════════
// COACH ROW
// ═══════════════════════════════════════════════════════════════════
function CoachRow({ member, theme, index, onRemove, onRoleChange, isRemoving }: {
  member: StaffMember; theme: any; index: number;
  onRemove: () => void; onRoleChange: (newRole: string) => void;
  isRemoving: boolean;
}) {
  const active = isActive(member.last_active);
  const isOwner = member.role === 'GYM_OWNER';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).duration(250)}
      style={[row$.container, { backgroundColor: theme.surface, borderColor: theme.border2 }]}
    >
      {/* Avatar */}
      <View style={[row$.avatar, { backgroundColor: member.avatar_color || '#00E5FF' }]}>
        <Text style={[row$.avatarLetter, MONT('900')]}>{(member.username || '?')[0].toUpperCase()}</Text>
      </View>

      {/* Info */}
      <View style={row$.info}>
        <View style={row$.nameRow}>
          <Text style={[row$.name, MONT('700'), { color: theme.text }]} numberOfLines={1}>
            {member.username}
          </Text>
          {isOwner && (
            <View style={[row$.ownerBadge, { backgroundColor: 'rgba(255,215,0,0.12)' }]}>
              <Text style={[row$.ownerText, MONT('900')]}>OWNER</Text>
            </View>
          )}
          {member.is_nexus_certified && (
            <Ionicons name="shield-checkmark" size={14} color="#00E5FF" style={{ marginLeft: 4 }} />
          )}
        </View>
        <Text style={[row$.email, MONT('300'), { color: theme.textTer }]} numberOfLines={1}>
          {member.email}
        </Text>
      </View>

      {/* Athletes */}
      <View style={row$.metricCell}>
        <Text style={[row$.metricValue, MONT('800'), { color: theme.accent }]}>
          {member.athlete_count}
        </Text>
        <Text style={[row$.metricLabel, MONT('400'), { color: theme.textTer }]}>Atleti</Text>
      </View>

      {/* Level */}
      <View style={row$.metricCell}>
        <Text style={[row$.metricValue, MONT('800'), { color: theme.text }]}>
          {member.level}
        </Text>
        <Text style={[row$.metricLabel, MONT('400'), { color: theme.textTer }]}>Livello</Text>
      </View>

      {/* Status */}
      <View style={row$.metricCell}>
        <View style={[row$.statusDot, { backgroundColor: active ? '#34C759' : theme.textTer + '40' }]} />
        <Text style={[row$.metricLabel, MONT('400'), { color: active ? '#34C759' : theme.textTer }]}>
          {active ? 'Attivo' : 'Offline'}
        </Text>
        <Text style={[row$.timeAgo, MONT('300'), { color: theme.textTer }]}>
          {timeAgo(member.last_active)}
        </Text>
      </View>

      {/* Actions */}
      {!isOwner && (
        <View style={row$.actions}>
          <TouchableOpacity
            style={[row$.actionBtn, { backgroundColor: theme.surface2 }]}
            onPress={() => onRoleChange(member.role === 'COACH' ? 'ATHLETE' : 'COACH')}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-horizontal" size={14} color={theme.textSec} />
            <Text style={[row$.actionText, MONT('600'), { color: theme.textSec }]}>
              {member.role === 'COACH' ? '→ ATH' : '→ COACH'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[row$.removeBtn]}
            onPress={onRemove}
            disabled={isRemoving}
            activeOpacity={0.7}
          >
            {isRemoving
              ? <ActivityIndicator color="#FF3B30" size="small" />
              : <Ionicons name="close-circle" size={18} color="#FF3B30" />
            }
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const row$ = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 14 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#000', fontSize: 20 },
  info: { flex: 1.5, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, letterSpacing: 0.3 },
  email: { fontSize: 13 },
  ownerBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ownerText: { fontSize: 10, color: '#FFD700', letterSpacing: 1.5 },
  metricCell: { flex: 0.6, alignItems: 'center', gap: 2, minWidth: 60 },
  metricValue: { fontSize: 20 },
  metricLabel: { fontSize: 11, letterSpacing: 0.5 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  timeAgo: { fontSize: 10, marginTop: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 90 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  actionText: { fontSize: 11, letterSpacing: 0.5 },
  removeBtn: { padding: 4 },
});

// ═══════════════════════════════════════════════════════════════════
// ADD COACH FORM
// ═══════════════════════════════════════════════════════════════════
function AddCoachForm({ theme, token, onAdded }: { theme: any; token: string; onAdded: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('COACH');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const handleAdd = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.addGymStaff(email.trim().toLowerCase(), role, token);
      setResult({ type: 'ok', msg: `${res.username} aggiunto come ${res.role}` });
      setEmail('');
      onAdded();
    } catch (e: any) {
      setResult({ type: 'err', msg: e?.message || 'Impossibile aggiungere' });
    } finally { setLoading(false); }
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={[
      form$.card, { backgroundColor: theme.surface, borderColor: theme.border2 }
    ]}>
      <View style={form$.header}>
        <Ionicons name="person-add" size={18} color={theme.accent} />
        <Text style={[form$.title, MONT('800'), { color: theme.text }]}>AGGIUNGI COACH</Text>
      </View>

      <View style={form$.field}>
        <Text style={[form$.label, MONT('600'), { color: theme.textTer }]}>EMAIL UTENTE</Text>
        <TextInput
          style={[form$.input, {
            backgroundColor: theme.surface2,
            color: theme.text,
            borderColor: theme.border2
          }]}
          placeholder="coach@palestra.com"
          placeholderTextColor={theme.textTer + '60'}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View style={form$.field}>
        <Text style={[form$.label, MONT('600'), { color: theme.textTer }]}>RUOLO</Text>
        <View style={form$.roleRow}>
          {(['COACH', 'ATHLETE'] as const).map(r => {
            const active = role === r;
            const clr = r === 'COACH' ? '#00E5FF' : theme.textSec;
            return (
              <TouchableOpacity
                key={r}
                style={[form$.roleBtn, active && { borderColor: clr, backgroundColor: clr + '12' }]}
                onPress={() => setRole(r)}
              >
                <Ionicons name={r === 'COACH' ? 'fitness' : 'person'} size={14} color={active ? clr : theme.textTer} />
                <Text style={[form$.roleTxt, MONT('700'), { color: active ? clr : theme.textTer }]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity
        style={[form$.addBtn, (!email.trim() || loading) && { opacity: 0.4 }]}
        onPress={handleAdd}
        disabled={loading || !email.trim()}
        activeOpacity={0.85}
      >
        {loading ? <ActivityIndicator color="#000" size="small" /> : (
          <>
            <Ionicons name="add-circle" size={16} color="#000" />
            <Text style={[form$.addTxt, MONT('900')]}>AGGIUNGI ALLA PALESTRA</Text>
          </>
        )}
      </TouchableOpacity>

      {result && (
        <View style={[form$.result, { backgroundColor: result.type === 'ok' ? '#34C75910' : '#FF3B3010' }]}>
          <Ionicons
            name={result.type === 'ok' ? 'checkmark-circle' : 'alert-circle'}
            size={16}
            color={result.type === 'ok' ? '#34C759' : '#FF3B30'}
          />
          <Text style={[form$.resultTxt, MONT('500'), { color: result.type === 'ok' ? '#34C759' : '#FF3B30' }]}>
            {result.msg}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const form$ = StyleSheet.create({
  card: { borderRadius: 14, padding: 20, borderWidth: 1, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, letterSpacing: 2 },
  field: { gap: 6 },
  label: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' as any },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) } as any,
  roleRow: { flexDirection: 'row', gap: 8 },
  roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(128,128,128,0.15)', borderRadius: 10, paddingVertical: 10 },
  roleTxt: { fontSize: 13, letterSpacing: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#00E5FF', borderRadius: 10, paddingVertical: 13 },
  addTxt: { color: '#000', fontSize: 13, letterSpacing: 1.5 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, padding: 10 },
  resultTxt: { flex: 1, fontSize: 13, lineHeight: 17 },
});

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function StaffHub() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [data, setData] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await api.getGymStaff(token);
      setData(d);
    } catch (e) {
      console.warn('[StaffHub] load error:', e);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (userId: string, username: string) => {
    if (!token) return;
    if (Platform.OS === 'web') {
      if (!window.confirm(`Rimuovere ${username} dalla palestra?`)) return;
    }
    setRemovingId(userId);
    try {
      await api.removeGymStaff(userId, token);
      load();
    } catch (e: any) {
      if (Platform.OS === 'web') window.alert(e?.message || 'Errore');
    } finally { setRemovingId(null); }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!token) return;
    try {
      await api.updateUserRole(userId, newRole, token);
      load();
    } catch (e: any) {
      if (Platform.OS === 'web') window.alert(e?.message || 'Errore');
    }
  };

  // ── Loading
  if (loading) {
    return (
      <View style={[p$.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.accent} size="large" />
        <Text style={[MONT('400'), { color: theme.textTer, marginTop: 12 }]}>Caricamento Staff...</Text>
      </View>
    );
  }

  const coaches = (data?.staff || []).filter(s => s.role === 'COACH');
  const owner = (data?.staff || []).find(s => s.role === 'GYM_OWNER');
  const activeCoaches = coaches.filter(c => isActive(c.last_active)).length;
  const totalAthletes = data?.athletes_total || 0;

  return (
    <ScrollView
      style={[p$.root, { backgroundColor: theme.bg }]}
      contentContainerStyle={p$.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <Animated.View entering={FadeIn.duration(300)} style={p$.header}>
        <View>
          <Text style={[p$.title, MONT('900'), { color: theme.text }]}>STAFF HUB</Text>
          <Text style={[p$.subtitle, MONT('300'), { color: theme.textTer }]}>
            Gestione Coach e Staff — {data?.gym_name || 'La tua palestra'}
          </Text>
        </View>
        {data?.gym_code && (
          <View style={[p$.codeBox, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '30' }]}>
            <Text style={[MONT('400'), { color: theme.textTer, fontSize: 10, letterSpacing: 1.5 }]}>CODICE GYM</Text>
            <Text style={[MONT('900'), { color: theme.accent, fontSize: 16, letterSpacing: 3 }]}>{data.gym_code}</Text>
          </View>
        )}
      </Animated.View>

      {/* ── Stats ── */}
      <View style={p$.statsRow}>
        <StatCard icon="people" label="Coach Totali" value={coaches.length} color="#00E5FF" theme={theme} delay={100} />
        <StatCard icon="pulse" label="Coach Attivi" value={activeCoaches} color="#34C759" theme={theme} delay={150} />
        <StatCard icon="body" label="Atleti Totali" value={totalAthletes} color="#FFD700" theme={theme} delay={200} />
        <StatCard icon="fitness" label="Sessioni" value={coaches.reduce((a, c) => a + (c.sessions_coached || 0), 0)} color="#AF52DE" theme={theme} delay={250} />
      </View>

      {/* ── Two columns: Table + Add Form ── */}
      <View style={p$.twoCol}>
        {/* Left: Coach Table */}
        <View style={p$.tableCol}>
          {/* Table header */}
          <View style={[p$.tableHeader, { borderBottomColor: theme.border2 }]}>
            <Text style={[p$.tableTitle, MONT('800'), { color: theme.text }]}>
              STAFF OPERATIVO
            </Text>
            <Text style={[MONT('400'), { color: theme.textTer, fontSize: 13 }]}>
              {(data?.staff || []).length} membr{(data?.staff || []).length !== 1 ? 'i' : 'o'}
            </Text>
          </View>

          {/* Column headers */}
          <View style={[p$.colHeaders, { borderBottomColor: theme.border }]}>
            <Text style={[p$.colH, { flex: 1.5 }, MONT('600'), { color: theme.textTer }]}>MEMBRO</Text>
            <Text style={[p$.colH, { flex: 0.6, textAlign: 'center' }, MONT('600'), { color: theme.textTer }]}>ATLETI</Text>
            <Text style={[p$.colH, { flex: 0.6, textAlign: 'center' }, MONT('600'), { color: theme.textTer }]}>LVL</Text>
            <Text style={[p$.colH, { flex: 0.6, textAlign: 'center' }, MONT('600'), { color: theme.textTer }]}>STATO</Text>
            <Text style={[p$.colH, { minWidth: 90, textAlign: 'center' }, MONT('600'), { color: theme.textTer }]}>AZIONI</Text>
          </View>

          {/* Owner row first */}
          {owner && (
            <CoachRow
              member={owner}
              theme={theme}
              index={0}
              onRemove={() => {}}
              onRoleChange={() => {}}
              isRemoving={false}
            />
          )}

          {/* Coach rows */}
          {coaches.length === 0 ? (
            <View style={p$.empty}>
              <Ionicons name="people-outline" size={32} color={theme.textTer + '30'} />
              <Text style={[MONT('400'), { color: theme.textTer, fontSize: 14, textAlign: 'center', lineHeight: 20 }]}>
                {'Nessun Coach nel tuo staff.\nAggiungi il primo Coach usando il form a destra.'}
              </Text>
            </View>
          ) : coaches.map((coach, i) => (
            <CoachRow
              key={coach.id}
              member={coach}
              theme={theme}
              index={i + 1}
              onRemove={() => handleRemove(coach.id, coach.username)}
              onRoleChange={(newRole) => handleRoleChange(coach.id, newRole)}
              isRemoving={removingId === coach.id}
            />
          ))}
        </View>

        {/* Right: Add Coach Form */}
        <View style={p$.formCol}>
          <AddCoachForm theme={theme} token={token!} onAdded={load} />

          {/* Info box */}
          <View style={[p$.infoCard, { backgroundColor: theme.surface, borderColor: theme.border2 }]}>
            <View style={p$.infoRow}>
              <Ionicons name="shield-checkmark" size={16} color={theme.accent + '80'} />
              <Text style={[MONT('800'), { color: theme.text, fontSize: 13, letterSpacing: 1 }]}>RBAC ATTIVO</Text>
            </View>
            <Text style={[MONT('300'), { color: theme.textTer, fontSize: 13, lineHeight: 18 }]}>
              I Coach possono vedere solo i propri atleti. Il Gym Owner ha accesso completo a tutto lo staff e i dati della palestra.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════
const p$ = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 28, paddingBottom: 60, gap: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 24, letterSpacing: 4 },
  subtitle: { fontSize: 14, marginTop: 4 },
  codeBox: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', gap: 2 },
  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  twoCol: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  tableCol: { flex: 2, gap: 8 },
  formCol: { flex: 0.8, gap: 16 },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1 },
  tableTitle: { fontSize: 16, letterSpacing: 2 },
  colHeaders: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 1, gap: 14 },
  colH: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' as any },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  infoCard: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
