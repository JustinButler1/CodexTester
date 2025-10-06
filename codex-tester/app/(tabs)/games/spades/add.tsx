import React from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameDetail } from '@/constants/mock-games';
import { Colors } from '@/constants/theme';
import { spadesStore } from '@/src/shared/spades-store';

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

type EditDraft = {
  teams: TeamSummary[];
  goal: string;
  firstRoundSelfBid: boolean;
};

const DEFAULT_TEAMS: TeamSummary[] = [
  { id: 'team-1', label: 'Team One', players: ['', ''] },
  { id: 'team-2', label: 'Team Two', players: ['', ''] },
];

const DEFAULT_GOAL = 500;

const BID_VALUES = [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

const formatChange = (value: number) => (value > 0 ? `+${value}` : `${value}`);

const formatDisplayDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);

const nextBidValue = (current: number, direction: 1 | -1) => {
  const index = BID_VALUES.findIndex((value) => value === current);
  if (index === -1) {
    return direction === 1 ? BID_VALUES[0] : BID_VALUES[BID_VALUES.length - 1];
  }
  const nextIndex = Math.min(BID_VALUES.length - 1, Math.max(0, index + direction));
  return BID_VALUES[nextIndex];
};

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

const extractRunningTotals = (rounds: RoundSnapshot[], teams: TeamSummary[]) => {
  const totals = new Map<string, number>();
  teams.forEach((team) => totals.set(team.id, 0));

  rounds.forEach((round) => {
    round.teamSummaries.forEach((team) => {
      totals.set(team.teamId, team.runningTotal);
    });
  });

  return totals;
};

export default function LiveSpadesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [startedAt] = React.useState(() => new Date());
  const startedAtLabel = React.useMemo(() => formatDisplayDate(startedAt), [startedAt]);

  const [teams, setTeams] = React.useState<TeamSummary[]>(() =>
    DEFAULT_TEAMS.map((team) => ({ ...team, players: [...team.players] })),
  );
  const [goalScore, setGoalScore] = React.useState<number>(DEFAULT_GOAL);
  const [firstRoundSelfBid, setFirstRoundSelfBid] = React.useState(true);
  const [rounds, setRounds] = React.useState<RoundSnapshot[]>([]);
  const roundsCount = rounds.length;
  const [pendingRound, setPendingRound] = React.useState<PendingRoundState | null>(null);
  const [draftRound, setDraftRound] = React.useState<PendingRoundState>(() => createDraft(DEFAULT_TEAMS, 1));
  const [booksDraft, setBooksDraft] = React.useState<BooksDraft[]>(() => buildEmptyBooksDraft(DEFAULT_TEAMS));
  const [isModalVisible, setModalVisible] = React.useState(false);
  const [isBooksModalVisible, setBooksModalVisible] = React.useState(false);
  const [isEditModalVisible, setEditModalVisible] = React.useState(true);
  const [editDraft, setEditDraft] = React.useState<EditDraft>(() => ({
    teams: DEFAULT_TEAMS.map((team) => ({ ...team, players: [...team.players] })),
    goal: String(DEFAULT_GOAL),
    firstRoundSelfBid: true,
  }));
  const [isFinishConfirmVisible, setFinishConfirmVisible] = React.useState(false);

  const sheetOffset = React.useRef(new Animated.Value(0)).current;

  const teamLookup = React.useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const runningTotals = React.useMemo(() => extractRunningTotals(rounds, teams), [rounds, teams]);

  const scoreLine = React.useMemo(() => {
    const teamOne = teams[0];
    const teamTwo = teams[1];
    if (!teamOne || !teamTwo) {
      return '—';
    }

    const scoreOne = runningTotals.get(teamOne.id) ?? 0;
    const scoreTwo = runningTotals.get(teamTwo.id) ?? 0;
    return `${scoreOne} – ${scoreTwo}`;
  }, [runningTotals, teams]);

  const resetDraft = React.useCallback(
    (source?: PendingRoundState | null) => {
      const roundNumber = source?.roundNumber ?? roundsCount + 1;
      setDraftRound(createDraft(teams, roundNumber, source ?? null));
    },
    [teams, roundsCount],
  );

  const startSelfBidRound = React.useCallback(() => {
    if (!firstRoundSelfBid || roundsCount > 0) {
      return false;
    }
    setPendingRound(() => ({
      roundNumber: 1,
      entries: teams.map((team) => ({ teamId: team.id, bid: 0, blind: false })),
    }));
    setBooksDraft(buildEmptyBooksDraft(teams));
    return true;
  }, [firstRoundSelfBid, roundsCount, teams]);

  const openModal = React.useCallback(() => {
    if (startSelfBidRound()) {
      setBooksModalVisible(true);
      return;
    }

    resetDraft(pendingRound);
    sheetOffset.setValue(600);
    setModalVisible(true);
  }, [pendingRound, resetDraft, sheetOffset, startSelfBidRound]);

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
    const roundNumber = draftRound.roundNumber ?? roundsCount + 1;
    setPendingRound({
      roundNumber,
      entries: draftRound.entries.map((entry) => ({ ...entry })),
    });
    setBooksDraft(buildEmptyBooksDraft(teams));
    closeModal();
  }, [draftRound, closeModal, teams, roundsCount]);

  const handleOpenBooks = React.useCallback(() => {
    if (!pendingRound) {
      if (startSelfBidRound()) {
        setBooksModalVisible(true);
      }
      return;
    }
    setBooksDraft(buildEmptyBooksDraft(teams));
    setBooksModalVisible(true);
  }, [pendingRound, startSelfBidRound, teams]);

  const confirmBooks = React.useCallback(() => {
    if (!pendingRound) {
      setBooksModalVisible(false);
      return;
    }

    const roundNumber = pendingRound.roundNumber ?? roundsCount + 1;
    const isSelfBidRound = firstRoundSelfBid && roundNumber === 1;
    const baseTotals = extractRunningTotals(rounds, teams);
    const summaries = pendingRound.entries.map((entry) => {
      const booksEntry = booksDraft.find((item) => item.teamId === entry.teamId);
      const books = booksEntry ? booksEntry.books : 0;
      const entryBid = isSelfBidRound ? books : entry.bid;
      const scoreChange = calculateScoreChange(entryBid, books, entry.blind);
      const runningTotal = (baseTotals.get(entry.teamId) ?? 0) + scoreChange;
      baseTotals.set(entry.teamId, runningTotal);

      return {
        teamId: entry.teamId,
        bid: entryBid,
        books,
        scoreChange,
        runningTotal,
      };
    });

    const roundId = `round-${roundNumber}`;

    setRounds((prev) => [
      ...prev,
      {
        id: roundId,
        number: roundNumber,
        teamSummaries: summaries,
      },
    ]);

    setPendingRound(null);
    setBooksDraft(buildEmptyBooksDraft(teams));
    setBooksModalVisible(false);
  }, [booksDraft, firstRoundSelfBid, pendingRound, rounds, roundsCount, teams]);

  const openEditModal = React.useCallback(() => {
    setEditDraft({
      teams: teams.map((team) => ({ ...team, players: [...team.players] })),
      goal: String(goalScore),
      firstRoundSelfBid,
    });
    setEditModalVisible(true);
  }, [firstRoundSelfBid, goalScore, teams]);

  const closeEditModal = React.useCallback(() => {
    setEditModalVisible(false);
  }, []);

  const handleDraftTeamLabel = React.useCallback((teamId: string, value: string) => {
    setEditDraft((prev) => ({
      ...prev,
      teams: prev.teams.map((team) =>
        team.id === teamId ? { ...team, label: value } : team,
      ),
    }));
  }, []);

  const handleDraftPlayer = React.useCallback((teamId: string, index: number, value: string) => {
    setEditDraft((prev) => ({
      ...prev,
      teams: prev.teams.map((team) =>
        team.id === teamId
          ? {
              ...team,
              players: team.players.map((player, playerIndex) =>
                playerIndex === index ? value : player,
              ),
            }
          : team,
      ),
    }));
  }, []);

  const handleDraftGoal = React.useCallback((value: string) => {
    setEditDraft((prev) => ({
      ...prev,
      goal: value.replace(/[^0-9]/g, ''),
    }));
  }, []);

  const handleDraftSelfBid = React.useCallback((value: boolean) => {
    setEditDraft((prev) => ({
      ...prev,
      firstRoundSelfBid: value,
    }));
  }, []);

  const handleConfirmEdit = React.useCallback(() => {
    const sanitizedTeams = editDraft.teams.map((team, index) => ({
      ...team,
      label: team.label.trim() || `Team ${index + 1}`,
      players: team.players.map((player) => player.trim()),
    }));

    const parsedGoal = Number.parseInt(editDraft.goal, 10);
    const nextGoal = Number.isNaN(parsedGoal) ? goalScore : parsedGoal;
    const nextSelfBid = editDraft.firstRoundSelfBid;

    const updatedPending = pendingRound
      ? {
          roundNumber: pendingRound.roundNumber,
          entries: sanitizedTeams.map((team) => {
            const existing = pendingRound.entries.find((entry) => entry.teamId === team.id);
            return existing ? { ...existing, teamId: team.id } : { teamId: team.id, bid: 4, blind: false };
          }),
        }
      : null;
    const roundNumber = updatedPending?.roundNumber ?? roundsCount + 1;

    setTeams(sanitizedTeams);
    setGoalScore(nextGoal);
    setFirstRoundSelfBid(nextSelfBid);
    setBooksDraft(buildEmptyBooksDraft(sanitizedTeams));
    setPendingRound(updatedPending);
    setDraftRound(createDraft(sanitizedTeams, roundNumber, updatedPending));
    setEditDraft({
      teams: sanitizedTeams.map((team) => ({ ...team, players: [...team.players] })),
      goal: String(nextGoal),
      firstRoundSelfBid: nextSelfBid,
    });
    setEditModalVisible(false);
  }, [editDraft, goalScore, pendingRound, roundsCount]);

  const handleFinishPress = React.useCallback(() => {
    setFinishConfirmVisible(true);
  }, []);

  const handleCancelFinish = React.useCallback(() => {
    setFinishConfirmVisible(false);
  }, []);

  const handleConfirmFinish = React.useCallback(() => {
    const teamOne = teams[0];
    const teamTwo = teams[1];
    if (!teamOne || !teamTwo) {
      setFinishConfirmVisible(false);
      router.back();
      return;
    }

    const totals = extractRunningTotals(rounds, teams);
    const teamOneScore = totals.get(teamOne.id) ?? 0;
    const teamTwoScore = totals.get(teamTwo.id) ?? 0;
    const finalScore = `${teamOneScore} – ${teamTwoScore}`;
    const winningTeam: 'teamOne' | 'teamTwo' =
      teamTwoScore > teamOneScore ? 'teamTwo' : 'teamOne';

    const detailRounds: GameDetail['rounds'] = rounds.map((round) => ({
      number: round.number,
      teamSummaries: round.teamSummaries.map((teamSummary) => {
        const team = teams.find((candidate) => candidate.id === teamSummary.teamId);
        return {
          teamLabel: team?.label ?? '',
          bid: teamSummary.bid,
          books: teamSummary.books,
          scoreChange: teamSummary.scoreChange,
          runningTotal: teamSummary.runningTotal,
        };
      }),
    }));

    const detail: GameDetail = {
      id: `game-${Date.now()}`,
      teamOne: teamOne.label,
      teamTwo: teamTwo.label,
      winningTeam,
      finalScore,
      date: formatDisplayDate(new Date()),
      goalScore,
      rounds: detailRounds,
    };

    spadesStore.addGame(detail);
    setFinishConfirmVisible(false);
    router.back();
  }, [goalScore, rounds, router, teams]);

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
            paddingBottom: insets.bottom + 200,
          },
        ]}>
        <View style={styles.header}>
          <View style={styles.headerMeta}>
            <View>
              <Text style={styles.headerLabel}>Live Spades</Text>
              <Text style={styles.headerDate}>{startedAtLabel}</Text>
            </View>
            <Pressable style={styles.editChip} onPress={openEditModal}>
              <Text style={styles.editChipText}>Edit</Text>
            </Pressable>
          </View>
          {teams.length > 0 && (
            <View style={styles.headerTeams}>
              {teams.map((team) => (
                <View key={team.id} style={styles.headerTeamPill}>
                  <Text style={styles.headerTeamLabel}>{team.label}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.scoreBanner}>
            <Text style={styles.scoreBannerLabel}>Current Score</Text>
            <Text style={styles.scoreBannerValue}>{scoreLine}</Text>
            <Text style={styles.scoreGoal}>Goal · {goalScore} pts</Text>
          </View>
          {teams.length > 0 && (
            <View style={styles.lineup}>
              {teams.map((team) => {
                const playerNames = team.players.filter((player) => player.trim().length > 0);
                return (
                  <View key={`${team.id}-lineup`} style={styles.lineupRow}>
                    <Text style={styles.lineupLabel}>{team.label}</Text>
                    <Text style={styles.lineupPlayers}>
                      {playerNames.length ? playerNames.join(' • ') : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Round History</Text>
          {rounds.length === 0 ? (
            <View style={styles.emptyRounds}>
              <Text style={styles.emptyRoundsTitle}>No rounds recorded</Text>
              <Text style={styles.emptyRoundsSubtitle}>Tap Set Bids to track your first round.</Text>
            </View>
          ) : (
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
          )}
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
                const isSelfBidPending = firstRoundSelfBid && pendingRound.roundNumber === 1;
                return (
                  <View key={entry.teamId} style={styles.pendingRow}>
                    <Text style={styles.pendingTeam}>{team.label}</Text>
                    <View style={styles.pendingBidGroup}>
                      <Text style={styles.pendingBid}>
                        {isSelfBidPending ? 'Self bid' : `${entry.bid} bid`}
                      </Text>
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
          style={[styles.fabButton, styles.secondaryFab, !pendingRound && styles.fabDisabled]}
          disabled={!pendingRound}
          onPress={handleOpenBooks}>
          <Text style={styles.fabText}>Log Books</Text>
        </Pressable>
        <Pressable style={[styles.fabButton, styles.finishFab]} onPress={handleFinishPress}>
          <Text style={styles.fabText}>Finish Game</Text>
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

      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
        presentationStyle="overFullScreen">
        <TouchableWithoutFeedback onPress={closeEditModal}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalSheet, styles.editSheet]}>
                <View style={styles.sheetHandleContainer}>
                  <View style={styles.sheetHandle} />
                </View>
                <Text style={styles.sheetTitle}>Edit Match Setup</Text>
                <ScrollView contentContainerStyle={styles.editContent} showsVerticalScrollIndicator={false}>
                  {editDraft.teams.map((team, teamIndex) => (
                    <View key={team.id} style={styles.editTeamBlock}>
                      <Text style={styles.editLabel}>Team Name</Text>
                      <TextInput
                        style={styles.editInput}
                        value={team.label}
                        onChangeText={(value) => handleDraftTeamLabel(team.id, value)}
                        placeholder={`Team ${teamIndex + 1}`}
                        placeholderTextColor={Colors.dark.textSecondary}
                      />
                      <View style={styles.editPlayers}>
                        {team.players.map((player, index) => (
                          <View key={`${team.id}-player-${index}`} style={styles.editPlayerField}>
                            <Text style={styles.editLabel}>Player {index + 1}</Text>
                            <TextInput
                              style={styles.editInput}
                              value={player}
                              onChangeText={(value) => handleDraftPlayer(team.id, index, value)}
                              placeholder="Name"
                              placeholderTextColor={Colors.dark.textSecondary}
                            />
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                  <View style={styles.editTeamBlock}>
                    <Text style={styles.editLabel}>Goal Score</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editDraft.goal}
                      onChangeText={handleDraftGoal}
                      keyboardType="number-pad"
                      placeholder={String(DEFAULT_GOAL)}
                      placeholderTextColor={Colors.dark.textSecondary}
                    />
                  </View>
                  <View style={[styles.editTeamBlock, styles.editToggleBlock]}>
                    <View style={styles.editToggleRow}>
                      <View style={styles.editToggleTextGroup}>
                        <Text style={styles.editToggleLabel}>First round bids itself</Text>
                        <Text style={styles.editToggleHint}>
                          Skip bidding for round one and score directly from logged books.
                        </Text>
                      </View>
                      <Switch
                        value={editDraft.firstRoundSelfBid}
                        onValueChange={handleDraftSelfBid}
                        trackColor={{ false: '#3F3A48', true: Colors.dark.accentMuted }}
                        thumbColor={editDraft.firstRoundSelfBid ? Colors.dark.accent : '#7B748A'}
                      />
                    </View>
                  </View>
                </ScrollView>
                <View style={styles.sheetFooter}>
                  <Pressable style={[styles.sheetAction, styles.sheetCancel]} onPress={closeEditModal}>
                    <Text style={styles.sheetActionText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.sheetAction, styles.sheetConfirm]} onPress={handleConfirmEdit}>
                    <Text style={styles.sheetActionText}>Confirm</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={isFinishConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelFinish}
        presentationStyle="overFullScreen">
        <TouchableWithoutFeedback onPress={handleCancelFinish}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalSheet, styles.confirmSheet]}>
                <View style={styles.sheetHandleContainer}>
                  <View style={styles.sheetHandle} />
                </View>
                <Text style={styles.confirmTitle}>Finish this game?</Text>
                <Text style={styles.confirmSubtitle}>
                  This logs the match to the Spades library with its current rounds.
                </Text>
                <View style={styles.sheetFooter}>
                  <Pressable style={[styles.sheetAction, styles.sheetCancel]} onPress={handleCancelFinish}>
                    <Text style={styles.sheetActionText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.sheetAction, styles.sheetConfirm]} onPress={handleConfirmFinish}>
                    <Text style={styles.sheetActionText}>Finish</Text>
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
    marginTop: 4,
  },
  editChip: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: '#231927',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  editChipText: {
    color: Colors.dark.textPrimary,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
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
  lineup: {
    marginTop: 12,
    gap: 10,
  },
  lineupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lineupLabel: {
    color: Colors.dark.textPrimary,
    fontWeight: '600',
  },
  lineupPlayers: {
    color: Colors.dark.textSecondary,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  emptyRounds: {
    borderRadius: 24,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    backgroundColor: '#161221',
    alignItems: 'center',
    gap: 8,
  },
  emptyRoundsTitle: {
    color: Colors.dark.textPrimary,
    fontWeight: '700',
  },
  emptyRoundsSubtitle: {
    color: Colors.dark.textSecondary,
    textAlign: 'center',
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
    flexWrap: 'wrap',
    gap: 16,
  },
  fabButton: {
    borderRadius: 999,
    paddingHorizontal: 26,
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
  finishFab: {
    backgroundColor: Colors.dark.negative,
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
  booksSheet: {
    minHeight: '45%',
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
  editSheet: {
    minHeight: '65%',
  },
  editContent: {
    gap: 24,
    paddingBottom: 12,
  },
  editTeamBlock: {
    gap: 14,
  },
  editLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  editInput: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    backgroundColor: '#1F1A27',
    color: Colors.dark.textPrimary,
    fontSize: 16,
  },
  editPlayers: {
    gap: 12,
  },
  editPlayerField: {
    gap: 8,
  },
  editToggleBlock: {
    paddingTop: 8,
  },
  editToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  editToggleTextGroup: {
    flex: 1,
    gap: 6,
  },
  editToggleLabel: {
    color: Colors.dark.textPrimary,
    fontWeight: '700',
  },
  editToggleHint: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  confirmSheet: {
    minHeight: '30%',
    justifyContent: 'space-between',
  },
  confirmTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  confirmSubtitle: {
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
