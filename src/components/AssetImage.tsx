import { Image, type ImageContentFit } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAssetUri } from '../hooks/useAssetUri';
import { colors } from '../lib/theme';

type Props = {
  id: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  /** Load priority; the top card of the swipe deck uses `high`. */
  priority?: 'low' | 'normal' | 'high';
};

/**
 * Renders a library photo. The URI is resolved lazily, and expo-image decodes the bitmap
 * at view size (not full camera resolution) and caches it, which keeps memory bounded.
 */
export function AssetImage({ id, style, contentFit = 'cover', priority = 'normal' }: Props) {
  const uri = useAssetUri(id);
  return (
    <View style={[styles.placeholder, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={150}
          priority={priority}
          recyclingKey={id}
          cachePolicy="memory-disk"
          allowDownscaling
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
});
