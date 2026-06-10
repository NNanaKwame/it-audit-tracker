import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Switch, Alert, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudit } from '../../src/store/AuditContext';
import { Colors, FontSize, Radius, Spacing } from '../../src/constants/theme';
import {
  requestNotificationPermissions,
  scheduleAllDeadlineNotifications,
  cancelAllNotifications,
  getScheduledNotifications,
} from '../../src/utils/notifications';

export default function SettingsScreen() {
  const { state, getAllSummaries, clearAllData, getOverdueEvidence } = useAudit();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const totalEngagements = Object.keys(state.engagements).length;
  const totalControls = Object.keys(state.controls).length;
  const totalFindings = Object.keys(state.findings).length;
  const openFindings = Object.values(state.findings).filter(f => f.status !== 'Closed').length;
  const overdueEvidence = getOverdueEvidence();

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  async function checkNotificationStatus() {
    setChecking(true);
    try {
      const scheduled = await getScheduledNotifications();
      setScheduledCount(scheduled.length);
      setNotificationsEnabled(scheduled.length > 0);
    } catch {
      setNotificationsEnabled(false);
    } finally {
      setChecking(false);
    }
  }

  async function handleToggleNotifications(value: boolean) {
    setLoading(true);
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert('Permission Required', 'Please enable notifications for IT Audit Tracker in your device Settings.');
        setLoading(false);
        return;
      }
      const count = await scheduleAllDeadlineNotifications(state);
      setScheduledCount(count);
      setNotificationsEnabled(true);
      Alert.alert(
        'Notifications Enabled',
        count > 0
          ? `${count} deadline reminder${count !== 1 ? 's' : ''} scheduled for open findings.`
          : 'No upcoming deadlines found. Add remediation dates to your findings.',
      );
    } else {
      await cancelAllNotifications();
      setScheduledCount(0);
      setNotificationsEnabled(false);
    }
    setLoading(false);
  }

  async function handleReschedule() {
    setLoading(true);
    const count = await scheduleAllDeadlineNotifications(state);
    setScheduledCount(count);
    setNotificationsEnabled(count > 0);
    setLoading(false);
    Alert.alert('Rescheduled', `${count} deadline reminder${count !== 1 ? 's' : ''} are now active.`);
  }

  function handleClearAll() {
    Alert.alert(
      'Clear All Data?',
      'This will permanently delete ALL engagements, controls, evidence, and findings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            await cancelAllNotifications();
            await clearAllData();
            Alert.alert('Cleared', 'All data has been removed. You can create new engagements from the Engagements tab.');
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Audit overview */}
      <Text style={styles.sectionTitle}>Audit Overview</Text>
      <View style={styles.card}>
        <StatRow icon="briefcase-outline" label="Engagements" value={String(totalEngagements)} />
        <Divider />
        <StatRow icon="shield-check-outline" label="Total Controls" value={String(totalControls)} />
        <Divider />
        <StatRow icon="alert-circle-outline" label="Total Findings" value={String(totalFindings)} />
        <Divider />
        <StatRow
          icon="alert-outline"
          label="Open Findings"
          value={String(openFindings)}
          valueColor={openFindings > 0 ? Colors.redDark : Colors.tealDark}
        />
      </View>

      {/* Overdue evidence */}
      {overdueEvidence.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Overdue Evidence</Text>
          <View style={styles.card}>
            {overdueEvidence.map((item, i) => (
              <View key={item.evidence.id}>
                {i > 0 && <Divider />}
                <View style={styles.overdueRow}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color={Colors.redDark} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.overdueItemName}>{item.evidence.name}</Text>
                    <Text style={styles.overdueItemMeta}>{item.engagementName} · {item.daysOverdue} days overdue</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Notifications */}
      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <MaterialCommunityIcons name="bell-outline" size={20} color={Colors.blue} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Deadline Reminders</Text>
              <Text style={styles.settingDesc}>
                Alerts 7 days, 3 days, and on the day of finding remediation deadlines.
              </Text>
            </View>
          </View>
          {checking || loading
            ? <ActivityIndicator size="small" color={Colors.blue} />
            : <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: Colors.border, true: Colors.blueLight }}
                thumbColor={notificationsEnabled ? Colors.blue : Colors.bgTertiary}
              />
          }
        </View>
        {notificationsEnabled && (
          <>
            <Divider />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <MaterialCommunityIcons name="calendar-clock" size={20} color={Colors.textSecondary} />
                <Text style={styles.settingLabel}>{scheduledCount} reminder{scheduledCount !== 1 ? 's' : ''} scheduled</Text>
              </View>
              <TouchableOpacity onPress={handleReschedule} disabled={loading} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <View style={styles.noteRow}>
        <MaterialCommunityIcons name="information-outline" size={14} color={Colors.textHint} />
        <Text style={styles.noteText}>
          Re-enable notifications after adding new deadlines to keep reminders up to date.
        </Text>
      </View>

      {/* Data management */}
      <Text style={styles.sectionTitle}>Data Management</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.dangerRow} onPress={handleClearAll}>
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.redDark} />
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerLabel}>Clear All Data</Text>
            <Text style={styles.dangerDesc}>Remove all engagements, controls, evidence, and findings permanently.</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.redDark} />
        </TouchableOpacity>
      </View>

      {/* About */}
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.card}>
        <StatRow icon="information-outline" label="App Version" value="1.0.0 (Phase 2)" />
        <Divider />
        <StatRow icon="shield-lock-outline" label="SDK" value="Expo SDK 54" />
        <Divider />
        <StatRow icon="database-outline" label="Storage" value="Local (AsyncStorage)" />
      </View>

    </ScrollView>
  );
}

function StatRow({ icon, label, value, valueColor }: {
  icon: string; label: string; value: string; valueColor?: string;
}) {
  return (
    <View style={styles.statRow}>
      <MaterialCommunityIcons name={icon as any} size={18} color={Colors.textSecondary} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
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
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  statLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary },
  statValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  divider: { height: 0.5, backgroundColor: Colors.border, marginLeft: Spacing.lg },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: 12 },
  settingInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  settingLabel: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500', marginBottom: 2 },
  settingDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  actionBtn: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.blue },
  actionBtnText: { fontSize: FontSize.xs, color: Colors.blue, fontWeight: '600' },
  noteRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: Spacing.sm, paddingHorizontal: Spacing.sm },
  noteText: { fontSize: FontSize.xs, color: Colors.textHint, lineHeight: 18, flex: 1 },
  overdueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  overdueItemName: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textPrimary },
  overdueItemMeta: { fontSize: FontSize.xs, color: Colors.redDark, marginTop: 2 },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  dangerLabel: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.redDark },
  dangerDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
});