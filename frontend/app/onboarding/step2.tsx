import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar,
  TextInput, TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '../../utils/api';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 56) / 3;

export default function Step2() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { category } = useLocalSearchParams<{ category: string }>();
  const [selected, setSelected] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryData, setCategoryData] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load category sports
  useEffect(() => {
    if (!category) return;
    api.getSportsByCategory(category)
      .then(data => { setCategoryData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category]);

  // Smart search
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length >= 2) {
      setSearching(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await api.searchSports(text);
          setSearchResults(results);
        } catch { setSearchResults([]); }
        finally { setSearching(false); }
      }, 300);
    } else {
      setSearchResults([]);
      setSearching(false);
    }
  };

  const displaySports = searchQuery.length >= 2 ? searchResults : (categoryData?.sports || []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← INDIETRO</Text>
        </TouchableOpacity>
        <Text style={styles.stepLabel}>LEVEL 2 DI 3</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '66%' }]} />
        </View>
        <Text style={styles.title}>IL TUO SPORT</Text>
        <Text style={styles.subtitle}>
          {categoryData ? `${categoryData.category} — ${categoryData.sports?.length} discipline` : 'Seleziona la disciplina'}
        </Text>
      </View>

      {/* Smart Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          testID="sport-search-input"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Cerca tra 50+ discipline..."
          placeholderTextColor="#444"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator color="#00F2FF" size="small" />}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#00F2FF" size="large" /></View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {displaySports.map((sport: any, i: number) => (
              <Animated.View key={sport.id} entering={FadeInDown.delay(i * 40).springify()} style={styles.sportWrapper}>
                <TouchableOpacity
                  testID={`sport-${sport.id}-btn`}
                  onPress={() => setSelected(sport.id)}
                  style={[
                    styles.sportCard,
                    selected === sport.id && styles.sportCardSelected,
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sportIcon}>{sport.icon}</Text>
                  <Text style={[
                    styles.sportLabel,
                    selected === sport.id && styles.sportLabelActive,
                  ]} numberOfLines={1}>{sport.label}</Text>
                  {sport.category_label && searchQuery.length >= 2 && (
                    <Text style={[styles.sportCat, { color: sport.category_color }]}>
                      {sport.category_label}
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>

          {displaySports.length === 0 && searchQuery.length >= 2 && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>Nessun risultato per "{searchQuery}"</Text>
              <Text style={styles.noResultsSub}>Prova il profilo Versatile →</Text>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          testID="step2-continue-btn"
          onPress={() => selected && router.push({
            pathname: '/onboarding/step3',
            params: { category, sport: selected, is_versatile: 'false' },
          })}
          style={[styles.continueButton, !selected && styles.continueButtonDisabled]}
          disabled={!selected}
        >
          <Text style={styles.continueButtonText}>CONTINUA →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="step2-versatile-btn"
          onPress={() => router.push({
            pathname: '/onboarding/step3',
            params: { category, sport: 'versatile', is_versatile: 'true' },
          })}
          style={styles.versatileBtn}
        >
          <Text style={styles.versatileBtnText}>🌐  PROFILO VERSATILE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: { paddingHorizontal: 20, marginBottom: 12 },
  backBtn: { marginBottom: 12 },
  backText: { color: '#00F2FF', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  stepLabel: { color: '#00F2FF', fontSize: 10, fontWeight: '700', letterSpacing: 3, marginBottom: 8 },
  progressBar: { height: 2, backgroundColor: '#1E1E1E', borderRadius: 2, marginBottom: 16 },
  progressFill: { height: '100%', backgroundColor: '#00F2FF', borderRadius: 2 },
  title: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', letterSpacing: -1.5 },
  subtitle: { color: '#555', fontSize: 13, marginTop: 4 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: '#111111', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1E1E1E', gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14, padding: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, justifyContent: 'space-between', paddingTop: 4,
  },
  sportWrapper: { width: '31%', marginBottom: 10 },
  sportCard: {
    backgroundColor: '#111111',
    borderRadius: 10, padding: 12, alignItems: 'center',
    gap: 4, borderWidth: 1.5, borderColor: '#1E1E1E',
  },
  sportCardSelected: { borderColor: '#00F2FF', backgroundColor: 'rgba(0,242,255,0.06)' },
  sportIcon: { fontSize: 24 },
  sportLabel: { color: '#888', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  sportLabelActive: { color: '#00F2FF' },
  sportCat: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  noResults: { alignItems: 'center', padding: 32, gap: 8 },
  noResultsText: { color: '#555', fontSize: 14 },
  noResultsSub: { color: '#00F2FF', fontSize: 12, fontWeight: '700' },
  footer: {
    paddingHorizontal: 20, paddingTop: 8,
    backgroundColor: '#050505', borderTopWidth: 1, borderTopColor: '#111111',
    gap: 8,
  },
  continueButton: {
    backgroundColor: '#00F2FF', borderRadius: 8,
    paddingVertical: 16, alignItems: 'center',
  },
  continueButtonDisabled: { opacity: 0.3 },
  continueButtonText: { color: '#050505', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  versatileBtn: {
    backgroundColor: 'transparent', borderRadius: 8,
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  versatileBtnText: { color: '#888', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});
