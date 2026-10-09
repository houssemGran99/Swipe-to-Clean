import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { ReactElement } from 'react';

import { colors, spacing } from '../lib/theme';
import type { LibraryContextValue } from '../state/LibraryContext';
import { EmptyState } from './EmptyState';

/**
 * Returns the screen to show while the library isn't usable yet (permission prompt, denied,
 * loading, error), or null once photos are loaded.
 */
export function renderLibraryGate(library: LibraryContextValue, ready = true): ReactElement | null {
  if (library.permission === null || !ready) {
    return <Centered />;
  }

  if (library.permission === 'undetermined') {
    return (
      <EmptyState
        icon="📸"
        title="Let's tidy up your gallery"
        message="We need access to your photos and videos to get started. Nothing leaves your device."
        actions={[{ label: 'Allow photo access', onPress: library.requestPermission }]}
      />
    );
  }

  if (library.permission === 'denied') {
    return (
      <EmptyState
        icon="🔒"
        title="Photo access is off"
        message={
          library.canAskAgain
            ? 'Swipe to Clean can’t show your photos without access to your library.'
            : 'You previously denied photo access. Enable it in Settings to start cleaning your gallery.'
        }
        actions={
          library.canAskAgain
            ? [
                { label: 'Allow photo access', onPress: library.requestPermission },
                { label: 'Open Settings', onPress: library.openSettings, tone: 'secondary' },
              ]
            : [{ label: 'Open Settings', onPress: library.openSettings }]
        }
      />
    );
  }

  if (library.status === 'error') {
    return (
      <EmptyState
        icon="⚠️"
        title="Couldn’t load your library"
        message={library.error ?? undefined}
        actions={[{ label: 'Try again', onPress: library.refresh }]}
      />
    );
  }

  if (library.status !== 'ready') {
    return <Centered label="Scanning your library…" />;
  }

  return null;
}

export function Centered({ label }: { label?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.text} size="large" />
      {label ? <Text style={styles.centeredText}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  centeredText: { color: colors.textMuted, fontSize: 15 },
});
