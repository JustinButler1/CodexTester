import React from 'react';
import { Link } from 'expo-router';
import {
  FlatList,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { GAME_SUMMARIES } from '@/constants/mock-games';

type Summary = (typeof GAME_SUMMARIES)[number];

const BUTTON_CLEARANCE = 132;

const getScores = (finalScore: string) => {
  const [first, second] = finalScore.split('–').map((part) => part.trim());
  return { teamOneScore: first ?? '0', teamTwoScore: second ?? '0' };
};

const renderSeparator = () => <View style={styles.separator} />;

const SummaryCard = React.memo(({ item }: { item: Summary }) => {
  const { teamOneScore, teamTwoScore } = React.useMemo(() => getScores(item.finalScore), [item.finalScore]);
  const teamOneWon = item.winningTeam === 'teamOne';
  const teamTwoWon = item.winningTeam === 'teamTwo';
  const winnerName = teamOneWon ? item.teamOne : item.teamTwo;

  return (
    <Link href={{ pathname: '/game/[id]', params: { id: item.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}>
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={[styles.teamChip, teamOneWon ? styles.teamChipWinner : styles.teamChipMuted]}>
              <Text style={styles.teamChipText} numberOfLines={1}>{item.teamOne}</Text>
            </View>
            <Text style={styles.vsLabel}>vs</Text>
            <View style={[styles.teamChip, teamTwoWon ? styles.teamChipWinner : styles.teamChipMuted]}>
              <Text style={styles.teamChipText} numberOfLines={1}>{item.teamTwo}</Text>
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
            <Text style={styles.metaLabel}>{item.date}</Text>
            <View style={styles.resultPill}>
              <Text style={styles.resultText}>Winner · {winnerName}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
});

SummaryCard.displayName = 'SummaryCard';

export default function SpadesGamesScreen() {
  const insets = useSafeAreaInsets();
  const [fabShift, setFabShift] = React.useState(0);
  const metricsRef = React.useRef({ content: 0, layout: 0, offset: 0 });

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

  const renderItem = React.useCallback(({ item }: ListRenderItemInfo<Summary>) => (
    <SummaryCard item={item} />
  ), []);

  return (
    <View style={styles.screen}>
      <FlatList
        data={GAME_SUMMARIES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 36, paddingBottom: insets.bottom + BUTTON_CLEARANCE + 56 },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeLabel}>Spades</Text>
            </View>
            <Text style={styles.heading}>Match Library</Text>
            <Text style={styles.subheading}>
              Browse past tables and launch a new live slate when you're ready.
            </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  listContent: {
    paddingHorizontal: 24,
    gap: 20,
  },
  header: {
    gap: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  headerBadge: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1F1A28',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  headerBadgeLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  heading: {
    color: Colors.dark.textPrimary,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  subheading: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  separator: {
    height: 18,
  },
  cardPressable: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardBody: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: Colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 18,
    shadowColor: '#05030B',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 18,
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1F1B27',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  teamChipWinner: {
    backgroundColor: 'rgba(224, 49, 58, 0.14)',
    borderColor: 'rgba(224, 49, 58, 0.45)',
  },
  teamChipMuted: {
    backgroundColor: '#1C1A24',
    borderColor: 'rgba(255,255,255,0.06)',
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
    justifyContent: 'center',
    gap: 16,
  },
  scoreDivider: {
    width: 2,
    height: 32,
    borderRadius: 1,
    backgroundColor: '#2C2736',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  scoreWinner: {
    color: Colors.dark.textPrimary,
  },
  scoreLoser: {
    color: Colors.dark.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  resultPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#231824',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(224, 49, 58, 0.6)',
  },
  resultText: {
    color: Colors.dark.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  fabArena: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
  },
  fabButton: {
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 18,
    backgroundColor: Colors.dark.accent,
    shadowColor: '#E0313A',
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  fabText: {
    color: Colors.dark.textPrimary,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  footerSpacer: {
    height: 32,
  },
});
