import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  StatusBar, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../utils/api';

type Step = 'email' | 'otp' | 'password' | 'done';

export default function Recover() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  // OTP box: (contentWidth - 5 gaps) / 6
  const otpBoxW = Math.floor((Math.min(screenW, 420) - 48 - 5 * 8) / 6);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const otpRefs = useRef<(TextInput | null)[]>([]);

  // ── Step 1: Request OTP ──────────────────────────────────────────
  const handleSendOTP = async () => {
    if (!email.trim()) { setError('Inserisci la tua email'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.forgotPassword(email.trim().toLowerCase());
      if (res.dev_otp) setDevOtp(res.dev_otp); // DEV ONLY
      setStep('otp');
    } catch (e: any) {
      setError(e.message || 'Errore nell\'invio del codice');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ───────────────────────────────────────────
  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Inserisci il codice completo a 6 cifre'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.verifyOTP(email.trim().toLowerCase(), code);
      setResetToken(res.reset_token);
      setStep('password');
    } catch (e: any) {
      setError(e.message || 'Codice OTP non valido');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Reset Password ───────────────────────────────────────
  const handleResetPassword = async () => {
    if (newPassword.length < 8) { setError('Password troppo corta (minimo 8 caratteri)'); return; }
    if (newPassword !== confirmPassword) { setError('Le password non corrispondono'); return; }
    setLoading(true); setError('');
    try {
      await api.resetPassword(resetToken, newPassword, confirmPassword);
      setStep('done');
    } catch (e: any) {
      setError(e.message || 'Errore nel reset della password');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Box Handler ──────────────────────────────────────────────
  const handleOtpChange = (val: string, idx: number) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (!digit && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const handleOtpKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  // ── Render Helpers ───────────────────────────────────────────────
  const Header = () => (
    <View style={s.header}>
      <Text style={s.brand}>ARENAKORE</Text>
      <Text style={s.titleBig}>ID RECOVERY</Text>
      <View style={s.cyanLine} />
    </View>
  );

  const stepLabel = step === 'email' ? 'STEP 01 · IDENTIFICA ACCOUNT'
    : step === 'otp'  ? 'STEP 02 · VERIFICA IDENTITÀ'
    : step === 'password' ? 'STEP 03 · NUOVA PASSWORD'
    : 'ACCESSO RIPRISTINATO';

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        {step !== 'done' && (
          <TouchableOpacity onPress={() => step === 'email' ? router.replace('/login') : setStep(step === 'otp' ? 'email' : 'otp')} style={s.backBtn}>
            <Ionicons name="arrow-back" size={14} color="#00E5FF" />
            <Text style={s.backTxt}>
              {step === 'email' ? 'TORNA AL LOGIN' : 'STEP PRECEDENTE'}
            </Text>
          </TouchableOpacity>
        )}

        <Header />
        <Text style={s.stepLabel}>{stepLabel}</Text>

        {/* ── STEP 1: EMAIL ── */}
        {step === 'email' && (
          <View style={s.form}>
            <Text style={s.body}>Inserisci l'email del tuo account ARENAKORE. Ti invieremo un codice OTP a 6 cifre.</Text>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>EMAIL REGISTRATA</Text>
              <TextInput
                testID="recovery-email-input"
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="la-tua@email.com"
                placeholderTextColor="#2A2A2A"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {!!devOtp && (
              <View style={s.devBanner}>
                <Ionicons name="terminal" size={12} color="#FFD700" />
                <Text style={s.devTxt}>DEV MODE — OTP: {devOtp}</Text>
              </View>
            )}

            {!!error && <Text style={s.error}>{error}</Text>}

            <TouchableOpacity
              testID="send-otp-btn"
              style={[s.cta, loading && s.ctaLoading]}
              onPress={handleSendOTP}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#050505" />
                : <>
                    <Ionicons name="send" size={15} color="#050505" />
                    <Text style={s.ctaTxt}>INVIA CODICE OTP</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 2: OTP ── */}
        {step === 'otp' && (
          <View style={s.form}>
            <Text style={s.body}>
              Codice inviato a{'\n'}
              <Text style={s.emailHighlight}>{email}</Text>
            </Text>

            {/* 6 Neon Cyan OTP Boxes */}
            <View style={s.otpRow}>
              {otp.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={(r) => { otpRefs.current[idx] = r; }}
                  testID={`otp-box-${idx}`}
                  style={[s.otpBox, { width: otpBoxW, height: otpBoxW }, digit ? s.otpBoxFilled : null]}
                  value={digit}
                  onChangeText={(v) => handleOtpChange(v, idx)}
                  onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  textAlign="center"
                />
              ))}
            </View>

            {!!devOtp && (
              <View style={s.devBanner}>
                <Ionicons name="terminal" size={12} color="#FFD700" />
                <Text style={s.devTxt}>DEV — OTP: {devOtp}</Text>
              </View>
            )}

            {!!error && <Text style={s.error}>{error}</Text>}

            <TouchableOpacity
              testID="verify-otp-btn"
              style={[s.cta, loading && s.ctaLoading]}
              onPress={handleVerifyOTP}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#050505" />
                : <>
                    <Ionicons name="shield-checkmark" size={15} color="#050505" />
                    <Text style={s.ctaTxt}>VERIFICA CODICE</Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSendOTP} style={s.resendBtn} disabled={loading}>
              <Text style={s.resendTxt}>REINVIA CODICE</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 3: NUOVA PASSWORD ── */}
        {step === 'password' && (
          <View style={s.form}>
            <Text style={s.body}>Crea una nuova password sicura per il tuo account ARENAKORE.</Text>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>NUOVA PASSWORD</Text>
              <View style={s.pwdRow}>
                <TextInput
                  testID="new-password-input"
                  style={s.pwdInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Minimo 8 caratteri"
                  placeholderTextColor="#2A2A2A"
                  secureTextEntry={!showPwd}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={s.eye}>
                  <Ionicons name={showPwd ? 'eye-off' : 'eye'} size={18} color="#00E5FF" />
                </TouchableOpacity>
              </View>
              {newPassword.length > 0 && (
                <View style={s.strengthBar}>
                  <View style={[s.strengthFill, {
                    width: `${Math.min(100, (newPassword.length / 12) * 100)}%` as any,
                    backgroundColor: newPassword.length >= 8 ? '#00E5FF' : '#FF3B30',
                  }]} />
                </View>
              )}
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>CONFERMA PASSWORD</Text>
              <View style={s.pwdRow}>
                <TextInput
                  testID="confirm-password-input"
                  style={s.pwdInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Ripeti la password"
                  placeholderTextColor="#2A2A2A"
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={s.eye}>
                  <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={18} color="#00E5FF" />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={s.mismatch}>Le password non corrispondono</Text>
              )}
            </View>

            {!!error && <Text style={s.error}>{error}</Text>}

            <TouchableOpacity
              testID="reset-password-btn"
              style={[s.cta, loading && s.ctaLoading]}
              onPress={handleResetPassword}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#050505" />
                : <>
                    <Ionicons name="lock-closed" size={15} color="#050505" />
                    <Text style={s.ctaTxt}>RIPRISTINA ACCESSO</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 4: DONE ── */}
        {step === 'done' && (
          <View style={s.doneWrap}>
            <LinearGradient
              colors={['#0a0a0a', '#0a0a0a']}
              style={s.doneCard}
            >
              <View style={s.doneGlow} />
              <View style={s.doneIconWrap}>
                <Ionicons name="shield-checkmark" size={52} color="#FFD700" />
              </View>
              <Text style={s.doneTitle}>ACCESSO</Text>
              <Text style={s.doneTitleBig}>RIPRISTINATO</Text>
              <View style={s.doneDivider} />
              <Text style={s.doneBody}>
                Il tuo ARENAKORE ID è stato recuperato con successo. La password è stata aggiornata con crittografia bcrypt.
              </Text>
              <TouchableOpacity
                testID="go-to-login-btn"
                style={s.doneBtn}
                onPress={() => router.replace('/login')}
                activeOpacity={0.85}
              >
                <Ionicons name="log-in" size={15} color="#050505" />
                <Text style={s.doneBtnTxt}>ACCEDI ORA</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── STYLES — ARENAKORE SPEC ──────────────────────────────────────────
const CYAN = '#00E5FF';
const GOLD = '#FFD700';
const BG   = '#000000';
const CARD = '#0a0a0a';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 24, flexGrow: 1 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 },
  backTxt: { color: CYAN, fontSize: 15, fontWeight: '400', letterSpacing: 2 },

  header: { marginBottom: 8 },
  brand: {
    color: GOLD, fontSize: 16, fontWeight: '400', letterSpacing: 8, marginBottom: 4,
  },
  titleBig: {
    color: '#FFFFFF', fontSize: 42, fontWeight: '900', letterSpacing: 0.5,
    lineHeight: 44,
  },
  cyanLine: {
    height: 3, width: 48, backgroundColor: CYAN, marginTop: 14,
    shadowColor: CYAN, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 8,
  },

  stepLabel: {
    color: CYAN, fontSize: 12, fontWeight: '900', letterSpacing: 4,
    marginTop: 28, marginBottom: 24,
  },

  form: { gap: 20 },
  body: { color: '#555555', fontSize: 16, lineHeight: 22 },
  emailHighlight: { color: CYAN, fontWeight: '700' },

  fieldWrap: { gap: 8 },
  fieldLabel: { color: CYAN, fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  input: {
    backgroundColor: '#111111', borderWidth: 1, borderColor: '#222',
    borderRadius: 8, padding: 16, color: '#FFFFFF', fontSize: 18, fontWeight: '700',
  },

  // 6-Box OTP grid — neon cyan (width/height injected dynamically from otpBoxW)
  otpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  otpBox: {
    borderRadius: 8,
    backgroundColor: '#00E5FF', borderWidth: 2, borderColor: '#1A1A1A',
    color: '#00E5FF', fontSize: 28, fontWeight: '900', textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: '#00E5FF',
    shadowColor: '#00E5FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 8,
  },

  devBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
    borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10,
  },
  devTxt: { color: GOLD, fontSize: 14, fontWeight: '700', letterSpacing: 1 },

  error: { color: '#FF3B30', fontSize: 15, fontWeight: '700', textAlign: 'center' },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: CYAN, borderRadius: 8,
    paddingVertical: 18, marginTop: 8,
  },
  ctaLoading: { opacity: 0.7 },
  ctaTxt: { color: '#000000', fontSize: 16, fontWeight: '900', letterSpacing: 2 },

  resendBtn: { alignItems: 'center', paddingVertical: 12 },
  resendTxt: { color: '#333', fontSize: 14, fontWeight: '700', letterSpacing: 2 },

  pwdRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111111', borderWidth: 1, borderColor: '#222',
    borderRadius: 8,
  },
  pwdInput: { flex: 1, padding: 16, color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  eye: { paddingHorizontal: 24 },
  strengthBar: { height: 3, backgroundColor: '#1A1A1A', borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  mismatch: { color: '#FF3B30', fontSize: 14, fontWeight: '700' },

  // Done screen
  doneWrap: { flex: 1, justifyContent: 'center', paddingTop: 20 },
  doneCard: {
    borderRadius: 20, padding: 32, alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)',
    overflow: 'hidden',
  },
  doneGlow: {
    height: 3, width: '110%', backgroundColor: GOLD, opacity: 0.6,
    marginHorizontal: -32, marginTop: -32, marginBottom: 8,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 12,
  },
  doneIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderWidth: 2, borderColor: GOLD,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: GOLD, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20,
  },
  doneTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 6 },
  doneTitleBig: { color: GOLD, fontSize: 36, fontWeight: '900', letterSpacing: 0.5, marginTop: -8 },
  doneDivider: { height: 1, width: '100%', backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 4 },
  doneBody: { color: '#555555', fontSize: 15, textAlign: 'center', lineHeight: 20 },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: CYAN, borderRadius: 8,
    paddingVertical: 16, width: '100%', marginTop: 8,
  },
  doneBtnTxt: { color: '#000000', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
});
