import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS_COLORS } from '../constants/theme';
import { FontSize, Radius, Spacing } from '../constants/theme';

interface BadgeProps {
  label: string;
  size?: 'sm' | 'md';
}

export function Badge({ label, size = 'md' }: BadgeProps) {
  const colors = STATUS_COLORS[label] ?? { bg: '#E5E3DC', text: '#6B6B67' };
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, size === 'sm' && styles.sm]}>
      <Text style={[styles.text, { color: colors.text }, size === 'sm' && styles.smText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  sm: { paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  text: { fontSize: FontSize.xs, fontWeight: '600', letterSpacing: 0.2 },
  smText: { fontSize: 10 },
});
