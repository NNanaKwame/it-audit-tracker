import React, { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudit } from '../../src/store/AuditContext';
import { Badge } from '../../src/components/Badge';
import { ProgressBar } from '../../src/components/ProgressBar';
import { Colors, DOMAIN_COLORS, FontSize, Radius, Spacing } from '../../src/constants/theme';
import { ControlDomain, EvidenceStatus, Control, Evidence, Finding } from '../../src/types';
import { exportEngagementPDF } from '../../src/utils/exportPDF';

type Tab = 'controls' | 'evidence' | 'findings';
const DOMAIN_ORDER: ControlDomain[] = ['Access Management', 'Change Management', 'IT Operations', 'SDLC'];
const EVIDENCE_STATUSES: EvidenceStatus[] = ['Outstanding', 'Requested', 'Received', 'Reviewed'];

export default function EngagementDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading, getSummary, state, updateControl, updateEvidence, updateFinding, deleteControl, deleteEvidence, deleteFinding } = useAudit();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('controls');
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!summary) return;
    setExporting(true);
    try {
      await exportEngagementPDF(summary, state);
    } catch {
      Alert.alert('Export failed', 'Could not generate the report.');
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.blue} />;

  const summary = getSummary(id!);
  if (!summary) return <Text style={{ padding: 20 }}>Engagement not found.</Text>;

  const { engagement } = summary;
  const controls = engagement.controlIds.map(cid => state.controls[cid]).filter(Boolean);
  const evidence = engagement.evidenceIds.map(eid => state.evidence[eid]).filter(Boolean);
  const findings = engagement.findingIds.map(fid => state.findings[fid]).filter(Boolean);

  const byDomain = DOMAIN_ORDER.map(domain => ({
    domain,
    controls: controls.filter(c => c.domain === domain),
  })).filter(g => g.controls.length > 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueEvidence = evidence.filter(ev => {
    if (ev.status === 'Received' || ev.status === 'Reviewed') return false;
    if (!ev.requestedDate) return false;
    const requested = new Date(ev.requestedDate);
    return (today.getTime() - requested.getTime()) / (1000 * 60 * 60 * 24) > 7;
  });

  // ─── Context menus ────────────────────────────────────────────────────────────

  function openControlMenu(ctrl: Control) {
    Alert.alert(ctrl.name, ctrl.id + ' · ' + ctrl.domain, [
      {
        text: 'View / Edit',
        onPress: () => router.push('/engagement/control/' + ctrl.id as any),
      },
      {
        text: ctrl.status === 'Tested' ? 'Mark as In Progress' : 'Mark as Tested',
        onPress: () => updateControl(ctrl.id, {
          status: ctrl.status === 'Tested' ? 'In Progress' : 'Tested',
          testedDate: ctrl.status !== 'Tested' ? new Date().toISOString().split('T')[0] : ctrl.testedDate,
        }),
      },
      {
        text: 'Delete Control',
        style: 'destructive',
        onPress: () => Alert.alert(
          'Delete Control?',
          'This cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteControl(ctrl.id) },
          ]
        ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function openEvidenceMenu(ev: Evidence) {
    Alert.alert(ev.name, ev.status, [
      {
        text: ev.status === 'Received' ? 'Mark as Reviewed' : 'Mark as Received',
        onPress: () => updateEvidence(ev.id, {
          status: ev.status === 'Received' ? 'Reviewed' : 'Received',
          receivedDate: ev.status !== 'Received' ? new Date().toISOString().split('T')[0] : ev.receivedDate,
        }),
      },
      {
        text: 'Delete Evidence',
        style: 'destructive',
        onPress: () => Alert.alert(
          'Delete Evidence?',
          'This cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteEvidence(ev.id) },
          ]
        ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function openFindingMenu(f: Finding) {
    Alert.alert(f.isaReference, f.severity + ' · ' + f.status, [
      {
        text: 'View / Edit',
        onPress: () => router.push('/engagement/finding/' + f.id as any),
      },
      {
        text: f.status === 'Open' ? 'Mark as In Remediation' : f.status === 'In Remediation' ? 'Mark as Closed' : 'Reopen',
        onPress: () => updateFinding(f.id, {
          status: f.status === 'Open' ? 'In Remediation' : f.status === 'In Remediation' ? 'Closed' : 'Open',
        }),
      },
      {
        text: 'Delete Finding',
        style: 'destructive',
        onPress: () => Alert.alert(
          'Delete Finding?',
          'This cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteFinding(f.id) },
          ]
        ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: engagement.clientName,
          headerRight: () => (
            <TouchableOpacity onPress={handleExport} disabled={exporting} style={{ marginRight: 8 }}>
              <MaterialCommunityIcons
                name={exporting ? 'loading' : 'export-variant'}
                size={22}
                color={Colors.blue}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} stickyHeaderIndices={[1]}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.clientName}>{engagement.clientName}</Text>
              <Text style={styles.meta}>{engagement.fiscalYear} · Lead: {engagement.leadAuditor}</Text>
            </View>
            <Badge label={engagement.status} />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{summary.completionPct}%</Text>
              <Text style={styles.statLabel}>Controls</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: summary.openFindings > 0 ? Colors.redDark : Colors.tealDark }]}>
                {summary.openFindings}
              </Text>
              <Text style={styles.statLabel}>Open findings</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: overdueEvidence.length > 0 ? Colors.redDark : Colors.textPrimary }]}>
                {summary.evidencePct}%
              </Text>
              <Text style={styles.statLabel}>Evidence</Text>
            </View>
          </View>
          <ProgressBar pct={summary.completionPct} height={6} />

          {overdueEvidence.length > 0 && (
            <TouchableOpacity style={styles.overdueBanner} onPress={() => setActiveTab('evidence')}>
              <MaterialCommunityIcons name="alert-circle" size={16} color={Colors.redDark} />
              <Text style={styles.overdueText}>
                {overdueEvidence.length} evidence item{overdueEvidence.length > 1 ? 's are' : ' is'} overdue — tap to review
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {(['controls', 'evidence', 'findings'] as Tab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'findings' ? ' (' + findings.length + ')' : ''}
                {tab === 'evidence' ? ' (' + evidence.length + ')' : ''}
                {tab === 'controls' ? ' (' + controls.length + ')' : ''}
              </Text>
              {tab === 'evidence' && overdueEvidence.length > 0 && (
                <View style={styles.overdueTabDot} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>

          {/* Add buttons */}
          {activeTab === 'controls' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/engagement/control/new?engagementId=' + id as any)}>
              <MaterialCommunityIcons name="plus" size={16} color={Colors.blue} />
              <Text style={styles.addBtnText}>Add Control</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'evidence' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/engagement/evidence/new?engagementId=' + id as any)}>
              <MaterialCommunityIcons name="plus" size={16} color={Colors.blue} />
              <Text style={styles.addBtnText}>Add Evidence</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'findings' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/engagement/finding/new?engagementId=' + id as any)}>
              <MaterialCommunityIcons name="plus" size={16} color={Colors.blue} />
              <Text style={styles.addBtnText}>Add Finding</Text>
            </TouchableOpacity>
          )}

          {/* Controls tab */}
          {activeTab === 'controls' && (
            <>
              {summary.domainProgress.filter(d => d.total > 0).map(dp => {
                const dc = DOMAIN_COLORS[dp.domain];
                return (
                  <View key={dp.domain} style={styles.domainSummary}>
                    <View style={[styles.domainIcon, { backgroundColor: dc.bg }]}>
                      <MaterialCommunityIcons name={dc.icon as any} size={16} color={dc.text} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.domainName}>{dp.domain}</Text>
                      <ProgressBar pct={dp.pct} height={3} />
                    </View>
                    <Text style={[styles.domainPct, { color: dp.pct >= 80 ? Colors.tealDark : dp.pct >= 50 ? Colors.amberDark : Colors.redDark }]}>
                      {dp.tested}/{dp.total}
                    </Text>
                  </View>
                );
              })}

              {byDomain.map(group => (
                <View key={group.domain} style={styles.section}>
                  <Text style={styles.sectionTitle}>{group.domain}</Text>
                  {group.controls.map(ctrl => (
                    <TouchableOpacity
                      key={ctrl.id}
                      style={styles.row}
                      onPress={() => router.push('/engagement/control/' + ctrl.id as any)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.statusDot,
                        ctrl.status === 'Tested' && { backgroundColor: Colors.teal },
                        ctrl.status === 'Exception' && { backgroundColor: Colors.red },
                        ctrl.status === 'In Progress' && { backgroundColor: Colors.amber },
                        ctrl.status === 'Not Started' && { backgroundColor: Colors.border },
                      ]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{ctrl.name}</Text>
                        <Text style={styles.rowMeta}>{ctrl.id} · {ctrl.status}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.menuBtn}
                        onPress={() => openControlMenu(ctrl)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialCommunityIcons name="dots-vertical" size={18} color={Colors.textHint} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}

              {controls.length === 0 && (
                <Text style={styles.emptyText}>No controls yet. Tap "Add Control" to begin.</Text>
              )}
            </>
          )}

          {/* Evidence tab */}
          {activeTab === 'evidence' && (
            <View style={styles.section}>
              {EVIDENCE_STATUSES.map(status => {
                const evGroup = evidence.filter(e => e.status === status);
                if (evGroup.length === 0) return null;
                return (
                  <View key={status} style={{ marginBottom: Spacing.lg }}>
                    <Text style={styles.sectionTitle}>{status}</Text>
                    {evGroup.map(ev => {
                      const isOverdue = overdueEvidence.some(o => o.id === ev.id);
                      return (
                        <View key={ev.id} style={[styles.row, isOverdue && styles.rowOverdue]}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.rowTitle}>{ev.name}</Text>
                              {isOverdue && (
                                <MaterialCommunityIcons name="alert-circle" size={14} color={Colors.redDark} />
                              )}
                            </View>
                            <Text style={styles.rowMeta}>
                              {ev.receivedDate
                                ? 'Received ' + ev.receivedDate
                                : ev.requestedDate
                                ? 'Requested ' + ev.requestedDate
                                : 'Not yet requested'}
                            </Text>
                            {isOverdue && <Text style={styles.overdueLabel}>Overdue — chase client</Text>}
                            {ev.notes ? <Text style={styles.evidenceNotes}>{ev.notes}</Text> : null}
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Badge label={ev.status} size="sm" />
                            <TouchableOpacity
                              style={styles.menuBtn}
                              onPress={() => openEvidenceMenu(ev)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <MaterialCommunityIcons name="dots-vertical" size={18} color={Colors.textHint} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
              {evidence.length === 0 && (
                <Text style={styles.emptyText}>No evidence yet. Tap "Add Evidence" to begin.</Text>
              )}
            </View>
          )}

          {/* Findings tab */}
          {activeTab === 'findings' && (
            <View style={styles.section}>
              {findings.map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={styles.row}
                  onPress={() => router.push('/engagement/finding/' + f.id as any)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                      <Badge label={f.severity} size="sm" />
                      <Badge label={f.status} size="sm" />
                      <Text style={styles.isaRef}>{f.isaReference}</Text>
                    </View>
                    <Text style={styles.rowTitle}>{f.title}</Text>
                    <Text style={styles.rowMeta}>{f.domain} · Owner: {f.owner}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.menuBtn}
                    onPress={() => openFindingMenu(f)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="dots-vertical" size={18} color={Colors.textHint} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              {findings.length === 0 && (
                <Text style={styles.emptyText}>No findings for this engagement.</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgTertiary },
  header: { backgroundColor: Colors.bgPrimary, padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  clientName: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.navy },
  meta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', marginBottom: Spacing.md },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: FontSize.xl, fontWeight: '600', color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  overdueBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.redLight, borderRadius: Radius.md,
    padding: Spacing.sm, marginTop: Spacing.md,
  },
  overdueText: { fontSize: FontSize.xs, color: Colors.redDark, fontWeight: '500', flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.bgPrimary, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', position: 'relative' },
  tabActive: { borderBottomColor: Colors.blue },
  tabText: { fontSize: FontSize.xs, fontWeight: '500', color: Colors.textSecondary },
  tabTextActive: { color: Colors.blue },
  overdueTabDot: { position: 'absolute', top: 8, right: 12, width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.red },
  tabContent: { padding: Spacing.lg },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.blue, marginBottom: Spacing.md,
  },
  addBtnText: { fontSize: FontSize.sm, color: Colors.blue, fontWeight: '500' },
  domainSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.bgPrimary, borderRadius: Radius.md, padding: Spacing.sm,
    marginBottom: Spacing.sm, borderWidth: 0.5, borderColor: Colors.border,
  },
  domainIcon: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  domainName: { fontSize: FontSize.xs, fontWeight: '500', color: Colors.textPrimary, marginBottom: 4 },
  domainPct: { fontSize: FontSize.sm, fontWeight: '600', minWidth: 30, textAlign: 'right' },
  section: { marginTop: Spacing.md },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.bgPrimary, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: 6, borderWidth: 0.5, borderColor: Colors.border,
  },
  rowOverdue: { borderColor: Colors.red },
  rowTitle: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textPrimary },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  menuBtn: { padding: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  overdueLabel: { fontSize: FontSize.xs, color: Colors.redDark, fontWeight: '600', marginTop: 3 },
  evidenceNotes: { fontSize: FontSize.xs, color: Colors.amberDark, marginTop: 3 },
  isaRef: { fontSize: FontSize.xs, color: Colors.blue, fontWeight: '600', marginLeft: 'auto' },
  emptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
});