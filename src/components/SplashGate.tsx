import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useAnalysis } from '../state/AnalysisContext';
import { useLibrary } from '../state/LibraryContext';
import { useReview } from '../state/ReviewContext';

// Keep the native splash (logo) up until the first screen has what it needs.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 300 });

/** Never keep the splash longer than this, even if something is slow to load. */
const MAX_SPLASH_MS = 3000;

/** Hides the splash once the permission check and saved state have loaded. Renders nothing. */
export function SplashGate() {
  const { permission } = useLibrary();
  const { hydrated: reviewReady } = useReview();
  const { hydrated: analysisReady } = useAnalysis();
  const ready = permission !== null && reviewReady && analysisReady;

  useEffect(() => {
    const timer = setTimeout(() => SplashScreen.hide(), MAX_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  return null;
}
