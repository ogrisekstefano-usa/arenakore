/**
 * ARENAKORE — MotionAnalyzer
 * Real-time motion pattern recognition using device sensors
 * Detects: Explosive Punch (acceleration spike), Deep Squat (angular + stability)
 */

export type ExerciseType = 'squat' | 'punch';

export interface MotionState {
  reps: number;
  quality: number;        // 0-100
  currentPhase: 'idle' | 'down' | 'up' | 'strike' | 'recovery';
  isInFrame: boolean;
  peakAcceleration: number;
  avgAmplitude: number;
  amplitudes: number[];
  lastRepQuality: number;
  // Skeleton animation data
  skeletonPose: SkeletonPose;
}

export interface SkeletonPose {
  torsoTilt: number;      // -1 (forward) to 1 (back)
  kneeAngle: number;      // 0 (straight) to 1 (deep bend)
  armExtension: number;   // 0 (retracted) to 1 (full punch)
  shoulderRotation: number;
  hipDrop: number;        // 0 (standing) to 1 (squat bottom)
  intensity: number;      // 0-1 for glow effect
}

interface SensorData {
  x: number;
  y: number;
  z: number;
}

// Configurable thresholds per exercise
const SQUAT_CONFIG = {
  downThreshold: -0.3,     // Y-axis gravity shift to detect going down
  upThreshold: 0.2,        // Y-axis recovery to detect coming up
  minRepDuration: 600,     // ms minimum for a valid rep
  stabilityWindow: 5,      // samples to check stability at bottom
  maxAccelForGoodForm: 2.5, // m/s² — slow controlled movement = higher quality
};

const PUNCH_CONFIG = {
  strikeThreshold: 2.0,    // acceleration magnitude for a punch
  recoveryThreshold: 0.8,  // when acceleration drops below this, ready for next
  minRepDuration: 300,     // ms minimum between punches
  maxAccelForPower: 6.0,   // acceleration at which power is maxed
};

export class MotionAnalyzer {
  private exercise: ExerciseType;
  private state: MotionState;
  private lastRepTimestamp: number = 0;
  private inRep: boolean = false;
  private noMotionCounter: number = 0;
  private recentAccels: number[] = [];
  private smoothedY: number = 0;
  private smoothAlpha: number = 0.3;

  constructor(exercise: ExerciseType) {
    this.exercise = exercise;
    this.state = {
      reps: 0,
      quality: 0,
      currentPhase: 'idle',
      isInFrame: true,
      peakAcceleration: 0,
      avgAmplitude: 0,
      amplitudes: [],
      lastRepQuality: 0,
      skeletonPose: {
        torsoTilt: 0,
        kneeAngle: 0,
        armExtension: 0,
        shoulderRotation: 0,
        hipDrop: 0,
        intensity: 0,
      },
    };
  }

  /**
   * Process a new sensor sample from Accelerometer
   * Returns updated MotionState
   */
  processAccelerometer(data: SensorData): MotionState {
    const { x, y, z } = data;
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    // Smooth Y axis (gravity direction)
    this.smoothedY = this.smoothAlpha * y + (1 - this.smoothAlpha) * this.smoothedY;

    // Track peak acceleration
    if (magnitude > this.state.peakAcceleration) {
      this.state.peakAcceleration = magnitude;
    }

    // Store recent accelerations for analysis
    this.recentAccels.push(magnitude);
    if (this.recentAccels.length > 30) this.recentAccels.shift();

    // Check "out of frame" (no significant motion for 3 seconds = ~90 samples at 30Hz)
    if (magnitude < 0.3) {
      this.noMotionCounter++;
    } else {
      this.noMotionCounter = 0;
    }
    this.state.isInFrame = this.noMotionCounter < 90;

    // Update skeleton pose
    this.updateSkeletonPose(data, magnitude);

    // Exercise-specific analysis
    if (this.exercise === 'squat') {
      this.analyzeSquat(data, magnitude);
    } else {
      this.analyzePunch(data, magnitude);
    }

    return { ...this.state };
  }

  /**
   * Process DeviceMotion data (gyroscope + accelerometer fusion)
   */
  processDeviceMotion(rotation: { alpha: number; beta: number; gamma: number }): void {
    // Use beta (front-back tilt) for squat depth
    const normalizedBeta = Math.max(-1, Math.min(1, (rotation.beta || 0) / 90));
    this.state.skeletonPose.torsoTilt = normalizedBeta;

    // Use gamma (left-right tilt) for lateral stability
    const lateralStability = Math.abs(rotation.gamma || 0);
    if (lateralStability > 30) {
      // Reduce quality for excessive lateral sway
      this.state.skeletonPose.intensity = Math.min(1, this.state.skeletonPose.intensity + 0.1);
    }
  }

  private analyzeSquat(data: SensorData, magnitude: number): void {
    const now = Date.now();
    const cfg = SQUAT_CONFIG;

    // Detect downward movement (phone tilts forward as user squats)
    if (!this.inRep && this.smoothedY < cfg.downThreshold) {
      this.inRep = true;
      this.state.currentPhase = 'down';
      this.lastRepTimestamp = now;
    }

    // Detect upward recovery
    if (this.inRep && this.smoothedY > cfg.upThreshold) {
      const repDuration = now - this.lastRepTimestamp;

      if (repDuration >= cfg.minRepDuration) {
        // Valid rep!
        this.state.reps++;
        this.state.currentPhase = 'up';

        // Calculate rep quality based on:
        // 1. Controlled speed (slower = better for squats)
        // 2. Depth achieved (how negative was Y)
        // 3. Stability (low lateral acceleration)
        const avgAccel = this.recentAccels.reduce((a, b) => a + b, 0) / this.recentAccels.length;
        const controlScore = Math.max(0, 100 - (avgAccel / cfg.maxAccelForGoodForm) * 50);
        const depthScore = Math.min(100, Math.abs(this.smoothedY) * 120);
        const repQuality = (controlScore * 0.6 + depthScore * 0.4);

        this.state.lastRepQuality = Math.round(repQuality);
        this.state.amplitudes.push(repQuality);
        this.state.avgAmplitude = this.state.amplitudes.reduce((a, b) => a + b, 0) / this.state.amplitudes.length;
        this.state.quality = Math.round(this.state.avgAmplitude);
      }

      this.inRep = false;
      setTimeout(() => {
        if (this.state.currentPhase === 'up') {
          this.state.currentPhase = 'idle';
        }
      }, 300);
    }

    // Update skeleton
    this.state.skeletonPose.kneeAngle = this.inRep ? Math.min(1, Math.abs(this.smoothedY) * 2) : 0;
    this.state.skeletonPose.hipDrop = this.state.skeletonPose.kneeAngle;
  }

  private analyzePunch(data: SensorData, magnitude: number): void {
    const now = Date.now();
    const cfg = PUNCH_CONFIG;

    // Detect strike (sharp acceleration spike on X/Z axis)
    const horizontalAccel = Math.sqrt(data.x * data.x + data.z * data.z);

    if (!this.inRep && horizontalAccel > cfg.strikeThreshold) {
      const sinceLastRep = now - this.lastRepTimestamp;

      if (sinceLastRep >= cfg.minRepDuration) {
        this.inRep = true;
        this.state.currentPhase = 'strike';
        this.lastRepTimestamp = now;

        // Valid punch!
        this.state.reps++;

        // Quality based on:
        // 1. Strike power (higher acceleration = better)
        // 2. Clean trajectory (low Y-axis noise during strike)
        const powerScore = Math.min(100, (horizontalAccel / cfg.maxAccelForPower) * 100);
        const cleanScore = Math.max(0, 100 - Math.abs(data.y) * 30);
        const repQuality = (powerScore * 0.7 + cleanScore * 0.3);

        this.state.lastRepQuality = Math.round(repQuality);
        this.state.amplitudes.push(repQuality);
        this.state.avgAmplitude = this.state.amplitudes.reduce((a, b) => a + b, 0) / this.state.amplitudes.length;
        this.state.quality = Math.round(this.state.avgAmplitude);

        // Update skeleton
        this.state.skeletonPose.armExtension = 1;
        this.state.skeletonPose.intensity = Math.min(1, horizontalAccel / cfg.maxAccelForPower);
      }
    }

    // Detect recovery
    if (this.inRep && horizontalAccel < cfg.recoveryThreshold) {
      this.inRep = false;
      this.state.currentPhase = 'recovery';
      this.state.skeletonPose.armExtension = 0;

      setTimeout(() => {
        if (this.state.currentPhase === 'recovery') {
          this.state.currentPhase = 'idle';
          this.state.skeletonPose.intensity = 0;
        }
      }, 200);
    }
  }

  private updateSkeletonPose(data: SensorData, magnitude: number): void {
    const pose = this.state.skeletonPose;

    if (this.exercise === 'squat') {
      pose.torsoTilt = Math.max(-1, Math.min(1, -this.smoothedY));
      pose.shoulderRotation = data.x * 0.3;
      pose.intensity = this.inRep ? Math.min(1, magnitude / 3) : Math.max(0, pose.intensity - 0.05);
    } else {
      pose.shoulderRotation = Math.max(-1, Math.min(1, data.x * 0.5));
      pose.torsoTilt = Math.max(-1, Math.min(1, data.z * 0.3));
    }
  }

  /** Get final session summary */
  getSummary() {
    return {
      reps: this.state.reps,
      quality: this.state.quality,
      peakAcceleration: Math.round(this.state.peakAcceleration * 100) / 100,
      avgAmplitude: Math.round(this.state.avgAmplitude * 100) / 100,
    };
  }

  /** Reset state */
  reset() {
    this.state.reps = 0;
    this.state.quality = 0;
    this.state.currentPhase = 'idle';
    this.state.peakAcceleration = 0;
    this.state.avgAmplitude = 0;
    this.state.amplitudes = [];
    this.state.isInFrame = true;
    this.inRep = false;
    this.noMotionCounter = 0;
    this.recentAccels = [];
  }
}
