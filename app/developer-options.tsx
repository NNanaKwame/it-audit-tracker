import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useAudit } from '../src/store/AuditContext';
import { Colors, FontSize, Radius, Spacing } from '../src/constants/theme';
import {
  requestNotificationPermissions,
  scheduleAllDeadlineNotifications,
  cancelAllNotifications,
  getScheduledNotifications,
} from '../src/utils/notifications';

export default function DeveloperOptionsScreen() {
  const router = useRouter();
  const { state, clearAllData } = useAudit();
  const [busy, setBusy] = useState(false);

  async function handleTestNotification() {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert('Permission Required', 'Please enable notifications for IT Audit Tracker in your device Settings.');
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'If you can see this, notifications are working correctly.',
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, repeats: false },
    });
    Alert.alert('Test Scheduled', 'A test notification will appear in 5 seconds.');
  }

  async function handleListScheduled() {
    const scheduled = await getScheduledNotifications();
    if (scheduled.length === 0) {
      Alert.alert('No Notifications Scheduled', 'There are currently no scheduled notifications.');
      return;
    }
    const lines = scheduled.slice(0, 10).map((n: Notifications.NotificationRequest) => `• ${n.content.title}`).join('\n');
    Alert.alert(
      `${scheduled.length} Scheduled`,
      lines + (scheduled.length > 10 ? `\n…and ${scheduled.length - 10} more` : '')
    );
  }

  async function handleRescheduleAll() {
    setBusy(true);
    const count = await scheduleAllDeadlineNotifications(state);
    setBusy(false);
    Alert.alert('Rescheduled', `${count} notification${count !== 1 ? 's' : ''} scheduled.`);
  }

  async function handleCancelAll() {
    setBusy(true);
    await cancelAllNotifications();
    setBusy(false);
    Alert.alert('Cancelled', 'All scheduled notifications have been cancelled.');
  }

  function handleForceCrash() {
    throw new Error('Test crash triggered from Developer Options');
  }

  function handleDumpState() {
    const summary = {
      engagements: Object.keys(state.engagements).length,
      controls: Object.keys(state.controls).length,
      evidence: Object.keys(state.evidence).length,
      findings: Object.keys(state.findings).length,
      milestones: Object.keys(state.milestones).length,
    };
    Alert.alert('State Summary', JSON.stringify(summary, null, 2));
  }

  function handleResetSeed() {
    Alert.alert(
      'Reset to Seed Data?',
      'This wipes everything and reloads the original demo data. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('Cleared', 'Restart the app to reload seed data.');
          },
        },
      ]
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Developer Options' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        <View style={styles.banner}>
          <MaterialCommunityIcons name="developer-board" size={18} color={Colors.purpleDark} />
          <Text style={styles.bannerText}>
            These tools are for testing only and may produce unexpected behaviour.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <DevRow icon="flask-outline" label="Send Test Notification" onPress={handleTestNotification} />
          <Divider />
          <DevRow icon="format-list-bulleted" label="List Scheduled Notifications" onPress={handleListScheduled} />
          <Divider />
          <DevRow icon="refresh" label="Reschedule All" onPress={handleRescheduleAll} disabled={busy} />
          <Divider />
          <DevRow icon="bell-cancel-outline" label="Cancel All Scheduled" onPress={handleCancelAll} disabled={busy} danger />
        </View>

        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.card}>
          <DevRow icon="database-search-outline" label="Dump State Summary" onPress={handleDumpState} />
          <Divider />
          <DevRow icon="restore" label="Reset to Seed Data" onPress={handleResetSeed} danger />
        </View>

        <Text style={styles.sectionTitle}>Diagnostics</Text>
        <View style={styles.card}>
          <DevRow icon="alert-octagon-outline" label="Force Crash (test error boundary)" onPress={handleForceCrash} danger />
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Close Developer Options</Text>
        </TouchableOpacity>

      </ScrollView>
    </>
  );
}

function DevRow({ icon, label, onPress, danger, disabled }: {
  icon: string; label: string; onPress: () => void; danger?: boolean; disabled?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.row, disabled && { opacity: 0.5 }]} onPress={onPress} disabled={disabled}>
      <MaterialCommunityIcons name={icon as any} size={20} color={danger ? Colors.redDark : Colors.purpleDark} />
      <Text style={[styles.rowLabel, danger && { color: Colors.redDark }]}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textHint} />
    </TouchableOpacity>
  );
}

function Divider() { return <View style={styles.divider} />; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgTertiary },
  content: { padding: Spacing.lg, paddingBottom: 50 },
  banner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.purpleLight, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  bannerText: { flex: 1, fontSize: FontSize.xs, color: Colors.purpleDark, lineHeight: 18 },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginTop: Spacing.lg,
  },
  card: { backgroundColor: Colors.bgPrimary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  rowLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  divider: { height: 0.5, backgroundColor: Colors.border, marginLeft: Spacing.lg },
  backBtn: { padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.xl },
  backBtnText: { color: Colors.textSecondary, fontSize: FontSize.md },
});