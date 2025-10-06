import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { GAME_DETAILS } from '@/constants/mock-games';
import { spadesStore } from '@/src/shared/spades-store';
import { Colors } from '@/constants/theme';

const formatChange = (value: number) => (value > 0 ? `+${value}` : `${value}`);

export default function GameDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const detail = id ? spadesStore.getDetail(id) ?? GAME_DETAILS[id] : undefined;

  if (!detail) {
    return (
      <View style={styles.screen}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Game not found</Text>
          <Text style={styles.emptySubtitle}>Choose another match from the Spades library.</Text>
        </View>
      </View>
    );
  }

  const teamOneStyle = detail.winningTeam === 'teamOne' ? styles.teamWinner : styles.teamLoser;
  const teamTwoStyle = detail.winningTeam === 'teamTwo' ? styles.teamWinner : styles.teamLoser;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.teamRow}>
            <View style={[styles.teamPill, teamOneStyle]}>
              <Text style={styles.teamText}>{detail.teamOne}</Text>
            </View>
            <Text style={styles.vsLabel}>vs</Text>
            <View style={[styles.teamPill, teamTwoStyle]}>
              <Text style={styles.teamText}>{detail.teamTwo}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Final Score</Text>
            <Text style={styles.metaValue}>
              {detail.finalScore}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{detail.date}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Goal</Text>
            <Text style={styles.metaValue}>{detail.goalScore} pts</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Round History</Text>
          <View style={styles.roundList}>
            {detail.rounds.map((round) => (
              <View key={`round-${round.number}`} style={styles.roundCard}>
                <View style={styles.roundHeader}>
                  <Text style={styles.roundHeading}>Round {round.number}</Text>
                </View>
                <View style={styles.roundTeamsHeader}>
                  <Text style={[styles.roundHeaderLabel, styles.roundTeamName]} numberOfLines={1}>
                    Team
                  </Text>
                  <Text style={[styles.roundHeaderLabel, styles.roundStat]}>Bid/Books</Text>
                  <Text style={[styles.roundHeaderLabel, styles.roundDelta]}>Δ</Text>
                  <Text style={[styles.roundHeaderLabel, styles.roundTotal]}>Total</Text>
                </View>
                <View style={styles.roundTeams}>
                  {round.teamSummaries.map((team) => (
                    <View key={`${round.number}-${team.teamLabel}`} style={styles.roundTeamRow}>
                      <Text style={styles.roundTeamName}>{team.teamLabel}</Text>
                      <Text style={styles.roundStat}>
                        {team.bid}/{team.books}
                      </Text>
                      <Text
                        style={[
                          styles.roundDelta,
                          team.scoreChange >= 0 ? styles.roundPositive : styles.roundNegative,
                        ]}>
                        {formatChange(team.scoreChange)}
                      </Text>
                      <Text style={styles.roundTotal}>{team.runningTotal}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 28,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  summaryCard: {
    borderRadius: 28,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    gap: 18,
    shadowColor: '#07030E',
    shadowOpacity: 0.4,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 18,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  teamPill: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  teamText: {
    fontWeight: '600',
    textAlign: 'center',
    color: Colors.dark.textPrimary,
  },
  vsLabel: {
    fontWeight: '700',
    color: Colors.dark.textSecondary,
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
    color: Colors.dark.textSecondary,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.textPrimary,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  roundList: {
    gap: 16,
  },
  roundCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    backgroundColor: '#161221',
    gap: 14,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundHeading: {
    color: Colors.dark.textPrimary,
    fontWeight: '700',
    fontSize: 18,
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
    color: Colors.dark.textSecondary,
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
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  roundTeamName: {
    flex: 1.4,
    fontWeight: '600',
    color: Colors.dark.textPrimary,
  },
  roundStat: {
    flex: 0.8,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    color: Colors.dark.textSecondary,
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
    color: Colors.dark.textSecondary,
  },
  roundPositive: {
    color: Colors.dark.positive,
  },
  roundNegative: {
    color: Colors.dark.negative,
  },
  teamWinner: {
    backgroundColor: 'rgba(224, 49, 58, 0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(224, 49, 58, 0.48)',
  },
  teamLoser: {
    backgroundColor: '#1D1A27',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.05)',
  },
});
