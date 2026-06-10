import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudit } from '../../../src/store/AuditContext';
import { Badge } from '../../../src/components/Badge';
import { Colors, FontSize, Radius, Spacing, DOMAIN_COLORS } from '../../../src/constants/theme';
import { ControlStatus } from '../../../src/types';

const STATUSES: ControlStatus[] = ['Not Started', 'In Progress', 'Tested', 'Exception'];

export default function ControlDetail() {
  const { controlId } = useLocalSearchParams<{ controlId: string }>();
  const { state, updateControl } = useAudit();
  const router = useRouter();

  const control = state.controls[controlId!];
  if (!control) return <Text style={{ padding: 20 }}>Control not found.</Text>;

  const engagement = state.engagements[control.engagementId];
  const dc = DOMAIN_COLORS[control.domain];
  const linkedEvidence = control.evidenceIds.map(id => state.evidence[id]).filter(Boolean);
  const linkedFindings = control.findingIds.map(id => state.findings[id]).filter(Boolean);

  const [notes, setNotes] = useState(control.testingNotes);
  const [saving, setSaving] = useState(false);

  async function handleStatusChange(status: ControlStatus) {
    await updateControl(controlId!, { status });
  }

  async function handleSaveNotes() {
    setSaving(true);
    await updateControl(controlId!, {
      testingNotes: notes,
      testedDate: notes ? new Date().toISOString().split('T')[0] : control.testedDate,
    });
    setSaving(false);
    Alert.alert('Saved', 'Testing notes updated.');
  }

  return (
    <>
      <Stack.Screen options={{ title: control.id }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.domainBadge, { backgroundColor: dc.bg }]}>
            <MaterialCommunityIcons name={dc.icon as any} size={16} color={dc.text} />
            <Text style={[styles.domainLabel, { color: dc.text }]}>{control.domain}</Text>
          </View>
          <Text style={styles.controlName}>{control.name}</Text>
          <Text style={styles.description}>{control.description}</Text>
          {engagement && <Text style={styles.engagement}>{engagement.clientName} · {engagement.fiscalYear}</Text>}
        </View>

        {/* Status selector */}
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusGrid}>
          {STATUSES.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.statusOption, state.controls[controlId!]?.status === s && styles.statusOptionActive]}
              onPress={() => handleStatusChange(s)}
            >
              <Badge label={s} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Testing notes */}
        <Text style={styles.sectionTitle}>Testing Notes</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={5}
          value={notes}
          onChangeText={setNotes}
          placeholder="Document your testing approach, sample selections, and conclusions..."
          placeholderTextColor={Colors.textHint}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNotes} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Notes'}</Text>
        </TouchableOpacity>

        {/* Info row */}
        {(control.testedBy || control.testedDate) && (
          <View style={styles.infoRow}>
            {control.testedBy ? <Text style={styles.infoText}>Tested by: {control.testedBy}</Text> : null}
            {control.testedDate ? <Text style={styles.infoText}>Date: {control.testedDate}</Text> : null}
          </View>
        )}

        {/* Linked evidence */}
        {linkedEvidence.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Linked Evidence ({linkedEvidence.length})</Text>
            {linkedEvidence.map(ev => (
              <View key={ev.id} style={styles.linkedItem}>
                <MaterialCommunityIcons name="folder-outline" size={16} color={Colors.blue} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkedName}>{ev.name}</Text>
                  <Text style={styles.linkedMeta}>{ev.status}</Text>
                </View>
                <Badge label={ev.status} size="sm" />
              </View>
            ))}
          </>
        )}

        {/* Linked findings */}
        {linkedFindings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Findings ({linkedFindings.length})</Text>
            {linkedFindings.map(f => (
              <TouchableOpacity
                key={f.id}
                style={styles.linkedItem}
                onPress={() => router.push(`/engagement/finding/${f.id}`)}
              >
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={Colors.redDark} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkedName} numberOfLines={2}>{f.title}</Text>
                  <Text style={styles.linkedMeta}>{f.isaReference}</Text>
                </View>
                <Badge label={f.severity} size="sm" />
              </TouchableOpacity>
            ))}
          </>
        )}

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
  domainBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full, marginBottom: 10,
  },
  domainLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  controlName: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.navy, marginBottom: 6 },
  description: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: 8 },
  engagement: { fontSize: FontSize.xs, color: Colors.textHint },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginTop: Spacing.lg,
  },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusOption: {
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: 2,
  },
  statusOptionActive: { borderColor: Colors.blue },
  textArea: {
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 110,
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
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: Colors.bgSecondary, borderRadius: Radius.md, padding: Spacing.sm, marginTop: Spacing.sm,
  },
  infoText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  linkedItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.md,
    borderWidth: 0.5, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: 6,
  },
  linkedName: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textPrimary },
  linkedMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
});
