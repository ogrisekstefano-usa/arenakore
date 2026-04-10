/**
 * TABS LAYOUT — Build 27 · THE BIO-CORE BUILD
 * Tab order matches original Expo Go design:
 * [ARENA🏟️] [KORE🛡️] [⚡NEXUS GOLD⚡] [DNA📊] [RANK🏆]
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Keyboard, View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GOLD = '#FFD700';
const CYAN = '#00E5FF';

// ═══ NEXUS CENTER BUTTON (Gold Circle + Blue Ring) ═══
function NexusCenterButton({ children, onPress, accessibilityState }: any) {
  const focused = accessibilityState?.selected;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={nb.container}
    >
      <View style={[nb.outerRing, focused && nb.outerRingActive]}>
        <View style={[nb.circle, focused ? nb.circleFocused : nb.circleInactive]}>
          <Ionicons
            name="flash"
            size={28}
            color={focused ? '#000000' : 'rgba(255,255,255,0.6)'}
          />
        </View>
      </View>
      <Text style={[nb.label, focused ? nb.labelFocused : nb.labelInactive]}>
        NEXUS
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
  outerRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRingActive: {
    borderColor: CYAN,
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleFocused: {
    backgroundColor: GOLD,
  },
  circleInactive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 4,
  },
  labelFocused: {
    color: GOLD,
  },
  labelInactive: {
    color: 'rgba(255,255,255,0.25)',
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
          title: 'KORE',
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
