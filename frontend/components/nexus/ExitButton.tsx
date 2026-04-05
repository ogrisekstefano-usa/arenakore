/**
 * ARENAKORE — EMERGENCY EXIT BUTTON (Safety X)
 * ═══════════════════════════════════════════════
 * Fixed overlay X button visible during ALL challenge phases.
 * Triggers immediate state reset and navigates to Arena.
 * Positioned top-right, always accessible.
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExitButtonProps {
  onExit: () => void;
}

export function ExitButton({ onExit }: ExitButtonProps) {
  return (
    <View style={eb$.container} pointerEvents="box-none">
      <TouchableOpacity
        style={eb$.button}
        onPress={onExit}
        activeOpacity={0.6}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="close" size={22} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );
}

const eb$ = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    right: 16,
    zIndex: 999
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,59,48,0.4)',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
