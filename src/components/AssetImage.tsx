import { Image, type ImageContentFit } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAssetUri } from '../hooks/useAssetUri';
import { formatDuration, type Photo } from '../lib/media';

type Props = {
  item: Photo;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  /** Load priority; the top card of the swipe deck uses `high`. */
  priority?: 'low' | 'normal' | 'high';
  /** Show the ▶ duration chip on videos. */
  showVideoBadge?: boolean;
};

/**
 * Renders a library photo, or a still frame for a video. The URI is resolved lazily, and
 * expo-image decodes the bitmap at view size (not full camera resolution) and caches it,
 * which keeps memory bounded.
 */
export function AssetImage({
  item,
  style,
  contentFit = 'contain',
  priority = 'normal',
  showVideoBadge = true,
}: Props) {
  const uri = useAssetUri(item.id, item.kind);
  return (
    <View style={[styles.placeholder, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={150}
          priority={priority}
          recyclingKey={item.id}
          cachePolicy="memory-disk"
          allowDownscaling
        />
      ) : null}
      {showVideoBadge && item.kind === 'video' ? (
        <View style={styles.videoBadge}>
          <Text style={styles.videoText}>▶ {formatDuration(item.duration)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: '#000', overflow: 'hidden' },
  videoBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  videoText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
