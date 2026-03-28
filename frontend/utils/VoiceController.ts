/**
 * ARENAKORE — NEXUS VOICE CONTROLLER v4.0
 * 
 * ✅ 100% Stefano Ogrisek MP3 — ZERO Speech.speak() / TTS
 * ✅ Pre-load buffer: all 14 files loaded on scanner mount
 * ✅ Audio lock 1.5s: prevents overlap / "disco rotto" effect
 * ✅ console.error if file missing — stays SILENT (no TTS fallback)
 */
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type VoiceLang = 'IT' | 'EN' | 'ES';

// ── VOICE MAP (42 files — all require())
const NEXUS_VOICES: Record<VoiceLang, Record<string, any>> = {
  IT: {
    WELCOME:        require('../assets/voice/it/welcome.mp3'),
    POSITIONING:    require('../assets/voice/it/positioning.mp3'),
    DETECTION_LOCK: require('../assets/voice/it/detection_lock.mp3'),
    COUNTDOWN:      require('../assets/voice/it/countdown.mp3'),
    BEAT_1:         require('../assets/voice/it/beat_1.mp3'),
    BEAT_2:         require('../assets/voice/it/beat_2.mp3'),
    BEAT_3:         require('../assets/voice/it/beat_3.mp3'),
    BEAT_4:         require('../assets/voice/it/beat_4.mp3'),
    BEAT_5:         require('../assets/voice/it/beat_5.mp3'),
    SUCCESS:        require('../assets/voice/it/success.mp3'),
    REPEAT_WARN:    require('../assets/voice/it/repeat_warn.mp3'),
    FEET_GUIDANCE:  require('../assets/voice/it/feet_guidance.mp3'),
    CHEAT_DETECTED: require('../assets/voice/it/cheat_detected.mp3'),
    NEXUS_ACTIVE:   require('../assets/voice/it/nexus_active.mp3'),
  },
  EN: {
    WELCOME:        require('../assets/voice/en/welcome.mp3'),
    POSITIONING:    require('../assets/voice/en/positioning.mp3'),
    DETECTION_LOCK: require('../assets/voice/en/detection_lock.mp3'),
    COUNTDOWN:      require('../assets/voice/en/countdown.mp3'),
    BEAT_1:         require('../assets/voice/en/beat_1.mp3'),
    BEAT_2:         require('../assets/voice/en/beat_2.mp3'),
    BEAT_3:         require('../assets/voice/en/beat_3.mp3'),
    BEAT_4:         require('../assets/voice/en/beat_4.mp3'),
    BEAT_5:         require('../assets/voice/en/beat_5.mp3'),
    SUCCESS:        require('../assets/voice/en/success.mp3'),
    REPEAT_WARN:    require('../assets/voice/en/repeat_warn.mp3'),
    FEET_GUIDANCE:  require('../assets/voice/en/feet_guidance.mp3'),
    CHEAT_DETECTED: require('../assets/voice/en/cheat_detected.mp3'),
    NEXUS_ACTIVE:   require('../assets/voice/en/nexus_active.mp3'),
  },
  ES: {
    WELCOME:        require('../assets/voice/es/welcome.mp3'),
    POSITIONING:    require('../assets/voice/es/positioning.mp3'),
    DETECTION_LOCK: require('../assets/voice/es/detection_lock.mp3'),
    COUNTDOWN:      require('../assets/voice/es/countdown.mp3'),
    BEAT_1:         require('../assets/voice/es/beat_1.mp3'),
    BEAT_2:         require('../assets/voice/es/beat_2.mp3'),
    BEAT_3:         require('../assets/voice/es/beat_3.mp3'),
    BEAT_4:         require('../assets/voice/es/beat_4.mp3'),
    BEAT_5:         require('../assets/voice/es/beat_5.mp3'),
    SUCCESS:        require('../assets/voice/es/success.mp3'),
    REPEAT_WARN:    require('../assets/voice/es/repeat_warn.mp3'),
    FEET_GUIDANCE:  require('../assets/voice/es/feet_guidance.mp3'),
    CHEAT_DETECTED: require('../assets/voice/es/cheat_detected.mp3'),
    NEXUS_ACTIVE:   require('../assets/voice/es/nexus_active.mp3'),
  },
};

const ONE_SHOT_KEYS = new Set(['WELCOME', 'NEXUS_ACTIVE', 'DETECTION_LOCK', 'SUCCESS']);
const LANG_STORAGE_KEY = '@nexus_voice_lang';

class VoiceControllerClass {
  private lang: VoiceLang = 'EN';
  private soundCache     = new Map<string, Audio.Sound>(); // preloaded sounds
  private currentSound: Audio.Sound | null = null;
  private audioModeSet   = false;
  private hasPlayedSet   = new Set<string>();
  private lastPlayStart  = 0;
  private AUDIO_LOCK_MS  = 1500; // 1.5s gap between plays

  constructor() {
    AsyncStorage.getItem(LANG_STORAGE_KEY).then(saved => {
      if (saved === 'IT' || saved === 'EN' || saved === 'ES') this.lang = saved;
    }).catch(() => {});
  }

  async setLanguage(lang: VoiceLang): Promise<void> {
    this.lang = lang;
    this.hasPlayedSet.clear();
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang).catch(() => {});
    await this.preloadAll(lang); // reload for new language
  }

  getCurrentLanguage(): VoiceLang { return this.lang; }

  resetSession(): void {
    this.hasPlayedSet.clear();
    this.lastPlayStart = 0;
  }

  // ── PRE-LOAD BUFFER: call on scanner screen mount
  async preloadAll(lang?: VoiceLang): Promise<void> {
    const targetLang = lang ?? this.lang;
    await this.unloadAll();
    await this.ensureAudioMode();

    const voices = NEXUS_VOICES[targetLang];
    let loaded = 0;
    for (const [key, module] of Object.entries(voices)) {
      try {
        const { sound } = await Audio.Sound.createAsync(module, { shouldPlay: false, volume: 1.0 });
        this.soundCache.set(`${targetLang}_${key}`, sound);
        loaded++;
      } catch (e) {
        console.error(`%c[VoiceController] ❌ PRELOAD FAILED: ${targetLang}/${key}.mp3`, 'color:red;font-weight:bold', e);
      }
    }
    console.log(`[VoiceController] ✅ Preloaded ${loaded}/14 (${targetLang})`);
  }

  private async unloadAll(): Promise<void> {
    for (const [, sound] of this.soundCache.entries()) {
      try { await sound.unloadAsync(); } catch (_e) {}
    }
    this.soundCache.clear();
  }

  private async ensureAudioMode() {
    if (this.audioModeSet) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,   // duck other audio on Android
      });
      this.audioModeSet = true;
    } catch (_e) {}
  }

  async stop(): Promise<void> {
    const sound = this.currentSound;
    if (!sound) return;
    this.currentSound = null;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          for (let v = 0.75; v >= 0; v -= 0.25) {
            try { await sound.setVolumeAsync(Math.max(0, v)); } catch (_e) {}
            await new Promise(r => setTimeout(r, 50));
          }
          await sound.stopAsync();
        }
        // Don't unload from cache — keep it for next play
        await sound.setPositionAsync(0);
        await sound.setVolumeAsync(1.0);
      }
    } catch (_e) {}
  }

  /**
   * Play by key.
   * - ZERO TTS fallback: if file missing → silent + console.error
   * - Audio lock 1.5s: ignores calls while lock is active
   * - One-shot: WELCOME/SUCCESS etc. play once per session
   */
  async play(key: string): Promise<void> {
    // One-shot guard
    if (ONE_SHOT_KEYS.has(key) && this.hasPlayedSet.has(`${this.lang}_${key}`)) return;

    // Audio lock: prevent disco-rotto overlap
    const now = Date.now();
    if (now - this.lastPlayStart < this.AUDIO_LOCK_MS) return;

    await this.stop();

    // Get from pre-loaded cache
    const cacheKey = `${this.lang}_${key}`;
    let sound = this.soundCache.get(cacheKey);

    if (!sound) {
      // Not preloaded — try on-demand
      const module = NEXUS_VOICES[this.lang]?.[key] ?? null;
      if (module === null) {
        console.error(`%c[VoiceController] ❌ MISSING FILE: ${this.lang}/${key}.mp3 — staying silent`, 'color:red;font-weight:bold');
        return; // ← NO TTS FALLBACK
      }
      try {
        await this.ensureAudioMode();
        const loaded = await Audio.Sound.createAsync(module, { shouldPlay: false, volume: 1.0 });
        sound = loaded.sound;
        this.soundCache.set(cacheKey, sound); // cache it
      } catch (e) {
        console.error(`%c[VoiceController] ❌ LOAD FAILED: ${this.lang}/${key}.mp3`, 'color:red', e);
        return; // ← NO TTS FALLBACK
      }
    }

    // Play
    try {
      await this.ensureAudioMode();
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync(1.0);
      await sound.playAsync();
      this.currentSound = sound;
      this.lastPlayStart = Date.now();
      if (ONE_SHOT_KEYS.has(key)) this.hasPlayedSet.add(`${this.lang}_${key}`);
    } catch (e) {
      console.error(`%c[VoiceController] ❌ PLAY FAILED: ${this.lang}/${key}`, 'color:red', e);
    }
  }

  async playBeat(beatIndex: number): Promise<void> {
    await this.play(`BEAT_${beatIndex + 1}`);
  }
}

export const VoiceController = new VoiceControllerClass();
