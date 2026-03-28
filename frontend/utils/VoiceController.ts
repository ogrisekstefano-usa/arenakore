/**
 * ARENAKORE — NEXUS VOICE CONTROLLER v1.0
 *
 * Gestisce la voce reale di Stefano Ogrisek (file mp3 locali via expo-av).
 * Fallback silenzioso a Speech.speak() se il file non è ancora presente.
 * Overlap guard: ogni nuovo comando interrompe quello precedente (fade-out).
 *
 * COME AGGIUNGERE LA VOCE REALE:
 * 1. Posiziona i file mp3 in /app/frontend/assets/voice/
 * 2. Decommenta la riga require() corrispondente in NEXUS_VOICE_MAP
 * 3. Il VoiceController userà automaticamente il file reale
 */
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

// ── VOICE MAP
// null    = placeholder (voce di sistema)
// require = file audio reale (voce di Stefano)
// ─────────────────────────────────────────────────────────────────
export const NEXUS_VOICE_MAP: Record<string, any | null> = {
  WELCOME:        null, // require('../../assets/voice/benvenuto.mp3'),
  POSITIONING:    null, // require('../../assets/voice/posizionati.mp3'),
  DETECTION_LOCK: null, // require('../../assets/voice/ti-ho-visto.mp3'),
  COUNTDOWN:      null, // require('../../assets/voice/countdown.mp3'),
  BEAT_1:         null, // require('../../assets/voice/esercizio_1.mp3'),
  BEAT_2:         null, // require('../../assets/voice/esercizio_2.mp3'),
  BEAT_3:         null, // require('../../assets/voice/esercizio_3.mp3'),
  BEAT_4:         null, // require('../../assets/voice/esercizio_4.mp3'),
  BEAT_5:         null, // require('../../assets/voice/esercizio_5.mp3'),
  SUCCESS:        null, // require('../../assets/voice/dna-generato.mp3'),
  REPEAT_WARN:    null, // require('../../assets/voice/ripeti.mp3'),
  NEXUS_ACTIVE:   null, // require('../../assets/voice/nexus-attivo.mp3'),
};

// ── TTS FALLBACK MESSAGES (italiano, voce di sistema)
// Usati quando il file mp3 è null o fallisce il caricamento
export const NEXUS_TTS_FALLBACK: Record<string, string> = {
  WELCOME:
    'Benvenuto nel Nexus Protocol. Tra cinque secondi la camera si attiverà.',
  POSITIONING:
    'Nexus attivo. Posizionati al centro della camera.',
  DETECTION_LOCK:
    'Ti ho visto. Mantieni la posizione per due secondi.',
  COUNTDOWN:
    'Biometria confermata. Preparati. Tre, due, uno.',
  BEAT_1:
    'Beat uno: Posa neutrale. Mantieni la posizione.',
  BEAT_2:
    'Beat due: Alza le braccia sopra la testa.',
  BEAT_3:
    'Beat tre: T-Pose. Braccia aperte.',
  BEAT_4:
    'Beat quattro: Mezzo squat. Tieni.',
  BEAT_5:
    'Beat cinque: Generazione Kore DNA in corso.',
  SUCCESS:
    'Kore DNA generato con successo. Benvenuto nell\'Arena.',
  REPEAT_WARN:
    'Ripeti il movimento, non ti ho visto!',
  NEXUS_ACTIVE:
    'Nexus attivo. Posizionati al centro della camera.',
};

// ── TTS RATE (adjust per key for natural pacing)
const NEXUS_TTS_RATE: Record<string, number> = {
  WELCOME:        0.80,
  POSITIONING:    0.82,
  DETECTION_LOCK: 0.85,
  COUNTDOWN:      0.88,
  BEAT_1:         0.88,
  BEAT_2:         0.88,
  BEAT_3:         0.88,
  BEAT_4:         0.88,
  BEAT_5:         0.82,
  SUCCESS:        0.80,
  REPEAT_WARN:    0.92,
  NEXUS_ACTIVE:   0.82,
};

// ─────────────────────────────────────────────────────────────────
// VOICE CONTROLLER SINGLETON
// ─────────────────────────────────────────────────────────────────
class VoiceControllerClass {
  private currentSound: Audio.Sound | null = null;
  private audioModeSet = false;

  /** Ensure iOS plays audio even in silent mode */
  private async ensureAudioMode() {
    if (this.audioModeSet) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      this.audioModeSet = true;
    } catch (_e) {}
  }

  /** Fade-out + stop + unload the currently playing sound */
  async stop(): Promise<void> {
    // Stop any TTS first
    try { Speech.stop(); } catch (_e) {}

    const sound = this.currentSound;
    if (!sound) return;
    this.currentSound = null;

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          // Quick fade-out over 180ms (3 steps × 60ms)
          for (let vol = 0.75; vol >= 0; vol -= 0.25) {
            try { await sound.setVolumeAsync(Math.max(0, vol)); } catch (_e) {}
            await new Promise(r => setTimeout(r, 60));
          }
          await sound.stopAsync();
        }
        await sound.unloadAsync();
      }
    } catch (_e) {
      // Already unloaded or in bad state — ignore
    }
  }

  /**
   * Play a voice cue by key.
   * 1. Stops any currently playing audio (with fade-out).
   * 2. Tries to load and play the mp3 from NEXUS_VOICE_MAP.
   * 3. Falls back to Speech.speak() silently if file is null or fails.
   */
  async play(key: string): Promise<void> {
    await this.stop();

    const audioModule = NEXUS_VOICE_MAP[key] ?? null;
    const ttsText = NEXUS_TTS_FALLBACK[key] ?? '';
    const ttsRate = NEXUS_TTS_RATE[key] ?? 0.82;

    if (audioModule !== null) {
      // ── Try real audio file
      try {
        await this.ensureAudioMode();
        const { sound } = await Audio.Sound.createAsync(
          audioModule,
          { shouldPlay: true, volume: 1.0 },
        );
        this.currentSound = sound;

        // Auto-cleanup when playback ends
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
            if (this.currentSound === sound) this.currentSound = null;
          }
        });
        return; // File played successfully — no TTS needed
      } catch (_e) {
        this.currentSound = null;
        // Fall through to TTS
      }
    }

    // ── TTS fallback (silent fallback: never throws, never blocks)
    if (ttsText) {
      try {
        Speech.speak(ttsText, { language: 'it-IT', rate: ttsRate, pitch: 1.0 });
      } catch (_e) {}
    }
  }

  /**
   * Play for BEATS phase: accepts beat index (0-based) and optional custom text.
   */
  async playBeat(beatIndex: number, overrideText?: string): Promise<void> {
    const key = `BEAT_${beatIndex + 1}` as keyof typeof NEXUS_VOICE_MAP;
    if (overrideText) {
      await this.stop();
      const rate = NEXUS_TTS_RATE[key] ?? 0.88;
      try { Speech.speak(overrideText, { language: 'it-IT', rate, pitch: 1.0 }); } catch (_e) {}
    } else {
      await this.play(key);
    }
  }
}

// Export singleton
export const VoiceController = new VoiceControllerClass();
