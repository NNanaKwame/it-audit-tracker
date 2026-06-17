import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { useAudit } from '../../src/store/AuditContext';
import { ProgressBar } from '../../src/components/ProgressBar';
import { Badge } from '../../src/components/Badge';
import { Colors, FontSize, Radius, Spacing } from '../../src/constants/theme';
import { EngagementSummary } from '../../src/types';

export default function EngagementsScreen() {
  const { loading, getAllSummaries, deleteEngagement, updateEngagement } = useAudit();
  const { showActionSheetWithOptions } = useActionSheet();
  const router = useRouter();

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.blue} />;

  const summaries = getAllSummaries().sort(
    (a, b) => new Date(b.engagement.updatedAt).getTime() - new Date(a.engagement.updatedAt).getTime()
  );

  function openMenu(s: EngagementSummary) {
    const isComplete = s.engagement.status === 'Complete';
    const options = [
      'Open Engagement',
      isComplete ? 'Reopen Engagement' : 'Mark as Complete',
      'Delete Engagement',
      'Cancel',
    ];
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 3,
        destructiveButtonIndex: 2,
        title: s.engagement.clientName,
        message: s.engagement.fiscalYear + ' · ' + s.engagement.status,
        containerStyle: { borderRadius: 16 },
        titleTextStyle: { fontWeight: '600', fontSize: 15, color: Colors.textPrimary },
        messageTextStyle: { fontSize: 13, color: Colors.textSecondary },
      },
      (index) => {
        if (index === 0) router.push(`/engagement/${s.engagement.id}` as any);
        if (index === 1) updateEngagement(s.engagement.id, { status: isComplete ? 'In Progress' : 'Complete' });
        if (index === 2) confirmDelete(s.engagement.clientName, s.engagement.id);
      }
    );
  }

  function confirmDelete(name: string, id: string) {
    Alert.alert(
      `Delete "${name}"?`,
      'This will permanently delete all controls, evidence, and findings for this engagement.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteEngagement(id) },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {summaries.map(s => (
        <TouchableOpacity
          key={s.engagement.id}
          style={styles.card}
          onPress={() => router.push(`/engagement/${s.engagement.id}` as any)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={styles.clientInitials}>
              <Text style={styles.initialsText}>{s.engagement.clientName.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.clientName}>{s.engagement.clientName}</Text>
                {s.engagement.isISA315 && (
                  <View style={styles.isa315Badge}>
                    <Text style={styles.isa315Text}>ISA 315</Text>
                  </View>
                )}
              </View>
              <Text style={styles.meta}>{s.engagement.fiscalYear} · {s.engagement.leadAuditor}</Text>
            </View>
            <View style={styles.cardActions}>
              <Badge label={s.engagement.status} size="sm" />
              <TouchableOpacity
                style={styles.menuBtn}
                onPress={() => openMenu(s)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="dots-vertical" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="shield-check-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.statText}>{s.completionPct}% controls</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.statText}>{s.openFindings} findings</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="folder-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.statText}>{s.evidencePct}% evidence</Text>
            </View>
          </View>

          <ProgressBar pct={s.completionPct} height={5} />
        </TouchableOpacity>
      ))}

      {summaries.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="briefcase-outline" size={48} color={Colors.textHint} />
          <Text style={styles.emptyTitle}>No engagements yet</Text>
          <Text style={styles.emptyText}>Tap the button below to create your first audit engagement.</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/engagement/new' as any)}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="plus" size={20} color={Colors.bgPrimary} />
        <Text style={styles.addButtonText}>New Engagement</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgTertiary },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.md },
  clientInitials: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.blueLight, alignItems: 'center', justifyContent: 'center',
  },
  initialsText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.blue },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  clientName: { fontSize: FontSize.md, fontWeight: '500', color: Colors.textPrimary },
  isa315Badge: {
    backgroundColor: Colors.purpleLight,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: Radius.full,
  },
  isa315Text: { fontSize: 10, fontWeight: '700', color: Colors.purpleDark },
  meta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuBtn: { padding: 2 },
  statsRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.sm },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textSecondary },
  emptyText: { fontSize: FontSize.sm, color: Colors.textHint, textAlign: 'center', paddingHorizontal: 20 },
  addButton: {
    flexDirection: 'row', backgroundColor: Colors.blue, borderRadius: Radius.lg,
    padding: Spacing.lg, alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, marginTop: Spacing.md,
  },
  addButtonText: { color: Colors.bgPrimary, fontSize: FontSize.md, fontWeight: '600' },
});