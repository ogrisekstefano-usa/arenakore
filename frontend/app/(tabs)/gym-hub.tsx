/**
 * ARENAKORE — GYM HUB TAB
 * Mostrato solo quando role === 'GYM'
 */
import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { GymHub } from '../../components/GymHub';
import { Header } from '../../components/Header';
import { TAB_BACKGROUNDS } from '../../utils/images';
import { useAuth } from '../../contexts/AuthContext';

export default function GymHubTab() {
  const { token } = useAuth();
  return (
    <ImageBackground source={{ uri: TAB_BACKGROUNDS.crews }} style={s.root} imageStyle={{ opacity: 0.10 }}>
      <Header title="GYM HUB" />
      <GymHub token={token || ''} />
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
});
