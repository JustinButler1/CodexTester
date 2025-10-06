import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

const PROFILE = {
  id: 'player-204',
  name: 'Kai Johnson',
  wins: 128,
  losses: 54,
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const totalGames = PROFILE.wins + PROFILE.losses;
  const winRate = totalGames ? Math.round((PROFILE.wins / totalGames) * 100) : 0;

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40 },
      ]}>
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{PROFILE.name.slice(0, 1)}</Text>
        </View>
        <Text style={styles.name}>{PROFILE.name}</Text>
        <Text style={styles.identifier}>ID · {PROFILE.id}</Text>
        <Pressable style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </Pressable>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.sectionTitle}>Record Snapshot</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{PROFILE.wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{PROFILE.losses}</Text>
            <Text style={styles.statLabel}>Losses</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{totalGames}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{winRate}%</Text>
            <Text style={styles.statLabel}>Win %</Text>
          </View>
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

      <Pressable style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Add Game</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
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
  statsCard: {
    borderRadius: 28,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    backgroundColor: '#161221',
    gap: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.textPrimary,
    letterSpacing: 0.4,
  },
  statsRow: {
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
    marginTop: 'auto',
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
});
