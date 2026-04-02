import React, { useEffect } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import {
  useFonts,
  Montserrat_300Light,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';
import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

// ── Inject Google Fonts for Web (Montserrat + Plus Jakarta Sans + Syne) ──
function InjectWebFonts() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.getElementById('ak-global-fonts')) return;
    const link = document.createElement('link');
    link.id = 'ak-global-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap';
    document.head.appendChild(link);
  }, []);
  return null;
}

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
  // Load Montserrat as the SOLE font system (300/400/500/700/800)
  const [fontsLoaded] = useFonts({
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  // Render app even if fonts haven't loaded (falls back to system font)
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <InjectWebFonts />
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
