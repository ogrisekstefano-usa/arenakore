/**
 * ARENAKORE — NEXUS VOICE CONTROLLER v3.0 (Multilingual)
 *
 * Gestisce IT / EN / ES con file MP3 reali (42 file generati).
 * The Butter: Low-Pass Filter (alpha 0.55) già nel scanner HTML.
 * Overlap guard: fade-out prima del prossimo cue.
 * One-shot: WELCOME, NEXUS_ACTIVE, DETECTION_LOCK, SUCCESS → una volta per sessione.
 *
 * COME SOSTITUIRE CON LA VOCE DI STEFANO:
 * 1. Registra il file MP3 con la stessa frase (specs: 44.1kHz, 128kbps, ~2-4s)
 * 2. Sovrascrivilo in assets/voice/{lang}/{key}.mp3
 * 3. Il controller usa automaticamente il nuovo file (no code change needed)
 */
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type VoiceLang = 'IT' | 'EN' | 'ES';

// ── ALL 42 VOICE FILES (IT × 14 + EN × 14 + ES × 14)
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

// ── TTS FALLBACK (when MP3 fails or for unsupported keys)
const TTS_FALLBACK: Record<VoiceLang, Record<string, { text: string; rate: number }>> = {
  IT: {
    WELCOME:        { text: 'Benvenuto nel Protocollo Nèxus. Entra nell\'Arena.',                rate: 0.78 },
    POSITIONING:    { text: 'Nèxus attivo. Pòsizionati al centro della camera.',                rate: 0.80 },
    DETECTION_LOCK: { text: 'Ti ho visto. Mantieni la posizione per due secondi.',              rate: 0.82 },
    COUNTDOWN:      { text: 'Biomètria confermata. Tre, due, uno.',                              rate: 0.85 },
    BEAT_1:         { text: 'Bit uno: Posa neutrale.',                                           rate: 0.86 },
    BEAT_2:         { text: 'Bit due: Alza le braccia.',                                         rate: 0.86 },
    BEAT_3:         { text: 'Bit tre: T-Pose.',                                                  rate: 0.86 },
    BEAT_4:         { text: 'Bit quattro: Mezzo squat.',                                         rate: 0.86 },
    BEAT_5:         { text: 'Bit cinque: Generazione DNA.',                                      rate: 0.80 },
    SUCCESS:        { text: 'Korè DNA generato. Benvenuto nell\'Arena.',                         rate: 0.78 },
    REPEAT_WARN:    { text: 'Ripeti il movimento!',                                              rate: 0.90 },
    FEET_GUIDANCE:  { text: 'Allontanati. Ho bisogno di vedere i tuoi piedi.',                  rate: 0.84 },
    CHEAT_DETECTED: { text: 'Atleta non riconosciuto. Ritorna al centro.',                       rate: 0.88 },
    NEXUS_ACTIVE:   { text: 'Nèxus attivo. Pòsizionati al centro.',                             rate: 0.80 },
  },
  EN: {
    WELCOME:        { text: 'Welcome to the Nexus Protocol. Enter the Arena.',                   rate: 0.78 },
    POSITIONING:    { text: 'Nexus active. Position yourself in the center.',                    rate: 0.80 },
    DETECTION_LOCK: { text: 'I see you. Hold that position.',                                    rate: 0.82 },
    COUNTDOWN:      { text: 'Biometric lock confirmed. Three, two, one.',                        rate: 0.85 },
    BEAT_1:         { text: 'Beat one: Neutral stance.',                                         rate: 0.86 },
    BEAT_2:         { text: 'Beat two: Raise your arms.',                                        rate: 0.86 },
    BEAT_3:         { text: 'Beat three: T-Pose.',                                               rate: 0.86 },
    BEAT_4:         { text: 'Beat four: Half squat.',                                            rate: 0.86 },
    BEAT_5:         { text: 'Beat five: DNA generation.',                                        rate: 0.80 },
    SUCCESS:        { text: 'Kore DNA generated. Welcome to the Arena.',                         rate: 0.78 },
    REPEAT_WARN:    { text: 'Repeat the movement!',                                              rate: 0.90 },
    FEET_GUIDANCE:  { text: 'Step back. I need to see your feet.',                               rate: 0.84 },
    CHEAT_DETECTED: { text: 'Athlete not recognized. Return to center.',                         rate: 0.88 },
    NEXUS_ACTIVE:   { text: 'Nexus active. Position yourself in the center.',                    rate: 0.80 },
  },
  ES: {
    WELCOME:        { text: 'Bienvenido al Protocolo Nexus. Entra en la Arena.',                 rate: 0.78 },
    POSITIONING:    { text: 'Nexus activo. Posiciónate en el centro.',                           rate: 0.80 },
    DETECTION_LOCK: { text: 'Te veo. Mantén esa posición.',                                      rate: 0.82 },
    COUNTDOWN:      { text: 'Biometría confirmada. Tres, dos, uno.',                             rate: 0.85 },
    BEAT_1:         { text: 'Turno uno: Postura neutral.',                                       rate: 0.86 },
    BEAT_2:         { text: 'Turno dos: Levanta los brazos.',                                    rate: 0.86 },
    BEAT_3:         { text: 'Turno tres: T-Pose.',                                               rate: 0.86 },
    BEAT_4:         { text: 'Turno cuatro: Medio squat.',                                        rate: 0.86 },
    BEAT_5:         { text: 'Turno cinco: Generando ADN.',                                       rate: 0.80 },
    SUCCESS:        { text: 'ADN Kore generado. Bienvenido a la Arena.',                         rate: 0.78 },
    REPEAT_WARN:    { text: '¡Repite el movimiento!',                                            rate: 0.90 },
    FEET_GUIDANCE:  { text: 'Aléjate. Necesito ver tus pies.',                                   rate: 0.84 },
    CHEAT_DETECTED: { text: 'Atleta no reconocido. Regresa al centro.',                          rate: 0.88 },
    NEXUS_ACTIVE:   { text: 'Nexus activo. Posiciónate en el centro.',                           rate: 0.80 },
  },
};

// ── TTS language codes
const TTS_LANG: Record<VoiceLang, string> = { IT: 'it-IT', EN: 'en-US', ES: 'es-ES' };

// ── One-shot keys (play only once per session per language)
const ONE_SHOT_KEYS = new Set(['WELCOME', 'NEXUS_ACTIVE', 'DETECTION_LOCK', 'SUCCESS']);

const LANG_STORAGE_KEY = '@nexus_voice_lang';

// ─────────────────────────────────────────────────────────────────
class VoiceControllerClass {
  private lang: VoiceLang = 'EN';
  private currentSound: Audio.Sound | null = null;
  private audioModeSet = false;
  private hasPlayedSet = new Set<string>();

  constructor() {
    // Load saved language preference
    AsyncStorage.getItem(LANG_STORAGE_KEY).then(saved => {
      if (saved === 'IT' || saved === 'EN' || saved === 'ES') {
        this.lang = saved;
      }
    }).catch(() => {});
  }

  /** Set active language and persist preference */
  async setLanguage(lang: VoiceLang): Promise<void> {
    this.lang = lang;
    this.hasPlayedSet.clear(); // new language = fresh session
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang).catch(() => {});
  }

  getCurrentLanguage(): VoiceLang { return this.lang; }

  resetSession(): void { this.hasPlayedSet.clear(); }

  private async ensureAudioMode() {
    if (this.audioModeSet) return;
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
      this.audioModeSet = true;
    } catch (_e) {}
  }

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

  async play(key: string): Promise<void> {
    // One-shot guard
    if (ONE_SHOT_KEYS.has(key) && this.hasPlayedSet.has(`${this.lang}_${key}`)) return;

    await this.stop();

    const audioModule = NEXUS_VOICES[this.lang]?.[key] ?? null;
    const fallback    = TTS_FALLBACK[this.lang]?.[key];

    if (audioModule !== null) {
      try {
        await this.ensureAudioMode();
        const { sound } = await Audio.Sound.createAsync(audioModule, { shouldPlay: true, volume: 1.0 });
        this.currentSound = sound;
        sound.setOnPlaybackStatusUpdate(status => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
            if (this.currentSound === sound) this.currentSound = null;
          }
        });
        if (ONE_SHOT_KEYS.has(key)) this.hasPlayedSet.add(`${this.lang}_${key}`);
        return;
      } catch (_e) {
        this.currentSound = null;
      }
    }

    // TTS fallback
    if (fallback) {
      try {
        Speech.speak(fallback.text, { language: TTS_LANG[this.lang], rate: fallback.rate, pitch: 1.0 });
        if (ONE_SHOT_KEYS.has(key)) this.hasPlayedSet.add(`${this.lang}_${key}`);
      } catch (_e) {}
    }
  }

  async playBeat(beatIndex: number): Promise<void> {
    await this.play(`BEAT_${beatIndex + 1}`);
  }
}

export const VoiceController = new VoiceControllerClass();
