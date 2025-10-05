import React from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const formatChange = (value: number) => (value > 0 ? `+${value}` : `${value}`);

const BID_VALUES = [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

const nextBidValue = (current: number, direction: 1 | -1) => {
  const index = BID_VALUES.findIndex((value) => value === current);
  if (index === -1) {
    return direction === 1 ? BID_VALUES[0] : BID_VALUES[0];
  }
  const nextIndex = Math.min(BID_VALUES.length - 1, Math.max(0, index + direction));
  return BID_VALUES[nextIndex];
};

const createDraft = (teams: TeamSummary[], existing?: PendingRoundState | null): PendingRoundState => {
  if (existing) {
    return {
      roundNumber: existing.roundNumber,
      entries: existing.entries.map((item) => ({ ...item })),
    };
  }

  return {
    roundNumber: DUMMY_LIVE_GAME.rounds.length + 1,
    entries: teams.map((team) => ({ teamId: team.id, bid: 4, blind: false })),
  };
};

export default function GamesScreen() {
  const insets = useSafeAreaInsets();
  const teamLookup = React.useMemo(() => {
    const map = new Map<string, TeamSummary>();
    DUMMY_LIVE_GAME.teams.forEach((team) => {
      map.set(team.id, team);
    });
    return map;
  }, []);

  const [pendingRound, setPendingRound] = React.useState<PendingRoundState | null>(null);
  const [isModalVisible, setModalVisible] = React.useState(false);
  const [draftRound, setDraftRound] = React.useState<PendingRoundState>(() =>
    createDraft(DUMMY_LIVE_GAME.teams),
  );

  const sheetOffset = React.useRef(new Animated.Value(0)).current;

  const resetDraft = React.useCallback(
    (source?: PendingRoundState | null) => {
      setDraftRound(createDraft(DUMMY_LIVE_GAME.teams, source));
    },
    [],
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

  const confirmDraft = React.useCallback(() => {
    setPendingRound({ ...draftRound, roundNumber: DUMMY_LIVE_GAME.rounds.length + 1 });
    closeModal();
  }, [closeModal, draftRound]);

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
          ? {
              ...entry,
              bid: nextBidValue(entry.bid, direction),
            }
          : entry,
      ),
    }));
  }, []);

  const handleToggleBlind = React.useCallback((teamId: string) => {
    setDraftRound((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) =>
        entry.teamId === teamId
          ? {
              ...entry,
              blind: !entry.blind,
            }
          : entry,
      ),
    }));
  }, []);

  const [teamOne, teamTwo] = DUMMY_LIVE_GAME.teams;
  const currentScoreLine = `${teamOne.currentScore} – ${teamTwo.currentScore}`;


  React.useEffect(() => {
    if (isModalVisible) {
      Animated.spring(sheetOffset, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  }, [isModalVisible, sheetOffset]);
  const sheetTranslate = sheetOffset.interpolate({
    inputRange: [0, 600],
    outputRange: [0, 600],
    extrapolate: 'clamp',
  });

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 140 },
        ]}>
        <ThemedView style={styles.summaryCard}>
          <View style={styles.teamRow}>
            <View style={styles.liveTeamPill}>
              <ThemedText style={styles.teamText}>{teamOne.label}</ThemedText>
            </View>
            <ThemedText style={styles.vsLabel}>vs</ThemedText>
            <View style={styles.liveTeamPill}>
              <ThemedText style={styles.teamText}>{teamTwo.label}</ThemedText>
            </View>
          </View>
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaLabel}>Current</ThemedText>
            <ThemedText style={styles.metaValue} type="title">
              {currentScoreLine}
            </ThemedText>
          </View>
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaLabel}>Goal</ThemedText>
            <ThemedText style={styles.metaValue}>{DUMMY_LIVE_GAME.goalScore} pts</ThemedText>
          </View>
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaLabel}>Started</ThemedText>
            <ThemedText style={styles.metaValue}>{DUMMY_LIVE_GAME.startedAt}</ThemedText>
          </View>
          <View style={styles.lineup}>
            <View style={styles.lineupRow}>
              <ThemedText style={styles.lineupLabel}>{teamOne.label}</ThemedText>
              <ThemedText style={styles.lineupPlayers}>{teamOne.players.join(' • ')}</ThemedText>
            </View>
            <View style={styles.lineupRow}>
              <ThemedText style={styles.lineupLabel}>{teamTwo.label}</ThemedText>
              <ThemedText style={styles.lineupPlayers}>{teamTwo.players.join(' • ')}</ThemedText>
            </View>
          </View>
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
                    numberOfLines={1}>
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

        {pendingRound && (
          <ThemedView style={styles.pendingRoundCard}>
            <View style={styles.pendingHeader}>
              <ThemedText type="defaultSemiBold">Round {pendingRound.roundNumber}</ThemedText>
              <ThemedText style={styles.pendingStatus}>Awaiting books</ThemedText>
            </View>
            <View style={styles.pendingBody}>
              {pendingRound.entries.map((entry) => {
                const team = teamLookup.get(entry.teamId);
                if (!team) {
                  return null;
                }

                return (
                  <View key={entry.teamId} style={styles.pendingRow}>
                    <ThemedText style={styles.pendingTeam}>{team.label}</ThemedText>
                    <View style={styles.pendingBidGroup}>
                      {entry.blind && (
                        <ThemedText style={styles.pendingBlind}>Blind</ThemedText>
                      )}
                      <ThemedText style={styles.pendingBid}>{entry.bid} bid</ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>
          </ThemedView>
        )}
      </ScrollView>

      <View pointerEvents="box-none" style={styles.fabRow}>
        <Pressable style={[styles.fab, styles.primaryFab]} onPress={openModal}>
          <ThemedText style={styles.fabText}>Set Bids</ThemedText>
        </Pressable>
        <Pressable style={[styles.fab, styles.secondaryFab]} onPress={() => {}}>
          <ThemedText style={styles.fabText}>Log Books</ThemedText>
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
                <View style={styles.sheetHeader}>
                  <ThemedText type="defaultSemiBold">Round {draftRound.roundNumber} Bidding</ThemedText>
                </View>
                <View style={styles.sheetBody}>
                  <View style={styles.sheetRoundRow}>
                    <ThemedText style={styles.sheetRoundLabel}>Round</ThemedText>
                    <ThemedText style={styles.sheetRoundValue}>{draftRound.roundNumber}</ThemedText>
                  </View>
                  {draftRound.entries.map((entry) => {
                    const team = teamLookup.get(entry.teamId);
                    if (!team) {
                      return null;
                    }

                    return (
                      <View key={entry.teamId} style={styles.sheetRow}>
                        <View style={styles.sheetRowHeader}>
                          <ThemedText style={styles.sheetTeamLabel}>{team.label}</ThemedText>
                        </View>
                        <View style={styles.sheetRowContent}>
                          <Pressable
                            style={[styles.adjustButton, styles.largeAdjust]}
                            onPress={() => handleAdjustBid(entry.teamId, -1)}>
                            <ThemedText style={styles.adjustLabel}>-</ThemedText>
                          </Pressable>
                          <View style={styles.bidValueContainer}>
                            <ThemedText style={styles.bidValue}>{entry.bid}</ThemedText>
                          </View>
                          <Pressable
                            style={[styles.adjustButton, styles.largeAdjust]}
                            onPress={() => handleAdjustBid(entry.teamId, 1)}>
                            <ThemedText style={styles.adjustLabel}>+</ThemedText>
                          </Pressable>
                        </View>
                        <View style={styles.blindContainer}>
                          <Pressable
                            style={[styles.blindToggle, entry.blind && styles.blindToggleActive]}
                            onPress={() => handleToggleBlind(entry.teamId)}>
                            <ThemedText style={styles.blindToggleText}>
                              {entry.blind ? 'Blind' : 'Set Blind'}
                            </ThemedText>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.sheetFooter}>
                  <Pressable style={[styles.sheetAction, styles.sheetCancel]} onPress={closeModal}>
                    <ThemedText style={styles.sheetActionText}>Cancel</ThemedText>
                  </Pressable>
                  <Pressable style={[styles.sheetAction, styles.sheetConfirm]} onPress={confirmDraft}>
                    <ThemedText style={styles.sheetActionText}>Confirm</ThemedText>
                  </Pressable>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 24,
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
  liveTeamPill: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.35)',
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
  lineup: {
    gap: 8,
    marginTop: 8,
  },
  lineupRow: {
    gap: 4,
  },
  lineupLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  lineupPlayers: {
    opacity: 0.8,
    fontSize: 13,
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
  pendingRoundCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    gap: 12,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingStatus: {
    fontSize: 12,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
  pendingBidGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingBlind: {
    fontSize: 12,
    opacity: 0.75,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  pendingBid: {
    fontWeight: '700',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    minHeight: '60%',
  },
  sheetHandleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sheetHeader: {
    marginBottom: 12,
  },
  sheetBody: {
    gap: 24,
  },
  sheetRoundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  sheetRoundLabel: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.7,
  },
  sheetRoundValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  sheetRow: {
    gap: 16,
  },
  sheetRowHeader: {
    marginBottom: 12,
  },
  sheetTeamLabel: {
    fontWeight: '700',
    fontSize: 20,
  },
  blindToggle: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.4)',
    alignSelf: 'center',
  },
  blindToggleActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: 'rgba(99, 102, 241, 0.6)',
  },
  blindToggleText: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  blindContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  sheetRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 28,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  adjustButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.18)',
  },
  largeAdjust: {
    width: 84,
  },
  adjustLabel: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
    lineHeight: 32,
  },
  bidValueContainer: {
    flex: 1,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bidValue: {
    fontSize: 54,
    fontWeight: '800',
    letterSpacing: 1.2,
    lineHeight: 62,
    textAlign: 'center',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  sheetAction: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetCancel: {
    backgroundColor: 'rgba(148,163,184,0.2)',
  },
  sheetConfirm: {
    backgroundColor: '#6366f1',
  },
  sheetActionText: {
    fontWeight: '700',
  },
});
