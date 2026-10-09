import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AnalysisBar } from '../components/AnalysisBar';
import { DeleteBar } from '../components/DeleteBar';
import { EmptyState } from '../components/EmptyState';
import { SelectableTile } from '../components/SelectableTile';
import { useDeletePhotos } from '../hooks/useDeletePhotos';
import { useSelection } from '../hooks/useSelection';
import type { SimilarGroup } from '../lib/imageAnalysis';
import { colors, radius, spacing } from '../lib/theme';
import { useAnalysis } from '../state/AnalysisContext';

const COLUMNS = 3;
const GAP = spacing.sm;

export default function SimilarScreen() {
  const { width } = useWindowDimensions();
  const analysis = useAnalysis();
  const { deletePhotos, deleting } = useDeletePhotos();
  const groups = analysis.similarGroups;

  // By default, everything except the sharpest photo of each group is marked for deletion.
  const extras = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) for (const p of g.photos) if (p.id !== g.bestId) set.add(p.id);
    return set;
  }, [groups]);
  const isDefaultSelected = useCallback((id: string) => extras.has(id), [extras]);
  const { isSelected, toggle, setMany } = useSelection(isDefaultSelected);

  const selectedIds = useMemo(
    () => groups.flatMap((g) => g.photos.filter((p) => isSelected(p.id)).map((p) => p.id)),
    [groups, isSelected],
  );

  const tile = Math.floor((width - spacing.lg * 2 - spacing.lg * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  const renderGroup = useCallback(
    ({ item }: { item: SimilarGroup }) => {
      const ids = item.photos.map((p) => p.id);
      const allKept = ids.every((id) => !isSelected(id));
      return (
        <View style={styles.group}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupTitle}>
              {item.photos.length} similar · {new Date(item.photos[0].creationTime).toLocaleDateString()}
            </Text>
            <Pressable
              onPress={() =>
                allKept
                  ? setMany(ids.filter((id) => id !== item.bestId), true)
                  : setMany(ids, false)
              }
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.groupAction}>{allKept ? 'Keep best only' : 'Keep all'}</Text>
            </Pressable>
          </View>
          <View style={styles.tiles}>
            {item.photos.map((photo) => (
              <SelectableTile
                key={photo.id}
                photo={photo}
                size={tile}
                selected={isSelected(photo.id)}
                best={photo.id === item.bestId}
                onToggle={toggle}
              />
            ))}
          </View>
        </View>
      );
    },
    [isSelected, setMany, toggle, tile],
  );

  const header = (
    <View style={styles.header}>
      <AnalysisBar />
      {groups.length > 0 ? (
        <Text style={styles.hint}>
          The sharpest shot of each group is kept. Tap a photo to change what gets deleted.
        </Text>
      ) : null}
    </View>
  );

  const empty =
    analysis.analysedCount === 0 ? (
      <EmptyState
        icon="👯"
        title="Find similar photos"
        message="Analyse your library to find bursts and near-duplicates. It runs on your phone and you can pause it any time."
      />
    ) : (
      <EmptyState
        icon="✨"
        title={analysis.running ? 'Looking for similar photos…' : 'No similar photos found'}
        message={analysis.running ? 'Groups will appear here as they are found.' : undefined}
      />
    );

  return (
    <View style={styles.screen}>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.bestId}
        renderItem={renderGroup}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.content}
        initialNumToRender={4}
        windowSize={5}
      />
      {groups.length > 0 ? (
        <DeleteBar
          label={`Delete ${selectedIds.length} photo${selectedIds.length === 1 ? '' : 's'}`}
          disabled={selectedIds.length === 0}
          busy={deleting}
          onPress={() => deletePhotos(selectedIds)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1 },
  header: { gap: spacing.md },
  hint: { color: colors.textMuted, fontSize: 13 },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  groupAction: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
});
