/**
 * ARENAKORE — CREWS TAB v3.0 (Refactored)
 * Nike Elite Aesthetic — Zero emoji, Bold Sans-Serif
 * Sub-components extracted to /components/crew/
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, ImageBackground, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, SlideOutLeft,
  Layout, Easing,
} from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { Header } from '../../components/Header';
import { TAB_BACKGROUNDS } from '../../utils/images';
import { GymHub } from '../../components/GymHub';
import { CoachStudio } from '../../components/crew/CoachStudio';
import { CreateCrewModal } from '../../components/crew/CreateCrewModal';
import { CrewHubDetail } from '../../components/crew/CrewHubDetail';
import { CATEGORIES_MAP } from '../../components/crew/CreateCrewModal';
import { ChallengeInviteModal } from '../../components/crew/ChallengeInviteModal';
import { playAcceptPing, playDecline } from '../../utils/sounds';

// WoW dramatic athlete group photos for immersive crew cards
const CREW_PHOTOS = [
  'https://images.unsplash.com/photo-1582086772405-6e2dcef428d4?w=800&q=60',
  'https://images.unsplash.com/photo-1529478562208-d4c746edcb79?w=800&q=60',
  'https://images.unsplash.com/photo-1710736460914-4a7f22d736c4?w=800&q=60',
  'https://images.unsplash.com/photo-1698788067684-2053c651bfed?w=800&q=60',
];

export default function CrewsTab() {
  const { user, token, activeRole } = useAuth();
  const [myCrews, setMyCrews] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState<any>(null);
  const [challengeTarget, setChallengeTarget] = useState<any>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const loadData = async () => {
    if (!token) return;
    try {
      const [crews, inv] = await Promise.all([api.getMyCrews(token), api.getPendingInvites(token)]);
      setMyCrews(crews); setInvites(inv); setDismissedIds(new Set());
    } catch (e) { /* silenced */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadData(); }, [token]);

  const handleAccept = useCallback(async (inviteId: string) => {
    setDismissedIds(prev => new Set(prev).add(inviteId));
    playAcceptPing();
    setTimeout(async () => {
      try { await api.acceptInvite(inviteId, token!); setInvites(prev => prev.filter(i => i.id !== inviteId)); loadData(); }
      catch (e: any) { setDismissedIds(prev => { const copy = new Set(prev); copy.delete(inviteId); return copy; }); Alert.alert('Errore', e?.message || 'Impossibile accettare'); }
    }, 350);
  }, [token]);

  const handleDecline = useCallback(async (inviteId: string) => {
    setDismissedIds(prev => new Set(prev).add(inviteId));
    playDecline();
    setTimeout(async () => {
      setInvites(prev => prev.filter(i => i.id !== inviteId));
      try { await api.declineInvite(inviteId, token!); } catch {}
    }, 350);
  }, [token]);

  return (
    <ImageBackground source={{ uri: TAB_BACKGROUNDS.crews }} style={s.container} imageStyle={{ opacity: 0.10 }} testID="crews-tab">
      <StatusBar barStyle="light-content" />
      <Header title={activeRole === 'COACH' ? 'MY STUDIO' : activeRole === 'GYM_OWNER' ? 'GYM HUB' : 'LA TRIBU'} />

      {activeRole === 'COACH' ? (
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#FFD700" />} contentContainerStyle={{ paddingBottom: 100 }}>
          <CoachStudio token={token!} myCrews={myCrews} />
        </ScrollView>
      ) : activeRole === 'GYM_OWNER' ? (
        <GymHub />
      ) : loading ? (
        <View style={s.center}><ActivityIndicator color="#00E5FF" size="large" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#00E5FF" />}>
          {/* PENDING INVITES */}
          {invites.length > 0 && (
            <>
              <View style={s.sectionRow}>
                <Ionicons name="mail" size={14} color="#FFD700" />
                <Text style={s.sectionTitle}>INVITI RICEVUTI</Text>
              </View>
              {invites.map((inv, i) => {
                const cfg = inv.crew_category ? CATEGORIES_MAP[inv.crew_category] : null;
                const isDismissed = dismissedIds.has(inv.id);
                return (
                  <Animated.View key={inv.id} entering={FadeInDown.delay(i * 80)} exiting={SlideOutLeft.duration(300).easing(Easing.bezierFn(0.25, 0.1, 0.25, 1))} layout={Layout.springify().damping(15)}>
                    {!isDismissed && (
                      <View style={s.inviteCard}>
                        <View style={s.inviteHeader}>
                          {cfg && <Ionicons name={cfg.icon} size={22} color={cfg.color} />}
                          <View style={s.inviteInfo}>
                            <Text style={s.inviteCrew}>{inv.crew_name}</Text>
                            <Text style={s.inviteFrom}>da {inv.from_username}</Text>
                          </View>
                        </View>
                        <View style={s.inviteActions}>
                          <TouchableOpacity style={s.acceptBtn} onPress={() => handleAccept(inv.id)}>
                            <Ionicons name="checkmark" size={14} color="#FFD700" />
                            <Text style={s.acceptText}>ACCETTA</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={s.declineBtn} onPress={() => handleDecline(inv.id)}>
                            <Ionicons name="close" size={16} color="rgba(255,255,255,0.4)" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </Animated.View>
                );
              })}
            </>
          )}

          {/* MY CREWS */}
          <View style={s.sectionRow}>
            <Ionicons name="shield" size={14} color="#00E5FF" />
            <Text style={s.sectionTitle}>LE MIE CREW</Text>
          </View>
          {myCrews.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="podium-outline" size={40} color="rgba(255,255,255,0.2)" />
              <Text style={s.emptyTitle}>Nessuna Crew</Text>
              <Text style={s.emptySub}>Fonda la tua trib{'\u00f9'} o accetta un invito</Text>
            </View>
          ) : (
            myCrews.map((crew, i) => {
              const cfg = crew.category ? CATEGORIES_MAP[crew.category] : null;
              const bgImage = CREW_PHOTOS[i % CREW_PHOTOS.length];
              return (
                <Animated.View key={crew.id} entering={FadeInDown.delay(i * 80)}>
                  <TouchableOpacity style={s.crewCard} onPress={() => setSelectedCrew(crew)} activeOpacity={0.85}>
                    <ImageBackground source={{ uri: bgImage }} style={s.crewCardBg} imageStyle={s.crewCardImage}>
                      <LinearGradient colors={['rgba(5,5,5,0.1)', 'rgba(5,5,5,0.5)', 'rgba(5,5,5,0.95)']} locations={[0, 0.35, 0.85]} style={s.crewGrad}>
                        <View style={s.crewHeader}>
                          {cfg && (
                            <View style={[s.crewCatBadge, { backgroundColor: `${cfg.color}20`, borderColor: `${cfg.color}40` }]}>
                              <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                            </View>
                          )}
                          {crew.is_owner && (
                            <View style={s.ownerBadge}>
                              <Ionicons name="star" size={10} color="#FFD700" />
                              <Text style={s.ownerText}>FOUNDER</Text>
                            </View>
                          )}
                        </View>
                        <View style={s.crewBottom}>
                          <Text style={s.crewName}>{crew.name}</Text>
                          {crew.tagline ? <Text style={s.crewTagline}>{crew.tagline}</Text> : null}
                          <View style={s.crewStats}>
                            <View style={s.crewStatItem}>
                              <Ionicons name="people" size={12} color="rgba(255,255,255,0.7)" />
                              <Text style={s.crewStatText}>{crew.members_count} KORE</Text>
                            </View>
                            <View style={s.crewStatItem}>
                              <Ionicons name="flash" size={12} color="#FFD700" />
                              <Text style={[s.crewStatText, { color: '#FFD700' }]}>{crew.xp_total} FLUX</Text>
                            </View>
                          </View>
                        </View>
                      </LinearGradient>
                    </ImageBackground>
                  </TouchableOpacity>
                  {/* Challenge button */}
                  <TouchableOpacity
                    style={s.challengeBtn}
                    onPress={() => setChallengeTarget(crew)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="flash" size={12} color="#050505" />
                    <Text style={s.challengeBtnText}>SFIDA</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB — Create Crew */}
      <TouchableOpacity testID="create-crew-fab" style={s.fab} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={18} color="#050505" />
        <Text style={s.fabText}>FONDA CREW</Text>
      </TouchableOpacity>

      <CreateCrewModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={loadData} token={token} />
      {selectedCrew && <CrewHubDetail crew={selectedCrew} onClose={() => { setSelectedCrew(null); loadData(); }} token={token!} />}
      <ChallengeInviteModal
        visible={!!challengeTarget}
        crew={challengeTarget}
        onClose={() => setChallengeTarget(null)}
      />
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  challengeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 4, marginTop: 6, marginBottom: 4,
    backgroundColor: '#FFD700', borderRadius: 8, paddingVertical: 8,
  },
  challengeBtnText: { color: '#000000', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10,
  },
  sectionTitle: {
    color: '#FFFFFF', fontSize: 18, fontWeight: '900',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  inviteCard: {
    marginHorizontal: 24, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  inviteInfo: { flex: 1, gap: 1 },
  inviteCrew: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  inviteFrom: { color: 'rgba(255,255,255,0.5)', fontSize: 17, fontWeight: '400' },
  inviteActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: 10, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.35)',
  },
  acceptText: { color: '#FFD700', fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  declineBtn: {
    width: 44, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  emptyState: { alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: '800' },
  emptySub: { color: 'rgba(255,255,255,0.3)', fontSize: 18, textAlign: 'center' },
  crewCard: {
    marginHorizontal: 24, marginBottom: 14, borderRadius: 20, overflow: 'hidden',
    height: 180, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  crewCardBg: { flex: 1 },
  crewCardImage: { borderRadius: 20 },
  crewGrad: { flex: 1, padding: 16, justifyContent: 'space-between' },
  crewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  crewCatBadge: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  crewBottom: { gap: 4 },
  crewName: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  crewTagline: { color: 'rgba(255,255,255,0.6)', fontSize: 17, fontStyle: 'italic' },
  ownerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,215,0,0.2)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#FFD700',
  },
  ownerText: { color: '#FFD700', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  crewStats: { flexDirection: 'row', gap: 16, marginTop: 4 },
  crewStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  crewStatText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  fab: {
    position: 'absolute', bottom: 90, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFD700', borderRadius: 14, paddingVertical: 16,
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  fabText: { color: '#000000', fontSize: 19, fontWeight: '900', letterSpacing: 2 },
});
