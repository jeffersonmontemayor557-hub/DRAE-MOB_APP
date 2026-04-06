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
