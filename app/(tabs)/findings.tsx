import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudit } from '../../src/store/AuditContext';
import { Badge } from '../../src/components/Badge';
import { Colors, FontSize, Radius, Spacing } from '../../src/constants/theme';
import { FindingSeverity } from '../../src/types';

type Filter = 'All' | FindingSeverity | 'Open' | 'Closed';
const FILTERS: Filter[] = ['All', 'Open', 'High', 'Medium', 'Low', 'Closed'];

export default function FindingsScreen() {
  const { loading, state } = useAudit();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('All');

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.blue} />;

  const engagements = Object.values(state.engagements);
  const totalOpen = Object.values(state.findings).filter(f => f.status !== 'Closed').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{Object.keys(state.findings).length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: totalOpen > 0 ? Colors.redDark : Colors.tealDark }]}>
            {totalOpen}
          </Text>
          <Text style={styles.summaryLabel}>Open</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: Colors.amberDark }]}>
            {Object.values(state.findings).filter(f => f.severity === 'High' && f.status !== 'Closed').length}
          </Text>
          <Text style={styles.summaryLabel}>High Risk</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: Colors.tealDark }]}>
            {Object.values(state.findings).filter(f => f.status === 'Closed').length}
          </Text>
          <Text style={styles.summaryLabel}>Closed</Text>
        </View>
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ gap: 8 }}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, filter === f && styles.pillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Findings grouped by engagement */}
      {engagements.map(eng => {
        const findings = eng.findingIds
          .map(id => state.findings[id])
          .filter(Boolean)
          .filter(f => {
            if (filter === 'All') return true;
            if (filter === 'Open') return f.status !== 'Closed';
            if (filter === 'Closed') return f.status === 'Closed';
            return f.severity === filter;
          });

        if (findings.length === 0) return null;

        return (
          <View key={eng.id} style={styles.section}>
            <View style={styles.clientHeader}>
              <View style={styles.clientHeaderLeft}>
                <Text style={styles.clientLabel}>{eng.clientName} — {eng.fiscalYear}</Text>
                {eng.isISA315 && (
                  <View style={styles.isa315Badge}>
                    <Text style={styles.isa315Text}>ISA 315</Text>
                  </View>
                )}
              </View>
              <Text style={styles.findingCount}>
                {findings.length} finding{findings.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {findings.map(f => (
              <TouchableOpacity
                key={f.id}
                style={styles.card}
                onPress={() => router.push(`/engagement/finding/${f.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.isaRef}>{f.isaReference}</Text>
                  <Badge label={f.severity} size="sm" />
                </View>
                <Text style={styles.findingTitle}>{f.title}</Text>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="domain" size={13} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>{f.domain}</Text>
                  <Text style={styles.dot}>·</Text>
                  <MaterialCommunityIcons name="account-outline" size={13} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>{f.owner || '—'}</Text>
                </View>
                <View style={styles.statusRow}>
                  <Badge label={f.status} size="sm" />
                  {f.targetRemediationDate && (
                    <Text style={styles.dueDate}>Due {f.targetRemediationDate}</Text>
                  )}
                </View>
                {f.managementResponse ? (
                  <View style={styles.responseBox}>
                    <Text style={styles.responseLabel}>Management response</Text>
                    <Text style={styles.responseText} numberOfLines={2}>
                      {f.managementResponse}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        );
      })}

      {Object.keys(state.findings).length === 0 && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="file-document-outline" size={48} color={Colors.textHint} />
          <Text style={styles.emptyTitle}>No findings yet</Text>
          <Text style={styles.emptyText}>
            Findings will appear here once added to an engagement.
          </Text>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgTertiary },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  summaryVal: { fontSize: FontSize.xl, fontWeight: '600', color: Colors.textPrimary },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  summaryDivider: { width: 0.5, backgroundColor: Colors.border, marginVertical: 4 },
  filterRow: { marginBottom: Spacing.lg },
  pill: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgPrimary,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  pillText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
  pillTextActive: { color: Colors.bgPrimary },
  section: { marginBottom: Spacing.xl },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  clientHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clientLabel: {
    fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  isa315Badge: {
    backgroundColor: Colors.purpleLight,
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: Radius.full,
  },
  isa315Text: { fontSize: 10, fontWeight: '700', color: Colors.purpleDark },
  findingCount: { fontSize: FontSize.xs, color: Colors.textHint },
  card: {
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.lg,
    borderWidth: 0.5, borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  isaRef: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.blue, fontFamily: 'monospace' },
  findingTitle: {
    fontSize: FontSize.sm, fontWeight: '500', color: Colors.textPrimary,
    marginBottom: 6, lineHeight: 20,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  metaText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  dot: { fontSize: FontSize.xs, color: Colors.textHint },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dueDate: { fontSize: FontSize.xs, color: Colors.amberDark, fontWeight: '500' },
  responseBox: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.border,
  },
  responseLabel: {
    fontSize: 10, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', marginBottom: 2,
  },
  responseText: { fontSize: FontSize.xs, color: Colors.textPrimary, lineHeight: 18 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textSecondary },
  emptyText: {
    fontSize: FontSize.sm, color: Colors.textHint,
    textAlign: 'center', paddingHorizontal: 20,
  },
});