/**
 * ARENAKORE — Haptics Helper (Lazy-Loaded)
 * 
 * CRITICAL: expo-haptics MUST be lazy-loaded to prevent iOS Expo Go crashes.
 * This helper wraps all haptic calls with try/catch and lazy require().
 * Import this instead of expo-haptics directly.
 */
import { Platform } from 'react-native';

let _Haptics: any = null;

function getHaptics() {
  if (_Haptics) return _Haptics;
  if (Platform.OS === 'web') return null;
  try {
    _Haptics = require('expo-haptics');
    return _Haptics;
  } catch {
    return null;
  }
}

export const ImpactFeedbackStyle = {
  Light: 'Light' as const,
  Medium: 'Medium' as const,
  Heavy: 'Heavy' as const,
};

export const NotificationFeedbackType = {
  Success: 'Success' as const,
  Warning: 'Warning' as const,
  Error: 'Error' as const,
};

export async function impactAsync(style?: string) {
  try {
    const H = getHaptics();
    if (H) await H.impactAsync(H.ImpactFeedbackStyle?.[style || 'Medium'] || style);
  } catch {}
}

export async function notificationAsync(type?: string) {
  try {
    const H = getHaptics();
    if (H) await H.notificationAsync(H.NotificationFeedbackType?.[type || 'Success'] || type);
  } catch {}
}

export async function selectionAsync() {
  try {
    const H = getHaptics();
    if (H) await H.selectionAsync();
  } catch {}
}

// Default export mimics the expo-haptics API
const Haptics = {
  impactAsync,
  notificationAsync,
  selectionAsync,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
};

export default Haptics;
