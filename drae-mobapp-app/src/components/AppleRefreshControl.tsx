import { Platform, RefreshControl, type RefreshControlProps } from 'react-native';
import { apple } from '../theme/apple';

/**
 * Pull-to-refresh (pull down from top) with consistent tint for iOS/Android.
 */
export function AppleRefreshControl(props: RefreshControlProps) {
  return (
    <RefreshControl
      tintColor={apple.refreshTint}
      colors={Platform.OS === 'android' ? [apple.refreshTint] : undefined}
      progressBackgroundColor={
        Platform.OS === 'android' ? apple.androidRefreshBg : undefined
      }
      {...props}
    />
  );
}
