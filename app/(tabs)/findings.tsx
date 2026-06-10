import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAudit } from '../../src/store/AuditContext';
import { Badge } from '../../src/components/Badge';
import { Colors, FontSize, Radius, Spacing } from '../../src/constants/theme';
import { FindingSeverity } from '../../src/types';

const SEVERITY_ORDER: FindingSeverity[] = ['High', 'Medium', 'Low', 'Informational'];

type Filter = 'All' | FindingSeverity | 'Open' | 'Closed';

export default function FindingsScreen() {
  const { loading, state } = useAudit();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('All');

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.blue} />;

  const allFindings = Object.values(state.findings);

  const filtered = allFindings
    .filter(f => {
      if (filter === 'All') return true;
      if (filter === 'Open') return f.status !== 'Closed';
      if (filter === 'Closed') return f.status === 'Closed';
      return f.severity === filter;
    })
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  const filters: Filter[] = ['All', 'Open', 'High', 'Medium', 'Low', 'Closed'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8 }}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, filter === f && styles.pillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.count}>{filtered.length} finding{filtered.length !== 1 ? 's' : ''}</Text>

      {filtered.map(finding => {
        const engagement = state.engagements[finding.engagementId];
        return (
          <TouchableOpacity
            key={finding.id}
            style={styles.card}
            onPress={() => router.push(`/engagement/finding/${finding.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Badge label={finding.severity} size="sm" />
              <Badge label={finding.status} size="sm" />
            </View>
            <Text style={styles.findingTitle}>{finding.title}</Text>
            <View style={styles.meta}>
              <Text style={styles.metaText}>{engagement?.clientName ?? '—'}</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.metaText}>{finding.domain}</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.metaText}>{finding.isaReference}</Text>
            </View>
            {finding.targetRemediationDate && (
              <Text style={styles.dueDate}>Due {finding.targetRemediationDate}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgTertiary },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  filterRow: { marginBottom: Spacing.md },
  pill: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgPrimary,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  pillText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
  pillTextActive: { color: Colors.bgPrimary },
  count: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: Spacing.sm, fontWeight: '500' },
  card: {
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.lg,
    borderWidth: 0.5, borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  cardHeader: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  findingTitle: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textPrimary, marginBottom: 6, lineHeight: 20 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  dot: { fontSize: FontSize.xs, color: Colors.textHint },
  dueDate: { fontSize: FontSize.xs, color: Colors.amberDark, marginTop: 4, fontWeight: '500' },
});
