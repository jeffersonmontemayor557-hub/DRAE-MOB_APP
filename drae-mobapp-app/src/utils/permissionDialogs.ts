import { Alert, Linking } from 'react-native';

export function openAppSettings(): void {
  void Linking.openSettings();
}

/** Shown after the user denies access or taps Continue but the system still blocks access. */
export function alertPermissionBlocked(title: string, body: string): void {
  Alert.alert(title, body, [
    { text: 'Not now', style: 'cancel' },
    { text: 'Open Settings', onPress: () => openAppSettings() },
  ]);
}

/**
 * In-app explanation before the system permission dialog.
 * Resolves true if the user taps Continue.
 */
export function confirmPermissionStep(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Continue', onPress: () => resolve(true) },
    ]);
  });
}
