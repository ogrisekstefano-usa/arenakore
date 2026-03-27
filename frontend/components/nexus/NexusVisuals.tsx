/**
 * ARENAKORE — Nexus Visuals v2.0
 * CyberGrid + DigitalShadow + ScanLine
 * Extracted from nexus-trigger.tsx
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Svg, { Line, Circle, Text as SvgText, G } from 'react-native-svg';
import Animated, { useSharedValue, withRepeat, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated';
import { SkeletonPose, ExerciseType } from '../../utils/MotionAnalyzer';
import { DeviceTier, getTierLabel, getTrackingMode } from '../../utils/DeviceIntelligence';

const { width: SW, height: SH } = Dimensions.get('window');

// ========== CYBER GRID ==========
export function CyberGrid({ intensity }: { intensity: number }) {
  const G_SIZE = 45;
  const cols = Math.ceil(SW / G_SIZE) + 1;
  const rows = Math.ceil(SH / G_SIZE) + 1;
  const op = 0.08 + intensity * 0.15;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={SW} height={SH}>
        {Array.from({ length: cols }).map((_, i) => (
          <Line key={`v${i}`} x1={i * G_SIZE} y1={0} x2={i * G_SIZE} y2={SH} stroke="#00F2FF" strokeWidth={0.3} opacity={op * 0.6} />
        ))}
        {Array.from({ length: rows }).map((_, i) => (
          <Line key={`h${i}`} x1={0} y1={i * G_SIZE} x2={SW} y2={i * G_SIZE} stroke="#00F2FF" strokeWidth={0.3} opacity={op * 0.6} />
        ))}
        <Circle cx={SW / 2} cy={SH * 0.4} r={55} stroke="#00F2FF" strokeWidth={1} fill="none" opacity={op} />
        <Circle cx={SW / 2} cy={SH * 0.4} r={85} stroke="#00F2FF" strokeWidth={0.6} fill="none" opacity={op * 0.5} strokeDasharray="6,5" />
        <SvgText x={20} y={68} fill="#00F2FF" fontSize={8} fontWeight="bold" opacity={0.4}>ARENAKORE v2.1</SvgText>
        <SvgText x={SW - 110} y={68} fill="#00F2FF" fontSize={8} fontWeight="bold" opacity={0.4}>NEXUS SYNC</SvgText>
      </Svg>
    </View>
  );
}

// ========== NEON TRAIL SYSTEM ==========
const NEON_TRAIL_LENGTH = 8;
let _neonTrail: Array<{ x: number; y: number; age: number }> = [];
function pushNeonTrail(x: number, y: number) {
  _neonTrail.unshift({ x, y, age: 0 });
  _neonTrail = _neonTrail.slice(0, NEON_TRAIL_LENGTH).map(p => ({ ...p, age: p.age + 1 }));
}

// ========== DIGITAL SHADOW SKELETON ==========
export function DigitalShadow({ pose, exercise, goldFlash, motionActive, deviceTier }: {
  pose: SkeletonPose; exercise: ExerciseType; goldFlash: boolean; motionActive: boolean; deviceTier: DeviceTier;
}) {
  const cx = SW / 2, baseY = SH * 0.38;
  const isHigh = deviceTier === 'high';
  const isLegacy = deviceTier === 'legacy';
  const active = motionActive ? 1 : 0;
  const intensity = motionActive ? (0.4 + pose.intensity * 0.6) : (isLegacy ? 0.08 : 0.15);
  const col = goldFlash ? '#D4AF37' : '#00F2FF';

  const tilt = pose.torsoTilt * active;
  const knee = pose.kneeAngle * active;
  const arm = exercise === 'punch' ? pose.armExtension * active : 0;
  const hip = pose.hipDrop * active;
  const sr = exercise === 'punch' ? pose.shoulderRotation * active * 10 : 0;
  const armExt = exercise === 'punch' ? arm * 50 : 15 * active;

  const headY = baseY - 48 + tilt * 5;
  const shoulderY = baseY - 18 + tilt * 8;
  const hipY = baseY + 32 + hip * 15;
  const kneeY = hipY + 38 + knee * 15;
  const footY = kneeY + 32;
  const armY = shoulderY + (exercise === 'punch' ? 5 : 15);

  const joints = [
    { x: cx, y: headY }, { x: cx, y: shoulderY },
    { x: cx - 25 - sr, y: shoulderY }, { x: cx + 25 + sr, y: shoulderY },
    { x: cx - 30 - armExt, y: armY }, { x: cx + 30 + armExt, y: armY },
    { x: cx - 35 - armExt * 1.2, y: armY + 16 }, { x: cx + 35 + armExt * 1.2, y: armY + 16 },
    { x: cx, y: hipY }, { x: cx - 16, y: hipY }, { x: cx + 16, y: hipY },
    { x: cx - 20, y: kneeY }, { x: cx + 20, y: kneeY },
    { x: cx - 22, y: footY }, { x: cx + 22, y: footY },
    { x: cx - 40 - armExt * 1.3, y: armY + 26 }, { x: cx + 40 + armExt * 1.3, y: armY + 26 },
  ];

  const bones = [[0,1],[1,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,15],[7,16],[1,8],[8,9],[8,10],[9,11],[10,12],[11,13],[12,14]];

  if (isHigh && motionActive && exercise === 'punch') {
    pushNeonTrail(joints[15].x, joints[15].y);
    pushNeonTrail(joints[16].x, joints[16].y);
  } else if (!motionActive) { _neonTrail = []; }

  const legacyBones = [[0,1],[1,8],[2,6],[3,7],[9,13],[10,14]];
  const renderBones = isLegacy ? legacyBones : bones;
  const renderJoints = isLegacy
    ? [joints[0], joints[1], joints[6], joints[7], joints[8], joints[13], joints[14]]
    : joints;
  const boneWidth = isHigh ? (motionActive ? 3.5 : 2.5) : (isLegacy ? 1.5 : (motionActive ? 3 : 2));
  const jointBase = isHigh ? 6 : (isLegacy ? 3 : 5);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={SW} height={SH}>
        {isHigh && _neonTrail.map((p, i) => (
          <Circle key={`trail-${i}`} cx={p.x} cy={p.y} r={14 - p.age * 1.2} fill={goldFlash ? '#D4AF37' : '#00F2FF'} opacity={Math.max(0, 0.4 - p.age * 0.05)} />
        ))}
        {isHigh && (
          <Line x1={joints[0].x} y1={joints[0].y} x2={joints[8].x} y2={joints[8].y} stroke={col} strokeWidth={1} opacity={intensity * 0.15} strokeDasharray="4,4" />
        )}
        {!isLegacy && (
          <Circle cx={joints[0].x} cy={joints[0].y} r={isHigh ? 28 : 24} fill={col} opacity={intensity * (isHigh ? 0.15 : 0.12)} />
        )}
        {renderBones.map(([f, t], i) => (
          <Line key={i} x1={joints[f].x} y1={joints[f].y} x2={joints[t].x} y2={joints[t].y} stroke={col} strokeWidth={boneWidth} opacity={intensity} strokeLinecap="round" />
        ))}
        {(isLegacy ? renderJoints : joints).map((j, i) => (
          <G key={i}>
            <Circle cx={j.x} cy={j.y} r={(!isLegacy && i === 0) ? 12 : jointBase} fill={col} opacity={intensity * 0.9} />
            {isHigh && motionActive && <Circle cx={j.x} cy={j.y} r={(!isLegacy && i === 0) ? 18 : 10} stroke={col} strokeWidth={1.5} fill="none" opacity={intensity * 0.25} />}
            {!isHigh && !isLegacy && motionActive && <Circle cx={j.x} cy={j.y} r={i === 0 ? 16 : 8} stroke={col} strokeWidth={1} fill="none" opacity={intensity * 0.3} />}
          </G>
        ))}
        {isHigh && motionActive && exercise === 'punch' && (
          <>
            <Circle cx={joints[15].x} cy={joints[15].y} r={20} fill={col} opacity={intensity * 0.2} />
            <Circle cx={joints[16].x} cy={joints[16].y} r={20} fill={col} opacity={intensity * 0.2} />
          </>
        )}
        <SvgText x={cx - 80} y={baseY - 130} fill={col} fontSize={8} fontWeight="bold" opacity={0.5}>
          {motionActive
            ? (goldFlash ? `${getTierLabel(deviceTier)} \u00b7 GOLD FLASH` : `${getTrackingMode(deviceTier)}`)
            : `${getTierLabel(deviceTier)} \u00b7 AWAITING MOTION`}
        </SvgText>
      </Svg>
    </View>
  );
}

// ========== SCAN LINE ==========
export function ScanLine({ active }: { active: boolean }) {
  const ty = useSharedValue(0);
  useEffect(() => { if (active) ty.value = withRepeat(withTiming(SH - 200, { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true); }, [active]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }], opacity: active ? 0.6 : 0 }));
  return <Animated.View style={[{ position: 'absolute', left: 0, right: 0, height: 3, zIndex: 10 }, s]} pointerEvents="none"><View style={{ flex: 1, backgroundColor: '#00F2FF' }} /></Animated.View>;
}
