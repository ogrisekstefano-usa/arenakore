/**
 * VideoProofUploader — ARENAKORE
 * ═══════════════════════════════════
 * Premium video proof upload component for challenge validation.
 * - Record or pick video from gallery
 * - Upload with progress indicator
 * - Nike-Grade brutalist UI
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';

const CYAN = '#00E5FF';
const GOLD = '#FFD700';
const RED = '#FF3B30';
const GREEN = '#34C759';
const { width: SW } = Dimensions.get('window');

type VideoProofStatus = 'idle' | 'picking' | 'uploading' | 'success' | 'error';

interface Props {
  challengeId: string;
  token: string;
  onUploadComplete?: (videoUrl: string) => void;
  exerciseName?: string;
}

export function VideoProofUploader({ challengeId, token, onUploadComplete, exerciseName }: Props) {
  const [status, setStatus] = useState<VideoProofStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState('');
  const progressWidth = useSharedValue(0);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL
    || process.env.EXPO_PUBLIC_BACKEND_URL
    || '';

  // Pick video from camera or gallery
  const pickVideo = useCallback(async (useCamera: boolean) => {
    try {
      setStatus('picking');
      
      // Request permissions
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permesso negato', 'Serve accesso alla fotocamera per registrare video.');
          setStatus('idle');
          return;
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permesso negato', 'Serve accesso alla galleria per selezionare video.');
          setStatus('idle');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['videos'],
            videoMaxDuration: 120, // 2 min max
            videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
            allowsEditing: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            videoMaxDuration: 120,
            allowsEditing: true,
            quality: 0.7,
          });

      if (result.canceled || !result.assets?.[0]) {
        setStatus('idle');
        return;
      }

      const asset = result.assets[0];
      setVideoUri(asset.uri);
      
      // Auto-upload
      await uploadVideo(asset.uri, asset.fileName || `proof_${Date.now()}.mp4`);
    } catch (err: any) {
      console.error('[VideoProof] Pick error:', err);
      setStatus('error');
      setResultMsg(err?.message || 'Errore durante la selezione video');
    }
  }, [challengeId, token]);

  // Upload video to backend
  const uploadVideo = useCallback(async (uri: string, filename: string) => {
    try {
      setStatus('uploading');
      setProgress(0);
      progressWidth.value = withTiming(0, { duration: 100 });

      const formData = new FormData();
      formData.append('challenge_id', challengeId);
      formData.append('video', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        name: filename,
        type: 'video/mp4',
      } as any);

      // Simulate progress with XMLHttpRequest for real progress tracking
      const response = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setProgress(pct);
            progressWidth.value = withTiming(pct, { duration: 200 });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve({ success: true });
            }
          } else {
            try {
              const errData = JSON.parse(xhr.responseText);
              reject(new Error(errData.detail || `Errore ${xhr.status}`));
            } catch {
              reject(new Error(`Upload fallito (${xhr.status})`));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Errore di rete durante upload'));
        xhr.ontimeout = () => reject(new Error('Timeout upload'));

        xhr.open('POST', `${BACKEND_URL}/api/challenge/upload-video`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.timeout = 120000; // 2 min timeout
        xhr.send(formData);
      });

      setProgress(100);
      progressWidth.value = withTiming(100, { duration: 300 });
      setStatus('success');
      setResultMsg(response.message || 'Video caricato con successo!');
      
      if (onUploadComplete && response.video_url) {
        onUploadComplete(response.video_url);
      }
    } catch (err: any) {
      console.error('[VideoProof] Upload error:', err);
      setStatus('error');
      setResultMsg(err?.message || 'Upload fallito');
      progressWidth.value = withTiming(0, { duration: 200 });
    }
  }, [challengeId, token, BACKEND_URL]);

  // ═══ RENDER: SUCCESS STATE ═══
  if (status === 'success') {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={s.container}>
        <LinearGradient colors={['rgba(52,199,89,0.08)', 'rgba(0,0,0,0)']} style={s.successGrad}>
          <View style={s.successRow}>
            <View style={s.successIcon}>
              <Ionicons name="checkmark-circle" size={28} color={GREEN} />
            </View>
            <View style={s.successText}>
              <Text style={s.successTitle}>VIDEO PROOF CARICATO</Text>
              <Text style={s.successMsg}>{resultMsg}</Text>
            </View>
          </View>
          <View style={s.statusBadge}>
            <Ionicons name="hourglass" size={10} color={GOLD} />
            <Text style={s.statusText}>IN REVISIONE</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  // ═══ RENDER: UPLOADING STATE ═══
  if (status === 'uploading') {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={s.container}>
        <View style={s.uploadingBox}>
          <View style={s.uploadHeader}>
            <Ionicons name="cloud-upload" size={20} color={CYAN} />
            <Text style={s.uploadTitle}>UPLOAD IN CORSO...</Text>
          </View>
          <View style={s.progressBar}>
            <Animated.View style={[s.progressFill, progressStyle]} />
          </View>
          <Text style={s.progressText}>{progress}%</Text>
        </View>
      </Animated.View>
    );
  }

  // ═══ RENDER: ERROR STATE ═══
  if (status === 'error') {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={s.container}>
        <View style={s.errorBox}>
          <Ionicons name="alert-circle" size={24} color={RED} />
          <Text style={s.errorText}>{resultMsg}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => { setStatus('idle'); setResultMsg(''); }}>
            <Text style={s.retryText}>RIPROVA</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // ═══ RENDER: IDLE STATE (Main CTA) ═══
  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)} style={s.container}>
      <View style={s.headerRow}>
        <Ionicons name="videocam" size={16} color={GOLD} />
        <Text style={s.headerLabel}>VIDEO PROOF</Text>
      </View>
      
      {exerciseName && (
        <Text style={s.exerciseLabel}>{exerciseName}</Text>
      )}

      <Text style={s.desc}>
        Carica un video della tua performance per sbloccare il 100% dei K-Flux e validare il risultato nella classifica Ranked.
      </Text>

      <View style={s.btnRow}>
        {/* Record Video */}
        <TouchableOpacity
          style={s.recordBtn}
          activeOpacity={0.85}
          onPress={() => pickVideo(true)}
          disabled={status === 'picking'}
        >
          <LinearGradient colors={[CYAN, '#00B8D4']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.btnGrad}>
            <Ionicons name="videocam" size={20} color="#000" />
            <Text style={s.btnText}>REGISTRA</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Pick from Gallery */}
        <TouchableOpacity
          style={s.galleryBtn}
          activeOpacity={0.85}
          onPress={() => pickVideo(false)}
          disabled={status === 'picking'}
        >
          <View style={s.galleryInner}>
            <Ionicons name="images" size={20} color={CYAN} />
            <Text style={s.galleryText}>GALLERIA</Text>
          </View>
        </TouchableOpacity>
      </View>

      {status === 'picking' && (
        <View style={s.pickingRow}>
          <ActivityIndicator size="small" color={CYAN} />
          <Text style={s.pickingText}>Apertura...</Text>
        </View>
      )}

      <View style={s.infoRow}>
        <Ionicons name="information-circle-outline" size={12} color="rgba(255,255,255,0.2)" />
        <Text style={s.infoText}>Max 2 min · Max 50MB · MP4/MOV</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerLabel: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
  },
  exerciseLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginTop: 6,
  },
  desc: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  recordBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  btnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  btnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  galleryBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0,229,255,0.25)',
    backgroundColor: 'rgba(0,229,255,0.04)',
  },
  galleryInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  galleryText: {
    color: CYAN,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  pickingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingBottom: 4,
  },
  pickingText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  infoText: {
    color: 'rgba(255,255,255,0.15)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Uploading
  uploadingBox: {
    padding: 20,
    gap: 12,
  },
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadTitle: {
    color: CYAN,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: CYAN,
    borderRadius: 3,
  },
  progressText: {
    color: CYAN,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  // Success
  successGrad: {
    padding: 20,
    gap: 12,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successIcon: {},
  successText: {
    flex: 1,
    gap: 2,
  },
  successTitle: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  successMsg: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    color: GOLD,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  // Error
  errorBox: {
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.25)',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryText: {
    color: RED,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
