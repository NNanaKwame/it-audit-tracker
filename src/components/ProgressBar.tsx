import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Radius } from '../constants/theme';

interface ProgressBarProps {
  pct: number;
  height?: number;
}

function getColor(pct: number) {
  if (pct >= 80) return Colors.teal;
  if (pct >= 50) return Colors.amber;
  return Colors.red;
}

export function ProgressBar({ pct, height = 5 }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: getColor(clamped), height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: Colors.bgTertiary,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: Radius.full,
  },
});
