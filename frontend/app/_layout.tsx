import React, { useEffect } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
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
      const path = parsed.path || '';
      const params = parsed.queryParams || {};

      // Handle arenakore://join/{code} or https://arenakore.com/join/{code}
      if (path.startsWith('join/')) {
        const code = path.replace('join/', '');
        if (code) {
          router.push(`/join/${code}`);
        }
        return;
      }

      // Handle arenakore://challenge/{id} — open NÈXUS tab with specific challenge
      if (path.startsWith('challenge/')) {
        const challengeId = path.replace('challenge/', '');
        if (challengeId) {
          router.push({ pathname: '/(tabs)/nexus-trigger', params: { pvpChallengeId: challengeId } });
        }
        return;
      }

      // Handle arenakore://profile/{username} — open KORE tab with user profile
      if (path.startsWith('profile/')) {
        const username = path.replace('profile/', '');
        if (username) {
          router.push({ pathname: '/(tabs)/kore', params: { viewUsername: username } });
        }
        return;
      }

      // Handle arenakore://nexus — open NÈXUS tab (with optional template_id)
      if (path === 'nexus' || path === 'nexus-trigger') {
        const templateId = params.template_id as string;
        if (templateId) {
          router.push({ pathname: '/(tabs)/nexus-trigger', params: { template_id: templateId } });
        } else {
          router.push('/(tabs)/nexus-trigger');
        }
        return;
      }

      // Handle arenakore://kore — open KORE tab
      if (path === 'kore') {
        router.push('/(tabs)/kore');
        return;
      }

      // Handle arenakore://rank — open RANK tab
      if (path === 'rank' || path === 'hall') {
        router.push('/(tabs)/hall');
        return;
      }

      // Handle generic query params on tabs
      if (params.challenge_id) {
        router.push({ pathname: '/(tabs)/nexus-trigger', params: { pvpChallengeId: params.challenge_id as string } });
        return;
      }

      if (params.template_id) {
        router.push({ pathname: '/(tabs)/nexus-trigger', params: { template_id: params.template_id as string } });
        return;
      }

      if (params.user_id) {
        router.push({ pathname: '/(tabs)/kore', params: { viewUserId: params.user_id as string } });
        return;
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
    <GlobalErrorBoundary>
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
    </GlobalErrorBoundary>
  );
}
