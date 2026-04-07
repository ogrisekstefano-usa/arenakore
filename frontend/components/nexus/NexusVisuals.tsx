/**
 * ARENAKORE — Nexus Visuals v3.0 — SPRINT 5
 * CyberGrid + DigitalShadow (17-point FULL Glow) + ScanLine
 * Skeleton re-calibrated: always 17 joints, always glow, always reactive
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Svg, { Line, Circle, Text as SvgText, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, { useSharedValue, withRepeat, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated';
import { SkeletonPose, ExerciseType } from '../../utils/MotionAnalyzer';
import { DeviceTier, getTierLabel, getTrackingMode } from '../../utils/DeviceIntelligence';

let SW = 390, SH = 844; try { const _d = Dimensions.get('window'); SW = _d.width; SH = _d.height; } catch(e) {}

// ========== CYBER GRID (reduced for scanning overlay) ==========
export function CyberGrid({ intensity, scanning }: { intensity: number; scanning?: boolean }) {
  const G_SIZE = scanning ? 55 : 45;
  const cols = Math.ceil(SW / G_SIZE) + 1;
  const rows = Math.ceil(SH / G_SIZE) + 1;
  const op = scanning ? intensity * 0.06 : (0.08 + intensity * 0.15);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={SW} height={SH}>
        {Array.from({ length: cols }).map((_, i) => (
          <Line key={`v${i}`} x1={i * G_SIZE} y1={0} x2={i * G_SIZE} y2={SH} stroke="#00E5FF" strokeWidth={0.3} opacity={op * 0.6} />
        ))}
        {Array.from({ length: rows }).map((_, i) => (
          <Line key={`h${i}`} x1={0} y1={i * G_SIZE} x2={SW} y2={i * G_SIZE} stroke="#00E5FF" strokeWidth={0.3} opacity={op * 0.6} />
        ))}
        {!scanning && (
          <>
            <Circle cx={SW / 2} cy={SH * 0.4} r={55} stroke="#00E5FF" strokeWidth={1} fill="none" opacity={op} />
            <Circle cx={SW / 2} cy={SH * 0.4} r={85} stroke="#00E5FF" strokeWidth={0.6} fill="none" opacity={op * 0.5} strokeDasharray="6,5" />
          </>
        )}
        {scanning && (
          <>
            {/* Targeting reticle for scanning mode */}
            <Circle cx={SW / 2} cy={SH * 0.4} r={100} stroke="#00E5FF" strokeWidth={0.5} fill="none" opacity={0.12} strokeDasharray="8,6" />
            <Circle cx={SW / 2} cy={SH * 0.4} r={140} stroke="#00E5FF" strokeWidth={0.3} fill="none" opacity={0.06} strokeDasharray="4,8" />
            {/* Corner brackets */}
            <Line x1={16} y1={80} x2={50} y2={80} stroke="#00E5FF" strokeWidth={1.5} opacity={0.3} />
            <Line x1={16} y1={80} x2={16} y2={114} stroke="#00E5FF" strokeWidth={1.5} opacity={0.3} />
            <Line x1={SW - 16} y1={80} x2={SW - 50} y2={80} stroke="#00E5FF" strokeWidth={1.5} opacity={0.3} />
            <Line x1={SW - 16} y1={80} x2={SW - 16} y2={114} stroke="#00E5FF" strokeWidth={1.5} opacity={0.3} />
            <Line x1={16} y1={SH - 180} x2={50} y2={SH - 180} stroke="#00E5FF" strokeWidth={1.5} opacity={0.3} />
            <Line x1={16} y1={SH - 180} x2={16} y2={SH - 214} stroke="#00E5FF" strokeWidth={1.5} opacity={0.3} />
            <Line x1={SW - 16} y1={SH - 180} x2={SW - 50} y2={SH - 180} stroke="#00E5FF" strokeWidth={1.5} opacity={0.3} />
            <Line x1={SW - 16} y1={SH - 180} x2={SW - 16} y2={SH - 214} stroke="#00E5FF" strokeWidth={1.5} opacity={0.3} />
          </>
        )}
        <SvgText x={20} y={68} fill="#00E5FF" fontSize={8} fontWeight="bold" opacity={0.4}>ARENAKORE v2.1</SvgText>
        <SvgText x={SW - 110} y={68} fill="#00E5FF" fontSize={8} fontWeight="bold" opacity={0.4}>NEXUS SYNC</SvgText>
      </Svg>
    </View>
  );
}

// ========== NEON TRAIL SYSTEM ==========
const NEON_TRAIL_LENGTH = 12;
let _neonTrail: Array<{ x: number; y: number; age: number }> = [];
function pushNeonTrail(x: number, y: number) {
  _neonTrail.unshift({ x, y, age: 0 });
  _neonTrail = _neonTrail.slice(0, NEON_TRAIL_LENGTH).map(p => ({ ...p, age: p.age + 1 }));
}

// ========== DIGITAL SHADOW SKELETON v3.0 — FULL 17-POINT GLOW ==========
export function DigitalShadow({ pose, exercise, goldFlash, motionActive, deviceTier }: {
  pose: SkeletonPose; exercise: ExerciseType; goldFlash: boolean; motionActive: boolean; deviceTier: DeviceTier;
}) {
  const cx = SW / 2, baseY = SH * 0.38;
  // SPRINT 5: Always render full skeleton — no legacy degradation during scan
  const active = motionActive ? 1 : 0;
  const intensity = motionActive ? (0.5 + pose.intensity * 0.5) : 0.2;
  const col = goldFlash ? '#FFD700' : '#00E5FF';
  const glowCol = goldFlash ? 'rgba(255,215,0,' : 'rgba(0,229,255,';

  const tilt = pose.torsoTilt * active;
  const knee = pose.kneeAngle * active;
  const arm = exercise === 'punch' ? pose.armExtension * active : 0;
  const hip = pose.hipDrop * active;
  const sr = exercise === 'punch' ? pose.shoulderRotation * active * 10 : 0;
  const armExt = exercise === 'punch' ? arm * 50 : 15 * active;

  const headY = baseY - 52 + tilt * 6;
  const neckY = baseY - 30 + tilt * 5;
  const shoulderY = baseY - 18 + tilt * 8;
  const hipY = baseY + 36 + hip * 18;
  const kneeY = hipY + 42 + knee * 18;
  const footY = kneeY + 36;
  const armY = shoulderY + (exercise === 'punch' ? 5 : 15);

  // 17 joints: 0=head, 1=neck, 2=Lshoulder, 3=Rshoulder, 4=Lelbow, 5=Relbow,
  //           6=Lwrist, 7=Rwrist, 8=torso, 9=Lhip, 10=Rhip, 11=Lknee, 12=Rknee,
  //           13=Lankle, 14=Rankle, 15=Lhand, 16=Rhand
  const joints = [
    { x: cx, y: headY },                                                     // 0 HEAD
    { x: cx, y: neckY },                                                     // 1 NECK
    { x: cx - 28 - sr, y: shoulderY },                                       // 2 L_SHOULDER
    { x: cx + 28 + sr, y: shoulderY },                                       // 3 R_SHOULDER
    { x: cx - 34 - armExt * 0.7, y: armY },                                  // 4 L_ELBOW
    { x: cx + 34 + armExt * 0.7, y: armY },                                  // 5 R_ELBOW
    { x: cx - 38 - armExt * 1.2, y: armY + 18 },                             // 6 L_WRIST
    { x: cx + 38 + armExt * 1.2, y: armY + 18 },                             // 7 R_WRIST
    { x: cx, y: hipY - 10 },                                                 // 8 TORSO
    { x: cx - 18, y: hipY },                                                 // 9 L_HIP
    { x: cx + 18, y: hipY },                                                 // 10 R_HIP
    { x: cx - 22, y: kneeY },                                                // 11 L_KNEE
    { x: cx + 22, y: kneeY },                                                // 12 R_KNEE
    { x: cx - 24, y: footY },                                                // 13 L_ANKLE
    { x: cx + 24, y: footY },                                                // 14 R_ANKLE
    { x: cx - 44 - armExt * 1.4, y: armY + 30 },                             // 15 L_HAND
    { x: cx + 44 + armExt * 1.4, y: armY + 30 },                             // 16 R_HAND
  ];

  // Full 16 bones connecting all 17 joints
  const bones: [number, number][] = [
    [0, 1],    // head → neck
    [1, 2],    // neck → L_shoulder
    [1, 3],    // neck → R_shoulder
    [2, 4],    // L_shoulder → L_elbow
    [3, 5],    // R_shoulder → R_elbow
    [4, 6],    // L_elbow → L_wrist
    [5, 7],    // R_elbow → R_wrist
    [6, 15],   // L_wrist → L_hand
    [7, 16],   // R_wrist → R_hand
    [1, 8],    // neck → torso
    [8, 9],    // torso → L_hip
    [8, 10],   // torso → R_hip
    [9, 11],   // L_hip → L_knee
    [10, 12],  // R_hip → R_knee
    [11, 13],  // L_knee → L_ankle
    [12, 14],  // R_knee → R_ankle
  ];

  // Neon trails for hands during punch
  if (motionActive && exercise === 'punch') {
    pushNeonTrail(joints[15].x, joints[15].y);
    pushNeonTrail(joints[16].x, joints[16].y);
  } else if (!motionActive) { _neonTrail = []; }

  const boneWidth = motionActive ? 3.5 : 2;

  // Joint size map: head=large, hands=medium, rest=standard
  const jointSize = (idx: number) => {
    if (idx === 0) return 14;   // HEAD
    if (idx === 15 || idx === 16) return 8; // HANDS
    if (idx === 1 || idx === 8) return 5;   // NECK/TORSO
    return 6;
  };

  // Glow radius for each joint
  const glowSize = (idx: number) => {
    if (idx === 0) return 22;
    if (idx === 15 || idx === 16) return 14;
    return 10;
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={SW} height={SH}>
        {/* Neon trail for hands */}
        {_neonTrail.map((p, i) => (
          <Circle key={`trail-${i}`} cx={p.x} cy={p.y} r={16 - p.age * 1.1} fill={col} opacity={Math.max(0, 0.45 - p.age * 0.04)} />
        ))}

        {/* Spine axis guideline */}
        <Line x1={joints[0].x} y1={joints[0].y} x2={joints[8].x} y2={joints[8].y}
          stroke={col} strokeWidth={0.8} opacity={intensity * 0.12} strokeDasharray="4,6" />

        {/* Head aura glow */}
        <Circle cx={joints[0].x} cy={joints[0].y} r={30} fill={col} opacity={intensity * 0.1} />
        <Circle cx={joints[0].x} cy={joints[0].y} r={22} fill={col} opacity={intensity * 0.06} />

        {/* BONES — full 16 connections */}
        {bones.map(([f, t], i) => (
          <G key={`bone-${i}`}>
            {/* Bone glow (wider, lower opacity) */}
            {motionActive && (
              <Line x1={joints[f].x} y1={joints[f].y} x2={joints[t].x} y2={joints[t].y}
                stroke={col} strokeWidth={boneWidth + 4} opacity={intensity * 0.08} strokeLinecap="round" />
            )}
            {/* Bone core */}
            <Line x1={joints[f].x} y1={joints[f].y} x2={joints[t].x} y2={joints[t].y}
              stroke={col} strokeWidth={boneWidth} opacity={intensity * 0.9} strokeLinecap="round" />
          </G>
        ))}

        {/* JOINTS — all 17 with glow */}
        {joints.map((j, i) => {
          const r = jointSize(i);
          const gr = glowSize(i);
          return (
            <G key={`joint-${i}`}>
              {/* Outer glow ring */}
              {motionActive && (
                <Circle cx={j.x} cy={j.y} r={gr} stroke={col} strokeWidth={1.5} fill="none"
                  opacity={intensity * 0.25} />
              )}
              {/* Soft glow */}
              <Circle cx={j.x} cy={j.y} r={r + 3} fill={col} opacity={intensity * 0.15} />
              {/* Core joint */}
              <Circle cx={j.x} cy={j.y} r={r} fill={col} opacity={intensity * 0.85} />
              {/* Inner bright dot */}
              <Circle cx={j.x} cy={j.y} r={r * 0.4} fill="#FFFFFF" opacity={intensity * 0.5} />
            </G>
          );
        })}

        {/* Hand impact zones during punch */}
        {motionActive && exercise === 'punch' && (
          <>
            <Circle cx={joints[15].x} cy={joints[15].y} r={24} fill={col} opacity={intensity * 0.15} />
            <Circle cx={joints[16].x} cy={joints[16].y} r={24} fill={col} opacity={intensity * 0.15} />
            <Circle cx={joints[15].x} cy={joints[15].y} r={32} stroke={col} strokeWidth={1} fill="none" opacity={intensity * 0.08} />
            <Circle cx={joints[16].x} cy={joints[16].y} r={32} stroke={col} strokeWidth={1} fill="none" opacity={intensity * 0.08} />
          </>
        )}

        {/* Tracking mode label */}
        <SvgText x={16} y={SH - 195} fill={col} fontSize={7} fontWeight="bold" opacity={0.35}>
          {motionActive
            ? (goldFlash ? `${getTierLabel(deviceTier)} \u00b7 GOLD FLASH` : `${getTrackingMode(deviceTier)}`)
            : `${getTierLabel(deviceTier)} \u00b7 AWAITING`}
        </SvgText>
      </Svg>
    </View>
  );
}

// ========== SCAN LINE ==========
export function ScanLine({ active }: { active: boolean }) {
  const ty = useSharedValue(0);
  useEffect(() => { if (active) ty.value = withRepeat(withTiming(SH - 200, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, true); }, [active]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }], opacity: active ? 0.45 : 0 }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, height: 2, zIndex: 10 }, s]} pointerEvents="none">
      <View style={{ flex: 1, backgroundColor: '#00E5FF' }} />
    </Animated.View>
  );
}
