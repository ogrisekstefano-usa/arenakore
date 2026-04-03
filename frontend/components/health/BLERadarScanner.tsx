/**
 * ARENAKORE — BLE RADAR SCANNER
 * ═══════════════════════════════
 * Animated radar scanner for BLE sensor discovery.
 * Pulsing circles during search → Checkmark animation on connect.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSequence, withDelay, withSpring, Easing, FadeIn, FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line } from 'react-native-svg';

type ScanState = 'idle' | 'scanning' | 'found' | 'connected' | 'error';

interface MockDevice {
  name: string;
  type: 'HR' | 'POWER' | 'CADENCE';
  rssi: number;
  id: string;
}

const MOCK_DEVICES: MockDevice[] = [
  { name: 'Garmin HRM-Pro Plus', type: 'HR', rssi: -45, id: 'garmin-hrm-001' },
  { name: 'Polar H10', type: 'HR', rssi: -62, id: 'polar-h10-002' },
  { name: 'Wahoo KICKR', type: 'POWER', rssi: -55, id: 'wahoo-kickr-003' },
];


// ═══ RADAR ANIMATION ═══
function RadarPulse({ isScanning }: { isScanning: boolean }) {
  const ring1 = useSharedValue(0.3);
  const ring2 = useSharedValue(0.3);
  const ring3 = useSharedValue(0.3);
  const ring1Op = useSharedValue(0);
  const ring2Op = useSharedValue(0);
  const ring3Op = useSharedValue(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (isScanning) {
      // Expanding concentric rings
      ring1.value = withRepeat(withSequence(
        withTiming(0.3, { duration: 0 }),
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
      ), -1, false);
      ring1Op.value = withRepeat(withSequence(
        withTiming(0.5, { duration: 100 }),
        withTiming(0, { duration: 1700, easing: Easing.out(Easing.ease) }),
      ), -1, false);

      ring2.value = withDelay(600, withRepeat(withSequence(
        withTiming(0.3, { duration: 0 }),
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
      ), -1, false));
      ring2Op.value = withDelay(600, withRepeat(withSequence(
        withTiming(0.4, { duration: 100 }),
        withTiming(0, { duration: 1700, easing: Easing.out(Easing.ease) }),
      ), -1, false));

      ring3.value = withDelay(1200, withRepeat(withSequence(
        withTiming(0.3, { duration: 0 }),
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
      ), -1, false));
      ring3Op.value = withDelay(1200, withRepeat(withSequence(
        withTiming(0.3, { duration: 100 }),
        withTiming(0, { duration: 1700, easing: Easing.out(Easing.ease) }),
      ), -1, false));

      // Sweep rotation
      sweep.value = withRepeat(withTiming(360, { duration: 3000, easing: Easing.linear }), -1, false);
    } else {
      ring1.value = withTiming(0.3, { duration: 300 });
      ring2.value = withTiming(0.3, { duration: 300 });
      ring3.value = withTiming(0.3, { duration: 300 });
      ring1Op.value = withTiming(0, { duration: 300 });
      ring2Op.value = withTiming(0, { duration: 300 });
      ring3Op.value = withTiming(0, { duration: 300 });
    }
  }, [isScanning]);

  const r1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1.value }], opacity: ring1Op.value,
  }));
  const r2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2.value }], opacity: ring2Op.value,
  }));
  const r3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3.value }], opacity: ring3Op.value,
  }));
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sweep.value}deg` }],
  }));

  const size = 180;
  const center = size / 2;

  return (
    <View style={[rd.radarWrap, { width: size, height: size }]}>
      {/* Static grid */}
      <Svg width={size} height={size} style={rd.radarSvg}>
        <Circle cx={center} cy={center} r={80} fill="none" stroke="rgba(0,229,255,0.08)" strokeWidth={0.5} />
        <Circle cx={center} cy={center} r={55} fill="none" stroke="rgba(0,229,255,0.06)" strokeWidth={0.5} strokeDasharray="3,3" />
        <Circle cx={center} cy={center} r={30} fill="none" stroke="rgba(0,229,255,0.05)" strokeWidth={0.5} strokeDasharray="2,2" />
        <Line x1={center} y1={10} x2={center} y2={size - 10} stroke="rgba(0,229,255,0.05)" strokeWidth={0.5} />
        <Line x1={10} y1={center} x2={size - 10} y2={center} stroke="rgba(0,229,255,0.05)" strokeWidth={0.5} />
        <Circle cx={center} cy={center} r={4} fill="#00E5FF" opacity={0.6} />
      </Svg>

      {/* Pulse rings */}
      <Animated.View style={[rd.ring, r1Style]} />
      <Animated.View style={[rd.ring, r2Style]} />
      <Animated.View style={[rd.ring, r3Style]} />

      {/* Sweep line */}
      {isScanning && (
        <Animated.View style={[rd.sweepWrap, sweepStyle]}>
          <View style={rd.sweepLine} />
        </Animated.View>
      )}
    </View>
  );
}


// ═══ CONNECTED CHECK ANIMATION ═══
function ConnectedCheck() {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[rd.checkWrap, style]}>
      <Ionicons name="checkmark-circle" size={48} color="#34C759" />
    </Animated.View>
  );
}


// ═══ MAIN COMPONENT ═══
export function BLERadarScanner({ onDeviceConnected }: { onDeviceConnected?: (device: MockDevice) => void }) {
  const [state, setState] = useState<ScanState>('idle');
  const [devices, setDevices] = useState<MockDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<MockDevice | null>(null);

  const startScan = useCallback(() => {
    setState('scanning');
    setDevices([]);

    // Simulate BLE device discovery
    const timers: NodeJS.Timeout[] = [];
    MOCK_DEVICES.forEach((device, idx) => {
      const t = setTimeout(() => {
        setDevices(prev => [...prev, device]);
      }, 1200 + idx * 800);
      timers.push(t);
    });

    // Auto-stop after 5 seconds
    const stopTimer = setTimeout(() => {
      setState('found');
    }, 4500);
    timers.push(stopTimer);

    return () => timers.forEach(clearTimeout);
  }, []);

  const connectDevice = useCallback((device: MockDevice) => {
    setState('connected');
    setConnectedDevice(device);
    onDeviceConnected?.(device);
  }, [onDeviceConnected]);

  return (
    <View style={rd.container}>
      {/* Radar visualization */}
      <View style={rd.radarSection}>
        {state === 'connected' ? (
          <ConnectedCheck />
        ) : (
          <RadarPulse isScanning={state === 'scanning'} />
        )}
      </View>

      {/* Status text */}
      <Text style={rd.statusText}>
        {state === 'idle' ? 'Pronto per la ricerca sensori' :
         state === 'scanning' ? 'Ricerca in corso...' :
         state === 'found' ? `${devices.length} sensori trovati` :
         state === 'connected' ? `Connesso a ${connectedDevice?.name}` :
         'Errore di connessione'}
      </Text>

      {/* Action button */}
      {(state === 'idle' || state === 'found') && (
        <TouchableOpacity
          style={[rd.scanBtn, state === 'found' && { backgroundColor: 'rgba(0,229,255,0.08)' }]}
          onPress={startScan}
          activeOpacity={0.85}
        >
          <Ionicons name={state === 'idle' ? 'bluetooth' : 'refresh'} size={16} color="#00E5FF" />
          <Text style={rd.scanBtnText}>{state === 'idle' ? 'CERCA SENSORI' : 'NUOVA RICERCA'}</Text>
        </TouchableOpacity>
      )}

      {/* Device list */}
      {devices.length > 0 && state !== 'connected' && (
        <View style={rd.deviceList}>
          {devices.map((device, idx) => (
            <Animated.View key={device.id} entering={FadeInDown.delay(idx * 100).duration(300)}>
              <TouchableOpacity
                style={rd.deviceCard}
                onPress={() => connectDevice(device)}
                activeOpacity={0.85}
              >
                <View style={rd.deviceIcon}>
                  <Ionicons
                    name={device.type === 'HR' ? 'heart' : device.type === 'POWER' ? 'flash' : 'speedometer'}
                    size={16}
                    color={device.type === 'HR' ? '#FF2D55' : '#FF9500'}
                  />
                </View>
                <View style={rd.deviceInfo}>
                  <Text style={rd.deviceName}>{device.name}</Text>
                  <Text style={rd.deviceType}>
                    {device.type === 'HR' ? 'Fascia Cardio' : device.type === 'POWER' ? 'Sensore Potenza' : 'Cadenza'}
                  </Text>
                </View>
                <View style={rd.rssiWrap}>
                  <Ionicons name="cellular" size={12} color={device.rssi > -50 ? '#34C759' : '#FF9500'} />
                  <Text style={rd.rssiText}>{device.rssi} dBm</Text>
                </View>
                <Ionicons name="link" size={14} color="rgba(0,229,255,0.5)" />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      )}

      {/* Connected device info */}
      {state === 'connected' && connectedDevice && (
        <Animated.View entering={FadeIn.duration(400)} style={rd.connectedCard}>
          <View style={rd.connectedTop}>
            <Ionicons name="bluetooth" size={18} color="#34C759" />
            <Text style={rd.connectedName}>{connectedDevice.name}</Text>
          </View>
          <Text style={rd.connectedType}>
            {connectedDevice.type === 'HR' ? '❤️ Fascia Cardio · BPM in tempo reale' :
             connectedDevice.type === 'POWER' ? '⚡ Sensore Potenza · Watts live' : '📊 Cadenza RPM'}
          </Text>
          <TouchableOpacity
            style={rd.disconnectBtn}
            onPress={() => { setState('idle'); setConnectedDevice(null); setDevices([]); }}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle" size={14} color="#FF3B30" />
            <Text style={rd.disconnectText}>DISCONNETTI</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}


const rd = StyleSheet.create({
  container: { gap: 16, alignItems: 'center', padding: 16 },
  radarSection: { height: 180, justifyContent: 'center', alignItems: 'center' },
  radarWrap: { justifyContent: 'center', alignItems: 'center' },
  radarSvg: { position: 'absolute' },
  ring: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    borderWidth: 1.5, borderColor: '#00E5FF',
  },
  sweepWrap: { position: 'absolute', width: 180, height: 180, justifyContent: 'center' },
  sweepLine: {
    width: 90, height: 1.5, backgroundColor: '#00E5FF', opacity: 0.6,
    position: 'absolute', left: 90,
  },
  checkWrap: { width: 180, height: 180, justifyContent: 'center', alignItems: 'center' },
  statusText: {
    color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700',
    textAlign: 'center', letterSpacing: 0.5,
  },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,229,255,0.12)', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  scanBtnText: { color: '#00E5FF', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  deviceList: { width: '100%', gap: 8 },
  deviceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    padding: 14,
  },
  deviceIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,45,85,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  deviceInfo: { flex: 1, gap: 2 },
  deviceName: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  deviceType: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600' },
  rssiWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rssiText: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '700' },
  connectedCard: {
    width: '100%', gap: 10, backgroundColor: 'rgba(52,199,89,0.06)',
    borderWidth: 1, borderColor: 'rgba(52,199,89,0.2)', borderRadius: 14, padding: 16,
  },
  connectedTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  connectedName: {
    color: '#34C759', fontSize: 15,
    fontFamily: "'Plus Jakarta Sans', 'Montserrat', sans-serif",
    fontWeight: '800',
  },
  connectedType: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  disconnectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginTop: 4,
  },
  disconnectText: { color: '#FF3B30', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
