/**
 * ARENAKORE — UNIVERSAL QR SCANNER MODAL
 * Opens device camera, scans Kore ID QR codes, resolves user lookup.
 * Uses expo-camera CameraView with barcode scanning.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator,
  Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useAuth } from '../contexts/AuthContext';

const { width: SW } = Dimensions.get('window');
const SCAN_SIZE = SW * 0.65;

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onUserFound: (userData: any) => void;
  onChallengeFound?: (challengeData: any) => void;
}

export function QRScannerModal({ visible, onClose, onUserFound, onChallengeFound }: QRScannerModalProps) {
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<any>(null);
  const processedRef = useRef(false);

  const handleBarCodeScanned = useCallback(async (result: BarcodeScanningResult) => {
    if (processedRef.current || lookupLoading) return;
    processedRef.current = true;
    setScanning(false);

    const raw = result.data || '';

    // ─── CHALLENGE QR FORMAT: arenakore://challenge/{challengeId} ───
    if (raw.includes('arenakore://challenge/')) {
      const challengeId = raw.split('arenakore://challenge/')[1];
      if (!challengeId || challengeId.length < 10) {
        setError('QR SFIDA NON VALIDO');
        setTimeout(() => { processedRef.current = false; setError(null); setScanning(true); }, 2000);
        return;
      }
      setLookupLoading(true);
      try {
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
        const res = await fetch(`${backendUrl}/api/ugc/${challengeId}/public`);
        if (res.ok) {
          const data = await res.json();
          onChallengeFound?.(data);
          handleClose();
        } else {
          setError('SFIDA NON TROVATA');
          setTimeout(() => { processedRef.current = false; setError(null); setScanning(true); }, 2000);
        }
      } catch {
        setError('ERRORE DI RETE');
        setTimeout(() => { processedRef.current = false; setError(null); setScanning(true); }, 2000);
      } finally {
        setLookupLoading(false);
      }
      return;
    }

    // ─── KORE ID QR FORMAT: arenakore://kore/{userId} ───
    let userId = raw;
    if (raw.includes('arenakore://kore/')) {
      userId = raw.split('arenakore://kore/')[1];
    } else if (raw.includes('arenakore://athlete/')) {
      userId = raw.split('arenakore://athlete/')[1];
    }

    if (!userId || userId.length < 10) {
      setError('QR CODE NON VALIDO');
      setTimeout(() => { processedRef.current = false; setError(null); setScanning(true); }, 2000);
      return;
    }

    setLookupLoading(true);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/user/lookup/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFoundUser(data);
      } else {
        setError('KORE NON TROVATO');
        setTimeout(() => { processedRef.current = false; setError(null); setScanning(true); }, 2000);
      }
    } catch (_) {
      setError('ERRORE DI RETE');
      setTimeout(() => { processedRef.current = false; setError(null); setScanning(true); }, 2000);
    } finally {
      setLookupLoading(false);
    }
  }, [token, lookupLoading, onChallengeFound]);

  const handleConfirm = () => {
    if (foundUser) {
      onUserFound(foundUser);
    }
    handleClose();
  };

  const handleClose = () => {
    setScanning(false);
    setError(null);
    setFoundUser(null);
    processedRef.current = false;
    onClose();
  };

  const handleOpen = () => {
    setScanning(true);
    setError(null);
    setFoundUser(null);
    processedRef.current = false;
  };

  if (!visible) return null;

  // Permission not granted yet
  if (!permission?.granted) {
    return (
      <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose}>
        <View style={qs$.overlay}>
          <Animated.View entering={FadeInDown.duration(300)} style={qs$.permCard}>
            <Ionicons name="camera" size={48} color="#00E5FF" />
            <Text style={qs$.permTitle}>CAMERA RICHIESTA</Text>
            <Text style={qs$.permDesc}>
              Per scansionare il KORE ID di un altro atleta, è necessario l'accesso alla fotocamera.
            </Text>
            <TouchableOpacity style={qs$.permBtn} onPress={requestPermission} activeOpacity={0.85}>
              <Text style={qs$.permBtnText}>AUTORIZZA CAMERA</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={qs$.closeLink}>
              <Text style={qs$.closeLinkText}>ANNULLA</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose}>
      <View style={qs$.overlay}>
        {/* Header */}
        <View style={qs$.header}>
          <TouchableOpacity onPress={handleClose} style={qs$.backBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={qs$.headerTitle}>SCANNER UNIVERSALE</Text>
        </View>

        {/* Camera or Found User */}
        {foundUser ? (
          <Animated.View entering={FadeIn.duration(300)} style={qs$.resultWrap}>
            <View style={qs$.resultCard}>
              <View style={[qs$.resultAvatar, { backgroundColor: foundUser.avatar_color || '#00E5FF' }]}>
                <Text style={qs$.resultAvatarLetter}>{(foundUser.username || '?')[0].toUpperCase()}</Text>
              </View>
              <Text style={qs$.resultName}>{(foundUser.username || 'KORE').toUpperCase()}</Text>
              {foundUser.is_founder && (
                <View style={qs$.founderBadge}>
                  <Ionicons name="star" size={10} color="#FFD700" />
                  <Text style={qs$.founderText}>FOUNDER</Text>
                </View>
              )}
              <View style={qs$.resultStats}>
                <View style={qs$.resultStat}>
                  <Text style={qs$.resultStatVal}>{foundUser.flux || 0}</Text>
                  <Text style={qs$.resultStatLabel}>FLUX</Text>
                </View>
                <View style={qs$.resultStatDiv} />
                <View style={qs$.resultStat}>
                  <Text style={qs$.resultStatVal}>LVL {foundUser.level || 1}</Text>
                  <Text style={qs$.resultStatLabel}>LIVELLO</Text>
                </View>
                <View style={qs$.resultStatDiv} />
                <View style={qs$.resultStat}>
                  <Text style={[qs$.resultStatVal, { color: foundUser.is_nexus_certified ? '#00FF87' : '#FF9500' }]}>
                    {foundUser.is_nexus_certified ? 'SI' : 'NO'}
                  </Text>
                  <Text style={qs$.resultStatLabel}>NEXUS</Text>
                </View>
              </View>

              <TouchableOpacity style={qs$.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
                <Ionicons name="checkmark" size={18} color="#000" />
                <Text style={qs$.confirmBtnText}>SELEZIONA KORE</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setFoundUser(null); processedRef.current = false; setScanning(true); }} style={qs$.rescanLink}>
                <Text style={qs$.rescanText}>SCANSIONA DI NUOVO</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          <View style={qs$.cameraWrap}>
            {Platform.OS === 'web' ? (
              <View style={qs$.webFallback}>
                <Ionicons name="qr-code" size={48} color="rgba(255,255,255,0.15)" />
                <Text style={qs$.webFallbackText}>SCANSIONE QR NON DISPONIBILE SU WEB</Text>
                <Text style={qs$.webFallbackSub}>Usa l'app mobile per scansionare i KORE ID.</Text>
              </View>
            ) : (
              <>
                <CameraView
                  style={qs$.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
                  onCameraReady={handleOpen}
                />
                {/* Scan overlay */}
                <View style={qs$.scanOverlay}>
                  <View style={qs$.scanFrame}>
                    {/* Corner decorations */}
                    <View style={[qs$.corner, qs$.cornerTL]} />
                    <View style={[qs$.corner, qs$.cornerTR]} />
                    <View style={[qs$.corner, qs$.cornerBL]} />
                    <View style={[qs$.corner, qs$.cornerBR]} />
                  </View>
                  {lookupLoading && (
                    <View style={qs$.loadingOverlay}>
                      <ActivityIndicator color="#00E5FF" size="large" />
                      <Text style={qs$.loadingText}>RICERCA KORE...</Text>
                    </View>
                  )}
                  {error && (
                    <Animated.View entering={FadeIn} exiting={FadeOut} style={qs$.errorBadge}>
                      <Ionicons name="close-circle" size={16} color="#FF3B30" />
                      <Text style={qs$.errorText}>{error}</Text>
                    </Animated.View>
                  )}
                </View>
              </>
            )}
          </View>
        )}

        <Text style={qs$.hint}>Inquadra un QR KORE ID o una Sfida da importare</Text>
      </View>
    </Modal>
  );
}

const qs$ = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  cameraWrap: { flex: 1, overflow: 'hidden' },
  camera: { flex: 1 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: SCAN_SIZE, height: SCAN_SIZE, position: 'relative' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#00E5FF' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  loadingOverlay: { position: 'absolute', alignItems: 'center', gap: 8 },
  loadingText: { color: '#00E5FF', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  errorBadge: { position: 'absolute', bottom: -40, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,59,48,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  errorText: { color: '#FF3B30', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  hint: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '600', textAlign: 'center', paddingVertical: 16, letterSpacing: 1 },
  // Permission card
  permCard: { backgroundColor: '#0A0A0A', borderRadius: 20, padding: 32, alignItems: 'center', gap: 12, marginHorizontal: 24, borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)' },
  permTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  permDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '400', textAlign: 'center', lineHeight: 18 },
  permBtn: { backgroundColor: '#00E5FF', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 },
  permBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  closeLink: { marginTop: 4 },
  closeLinkText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  // Result card
  resultWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  resultCard: { backgroundColor: '#0A0A0A', borderRadius: 20, padding: 28, alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: 'rgba(0,229,255,0.15)' },
  resultAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  resultAvatarLetter: { color: '#000', fontSize: 26, fontWeight: '900' },
  resultName: { color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  founderBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)' },
  founderText: { color: '#FFD700', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  resultStats: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 8 },
  resultStat: { alignItems: 'center', gap: 2 },
  resultStatVal: { color: '#00E5FF', fontSize: 18, fontWeight: '900' },
  resultStatLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  resultStatDiv: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.08)' },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#00E5FF', borderRadius: 12, paddingVertical: 14, width: '100%', marginTop: 8 },
  confirmBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  rescanLink: { marginTop: 4 },
  rescanText: { color: 'rgba(0,229,255,0.5)', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  // Web fallback
  webFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  webFallbackText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  webFallbackSub: { color: 'rgba(255,255,255,0.15)', fontSize: 12, fontWeight: '400', textAlign: 'center' },
});
