import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  getMonthReview,
  initialReviewState,
  isReviewState,
  reviewReducer,
  type Decision,
  type MonthReview,
  type ReviewState,
} from './reviewReducer';

const STORAGE_KEY = 'swipe-to-clean/review/v1';

type ReviewContextValue = {
  state: ReviewState;
  hydrated: boolean;
  decide: (monthKey: string, photoId: string, decision: Decision) => void;
  undo: (monthKey: string) => void;
  restore: (monthKey: string, photoId: string) => void;
  resetMonth: (monthKey: string) => void;
  purge: (photoIds: string[]) => void;
};

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reviewReducer, initialReviewState);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (isReviewState(parsed)) dispatch({ type: 'hydrate', state: parsed });
      })
      .catch(() => {
        // Corrupt or unreadable storage: start fresh.
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, hydrated]);

  const value = useMemo<ReviewContextValue>(
    () => ({
      state,
      hydrated,
      decide: (monthKey, photoId, decision) => dispatch({ type: 'decide', monthKey, photoId, decision }),
      undo: (monthKey) => dispatch({ type: 'undo', monthKey }),
      restore: (monthKey, photoId) => dispatch({ type: 'restore', monthKey, photoId }),
      resetMonth: (monthKey) => dispatch({ type: 'resetMonth', monthKey }),
      purge: (photoIds) => dispatch({ type: 'purge', photoIds }),
    }),
    [state, hydrated],
  );

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useReview(): ReviewContextValue {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error('useReview must be used inside <ReviewProvider>');
  return ctx;
}

export function useMonthReview(monthKey: string): MonthReview {
  const { state } = useReview();
  return getMonthReview(state, monthKey);
}
