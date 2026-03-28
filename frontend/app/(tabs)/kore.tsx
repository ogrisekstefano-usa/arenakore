/**
 * ARENAKORE — KORE TAB v6.0
 * PASSPORT + CITY RANK + ARENAGO RADAR + KORE CARD
 * Nike Lab: Black / Cyan / White. Zero emoji. Bold ALL-CAPS.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity,
  Dimensions, Linking, Platform, RefreshControl, ActivityIndicator, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import Animated, {
  FadeIn, FadeInDown, useSharedValue, withRepeat,
  withSequence, withTiming, useAnimatedStyle, useAnimatedProps,
  Easing,
} from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { Header } from '../../components/Header';

const { width: SW } = Dimensions.get('window');
const RADAR_R = (SW - 100) / 2;
const CX = SW / 2;
const CY = RADAR_R + 20;

const AnimatedLine = Animated.createAnimatedComponent(Line);

const DNA_LABELS: Record<string, string> = {
  velocita: 'VEL', forza: 'FOR', resistenza: 'RES',
  agilita: 'AGI', tecnica: 'TEC', potenza: 'POT',
};
const DNA_COLORS: Record<string, string> = {
  velocita: '#00F2FF', forza: '#FFFFFF', resistenza: '#FF453A',
  agilita: '#00F2FF', tecnica: '#FFFFFF', potenza: '#FFD700',
};

const CITIES = [
  'MILANO', 'ROMA', 'TORINO', 'NAPOLI', 'FIRENZE', 'VENEZIA',
  'BOLOGNA', 'GENOVA', 'PALERMO', 'BARI', 'LONDON', 'PARIS',
  'BARCELONA', 'BERLIN', 'NEW YORK', 'TOKYO', 'DUBAI',
];

const MOCK_ATHLETES = [
  { id: '1', name: 'ALEX_K',  sport: 'BOXE',     dist: 0.35, angle: 45,  color: '#00F2FF' },
  { id: '2', name: 'MAYA_J',  sport: 'ATLETICA', dist: 0.60, angle: 130, color: '#D4AF37' },
  { id: '3', name: 'TORO_94', sport: 'MMA',      dist: 0.80, angle: 210, color: '#FF453A' },
  { id: '4', name: 'SASHA_V', sport: 'NUOTO',    dist: 0.50, angle: 290, color: '#00F2FF' },
  { id: '5', name: 'KIRA_M',  sport: 'CROSSFIT', dist: 0.72, angle: 340, color: '#D4AF37' },
];

const MOCK_EVENTS = [
  { id: 'e1', name: 'SPRINT', dist: 0.42, angle: 80,  active: true  },
  { id: 'e2', name: 'DUEL',   dist: 0.25, angle: 160, active: true  },
  { id: 'e3', name: 'POWER',  dist: 0.68, angle: 240, active: false },
];

// ========== CITY DROPDOWN ==========
function CityDropdown({ city, onSelect }: { city: string; onSelect: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={cd$.trigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Ionicons name="location" size={12} color="#00F2FF" />
        <Text style={cd$.cityText}>{city}</Text>
        <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={cd$.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={cd$.sheet}>
            <LinearGradient colors={['#0D0D0D', '#080808']} style={cd$.sheetInner}>
              <Text style={cd$.sheetTitle}>SELEZIONA CITY</Text>
              <View style={cd$.sheetDivider} />
              <ScrollView showsVerticalScrollIndicator={false}>
                {CITIES.map(c => (
                  <TouchableOpacity key={c} style={[cd$.option, c === city && cd$.optionActive]} onPress={() => { onSelect(c); setOpen(false); }}>
                    <Ionicons name="location-outline" size={12} color={c === city ? '#00F2FF' : 'rgba(255,255,255,0.35)'} />
                    <Text style={[cd$.optionText, c === city && cd$.optionTextActive]}>{c}</Text>
                    {c === city && <Ionicons name="checkmark" size={12} color="#00F2FF" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
const cd$ = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,242,255,0.06)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(0,242,255,0.15)', alignSelf: 'flex-start' },
  cityText: { color: '#00F2FF', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '50%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  sheetInner: { padding: 20, borderWidth: 1, borderColor: 'rgba(0,242,255,0.1)', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 4, marginBottom: 12 },
  sheetDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 4 },
  optionActive: { backgroundColor: 'rgba(0,242,255,0.05)', borderRadius: 8, paddingHorizontal: 10 },
  optionText: { flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  optionTextActive: { color: '#00F2FF' },
});

// ========== PASSPORT IDENTITY ==========
function PassportIdentity({ user, cityRank, city, onCitySelect }: { user: any; cityRank: any; city: string; onCitySelect: (c: string) => void }) {
  const shimmer = useSharedValue(0.7);
  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(withTiming(1, { duration: 2000 }), withTiming(0.7, { duration: 2000 })), -1, false
    );
  }, []);
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));
  const isFounder = user?.is_founder || user?.is_admin;
  const isTop10 = cityRank?.is_top_10;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={pi$.container}>
      <LinearGradient colors={['#0E0E0E', '#080808']} style={pi$.card}>
        <View style={pi$.topGlow} />
        {/* Row: Avatar + Identity */}
        <View style={pi$.row}>
          <View style={[pi$.avatar, { backgroundColor: user?.avatar_color || '#00F2FF' }]}>
            <Text style={pi$.avatarLetter}>{(user?.username || 'A')[0].toUpperCase()}</Text>
          </View>
          <View style={pi$.identInfo}>
            <View style={pi$.nameRow}>
              <Text style={pi$.username} numberOfLines={1}>{(user?.username || 'ATHLETE').toUpperCase()}</Text>
              {isFounder && (
                <Animated.View style={[pi$.founderBadge, shimmerStyle]}>
                  <Ionicons name="star" size={8} color="#D4AF37" />
                  <Text style={pi$.founderText}>FOUNDER</Text>
                </Animated.View>
              )}
            </View>
            <Text style={pi$.sport}>{(user?.sport || '---').toUpperCase()} · {(user?.category || 'ATHLETICS').toUpperCase()}</Text>
            <View style={pi$.badgeRow}>
              <View style={pi$.lvlBadge}>
                <Ionicons name="flash" size={8} color="#00F2FF" />
                <Text style={pi$.lvlText}>LVL {user?.level || 1}</Text>
              </View>
              {user?.pro_unlocked && (
                <View style={pi$.proBadge}>
                  <Ionicons name="diamond" size={8} color="#D4AF37" />
                  <Text style={pi$.proText}>PRO</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* City Rank Row */}
        <View style={pi$.rankRow}>
          <View style={pi$.rankLeft}>
            <Text style={pi$.rankLabel}>CITY RANK</Text>
            <Text style={[pi$.rankNum, { color: isTop10 ? '#D4AF37' : '#00F2FF' }]}>
              {cityRank?.rank ? `#${cityRank.rank}` : '---'}
            </Text>
            {isTop10 && (
              <View style={pi$.top10}>
                <Ionicons name="trophy" size={8} color="#D4AF37" />
                <Text style={pi$.top10Text}>TOP 10</Text>
              </View>
            )}
          </View>
          <View style={pi$.rankDivider} />
          <View style={pi$.rankRight}>
            <Text style={pi$.cityLabel}>ZONA</Text>
            <CityDropdown city={city} onSelect={onCitySelect} />
            {cityRank?.next_username && cityRank?.xp_gap > 0 && (
              <View style={pi$.gapRow}>
                <Ionicons name="arrow-up" size={9} color="rgba(255,255,255,0.35)" />
                <Text style={pi$.gapText}>{cityRank.xp_gap} XP · {cityRank.next_username.toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
const pi$ = StyleSheet.create({
  container: { marginHorizontal: 16, marginTop: 8, marginBottom: 10 },
  card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.09)' },
  topGlow: { height: 2, backgroundColor: '#00F2FF', opacity: 0.6, shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingBottom: 12 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)' },
  avatarLetter: { color: '#050505', fontSize: 20, fontWeight: '900' },
  identInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  username: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', letterSpacing: 1, flex: 1 },
  founderBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(212,175,55,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)' },
  founderText: { color: '#D4AF37', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  sport: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  lvlBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,242,255,0.07)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(0,242,255,0.15)' },
  lvlText: { color: '#00F2FF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  proBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(212,175,55,0.07)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(212,175,55,0.15)' },
  proText: { color: '#D4AF37', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
  rankLeft: { alignItems: 'center', gap: 4, minWidth: 80 },
  rankLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  rankNum: { fontSize: 52, fontWeight: '900', letterSpacing: 2 },
  top10: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(212,175,55,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  top10Text: { color: '#D4AF37', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  rankDivider: { width: 1, height: 70, backgroundColor: 'rgba(255,255,255,0.05)' },
  rankRight: { flex: 1, gap: 10 },
  cityLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  gapRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  gapText: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
});

// ========== ARENAGO RADAR (compact) ==========
function ArenaGoRadar() {
  const sweep = useSharedValue(-90);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    sweep.value = withRepeat(
      withTiming(270, { duration: 3000, easing: Easing.linear }), -1, false
    );
  }, []);

  const sweepProps = useAnimatedProps(() => {
    const rad = sweep.value * Math.PI / 180;
    return { x2: CX + RADAR_R * Math.cos(rad), y2: CY + RADAR_R * Math.sin(rad) };
  });
  const tail1Props = useAnimatedProps(() => {
    const rad = (sweep.value - 20) * Math.PI / 180;
    return { x2: CX + RADAR_R * Math.cos(rad), y2: CY + RADAR_R * Math.sin(rad) };
  });

  const H = RADAR_R * 2 + 40;

  return (
    <Animated.View entering={FadeInDown.delay(200)} style={radar$.container}>
      <View style={radar$.sectionRow}>
        <View style={radar$.dot} />
        <Text style={radar$.title}>ARENAGO RADAR</Text>
        <View style={radar$.livePill}>
          <View style={radar$.liveDot} />
          <Text style={radar$.liveText}>LIVE</Text>
        </View>
      </View>

      <View style={[radar$.wrap, { height: H }]}>
        <Svg width={SW} height={H}>
          {/* Rings */}
          {[0.3, 0.6, 1.0].map((r, i) => (
            <Circle key={i} cx={CX} cy={CY} r={RADAR_R * r}
              stroke="#00F2FF" strokeWidth={0.6} fill="none" opacity={0.12}
              strokeDasharray={i < 2 ? '4,5' : undefined}
            />
          ))}
          {/* Fill */}
          <Circle cx={CX} cy={CY} r={RADAR_R} fill="rgba(0,242,255,0.015)" />
          {/* Cross axes */}
          <Line x1={CX} y1={CY - RADAR_R} x2={CX} y2={CY + RADAR_R} stroke="#00F2FF" strokeWidth={0.3} opacity={0.1} />
          <Line x1={CX - RADAR_R} y1={CY} x2={CX + RADAR_R} y2={CY} stroke="#00F2FF" strokeWidth={0.3} opacity={0.1} />

          {/* Distance labels */}
          <SvgText x={CX + 4} y={CY - RADAR_R * 0.3 + 6} fill="#00F2FF" fontSize={7} opacity={0.3}>500M</SvgText>
          <SvgText x={CX + 4} y={CY - RADAR_R * 0.6 + 6} fill="#00F2FF" fontSize={7} opacity={0.3}>1KM</SvgText>
          <SvgText x={CX + 4} y={CY - RADAR_R + 6} fill="#00F2FF" fontSize={7} opacity={0.3}>2KM</SvgText>

          {/* Sweep tail */}
          <AnimatedLine x1={CX} y1={CY} stroke="#00F2FF" strokeWidth={1} opacity={0.2} animatedProps={tail1Props} />
          {/* Main sweep */}
          <AnimatedLine x1={CX} y1={CY} stroke="#00F2FF" strokeWidth={2} opacity={0.7} animatedProps={sweepProps} />

          {/* Athlete blips */}
          {MOCK_ATHLETES.map(a => {
            const rad = a.angle * Math.PI / 180;
            const x = CX + RADAR_R * a.dist * Math.cos(rad);
            const y = CY + RADAR_R * a.dist * Math.sin(rad);
            const isSel = selected === a.id;
            return (
              <G key={a.id} onPress={() => setSelected(isSel ? null : a.id)}>
                <Circle cx={x} cy={y} r={isSel ? 20 : 14} fill={a.color} opacity={0.06} />
                <Circle cx={x} cy={y} r={5} fill={a.color} opacity={0.9} />
                {isSel && <Circle cx={x} cy={y} r={9} stroke={a.color} strokeWidth={1.5} fill="none" opacity={0.6} />}
                <SvgText x={x + 8} y={y - 4} fill={a.color} fontSize={7} fontWeight="bold" opacity={0.9}>{a.name}</SvgText>
                <SvgText x={x + 8} y={y + 5} fill="#FFFFFF" fontSize={6} opacity={0.4}>{a.sport}</SvgText>
              </G>
            );
          })}

          {/* Event blips */}
          {MOCK_EVENTS.map(ev => {
            const rad = ev.angle * Math.PI / 180;
            const x = CX + RADAR_R * ev.dist * Math.cos(rad);
            const y = CY + RADAR_R * ev.dist * Math.sin(rad);
            const color = ev.active ? '#FF453A' : '#444';
            return (
              <G key={ev.id}>
                <Circle cx={x} cy={y} r={10} stroke={color} strokeWidth={1.5} fill="none" opacity={0.7} />
                {ev.active && <Circle cx={x} cy={y} r={4} fill={color} opacity={0.9} />}
                <SvgText x={x + 12} y={y + 3} fill={color} fontSize={7} fontWeight="bold" opacity={0.9}>{ev.name}</SvgText>
              </G>
            );
          })}

          {/* User center */}
          <Circle cx={CX} cy={CY} r={6} fill="#D4AF37" opacity={0.9} />
          <Circle cx={CX} cy={CY} r={12} stroke="#D4AF37" strokeWidth={1.5} fill="none" opacity={0.35} />
          <SvgText x={CX + 14} y={CY + 4} fill="#D4AF37" fontSize={8} fontWeight="bold" opacity={0.8}>YOU</SvgText>
        </Svg>
      </View>
    </Animated.View>
  );
}
const radar$ = StyleSheet.create({
  container: { marginBottom: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00F2FF', shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 5 },
  title: { flex: 1, color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 4 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,69,58,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,69,58,0.25)' },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FF453A' },
  liveText: { color: '#FF453A', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  wrap: { position: 'relative' },
});

// ========== KORE CARD + WALLET ==========
function KoreCard({ user, cityRank }: { user: any; cityRank: any }) {
  const scanPulse = useSharedValue(0);
  useEffect(() => {
    scanPulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 1500 }), withTiming(0, { duration: 1500 })), -1, false
    );
  }, []);
  const scanStyle = useAnimatedStyle(() => ({ opacity: 0.05 + scanPulse.value * 0.08 }));

  const isFounder = user?.is_founder || user?.is_admin;
  const koreNumber = user?.founder_number
    ? String(user.founder_number).padStart(5, '0')
    : String(Math.abs(parseInt((user?.id || '00001').slice(-5), 16)) % 99999).padStart(5, '0');
  const dnaValues = Object.values(user?.dna || {}) as number[];
  const avgDna = dnaValues.length
    ? Math.round(dnaValues.reduce((a, b) => a + b, 0) / dnaValues.length)
    : 0;

  const handleApple = () => Linking.openURL('https://arenadare.com/wallet/apple').catch(() => {});
  const handleGoogle = () => Linking.openURL('https://arenadare.com/wallet/google').catch(() => {});

  return (
    <Animated.View entering={FadeInDown.delay(350)} style={kc$.container}>
      <View style={kc$.sectionRow}>
        <Ionicons name="card" size={12} color="#FFFFFF" />
        <Text style={kc$.sectionTitle}>KORE CARD</Text>
      </View>

      <View style={kc$.card}>
        <LinearGradient colors={['#101010', '#070707']} style={kc$.cardInner}>
          <Animated.View style={[StyleSheet.absoluteFill, kc$.scanLayer, scanStyle]} />
          <View style={kc$.cardTopGlow} />

          {/* Card header */}
          <View style={kc$.cardHeader}>
            <View>
              <Text style={kc$.brandSm}>ARENAKORE</Text>
              <Text style={kc$.cardType}>ATHLETE PASSPORT</Text>
            </View>
            {isFounder && (
              <View style={kc$.founderBadge}>
                <Ionicons name="star" size={9} color="#D4AF37" />
                <Text style={kc$.founderText}>FOUNDER</Text>
              </View>
            )}
          </View>

          {/* DNA bars */}
          <View style={kc$.dnaSection}>
            <Text style={kc$.dnaCap}>DNA · AVG {avgDna}</Text>
            {Object.entries(user?.dna || {}).slice(0, 6).map(([key, val]: [string, any]) => {
              const color = DNA_COLORS[key] || '#00F2FF';
              return (
                <View key={key} style={kc$.dnaRow}>
                  <Text style={kc$.dnaLabel}>{DNA_LABELS[key] || key.slice(0, 3).toUpperCase()}</Text>
                  <View style={kc$.dnaBar}>
                    <View style={[kc$.dnaFill, { width: `${Math.min(100, val)}%` as any, backgroundColor: color }]} />
                  </View>
                  <Text style={[kc$.dnaVal, { color }]}>{Math.round(val)}</Text>
                </View>
              );
            })}
          </View>

          <View style={kc$.divider} />

          {/* Bottom: QR + Stats */}
          <View style={kc$.bottomRow}>
            <View style={kc$.qrBox}>
              <QRCode value={`arenakore://athlete/${user?.id || 'x'}`} size={64} color="#00F2FF" backgroundColor="#070707" />
            </View>
            <View style={kc$.rightSide}>
              <View style={kc$.bStat}><Text style={kc$.bStatLabel}>XP</Text><Text style={kc$.bStatVal}>{((user?.xp || 0) as number).toLocaleString()}</Text></View>
              <View style={kc$.bStat}><Text style={kc$.bStatLabel}>RANK</Text><Text style={[kc$.bStatVal, { color: cityRank?.is_top_10 ? '#D4AF37' : '#00F2FF' }]}>{cityRank?.rank ? `#${cityRank.rank}` : '---'}</Text></View>
              <Text style={kc$.serial}>KORE #{koreNumber}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Wallet buttons */}
      <View style={kc$.walletRow}>
        {Platform.OS !== 'android' && (
          <TouchableOpacity style={kc$.appleBtn} onPress={handleApple} activeOpacity={0.85}>
            <LinearGradient colors={['#1C1C1E', '#111']} style={kc$.btnInner}>
              <Ionicons name="phone-portrait" size={15} color="#FFFFFF" />
              <View>
                <Text style={kc$.btnSm}>ADD TO</Text>
                <Text style={kc$.btnBig}>APPLE WALLET</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={kc$.googleBtn} onPress={handleGoogle} activeOpacity={0.85}>
          <LinearGradient colors={['#1A1A1A', '#111']} style={kc$.btnInner}>
            <Ionicons name="card" size={15} color="#4285F4" />
            <View>
              <Text style={kc$.btnSm}>SAVE TO</Text>
              <Text style={[kc$.btnBig, { color: '#4285F4' }]}>GOOGLE WALLET</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
const kc$ = StyleSheet.create({
  container: { marginBottom: 16 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  sectionTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 4 },
  card: { marginHorizontal: 16, borderRadius: 18, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(0,242,255,0.1)' },
  cardInner: { padding: 16, gap: 12 },
  scanLayer: { borderRadius: 18, backgroundColor: '#00F2FF', zIndex: 0 },
  cardTopGlow: { height: 2, backgroundColor: '#00F2FF', opacity: 0.6, marginHorizontal: -16, marginTop: -16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandSm: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '800', letterSpacing: 4 },
  cardType: { color: '#00F2FF', fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  founderBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#D4AF37' },
  founderText: { color: '#D4AF37', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  dnaSection: { gap: 7 },
  dnaCap: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '900', letterSpacing: 3, marginBottom: 6 },
  dnaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dnaLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '900', letterSpacing: 1.5, width: 36 },
  dnaBar: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2.5, overflow: 'hidden' },
  dnaFill: { height: '100%', borderRadius: 2.5 },
  dnaVal: { fontSize: 14, fontWeight: '900', letterSpacing: 1, width: 28, textAlign: 'right' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  bottomRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  qrBox: { backgroundColor: '#070707', borderRadius: 8, padding: 6, borderWidth: 1, borderColor: 'rgba(0,242,255,0.1)' },
  rightSide: { flex: 1, gap: 8 },
  bStat: { gap: 2 },
  bStatLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  bStatVal: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', letterSpacing: 1 },
  serial: { color: 'rgba(0,242,255,0.45)', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  walletRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 10 },
  appleBtn: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  googleBtn: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(66,133,244,0.2)' },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 14 },
  btnSm: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  btnBig: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
});

// ========== XP PROGRESS ==========
function XpProgress({ user }: { user: any }) {
  const xp = (user?.xp || 0) as number;
  const xpPerLevel = 500;
  const pct = ((xp % xpPerLevel) / xpPerLevel) * 100;
  const remaining = xpPerLevel - (xp % xpPerLevel);
  const barAnim = useSharedValue(0);
  useEffect(() => { barAnim.value = withTiming(pct / 100, { duration: 1200 }); }, [pct]);
  const barStyle = useAnimatedStyle(() => ({ width: `${barAnim.value * 100}%` as any }));

  return (
    <Animated.View entering={FadeInDown.delay(450)} style={xp$.container}>
      <View style={xp$.header}>
        <Ionicons name="flash" size={13} color="#D4AF37" />
        <Text style={xp$.title}>XP PROGRESSION</Text>
        <Text style={xp$.lvl}>LVL {user?.level || 1}</Text>
      </View>
      <View style={xp$.barBg}><Animated.View style={[xp$.barFill, barStyle]} /></View>
      <View style={xp$.meta}>
        <Text style={xp$.current}>{xp.toLocaleString()} XP</Text>
        <Text style={xp$.next}>{remaining} AL PROSSIMO LVL</Text>
      </View>
    </Animated.View>
  );
}
const xp$ = StyleSheet.create({
  container: { marginHorizontal: 16, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { flex: 1, color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 4 },
  lvl: { color: '#D4AF37', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  barBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: '100%', backgroundColor: '#D4AF37', borderRadius: 3, shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6 },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  current: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  next: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '700' },
});

// ========== MAIN KORE TAB ==========
export default function KoreTab() {
  const { user, token } = useAuth();
  const [cityRank, setCityRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [city, setCity] = useState('MILANO');

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
          {/* TOP: PASSPORT + CITY RANK */}
          <PassportIdentity user={user} cityRank={cityRank} city={city} onCitySelect={setCity} />

          {/* MIDDLE: ARENAGO RADAR */}
          <ArenaGoRadar />

          {/* BOTTOM: KORE CARD + WALLET */}
          <KoreCard user={user} cityRank={cityRank} />

          {/* XP Progress */}
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
