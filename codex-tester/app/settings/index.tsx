import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/shared/auth-context';
import { SpadesTeam, fetchArchivedTeamsForUser, unarchiveTeam } from '@/src/shared/spades-store';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [archivedTeams, setArchivedTeams] = React.useState<SpadesTeam[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [updatingTeamId, setUpdatingTeamId] = React.useState<string | null>(null);

  const loadArchivedTeams = React.useCallback(async () => {
    if (!user) {
      setArchivedTeams([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const teams = await fetchArchivedTeamsForUser(user.id);
      setArchivedTeams(teams);
    } catch (error) {
      console.error('Failed to load archived teams', error);
      Alert.alert('Unable to load', 'Try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  React.useEffect(() => {
    loadArchivedTeams();
  }, [loadArchivedTeams]);

  useFocusEffect(
    React.useCallback(() => {
      loadArchivedTeams();
    }, [loadArchivedTeams]),
  );

  const handleRefresh = React.useCallback(async () => {
    if (!user) {
      return;
    }
    setRefreshing(true);
    await loadArchivedTeams();
  }, [loadArchivedTeams, user]);

  const handleUnarchiveTeam = React.useCallback(
    async (teamId: string) => {
      if (!user) {
        return;
      }
      setUpdatingTeamId(teamId);
      try {
        await unarchiveTeam(teamId, user.id);
        await loadArchivedTeams();
      } catch (error) {
        console.error('Failed to unarchive team', error);
        Alert.alert('Unable to restore team', 'Please try again.');
      } finally {
        setUpdatingTeamId(null);
      }
    },
    [loadArchivedTeams, user],
  );

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 24, alignItems: 'center', justifyContent: 'center' }] }>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top + 24 }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.dark.accent} />
      }
    >
      <Text style={styles.heading}>Settings</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Archived Teams</Text>
        {archivedTeams.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No archived teams</Text>
            <Text style={styles.emptySubtitle}>Teams you archive will appear here for quick restore.</Text>
          </View>
        ) : (
          archivedTeams.map((team) => (
            <View key={team.id} style={styles.teamCard}>
              <View style={styles.teamHeader}>
                <Text style={styles.teamName}>{team.label}</Text>
                <Text style={styles.teamCreated}>
                  Created {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : '—'}
                </Text>
              </View>
              <Text style={styles.teamRoster}>{team.members.map((member) => member.displayName).join(' · ')}</Text>
              <Pressable
                style={[styles.restoreButton, updatingTeamId === team.id && styles.buttonDisabled]}
                onPress={() => handleUnarchiveTeam(team.id)}
                disabled={updatingTeamId === team.id}
              >
                <Text style={styles.restoreLabel}>
                  {updatingTeamId === team.id ? 'Restoring…' : 'Restore Team'}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  heading: {
    color: Colors.dark.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  emptyState: {
    borderRadius: 18,
    padding: 20,
    backgroundColor: Colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 6,
  },
  emptyTitle: {
    color: Colors.dark.textPrimary,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  teamCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    gap: 10,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: {
    color: Colors.dark.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  teamCreated: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  teamRoster: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  restoreButton: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.dark.accent,
  },
  restoreLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
