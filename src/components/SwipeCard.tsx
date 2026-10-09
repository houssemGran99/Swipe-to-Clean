import { useEffect, useImperativeHandle, type Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import type { Photo } from '../lib/media';
import { colors, radius, spacing } from '../lib/theme';
import { AssetImage } from './AssetImage';

export type SwipeDirection = 'left' | 'right';

export type SwipeCardHandle = {
  swipe: (direction: SwipeDirection) => void;
};

type Props = {
  ref?: Ref<SwipeCardHandle>;
  photo: Photo;
  /** 0 = top of the stack. Only the top card responds to gestures. */
  depth: number;
  width: number;
  height: number;
  /** When set, the card flies in from that side on mount (used for undo). */
  enterFrom?: SwipeDirection;
  onSwiped: (photoId: string, direction: SwipeDirection) => void;
};

const SPRING = { damping: 18, stiffness: 180, mass: 0.8 } as const;
const VELOCITY_THRESHOLD = 900;

export function SwipeCard({ ref, photo, depth, width, height, enterFrom, onSwiped }: Props) {
  const offscreen = width * 1.6;
  const threshold = width * 0.3;
  const isTop = depth === 0;

  const translateX = useSharedValue(enterFrom ? (enterFrom === 'left' ? -offscreen : offscreen) : 0);
  const translateY = useSharedValue(0);
  const gone = useSharedValue(false);

  useEffect(() => {
    if (enterFrom) translateX.set(withSpring(0, SPRING));
    // Only on mount: the entry animation must not replay on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fling = (sign: number) => {
    'worklet';
    if (gone.get()) return;
    gone.set(true);
    translateY.set(withTiming(translateY.get() + 40, { duration: 220 }));
    translateX.set(
      withTiming(sign * offscreen, { duration: 220 }, (finished) => {
        if (finished) scheduleOnRN(onSwiped, photo.id, sign > 0 ? 'right' : 'left');
      }),
    );
  };

  useImperativeHandle(
    ref,
    () => ({
      swipe: (direction) => scheduleOnUI(fling, direction === 'right' ? 1 : -1),
    }),
    // fling closes over values that are stable for this card's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photo.id, offscreen],
  );

  const pan = Gesture.Pan()
    .enabled(isTop)
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      if (gone.get()) return;
      translateX.set(e.translationX);
      translateY.set(e.translationY * 0.4);
    })
    .onEnd((e) => {
      if (gone.get()) return;
      const passed = Math.abs(translateX.get()) > threshold;
      const flicked = Math.abs(e.velocityX) > VELOCITY_THRESHOLD;
      if (passed || flicked) {
        fling(Math.sign(flicked ? e.velocityX : translateX.get()));
      } else {
        translateX.set(withSpring(0, SPRING));
        translateY.set(withSpring(0, SPRING));
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.get(), [-width, 0, width], [-14, 0, 14]);
    return {
      transform: [
        { translateX: translateX.get() },
        { translateY: translateY.get() },
        { translateY: withTiming(depth * 12) },
        { rotate: `${rotate}deg` },
        { scale: withTiming(1 - depth * 0.05) },
      ],
    };
  });

  const keepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.get(), [0, threshold], [0, 1], Extrapolation.CLAMP),
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.get(), [-threshold, 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.card,
          { width, height, zIndex: 10 - depth, pointerEvents: isTop ? 'auto' : 'none' },
          cardStyle,
        ]}
        accessibilityLabel="Photo"
        accessibilityHint="Swipe left to delete, swipe right to keep"
      >
        <AssetImage
          id={photo.id}
          style={[StyleSheet.absoluteFill, styles.image]}
          contentFit="contain"
          priority={isTop ? 'high' : 'normal'}
        />
        <Animated.View style={[styles.badge, styles.keepBadge, keepStyle]}>
          <Text style={[styles.badgeText, { color: colors.keep }]}>KEEP</Text>
        </Animated.View>
        <Animated.View style={[styles.badge, styles.deleteBadge, deleteStyle]}>
          <Text style={[styles.badgeText, { color: colors.delete }]}>DELETE</Text>
        </Animated.View>
        {photo.creationTime > 0 ? (
          <View style={styles.dateChip}>
            <Text style={styles.dateText}>{new Date(photo.creationTime).toLocaleDateString()}</Text>
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  image: { backgroundColor: '#000' },
  badge: {
    position: 'absolute',
    top: spacing.xxl,
    borderWidth: 4,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  keepBadge: { left: spacing.xl, borderColor: colors.keep, transform: [{ rotate: '-15deg' }] },
  deleteBadge: { right: spacing.xl, borderColor: colors.delete, transform: [{ rotate: '15deg' }] },
  badgeText: { fontSize: 36, fontWeight: '900', letterSpacing: 2 },
  dateChip: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  dateText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
