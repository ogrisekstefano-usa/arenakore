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
    { name: 'arena', icon: 'map-outline', iconBold: 'map', label: 'ARENA' },
    // GYM role: replace 'kore' with 'gym-hub'
    isGym
      ? { name: 'gym-hub', icon: 'business-outline', iconBold: 'business', label: 'GYM HUB' }
      : { name: 'kore', icon: 'shield-outline', iconBold: 'shield', label: 'KORE' },
    { name: 'nexus-trigger', icon: 'flash', iconBold: 'flash-sharp', label: 'NEXUS', isCenter: true },
    { name: 'dna', icon: 'analytics', iconBold: 'analytics-sharp', label: 'DNA' },
    { name: 'hall', icon: 'trophy', iconBold: 'trophy-sharp', label: 'RANK' },
    // COACH role: add extra tab
    ...(isCoach ? [{ name: 'my-athletes', icon: 'people-outline', iconBold: 'people', label: 'ATLETI' }] : []),
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

  return (
    <View style={[$.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route: any, index: number) => {
        const cfg = TAB_CONFIG[index];
        if (!cfg) return null;
        const focused = state.index === index;
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
              color={focused ? '#00F2FF' : '#3A3A3A'}
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
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="arena" />
      <Tabs.Screen name="kore" />
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
    flexDirection: 'row', backgroundColor: '#070707',
    borderTopWidth: 1.5, borderTopColor: 'rgba(0,242,255,0.1)',
    height: 76, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.6, shadowRadius: 16, elevation: 20,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative',
    paddingTop: 6,
  },
  glowDot: {
    position: 'absolute', top: -2, width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: '#0D0D0D',
    shadowColor: '#00F2FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 8,
  },
  label: {
    color: 'rgba(255,255,255,0.60)', fontSize: 9, fontWeight: '900',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  labelActive: {
    color: '#00F2FF',
    textShadowColor: 'rgba(0,242,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  centerWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  centerLabel: {
    color: 'rgba(255,255,255,0.60)', fontSize: 9, fontWeight: '900',
    letterSpacing: 1.5, marginTop: 38,
  },
  nexusWrap: {
    position: 'absolute', top: -28, alignSelf: 'center',
    shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20, elevation: 16,
  },
  goldBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#070707',
    shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 16, elevation: 12,
  },
});
