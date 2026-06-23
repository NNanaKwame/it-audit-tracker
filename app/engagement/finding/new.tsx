import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAudit } from '../../../src/store/AuditContext';
import { DateTimePickerField } from '../../../src/components/DateTimePickerField';
import { Colors, FontSize, Radius, Spacing } from '../../../src/constants/theme';
import { ControlDomain, FindingSeverity } from '../../../src/types';

const DOMAINS: ControlDomain[] = ['Access Management', 'Change Management', 'IT Operations', 'SDLC'];
const SEVERITIES: FindingSeverity[] = ['High', 'Medium', 'Low', 'Informational'];

export default function NewFindingScreen() {
  const { engagementId } = useLocalSearchParams<{ engagementId: string }>();
  const { createFinding, state } = useAudit();
  const router = useRouter();

  const engagement = state.engagements[engagementId!];
  const controls = (engagement?.controlIds ?? []).map(id => state.controls[id]).filter(Boolean);

  // Auto-generate ISA reference
  const existingFindings = (engagement?.findingIds ?? []).length;
  const clientCode = (engagement?.clientName ?? 'ENG').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
  const nextRef = `ISA-${clientCode}-${String(existingFindings + 1).padStart(3, '0')}`;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<FindingSeverity>('Medium');
  const [domain, setDomain] = useState<ControlDomain>('Access Management');
  const [owner, setOwner] = useState('');
  const [managementResponse, setManagementResponse] = useState('');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [isaReference, setIsaReference] = useState(nextRef);
  const [controlId, setControlId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a finding title.'); return; }
    setSaving(true);
    await createFinding({
      engagementId: engagementId!,
      controlId,
      title: title.trim(),
      description: description.trim(),
      severity,
      domain,
      owner: owner.trim(),
      managementResponse: managementResponse.trim(),
      targetRemediationDate: targetDate ? targetDate.toISOString().split('T')[0] : null,
      status: 'Open',
      isaReference: isaReference.trim(),
    });
    setSaving(false);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Add Finding' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Text style={styles.sectionTitle}>Finding Details</Text>
        <View style={styles.card}>
          <Field label="ISA Reference" value={isaReference} onChange={setIsaReference} placeholder="e.g. ISA-ZEN-001" />
          <Divider />
          <Field label="Title *" value={title} onChange={setTitle} placeholder="Brief description of the finding" />
          <Divider />
          <Field label="Description" value={description} onChange={setDescription} placeholder="Detailed explanation, root cause, impact..." multiline />
          <Divider />
          <Field label="Control Owner" value={owner} onChange={setOwner} placeholder="Name of responsible party" />
          <Divider />
          <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.sm }}>
            <DateTimePickerField
              label="Target Remediation Date"
              value={targetDate}
              onChange={setTargetDate}
              mode="date"
              placeholder="Select target date"
              minimumDate={new Date()}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Severity</Text>
        <View style={styles.optionGrid}>
          {SEVERITIES.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.optionBtn, severity === s && styles.optionBtnActive]}
              onPress={() => setSeverity(s)}
            >
              <Text style={[styles.optionText, severity === s && styles.optionTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Domain</Text>
        <View style={styles.optionGrid}>
          {DOMAINS.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.optionBtn, domain === d && styles.optionBtnActive]}
              onPress={() => setDomain(d)}
            >
              <Text style={[styles.optionText, domain === d && styles.optionTextActive]}>{d}</Text>
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

        <Text style={styles.sectionTitle}>Management Response</Text>
        <TextInput
          style={styles.textArea}
          multiline
          value={managementResponse}
          onChangeText={setManagementResponse}
          placeholder="Management's acknowledgement and remediation plan..."
          placeholderTextColor={Colors.textHint}
        />

        <TouchableOpacity style={[styles.createBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
          <Text style={styles.createBtnText}>{saving ? 'Adding...' : 'Add Finding'}</Text>
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
  textArea: {
    backgroundColor: Colors.bgPrimary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border,
    padding: Spacing.lg, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 100, textAlignVertical: 'top',
  },
  createBtn: { backgroundColor: Colors.blue, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.xl },
  createBtnText: { color: Colors.bgPrimary, fontWeight: '600', fontSize: FontSize.md },
  cancelBtn: { padding: Spacing.lg, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontSize: FontSize.md },
});