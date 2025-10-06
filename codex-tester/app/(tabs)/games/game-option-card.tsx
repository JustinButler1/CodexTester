import { Link } from 'expo-router';
import { Pressable, PressableProps, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

type GameOptionCardTone = 'muted' | 'live';

type GameOptionCardProps = {
  title: string;
  subtitle: string;
  tagLabel?: string;
  tone?: GameOptionCardTone;
  disabled?: boolean;
  href?: string;
} & Omit<PressableProps, 'children'>;

export function GameOptionCard({
  title,
  subtitle,
  tagLabel,
  tone = 'muted',
  disabled,
  href,
  style,
  ...pressableProps
}: GameOptionCardProps) {
  const toneStyle = tone === 'live' ? styles.live : styles.muted;
  const Tag = () =>
    tagLabel ? (
      <View
        style={[styles.tagBase, tone === 'live' ? styles.tagActive : styles.tagMuted]}>
        <Text style={styles.tagText}>{tagLabel}</Text>
      </View>
    ) : null;

  const pressable = (
    <Pressable
      style={[styles.cardPressable, style]}
      disabled={disabled}
      {...pressableProps}>
      <View style={[styles.card, toneStyle, disabled && styles.disabledCard]}>
        <Tag />
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );

  if (href && !disabled) {
    return (
      <Link href={href} asChild>
        {pressable}
      </Link>
    );
  }

  return pressable;
}

const styles = StyleSheet.create({
  cardPressable: {
    width: '100%',
  },
  card: {
    width: '100%',
    borderRadius: 32,
    paddingVertical: 48,
    paddingHorizontal: 36,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 20,
    backgroundColor: Colors.dark.surfaceElevated,
    borderColor: Colors.dark.border,
    shadowColor: '#050209',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 16,
  },
  muted: {
    backgroundColor: '#14111D',
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  live: {
    backgroundColor: '#1F1422',
    borderColor: 'rgba(224, 49, 58, 0.6)',
  },
  disabledCard: {
    opacity: 0.5,
  },
  tagBase: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  tagMuted: {
    backgroundColor: '#2C2836',
  },
  tagActive: {
    backgroundColor: '#E0313A',
  },
  tagText: {
    color: '#F6F6FB',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  cardTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.8,
    lineHeight: 34,
    color: Colors.dark.textPrimary,
  },
  cardSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default GameOptionCard;
