import React, { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { useAudit } from '../../src/store/AuditContext';
import { Badge } from '../../src/components/Badge';
import { ProgressBar } from '../../src/components/ProgressBar';
import { Colors, DOMAIN_COLORS, FontSize, Radius, Spacing } from '../../src/constants/theme';
import { ControlDomain, EvidenceStatus, Control, Evidence, Finding, Milestone } from '../../src/types';
import { exportEngagementPDF } from '../../src/utils/exportPDF';
import { getMilestoneStatus } from '../../src/store/auditStore';

type Tab = 'controls' | 'evidence' | 'findings' | 'timeline';
const DOMAIN_ORDER: ControlDomain[] = ['Access Management', 'Change Management', 'IT Operations', 'SDLC'];
const EVIDENCE_STATUSES: EvidenceStatus[] = ['Outstanding', 'Requested', 'Received', 'Reviewed'];

const MILESTONE_STATUS_COLOR: Record<string, string> = {
  'Upcoming': Colors.blue,
  'Due Soon': Colors.amberDark,
  'Overdue': Colors.redDark,
  'Completed': Colors.tealDark,
};

export default function EngagementDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    loading, getSummary, state,
    updateControl, updateEvidence, updateFinding, updateMilestone,
    deleteControl, deleteEvidence, deleteFinding, deleteMilestone,
  } = useAudit();
  const { showActionSheetWithOptions } = useActionSheet();
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
  const milestones = engagement.milestoneIds
    .map(mid => state.milestones[mid])
    .filter(Boolean)
    .sort((a, b) => new Date(a.dueDateTime).getTime() - new Date(b.dueDateTime).getTime());

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

  const overdueMilestones = milestones.filter(m => !m.completed && getMilestoneStatus(m) === 'Overdue');

  // ─── Action sheets ────────────────────────────────────────────────────────────

  function openControlMenu(ctrl: Control) {
    const toggleLabel = ctrl.status === 'Tested' ? 'Mark as In Progress' : 'Mark as Tested';
    const options = ['View / Edit', toggleLabel, 'Delete Control', 'Cancel'];
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 3,
        destructiveButtonIndex: 2,
        title: ctrl.name,
        message: ctrl.id + ' · ' + ctrl.domain,
        containerStyle: { borderRadius: 16 },
        titleTextStyle: { fontWeight: '600', fontSize: 15, color: Colors.textPrimary },
        messageTextStyle: { fontSize: 13, color: Colors.textSecondary },
      },
      (index) => {
        if (index === 0) router.push(`/engagement/control/${ctrl.id}` as any);
        if (index === 1) updateControl(ctrl.id, {
          status: ctrl.status === 'Tested' ? 'In Progress' : 'Tested',
          testedDate: ctrl.status !== 'Tested' ? new Date().toISOString().split('T')[0] : ctrl.testedDate,
        });
        if (index === 2) Alert.alert('Delete Control?', 'This cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteControl(ctrl.id) },
        ]);
      }
    );
  }

  function openEvidenceMenu(ev: Evidence) {
    const toggleLabel = ev.status === 'Received' ? 'Mark as Reviewed' : 'Mark as Received';
    const options = [toggleLabel, 'Delete Evidence', 'Cancel'];
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 2,
        destructiveButtonIndex: 1,
        title: ev.name,
        message: ev.status,
        containerStyle: { borderRadius: 16 },
        titleTextStyle: { fontWeight: '600', fontSize: 15, color: Colors.textPrimary },
        messageTextStyle: { fontSize: 13, color: Colors.textSecondary },
      },
      (index) => {
        if (index === 0) updateEvidence(ev.id, {
          status: ev.status === 'Received' ? 'Reviewed' : 'Received',
          receivedDate: ev.status !== 'Received' ? new Date().toISOString().split('T')[0] : ev.receivedDate,
        });
        if (index === 1) Alert.alert('Delete Evidence?', 'This cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteEvidence(ev.id) },
        ]);
      }
    );
  }

  function openFindingMenu(f: Finding) {
    const nextStatus = f.status === 'Open' ? 'Mark as In Remediation' : f.status === 'In Remediation' ? 'Mark as Closed' : 'Reopen';
    const options = ['View / Edit', nextStatus, 'Delete Finding', 'Cancel'];
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 3,
        destructiveButtonIndex: 2,
        title: f.isaReference,
        message: f.severity + ' · ' + f.status,
        containerStyle: { borderRadius: 16 },
        titleTextStyle: { fontWeight: '600', fontSize: 15, color: Colors.textPrimary },
        messageTextStyle: { fontSize: 13, color: Colors.textSecondary },
      },
      (index) => {
        if (index === 0) router.push(`/engagement/finding/${f.id}` as any);
        if (index === 1) updateFinding(f.id, {
          status: f.status === 'Open' ? 'In Remediation' : f.status === 'In Remediation' ? 'Closed' : 'Open',
        });
        if (index === 2) Alert.alert('Delete Finding?', 'This cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteFinding(f.id) },
        ]);
      }
    );
  }

  function openMilestoneMenu(m: Milestone) {
    const options = [
      m.completed ? 'Mark as Incomplete' : 'Mark as Completed',
      'Edit Milestone',
      'Delete Milestone',
      'Cancel',
    ];
    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 3,
        destructiveButtonIndex: 2,
        title: m.title,
        message: m.phase,
        containerStyle: { borderRadius: 16 },
        titleTextStyle: { fontWeight: '600', fontSize: 15, color: Colors.textPrimary },
        messageTextStyle: { fontSize: 13, color: Colors.textSecondary },
      },
      (index) => {
        if (index === 0) updateMilestone(m.id, { completed: !m.completed });
        if (index === 1) router.push(`/engagement/timeline/${m.id}` as any);
        if (index === 2) Alert.alert('Delete Milestone?', 'This cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteMilestone(m.id) },
        ]);
      }
    );
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

        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.clientName}>{engagement.clientName}</Text>
              <Text style={styles.meta}>{engagement.fiscalYear} · Lead: {engagement.leadAuditor}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Badge label={engagement.status} />
              {engagement.statusIsAuto && (
                <Text style={styles.autoFlagText}>Auto-flagged</Text>
              )}
            </View>
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

          {overdueMilestones.length > 0 && (
            <TouchableOpacity style={styles.overdueBanner} onPress={() => setActiveTab('timeline')}>
              <MaterialCommunityIcons name="calendar-alert" size={16} color={Colors.redDark} />
              <Text style={styles.overdueText}>
                {overdueMilestones.length} milestone{overdueMilestones.length > 1 ? 's are' : ' is'} overdue — tap to review
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabBar}>
          {(['controls', 'evidence', 'findings', 'timeline'] as Tab[]).map(tab => (
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
                {tab === 'timeline' ? ' (' + milestones.length + ')' : ''}
              </Text>
              {tab === 'evidence' && overdueEvidence.length > 0 && (
                <View style={styles.overdueTabDot} />
              )}
              {tab === 'timeline' && overdueMilestones.length > 0 && (
                <View style={styles.overdueTabDot} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>

          {activeTab === 'controls' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push(`/engagement/control/new?engagementId=${id}` as any)}>
              <MaterialCommunityIcons name="plus" size={16} color={Colors.blue} />
              <Text style={styles.addBtnText}>Add Control</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'evidence' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push(`/engagement/evidence/new?engagementId=${id}` as any)}>
              <MaterialCommunityIcons name="plus" size={16} color={Colors.blue} />
              <Text style={styles.addBtnText}>Add Evidence</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'findings' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push(`/engagement/finding/new?engagementId=${id}` as any)}>
              <MaterialCommunityIcons name="plus" size={16} color={Colors.blue} />
              <Text style={styles.addBtnText}>Add Finding</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'timeline' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push(`/engagement/timeline/new?engagementId=${id}` as any)}>
              <MaterialCommunityIcons name="plus" size={16} color={Colors.blue} />
              <Text style={styles.addBtnText}>Add Milestone</Text>
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
                      onPress={() => router.push(`/engagement/control/${ctrl.id}` as any)}
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
                              {isOverdue && <MaterialCommunityIcons name="alert-circle" size={14} color={Colors.redDark} />}
                            </View>
                            <Text style={styles.rowMeta}>
                              {ev.receivedDate ? 'Received ' + ev.receivedDate
                                : ev.requestedDate ? 'Requested ' + ev.requestedDate
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
                  onPress={() => router.push(`/engagement/finding/${f.id}` as any)}
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

          {/* Timeline tab */}
          {activeTab === 'timeline' && (
            <View style={styles.section}>
              {milestones.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={40} color={Colors.textHint} />
                  <Text style={[styles.emptyText, { marginTop: 12 }]}>
                    No milestones yet. Add a custom one, or generate the standard audit phases.
                  </Text>
                  <TouchableOpacity
                    style={styles.generateBtn}
                    onPress={() => router.push(`/engagement/timeline/generate?engagementId=${id}` as any)}
                  >
                    <MaterialCommunityIcons name="auto-fix" size={16} color={Colors.bgPrimary} />
                    <Text style={styles.generateBtnText}>Generate Standard Phases</Text>
                  </TouchableOpacity>
                </View>
              )}

              {milestones.map((m, idx) => {
                const status = getMilestoneStatus(m);
                const due = new Date(m.dueDateTime);
                const statusColor = MILESTONE_STATUS_COLOR[status];
                return (
                  <View key={m.id} style={styles.timelineRow}>
                    <View style={styles.timelineLeftCol}>
                      <View style={[styles.timelineDot, { backgroundColor: m.completed ? Colors.teal : statusColor }]}>
                        {m.completed && <MaterialCommunityIcons name="check" size={12} color={Colors.bgPrimary} />}
                      </View>
                      {idx < milestones.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <TouchableOpacity
                      style={[styles.timelineCard, m.completed && styles.timelineCardCompleted]}
                      onPress={() => openMilestoneMenu(m)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.timelineCardHeader}>
                        <View style={styles.phaseBadge}>
                          <Text style={styles.phaseBadgeText}>{m.phase}</Text>
                        </View>
                        {!m.completed && (
                          <Text style={[styles.timelineStatusText, { color: statusColor }]}>{status}</Text>
                        )}
                        {m.completed && (
                          <MaterialCommunityIcons name="check-circle" size={16} color={Colors.teal} />
                        )}
                      </View>
                      <Text style={[styles.timelineTitle, m.completed && styles.timelineTitleCompleted]}>
                        {m.title}
                      </Text>
                      <View style={styles.timelineMetaRow}>
                        <MaterialCommunityIcons name="calendar-outline" size={13} color={Colors.textSecondary} />
                        <Text style={styles.timelineMeta}>
                          {due.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {' · '}
                          {due.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {m.notifyEnabled && !m.completed && (
                          <MaterialCommunityIcons name="bell-outline" size={13} color={Colors.blue} style={{ marginLeft: 6 }} />
                        )}
                      </View>
                      {m.notes ? <Text style={styles.timelineNotes}>{m.notes}</Text> : null}
                    </TouchableOpacity>
                  </View>
                );
              })}
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
  autoFlagText: { fontSize: 10, color: Colors.redDark, fontWeight: '600' },
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
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.blue, borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginTop: Spacing.lg,
  },
  generateBtnText: { fontSize: FontSize.sm, color: Colors.bgPrimary, fontWeight: '600' },
  // Timeline styles
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineLeftCol: { width: 20, alignItems: 'center' },
  timelineDot: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.border, marginVertical: 2 },
  timelineCard: {
    flex: 1,
    backgroundColor: Colors.bgPrimary, borderRadius: Radius.md,
    borderWidth: 0.5, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  timelineCardCompleted: { opacity: 0.6 },
  timelineCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  phaseBadge: { backgroundColor: Colors.purpleLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  phaseBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.purpleDark, textTransform: 'uppercase' },
  timelineStatusText: { fontSize: FontSize.xs, fontWeight: '600' },
  timelineTitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  timelineTitleCompleted: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  timelineMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timelineMeta: { fontSize: FontSize.xs, color: Colors.textSecondary },
  timelineNotes: { fontSize: FontSize.xs, color: Colors.textHint, marginTop: 6, fontStyle: 'italic' },
});