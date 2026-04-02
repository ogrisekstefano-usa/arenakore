import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue, withRepeat, withSequence, withTiming,
  useAnimatedStyle, interpolate,
} from 'react-native-reanimated';
import { DNAStats } from '../contexts/AuthContext';

const ATTRS = [
  { key: 'velocita', label: 'Velocità' },
  { key: 'forza', label: 'Forza' },
  { key: 'resistenza', label: 'Resistenza' },
  { key: 'agilita', label: 'Agilità' },
  { key: 'tecnica', label: 'Tecnica' },
  { key: 'potenza', label: 'Potenza' },
];

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

interface RadarChartProps {
  stats: DNAStats;
  size?: number;
  glowing?: boolean;
  recordsBroken?: string[];
}

export function RadarChart({ stats, size = 280, glowing = false, recordsBroken = [] }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.34;
  const labelR = maxR + 26;
  const n = ATTRS.length;
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  // Glow animation
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    if (glowing) {
      glowPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.2, { duration: 800 })
        ),
        6, // pulse 6 times then stop
        false
      );
    } else {
      glowPulse.value = 0;
    }
  }, [glowing]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: interpolate(glowPulse.value, [0, 1], [0, 0.9]),
    shadowRadius: interpolate(glowPulse.value, [0, 1], [0, 30]),
    elevation: glowing ? 15 : 0,
  }));

  const borderGlowStyle = useAnimatedStyle(() => ({
    borderWidth: glowing ? 1.5 : 0,
    borderColor: `rgba(0, 242, 255, ${interpolate(glowPulse.value, [0, 1], [0, 0.6])})`,
    borderRadius: size / 2,
  }));

  const axisEndpoints = ATTRS.map((_, i) => polarToXY(cx, cy, maxR, (i * 360) / n));

  const dataPoints = ATTRS.map((a, i) => {
    const val = (stats[a.key as keyof DNAStats] || 0) / 100;
    return polarToXY(cx, cy, maxR * val, (i * 360) / n);
  });
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  const gridPolygons = gridLevels.map(level =>
    ATTRS.map((_, i) => {
      const p = polarToXY(cx, cy, maxR * level, (i * 360) / n);
      return `${p.x},${p.y}`;
    }).join(' ')
  );

  const isRecordBroken = (key: string) => recordsBroken.includes(key);

  return (
    <Animated.View style={[glowStyle, borderGlowStyle]}>
      <View>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#00E5FF" stopOpacity={glowing ? 0.15 : 0} />
              <Stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {/* Glow background */}
          {glowing && (
            <Circle cx={cx} cy={cy} r={maxR + 10} fill="url(#glowGrad)" />
          )}

          {gridPolygons.map((pts, i) => (
            <Polygon key={`grid-${i}`} points={pts} fill="none" stroke="#1E1E1E" strokeWidth={1} />
          ))}
          {axisEndpoints.map((p, i) => (
            <Line key={`ax-${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#2A2A2A" strokeWidth={1} />
          ))}
          <Polygon
            points={dataPolygon}
            fill={glowing ? "rgba(0,229,255,0.65)" : "rgba(0,229,255,0.12)"}
            stroke={glowing ? "#00E5FF" : "#00E5FF"}
            strokeWidth={glowing ? 2.5 : 2}
          />
          {dataPoints.map((p, i) => {
            const broken = isRecordBroken(ATTRS[i].key);
            return (
              <React.Fragment key={`dot-${i}`}>
                {broken && (
                  <Circle cx={p.x} cy={p.y} r={10} fill="rgba(255,215,0,0.2)" />
                )}
                <Circle
                  cx={p.x} cy={p.y}
                  r={broken ? 6 : 4}
                  fill={broken ? '#FFD700' : '#00E5FF'}
                />
              </React.Fragment>
            );
          })}
          {ATTRS.map((a, i) => {
            const lp = polarToXY(cx, cy, labelR, (i * 360) / n);
            const broken = isRecordBroken(a.key);
            return (
              <SvgText
                key={`lbl-${i}`}
                x={lp.x}
                y={lp.y}
                fill={broken ? '#FFD700' : '#999999'}
                fontSize={broken ? 13 : 12}
                fontWeight="800"
                fontFamily="Syne, Montserrat, sans-serif"
                textAnchor="middle"
                alignmentBaseline="middle"
                letterSpacing={0.5}
              >
                {broken ? `★ ${a.label.toUpperCase()}` : a.label.toUpperCase()}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    </Animated.View>
  );
}
