import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAudit } from '../../../src/store/AuditContext';
import { DateTimePickerField } from '../../../src/components/DateTimePickerField';
import { Colors, FontSize, Radius, Spacing } from '../../../src/constants/theme';
import { EvidenceStatus } from '../../../src/types';

const STATUSES: EvidenceStatus[] = ['Outstanding', 'Requested', 'Received', 'Reviewed'];

export default function NewEvidenceScreen() {
  const { engagementId } = useLocalSearchParams<{ engagementId: string }>();
  const { createEvidence, state } = useAudit();
  const router = useRouter();

  const engagement = state.engagements[engagementId!];
  const controls = (engagement?.controlIds ?? []).map(id => state.controls[id]).filter(Boolean);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<EvidenceStatus>('Outstanding');
  const [controlId, setControlId] = useState<string | null>(null);
  const [requestedDate, setRequestedDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState('');
  const [uploadedBy, setUploadedBy] = useState(engagement?.leadAuditor ?? '');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) { Alert.alert('Required', 'Please enter an evidence name.'); return; }
    setSaving(true);
    await createEvidence({
      engagementId: engagementId!,
      controlId: controlId,
      name: name.trim(),
      description: description.trim(),
      status,
      requestedDate: requestedDate ? requestedDate.toISOString().split('T')[0] : null,
      receivedDate: null,
      fileUri: null,
      fileName: null,
      uploadedBy: uploadedBy.trim(),
      notes: notes.trim(),
    });
    setSaving(false);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Add Evidence' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Text style={styles.sectionTitle}>Evidence Details</Text>
        <View style={styles.card}>
          <Field label="Evidence Name *" value={name} onChange={setName} placeholder="e.g. User Access Listing Q1" />
          <Divider />
          <Field label="Description" value={description} onChange={setDescription} placeholder="What does this evidence support?" multiline />
          <Divider />
          <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.sm }}>
            <DateTimePickerField
              label="Requested Date"
              value={requestedDate}
              onChange={setRequestedDate}
              mode="date"
              placeholder="Select requested date"
            />
          </View>
          <Divider />
          <Field label="Requested By" value={uploadedBy} onChange={setUploadedBy} placeholder="Auditor name" />
          <Divider />
          <Field label="Notes" value={notes} onChange={setNotes} placeholder="Follow-up instructions, contact person..." multiline />
        </View>

        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.optionGrid}>
          {STATUSES.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.optionBtn, status === s && styles.optionBtnActive]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.optionText, status === s && styles.optionTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {controls.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Link to Control (optional)</Text>
            <View style={styles.optionGrid}>
              <TouchableOpacity
                style={[styles.optionBtn, controlId === null && styles.optionBtnActive]}
                onPress={() => setControlId(null)}
              >
                <Text style={[styles.optionText, controlId === null && styles.optionTextActive]}>None</Text>
              </TouchableOpacity>
              {controls.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.optionBtn, controlId === c.id && styles.optionBtnActive]}
                  onPress={() => setControlId(c.id)}
                >
                  <Text style={[styles.optionText, controlId === c.id && styles.optionTextActive]}>{c.id}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity style={[styles.createBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
          <Text style={styles.createBtnText}>{saving ? 'Adding...' : 'Add Evidence'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

      </ScrollView>
    </>
  );
}

function Field({ label, value, onChange, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && { minHeight: 60, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textHint}
        multiline={multiline}
      />
    </View>
  );
}

function Divider() { return <View style={styles.divider} />; }

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
  divider: { height: 0.5, backgroundColor: Colors.border, marginLeft: Spacing.lg },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgPrimary,
  },
  optionBtnActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  optionText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  optionTextActive: { color: Colors.bgPrimary },
  createBtn: { backgroundColor: Colors.blue, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.xl },
  createBtnText: { color: Colors.bgPrimary, fontWeight: '600', fontSize: FontSize.md },
  cancelBtn: { padding: Spacing.lg, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontSize: FontSize.md },
});