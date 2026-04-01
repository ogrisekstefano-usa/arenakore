/**
 * ARENAKORE — REMOTE UX ENGINE
 * 4-layer feedback system for 3-meter athlete positioning:
 * 1. Voice (Web Speech API → expo-speech fallback)
 * 2. Ping audio (AudioContext synthetic beeps — parking-sensor style)
 * 3. Screen flash (bright white pulse as visual beacon)
 * 4. Haptic (vibration for native devices)
 *
 * scripts.json → multilanguage (IT/EN/ES)
 */
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import SCRIPTS from '../assets/scripts/voice_scripts.json';

type Lang = 'it' | 'en' | 'es';
type ScriptKey = keyof (typeof SCRIPTS)['it'];

// ── Web Speech API voice engine ─────────────────────────────────────────────
class WebVoiceEngine {
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private lang: Lang = 'it';
  private busy = false;

  constructor() {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
      this.synth = window.speechSynthesis;
      // Load voices once available
      const loadVoice = () => {
        const voices = this.synth!.getVoices();
        const langMap: Record<Lang, string> = { it: 'it-IT', en: 'en-US', es: 'es-ES' };
        this.voice = voices.find(v => v.lang.startsWith(langMap[this.lang].split('-')[0]))
          || voices.find(v => v.default)
          || voices[0] || null;
      };
      if (this.synth.getVoices().length > 0) loadVoice();
      else this.synth.addEventListener('voiceschanged', loadVoice, { once: true });
    }
  }

  setLang(lang: Lang) {
    this.lang = lang;
    this.voice = null; // Reset voice on language change
  }

  speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth || this.busy) { resolve(); return; }
      this.busy = true;
      this.synth.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      const langMap: Record<Lang, string> = { it: 'it-IT', en: 'en-US', es: 'es-ES' };
      utt.lang = langMap[this.lang] || 'it-IT';
      utt.rate = 0.92;
      utt.pitch = 1.0;
      utt.volume = 1.0;
      if (this.voice) utt.voice = this.voice;
      utt.onend = () => { this.busy = false; resolve(); };
      utt.onerror = () => { this.busy = false; resolve(); };
      this.synth.speak(utt);
    });
  }

  stop() {
    this.synth?.cancel();
    this.busy = false;
  }

  get available() { return Platform.OS === 'web' && !!this.synth; }
}

// ── Ping Audio Engine (AudioContext — parking-sensor style) ──────────────────
class PingEngine {
  private audioCtx: AudioContext | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentFreq = 440;
  private currentInterval = 1000; // ms between pings

  private getCtx(): AudioContext | null {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) this.audioCtx = new Ctx();
    }
    return this.audioCtx;
  }

  playPing(freq = 880, duration = 0.06, volume = 0.12) {
    const ctx = this.getCtx();
    if (!ctx) {
      // Native fallback: haptic
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return;
    }
    try {
      // Resume if suspended (iOS Safari requires user gesture)
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration + 0.05);
    } catch (_) {}
  }

  /**
   * Start parking-sensor style pings.
   * quality 0-1: 0 = slow ping 1/sec, 1 = fast 4/sec
   */
  startSequence(quality: number) {
    this.stopSequence();
    // Map quality 0→1 to interval 1000ms→200ms and freq 440→1200Hz
    this.currentInterval = Math.max(200, 1000 - quality * 800);
    this.currentFreq = 440 + quality * 760;
    this.intervalId = setInterval(() => {
      this.playPing(this.currentFreq, 0.06, 0.1 + quality * 0.08);
    }, this.currentInterval);
  }

  updateQuality(quality: number) {
    if (!this.intervalId) return;
    this.stopSequence();
    this.startSequence(quality);
  }

  stopSequence() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  get active() { return !!this.intervalId; }
}

// ── Main RemoteUXEngine (singleton) ─────────────────────────────────────────
class RemoteUXEngineClass {
  private lang: Lang = 'it';
  private webVoice = new WebVoiceEngine();
  public ping = new PingEngine();
  private lastSpokenKey: string | null = null;
  private speakCooldowns: Map<string, number> = new Map();

  setLang(lang: Lang) {
    this.lang = lang;
    this.webVoice.setLang(lang);
  }

  /** Speak a voice script key. Cooldown prevents repeating within 3s. */
  async speak(key: ScriptKey, cooldownMs = 3000): Promise<void> {
    const now = Date.now();
    const lastTime = this.speakCooldowns.get(key) || 0;
    if (now - lastTime < cooldownMs) return;
    this.speakCooldowns.set(key, now);

    const scripts = SCRIPTS[this.lang] as Record<string, string>;
    const text = scripts[key];
    if (!text) return;

    if (this.webVoice.available) {
      await this.webVoice.speak(text);
    } else {
      // Native fallback with expo-speech
      try {
        const voiceMap: Record<Lang, string> = { it: 'it-IT', en: 'en-US', es: 'es-ES' };
        Speech.speak(text, {
          language: voiceMap[this.lang],
          rate: 0.92,
          pitch: 1.0,
        });
      } catch (_) {}
    }
  }

  /** Speak arbitrary text (not from scripts.json) */
  async speakRaw(text: string): Promise<void> {
    if (this.webVoice.available) {
      await this.webVoice.speak(text);
    } else {
      const voiceMap: Record<Lang, string> = { it: 'it-IT', en: 'en-US', es: 'es-ES' };
      Speech.speak(text, { language: voiceMap[this.lang], rate: 0.92 });
    }
  }

  stop() {
    this.webVoice.stop();
    Speech.stop();
    this.ping.stopSequence();
  }

  clearCooldowns() {
    this.speakCooldowns.clear();
  }
}

export const RemoteUXEngine = new RemoteUXEngineClass();
export type { Lang, ScriptKey };
