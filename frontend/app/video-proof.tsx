/**
 * VIDEO PROOF PAGE — ARENAKORE
 * Upload video proof for a specific challenge
 */
import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { VideoProofUploader } from '../components/VideoProofUploader';

export default function VideoProofPage() {
  const { challengeId, exercise } = useLocalSearchParams<{ challengeId: string; exercise: string }>();
  const { token } = useAuth();
  const router = useRouter();

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Ionicons name="videocam" size={16} color="#FFD700" />
          <Text style={s.headerTitle}>VIDEO PROOF</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <View style={s.content}>
        {challengeId && token ? (
          <VideoProofUploader
            challengeId={challengeId}
            token={token}
            exerciseName={exercise || 'SFIDA'}
            onUploadComplete={(url) => {
              console.log('[VideoProof] Upload complete:', url);
              // Go back after short delay to show success state
              setTimeout(() => router.back(), 2500);
            }}
          />
        ) : (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={32} color="#FF3B30" />
            <Text style={s.errorText}>Challenge non trovata</Text>
            <TouchableOpacity style={s.backBtnAlt} onPress={() => router.back()}>
              <Text style={s.backBtnText}>TORNA INDIETRO</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { color: '#FFD700', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  content: { flex: 1, padding: 20 },
  errorBox: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  errorText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600' },
  backBtnAlt: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  backBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
});
