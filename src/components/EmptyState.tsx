import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../lib/theme';

type Action = { label: string; onPress: () => void; tone?: 'primary' | 'secondary' };

type Props = {
  icon: string;
  title: string;
  message?: string;
  actions?: Action[];
};

export function EmptyState({ icon, title, message, actions = [] }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actions.map((action) => (
        <Pressable
          key={action.label}
          onPress={action.onPress}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            action.tone === 'secondary' && styles.buttonSecondary,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.buttonText, action.tone === 'secondary' && styles.buttonTextSecondary]}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  icon: { fontSize: 56 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  message: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  buttonText: { color: '#0B1220', fontSize: 16, fontWeight: '700' },
  buttonTextSecondary: { color: colors.text },
  pressed: { opacity: 0.75 },
});
