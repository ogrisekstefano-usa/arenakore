/**
 * CALENDAR MODAL — Build 30 · Logica di Presenza
 * ═══════════════════════════════════════════
 * Monthly grid view showing check-in history.
 * - Gold (#FFD700) = checked-in day
 * - Dim = missed day
 * - Navigation arrows to scroll months
 * - Today highlighted with cyan ring
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

const GOLD = '#FFD700';
const CYAN = '#00E5FF';
const PURPLE = '#BF5AF2';
const SW = Dimensions.get('window').width;
const DAY_SIZE = Math.floor((SW - 80) / 7);

const DAYS_IT = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];
const MONTHS_IT = [
  'GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO',
  'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE'
];

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  fetchHistory: (month: number, year: number) => Promise<string[]>;
  streak: number;
}

export function CalendarModal({ visible, onClose, fetchHistory, streak }: CalendarModalProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [year, setYear] = useState(now.getFullYear());
  const [checkedDates, setCheckedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Load check-in data for current month
  const loadMonth = useCallback(async () => {
    setLoading(true);
    try {
      const dates = await fetchHistory(month, year);
      setCheckedDates(dates);
    } catch (e) {
      setCheckedDates([]);
    }
    setLoading(false);
  }, [month, year, fetchHistory]);

  useEffect(() => {
    if (visible) loadMonth();
  }, [visible, loadMonth]);

  // Navigate months
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
    if (isCurrentMonth) return; // Can't go to future
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Build calendar grid
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Monday=0
  const totalCheckins = checkedDates.length;

  const cells: Array<{ day: number | null; dateStr: string; isToday: boolean; isChecked: boolean }> = [];
  // Leading empty cells
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ day: null, dateStr: '', isToday: false, isChecked: false });
  }
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      day: d,
      dateStr,
      isToday: dateStr === todayStr,
      isChecked: checkedDates.includes(dateStr),
    });
  }

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={cs.overlay}>
        <Animated.View entering={FadeInDown.duration(300)} style={cs.modal}>
          {/* Header */}
          <View style={cs.header}>
            <Text style={cs.headerTitle}>CALENDARIO PRESENZA</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          </View>

          {/* Month Navigator */}
          <View style={cs.monthNav}>
            <TouchableOpacity onPress={prevMonth} activeOpacity={0.7} style={cs.navBtn}>
              <Ionicons name="chevron-back" size={22} color={CYAN} />
            </TouchableOpacity>
            <View style={cs.monthCenter}>
              <Text style={cs.monthText}>{MONTHS_IT[month - 1]}</Text>
              <Text style={cs.yearText}>{year}</Text>
            </View>
            <TouchableOpacity
              onPress={nextMonth}
              activeOpacity={isCurrentMonth ? 1 : 0.7}
              style={[cs.navBtn, isCurrentMonth && { opacity: 0.2 }]}
            >
              <Ionicons name="chevron-forward" size={22} color={CYAN} />
            </TouchableOpacity>
          </View>

          {/* Stats Strip */}
          <View style={cs.statsStrip}>
            <View style={cs.statItem}>
              <Ionicons name="flame" size={14} color={GOLD} />
              <Text style={cs.statValue}>{streak}</Text>
              <Text style={cs.statLabel}>STREAK</Text>
            </View>
            <View style={cs.statDivider} />
            <View style={cs.statItem}>
              <Ionicons name="checkmark-circle" size={14} color={CYAN} />
              <Text style={cs.statValue}>{totalCheckins}</Text>
              <Text style={cs.statLabel}>CHECK-IN</Text>
            </View>
            <View style={cs.statDivider} />
            <View style={cs.statItem}>
              <Ionicons name="calendar" size={14} color={PURPLE} />
              <Text style={cs.statValue}>{daysInMonth}</Text>
              <Text style={cs.statLabel}>GIORNI</Text>
            </View>
          </View>

          {/* Day Labels */}
          <View style={cs.dayLabelsRow}>
            {DAYS_IT.map(d => (
              <View key={d} style={cs.dayLabelCell}>
                <Text style={cs.dayLabelText}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          {loading ? (
            <View style={cs.loadWrap}>
              <ActivityIndicator color={GOLD} />
            </View>
          ) : (
            <View style={cs.grid}>
              {cells.map((cell, i) => (
                <View key={i} style={cs.cell}>
                  {cell.day ? (
                    <View style={[
                      cs.dayCircle,
                      cell.isChecked && cs.dayChecked,
                      cell.isToday && cs.dayToday,
                    ]}>
                      <Text style={[
                        cs.dayText,
                        cell.isChecked && cs.dayTextChecked,
                        cell.isToday && !cell.isChecked && cs.dayTextToday,
                      ]}>
                        {cell.day}
                      </Text>
                      {cell.isChecked && (
                        <View style={cs.checkDot} />
                      )}
                    </View>
                  ) : (
                    <View style={cs.dayCircle} />
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Legend */}
          <View style={cs.legend}>
            <View style={cs.legendItem}>
              <View style={[cs.legendDot, { backgroundColor: GOLD }]} />
              <Text style={cs.legendText}>Check-in</Text>
            </View>
            <View style={cs.legendItem}>
              <View style={[cs.legendDot, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
              <Text style={cs.legendText}>Mancato</Text>
            </View>
            <View style={cs.legendItem}>
              <View style={[cs.legendDot, { borderWidth: 1.5, borderColor: CYAN, backgroundColor: 'transparent' }]} />
              <Text style={cs.legendText}>Oggi</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const cs = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modal: {
    width: '100%', maxWidth: 380,
    backgroundColor: '#0A0A0A',
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 20, gap: 16,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { color: GOLD, fontSize: 14, fontWeight: '900', letterSpacing: 3 },

  // Month Navigation
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  monthCenter: { alignItems: 'center', gap: 2 },
  monthText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  yearText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '700', letterSpacing: 2 },

  // Stats Strip
  statsStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 12, gap: 12,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 7, fontWeight: '900', letterSpacing: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' },

  // Day Labels
  dayLabelsRow: { flexDirection: 'row' },
  dayLabelCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  dayLabelText: { color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  dayCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  dayChecked: { backgroundColor: GOLD },
  dayToday: { borderWidth: 2, borderColor: CYAN },
  dayText: { color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: '700' },
  dayTextChecked: { color: '#000', fontWeight: '900' },
  dayTextToday: { color: CYAN, fontWeight: '900' },
  checkDot: {
    position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: '#000',
  },
  loadWrap: { paddingVertical: 40, alignItems: 'center' },

  // Legend
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600' },
});
