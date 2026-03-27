/**
 * ARENAKORE — KORE TAB v4.0 — SPRINT 6
 * Interactive Banners + PRO Challenge Gating + Access Denied Cinema
 * Nike Elite Aesthetic — Zero emoji, Bold Sans-Serif, Ionicons only
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, Dimensions, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, FadeIn,
  useSharedValue, withRepeat, withSequence, withTiming, useAnimatedStyle,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { Header } from '../../components/Header';

const { width: SW, height: SH } = Dimensions.get('window');

// Banner hero images
const BATTLE_IMAGES = [
  'https://images.unsplash.com/photo-1710736460914-4a7f22d736c4?w=800&q=60',
  'https://images.unsplash.com/photo-1698788067684-2053c651bfed?w=800&q=60',
  'https://images.unsplash.com/photo-1709315957145-a4bad1feef28?w=800&q=60',
  'https://images.pexels.com/photos/1075935/pexels-photo-1075935.jpeg?w=800&q=60',
  'https://images.unsplash.com/photo-1590285372176-c3ff4d8c9399?w=800&q=60',
  'https://images.unsplash.com/photo-1582086772405-6e2dcef428d4?w=800&q=60',
  'https://images.pexels.com/photos/7479526/pexels-photo-7479526.jpeg?w=800&q=60',
  'https://images.unsplash.com/photo-1529478562208-d4c746edcb79?w=800&q=60',
];

const PRO_IMAGES = [
  'https://images.unsplash.com/photo-1709315957145-a4bad1feef28?w=800&q=60',
  'https://images.unsplash.com/photo-1710736460914-4a7f22d736c4?w=800&q=60',
  'https://images.pexels.com/photos/1075935/pexels-photo-1075935.jpeg?w=800&q=60',
];

const STATUS_CFG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  live:      { label: 'LIVE',      color: '#FF3B30', icon: 'radio' },
  upcoming:  { label: 'PROSSIMO',  color: '#D4AF37', icon: 'time' },
  completed: { label: 'CONCLUSO',  color: '#555',    icon: 'checkmark-done' },
};

const DNA_LABELS: Record<string, string> = {
  velocita: 'VEL', forza: 'FOR', resistenza: 'RES',
  agilita: 'AGI', tecnica: 'TEC', potenza: 'POT',
};

type Battle = {
  id: string; title: string; description: string; sport: string;
  status: string; xp_reward: number; participants_count: number;
  exercise: string; forge_mode: string; pro_level: boolean;
  dna_requirements: Record<string, number> | null;
};

// ========== DNA CHECK LOGIC ==========
function checkDNAAccess(userDNA: any, requirements: Record<string, number> | null): {
  hasAccess: boolean; failures: { stat: string; required: number; current: number }[];
} {
  if (!requirements) return { hasAccess: true, failures: [] };
  const failures: { stat: string; required: number; current: number }[] = [];
  for (const [stat, requiredVal] of Object.entries(requirements)) {
    const current = userDNA?.[stat] || 0;
    if (current < requiredVal) {
      failures.push({ stat, required: requiredVal, current: Math.round(current) });
    }
  }
  return { hasAccess: failures.length === 0, failures };
}

// ========== ACCESS DENIED MODAL ==========
function AccessDeniedModal({ visible, onClose, battle, failures, userDNA }: {
  visible: boolean; onClose: () => void;
  battle: Battle | null; failures: { stat: string; required: number; current: number }[];
  userDNA: any;
}) {
  const glitch = useSharedValue(1);
  const lockPulse = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      glitch.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 80 }),
          withTiming(1, { duration: 80 }),
          withTiming(0.9, { duration: 60 }),
          withTiming(1, { duration: 200 }),
        ), 3, false
      );
      lockPulse.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ), -1, false
      );
    }
  }, [visible]);

  const glitchStyle = useAnimatedStyle(() => ({ opacity: glitch.value }));
  const lockStyle = useAnimatedStyle(() => ({ transform: [{ scale: lockPulse.value }] }));

  if (!visible || !battle) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={ad$.backdrop}>
        <Animated.View entering={FadeInDown.duration(400)} style={ad$.card}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={ad$.scroll}>
          <LinearGradient colors={['rgba(255,59,48,0.08)', '#0A0A0A', '#050505']} style={ad$.grad}>
            {/* Lock icon */}
            <Animated.View style={[ad$.lockCircle, lockStyle]}>
              <Ionicons name="lock-closed" size={36} color="#D4AF37" />
            </Animated.View>

            {/* Title */}
            <Animated.View style={glitchStyle}>
              <Text style={ad$.title}>ACCESS DENIED</Text>
            </Animated.View>
            <Text style={ad$.subtitle}>DNA SCORE INSUFFICIENT</Text>

            {/* Battle info */}
            <View style={ad$.battleInfo}>
              <Text style={ad$.battleName}>{battle.title}</Text>
              <View style={ad$.xpRow}>
                <Ionicons name="flash" size={12} color="#D4AF37" />
                <Text style={ad$.xpText}>{battle.xp_reward} XP IN PALIO</Text>
              </View>
            </View>

            {/* DNA Requirements Grid */}
            <View style={ad$.reqSection}>
              <Text style={ad$.reqTitle}>REQUISITI DNA</Text>
              {failures.map((f, i) => {
                const pct = Math.min(100, (f.current / f.required) * 100);
                return (
                  <Animated.View key={f.stat} entering={FadeInDown.delay(200 + i * 100)}>
                    <View style={ad$.reqRow}>
                      <View style={ad$.reqHeader}>
                        <Text style={ad$.reqStatLabel}>{DNA_LABELS[f.stat] || f.stat.toUpperCase()}</Text>
                        <View style={ad$.reqValues}>
                          <Text style={ad$.reqCurrent}>{f.current}</Text>
                          <Text style={ad$.reqSlash}>/</Text>
                          <Text style={ad$.reqRequired}>{f.required}</Text>
                        </View>
                      </View>
                      <View style={ad$.reqBar}>
                        <View style={[ad$.reqBarFill, { width: `${pct}%` as any }]} />
                        <View style={[ad$.reqBarTarget, { left: `${Math.min(98, (f.required / (f.required + 20)) * 100)}%` as any }]} />
                      </View>
                      <Text style={ad$.reqDelta}>
                        {f.required - f.current > 0
                          ? `MANCANO ${f.required - f.current} PUNTI`
                          : 'RAGGIUNTO'}
                      </Text>
                    </View>
                  </Animated.View>
                );
              })}
            </View>

            {/* Instruction */}
            <View style={ad$.instruction}>
              <Ionicons name="analytics" size={14} color="#00F2FF" />
              <Text style={ad$.instructionText}>
                Raggiungi il livello PRO nel NEXUS SCAN per sfidare i Leader.
              </Text>
            </View>

            {/* Actions */}
            <TouchableOpacity style={ad$.trainBtn} onPress={onClose} activeOpacity={0.85}>
              <LinearGradient colors={['#00F2FF', '#009DB3']} style={ad$.trainGrad}>
                <Ionicons name="flash" size={18} color="#050505" />
                <Text style={ad$.trainText}>VAI AL NEXUS SCAN</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={ad$.closeBtn} onPress={onClose}>
              <Text style={ad$.closeText}>CHIUDI</Text>
            </TouchableOpacity>
          </LinearGradient>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const ad$ = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,5,5,0.92)', justifyContent: 'center', alignItems: 'center' },
  card: { width: SW * 0.9, maxHeight: SH * 0.85, borderRadius: 24, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,59,48,0.2)' },
  scroll: { flexGrow: 1 },
  grad: { padding: 22, alignItems: 'center', gap: 8 },
  lockCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(212,175,55,0.08)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(212,175,55,0.3)',
  },
  title: { color: '#FF3B30', fontSize: 20, fontWeight: '900', letterSpacing: 4 },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 3, marginTop: -4 },
  battleInfo: { alignItems: 'center', gap: 4, marginTop: 4 },
  battleName: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  xpText: { color: '#D4AF37', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  reqSection: { width: '100%', gap: 10, marginTop: 8 },
  reqTitle: { color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
  reqRow: { gap: 4 },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reqStatLabel: { color: '#FF3B30', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  reqValues: { flexDirection: 'row', alignItems: 'baseline' },
  reqCurrent: { color: '#FF3B30', fontSize: 18, fontWeight: '900' },
  reqSlash: { color: 'rgba(255,255,255,0.2)', fontSize: 14, marginHorizontal: 2 },
  reqRequired: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700' },
  reqBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', position: 'relative' as any },
  reqBarFill: { height: '100%', backgroundColor: '#FF3B30', borderRadius: 2 },
  reqBarTarget: { position: 'absolute', top: -2, width: 2, height: 8, backgroundColor: '#D4AF37' },
  reqDelta: { color: 'rgba(255,59,48,0.5)', fontSize: 8, fontWeight: '800', letterSpacing: 1, textAlign: 'right' },
  instruction: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,242,255,0.05)', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.1)', width: '100%',
  },
  instructionText: { flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', lineHeight: 16 },
  trainBtn: { width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  trainGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  trainText: { color: '#050505', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  closeBtn: { paddingVertical: 8 },
  closeText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '700' },
});

// ========== BATTLE CARD ==========
function BattleCard({ battle, index, isLocked, onPress }: {
  battle: Battle; index: number; isLocked: boolean; onPress: () => void;
}) {
  const st = STATUS_CFG[battle.status] || STATUS_CFG.upcoming;
  const isPro = battle.pro_level;
  const imgUri = isPro
    ? PRO_IMAGES[index % PRO_IMAGES.length]
    : BATTLE_IMAGES[index % BATTLE_IMAGES.length];

  const lockShimmer = useSharedValue(0.6);
  useEffect(() => {
    if (isLocked) {
      lockShimmer.value = withRepeat(
        withSequence(withTiming(1, { duration: 1200 }), withTiming(0.6, { duration: 1200 })),
        -1, false
      );
    }
  }, [isLocked]);
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: lockShimmer.value }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 80)}>
      <TouchableOpacity
        style={[bc$.card, isPro && bc$.proCard]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <ImageBackground source={{ uri: imgUri }} style={bc$.bg} imageStyle={bc$.bgImage}>
          <LinearGradient
            colors={isPro
              ? ['rgba(212,175,55,0.06)', 'rgba(5,5,5,0.5)', 'rgba(5,5,5,0.97)']
              : ['rgba(0,242,255,0.03)', 'rgba(5,5,5,0.45)', 'rgba(5,5,5,0.96)']}
            locations={[0, 0.3, 0.85]}
            style={bc$.gradient}
          >
            {/* Top row: Status + PRO/Lock badges */}
            <View style={bc$.topRow}>
              <View style={[bc$.statusBadge, { backgroundColor: `${st.color}18` }]}>
                {battle.status === 'live' && <View style={[bc$.dot, { backgroundColor: st.color }]} />}
                <Text style={[bc$.statusText, { color: st.color }]}>{st.label}</Text>
              </View>
              <View style={bc$.badges}>
                {isPro && (
                  <View style={bc$.proBadge}>
                    <Ionicons name="diamond" size={10} color="#D4AF37" />
                    <Text style={bc$.proText}>PRO</Text>
                  </View>
                )}
                {isLocked && (
                  <Animated.View style={[bc$.lockBadge, shimmerStyle]}>
                    <Ionicons name="lock-closed" size={12} color="#D4AF37" />
                  </Animated.View>
                )}
              </View>
            </View>

            {/* Bottom: Info */}
            <View style={bc$.bottom}>
              <Text style={bc$.title} numberOfLines={1}>{battle.title}</Text>
              <Text style={bc$.desc} numberOfLines={2}>{battle.description}</Text>
              <View style={bc$.metaRow}>
                <View style={bc$.metaItem}>
                  <Ionicons name="people" size={11} color="rgba(255,255,255,0.6)" />
                  <Text style={bc$.metaText}>{battle.participants_count}</Text>
                </View>
                <View style={bc$.metaItem}>
                  <Ionicons name="flash" size={11} color="#D4AF37" />
                  <Text style={[bc$.metaText, { color: '#D4AF37' }]}>{battle.xp_reward} XP</Text>
                </View>
                <View style={bc$.metaItem}>
                  <Ionicons name={battle.exercise === 'punch' ? 'hand-left' : 'barbell'} size={11} color="#00F2FF" />
                  <Text style={[bc$.metaText, { color: '#00F2FF' }]}>
                    {battle.exercise === 'punch' ? 'PUNCH' : 'SQUAT'}
                  </Text>
                </View>
                {isPro && battle.dna_requirements && (
                  <View style={bc$.dnaReqChips}>
                    {Object.entries(battle.dna_requirements).map(([stat, val]) => (
                      <View key={stat} style={bc$.dnaChip}>
                        <Text style={bc$.dnaChipText}>
                          {DNA_LABELS[stat] || stat.slice(0, 3).toUpperCase()} {val}+
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Locked overlay */}
            {isLocked && (
              <View style={bc$.lockedOverlay}>
                <View style={bc$.lockedGlassRow}>
                  <Ionicons name="lock-closed" size={14} color="#D4AF37" />
                  <Text style={bc$.lockedText}>DNA INSUFFICIENTE</Text>
                </View>
              </View>
            )}
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
}

const bc$ = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 18,
    overflow: 'hidden', height: 190, borderWidth: 1, borderColor: 'rgba(0,242,255,0.08)',
  },
  proCard: { borderColor: 'rgba(212,175,55,0.2)', borderWidth: 1.5 },
  bg: { flex: 1 },
  bgImage: { borderRadius: 18 },
  gradient: { flex: 1, padding: 16, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  badges: { flexDirection: 'row', gap: 6 },
  proBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(212,175,55,0.2)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#D4AF37',
  },
  proText: { color: '#D4AF37', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  lockBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(212,175,55,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)',
  },
  bottom: { gap: 4 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  desc: { color: 'rgba(255,255,255,0.55)', fontSize: 11, lineHeight: 16, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  dnaReqChips: { flexDirection: 'row', gap: 4 },
  dnaChip: {
    backgroundColor: 'rgba(212,175,55,0.1)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
  },
  dnaChipText: { color: '#D4AF37', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  lockedOverlay: {
    position: 'absolute', top: 60, left: 16, right: 16,
    alignItems: 'center',
  },
  lockedGlassRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.15)',
  },
  lockedText: { color: '#D4AF37', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
});

// ========== MAIN KORE TAB ==========
export default function KoreTab() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Access Denied state
  const [deniedBattle, setDeniedBattle] = useState<Battle | null>(null);
  const [deniedFailures, setDeniedFailures] = useState<{ stat: string; required: number; current: number }[]>([]);
  const [showDenied, setShowDenied] = useState(false);

  const loadBattles = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getBattles(token);
      setBattles(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { loadBattles(); }, [loadBattles]);

  const handleBattlePress = (battle: Battle) => {
    if (battle.status === 'completed') return; // Can't join completed battles

    // Check PRO gating
    if (battle.pro_level && battle.dna_requirements) {
      const { hasAccess, failures } = checkDNAAccess(user?.dna, battle.dna_requirements);
      if (!hasAccess) {
        setDeniedBattle(battle);
        setDeniedFailures(failures);
        setShowDenied(true);
        return;
      }
    }

    // Navigate to NEXUS with pre-selected exercise and forge mode
    router.push({
      pathname: '/(tabs)/nexus-trigger',
      params: {
        autoStart: 'true',
        exercise: battle.exercise || 'squat',
        forgeMode: battle.forge_mode || 'battle',
        battleId: battle.id,
        battleTitle: battle.title,
      },
    });
  };

  const handleDeniedClose = () => {
    setShowDenied(false);
    setDeniedBattle(null);
    setDeniedFailures([]);
  };

  const openBattles = battles.filter(b => !b.pro_level);
  const proBattles = battles.filter(b => b.pro_level);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <Header title="ARENA KORE" />

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#00F2FF" size="large" /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBattles(); }} tintColor="#00F2FF" />}
        >
          {/* User DNA Summary */}
          {user?.dna && (
            <Animated.View entering={FadeIn.duration(400)}>
              <View style={s.dnaBar}>
                <Ionicons name="analytics" size={14} color="#00F2FF" />
                <Text style={s.dnaBarLabel}>IL TUO DNA</Text>
                {Object.entries(user.dna).slice(0, 6).map(([k, v]: [string, any]) => (
                  <View key={k} style={s.dnaStat}>
                    <Text style={s.dnaStatVal}>{Math.round(v)}</Text>
                    <Text style={s.dnaStatLabel}>{DNA_LABELS[k] || k.slice(0, 3).toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* OPEN CHALLENGES */}
          <View style={s.sectionRow}>
            <Ionicons name="flash" size={14} color="#00F2FF" />
            <Text style={s.sectionTitle}>SFIDE APERTE</Text>
            <Text style={s.sectionCount}>{openBattles.length}</Text>
          </View>

          {openBattles.map((battle, i) => (
            <BattleCard
              key={battle.id}
              battle={battle}
              index={i}
              isLocked={false}
              onPress={() => handleBattlePress(battle)}
            />
          ))}

          {/* PRO CHALLENGES */}
          {proBattles.length > 0 && (
            <>
              <View style={s.proDivider}>
                <View style={s.proDividerLine} />
                <View style={s.proDividerBadge}>
                  <Ionicons name="diamond" size={12} color="#D4AF37" />
                  <Text style={s.proDividerText}>ELITE DIVISION</Text>
                </View>
                <View style={s.proDividerLine} />
              </View>

              {proBattles.map((battle, i) => {
                const { hasAccess } = checkDNAAccess(user?.dna, battle.dna_requirements);
                return (
                  <BattleCard
                    key={battle.id}
                    battle={battle}
                    index={openBattles.length + i}
                    isLocked={!hasAccess}
                    onPress={() => handleBattlePress(battle)}
                  />
                );
              })}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Access Denied Modal */}
      <AccessDeniedModal
        visible={showDenied}
        onClose={handleDeniedClose}
        battle={deniedBattle}
        failures={deniedFailures}
        userDNA={user?.dna}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dnaBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    backgroundColor: 'rgba(0,242,255,0.04)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(0,242,255,0.08)',
  },
  dnaBarLabel: {
    color: '#00F2FF', fontSize: 8, fontWeight: '900', letterSpacing: 2,
    marginRight: 4,
  },
  dnaStat: { alignItems: 'center', flex: 1 },
  dnaStatVal: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  dnaStatLabel: { color: 'rgba(0,242,255,0.45)', fontSize: 6, fontWeight: '800', letterSpacing: 1 },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
  },
  sectionTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 2, flex: 1 },
  sectionCount: {
    color: '#00F2FF', fontSize: 14, fontWeight: '900',
    backgroundColor: 'rgba(0,242,255,0.08)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 2, overflow: 'hidden',
  },
  proDivider: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginVertical: 16,
  },
  proDividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(212,175,55,0.15)' },
  proDividerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
  },
  proDividerText: { color: '#D4AF37', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
});
