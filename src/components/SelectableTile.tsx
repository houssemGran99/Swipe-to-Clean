import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Photo } from '../lib/media';
import { colors, radius } from '../lib/theme';
import { AssetImage } from './AssetImage';

type Props = {
  photo: Photo;
  size: number;
  selected: boolean;
  /** Shows a "Best" badge (the suggested photo to keep). */
  best?: boolean;
  onToggle: (id: string) => void;
};

/** A thumbnail that toggles between "keep" and "delete" when tapped. */
function SelectableTileImpl({ photo, size, selected, best, onToggle }: Props) {
  return (
    <Pressable
      onPress={() => onToggle(photo.id)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={selected ? 'Marked for deletion' : 'Kept'}
      style={[styles.tile, { width: size, height: size }]}
    >
      <AssetImage item={photo} style={StyleSheet.absoluteFill} />
      {selected ? <View style={styles.dim} /> : null}
      <View style={[styles.check, selected && styles.checkOn]}>
        {selected ? <Text style={styles.checkText}>✕</Text> : null}
      </View>
      {best ? (
        <View style={styles.best}>
          <Text style={styles.bestText}>★ Best</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export const SelectableTile = memo(SelectableTileImpl);

const styles = StyleSheet.create({
  tile: { borderRadius: radius.sm, overflow: 'hidden' },
  dim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(239,68,68,0.28)' },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.delete, borderColor: colors.delete },
  checkText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  best: {
    position: 'absolute',
    left: 6,
    top: 6,
    backgroundColor: colors.keep,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  bestText: { color: '#04120A', fontSize: 11, fontWeight: '800' },
});
