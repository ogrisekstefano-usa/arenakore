// Platform-specific: NATIVE accelerometer wrapper
import { Accelerometer } from 'expo-sensors';

export function startAccelerometer(
  onData: (data: { x: number; y: number; z: number }) => void
) {
  Accelerometer.setUpdateInterval(33); // ~30Hz
  const subscription = Accelerometer.addListener(onData);
  return { remove: () => subscription.remove() };
}
