import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AppState, Finding, Engagement } from '../types';

// Configure how notifications appear when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('audit-deadlines', {
      name: 'Audit Deadlines',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Schedule helpers ─────────────────────────────────────────────────────────

/**
 * Schedule a notification N days before a deadline date.
 * Returns the notification identifier, or null if scheduling failed.
 */
async function scheduleDeadlineNotification(
  id: string,
  title: string,
  body: string,
  deadlineDate: string,
  daysBefore: number = 3,
): Promise<string | null> {
  try {
    const deadline = new Date(deadlineDate);
    const triggerDate = new Date(deadline);
    triggerDate.setDate(triggerDate.getDate() - daysBefore);
    triggerDate.setHours(9, 0, 0, 0); // 9 AM

    // Don't schedule if trigger is in the past
    if (triggerDate <= new Date()) return null;

    const notifId = await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title,
        body,
        data: { type: 'deadline', id },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
    return notifId;
  } catch (e) {
    console.warn('Failed to schedule notification:', e);
    return null;
  }
}

// ─── Cancel all scheduled notifications ──────────────────────────────────────

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Schedule all finding deadlines across the whole app ─────────────────────

export async function scheduleAllDeadlineNotifications(state: AppState): Promise<number> {
  const granted = await requestNotificationPermissions();
  if (!granted) return 0;

  // Cancel existing to avoid duplicates
  await cancelAllNotifications();

  let scheduled = 0;

  const openFindings = Object.values(state.findings).filter(
    f => f.status !== 'Closed' && f.targetRemediationDate
  );

  for (const finding of openFindings) {
    const engagement = state.engagements[finding.engagementId];
    const clientName = engagement?.clientName ?? 'Unknown Client';

    // 7-day warning
    const id7 = await scheduleDeadlineNotification(
      `finding-7d-${finding.id}`,
      `⚠️ Finding Due in 7 Days`,
      `${clientName}: "${finding.title}" (${finding.severity}) — due ${finding.targetRemediationDate}`,
      finding.targetRemediationDate!,
      7,
    );
    if (id7) scheduled++;

    // 3-day warning
    const id3 = await scheduleDeadlineNotification(
      `finding-3d-${finding.id}`,
      `🔴 Finding Due in 3 Days`,
      `${clientName}: "${finding.title}" (${finding.severity}) — due ${finding.targetRemediationDate}`,
      finding.targetRemediationDate!,
      3,
    );
    if (id3) scheduled++;

    // Day-of warning
    const id0 = await scheduleDeadlineNotification(
      `finding-0d-${finding.id}`,
      `🚨 Finding Due Today`,
      `${clientName}: "${finding.title}" — remediation deadline is today!`,
      finding.targetRemediationDate!,
      0,
    );
    if (id0) scheduled++;
  }

  return scheduled;
}

// ─── Get scheduled notification list (for settings screen) ───────────────────

export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}