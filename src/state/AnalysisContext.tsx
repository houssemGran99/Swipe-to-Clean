import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  analyzePhoto,
  BLUR_THRESHOLDS,
  findSimilarGroups,
  type BlurSensitivity,
  type PhotoAnalysis,
  type SimilarGroup,
} from '../lib/imageAnalysis';
import type { Photo } from '../lib/media';
import { useLibrary } from './LibraryContext';

const STORAGE_KEY = 'swipe-to-clean/analysis/v1';
/** Photos analysed in parallel. The native resize is the bottleneck; more mostly adds memory pressure. */
const CONCURRENCY = 2;
/** Publish results to the UI (and persist) every N photos. */
const FLUSH_EVERY = 24;

type Results = Record<string, PhotoAnalysis | null>;

type AnalysisContextValue = {
  /** Per photo id: analysis, or null if the photo couldn't be read. Missing = not analysed yet. */
  results: Results;
  hydrated: boolean;
  running: boolean;
  /** Photos analysed so far, out of all photos in the library. */
  analysedCount: number;
  totalCount: number;
  start: () => void;
  stop: () => void;
  /** Groups of near-duplicate photos among those analysed so far. */
  similarGroups: SimilarGroup[];
  blurSensitivity: BlurSensitivity;
  setBlurSensitivity: (value: BlurSensitivity) => void;
  /** Analysed photos below the current sharpness threshold, blurriest first. */
  blurryPhotos: Photo[];
};

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({ children }: PropsWithChildren) {
  const { photos } = useLibrary();
  const [results, setResults] = useState<Results>({});
  const [hydrated, setHydrated] = useState(false);
  const [running, setRunning] = useState(false);
  const [blurSensitivity, setBlurSensitivity] = useState<BlurSensitivity>('medium');
  const runId = useRef(0);
  // Mirrors state so the scan loop always sees the freshest data without re-subscribing.
  const resultsRef = useRef<Results>({});
  const photosRef = useRef(photos);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          resultsRef.current = parsed as Results;
          setResults(parsed as Results);
        }
      })
      .catch(() => {
        // Corrupt cache: it's only a cache, start over.
      })
      .finally(() => setHydrated(true));
  }, []);

  const persist = useCallback(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(resultsRef.current)).catch(() => {});
  }, []);

  const stop = useCallback(() => {
    runId.current++;
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    const id = ++runId.current;
    setRunning(true);

    const run = async () => {
      // Drop results for photos that no longer exist so the cache doesn't grow forever.
      const live = new Set(photosRef.current.map((p) => p.id));
      const pruned: Results = {};
      for (const [key, value] of Object.entries(resultsRef.current)) {
        if (live.has(key)) pruned[key] = value;
      }
      resultsRef.current = pruned;

      // Newest first, so recent photos (the ones people care about) show up first.
      const queue = photosRef.current.filter((p) => !(p.id in resultsRef.current));
      let sinceFlush = 0;
      const worker = async () => {
        while (queue.length > 0 && id === runId.current) {
          const photo = queue.shift()!;
          const result = await analyzePhoto(photo);
          if (id !== runId.current) return;
          resultsRef.current = { ...resultsRef.current, [photo.id]: result };
          if (++sinceFlush >= FLUSH_EVERY) {
            sinceFlush = 0;
            setResults(resultsRef.current);
            persist();
          }
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      setResults(resultsRef.current);
      persist();
      if (id === runId.current) setRunning(false);
    };
    run().catch(() => {
      if (id === runId.current) setRunning(false);
    });
  }, [persist]);

  // Stop scanning if the provider goes away.
  useEffect(() => () => void runId.current++, []);

  const analysedCount = useMemo(
    () => photos.reduce((n, p) => (p.id in results ? n + 1 : n), 0),
    [photos, results],
  );

  const similarGroups = useMemo(() => findSimilarGroups(photos, results), [photos, results]);

  const blurryPhotos = useMemo(() => {
    const threshold = BLUR_THRESHOLDS[blurSensitivity];
    return photos
      .filter((p) => {
        const r = results[p.id];
        return r != null && r.sharpness < threshold;
      })
      .sort((a, b) => results[a.id]!.sharpness - results[b.id]!.sharpness);
  }, [photos, results, blurSensitivity]);

  const value = useMemo<AnalysisContextValue>(
    () => ({
      results,
      hydrated,
      running,
      analysedCount,
      totalCount: photos.length,
      start,
      stop,
      similarGroups,
      blurSensitivity,
      setBlurSensitivity,
      blurryPhotos,
    }),
    [
      results,
      hydrated,
      running,
      analysedCount,
      photos.length,
      start,
      stop,
      similarGroups,
      blurSensitivity,
      blurryPhotos,
    ],
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used inside <AnalysisProvider>');
  return ctx;
}
