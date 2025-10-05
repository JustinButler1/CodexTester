import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GAME_SUMMARIES } from '@/constants/mock-games';

type Summary = (typeof GAME_SUMMARIES)[number];

const renderCard = ({ item }: { item: Summary }) => {
  const teamOneStyle = item.winningTeam === 'teamOne' ? styles.teamWinner : styles.teamLoser;
  const teamTwoStyle = item.winningTeam === 'teamTwo' ? styles.teamWinner : styles.teamLoser;

  return (
    <Link href={{ pathname: '/game/[id]', params: { id: item.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}>
        <ThemedView style={styles.card}>
          <View style={styles.teamRow}>
            <View style={[styles.teamPill, teamOneStyle]}>
              <ThemedText style={styles.teamText}>{item.teamOne}</ThemedText>
            </View>
            <ThemedText style={styles.vsLabel}>vs</ThemedText>
            <View style={[styles.teamPill, teamTwoStyle]}>
              <ThemedText style={styles.teamText}>{item.teamTwo}</ThemedText>
            </View>
          </View>
          <View style={styles.cardMetaRow}>
            <ThemedText style={styles.label}>Score</ThemedText>
            <ThemedText style={styles.score} type="title">
              {item.finalScore}
            </ThemedText>
          </View>
          <View style={styles.cardMetaRow}>
            <ThemedText style={styles.label}>Date</ThemedText>
            <ThemedText style={styles.metaText}>{item.date}</ThemedText>
          </View>
        </ThemedView>
      </Pressable>
    </Link>
  );
};

export default function HomeScreen() {
  return (
    <ThemedView style={styles.screen}>
      <FlatList
        data={GAME_SUMMARIES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={renderCard}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  separator: {
    height: 16,
  },
  cardPressable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.86,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teamPill: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  teamText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  vsLabel: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: 12,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  score: {
    fontSize: 24,
  },
  label: {
    opacity: 0.6,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaText: {
    opacity: 0.85,
  },
  teamWinner: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(46, 204, 113, 0.5)',
  },
  teamLoser: {
    backgroundColor: 'rgba(231, 76, 60, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
});
