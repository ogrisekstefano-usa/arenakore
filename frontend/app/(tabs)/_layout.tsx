/**
 * ARENAKORE — TAB LAYOUT "MINIMAL"
 * ZERO sounds, ZERO withRepeat animations.
 * Pure static tab bar for maximum iOS stability.
 * lazy: true — only active tab mounts (prevents Fabric renderer overload)
 */
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, UserRole } from '../../contexts/AuthContext';

// ErrorBoundary: Catches native crashes in tab screens and prevents full app crash
class TabErrorBoundary extends React.Component<
  { children: React.ReactNode; name: string },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message || 'Unknown error' };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[KORE] Tab "${this.props.name}" crashed:`, error.message, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="warning" size={48} color="#FFD700" />
          <Text style={{ color: '#FFD700', fontSize: 18, fontWeight: '800', marginTop: 16, textAlign: 'center' }}>
            MODULO IN MANUTENZIONE
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            {this.state.error.slice(0, 100)}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: '' })}
            style={{ marginTop: 20, backgroundColor: '#00E5FF', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 }}
          >
            <Text style={{ color: '#000', fontWeight: '800', fontSize: 14 }}>RIPROVA</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function getTabConfig(activeRole: UserRole) {
  const isGym = activeRole === 'GYM_OWNER';
  const isCoach = activeRole === 'COACH';
  return [
    isGym
      ? { name: 'gym-hub', icon: 'business-outline', iconBold: 'business', label: 'GYM HUB' }
      : { name: 'kore', icon: 'shield-outline', iconBold: 'shield', label: 'KORE' },
    { name: 'arena', icon: 'map-outline', iconBold: 'map', label: 'ARENA' },
    { name: 'nexus-trigger', icon: 'flash', iconBold: 'flash-sharp', label: 'NÈXUS', isCenter: true },
    { name: 'dna', icon: 'analytics', iconBold: 'analytics-sharp', label: 'DNA' },
    { name: 'hall', icon: 'trophy', iconBold: 'trophy-sharp', label: 'RANK' },
    ...(isCoach ? [{ name: 'my-athletes', icon: 'people-outline', iconBold: 'people', label: 'KORE' }] : []),
  ];
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { activeRole } = useAuth();
  const TAB_CONFIG = getTabConfig(activeRole);

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
              <TouchableOpacity
                testID="nexus-trigger-tab"
                onPress={onPress}
                style={$.goldBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="flash-sharp" size={26} color="#050505" />
              </TouchableOpacity>
              <Text style={[$.centerLabel, focused && $.labelActive]}>{cfg.label}</Text>
            </View>
          );
        }

        return (
          <TouchableOpacity key={route.key} testID={`tab-${cfg.name}`} onPress={onPress} style={$.tabItem}>
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
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false, lazy: true }} initialRouteName="nexus-trigger">
      <Tabs.Screen name="kore" />
      <Tabs.Screen name="arena" />
      <Tabs.Screen name="gym-hub" options={{ href: null }} />
      <Tabs.Screen name="nexus-trigger" />
      <Tabs.Screen name="dna" />
      <Tabs.Screen name="hall" />
      <Tabs.Screen name="my-athletes" options={{ href: null }} />
      <Tabs.Screen name="safe-test" options={{ href: null }} />
    </Tabs>
  );
}

const $ = StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: '#000000',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
    height: 76, alignItems: 'center', overflow: 'visible'
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
    position: 'relative', paddingTop: 6
  },
  glowDot: {
    position: 'absolute', top: -2, width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: '#00E5FF'
  },
  label: {
    color: '#AAAAAA', fontSize: 11, fontWeight: '900',
    letterSpacing: 2, textTransform: 'uppercase'
  },
  labelActive: { color: '#00E5FF' },
  centerWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'visible'
  },
  centerLabel: {
    color: '#AAAAAA', fontSize: 11, fontWeight: '900',
    letterSpacing: 2, marginTop: 38
  },
  goldBtn: {
    position: 'absolute', top: -31,
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FFD700', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#000000'
  }
});
