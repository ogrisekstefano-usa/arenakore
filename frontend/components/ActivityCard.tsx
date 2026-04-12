/**
 * ACTIVITY CARD — Build 37 · Archivio Storico
 * ═══════════════════════════════════════════════
 * Rich expandable card for each Activity Log entry.
 * Shows: Template name, Result, K-Flux (color-coded), Date, Duration.
 * Expanded: NEXUS Evidence Box + Telemetry Panel.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';
import { NexusEvidenceBox } from './NexusEvidenceBox';
import { TelemetryPanel } from './TelemetryPanel';

const CYAN = '#00E5FF';
const GOLD = '#FFD700';
const GREEN = '#32D74B';
const RED = '#FF453A';
const PURPLE = '#BF5AF2';

// K-Flux color mapping
const FLUX_COLORS: Record<string, string> = {
  gold: GOLD,
  cyan: CYAN,
  green: GREEN,
};

// Tipo icon mapping
const TIPO_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  ALLENAMENTO: { icon: 'barbell', color: CYAN, label: 'ALLENAMENTO' },
  SFIDA_UGC: { icon: 'trophy', color: GOLD, label: 'SFIDA' },
  LIVE_ARENA: { icon: 'radio', color: RED, label: 'LIVE ARENA' },
  COACH_PROGRAM: { icon: 'school', color: PURPLE, label: 'COACH' },
  CREW_BATTLE: { icon: 'people', color: GOLD, label: 'CREW' },
  DUELLO: { icon: 'flash', color: RED, label: 'DUELLO' },
};

interface ActivityCardProps {
  activity: {
    id: string;
    tipo: string;
    template_name?: string;
    disciplina: string;
    exercise_type: string;
    result?: { type?: string; value?: number; unit?: string };
    kpi?: Record<string, any>;
    flux_earned: number;
    flux_color: string;
    duration_seconds?: number;
    nexus_verified: boolean;
    is_certified: boolean;
    completed_at: string;
    media: { screenshots: string[]; has_evidence: boolean };
    telemetry: Record<string, any>;
  };
  index: number;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatDate(isoString?: string): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' });
}

function formatTime(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function ActivityCard({ activity, index }: ActivityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = TIPO_CONFIG[activity.tipo] || TIPO_CONFIG.ALLENAMENTO;
  const fluxColor = FLUX_COLORS[activity.flux_color] || GREEN;
  const resultValue = activity.result?.value || activity.kpi?.primary_result?.value;
  const resultUnit = activity.result?.unit || activity.kpi?.primary_result?.unit || '';

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 60).duration(350)}>
      <TouchableOpacity
        style={[s.card, activity.nexus_verified && s.cardNexus]}
        activeOpacity={0.85}
        onPress={() => setExpanded(!expanded)}
      >
        {/* ═══ MAIN ROW ═══ */}
        <View style={s.mainRow}>
          {/* Left: Type indicator */}
          <View style={[s.typeIcon, { backgroundColor: config.color + '12', borderColor: config.color + '25' }]}>
            <Ionicons name={config.icon as any} size={18} color={config.color} />
          </View>

          {/* Center: Info */}
          <View style={s.infoCol}>
            <View style={s.titleRow}>
              <Text style={s.templateName} numberOfLines={1}>
                {activity.template_name || config.label}
              </Text>
              {activity.nexus_verified && (
                <View style={s.nexusBadge}>
                  <Ionicons name="shield-checkmark" size={8} color={CYAN} />
                </View>
              )}
            </View>
            <Text style={s.disciplina}>
              {activity.disciplina} · {activity.exercise_type?.toUpperCase()}
            </Text>
            <View style={s.metaRow}>
              <Text style={s.metaDate}>{formatDate(activity.completed_at)}</Text>
              <Text style={s.metaDot}>·</Text>
              <Text style={s.metaTime}>{formatTime(activity.completed_at)}</Text>
              {activity.duration_seconds != null && activity.duration_seconds > 0 && (
                <>
                  <Text style={s.metaDot}>·</Text>
                  <Ionicons name="time" size={10} color="rgba(255,255,255,0.15)" />
                  <Text style={s.metaDuration}>{formatDuration(activity.duration_seconds)}</Text>
                </>
              )}
            </View>
          </View>

          {/* Right: Result + Flux */}
          <View style={s.rightCol}>
            {resultValue != null && (
              <Text style={[s.resultValue, { color: config.color }]}>
                {resultValue}
                <Text style={s.resultUnit}> {resultUnit}</Text>
              </Text>
            )}
            {activity.flux_earned > 0 && (
              <View style={[s.fluxBadge, { backgroundColor: fluxColor + '10', borderColor: fluxColor + '20' }]}>
                <Ionicons name="flash" size={10} color={fluxColor} />
                <Text style={[s.fluxText, { color: fluxColor }]}>+{activity.flux_earned}</Text>
              </View>
            )}
            {/* Evidence indicator */}
            {activity.media?.has_evidence && (
              <View style={s.evidenceIndicator}>
                <Ionicons name="images" size={10} color={CYAN} />
              </View>
            )}
          </View>

          {/* Expand chevron */}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="rgba(255,255,255,0.15)"
            style={s.chevron}
          />
        </View>

        {/* ═══ EXPANDED SECTION ═══ */}
        {expanded && (
          <Animated.View entering={FadeIn.duration(300)} style={s.expandedSection}>
            {/* NEXUS Evidence Box */}
            {activity.media?.has_evidence && (
              <NexusEvidenceBox
                screenshots={activity.media.screenshots}
                certified={activity.nexus_verified}
              />
            )}

            {/* Telemetry Panel */}
            <TelemetryPanel telemetry={activity.telemetry} />

            {/* KPI Quick Stats */}
            {activity.kpi && Object.keys(activity.kpi).length > 0 && (
              <View style={s.kpiRow}>
                {activity.kpi.quality_score != null && (
                  <View style={s.kpiItem}>
                    <Text style={s.kpiLabel}>QUALITÀ</Text>
                    <Text style={[s.kpiValue, { color: activity.kpi.quality_score >= 80 ? GREEN : activity.kpi.quality_score >= 50 ? GOLD : RED }]}>
                      {Math.round(activity.kpi.quality_score)}%
                    </Text>
                  </View>
                )}
                {activity.kpi.explosivity_pct != null && (
                  <View style={s.kpiItem}>
                    <Text style={s.kpiLabel}>ESPLOSIVITÀ</Text>
                    <Text style={[s.kpiValue, { color: GOLD }]}>{Math.round(activity.kpi.explosivity_pct)}%</Text>
                  </View>
                )}
                {activity.kpi.rom_pct != null && (
                  <View style={s.kpiItem}>
                    <Text style={s.kpiLabel}>ROM</Text>
                    <Text style={[s.kpiValue, { color: PURPLE }]}>{Math.round(activity.kpi.rom_pct)}%</Text>
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    marginBottom: 10,
  },
  cardNexus: {
    borderColor: 'rgba(0,229,255,0.12)',
    backgroundColor: 'rgba(0,229,255,0.02)',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  infoCol: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  templateName: {
    color: '#FFFFFF', fontSize: 14, fontWeight: '800',
    flex: 1,
  },
  nexusBadge: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,229,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  disciplina: {
    color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700',
    letterSpacing: 1,
  },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  metaDate: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '600' },
  metaDot: { color: 'rgba(255,255,255,0.1)', fontSize: 10 },
  metaTime: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '600' },
  metaDuration: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '600' },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  resultValue: {
    fontSize: 20, fontWeight: '900',
  },
  resultUnit: {
    fontSize: 10, fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
  },
  fluxBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  fluxText: { fontSize: 11, fontWeight: '900' },
  evidenceIndicator: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: 'rgba(0,229,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  chevron: { marginLeft: 4 },

  // Expanded
  expandedSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    gap: 12,
  },
  kpiRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12, padding: 12,
  },
  kpiItem: { alignItems: 'center', gap: 4 },
  kpiLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  kpiValue: { fontSize: 18, fontWeight: '900' },
});
