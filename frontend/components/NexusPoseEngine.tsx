/**
 * ARENAKORE — NEXUS POSE ENGINE
 * MediaPipe Pose (LITE model) running inside a WebView.
 * Posts 17-point COCO landmark data to React Native via postMessage.
 *
 * Works on:
 *  - Web preview (browser iframe)
 *  - iOS (WKWebView)
 *  - Android (Chrome WebView)
 *
 * No custom native build required.
 */
import React, { useCallback, useRef, useMemo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import WebView from 'react-native-webview';

// ── MediaPipe 33 → COCO 17 landmark mapping
const MP_TO_COCO: Record<number, number> = {
  0: 0,   // nose
  2: 1,   // left eye (outer)
  5: 2,   // right eye (outer)
  7: 3,   // left ear
  8: 4,   // right ear
  11: 5,  // left shoulder
  12: 6,  // right shoulder
  13: 7,  // left elbow
  14: 8,  // right elbow
  15: 9,  // left wrist
  16: 10, // right wrist
  23: 11, // left hip
  24: 12, // right hip
  25: 13, // left knee
  26: 14, // right knee
  27: 15, // left ankle
  28: 16, // right ankle
};

// ── Types
export interface LandmarkPoint {
  x: number;   // normalized [0,1] — left to right as user sees
  y: number;   // normalized [0,1] — top to bottom
  v: number;   // visibility confidence [0,1]
}

export interface PoseData {
  type: 'pose' | 'ready' | 'error' | 'fps';
  landmarks?: Array<LandmarkPoint | null>; // 17-point COCO
  fps?: number;
  centered?: boolean;        // nose x in [0.28, 0.72]
  person_detected?: boolean; // >= 8 visible COCO points
  visible_count?: number;    // how many of 17 COCO points visible
  nose_x?: number;
  message?: string;
}

interface Props {
  onPoseData: (data: PoseData) => void;
  enabled?: boolean;
}

// ===================================================================
// HTML — MediaPipe Pose + Camera inside WebView
// ===================================================================
const MEDIAPIPE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    #video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
    #status { position: absolute; bottom: 8px; left: 8px; color: rgba(0,242,255,0.6); font-family: monospace; font-size: 10px; background: rgba(0,0,0,0.5); padding: 3px 7px; border-radius: 4px; z-index: 10; pointer-events: none; }
  </style>
</head>
<body>
  <video id="video" autoplay playsinline muted></video>
  <div id="status">NEXUS: LOADING MEDIAPIPE...</div>

  <!-- MediaPipe CDN — camera utils + pose -->
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>

  <script>
    // ── postMessage helper (WebView + iframe fallback)
    function postToRN(data) {
      try {
        const msg = JSON.stringify(data);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(msg);
        } else {
          window.parent.postMessage(msg, '*');
        }
      } catch(e) {}
    }

    // ── MediaPipe → COCO 17 mapping
    const MP_TO_COCO = {
      0:0, 2:1, 5:2, 7:3, 8:4,
      11:5, 12:6, 13:7, 14:8, 15:9, 16:10,
      23:11, 24:12, 25:13, 26:14, 27:15, 28:16
    };

    let fpsHistory = [];
    let lastTime = performance.now();
    let lastCenterAlertTs = 0;

    function onResults(results) {
      const now = performance.now();
      const dt = Math.max(now - lastTime, 1);
      lastTime = now;

      // Rolling FPS (20-frame window, capped at 60)
      fpsHistory.push(Math.min(1000 / dt, 60));
      if (fpsHistory.length > 20) fpsHistory.shift();
      const fps = Math.round(fpsHistory.reduce((a,b) => a+b, 0) / fpsHistory.length);

      document.getElementById('status').textContent = fps + ' FPS';

      if (!results.poseLandmarks || results.poseLandmarks.length === 0) {
        postToRN({ type: 'pose', landmarks: [], fps, centered: false, person_detected: false, visible_count: 0 });
        return;
      }

      const mp_lm = results.poseLandmarks;

      // Build COCO 17-point array
      const coco17 = new Array(17).fill(null);
      Object.entries(MP_TO_COCO).forEach(function([mp_idx_str, coco_idx]) {
        const mp_idx = parseInt(mp_idx_str);
        const lm = mp_lm[mp_idx];
        if (lm) {
          coco17[coco_idx] = { x: lm.x, y: lm.y, v: lm.visibility || 0 };
        }
      });

      // Centering: nose (0) x in [0.28, 0.72]
      const nose = mp_lm[0];
      const noseX = nose ? nose.x : 0.5;
      const centered = (noseX >= 0.28 && noseX <= 0.72);

      // Count visible landmarks
      const visible_count = coco17.filter(function(p) { return p && p.v > 0.4; }).length;
      const person_detected = visible_count >= 8;

      postToRN({
        type: 'pose',
        landmarks: coco17,
        fps: fps,
        centered: centered,
        person_detected: person_detected,
        visible_count: visible_count,
        nose_x: noseX
      });
    }

    // ── Pose model setup (LITE = best performance, ~30fps on device)
    const pose = new Pose({
      locateFile: function(file) {
        return 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/' + file;
      }
    });

    pose.setOptions({
      modelComplexity: 0,           // 0=LITE, 1=FULL, 2=HEAVY
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.45,
      minTrackingConfidence: 0.45
    });

    pose.onResults(onResults);

    // ── Start camera + inference loop
    const videoEl = document.getElementById('video');

    const camera = new Camera(videoEl, {
      onFrame: async function() {
        try { await pose.send({ image: videoEl }); } catch(e) {}
      },
      width: 480,
      height: 640
    });

    camera.start()
      .then(function() {
        document.getElementById('status').textContent = 'NEXUS ACTIVE';
        postToRN({ type: 'ready' });
      })
      .catch(function(err) {
        document.getElementById('status').textContent = 'ERR: ' + (err.message || 'Camera denied');
        postToRN({ type: 'error', message: err.message || 'Camera access denied' });
      });
  </script>
</body>
</html>
`.trim();

// ===================================================================
// COMPONENT
// ===================================================================
export function NexusPoseEngine({ onPoseData, enabled = true }: Props) {
  const webviewRef = useRef<any>(null);

  const handleMessage = useCallback((event: any) => {
    try {
      const raw = event.nativeEvent?.data ?? event.data;
      const data: PoseData = JSON.parse(raw);
      onPoseData(data);
    } catch (_) {}
  }, [onPoseData]);

  // On Expo Web, listen for iframe postMessage too
  const handleWebMessage = useCallback((event: MessageEvent) => {
    if (typeof event.data === 'string') {
      try {
        const data: PoseData = JSON.parse(event.data);
        if (data.type) onPoseData(data);
      } catch (_) {}
    }
  }, [onPoseData]);

  // Register window message listener for web
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [handleWebMessage]);

  if (!enabled) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <WebView
        ref={webviewRef}
        source={{ html: MEDIAPIPE_HTML }}
        style={StyleSheet.absoluteFill}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        onMessage={handleMessage}
        // iOS: allow camera in WKWebView
        allowsAirPlayForMediaPlayback={false}
        mediaCapturePermissionGrantType="grant"
        // Transparent background so dark overlay in step2 shows correctly
        backgroundColor="transparent"
        scrollEnabled={false}
      />
    </View>
  );
}
