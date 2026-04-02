/**
 * ARENAKORE — NEXUS POSE ENGINE v3.0 (PRODUCTION)
 *
 * FIX CRITICO: "No navigator.mediaDevices.getUserMedia"
 * Causa: source={{ html }} usa context "about:blank" (non-HTTPS) → getUserMedia bloccato
 * Soluzione: carica il scanner come source={{ uri: HTTPS_URL }}
 *   → context HTTPS → navigator.mediaDevices disponibile su iOS/Android
 *
 * Il backend serve la pagina scanner su:
 *   GET https://arena-scan-lab.preview.emergentagent.com/scanner
 *   (NON prefissato /api — è una pagina HTML, non un endpoint JSON)
 */
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import WebView from 'react-native-webview';

export interface LandmarkPoint {
  x: number;
  y: number;
  v: number;
}

export interface PoseData {
  type: 'pose' | 'ready' | 'error' | 'timeout' | 'camera_denied';
  landmarks?: Array<LandmarkPoint | null>;
  fps?: number;
  centered?: boolean;
  person_detected?: boolean;
  visible_count?: number;
  nose_x?: number;
  message?: string;
}

interface Props {
  onPoseData: (data: PoseData) => void;
  enabled?: boolean;
}

// ── Scanner URL served over HTTPS via /api route
// CRITICAL: Must use /api/nexus/scanner so Kubernetes ingress routes to FastAPI (port 8001).
//           /scanner without /api prefix routes to Expo web app (port 3000) → no camera!
const SCANNER_URL = (() => {
  const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  return base
    ? `${base}/api/nexus/scanner`
    : 'https://arena-scan-lab.preview.emergentagent.com/api/nexus/scanner';
})();

export function NexusPoseEngine({ onPoseData, enabled = true }: Props) {
  const [restartKey, setRestartKey]     = useState(0);
  const restartTimerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const crashCountRef                    = useRef(0);

  const scheduleRestart = useCallback((delayMs = 500) => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (crashCountRef.current >= 3) return;  // stop after 3 crashes
    restartTimerRef.current = setTimeout(() => {
      crashCountRef.current += 1;
      setRestartKey(k => k + 1);
    }, delayMs);
  }, []);

  useEffect(() => {
    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, []);

  // Reset crash count when re-enabled
  useEffect(() => {
    if (enabled) crashCountRef.current = 0;
  }, [enabled]);

  const handleMessage = useCallback((event: any) => {
    try {
      const raw = event.nativeEvent?.data ?? event.data;
      const data: PoseData = JSON.parse(raw);
      // Auto-restart on non-fatal errors
      if (data.type === 'error' && crashCountRef.current < 3) {
        scheduleRestart(500);
      }
      onPoseData(data);
    } catch (_) {}
  }, [onPoseData, scheduleRestart]);
  // Web iframe message listener
  const handleWebMessage = useCallback((event: MessageEvent) => {
    if (typeof event.data === 'string') {
      try {
        const data: PoseData = JSON.parse(event.data);
        if (data.type) onPoseData(data);
      } catch (_) {}
    }
  }, [onPoseData]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [handleWebMessage]);

  if (!enabled) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <WebView
        key={restartKey}
        source={{ uri: SCANNER_URL }}          // ← HTTPS URL, not inline HTML
        style={StyleSheet.absoluteFill}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        onMessage={handleMessage}
        // iOS WKWebView: auto-grant camera permission
        mediaCapturePermissionGrantType="grant"
        allowsAirPlayForMediaPlayback={false}
        scrollEnabled={false}
        // React-level error boundary with auto-restart
        onError={() => scheduleRestart(500)}
        onHttpError={() => scheduleRestart(1000)}
        // Android: allow camera in WebView
        mixedContentMode="compatibility"
        // Required for canvas/WebGL
        hardwareAccelerated
      />
    </View>
  );
}
