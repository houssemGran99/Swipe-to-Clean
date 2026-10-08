import { useMemo } from 'react';

import type { MonthGroup, Photo } from '../lib/media';
import type { MonthReview } from '../state/reviewReducer';

export type MonthStats = {
  total: number;
  reviewed: number;
  kept: number;
  toDelete: Photo[];
  remaining: Photo[];
  done: boolean;
};

export function computeMonthStats(month: MonthGroup | undefined, review: MonthReview): MonthStats {
  const photos = month?.photos ?? [];
  const toDelete: Photo[] = [];
  const remaining: Photo[] = [];
  let kept = 0;
  for (const photo of photos) {
    const decision = review.decisions[photo.id];
    if (decision === 'delete') toDelete.push(photo);
    else if (decision === 'keep') kept += 1;
    else remaining.push(photo);
  }
  return {
    total: photos.length,
    reviewed: photos.length - remaining.length,
    kept,
    toDelete,
    remaining,
    done: photos.length > 0 && remaining.length === 0,
  };
}

export function useMonthStats(month: MonthGroup | undefined, review: MonthReview): MonthStats {
  return useMemo(() => computeMonthStats(month, review), [month, review]);
}
