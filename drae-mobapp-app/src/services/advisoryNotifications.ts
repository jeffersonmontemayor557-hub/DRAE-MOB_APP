import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { confirmPermissionStep } from '../utils/permissionDialogs';
import { Advisory } from './supabaseService';

let hasInitialized = false;
let isNotificationSupported = true;

function isRunningInExpoGo() {
  return Constants.executionEnvironment === 'storeClient';
}

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null = null;
async function getNotificationsModule() {
  if (!notificationsModule) {
    notificationsModule = await import('expo-notifications');
  }
  return notificationsModule;
}

export async function initializeAdvisoryNotifications() {
  if (hasInitialized) {
    return isNotificationSupported;
  }

  if (isRunningInExpoGo()) {
    // Expo Go does not fully support notifications APIs in SDK 53+.
    isNotificationSupported = false;
    hasInitialized = true;
    return false;
  }

  const Notifications = await getNotificationsModule();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const proceed = await confirmPermissionStep(
      'Notifications',
      'DRAE can send alerts for CDRRMO advisories and safety updates. Notifications may play a sound. You can turn this off anytime in Settings.',
    );
    if (proceed) {
      await Notifications.requestPermissionsAsync();
    }
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('advisories', {
      name: 'CDRRMO Advisories',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#1a7a4a',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('assignments', {
      name: 'CDRRMO Assignments',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#1a7a4a',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('report-updates', {
      name: 'Your Report Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#1a7a4a',
      sound: 'default',
    });
  }

  hasInitialized = true;
  return true;
}

export async function notifyNewAdvisory(advisory: Advisory) {
  if (!isNotificationSupported) {
    return;
  }
  const Notifications = await getNotificationsModule();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `CDRRMO ${advisory.severity.toUpperCase()} Alert`,
      body: `${advisory.title}: ${advisory.message}`,
      sound: 'default',
      data: {
        advisoryId: advisory.id,
      },
    },
    trigger: null,
  });
}

export type StaffAssignmentNotifyPayload = {
  hazardType: string;
  locationText: string;
  reporterName?: string;
};

export async function notifyNewStaffAssignment(payload: StaffAssignmentNotifyPayload) {
  if (!isNotificationSupported) {
    return;
  }
  const Notifications = await getNotificationsModule();
  const who = payload.reporterName ? `${payload.reporterName} · ` : '';
  const body = `${who}${payload.hazardType} — ${payload.locationText || 'Location pending'}`;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New emergency assignment',
      body,
      sound: 'default',
      data: { type: 'staff_assignment' },
      ...(Platform.OS === 'android' ? { channelId: 'assignments' } : {}),
    },
    trigger: null,
  });
}

export type ReportAssignedNotifyPayload = {
  hazardType: string;
  assignedStaffName: string;
  reportId: string;
};

export async function notifyReportAssigned(payload: ReportAssignedNotifyPayload) {
  if (!isNotificationSupported) {
    return;
  }
  const Notifications = await getNotificationsModule();
  const hazard = payload.hazardType?.trim() || 'Your incident report';
  const who = payload.assignedStaffName?.trim() || 'a responder';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Responder assigned',
      body: `${who} is now handling your ${hazard.toLowerCase()} report.`,
      sound: 'default',
      data: { type: 'report_assigned', reportId: payload.reportId },
      ...(Platform.OS === 'android' ? { channelId: 'report-updates' } : {}),
    },
    trigger: null,
  });
}

export type ReportResolvedNotifyPayload = {
  hazardType: string;
  reportId: string;
};

export async function notifyReportResolved(payload: ReportResolvedNotifyPayload) {
  if (!isNotificationSupported) {
    return;
  }
  const Notifications = await getNotificationsModule();
  const hazard = payload.hazardType?.trim() || 'Your incident report';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Report resolved',
      body: `Your ${hazard.toLowerCase()} report was marked resolved. Thank you for reporting.`,
      sound: 'default',
      data: { type: 'report_resolved', reportId: payload.reportId },
      ...(Platform.OS === 'android' ? { channelId: 'report-updates' } : {}),
    },
    trigger: null,
  });
}
