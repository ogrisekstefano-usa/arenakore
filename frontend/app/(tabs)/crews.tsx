import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { Header } from '../../components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

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
        <View style={styles.center}><ActivityIndicator color="#00E5FF" size="large" /></View>
      ) : (
        <FlatList
          data={crews}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <CrewCard crew={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>🔥  CREW ATTIVE</Text>
              <Text style={styles.sectionSub}>Unisciti per moltiplicare i tuoi XP</Text>
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
  listHeader: { paddingVertical: 16 },
  sectionTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  sectionSub: { color: '#555555', fontSize: 13, marginTop: 4 },
  crewCard: {
    backgroundColor: '#111111', borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  crewInfo: { flex: 1, gap: 4 },
  crewName: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  crewSport: { color: '#00E5FF', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 14, marginTop: 4 },
  stat: { color: '#888', fontSize: 12 },
  joinBtn: {
    borderWidth: 1.5, borderColor: '#00E5FF', borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 8, marginLeft: 12,
  },
  joinBtnActive: { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
  joinText: { color: '#00E5FF', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  joinTextActive: { color: '#050505' },
});
