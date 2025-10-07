import { useFocusEffect } from '@react-navigation/native';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/shared/auth-context';
import {
    SpadesTeam,
    archiveTeam,
    convertGuestToRegistered,
    fetchTeamById,
    updateTeamName,
} from '@/src/shared/spades-store';

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

export default function TeamDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [team, setTeam] = React.useState<SpadesTeam | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [manageTeamName, setManageTeamName] = React.useState('');
  const [isUpdatingTeam, setIsUpdatingTeam] = React.useState(false);
  const [isArchivingTeam, setIsArchivingTeam] = React.useState(false);
  const [isConvertingMember, setIsConvertingMember] = React.useState(false);
  const [manageError, setManageError] = React.useState<string | null>(null);
  const [isTeamQrVisible, setTeamQrVisible] = React.useState(false);
  const [isScannerVisible, setScannerVisible] = React.useState(false);
  const [isRequestingScanner, setRequestingScanner] = React.useState(false);
  const [hasScannedDuringSession, setHasScannedDuringSession] = React.useState(false);
  const [scannerMode, setScannerMode] = React.useState<'convert-member' | null>(null);
  const [pendingConvertGuestId, setPendingConvertGuestId] = React.useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const manageTeamNameTrimmed = manageTeamName.trim();
  const manageNameChanged = team ? manageTeamNameTrimmed !== team.label : false;
  const teamQrLink = React.useMemo(() => {
    if (!team) {
      return '';
    }
    return Linking.createURL('/', {
      queryParams: {
        teamId: team.id,
      },
    });
  }, [team]);

  const loadTeam = React.useCallback(async () => {
    if (!id || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setManageError(null);
    try {
      const teamData = await fetchTeamById(id);
      setTeam(teamData);
      setManageTeamName(teamData?.label || '');
    } catch (error) {
      console.error('Failed to load team', error);
      setManageError('Unable to load team details.');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  React.useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  useFocusEffect(
    React.useCallback(() => {
      loadTeam();
    }, [loadTeam]),
  );

  React.useEffect(() => {
    if (!isScannerVisible) {
      setHasScannedDuringSession(false);
    }
  }, [isScannerVisible]);

  const handleOpenScanner = React.useCallback(
    async (mode: 'convert-member', guestId?: string) => {
      if (mode === 'convert-member' && (!team || !guestId)) {
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
    [cameraPermission?.granted, isRequestingScanner, requestCameraPermission, team],
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

        if (scannerMode === 'convert-member') {
          if (!team || !pendingConvertGuestId) {
            setHasScannedDuringSession(false);
            setScannerVisible(false);
            setScannerMode(null);
            setPendingConvertGuestId(null);
            return;
          }

          const existingMember = team.members.find(
            (member) => member.type === 'user' && member.userId === scannedId,
          );
          if (existingMember) {
            Alert.alert('Already on team', `${existingMember.displayName} is already part of this team.`);
            setHasScannedDuringSession(false);
            return;
          }

          setIsConvertingMember(true);
          convertGuestToRegistered({
            teamId: team.id,
            guestId: pendingConvertGuestId,
            newUserId: scannedId,
          })
            .then(async () => {
              await loadTeam();
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
    [hasScannedDuringSession, loadTeam, pendingConvertGuestId, scannerMode, team],
  );

  const handleSaveManagedTeam = React.useCallback(async () => {
    if (!team || !user) {
      return;
    }
    const trimmedName = manageTeamNameTrimmed;
    if (!trimmedName) {
      setManageError('Team name is required.');
      return;
    }
    if (trimmedName === team.label) {
      return;
    }
    setIsUpdatingTeam(true);
    setManageError(null);
    try {
      await updateTeamName({ teamId: team.id, userId: user.id, teamName: trimmedName });
      await loadTeam();
    } catch (error) {
      console.error('Failed to update team name', error);
      setManageError('Could not update team name. Try again.');
    } finally {
      setIsUpdatingTeam(false);
    }
  }, [loadTeam, manageTeamNameTrimmed, team, user]);

  const handleArchiveTeam = React.useCallback(async () => {
    if (!team || !user) {
      return;
    }
    setIsArchivingTeam(true);
    setManageError(null);
    try {
      await archiveTeam(team.id, user.id);
      router.back();
    } catch (error) {
      console.error('Failed to archive team', error);
      setManageError('Unable to archive this team.');
      setIsArchivingTeam(false);
    }
  }, [router, team, user]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>Team not found</Text>
        <Text style={styles.errorSubtitle}>This team may have been archived or deleted.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonLabel}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.screen]}>

      <View style={[styles.content, { paddingBottom: insets.bottom}]}>
        {manageError ? <Text style={styles.errorText}>{manageError}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Team Name</Text>
          <TextInput
            value={manageTeamName}
            onChangeText={setManageTeamName}
            placeholder="Team name"
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Roster</Text>
          {team.members.map((member) => (
            <View key={`${team.id}-${member.slot}`} style={styles.memberRow}>
              <View style={styles.memberHeader}>
                <Text style={styles.memberName}>{member.displayName}</Text>
                <Text style={styles.memberType}>
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
          {team.members.every((member) => member.type === 'user') ? (
            <Text style={styles.helperText}>Both players are registered. Members can no longer be changed.</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.qrButton, !teamQrLink && styles.actionDisabled]}
          activeOpacity={0.85}
          onPress={() => setTeamQrVisible(true)}
          disabled={!teamQrLink}>
          <Text style={styles.qrButtonLabel}>Show Team QR</Text>
        </TouchableOpacity>

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, (isUpdatingTeam || !manageNameChanged) && styles.actionDisabled]}
            onPress={handleSaveManagedTeam}
            disabled={isUpdatingTeam || !manageNameChanged}>
            <Text style={styles.actionButtonLabel}>
              {isUpdatingTeam ? 'Saving…' : 'Save Changes'}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.archiveButton, isArchivingTeam && styles.actionDisabled]}
          onPress={handleArchiveTeam}
          disabled={isArchivingTeam}>
          <Text style={styles.archiveButtonLabel}>
            {isArchivingTeam ? 'Archiving…' : 'Archive Team'}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={isTeamQrVisible && !!team}
        transparent
        animationType="fade"
        onRequestClose={() => setTeamQrVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setTeamQrVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.qrCard}>
                <Text style={styles.qrTitle}>Share Team</Text>
                <Text style={styles.qrSubtitle}>
                  Scan to load {team?.label ?? 'this team'} as Team 2 in Spades games.
                </Text>
                <View style={styles.qrCodeContainer}>
                  {teamQrLink ? (
                    <QRCode
                      value={teamQrLink}
                      size={220}
                      color={Colors.dark.textPrimary}
                      backgroundColor="transparent"
                    />
                  ) : (
                    <Text style={styles.qrFallback}>QR unavailable</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.qrCloseButton}
                  activeOpacity={0.85}
                  onPress={() => setTeamQrVisible(false)}>
                  <Text style={styles.qrCloseLabel}>Close</Text>
                </TouchableOpacity>
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
  errorScreen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  errorSubtitle: {
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonLabel: {
    color: Colors.dark.accent,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    color: Colors.dark.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 24,
  },
  errorText: {
    color: Colors.dark.negative,
    textAlign: 'center',
    fontSize: 13,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    color: Colors.dark.textPrimary,
    fontSize: 16,
  },
  memberRow: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: Colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 8,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  memberName: {
    color: Colors.dark.textPrimary,
    fontWeight: '600',
  },
  memberType: {
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
  helperText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  qrButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.dark.accent,
  },
  qrButtonLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.dark.accent,
  },
  actionButtonLabel: {
    color: '#FFFFFF',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 5, 12, 0.86)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  qrCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: Colors.dark.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    gap: 18,
  },
  qrTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  qrSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  qrCodeContainer: {
    padding: 12,
    borderRadius: 24,
    backgroundColor: Colors.dark.surface,
  },
  qrFallback: {
    color: Colors.dark.textSecondary,
  },
  qrCloseButton: {
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#221E31',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  qrCloseLabel: {
    color: Colors.dark.textPrimary,
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
