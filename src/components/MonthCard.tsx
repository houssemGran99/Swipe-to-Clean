import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MonthStats } from '../hooks/useMonthStats';
import type { MonthGroup } from '../lib/media';
import { colors, radius, spacing } from '../lib/theme';
import { AssetImage } from './AssetImage';
import { ProgressBar } from './ProgressBar';

type Props = {
  month: MonthGroup;
  stats: MonthStats;
  width: number;
  onPress: (key: string) => void;
};

function MonthCardImpl({ month, stats, width, onPress }: Props) {
  const cover = month.photos[0];
  const progress = stats.total === 0 ? 0 : stats.reviewed / stats.total;

  return (
    <Pressable
      onPress={() => onPress(month.key)}
      accessibilityRole="button"
      accessibilityLabel={`${month.label}, ${stats.total} ${month.kind}s, ${stats.reviewed} reviewed`}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      <View style={{ width, height: width }}>
        {cover ? <AssetImage item={cover} style={StyleSheet.absoluteFill} showVideoBadge={false} /> : null}
        {stats.done ? (
          <View style={styles.doneBadge}>
            <Text style={styles.doneText}>✓ Done</Text>
          </View>
        ) : null}
        {stats.toDelete.length > 0 ? (
          <View style={styles.trashBadge}>
            <Text style={styles.trashText}>🗑 {stats.toDelete.length}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.meta}>
        <Text style={styles.label} numberOfLines={1}>
          {month.label}
        </Text>
        <Text style={styles.count}>
          {stats.reviewed} / {stats.total} reviewed
        </Text>
        <ProgressBar value={progress} color={stats.done ? colors.keep : colors.accent} />
      </View>
    </Pressable>
  );
}

export const MonthCard = memo(MonthCardImpl);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  meta: { padding: spacing.md, gap: spacing.xs },
  label: { color: colors.text, fontSize: 15, fontWeight: '700' },
  count: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.xs },
  doneBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.keep,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  doneText: { color: '#04120A', fontSize: 12, fontWeight: '800' },
  trashBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.9)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  trashText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
