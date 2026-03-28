/**
 * ARENAKORE — ARENA TAB v1.0
 * ArenaGO Interactive Radar Map
 * Nike Elite — Zero emoji, Cyan/Gold/Black, Bold Sans-Serif, ZERO EMOJI
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Dimensions, ScrollView,
} from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import Animated, {
  useSharedValue, withRepeat, withTiming, useAnimatedStyle,
  useAnimatedProps, withSequence, Easing, FadeIn, FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../../components/Header';
import { useAuth } from '../../contexts/AuthContext';

const { width: SW } = Dimensions.get('window');
const RADAR_R = (SW - 80) / 2;
const CX = SW / 2;
const CY = RADAR_R + 48;

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Mock nearby athletes
const MOCK_ATHLETES = [
  { id: '1', name: 'ALEX_K',  sport: 'BOXE',     xp: 2840, dist: 0.35, angle: 45,  color: '#00F2FF', level: 9 },
  { id: '2', name: 'MAYA_J',  sport: 'ATLETICA', xp: 4120, dist: 0.60, angle: 130, color: '#D4AF37', level: 14 },
  { id: '3', name: 'TORO_94', sport: 'MMA',      xp: 1990, dist: 0.80, angle: 210, color: '#FF453A', level: 6 },
  { id: '4', name: 'SASHA_V', sport: 'NUOTO',    xp: 3380, dist: 0.50, angle: 290, color: '#00F2FF', level: 11 },
  { id: '5', name: 'KIRA_M',  sport: 'CROSSFIT', xp: 5600, dist: 0.72, angle: 340, color: '#D4AF37', level: 18 },
  { id: '6', name: 'MANU_B',  sport: 'JUDO',     xp: 2200, dist: 0.45, angle: 185, color: '#FFFFFF', level: 7 },
];

const MOCK_EVENTS = [
  { id: 'e1', name: 'SPRINT CHALLENGE', sport: 'ATLETICA', dist: 0.42, angle: 80,  active: true  },
  { id: 'e2', name: 'POWER BATTLE',     sport: 'CROSSFIT', dist: 0.68, angle: 240, active: false },
  { id: 'e3', name: 'LIVE DUEL',        sport: 'MMA',      dist: 0.25, angle: 160, active: true  },
];

function PulseBlip({ cx, cy, color, delay = 0 }: { cx: number; cy: number; color: string; delay?: number }) {
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      ), -1, false
    );
  }, []);
  const props = useAnimatedProps(() => ({ opacity: opacity.value }));
  return (
    <>
      <AnimatedCircle cx={cx} cy={cy} r={16} fill={color} animatedProps={props} />
    </>
  );
}

export default function ArenaTab() {
  const { user } = useAuth();
  const sweepAngle = useSharedValue(-90);
  const [filter, setFilter] = useState<'ALL' | 'ATHLETES' | 'EVENTS'>('ALL');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    sweepAngle.value = withRepeat(
      withTiming(270, { duration: 3200, easing: Easing.linear }),
      -1, false
    );
  }, []);

  const sweepProps = useAnimatedProps(() => {
    const rad = sweepAngle.value * Math.PI / 180;
    return {
      x2: CX + RADAR_R * Math.cos(rad),
      y2: CY + RADAR_R * Math.sin(rad),
    };
  });

  // Tail lines for sweep
  const tail1Props = useAnimatedProps(() => {
    const rad = (sweepAngle.value - 18) * Math.PI / 180;
    return { x2: CX + RADAR_R * Math.cos(rad), y2: CY + RADAR_R * Math.sin(rad) };
  });
  const tail2Props = useAnimatedProps(() => {
    const rad = (sweepAngle.value - 36) * Math.PI / 180;
    return { x2: CX + RADAR_R * Math.cos(rad), y2: CY + RADAR_R * Math.sin(rad) };
  });

  const liveEvents = MOCK_EVENTS.filter(e => e.active).length;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <Header title="ARENA" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* STATS ROW */}
        <Animated.View entering={FadeIn.duration(400)} style={s.statsRow}>
          {[
            { icon: 'radio',   label: 'LIVE EVENTS',       val: String(liveEvents), color: '#FF453A' },
            { icon: 'people',  label: 'NELLE VICINANZE',   val: String(MOCK_ATHLETES.length), color: '#00F2FF' },
            { icon: 'flash',   label: 'ZONA ATTIVA',       val: '2 KM', color: '#D4AF37' },
          ].map((item, i) => (
            <View key={i} style={s.statCard}>
              <Ionicons name={item.icon as any} size={16} color={item.color} />
              <Text style={[s.statVal, { color: item.color }]}>{item.val}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* SECTION TITLE */}
        <View style={s.sectionRow}>
          <View style={s.sectionDot} />
          <Text style={s.sectionTitle}>ARENAGO RADAR</Text>
          <View style={s.livePill}>
            <View style={s.liveDotSmall} />
            <Text style={s.liveText}>LIVE</Text>
          </View>
        </View>

        {/* RADAR SVG */}
        <View style={[s.radarWrap, { height: RADAR_R * 2 + 96 }]}>
          <Svg width={SW} height={RADAR_R * 2 + 96}>
            {/* Background fill */}
            <Circle cx={CX} cy={CY} r={RADAR_R} fill="rgba(0,242,255,0.015)" />

            {/* Concentric rings */}
            {[0.25, 0.5, 0.75, 1.0].map((r, i) => (
              <Circle key={i} cx={CX} cy={CY} r={RADAR_R * r}
                stroke="#00F2FF" strokeWidth={0.6} fill="none"
                opacity={0.12 - i * 0.01}
                strokeDasharray={i < 3 ? '3,5' : undefined}
              />
            ))}

            {/* Cross axes */}
            <Line x1={CX} y1={CY - RADAR_R} x2={CX} y2={CY + RADAR_R} stroke="#00F2FF" strokeWidth={0.3} opacity={0.1} />
            <Line x1={CX - RADAR_R} y1={CY} x2={CX + RADAR_R} y2={CY} stroke="#00F2FF" strokeWidth={0.3} opacity={0.1} />
            <Line x1={CX - RADAR_R * 0.71} y1={CY - RADAR_R * 0.71} x2={CX + RADAR_R * 0.71} y2={CY + RADAR_R * 0.71} stroke="#00F2FF" strokeWidth={0.2} opacity={0.06} />
            <Line x1={CX + RADAR_R * 0.71} y1={CY - RADAR_R * 0.71} x2={CX - RADAR_R * 0.71} y2={CY + RADAR_R * 0.71} stroke="#00F2FF" strokeWidth={0.2} opacity={0.06} />

            {/* Distance labels */}
            {[0.25, 0.5, 0.75, 1.0].map((r, i) => (
              <SvgText key={i} x={CX + 4} y={CY - RADAR_R * r + 10} fill="#00F2FF" fontSize={7} opacity={0.35}>
                {['500M', '1KM', '1.5KM', '2KM'][i]}
              </SvgText>
            ))}

            {/* Sweep tail lines */}
            <AnimatedLine x1={CX} y1={CY} stroke="#00F2FF" strokeWidth={1} opacity={0.12} animatedProps={tail2Props} />
            <AnimatedLine x1={CX} y1={CY} stroke="#00F2FF" strokeWidth={1.5} opacity={0.25} animatedProps={tail1Props} />
            {/* Main sweep */}
            <AnimatedLine x1={CX} y1={CY} stroke="#00F2FF" strokeWidth={2} opacity={0.7} animatedProps={sweepProps} />

            {/* Athlete blips */}
            {(filter === 'ALL' || filter === 'ATHLETES') && MOCK_ATHLETES.map(a => {
              const rad = a.angle * Math.PI / 180;
              const x = CX + RADAR_R * a.dist * Math.cos(rad);
              const y = CY + RADAR_R * a.dist * Math.sin(rad);
              return (
                <G key={a.id}
                  onPress={() => setSelected(selected?.id === a.id ? null : { ...a, type: 'athlete' })}
                >
                  <Circle cx={x} cy={y} r={18} fill={a.color} opacity={0.05} />
                  <Circle cx={x} cy={y} r={5} fill={a.color} opacity={0.9} />
                  <Circle cx={x} cy={y} r={8} stroke={a.color} strokeWidth={1} fill="none" opacity={0.3} />
                  <SvgText x={x + 10} y={y - 5} fill={a.color} fontSize={8} fontWeight="bold" opacity={0.9}>{a.name}</SvgText>
                  <SvgText x={x + 10} y={y + 6} fill="#FFFFFF" fontSize={6} opacity={0.45}>{a.sport}</SvgText>
                </G>
              );
            })}

            {/* Event blips */}
            {(filter === 'ALL' || filter === 'EVENTS') && MOCK_EVENTS.map(ev => {
              const rad = ev.angle * Math.PI / 180;
              const x = CX + RADAR_R * ev.dist * Math.cos(rad);
              const y = CY + RADAR_R * ev.dist * Math.sin(rad);
              const color = ev.active ? '#FF453A' : '#444';
              return (
                <G key={ev.id} onPress={() => setSelected(selected?.id === ev.id ? null : { ...ev, type: 'event' })}>
                  <Circle cx={x} cy={y} r={22} fill={color} opacity={0.05} />
                  <Circle cx={x} cy={y} r={9} stroke={color} strokeWidth={1.5} fill="none" opacity={0.8} />
                  {ev.active && <Circle cx={x} cy={y} r={4} fill={color} opacity={1} />}
                  <SvgText x={x + 12} y={y - 4} fill={color} fontSize={7} fontWeight="bold" opacity={0.95}>{ev.name}</SvgText>
                </G>
              );
            })}

            {/* User dot at center */}
            <Circle cx={CX} cy={CY} r={8} fill="#D4AF37" opacity={0.9} />
            <Circle cx={CX} cy={CY} r={14} stroke="#D4AF37" strokeWidth={1.5} fill="none" opacity={0.4} />
            <Circle cx={CX} cy={CY} r={22} stroke="#D4AF37" strokeWidth={0.8} fill="none" opacity={0.15} />
            <SvgText x={CX + 16} y={CY + 4} fill="#D4AF37" fontSize={8} fontWeight="bold" opacity={0.8}>YOU</SvgText>

            {/* Corner brackets */}
            <Line x1={12} y1={16} x2={36} y2={16} stroke="#00F2FF" strokeWidth={1.5} opacity={0.25} />
            <Line x1={12} y1={16} x2={12} y2={40} stroke="#00F2FF" strokeWidth={1.5} opacity={0.25} />
            <Line x1={SW - 12} y1={16} x2={SW - 36} y2={16} stroke="#00F2FF" strokeWidth={1.5} opacity={0.25} />
            <Line x1={SW - 12} y1={16} x2={SW - 12} y2={40} stroke="#00F2FF" strokeWidth={1.5} opacity={0.25} />

            {/* HUD labels */}
            <SvgText x={18} y={12} fill="#00F2FF" fontSize={7} fontWeight="bold" opacity={0.4}>ARENAKORE</SvgText>
            <SvgText x={SW - 80} y={12} fill="#00F2FF" fontSize={7} fontWeight="bold" opacity={0.4}>ARENAGO v1.0</SvgText>
          </Svg>
        </View>

        {/* Selected info */}
        {selected && (
          <Animated.View entering={FadeInDown.duration(250)} style={s.selectedCard}>
            <LinearGradient
              colors={selected.type === 'event' ? ['rgba(255,69,58,0.08)', 'rgba(0,0,0,0)'] : ['rgba(0,242,255,0.06)', 'rgba(0,0,0,0)']}
              style={s.selectedGrad}
            >
              <View style={s.selectedRow}>
                <Ionicons
                  name={selected.type === 'event' ? 'flash' : 'person'}
                  size={18}
                  color={selected.type === 'event' ? '#FF453A' : selected.color}
                />
                <View style={s.selectedInfo}>
                  <Text style={[s.selectedName, { color: selected.type === 'event' ? '#FF453A' : selected.color }]}>
                    {selected.name}
                  </Text>
                  <Text style={s.selectedSub}>
                    {selected.type === 'event' ? selected.sport : `${selected.sport} · LVL ${selected.level} · ${selected.xp.toLocaleString()} XP`}
                  </Text>
                </View>
                {selected.active !== undefined && (
                  <View style={[s.statusPill, { backgroundColor: selected.active ? 'rgba(255,69,58,0.15)' : 'rgba(255,255,255,0.05)' }]}>
                    <Text style={[s.statusText, { color: selected.active ? '#FF453A' : '#555' }]}>
                      {selected.active ? 'LIVE' : 'SOON'}
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* FILTER PILLS */}
        <View style={s.filterRow}>
          {(['ALL', 'ATHLETES', 'EVENTS'] as const).map(f => (
            <TouchableOpacity key={f} style={[s.filterPill, filter === f && s.filterActive]} onPress={() => setFilter(f)}>
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ATHLETE LIST */}
        {(filter === 'ALL' || filter === 'ATHLETES') && (
          <>
            <View style={s.listSection}>
              <Ionicons name="people" size={12} color="#00F2FF" />
              <Text style={s.listTitle}>ATLETI NELLE VICINANZE</Text>
            </View>
            {MOCK_ATHLETES.map((a, i) => (
              <Animated.View key={a.id} entering={FadeInDown.delay(i * 50)}>
                <TouchableOpacity
                  style={[s.listCard, selected?.id === a.id && s.listCardActive]}
                  onPress={() => setSelected(selected?.id === a.id ? null : { ...a, type: 'athlete' })}
                  activeOpacity={0.8}
                >
                  <View style={[s.blip, { backgroundColor: a.color }]} />
                  <View style={s.listInfo}>
                    <Text style={s.listName}>{a.name}</Text>
                    <Text style={s.listSub}>{a.sport} · LVL {a.level}</Text>
                  </View>
                  <View style={s.listXp}>
                    <Text style={s.xpVal}>{a.xp.toLocaleString()}</Text>
                    <Text style={s.xpLabel}>XP</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.2)" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </>
        )}

        {/* EVENT LIST */}
        {(filter === 'ALL' || filter === 'EVENTS') && (
          <>
            <View style={s.listSection}>
              <Ionicons name="flash" size={12} color="#D4AF37" />
              <Text style={[s.listTitle, { color: '#D4AF37' }]}>EVENTI IN ZONA</Text>
            </View>
            {MOCK_EVENTS.map((ev, i) => (
              <Animated.View key={ev.id} entering={FadeInDown.delay(i * 70)}>
                <TouchableOpacity
                  style={[s.listCard, selected?.id === ev.id && s.listCardActive]}
                  onPress={() => setSelected(selected?.id === ev.id ? null : { ...ev, type: 'event' })}
                  activeOpacity={0.8}
                >
                  {ev.active ? <View style={s.liveDot} /> : <Ionicons name="time" size={10} color="#444" />}
                  <View style={s.listInfo}>
                    <Text style={s.listName}>{ev.name}</Text>
                    <Text style={s.listSub}>{ev.sport}</Text>
                  </View>
                  <View style={[s.statusPill, { backgroundColor: ev.active ? 'rgba(255,69,58,0.15)' : 'rgba(255,255,255,0.04)' }]}>
                    <Text style={[s.statusText, { color: ev.active ? '#FF453A' : '#444' }]}>
                      {ev.active ? 'LIVE' : 'UPCOMING'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  statCard: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statVal: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 7, fontWeight: '800', letterSpacing: 0.8, textAlign: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 },
  sectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00F2FF', shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6 },
  sectionTitle: { flex: 1, color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,69,58,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,69,58,0.25)' },
  liveDotSmall: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF453A' },
  liveText: { color: '#FF453A', fontSize: 7, fontWeight: '900', letterSpacing: 2 },
  radarWrap: { position: 'relative' },
  selectedCard: { marginHorizontal: 16, marginTop: -8, marginBottom: 4, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  selectedGrad: { padding: 14 },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectedInfo: { flex: 1, gap: 2 },
  selectedName: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  selectedSub: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 4, marginBottom: 4 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
  filterActive: { borderColor: '#00F2FF', backgroundColor: 'rgba(0,242,255,0.08)' },
  filterText: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  filterTextActive: { color: '#00F2FF' },
  listSection: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  listTitle: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  listCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 6, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  listCardActive: { borderColor: 'rgba(0,242,255,0.2)', backgroundColor: 'rgba(0,242,255,0.03)' },
  blip: { width: 8, height: 8, borderRadius: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF453A' },
  listInfo: { flex: 1, gap: 2 },
  listName: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  listSub: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  listXp: { alignItems: 'flex-end', gap: 1 },
  xpVal: { color: '#D4AF37', fontSize: 14, fontWeight: '900' },
  xpLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 7, fontWeight: '700' },
  statusPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 8, fontWeight: '900', letterSpacing: 2 },
});
