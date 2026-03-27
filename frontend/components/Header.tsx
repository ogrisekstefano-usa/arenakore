import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  Pressable, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.78;

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const translateX = useSharedValue(DRAWER_WIDTH);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const openDrawer = () => {
    setDrawerOpen(true);
    translateX.value = withTiming(0, { duration: 280 });
  };

  const closeDrawer = () => {
    translateX.value = withTiming(DRAWER_WIDTH, { duration: 250 });
    setTimeout(() => setDrawerOpen(false), 260);
  };

  const handleLogout = () => {
    closeDrawer();
    setTimeout(() => {
      logout();
      router.replace('/');
    }, 300);
  };

  const initials = user?.username?.[0]?.toUpperCase() || '?';

  return (
    <>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity testID="header-avatar" style={[styles.avatar, { backgroundColor: user?.avatar_color || '#00E5FF' }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title || 'ARENADARE'}</Text>
        <TouchableOpacity testID="header-hamburger" onPress={openDrawer} style={styles.hamburger}>
          <View style={styles.line} />
          <View style={styles.line} />
          <View style={styles.line} />
        </TouchableOpacity>
      </View>

      {drawerOpen && (
        <Modal transparent visible animateType="none" onRequestClose={closeDrawer}>
          <Pressable style={styles.backdrop} onPress={closeDrawer} />
          <Animated.View style={[styles.drawer, drawerStyle, { paddingTop: insets.top + 28 }]}>
            <Text style={styles.drawerLabel}>IMPOSTAZIONI</Text>
            <View style={styles.userRow}>
              <View style={[styles.drawerAvatar, { backgroundColor: user?.avatar_color || '#00E5FF' }]}>
                <Text style={styles.drawerAvatarText}>{initials}</Text>
              </View>
              <View>
                <Text style={styles.drawerUsername}>{user?.username}</Text>
                <Text style={styles.drawerEmail}>{user?.email}</Text>
              </View>
            </View>
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeLabel}>XP TOTALI</Text>
              <Text style={styles.xpBadgeValue}>{user?.xp || 0}</Text>
            </View>
            <View style={styles.divider} />
            <TouchableOpacity testID="drawer-account" style={styles.drawerItem}>
              <Text style={styles.drawerItemIcon}>👤</Text>
              <Text style={styles.drawerItemText}>Account</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="drawer-subscription" style={styles.drawerItem}>
              <Text style={styles.drawerItemIcon}>⭐</Text>
              <Text style={styles.drawerItemText}>Abbonamento</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity testID="drawer-logout" onPress={handleLogout} style={styles.drawerItem}>
              <Text style={styles.drawerItemIcon}>🚪</Text>
              <Text style={[styles.drawerItemText, { color: '#FF3B30' }]}>Esci</Text>
            </TouchableOpacity>
          </Animated.View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#050505',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#050505', fontWeight: '800', fontSize: 16 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  hamburger: { padding: 8 },
  line: { width: 22, height: 2, backgroundColor: '#FFFFFF', borderRadius: 1, marginVertical: 2.5 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#111111',
    paddingHorizontal: 24,
    borderLeftWidth: 1,
    borderLeftColor: '#222222',
  },
  drawerLabel: { color: '#00E5FF', fontSize: 11, fontWeight: '700', letterSpacing: 3, marginBottom: 20 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  drawerAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  drawerAvatarText: { color: '#050505', fontWeight: '800', fontSize: 20 },
  drawerUsername: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  drawerEmail: { color: '#555555', fontSize: 13, marginTop: 2 },
  xpBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  xpBadgeLabel: { color: '#777777', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  xpBadgeValue: { color: '#FFD700', fontSize: 16, fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#1E1E1E', marginVertical: 10 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  drawerItemIcon: { fontSize: 20 },
  drawerItemText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
});
