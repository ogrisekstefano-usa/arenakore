// Platform-specific: NATIVE accelerometer wrapper
// Lazy-loaded to prevent Expo Go crash

export function startAccelerometer(
  onData: (data: { x: number; y: number; z: number }) => void
) {
  try {
    const { Accelerometer } = require('expo-sensors');
    Accelerometer.setUpdateInterval(33); // ~30Hz
    const subscription = Accelerometer.addListener(onData);
    return { remove: () => subscription.remove() };
  } catch {
    return { remove: () => {} };
  }
}
