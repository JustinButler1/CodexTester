import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GAME_DETAILS } from '@/constants/mock-games';

const formatChange = (value: number) => (value > 0 ? `+${value}` : `${value}`);

export default function GameDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const detail = id ? GAME_DETAILS[id] : undefined;

  if (!detail) {
    return (
      <ThemedView style={styles.screen}>
        <View style={styles.emptyState}>
          <ThemedText type="title">Game not found</ThemedText>
          <ThemedText>Choose another game from Home.</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const teamOneStyle = detail.winningTeam === 'teamOne' ? styles.teamWinner : styles.teamLoser;
  const teamTwoStyle = detail.winningTeam === 'teamTwo' ? styles.teamWinner : styles.teamLoser;

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.summaryCard}>
          <View style={styles.teamRow}>
            <View style={[styles.teamPill, teamOneStyle]}>
              <ThemedText style={styles.teamText}>{detail.teamOne}</ThemedText>
            </View>
            <ThemedText style={styles.vsLabel}>vs</ThemedText>
            <View style={[styles.teamPill, teamTwoStyle]}>
              <ThemedText style={styles.teamText}>{detail.teamTwo}</ThemedText>
            </View>
          </View>
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaLabel}>Final</ThemedText>
            <ThemedText style={styles.metaValue} type="title">
              {detail.finalScore}
            </ThemedText>
          </View>
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaLabel}>Date</ThemedText>
            <ThemedText style={styles.metaValue}>{detail.date}</ThemedText>
          </View>
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaLabel}>Goal</ThemedText>
            <ThemedText style={styles.metaValue}>{detail.goalScore} pts</ThemedText>
          </View>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Round History</ThemedText>
          <View style={styles.roundList}>
            {detail.rounds.map((round) => (
              <ThemedView key={`round-${round.number}`} style={styles.roundCard}>
                <View style={styles.roundHeader}>
                  <ThemedText type="defaultSemiBold">Round {round.number}</ThemedText>
                </View>
                <View style={styles.roundTeamsHeader}>
                  <ThemedText style={[styles.roundHeaderLabel, styles.roundTeamName]} numberOfLines={1}>
                    Team
                  </ThemedText>
                  <ThemedText style={[styles.roundHeaderLabel, styles.roundStat]}>Bid/Books</ThemedText>
                  <ThemedText style={[styles.roundHeaderLabel, styles.roundDelta]}>Δ</ThemedText>
                  <ThemedText style={[styles.roundHeaderLabel, styles.roundTotal]}>Total</ThemedText>
                </View>
                <View style={styles.roundTeams}>
                  {round.teamSummaries.map((team) => (
                    <View key={`${round.number}-${team.teamLabel}`} style={styles.roundTeamRow}>
                      <ThemedText style={styles.roundTeamName}>{team.teamLabel}</ThemedText>
                      <ThemedText style={styles.roundStat}>
                        {team.bid}/{team.books}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.roundDelta,
                          team.scoreChange >= 0 ? styles.roundPositive : styles.roundNegative,
                        ]}>
                        {formatChange(team.scoreChange)}
                      </ThemedText>
                      <ThemedText style={styles.roundTotal}>{team.runningTotal}</ThemedText>
                    </View>
                  ))}
                </View>
              </ThemedView>
            ))}
          </View>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.6,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    gap: 12,
  },
  roundList: {
    gap: 12,
  },
  roundCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 12,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundTeamsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  roundHeaderLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.6,
    fontWeight: '500',
  },
  roundTeams: {
    marginTop: 4,
    gap: 8,
  },
  roundTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  roundTeamName: {
    flex: 1.4,
    fontWeight: '600',
  },
  roundStat: {
    flex: 0.8,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  roundDelta: {
    flex: 0.6,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  roundTotal: {
    flex: 0.8,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
    opacity: 0.8,
  },
  roundPositive: {
    color: '#34d399',
  },
  roundNegative: {
    color: '#f87171',
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
