import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

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
    <ThemedView style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
      <ThemedView style={styles.headerCard}>
        <ThemedView style={styles.avatar}>
          <ThemedText style={styles.avatarText}>{PROFILE.name.slice(0, 1)}</ThemedText>
        </ThemedView>
        <ThemedText type="title" style={styles.name}>
          {PROFILE.name}
        </ThemedText>
        <ThemedText style={styles.identifier}>ID: {PROFILE.id}</ThemedText>
        <Pressable style={styles.editButton}>
          <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.statsCard}>
        <ThemedText type="subtitle">Record</ThemedText>
        <ThemedView style={styles.statsRow}>
          <ThemedView style={styles.statBlock}>
            <ThemedText style={styles.statValue}>{PROFILE.wins}</ThemedText>
            <ThemedText style={styles.statLabel}>Wins</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statBlock}>
            <ThemedText style={styles.statValue}>{PROFILE.losses}</ThemedText>
            <ThemedText style={styles.statLabel}>Losses</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statBlock}>
            <ThemedText style={styles.statValue}>{totalGames}</ThemedText>
            <ThemedText style={styles.statLabel}>Games</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statBlock}>
            <ThemedText style={styles.statValue}>{winRate}%</ThemedText>
            <ThemedText style={styles.statLabel}>Win %</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      <Pressable style={styles.primaryButton}>
        <ThemedText style={styles.primaryButtonText}>Add Game</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 24,
  },
  headerCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 42,
    fontWeight: '700',
  },
  name: {
    textAlign: 'center',
  },
  identifier: {
    opacity: 0.75,
  },
  editButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  editButtonText: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statsCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  statBlock: {
    minWidth: 70,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.7,
  },
  primaryButton: {
    marginTop: 'auto',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#22c55e',
  },
  primaryButtonText: {
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
