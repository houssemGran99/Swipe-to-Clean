import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssetImage } from '../../components/AssetImage';
import { EmptyState } from '../../components/EmptyState';
import { useMonthStats } from '../../hooks/useMonthStats';
import { kindOfMonthKey, type Photo } from '../../lib/media';
import { colors, radius, spacing } from '../../lib/theme';
import { useLibrary } from '../../state/LibraryContext';
import { useMonthReview, useReview } from '../../state/ReviewContext';

const COLUMNS = 3;
const GAP = 3;

export default function TrashScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const library = useLibrary();
  const { restore, purge } = useReview();
  const month = library.getMonth(key);
  const stats = useMonthStats(month, useMonthReview(key));
  const [deleting, setDeleting] = useState(false);

  const kind = kindOfMonthKey(key);
  const noun = kind === 'video' ? 'video' : 'photo';
  const backToMonths = useCallback(
    () => router.dismissTo({ pathname: '/months/[kind]', params: { kind } }),
    [router, kind],
  );
  const tile = Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS);
  const count = stats.toDelete.length;

  const renderItem = useCallback(
    ({ item }: { item: Photo }) => (
      <Pressable
        onPress={() => restore(key, item.id)}
        accessibilityRole="button"
        accessibilityLabel={`Keep this ${noun} instead`}
        style={({ pressed }) => [{ width: tile, height: tile }, pressed && styles.pressed]}
      >
        <AssetImage item={item} style={StyleSheet.absoluteFill} />
        <View style={styles.restoreChip}>
          <Text style={styles.restoreText}>↩︎</Text>
        </View>
      </Pressable>
    ),
    [restore, key, tile, noun],
  );

  const emptyTrash = useCallback(async () => {
    const ids = stats.toDelete.map((p) => p.id);
    setDeleting(true);
    // Triggers the native OS confirmation dialog for a single batch delete.
    const ok = await library.deleteFromDevice(ids);
    setDeleting(false);
    if (!ok) {
      Alert.alert('Nothing was deleted', 'The deletion was cancelled or not permitted.');
      return;
    }
    purge(ids);
    Alert.alert('Trash emptied', `${ids.length} ${noun}${ids.length === 1 ? '' : 's'} deleted.`, [
      { text: 'Back to months', onPress: backToMonths },
    ]);
  }, [stats.toDelete, library, purge, noun, backToMonths]);

  if (count === 0) {
    return (
      <EmptyState
        icon="✨"
        title="Trash is empty"
        message={`No ${noun}s from this month are marked for deletion.`}
        actions={[{ label: 'Back to months', onPress: backToMonths }]}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.hint}>
        {`${count} ${noun}${count === 1 ? '' : 's'} marked for deletion. Tap one to keep it instead.`}
      </Text>
      <FlatList
        data={stats.toDelete}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        getItemLayout={(_, index) => ({
          length: tile + GAP,
          offset: (tile + GAP) * Math.floor(index / COLUMNS),
          index,
        })}
        initialNumToRender={18}
        windowSize={5}
      />
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          onPress={emptyTrash}
          disabled={deleting}
          accessibilityRole="button"
          style={({ pressed }) => [styles.deleteButton, (pressed || deleting) && styles.pressed]}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deleteText}>
              Empty Trash ({count})
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  grid: { gap: GAP, paddingBottom: spacing.lg },
  row: { gap: GAP },
  pressed: { opacity: 0.6 },
  restoreChip: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreText: { color: '#fff', fontSize: 14 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  deleteButton: {
    backgroundColor: colors.delete,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  deleteText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
