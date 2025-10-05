import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type GameSummary = {
  id: string;
  teamOne: string;
  teamTwo: string;
  winningTeam: 'teamOne' | 'teamTwo';
  finalScore: string;
  date: string;
};

const DUMMY_GAMES: GameSummary[] = [
  {
    id: 'game-101',
    teamOne: 'Avery & Kai',
    teamTwo: 'Jess & Malik',
    winningTeam: 'teamOne',
    finalScore: '512 – 347',
    date: 'Apr 2, 2024',
  },
  {
    id: 'game-102',
    teamOne: 'Morgan & Kai',
    teamTwo: 'Jordan & Reese',
    winningTeam: 'teamTwo',
    finalScore: '438 – 501',
    date: 'Mar 29, 2024',
  },
  {
    id: 'game-103',
    teamOne: 'Avery & Kai',
    teamTwo: 'Theo & Cam',
    winningTeam: 'teamOne',
    finalScore: '503 – 295',
    date: 'Mar 24, 2024',
  },
  {
    id: 'game-104',
    teamOne: 'Morgan & Kai',
    teamTwo: 'Priya & Owen',
    winningTeam: 'teamOne',
    finalScore: '547 – 410',
    date: 'Mar 19, 2024',
  },
  {
    id: 'game-105',
    teamOne: 'Sky & Kai',
    teamTwo: 'Lena & Pat',
    winningTeam: 'teamOne',
    finalScore: '601 – 372',
    date: 'Mar 15, 2024',
  },
  {
    id: 'game-106',
    teamOne: 'Sky & Kai',
    teamTwo: 'Nia & Cole',
    winningTeam: 'teamTwo',
    finalScore: '421 – 512',
    date: 'Mar 10, 2024',
  },
  {
    id: 'game-107',
    teamOne: 'Avery & Kai',
    teamTwo: 'Rowan & Eli',
    winningTeam: 'teamOne',
    finalScore: '487 – 325',
    date: 'Mar 5, 2024',
  },
  {
    id: 'game-108',
    teamOne: 'Morgan & Kai',
    teamTwo: 'Mira & Dante',
    winningTeam: 'teamOne',
    finalScore: '523 – 468',
    date: 'Mar 1, 2024',
  },
  {
    id: 'game-109',
    teamOne: 'Taylor & Kai',
    teamTwo: 'Isa & True',
    winningTeam: 'teamOne',
    finalScore: '552 – 497',
    date: 'Feb 25, 2024',
  },
  {
    id: 'game-110',
    teamOne: 'Taylor & Kai',
    teamTwo: 'Harper & Quinn',
    winningTeam: 'teamTwo',
    finalScore: '398 – 502',
    date: 'Feb 21, 2024',
  },
  {
    id: 'game-111',
    teamOne: 'Sky & Kai',
    teamTwo: 'Devon & Blair',
    winningTeam: 'teamOne',
    finalScore: '575 – 466',
    date: 'Feb 18, 2024',
  },
  {
    id: 'game-112',
    teamOne: 'Avery & Kai',
    teamTwo: 'Kade & Jules',
    winningTeam: 'teamOne',
    finalScore: '610 – 472',
    date: 'Feb 12, 2024',
  },
];

export default function HomeScreen() {
  return (
    <ThemedView style={styles.screen}>
      <FlatList
        data={DUMMY_GAMES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const teamOneStyle =
            item.winningTeam === 'teamOne' ? styles.teamWinner : styles.teamLoser;
          const teamTwoStyle =
            item.winningTeam === 'teamTwo' ? styles.teamWinner : styles.teamLoser;

          return (
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
          );
        }}
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
