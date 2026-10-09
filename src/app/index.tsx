import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryCard } from '../components/CategoryCard';
import { renderLibraryGate } from '../components/LibraryGate';
import { StorageCard } from '../components/StorageCard';
import { colors, spacing } from '../lib/theme';
import { useAnalysis } from '../state/AnalysisContext';
import { useLibrary } from '../state/LibraryContext';
import { useReview } from '../state/ReviewContext';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const library = useLibrary();
  const review = useReview();
  const analysis = useAnalysis();

  const reviewed = useMemo(() => {
    const count = (items: { id: string }[], prefix: string) => {
      const decided = new Set<string>();
      for (const [key, month] of Object.entries(review.state.months)) {
        if (!key.startsWith(prefix)) continue;
        for (const id of Object.keys(month.decisions)) decided.add(id);
      }
      return items.reduce((n, p) => (decided.has(p.id) ? n + 1 : n), 0);
    };
    return { photos: count(library.photos, 'photo-'), videos: count(library.videos, 'video-') };
  }, [review.state, library.photos, library.videos]);

  const gate = renderLibraryGate(library, review.hydrated && analysis.hydrated);

  const similarCount = analysis.similarGroups.reduce((n, g) => n + g.photos.length, 0);
  const scanned = analysis.analysedCount > 0;
  const scanLabel = analysis.running
    ? `Analysing… ${Math.round((analysis.analysedCount / Math.max(1, analysis.totalCount)) * 100)}%`
    : null;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <StorageCard />

      {gate ? (
        <View style={styles.gate}>{gate}</View>
      ) : (
        <>
          <Text style={styles.section}>All categories</Text>
          <CategoryCard
            icon="🖼️"
            title="Photos"
            subtitle={`${library.photos.length.toLocaleString()} photos · ${reviewed.photos.toLocaleString()} reviewed`}
            onPress={() => router.push({ pathname: '/months/[kind]', params: { kind: 'photo' } })}
          />
          <CategoryCard
            icon="🎬"
            title="Videos"
            subtitle={`${library.videos.length.toLocaleString()} videos · ${reviewed.videos.toLocaleString()} reviewed`}
            onPress={() => router.push({ pathname: '/months/[kind]', params: { kind: 'video' } })}
          />
          <CategoryCard
            icon="👯"
            title="Similar images"
            subtitle={
              scanLabel ??
              (scanned
                ? `${analysis.similarGroups.length.toLocaleString()} groups · ${similarCount.toLocaleString()} photos`
                : 'Find near-duplicate shots and keep the best one')
            }
            badge={analysis.similarGroups.length > 0 ? String(analysis.similarGroups.length) : undefined}
            onPress={() => router.push('/similar')}
          />
          <CategoryCard
            icon="🌫️"
            title="Blurry images"
            subtitle={
              scanLabel ??
              (scanned
                ? `${analysis.blurryPhotos.length.toLocaleString()} blurry photos found`
                : 'Find out-of-focus and shaky photos')
            }
            badge={analysis.blurryPhotos.length > 0 ? String(analysis.blurryPhotos.length) : undefined}
            onPress={() => router.push('/blurry')}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1 },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.md },
  gate: { flex: 1, minHeight: 360 },
});
