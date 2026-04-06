import { Platform, StyleSheet } from 'react-native';

/**
 * iOS Human Interface Guidelines–aligned tokens + brand green #1a7a4a
 */
export const apple = {
  groupedBackground: '#f2f2f7',
  secondaryGrouped: '#ffffff',
  tertiaryFill: '#e5e5ea',
  label: '#000000',
  secondaryLabel: '#6c6c70',
  tertiaryLabel: '#aeaeb2',
  divider: '#e5e5ea',
  tabBarBg: 'rgba(255,255,255,0.97)',
  tabBarBorder: '#d1d1d6',
  tabInactive: '#8e8e93',
  refreshTint: '#1a7a4a',
  androidRefreshBg: '#FAFAFA',
  cardRadius: 14,
  insetGroupedMargin: 16,
  /** System UI font stack */
  fontFamily: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'sans-serif',
  }),
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  infographic: {
    titleLarge: 34,
    titleMedium: 22,
    tagalog: 13,
    tagalogLineHeight: 18,
    english: 10,
    englishLineHeight: 14,
    labelCaps: 11,
  },
};

export const hairline = StyleSheet.hairlineWidth;
