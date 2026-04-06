/**
 * ARENAKORE — PanopticonBridge
 * Mobile-to-Web bridge button for Coach/GYM_OWNER.
 * Generates a one-time web token and opens Coach Studio in browser.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const FONT_M = Platform.select({ ios: 'Montserrat_800ExtraBold', android: 'Montserrat_800ExtraBold', default: 'Montserrat' });

export function PanopticonBridge() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const openPanopticon = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await api.generateWebToken(token);
      const otp = result.token;
      const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://arena-scan-lab.preview.emergentagent.com';
      const url = `${baseUrl}/coach-studio?otp=${otp}`;

      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        await WebBrowser.openBrowserAsync(url, {
          toolbarColor: '#0A0A0A',
          controlsColor: '#00E5FF',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
      }
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Impossibile aprire il Command Center');
    } finally {
      setLoading(false);
    }
  }, [token]);

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(400)} style={s.wrap}>
      <TouchableOpacity onPress={openPanopticon} activeOpacity={0.85} disabled={loading}>
        <LinearGradient
          colors={['rgba(0,229,255,0.08)', 'rgba(0,229,255,0.02)']}
          style={s.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={s.iconWrap}>
            <Ionicons name="desktop-outline" size={22} color="#00E5FF" />
          </View>
          <View style={s.content}>
            <Text style={[s.title, { fontFamily: FONT_M }]}>COMMAND CENTER</Text>
            <Text style={s.sub}>Apri il Panopticon nel browser</Text>
          </View>
          {loading ? (
            <ActivityIndicator color="#00E5FF" size="small" />
          ) : (
            <View style={s.arrow}>
              <Ionicons name="open-outline" size={18} color="#00E5FF" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { marginHorizontal: 24, marginVertical: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.15)',
    gap: 14,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(0,229,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1 },
  title: {
    color: '#00E5FF', fontSize: 14, fontWeight: '900',
    letterSpacing: 1.5,
  },
  sub: {
    color: 'rgba(255,255,255,0.45)', fontSize: 12,
    fontWeight: '500', marginTop: 2,
  },
  arrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,229,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
});
