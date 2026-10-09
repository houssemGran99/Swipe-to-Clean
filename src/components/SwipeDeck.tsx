import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import type { Photo } from '../lib/media';
import { SwipeCard, type SwipeCardHandle, type SwipeDirection } from './SwipeCard';

export type SwipeDeckHandle = {
  swipe: (direction: SwipeDirection) => void;
};

type Props = {
  ref?: Ref<SwipeDeckHandle>;
  /** Photos still to review, top of the stack first. */
  photos: Photo[];
  /** Photo id that should animate back in, and from which side (after an undo). */
  returning?: { id: string; from: SwipeDirection } | null;
  onSwiped: (photoId: string, direction: SwipeDirection) => void;
};

/** How many cards are mounted at once. Keeps memory flat regardless of month size. */
const VISIBLE_CARDS = 3;

export function SwipeDeck({ ref, photos, returning, onSwiped }: Props) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const topCard = useRef<SwipeCardHandle>(null);

  useImperativeHandle(ref, () => ({
    swipe: (direction) => topCard.current?.swipe(direction),
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev?.width === width && prev?.height === height ? prev : { width, height }));
  };

  const visible = photos.slice(0, VISIBLE_CARDS);
  const cardHeight = size ? size.height - 24 : 0;

  return (
    <View style={styles.container} onLayout={onLayout}>
      {size
        ? visible
            .map((photo, depth) => (
              <SwipeCard
                key={photo.id}
                ref={depth === 0 ? topCard : undefined}
                photo={photo}
                depth={depth}
                width={size.width}
                height={cardHeight}
                enterFrom={returning?.id === photo.id ? returning.from : undefined}
                onSwiped={onSwiped}
              />
            ))
            // Render bottom cards first so the top card paints last.
            .reverse()
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
});
