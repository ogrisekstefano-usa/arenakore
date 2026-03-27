import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';

const TAB_CONFIG = [
  { name: 'core', icon: 'home', label: 'CORE' },
  { name: 'crews', icon: 'people', label: 'CREWS', badge: 3 },
  { name: 'nexus-trigger', icon: 'add', label: '', isCenter: true },
  { name: 'dna', icon: 'analytics', label: 'DNA' },
  { name: 'nexus', icon: 'flash', label: 'NEXUS' },
];

function GoldButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={[styles.nexusWrapper, animStyle]}>
      <TouchableOpacity
        testID="nexus-trigger-tab"
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.88, { damping: 12 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12 }); }}
        style={styles.goldButton}
        activeOpacity={1}
      >
        <Text style={styles.goldIcon}>⚡</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route: any, index: number) => {
        const config = TAB_CONFIG[index];
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        if (config?.isCenter) {
          return (
            <View key={route.key} style={styles.centerContainer}>
              <GoldButton onPress={onPress} />
            </View>
          );
        }
        return (
          <TouchableOpacity
            key={route.key}
            testID={`tab-${config?.name}`}
            onPress={onPress}
            style={styles.tabItem}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={(config?.icon || 'home') as any}
                size={22}
                color={isFocused ? '#00F2FF' : '#3A3A3A'}
              />
              {(config as any)?.badge > 0 && (
                <View style={styles.redBadge}>
                  <Text style={styles.redBadgeText}>{(config as any).badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {config?.label}
            </Text>
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
    if (!isLoading && !token) {
      router.replace('/');
    }
  }, [token, isLoading]);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="core" />
      <Tabs.Screen name="crews" />
      <Tabs.Screen name="nexus-trigger" />
      <Tabs.Screen name="dna" />
      <Tabs.Screen name="nexus" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    height: 72,
    alignItems: 'center',
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  iconWrap: { position: 'relative' },
  redBadge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: '#FF3B30', borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 4,
  },
  redBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  tabLabel: {
    color: '#3A3A3A', fontSize: 9, fontWeight: '700', letterSpacing: 1,
  },
  tabLabelActive: { color: '#00F2FF' },
  centerContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  nexusWrapper: {
    position: 'absolute',
    top: -24,
    alignSelf: 'center',
  },
  goldButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#111111',
  },
  goldIcon: { fontSize: 26 },
});
