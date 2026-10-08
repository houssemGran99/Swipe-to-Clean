import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
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

import { EmptyState } from '../components/EmptyState';
import { MonthCard } from '../components/MonthCard';
import { computeMonthStats, type MonthStats } from '../hooks/useMonthStats';
import type { MonthGroup } from '../lib/media';
import { colors, radius, spacing } from '../lib/theme';
import { useLibrary } from '../state/LibraryContext';
import { useReview } from '../state/ReviewContext';
import { getMonthReview } from '../state/reviewReducer';

const COLUMNS = 2;
const GAP = spacing.md;

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const library = useLibrary();
  const review = useReview();

  const cardWidth = Math.floor((width - spacing.lg * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  const statsByMonth = useMemo(() => {
    const map = new Map<string, MonthStats>();
    for (const month of library.months) {
      map.set(month.key, computeMonthStats(month, getMonthReview(review.state, month.key)));
    }
    return map;
  }, [library.months, review.state]);

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

  // ---- Permission & loading states ---------------------------------------------------------

  if (library.permission === null || !review.hydrated) {
    return <Centered />;
  }

  if (library.permission === 'undetermined') {
    return (
      <EmptyState
        icon="📸"
        title="Let's tidy up your photos"
        message="Swipe left to delete, right to keep. We need access to your photo library to get started. Nothing leaves your device."
        actions={[{ label: 'Allow photo access', onPress: library.requestPermission }]}
      />
    );
  }

  if (library.permission === 'denied') {
    return (
      <EmptyState
        icon="🔒"
        title="Photo access is off"
        message={
          library.canAskAgain
            ? 'Swipe to Clean can’t show your photos without access to your library.'
            : 'You previously denied photo access. Enable it in Settings to start cleaning your gallery.'
        }
        actions={
          library.canAskAgain
            ? [
                { label: 'Allow photo access', onPress: library.requestPermission },
                { label: 'Open Settings', onPress: library.openSettings, tone: 'secondary' },
              ]
            : [{ label: 'Open Settings', onPress: library.openSettings }]
        }
      />
    );
  }

  if (library.status === 'error') {
    return (
      <EmptyState
        icon="⚠️"
        title="Couldn’t load your photos"
        message={library.error ?? undefined}
        actions={[{ label: 'Try again', onPress: library.refresh }]}
      />
    );
  }

  if (library.status !== 'ready') {
    return <Centered label="Scanning your library…" />;
  }

  if (library.months.length === 0) {
    return (
      <EmptyState
        icon="🌤️"
        title="No photos found"
        message={
          library.permission === 'limited'
            ? 'You’ve only shared a few photos (or none) with Swipe to Clean.'
            : 'Your photo library is empty. Nothing to clean!'
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
      data={library.months}
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
            <Stat label="Photos" value={totals.total} />
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

function Centered({ label }: { label?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.text} size="large" />
      {label ? <Text style={styles.centeredText}>{label}</Text> : null}
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  centeredText: { color: colors.textMuted, fontSize: 15 },
});
