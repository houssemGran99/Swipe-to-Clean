import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '../../components/EmptyState';
import { renderLibraryGate } from '../../components/LibraryGate';
import { MonthCard } from '../../components/MonthCard';
import { computeMonthStats, type MonthStats } from '../../hooks/useMonthStats';
import type { MediaKind, MonthGroup } from '../../lib/media';
import { colors, radius, spacing } from '../../lib/theme';
import { useLibrary } from '../../state/LibraryContext';
import { useReview } from '../../state/ReviewContext';
import { getMonthReview } from '../../state/reviewReducer';

const COLUMNS = 2;
const GAP = spacing.md;

export default function MonthsScreen() {
  const params = useLocalSearchParams<{ kind: string }>();
  const kind: MediaKind = params.kind === 'video' ? 'video' : 'photo';
  const noun = kind === 'video' ? 'videos' : 'photos';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const library = useLibrary();
  const review = useReview();
  const months = kind === 'video' ? library.videoMonths : library.photoMonths;

  const cardWidth = Math.floor((width - spacing.lg * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  const statsByMonth = useMemo(() => {
    const map = new Map<string, MonthStats>();
    for (const month of months) {
      map.set(month.key, computeMonthStats(month, getMonthReview(review.state, month.key)));
    }
    return map;
  }, [months, review.state]);

  const totals = useMemo(() => {
    let total = 0;
    let reviewed = 0;
    let toDelete = 0;
    for (const stats of statsByMonth.values()) {
      total += stats.total;
      reviewed += stats.reviewed;
      toDelete += stats.toDelete.length;
    }
    return { total, reviewed, toDelete };
  }, [statsByMonth]);

  const openMonth = useCallback(
    (key: string) => router.push({ pathname: '/month/[key]', params: { key } }),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: MonthGroup }) => {
      const stats = statsByMonth.get(item.key);
      if (!stats) return null;
      return <MonthCard month={item} stats={stats} width={cardWidth} onPress={openMonth} />;
    },
    [statsByMonth, cardWidth, openMonth],
  );

  const gate = renderLibraryGate(library, review.hydrated);
  if (gate) return gate;

  if (months.length === 0) {
    return (
      <EmptyState
        icon="🌤️"
        title={`No ${noun} found`}
        message={
          library.permission === 'limited'
            ? `You’ve only shared a few ${noun} (or none) with Swipe to Clean.`
            : `You have no ${noun} on this device. Nothing to clean!`
        }
        actions={
          library.permission === 'limited'
            ? [{ label: 'Choose more photos', onPress: library.managePhotoSelection }]
            : [{ label: 'Refresh', onPress: library.refresh, tone: 'secondary' }]
        }
      />
    );
  }

  // ---- Grid --------------------------------------------------------------------------------

  return (
    <FlatList
      data={months}
      keyExtractor={(m) => m.key}
      renderItem={renderItem}
      numColumns={COLUMNS}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={7}
      removeClippedSubviews={Platform.OS === 'android'}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={library.refresh} tintColor={colors.text} />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          {library.permission === 'limited' ? (
            <Pressable style={styles.banner} onPress={library.managePhotoSelection}>
              <Text style={styles.bannerText}>
                Limited access — only some photos are visible. <Text style={styles.link}>Manage</Text>
              </Text>
            </Pressable>
          ) : null}
          <View style={styles.summary}>
            <Stat label={kind === 'video' ? 'Videos' : 'Photos'} value={totals.total} />
            <Stat label="Reviewed" value={totals.reviewed} />
            <Stat label="To delete" value={totals.toDelete} color={colors.delete} />
          </View>
        </View>
      }
    />
  );
}

function Stat({ label, value, color = colors.text }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, gap: GAP },
  row: { gap: GAP },
  header: { gap: spacing.md, marginBottom: spacing.xs },
  banner: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: colors.warning,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bannerText: { color: colors.text, fontSize: 13 },
  link: { color: colors.warning, fontWeight: '700' },
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
