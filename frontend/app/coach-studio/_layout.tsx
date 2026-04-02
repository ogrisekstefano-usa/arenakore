/**
 * NÈXUS COMMAND CENTER — Main Layout
 * Dual-theme (Dark/Light) · Slim Sidebar · Google Fonts (Montserrat Only)
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Slot, useRouter, usePathname, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeProvider, useTheme, MONT } from '../../contexts/ThemeContext';
import { StudioToastProvider } from '../../components/studio/StudioToast';

// ── Inject Google Fonts (web only) ────────────────────────────────────────────
function InjectFonts() {
  const { mode } = useTheme();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    // ── Google Fonts: Montserrat (latin subset) ──
    if (!document.getElementById('nexus-fonts')) {
      const link = document.createElement('link');
      link.id = 'nexus-fonts';
      link.rel = 'stylesheet';
      link.href = [
        'https://fonts.googleapis.com/css2?',
        'family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900&',
        'display=swap&subset=latin',
      ].join('');
      document.head.appendChild(link);
    }

    // ── CSS: typography system + light/dark mode rules ──
    const styleId = 'nexus-typography';
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }

    style.textContent = `
      /* ── NÈXUS Typography System v2.1 — Montserrat Only ── */

      /* Montserrat for all title/heading elements */
      [data-nexus-title="1"] {
        font-family: 'Montserrat', -apple-system, sans-serif !important;
        letter-spacing: -0.01em !important;
      }

      /* Montserrat for body text */
      [data-nexus-body] {
        font-family: 'Montserrat', -apple-system, sans-serif !important;
      }

      /* ── LIGHT MODE ── */
      html[data-nexus-mode="light"] {
        background: #F4F4F4;
      }

      /* Absolute black for title elements in light mode */
      html[data-nexus-mode="light"] [data-nexus-title="1"] {
        color: #000000 !important;
      }

      /* Widget cards: rounded-2xl + soft shadow in light mode */
      html[data-nexus-mode="light"] [data-nexus-card] {
        border-radius: 16px !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05) !important;
        border-color: #D1D5DB !important;
      }

      /* ── DARK MODE ── */
      html[data-nexus-mode="dark"] [data-nexus-card] {
        border-radius: 16px !important;
        border-color: #1F2937 !important;
      }
    `;

    // Apply mode to html element
    document.documentElement.setAttribute('data-nexus-mode', mode);
  }, [mode]);

  return null;
}

// ── Role-based nav ─────────────────────────────────────────────────────────────
const NAV_ITEMS_GYM_OWNER = [
  { href: '/coach-studio',               icon: 'grid',           label: 'DASHBOARD',    sub: 'Global Overview' },
  { href: '/coach-studio/athletes',      icon: 'people',         label: 'ATHLETE CRM',  sub: 'Biometric Data' },
  { href: '/coach-studio/crew',          icon: 'shield',         label: 'CREW MGT',     sub: 'Battle Control' },
  { href: '/coach-studio/builder',       icon: 'construct',      label: 'CHALLENGE',    sub: 'Builder' },
  { href: '/coach-studio/talent',        icon: 'star',           label: 'SCOUTING',     sub: 'Talent Discovery' },
  { href: '/coach-studio/ai',            icon: 'analytics',      label: 'BIO ANALYTICS',sub: 'AI Insights' },
  { href: '/coach-studio/gym-dashboard', icon: 'business',       label: 'GYM HUB',      sub: 'Business View' },
  { href: '/coach-studio/staff',         icon: 'people-circle',  label: 'STAFF',        sub: 'Manage Team' },
];

const NAV_ITEMS_COACH = [
  { href: '/coach-studio',          icon: 'grid',           label: 'DASHBOARD',    sub: 'Global Overview' },
  { href: '/coach-studio/athletes', icon: 'people',         label: 'ATHLETE CRM',  sub: 'Biometric Data' },
  { href: '/coach-studio/crew',     icon: 'shield',         label: 'CREW MGT',     sub: 'Battle Control' },
  { href: '/coach-studio/builder',  icon: 'construct',      label: 'CHALLENGE',    sub: 'Builder' },
  { href: '/coach-studio/talent',   icon: 'star',           label: 'SCOUTING',     sub: 'Talent Discovery' },
  { href: '/coach-studio/ai',       icon: 'analytics',      label: 'BIO ANALYTICS',sub: 'AI Insights' },
];

const ROLE_BADGE: Record<string, { color: string; bg: string; label: string }> = {
  GYM_OWNER: { color: '#FFD700', bg: 'rgba(255,215,0,0.12)', label: 'OWNER' },
  COACH:     { color: '#00E5FF', bg: 'rgba(0,229,255,0.08)',   label: 'COACH' },
  ATHLETE:   { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)', label: 'ATHLETE' },
  ADMIN:     { color: '#AF52DE', bg: 'rgba(175,82,222,0.1)',   label: 'ADMIN' },
};

function getNavItems(role: string | undefined) {
  if (role === 'GYM_OWNER' || role === 'ADMIN') return NAV_ITEMS_GYM_OWNER;
  return NAV_ITEMS_COACH;
}

// ── Theme Toggle ──────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { mode, toggle, theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={toggle}
      style={[tg$.wrap, {
        backgroundColor: theme.surface2,
        borderColor: theme.border2,
      }]}
      activeOpacity={0.8}
    >
      <View style={[tg$.pill, mode === 'light' && { left: '50%' as any, backgroundColor: theme.accent }]} />
      <Ionicons name="moon" size={13} color={mode === 'dark' ? theme.accent : theme.textTer} />
      <Ionicons name="sunny" size={13} color={mode === 'light' ? theme.accent : theme.textTer} />
    </TouchableOpacity>
  );
}
const tg$ = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, position: 'relative' },
  pill: { position: 'absolute', left: 4, top: 4, width: '46%' as any, bottom: 4, borderRadius: 16, backgroundColor: 'rgba(0,229,255,0.3)', transition: 'left 0.2s' } as any,
});

// ── Nav Item ──────────────────────────────────────────────────────────────────
function NavItem({ item, isActive, theme, onPress }: any) {
  const bgOpacity = useSharedValue(isActive ? 1 : 0);
  useEffect(() => { bgOpacity.value = withTiming(isActive ? 1 : 0, { duration: 200 }); }, [isActive]);
  const animStyle = useAnimatedStyle(() => ({ opacity: 0.05 + bgOpacity.value * 0.95 }));

  return (
    <TouchableOpacity
      onPress={onPress}
      style={ni$.item}
      activeOpacity={0.75}
    >
      {/* Active indicator */}
      {isActive && (
        <View style={[ni$.activeBar, { backgroundColor: theme.accent }]} />
      )}
      {/* Active bg */}
      <Animated.View
        style={[ni$.activeBg, {
          backgroundColor: isActive ? theme.accent + '10' : 'transparent',
        }]}
      />
      <Ionicons
        name={item.icon as any}
        size={17}
        color={isActive ? theme.accent : theme.textTer}
      />
      <View style={ni$.text}>
        <Text style={[ni$.label, MONT('900'), { color: isActive ? theme.text : theme.textSec }]}>
          {item.label}
        </Text>
        <Text style={[ni$.sub('300'), { color: theme.textTer }]}>
          {item.sub}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
const ni$ = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, position: 'relative', overflow: 'hidden' },
  activeBar: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2 },
  activeBg: { ...StyleSheet.absoluteFillObject, borderRadius: 10 },
  text: { flex: 1, gap: 1 },
  label: { fontSize: 13, letterSpacing: 1.5 },
  sub: { fontSize: 11, letterSpacing: 0.5 },
});

// ── Main Layout ────────────────────────────────────────────────────────────────
function CommandCenterInner() {
  const { user, token, isLoading } = useAuth();
  const { theme, mode } = useTheme();
  const router = useRouter();
  const path = usePathname();
  const role = user?.role || 'ATHLETE';
  const navItems = getNavItems(role);
  const roleBadge = ROLE_BADGE[role] || ROLE_BADGE.ATHLETE;

  // Mobile guard
  if (Platform.OS !== 'web') {    return (
      <View style={[mob$.root, { backgroundColor: theme.bg }]}>
        <Ionicons name="desktop-outline" size={36} color={theme.textTer} />
        <Text style={[mob$.title, MONT(), { color: theme.text }]}>NÈXUS COMMAND CENTER</Text>
        <Text style={[mob$.sub('300'), { color: theme.textSec }]}>
          {'Disponibile solo su desktop.\nAccedi da browser per il Command Center.'}
        </Text>
        <TouchableOpacity style={[mob$.btn, { borderColor: theme.accent }]} onPress={() => router.push('/')}>
          <Text style={[mob$.btnTxt, MONT('700'), { color: theme.accent }]}>TORNA ALL'APP</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  // Not authenticated → declarative redirect (no imperative router.replace)
  if (!isLoading && !token) {
    return <Redirect href="/login" />;
  }

  // ATHLETE guard
  if (role === 'ATHLETE' && !user?.is_founder && !user?.is_admin) {
    return (
      <View style={[mob$.root, { backgroundColor: theme.bg }]}>
        <Ionicons name="lock-closed" size={28} color={theme.accentRed} />
        <Text style={[mob$.title, MONT(), { color: theme.accentRed }]}>ACCESSO LIMITATO</Text>
        <Text style={[mob$.sub('300'), { color: theme.textSec }]}>
          {'Il Command Center è riservato a Coach e GYM Owner.'}
        </Text>
        <TouchableOpacity style={[mob$.btn, { borderColor: theme.accent }]} onPress={() => router.push('/')}>
          <Text style={[mob$.btnTxt, MONT('700'), { color: theme.accent }]}>TORNA ALL'APP</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[l$.root, { backgroundColor: theme.bg }]}>
      {/* ── SIDEBAR ── */}
      <View style={[
        l$.sidebar,
        { backgroundColor: theme.navBg, borderRightColor: theme.navBorder },
        Platform.OS === 'web' ? ({
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any) : {},
      ]}>
        {/* Brand */}
        <View style={l$.brand}>
          <View style={[l$.brandAccent, { backgroundColor: theme.accent }]} />
          <View>
            <Text style={[l$.brandName, MONT(), { color: theme.text }]}>NÈXUS</Text>
            <Text style={[l$.brandSub('300'), { color: theme.textTer }]}>COMMAND CENTER</Text>
          </View>
        </View>

        {/* Navigation */}
        <View style={l$.nav}>
          {navItems.map(item => (
            <NavItem
              key={item.href}
              item={item}
              isActive={path === item.href || (item.href !== '/coach-studio' && path.startsWith(item.href))}
              theme={theme}
              onPress={() => router.push(item.href as any)}
            />
          ))}
        </View>

        {/* Bottom: user + theme toggle */}
        <View style={[l$.bottom, { borderTopColor: theme.border }]}>
          <ThemeToggle />
          <View style={[l$.userRow]}>
            <View style={[l$.avatar, { backgroundColor: user?.avatar_color || theme.accent }]}>
              <Text style={[l$.avatarLetter, { color: '#000' }]}>{(user?.username || 'C')[0]}</Text>
            </View>
            <View style={l$.userInfo}>
              <Text style={[l$.userName, MONT('700'), { color: theme.text }]} numberOfLines={1}>
                {user?.username || 'COACH'}
              </Text>
              <View style={[l$.rolePill, { backgroundColor: roleBadge.bg }]}>
                <Text style={[l$.roleText, MONT('900'), { color: roleBadge.color }]}>
                  {roleBadge.label}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/nexus-trigger')} style={l$.exitBtn}>
              <Ionicons name="exit-outline" size={16} color={theme.textTer} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── MAIN CONTENT ── */}
      <View style={[l$.main, { backgroundColor: theme.bg }]}>
        <Slot />
      </View>
    </View>
  );
}

export default function CoachStudioLayout() {
  return (
    <ThemeProvider>
      <StudioToastProvider>
        <InjectFonts />
        <CommandCenterInner />
      </StudioToastProvider>
    </ThemeProvider>
  );
}

const l$ = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 210, borderRightWidth: 1, paddingTop: 20, paddingBottom: 16, justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, marginBottom: 28 },
  brandAccent: { width: 4, height: 28, borderRadius: 2 },
  brandName: { fontSize: 17, letterSpacing: 3 },
  brandSub: { fontSize: 10, letterSpacing: 3, marginTop: 1 },
  nav: { flex: 1, paddingHorizontal: 8, gap: 2 },
  bottom: { paddingHorizontal: 12, paddingTop: 16, borderTopWidth: 1, gap: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarLetter: { fontSize: 15, fontWeight: '900' },
  userInfo: { flex: 1, gap: 3, minWidth: 0 },
  userName: { fontSize: 14, letterSpacing: 0.5 },
  rolePill: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, alignSelf: 'flex-start' },
  roleText: { fontSize: 10, letterSpacing: 2 },
  exitBtn: { padding: 4 },
  main: { flex: 1 },
});

const mob$ = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40 },
  title: { fontSize: 20, letterSpacing: 3 },
  sub: { fontSize: 15, textAlign: 'center', lineHeight: 20 },
  btn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  btnTxt: { fontSize: 14, letterSpacing: 2 },
});
