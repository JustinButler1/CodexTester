import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Colors } from '@/constants/theme';
import { fetchSpadesGameDetail, SpadesGameDetail } from '@/src/shared/spades-store';

const formatChange = (value: number) => (value > 0 ? `+${value}` : `${value}`);

const formatDateTime = (value: string | null) => {
  if (!value) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export default function GameDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [detail, setDetail] = React.useState<SpadesGameDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    const loadDetail = async () => {
      if (!id) {
        setDetail(null);
        setLoading(false);
        return;
      }
      try {
        const gameDetail = await fetchSpadesGameDetail(id);
        if (isMounted) {
          setDetail(gameDetail);
        }
      } catch (error) {
        console.error('Failed to load game detail', error);
        if (isMounted) {
          setDetail(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

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

  const teamOneWon =
    detail.team1Total !== null &&
    detail.team2Total !== null &&
    detail.team1Total > detail.team2Total;
  const teamTwoWon =
    detail.team1Total !== null &&
    detail.team2Total !== null &&
    detail.team2Total > detail.team1Total;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.teamRow}>
            <View style={[styles.teamPill, teamOneWon ? styles.teamWinner : styles.teamLoser]}>
              <Text style={styles.teamText}>{detail.team1Name}</Text>
            </View>
            <Text style={styles.vsLabel}>vs</Text>
            <View style={[styles.teamPill, teamTwoWon ? styles.teamWinner : styles.teamLoser]}>
              <Text style={styles.teamText}>{detail.team2Name}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Final Score</Text>
            <Text style={styles.metaValue}>
              {(detail.team1Total ?? 0).toString()} – {(detail.team2Total ?? 0).toString()}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Goal</Text>
            <Text style={styles.metaValue}>{detail.goalScore} pts</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Started</Text>
            <Text style={styles.metaValue}>{formatDateTime(detail.startedAt)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Ended</Text>
            <Text style={styles.metaValue}>{formatDateTime(detail.endedAt)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Round History</Text>
          {detail.rounds.length === 0 ? (
            <View style={styles.roundEmptyState}>
              <Text style={styles.roundEmptyTitle}>No hands recorded</Text>
              <Text style={styles.roundEmptySubtitle}>This game was saved without round-by-round scores.</Text>
            </View>
          ) : (
            <View style={styles.roundList}>
              {detail.rounds.map((round) => (
                <View key={`round-${round.number}`} style={styles.roundCard}>
                  <View style={styles.roundHeader}>
                    <Text style={styles.roundHeading}>Round {round.number}</Text>
                  </View>
                  <View style={styles.roundTeamsHeader}>
                  <Text style={[styles.roundHeaderLabel, styles.roundTeamHeader]} numberOfLines={1}>
                      Team
                    </Text>
                    <Text style={[styles.roundHeaderLabel, styles.roundStat]}>Bid/Books</Text>
                    <Text style={[styles.roundHeaderLabel, styles.roundDelta]}>Δ</Text>
                    <Text style={[styles.roundHeaderLabel, styles.roundTotal]}>Total</Text>
                  </View>
                  <View style={styles.roundTeams}>
                    {round.teamSummaries.map((team) => (
                      <View key={`${round.number}-${team.teamId}`} style={styles.roundTeamRow}>
                      <Text style={styles.roundTeamLabel}>{team.teamLabel}</Text>
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
          )}
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
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
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
  teamWinner: {
    backgroundColor: '#261823',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.accentSoft,
  },
  teamLoser: {
    backgroundColor: '#1E1A2A',
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
  },
  roundHeading: {
    color: Colors.dark.textPrimary,
    fontWeight: '700',
  },
  roundTeamsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundHeaderLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roundTeamHeader: {
    flex: 1.2,
  },
  roundStat: {
    flex: 0.8,
    textAlign: 'center',
  },
  roundDelta: {
    flex: 0.4,
    textAlign: 'center',
    fontWeight: '700',
  },
  roundTotal: {
    flex: 0.6,
    textAlign: 'center',
    fontWeight: '600',
    color: Colors.dark.textPrimary,
  },
  roundTeams: {
    gap: 10,
  },
  roundTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundTeamLabel: {
    flex: 1.2,
    color: Colors.dark.textPrimary,
  },
  roundPositive: {
    color: Colors.dark.accentSoft,
  },
  roundNegative: {
    color: Colors.dark.negative,
  },
  roundEmptyState: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#1E1A29',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 6,
  },
  roundEmptyTitle: {
    color: Colors.dark.textPrimary,
    fontWeight: '600',
  },
  roundEmptySubtitle: {
    color: Colors.dark.textSecondary,
  },
});
