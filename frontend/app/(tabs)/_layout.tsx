/**
 * TABS LAYOUT — Build 21 · STEP-BY-STEP · Minimal
 * ZERO librerie esterne. Solo React Navigation Tabs base.
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';

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
          height: 85,
          paddingBottom: 30,
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
          title: 'NEXUS',
          tabBarIcon: ({ color, size }) => <Ionicons name="flash" size={size} color={color} />,
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
      <Tabs.Screen name="gym-hub" options={{ href: null }} />
      <Tabs.Screen name="my-athletes" options={{ href: null }} />
      <Tabs.Screen name="safe-test" options={{ href: null }} />
    </Tabs>
  );
}
