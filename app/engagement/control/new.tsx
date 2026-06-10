import React, { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAudit } from '../../../src/store/AuditContext';
import { Colors, FontSize, Radius, Spacing } from '../../../src/constants/theme';
import { ControlDomain, ControlStatus } from '../../../src/types';

const DOMAINS: ControlDomain[] = ['Access Management', 'Change Management', 'IT Operations', 'SDLC'];
const STATUSES: ControlStatus[] = ['Not Started', 'In Progress', 'Tested', 'Exception'];

export default function NewControlScreen() {
  const { engagementId } = useLocalSearchParams<{ engagementId: string }>();
  const { createControl, state } = useAudit();
  const router = useRouter();

  const engagement = state.engagements[engagementId!];

  // Auto-generate next control ID for this engagement
  const existingControls = (engagement?.controlIds ?? []).map(id => state.controls[id]).filter(Boolean);
  const nextNum = String(existingControls.length + 1).padStart(2, '0');

  const [domain, setDomain] = useState<ControlDomain>('Access Management');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ControlStatus>('Not Started');
  const [controlId, setControlId] = useState(`CTRL-${nextNum}`);
  const [testedBy, setTestedBy] = useState(engagement?.leadAuditor ?? '');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) { Alert.alert('Required', 'Please enter a control name.'); return; }
    if (!controlId.trim()) { Alert.alert('Required', 'Please enter a control ID.'); return; }
    setSaving(true);
    await createControl({
      engagementId: engagementId!,
      domain,
      name: name.trim(),
      description: description.trim(),
      status,
      testingNotes: '',
      testedBy: testedBy.trim(),
      testedDate: null,
    });
    setSaving(false);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Add Control' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Text style={styles.sectionTitle}>Control Details</Text>
        <View style={styles.card}>
          <Field label="Control ID *" value={controlId} onChange={setControlId} placeholder="e.g. ACC-01" />
          <Divider />
          <Field label="Control Name *" value={name} onChange={setName} placeholder="e.g. User Provisioning & Deprovisioning" />
          <Divider />
          <Field label="Description" value={description} onChange={setDescription} placeholder="What does this control cover?" multiline />
          <Divider />
          <Field label="Assigned To" value={testedBy} onChange={setTestedBy} placeholder="Auditor name" />
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

        <Text style={styles.sectionTitle}>Initial Status</Text>
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

        <TouchableOpacity style={[styles.createBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
          <Text style={styles.createBtnText}>{saving ? 'Adding...' : 'Add Control'}</Text>
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
        style={[styles.fieldInput, multiline && { minHeight: 70, textAlignVertical: 'top' }]}
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