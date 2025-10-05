import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function GamesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView
      style={[styles.screen, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 48 }]}
    >
      <ThemedText type="title" style={styles.heading}>
        Choose a Game
      </ThemedText>
      <ThemedText style={styles.subheading}>
        Bring your next match online with a live scoreboard.
      </ThemedText>

      <Pressable style={[styles.card, styles.chessCard]} disabled>
        <ThemedText style={styles.tagMuted}>Soon</ThemedText>
        <ThemedText style={styles.cardTitle}>Chess</ThemedText>
        <ThemedText style={styles.cardSubtitle}>Live score tracking in development</ThemedText>
      </Pressable>

      <Link href="/games/spades" asChild>
        <Pressable style={[styles.card, styles.spadesCard]}>
          <ThemedText style={styles.tagActive}>Live</ThemedText>
          <ThemedText style={styles.cardTitle}>Spades</ThemedText>
          <ThemedText style={styles.cardSubtitle}>Jump into bids, rounds, and history</ThemedText>
        </Pressable>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 28,
  },
  heading: {
    textAlign: 'center',
  },
  subheading: {
    textAlign: 'center',
    opacity: 0.75,
  },
  card: {
    width: '100%',
    borderRadius: 28,
    paddingVertical: 44,
    paddingHorizontal: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    gap: 18,
    shadowColor: '#020617',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  chessCard: {
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    borderColor: 'rgba(148, 163, 184, 0.32)',
  },
  spadesCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.24)',
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  tagMuted: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1.2,
    backgroundColor: 'rgba(148, 163, 184, 0.25)',
  },
  tagActive: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1.2,
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
  },
  cardTitle: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  cardSubtitle: {
    opacity: 0.85,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
});
