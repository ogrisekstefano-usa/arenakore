/**
 * ARENAKORE — Root Layout (Build 10)
 * UIScene-compliant boot sequence:
 *  1. Splash stays visible
 *  2. Fonts load (or timeout)
 *  3. Scene mounts
 *  4. Splash hides
 *  5. ONLY THEN: Auth check + network calls
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, LogBox, View } from 'react-native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { GlobalErrorBoundary } from '../components/GlobalErrorBoundary';
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

// ══════════════════════════════════════════════════════════════
// BOOT PHASE 1: Keep splash visible. NO network, NO async.
// ══════════════════════════════════════════════════════════════
if (Platform.OS !== 'web') {
  LogBox.ignoreLogs(['Reanimated', 'shadow', 'pointerEvents', 'VirtualizedLists']);
}

try { SplashScreen.preventAutoHideAsync(); } catch {}

// Tells Expo Router this is the initial route (prevents back-nav glitch)
export const unstable_settings = {
  initialRouteName: 'index',
};

// ── Inject Google Fonts for Web only ──
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

// ── Deep Link Handler (only active AFTER scene is mounted) ──
const PENDING_EVENT_KEY = '@arenakore_pending_event';

function DeepLinkHandler() {
  const router = useRouter();
  const { token } = useAuth();

  useEffect(() => {
    const handleInitialURL = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) processDeepLink(url, router);
      } catch {}
    };
    const subscription = Linking.addEventListener('url', ({ url }) => {
      processDeepLink(url, router);
    });
    handleInitialURL();
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (token) {
      AsyncStorage.getItem(PENDING_EVENT_KEY)
        .then(code => { if (code) router.push(`/join/${code}`); })
        .catch(() => {});
    }
  }, [token]);

  return null;
}

function processDeepLink(url: string, router: any) {
  try {
    const parsed = Linking.parse(url);
    const path = parsed.path || '';
    const params = parsed.queryParams || {};
    if (path.startsWith('join/')) { router.push(`/join/${path.replace('join/', '')}`); return; }
    if (path.startsWith('challenge/')) { router.push({ pathname: '/(tabs)/nexus-trigger', params: { pvpChallengeId: path.replace('challenge/', '') } }); return; }
    if (path.startsWith('profile/')) { router.push({ pathname: '/(tabs)/kore', params: { viewUsername: path.replace('profile/', '') } }); return; }
    if (path === 'nexus' || path === 'nexus-trigger') { router.push('/(tabs)/nexus-trigger'); return; }
    if (path === 'kore') { router.push('/(tabs)/kore'); return; }
    if (path === 'rank' || path === 'hall') { router.push('/(tabs)/hall'); return; }
    if (params.challenge_id) { router.push({ pathname: '/(tabs)/nexus-trigger', params: { pvpChallengeId: params.challenge_id as string } }); return; }
  } catch {}
}

// ══════════════════════════════════════════════════════════════
// BOOT PHASE 2: RootLayout — fonts, then mount, then splash hide
// ══════════════════════════════════════════════════════════════
export default function RootLayout() {
  const [sceneMounted, setSceneMounted] = useState(false);

  // Load fonts
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

  // BOOT PHASE 3: Scene mounted → hide splash → enable auth
  const onLayoutReady = useCallback(async () => {
    if (fontsLoaded || Platform.OS !== 'web') {
      try { await SplashScreen.hideAsync(); } catch {}
      // Small delay to let the native scene fully settle
      setTimeout(() => setSceneMounted(true), 100);
    }
  }, [fontsLoaded]);

  // If fonts haven't loaded after 3s, proceed anyway (system font fallback)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!fontsLoaded) {
        SplashScreen.hideAsync().catch(() => {});
        setSceneMounted(true);
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [fontsLoaded]);

  return (
    <GlobalErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1 }} onLayout={onLayoutReady}>
          <SafeAreaProvider>
            <AuthProvider deferAuth={!sceneMounted}>
              {Platform.OS === 'web' && <InjectWebFonts />}
              {sceneMounted && <DeepLinkHandler />}
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="register" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="calibration-test" />
                <Stack.Screen name="activity-log" />
                <Stack.Screen name="join/[code]" options={{ presentation: 'modal' }} />
              </Stack>
            </AuthProvider>
          </SafeAreaProvider>
        </View>
      </GestureHandlerRootView>
    </GlobalErrorBoundary>
  );
}
