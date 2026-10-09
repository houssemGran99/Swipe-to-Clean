import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '../../components/EmptyState';
import { ProgressBar } from '../../components/ProgressBar';
import { RoundButton } from '../../components/RoundButton';
import type { SwipeDirection } from '../../components/SwipeCard';
import { SwipeDeck, type SwipeDeckHandle } from '../../components/SwipeDeck';
import { useMonthStats } from '../../hooks/useMonthStats';
import { kindOfMonthKey, monthLabelFor } from '../../lib/media';
import { colors, radius, spacing } from '../../lib/theme';
import { useLibrary } from '../../state/LibraryContext';
import { useMonthReview, useReview } from '../../state/ReviewContext';

export default function SwipeDeckScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const library = useLibrary();
  const { decide, undo, resetMonth } = useReview();
  const month = library.getMonth(key);
  const review = useMonthReview(key);
  const stats = useMonthStats(month, review);
  const deck = useRef<SwipeDeckHandle>(null);
  const [returning, setReturning] = useState<{ id: string; from: SwipeDirection } | null>(null);

  const title = month?.label ?? monthLabelFor(key);
  const noun = kindOfMonthKey(key) === 'video' ? 'videos' : 'photos';
  const openTrash = useCallback(
    () => router.push({ pathname: '/trash/[key]', params: { key } }),
    [router, key],
  );

  const onSwiped = useCallback(
    (photoId: string, direction: SwipeDirection) => {
      Haptics.impactAsync(
        direction === 'left' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => {});
      setReturning(null);
      decide(key, photoId, direction === 'left' ? 'delete' : 'keep');

      // Finishing the month takes you straight to the trash review.
      const isLast = stats.remaining.length === 1 && stats.remaining[0].id === photoId;
      const willHaveTrash = stats.toDelete.length > 0 || direction === 'left';
      if (isLast && willHaveTrash) openTrash();
    },
    [decide, key, stats.remaining, stats.toDelete.length, openTrash],
  );

  const onUndo = useCallback(() => {
    const last = review.history[review.history.length - 1];
    if (!last) return;
    const decision = review.decisions[last];
    Haptics.selectionAsync().catch(() => {});
    setReturning({ id: last, from: decision === 'delete' ? 'left' : 'right' });
    undo(key);
  }, [review, undo, key]);

  const header = (
    <Stack.Screen
      options={{
        title,
        headerRight: () =>
          stats.toDelete.length > 0 ? (
            <Pressable onPress={openTrash} hitSlop={10} accessibilityRole="button" accessibilityLabel="Open trash">
              <Text style={styles.trashLink}>🗑 {stats.toDelete.length}</Text>
            </Pressable>
          ) : null,
      }}
    />
  );

  if (!month || stats.total === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon="🗓️"
          title="This month is empty"
          message={`There are no ${noun} left in this month. They may have been deleted or moved.`}
          actions={[{ label: 'Back to months', onPress: () => router.back() }]}
        />
      </>
    );
  }

  const canUndo = review.history.length > 0;

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + spacing.lg }]}>
      {header}
      <View style={styles.progressRow}>
        <View style={styles.progress}>
          <ProgressBar value={stats.reviewed / stats.total} />
        </View>
        <Text style={styles.progressText}>
          {stats.reviewed} / {stats.total}
        </Text>
      </View>

      <View style={styles.deckArea}>
        {stats.remaining.length > 0 ? (
          <SwipeDeck ref={deck} photos={stats.remaining} returning={returning} onSwiped={onSwiped} />
        ) : (
          <EmptyState
            icon="🎉"
            title="Month complete!"
            message={
              stats.toDelete.length > 0
                ? `You kept ${stats.kept} and marked ${stats.toDelete.length} for deletion.`
                : `You kept all ${stats.kept} ${noun}.`
            }
            actions={[
              ...(stats.toDelete.length > 0
                ? [{ label: `Review ${stats.toDelete.length} to delete`, onPress: openTrash }]
                : []),
              {
                label: 'Start over',
                onPress: () => resetMonth(key),
                tone: 'secondary' as const,
              },
            ]}
          />
        )}
      </View>

      <View style={styles.controls}>
        <RoundButton
          icon="✕"
          label="Delete"
          color={colors.delete}
          disabled={stats.remaining.length === 0}
          onPress={() => deck.current?.swipe('left')}
        />
        <RoundButton icon="↺" label="Undo last swipe" color={colors.warning} size={56} disabled={!canUndo} onPress={onUndo} />
        <RoundButton
          icon="✓"
          label="Keep"
          color={colors.keep}
          disabled={stats.remaining.length === 0}
          onPress={() => deck.current?.swipe('right')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  progress: { flex: 1 },
  progressText: { color: colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
  deckArea: { flex: 1 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  trashLink: {
    color: colors.delete,
    fontWeight: '800',
    fontSize: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
});
