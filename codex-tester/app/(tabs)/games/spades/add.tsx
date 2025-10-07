import { useFocusEffect } from '@react-navigation/native';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/shared/auth-context';
import {
  SpadesRound,
  SpadesTeam,
  createSpadesGame,
  fetchTeamById,
  fetchTeamsForUser,
} from '@/src/shared/spades-store';

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

const initialHandDraft = {
  teamOneBid: '4',
  teamOneBooks: '4',
  teamOneBlind: false,
  teamTwoBid: '4',
  teamTwoBooks: '4',
  teamTwoBlind: false,
};

export default function LiveSpadesGameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [startedAt] = React.useState(() => new Date());
  const [availableTeams, setAvailableTeams] = React.useState<SpadesTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = React.useState(true);
  const [teamOne, setTeamOne] = React.useState<SpadesTeam | null>(null);
  const [teamTwo, setTeamTwo] = React.useState<SpadesTeam | null>(null);
  const [teamTwoSource, setTeamTwoSource] = React.useState<'scan' | null>(null);
  const [goalScore, setGoalScore] = React.useState('500');
  const [rounds, setRounds] = React.useState<SpadesRound[]>([]);
  const [isHandModalVisible, setHandModalVisible] = React.useState(false);
  const [handDraft, setHandDraft] = React.useState(initialHandDraft);
  const [teamPickerSlot, setTeamPickerSlot] = React.useState<1 | 2 | null>(null);
  const [isSubmittingGame, setSubmittingGame] = React.useState(false);
  const [teamsError, setTeamsError] = React.useState<string | null>(null);
  const [teamScannerVisible, setTeamScannerVisible] = React.useState(false);
  const [teamScannerPermission, requestTeamScannerPermission] = useCameraPermissions();
  const [teamScannerRequesting, setTeamScannerRequesting] = React.useState(false);
  const [teamScannerHandled, setTeamScannerHandled] = React.useState(false);
  const [teamScannerError, setTeamScannerError] = React.useState<string | null>(null);
  const scannedTeamRef = React.useRef<SpadesTeam | null>(null);
  const teamOneRef = React.useRef<SpadesTeam | null>(null);
  const teamTwoRef = React.useRef<SpadesTeam | null>(null);
  const teamTwoSourceRef = React.useRef<'scan' | null>(null);

  const loadTeams = React.useCallback(async () => {
    if (!user) {
      setAvailableTeams([]);
      setTeamOne(null);
      setTeamTwo(null);
      setTeamTwoSource(null);
      setLoadingTeams(false);
      return;
    }

    setLoadingTeams(true);
    setTeamsError(null);
    try {
      const teams = await fetchTeamsForUser(user.id);
      setAvailableTeams(teams);

      const teamMap = new Map(teams.map((team) => [team.id, team]));
      
      // Preserve current team states via refs (avoid stale closures)
      const currentTeamOne = teamOneRef.current;
      const currentTeamTwo = teamTwoRef.current;
      const currentTeamTwoSource = teamTwoSourceRef.current;
      
      const nextTeamOne =
        (currentTeamOne && teamMap.get(currentTeamOne.id)) ?? teams[0] ?? null;
      setTeamOne(nextTeamOne ?? null);

      // Check if we have a scanned team that should be preserved
      const scannedTeam = scannedTeamRef.current;
      const shouldKeepTeamTwo = 
        (currentTeamTwoSource === 'scan' && currentTeamTwo && currentTeamTwo.id !== nextTeamOne?.id) ||
        (scannedTeam && scannedTeam.id !== nextTeamOne?.id);

      if (shouldKeepTeamTwo) {
        // Keep the scanned team (prefer the ref if available)
        const teamToKeep = scannedTeam || currentTeamTwo;
        if (teamToKeep) {
          setTeamTwo(teamToKeep);
          setTeamTwoSource('scan');
        }
      } else if (currentTeamTwoSource !== 'scan') {
        // Only clear if it wasn't a scanned team
        setTeamTwo(null);
        setTeamTwoSource(null);
        scannedTeamRef.current = null;
      }
    } catch (error) {
      console.error('Failed to load teams', error);
      setTeamsError('Unable to load teams. Pull to refresh or try again soon.');
    } finally {
      setLoadingTeams(false);
    }
  }, [user]);

  // Keep refs in sync with state
  React.useEffect(() => {
    teamOneRef.current = teamOne;
  }, [teamOne]);

  React.useEffect(() => {
    teamTwoRef.current = teamTwo;
  }, [teamTwo]);

  React.useEffect(() => {
    teamTwoSourceRef.current = teamTwoSource;
  }, [teamTwoSource]);

  React.useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useFocusEffect(
    React.useCallback(() => {
      loadTeams();
    }, [loadTeams]),
  );

  React.useEffect(() => {
    if (!teamScannerVisible) {
      setTeamScannerHandled(false);
      setTeamScannerError(null);
    }
  }, [teamScannerVisible]);

  const handleCloseTeamScanner = React.useCallback(() => {
    setTeamScannerVisible(false);
    setTeamScannerHandled(false);
    setTeamScannerError(null);
  }, []);

  const handleOpenTeamScanner = React.useCallback(async () => {
    if (teamScannerRequesting) {
      return;
    }

    if (teamScannerPermission?.granted) {
      setTeamScannerHandled(false);
      setTeamScannerVisible(true);
      return;
    }

    setTeamScannerRequesting(true);
    try {
      const permissionResult = await requestTeamScannerPermission?.();
      const granted = permissionResult?.granted ?? teamScannerPermission?.granted ?? false;
      if (granted) {
        setTeamScannerHandled(false);
        setTeamScannerVisible(true);
      } else {
        Alert.alert('Camera permission needed', 'Allow camera access to scan team QR codes.');
      }
    } catch (error) {
      console.error('Failed to request camera permission', error);
      Alert.alert('Camera error', 'Could not access the camera. Try again later.');
    } finally {
      setTeamScannerRequesting(false);
    }
  }, [requestTeamScannerPermission, teamScannerPermission?.granted, teamScannerRequesting]);

  const handleTeamQrScanned = React.useCallback(
    async (scan: BarcodeScanningResult) => {
      if (teamScannerHandled) {
        return;
      }
      setTeamScannerHandled(true);
      try {
        const parsed = Linking.parse(scan?.data ?? '');
        const pickFirstString = (value: unknown): string | undefined => {
          if (Array.isArray(value)) {
            const first = value[0];
            return typeof first === 'string' ? first : undefined;
          }
          return typeof value === 'string' ? value : undefined;
        };
        const scannedTeamId = pickFirstString(parsed?.queryParams?.teamId);
        if (!scannedTeamId) {
          setTeamScannerError('Invalid team QR code. Scan a code generated from team details.');
          setTeamScannerHandled(false);
          return;
        }
        if (teamOne?.id === scannedTeamId) {
          setTeamScannerError('Team 2 must be different from Team 1.');
          setTeamScannerHandled(false);
          return;
        }

        let fetchedTeam: SpadesTeam | null = null;
        try {
          fetchedTeam = await fetchTeamById(scannedTeamId);
        } catch (fetchError) {
          console.error('Failed to load scanned team', fetchError);
          setTeamScannerError('Unable to load the scanned team.');
          setTeamScannerHandled(false);
          return;
        }

        if (!fetchedTeam) {
          setTeamScannerError('Team not found or has been archived.');
          setTeamScannerHandled(false);
          return;
        }

        // Set the team state immediately and ensure it persists
        scannedTeamRef.current = fetchedTeam;
        setTeamTwo(fetchedTeam);
        setTeamTwoSource('scan');
        setRounds([]);
        setHandDraft(initialHandDraft);
        
        // Close scanner after a brief delay to ensure state is set
        setTimeout(() => {
          handleCloseTeamScanner();
        }, 100);
      } catch (error) {
        console.error('Failed to parse team QR code', error);
        setTeamScannerError('Could not read that QR code. Try again.');
        setTeamScannerHandled(false);
      }
    },
    [handleCloseTeamScanner, teamOne?.id, teamScannerHandled],
  );

  const handleOpenTeamPicker = React.useCallback(
    (slot: 1 | 2) => {
      if (loadingTeams) {
        return;
      }
      if (slot === 1) {
        setTeamPickerSlot(1);
      } else {
        handleOpenTeamScanner();
      }
    },
    [handleOpenTeamScanner, loadingTeams],
  );

  const handleSelectTeam = React.useCallback(
    (team: SpadesTeam) => {
      if (teamPickerSlot === 1) {
        setTeamOne(team);
        if (teamTwo?.id === team.id) {
          setTeamTwo(null);
          setTeamTwoSource(null);
          scannedTeamRef.current = null;
        }
      }
      setRounds([]);
      setHandDraft(initialHandDraft);
      setTeamPickerSlot(null);
    },
    [teamPickerSlot, teamTwo?.id],
  );

  const handleGoalChange = React.useCallback((value: string) => {
    setGoalScore(value.replace(/[^0-9]/g, ''));
  }, []);

  const totals = React.useMemo(() => {
    if (rounds.length === 0) {
      return { t1: 0, t2: 0 };
    }
    const last = rounds[rounds.length - 1];
    const t1 = teamOne ? last.teamSummaries.find((entry) => entry.teamId === teamOne.id)?.runningTotal ?? 0 : 0;
    const t2 = teamTwo ? last.teamSummaries.find((entry) => entry.teamId === teamTwo.id)?.runningTotal ?? 0 : 0;
    return { t1, t2 };
  }, [rounds, teamOne, teamTwo]);

  const scoreLine = `${totals.t1} – ${totals.t2}`;

  const handleOpenHandModal = React.useCallback(() => {
    if (!teamOne || !teamTwo) {
      Alert.alert('Select teams', 'Choose Team 1 and Team 2 before adding hands.');
      return;
    }
    setHandDraft((prev) => ({
      ...prev,
      teamOneBid: prev.teamOneBid || '4',
      teamTwoBid: prev.teamTwoBid || '4',
    }));
    setHandModalVisible(true);
  }, [teamOne, teamTwo]);

  const handleUpdateDraft = React.useCallback(
    (key: keyof typeof initialHandDraft, value: string | boolean) => {
      setHandDraft((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  const parseDraftValue = (value: string, fallback: number) => {
    const next = Number.parseInt(value, 10);
    return Number.isFinite(next) ? next : fallback;
  };

  const handleConfirmHand = React.useCallback(() => {
    if (!teamOne || !teamTwo) {
      setHandModalVisible(false);
      return;
    }

    const teamOneBid = parseDraftValue(handDraft.teamOneBid, 0);
    const teamOneBooks = parseDraftValue(handDraft.teamOneBooks, 0);
    const teamTwoBid = parseDraftValue(handDraft.teamTwoBid, 0);
    const teamTwoBooks = parseDraftValue(handDraft.teamTwoBooks, 0);

    if (teamOneBid < 0 || teamTwoBid < 0) {
      Alert.alert('Invalid bid', 'Bids cannot be negative.');
      return;
    }
    if (teamOneBooks < 0 || teamTwoBooks < 0) {
      Alert.alert('Invalid books', 'Book counts cannot be negative.');
      return;
    }

    const teamOneDelta = calculateScoreChange(teamOneBid, teamOneBooks, handDraft.teamOneBlind);
    const teamTwoDelta = calculateScoreChange(teamTwoBid, teamTwoBooks, handDraft.teamTwoBlind);

    const previousTotals = rounds.length
      ? rounds[rounds.length - 1].teamSummaries.reduce<Record<string, number>>((map, entry) => {
          map[entry.teamId] = entry.runningTotal;
          return map;
        }, {})
      : {};

    const nextRound: SpadesRound = {
      number: rounds.length + 1,
      teamSummaries: [
        {
          teamId: teamOne.id,
          teamLabel: teamOne.label,
          bid: teamOneBid,
          books: teamOneBooks,
          scoreChange: teamOneDelta,
          runningTotal: (previousTotals[teamOne.id] ?? 0) + teamOneDelta,
        },
        {
          teamId: teamTwo.id,
          teamLabel: teamTwo.label,
          bid: teamTwoBid,
          books: teamTwoBooks,
          scoreChange: teamTwoDelta,
          runningTotal: (previousTotals[teamTwo.id] ?? 0) + teamTwoDelta,
        },
      ],
    };

    setRounds((prev) => [...prev, nextRound]);
    setHandModalVisible(false);
  }, [handDraft, rounds, teamOne, teamTwo]);

  const handleUndoLastHand = React.useCallback(() => {
    setRounds((prev) => prev.slice(0, -1));
  }, []);

  const handleFinishGame = React.useCallback(async () => {
    if (!user || !teamOne || !teamTwo) {
      Alert.alert('Missing teams', 'Select both teams before finishing the game.');
      return;
    }

    if (rounds.length === 0) {
      Alert.alert('No hands recorded', 'Add at least one hand before finishing.');
      return;
    }

    const goal = Number.parseInt(goalScore, 10);
    const parsedGoal = Number.isFinite(goal) ? goal : 500;

    setSubmittingGame(true);
    try {
      await createSpadesGame({
        createdBy: user.id,
        team1Id: teamOne.id,
        team2Id: teamTwo.id,
        goalScore: parsedGoal,
        rounds,
        team1Members: teamOne.members,
        team2Members: teamTwo.members,
        startedAt,
        endedAt: new Date(),
      });
      Alert.alert('Game recorded', 'The match has been added to your library.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Failed to save game', error);
      Alert.alert('Unable to save', 'Check your connection and try again.');
    } finally {
      setSubmittingGame(false);
    }
  }, [goalScore, rounds, router, startedAt, teamOne, teamTwo, user]);

  const teamPickerVisible = teamPickerSlot === 1;
  const filteredTeams = React.useMemo(() => {
    if (teamPickerSlot !== 1) {
      return availableTeams;
    }
    return availableTeams.filter((team) => team.id !== teamTwo?.id);
  }, [availableTeams, teamPickerSlot, teamTwo?.id]);

  const renderRound = (round: SpadesRound) => {
    const teamOneEntry = teamOne
      ? round.teamSummaries.find((summary) => summary.teamId === teamOne.id)
      : undefined;
    const teamTwoEntry = teamTwo
      ? round.teamSummaries.find((summary) => summary.teamId === teamTwo.id)
      : undefined;

    return (
      <View key={`round-${round.number}`} style={styles.roundCard}>
        <View style={styles.roundHeader}>
          <Text style={styles.roundHeading}>Hand {round.number}</Text>
        </View>
        {[teamOneEntry, teamTwoEntry].map((entry, index) => {
          if (!entry) {
            return null;
          }
          const isPositive = entry.scoreChange >= 0;
          return (
            <View key={`${round.number}-${entry.teamId}-${index}`} style={styles.roundRow}>
              <View style={styles.roundTeamInfo}>
                <Text style={styles.roundTeamName}>{entry.teamLabel}</Text>
                <Text style={styles.roundBidBooks}>
                  Bid {entry.bid} · {entry.books} books
                </Text>
              </View>
              <Text style={[styles.roundDelta, isPositive ? styles.roundPositive : styles.roundNegative]}>
                {isPositive ? `+${entry.scoreChange}` : entry.scoreChange}
              </Text>
              <Text style={styles.roundTotal}>{entry.runningTotal}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const loadingState = loadingTeams && availableTeams.length === 0;
  const noTeams = !loadingTeams && availableTeams.length === 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Live Spades Game</Text>
          <Text style={styles.subtitle}>
            Track each hand as you play. When you finish, the match will be saved to your library.
          </Text>
        </View>

        {loadingState ? (
          <View style={styles.loadingTeams}>
            <ActivityIndicator size="large" color={Colors.dark.accent} />
            <Text style={styles.loadingTeamsLabel}>Loading your teams…</Text>
          </View>
        ) : null}

        {teamsError ? <Text style={styles.errorText}>{teamsError}</Text> : null}

        {noTeams ? (
          <View style={styles.emptyTeams}>
            <Text style={styles.emptyTeamsTitle}>You need a team first</Text>
            <Text style={styles.emptyTeamsSubtitle}>
              Create a team from the Spades library before starting a live game.
            </Text>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonLabel}>Go Back</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.teamSelectorGroup}>
              <Text style={styles.sectionLabel}>Team 1</Text>
              <TouchableOpacity
                style={styles.teamSelect}
                activeOpacity={0.85}
                onPress={() => handleOpenTeamPicker(1)}>
                <Text style={styles.teamSelectLabel}>{teamOne ? teamOne.label : 'Select Team 1'}</Text>
                <Text style={styles.teamSelectMembers}>
                  {teamOne ? teamOne.members.map((member) => member.displayName).join(' · ') : 'Tap to choose'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.teamSelectorGroup}>
              <Text style={styles.sectionLabel}>Team 2</Text>
              <View style={styles.teamScanCard}>
                {teamTwo ? (
                  <>
                    <Text style={styles.teamSelectLabel}>{teamTwo.label}</Text>
                    <Text style={styles.teamSelectMembers}>
                      {teamTwo.members.map((member) => member.displayName).join(' · ')}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.teamSelectMembers}>Scan the team QR from its details page to set the opponent.</Text>
                )}
                {teamScannerError ? <Text style={styles.scanError}>{teamScannerError}</Text> : null}
                <TouchableOpacity
                  style={styles.scanButton}
                  activeOpacity={0.85}
                  onPress={handleOpenTeamScanner}
                  disabled={teamScannerRequesting}>
                  <Text style={styles.scanButtonLabel}>
                    {teamScannerRequesting ? 'Opening Camera…' : teamTwo ? 'Rescan Team QR' : 'Scan Team QR'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.scoreBanner}>
              <View style={styles.bannerHeader}>
                <Text style={styles.bannerLabel}>Current Score</Text>
                <TextInput
                  value={goalScore}
                  onChangeText={handleGoalChange}
                  keyboardType="number-pad"
                  style={styles.goalInput}
                  placeholder="Goal"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
                <Text style={styles.goalSuffix}>pts</Text>
              </View>
              <Text style={styles.bannerScore}>{scoreLine}</Text>
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.primaryAction, (!teamOne || !teamTwo) && styles.actionDisabled]}
                onPress={handleOpenHandModal}
                disabled={!teamOne || !teamTwo}>
                <Text style={styles.primaryActionText}>Add Hand</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryAction, rounds.length === 0 && styles.actionDisabled]}
                onPress={handleUndoLastHand}
                disabled={rounds.length === 0}>
                <Text style={styles.secondaryActionText}>Undo Last</Text>
              </Pressable>
            </View>

            <View style={styles.roundsSection}>
              <Text style={styles.sectionLabel}>Hands</Text>
              {rounds.length === 0 ? (
                <View style={styles.roundsEmpty}>
                  <Text style={styles.roundsEmptyTitle}>No hands yet</Text>
                  <Text style={styles.roundsEmptySubtitle}>
                    Tap “Add Hand” to capture bids and books for each round.
                  </Text>
                </View>
              ) : (
                rounds.map(renderRound)
              )}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.finishButton, (rounds.length === 0 || isSubmittingGame) && styles.finishButtonDisabled]}
          onPress={handleFinishGame}
          disabled={rounds.length === 0 || isSubmittingGame}>
          <Text style={styles.finishButtonText}>{isSubmittingGame ? 'Saving…' : 'Finish Game'}</Text>
        </Pressable>
      </View>

      <Modal
        visible={isHandModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHandModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setHandModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>Add Hand</Text>

                <View style={styles.handBlock}>
                  <View style={styles.handHeader}>
                    <Text style={styles.handTeam}>{teamOne?.label ?? 'Team 1'}</Text>
                    <View style={styles.handBlindRow}>
                      <Text style={styles.handBlindLabel}>Blind</Text>
                      <Switch
                        value={handDraft.teamOneBlind}
                        onValueChange={(value) => handleUpdateDraft('teamOneBlind', value)}
                      />
                    </View>
                  </View>
                  <View style={styles.handInputs}>
                    <View style={styles.handField}>
                      <Text style={styles.handFieldLabel}>Bid</Text>
                      <TextInput
                        value={handDraft.teamOneBid}
                        onChangeText={(value) => handleUpdateDraft('teamOneBid', value.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        style={styles.handInput}
                      />
                    </View>
                    <View style={styles.handField}>
                      <Text style={styles.handFieldLabel}>Books</Text>
                      <TextInput
                        value={handDraft.teamOneBooks}
                        onChangeText={(value) => handleUpdateDraft('teamOneBooks', value.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        style={styles.handInput}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.handBlock}>
                  <View style={styles.handHeader}>
                    <Text style={styles.handTeam}>{teamTwo?.label ?? 'Team 2'}</Text>
                    <View style={styles.handBlindRow}>
                      <Text style={styles.handBlindLabel}>Blind</Text>
                      <Switch
                        value={handDraft.teamTwoBlind}
                        onValueChange={(value) => handleUpdateDraft('teamTwoBlind', value)}
                      />
                    </View>
                  </View>
                  <View style={styles.handInputs}>
                    <View style={styles.handField}>
                      <Text style={styles.handFieldLabel}>Bid</Text>
                      <TextInput
                        value={handDraft.teamTwoBid}
                        onChangeText={(value) => handleUpdateDraft('teamTwoBid', value.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        style={styles.handInput}
                      />
                    </View>
                    <View style={styles.handField}>
                      <Text style={styles.handFieldLabel}>Books</Text>
                      <TextInput
                        value={handDraft.teamTwoBooks}
                        onChangeText={(value) => handleUpdateDraft('teamTwoBooks', value.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        style={styles.handInput}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Pressable style={[styles.modalButton, styles.modalCancel]} onPress={() => setHandModalVisible(false)}>
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.modalButton, styles.modalConfirm]} onPress={handleConfirmHand}>
                    <Text style={[styles.modalButtonText, styles.modalButtonConfirm]}>Save Hand</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={teamPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTeamPickerSlot(null)}>
        <TouchableWithoutFeedback onPress={() => setTeamPickerSlot(null)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.selectSheet}>
                <Text style={styles.modalTitle}>Select Team</Text>
                <ScrollView contentContainerStyle={styles.selectList}>
                  {filteredTeams.map((team) => (
                    <Pressable
                      key={team.id}
                      style={styles.teamOption}
                      onPress={() => handleSelectTeam(team)}>
                      <Text style={styles.teamOptionLabel}>{team.label}</Text>
                      <Text style={styles.teamOptionMembers}>
                        {team.members.map((member) => member.displayName).join(' · ')}
                      </Text>
                    </Pressable>
                  ))}
                  {filteredTeams.length === 0 ? (
                    <View style={styles.roundsEmpty}>
                      <Text style={styles.roundsEmptyTitle}>No teams available</Text>
                      <Text style={styles.roundsEmptySubtitle}>
                        Create a team from the library and come back to start a game.
                      </Text>
                    </View>
                  ) : null}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={teamScannerVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseTeamScanner}>
        <View style={styles.scannerBackdrop}>
          <View style={styles.scannerCard}>
            <Text style={styles.scannerTitle}>Scan Team QR</Text>
            <Text style={styles.scannerSubtitle}>Align the team QR code within the frame.</Text>
            <View style={styles.scannerFrame}>
              {teamScannerPermission && !teamScannerPermission.granted ? (
                <Text style={styles.scannerError}>
                  Camera permission denied. Enable access in system settings to scan team QR codes.
                </Text>
              ) : (
                <CameraView
                  style={styles.cameraView}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={handleTeamQrScanned}
                />
              )}
            </View>
            <TouchableOpacity style={styles.scannerCloseButton} onPress={handleCloseTeamScanner}>
              <Text style={styles.scannerCloseLabel}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    gap: 28,
  },
  header: {
    gap: 12,
  },
  title: {
    color: Colors.dark.textPrimary,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  loadingTeams: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: Colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    gap: 12,
  },
  loadingTeamsLabel: {
    color: Colors.dark.textSecondary,
  },
  errorText: {
    color: Colors.dark.negative,
  },
  emptyTeams: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: Colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    gap: 12,
  },
  emptyTeamsTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyTeamsSubtitle: {
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 8,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Colors.dark.accent,
  },
  backButtonLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  teamSelectorGroup: {
    gap: 12,
  },
  sectionLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  teamSelectRow: {
    flexDirection: 'row',
    gap: 16,
  },
  teamSelect: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: Colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 6,
  },
  teamSelectLabel: {
    color: Colors.dark.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  teamSelectMembers: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  scoreBanner: {
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 22,
    backgroundColor: Colors.dark.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 16,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerLabel: {
    flex: 1,
    color: Colors.dark.textSecondary,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  goalInput: {
    width: 80,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    color: Colors.dark.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
  },
  goalSuffix: {
    color: Colors.dark.textSecondary,
    fontWeight: '600',
  },
  bannerScore: {
    color: Colors.dark.textPrimary,
    fontSize: 36,
    letterSpacing: 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  primaryAction: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    backgroundColor: Colors.dark.accent,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    backgroundColor: '#231F2F',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  secondaryActionText: {
    color: Colors.dark.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  roundsSection: {
    gap: 12,
  },
  roundsEmpty: {
    borderRadius: 18,
    padding: 20,
    backgroundColor: Colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 6,
  },
  roundsEmptyTitle: {
    color: Colors.dark.textPrimary,
    fontWeight: '600',
  },
  roundsEmptySubtitle: {
    color: Colors.dark.textSecondary,
  },
  roundCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: Colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
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
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roundTeamInfo: {
    flex: 1,
    gap: 4,
  },
  roundTeamName: {
    color: Colors.dark.textPrimary,
    fontWeight: '600',
  },
  roundBidBooks: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  roundDelta: {
    width: 70,
    textAlign: 'center',
    fontWeight: '700',
  },
  roundPositive: {
    color: Colors.dark.accentSoft,
  },
  roundNegative: {
    color: Colors.dark.negative,
  },
  roundTotal: {
    width: 70,
    textAlign: 'right',
    color: Colors.dark.textPrimary,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  finishButton: {
    borderRadius: 18,
    paddingVertical: 18,
    backgroundColor: Colors.dark.accent,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  finishButtonDisabled: {
    opacity: 0.5,
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 5, 12, 0.86)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    padding: 24,
    backgroundColor: Colors.dark.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 20,
  },
  modalTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  handBlock: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: Colors.dark.surface,
    gap: 16,
  },
  handHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  handTeam: {
    color: Colors.dark.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  handBlindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  handBlindLabel: {
    color: Colors.dark.textSecondary,
  },
  handInputs: {
    flexDirection: 'row',
    gap: 16,
  },
  handField: {
    flex: 1,
    gap: 6,
  },
  handFieldLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  handInput: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#1E1A2A',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    color: Colors.dark.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: '#221E31',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  modalConfirm: {
    backgroundColor: Colors.dark.accent,
  },
  modalButtonText: {
    color: Colors.dark.textPrimary,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  modalButtonConfirm: {
    color: '#FFFFFF',
  },
  selectSheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderRadius: 28,
    padding: 24,
    backgroundColor: Colors.dark.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 16,
  },
  selectList: {
    gap: 12,
  },
  teamOption: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: Colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 4,
  },
  teamOptionLabel: {
    color: Colors.dark.textPrimary,
    fontWeight: '700',
  },
  teamOptionMembers: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  teamScanCard: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: Colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 6,
  },
  scanError: {
    color: Colors.dark.negative,
    fontSize: 12,
  },
  scanButton: {
    marginTop: 8,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Colors.dark.accent,
    alignItems: 'center',
  },
  scanButtonLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scannerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 5, 12, 0.86)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scannerCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    padding: 24,
    backgroundColor: Colors.dark.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 18,
    alignItems: 'center',
  },
  scannerTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  scannerSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  scannerFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#14111D',
    position: 'relative',
  },
  cameraView: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  scannerError: {
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    padding: 16,
  },
  scannerCloseButton: {
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#221E31',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  scannerCloseLabel: {
    color: Colors.dark.textPrimary,
    fontWeight: '600',
  },
});
