/**
 * ARENAKORE — LOGIN v3.0 (THE CHALLENGE)
 * Premium brutalist login with Social Login, "TORNA NELL'ARENA" CTA, and "CREA IL TUO DESTINO" link.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StatusBar,
  Dimensions, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { wakeServer } from '../utils/api';
import Animated, { FadeInDown } from 'react-native-reanimated';

let SW = 390; try { SW = Dimensions.get('window').width; } catch(e) {}
const PENDING_EVENT_KEY = '@arenakore_pending_event';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // ══ BUILD 15: Manual navigation gate — user taps to enter ══
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loggedUser, setLoggedUser] = useState<any>(null);

  // Pre-wake Render server on screen mount (fire-and-forget)
  useEffect(() => { wakeServer(); }, []);

  // Validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  const emailBorder = email.length === 0 ? '#1A1A1A' : emailValid ? '#00E5FF' : '#FF3B30';
  const pwdBorder = password.length === 0 ? '#1A1A1A' : passwordValid ? '#00E5FF' : '#FF3B30';

  const handleLogin = async () => {
    if (!email || !password) { setError('Inserisci email e password'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await login(email, password);
      const pendingCode = await AsyncStorage.getItem(PENDING_EVENT_KEY);
      if (pendingCode) {
        router.replace(`/join/${pendingCode}`);
      } else {
        // BUILD 15: Do NOT auto-redirect. Show manual gate.
        setLoggedUser(result);
        setLoginSuccess(true);
      }
    } catch (e: any) {
      setError(e.message || 'Credenziali non valide');
    } finally {
      setLoading(false);
    }
  };

  // ══ BUILD 15: Manual "ENTRA NEL NEXUS" gate ══
  const handleEnterNexus = () => {
    if (loggedUser && !loggedUser.onboarding_completed) {
      router.replace('/onboarding/choice');
    } else {
      router.replace('/(tabs)/nexus-trigger');
    }
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert(
      `${provider} Login`,
      `Il login con ${provider} sarà disponibile nella prossima versione.`,
      [{ text: 'OK' }]
    );
  };

  // ══════════════════════════════════════════════════
  // BUILD 15: LOGIN SUCCESS — Manual "ENTRA NEL NEXUS" gate
  // SpringBoard Sandbox disarm: NO auto-redirect, user presses button
  // ══════════════════════════════════════════════════
  if (loginSuccess && loggedUser) {
    return (
      <View style={s$.container}>
        <StatusBar barStyle="light-content" />
        <View style={s$.gateWrap}>
          {/* Decorative corners */}
          <View style={{ position: 'absolute', top: 40, left: 24, width: 20, height: 20, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(255,215,0,0.3)' }} />
          <View style={{ position: 'absolute', top: 40, right: 24, width: 20, height: 20, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(255,215,0,0.3)' }} />

          {/* Status chip */}
          <Animated.View entering={FadeInDown.delay(100)} style={s$.gateChip}>
            <View style={s$.gateDot} />
            <Text style={s$.gateChipText}>AUTENTICAZIONE COMPLETATA</Text>
          </Animated.View>

          {/* Username */}
          <Animated.View entering={FadeInDown.delay(250)}>
            <Text style={s$.gateUsername}>{(loggedUser.username || 'KORE').toUpperCase()}</Text>
          </Animated.View>

          {/* Role badge */}
          <Animated.View entering={FadeInDown.delay(350)} style={s$.gateRoleBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#00E5FF" />
            <Text style={s$.gateRoleText}>{loggedUser.role || 'ATHLETE'}</Text>
          </Animated.View>

          {/* MAIN CTA — ENTRA NEL NEXUS */}
          <Animated.View entering={FadeInDown.delay(500)} style={{ width: '100%', paddingHorizontal: 32 }}>
            <TouchableOpacity
              testID="enter-nexus-btn"
              style={s$.gateBtn}
              onPress={handleEnterNexus}
              activeOpacity={0.85}
            >
              <Ionicons name="flash" size={22} color="#050505" />
              <Text style={s$.gateBtnText}>ENTRA NEL NEXUS</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Version */}
          <Animated.View entering={FadeInDown.delay(600)}>
            <Text style={s$.gateVersion}>v2.0.3 — Build 17 · NEXUS</Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s$.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[s$.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <TouchableOpacity testID="login-back-btn" onPress={() => router.back()} style={s$.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color="#00E5FF" />
            <Text style={s$.backText}>INDIETRO</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Title Block */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={s$.titleBlock}>
          <View style={s$.brandRow}>
            <Text style={s$.brandA}>ARENA</Text>
            <Text style={s$.brandK}>KORE</Text>
          </View>
          <Text style={s$.title}>BENTORNATO,{'\n'}KORE.</Text>
          <Text style={s$.subtitle}>La tua arena ti aspetta.</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.delay(160).duration(400)} style={s$.form}>
          {/* Email */}
          <View style={s$.fieldGroup}>
            <Text style={s$.label}>EMAIL</Text>
            <View style={[s$.inputWrap, { borderColor: emailBorder }]}>
              <Ionicons name="mail-outline" size={16} color="rgba(255,255,255,0.2)" style={s$.inputIcon} />
              <TextInput
                testID="login-email-input"
                style={s$.input}
                value={email}
                onChangeText={setEmail}
                placeholder="la-tua@email.com"
                placeholderTextColor="rgba(255,255,255,0.15)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                spellCheck={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={s$.fieldGroup}>
            <Text style={s$.label}>PASSWORD</Text>
            <View style={[s$.inputWrap, { borderColor: pwdBorder }]}>
              <Ionicons name="lock-closed-outline" size={16} color="rgba(255,255,255,0.2)" style={s$.inputIcon} />
              <TextInput
                testID="login-password-input"
                style={s$.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.15)"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
              />
              <TouchableOpacity testID="login-toggle-pwd" onPress={() => setShowPassword(!showPassword)} style={s$.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="rgba(255,255,255,0.35)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error */}
          {!!error && (
            <Animated.View entering={FadeInDown.duration(200)} style={s$.errorWrap}>
              <Ionicons name="warning" size={14} color="#FF3B30" />
              <Text testID="login-error" style={s$.error}>{error}</Text>
            </Animated.View>
          )}

          {/* MAIN CTA — TORNA NELL'ARENA */}
          <TouchableOpacity
            testID="login-submit-btn"
            onPress={handleLogin}
            style={[s$.mainBtn, loading && { opacity: 0.7 }]}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Ionicons name="flash" size={18} color="#000" />
                <Text style={s$.mainBtnText}>RIENTRA NELL'ARENA</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Recover Link */}
          <TouchableOpacity
            testID="login-recover-link"
            onPress={() => router.push('/recover')}
            style={s$.recoverRow}
            activeOpacity={0.7}
          >
            <Text style={s$.recoverText}>PASSWORD DIMENTICATA?</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Divider */}
        <Animated.View entering={FadeInDown.delay(240).duration(400)} style={s$.dividerRow}>
          <View style={s$.dividerLine} />
          <Text style={s$.dividerText}>OPPURE</Text>
          <View style={s$.dividerLine} />
        </Animated.View>

        {/* Social Login Buttons */}
        <Animated.View entering={FadeInDown.delay(320).duration(400)} style={s$.socialRow}>
          <TouchableOpacity
            style={s$.socialBtn}
            onPress={() => handleSocialLogin('Apple')}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-apple" size={20} color="#FFF" />
            <Text style={s$.socialBtnText}>APPLE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s$.socialBtn}
            onPress={() => handleSocialLogin('Google')}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-google" size={18} color="#FFF" />
            <Text style={s$.socialBtnText}>GOOGLE</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Register Link */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={s$.registerBlock}>
          <TouchableOpacity testID="login-register-link" onPress={() => router.replace('/register')} activeOpacity={0.7}>
            <Text style={s$.registerLink}>
              Non hai un account?{' '}
              <Text style={s$.registerLinkBold}>COMINCIA LA SFIDA</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Version Label */}
        <View style={{ alignItems: 'center', marginTop: 16, paddingBottom: 12 }}>
          <Text style={{ color: '#00E5FF', fontSize: 10, fontWeight: '700', letterSpacing: 1, opacity: 0.7 }}>
            v2.0.3 — Build 17 · NEXUS
          </Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s$ = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { paddingHorizontal: 24, flexGrow: 1 },

  // Back
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 24 },
  backText: { color: '#00E5FF', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },

  // Title
  titleBlock: { marginBottom: 32, gap: 6 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  brandA: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 5 },
  brandK: { color: '#00E5FF', fontSize: 12, fontWeight: '900', letterSpacing: 5 },
  title: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', letterSpacing: -0.5, lineHeight: 38 },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: '500', marginTop: 4 },

  // Form
  form: { gap: 16 },
  fieldGroup: { gap: 6 },
  label: { color: '#00E5FF', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0C0C0C', borderWidth: 1.5, borderColor: '#1A1A1A',
    borderRadius: 12, overflow: 'hidden'
  },
  inputIcon: { paddingLeft: 14 },
  input: { flex: 1, paddingVertical: 16, paddingHorizontal: 10, color: '#FFFFFF', fontSize: 16 },
  eyeBtn: { paddingHorizontal: 16, paddingVertical: 14 },

  // Error
  errorWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  error: { color: '#FF3B30', fontSize: 14, fontWeight: '600' },

  // Main CTA
  mainBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#00E5FF', borderRadius: 14,
    paddingVertical: 18, marginTop: 4
  },
  mainBtnText: { color: '#000000', fontSize: 17, fontWeight: '900', letterSpacing: 1.5 },

  // Recover
  recoverRow: { alignItems: 'center', paddingVertical: 10 },
  recoverText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '800', letterSpacing: 2 },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  dividerText: { color: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: '800', letterSpacing: 3 },

  // Social
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#0C0C0C', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, paddingVertical: 16
  },
  socialBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 1 },

  // Register
  registerBlock: { marginTop: 28, alignItems: 'center' },
  registerLink: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  registerLinkBold: { color: '#00E5FF', fontWeight: '900', letterSpacing: 0.5 },

  // ══ BUILD 15: NEXUS GATE (post-login success screen) ══
  gateWrap: {
    flex: 1, backgroundColor: '#000000',
    alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32
  },
  gateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.25)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8
  },
  gateDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#32D74B' },
  gateChipText: { color: '#00E5FF', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  gateUsername: {
    color: '#FFFFFF', fontSize: 36, fontWeight: '900', letterSpacing: -1, textAlign: 'center'
  },
  gateRoleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,229,255,0.06)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6
  },
  gateRoleText: { color: '#00E5FF', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  gateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: '#FFD700',
    borderRadius: 14, paddingVertical: 20, width: '100%'
  },
  gateBtnText: { color: '#050505', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  gateVersion: { color: '#00E5FF', fontSize: 10, fontWeight: '700', letterSpacing: 1, opacity: 0.5, marginTop: 8 }
});
