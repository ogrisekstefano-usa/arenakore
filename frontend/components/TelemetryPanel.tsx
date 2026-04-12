/**
 * TELEMETRY PANEL — Build 37
 * ═══════════════════════════════════
 * Mathematical data from the Puppet Motion Deck:
 * - Heart Rate Avg (BPM)
 * - Time Under Tension (seconds)
 * - Rep Regularity (0-100 consistency score)
 * - Peak Power & Calories
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

const CYAN = '#00E5FF';
const GOLD = '#FFD700';
const GREEN = '#32D74B';
const RED = '#FF453A';
const PURPLE = '#BF5AF2';

interface TelemetryData {
  heart_rate_avg?: number | null;
  heart_rate_peak?: number | null;
  time_under_tension?: number | null;
  rep_regularity?: number | null;
  rep_cadence_std?: number | null;
  calories_burned?: number | null;
  peak_power?: number | null;
}

interface TelemetryPanelProps {
  telemetry: TelemetryData;
  compact?: boolean;
}

function MetricCard({ icon, label, value, unit, color, delay }: {
  icon: string; label: string; value: string | number; unit: string; color: string; delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(300)} style={s.metricCard}>
      <View style={[s.metricIconWrap, { backgroundColor: color + '10', borderColor: color + '20' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View style={s.metricInfo}>
        <Text style={s.metricLabel}>{label}</Text>
        <View style={s.metricValueRow}>
          <Text style={[s.metricValue, { color }]}>{value}</Text>
          <Text style={s.metricUnit}>{unit}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function RegularityBar({ value }: { value: number }) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const barColor = clampedValue >= 80 ? GREEN : clampedValue >= 50 ? GOLD : RED;
  return (
    <View style={s.barContainer}>
      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${clampedValue}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[s.barLabel, { color: barColor }]}>{clampedValue}%</Text>
    </View>
  );
}

export function TelemetryPanel({ telemetry, compact = false }: TelemetryPanelProps) {
  const hasData = telemetry && (
    telemetry.heart_rate_avg != null ||
    telemetry.time_under_tension != null ||
    telemetry.rep_regularity != null
  );

  if (!hasData) {
    return (
      <View style={s.emptyBox}>
        <Ionicons name="pulse-outline" size={20} color="rgba(255,255,255,0.08)" />
        <Text style={s.emptyText}>TELEMETRIA NON DISPONIBILE</Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)} style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons name="pulse" size={12} color={PURPLE} />
          <Text style={s.headerTitle}>TELEMETRIA</Text>
        </View>
        <Text style={s.headerSub}>PUPPET MOTION DECK</Text>
      </View>

      {/* Metrics Grid */}
      <View style={s.grid}>
        {telemetry.heart_rate_avg != null && (
          <MetricCard
            icon="heart"
            label="FREQ. CARDIACA"
            value={Math.round(telemetry.heart_rate_avg)}
            unit="BPM"
            color={RED}
            delay={100}
          />
        )}
        {telemetry.time_under_tension != null && (
          <MetricCard
            icon="timer"
            label="TEMPO TENSIONE"
            value={Math.round(telemetry.time_under_tension)}
            unit="SEC"
            color={CYAN}
            delay={150}
          />
        )}
        {telemetry.peak_power != null && (
          <MetricCard
            icon="flash"
            label="PICCO POTENZA"
            value={Math.round(telemetry.peak_power)}
            unit="W"
            color={GOLD}
            delay={200}
          />
        )}
        {telemetry.calories_burned != null && (
          <MetricCard
            icon="flame"
            label="CALORIE"
            value={Math.round(telemetry.calories_burned)}
            unit="KCAL"
            color="#FF6B00"
            delay={250}
          />
        )}
      </View>

      {/* Rep Regularity Bar */}
      {telemetry.rep_regularity != null && (
        <View style={s.regularitySection}>
          <View style={s.regularityHeader}>
            <Ionicons name="analytics" size={12} color={GREEN} />
            <Text style={s.regularityLabel}>REGOLARITÀ REP</Text>
          </View>
          <RegularityBar value={telemetry.rep_regularity} />
        </View>
      )}

      {/* Cadence STD */}
      {telemetry.rep_cadence_std != null && (
        <View style={s.cadenceRow}>
          <Text style={s.cadenceLabel}>Deviazione Cadenza</Text>
          <Text style={s.cadenceValue}>±{telemetry.rep_cadence_std.toFixed(2)}s</Text>
        </View>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(191,90,242,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(191,90,242,0.10)',
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { color: PURPLE, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  headerSub: { color: 'rgba(255,255,255,0.12)', fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  metricIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  metricInfo: { flex: 1, gap: 2 },
  metricLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  metricValue: { fontSize: 18, fontWeight: '900' },
  metricUnit: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '800' },

  regularitySection: { gap: 8 },
  regularityHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  regularityLabel: { color: GREEN, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  barContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barBg: {
    flex: 1, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  barLabel: { fontSize: 14, fontWeight: '900', width: 40, textAlign: 'right' },

  cadenceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  cadenceLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '700' },
  cadenceValue: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '800' },

  emptyBox: {
    alignItems: 'center', gap: 6, paddingVertical: 20,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  emptyText: { color: 'rgba(255,255,255,0.12)', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
});
