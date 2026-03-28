/**
 * ARENAKORE — KORE TAB v5.0
 * ATHLETE PASSPORT + KORE CARD + CITY RANK + WALLET
 * Nike Elite — Zero emoji, Cyan/Gold/Black, Bold Sans-Serif
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  Dimensions, Linking, Platform, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeInDown,
  useSharedValue, withRepeat, withSequence, withTiming, useAnimatedStyle,
} from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { Header } from '../../components/Header';

const { width: SW } = Dimensions.get('window');

const DNA_LABELS: Record<string, string> = {
  velocita: 'VEL', forza: 'FOR', resistenza: 'RES',
  agilita: 'AGI', tecnica: 'TEC', potenza: 'POT',
};
const DNA_COLORS: Record<string, string> = {
  velocita: '#00F2FF', forza: '#FFFFFF', resistenza: '#FF453A',
  agilita: '#00F2FF', tecnica: '#FFFFFF', potenza: '#FFD700',
};

// ========== KORE CARD ==========
function KoreCard({ user, cityRank }: { user: any; cityRank: any }) {
  const shimmer = useSharedValue(0.7);
  const scanPulse = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(withTiming(1, { duration: 2200 }), withTiming(0.7, { duration: 2200 })), -1, false
    );
    scanPulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 1200 }), withTiming(0, { duration: 1200 })), -1, false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));
  const scanStyle = useAnimatedStyle(() => ({ opacity: 0.08 + scanPulse.value * 0.12 }));

  const isFounder = user?.is_founder || user?.is_admin;
  const koreNumber = user?.founder_number
    ? String(user.founder_number).padStart(5, '0')
    : String(Math.abs(parseInt((user?.id || '00001').slice(-5), 16)) % 99999).padStart(5, '0');
  const dnaValues = Object.values(user?.dna || {}) as number[];
  const avgDna = dnaValues.length
    ? Math.round(dnaValues.reduce((a, b) => a + b, 0) / dnaValues.length)
    : 0;

  return (
    <Animated.View entering={FadeIn.duration(500)} style={kc$.container}>
      <LinearGradient colors={['#101010', '#070707', '#080808']} style={kc$.card}>
        {/* Neon top border */}
        <View style={kc$.topGlow} />

        {/* Scan pulse layer */}
        <Animated.View style={[StyleSheet.absoluteFill, kc$.scanLayer, scanStyle]} />

        {/* Card Header */}
        <View style={kc$.header}>
          <View>
            <Text style={kc$.brandSmall}>ARENAKORE</Text>
            <Text style={kc$.cardType}>ATHLETE PASSPORT</Text>
          </View>
          <View style={kc$.headerRight}>
            {isFounder && (
              <Animated.View style={[kc$.founderBadge, shimmerStyle]}>
                <Ionicons name="star" size={9} color="#D4AF37" />
                <Text style={kc$.founderText}>FOUNDER</Text>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Identity Row */}
        <View style={kc$.identityRow}>
          <View style={[kc$.avatarCircle, { backgroundColor: user?.avatar_color || '#00F2FF' }]}>
            <Text style={kc$.avatarLetter}>{(user?.username || 'A')[0].toUpperCase()}</Text>
          </View>
          <View style={kc$.identityInfo}>
            <Text style={kc$.username} numberOfLines={1}>{(user?.username || 'ATHLETE').toUpperCase()}</Text>
            <Text style={kc$.sport}>{(user?.sport || '---').toUpperCase()} · {(user?.category || 'ATHLETICS').toUpperCase()}</Text>
            <View style={kc$.badgeRow}>
              <View style={kc$.levelBadge}>
                <Ionicons name="flash" size={8} color="#00F2FF" />
                <Text style={kc$.levelText}>LVL {user?.level || 1}</Text>
              </View>
              {user?.pro_unlocked && (
                <View style={kc$.proBadge}>
                  <Ionicons name="diamond" size={8} color="#D4AF37" />
                  <Text style={kc$.proText}>PRO</Text>
                </View>
              )}
              {cityRank?.rank && (
                <View style={kc$.rankBadge}>
                  <Text style={kc$.rankText}>#{cityRank.rank}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={kc$.divider} />

        {/* DNA Profile */}
        <View style={kc$.dnaSection}>
          <Text style={kc$.dnaTitle}>DNA PROFILE · AVG {avgDna}</Text>
          <View style={kc$.dnaGrid}>
            {Object.entries(user?.dna || {}).slice(0, 6).map(([key, val]: [string, any]) => {
              const pct = Math.min(100, val);
              const color = DNA_COLORS[key] || '#00F2FF';
              return (
                <View key={key} style={kc$.dnaStat}>
                  <View style={kc$.dnaRow}>
                    <Text style={kc$.dnaLabel}>{DNA_LABELS[key] || key.slice(0, 3).toUpperCase()}</Text>
                    <Text style={[kc$.dnaVal, { color }]}>{Math.round(val)}</Text>
                  </View>
                  <View style={kc$.dnaBar}>
                    <View style={[kc$.dnaFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={kc$.divider} />

        {/* Bottom: QR + Stats */}
        <View style={kc$.bottomRow}>
          <View style={kc$.qrBox}>
            <QRCode
              value={`arenakore://athlete/${user?.id || 'unknown'}`}
              size={72}
              color="#00F2FF"
              backgroundColor="#070707"
            />
          </View>
          <View style={kc$.bottomStats}>
            <View style={kc$.bStat}>
              <Text style={kc$.bStatLabel}>XP TOTALE</Text>
              <Text style={kc$.bStatVal}>{((user?.xp || 0) as number).toLocaleString()}</Text>
            </View>
            <View style={kc$.bStat}>
              <Text style={kc$.bStatLabel}>CITY RANK</Text>
              <Text style={[kc$.bStatVal, { color: cityRank?.is_top_10 ? '#D4AF37' : '#00F2FF' }]}>
                {cityRank?.rank ? `#${cityRank.rank}` : '---'}
              </Text>
            </View>
            <View style={kc$.serialRow}>
              <Text style={kc$.serial}>KORE #{koreNumber}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const kc$ = StyleSheet.create({
  container: { marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  card: { borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.1)' },
  topGlow: {
    height: 2, backgroundColor: '#00F2FF',
    shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 8,
  },
  scanLayer: { borderRadius: 20, backgroundColor: '#00F2FF', zIndex: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  brandSmall: { color: 'rgba(255,255,255,0.28)', fontSize: 7, fontWeight: '800', letterSpacing: 4 },
  cardType: { color: '#00F2FF', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  headerRight: { alignItems: 'flex-end' },
  founderBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.08)' },
  founderText: { color: '#D4AF37', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18, paddingBottom: 14 },
  avatarCircle: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', opacity: 0.9, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  avatarLetter: { color: '#050505', fontSize: 22, fontWeight: '900' },
  identityInfo: { flex: 1, gap: 4 },
  username: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  sport: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,242,255,0.08)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(0,242,255,0.2)' },
  levelText: { color: '#00F2FF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  proBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)' },
  proText: { color: '#D4AF37', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  rankBadge: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  rankText: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 18, marginVertical: 4 },
  dnaSection: { paddingHorizontal: 18, paddingVertical: 10 },
  dnaTitle: { color: 'rgba(255,255,255,0.28)', fontSize: 7, fontWeight: '900', letterSpacing: 3, marginBottom: 10 },
  dnaGrid: { gap: 6 },
  dnaStat: { gap: 3 },
  dnaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dnaLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  dnaVal: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  dnaBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 1.5, overflow: 'hidden' },
  dnaFill: { height: '100%', borderRadius: 1.5 },
  bottomRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 18, paddingBottom: 16, paddingTop: 10, alignItems: 'center' },
  qrBox: { backgroundColor: '#070707', borderRadius: 8, padding: 6, borderWidth: 1, borderColor: 'rgba(0,242,255,0.1)' },
  bottomStats: { flex: 1, gap: 8 },
  bStat: { gap: 1 },
  bStatLabel: { color: 'rgba(255,255,255,0.28)', fontSize: 7, fontWeight: '800', letterSpacing: 2 },
  bStatVal: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  serialRow: { marginTop: 4 },
  serial: { color: 'rgba(0,242,255,0.4)', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
});

// ========== CITY RANK ==========
function CityRankCard({ rankData }: { rankData: any }) {
  if (!rankData) return null;
  const isTop10 = rankData?.is_top_10;
  return (
    <Animated.View entering={FadeInDown.delay(200)} style={cr$.container}>
      <View style={[cr$.card, isTop10 && cr$.cardGold]}>
        <View style={cr$.left}>
          <Text style={cr$.rankLabel}>CITY RANK</Text>
          <Text style={[cr$.rankNum, { color: isTop10 ? '#D4AF37' : '#00F2FF' }]}>#{rankData.rank}</Text>
          {isTop10 && (
            <View style={cr$.top10}>
              <Ionicons name="trophy" size={8} color="#D4AF37" />
              <Text style={cr$.top10Text}>TOP 10</Text>
            </View>
          )}
        </View>
        <View style={cr$.divider} />
        <View style={cr$.right}>
          {rankData.next_username && rankData.xp_gap > 0 ? (
            <>
              <Text style={cr$.nextLabel}>PROSSIMO AVVERSARIO</Text>
              <Text style={cr$.nextName}>{rankData.next_username.toUpperCase()}</Text>
              <View style={cr$.gapRow}>
                <Ionicons name="flash" size={10} color="#D4AF37" />
                <Text style={cr$.gap}>{rankData.xp_gap} XP MANCANTI</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={cr$.nextLabel}>POSIZIONE ELITE</Text>
              <Text style={[cr$.nextName, { color: '#D4AF37' }]}>LEADERSHIP</Text>
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
const cr$ = StyleSheet.create({
  container: { marginHorizontal: 16, marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, gap: 16, backgroundColor: 'rgba(0,242,255,0.03)', borderWidth: 1, borderColor: 'rgba(0,242,255,0.08)' },
  cardGold: { backgroundColor: 'rgba(212,175,55,0.04)', borderColor: 'rgba(212,175,55,0.15)' },
  left: { alignItems: 'center', gap: 4, minWidth: 64 },
  rankLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 7, fontWeight: '900', letterSpacing: 3 },
  rankNum: { fontSize: 40, fontWeight: '900', letterSpacing: 2 },
  top10: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(212,175,55,0.12)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  top10Text: { color: '#D4AF37', fontSize: 7, fontWeight: '900', letterSpacing: 2 },
  divider: { width: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.06)' },
  right: { flex: 1, gap: 3 },
  nextLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 7, fontWeight: '900', letterSpacing: 3 },
  nextName: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  gapRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  gap: { color: '#D4AF37', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});

// ========== WALLET SECTION ==========
function WalletSection() {
  const handleApple = () => {
    Linking.openURL('https://arenadare.com/wallet/apple').catch(() => {});
  };
  const handleGoogle = () => {
    Linking.openURL('https://arenadare.com/wallet/google').catch(() => {});
  };

  return (
    <Animated.View entering={FadeInDown.delay(300)} style={ws$.container}>
      <View style={ws$.header}>
        <Ionicons name="wallet" size={14} color="#00F2FF" />
        <Text style={ws$.title}>AGGIUNGI AL WALLET</Text>
      </View>
      <View style={ws$.row}>
        {Platform.OS !== 'android' && (
          <TouchableOpacity style={ws$.appleBtn} onPress={handleApple} activeOpacity={0.85}>
            <LinearGradient colors={['#1C1C1E', '#111']} style={ws$.btnInner}>
              <Ionicons name="phone-portrait" size={16} color="#FFFFFF" />
              <View style={ws$.btnText}>
                <Text style={ws$.btnSm}>ADD TO</Text>
                <Text style={ws$.btnBig}>APPLE WALLET</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={ws$.googleBtn} onPress={handleGoogle} activeOpacity={0.85}>
          <LinearGradient colors={['#1A1A1A', '#111']} style={ws$.btnInner}>
            <Ionicons name="card" size={16} color="#4285F4" />
            <View style={ws$.btnText}>
              <Text style={ws$.btnSm}>SAVE TO</Text>
              <Text style={[ws$.btnBig, { color: '#4285F4' }]}>GOOGLE WALLET</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
const ws$ = StyleSheet.create({
  container: { marginHorizontal: 16, marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  row: { flexDirection: 'row', gap: 8 },
  appleBtn: { flex: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  googleBtn: { flex: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(66,133,244,0.2)' },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 14 },
  btnText: { flex: 1 },
  btnSm: { color: 'rgba(255,255,255,0.35)', fontSize: 7, fontWeight: '700', letterSpacing: 1.5 },
  btnBig: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
});

// ========== XP PROGRESS ==========
function XpProgress({ user }: { user: any }) {
  const xp = user?.xp || 0;
  const level = user?.level || 1;
  const xpPerLevel = 500;
  const progressPct = ((xp % xpPerLevel) / xpPerLevel) * 100;
  const remaining = xpPerLevel - (xp % xpPerLevel);

  const barAnim = useSharedValue(0);
  useEffect(() => {
    barAnim.value = withTiming(progressPct / 100, { duration: 1200 });
  }, [progressPct]);
  const barStyle = useAnimatedStyle(() => ({ width: `${barAnim.value * 100}%` as any }));

  return (
    <Animated.View entering={FadeInDown.delay(400)} style={xp$.container}>
      <View style={xp$.header}>
        <Ionicons name="flash" size={14} color="#D4AF37" />
        <Text style={xp$.title}>XP PROGRESSION</Text>
        <Text style={xp$.lvl}>LVL {level}</Text>
      </View>
      <View style={xp$.barBg}>
        <Animated.View style={[xp$.barFill, barStyle]} />
      </View>
      <View style={xp$.meta}>
        <Text style={xp$.current}>{xp.toLocaleString()} XP</Text>
        <Text style={xp$.next}>{remaining} AL PROSSIMO LVL</Text>
      </View>
    </Animated.View>
  );
}
const xp$ = StyleSheet.create({
  container: { marginHorizontal: 16, marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { flex: 1, color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  lvl: { color: '#D4AF37', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  barBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: 3, shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6 },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  current: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  next: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' },
});

// ========== MAIN KORE TAB ==========
export default function KoreTab() {
  const { user, token } = useAuth();
  const [cityRank, setCityRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const rank = await api.getMyRank(token);
      setCityRank(rank);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <Header title="KORE" />

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#00F2FF" size="large" /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#00F2FF" />}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* HERO KORE CARD */}
          <KoreCard user={user} cityRank={cityRank} />

          {/* CITY RANK */}
          <CityRankCard rankData={cityRank} />

          {/* WALLET BUTTONS */}
          <WalletSection />

          {/* XP PROGRESS */}
          <XpProgress user={user} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
