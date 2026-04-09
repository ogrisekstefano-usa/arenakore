// LAZY LOAD: expo-notifications loaded only when needed
// expo-device REMOVED — causes kernel sandbox violation on iPhone 15 Pro
import { Platform } from 'react-native';
function getNotifications(): any { try { return require('expo-notifications'); } catch { return null; } }
function getDevice(): any { return null; } // Disabled: sysctl sandbox deny

// Sport-specific notification profiles
export type NotificationTone = 'adrenalina' | 'precisione' | 'power';

interface SportNotificationConfig {
  tone: NotificationTone;
  title_prefix: string;
  vibration: number[];
  color: string;
}

const SPORT_CONFIGS: Record<string, SportNotificationConfig> = {
  // ADRENALINA — Basket, Atletica, CrossFit, Boxe
  'Basket': { tone: 'adrenalina', title_prefix: '🔥 FIRE!', vibration: [0, 200, 50, 200, 50, 300], color: '#FF3B30' },
  'Atletica': { tone: 'adrenalina', title_prefix: '⚡ SPRINT!', vibration: [0, 200, 50, 200, 50, 300], color: '#FF3B30' },
  'CrossFit': { tone: 'adrenalina', title_prefix: '💥 WOD!', vibration: [0, 200, 50, 200, 50, 300], color: '#FF3B30' },
  'Boxe': { tone: 'adrenalina', title_prefix: '🥊 FIGHT!', vibration: [0, 200, 50, 200, 50, 300], color: '#FF3B30' },
  // PRECISIONE — Golf, Nuoto, Tiro
  'Golf': { tone: 'precisione', title_prefix: '🎯 FOCUS!', vibration: [0, 100, 200, 100], color: '#00FF87' },
  'Nuoto': { tone: 'precisione', title_prefix: '🌊 FLOW!', vibration: [0, 100, 200, 100], color: '#007AFF' },
  'Tiro': { tone: 'precisione', title_prefix: '🎯 LOCK!', vibration: [0, 100, 200, 100], color: '#00FF87' },
  // POWER — Powerlifting, Fitness, General
  'Powerlifting': { tone: 'power', title_prefix: '💪 POWER!', vibration: [0, 300, 100, 300], color: '#FFD700' },
  'Fitness': { tone: 'power', title_prefix: '🏋️ GRIND!', vibration: [0, 300, 100, 300], color: '#FFD700' },
};

const DEFAULT_CONFIG: SportNotificationConfig = {
  tone: 'adrenalina',
  title_prefix: '⚡ ARENA!',
  vibration: [0, 200, 100, 200],
  color: '#00E5FF',
};

function getSportConfig(sport?: string): SportNotificationConfig {
  if (!sport) return DEFAULT_CONFIG;
  return SPORT_CONFIGS[sport] || DEFAULT_CONFIG;
}

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice || Platform.OS === 'web') return null;
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'arenakore-nexus',
    });
    return token.data;
  } catch {
    return null;
  }
}

export async function setupAndroidNotificationChannel() {
  if (Platform.OS !== 'android') return;
  // Adrenalina channel
  await Notifications.setNotificationChannelAsync('arenakore-adrenalina', {
    name: 'ArenaKore Adrenalina',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 200, 50, 200, 50, 300],
    lightColor: '#FF3B30',
    sound: 'default',
  });
  // Precisione channel
  await Notifications.setNotificationChannelAsync('arenakore-precisione', {
    name: 'ArenaKore Precisione',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 100, 200, 100],
    lightColor: '#00FF87',
    sound: 'default',
  });
  // Power channel
  await Notifications.setNotificationChannelAsync('arenakore-power', {
    name: 'ArenaKore Power',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 100, 300],
    lightColor: '#FFD700',
    sound: 'default',
  });
}

// Battle LIVE notification — sport-differentiated
export async function sendBattleLiveNotification(battleTitle: string, sport?: string) {
  if (Platform.OS === 'web') return;
  const config = getSportConfig(sport);
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${config.title_prefix} Battle Iniziata!`,
        body: `"${battleTitle}" è ora LIVE! Entra nell'Arena.`,
        sound: true,
        data: { type: 'battle_live', sport },
        ...(Platform.OS === 'android' && { channelId: `arenakore-${config.tone}` }),
      },
      trigger: null,
    });
  } catch (e) {
    // Production: error silenced
  }
}

// XP reward notification
export async function sendXPRewardNotification(xpEarned: number, recordsBroken: string[], sport?: string) {
  if (Platform.OS === 'web') return;
  const config = getSportConfig(sport);
  const recordText = recordsBroken.length > 0
    ? `\n🏆 Record infranti: ${recordsBroken.join(', ').toUpperCase()}`
    : '';
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${config.title_prefix} +${xpEarned} XP Guadagnati!`,
        body: `Challenge completata con successo!${recordText}`,
        sound: true,
        data: { type: 'xp_reward', xp: xpEarned },
        ...(Platform.OS === 'android' && { channelId: `arenakore-${config.tone}` }),
      },
      trigger: null,
    });
  } catch (e) {
    // Production: error silenced
  }
}

// Level up notification
export async function sendLevelUpNotification(newLevel: number) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌟 LEVEL UP!',
        body: `Hai raggiunto il Level ${newLevel}! La leggenda cresce.`,
        sound: true,
        data: { type: 'level_up', level: newLevel },
        ...(Platform.OS === 'android' && { channelId: 'arenakore-power' }),
      },
      trigger: null,
    });
  } catch (e) {
    // Production: error silenced
  }
}

// Scan complete notification
export async function sendScanCompleteNotification(score: number) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📡 Nexus Scan Completato',
        body: `Performance score: ${score.toFixed(1)}% — Analisi DNA aggiornata.`,
        sound: true,
        data: { type: 'scan_complete', score },
        ...(Platform.OS === 'android' && { channelId: 'arenakore-precisione' }),
      },
      trigger: null,
    });
  } catch (e) {
    // Production: error silenced
  }
}
