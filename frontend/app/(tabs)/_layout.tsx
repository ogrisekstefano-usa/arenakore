/**
 * TABS LAYOUT — Build 26 · THE CORE STRUCTURE
 * 5 Tab: [KORE] [ARENA] [NÈXUS] [DNA] [HALL]
 * NÈXUS al centro, rialzato con design premium.
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Keyboard, View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ═══ NEXUS CENTER BUTTON (Elevated) ═══
function NexusCenterButton({ children, onPress, accessibilityState }: any) {
  const focused = accessibilityState?.selected;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={nb.container}
    >
      <View style={[
        nb.circle,
        focused ? nb.circleFocused : nb.circleInactive,
      ]}>
        <Ionicons
          name="flash"
          size={26}
          color={focused ? '#000000' : 'rgba(255,255,255,0.5)'}
        />
      </View>
      <Text style={[
        nb.label,
        focused ? nb.labelFocused : nb.labelInactive,
      ]}>
        NÈXUS
      </Text>
    </TouchableOpacity>
  );
}

const nb = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -14,
    width: 64,
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  circleFocused: {
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
  },
  circleInactive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  label: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 4,
  },
  labelFocused: {
    color: '#00E5FF',
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
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#00E5FF',
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
        name="kore"
        options={{
          title: 'KORE',
          tabBarIcon: ({ color, size }) => <Ionicons name="id-card" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="arena"
        options={{
          title: 'ARENA',
          tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="nexus-trigger"
        options={{
          title: 'NÈXUS',
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: (props) => <NexusCenterButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="dna"
        options={{
          title: 'DNA',
          tabBarIcon: ({ color, size }) => <Ionicons name="analytics" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="hall"
        options={{
          title: 'HALL',
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
