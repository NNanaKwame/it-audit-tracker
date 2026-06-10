import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudit } from '../../../src/store/AuditContext';
import { Badge } from '../../../src/components/Badge';
import { Colors, FontSize, Radius, Spacing } from '../../../src/constants/theme';

type FindingStatus = 'Open' | 'In Remediation' | 'Closed';
const STATUSES: FindingStatus[] = ['Open', 'In Remediation', 'Closed'];

export default function FindingDetail() {
  const { findingId } = useLocalSearchParams<{ findingId: string }>();
  const { state, updateFinding } = useAudit();

  const finding = state.findings[findingId!];
  if (!finding) return <Text style={{ padding: 20 }}>Finding not found.</Text>;

  const engagement = state.engagements[finding.engagementId];
  const [mgmtResponse, setMgmtResponse] = useState(finding.managementResponse);
  const [saving, setSaving] = useState(false);

  async function handleStatusChange(status: FindingStatus) {
    await updateFinding(findingId!, { status });
  }

  async function handleSave() {
    setSaving(true);
    await updateFinding(findingId!, { managementResponse: mgmtResponse });
    setSaving(false);
    Alert.alert('Saved', 'Management response updated.');
  }

  return (
    <>
      <Stack.Screen options={{ title: finding.isaReference }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.isaRef}>{finding.isaReference}</Text>
            <View style={styles.badges}>
              <Badge label={finding.severity} />
              <Badge label={finding.status} />
            </View>
          </View>
          <Text style={styles.title}>{finding.title}</Text>
          {engagement && (
            <Text style={styles.clientMeta}>{engagement.clientName} · {engagement.fiscalYear}</Text>
          )}
        </View>

        {/* Description */}
        <Text style={styles.sectionTitle}>Description</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>{finding.description}</Text>
        </View>

        {/* Meta */}
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Domain</Text>
            <Text style={styles.metaVal}>{finding.domain}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Owner</Text>
            <Text style={styles.metaVal}>{finding.owner || '—'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Target date</Text>
            <Text style={[styles.metaVal, { color: Colors.amberDark }]}>
              {finding.targetRemediationDate || '—'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Severity</Text>
            <Badge label={finding.severity} size="sm" />
          </View>
        </View>

        {/* Status */}
        <Text style={styles.sectionTitle}>Remediation Status</Text>
        <View style={styles.statusRow}>
          {STATUSES.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.statusBtn, finding.status === s && styles.statusBtnActive]}
              onPress={() => handleStatusChange(s)}
            >
              <Text style={[styles.statusBtnText, finding.status === s && styles.statusBtnTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Management response */}
        <Text style={styles.sectionTitle}>Management Response</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          value={mgmtResponse}
          onChangeText={setMgmtResponse}
          placeholder="Document management's response and remediation plan..."
          placeholderTextColor={Colors.textHint}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Response'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgTertiary },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  header: {
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  isaRef: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.blue, fontFamily: 'monospace' },
  badges: { flexDirection: 'row', gap: 6 },
  title: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.navy, lineHeight: 24, marginBottom: 6 },
  clientMeta: { fontSize: FontSize.xs, color: Colors.textHint },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginTop: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  bodyText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22 },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  metaItem: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  metaLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4 },
  metaVal: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textPrimary },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgPrimary,
    borderWidth: 0.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  statusBtnActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  statusBtnText: { fontSize: FontSize.xs, fontWeight: '500', color: Colors.textSecondary },
  statusBtnTextActive: { color: Colors.bgPrimary },
  textArea: {
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveBtnText: { color: Colors.bgPrimary, fontWeight: '600', fontSize: FontSize.sm },
});
