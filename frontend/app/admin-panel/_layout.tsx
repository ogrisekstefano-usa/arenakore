/**
 * ARENAKORE — SUPER ADMIN PANEL LAYOUT
 * ═══════════════════════════════════════════════
 * Route guard + sidebar navigation for SUPER_ADMIN only.
 * Uses declarative <Redirect> (same pattern as coach-studio).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Slot, Redirect, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FM = Platform.select({ web: "'Montserrat', sans-serif", default: undefined });

const NAV_ITEMS = [
  { key: 'index', label: 'DASHBOARD', icon: 'grid-outline', path: '/admin-panel' },
  { key: 'leads', label: 'LEAD & PALESTRE', icon: 'business-outline', path: '/admin-panel/leads' },
  { key: 'push', label: 'PUSH CENTER', icon: 'notifications-outline', path: '/admin-panel/push' },
  { key: 'cms', label: 'CMS EDITOR', icon: 'document-text-outline', path: '/admin-panel/cms' },
];

export default function AdminPanelLayout() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Loading state — same pattern as coach-studio
  if (isLoading) {
    return (
      <View style={s.loadWrap}>
        <ActivityIndicator size="large" color="#FF2D55" />
        <Text style={s.loadText}>VERIFICA ACCESSO...</Text>
      </View>
    );
  }

  // Not authenticated → declarative redirect (NO router.replace)
  if (!isLoading && !token) {
    return <Redirect href="/login" />;
  }

  // Check SUPER_ADMIN role
  const role = user?.role || '';
  const isAdmin = user?.is_admin === true;
  if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && !isAdmin) {
    return (
      <View style={s.loadWrap}>
        <Ionicons name="lock-closed" size={32} color="#FF2D55" />
        <Text style={s.loadText}>ACCESSO RISERVATO AL SUPER ADMIN</Text>
        <TouchableOpacity style={s.goBackBtn} onPress={() => router.push('/(tabs)/nexus-trigger')}>
          <Text style={s.goBackText}>TORNA ALL'APP</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Sidebar */}
      <View style={[s.sidebar, { paddingTop: insets.top + 16 }]}>
        <View style={s.logoWrap}>
          <Text style={s.logoA}>ARENA</Text>
          <Text style={s.logoK}>KORE</Text>
          <View style={s.adminBadge}>
            <Text style={s.adminBadgeText}>ADMIN</Text>
          </View>
        </View>

        <ScrollView style={s.navList} showsVerticalScrollIndicator={false}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path || (item.key === 'index' && pathname === '/admin-panel');
            return (
              <TouchableOpacity
                key={item.key}
                style={[s.navItem, isActive && s.navItemActive]}
                onPress={() => router.push(item.path as any)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={isActive ? '#FF2D55' : 'rgba(255,255,255,0.4)'}
                />
                <Text style={[s.navLabel, isActive && s.navLabelActive]}>
                  {item.label}
                </Text>
                {isActive && <View style={s.activeBar} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Footer */}
        <View style={s.sideFooter}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.push('/coach-studio' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color="#00E5FF" />
            <Text style={s.backText}>COACH STUDIO</Text>
          </TouchableOpacity>
          <Text style={s.version}>SUPER ADMIN v1.0</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={s.main}>
        <Slot />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#0A0A0A' },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A', gap: 16 },
  loadText: { color: '#FF2D55', fontSize: 12, fontWeight: '800', letterSpacing: 3, fontFamily: FM },
  goBackBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#00E5FF' },
  goBackText: { color: '#00E5FF', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, fontFamily: FM },
  sidebar: {
    width: 240, backgroundColor: '#111', borderRightWidth: 1, borderRightColor: 'rgba(255,45,85,0.15)',
    paddingHorizontal: 16, paddingBottom: 16,
  },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 32 },
  logoA: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 2, fontFamily: FM },
  logoK: { color: '#FF2D55', fontSize: 20, fontWeight: '900', letterSpacing: 2, fontFamily: FM },
  adminBadge: {
    backgroundColor: 'rgba(255,45,85,0.15)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8,
    borderWidth: 1, borderColor: 'rgba(255,45,85,0.3)',
  },
  adminBadgeText: { color: '#FF2D55', fontSize: 8, fontWeight: '900', letterSpacing: 2, fontFamily: FM },
  navList: { flex: 1 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10,
    marginBottom: 4, position: 'relative' as const,
  },
  navItemActive: { backgroundColor: 'rgba(255,45,85,0.08)' },
  navLabel: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, fontFamily: FM,
  },
  navLabelActive: { color: '#FF2D55' },
  activeBar: {
    position: 'absolute' as const, left: 0, top: '25%' as any, bottom: '25%' as any,
    width: 3, backgroundColor: '#FF2D55', borderRadius: 2,
  },
  sideFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { color: '#00E5FF', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, fontFamily: FM },
  version: { color: 'rgba(255,255,255,0.15)', fontSize: 9, fontWeight: '600', marginTop: 12, fontFamily: FM },
  main: { flex: 1 },
});
