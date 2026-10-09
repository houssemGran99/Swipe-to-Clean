import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../lib/theme';

type Props = {
  icon: string;
  title: string;
  subtitle: string;
  /** Small pill in the top-right corner, e.g. a pending count. */
  badge?: string;
  onPress: () => void;
};

export function CategoryCard({ icon, title, subtitle, badge, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 26 },
  text: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 14 },
  chevron: { color: colors.textMuted, fontSize: 28, fontWeight: '300' },
  badge: {
    position: 'absolute',
    top: -8,
    right: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  badgeText: { color: '#0B1220', fontSize: 12, fontWeight: '800' },
});
