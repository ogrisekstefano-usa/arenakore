/**
 * GYM HUB — Business Dashboard for GYM_OWNER
 * XP generated, members, coaches, subscription tier
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { KPICard, SectionHeader } from '../../components/studio/StudioComponents';

const TIER_CFG: Record<string, { color: string; label: string; icon: string }> = {
  free:  { color: 'rgba(255,255,255,0.4)', label: 'FREE',  icon: '⬜' },
  pro:   { color: '#00E5FF',               label: 'PRO',   icon: '💎' },
  elite: { color: '#FFD700',               label: 'ELITE', icon: '👑' },
};

export default function GymDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [gymData, setGymData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [gymName, setGymName] = useState('');
  const [gymCode, setGymCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([api.getGymDashboard(token), api.getGymMe(token)])
      .then(([d, g]) => {
        setData(d);
        setGymData(g.gym);
        setGymName(g.gym?.name || '');
        setGymCode(g.gym?.gym_code || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await api.updateGym({ name: gymName, gym_code: gymCode.toUpperCase() }, token);
      const g = await api.getGymMe(token);
      setGymData(g.gym);
      setEditMode(false);
      Alert.alert('SALVATO', 'Dati palestra aggiornati.');
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Impossibile salvare');
    } finally { setSaving(false); }
  };

  if (loading) return <View style={g$.center}><ActivityIndicator color="#FFD700" /></View>;

  const stats = data?.stats || {};
  const tier = TIER_CFG[stats.subscription_tier || 'free'] || TIER_CFG.free;

  return (
    <ScrollView style={g$.root} contentContainerStyle={g$.content}>
      {/* Header */}
      <View style={g$.header}>
        <View>
          <Text style={g$.pageTitle}>GYM HUB</Text>
          <Text style={g$.pageSub}>{gymData?.name || 'La tua palestra'} · {gymData?.city || '—'}</Text>
        </View>
        <View style={[g$.tierBadge, { backgroundColor: tier.color + '18', borderColor: tier.color + '50' }]}>
          <Text style={g$.tierIcon}>{tier.icon}</Text>
          <Text style={[g$.tierText, { color: tier.color }]}>{tier.label}</Text>
        </View>
      </View>

      {/* Business KPIs */}
      <View style={g$.kpiRow}>
        <KPICard icon="👥" label="MEMBRI TOTALI" value={stats.total_members || 0} sub={`${stats.total_coaches || 0} coach`} color="#00E5FF" />
        <KPICard icon="⚡" label="XP GENERATI" value={(stats.total_xp_generated || 0).toLocaleString()} sub="della palestra" color="#FFD700" />
        <KPICard icon="📊" label="LIVELLO MEDIO" value={stats.avg_level || 1} sub="atleti" color="#00FF87" />
        <KPICard icon="🛡" label="BATTLE" value={stats.battles_count || 0} sub="totali" color="#AF52DE" />
        <KPICard icon="📤" label="TEMPLATE" value={stats.templates_sent || 0} sub="inviati" color="#FF9500" />
      </View>

      {/* Two columns */}
      <View style={g$.twoCol}>
        {/* Left: Top Performers */}
        <View style={g$.col}>
          <View style={g$.sectionCard}>
            <SectionHeader title="TOP PERFORMERS" sub="Atleti con più XP" />
            {(data?.top_performers || []).map((p: any, i: number) => (
              <Animated.View key={p.username} entering={FadeInDown.delay(i * 60).duration(200)} style={g$.performerRow}>
                <View style={g$.performerRank}>
                  <Text style={g$.rankNum}>{i + 1}</Text>
                </View>
                <View style={g$.performerInfo}>
                  <Text style={g$.perfName}>{p.username}</Text>
                  <Text style={g$.perfMeta}>LVL {p.level}</Text>
                </View>
                <Text style={g$.perfXp}>{p.xp?.toLocaleString()} XP</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Right: Gym Settings */}
        <View style={g$.col}>
          <View style={g$.sectionCard}>
            <View style={g$.settingsHeader}>
              <SectionHeader title="IMPOSTAZIONI GYM" sub="Brand & accesso" />
              <TouchableOpacity onPress={() => setEditMode(e => !e)}>
                <Ionicons name={editMode ? 'close' : 'pencil'} size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            <View style={g$.settingRow}>
              <Text style={g$.settingLabel}>NOME PALESTRA</Text>
              {editMode ? (
                <TextInput style={g$.settingInput} value={gymName} onChangeText={setGymName} />
              ) : (
                <Text style={g$.settingValue}>{gymData?.name || '—'}</Text>
              )}
            </View>

            <View style={g$.settingRow}>
              <Text style={g$.settingLabel}>GYM CODE</Text>
              {editMode ? (
                <TextInput style={[g$.settingInput, { color: '#FFD700' }]} value={gymCode}
                  onChangeText={v => setGymCode(v.toUpperCase())} maxLength={8} />
              ) : (
                <View style={g$.codePill}>
                  <Text style={g$.codeText}>{gymData?.gym_code || '—'}</Text>
                </View>
              )}
            </View>

            <View style={g$.settingRow}>
              <Text style={g$.settingLabel}>CITTÀ</Text>
              <Text style={g$.settingValue}>{gymData?.city || '—'}</Text>
            </View>

            <View style={g$.settingRow}>
              <Text style={g$.settingLabel}>ABBONAMENTO</Text>
              <Text style={[g$.settingValue, { color: tier.color }]}>{tier.label}</Text>
            </View>

            {editMode && (
              <TouchableOpacity style={[g$.saveBtn, saving && g$.saveBtnOff]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#000" size="small" /> : (
                  <Text style={g$.saveBtnText}>SALVA MODIFICHE</Text>
                )}
              </TouchableOpacity>
            )}

            <View style={g$.joinInfo}>
              <Ionicons name="information-circle" size={14} color="rgba(0,229,255,0.5)" />
              <Text style={g$.joinText}>Gli atleti possono unirsi usando il Gym Code nell'app mobile.</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const g$ = StyleSheet.create({
  root: { flex: 1 }, content: { padding: 28, gap: 22, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pageTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 4 },
  pageSub: { color: 'rgba(255,255,255,0.30)', fontSize: 12, fontWeight: '300', marginTop: 4 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  tierIcon: { fontSize: 16 },
  tierText: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  twoCol: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  col: { flex: 1 },
  sectionCard: { backgroundColor: '#0A0A0A', borderRadius: 14, padding: 18, gap: 10, borderWidth: 1, borderColor: '#1E1E1E' },
  performerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#111' },
  performerRank: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1E1E1E', alignItems: 'center', justifyContent: 'center' },
  rankNum: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  performerInfo: { flex: 1 },
  perfName: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  perfMeta: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  perfXp: { color: '#FFD700', fontSize: 14, fontWeight: '900' },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingRow: { gap: 5 },
  settingLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  settingValue: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  settingInput: { color: '#FFF', backgroundColor: '#111', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, fontSize: 14, borderWidth: 1, borderColor: '#1E1E1E', outlineStyle: 'none' } as any,
  codePill: { backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)' },
  codeText: { color: '#FFD700', fontSize: 16, fontWeight: '900', letterSpacing: 4 },
  saveBtn: { backgroundColor: '#FFD700', borderRadius: 8, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnOff: { opacity: 0.4 },
  saveBtnText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  joinInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  joinText: { flex: 1, color: 'rgba(0,229,255,0.45)', fontSize: 11, fontWeight: '300', lineHeight: 16 },
});
