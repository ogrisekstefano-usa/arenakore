// Platform-specific: WEB stub (no native accelerometer available)
export function startAccelerometer(
  _onData: (data: { x: number; y: number; z: number }) => void
) {
  // No accelerometer on web — caller should use web fallback or simulation
  return { remove: () => {} };
}
