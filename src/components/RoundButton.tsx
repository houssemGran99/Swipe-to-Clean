import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../lib/theme';

type Props = {
  icon: string;
  color: string;
  size?: number;
  label: string;
  disabled?: boolean;
  onPress: () => void;
};

export function RoundButton({ icon, color, size = 72, label, disabled, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2, borderColor: color },
        pressed && { backgroundColor: `${color}33`, transform: [{ scale: 0.92 }] },
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.icon, { color, fontSize: size * 0.42 }]}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    backgroundColor: colors.surface,
  },
  icon: { fontWeight: '800' },
  disabled: { opacity: 0.35 },
});
