/**
 * ARENAKORE — NEXUS POSE ENGINE v2.0 (PRODUCTION)
 *
 * MediaPipe Pose LITE running inside a WebView.
 * - Mounts ONLY when enabled=true (after Privacy Consent "ACCETTA")
 * - Camera requested only via HTTPS (getUserMedia requirement)
 * - Auto-restart WebView on any crash (key={restartKey})
 * - Posts 17-point COCO landmark data via postMessage
 * - Person NOT detected → posts empty landmarks → calling component shows NO skeleton
 */
import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import WebView from 'react-native-webview';

// ── MediaPipe 33 → COCO 17 landmark mapping
const MP_TO_COCO: Record<number, number> = {
  0: 0,   2: 1,  5: 2,  7: 3,  8: 4,
  11: 5, 12: 6, 13: 7, 14: 8, 15: 9, 16: 10,
  23: 11, 24: 12, 25: 13, 26: 14, 27: 15, 28: 16,
};

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

// ===================================================================
// HTML — MediaPipe Pose LITE + Camera inside WebView
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
    #status { position: absolute; bottom: 6px; left: 8px; right: 8px; color: rgba(0,242,255,0.7); font-family: monospace; font-size: 9px; background: rgba(0,0,0,0.6); padding: 3px 7px; border-radius: 4px; z-index: 10; pointer-events: none; text-align: center; }
    #err { display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); background: rgba(0,0,0,0.85); border: 1px solid rgba(255,59,48,0.4); border-radius: 12px; padding: 20px; text-align: center; color: #FF3B30; font-family: monospace; font-size: 12px; z-index: 20; width: 80%; }
  </style>
</head>
<body>
  <video id="video" autoplay playsinline muted></video>
  <div id="status">NEXUS: LOADING MEDIAPIPE LITE...</div>
  <div id="err"></div>

  <!-- MediaPipe CDN — LITE model selected via modelComplexity: 0 -->
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>

  <script>
    var postToRN = function(data) {
      try {
        var msg = JSON.stringify(data);
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
        else window.parent.postMessage(msg, '*');
      } catch(e) {}
    };

    var setStatus = function(txt) {
      var el = document.getElementById('status');
      if (el) el.textContent = txt;
    };

    var showError = function(msg, isDenied) {
      var el = document.getElementById('err');
      if (el) {
        el.style.display = 'block';
        el.innerHTML = isDenied
          ? 'PERMESSI CAMERA NEGATI<br><small>Impostazioni → ARENAKORE → Camera → Consenti</small>'
          : 'CAMERA NON DISPONIBILE<br><small>' + msg + '</small>';
      }
      setStatus(isDenied ? 'PERMESSI NEGATI' : 'CAMERA ERROR');
    };

    // ── MP → COCO 17 mapping
    var MP_TO_COCO = {0:0,2:1,5:2,7:3,8:4,11:5,12:6,13:7,14:8,15:9,16:10,23:11,24:12,25:13,26:14,27:15,28:16};

    var fpsHistory = [];
    var lastTime = performance.now();
    var cameraStarted = false;

    function onResults(results) {
      var now = performance.now();
      var dt = Math.max(now - lastTime, 1);
      lastTime = now;

      fpsHistory.push(Math.min(1000 / dt, 60));
      if (fpsHistory.length > 20) fpsHistory.shift();
      var fps = Math.round(fpsHistory.reduce(function(a,b){return a+b;},0) / fpsHistory.length);

      setStatus(fps + ' FPS — NEXUS ACTIVE');

      if (!results.poseLandmarks || results.poseLandmarks.length === 0) {
        postToRN({ type: 'pose', landmarks: [], fps: fps, centered: false, person_detected: false, visible_count: 0 });
        return;
      }

      var mp_lm = results.poseLandmarks;
      var coco17 = new Array(17).fill(null);
      Object.keys(MP_TO_COCO).forEach(function(k) {
        var lm = mp_lm[parseInt(k)];
        if (lm) coco17[MP_TO_COCO[k]] = { x: lm.x, y: lm.y, v: lm.visibility || 0 };
      });

      var noseX = mp_lm[0] ? mp_lm[0].x : 0.5;
      var centered = (noseX >= 0.28 && noseX <= 0.72);
      var visible_count = coco17.filter(function(p){ return p && p.v > 0.4; }).length;
      var person_detected = (visible_count >= 8);

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

    // ── Setup MediaPipe Pose LITE (modelComplexity: 0 = minimum RAM)
    var pose = new Pose({
      locateFile: function(file) {
        return 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/' + file;
      }
    });

    pose.setOptions({
      modelComplexity: 0,           // LITE — essential for device stability
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.45,
      minTrackingConfidence: 0.45
    });

    pose.onResults(onResults);

    // ── Start camera (requires HTTPS on browsers, native WebView is fine)
    var videoEl = document.getElementById('video');

    var camera = new Camera(videoEl, {
      onFrame: function() {
        return pose.send({ image: videoEl });
      },
      width: 480,
      height: 640
    });

    camera.start()
      .then(function() {
        cameraStarted = true;
        setStatus('NEXUS ACTIVE');
        postToRN({ type: 'ready' });
      })
      .catch(function(err) {
        var isDenied = (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
        var isNoCamera = (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError');
        var type = isDenied ? 'camera_denied' : 'error';
        showError(err.message || 'Errore camera', isDenied);
        postToRN({ type: type, message: err.message || 'Camera non disponibile' });
      });

    // ── CDN timeout: if Pose class not available after 10s, report timeout
    setTimeout(function() {
      if (typeof Pose === 'undefined') {
        postToRN({ type: 'timeout', message: 'CDN MediaPipe timeout — usa scan manuale' });
        setStatus('CDN TIMEOUT');
      }
    }, 10000);

    // ── Global error catcher for WebView crashes
    window.onerror = function(msg, src, line) {
      postToRN({ type: 'error', message: 'WebView error: ' + msg });
      return true;
    };
  </script>
</body>
</html>
`.trim();

// ===================================================================
// COMPONENT — Production error boundary + auto-restart
// ===================================================================
export function NexusPoseEngine({ onPoseData, enabled = true }: Props) {
  // ── Auto-restart: increment key forces WebView unmount/remount
  const [restartKey, setRestartKey] = useState(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const crashCountRef   = useRef(0);

  const scheduleRestart = useCallback((delayMs = 500) => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
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

  // ── Message handler
  const handleMessage = useCallback((event: any) => {
    try {
      const raw = event.nativeEvent?.data ?? event.data;
      const data: PoseData = JSON.parse(raw);

      if (data.type === 'error') {
        // Auto-restart on non-fatal errors (backoff: max 3 restarts)
        if (crashCountRef.current < 3) {
          scheduleRestart(500);
        }
      }

      onPoseData(data);
    } catch (_) {}
  }, [onPoseData, scheduleRestart]);

  // ── Web iframe message listener
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

  // ── Don't mount until explicitly enabled (after "ACCETTA" click)
  if (!enabled) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <WebView
        key={restartKey}                       // ← auto-restart on crash
        source={{ html: MEDIAPIPE_HTML }}
        style={StyleSheet.absoluteFill}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        onMessage={handleMessage}
        // iOS: allow camera inside WKWebView
        mediaCapturePermissionGrantType="grant"
        allowsAirPlayForMediaPlayback={false}
        backgroundColor="transparent"
        scrollEnabled={false}
        // React-level error boundary
        onError={() => { scheduleRestart(500); }}
        onHttpError={() => { scheduleRestart(1000); }}
      />
    </View>
  );
}
