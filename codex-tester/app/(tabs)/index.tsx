import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView
      style={[styles.screen, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 48 }]}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
