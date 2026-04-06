/**
 * ARENAKORE — NativeCameraPreview
 * FULLY lazy-loaded camera component to avoid Expo Go crash.
 * 
 * CRITICAL: expo-camera is required ONLY when the component renders,
 * never at module import time. This prevents crashes on Expo Go iOS.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';

interface Props {
  facing: 'front' | 'back';
}

function CameraInner({ facing }: Props) {
  const [CameraView, setCameraView] = useState<any>(null);
  const [permission, setPermission] = useState<any>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = require('expo-camera');
        if (!mounted) return;
        setCameraView(() => mod.CameraView);

        // Request permission
        const result = await mod.Camera?.requestCameraPermissionsAsync?.()
          || await mod.requestCameraPermissionsAsync?.();
        if (mounted && result?.granted) {
          setPermissionGranted(true);
        }
      } catch (e) {
        console.warn('[NativeCameraPreview] expo-camera init failed:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!CameraView || !permissionGranted) {
    return (
      <View style={[StyleSheet.absoluteFillObject, styles.placeholder]}>
        <Text style={styles.placeholderText}>📷 Camera loading...</Text>
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
