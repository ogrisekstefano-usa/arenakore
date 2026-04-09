/**
 * ARENAKORE — Device Intelligence Layer
 * Silent hardware profiling for adaptive NEXUS experience.
 * Classifies device into HIGH / STANDARD / LEGACY tier.
 */
import { Platform } from 'react-native';

// expo-device REMOVED — causes kernel deny(1) on iPhone 15 Pro sandbox
// Replaced with safe Platform-based detection
function getDevice(): any {
  return null; // Disabled: sysctl access violates iOS sandbox
}

export type DeviceTier = 'high' | 'standard' | 'legacy';

export interface DeviceProfile {
  tier: DeviceTier;
  model: string;
  cpuCores: number;
  ramGB: number;
  isEmulator: boolean;
  /** Feature flags based on tier */
  features: {
    neonTrail: boolean;        // Luminous trail on punches (HIGH only)
    fullGlowSkeleton: boolean; // Glow halos on all joints
    backdropBlur: boolean;     // Real CSS/native blur
    pulseTickerAnim: boolean;  // Animated scrolling ticker
    skeletonGlowRings: boolean;// Outer rings on joints when active
    reducedParticles: boolean; // Reduce SVG complexity
  };
}

// ========== HIGH-END DEVICE SIGNATURES ==========
const HIGH_TIER_MODELS = [
  // Apple — iPhone 13 and newer
  'iPhone14', 'iPhone15', 'iPhone16', 'iPhone17', 'iPhone18',
  // Apple — iPad Pro
  'iPad13', 'iPad14', 'iPad15', 'iPad16',
  // Samsung — S21 and newer
  'SM-G99', 'SM-S90', 'SM-S91', 'SM-S92', 'SM-S93', 'SM-S94',
  // Google Pixel 6+
  'Pixel 6', 'Pixel 7', 'Pixel 8', 'Pixel 9', 'Pixel 10',
  // OnePlus 9+
  'OnePlus 9', 'OnePlus 10', 'OnePlus 11', 'OnePlus 12', 'OnePlus 13',
];

const LEGACY_MODELS = [
  // Apple — iPhone 8 and older
  'iPhone7', 'iPhone8', 'iPhone9', 'iPhone10',
  // Samsung — S8 and older
  'SM-G95', 'SM-G93',
  // Generic budget
  'Pixel 3', 'Pixel 2',
];

/**
 * Performs silent device profiling.
 * Returns a DeviceProfile with tier classification and feature flags.
 */
export function profileDevice(): DeviceProfile {
  const model = getModelName();
  const cpuCores = getCPUCores();
  const ramGB = getRAMGB();
  const isEmulator = checkEmulator();

  const tier = classifyTier(model, cpuCores, ramGB);

  return {
    tier,
    model,
    cpuCores,
    ramGB,
    isEmulator,
    features: getFeatureFlags(tier),
  };
}

function getModelName(): string {
  if (Platform.OS === 'web') {
    // Extract meaningful info from userAgent
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    if (/iPhone/.test(ua)) return 'iPhone-Web';
    if (/iPad/.test(ua)) return 'iPad-Web';
    if (/Android/.test(ua)) return 'Android-Web';
    return 'Desktop-Web';
  }
  const Device = getDevice();
  return Device?.modelName || Device?.deviceName || 'Unknown';
}

function getCPUCores(): number {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' && (navigator as any).hardwareConcurrency
      ? (navigator as any).hardwareConcurrency
      : 4; // Conservative default
  }
  // Native: expo-device doesn't expose CPU cores directly
  // Estimate from device model or use a safe default
  return 6;
}

function getRAMGB(): number {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' && (navigator as any).deviceMemory
      ? (navigator as any).deviceMemory
      : 4; // Conservative default
  }
  // Native: Device.totalMemory is in bytes (may be null)
  const Device = getDevice();
  if (Device?.totalMemory) {
    return Math.round(Device.totalMemory / (1024 * 1024 * 1024));
  }
  return 4;
}

function checkEmulator(): boolean {
  if (Platform.OS === 'web') return false;
  const Device = getDevice();
  return Device ? !Device.isDevice : false;
}

function classifyTier(model: string, cpuCores: number, ramGB: number): DeviceTier {
  // Web: use hardware specs
  if (Platform.OS === 'web') {
    if (cpuCores >= 8 && ramGB >= 8) return 'high';
    if (cpuCores >= 4 && ramGB >= 4) return 'standard';
    return 'legacy';
  }

  // Native: check model signatures first
  const modelUpper = model.toUpperCase();

  // Check HIGH tier models
  for (const sig of HIGH_TIER_MODELS) {
    if (modelUpper.includes(sig.toUpperCase())) return 'high';
  }

  // Check LEGACY tier models
  for (const sig of LEGACY_MODELS) {
    if (modelUpper.includes(sig.toUpperCase())) return 'legacy';
  }

  // Fallback: use RAM + CPU heuristic
  if (ramGB >= 6 && cpuCores >= 6) return 'high';
  if (ramGB >= 3 && cpuCores >= 4) return 'standard';
  return 'legacy';
}

function getFeatureFlags(tier: DeviceTier): DeviceProfile['features'] {
  switch (tier) {
    case 'high':
      return {
        neonTrail: true,
        fullGlowSkeleton: true,
        backdropBlur: true,
        pulseTickerAnim: true,
        skeletonGlowRings: true,
        reducedParticles: false,
      };
    case 'standard':
      return {
        neonTrail: false,
        fullGlowSkeleton: true,
        backdropBlur: true,
        pulseTickerAnim: true,
        skeletonGlowRings: false,
        reducedParticles: false,
      };
    case 'legacy':
      return {
        neonTrail: false,
        fullGlowSkeleton: false,
        backdropBlur: false,
        pulseTickerAnim: false,
        skeletonGlowRings: false,
        reducedParticles: true,
      };
  }
}

/**
 * Returns a human-readable tier label for UI display
 */
export function getTierLabel(tier: DeviceTier): string {
  switch (tier) {
    case 'high': return 'FULL BIOMECH';
    case 'standard': return 'MOTION SYNC';
    case 'legacy': return 'SHADOW MODE';
  }
}

/**
 * Returns the skeleton tracking mode description
 */
export function getTrackingMode(tier: DeviceTier): string {
  switch (tier) {
    case 'high': return 'POSE TRACKING · 17 KEYPOINTS';
    case 'standard': return 'MOTION ANCHORED · PIXEL TRACK';
    case 'legacy': return 'IMU SHADOW · SENSOR DRIVEN';
  }
}
