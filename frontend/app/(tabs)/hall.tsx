import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { HallOfKore } from '../../components/GloryWall';

export default function HallTab() {
  return (
    <View style={styles.container} testID="hall-tab">
      <StatusBar barStyle="light-content" />
      <HallOfKore />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
});
