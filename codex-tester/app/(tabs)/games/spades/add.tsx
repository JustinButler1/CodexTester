import React from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

type TeamSummary = {
  id: string;
  label: string;
  players: string[];
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
  startedAt: string;
  rounds: RoundSnapshot[];
};

type PendingEntry = {
  teamId: string;
  bid: number;
  blind: boolean;
};

type PendingRoundState = {
  roundNumber: number;
  entries: PendingEntry[];
};

type BooksDraft = {
  teamId: string;
  books: number;
};

const DUMMY_LIVE_GAME: LiveGame = {
  teams: [
    {
      id: 'team-1',
      label: 'Avery & Kai',
      players: ['Avery', 'Kai'],
    },
    {
      id: 'team-2',
      label: 'Jess & Malik',
      players: ['Jess', 'Malik'],
    },
  ],
  goalScore: 500,
  startedAt: 'Apr 3, 2024',
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
};

const BID_VALUES = [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

const nextBidValue = (current: number, direction: 1 | -1) => {
  const index = BID_VALUES.findIndex((value) => value === current);
  if (index === -1) {
    return direction === 1 ? BID_VALUES[0] : BID_VALUES[BID_VALUES.length - 1];
  }
  const nextIndex = Math.min(BID_VALUES.length - 1, Math.max(0, index + direction));
  return BID_VALUES[nextIndex];
};

const formatChange = (value: number) => (value > 0 ? `+${value}` : `${value}`);

const calculateScoreChange = (bid: number, books: number, blind: boolean) => {
  if (bid === 0) {
    return books === 0 ? 100 : -100;
  }

  const base = bid * 10;
  const delta = books - bid;

  if (books < bid) {
    return blind ? -(base * 2) : -base;
  }

  const bagPoints = Math.max(0, delta);
  const blindBonus = blind ? base : 0;
  return base + bagPoints + blindBonus;
};

const createDraft = (
  teams: TeamSummary[],
  roundNumber: number,
  existing?: PendingRoundState | null,
): PendingRoundState => {
  if (existing) {
    return {
      roundNumber: existing.roundNumber,
      entries: existing.entries.map((entry) => ({ ...entry })),
    };
  }

  return {
    roundNumber,
    entries: teams.map((team) => ({ teamId: team.id, bid: 4, blind: false })),
  };
};

const buildEmptyBooksDraft = (teams: TeamSummary[]): BooksDraft[] =>
  teams.map((team) => ({ teamId: team.id, books: 0 }));

const extractRunningTotals = (rounds: RoundSnapshot[]) => {
  const totals = new Map<string, number>();
  rounds.forEach((round) => {
    round.teamSummaries.forEach((team) => {
      totals.set(team.teamId, team.runningTotal);
    });
  });
  return totals;
};

export default function LiveSpadesScreen() {
  const insets = useSafeAreaInsets();
  const teams = React.useMemo(() => DUMMY_LIVE_GAME.teams, []);
  const [rounds, setRounds] = React.useState<RoundSnapshot[]>(DUMMY_LIVE_GAME.rounds);
  const roundsCount = rounds.length;
  const [pendingRound, setPendingRound] = React.useState<PendingRoundState | null>(null);
  const [draftRound, setDraftRound] = React.useState<PendingRoundState>(() =>
    createDraft(teams, DUMMY_LIVE_GAME.rounds.length + 1),
  );
  const [booksDraft, setBooksDraft] = React.useState<BooksDraft[]>(() => buildEmptyBooksDraft(teams));
  const [isModalVisible, setModalVisible] = React.useState(false);
  const [isBooksModalVisible, setBooksModalVisible] = React.useState(false);

  const sheetOffset = React.useRef(new Animated.Value(0)).current;
  const teamLookup = React.useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);

  const runningTotals = React.useMemo(() => extractRunningTotals(rounds), [rounds]);
  const scoreLine = React.useMemo(() => {
    const [teamOne, teamTwo] = teams;
    const scoreOne = runningTotals.get(teamOne.id) ?? 0;
    const scoreTwo = runningTotals.get(teamTwo.id) ?? 0;
    return `${scoreOne} – ${scoreTwo}`;
  }, [runningTotals, teams]);

  React.useEffect(() => {
    if (!pendingRound) {
      setDraftRound(createDraft(teams, roundsCount + 1));
    }
  }, [pendingRound, roundsCount, teams]);

  const resetDraft = React.useCallback(
    (source?: PendingRoundState | null) => {
      setDraftRound(createDraft(teams, source?.roundNumber ?? roundsCount + 1, source));
    },
    [teams, roundsCount],
  );

  const openModal = React.useCallback(() => {
    resetDraft(pendingRound);
    sheetOffset.setValue(600);
    setModalVisible(true);
  }, [pendingRound, resetDraft, sheetOffset]);

  const closeModal = React.useCallback(() => {
    Animated.timing(sheetOffset, {
      toValue: 600,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      sheetOffset.setValue(0);
    });
  }, [sheetOffset]);

  React.useEffect(() => {
    if (isModalVisible) {
      Animated.spring(sheetOffset, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  }, [isModalVisible, sheetOffset]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            sheetOffset.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 120) {
            closeModal();
          } else {
            Animated.spring(sheetOffset, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [closeModal, sheetOffset],
  );

  const handleAdjustBid = React.useCallback((teamId: string, direction: 1 | -1) => {
    setDraftRound((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) =>
        entry.teamId === teamId
          ? { ...entry, bid: nextBidValue(entry.bid, direction) }
          : entry,
      ),
    }));
  }, []);

  const handleToggleBlind = React.useCallback((teamId: string) => {
    setDraftRound((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) =>
        entry.teamId === teamId
          ? { ...entry, blind: !entry.blind }
          : entry,
      ),
    }));
  }, []);

  const confirmDraft = React.useCallback(() => {
    setPendingRound({ ...draftRound });
    setBooksDraft(buildEmptyBooksDraft(teams));
    closeModal();
  }, [closeModal, draftRound, teams]);

  const handleOpenBooks = React.useCallback(() => {
    if (!pendingRound) {
      return;
    }
    setBooksDraft(buildEmptyBooksDraft(teams));
    setBooksModalVisible(true);
  }, [pendingRound, teams]);

  const confirmBooks = React.useCallback(() => {
    if (!pendingRound) {
      setBooksModalVisible(false);
      return;
    }

    const baseTotals = extractRunningTotals(rounds);
    const summaries = pendingRound.entries.map((entry) => {
      const booksEntry = booksDraft.find((item) => item.teamId === entry.teamId);
      const books = booksEntry ? booksEntry.books : 0;
      const scoreChange = calculateScoreChange(entry.bid, books, entry.blind);
      const runningTotal = (baseTotals.get(entry.teamId) ?? 0) + scoreChange;
      baseTotals.set(entry.teamId, runningTotal);

      return {
        teamId: entry.teamId,
        bid: entry.bid,
        books,
        scoreChange,
        runningTotal,
      };
    });

    const nextRoundNumber = pendingRound.roundNumber;
    const roundId = `round-${nextRoundNumber}`;

    setRounds((prev) => [
      ...prev,
      {
        id: roundId,
        number: nextRoundNumber,
        teamSummaries: summaries,
      },
    ]);

    setPendingRound(null);
    setBooksDraft(buildEmptyBooksDraft(teams));
    setBooksModalVisible(false);
  }, [booksDraft, pendingRound, rounds, teams]);

  const sheetTranslate = sheetOffset.interpolate({
    inputRange: [0, 600],
    outputRange: [0, 600],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 180,
          },
        ]}>
        <View style={styles.header}>
          <View style={styles.headerMeta}>
            <Text style={styles.headerLabel}>Live Spades</Text>
            <Text style={styles.headerDate}>{DUMMY_LIVE_GAME.startedAt}</Text>
          </View>
          <View style={styles.headerTeams}>
            {teams.map((team) => (
              <View key={team.id} style={styles.headerTeamPill}>
                <Text style={styles.headerTeamLabel}>{team.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.scoreBanner}>
            <Text style={styles.scoreBannerLabel}>Current Score</Text>
            <Text style={styles.scoreBannerValue}>{scoreLine}</Text>
            <Text style={styles.scoreGoal}>Goal · {DUMMY_LIVE_GAME.goalScore} pts</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Round History</Text>
          <View style={styles.roundList}>
            {rounds.map((round) => (
              <View key={round.id} style={styles.roundCard}>
                <View style={styles.roundHeader}>
                  <Text style={styles.roundHeading}>Round {round.number}</Text>
                </View>
                <View style={styles.roundColumns}>
                  <Text style={[styles.roundHeaderLabel, styles.roundTeamName]}>Team</Text>
                  <Text style={[styles.roundHeaderLabel, styles.roundStat]}>Bid</Text>
                  <Text style={[styles.roundHeaderLabel, styles.roundStat]}>Books</Text>
                  <Text style={[styles.roundHeaderLabel, styles.roundDelta]}>Δ</Text>
                  <Text style={[styles.roundHeaderLabel, styles.roundTotal]}>Total</Text>
                </View>
                {round.teamSummaries.map((teamSummary) => {
                  const team = teamLookup.get(teamSummary.teamId);
                  if (!team) {
                    return null;
                  }
                  const deltaStyle =
                    teamSummary.scoreChange >= 0 ? styles.roundPositive : styles.roundNegative;

                  return (
                    <View key={teamSummary.teamId} style={styles.roundRow}>
                      <Text style={styles.roundTeamName}>{team.label}</Text>
                      <Text style={styles.roundStat}>{teamSummary.bid}</Text>
                      <Text style={styles.roundStat}>{teamSummary.books}</Text>
                      <Text style={[styles.roundDelta, deltaStyle]}>
                        {formatChange(teamSummary.scoreChange)}
                      </Text>
                      <Text style={styles.roundTotal}>{teamSummary.runningTotal}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {pendingRound && (
          <View style={styles.pendingCard}>
            <View style={styles.pendingHeader}>
              <Text style={styles.pendingTitle}>Round {pendingRound.roundNumber}</Text>
              <Text style={styles.pendingStatus}>Awaiting books</Text>
            </View>
            <View style={styles.pendingBody}>
              {pendingRound.entries.map((entry) => {
                const team = teamLookup.get(entry.teamId);
                if (!team) {
                  return null;
                }
                return (
                  <View key={entry.teamId} style={styles.pendingRow}>
                    <Text style={styles.pendingTeam}>{team.label}</Text>
                    <View style={styles.pendingBidGroup}>
                      <Text style={styles.pendingBid}>{entry.bid} bid</Text>
                      {entry.blind && <Text style={styles.pendingBlind}>Blind</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <View pointerEvents="box-none" style={styles.fabRow}>
        <Pressable style={[styles.fabButton, styles.primaryFab]} onPress={openModal}>
          <Text style={styles.fabText}>Set Bids</Text>
        </Pressable>
        <Pressable
          style={[
            styles.fabButton,
            styles.secondaryFab,
            !pendingRound && styles.fabDisabled,
          ]}
          disabled={!pendingRound}
          onPress={handleOpenBooks}>
          <Text style={styles.fabText}>Log Books</Text>
        </Pressable>
      </View>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
        presentationStyle="overFullScreen">
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[styles.modalSheet, { transform: [{ translateY: sheetTranslate }] }]}
                {...panResponder.panHandlers}>
                <View style={styles.sheetHandleContainer}>
                  <View style={styles.sheetHandle} />
                </View>
                <Text style={styles.sheetTitle}>Round {draftRound.roundNumber} Bidding</Text>

                <View style={styles.sheetRoundSection}>
                  {draftRound.entries.map((entry) => {
                    const team = teamLookup.get(entry.teamId);
                    if (!team) {
                      return null;
                    }

                    return (
                      <View key={entry.teamId} style={styles.sheetRow}>
                        <Text style={styles.sheetTeamLabel}>{team.label}</Text>
                        <View style={styles.sheetControls}>
                          <Pressable
                            style={styles.adjustButton}
                            onPress={() => handleAdjustBid(entry.teamId, -1)}>
                            <Text style={styles.adjustLabel}>−</Text>
                          </Pressable>
                          <View style={styles.bidValueContainer}>
                            <Text style={styles.bidValue}>{entry.bid}</Text>
                          </View>
                          <Pressable
                            style={styles.adjustButton}
                            onPress={() => handleAdjustBid(entry.teamId, 1)}>
                            <Text style={styles.adjustLabel}>+</Text>
                          </Pressable>
                        </View>
                        <Pressable
                          style={[styles.blindToggle, entry.blind && styles.blindToggleActive]}
                          onPress={() => handleToggleBlind(entry.teamId)}>
                          <Text style={styles.blindToggleText}>
                            {entry.blind ? 'Blind' : 'Set Blind'}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.sheetFooter}>
                  <Pressable style={[styles.sheetAction, styles.sheetCancel]} onPress={closeModal}>
                    <Text style={styles.sheetActionText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.sheetAction, styles.sheetConfirm]} onPress={confirmDraft}>
                    <Text style={styles.sheetActionText}>Confirm</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={isBooksModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBooksModalVisible(false)}
        presentationStyle="overFullScreen">
        <TouchableWithoutFeedback onPress={() => setBooksModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalSheet, styles.booksSheet]}>
                <View style={styles.sheetHandleContainer}>
                  <View style={styles.sheetHandle} />
                </View>
                <Text style={styles.sheetTitle}>Log Books</Text>
                <View style={styles.booksBody}>
                  {booksDraft.map((entry) => {
                    const team = teamLookup.get(entry.teamId);
                    if (!team) {
                      return null;
                    }
                    return (
                      <View key={entry.teamId} style={styles.booksRow}>
                        <Text style={styles.booksTeam}>{team.label}</Text>
                        <View style={styles.booksCounter}>
                          <Pressable
                            style={styles.counterButton}
                            onPress={() =>
                              setBooksDraft((prev) =>
                                prev.map((item) =>
                                  item.teamId === entry.teamId && item.books > 0
                                    ? { ...item, books: item.books - 1 }
                                    : item,
                                ),
                              )
                            }>
                            <Text style={styles.counterLabel}>−</Text>
                          </Pressable>
                          <Text style={styles.booksValue}>{entry.books}</Text>
                          <Pressable
                            style={styles.counterButton}
                            onPress={() =>
                              setBooksDraft((prev) =>
                                prev.map((item) =>
                                  item.teamId === entry.teamId
                                    ? { ...item, books: item.books + 1 }
                                    : item,
                                ),
                              )
                            }>
                            <Text style={styles.counterLabel}>+</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.sheetFooter}>
                  <Pressable
                    style={[styles.sheetAction, styles.sheetCancel]}
                    onPress={() => setBooksModalVisible(false)}>
                    <Text style={styles.sheetActionText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.sheetAction, styles.sheetConfirm]}
                    onPress={confirmBooks}>
                    <Text style={styles.sheetActionText}>Save</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    gap: 24,
  },
  header: {
    borderRadius: 28,
    padding: 24,
    gap: 18,
    backgroundColor: Colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    shadowColor: '#08040F',
    shadowOpacity: 0.4,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 16,
  },
  headerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLabel: {
    color: Colors.dark.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerDate: {
    color: Colors.dark.textSecondary,
  },
  headerTeams: {
    flexDirection: 'row',
    gap: 14,
  },
  headerTeamPill: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: '#1D1A27',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  headerTeamLabel: {
    color: Colors.dark.textPrimary,
    fontWeight: '600',
  },
  scoreBanner: {
    alignItems: 'center',
    gap: 6,
  },
  scoreBannerLabel: {
    color: Colors.dark.textSecondary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  scoreBannerValue: {
    color: Colors.dark.textPrimary,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  scoreGoal: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
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
    padding: 18,
    backgroundColor: '#161221',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 12,
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
  roundColumns: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  roundHeaderLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  roundTeamName: {
    flex: 1.6,
    color: Colors.dark.textPrimary,
    fontWeight: '600',
  },
  roundStat: {
    flex: 0.6,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  roundDelta: {
    flex: 0.8,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  roundTotal: {
    flex: 0.8,
    textAlign: 'right',
    color: Colors.dark.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  roundPositive: {
    color: Colors.dark.positive,
  },
  roundNegative: {
    color: Colors.dark.negative,
  },
  pendingCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#251927',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(224,49,58,0.45)',
    gap: 12,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingTitle: {
    color: Colors.dark.textPrimary,
    fontWeight: '700',
    fontSize: 18,
  },
  pendingStatus: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pendingBody: {
    gap: 10,
  },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingTeam: {
    color: Colors.dark.textPrimary,
    fontWeight: '600',
  },
  pendingBidGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pendingBid: {
    color: Colors.dark.textPrimary,
    fontWeight: '700',
  },
  pendingBlind: {
    color: Colors.dark.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  fabRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  fabButton: {
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 16,
    shadowColor: '#050209',
    shadowOpacity: 0.48,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  primaryFab: {
    backgroundColor: Colors.dark.accent,
  },
  secondaryFab: {
    backgroundColor: '#2A2436',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  fabDisabled: {
    opacity: 0.4,
  },
  fabText: {
    color: Colors.dark.textPrimary,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 4, 10, 0.8)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#130F1C',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
    minHeight: '60%',
    gap: 24,
  },
  booksSheet: {
    minHeight: '45%',
  },
  sheetHandleContainer: {
    alignItems: 'center',
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 12,
  },
  sheetTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  sheetRoundSection: {
    gap: 32,
  },
  sheetRow: {
    gap: 18,
  },
  sheetTeamLabel: {
    color: Colors.dark.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  sheetControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
  },
  adjustButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: '#1F1A27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustLabel: {
    color: Colors.dark.textPrimary,
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 48,
  },
  bidValueContainer: {
    flex: 1,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bidValue: {
    color: Colors.dark.textPrimary,
    fontSize: 60,
    fontWeight: '800',
    letterSpacing: 2,
    lineHeight: 68,
  },
  blindToggle: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
  },
  blindToggleActive: {
    borderColor: 'rgba(224,49,58,0.6)',
    backgroundColor: 'rgba(224,49,58,0.2)',
  },
  blindToggleText: {
    color: Colors.dark.textPrimary,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  sheetAction: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetCancel: {
    backgroundColor: '#201B2A',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  sheetConfirm: {
    backgroundColor: Colors.dark.accent,
  },
  sheetActionText: {
    color: Colors.dark.textPrimary,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  booksBody: {
    gap: 16,
  },
  booksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  booksTeam: {
    color: Colors.dark.textPrimary,
    fontWeight: '600',
  },
  booksCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  counterButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: '#1F1A27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterLabel: {
    color: Colors.dark.textPrimary,
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 38,
  },
  booksValue: {
    color: Colors.dark.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'center',
  },
});
