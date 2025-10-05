import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type TeamSummary = {
  id: string;
  label: string;
  players: string[];
  currentScore: number;
};

type RoundSnapshot = {
  id: string;
  number: number;
  teamSummaries: Array<{
    teamId: string;
    bid: number;
    books: number;
    scoreChange: number;
    runningTotal: number;
  }>;
};

type LiveGame = {
  teams: TeamSummary[];
  goalScore: number;
  rounds: RoundSnapshot[];
  pendingRound: {
    roundNumber: number;
    bids: Array<{ teamId: string; bid: number }>;
  } | null;
};

const DUMMY_LIVE_GAME: LiveGame = {
  teams: [
    {
      id: 'team-1',
      label: 'Avery & Kai',
      players: ['Avery', 'Kai'],
      currentScore: 352,
    },
    {
      id: 'team-2',
      label: 'Jess & Malik',
      players: ['Jess', 'Malik'],
      currentScore: 314,
    },
  ],
  goalScore: 500,
  rounds: [
    {
      id: 'round-1',
      number: 1,
      teamSummaries: [
        { teamId: 'team-1', bid: 5, books: 6, scoreChange: 52, runningTotal: 52 },
        { teamId: 'team-2', bid: 4, books: 3, scoreChange: -41, runningTotal: -41 },
      ],
    },
    {
      id: 'round-2',
      number: 2,
      teamSummaries: [
        { teamId: 'team-1', bid: 7, books: 7, scoreChange: 70, runningTotal: 122 },
        { teamId: 'team-2', bid: 5, books: 5, scoreChange: 50, runningTotal: 9 },
      ],
    },
    {
      id: 'round-3',
      number: 3,
      teamSummaries: [
        { teamId: 'team-1', bid: 6, books: 6, scoreChange: 60, runningTotal: 182 },
        { teamId: 'team-2', bid: 0, books: 2, scoreChange: -100, runningTotal: -91 },
      ],
    },
    {
      id: 'round-4',
      number: 4,
      teamSummaries: [
        { teamId: 'team-1', bid: 4, books: 5, scoreChange: 44, runningTotal: 226 },
        { teamId: 'team-2', bid: 4, books: 4, scoreChange: 40, runningTotal: -51 },
      ],
    },
    {
      id: 'round-5',
      number: 5,
      teamSummaries: [
        { teamId: 'team-1', bid: 5, books: 5, scoreChange: 50, runningTotal: 276 },
        { teamId: 'team-2', bid: 5, books: 5, scoreChange: 50, runningTotal: -1 },
      ],
    },
    {
      id: 'round-6',
      number: 6,
      teamSummaries: [
        { teamId: 'team-1', bid: 6, books: 6, scoreChange: 60, runningTotal: 336 },
        { teamId: 'team-2', bid: 6, books: 7, scoreChange: 70, runningTotal: 69 },
      ],
    },
    {
      id: 'round-7',
      number: 7,
      teamSummaries: [
        { teamId: 'team-1', bid: 7, books: 5, scoreChange: -20, runningTotal: 316 },
        { teamId: 'team-2', bid: 7, books: 5, scoreChange: -20, runningTotal: 49 },
      ],
    },
    {
      id: 'round-8',
      number: 8,
      teamSummaries: [
        { teamId: 'team-1', bid: 4, books: 4, scoreChange: 40, runningTotal: 356 },
        { teamId: 'team-2', bid: 4, books: 5, scoreChange: 44, runningTotal: 93 },
      ],
    },
    {
      id: 'round-9',
      number: 9,
      teamSummaries: [
        { teamId: 'team-1', bid: 5, books: 6, scoreChange: 52, runningTotal: 408 },
        { teamId: 'team-2', bid: 5, books: 5, scoreChange: 50, runningTotal: 143 },
      ],
    },
    {
      id: 'round-10',
      number: 10,
      teamSummaries: [
        { teamId: 'team-1', bid: 7, books: 13, scoreChange: 104, runningTotal: 512 },
        { teamId: 'team-2', bid: 5, books: 5, scoreChange: 50, runningTotal: 193 },
      ],
    },
  ],
  pendingRound: {
    roundNumber: 11,
    bids: [
      { teamId: 'team-1', bid: 6 },
      { teamId: 'team-2', bid: 5 },
    ],
  },
};

export default function GamesScreen() {
  const teamLookup = React.useMemo(() => {
    const map = new Map<string, TeamSummary>();
    DUMMY_LIVE_GAME.teams.forEach((team) => {
      map.set(team.id, team);
    });
    return map;
  }, []);

  const formatChange = (value: number) => (value > 0 ? `+${value}` : `${value}`);

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Teams</ThemedText>
          <View style={styles.teamsRow}>
            {DUMMY_LIVE_GAME.teams.map((team) => (
              <ThemedView key={team.id} style={styles.teamCard}>
                <ThemedText type="defaultSemiBold" style={styles.teamLabel}>
                  {team.label}
                </ThemedText>
                <ThemedText style={styles.teamPlayers}>
                  {team.players.join(' • ')}
                </ThemedText>
                <ThemedText style={styles.teamScore}>Current score: {team.currentScore}</ThemedText>
              </ThemedView>
            ))}
          </View>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Goal Score</ThemedText>
          <ThemedText type="title" style={styles.goalScore}>
            {DUMMY_LIVE_GAME.goalScore} pts
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Round History</ThemedText>
          <View style={styles.roundList}>
            {DUMMY_LIVE_GAME.rounds.map((round) => (
              <ThemedView key={round.id} style={styles.roundCard}>
                <View style={styles.roundHeader}>
                  <ThemedText type="defaultSemiBold">Round {round.number}</ThemedText>
                </View>
                <View style={styles.roundTeamsHeader}>
                  <ThemedText
                    style={[styles.roundHeaderLabel, styles.roundTeamName]}
                    numberOfLines={1}
                  >
                    Team
                  </ThemedText>
                  <ThemedText style={[styles.roundHeaderLabel, styles.roundStat]}>Bid/Books</ThemedText>
                  <ThemedText style={[styles.roundHeaderLabel, styles.roundDelta]}>Δ</ThemedText>
                  <ThemedText style={[styles.roundHeaderLabel, styles.roundTotal]}>Total</ThemedText>
                </View>
                <View style={styles.roundTeams}>
                  {round.teamSummaries.map((teamStats) => {
                    const team = teamLookup.get(teamStats.teamId);
                    if (!team) {
                      return null;
                    }

                    const deltaStyle =
                      teamStats.scoreChange >= 0 ? styles.roundPositive : styles.roundNegative;

                    return (
                      <View key={teamStats.teamId} style={styles.roundTeamRow}>
                        <ThemedText style={styles.roundTeamName}>{team.label}</ThemedText>
                        <ThemedText style={styles.roundStat}>
                          {teamStats.bid}/{teamStats.books}
                        </ThemedText>
                        <ThemedText style={[styles.roundDelta, deltaStyle]}>
                          {formatChange(teamStats.scoreChange)}
                        </ThemedText>
                        <ThemedText style={styles.roundTotal}>{teamStats.runningTotal}</ThemedText>
                      </View>
                    );
                  })}
                </View>
              </ThemedView>
            ))}
          </View>
        </ThemedView>

        {DUMMY_LIVE_GAME.pendingRound && (
          <ThemedView style={styles.pendingRoundCard}>
            <View style={styles.pendingHeader}>
              <ThemedText type="defaultSemiBold">Round {DUMMY_LIVE_GAME.pendingRound.roundNumber}</ThemedText>
              <ThemedText>Awaiting books</ThemedText>
            </View>
            <View style={styles.pendingBody}>
              {DUMMY_LIVE_GAME.pendingRound.bids.map((bid) => {
                const team = teamLookup.get(bid.teamId);
                if (!team) {
                  return null;
                }

                return (
                  <View key={bid.teamId} style={styles.pendingRow}>
                    <ThemedText style={styles.pendingTeam}>{team.label}</ThemedText>
                    <ThemedText style={styles.pendingBid}>{bid.bid} bid</ThemedText>
                  </View>
                );
              })}
            </View>
          </ThemedView>
        )}
      </ScrollView>

      <View pointerEvents="box-none" style={styles.fabRow}>
        <Pressable style={[styles.fab, styles.primaryFab]} onPress={() => {}}>
          <ThemedText style={styles.fabText}>Set Bids</ThemedText>
        </Pressable>
        <Pressable style={[styles.fab, styles.secondaryFab]} onPress={() => {}}>
          <ThemedText style={styles.fabText}>Log Books</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 160,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  teamsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  teamCard: {
    flexBasis: '48%',
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  teamLabel: {
    marginBottom: 6,
  },
  teamPlayers: {
    marginBottom: 6,
  },
  teamScore: {
    fontWeight: '600',
  },
  goalScore: {
    letterSpacing: 1,
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
  fabRow: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  pendingRoundCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(99,102,241,0.6)',
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 4,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingBody: {
    gap: 10,
  },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pendingTeam: {
    fontWeight: '600',
  },
  pendingBid: {
    fontWeight: '700',
  },
  fab: {
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryFab: {
    backgroundColor: '#6366f1',
  },
  secondaryFab: {
    backgroundColor: '#22c55e',
  },
  fabText: {
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});
