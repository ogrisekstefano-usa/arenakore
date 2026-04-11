/**
 * TABS LAYOUT — Build 28 · NEXUS CHROMATIC ENGINE v5
 * [ARENA🏟️] [KORE ID🛡️] [⚡NÈXUS⚡] [DNA📊] [RANK🏆]
 *
 * NÈXUS CHROMATIC LOGIC:
 *   RIPOSO  → ORO (#FFD700)
 *   ATTIVO  → CIANO (#00E5FF)
 *   SCANNING → CIANO + GLOW PULSANTE
 *
 * Fix: Uses React Context to communicate active route to custom tab button
 */
import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Keyboard, View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing
} from 'react-native-reanimated';

const GOLD = '#FFD700';
const CYAN = '#00E5FF';

// ═══ CONTEXT: Share active route with custom tab button ═══
const ActiveTabContext = createContext({ activeRoute: 'nexus-trigger' });

// ═══════════════════════════════════════════════════════════════
// NEXUS CENTER BUTTON — Chromatic v5 (Context-driven)
// ═══════════════════════════════════════════════════════════════
function NexusCenterButton({ onPress, ...rest }: any) {
  const { activeRoute } = useContext(ActiveTabContext);
  const focused = activeRoute === 'nexus-trigger';
  const isScanning = false; // Will be driven by global scanning state in future

  // Pulse animation for scanning
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  useEffect(() => {
    if (isScanning) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 600, easing: Easing.out(Easing.ease) }),
          withTiming(1.0, { duration: 600, easing: Easing.in(Easing.ease) })
        ), -1, true
      );
      pulseOpacity.value = withRepeat(
        withSequence(withTiming(1, { duration: 600 }), withTiming(0.2, { duration: 600 })),
        -1, true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0.5, { duration: 200 });
    }
  }, [isScanning]);

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // ═══ CHROMATIC COLOR ENGINE ═══
  const isLive = isScanning;
  const mainColor  = isLive ? CYAN : focused ? CYAN : GOLD;
  const bgColor    = isLive ? CYAN : focused ? CYAN : 'rgba(255,215,0,0.08)';
  const icColor    = isLive || focused ? '#000' : GOLD;
  const ringBorder = isLive || focused ? CYAN : GOLD + '30';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={nb.container}>
      {/* Cyan glow ring */}
      {(focused || isLive) && (
        <Animated.View style={[
          nb.pulseRing,
          isLive ? pulseRingStyle : { opacity: 0.18 },
          { borderColor: CYAN }
        ]} />
      )}
      <View style={[nb.outerRing, { borderColor: ringBorder }]}>
        <View style={[nb.circle, { backgroundColor: bgColor }]}>
          <Ionicons name="flash" size={28} color={icColor} />
        </View>
      </View>
      <Text style={[nb.label, { color: mainColor }]}>
        {isLive ? 'LIVE' : 'NÈXUS'}
      </Text>
    </TouchableOpacity>
  );
}

const nb = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', top: -18, width: 72 },
  pulseRing: { position: 'absolute', width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: CYAN, top: 0 },
  outerRing: { width: 62, height: 62, borderRadius: 31, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginTop: 4 },
});

// ═══════════════════════════════════════════════════════════════
// TABS LAYOUT — Main Component
// ═══════════════════════════════════════════════════════════════
export default function TabsLayout() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeRoute, setActiveRoute] = useState('nexus-trigger');

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user]);

  if (!user) return null;

  return (
    <ActiveTabContext.Provider value={{ activeRoute }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          lazy: true,
          tabBarStyle: {
            backgroundColor: '#000000',
            borderTopColor: 'rgba(255,255,255,0.06)',
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 92 : 72,
            paddingBottom: Platform.OS === 'ios' ? 30 : 10,
            paddingTop: 8,
            paddingHorizontal: 0,
            marginHorizontal: 0,
          },
          tabBarItemStyle: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 0,
            marginHorizontal: 0,
            minWidth: 0,
          },
          tabBarActiveTintColor: CYAN,   // 4 side tabs: CYAN when active
          tabBarInactiveTintColor: 'rgba(255,255,255,0.25)',
          tabBarLabelStyle: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
        }}
        screenListeners={{
          tabPress: () => Keyboard.dismiss(),
          state: (e: any) => {
            try {
              const s = e?.data?.state;
              if (s?.routes && typeof s.index === 'number') {
                const name = s.routes[s.index]?.name;
                if (name) setActiveRoute(name);
              }
            } catch (_) {}
          },
        }}
        initialRouteName="nexus-trigger"
      >
        <Tabs.Screen
          name="arena"
          options={{
            title: 'ARENA',
            tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="kore"
          options={{
            title: 'KORE ID',
            tabBarIcon: ({ color, size }) => <Ionicons name="shield" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="nexus-trigger"
          options={{
            title: 'NEXUS',
            tabBarLabel: () => null,
            tabBarIcon: () => null,
            tabBarButton: (props) => <NexusCenterButton {...props} />,
          }}
        />
        <Tabs.Screen
          name="dna"
          options={{
            title: 'DNA',
            tabBarIcon: ({ color, size }) => <Ionicons name="pulse" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="hall"
          options={{
            title: 'RANK',
            tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />,
          }}
        />
        {/* Hidden routes */}
        <Tabs.Screen name="gym-hub" options={{ href: null }} />
        <Tabs.Screen name="my-athletes" options={{ href: null }} />
        <Tabs.Screen name="safe-test" options={{ href: null }} />
      </Tabs>
    </ActiveTabContext.Provider>
  );
}
