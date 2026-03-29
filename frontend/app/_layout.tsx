import React, { useEffect } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
// ── THEME TEST CHICAGO: disabled — breaks icons and bold formatting
// import './theme-test-chicago.css';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const PENDING_EVENT_KEY = '@arenakore_pending_event';

function DeepLinkHandler() {
  const router = useRouter();
  const { token } = useAuth();

  useEffect(() => {
    // Handle initial URL (cold start)
    const handleInitialURL = async () => {
      const url = await Linking.getInitialURL();
      if (url) processDeepLink(url);
    };

    // Handle URL when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      processDeepLink(url);
    });

    handleInitialURL();

    return () => subscription.remove();
  }, []);

  // After login, check for pending event code
  useEffect(() => {
    if (token) {
      checkPendingEvent();
    }
  }, [token]);

  const checkPendingEvent = async () => {
    try {
      const pendingCode = await AsyncStorage.getItem(PENDING_EVENT_KEY);
      if (pendingCode) {
        // Navigate to join screen which will auto-enroll
        router.push(`/join/${pendingCode}`);
      }
    } catch {}
  };

  const processDeepLink = (url: string) => {
    try {
      const parsed = Linking.parse(url);
      // Handle arenakore://join/{code} or https://arenakore.com/join/{code}
      if (parsed.path?.startsWith('join/')) {
        const code = parsed.path.replace('join/', '');
        if (code) {
          router.push(`/join/${code}`);
        }
      }
    } catch {}
  };

  return null;
}

export default function RootLayout() {
  // Load Inter font for body text (does not affect icons or title weights)
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  // Render app even if fonts haven't loaded (falls back to system font)
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <DeepLinkHandler />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="join/[code]" options={{ presentation: 'modal' }} />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
