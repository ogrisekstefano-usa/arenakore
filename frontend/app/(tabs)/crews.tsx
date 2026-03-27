import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { Header } from '../../components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const MOCK_INVITES = [
  { id: 'i1', from: 'nexus_runner99', crew: 'Alpha Runners', sport: 'Atletica' },
  { id: 'i2', from: 'iron_zack', crew: 'Iron Brotherhood', sport: 'Powerlifting' },
  { id: 'i3', from: 'cf_master_k', crew: 'Nexus CF Team', sport: 'CrossFit' },
];

function InviteCard({ invite, onAccept, onDecline }: { invite: any; onAccept: () => void; onDecline: () => void }) {
  return (
    <View style={styles.inviteCard} testID={`invite-${invite.id}`}>
      <View style={styles.inviteInfo}>
        <Text style={styles.inviteFrom}>
          <Text style={styles.inviteFromName}>{invite.from}</Text>
          {' '}ti invita in
        </Text>
        <Text style={styles.inviteCrew}>{invite.crew}</Text>
        <Text style={styles.inviteSport}>{invite.sport}</Text>
      </View>
      <View style={styles.inviteActions}>
        <TouchableOpacity
          testID={`invite-accept-${invite.id}`}
          onPress={onAccept}
          style={styles.acceptBtn}
        >
          <Text style={styles.acceptText}>✓</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={`invite-decline-${invite.id}`}
          onPress={onDecline}
          style={styles.declineBtn}
        >
          <Text style={styles.declineText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CrewCard({ crew }: { crew: any }) {
  const [joined, setJoined] = useState(false);
  return (
    <View style={styles.crewCard} testID={`crew-card-${crew.id}`}>
      <View style={styles.crewInfo}>
        <Text style={styles.crewName}>{crew.name}</Text>
        <Text style={styles.crewSport}>{crew.sport}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>👥 {crew.members_count}</Text>
          <Text style={styles.stat}>⭐ {crew.xp_total.toLocaleString()} XP</Text>
        </View>
      </View>
      <TouchableOpacity
        testID={`crew-join-${crew.id}`}
        onPress={() => setJoined(!joined)}
        style={[styles.joinBtn, joined && styles.joinBtnActive]}
      >
        <Text style={[styles.joinText, joined && styles.joinTextActive]}>
          {joined ? 'UNITO ✓' : 'UNISCITI'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CrewsTab() {
  const { token } = useAuth();
  const [crews, setCrews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState(MOCK_INVITES);

  const handleAccept = (id: string) => setInvites(prev => prev.filter(i => i.id !== id));
  const handleDecline = (id: string) => setInvites(prev => prev.filter(i => i.id !== id));

  useEffect(() => {
    if (!token) return;
    api.getCrews(token)
      .then(setCrews)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <View style={styles.container} testID="crews-tab">
      <StatusBar barStyle="light-content" />
      <Header title="CREWS" />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#00F2FF" size="large" /></View>
      ) : (
        <FlatList
          data={crews}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <CrewCard crew={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View>
              {invites.length > 0 && (
                <View style={styles.invitesSection}>
                  <View style={styles.invitesHeader}>
                    <Text style={styles.invitesTitle}>INVITI PENDENTI</Text>
                    <View style={styles.invitesBadge}>
                      <Text style={styles.invitesBadgeText}>{invites.length}</Text>
                    </View>
                  </View>
                  {invites.map(inv => (
                    <InviteCard
                      key={inv.id}
                      invite={inv}
                      onAccept={() => handleAccept(inv.id)}
                      onDecline={() => handleDecline(inv.id)}
                    />
                  ))}
                </View>
              )}
              <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>🔥  LA TRIBÙ</Text>
                <Text style={styles.sectionSub}>Unisciti per moltiplicare i tuoi XP</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  invitesSection: {
    paddingTop: 16, paddingBottom: 8,
  },
  invitesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  invitesTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  invitesBadge: {
    backgroundColor: '#FF3B30', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  invitesBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  inviteCard: {
    backgroundColor: '#111111', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.25)',
    marginBottom: 8,
  },
  inviteInfo: { flex: 1, gap: 2 },
  inviteFrom: { color: '#777', fontSize: 12 },
  inviteFromName: { color: '#00F2FF', fontWeight: '700' },
  inviteCrew: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  inviteSport: { color: '#555', fontSize: 12 },
  inviteActions: { flexDirection: 'row', gap: 8, marginLeft: 12 },
  acceptBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#00F2FF', alignItems: 'center', justifyContent: 'center',
  },
  acceptText: { color: '#050505', fontSize: 16, fontWeight: '900' },
  declineBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#333',
  },
  declineText: { color: '#777', fontSize: 16 },
  listHeader: { paddingVertical: 12 },
  sectionTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  sectionSub: { color: '#555555', fontSize: 13, marginTop: 4 },
  crewCard: {
    backgroundColor: '#111111', borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  crewInfo: { flex: 1, gap: 4 },
  crewName: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  crewSport: { color: '#00F2FF', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 14, marginTop: 4 },
  stat: { color: '#888', fontSize: 12 },
  joinBtn: {
    borderWidth: 1.5, borderColor: '#00F2FF', borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 8, marginLeft: 12,
  },
  joinBtnActive: { backgroundColor: '#00F2FF', borderColor: '#00F2FF' },
  joinText: { color: '#00F2FF', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  joinTextActive: { color: '#050505' },
});
