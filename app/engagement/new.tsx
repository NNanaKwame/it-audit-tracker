import React, { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudit } from '../../src/store/AuditContext';
import { Colors, FontSize, Radius, Spacing } from '../../src/constants/theme';
import { EngagementStatus } from '../../src/types';

const STATUSES: EngagementStatus[] = ['Kickoff', 'In Progress', 'At Risk', 'On Track'];

const ENGAGEMENT_TYPES = [
  {
    key: false,
    label: 'Standard Audit',
    description: 'Regular IT General Controls audit',
    icon: 'shield-check-outline',
  },
  {
    key: true,
    label: 'ISA 315',
    description: 'Risk of Material Misstatement assessment',
    icon: 'file-document-outline',
  },
];

export default function NewEngagementScreen() {
  const router = useRouter();
  const { createEngagement } = useAudit();

  const [clientName, setClientName] = useState('');
  const [fiscalYear, setFiscalYear] = useState('FY2025');
  const [leadAuditor, setLeadAuditor] = useState('');
  const [teamInput, setTeamInput] = useState('');
  const [status, setStatus] = useState<EngagementStatus>('Kickoff');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isISA315, setIsISA315] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!clientName.trim()) {
      Alert.alert('Required', 'Please enter a client name.');
      return;
    }
    if (!leadAuditor.trim()) {
      Alert.alert('Required', 'Please enter a lead auditor name.');
      return;
    }
    setSaving(true);
    const team = teamInput.split(',').map(t => t.trim()).filter(Boolean);
    if (leadAuditor && !team.includes(leadAuditor)) team.unshift(leadAuditor);

    await createEngagement({
      clientName: clientName.trim(),
      fiscalYear: fiscalYear.trim(),
      startDate,
      endDate: null,
      status,
      isISA315,
      leadAuditor: leadAuditor.trim(),
      team,
      notes: notes.trim(),
    });
    setSaving(false);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: 'New Engagement' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >

        {/* Engagement Type */}
        <Text style={styles.sectionTitle}>Engagement Type</Text>
        <View style={styles.typeGrid}>
          {ENGAGEMENT_TYPES.map(type => {
            const selected = isISA315 === type.key;
            return (
              <TouchableOpacity
                key={String(type.key)}
                style={[styles.typeCard, selected && styles.typeCardActive]}
                onPress={() => setIsISA315(type.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
                  {selected && <View style={styles.radioInner} />}
                </View>
                <View style={[styles.typeIconWrap, selected && styles.typeIconWrapActive]}>
                  <MaterialCommunityIcons
                    name={type.icon as any}
                    size={22}
                    color={selected ? Colors.blue : Colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeLabel, selected && styles.typeLabelActive]}>
                    {type.label}
                  </Text>
                  <Text style={styles.typeDesc}>{type.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ISA 315 info callout */}
        {isISA315 && (
          <View style={styles.isa315Callout}>
            <MaterialCommunityIcons name="information-outline" size={16} color={Colors.purpleDark} />
            <Text style={styles.isa315CalloutText}>
              ISA 315 engagements focus on identifying and assessing risks of material misstatement
              through understanding the entity and its environment.
            </Text>
          </View>
        )}

        {/* Client Details */}
        <Text style={styles.sectionTitle}>Client Details</Text>
        <View style={styles.card}>
          <Field
            label="Client Name *"
            value={clientName}
            onChange={setClientName}
            placeholder="e.g. Acme Corporation"
          />
          <Divider />
          <Field
            label="Fiscal Year"
            value={fiscalYear}
            onChange={setFiscalYear}
            placeholder="e.g. FY2025"
          />
          <Divider />
          <Field
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {/* Audit Team */}
        <Text style={styles.sectionTitle}>Audit Team</Text>
        <View style={styles.card}>
          <Field
            label="Lead Auditor *"
            value={leadAuditor}
            onChange={setLeadAuditor}
            placeholder="Full name"
          />
          <Divider />
          <Field
            label="Team Members"
            value={teamInput}
            onChange={setTeamInput}
            placeholder="Comma-separated names"
          />
        </View>

        {/* Status */}
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusGrid}>
          {STATUSES.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.statusOption, status === s && styles.statusOptionActive]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.statusText, status === s && styles.statusTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
          placeholder="Initial scope, risk areas, client contacts..."
          placeholderTextColor={Colors.textHint}
        />

        <TouchableOpacity
          style={[styles.createBtn, saving && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.createBtnText}>
            {saving ? 'Creating...' : 'Create Engagement'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

      </ScrollView>
    </>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textHint}
      />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgTertiary },
  content: { padding: Spacing.lg, paddingBottom: 50 },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: Spacing.sm, marginTop: Spacing.lg,
  },
  // Engagement type selector
  typeGrid: { gap: Spacing.sm },
  typeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: Spacing.md,
  },
  typeCardActive: {
    borderColor: Colors.blue,
    backgroundColor: Colors.blueLight,
  },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: Colors.blue },
  radioInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.blue,
  },
  typeIconWrap: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: Colors.bgSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  typeIconWrapActive: { backgroundColor: Colors.bgPrimary },
  typeLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary, marginBottom: 2 },
  typeLabelActive: { color: Colors.navy },
  typeDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  // ISA 315 callout
  isa315Callout: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.purpleLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderLeftWidth: 3, borderLeftColor: Colors.purpleDark,
  },
  isa315CalloutText: { flex: 1, fontSize: FontSize.xs, color: Colors.purpleDark, lineHeight: 18 },
  // Form fields
  card: {
    backgroundColor: Colors.bgPrimary, borderRadius: Radius.lg,
    borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden',
  },
  field: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4, fontWeight: '500' },
  fieldInput: { fontSize: FontSize.md, color: Colors.textPrimary },
  divider: { height: 0.5, backgroundColor: Colors.border, marginLeft: Spacing.lg },
  // Status pills
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusOption: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radius.full, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.bgPrimary,
  },
  statusOptionActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  statusText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  statusTextActive: { color: Colors.bgPrimary },
  // Notes
  textArea: {
    backgroundColor: Colors.bgPrimary, borderRadius: Radius.lg,
    borderWidth: 0.5, borderColor: Colors.border,
    padding: Spacing.lg, fontSize: FontSize.sm,
    color: Colors.textPrimary, minHeight: 100, textAlignVertical: 'top',
  },
  // Buttons
  createBtn: {
    backgroundColor: Colors.blue, borderRadius: Radius.lg,
    padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.xl,
  },
  createBtnText: { color: Colors.bgPrimary, fontWeight: '600', fontSize: FontSize.md },
  cancelBtn: { padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.sm },
  cancelBtnText: { color: Colors.textSecondary, fontSize: FontSize.md },
});