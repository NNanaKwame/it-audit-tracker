import React, { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert, Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAudit } from '../../../src/store/AuditContext';
import { DateTimePickerField } from '../../../src/components/DateTimePickerField';
import { Colors, FontSize, Radius, Spacing } from '../../../src/constants/theme';
import { MilestonePhase } from '../../../src/types';

const PHASES: MilestonePhase[] = ['Planning', 'Fieldwork', 'Reporting', 'Sign-off', 'Custom'];

export default function NewMilestoneScreen() {
  const { engagementId } = useLocalSearchParams<{ engagementId: string }>();
  const { createMilestone } = useAudit();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState<MilestonePhase>('Custom');
  const [dueDateTime, setDueDateTime] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a milestone title.'); return; }
    if (!dueDateTime) { Alert.alert('Required', 'Please select a due date and time.'); return; }

    setSaving(true);
    await createMilestone({
      engagementId: engagementId!,
      title: title.trim(),
      phase,
      dueDateTime: dueDateTime.toISOString(),
      notes: notes.trim(),
      notifyEnabled,
    });
    setSaving(false);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Add Milestone' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Text style={styles.sectionTitle}>Milestone Details</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              style={styles.fieldInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Submit draft report to partner"
              placeholderTextColor={Colors.textHint}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Phase</Text>
        <View style={styles.optionGrid}>
          {PHASES.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.optionBtn, phase === p && styles.optionBtnActive]}
              onPress={() => setPhase(p)}
            >
              <Text style={[styles.optionText, phase === p && styles.optionTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Due Date & Time</Text>
        <View style={styles.card}>
          <View style={{ padding: Spacing.lg }}>
            <DateTimePickerField
              label="Due"
              value={dueDateTime}
              onChange={setDueDateTime}
              mode="datetime"
              placeholder="Select date and time"
              minimumDate={new Date()}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Reminder</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Enable Notification</Text>
              <Text style={styles.switchDesc}>Get reminded 1 day before and at the exact due time.</Text>
            </View>
            <Switch
              value={notifyEnabled}
              onValueChange={setNotifyEnabled}
              trackColor={{ false: Colors.border, true: Colors.blueLight }}
              thumbColor={notifyEnabled ? Colors.blue : Colors.bgTertiary}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional context..."
          placeholderTextColor={Colors.textHint}
        />

        <TouchableOpacity
          style={[styles.createBtn, saving && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={saving}
        >
          <Text style={styles.createBtnText}>{saving ? 'Adding...' : 'Add Milestone'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgTertiary },
  content: { padding: Spacing.lg, paddingBottom: 50 },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginTop: Spacing.lg,
  },
  card: { backgroundColor: Colors.bgPrimary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden' },
  field: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4, fontWeight: '500' },
  fieldInput: { fontSize: FontSize.md, color: Colors.textPrimary },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgPrimary,
  },
  optionBtnActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  optionText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  optionTextActive: { color: Colors.bgPrimary },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.lg },
  switchLabel: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textPrimary, marginBottom: 2 },
  switchDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  textArea: {
    backgroundColor: Colors.bgPrimary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border,
    padding: Spacing.lg, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 90, textAlignVertical: 'top',
  },
  createBtn: { backgroundColor: Colors.blue, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.xl },
  createBtnText: { color: Colors.bgPrimary, fontWeight: '600', fontSize: FontSize.md },
  cancelBtn: { padding: Spacing.lg, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontSize: FontSize.md },
});