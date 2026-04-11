/**
 * RPE SELECTOR — Build 33 · Inclusività
 * ═══════════════════════════════════════
 * Rating of Perceived Exertion (1-10)
 * Per atleti senza wearable/sensori biometrici.
 * Selettore visuale rapido post-attività.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

const CYAN = '#00E5FF';
const GOLD = '#FFD700';

const RPE_LABELS: Record<number, { label: string; color: string; emoji: string }> = {
  1:  { label: 'RIPOSO',         color: '#32D74B', emoji: '😌' },
  2:  { label: 'MOLTO LEGGERO',  color: '#34C759', emoji: '🙂' },
  3:  { label: 'LEGGERO',        color: '#4CD964', emoji: '🙂' },
  4:  { label: 'MODERATO',       color: '#FFD700', emoji: '😊' },
  5:  { label: 'MEDIO',          color: '#FFD700', emoji: '😐' },
  6:  { label: 'IMPEGNATIVO',    color: '#FF9500', emoji: '😤' },
  7:  { label: 'DIFFICILE',      color: '#FF9500', emoji: '💪' },
  8:  { label: 'MOLTO DURO',     color: '#FF6B35', emoji: '🔥' },
  9:  { label: 'ESTREMO',        color: '#FF453A', emoji: '😰' },
  10: { label: 'MASSIMALE',      color: '#FF453A', emoji: '🏆' },
};

interface RPESelectorProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rpe: number) => void;
  loading?: boolean;
}

export function RPESelector({ visible, onClose, onSubmit, loading }: RPESelectorProps) {
  const [selected, setSelected] = useState<number>(5);
  const info = RPE_LABELS[selected];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={Platform.OS === 'ios' ? 60 : 30} tint="dark" style={StyleSheet.absoluteFill}>
        <TouchableOpacity style={rp$.backdrop} activeOpacity={1} onPress={onClose}>
          <Animated.View entering={FadeInDown.duration(400)} style={rp$.card}>
            <TouchableOpacity activeOpacity={1}>
              {/* Header */}
              <View style={rp$.header}>
                <Text style={rp$.headerTitle}>SFORZO PERCEPITO</Text>
                <Text style={rp$.headerSub}>Quanto è stato intenso l'allenamento?</Text>
              </View>

              {/* Selected Value */}
              <Animated.View entering={FadeIn.duration(200)} key={selected} style={rp$.valueSection}>
                <Text style={rp$.emoji}>{info.emoji}</Text>
                <Text style={[rp$.valueNum, { color: info.color }]}>{selected}</Text>
                <Text style={[rp$.valueLabel, { color: info.color }]}>{info.label}</Text>
              </Animated.View>

              {/* RPE Scale (1-10) */}
              <View style={rp$.scale}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                  const isSelected = n === selected;
                  const nfo = RPE_LABELS[n];
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[
                        rp$.scaleBtn,
                        isSelected && { backgroundColor: nfo.color + '20', borderColor: nfo.color },
                      ]}
                      onPress={() => setSelected(n)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        rp$.scaleBtnText,
                        isSelected && { color: nfo.color, fontWeight: '900' }
                      ]}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Scale labels */}
              <View style={rp$.scaleLabels}>
                <Text style={rp$.scaleLabelText}>LEGGERO</Text>
                <Text style={rp$.scaleLabelText}>MASSIMALE</Text>
              </View>

              {/* Explanation */}
              <Text style={rp$.explanation}>
                I dati RPE sostituiscono i sensori biometrici nel calcolo del tuo K-Rating.
                Sii onesto per un punteggio accurato.
              </Text>

              {/* Submit */}
              <TouchableOpacity
                style={[rp$.submitBtn, { backgroundColor: info.color }]}
                onPress={() => onSubmit(selected)}
                activeOpacity={0.85}
                disabled={loading}
              >
                <Ionicons name="checkmark-circle" size={18} color="#000" />
                <Text style={rp$.submitText}>CONFERMA RPE {selected}</Text>
              </TouchableOpacity>

              {/* Skip */}
              <TouchableOpacity style={rp$.skipBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={rp$.skipText}>SALTA (RPE 5 predefinito)</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
}

const rp$ = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: {
    width: '100%', maxWidth: 380, backgroundColor: 'rgba(10,10,10,0.96)',
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  header: { padding: 20, paddingBottom: 12, alignItems: 'center', gap: 4 },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  headerSub: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '600' },

  valueSection: { alignItems: 'center', paddingVertical: 16, gap: 4 },
  emoji: { fontSize: 36 },
  valueNum: { fontSize: 48, fontWeight: '900', letterSpacing: -2 },
  valueLabel: { fontSize: 14, fontWeight: '900', letterSpacing: 3 },

  scale: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 4,
    justifyContent: 'center', flexWrap: 'wrap',
  },
  scaleBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  scaleBtnText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '700' },

  scaleLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, marginTop: 6,
  },
  scaleLabelText: { color: 'rgba(255,255,255,0.1)', fontSize: 8, fontWeight: '800', letterSpacing: 2 },

  explanation: {
    color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '600',
    textAlign: 'center', paddingHorizontal: 24, marginTop: 16, lineHeight: 16,
  },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 16, borderRadius: 14, paddingVertical: 14,
  },
  submitText: { color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 1 },

  skipBtn: { alignItems: 'center', paddingVertical: 16 },
  skipText: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
});
