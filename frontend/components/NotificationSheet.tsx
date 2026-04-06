/**
 * ARENAKORE — NotificationSheet
 * Bottom Sheet modale per le notifiche.
 * Se non ci sono notifiche → messaggio elegante "Sei in regola, Kore."
 */
import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInDown, FadeInDown } from 'react-native-reanimated';
import { EL, FONT_MONT, FONT_JAKARTA } from '../utils/eliteTheme';

export interface Notification {
  id: string;
  type: 'challenge' | 'flux' | 'system' | 'crew' | 'rank';
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  challenge: { icon: 'flash', color: '#FF9500' },
  flux:      { icon: 'diamond', color: '#00E5FF' },
  system:    { icon: 'shield-checkmark', color: '#34C759' },
  crew:      { icon: 'people', color: '#007AFF' },
  rank:      { icon: 'trophy', color: '#FFD700' },
};

interface Props {
  visible: boolean;
  onClose: () => void;
  notifications: Notification[];
}

export function NotificationSheet({ visible, onClose, notifications }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(200)} style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <Animated.View entering={SlideInDown.springify().damping(18).stiffness(140)} style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Title */}
          <View style={s.titleRow}>
            <Ionicons name="notifications" size={20} color={EL.CYAN} />
            <Text style={s.title}>NOTIFICHE</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={24} color={EL.TEXT_SEC} />
            </TouchableOpacity>
          </View>

          {notifications.length === 0 ? (
            /* ═══ EMPTY STATE ═══ */
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="checkmark-circle" size={48} color="#34C759" />
              </View>
              <Text style={s.emptyTitle}>TUTTO IN ORDINE</Text>
              <Text style={s.emptyBody}>Nessuna nuova notifica.{'\n'}Sei in regola, Kore.</Text>
            </Animated.View>
          ) : (
            /* ═══ NOTIFICATION LIST ═══ */
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              style={s.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.system;
                return (
                  <Animated.View entering={FadeInDown.delay(index * 80).duration(300)}>
                    <View style={[s.notifCard, !item.read && s.notifUnread]}>
                      <View style={[s.notifIcon, { backgroundColor: `${cfg.color}15` }]}>
                        <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                      </View>
                      <View style={s.notifContent}>
                        <Text style={s.notifTitle}>{item.title}</Text>
                        <Text style={s.notifBody} numberOfLines={2}>{item.body}</Text>
                      </View>
                      <Text style={s.notifTime}>{item.time}</Text>
                    </View>
                  </Animated.View>
                );
              }}
            />
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: EL.CARD_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '70%',
    minHeight: 280,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  title: {
    fontFamily: FONT_MONT,
    fontWeight: '800',
    fontSize: 18,
    color: EL.TEXT,
    letterSpacing: 1.5,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(52,199,89,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: FONT_MONT,
    fontWeight: '800',
    fontSize: 16,
    color: EL.TEXT,
    letterSpacing: 2,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: FONT_MONT,
    fontWeight: '400',
    fontSize: 14,
    color: EL.TEXT_SEC,
    textAlign: 'center',
    lineHeight: 22,
  },
  // List
  list: {
    flex: 1,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: EL.BORDER,
  },
  notifUnread: {
    backgroundColor: 'rgba(0,229,255,0.03)',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontFamily: FONT_MONT,
    fontWeight: '700',
    fontSize: 13,
    color: EL.TEXT,
    letterSpacing: 0.3,
  },
  notifBody: {
    fontFamily: FONT_MONT,
    fontWeight: '400',
    fontSize: 12,
    color: EL.TEXT_SEC,
    marginTop: 2,
    lineHeight: 17,
  },
  notifTime: {
    fontFamily: FONT_JAKARTA,
    fontWeight: '600',
    fontSize: 11,
    color: EL.TEXT_TER,
  },
});
