/**
 * ARENAKORE — NativeCameraPreview
 * Lazy-loaded camera component to avoid Expo Go crash.
 * 
 * CRITICAL: useCameraPermissions() must NEVER be called at the top level
 * of nexus-trigger.tsx — it crashes Expo Go immediately during module init.
 * By isolating it here, the hook only runs when this component is mounted
 * (i.e., only when the user is actually in a camera-active scanning phase).
 */
import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';

// Only import expo-camera on native platforms
let CameraView: any = null;
let useCameraPermissions: any = null;

if (Platform.OS !== 'web') {
  try {
    const mod = require('expo-camera');
    CameraView = mod.CameraView;
    useCameraPermissions = mod.useCameraPermissions;
  } catch (e) {
    console.warn('[NativeCameraPreview] expo-camera not available:', e);
  }
}

interface Props {
  facing: 'front' | 'back';
}

function CameraInner({ facing }: Props) {
  if (!useCameraPermissions || !CameraView) return null;

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission().catch(() => {});
    }
  }, [permission?.granted]);

  if (!permission?.granted) {
    return (
      <View style={[StyleSheet.absoluteFillObject, styles.placeholder]}>
        <Text style={styles.placeholderText}>📷 Permesso camera richiesto...</Text>
      </View>
    );
  }

  return (
    <CameraView
      style={StyleSheet.absoluteFillObject}
      facing={facing}
    />
  );
}

export function NativeCameraPreview({ facing }: Props) {
  // Web: no native camera needed (uses navigator.mediaDevices instead)
  if (Platform.OS === 'web') return null;

  return <CameraInner facing={facing} />;
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    fontWeight: '600',
  },
});
