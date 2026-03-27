import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { Header } from '../../components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const CATEGORIES = ['Tutti', 'Forza', 'Atletica', 'Cardio', 'Recovery', 'Analisi', 'Programmazione', 'Nutrizione'];

function DisciplineCard({ disc, isCoach }: { disc: any; isCoach: boolean }) {
  if (disc.coach_only && !isCoach) return null;
  return (
    <View style={styles.discCard} testID={`discipline-${disc.id}`}>
      <View style={styles.discIconBox}>
        <Text style={styles.discIcon}>{disc.icon}</Text>
      </View>
      <View style={styles.discBody}>
        <View style={styles.discTitleRow}>
          <Text style={styles.discName}>{disc.name}</Text>
          {disc.coach_only && (
            <View style={styles.coachTag}>
              <Text style={styles.coachTagText}>COACH</Text>
            </View>
          )}
        </View>
        <Text style={styles.discDesc}>{disc.description}</Text>
        <Text style={styles.discCat}>{disc.category}</Text>
      </View>
    </View>
  );
}

export default function NexusTab() {
  const { token, user } = useAuth();
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Tutti');
  const isCoach = user?.role === 'coach';

  useEffect(() => {
    if (!token) return;
    api.getDisciplines(token)
      .then(setDisciplines)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = filter === 'Tutti' ? disciplines : disciplines.filter(d => d.category === filter);

  return (
    <View style={styles.container} testID="nexus-tab">
      <StatusBar barStyle="light-content" />
      <Header title="NEXUS" />

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={item => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`filter-${item}`}
            onPress={() => setFilter(item)}
            style={[styles.filterChip, filter === item && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#00F2FF" size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <DisciplineCard disc={item} isCoach={isCoach} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() =>
            isCoach ? (
              <View style={styles.forgeCard}>
                <Text style={styles.forgeTitle}>⚡  DISCIPLINE FORGE</Text>
                <Text style={styles.forgeSub}>Crea nuove discipline per i tuoi atleti</Text>
                <TouchableOpacity testID="forge-create-btn" style={styles.forgeBtn}>
                  <Text style={styles.forgeBtnText}>+ CREA DISCIPLINA</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#111111', borderWidth: 1, borderColor: '#1E1E1E',
  },
  filterChipActive: { backgroundColor: 'rgba(0,229,255,0.1)', borderColor: '#00F2FF' },
  filterText: { color: '#555', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#00F2FF', fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  discCard: {
    backgroundColor: '#111111', borderRadius: 12, padding: 14,
    flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#1E1E1E',
  },
  discIconBox: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#1A1A1A', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },
  discIcon: { fontSize: 22 },
  discBody: { flex: 1, gap: 3 },
  discTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  discName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', flex: 1 },
  coachTag: { backgroundColor: 'rgba(255,215,0,0.12)', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  coachTagText: { color: '#D4AF37', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  discDesc: { color: '#555', fontSize: 12, lineHeight: 17 },
  discCat: { color: '#00F2FF', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  forgeCard: {
    backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)', gap: 6,
  },
  forgeTitle: { color: '#D4AF37', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  forgeSub: { color: '#555', fontSize: 13 },
  forgeBtn: {
    backgroundColor: '#D4AF37', borderRadius: 7, paddingVertical: 10,
    alignItems: 'center', marginTop: 4,
  },
  forgeBtnText: { color: '#050505', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
});
