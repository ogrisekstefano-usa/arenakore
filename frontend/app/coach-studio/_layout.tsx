/**
 * COACH STUDIO — Desktop Command Center Layout
 * Glassmorphism sidebar + Role-based nav + Auth Shield + Toast
 */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { Slot, useRouter, usePathname, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import Animated, { FadeIn } from 'react-native-reanimated';
import { StudioToastProvider } from '../../components/studio/StudioToast';

const NAV_ITEMS_GYM_OWNER = [
  { href: '/coach-studio',               icon: 'grid',           label: 'PANOPTICON',  sub: 'Dashboard' },
  { href: '/coach-studio/gym-dashboard', icon: 'business',       label: 'GYM HUB',     sub: 'Business View' },
  { href: '/coach-studio/staff',         icon: 'people-circle',  label: 'STAFF',       sub: 'Manage Coaches' },
  { href: '/coach-studio/athletes',      icon: 'people',         label: 'ATLETI',      sub: 'CRM Engine' },
  { href: '/coach-studio/talent',        icon: 'star',           label: 'SCOUT',       sub: 'Talent Discovery' },
  { href: '/coach-studio/ai',            icon: 'hardware-chip',  label: 'AI COACH',    sub: 'Risk & Forecast' },
];

const NAV_ITEMS_COACH = [
  { href: '/coach-studio',          icon: 'grid',           label: 'PANOPTICON',  sub: 'Dashboard' },
  { href: '/coach-studio/athletes', icon: 'people',         label: 'ATLETI',      sub: 'CRM Engine' },
  { href: '/coach-studio/builder',  icon: 'construct',      label: 'ARCHITECT',   sub: 'Template Builder' },
  { href: '/coach-studio/talent',   icon: 'star',           label: 'SCOUT',       sub: 'Talent Discovery' },
  { href: '/coach-studio/crew',     icon: 'shield',         label: 'STRATEGIST',  sub: 'Battle Control' },
  { href: '/coach-studio/ai',       icon: 'hardware-chip',  label: 'AI COACH',    sub: 'Risk & Forecast' },
];

const NAV_ITEMS_ATHLETE = [
  { href: '/coach-studio/passport', icon: 'person',         label: 'PASSPORT',    sub: 'Il tuo profilo' },
];

function getNavItems(role: string | undefined) {
  if (role === 'GYM_OWNER' || role === 'ADMIN') return NAV_ITEMS_GYM_OWNER;
  if (role === 'COACH') return NAV_ITEMS_COACH;
  return NAV_ITEMS_ATHLETE;
}

const ROLE_BADGE_CFG: Record<string, { color: string; bg: string }> = {
  GYM_OWNER: { color: '#D4AF37', bg: 'rgba(212,175,55,0.12)' },
  COACH:     { color: '#00F2FF', bg: 'rgba(0,242,255,0.08)' },
  ATHLETE:   { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)' },
  ADMIN:     { color: '#AF52DE', bg: 'rgba(175,82,222,0.1)' },
};

export default function CoachStudioLayout() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const role = user?.role || 'ATHLETE';
  const NAV_ITEMS = getNavItems(role);
  const roleCfg = ROLE_BADGE_CFG[role] || ROLE_BADGE_CFG.ATHLETE;

  // Mobile redirect (non-web only)
  if (Platform.OS !== 'web') {
    return (
      <View style={l$.mobileBlock}>
        <Ionicons name="desktop-outline" size={40} color="rgba(255,255,255,0.3)" />
        <Text style={l$.mobileTitle}>COACH STUDIO</Text>
        <Text style={l$.mobileSub}>Disponibile solo su desktop.{`\n`}Accedi da browser per il Command Center.</Text>
        <TouchableOpacity style={l$.mobileBack} onPress={() => router.push('/')}>
          <Text style={l$.mobileBackText}>TORNA ALL'APP</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Wait for auth state to hydrate before deciding to redirect
  if (isLoading) {
    console.log('[CoachStudio] Auth loading, waiting...');
    return null;
  }

  // Auth redirect using Expo Router Redirect component (avoids "navigate before mount" error)
  if (!token) {
    console.log('[CoachStudio] No token after load, redirecting to login');
    return <Redirect href="/login" />;
  }
  console.log('[CoachStudio] Token found, rendering layout');

  // ── AUTH SHIELD: ATHLETE role blocked from Coach Studio ──
  if (role === 'ATHLETE' && !user?.is_founder && !user?.is_admin) {
    return (
      <View style={l$.athleteBlock}>
        <Ionicons name="lock-closed" size={32} color="#FF453A" />
        <Text style={l$.athleteTitle}>ACCESSO LIMITATO</Text>
        <Text style={l$.athleteSub}>{'Il Coach Studio è riservato a Coach e GYM Owner.\nContatta il tuo Coach per accedere ai tuoi dati.'}</Text>
        <TouchableOpacity style={l$.mobileBack} onPress={() => router.push('/')}>
          <Text style={l$.mobileBackText}>TORNA ALL'APP</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <StudioToastProvider>
    <View style={l$.root}>
      {/* Sidebar — Glassmorphism on web */}
      <View style={[l$.sidebar, Platform.OS === 'web' ? { ...(l$.sidebarGlass as any) } : {}]}>
        {/* Brand */}
        <View style={l$.brand}>
          <View style={l$.brandDot} />
          <View>
            <Text style={l$.brandName}>ARENAKORE</Text>
            <Text style={l$.brandSub}>COMMAND CENTER</Text>
          </View>
        </View>

        {/* Role badge */}
        <View style={[l$.roleBadge, { backgroundColor: roleCfg.bg, borderColor: roleCfg.color + '40' }]}>
          <View style={[l$.roleDot, { backgroundColor: roleCfg.color }]} />
          <Text style={[l$.roleText, { color: roleCfg.color }]}>{role}</Text>
        </View>

        {/* Nav items */}
        <View style={l$.nav}>
          {NAV_ITEMS.map((item) => {
            const isActive = path === item.href || (item.href !== '/coach-studio' && path.startsWith(item.href));
            return (
              <TouchableOpacity
                key={item.href}
                style={[l$.navItem, isActive && l$.navItemActive]}
                onPress={() => router.push(item.href as any)}
                activeOpacity={0.8}
              >
                <Ionicons name={item.icon as any} size={18} color={isActive ? '#00F2FF' : 'rgba(255,255,255,0.35)'} />
                <View style={l$.navText}>
                  <Text style={[l$.navLabel, isActive && { color: '#00F2FF' }]}>{item.label}</Text>
                  <Text style={l$.navSub}>{item.sub}</Text>
                </View>
                {isActive && <View style={l$.navActive} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* User info */}
        <View style={l$.userRow}>
          <View style={[l$.userAvatar, { backgroundColor: user?.avatar_color || '#00F2FF' }]}>
            <Text style={l$.userLetter}>{(user?.username || 'C')[0].toUpperCase()}</Text>
          </View>
          <View style={l$.userInfo}>
            <Text style={l$.userName}>{user?.username || 'COACH'}</Text>
            <Text style={l$.userRole}>LVL {user?.level || 1}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/nexus-trigger')}>
            <Ionicons name="exit-outline" size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content */}
      <View style={l$.main}>
        <Slot />
      </View>
    </View>
    </StudioToastProvider>
  );
}

const l$ = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#000000' },
  sidebar: {
    width: 220, backgroundColor: '#050505', borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
    padding: 20, justifyContent: 'space-between',
  },
  // Glassmorphism (web-only via spread in JSX)
  sidebarGlass: {
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    backgroundColor: 'rgba(5,5,5,0.88)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00F2FF' },
  brandName: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 16, alignSelf: 'flex-start' },
  roleDot: { width: 5, height: 5, borderRadius: 3 },
  roleText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  brandSub: { color: 'rgba(0,242,255,0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  nav: { flex: 1, gap: 4 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10 },
  navItemActive: { backgroundColor: 'rgba(0,242,255,0.06)' },
  navText: { flex: 1 },
  navLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  navSub: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '300', letterSpacing: 1 },
  navActive: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#00F2FF' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  userAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  userLetter: { color: '#000000', fontSize: 14, fontWeight: '900' },
  userInfo: { flex: 1 },
  userName: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  userRole: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '300' },
  main: { flex: 1, backgroundColor: '#000000' },
  // Mobile & restricted views
  mobileBlock: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  mobileTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 4 },
  mobileSub: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  mobileBack: { marginTop: 16, borderWidth: 1, borderColor: '#00F2FF', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  mobileBackText: { color: '#00F2FF', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  // Auth Shield
  athleteBlock: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40 },
  athleteTitle: { color: '#FF453A', fontSize: 20, fontWeight: '900', letterSpacing: 3 },
  athleteSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
