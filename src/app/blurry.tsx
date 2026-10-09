import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AnalysisBar } from '../components/AnalysisBar';
import { DeleteBar } from '../components/DeleteBar';
import { EmptyState } from '../components/EmptyState';
import { SelectableTile } from '../components/SelectableTile';
import { useDeletePhotos } from '../hooks/useDeletePhotos';
import { useSelection } from '../hooks/useSelection';
import type { BlurSensitivity } from '../lib/imageAnalysis';
import type { Photo } from '../lib/media';
import { colors, radius, spacing } from '../lib/theme';
import { useAnalysis } from '../state/AnalysisContext';

const COLUMNS = 3;
const GAP = 3;
const SENSITIVITIES: { value: BlurSensitivity; label: string }[] = [
  { value: 'low', label: 'Very blurry' },
  { value: 'medium', label: 'Blurry' },
  { value: 'high', label: 'Slightly soft' },
];

const alwaysSelected = () => true;

export default function BlurryScreen() {
  const { width } = useWindowDimensions();
  const analysis = useAnalysis();
  const { deletePhotos, deleting } = useDeletePhotos();
  const photos = analysis.blurryPhotos;
  const { isSelected, toggle } = useSelection(alwaysSelected);

  const selectedIds = useMemo(
    () => photos.filter((p) => isSelected(p.id)).map((p) => p.id),
    [photos, isSelected],
  );

  const tile = Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS);

  const renderItem = useCallback(
    ({ item }: { item: Photo }) => (
      <SelectableTile photo={item} size={tile} selected={isSelected(item.id)} onToggle={toggle} />
    ),
    [tile, isSelected, toggle],
  );

  const header = (
    <View style={styles.header}>
      <AnalysisBar />
      <View style={styles.segment}>
        {SENSITIVITIES.map((s) => {
          const active = analysis.blurSensitivity === s.value;
          return (
            <Pressable
              key={s.value}
              onPress={() => analysis.setBlurSensitivity(s.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.segmentItem, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {photos.length > 0 ? (
        <Text style={styles.hint}>
          {photos.length} photo{photos.length === 1 ? '' : 's'} found, blurriest first. Tap a photo to keep it.
        </Text>
      ) : null}
    </View>
  );

  const empty =
    analysis.analysedCount === 0 ? (
      <EmptyState
        icon="🌫️"
        title="Find blurry photos"
        message="Analyse your library to spot out-of-focus and shaky shots. It runs on your phone and you can pause it any time."
      />
    ) : (
      <EmptyState
        icon="📷"
        title={analysis.running ? 'Looking for blurry photos…' : 'No blurry photos found'}
        message={analysis.running ? undefined : 'Try a more sensitive setting above.'}
      />
    );

  return (
    <View style={styles.screen}>
      <FlatList
        data={photos}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.content}
        initialNumToRender={18}
        windowSize={5}
      />
      {photos.length > 0 ? (
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
  content: { gap: GAP, flexGrow: 1 },
  row: { gap: GAP },
  header: { gap: spacing.md, padding: spacing.lg },
  hint: { color: colors.textMuted, fontSize: 13 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 3,
  },
  segmentItem: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.surfaceRaised },
  segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: colors.text },
});
