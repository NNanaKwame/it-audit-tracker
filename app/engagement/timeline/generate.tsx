import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudit } from '../../../src/store/AuditContext';
import { Colors, FontSize, Radius, Spacing } from '../../../src/constants/theme';

const PHASE_INFO = [
  { phase: 'Planning', offset: 7, icon: 'clipboard-text-outline', color: Colors.blue },
  { phase: 'Fieldwork', offset: 30, icon: 'magnify-scan', color: Colors.teal },
  { phase: 'Reporting', offset: 45, icon: 'file-document-edit-outline', color: Colors.amberDark },
  { phase: 'Sign-off', offset: 60, icon: 'check-decagram-outline', color: Colors.purpleDark },
];

export default function GenerateMilestonesScreen() {
  const { engagementId } = useLocalSearchParams<{ engagementId: string }>();
  const { state, createDefaultMilestones } = useAudit();
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  const engagement = state.engagements[engagementId!];
  const startDate = engagement ? new Date(engagement.startDate) : new Date();

  function computeDate(offsetDays: number) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + offsetDays);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  async function handleGenerate() {
    setGenerating(true);
    await createDefaultMilestones(engagementId!);
    setGenerating(false);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Standard Audit Phases' }} />
      <View style={styles.container}>
        <Text style={styles.intro}>
          This will create 4 standard milestones based on the engagement start date
          ({startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}).
          You can edit dates and times afterward.
        </Text>

        <View style={styles.list}>
          {PHASE_INFO.map((p, i) => (
            <View key={p.phase} style={styles.phaseRow}>
              <View style={[styles.phaseIcon, { backgroundColor: p.color + '20' }]}>
                <MaterialCommunityIcons name={p.icon as any} size={20} color={p.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.phaseName}>{p.phase}</Text>
                <Text style={styles.phaseDate}>Due {computeDate(p.offset)} at 5:00 PM</Text>
              </View>
            </View>
          ))}
        </View>

        {generating ? (
          <ActivityIndicator color={Colors.blue} style={{ marginTop: Spacing.xl }} />
        ) : (
          <>
            <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate}>
              <MaterialCommunityIcons name="auto-fix" size={18} color={Colors.bgPrimary} />
              <Text style={styles.generateBtnText}>Generate These Milestones</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgTertiary, padding: Spacing.lg },
  intro: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.lg },
  list: {
    backgroundColor: Colors.bgPrimary, borderRadius: Radius.lg,
    borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden',
  },
  phaseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border,
  },
  phaseIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  phaseName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  phaseDate: { fontSize: FontSize.xs, color: Colors.textSecondary },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.blue, borderRadius: Radius.lg,
    padding: Spacing.lg, marginTop: Spacing.xl,
  },
  generateBtnText: { color: Colors.bgPrimary, fontWeight: '600', fontSize: FontSize.md },
  cancelBtn: { padding: Spacing.lg, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontSize: FontSize.md },
});