/**
 * ARENAKORE — KORE VAULT
 * Premium Tool Shop nel tab KORE.
 * Mostra AK balance, tools disponibili, animazione unlock.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, FadeIn,
  useSharedValue, withSequence, withTiming, withRepeat,
  useAnimatedStyle, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

// ── AK Balance Badge ─────────────────────────────────────────────────────────
export function AKBadge({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const ak = user?.ak_credits ?? 0;
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1, false
    );
  }, []);
  const glow = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  if (compact) {
    return (
      <Animated.View style={[ak$.badgeCompact, glow]}>
        <Text style={ak$.badgeIcon}></Text>
        <Text style={ak$.badgeValCompact}>{ak}</Text>
      </Animated.View>
    );
  }
  return (
    <Animated.View style={[ak$.badge, glow]}>
      <Text style={ak$.badgeIcon}></Text>
      <View>
        <Text style={ak$.badgeVal}>{ak.toLocaleString()}</Text>
        <Text style={ak$.badgeLabel}>FLUX</Text>
      </View>
    </Animated.View>
  );
}

const ak$ = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  badgeIcon: { fontSize: 20 },
  badgeVal: { color: '#FFD700', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  badgeLabel: { color: 'rgba(255,215,0,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  badgeCompact: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)' },
  badgeValCompact: { color: '#FFD700', fontSize: 12, fontWeight: '900' },
});

// ── Tool Card ─────────────────────────────────────────────────────────────────
function ToolCard({ tool, ak, onUnlock, unlocking }: { tool: any; ak: number; onUnlock: (id: string) => void; unlocking: string | null }) {
  const isUnlocking = unlocking === tool.id;
  const spin = useSharedValue(0);

  useEffect(() => {
    if (isUnlocking) {
      spin.value = withRepeat(withTiming(1, { duration: 600, easing: Easing.linear }), -1, false);
    } else {
      spin.value = 0;
    }
  }, [isUnlocking]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const canAfford = !tool.requires_pro && ak >= tool.cost_ak;

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={[tc$.card, tool.is_unlocked && tc$.cardUnlocked]}>
      {/* Icon */}
      <View style={[tc$.iconWrap, { backgroundColor: tool.color + '18' }]}>
        {isUnlocking ? (
          <Animated.View style={spinStyle}>
            <Ionicons name="reload" size={22} color={tool.color} />
          </Animated.View>
        ) : tool.is_unlocked ? (
          <Ionicons name="checkmark-circle" size={22} color={tool.color} />
        ) : (
          <Ionicons name={tool.icon || 'flash'} size={22} color={tool.color} />
        )}
      </View>

      {/* Info */}
      <View style={tc$.info}>
        <Text style={tc$.name}>{tool.name}</Text>
        <Text style={tc$.desc}>{tool.description}</Text>
        {tool.locked_reason && !tool.is_unlocked && (
          <Text style={[tc$.lockedReason, { color: tool.requires_pro ? '#FF9500' : 'rgba(255,255,255,0.3)' }]}>
            {tool.locked_reason}
          </Text>
        )}
      </View>

      {/* CTA */}
      {tool.is_unlocked ? (
        <View style={[tc$.unlockedBadge, { borderColor: tool.color + '50' }]}>
          <Text style={[tc$.unlockedText, { color: tool.color }]}>ATTIVO</Text>
        </View>
      ) : tool.requires_pro ? (
        <View style={tc$.proBadge}>
          <Ionicons name="lock-closed" size={10} color="#FF9500" />
          <Text style={tc$.proText}>PRO</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[tc$.unlockBtn, !canAfford && tc$.unlockBtnOff]}
          onPress={() => canAfford ? onUnlock(tool.id) : Alert.alert('AK INSUFFICIENTI', `Servono ${tool.cost_ak} AK. Hai ${ak} AK.\nFai più Scan Nexus per guadagnare AK.`)}
          disabled={isUnlocking}
          activeOpacity={0.85}
        >
          {isUnlocking ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Text style={[tc$.unlockCost, !canAfford && { color: 'rgba(255,255,255,0.3)' }]}>{tool.cost_ak}</Text>
              <Text style={[tc$.unlockLabel, !canAfford && { color: 'rgba(255,255,255,0.3)' }]}>SBLOCCA</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const tc$ = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardUnlocked: { borderColor: 'rgba(0,255,135,0.2)', backgroundColor: 'rgba(0,255,135,0.03)' },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 3 },
  name: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  desc: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '300', lineHeight: 15 },
  lockedReason: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
  unlockedBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  unlockedText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  proBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,149,0,0.08)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,149,0,0.25)' },
  proText: { color: '#FF9500', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  unlockBtn: { alignItems: 'center', backgroundColor: '#FFD700', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minWidth: 64 },
  unlockBtnOff: { backgroundColor: 'rgba(255,255,255,0.06)' },
  unlockCost: { color: '#000', fontSize: 12, fontWeight: '900' },
  unlockLabel: { color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
});

// ── Earn Guide ────────────────────────────────────────────────────────────────
function EarnGuide() {
  const RULES = [
    { icon: 'scan', label: 'Scan Nexus', ak: '+10', color: '#00E5FF' },
    { icon: 'flash', label: 'Vittoria PvP', ak: '+50', color: '#FFD700' },
    { icon: 'shield', label: 'Crew Battle Win', ak: '+100', color: '#FF3B30' },
    { icon: 'calendar', label: 'Login Giornaliero', ak: '+5', color: '#00FF87' },
  ];
  return (
    <View style={eg$.wrap}>
      <Text style={eg$.title}>COME GUADAGNARE AK</Text>
      <View style={eg$.grid}>
        {RULES.map(r => (
          <View key={r.label} style={eg$.item}>
            <Ionicons name={r.icon as any} size={16} color={r.color} />
            <Text style={eg$.label}>{r.label}</Text>
            <Text style={[eg$.ak, { color: r.color }]}>{r.ak}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const eg$ = StyleSheet.create({
  wrap: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  title: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: { flex: 1, minWidth: '44%', flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '400' },
  ak: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
});

// ── Main KORE VAULT ───────────────────────────────────────────────────────────
export function KoreVault() {
  const { token, user, updateUser } = useAuth();
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const ak = user?.ak_credits ?? 0;

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await api.getAKTools(token);
      setTools(d.tools || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleUnlock = async (toolId: string) => {
    if (!token) return;
    setUnlocking(toolId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const result = await api.unlockTool(toolId, token);
      if (result.status === 'unlocked') {
        // Unlock animation — haptic + update
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        const tool = tools.find(t => t.id === toolId);
        Alert.alert(
          '🔓 SBLOCCATO',
          `${tool?.name} è ora attivo nel tuo profilo.\n\nAK rimanenti: ${result.ak_credits}`
        );
        // Update user's ak_credits and unlocked_tools in context
        updateUser?.({ ...user, ak_credits: result.ak_credits, unlocked_tools: result.unlocked_tools });
        load();
      }
    } catch (e: any) {
      Alert.alert('ERRORE', e?.message || 'Impossibile sbloccare');
    } finally {
      setUnlocking(null);
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={kv$.container}>
      {/* Header */}
      <View style={kv$.header}>
        <View style={kv$.headerLeft}>
          <View style={kv$.dot} />
          <Text style={kv$.title}>KORE VAULT</Text>
        </View>
        <AKBadge />
      </View>
      <Text style={kv$.subtitle}>Sblocca tool premium con i tuoi FLUX</Text>

      {loading ? (
        <ActivityIndicator color="#FFD700" size="small" style={{ marginTop: 20 }} />
      ) : (
        <View style={kv$.toolsList}>
          {tools.map(tool => (
            <ToolCard
              key={tool.id}
              tool={tool}
              ak={ak}
              onUnlock={handleUnlock}
              unlocking={unlocking}
            />
          ))}
        </View>
      )}

      {/* Earn guide */}
      <EarnGuide />
    </Animated.View>
  );
}

const kv$ = StyleSheet.create({
  container: { marginHorizontal: 24, marginBottom: 16, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFD700', shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6 },
  title: { color: '#FFD700', fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '300', marginTop: -4 },
  toolsList: { gap: 8 },
});

// ── ToolLock Overlay (per lock sui singoli moduli) ─────────────────────────────
export function ToolLock({ toolId, toolName, costAk, requiresPro = false, onNavigate }: {
  toolId: string;
  toolName: string;
  costAk: number;
  requiresPro?: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  const isUnlocked = user?.unlocked_tools?.includes(toolId);
  if (isUnlocked) return null;

  return (
    <View style={tl$.overlay}>
      <Ionicons name="lock-closed" size={24} color="#FFD700" />
      <Text style={tl$.name}>{toolName}</Text>
      {requiresPro ? (
        <View style={tl$.proPill}><Text style={tl$.proText}>RISERVATO A PRO / ENTERPRISE</Text></View>
      ) : (
        <Text style={tl$.cost}>Sblocca con <Text style={{ color: '#FFD700', fontWeight: '900' }}>{costAk} AK</Text></Text>
      )}
      {onNavigate && (
        <TouchableOpacity style={tl$.cta} onPress={onNavigate} activeOpacity={0.85}>
          <Text style={tl$.ctaText}>{requiresPro ? 'UPGRADE PLAN' : 'VAI AL KORE VAULT'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const tl$ = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.82)', borderRadius: 16, zIndex: 50, alignItems: 'center', justifyContent: 'center', gap: 8 },
  name: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  cost: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '300' },
  proPill: { backgroundColor: 'rgba(255,149,0,0.1)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,149,0,0.3)' },
  proText: { color: '#FF9500', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  cta: { marginTop: 6, backgroundColor: 'rgba(255,215,0,0.12)', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 8, borderWidth: 1, borderColor: '#FFD700' },
  ctaText: { color: '#FFD700', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
});
