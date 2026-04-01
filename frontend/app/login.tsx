import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimatedButton } from '../components/AnimatedButton';
import { useAuth } from '../contexts/AuthContext';

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

  const handleLogin = async () => {
    if (!email || !password) { setError('Inserisci email e password'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await login(email, password);

      // Check for pending event enrollment from QR scan
      const pendingCode = await AsyncStorage.getItem(PENDING_EVENT_KEY);
      if (pendingCode) {
        // Redirect to join screen for auto-enrollment
        router.replace(`/join/${pendingCode}`);
      } else if (result.onboarding_completed) {
        router.replace('/(tabs)/kore');
      } else {
        router.replace('/onboarding/step1');
      }
    } catch (e: any) {
      setError(e.message || 'Errore di accesso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity testID="login-back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← INDIETRO</Text>
        </TouchableOpacity>
        <Text style={styles.title}>RESUME</Text>
        <Text style={styles.subtitle}>Accedi al tuo Legacy</Text>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              testID="login-email-input"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="la-tua@email.com"
              placeholderTextColor="#333"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.pwdContainer}>
              <TextInput
                testID="login-password-input"
                style={styles.pwdInput}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#333"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity testID="login-toggle-pwd" onPress={() => setShowPassword(!showPassword)} style={styles.showHide}>
                <Text style={styles.showHideText}>{showPassword ? 'NASCONDI' : 'MOSTRA'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!!error && <Text testID="login-error" style={styles.error}>{error}</Text>}

          <AnimatedButton
            testID="login-submit-btn"
            onPress={handleLogin}
            style={styles.loginButton}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#050505" />
              : <Text style={styles.loginButtonText}>ACCEDI</Text>
            }
          </AnimatedButton>

          {/* RECUPERA ACCESSO — ID Recovery Link */}
          <TouchableOpacity
            testID="login-recover-link"
            onPress={() => router.push('/recover')}
            style={styles.recoverRow}
          >
            <Text style={styles.recoverText}>RECUPERA ACCESSO</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="login-register-link" onPress={() => router.replace('/onboarding/step1')}>
            <Text style={styles.registerLink}>
              Non hai un account? <Text style={styles.registerLinkBold}>START LEGACY</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  backBtn: { marginBottom: 32 },
  backText: { color: '#00F2FF', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  title: { color: '#FFFFFF', fontSize: 44, fontWeight: '900', letterSpacing: 0.5 },
  subtitle: { color: '#555555', fontSize: 14, marginTop: 6, marginBottom: 40 },
  form: { gap: 20 },
  fieldGroup: { gap: 8 },
  label: { color: '#00F2FF', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  input: {
    backgroundColor: '#111111', borderWidth: 1, borderColor: '#222222',
    borderRadius: 8, padding: 16, color: '#FFFFFF', fontSize: 16,
  },
  pwdContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111111', borderWidth: 1, borderColor: '#222222', borderRadius: 8,
  },
  pwdInput: { flex: 1, padding: 16, color: '#FFFFFF', fontSize: 16 },
  showHide: { paddingHorizontal: 14 },
  showHideText: { color: '#00F2FF', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  error: { color: '#FF3B30', fontSize: 13, textAlign: 'center' },
  loginButton: {
    backgroundColor: '#00F2FF', borderRadius: 8,
    paddingVertical: 18, alignItems: 'center', marginTop: 8,
  },
  loginButtonText: { color: '#050505', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  registerLink: { color: '#555555', fontSize: 14, textAlign: 'center', marginTop: 8 },
  registerLinkBold: { color: '#00F2FF', fontWeight: '700' },
  recoverRow: {
    alignItems: 'center', paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#111', marginTop: 4,
  },
  recoverText: {
    color: '#00F2FF', fontSize: 11, fontWeight: '900', letterSpacing: 3,
  },
});
