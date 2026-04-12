/**
 * LIVE MONITOR — Real-time scan monitoring panel
 * WebSocket primary, polling fallback every 8s
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, useSharedValue, withSequence, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

interface LiveEvent {
  type: string;
  athlete: string;
  avatar_color?: string;
  reps?: number;
  quality?: number;
  xp_earned?: number;
  timestamp?: string;
  age_secs?: number;
  isNew?: boolean;
}

function EventRow({ event, idx }: { event: LiveEvent & { isNew?: boolean }; idx: number }) {
  const glow = useSharedValue(event.isNew ? 1 : 0);
  useEffect(() => {
    if (event.isNew) {
      glow.value = withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 2500 }));
    }
  }, [event.isNew]);
  const glowStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0,229,255,${glow.value * 0.08})`,
    borderLeftColor: `rgba(0,229,255,${0.2 + glow.value * 0.7})`
  }));

  const age = event.age_secs ?? 0;
  const ageLabel = age < 60 ? `${age}s fa` : age < 3600 ? `${Math.floor(age / 60)}m fa` : `${Math.floor(age / 3600)}h fa`;

  return (
    <Animated.View
      entering={FadeInDown.delay(idx * 30).duration(200)}
      style={[e$.row, glowStyle]}
    >
      <View style={[e$.avatar, { backgroundColor: event.avatar_color || '#00E5FF' }]}>
        <Text style={e$.avatarLetter}>{(event.athlete || '?')[0].toUpperCase()}</Text>
      </View>
      <View style={e$.info}>
        <Text style={e$.name}>{event.athlete}</Text>
        <Text style={e$.detail}>
          {event.reps ? `${event.reps} REP` : '—'}
          {event.quality ? ` · Q${Math.round(event.quality)}%` : ''}
        </Text>
      </View>
      <View style={e$.right}>
        {event.xp_earned ? <Text style={e$.xp}>+{event.xp_earned} FLUX</Text> : null}
        <Text style={e$.age}>{ageLabel}</Text>
      </View>
    </Animated.View>
  );
}

const e$ = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderLeftWidth: 2, borderRadius: 4, marginBottom: 2 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#000', fontSize: 14, fontWeight: '900' },
  info: { flex: 1, gap: 1 },
  name: { color: '#FFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  detail: { color: 'rgba(255,255,255,0.30)', fontSize: 12, fontWeight: '300' },
  right: { alignItems: 'flex-end', gap: 1 },
  xp: { color: '#FFD700', fontSize: 13, fontWeight: '900' },
  age: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '300' }
});

export function LiveMonitorPanel({ gymId }: { gymId: string | null | undefined }) {
  const { token } = useAuth();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const lastEventIds = useRef(new Set<string>());

  const mergeEvents = useCallback((newEvents: LiveEvent[]) => {
    setEvents(prev => {
      const merged = [...newEvents.slice(0, 15)];
      return merged;
    });
  }, []);

  const pollFallback = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getLiveEvents(token);
      const evts = (data.events || []).map((e: LiveEvent, i: number) => ({
        ...e,
        isNew: i === 0 && !lastEventIds.current.has(e.timestamp || String(i))
      }));
      if (evts[0]?.timestamp) lastEventIds.current.add(evts[0].timestamp);
      mergeEvents(evts);
    } catch (_) {}
  }, [token, mergeEvents]);

  useEffect(() => {
    if (!token || !gymId || Platform.OS !== 'web') return;

    // Try WebSocket
    try {
      const baseUrl = 'https://arenakore-api-v2.onrender.com' || 'https://arena-scan-lab.preview.emergentagent.com';
      const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
      const ws = new WebSocket(`${wsUrl}/api/ws/live-monitor/${gymId}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };
      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.type === 'scan_complete') {
            const newEvent: LiveEvent = { ...data, isNew: true, age_secs: 0 };
            setEvents(prev => [newEvent, ...prev.slice(0, 14)]);
          }
        } catch (_) {}
      };
      ws.onerror = () => {
        setConnected(false);
        // Start polling fallback
        pollFallback();
      };
      ws.onclose = () => setConnected(false);
    } catch (_) {
      // WS not supported, use polling
    }

    // Always also poll as backup/initial load
    pollFallback();
    const iv = setInterval(pollFallback, 8000);

    return () => {
      clearInterval(iv);
      wsRef.current?.close();
    };
  }, [token, gymId]);

  return (
    <View style={lm$.card}>
      <View style={lm$.header}>
        <View style={lm$.headerLeft}>
          <View style={[lm$.statusDot, { backgroundColor: connected ? '#00FF87' : '#FF9500' }]} />
          <Text style={lm$.title}>LIVE NOW</Text>
        </View>
        <Text style={lm$.sub}>{connected ? 'WebSocket · Real-time' : 'Polling · 8s'}</Text>
      </View>

      {events.length === 0 ? (
        <View style={lm$.empty}>
          <Ionicons name="scan-outline" size={22} color="rgba(255,255,255,0.1)" />
          <Text style={lm$.emptyText}>In attesa dei Kore...{'\n'}Quando un Kore completa uno scan, apparirà qui.</Text>
        </View>
      ) : (
        events.map((evt, i) => <EventRow key={`${evt.athlete}-${evt.timestamp}-${i}`} event={evt} idx={i} />)
      )}
    </View>
  );
}

const lm$ = StyleSheet.create({
  card: { backgroundColor: '#0A0A0A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1E1E1E', minHeight: 180 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  title: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  sub: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: '300', letterSpacing: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 10 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 14, textAlign: 'center', lineHeight: 18 }
});
