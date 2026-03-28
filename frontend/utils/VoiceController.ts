/**
 * ARENAKORE — NEXUS VOICE CONTROLLER v2.0
 *
 * Gestisce la voce reale di Stefano Ogrisek (file mp3 locali via expo-av).
 * Fallback silenzioso a Speech.speak() se il file non è ancora presente.
 * Overlap guard: ogni nuovo comando interrompe quello precedente (fade-out).
 * One-shot guard: WELCOME, DETECTION_LOCK etc. suonano solo una volta per sessione.
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
  CHEAT_DETECTED: null, // require('../../assets/voice/cheat-detected.mp3'),
};

// ── TTS FALLBACK MESSAGES — con accentazione corretta per sintetizzatore italiano
// La punteggiatura e le virgole forzano pause naturali. Gli accenti aiutano la pronuncia.
export const NEXUS_TTS_FALLBACK: Record<string, string> = {
  WELCOME:
    'Benvenuto nel Nèxus Protocol. Tra cinque secondi, la camera si attiverà.',
  POSITIONING:
    'Nèxus attivo. Pòsizionati al centro della camera.',
  DETECTION_LOCK:
    'Ti ho visto. Mantieni la posizione, per due secondi.',
  COUNTDOWN:
    'Biomètria confermata. Preparati. Tre... due... uno.',
  BEAT_1:
    'Bit uno: Posa neutrale. Mantieni ferma la posizione.',
  BEAT_2:
    'Bit due: Alza le braccia, sopra la testa.',
  BEAT_3:
    'Bit tre: T-Pose. Braccia aperte, orizzontali.',
  BEAT_4:
    'Bit quattro: Mezzo squat. Tieni la posizione.',
  BEAT_5:
    'Bit cinque: Generazione Di-En-A Korè, in corso.',
  SUCCESS:
    'Korè Di-En-A generato con successo. Benvenuto nell\'Arena.',
  REPEAT_WARN:
    'Ripèti il movimento, non ti ho visto!',
  NEXUS_ACTIVE:
    'Nèxus attivo. Pòsizionati al centro della camera.',
  CHEAT_DETECTED:
    'Atleta non riconosciuto. Il Nèxus ha rilevato un cambio di identità. Rìtorna al centro.',
  FEET_GUIDANCE:
    'Inquadra i piedi. Allòntanati ancora un po\'.',

};

// ── TTS RATE per chiave
const NEXUS_TTS_RATE: Record<string, number> = {
  WELCOME:        0.78,
  POSITIONING:    0.80,
  DETECTION_LOCK: 0.82,
  COUNTDOWN:      0.85,
  BEAT_1:         0.86,
  BEAT_2:         0.86,
  BEAT_3:         0.86,
  BEAT_4:         0.86,
  BEAT_5:         0.80,
  SUCCESS:        0.78,
  REPEAT_WARN:    0.90,
  NEXUS_ACTIVE:   0.80,
  CHEAT_DETECTED: 0.88,
};

// ── ONE-SHOT KEYS: questi cue suonano UNA SOLA VOLTA per sessione.
// Se l'atleta esce e rientra, il sistema non ripete 'Benvenuto'.
const ONE_SHOT_KEYS = new Set([
  'WELCOME',
  'NEXUS_ACTIVE',
  'DETECTION_LOCK',
  'SUCCESS',
]);

// ─────────────────────────────────────────────────────────────────
// VOICE CONTROLLER SINGLETON
// ─────────────────────────────────────────────────────────────────
class VoiceControllerClass {
  private currentSound: Audio.Sound | null = null;
  private audioModeSet = false;
  private hasPlayedSet = new Set<string>(); // one-shot tracking

  /** Reset session flags (call when restarting the scan) */
  resetSession(): void {
    this.hasPlayedSet.clear();
  }

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
    try { Speech.stop(); } catch (_e) {}
    const sound = this.currentSound;
    if (!sound) return;
    this.currentSound = null;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          for (let vol = 0.75; vol >= 0; vol -= 0.25) {
            try { await sound.setVolumeAsync(Math.max(0, vol)); } catch (_e) {}
            await new Promise(r => setTimeout(r, 60));
          }
          await sound.stopAsync();
        }
        await sound.unloadAsync();
      }
    } catch (_e) {}
  }

  /**
   * Play a voice cue by key.
   * - ONE-SHOT guard: WELCOME, NEXUS_ACTIVE, DETECTION_LOCK, SUCCESS play once per session.
   * - Overlap guard: stops previous audio before starting new one.
   * - Fallback: TTS if mp3 is null or fails.
   */
  async play(key: string): Promise<void> {
    // ONE-SHOT guard: skip if already played this session
    if (ONE_SHOT_KEYS.has(key) && this.hasPlayedSet.has(key)) {
      return; // silently skip — don't repeat welcome to returning athlete
    }

    await this.stop();

    const audioModule = NEXUS_VOICE_MAP[key] ?? null;
    const ttsText = NEXUS_TTS_FALLBACK[key] ?? '';
    const ttsRate = NEXUS_TTS_RATE[key] ?? 0.80;

    if (audioModule !== null) {
      try {
        await this.ensureAudioMode();
        const { sound } = await Audio.Sound.createAsync(
          audioModule,
          { shouldPlay: true, volume: 1.0 },
        );
        this.currentSound = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
            if (this.currentSound === sound) this.currentSound = null;
          }
        });
        if (ONE_SHOT_KEYS.has(key)) this.hasPlayedSet.add(key);
        return;
      } catch (_e) {
        this.currentSound = null;
      }
    }

    // TTS fallback
    if (ttsText) {
      try {
        Speech.speak(ttsText, { language: 'it-IT', rate: ttsRate, pitch: 1.0 });
        if (ONE_SHOT_KEYS.has(key)) this.hasPlayedSet.add(key);
      } catch (_e) {}
    }
  }

  /** Play beat cue (beats always play, never one-shot) */
  async playBeat(beatIndex: number, overrideText?: string): Promise<void> {
    const key = `BEAT_${beatIndex + 1}`;
    if (overrideText) {
      await this.stop();
      const rate = NEXUS_TTS_RATE[key] ?? 0.86;
      try { Speech.speak(overrideText, { language: 'it-IT', rate, pitch: 1.0 }); } catch (_e) {}
    } else {
      await this.play(key);
    }
  }
}

// Export singleton
export const VoiceController = new VoiceControllerClass();
