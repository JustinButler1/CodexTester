import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function GamesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
      <ThemedText type="title" style={styles.heading}>Choose a Game</ThemedText>
      <ThemedText style={styles.subheading}>Pick a scoreboard to start tracking live play.</ThemedText>

      <Pressable style={[styles.card, styles.chessCard]}>
        <ThemedText style={styles.cardTitle}>Chess</ThemedText>
        <ThemedText style={styles.cardSubtitle}>Coming soon</ThemedText>
      </Pressable>

      <Link href="/games/spades" asChild>
        <Pressable style={[styles.card, styles.spadesCard]}>
          <ThemedText style={styles.cardTitle}>Spades</ThemedText>
          <ThemedText style={styles.cardSubtitle}>Track bids and rounds</ThemedText>
        </Pressable>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 20,
  },
  heading: {
    textAlign: 'center',
  },
  subheading: {
    textAlign: 'center',
    opacity: 0.75,
    marginBottom: 12,
  },
  card: {
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  chessCard: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  spadesCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    opacity: 0.8,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
