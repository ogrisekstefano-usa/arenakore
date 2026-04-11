/**
 * TABS LAYOUT — Build 28 · NEXUS CHROMATIC ENGINE
 * Tab order matches original Expo Go design:
 * [ARENA🏟️] [KORE🛡️] [⚡NEXUS GOLD⚡] [DNA📊] [RANK🏆]
 *
 * NEXUS Icon Logic:
 *   - Resting (not focused, no scan): GOLD (#FFD700)
 *   - Focused (tab selected): GOLD circle with black icon
 *   - Scanning active: CYAN NEON (#00E5FF) pulsing ring
 */
import React, { useEffect, useState, useRef } from 'react';
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

// ═══ NEXUS CENTER BUTTON — Chromatic State Engine ═══
// Gold at rest · Gold focused · Cyan neon when scanning
function NexusCenterButton({ children, onPress, accessibilityState }: any) {
  const focused = accessibilityState?.selected;

  // Scanning state — will be true when the biomech engine is active
  // In future, this can listen to a global ScanningContext
  const [isScanning, setIsScanning] = useState(false);

  // Animated pulse for scanning state
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (isScanning) {
      // Pulsing ring animation when scanning
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: 800, easing: Easing.out(Easing.ease) }),
          withTiming(1.0, { duration: 800, easing: Easing.in(Easing.ease) })
        ),
        -1, true
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.4, { duration: 800 })
        ),
        -1, true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      pulseOpacity.value = withTiming(0.6, { duration: 300 });
    }
  }, [isScanning]);

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Color logic:
  // - Scanning → CYAN neon everywhere
  // - Focused → GOLD circle with black icon
  // - Resting (not focused) → GOLD outline + GOLD icon (NOT dim/grey)
  const ringColor = isScanning ? CYAN : focused ? CYAN : GOLD + '50';
  const circleColor = isScanning ? CYAN : focused ? GOLD : 'rgba(255,215,0,0.10)';
  const iconColor = isScanning ? '#000000' : focused ? '#000000' : GOLD;
  const labelColor = isScanning ? CYAN : GOLD;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={nb.container}
    >
      {/* Animated pulse ring (visible when scanning) */}
      {isScanning && (
        <Animated.View style={[nb.pulseRing, pulseRingStyle]} />
      )}
      <View style={[nb.outerRing, { borderColor: ringColor }]}>
        <View style={[nb.circle, { backgroundColor: circleColor }]}>
          <Ionicons
            name="flash"
            size={28}
            color={iconColor}
          />
        </View>
      </View>
      <Text style={[nb.label, { color: labelColor }]}>
        {isScanning ? 'LIVE' : 'NÈXUS'}
      </Text>
    </TouchableOpacity>
  );
}

const nb = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -18,
    width: 72,
  },
  pulseRing: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: CYAN,
    top: 0,
  },
  outerRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 4,
  },
});

// ═══ MAIN TAB LAYOUT ═══
export default function TabsLayout() {
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !token) router.replace('/');
  }, [token, isLoading]);

  return (
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
          // ═══ GEOMETRY FIX: Zero asymmetric spacing ═══
          paddingHorizontal: 0,
          marginHorizontal: 0,
        },
        // ═══ GEOMETRY FIX: Each tab = exactly 20% ═══
        tabBarItemStyle: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 0,
          marginHorizontal: 0,
          minWidth: 0,
        },
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.25)',
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '900',
          letterSpacing: 1.5,
        },
      }}
      screenListeners={{
        tabPress: () => Keyboard.dismiss(),
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
  );
}
