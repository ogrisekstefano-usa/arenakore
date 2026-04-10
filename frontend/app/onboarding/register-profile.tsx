/**
 * ARENAKORE — UNIFIED REGISTRATION PROFILE
 * Form unificato per entrambi i flussi (Manual + Biometric).
 * Raccoglie: Username, Email, Password, Sesso, Altezza, Età, Sport, Livello.
 * Real-time username availability check.
 * Route params:
 *   - height_cm (from bio scan)
 *   - is_nexus_certified ('true'|'false')
 *   - kore_score, stability, amplitude (from bio scan)
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '../../utils/api';
import { SPORTS_LIST, getSportIcon } from '../../utils/sportAssets';

const CYAN = '#00E5FF';
const GOLD = '#FFD700';
const RED  = '#FF3B30';
const BG   = '#0A0A0A';
const FONT_M = Platform.select({ ios: 'Montserrat', android: 'Montserrat', default: 'Montserrat' });

const GENDERS = [
  { key: 'UOMO',  label: 'UOMO',  icon: 'male-outline' as const },
  { key: 'DONNA', label: 'DONNA', icon: 'female-outline' as const },
  { key: 'ALTRO', label: 'ALTRO', icon: 'transgender-outline' as const },
];

const LEVELS = [
  { key: 'ROOKIE',   label: 'ROOKIE' },
  { key: 'AMATEUR',  label: 'AMATEUR' },
  { key: 'SEMI_PRO', label: 'SEMI-PRO' },
  { key: 'PRO',      label: 'PRO' },
  { key: 'ELITE',    label: 'ELITE' },
];

// Top 12 popular sports for quick selection
const TOP_SPORTS = [
  'Atletica Leggera', 'Calcio', 'Basket', 'CrossFit',
  'Running', 'Tennis', 'Nuoto', 'Boxing',
  'Padel', 'Ciclismo', 'Yoga', 'MMA',
];

export default function RegisterProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    height_cm?: string;
    is_nexus_certified?: string;
    kore_score?: string;
    stability?: string;
    amplitude?: string;
  }>();

  const isNexus = params.is_nexus_certified === 'true';
  const bioHeight = params.height_cm ? parseFloat(params.height_cm) : null;

  // ── CHECK IF USER ALREADY HAS AN ACCOUNT (came via register.tsx → choice)
  const [existingToken, setExistingToken] = useState<string | null>(null);
  const [existingUser, setExistingUser] = useState<any>(null);
  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const tk = await AsyncStorage.getItem('@auth_token');
        const ud = await AsyncStorage.getItem('@user_data');
        if (tk && ud) {
          const u = JSON.parse(ud);
          setExistingToken(tk);
          setExistingUser(u);
          // Pre-fill from existing account
          if (u.username) setUsername(u.username);
          if (u.email) setEmail(u.email);
          if (u.gender) setGender(u.gender);
          if (u.height_cm) setHeight(String(Math.round(u.height_cm)));
          if (u.age) setAge(String(u.age));
          if (u.preferred_sport || u.sport) setSport(u.preferred_sport || u.sport);
          if (u.training_level) setLevel(u.training_level);
        }
      } catch {}
    })();
  }, []);

  const isExistingUser = !!existingToken;

  // ── FORM STATE ──
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [gender, setGender]     = useState('');
  const [height, setHeight]     = useState(bioHeight ? String(Math.round(bioHeight)) : '');
  const [age, setAge]           = useState('');
  const [sport, setSport]       = useState('');
  const [level, setLevel]       = useState('AMATEUR');
  const [showAllSports, setShowAllSports] = useState(false);

  // ── VALIDATION STATE ──
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── REAL-TIME USERNAME CHECK ──
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.checkUsername(username.trim());
        setUsernameStatus(res.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username]);

  // ── FORM VALIDATION ──
  const isFormValid = useCallback(() => {
    if (isExistingUser) {
      // Existing user: only needs profile data
      return (
        gender !== '' &&
        height !== '' && parseFloat(height) >= 100 && parseFloat(height) <= 250 &&
        age !== '' && parseInt(age) >= 12 && parseInt(age) <= 100 &&
        sport !== '' &&
        level !== ''
      );
    }
    // New user: needs everything
    return (
      username.length >= 3 &&
      usernameStatus === 'available' &&
      email.includes('@') && email.includes('.') &&
      password.length >= 8 &&
      gender !== '' &&
      height !== '' && parseFloat(height) >= 100 && parseFloat(height) <= 250 &&
      age !== '' && parseInt(age) >= 12 && parseInt(age) <= 100 &&
      sport !== '' &&
      level !== ''
    );
  }, [username, usernameStatus, email, password, gender, height, age, sport, level, isExistingUser]);

  // ── REGISTER or UPDATE ──
  const handleRegister = useCallback(async () => {
    if (!isFormValid()) {
      setError('COMPILA TUTTI I CAMPI CORRETTAMENTE');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;

      if (isExistingUser && existingToken) {
        // ── EXISTING USER: Update profile via PATCH
        const BASE = 'https://arenakore-api.onrender.com' || '';
        const resp = await fetch(`${BASE}/api/user/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${existingToken}` },
          body: JSON.stringify({
            height_cm: parseFloat(height),
            age: parseInt(age),
            gender,
            preferred_sport: sport,
            training_level: level,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || 'ERRORE AGGIORNAMENTO PROFILO');

        // Update stored user data
        const updatedUser = { ...existingUser, height_cm: parseFloat(height), age: parseInt(age), gender, preferred_sport: sport, sport, training_level: level };
        await AsyncStorage.setItem('@user_data', JSON.stringify(updatedUser));

        router.replace({
          pathname: '/onboarding/passport',
          params: {
            is_nexus_certified: isNexus ? 'true' : 'false',
            kore_score: params.kore_score || '50',
            stability: params.stability || '50',
            amplitude: params.amplitude || '50',
            username: existingUser.username,
            sport,
          }
        });
      } else {
        // ── NEW USER: Create account
        const res = await api.register({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
          height_cm: parseFloat(height),
          age: parseInt(age),
          gender,
          preferred_sport: sport,
          training_level: level,
        });

        if (res.token) {
          await AsyncStorage.setItem('@auth_token', res.token);
          await AsyncStorage.setItem('@user_data', JSON.stringify(res.user));

          router.replace({
            pathname: '/onboarding/passport',
            params: {
              is_nexus_certified: isNexus ? 'true' : 'false',
              kore_score: params.kore_score || '50',
              stability: params.stability || '50',
              amplitude: params.amplitude || '50',
              username: username.trim(),
              sport,
            }
          });
        }
      }
    } catch (e: any) {
      setError(e.message || 'ERRORE DI REGISTRAZIONE');
    } finally {
      setLoading(false);
    }
  }, [isFormValid, isExistingUser, existingToken, existingUser, username, email, password, height, age, gender, sport, level, isNexus, params, router]);

  const sportsToShow = showAllSports ? SPORTS_LIST : TOP_SPORTS;

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── TOP BAR ── */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={18} color={CYAN} />
          </TouchableOpacity>
          <View style={s.brandRow}>
            <Text style={s.brandW}>ARENA</Text>
            <Text style={s.brandC}>KORE</Text>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.replace('/')} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={RED} />
          </TouchableOpacity>
        </View>

        {/* ── HEADER ── */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.header}>
          <Text style={s.title}>CREA IL TUO</Text>
          <Text style={s.titleBig}>KORE ID</Text>
          <View style={s.accentLine} />
          {isNexus && (
            <View style={s.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#000" />
              <Text style={s.verifiedTxt}>NÈXUS VERIFIED</Text>
            </View>
          )}
        </Animated.View>

        {/* ══════════════ IDENTITY (solo per nuovi utenti) ══════════════ */}
        {!isExistingUser && (
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={s.sectionLabel}>IDENTITY</Text>

          {/* Username */}
          <View style={s.field}>
            <Text style={s.label}>USERNAME</Text>
            <View style={s.inputRow}>
              <TextInput
                style={[s.input, s.inputFlex,
                  usernameStatus === 'taken' && s.inputError,
                  usernameStatus === 'available' && s.inputValid
                ]}
                value={username} onChangeText={(t) => setUsername(t.toUpperCase())}
                placeholder="IL TUO TAG UNIVOCO" placeholderTextColor="rgba(255,255,255,0.12)"
                autoCapitalize="characters" autoCorrect={false} maxLength={20} selectionColor={CYAN}
              />
              <View style={s.usernameStatus}>
                {usernameStatus === 'checking' && <ActivityIndicator size="small" color={CYAN} />}
                {usernameStatus === 'available' && <Ionicons name="checkmark-circle" size={20} color="#34C759" />}
                {usernameStatus === 'taken' && <Ionicons name="close-circle" size={20} color={RED} />}
              </View>
            </View>
            {usernameStatus === 'taken' && (
              <Text style={s.fieldError}>USERNAME GIÀ IN USO</Text>
            )}
          </View>

          {/* Email */}
          <View style={s.field}>
            <Text style={s.label}>EMAIL</Text>
            <TextInput
              style={s.input} value={email} onChangeText={setEmail}
              placeholder="email@example.com" placeholderTextColor="rgba(255,255,255,0.12)"
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              selectionColor={CYAN}
            />
          </View>

          {/* Password */}
          <View style={s.field}>
            <Text style={s.label}>PASSWORD</Text>
            <View style={s.inputRow}>
              <TextInput
                style={[s.input, s.inputFlex]}
                value={password} onChangeText={setPassword}
                placeholder="MIN. 8 CARATTERI" placeholderTextColor="rgba(255,255,255,0.12)"
                secureTextEntry={!showPwd} autoCapitalize="none" autoCorrect={false}
                selectionColor={CYAN}
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd(!showPwd)}>
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            {password.length > 0 && password.length < 8 && (
              <Text style={s.fieldHint}>MINIMO 8 CARATTERI</Text>
            )}
          </View>
        </Animated.View>
        )}

        {/* ══════════════ PROFILE DATA ══════════════ */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)}>
          <Text style={[s.sectionLabel, { marginTop: 24 }]}>PROFILO FISICO</Text>

          {/* Gender */}
          <View style={s.field}>
            <Text style={s.label}>SESSO</Text>
            <View style={s.genderRow}>
              {GENDERS.map((g) => {
                const active = gender === g.key;
                return (
                  <TouchableOpacity
                    key={g.key}
                    style={[s.genderBtn, active && s.genderBtnActive]}
                    onPress={() => setGender(g.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={g.icon} size={18} color={active ? CYAN : 'rgba(255,255,255,0.3)'} />
                    <Text style={[s.genderLabel, active && s.genderLabelActive]}>{g.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Height + Age Row */}
          <View style={s.dualRow}>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>ALTEZZA (CM)</Text>
              <TextInput
                style={[s.input, bioHeight ? s.inputPrefilled : undefined]}
                value={height} onChangeText={setHeight}
                placeholder="180" placeholderTextColor="rgba(255,255,255,0.12)"
                keyboardType="decimal-pad" maxLength={5} selectionColor={CYAN}
                editable={!bioHeight}
              />
              {bioHeight ? (
                <Text style={s.fieldHintOk}>RILEVATA DA NÈXUS</Text>
              ) : null}
            </View>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>ETÀ</Text>
              <TextInput
                style={s.input} value={age} onChangeText={setAge}
                placeholder="25" placeholderTextColor="rgba(255,255,255,0.12)"
                keyboardType="number-pad" maxLength={3} selectionColor={CYAN}
              />
            </View>
          </View>
        </Animated.View>

        {/* ══════════════ SPORT & LEVEL ══════════════ */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)}>
          <Text style={[s.sectionLabel, { marginTop: 24 }]}>DISCIPLINA & LIVELLO</Text>

          {/* Sport Grid */}
          <View style={s.field}>
            <Text style={s.label}>SPORT PREFERITO</Text>
            <View style={s.sportGrid}>
              {sportsToShow.map((sp) => {
                const active = sport === sp;
                const icon = getSportIcon(sp);
                return (
                  <TouchableOpacity
                    key={sp}
                    style={[s.sportBtn, active && s.sportBtnActive]}
                    onPress={() => setSport(sp)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 16 }}>{icon}</Text>
                    <Text style={[s.sportLabel, active && s.sportLabelActive]}
                      numberOfLines={1}>{sp.toUpperCase()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {!showAllSports && (
              <TouchableOpacity style={s.showMoreBtn} onPress={() => setShowAllSports(true)}>
                <Text style={s.showMoreTxt}>MOSTRA TUTTI GLI SPORT ({SPORTS_LIST.length})</Text>
                <Ionicons name="chevron-down" size={14} color={CYAN} />
              </TouchableOpacity>
            )}
          </View>

          {/* Level */}
          <View style={s.field}>
            <Text style={s.label}>LIVELLO COMPETENZA</Text>
            <View style={s.levelRow}>
              {LEVELS.map((l) => {
                const active = level === l.key;
                return (
                  <TouchableOpacity
                    key={l.key}
                    style={[s.levelBtn, active && s.levelBtnActive]}
                    onPress={() => setLevel(l.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.levelLabel, active && s.levelLabelActive]}>{l.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* ══════════════ ERROR + CTA ══════════════ */}
        <Animated.View entering={FadeInDown.delay(600).duration(400)} style={{ marginTop: 24 }}>
          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={14} color={RED} />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.cta, !isFormValid() && s.ctaDisabled]}
            onPress={handleRegister}
            activeOpacity={0.85}
            disabled={loading || !isFormValid()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Ionicons name="shield-checkmark-outline" size={18} color="#000" />
                <Text style={s.ctaTxt}>REGISTRA KORE ID</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={s.privacy}>
            REGISTRANDOTI ACCETTI I TERMINI E LA PRIVACY POLICY
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ══════════════ STYLES ══════════════
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 20 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,229,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandW: { fontSize: 12, fontWeight: '900', color: '#FFF', letterSpacing: 3, fontFamily: FONT_M },
  brandC: { fontSize: 12, fontWeight: '900', color: CYAN, letterSpacing: 3, fontFamily: FONT_M },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,59,48,0.08)', borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  header: { marginBottom: 20, gap: 2 },
  title:  { color: CYAN, fontSize: 12, fontWeight: '600', letterSpacing: 5, fontFamily: FONT_M },
  titleBig: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: 1, fontFamily: FONT_M },
  accentLine: { height: 2, width: 40, backgroundColor: CYAN, marginTop: 6, marginBottom: 6 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: CYAN, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  verifiedTxt: { fontSize: 9, fontWeight: '900', color: '#000', letterSpacing: 1.5, fontFamily: FONT_M },

  sectionLabel: {
    fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.2)',
    letterSpacing: 4, marginBottom: 12, fontFamily: FONT_M,
  },

  field: { marginBottom: 14 },
  label: {
    color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900',
    letterSpacing: 3, marginBottom: 6, fontFamily: FONT_M,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, padding: 14,
    color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5, fontFamily: FONT_M,
  },
  inputFlex: { flex: 1 },
  inputError: { borderColor: 'rgba(255,59,48,0.5)' },
  inputValid: { borderColor: 'rgba(52,199,89,0.4)' },
  inputPrefilled: { borderColor: 'rgba(0,229,255,0.3)', backgroundColor: 'rgba(0,229,255,0.05)' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usernameStatus: { width: 28, alignItems: 'center' },
  eyeBtn: { padding: 8 },
  fieldError: { color: RED, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 4, fontFamily: FONT_M },
  fieldHint: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '600', letterSpacing: 1, marginTop: 4, fontFamily: FONT_M },
  fieldHintOk: { color: 'rgba(0,229,255,0.5)', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 4, fontFamily: FONT_M },

  dualRow: { flexDirection: 'row', gap: 12 },

  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, paddingVertical: 12,
  },
  genderBtnActive: { backgroundColor: 'rgba(0,229,255,0.08)', borderColor: CYAN },
  genderLabel: { fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, fontFamily: FONT_M },
  genderLabelActive: { color: CYAN },

  sportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sportBtn: {
    flexBasis: '30%', flexGrow: 1,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 8,
  },
  sportBtnActive: { backgroundColor: 'rgba(0,229,255,0.08)', borderColor: CYAN },
  sportLabel: { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5, fontFamily: FONT_M, flex: 1 },
  sportLabelActive: { color: CYAN },
  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, marginTop: 8,
  },
  showMoreTxt: { fontSize: 10, fontWeight: '700', color: CYAN, letterSpacing: 1, fontFamily: FONT_M },

  levelRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  levelBtn: {
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8, paddingVertical: 10, alignItems: 'center',
  },
  levelBtnActive: { backgroundColor: 'rgba(0,229,255,0.08)', borderColor: CYAN },
  levelLabel: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontFamily: FONT_M },
  levelLabelActive: { color: CYAN },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,59,48,0.06)', borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)', marginBottom: 12,
  },
  errorTxt: { color: RED, fontSize: 11, fontWeight: '800', letterSpacing: 1, fontFamily: FONT_M, flex: 1 },

  cta: {
    backgroundColor: CYAN, borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  ctaDisabled: { opacity: 0.35 },
  ctaTxt: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 2, fontFamily: FONT_M },

  privacy: {
    color: 'rgba(255,255,255,0.15)', fontSize: 9, fontWeight: '500',
    textAlign: 'center', letterSpacing: 1, marginTop: 16, fontFamily: FONT_M,
  },
});
