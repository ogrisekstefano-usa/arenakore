/**
 * ARENAKORE — CHARGING AUDIO SYNTHESIZER v2.0
 * ═══════════════════════════════════════════════
 * DUAL ENGINE:
 *   Web    → Web Audio API synth (Rising Pitch 200Hz→800Hz)
 *   Native → expo-haptics rapid pulse pattern + expo-audio tone
 * 
 * Zero-latency, no file dependencies.
 */
import { Platform } from 'react-native';

// ═══════════════════════════════════════════════
// WEB AUDIO ENGINE
// ═══════════════════════════════════════════════
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null;
  if (!audioCtx) {
    try {
      const AC = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch (e) {
      console.warn('[ChargingAudio] AudioContext not available:', e);
      return null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// ═══════════════════════════════════════════════
// NATIVE HAPTIC ENGINE
// ═══════════════════════════════════════════════
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch {}

/** Native charging: accelerating haptic pulses (8→25 per second) */
function nativeChargingPulse(durationSec: number): (() => void) | null {
  if (!Haptics) return null;
  let cancelled = false;
  let step = 0;
  const totalSteps = durationSec * 1000;

  const pulse = () => {
    if (cancelled) return;
    const progress = step / totalSteps; // 0→1
    // Accelerate: 120ms gap → 40ms gap
    const interval = Math.max(40, Math.round(120 - progress * 80));
    // Intensity ramps up
    const style = progress < 0.5
      ? Haptics.ImpactFeedbackStyle.Light
      : progress < 0.8
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Heavy;

    Haptics.impactAsync(style).catch(() => {});
    step += interval;
    if (step < totalSteps) {
      setTimeout(pulse, interval);
    }
  };

  pulse();
  return () => { cancelled = true; };
}

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

/**
 * Play the "Rising Pitch" charging sound over `durationSec` seconds.
 * Web: Sawtooth wave 200Hz→800Hz with low-pass filter.
 * Native: Accelerating haptic pulse pattern.
 * Returns a cleanup function to stop early if needed.
 */
export function playChargingSound(durationSec: number = 3): (() => void) | null {
  // ── WEB: Full Audio Synth ──
  const ctx = getAudioContext();
  if (ctx) {
    const now = ctx.currentTime;
    const endTime = now + durationSec;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, endTime);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.03, now);
    gainNode.gain.exponentialRampToValueAtTime(0.25, endTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(4000, endTime);
    filter.Q.setValueAtTime(2, now);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(endTime + 0.05);

    return () => {
      try { osc.stop(); osc.disconnect(); gainNode.disconnect(); filter.disconnect(); } catch (_) {}
    };
  }

  // ── NATIVE: Haptic pulse pattern ──
  return nativeChargingPulse(durationSec);
}

/**
 * Play the final "START" beep — sharp, metallic, 120ms.
 * Web: Square wave at 1000Hz.
 * Native: Heavy impact notification haptic.
 */
export function playStartBeep(): void {
  const ctx = getAudioContext();
  if (ctx) {
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1000, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(2500, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.005);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(ctx.destination);
    gain2.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
    osc2.start(now);
    osc2.stop(now + 0.12);
    return;
  }

  // ── NATIVE: Success notification haptic ──
  if (Haptics) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
}

/**
 * Play a single countdown tick sound.
 * Web: Sine wave with rising pitch per count.
 * Native: Impact haptic with increasing intensity.
 */
export function playCountTick(countNumber: number): void {
  const ctx = getAudioContext();
  if (ctx) {
    const now = ctx.currentTime;
    const baseFreq = 400 + (3 - countNumber) * 200;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
    return;
  }

  // ── NATIVE: Escalating haptic impact ──
  if (Haptics) {
    const style = countNumber >= 3
      ? Haptics.ImpactFeedbackStyle.Light
      : countNumber === 2
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Heavy;
    Haptics.impactAsync(style).catch(() => {});
  }
}
