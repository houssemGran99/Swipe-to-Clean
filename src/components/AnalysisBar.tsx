import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../lib/theme';
import { useAnalysis } from '../state/AnalysisContext';
import { ProgressBar } from './ProgressBar';

/** Progress of the on-device photo analysis, with start / pause. */
export function AnalysisBar() {
  const { running, analysedCount, totalCount, start, stop } = useAnalysis();
  const remaining = totalCount - analysedCount;
  const done = remaining === 0 && totalCount > 0;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.text}>
          <Text style={styles.title}>
            {done ? 'All photos analysed' : running ? 'Analysing photos…' : 'Photo analysis'}
          </Text>
          <Text style={styles.subtitle}>
            {analysedCount.toLocaleString()} / {totalCount.toLocaleString()} analysed · on device, nothing is uploaded
          </Text>
        </View>
        {!done ? (
          <Pressable
            onPress={running ? stop : start}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, running && styles.buttonSecondary, pressed && styles.pressed]}
          >
            <Text style={[styles.buttonText, running && styles.buttonTextSecondary]}>
              {running ? 'Pause' : analysedCount > 0 ? 'Resume' : 'Analyse'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <ProgressBar value={totalCount === 0 ? 0 : analysedCount / totalCount} color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 12 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  buttonText: { color: '#0B1220', fontWeight: '800' },
  buttonTextSecondary: { color: colors.text },
  pressed: { opacity: 0.75 },
});
