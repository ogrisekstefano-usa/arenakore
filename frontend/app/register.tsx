/**
 * ARENAKORE — NÈXUS REGISTRATION PROTOCOL
 * Phase 1: Security Form  →  Phase 2: Bio-Data Calibration
 * Design: OLED Black · Cyan Neon · Glassmorphism · Montserrat 900 / Inter 300
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, StatusBar, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeInDown, FadeInRight, FadeOutLeft,
  useSharedValue, withRepeat, withSequence, withTiming,
  useAnimatedStyle, SlideInRight, SlideOutLeft,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';

// ── Font helpers ─────────────────────────────────────────────────────────────
const MONT: any = Platform.select({ web: { fontFamily: 'Montserrat, sans-serif' }, default: {} });
const INTER: any = Platform.select({ web: { fontFamily: 'Inter, -apple-system, sans-serif' }, default: {} });
const GLASS: any = Platform.select({
  web: { backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' },
  default: {},
});

const CYAN   = '#00F2FF';
const GREEN  = '#34C759';
const RED    = '#FF453A';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDERS  = [
  { key: 'UOMO',  icon: 'male',   label: 'UOMO' },
  { key: 'DONNA', icon: 'female', label: 'DONNA' },
  { key: 'ALTRO', icon: 'transgender', label: 'ALTRO' },
];

// ── CyanDot pulsante ─────────────────────────────────────────────────────────
function CyanDot() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.4, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1, false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value > 1.2 ? 0.6 : 1,
  }));
  return <Animated.View style={[styles.cyanDot, style]} />;
}

// ── PasswordField ─────────────────────────────────────────────────────────────
function PasswordField({
  value, onChangeText, placeholder, matchValue, showEye, onToggleEye, forwardRef,
}: {
  value: string; onChangeText: (t: string) => void; placeholder: string;
  matchValue?: string; showEye: boolean; onToggleEye: () => void;
  forwardRef?: React.RefObject<TextInput>;
}) {
  const hasInput = value.length > 0;
  const hasMatcher = matchValue !== undefined;
  const isMatch = hasMatcher && value === matchValue && hasInput;
  const isMismatch = hasMatcher && value !== matchValue && hasInput;

  const borderColor = hasMatcher
    ? isMatch ? GREEN : isMismatch ? RED : 'rgba(255,255,255,0.1)'
    : 'rgba(255,255,255,0.1)';

  return (
    <View style={[styles.fieldWrap, { borderColor }]}>
      <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.3)" style={styles.fieldIcon} />
      <TextInput
        ref={forwardRef as any}
        style={[styles.fieldInput, INTER]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.25)"
        secureTextEntry={!showEye}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {hasMatcher && hasInput && (
        <Ionicons
          name={isMatch ? 'checkmark-circle' : 'close-circle'}
          size={16}
          color={isMatch ? GREEN : RED}
          style={{ marginRight: 4 }}
        />
      )}
      <TouchableOpacity onPress={onToggleEye} style={styles.eyeBtn} activeOpacity={0.7}>
        <Ionicons name={showEye ? 'eye' : 'eye-off'} size={18} color="rgba(255,255,255,0.45)" />
      </TouchableOpacity>
    </View>
  );
}

// ── Phase 1: Security ─────────────────────────────────────────────────────────
function SecurityPhase({ onNext }: { onNext: (email: string, password: string) => void }) {
  const [email, setEmail]         = useState('');
  const [password, setPwd]        = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [terms, setTerms]         = useState(false);
  const [error, setError]         = useState('');

  const emailOk  = EMAIL_RE.test(email);
  const pwdOk    = password.length >= 8;
  const confOk   = password === confirm && confirm.length > 0;
  const canNext  = emailOk && pwdOk && confOk && terms;

  const handleNext = () => {
    if (!emailOk)  { setError('Inserisci un\'email valida'); return; }
    if (!pwdOk)    { setError('Password: minimo 8 caratteri'); return; }
    if (!confOk)   { setError('Le password non coincidono'); return; }
    if (!terms)    { setError('Devi accettare i Termini per continuare'); return; }
    setError('');
    onNext(email.trim().toLowerCase(), password);
  };

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      {/* Titolo */}
      <View style={styles.phaseHeader}>
        <CyanDot />
        <Text style={[styles.phaseLabel, INTER]}>PROTOCOLLO SICUREZZA</Text>
        <View style={styles.stepPills}>
          <View style={[styles.stepPill, styles.stepPillActive]} />
          <View style={styles.stepPill} />
        </View>
      </View>
      <Text style={[styles.phaseTitle, MONT]}>CREA IL{'\n'}TUO ACCESSO</Text>
      <Text style={[styles.phaseSub, INTER]}>Questi dati proteggono il tuo profilo biometrico</Text>

      {/* Glass card */}
      <View style={[styles.glassCard, GLASS]}>
        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, INTER]}>EMAIL</Text>
          <View style={[styles.fieldWrap, emailOk && email ? { borderColor: GREEN } : {}]}>
            <Ionicons name="mail" size={16} color="rgba(255,255,255,0.3)" style={styles.fieldIcon} />
            <TextInput
              style={[styles.fieldInput, INTER]}
              value={email}
              onChangeText={setEmail}
              placeholder="atleta@dominio.com"
              placeholderTextColor="rgba(255,255,255,0.25)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {email.length > 0 && (
              <Ionicons name={emailOk ? 'checkmark-circle' : 'close-circle'} size={16}
                color={emailOk ? GREEN : RED} style={{ marginRight: 4 }} />
            )}
          </View>
        </View>

        {/* Password */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, INTER]}>PASSWORD</Text>
          <PasswordField
            value={password}
            onChangeText={setPwd}
            placeholder="Minimo 8 caratteri"
            showEye={showPwd}
            onToggleEye={() => setShowPwd(v => !v)}
          />
          {password.length > 0 && password.length < 8 && (
            <Text style={[styles.fieldHint, { color: RED }, INTER]}>Troppo corta</Text>
          )}
          {password.length >= 8 && (
            <Text style={[styles.fieldHint, { color: GREEN }, INTER]}>✓ Sicura</Text>
          )}
        </View>

        {/* Confirm Password */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, INTER]}>RIPETI PASSWORD</Text>
          <PasswordField
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Conferma la password"
            matchValue={password}
            showEye={showConf}
            onToggleEye={() => setShowConf(v => !v)}
          />
          {confirm.length > 0 && (
            <Text style={[styles.fieldHint, { color: confirm === password ? GREEN : RED }, INTER]}>
              {confirm === password ? '✓ Le password coincidono' : '✗ Non coincidono'}
            </Text>
          )}
        </View>
      </View>

      {/* Legal Shield */}
      <TouchableOpacity style={styles.termsRow} onPress={() => setTerms(v => !v)} activeOpacity={0.8}>
        <View style={[styles.checkbox, terms && styles.checkboxActive]}>
          {terms && <Ionicons name="checkmark" size={12} color="#000" />}
        </View>
        <Text style={[styles.termsText, INTER]}>
          Accetto i{' '}
          <Text style={styles.termsLink}>Termini e le Condizioni</Text>
          {' '}e il trattamento dei{' '}
          <Text style={styles.termsLink}>dati biometrici NÈXUS</Text>
          {' '}secondo il protocollo di sicurezza d'élite.
        </Text>
      </TouchableOpacity>

      {/* Error */}
      {error ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={RED} />
          <Text style={[styles.errorText, INTER]}>{error}</Text>
        </Animated.View>
      ) : null}

      {/* CTA */}
      <TouchableOpacity
        style={[styles.ctaBtn, !canNext && styles.ctaBtnOff]}
        onPress={handleNext}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={canNext ? ['#00F2FF', '#00B8D9'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.05)']}
          style={styles.ctaGrad}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <Text style={[styles.ctaText, MONT, !canNext && { color: 'rgba(255,255,255,0.3)' }]}>
            ATTIVA PROTOCOLLO
          </Text>
          <Ionicons name="arrow-forward" size={16} color={canNext ? '#000' : 'rgba(255,255,255,0.3)'} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Phase 2: Bio-Data ─────────────────────────────────────────────────────────
function BioDataPhase({
  email, password, onBack,
}: {
  email: string; password: string; onBack: () => void;
}) {
  const router = useRouter();
  const { register } = useAuth();

  const [nickname, setNickname] = useState('');
  const [gender, setGender]     = useState<string | null>(null);
  const [age, setAge]           = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const canSubmit = nickname.trim().length >= 3 && gender && parseInt(age) >= 13 && !loading;

  const handleRegister = async (destination: 'fast' | 'nexus') => {
    if (nickname.trim().length < 3) { setError('Nickname: minimo 3 caratteri'); return; }
    if (!gender) { setError('Seleziona il tuo genere'); return; }
    const ageN = parseInt(age);
    if (!ageN || ageN < 13 || ageN > 80) { setError('Età non valida (13–80)'); return; }

    setError('');
    setLoading(true);
    try {
      await register(
        nickname.trim().toUpperCase(),
        email,
        password,
        { age: ageN, gender } as any,
      );
      if (destination === 'fast') {
        router.replace('/(tabs)/arena');
      } else {
        router.replace('/onboarding/step1');
      }
    } catch (e: any) {
      setError(e?.message || 'Errore durante la registrazione');
    } finally {
      setLoading(false);
    }
  };

  // Keep old handleForge for backwards compat
  const handleForge = () => handleRegister('nexus');

  return (
    <Animated.View entering={SlideInRight.duration(350)}>
      {/* Back + step */}
      <View style={styles.phaseHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
        <CyanDot />
        <Text style={[styles.phaseLabel, INTER]}>CALIBRAZIONE AI</Text>
        <View style={styles.stepPills}>
          <View style={styles.stepPill} />
          <View style={[styles.stepPill, styles.stepPillActive]} />
        </View>
      </View>
      <Text style={[styles.phaseTitle, MONT]}>PROFILO{'\n'}BIOMETRICO</Text>
      <Text style={[styles.phaseSub, INTER]}>
        Questi dati calibrano le soglie di performance dell'AI nei passaggi successivi
      </Text>

      <View style={[styles.glassCard, GLASS]}>
        {/* Nickname */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, INTER]}>KORE NICKNAME</Text>
          <View style={[styles.fieldWrap, nickname.length >= 3 ? { borderColor: CYAN } : {}]}>
            <Ionicons name="person" size={16} color="rgba(255,255,255,0.3)" style={styles.fieldIcon} />
            <TextInput
              style={[styles.fieldInput, INTER]}
              value={nickname}
              onChangeText={t => setNickname(t.replace(/[^a-zA-Z0-9_\-\.]/g, ''))}
              placeholder="es. TITAN_V"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="characters"
              maxLength={20}
            />
            {nickname.length >= 3 && (
              <Ionicons name="checkmark-circle" size={16} color={CYAN} style={{ marginRight: 4 }} />
            )}
          </View>
          <Text style={[styles.fieldHint, INTER]}>Solo lettere, numeri e _ - . (min 3)</Text>
        </View>

        {/* Gender */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, INTER]}>GENERE</Text>
          <View style={styles.genderRow}>
            {GENDERS.map(g => (
              <TouchableOpacity
                key={g.key}
                style={[styles.genderBtn, gender === g.key && styles.genderBtnActive]}
                onPress={() => setGender(g.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={g.icon as any}
                  size={18}
                  color={gender === g.key ? '#000' : 'rgba(255,255,255,0.5)'}
                />
                <Text style={[styles.genderLabel, MONT, gender === g.key && { color: '#000' }]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Age */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, INTER]}>ETÀ</Text>
          <View style={[styles.fieldWrap, { maxWidth: 160 }, age && parseInt(age) >= 13 ? { borderColor: CYAN } : {}]}>
            <Ionicons name="calendar" size={16} color="rgba(255,255,255,0.3)" style={styles.fieldIcon} />
            <TextInput
              style={[styles.fieldInput, INTER]}
              value={age}
              onChangeText={t => setAge(t.replace(/[^0-9]/g, '').slice(0, 2))}
              placeholder="es. 25"
              placeholderTextColor="rgba(255,255,255,0.25)"
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <Text style={[styles.fieldHint, INTER]}>Età minima: 13 anni</Text>
        </View>
      </View>

      {/* Calibration note */}
      <View style={styles.calibNote}>
        <Ionicons name="hardware-chip" size={12} color={CYAN} />
        <Text style={[styles.calibText, INTER]}>
          L'AI usa questi parametri per calibrare le soglie di performance NEXUS personalizzate
        </Text>
      </View>

      {/* Error */}
      {error ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={RED} />
          <Text style={[styles.errorText, INTER]}>{error}</Text>
        </Animated.View>
      ) : null}

      {/* ── CHAMELEON ENGINE — Biforcazione Fast Entry / NÈXUS Certification ── */}
      <View style={styles.chameleonDivider}>
        <View style={styles.chameleonLine} />
        <Text style={[styles.chameleonLabel, INTER]}>SCEGLI IL TUO PERCORSO</Text>
        <View style={styles.chameleonLine} />
      </View>

      {/* FAST ENTRY */}
      <TouchableOpacity
        style={[styles.chameleonCard, styles.chameleonFast, !canSubmit && styles.ctaBtnOff]}
        onPress={() => handleRegister('fast')}
        disabled={!canSubmit || loading}
        activeOpacity={0.85}
      >
        <View style={styles.chameleonCardLeft}>
          <View style={styles.chameleonIconWrap}>
            <Ionicons name="flash" size={20} color="rgba(255,255,255,0.6)" />
          </View>
          <View>
            <Text style={[styles.chameleonCardTitle, MONT]}>FAST ENTRY</Text>
            <Text style={[styles.chameleonCardSub, INTER]}>Entra subito nell'app.{'\n'}Bio-Certificazione completabile dopo.</Text>
          </View>
        </View>
        <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.3)" />
      </TouchableOpacity>

      {/* NÈXUS CERTIFICATION */}
      <TouchableOpacity
        style={[styles.chameleonCard, styles.chameleonNexus, !canSubmit && styles.ctaBtnOff]}
        onPress={() => handleRegister('nexus')}
        disabled={!canSubmit || loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#000" size="small" style={{ flex: 1 }} />
        ) : (
          <>
            <View style={styles.chameleonCardLeft}>
              <View style={[styles.chameleonIconWrap, { backgroundColor: 'rgba(0,242,255,0.15)' }]}>
                <Ionicons name="scan" size={20} color={CYAN} />
              </View>
              <View>
                <Text style={[styles.chameleonCardTitle, MONT, { color: CYAN }]}>NÈXUS CERTIFICATION</Text>
                <Text style={[styles.chameleonCardSub, INTER]}>Scansione biometrica completa.{'\n'}KORE SCORE certificato e validato AI.</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={CYAN} />
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Register ─────────────────────────────────────────────────────────────
export default function Register() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'security' | 'bio'>('security');
  const [secData, setSecData] = useState<{ email: string; password: string } | null>(null);

  const handleSecDone = (email: string, password: string) => {
    setSecData({ email, password });
    setPhase('bio');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Background grid lines */}
      <View style={styles.gridBg} pointerEvents="none">
        {[...Array(6)].map((_, i) => (
          <View key={i} style={[styles.gridLine, { left: `${(i + 1) * 16}%` as any }]} />
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top nav */}
          <Animated.View entering={FadeIn.duration(400)} style={styles.topNav}>
            <TouchableOpacity onPress={() => router.back()} style={styles.navBack}>
              <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.5)" />
              <Text style={[styles.navBackText, INTER]}>Indietro</Text>
            </TouchableOpacity>
            <View style={styles.nexusBrand}>
              <View style={styles.nexusDot} />
              <Text style={[styles.nexusBrandText, MONT]}>NÈXUS</Text>
            </View>
          </Animated.View>

          {/* Phase content */}
          <View style={styles.content}>
            {phase === 'security' ? (
              <SecurityPhase onNext={handleSecDone} />
            ) : (
              <BioDataPhase
                email={secData!.email}
                password={secData!.password}
                onBack={() => setPhase('security')}
              />
            )}
          </View>

          {/* Login link */}
          <Animated.View entering={FadeInDown.delay(600).duration(300)} style={styles.loginLink}>
            <Text style={[styles.loginLinkText, INTER]}>Hai già un account?</Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={[styles.loginLinkCta, MONT]}>ACCEDI</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // Background
  gridBg: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  gridLine: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,242,255,0.04)',
  },

  scroll: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },

  // Top nav
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  navBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBackText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  nexusBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nexusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CYAN,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  nexusBrandText: {
    color: CYAN,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 4,
  },

  content: { gap: 0 },

  // Phase header
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backBtn: {
    marginRight: 4,
  },
  phaseLabel: {
    flex: 1,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '300',
    letterSpacing: 3,
  },
  stepPills: {
    flexDirection: 'row',
    gap: 4,
  },
  stepPill: {
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  stepPillActive: {
    backgroundColor: CYAN,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  cyanDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: CYAN,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  // Titles
  phaseTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 2,
    lineHeight: 40,
    marginBottom: 8,
  },
  phaseSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '300',
    lineHeight: 18,
    letterSpacing: 0.5,
    marginBottom: 24,
  },

  // Glass card
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    gap: 18,
    marginBottom: 20,
  },

  // Field
  fieldGroup: { gap: 7 },
  fieldLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '300',
    letterSpacing: 3,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  fieldIcon: { opacity: 0.7 },
  fieldInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '300',
    letterSpacing: 0.5,
    // web only:
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  eyeBtn: {
    padding: 4,
  },
  fieldHint: {
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.3)',
    marginTop: -2,
  },

  // Terms
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxActive: {
    backgroundColor: CYAN,
    borderColor: CYAN,
  },
  termsText: {
    flex: 1,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '300',
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  termsLink: {
    color: CYAN,
    fontWeight: '400',
  },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,69,58,0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.2)',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: 0.5,
  },

  // CTA
  ctaBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  ctaBtnOff: { opacity: 0.6 },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    paddingHorizontal: 24,
  },
  ctaText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
  },

  // Gender
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  genderBtnActive: {
    backgroundColor: CYAN,
    borderColor: CYAN,
  },
  genderLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  // Calibration note
  calibNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(0,242,255,0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,242,255,0.1)',
  },
  calibText: {
    flex: 1,
    color: 'rgba(0,242,255,0.6)',
    fontSize: 11,
    fontWeight: '300',
    lineHeight: 16,
    letterSpacing: 0.3,
  },

  // Login link
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
  },
  loginLinkText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  loginLinkCta: {
    color: CYAN,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },

  // ── Chameleon Engine styles ─────────────────────────────────────────
  chameleonDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  chameleonLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  chameleonLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 3,
  },
  chameleonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  chameleonFast: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chameleonNexus: {
    backgroundColor: 'rgba(0,242,255,0.07)',
    borderColor: 'rgba(0,242,255,0.35)',
  },
  chameleonCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  chameleonIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chameleonCardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 3,
  },
  chameleonCardSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '300',
    lineHeight: 16,
  },
});
