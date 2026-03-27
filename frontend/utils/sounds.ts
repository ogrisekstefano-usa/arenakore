// ARENAKORE Sound Kit
// Deep Woosh (sub-bass sweep) + Metallic Ping (high-freq shimmer)
// Uses Web Audio API for web, expo-haptics for native tactile feedback
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// ============================================================
// WEB AUDIO SYNTHESIS (only on web platform)
// ============================================================
let audioCtx: any = null;

function getAudioContext(): any {
  if (Platform.OS !== 'web') return null;
  if (!audioCtx) {
    try {
      const AC = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch {}
  }
  return audioCtx;
}

/**
 * Deep Woosh — sub-bass frequency sweep (60Hz → 30Hz) with volume fade
 * Gives a physical "weight" sensation to tab navigation
 */
function webPlayWoosh() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const duration = 0.25;

    // Oscillator: sub-bass sweep
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(65, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + duration);

    // Gain envelope: quick attack, smooth decay
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Low-pass filter for warmth
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, now);
    filter.Q.setValueAtTime(1.2, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {}
}

/**
 * Metallic Ping — high-frequency shimmer with harmonic overtones
 * Used for success events: accepted invites, broken records
 */
function webPlayMetallicPing() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const duration = 0.45;

    // Main tone (A5 = 880Hz)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);

    // Harmonic overtone (E6 ≈ 1320Hz)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now);

    // Shimmer overtone (C#7 ≈ 2217Hz)
    const osc3 = ctx.createOscillator();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(2217, now);

    // Gain envelopes — sharp attack, metallic decay
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(0.12, now + 0.01);
    g1.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.06, now + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0, now);
    g3.gain.linearRampToValueAtTime(0.03, now + 0.01);
    g3.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.5);

    // High-pass filter for metallic character
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(600, now);
    hp.Q.setValueAtTime(0.7, now);

    osc1.connect(g1);
    osc2.connect(g2);
    osc3.connect(g3);
    g1.connect(hp);
    g2.connect(hp);
    g3.connect(hp);
    hp.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
    osc3.stop(now + duration);
  } catch {}
}

/**
 * Decline sound — low dull thud
 */
function webPlayDecline() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch {}
}

/**
 * Crew Created — ascending tone sweep (triumphant)
 */
function webPlayCrewCreated() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch {}
}

// ============================================================
// PUBLIC API — Cross-platform sound functions
// ============================================================

/** Deep Woosh: sub-bass sweep on tab navigation */
export async function playTabSwitch() {
  if (Platform.OS === 'web') {
    webPlayWoosh();
  } else {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  }
}

/** Metallic Ping: success event (invite accepted, record broken) */
export async function playAcceptPing() {
  if (Platform.OS === 'web') {
    webPlayMetallicPing();
  } else {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }
}

/** Decline: dull thud for rejected invites */
export async function playDecline() {
  if (Platform.OS === 'web') {
    webPlayDecline();
  } else {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
  }
}

/** Record Broken: metallic ping + extra haptic burst */
export async function playRecordBroken() {
  if (Platform.OS === 'web') {
    webPlayMetallicPing();
  } else {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 200);
    } catch {}
  }
}

/** Crew Created: ascending triumphant tone */
export async function playCrewCreated() {
  if (Platform.OS === 'web') {
    webPlayCrewCreated();
  } else {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }
}

// ============================================================
// BIO-SCAN AUDIO CUES — "The Voice of KORE"
// ============================================================

/** Bio-Scan Hum: rising electric drone during biometric scan */
export function startBioScanHum(): (() => void) | null {
  if (Platform.OS !== 'web') return null;
  const ctx = getAudioContext();
  if (!ctx) return null;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // Low electric hum with rising frequency
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.linearRampToValueAtTime(220, now + 4.0);

    // Sub-harmonic for depth
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(40, now);
    osc2.frequency.linearRampToValueAtTime(110, now + 4.0);

    // Gain: fade in slowly
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.5);
    gain.gain.linearRampToValueAtTime(0.07, now + 3.0);

    // Low-pass filter for warmth
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(200, now);
    lp.frequency.linearRampToValueAtTime(800, now + 4.0);
    lp.Q.setValueAtTime(2, now);

    osc.connect(lp);
    osc2.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);

    // Return stop function
    return () => {
      try {
        const t = ctx.currentTime;
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        osc.stop(t + 0.25);
        osc2.stop(t + 0.25);
      } catch {}
    };
  } catch {}
  return null;
}

/** Bio-Match Ping: sharp cyber confirmation ping */
export async function playBioMatchPing() {
  if (Platform.OS === 'web') {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      // Sharp attack ping (C6 = 1047Hz)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1047, now);
      osc1.frequency.setValueAtTime(1568, now + 0.05);

      // Harmonic shimmer
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(2093, now);

      const g1 = ctx.createGain();
      g1.gain.setValueAtTime(0, now);
      g1.gain.linearRampToValueAtTime(0.15, now + 0.005);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0, now);
      g2.gain.linearRampToValueAtTime(0.06, now + 0.005);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(800, now);

      osc1.connect(g1); osc2.connect(g2);
      g1.connect(hp); g2.connect(hp);
      hp.connect(ctx.destination);

      osc1.start(now); osc2.start(now);
      osc1.stop(now + 0.35); osc2.stop(now + 0.2);
    } catch {}
  } else {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }
}
