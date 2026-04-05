/**
 * ARENAKORE — NEXUS VOICE CONTROLLER v5.0
 * 
 * ✅ Migrated from expo-av (deprecated SDK 54) → expo-audio AudioPlayer
 * ✅ 100% Stefano Ogrisek MP3 — ZERO Speech.speak() / TTS
 * ✅ Pre-load buffer: all 15 files loaded on scanner mount
 * ✅ Audio lock 1.5s: prevents overlap / "disco rotto" effect
 * ✅ console.error if file missing — stays SILENT (no TTS fallback)
 */
import { AudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type VoiceLang = 'IT' | 'EN' | 'ES';

// ── VOICE MAP (45 files — all require())
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
    ACKNOWLEDGED:   require('../assets/voice/it/acknowledged.mp3'),
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
    ACKNOWLEDGED:   require('../assets/voice/en/acknowledged.mp3'),
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
    ACKNOWLEDGED:   require('../assets/voice/es/acknowledged.mp3'),
  },
};

const ONE_SHOT_KEYS = new Set(['WELCOME', 'NEXUS_ACTIVE', 'DETECTION_LOCK', 'SUCCESS']);
const LANG_STORAGE_KEY = '@nexus_voice_lang';

class VoiceControllerClass {
  private lang: VoiceLang = 'EN';
  private playerCache = new Map<string, AudioPlayer>();
  private currentPlayer: AudioPlayer | null = null;
  private hasPlayedSet = new Set<string>();
  private lastPlayStart = 0;
  private AUDIO_LOCK_MS = 1500;

  constructor() {
    AsyncStorage.getItem(LANG_STORAGE_KEY).then(saved => {
      if (saved === 'IT' || saved === 'EN' || saved === 'ES') this.lang = saved;
    }).catch(() => {});
  }

  async setLanguage(lang: VoiceLang): Promise<void> {
    this.lang = lang;
    this.hasPlayedSet.clear();
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang).catch(() => {});
    await this.preloadAll(lang);
  }

  getCurrentLanguage(): VoiceLang { return this.lang; }

  resetSession(): void {
    this.hasPlayedSet.clear();
    this.lastPlayStart = 0;
  }

  // ── PRE-LOAD BUFFER: call on scanner screen mount
  async preloadAll(lang?: VoiceLang): Promise<void> {
    const targetLang = lang ?? this.lang;
    await this.releaseAll();

    const voices = NEXUS_VOICES[targetLang];
    let loaded = 0;
    for (const [key, module] of Object.entries(voices)) {
      try {
        const player = new AudioPlayer(module);
        this.playerCache.set(`${targetLang}_${key}`, player);
        loaded++;
      } catch (e) {
        console.error(`[VoiceController] PRELOAD FAILED: ${targetLang}/${key}.mp3`, e);
      }
    }
    console.log(`[VoiceController] Preloaded ${loaded}/15 (${targetLang})`);
  }

  private async releaseAll(): Promise<void> {
    this.playerCache.forEach((player) => {
      try { player.release(); } catch (_e) {}
    });
    this.playerCache.clear();
    this.currentPlayer = null;
  }

  async stop(): Promise<void> {
    const player = this.currentPlayer;
    if (!player) return;
    this.currentPlayer = null;
    try {
      player.pause();
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
    let player = this.playerCache.get(cacheKey);

    if (!player) {
      // Not preloaded — try on-demand
      const module = NEXUS_VOICES[this.lang]?.[key] ?? null;
      if (module === null) {
        console.error(`[VoiceController] MISSING FILE: ${this.lang}/${key}.mp3 — staying silent`);
        return;
      }
      try {
        player = new AudioPlayer(module);
        this.playerCache.set(cacheKey, player);
      } catch (e) {
        console.error(`[VoiceController] LOAD FAILED: ${this.lang}/${key}.mp3`, e);
        return;
      }
    }

    // Play
    try {
      player.seekTo(0);
      player.play();
      this.currentPlayer = player;
      this.lastPlayStart = Date.now();
      if (ONE_SHOT_KEYS.has(key)) this.hasPlayedSet.add(`${this.lang}_${key}`);
    } catch (e) {
      console.error(`[VoiceController] PLAY FAILED: ${this.lang}/${key}`, e);
    }
  }

  async playBeat(beatIndex: number): Promise<void> {
    await this.play(`BEAT_${beatIndex + 1}`);
  }
}

export const VoiceController = new VoiceControllerClass();
