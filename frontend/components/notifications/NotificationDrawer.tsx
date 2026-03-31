/**
 * ARENAKORE — NOTIFICATION DRAWER
 * Sprint 9: Bio-Evolution in-app notification panel
 * Nike Elite: zero emoji, Cyan/Gold/White, Bold Sans-Serif, dark modal
 */
import React, { useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, Platform,
} from 'react-native';
import Animated, {
  useSharedValue, withTiming, withSpring, useAnimatedStyle, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  icon: string;
  accent_color: string;
  created_at: string | null;
}

interface NotificationDrawerProps {
  visible: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

function timeAgo(isoString: string | null): string {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}G FA`;
  if (hours > 0) return `${hours}H FA`;
  if (minutes > 0) return `${minutes}M FA`;
  return 'ORA';
}

export function NotificationDrawer({
  visible, onClose, notifications, unreadCount, onMarkRead, onMarkAllRead,
}: NotificationDrawerProps) {
  const slideY = useSharedValue(60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 250 });
      slideY.value = withSpring(0, { damping: 16, stiffness: 120 });
    } else {
      opacity.value = withTiming(0, { duration: 180 });
      slideY.value = withTiming(60, { duration: 200 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  function renderItem({ item }: { item: Notification }) {
    const isUnread = !item.read;
    return (
      <TouchableOpacity
        style={[styles.notifRow, isUnread && styles.notifRowUnread]}
        onPress={() => !item.read && onMarkRead(item.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconWrap, { backgroundColor: item.accent_color + '18', borderColor: item.accent_color + '33' }]}>
          <Ionicons name={item.icon as any} size={14} color={item.accent_color} />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifTitleRow}>
            <Text style={[styles.notifTitle, isUnread && styles.notifTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[styles.panel, panelStyle]}>
          <LinearGradient colors={['#0d0d0d', '#080808']} style={styles.panelGradient}>
            {/* Header */}
            <View style={styles.panelHeader}>
              <View style={styles.panelTitleRow}>
                <Ionicons name="notifications" size={14} color="#00F2FF" />
                <Text style={styles.panelTitle}>NOTIFICHE</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <View style={styles.panelActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={onMarkAllRead} style={styles.markAllBtn} activeOpacity={0.8}>
                    <Text style={styles.markAllText}>LEGGI TUTTE</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* List */}
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={32} color="rgba(255,255,255,0.50)" />
                <Text style={styles.emptyText}>NESSUNA NOTIFICA</Text>
                <Text style={styles.emptySubText}>Le tue notifiche Bio-Evolution appariranno qui</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                style={styles.list}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                showsVerticalScrollIndicator={false}
              />
            )}
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2,2,2,0.72)',
  },
  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '75%',
    borderTopWidth: 1,
    borderColor: 'rgba(0,242,255,0.65)',
  },
  panelGradient: { paddingBottom: 40 },
  panelHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
  },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  unreadBadge: {
    backgroundColor: '#00F2FF', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
    minWidth: 20, alignItems: 'center',
  },
  unreadBadgeText: { color: '#000', fontSize: 12, fontWeight: '900' },
  panelActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  markAllBtn: {
    backgroundColor: 'rgba(0,242,255,0.65)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.65)',
  },
  markAllText: { color: '#00F2FF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  closeBtn: { padding: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  list: { flexGrow: 0 },
  notifRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 14, gap: 14,
  },
  notifRowUnread: { backgroundColor: 'rgba(0,242,255,0.025)' },
  iconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, flexShrink: 0,
  },
  notifContent: { flex: 1, gap: 3 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notifTitle: { flex: 1, color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  notifTitleUnread: { color: '#FFFFFF' },
  unreadDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#00F2FF' },
  notifBody: { color: 'rgba(255,255,255,0.4)', fontSize: 15, lineHeight: 17, fontWeight: '500' },
  notifTime: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 72 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  emptySubText: { color: 'rgba(255,255,255,0.50)', fontSize: 14, textAlign: 'center', lineHeight: 18 },
});
