import { useFocusEffect } from '@react-navigation/native';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ListRenderItemInfo,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
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
  SpadesMatchSummary,
  SpadesTeam,
  createTeamForUser,
  fetchSpadesMatchSummaries,
  fetchTeamsForUser,
  convertGuestToRegistered,
  updateTeamName,
  archiveTeam,
} from '@/src/shared/spades-store';

const BUTTON_CLEARANCE = 132;

const formatDate = (value: string | null) => {
  if (!value) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const SummaryCard = React.memo(({ item }: { item: SpadesMatchSummary }) => {
  const teamOneScore = item.team1Total ?? 0;
  const teamTwoScore = item.team2Total ?? 0;
  const teamOneWon = item.winnerTeamNo === 1;
  const teamTwoWon = item.winnerTeamNo === 2;
  const winnerLabel =
    item.status === 'completed'
      ? teamOneWon
        ? item.team1Name
        : teamTwoWon
        ? item.team2Name
        : 'Tied'
      : 'In Progress';

  return (
    <Link href={{ pathname: '/game/[id]', params: { id: item.gameId } }} asChild>
      <Pressable style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}>
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={[styles.teamChip, teamOneWon ? styles.teamChipWinner : styles.teamChipMuted]}>
              <Text style={styles.teamChipText} numberOfLines={1}>
                {item.team1Name}
              </Text>
            </View>
            <Text style={styles.vsLabel}>vs</Text>
            <View style={[styles.teamChip, teamTwoWon ? styles.teamChipWinner : styles.teamChipMuted]}>
              <Text style={styles.teamChipText} numberOfLines={1}>
                {item.team2Name}
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <Text style={[styles.scoreValue, teamOneWon ? styles.scoreWinner : styles.scoreLoser]}>
              {teamOneScore}
            </Text>
            <View style={styles.scoreDivider} />
            <Text style={[styles.scoreValue, teamTwoWon ? styles.scoreWinner : styles.scoreLoser]}>
              {teamTwoScore}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaGroup}>
              <Text style={styles.metaLabel}>Played</Text>
              <Text style={styles.metaValue}>{formatDate(item.playedOn)}</Text>
            </View>
            <View style={styles.resultPill}>
              <Text style={styles.resultText}>Winner · {winnerLabel}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
});

SummaryCard.displayName = 'SummaryCard';

const renderSeparator = () => <View style={styles.separator} />;

const deriveDisplayName = (user: { user_metadata?: Record<string, unknown>; email?: string | null }) => {
  const metaName =
    typeof user?.user_metadata?.full_name === 'string'
      ? (user.user_metadata.full_name as string).trim()
      : '';
  if (metaName) {
    return metaName;
  }
  const emailHandle = user?.email?.split('@')[0];
  if (emailHandle) {
    return emailHandle;
  }
  return 'Player';
};

export default function SpadesGamesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [summaries, setSummaries] = React.useState<SpadesMatchSummary[]>([]);
  const [teams, setTeams] = React.useState<SpadesTeam[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [isTeamModalVisible, setTeamModalVisible] = React.useState(false);
  const [teamName, setTeamName] = React.useState('');
  const [useGuestPartner, setUseGuestPartner] = React.useState(true);
  const [partnerName, setPartnerName] = React.useState('');
  const [scannedPartnerName, setScannedPartnerName] = React.useState('');
  const [scannedPartnerId, setScannedPartnerId] = React.useState('');
  const [isSubmittingTeam, setSubmittingTeam] = React.useState(false);
  const [isScannerVisible, setScannerVisible] = React.useState(false);
  const [isRequestingScanner, setRequestingScanner] = React.useState(false);
  const [hasScannedDuringSession, setHasScannedDuringSession] = React.useState(false);
  const [scannerMode, setScannerMode] = React.useState<'create-partner' | 'convert-member' | null>(null);
  const [pendingConvertGuestId, setPendingConvertGuestId] = React.useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = React.useState<SpadesTeam | null>(null);
  const [isTeamManageModalVisible, setTeamManageModalVisible] = React.useState(false);
  const [manageTeamName, setManageTeamName] = React.useState('');
  const [isUpdatingTeam, setIsUpdatingTeam] = React.useState(false);
  const [isArchivingTeam, setIsArchivingTeam] = React.useState(false);
  const [isConvertingMember, setIsConvertingMember] = React.useState(false);
  const [manageError, setManageError] = React.useState<string | null>(null);
  const [fabShift, setFabShift] = React.useState(0);
  const metricsRef = React.useRef({ content: 0, layout: 0, offset: 0 });
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const manageTeamNameTrimmed = manageTeamName.trim();
  const manageNameChanged = selectedTeam ? manageTeamNameTrimmed !== selectedTeam.label : false;

  const currentUserId = user?.id ?? '';
  const currentUserName = user ? deriveDisplayName(user) : 'Player';

  const loadData = React.useCallback(
    async (showLoading: boolean) => {
      if (!user) {
        setSummaries([]);
        setTeams([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showLoading) {
        setLoading(true);
      }

      try {
        const [teamList, matchList] = await Promise.all([
          fetchTeamsForUser(user.id),
          fetchSpadesMatchSummaries(user.id),
        ]);
        setTeams(teamList);
        setSelectedTeam((prev) => {
          if (!prev) {
            return null;
          }
          return teamList.find((team) => team.id === prev.id) ?? null;
        });
        setSummaries(matchList);
      } catch (error) {
        console.error('Failed to load spades data', error);
        Alert.alert('Unable to load data', 'Please pull to refresh or try again later.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  React.useEffect(() => {
    loadData(true);
  }, [loadData]);

  useFocusEffect(
    React.useCallback(() => {
      loadData(false);
    }, [loadData]),
  );

  React.useEffect(() => {
    if (!isScannerVisible) {
      setHasScannedDuringSession(false);
    }
  }, [isScannerVisible]);

  React.useEffect(() => {
    if (isTeamManageModalVisible && !selectedTeam) {
      setTeamManageModalVisible(false);
    }
  }, [isTeamManageModalVisible, selectedTeam]);

  const onRefresh = React.useCallback(async () => {
    if (!user) {
      return;
    }
    setRefreshing(true);
    await loadData(false);
  }, [loadData, user]);

  const recalcFabShift = React.useCallback(() => {
    const { content, layout, offset } = metricsRef.current;
    if (layout <= 0) {
      setFabShift(0);
      return;
    }
    const distanceFromBottom = Math.max(0, content - layout - offset);
    const nextShift = distanceFromBottom < BUTTON_CLEARANCE ? BUTTON_CLEARANCE - distanceFromBottom : 0;
    setFabShift((prev) => (Math.abs(prev - nextShift) > 0.5 ? nextShift : prev));
  }, []);

  const handleContentSizeChange = React.useCallback((_: number, height: number) => {
    metricsRef.current.content = height;
    recalcFabShift();
  }, [recalcFabShift]);

  const handleLayout = React.useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    metricsRef.current.layout = event.nativeEvent.layout.height;
    recalcFabShift();
  }, [recalcFabShift]);

  const handleScroll = React.useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    metricsRef.current.offset = event.nativeEvent.contentOffset.y;
    recalcFabShift();
  }, [recalcFabShift]);

  const renderItem = React.useCallback(
    ({ item }: ListRenderItemInfo<SpadesMatchSummary>) => <SummaryCard item={item} />,
    [],
  );

  const resetTeamDraft = React.useCallback(() => {
    setTeamName('');
    setUseGuestPartner(true);
    setPartnerName('');
    setScannedPartnerId('');
    setScannedPartnerName('');
    setScannerMode(null);
    setPendingConvertGuestId(null);
  }, []);

  const openTeamModal = React.useCallback(() => {
    resetTeamDraft();
    setTeamModalVisible(true);
  }, [resetTeamDraft]);

  const closeTeamModal = React.useCallback(() => {
    if (!isSubmittingTeam) {
      setTeamModalVisible(false);
    }
  }, [isSubmittingTeam]);

  const handleSelectRegisteredPartner = React.useCallback(() => {
    setUseGuestPartner(false);
    setPartnerName('');
    setScannedPartnerId('');
    setScannedPartnerName('');
  }, []);

  const handleSelectGuestPartner = React.useCallback(() => {
    setUseGuestPartner(true);
    setPartnerName('');
    setScannedPartnerId('');
    setScannedPartnerName('');
  }, []);

  const handleOpenScanner = React.useCallback(
    async (mode: 'create-partner' | 'convert-member', guestId?: string) => {
      if (mode === 'create-partner' && useGuestPartner) {
        return;
      }
      if (mode === 'convert-member' && (!selectedTeam || !guestId)) {
        return;
      }
      if (isRequestingScanner) {
        return;
      }

      setScannerMode(mode);
      if (mode === 'convert-member') {
        setPendingConvertGuestId(guestId ?? null);
      } else {
        setPendingConvertGuestId(null);
      }

      if (cameraPermission?.granted) {
        setHasScannedDuringSession(false);
        setScannerVisible(true);
        return;
      }

      setRequestingScanner(true);
      try {
        const permissionResult = await requestCameraPermission?.();
        const granted = permissionResult?.granted ?? cameraPermission?.granted ?? false;
        if (granted) {
          setHasScannedDuringSession(false);
          setScannerVisible(true);
        } else {
          Alert.alert('Camera permission needed', 'Allow camera access to scan teammate QR codes.');
          setScannerMode(null);
          setPendingConvertGuestId(null);
        }
      } catch (error) {
        console.error('Failed to request camera permission', error);
        Alert.alert('Camera error', 'Could not access the camera. Try again later.');
        setScannerMode(null);
        setPendingConvertGuestId(null);
      } finally {
        setRequestingScanner(false);
      }
    },
    [cameraPermission?.granted, isRequestingScanner, requestCameraPermission, selectedTeam, useGuestPartner],
  );

  const handleCloseScanner = React.useCallback(() => {
    setScannerVisible(false);
    setScannerMode(null);
    setPendingConvertGuestId(null);
    setHasScannedDuringSession(false);
  }, []);

  const handleBarCodeScanned = React.useCallback(
    (scanResult: BarcodeScanningResult) => {
      if (hasScannedDuringSession) {
        return;
      }
      setHasScannedDuringSession(true);
      try {
        const parsed = Linking.parse(scanResult?.data ?? '');
        const pickFirstString = (value: unknown): string | undefined => {
          if (Array.isArray(value)) {
            const first = value[0];
            return typeof first === 'string' ? first : undefined;
          }
          return typeof value === 'string' ? value : undefined;
        };
        const scannedId = pickFirstString(parsed?.queryParams?.scannedUserId);
        const scannedName = pickFirstString(parsed?.queryParams?.scannedDisplayName);
        if (!scannedId) {
          Alert.alert('Invalid QR code', 'Scan a profile QR generated within the app.');
          setHasScannedDuringSession(false);
          return;
        }

        if (scannerMode === 'create-partner') {
          setScannedPartnerId(scannedId);
          setScannedPartnerName(scannedName ?? 'Scanned Player');
          setUseGuestPartner(false);
          setScannerVisible(false);
          setScannerMode(null);
          setPendingConvertGuestId(null);
          return;
        }

        if (scannerMode === 'convert-member') {
          if (!selectedTeam || !pendingConvertGuestId) {
            setHasScannedDuringSession(false);
        setScannerVisible(false);
        setScannerMode(null);
        setPendingConvertGuestId(null);
            return;
          }

          const existingMember = selectedTeam.members.find(
            (member) => member.type === 'user' && member.userId === scannedId,
          );
          if (existingMember) {
            Alert.alert('Already on team', `${existingMember.displayName} is already part of this team.`);
            setHasScannedDuringSession(false);
            return;
          }

          setIsConvertingMember(true);
          convertGuestToRegistered({
            teamId: selectedTeam.id,
            guestId: pendingConvertGuestId,
            newUserId: scannedId,
          })
            .then(async () => {
              await loadData(false);
              const nameLabel = scannedName ?? 'Scanned Player';
              Alert.alert('Teammate updated', `${nameLabel} is now on this team.`);
            })
            .catch((error) => {
              console.error('Failed to convert guest teammate', error);
              Alert.alert('Unable to update team', 'There was a problem updating the team member.');
              setHasScannedDuringSession(false);
            })
            .finally(() => {
              setIsConvertingMember(false);
              setScannerVisible(false);
              setScannerMode(null);
              setPendingConvertGuestId(null);
              setHasScannedDuringSession(false);
            });
        }
      } catch (error) {
        console.error('Failed to parse scanned QR', error);
        Alert.alert('Scan failed', 'Could not read that QR code. Try again.');
        setHasScannedDuringSession(false);
      }
    },
    [hasScannedDuringSession, loadData, pendingConvertGuestId, scannerMode, selectedTeam],
  );

  const handleOpenManageTeam = React.useCallback((team: SpadesTeam) => {
    setSelectedTeam(team);
    setManageTeamName(team.label);
    setManageError(null);
    setTeamManageModalVisible(true);
  }, []);

  const handleCloseManageModal = React.useCallback(() => {
    setTeamManageModalVisible(false);
    setSelectedTeam(null);
    setManageTeamName('');
    setManageError(null);
    setPendingConvertGuestId(null);
    setScannerMode(null);
    setScannerVisible(false);
    setIsConvertingMember(false);
    setIsArchivingTeam(false);
    setIsUpdatingTeam(false);
  }, []);

  const handleSaveManagedTeam = React.useCallback(async () => {
    if (!selectedTeam || !user) {
      return;
    }
    const trimmedName = manageTeamNameTrimmed;
    if (!trimmedName) {
      setManageError('Team name is required.');
      return;
    }
    if (trimmedName === selectedTeam.label) {
      handleCloseManageModal();
      return;
    }
    setIsUpdatingTeam(true);
    setManageError(null);
    try {
      await updateTeamName({ teamId: selectedTeam.id, userId: user.id, teamName: trimmedName });
      await loadData(false);
      handleCloseManageModal();
    } catch (error) {
      console.error('Failed to update team name', error);
      setManageError('Could not update team name. Try again.');
    } finally {
      setIsUpdatingTeam(false);
    }
  }, [handleCloseManageModal, loadData, manageTeamNameTrimmed, selectedTeam, user]);

  const handleArchiveSelectedTeam = React.useCallback(async () => {
    if (!selectedTeam || !user) {
      return;
    }
    setIsArchivingTeam(true);
    setManageError(null);
    try {
      await archiveTeam(selectedTeam.id, user.id);
      await loadData(false);
      handleCloseManageModal();
    } catch (error) {
      console.error('Failed to archive team', error);
      setManageError('Unable to archive this team.');
      setIsArchivingTeam(false);
    }
  }, [handleCloseManageModal, loadData, selectedTeam, user]);

  const handleConfirmTeam = React.useCallback(async () => {
    if (!user) {
      return;
    }

    const trimmedName = teamName.trim();
    if (!trimmedName) {
      Alert.alert('Team name required', 'Enter a name for the team before saving.');
      return;
    }

    let partnerUserId: string | undefined;
    let guestName: string | undefined;

    if (useGuestPartner) {
      guestName = partnerName.trim();
      if (!guestName) {
        Alert.alert('Guest name required', 'Provide a name for the guest teammate.');
        return;
      }
    } else {
      if (!scannedPartnerId || !scannedPartnerName) {
        Alert.alert('Scan required', 'Scan a teammate’s profile QR code to add them.');
        return;
      }
      partnerUserId = scannedPartnerId;
    }

    setSubmittingTeam(true);
    try {
      const createdTeam = await createTeamForUser({
        createdBy: user.id,
        teamName: trimmedName,
        partnerUserId,
        guestName,
      });
      setTeams((prev) => [createdTeam, ...prev]);
      setTeamModalVisible(false);
      resetTeamDraft();
    } catch (error) {
      console.error('Failed to create team', error);
      Alert.alert('Could not create team', 'Please verify the inputs and try again.');
    } finally {
      setSubmittingTeam(false);
    }
  }, [scannedPartnerId, partnerName, resetTeamDraft, teamName, useGuestPartner, user]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={summaries}
        keyExtractor={(item) => item.gameId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 36, paddingBottom: insets.bottom + BUTTON_CLEARANCE + 56 },
        ]}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <View style={styles.header}>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeLabel}>Spades</Text>
              </View>
              <Text style={styles.heading}>Match Library</Text>
              <Text style={styles.subheading}>
                Browse past tables, launch a new slate, or craft teams for your crew.
              </Text>
              <View style={styles.headerActions}>
                <Pressable style={styles.teamButton} onPress={openTeamModal}>
                  <Text style={styles.teamButtonText}>Create Team</Text>
                </Pressable>
              </View>
            </View>

            {teams.length > 0 ? (
              <View style={styles.teamList}>
                <Text style={styles.teamListTitle}>Your Teams</Text>
                {teams.map((team) => (
                  <Pressable
                    key={team.id}
                    style={({ pressed }) => [styles.teamCard, pressed && styles.teamCardPressed]}
                    onPress={() => handleOpenManageTeam(team)}
                  >
                    <Text style={styles.teamName}>{team.label}</Text>
                    <Text style={styles.teamPlayers}>
                      {team.members.map((member) => member.displayName).join(' · ')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.teamEmptyState}>
                <Text style={styles.teamEmptyTitle}>No teams yet</Text>
                <Text style={styles.teamEmptySubtitle}>Create a roster to start tracking Spades leaders.</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No games recorded</Text>
            <Text style={styles.emptySubtitle}>Add a Spades match to see it appear in your library.</Text>
          </View>
        }
        ItemSeparatorComponent={renderSeparator}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListFooterComponent={<View style={styles.footerSpacer} />}
      />

      <View pointerEvents="box-none" style={styles.fabArena}>
        <Link href="/games/spades/add" asChild>
          <Pressable style={[styles.fabButton, { transform: [{ translateY: fabShift }] }]}>
            <Text style={styles.fabText}>Add Spades Game</Text>
          </Pressable>
        </Link>
      </View>

      <Modal
        visible={isTeamModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeTeamModal}
        presentationStyle="overFullScreen">
        <TouchableWithoutFeedback onPress={closeTeamModal}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>Create Team</Text>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Team Name</Text>
                  <TextInput
                    value={teamName}
                    onChangeText={setTeamName}
                    placeholder="Late Night Renegades"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    style={styles.modalInput}
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Player 1</Text>
                  <View style={styles.readonlyInput}>
                    <Text style={styles.readonlyText}>{currentUserName}</Text>
                    <Text style={styles.readonlySubtext}>{currentUserId}</Text>
                  </View>
                </View>

                <View style={styles.modalToggleRow}>
                  <Pressable
                    style={[styles.togglePill, !useGuestPartner && styles.togglePillActive]}
                    onPress={handleSelectRegisteredPartner}>
                    <Text style={styles.toggleText}>Registered Partner</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.togglePill, useGuestPartner && styles.togglePillActive]}
                    onPress={handleSelectGuestPartner}>
                    <Text style={styles.toggleText}>Guest Partner</Text>
                  </Pressable>
                </View>

                {useGuestPartner ? (
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>Guest Name</Text>
                    <TextInput
                      value={partnerName}
                      onChangeText={setPartnerName}
                      placeholder="Alex Guest"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      style={styles.modalInput}
                    />
                    <Text style={styles.helperText}>A guest profile ID will be generated automatically.</Text>
                  </View>
                ) : (
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>Teammate</Text>
                    {scannedPartnerId ? (
                      <View style={styles.readonlyInput}>
                        <Text style={styles.readonlyText}>{scannedPartnerName || 'Scanned Player'}</Text>
                        <Text style={styles.readonlySubtext}>{scannedPartnerId}</Text>
                      </View>
                    ) : (
                      <Text style={styles.helperText}>Scan a profile QR code to add a registered teammate.</Text>
                    )}
                    <TouchableOpacity
                      style={styles.scanButton}
                      activeOpacity={0.85}
                      onPress={() => handleOpenScanner('create-partner')}
                      disabled={isRequestingScanner}>
                      <Text style={styles.scanButtonLabel}>
                        {isRequestingScanner ? 'Opening Camera…' : 'Scan Profile QR'}
                      </Text>
                    </TouchableOpacity>
                    {scannedPartnerId ? (
                      <Text style={styles.helperText}>Scan again to replace this teammate.</Text>
                    ) : null}
                  </View>
                )}

                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.modalButton, styles.modalCancel]}
                    disabled={isSubmittingTeam}
                    onPress={closeTeamModal}>
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalButton, styles.modalConfirm]}
                    disabled={isSubmittingTeam}
                    onPress={handleConfirmTeam}>
                    <Text style={[styles.modalButtonText, styles.modalButtonConfirmText]}>
                      {isSubmittingTeam ? 'Saving…' : 'Save Team'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={isTeamManageModalVisible && !!selectedTeam}
        transparent
        animationType="fade"
        onRequestClose={handleCloseManageModal}
        presentationStyle="overFullScreen">
        <TouchableWithoutFeedback onPress={handleCloseManageModal}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.manageSheet}>
                <Text style={styles.manageTitle}>Team Details</Text>
                {manageError ? <Text style={styles.manageError}>{manageError}</Text> : null}

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Team Name</Text>
                  <TextInput
                    value={manageTeamName}
                    onChangeText={setManageTeamName}
                    placeholder="Team name"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    style={styles.modalInput}
                  />
                </View>

                <View style={styles.manageMembersList}>
                  <Text style={styles.sectionLabel}>Roster</Text>
                  {selectedTeam?.members.map((member) => (
                    <View key={`${selectedTeam.id}-${member.slot}`} style={styles.manageMemberRow}>
                      <View style={styles.manageMemberHeader}>
                        <Text style={styles.manageMemberName}>{member.displayName}</Text>
                        <Text style={styles.manageMemberType}>
                          {member.type === 'user' ? 'Registered User' : 'Guest Player'}
                        </Text>
                      </View>
                      {member.type === 'guest' && member.guestId ? (
                        <TouchableOpacity
                          style={[styles.convertButton, (isConvertingMember || isRequestingScanner) && styles.actionDisabled]}
                          activeOpacity={0.85}
                          onPress={() => handleOpenScanner('convert-member', member.guestId)}
                          disabled={isConvertingMember || isRequestingScanner}>
                          <Text style={styles.convertButtonLabel}>
                            {isConvertingMember ? 'Updating…' : 'Replace with Registered Player'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}
                  {selectedTeam && selectedTeam.members.every((member) => member.type === 'user') ? (
                    <Text style={styles.helperText}>Both players are registered. Members can no longer be changed.</Text>
                  ) : null}
                </View>

                <View style={styles.manageActions}>
                  <Pressable style={styles.manageActionButton} onPress={handleCloseManageModal}>
                    <Text style={styles.manageActionLabel}>Close</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.manageActionButton, styles.manageActionPrimary, (isUpdatingTeam || !manageNameChanged) && styles.actionDisabled]}
                    onPress={handleSaveManagedTeam}
                    disabled={isUpdatingTeam || !manageNameChanged}>
                    <Text style={[styles.manageActionLabel, styles.modalButtonConfirmText]}>
                      {isUpdatingTeam ? 'Saving…' : 'Save'}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  style={[styles.archiveButton, isArchivingTeam && styles.actionDisabled]}
                  onPress={handleArchiveSelectedTeam}
                  disabled={isArchivingTeam}>
                  <Text style={styles.archiveButtonLabel}>
                    {isArchivingTeam ? 'Archiving…' : 'Archive Team'}
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={isScannerVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseScanner}>
        <View style={styles.scannerBackdrop}>
          <View style={styles.scannerCard}>
            <Text style={styles.scannerTitle}>Scan teammate QR</Text>
            <Text style={styles.scannerSubtitle}>Align the profile QR code within the frame.</Text>
            <View style={styles.scannerFrame}>
              {cameraPermission && !cameraPermission.granted ? (
                <Text style={styles.scannerError}>
                  Camera permission denied. Enable access in system settings to scan teammates.
                </Text>
              ) : (
                <CameraView
                  style={styles.cameraView}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={handleBarCodeScanned}
                />
              )}
            </View>
            <TouchableOpacity style={styles.scannerCloseButton} onPress={handleCloseScanner}>
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
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 24,
    gap: 24,
  },
  headerSection: {
    gap: 32,
  },
  header: {
    gap: 18,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.dark.surface,
  },
  headerBadgeLabel: {
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.dark.textSecondary,
    fontWeight: '600',
  },
  heading: {
    color: Colors.dark.textPrimary,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  subheading: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  teamButton: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: Colors.dark.accent,
  },
  teamButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  teamList: {
    gap: 14,
  },
  teamListTitle: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  teamCard: {
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    gap: 6,
  },
  teamCardPressed: {
    opacity: 0.85,
  },
  teamName: {
    color: Colors.dark.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  teamPlayers: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  teamEmptyState: {
    borderRadius: 22,
    padding: 20,
    backgroundColor: Colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 6,
  },
  teamEmptyTitle: {
    color: Colors.dark.textPrimary,
    fontWeight: '600',
  },
  teamEmptySubtitle: {
    color: Colors.dark.textSecondary,
  },
  cardPressable: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.86,
  },
  cardBody: {
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 24,
    backgroundColor: Colors.dark.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  teamChip: {
    flex: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  teamChipMuted: {
    backgroundColor: '#221D2E',
  },
  teamChipWinner: {
    backgroundColor: '#2D1A26',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.accentSoft,
  },
  teamChipText: {
    color: Colors.dark.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  vsLabel: {
    color: Colors.dark.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  scoreValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
  },
  scoreWinner: {
    color: Colors.dark.textPrimary,
  },
  scoreLoser: {
    color: Colors.dark.textSecondary,
  },
  scoreDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.dark.border,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaGroup: {
    gap: 4,
  },
  metaLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  metaValue: {
    color: Colors.dark.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  resultPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#2F1F2A',
  },
  resultText: {
    color: Colors.dark.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.dark.border,
    opacity: 0.4,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 60,
  },
  emptyTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  footerSpacer: {
    height: 40,
  },
  fabArena: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingBottom: 24,
  },
  fabButton: {
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 18,
    backgroundColor: Colors.dark.accent,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
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
    gap: 18,
  },
  modalTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalField: {
    gap: 8,
  },
  modalLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  modalInput: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    color: Colors.dark.textPrimary,
    fontSize: 16,
  },
  scanButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    backgroundColor: Colors.dark.accent,
  },
  scanButtonLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  readonlyInput: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E1A2A',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 4,
  },
  readonlyText: {
    color: Colors.dark.textPrimary,
    fontWeight: '600',
  },
  readonlySubtext: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  modalToggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  togglePill: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    backgroundColor: '#1E1A26',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  togglePillActive: {
    backgroundColor: Colors.dark.accentMuted,
    borderColor: Colors.dark.accentSoft,
  },
  toggleText: {
    textAlign: 'center',
    color: Colors.dark.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  helperText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    lineHeight: 18,
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
    backgroundColor: '#241F32',
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
  modalButtonConfirmText: {
    color: '#FFFFFF',
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
  manageSheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    padding: 24,
    backgroundColor: Colors.dark.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 18,
  },
  manageTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  manageError: {
    color: Colors.dark.negative,
    textAlign: 'center',
    fontSize: 13,
  },
  manageMembersList: {
    gap: 12,
  },
  manageMemberRow: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: Colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 8,
  },
  manageMemberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  manageMemberName: {
    color: Colors.dark.textPrimary,
    fontWeight: '600',
  },
  manageMemberType: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  convertButton: {
    marginTop: 6,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Colors.dark.accent,
  },
  convertButtonLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  manageActions: {
    flexDirection: 'row',
    gap: 12,
  },
  manageActionButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#241F32',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  manageActionPrimary: {
    backgroundColor: Colors.dark.accent,
  },
  manageActionLabel: {
    color: Colors.dark.textPrimary,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  archiveButton: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#2E1A21',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  archiveButtonLabel: {
    color: Colors.dark.negative,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
