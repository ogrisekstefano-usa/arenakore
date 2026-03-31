import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedButton } from '../components/AnimatedButton';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (text.length >= 3) {
      setUsernameChecking(true);
      setUsernameAvailable(null);
      debounceTimer.current = setTimeout(async () => {
        try {
          const result = await api.checkUsername(text);
          setUsernameAvailable(result.available);
        } catch {
          setUsernameAvailable(null);
        } finally {
          setUsernameChecking(false);
        }
      }, 500);
    } else {
      setUsernameAvailable(null);
      setUsernameChecking(false);
    }
  };

  const emailValid = EMAIL_REGEX.test(email);
  const passwordStrong = password.length >= 8;
  const canSubmit =
    username.length >= 3 && usernameAvailable === true &&
    emailValid && passwordStrong && acceptTerms && !loading;

  const handleRegister = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      await register(username, email, password);
      router.replace('/onboarding/step1');
    } catch (e: any) {
      setError(e.message || 'Errore di registrazione');
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
        <TouchableOpacity testID="register-back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← INDIETRO</Text>
        </TouchableOpacity>
        <Text style={styles.title}>START LEGACY</Text>
        <Text style={styles.subtitle}>Crea il tuo profilo atleta</Text>

        <View style={styles.form}>
          {/* USERNAME */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>USERNAME</Text>
            <View style={styles.inputRow}>
              <TextInput
                testID="register-username-input"
                style={styles.inputFlex}
                value={username}
                onChangeText={handleUsernameChange}
                placeholder="il-tuo-nome"
                placeholderTextColor="#333"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {usernameChecking && <ActivityIndicator color="#00F2FF" style={styles.statusIcon} />}
              {!usernameChecking && usernameAvailable === true && (
                <Text style={[styles.statusIcon, { color: '#34C759', fontSize: 18 }]}>✓</Text>
              )}
              {!usernameChecking && usernameAvailable === false && (
                <Text style={[styles.statusIcon, { color: '#FF3B30', fontSize: 18 }]}>✗</Text>
              )}
            </View>
            {username.length > 0 && username.length < 3 && (
              <Text style={styles.errorMsg}>Minimo 3 caratteri</Text>
            )}
            {usernameAvailable === true && username.length >= 3 && (
              <Text testID="username-available-msg" style={styles.successMsg}>Username disponibile ✓</Text>
            )}
            {usernameAvailable === false && (
              <Text testID="username-taken-msg" style={styles.errorMsg}>Username già in uso</Text>
            )}
          </View>

          {/* EMAIL */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              testID="register-email-input"
              style={[styles.input, email.length > 0 && !emailValid && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              placeholder="la-tua@email.com"
              placeholderTextColor="#333"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {email.length > 0 && !emailValid && (
              <Text testID="email-error-msg" style={styles.errorMsg}>Email non valida</Text>
            )}
          </View>

          {/* PASSWORD */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={[styles.pwdContainer, password.length > 0 && !passwordStrong && styles.inputErrorBorder]}>
              <TextInput
                testID="register-password-input"
                style={styles.pwdInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Minimo 8 caratteri"
                placeholderTextColor="#333"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity testID="register-toggle-pwd" onPress={() => setShowPassword(!showPassword)} style={styles.showHide}>
                <Text style={styles.showHideText}>{showPassword ? 'NASCONDI' : 'MOSTRA'}</Text>
              </TouchableOpacity>
            </View>
            {password.length > 0 && (
              <View style={styles.strengthBar}>
                <View style={[styles.strengthFill, {
                  width: `${Math.min(100, (password.length / 12) * 100)}%` as any,
                  backgroundColor: passwordStrong ? '#34C759' : '#FF3B30',
                }]} />
              </View>
            )}
            {password.length > 0 && !passwordStrong && (
              <Text testID="password-weak-msg" style={styles.errorMsg}>Password troppo corta (min. 8)</Text>
            )}
          </View>

          {/* T&C */}
          <TouchableOpacity testID="register-terms-checkbox" onPress={() => setAcceptTerms(!acceptTerms)} style={styles.termsRow}>
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              Accetto i <Text style={styles.termsLink}>Termini e Condizioni</Text>
            </Text>
          </TouchableOpacity>

          {!!error && <Text testID="register-error" style={styles.error}>{error}</Text>}

          <AnimatedButton
            testID="register-submit-btn"
            onPress={handleRegister}
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            disabled={!canSubmit}
          >
            {loading
              ? <ActivityIndicator color="#050505" />
              : <Text style={styles.submitButtonText}>CREA IL TUO LEGACY</Text>
            }
          </AnimatedButton>

          <TouchableOpacity testID="register-login-link" onPress={() => router.replace('/login')}>
            <Text style={styles.loginLink}>
              Hai già un account? <Text style={styles.loginLinkBold}>RESUME</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  backBtn: { marginBottom: 32 },
  backText: { color: '#00F2FF', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  title: { color: '#FFFFFF', fontSize: 40, fontWeight: '900', letterSpacing: 0.5 },
  subtitle: { color: '#555555', fontSize: 14, marginTop: 6, marginBottom: 40 },
  form: { gap: 20 },
  fieldGroup: { gap: 8 },
  label: { color: '#00F2FF', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  input: {
    backgroundColor: '#111111', borderWidth: 1, borderColor: '#222222',
    borderRadius: 8, padding: 16, color: '#FFFFFF', fontSize: 16,
  },
  inputError: { borderColor: '#FF3B30' },
  inputErrorBorder: { borderColor: '#FF3B30' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111111', borderWidth: 1, borderColor: '#222222',
    borderRadius: 8, overflow: 'hidden',
  },
  inputFlex: { flex: 1, padding: 16, color: '#FFFFFF', fontSize: 16 },
  statusIcon: { paddingHorizontal: 14 },
  errorMsg: { color: '#FF3B30', fontSize: 12 },
  successMsg: { color: '#34C759', fontSize: 12 },
  pwdContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111111', borderWidth: 1, borderColor: '#222222', borderRadius: 8,
  },
  pwdInput: { flex: 1, padding: 16, color: '#FFFFFF', fontSize: 16 },
  showHide: { paddingHorizontal: 14 },
  showHideText: { color: '#00F2FF', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  strengthBar: { height: 3, backgroundColor: '#222222', borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 1.5, borderColor: '#444',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#00F2FF', borderColor: '#00F2FF' },
  checkmark: { color: '#050505', fontSize: 14, fontWeight: '900' },
  termsText: { color: '#A0A0A0', fontSize: 14, flex: 1 },
  termsLink: { color: '#00F2FF', fontWeight: '700' },
  error: { color: '#FF3B30', fontSize: 13, textAlign: 'center' },
  submitButton: {
    backgroundColor: '#00F2FF', borderRadius: 8,
    paddingVertical: 18, alignItems: 'center', marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.4 },
  submitButtonText: { color: '#050505', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  loginLink: { color: '#555555', fontSize: 14, textAlign: 'center', marginTop: 8 },
  loginLinkBold: { color: '#00F2FF', fontWeight: '700' },
});
