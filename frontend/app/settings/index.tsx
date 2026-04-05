/**
 * ARENAKORE — Settings: Athlete Identity
 * Profile Picture Upload + Preferred Sport Selection + Bio Data
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Image, Platform, Alert, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';

const FONT_J = Platform.select({ ios: 'PlusJakartaSans-ExtraBold', android: 'PlusJakartaSans-ExtraBold', default: 'Plus Jakarta Sans' });
const FONT_M = Platform.select({ ios: 'Montserrat-Regular', android: 'Montserrat-Regular', default: 'Montserrat' });

// ── 30+ Discipline List ──
const SPORTS_LIST = [
  'Fitness', 'CrossFit', 'Bodybuilding', 'Calisthenics', 'Powerlifting', 'Weightlifting',
  'Golf', 'Padel', 'Tennis', 'Basket', 'Calcio', 'Pallavolo',
  'Running', 'Trail Running', 'Ciclismo', 'Mountain Bike', 'Nuoto', 'Triathlon',
  'Yoga', 'Pilates', 'Functional Training', 'HIIT',
  'Boxing', 'Kickboxing', 'MMA', 'Jiu-Jitsu', 'Karate', 'Taekwondo', 'Judo',
  'Arrampicata', 'Surf', 'Sci', 'Snowboard', 'Skateboard',
  'Danza', 'Ginnastica', 'Atletica Leggera', 'Canottaggio',
  'Rugby', 'Cricket', 'Baseball', 'Hockey',
  'Scherma', 'Tiro con l\'Arco', 'Equitazione',
];

const SPORT_ICONS: Record<string, string> = {
  'Fitness': '🏋️', 'CrossFit': '💪', 'Bodybuilding': '🏋️', 'Calisthenics': '🤸', 'Powerlifting': '🏋️',
  'Golf': '⛳', 'Padel': '🏓', 'Tennis': '🎾', 'Basket': '🏀', 'Calcio': '⚽', 'Pallavolo': '🏐',
  'Running': '🏃', 'Trail Running': '🏔️', 'Ciclismo': '🚴', 'Mountain Bike': '🚵', 'Nuoto': '🏊',
  'Yoga': '🧘', 'Boxing': '🥊', 'MMA': '🥋', 'Arrampicata': '🧗', 'Surf': '🏄', 'Sci': '⛷️',
  'Rugby': '🏉', 'Danza': '💃', 'Ginnastica': '🤸', 'Atletica Leggera': '🏃', 'Scherma': '🤺',
  'Triathlon': '🏊', 'HIIT': '⚡', 'Kickboxing': '🥊', 'Jiu-Jitsu': '🥋', 'Karate': '🥋',
  'Weightlifting': '🏋️', 'Skateboard': '🛹', 'Snowboard': '🏂', 'Canottaggio': '🚣',
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, logout, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [sportSearch, setSportSearch] = useState('');

  // Form state
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [weight, setWeight] = useState(user?.weight_kg ? String(user.weight_kg) : '');
  const [height, setHeight] = useState(user?.height_cm ? String(user.height_cm) : '');
  const [selectedSport, setSelectedSport] = useState(user?.preferred_sport || user?.sport || 'Fitness');
  const [profilePic, setProfilePic] = useState(user?.profile_picture || null);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setUsername(user.username || '');
      setWeight(user.weight_kg ? String(user.weight_kg) : '');
      setHeight(user.height_cm ? String(user.height_cm) : '');
      setSelectedSport(user.preferred_sport || user.sport || 'Fitness');
      setProfilePic(user.profile_picture || null);
    }
  }, [user]);

  // ── Profile Picture Upload ──
  const handlePickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permesso negato', 'Serve il permesso per accedere alla galleria.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        setUploading(true);
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setProfilePic(base64); // Optimistic update

        const resp = await api.uploadProfilePicture(token, base64);
        if (resp.user && refreshUser) await refreshUser();
        Alert.alert('Fatto!', 'Foto profilo aggiornata con successo.');
      }
    } catch (err) {
      Alert.alert('Errore', 'Impossibile caricare la foto.');
    }
    setUploading(false);
  }, [token, refreshUser]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permesso negato', 'Serve il permesso per usare la fotocamera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        setUploading(true);
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setProfilePic(base64);

        const resp = await api.uploadProfilePicture(token, base64);
        if (resp.user && refreshUser) await refreshUser();
        Alert.alert('Fatto!', 'Foto profilo aggiornata con successo.');
      }
    } catch (err) {
      Alert.alert('Errore', 'Impossibile scattare la foto.');
    }
    setUploading(false);
  }, [token, refreshUser]);

  // ── Save Profile ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload: any = {};
      if (firstName.trim()) payload.first_name = firstName.trim();
      if (lastName.trim()) payload.last_name = lastName.trim();
      if (username.trim() && username.trim() !== user?.username) payload.username = username.trim();
      if (weight) payload.weight = parseFloat(weight);
      if (height) payload.height = parseFloat(height);
      if (selectedSport) payload.preferred_sport = selectedSport;

      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/api/auth/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Errore');
      if (refreshUser) await refreshUser();
      Alert.alert('Salvato!', 'Profilo aggiornato con successo.');
    } catch (err: any) {
      Alert.alert('Errore', err.message || 'Impossibile salvare.');
    }
    setSaving(false);
  }, [firstName, lastName, username, weight, height, selectedSport, token, refreshUser]);

  // ── Sport Picker Modal ──
  const filteredSports = SPORTS_LIST.filter(s =>
    s.toLowerCase().includes(sportSearch.toLowerCase())
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#0A0A0A', '#050505']} style={StyleSheet.absoluteFillObject} />

      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.topTitle}>SETTINGS</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}>

          {/* ═══ PROFILE PICTURE ═══ */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.section}>
            <Text style={s.sectionTitle}>FOTO PROFILO</Text>
            <View style={s.avatarSection}>
              <TouchableOpacity onPress={handlePickImage} activeOpacity={0.85} style={s.avatarContainer}>
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={s.avatar} />
                ) : (
                  <View style={[s.avatarPlaceholder, { backgroundColor: user?.avatar_color || '#00E5FF' }]}>
                    <Text style={s.avatarLetter}>
                      {(user?.first_name || user?.username || 'K').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {uploading && (
                  <View style={s.avatarOverlay}>
                    <ActivityIndicator color="#FFF" size="small" />
                  </View>
                )}
                <View style={s.avatarBadge}>
                  <Ionicons name="camera" size={14} color="#000" />
                </View>
              </TouchableOpacity>
              <View style={s.avatarActions}>
                <TouchableOpacity style={s.avatarBtn} onPress={handlePickImage} activeOpacity={0.7}>
                  <Ionicons name="images" size={16} color="#00E5FF" />
                  <Text style={s.avatarBtnText}>GALLERIA</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.avatarBtn} onPress={handleTakePhoto} activeOpacity={0.7}>
                  <Ionicons name="camera" size={16} color="#00E5FF" />
                  <Text style={s.avatarBtnText}>SCATTA</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* ═══ PREFERRED SPORT ═══ */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={s.section}>
            <Text style={s.sectionTitle}>SPORT PRIMARIO</Text>
            <TouchableOpacity style={s.sportPicker} onPress={() => setShowSportPicker(true)} activeOpacity={0.8}>
              <Text style={s.sportIcon}>{SPORT_ICONS[selectedSport] || '🏅'}</Text>
              <Text style={s.sportName}>{selectedSport}</Text>
              <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.35)" />
            </TouchableOpacity>
            <Text style={s.sportHint}>Questo definisce la tua identità visiva e il tuo Silo dominante.</Text>
          </Animated.View>

          {/* ═══ PERSONAL INFO ═══ */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={s.section}>
            <Text style={s.sectionTitle}>INFORMAZIONI PERSONALI</Text>
            <View style={s.inputRow}>
              <View style={s.inputHalf}>
                <Text style={s.inputLabel}>NOME</Text>
                <TextInput style={s.input} value={firstName} onChangeText={setFirstName} placeholder="Nome" placeholderTextColor="rgba(255,255,255,0.15)" />
              </View>
              <View style={s.inputHalf}>
                <Text style={s.inputLabel}>COGNOME</Text>
                <TextInput style={s.input} value={lastName} onChangeText={setLastName} placeholder="Cognome" placeholderTextColor="rgba(255,255,255,0.15)" />
              </View>
            </View>
            <Text style={s.inputLabel}>USERNAME</Text>
            <TextInput style={s.input} value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor="rgba(255,255,255,0.15)" autoCapitalize="none" />
          </Animated.View>

          {/* ═══ BIO DATA ═══ */}
          <Animated.View entering={FadeInDown.delay(250).duration(400)} style={s.section}>
            <Text style={s.sectionTitle}>DATI BIO-CINETICI</Text>
            <View style={s.inputRow}>
              <View style={s.inputHalf}>
                <Text style={s.inputLabel}>PESO (KG)</Text>
                <TextInput style={s.input} value={weight} onChangeText={setWeight} placeholder="75" placeholderTextColor="rgba(255,255,255,0.15)" keyboardType="numeric" />
              </View>
              <View style={s.inputHalf}>
                <Text style={s.inputLabel}>ALTEZZA (CM)</Text>
                <TextInput style={s.input} value={height} onChangeText={setHeight} placeholder="180" placeholderTextColor="rgba(255,255,255,0.15)" keyboardType="numeric" />
              </View>
            </View>
          </Animated.View>

          {/* ═══ SAVE BUTTON ═══ */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#000" />
                  <Text style={s.saveBtnText}>SALVA PROFILO</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* ═══ LOGOUT ═══ */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)} style={{ marginTop: 16 }}>
            <TouchableOpacity style={s.logoutBtn} onPress={() => { logout(); router.replace('/login'); }} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={16} color="#FF3B30" />
              <Text style={s.logoutText}>LOGOUT</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ═══ SPORT PICKER MODAL ═══ */}
      <Modal visible={showSportPicker} animationType="slide" transparent statusBarTranslucent>
        <View style={sp.overlay}>
          <View style={[sp.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={sp.handle} />
            <View style={sp.header}>
              <Text style={sp.title}>SELEZIONA SPORT</Text>
              <TouchableOpacity onPress={() => setShowSportPicker(false)}>
                <Ionicons name="close" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={sp.searchBox}>
              <Ionicons name="search" size={16} color="rgba(255,255,255,0.30)" />
              <TextInput
                style={sp.searchInput}
                value={sportSearch}
                onChangeText={setSportSearch}
                placeholder="Cerca disciplina..."
                placeholderTextColor="rgba(255,255,255,0.20)"
              />
            </View>
            <FlatList
              data={filteredSports}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const isSelected = item === selectedSport;
                return (
                  <TouchableOpacity
                    style={[sp.item, isSelected && sp.itemActive]}
                    onPress={() => { setSelectedSport(item); setShowSportPicker(false); setSportSearch(''); }}
                    activeOpacity={0.7}
                  >
                    <Text style={sp.itemIcon}>{SPORT_ICONS[item] || '🏅'}</Text>
                    <Text style={[sp.itemText, isSelected && sp.itemTextActive]}>{item}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#00E5FF" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═══ STYLES ═══
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  topTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 3, fontFamily: FONT_J },
  section: { marginBottom: 24 },
  sectionTitle: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '900', letterSpacing: 3,
    marginBottom: 12, fontFamily: FONT_J,
  },

  // Avatar
  avatarSection: { alignItems: 'center', gap: 16 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: 'rgba(0,229,255,0.30)' },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
  },
  avatarLetter: { color: '#000', fontSize: 36, fontWeight: '900', fontFamily: FONT_J },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject, borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#00E5FF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0A0A0A',
  },
  avatarActions: { flexDirection: 'row', gap: 10 },
  avatarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.2, borderColor: 'rgba(0,229,255,0.20)',
    backgroundColor: 'rgba(0,229,255,0.04)',
  },
  avatarBtnText: { color: '#00E5FF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_J },

  // Sport picker
  sportPicker: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14,
    borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  sportIcon: { fontSize: 22 },
  sportName: { color: '#FFF', fontSize: 16, fontWeight: '800', flex: 1, fontFamily: FONT_J },
  sportHint: { color: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: '500', marginTop: 6, fontFamily: FONT_M },

  // Inputs
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  inputHalf: { flex: 1 },
  inputLabel: {
    color: 'rgba(255,255,255,0.30)', fontSize: 10, fontWeight: '900', letterSpacing: 2,
    marginBottom: 6, fontFamily: FONT_J,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12,
    borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
    color: '#FFF', fontSize: 14, fontWeight: '600', fontFamily: FONT_M,
  },

  // Save button
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#00E5FF', borderRadius: 14, paddingVertical: 16,
  },
  saveBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 14,
    borderWidth: 1.2, borderColor: 'rgba(255,59,48,0.25)',
    backgroundColor: 'rgba(255,59,48,0.04)',
  },
  logoutText: { color: '#FF3B30', fontSize: 13, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
});

// ── Sport Picker Modal ──
const sp = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: '#121212', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '75%', paddingHorizontal: 16,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginTop: 10, marginBottom: 14,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  title: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_J },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12, marginBottom: 10,
  },
  searchInput: {
    flex: 1, paddingVertical: 10,
    color: '#FFF', fontSize: 14, fontWeight: '600', fontFamily: FONT_M,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10,
  },
  itemActive: { backgroundColor: 'rgba(0,229,255,0.08)' },
  itemIcon: { fontSize: 20, width: 30, textAlign: 'center' },
  itemText: { color: 'rgba(255,255,255,0.65)', fontSize: 15, fontWeight: '700', flex: 1, fontFamily: FONT_M },
  itemTextActive: { color: '#00E5FF', fontWeight: '900' },
});
