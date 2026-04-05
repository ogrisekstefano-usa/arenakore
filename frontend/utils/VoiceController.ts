/**
 * ARENAKORE — NEXUS VOICE CONTROLLER v6.0 (Safe Mode)
 * 
 * ✅ expo-av REMOVED (deprecated SDK 54 → native crash)
 * ✅ Safe no-op: all methods resolve silently without crashing
 * ✅ Audio playback will be migrated to hook-based expo-audio in a future sprint
 * ✅ This file MUST NOT import ANY native audio module at the top level
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type VoiceLang = 'IT' | 'EN' | 'ES';

const LANG_STORAGE_KEY = '@nexus_voice_lang';

class VoiceControllerClass {
  private lang: VoiceLang = 'IT';

  constructor() {
    AsyncStorage.getItem(LANG_STORAGE_KEY).then(saved => {
      if (saved === 'IT' || saved === 'EN' || saved === 'ES') this.lang = saved as VoiceLang;
    }).catch(() => {});
  }

  async setLanguage(lang: VoiceLang): Promise<void> {
    this.lang = lang;
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang).catch(() => {});
  }

  getCurrentLanguage(): VoiceLang { return this.lang; }
  resetSession(): void { /* no-op */ }
  async preloadAll(_lang?: VoiceLang): Promise<void> { /* no-op — safe mode */ }
  async stop(): Promise<void> { /* no-op */ }
  async play(_key: string): Promise<void> { /* no-op — safe mode */ }
  async playBeat(_beatIndex: number): Promise<void> { /* no-op */ }
}

export const VoiceController = new VoiceControllerClass();
