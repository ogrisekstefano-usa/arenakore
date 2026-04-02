/**
 * ARENAKORE LEGACY INITIATION — STEP 4
 * KORE ID CREATION: NickName, Email, Password → Register → Dashboard
 * bcrypt password hashing via backend
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../utils/api';

export default function LegacyStep4() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const params = useLocalSearchParams<{
    height_cm: string; weight_kg: string; age: string; training_level: string; ghost_mode: string; city: string;
  }>();

  const [nickname, setNickname] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleForge = async () => {
    if (!nickname.trim()) { setError('INSERISCI IL TUO NICKNAME'); return; }
    if (nickname.trim().length < 3) { setError('NICKNAME TROPPO CORTO (MIN 3 CARATTERI)'); return; }
    if (!email.trim()) { setError('INSERISCI LA TUA EMAIL'); return; }
    if (password.length < 8) { setError('PASSWORD TROPPO CORTA (MIN 8 CARATTERI)'); return; }
    if (password !== confirm) { setError('LE PASSWORD NON CORRISPONDONO'); return; }
    setError('');
    setLoading(true);

    try {
      await register(
        nickname.trim().toUpperCase(),
        email.trim().toLowerCase(),
        password,
        {
          height_cm: params.height_cm ? parseFloat(params.height_cm) : undefined,
          weight_kg: params.weight_kg ? parseFloat(params.weight_kg) : undefined,
          age:       params.age ? parseInt(params.age) : undefined,
          training_level: params.training_level || 'LEGACY',
        },
      );
      // ── DNA SYNC + SCAN RESULT SYNC after registration
      try {
        const pendingDnaRaw  = await AsyncStorage.getItem('@kore_pending_dna');
        const pendingScanRaw = await AsyncStorage.getItem('@kore_pending_scan');
        const savedToken     = await AsyncStorage.getItem('@arenakore_token');

        if (savedToken) {
          // Sync pending scan result with GPS city (overwrites CHICAGO fallback)
          const gpsCity = params.city || await AsyncStorage.getItem('@kore_gps_city') || 'CHICAGO';
          if (pendingScanRaw) {
            const scanData = { ...JSON.parse(pendingScanRaw), city: gpsCity };
            await api.saveScanResult(scanData, savedToken);
            await AsyncStorage.removeItem('@kore_pending_scan');
          } else if (pendingDnaRaw) {
            // Fallback: DNA-only sync
            const dna = JSON.parse(pendingDnaRaw);
            await api.saveFiveBeatDna(dna, savedToken);
          }
          if (pendingDnaRaw) await AsyncStorage.removeItem('@kore_pending_dna');
          // Also update profile city with GPS value
          api.updateMyCity(gpsCity, savedToken).catch(() => {});

          // Save permissions + ghost mode preference
          api.updatePermissions(savedToken).catch(() => {});
          if (params.ghost_mode === '1') {
            api.toggleGhostMode(true, savedToken).catch(() => {});
          }
        }
      } catch (_syncErr) {
        // Non-blocking: registration still succeeds
      }
      router.replace('/(tabs)/kore');
    } catch (e: any) {
      setError((e.message || 'ERRORE DI REGISTRAZIONE').toUpperCase());
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle="light-content" />

        {/* Top bar */}
        <View style={s.topBar}>
          <Text style={s.brand}>ARENAKORE</Text>
          <View style={s.stepPill}>
            <Text style={s.stepTxt}>04 / 04</Text>
          </View>
        </View>
        <View style={s.progBar}>
          <View style={[s.progFill, { width: '100%' }]} />
        </View>

        <Animated.View entering={FadeInDown.delay(100)} style={s.titleWrap}>
          <Text style={s.titleSm}>FORGIA IL TUO</Text>
          <Text style={s.titleBig}>KORE ID</Text>
          <View style={s.cyanLine} />
        </Animated.View>

        {/* NICKNAME */}
        <Animated.View entering={FadeInDown.delay(200)} style={s.fieldWrap}>
          <View style={s.fieldHeader}>
            <Text style={s.fieldLabel}>NICKNAME</Text>
            <Text style={s.charCount}>{nickname.length}/15</Text>
          </View>
          <TextInput
            testID="nickname-input"
            style={s.input}
            value={nickname}
            onChangeText={(t) => setNickname(t.toUpperCase().slice(0, 15))}
            placeholder="IL TUO NOME DI BATTAGLIA"
            placeholderTextColor="#1A1A1A"
            autoCapitalize="characters"
            maxLength={15}
          />
        </Animated.View>

        {/* EMAIL */}
        <Animated.View entering={FadeInDown.delay(280)} style={s.fieldWrap}>
          <Text style={s.fieldLabel}>EMAIL</Text>
          <TextInput
            testID="email-input"
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="la-tua@email.com"
            placeholderTextColor="#1A1A1A"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Animated.View>

        {/* PASSWORD */}
        <Animated.View entering={FadeInDown.delay(360)} style={s.fieldWrap}>
          <Text style={s.fieldLabel}>PASSWORD</Text>
          <View style={s.pwdRow}>
            <TextInput
              testID="password-input"
              style={s.pwdInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Minimo 8 caratteri"
              placeholderTextColor="#1A1A1A"
              secureTextEntry={!showPwd}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={s.eye}>
              <Ionicons name={showPwd ? 'eye-off' : 'eye'} size={18} color="#00E5FF" />
            </TouchableOpacity>
          </View>
          {password.length > 0 && (
            <View style={s.strengthBar}>
              <View style={[s.strengthFill, {
                width: `${Math.min(100, (password.length / 12) * 100)}%` as any,
                backgroundColor: password.length >= 8 ? '#00E5FF' : '#FF3B30',
              }]} />
            </View>
          )}
        </Animated.View>

        {/* CONFIRM PASSWORD */}
        <Animated.View entering={FadeInDown.delay(440)} style={s.fieldWrap}>
          <Text style={s.fieldLabel}>CONFERMA PASSWORD</Text>
          <TextInput
            testID="confirm-password-input"
            style={s.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Ripeti la password"
            placeholderTextColor="#1A1A1A"
            secureTextEntry={!showPwd}
            autoCapitalize="none"
          />
          {confirm.length > 0 && password !== confirm && (
            <Text style={s.mismatch}>LE PASSWORD NON CORRISPONDONO</Text>
          )}
        </Animated.View>

        {/* Bcrypt note */}
        <Animated.View entering={FadeInDown.delay(480)} style={s.secNote}>
          <Ionicons name="lock-closed" size={11} color="#00E5FF" />
          <Text style={s.secTxt}>PASSWORD CIFRATA CON BCRYPT — IRREVERSIBILE</Text>
        </Animated.View>

        {!!error && <Text style={s.error}>{error}</Text>}

        <Animated.View entering={FadeInDown.delay(520)}>
          <TouchableOpacity
            testID="step4-forge-btn"
            style={[s.cta, loading && s.ctaLoading]}
            onPress={handleForge}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#050505" />
              : (
                <>
                  <Ionicons name="flash" size={16} color="#050505" />
                  <Text style={s.ctaTxt}>FORGIA IL TUO DESTINO</Text>
                </>
              )
            }
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          onPress={() => router.replace('/login')}
          style={s.loginLink}
        >
          <Text style={s.loginLinkTxt}>HAI GIÀ UN KORE ID?  <Text style={{ color: '#00E5FF', fontWeight: '900' }}>RESUME</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const CYAN = '#00E5FF';
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  content: { paddingHorizontal: 24 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  brand: { color: '#FFD700', fontSize: 11, fontWeight: '900', letterSpacing: 6 },
  stepPill: {
    backgroundColor: 'rgba(0,229,255,0.65)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  stepTxt: { color: CYAN, fontSize: 12, fontWeight: '400', letterSpacing: 2 },
  progBar: { height: 2, backgroundColor: '#111', borderRadius: 2, marginBottom: 28, overflow: 'hidden' },
  progFill: {
    height: '100%', backgroundColor: CYAN, borderRadius: 2,
    shadowColor: CYAN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4,
  },
  titleWrap: { marginBottom: 32 },
  titleSm: { color: '#333', fontSize: 12, fontWeight: '900', letterSpacing: 4 },
  titleBig: { color: '#FFFFFF', fontSize: 52, fontWeight: '900', letterSpacing: 0.5, lineHeight: 54 },
  cyanLine: {
    height: 2, width: 48, backgroundColor: CYAN, marginTop: 14,
    shadowColor: CYAN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
  },
  fieldWrap: { gap: 8, marginBottom: 18 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  charCount: { color: '#222', fontSize: 10, fontWeight: '700' },
  input: {
    backgroundColor: '#00E5FF', borderWidth: 1, borderColor: '#1A1A1A',
    borderRadius: 8, padding: 16, color: '#FFFFFF', fontSize: 16, fontWeight: '800',
  },
  pwdRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#00E5FF', borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 8,
  },
  pwdInput: { flex: 1, padding: 16, color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  eye: { paddingHorizontal: 24 },
  strengthBar: { height: 2, backgroundColor: '#111', borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  mismatch: { color: '#FF3B30', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  secNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,229,255,0.65)', borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 20,
  },
  secTxt: { color: 'rgba(0,229,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  error: {
    color: '#FF3B30', fontSize: 12, fontWeight: '800', letterSpacing: 1,
    textAlign: 'center', marginBottom: 12,
  },
  cta: {
    backgroundColor: CYAN, borderRadius: 8, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  ctaLoading: { opacity: 0.7 },
  ctaTxt: { color: '#000000', fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  loginLink: { alignItems: 'center', paddingVertical: 16 },
  loginLinkTxt: { color: '#333', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
});
