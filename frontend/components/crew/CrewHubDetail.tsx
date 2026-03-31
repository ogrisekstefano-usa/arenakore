/**
 * ARENAKORE — Crew Hub Detail View
 * Extracted from crews.tsx
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { api } from '../../utils/api';
import { InviteModal } from './InviteModal';
import { CATEGORIES_MAP } from './CreateCrewModal';

function CoachBadge() {
  return (
    <View style={badge$.container}>
      <Ionicons name="star" size={10} color="#D4AF37" />
      <Text style={badge$.text}>COACH</Text>
    </View>
  );
}

const badge$ = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.4)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  text: { color: '#D4AF37', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
});

export function CrewHubDetail({ crew, onClose, token }: { crew: any; onClose: () => void; token: string }) {
  const [detail, setDetail] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const catCfg = crew.category ? CATEGORIES_MAP[crew.category] : null;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [d, f] = await Promise.all([api.getCrewDetail(crew.id, token), api.getCrewFeed(crew.id, token)]);
      setDetail(d); setFeed(f);
    } catch (e) { /* silenced */ }
    finally { setLoading(false); }
  };

  return (
    <Modal visible animationType="slide">
      <View style={hub$.container}>
        <StatusBar barStyle="light-content" />
        <View style={hub$.header}>
          <TouchableOpacity onPress={onClose} style={hub$.backBtn}>
            <Ionicons name="arrow-back" size={18} color="#00F2FF" />
            <Text style={hub$.backText}>INDIETRO</Text>
          </TouchableOpacity>
          <View style={hub$.headerRight}>
            {crew.is_owner && (
              <TouchableOpacity onPress={() => setShowInvite(true)} style={hub$.inviteHdrBtn}>
                <Ionicons name="person-add" size={14} color="#00F2FF" />
                <Text style={hub$.inviteHdrText}>INVITA</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <LinearGradient colors={[catCfg?.color ? `${catCfg.color}15` : 'rgba(0,242,255,0.65)', '#050505']} style={hub$.heroGrad}>
          <View style={hub$.crewInfo}>
            {catCfg && (
              <View style={[hub$.catBadge, { backgroundColor: `${catCfg.color}20`, borderColor: `${catCfg.color}40` }]}>
                <Ionicons name={catCfg.icon} size={14} color={catCfg.color} />
                <Text style={[hub$.catBadgeText, { color: catCfg.color }]}>{crew.category?.toUpperCase()}</Text>
              </View>
            )}
            <Text style={hub$.crewName}>{crew.name}</Text>
            {crew.tagline ? <Text style={hub$.crewTagline}>{crew.tagline}</Text> : null}
            <View style={hub$.statsRow}>
              <View style={hub$.stat}><Text style={hub$.statVal}>{crew.members_count}</Text><Text style={hub$.statLabel}>MEMBRI</Text></View>
              <View style={hub$.stat}><Text style={[hub$.statVal, { color: '#D4AF37' }]}>{crew.xp_total}</Text><Text style={hub$.statLabel}>XP TOTALI</Text></View>
            </View>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={hub$.center}><ActivityIndicator color="#00F2FF" size="large" /></View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {detail?.crew_dna_average && (
              <>
                <Text style={hub$.sectionTitle}>DNA MEDIA CREW (WEIGHTED)</Text>
                <View style={hub$.dnaRow}>
                  {Object.entries(detail.crew_dna_average).map(([key, val]: [string, any]) => (
                    <View key={key} style={hub$.dnaItem}>
                      <Text style={hub$.dnaVal}>{Math.round(val)}</Text>
                      <Text style={hub$.dnaLabel}>{key.slice(0, 3).toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={hub$.sectionTitle}>MEMBRI</Text>
            {detail?.members?.map((m: any, i: number) => (
              <Animated.View key={m.id} entering={FadeInDown.delay(i * 60)}>
                <View style={hub$.memberRow}>
                  <View style={m.is_coach ? hub$.coachAvatarWrap : undefined}>
                    <View style={[hub$.memberAvatar, { backgroundColor: m.avatar_color }, m.is_coach && hub$.coachAvatarBorder]}>
                      <Text style={hub$.memberAvatarText}>{m.username?.[0]?.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={hub$.memberInfo}>
                    <View style={hub$.memberNameRow}>
                      <Text style={hub$.memberName}>{m.username}</Text>
                      {m.is_coach && <CoachBadge />}
                    </View>
                    <Text style={hub$.memberSport}>{m.sport || '\u2014'} {'\u00b7'} LVL {m.level}</Text>
                  </View>
                  <View style={hub$.memberXP}>
                    <Text style={hub$.memberXPVal}>{m.xp}</Text>
                    <Text style={hub$.memberXPLabel}>XP</Text>
                  </View>
                </View>
              </Animated.View>
            ))}

            <Text style={hub$.sectionTitle}>ACTIVITY FEED</Text>
            {feed.length === 0 && <Text style={hub$.emptyFeed}>Nessuna attivit{'\u00e0'} ancora. Inizia una sfida!</Text>}
            {feed.map((e: any, i: number) => (
              <Animated.View key={e.id} entering={FadeInRight.delay(i * 50)}>
                <View style={hub$.feedItem}>
                  <View style={[hub$.feedDot, e.type === 'member_joined' && { backgroundColor: '#34C759' }]} />
                  <View style={hub$.feedContent}>
                    <Text style={hub$.feedMsg}>{e.message}</Text>
                    <Text style={hub$.feedTime}>{e.created_at ? new Date(e.created_at).toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : ''}</Text>
                  </View>
                </View>
              </Animated.View>
            ))}
            <View style={{ height: 32 }} />
          </ScrollView>
        )}
        <InviteModal visible={showInvite} onClose={() => setShowInvite(false)} crewId={crew.id} token={token} />
      </View>
    </Modal>
  );
}

const hub$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  backText: { color: '#00F2FF', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  headerRight: {},
  inviteHdrBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  inviteHdrText: { color: '#00F2FF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  heroGrad: { paddingHorizontal: 20, paddingVertical: 20 },
  crewInfo: { gap: 6 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  catBadgeText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  crewName: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: 0.5 },
  crewTagline: { color: 'rgba(255,255,255,0.5)', fontSize: 17, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', gap: 24, marginTop: 10 },
  stat: { gap: 1 },
  statVal: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '900', letterSpacing: 3, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  dnaRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingBottom: 8 },
  dnaItem: { alignItems: 'center', gap: 2 },
  dnaVal: { color: '#00F2FF', fontSize: 18, fontWeight: '900' },
  dnaLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.45)' },
  coachAvatarWrap: { borderRadius: 22, padding: 2, borderWidth: 1.5, borderColor: '#D4AF37' },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  coachAvatarBorder: {},
  memberAvatarText: { color: '#050505', fontSize: 17, fontWeight: '900' },
  memberInfo: { flex: 1, gap: 3 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  memberSport: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '400' },
  memberXP: { alignItems: 'center' },
  memberXPVal: { color: '#D4AF37', fontSize: 16, fontWeight: '900' },
  memberXPLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  emptyFeed: { color: 'rgba(255,255,255,0.3)', fontSize: 16, textAlign: 'center', padding: 24 },
  feedItem: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 8 },
  feedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0D0D0D', marginTop: 4 },
  feedContent: { flex: 1, gap: 2 },
  feedMsg: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '600' },
  feedTime: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
});
