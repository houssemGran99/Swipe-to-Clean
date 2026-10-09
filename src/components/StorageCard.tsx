import { Paths } from 'expo-file-system';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../lib/theme';

type Disk = { total: number; free: number };

function readDisk(): Disk | null {
  try {
    const total = Paths.totalDiskSpace;
    const free = Paths.availableDiskSpace;
    return total > 0 ? { total, free } : null;
  } catch {
    return null;
  }
}

export function formatBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
}

/** Device storage used vs free. Re-reads whenever the screen regains focus (e.g. after deleting). */
export function StorageCard() {
  const [disk, setDisk] = useState<Disk | null>(readDisk);

  useFocusEffect(
    useCallback(() => {
      setDisk(readDisk());
    }, []),
  );

  if (!disk) return null;
  const used = disk.total - disk.free;
  const ratio = used / disk.total;
  const pct = Math.round(ratio * 100);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Storage</Text>
        <View style={styles.sizes}>
          <Text style={styles.total}>{formatBytes(disk.total)}</Text>
          <Text style={styles.free}>{formatBytes(disk.free)} free</Text>
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.used, { width: `${ratio * 100}%` }]} />
      </View>
      <View style={styles.legend}>
        <Legend color={colors.storageUsed} label="Used" />
        <Legend color={colors.storageFree} label="Free" />
      </View>
      <Text style={styles.summary}>
        You’ve used{' '}
        <Text style={{ color: pct >= 80 ? colors.delete : pct >= 60 ? colors.warning : colors.keep }}>
          {pct}%
        </Text>{' '}
        of your phone’s storage ({formatBytes(used)}).
      </Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  sizes: { alignItems: 'flex-end' },
  total: { color: colors.text, fontSize: 18, fontWeight: '700' },
  free: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.storageFree, overflow: 'hidden' },
  used: { height: '100%', backgroundColor: colors.storageUsed, borderRadius: radius.pill },
  legend: { flexDirection: 'row', gap: spacing.xl },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.textMuted, fontSize: 13 },
  summary: { color: colors.text, fontSize: 15, lineHeight: 22 },
});
