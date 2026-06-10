import React from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudit } from '../../src/store/AuditContext';
import { MetricCard } from '../../src/components/MetricCard';
import { ProgressBar } from '../../src/components/ProgressBar';
import { Badge } from '../../src/components/Badge';
import { Colors, FontSize, Radius, Spacing, DOMAIN_COLORS } from '../../src/constants/theme';
import { ControlDomain } from '../../src/types';

const DOMAINS: ControlDomain[] = ['Access Management', 'Change Management', 'IT Operations', 'SDLC'];

export default function DashboardScreen() {
  const { loading, getGlobalStats, getAllSummaries } = useAudit();
  const router = useRouter();

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} color={Colors.blue} />;
  }

  const stats = getGlobalStats();
  const summaries = getAllSummaries();

  // Aggregate domain progress across all engagements
  const domainTotals = DOMAINS.map(domain => {
    const allControls = summaries.flatMap(s => s.domainProgress).filter(d => d.domain === domain);
    const total = allControls.reduce((a, d) => a + d.total, 0);
    const tested = allControls.reduce((a, d) => a + d.tested, 0);
    const pct = total ? Math.round((tested / total) * 100) : 0;
    return { domain, total, tested, pct };
  });

  // Upcoming / at-risk engagements
  const atRisk = summaries.filter(s => s.engagement.status === 'At Risk' || s.engagement.status === 'In Progress');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>IT Audit Tracker</Text>
          <Text style={styles.subheading}>{stats.activeEngagements} active engagement{stats.activeEngagements !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>KA</Text>
        </View>
      </View>

      {/* Metric cards */}
      <View style={styles.metricsRow}>
        <MetricCard
          label="Controls tested"
          value={`${stats.controlsPct}%`}
          color={stats.controlsPct >= 80 ? Colors.tealDark : stats.controlsPct >= 50 ? Colors.amberDark : Colors.redDark}
        />
        <MetricCard label="Open findings" value={stats.openFindings} color={stats.openFindings > 0 ? Colors.redDark : Colors.tealDark} />
      </View>
      <View style={styles.metricsRow}>
        <MetricCard
          label="Evidence collected"
          value={`${stats.evidencePct}%`}
          color={stats.evidencePct >= 80 ? Colors.tealDark : Colors.amberDark}
        />
        <MetricCard label="Avg. completion" value={`${stats.avgCompletion}%`} color={Colors.blue} />
      </View>

      {/* Domain overview */}
      <Text style={styles.sectionTitle}>Control Domains</Text>
      <View style={styles.card}>
        {domainTotals.map((d, i) => {
          const dc = DOMAIN_COLORS[d.domain];
          return (
            <View key={d.domain} style={[styles.domainRow, i < domainTotals.length - 1 && styles.domainBorder]}>
              <View style={[styles.domainIcon, { backgroundColor: dc.bg }]}>
                <MaterialCommunityIcons name={dc.icon as any} size={18} color={dc.text} />
              </View>
              <View style={styles.domainInfo}>
                <Text style={styles.domainName}>{d.domain}</Text>
                <ProgressBar pct={d.pct} height={4} />
              </View>
              <View style={styles.domainRight}>
                <Text style={[styles.domainPct, { color: d.pct >= 80 ? Colors.tealDark : d.pct >= 50 ? Colors.amberDark : Colors.redDark }]}>
                  {d.pct}%
                </Text>
                <Text style={styles.domainCount}>{d.tested}/{d.total}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Engagements needing attention */}
      {atRisk.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Needs Attention</Text>
          {atRisk.map(s => (
            <TouchableOpacity
              key={s.engagement.id}
              style={styles.card}
              onPress={() => router.push(`/engagement/${s.engagement.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{s.engagement.clientName}</Text>
                <Badge label={s.engagement.status} size="sm" />
              </View>
              <Text style={styles.cardSub}>{s.engagement.fiscalYear} · {s.openFindings} open finding{s.openFindings !== 1 ? 's' : ''}</Text>
              <ProgressBar pct={s.completionPct} height={5} />
              <Text style={styles.pctLabel}>{s.completionPct}% complete</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgTertiary },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  greeting: { fontSize: FontSize.xl, fontWeight: '600', color: Colors.navy },
  subheading: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.blueLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.blue },
  metricsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  domainRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  domainBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  domainIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  domainInfo: { flex: 1, gap: 5 },
  domainName: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textPrimary },
  domainRight: { alignItems: 'flex-end', minWidth: 44 },
  domainPct: { fontSize: FontSize.sm, fontWeight: '600' },
  domainCount: { fontSize: FontSize.xs, color: Colors.textSecondary },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '500', color: Colors.textPrimary },
  cardSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: Spacing.sm },
  pctLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4, textAlign: 'right' },
});
