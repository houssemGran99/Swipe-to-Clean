import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../lib/theme';

type Props = { label: string; disabled?: boolean; busy?: boolean; onPress: () => void };

/** Pinned footer with the destructive "delete N" action. */
export function DeleteBar({ label, disabled, busy, onPress }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
      <Pressable
        onPress={onPress}
        disabled={disabled || busy}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          (pressed || busy) && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>{label}</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.delete,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.35 },
  text: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
