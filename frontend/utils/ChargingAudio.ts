/**
 * ARENAKORE — CHARGING AUDIO SYNTHESIZER
 * ═══════════════════════════════════════
 * Web Audio API synthesizer for the BattleIntroOverlay countdown.
 * - Rising Pitch: 200Hz → 800Hz over 3 seconds (sawtooth wave)
 * - Rising Gain: 0.03 → 0.25 (engine pressure effect)
 * - Final Beep: 1000Hz square wave, metallic, 120ms
 * 
 * Zero-latency, no file dependencies.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch (e) {
      console.warn('[ChargingAudio] AudioContext not available:', e);
      return null;
    }
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play the "Rising Pitch" charging sound over `durationSec` seconds.
 * Returns a cleanup function to stop early if needed.
 */
export function playChargingSound(durationSec: number = 3): (() => void) | null {
  const ctx = getAudioContext();
  if (!ctx) return null;

  const now = ctx.currentTime;
  const endTime = now + durationSec;

  // ── Oscillator: Sawtooth wave, 200Hz → 800Hz ──
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(800, endTime);

  // ── Gain: 0.03 → 0.25 (engine pressure buildup) ──
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.03, now);
  gainNode.gain.exponentialRampToValueAtTime(0.25, endTime);

  // ── Low-pass filter for warmth ──
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.exponentialRampToValueAtTime(4000, endTime);
  filter.Q.setValueAtTime(2, now);

  // ── Connect chain: Osc → Filter → Gain → Output ──
  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(endTime + 0.05);

  // Cleanup function
  return () => {
    try {
      osc.stop();
      osc.disconnect();
      gainNode.disconnect();
      filter.disconnect();
    } catch (_) {}
  };
}

/**
 * Play the final "START" beep — sharp, metallic, 120ms.
 * Square wave at 1000Hz with a fast attack and decay.
 */
export function playStartBeep(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // ── Primary tone: Square wave 1000Hz ──
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1000, now);

  // ── Secondary harmonic for metallic quality ──
  const osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(2500, now);

  // ── Gain envelope: fast attack → sharp decay ──
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.008); // 8ms attack
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12); // 120ms total

  // ── Secondary gain (lower) ──
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
}

/**
 * Play a single countdown tick sound (subtle, percussive).
 * Different pitch for each count number.
 */
export function playCountTick(countNumber: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Higher pitch as countdown approaches zero
  const baseFreq = 400 + (3 - countNumber) * 200; // 3→400Hz, 2→600Hz, 1→800Hz

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
}
