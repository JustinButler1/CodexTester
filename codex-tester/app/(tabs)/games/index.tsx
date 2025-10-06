import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameOptionCard } from './game-option-card';
import { Colors } from '@/constants/theme';

export default function GamesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 64 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBadge}>
          <Text style={styles.badgeLabel}>Arena</Text>
        </View>
        <Text style={styles.heading}>
          Pick Your Table
        </Text>
        <Text style={styles.subheading}>
          Summon a live scoreboard or browse match history.
        </Text>

        <GameOptionCard
          title="Spades"
          subtitle="Live bids, logs, and statistics"
          tagLabel="Live"
          tone="live"
          href="/games/spades"
          style={styles.card}
        />

        <GameOptionCard
          title="Chess"
          subtitle="Live score tracking in development"
          tagLabel="Soon"
          tone="muted"
          disabled
          style={styles.card}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    paddingHorizontal: 24,
    gap: 32,
    alignItems: 'center',
  },
  headerBadge: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: '#1F1A28',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  badgeLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    fontWeight: '600',
  },
  heading: {
    textAlign: 'center',
    color: Colors.dark.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  subheading: {
    textAlign: 'center',
    color: Colors.dark.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    width: '100%',
    maxWidth: 420,
  },
});
