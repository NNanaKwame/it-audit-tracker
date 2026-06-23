import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AppState, Milestone } from '../types';

// Configure how notifications appear when the app is in foreground.
// expo-notifications 0.32+ requires shouldShowBanner / shouldShowList
// in addition to the legacy shouldShowAlert field.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
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
 * Schedule a notification N days before a deadline date (date-only, defaults to 9 AM).
 */
async function scheduleDaysBeforeNotification(
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
    triggerDate.setHours(9, 0, 0, 0);

    if (triggerDate <= new Date()) return null;

    const notifId = await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, data: { type: 'deadline', id }, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
    return notifId;
  } catch (e) {
    console.warn('Failed to schedule notification:', e);
    return null;
  }
}

/**
 * Schedule a notification at an exact date+time, optionally offset by minutes before.
 * Used for milestones which carry a precise dueDateTime.
 */
async function scheduleExactNotification(
  id: string,
  title: string,
  body: string,
  triggerAt: Date,
): Promise<string | null> {
  try {
    if (triggerAt <= new Date()) return null;

    const notifId = await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, data: { type: 'milestone', id }, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerAt },
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

// ─── Schedule all finding deadlines + milestone reminders ───────────────────

export async function scheduleAllDeadlineNotifications(state: AppState): Promise<number> {
  const granted = await requestNotificationPermissions();
  if (!granted) return 0;

  await cancelAllNotifications();

  let scheduled = 0;

  // ─ Findings: 7-day, 3-day, day-of warnings ─
  const openFindings = Object.values(state.findings).filter(
    f => f.status !== 'Closed' && f.targetRemediationDate
  );

  for (const finding of openFindings) {
    const engagement = state.engagements[finding.engagementId];
    const clientName = engagement?.clientName ?? 'Unknown Client';

    const id7 = await scheduleDaysBeforeNotification(
      `finding-7d-${finding.id}`,
      `⚠️ Finding Due in 7 Days`,
      `${clientName}: "${finding.title}" (${finding.severity}) — due ${finding.targetRemediationDate}`,
      finding.targetRemediationDate!,
      7,
    );
    if (id7) scheduled++;

    const id3 = await scheduleDaysBeforeNotification(
      `finding-3d-${finding.id}`,
      `🔴 Finding Due in 3 Days`,
      `${clientName}: "${finding.title}" (${finding.severity}) — due ${finding.targetRemediationDate}`,
      finding.targetRemediationDate!,
      3,
    );
    if (id3) scheduled++;

    const id0 = await scheduleDaysBeforeNotification(
      `finding-0d-${finding.id}`,
      `🚨 Finding Due Today`,
      `${clientName}: "${finding.title}" — remediation deadline is today!`,
      finding.targetRemediationDate!,
      0,
    );
    if (id0) scheduled++;
  }

  // ─ Milestones: 1-day-before + at-due-time reminders ─
  const activeMilestones = Object.values(state.milestones).filter(
    (m: Milestone) => !m.completed && m.notifyEnabled
  );

  for (const milestone of activeMilestones) {
    const engagement = state.engagements[milestone.engagementId];
    const clientName = engagement?.clientName ?? 'Unknown Client';
    const due = new Date(milestone.dueDateTime);

    // 1 day before
    const dayBefore = new Date(due);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const idBefore = await scheduleExactNotification(
      `milestone-1d-${milestone.id}`,
      `📅 ${milestone.phase} Milestone Tomorrow`,
      `${clientName}: "${milestone.title}" is due tomorrow at ${due.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
      dayBefore,
    );
    if (idBefore) scheduled++;

    // At the exact due time
    const idDue = await scheduleExactNotification(
      `milestone-due-${milestone.id}`,
      `🔔 ${milestone.title}`,
      `${clientName}: This ${milestone.phase} milestone is due now.`,
      due,
    );
    if (idDue) scheduled++;
  }

  return scheduled;
}

// ─── Get scheduled notification list (for settings screen) ───────────────────

export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}