import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withSpring, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { playTabSwitch } from '../../utils/sounds';

// Dynamic tab config based on active role
function getTabConfig(activeRole: UserRole) {
  const isCoach = activeRole === 'COACH';
  const isGym   = activeRole === 'GYM_OWNER';
  const tabs = [
    isGym
      ? { name: 'gym-hub', icon: 'business-outline', iconBold: 'business', label: 'GYM HUB' }
      : { name: 'kore', icon: 'shield-outline', iconBold: 'shield', label: 'KORE' },
    { name: 'arena', icon: 'map-outline', iconBold: 'map', label: 'ARENA' },
    { name: 'nexus-trigger', icon: 'flash', iconBold: 'flash-sharp', label: 'NÈXUS', isCenter: true },
    { name: 'dna', icon: 'analytics', iconBold: 'analytics-sharp', label: 'DNA' },
    { name: 'hall', icon: 'trophy', iconBold: 'trophy-sharp', label: 'RANK' },
    // COACH role: add extra tab
    ...(isCoach ? [{ name: 'my-athletes', icon: 'people-outline', iconBold: 'people', label: 'KORE' }] : []),
  ];
  return tabs;
}

function GoldButton({ onPress, focused }: { onPress: () => void; focused: boolean }) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.4);

  useEffect(() => {
    if (focused) {
      glow.value = withRepeat(
        withSequence(withTiming(0.8, { duration: 800 }), withTiming(0.3, { duration: 800 })),
        -1, false
      );
    }
  }, [focused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value,
  }));

  return (
    <Animated.View style={[$.nexusWrap, animStyle]}>
      <TouchableOpacity
        testID="nexus-trigger-tab"
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.88, { damping: 12 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12 }); }}
        style={$.goldBtn}
        activeOpacity={1}
      >
        <Ionicons name="flash-sharp" size={26} color="#050505" />
      </TouchableOpacity>
    </Animated.View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { activeRole } = useAuth();
  const prevRef = useRef(state.index);
  const TAB_CONFIG = getTabConfig(activeRole);

  useEffect(() => {
    if (prevRef.current !== state.index) {
      playTabSwitch();
      prevRef.current = state.index;
    }
  }, [state.index]);

  // Filter routes to only those defined in current TAB_CONFIG (excludes hidden screens like gym-hub, my-athletes)
  const visibleRoutes = state.routes.filter((route: any) =>
    TAB_CONFIG.some((cfg) => cfg.name === route.name)
  );

  return (
    <View style={[$.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {visibleRoutes.map((route: any) => {
        const cfg = TAB_CONFIG.find((c) => c.name === route.name);
        if (!cfg) return null;
        const focused = state.routes[state.index]?.name === route.name;
        const onPress = () => {
          const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !ev.defaultPrevented) navigation.navigate(route.name);
        };

        if (cfg.isCenter) {
          return (
            <View key={route.key} style={$.centerWrap}>
              <GoldButton onPress={onPress} focused={focused} />
              <Text style={[$.centerLabel, focused && $.labelActive]}>{cfg.label}</Text>
            </View>
          );
        }

        return (
          <TouchableOpacity key={route.key} testID={`tab-${cfg.name}`} onPress={onPress} style={$.tabItem}>
            {/* Glow dot indicator */}
            {focused && <View style={$.glowDot} />}
            <Ionicons
              name={(focused ? cfg.iconBold : cfg.icon) as any}
              size={focused ? 24 : 21}
              color={focused ? '#00E5FF' : '#3A3A3A'}
            />
            <Text style={[$.label, focused && $.labelActive]}>{cfg.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !token) router.replace('/');
  }, [token, isLoading]);

  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }} initialRouteName="nexus-trigger">
      <Tabs.Screen name="kore" />
      <Tabs.Screen name="arena" />
      <Tabs.Screen name="gym-hub" options={{ href: null }} />
      <Tabs.Screen name="nexus-trigger" />
      <Tabs.Screen name="dna" />
      <Tabs.Screen name="hall" />
      <Tabs.Screen name="my-athletes" options={{ href: null }} />
    </Tabs>
  );
}

const $ = StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: '#000000',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
    height: 76, alignItems: 'center', overflow: 'visible',
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative',
    paddingTop: 6,
  },
  glowDot: {
    position: 'absolute', top: -2, width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: '#00E5FF',
  },
  label: {
    color: '#AAAAAA', fontSize: 11, fontWeight: '900',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  labelActive: {
    color: '#00E5FF',
  },
  centerWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'visible',
  },
  centerLabel: {
    color: '#AAAAAA', fontSize: 11, fontWeight: '900',
    letterSpacing: 2, marginTop: 38,
  },
  nexusWrap: {
    position: 'absolute', top: -31, alignSelf: 'center',
  },
  goldBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FFD700', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#000000',
  },
});
