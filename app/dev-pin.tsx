import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '../src/constants/theme';

const DEV_PIN = '2424';
const PIN_LENGTH = 4;

export default function DevPinScreen() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  function handleDigit(d: string) {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      setTimeout(() => checkPin(next), 150);
    }
  }

  function checkPin(value: string) {
    if (value === DEV_PIN) {
      router.replace('/developer-options' as any);
    } else {
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setPin('');
      }, 400);
    }
  }

  function handleBackspace() {
    setPin(p => p.slice(0, -1));
  }

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <>
      <Stack.Screen options={{ title: 'Enter PIN', headerBackTitle: 'Cancel' }} />
      <View style={styles.container}>
        <MaterialCommunityIcons name="shield-lock-outline" size={36} color={Colors.purpleDark} style={{ marginBottom: Spacing.md }} />
        <Text style={styles.title}>Developer Access</Text>
        <Text style={styles.subtitle}>Enter the 4-digit PIN to continue</Text>

        <View style={[styles.dotsRow, shake && styles.shake]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < pin.length && styles.dotFilled,
                shake && styles.dotError,
              ]}
            />
          ))}
        </View>

        <View style={styles.keypad}>
          {digits.map((d, i) => {
            if (d === '') return <View key={i} style={styles.key} />;
            if (d === '⌫') {
              return (
                <TouchableOpacity key={i} style={styles.key} onPress={handleBackspace}>
                  <MaterialCommunityIcons name="backspace-outline" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity key={i} style={styles.key} onPress={() => handleDigit(d)}>
                <Text style={styles.keyText}>{d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgTertiary, alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl },
  title: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xxl },
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: Spacing.xxl },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: Colors.purpleDark, borderColor: Colors.purpleDark },
  dotError: { backgroundColor: Colors.redDark, borderColor: Colors.redDark },
  shake: { transform: [{ translateX: 0 }] },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 270, justifyContent: 'center' },
  key: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    margin: 5,
  },
  keyText: { fontSize: 26, fontWeight: '500', color: Colors.textPrimary },
});