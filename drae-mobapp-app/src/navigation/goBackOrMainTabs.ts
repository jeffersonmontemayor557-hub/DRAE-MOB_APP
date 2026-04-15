/** Avoids React Navigation dev warning when `goBack` has no stack entry (e.g. odd launch state). */
export function goBackOrMainTabs(navigation: {
  canGoBack(): boolean;
  goBack(): void;
  navigate(name: 'MainTabs'): void;
}) {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    navigation.navigate('MainTabs');
  }
}
