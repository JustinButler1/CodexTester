import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/shared/auth-context';

const DEFAULT_GAME_RECORDS = [
  {
    key: 'spades',
    label: 'Spades',
    wins: 128,
    losses: 54,
  },
  {
    key: 'chess',
    label: 'Chess',
    wins: 42,
    losses: 38,
  },
];

const computeRecord = (record: { wins: number; losses: number }) => {
  const total = record.wins + record.losses;
  const winRate = total ? Math.round((record.wins / total) * 100) : 0;
  return { total, winRate };
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isSigningOut, setSigningOut] = React.useState(false);
  const [isQrVisible, setQrVisible] = React.useState(false);

  const displayName = React.useMemo(() => {
    const metadataName = typeof user?.user_metadata?.full_name === 'string'
      ? user?.user_metadata?.full_name?.trim()
      : null;
    if (metadataName) {
      return metadataName;
    }
    const emailHandle = user?.email?.split('@')[0];
    if (emailHandle && emailHandle.length > 0) {
      return emailHandle;
    }
    return 'Player';
  }, [user]);

  const email = user?.email ?? 'unknown@example.com';
  const identifier = user?.id ?? 'unknown';
  const avatarLetter = displayName.slice(0, 1).toUpperCase();
  const profileQrLink = React.useMemo(() => {
    if (!user) {
      return '';
    }
    return Linking.createURL('/', {
      queryParams: {
        scannedUserId: user.id,
        scannedDisplayName: displayName,
      },
    });
  }, [user, displayName]);

  const records = React.useMemo(
    () =>
      DEFAULT_GAME_RECORDS.map((record) => ({
        ...record,
        ...computeRecord(record),
      })),
    [],
  );

  const handleSignOut = React.useCallback(async () => {
    if (isSigningOut) {
      return;
    }
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (error) {
      console.error('Failed to sign out', error);
    } finally {
      setSigningOut(false);
    }
  }, [signOut, router, isSigningOut]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 32 }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.identifier}>Email · {email}</Text>
          <Text style={styles.identifierMuted}>User ID · {identifier}</Text>
          <Pressable style={styles.editButton}>
            <Text style={styles.editButtonText}>Manage Account</Text>
          </Pressable>
          <TouchableOpacity
            style={styles.qrButton}
            activeOpacity={0.85}
            onPress={() => setQrVisible(true)}
            disabled={!profileQrLink}>
            <Text style={styles.qrButtonText}>Show Profile QR</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recordsSection}>
          <Text style={styles.sectionTitle}>Game Records</Text>
          <View style={styles.recordGrid}>
            {records.map((record) => (
              <View key={record.key} style={styles.recordCard}>
                <Text style={styles.recordTitle}>{record.label}</Text>
                <View style={styles.recordStatsRow}>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{record.wins}</Text>
                    <Text style={styles.statLabel}>Wins</Text>
                  </View>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{record.losses}</Text>
                    <Text style={styles.statLabel}>Losses</Text>
                  </View>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{record.total}</Text>
                    <Text style={styles.statLabel}>Games</Text>
                  </View>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>{record.winRate}%</Text>
                    <Text style={styles.statLabel}>Win %</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionPanel}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.actionButton}>
              <Text style={styles.actionTitle}>Share ID</Text>
              <Text style={styles.actionSubtitle}>Invite friends to a table</Text>
            </Pressable>
            <Pressable style={styles.actionButton}>
              <Text style={styles.actionTitle}>History</Text>
              <Text style={styles.actionSubtitle}>View full match log</Text>
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={handleSignOut} disabled={isSigningOut}>
          <Text style={styles.primaryButtonText}>
            {isSigningOut ? 'Signing Out…' : 'Sign Out'}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={isQrVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setQrVisible(false)}>
          <View style={styles.qrBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.qrCard}>
                <Text style={styles.qrTitle}>Share your profile</Text>
                <Text style={styles.qrSubtitle}>
                  Scan to identify {displayName} · {identifier}
                </Text>
                <View style={styles.qrContainer}>
                  {profileQrLink ? (
                    <QRCode
                      value={profileQrLink}
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
                  onPress={() => setQrVisible(false)}>
                  <Text style={styles.qrCloseLabel}>Close</Text>
                </TouchableOpacity>
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
    gap: 28,
  },
  headerCard: {
    borderRadius: 28,
    padding: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#07030E',
    shadowOpacity: 0.4,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 18,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#221A2A',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 42,
    fontWeight: '700',
    color: Colors.dark.textPrimary,
  },
  name: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    color: Colors.dark.textPrimary,
  },
  identifier: {
    color: Colors.dark.textSecondary,
  },
  identifierMuted: {
    color: Colors.dark.neutral,
    fontSize: 13,
  },
  editButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    backgroundColor: '#221D2E',
  },
  editButtonText: {
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.dark.textPrimary,
  },
  qrButton: {
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: Colors.dark.accent,
  },
  qrButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  recordsSection: {
    gap: 18,
  },
  sectionTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  recordGrid: {
    gap: 16,
  },
  recordCard: {
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    backgroundColor: '#161221',
    gap: 16,
  },
  recordTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  recordStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 20,
  },
  statBlock: {
    minWidth: 70,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Colors.dark.textSecondary,
  },
  actionPanel: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#161221',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 18,
    padding: 18,
    backgroundColor: '#211A2A',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  actionTitle: {
    color: Colors.dark.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  actionSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: Colors.dark.accent,
    shadowColor: '#E0313A',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  primaryButtonText: {
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.dark.textPrimary,
    textTransform: 'uppercase',
  },
  qrBackdrop: {
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
  qrContainer: {
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
});
