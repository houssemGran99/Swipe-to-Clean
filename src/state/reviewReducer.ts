export type Decision = 'keep' | 'delete';

export type MonthReview = {
  decisions: Record<string, Decision>;
  /** Photo ids in the order they were swiped, used for undo. */
  history: string[];
};

export type ReviewState = {
  months: Record<string, MonthReview>;
};

export type ReviewAction =
  | { type: 'hydrate'; state: ReviewState }
  | { type: 'decide'; monthKey: string; photoId: string; decision: Decision }
  | { type: 'undo'; monthKey: string }
  | { type: 'restore'; monthKey: string; photoId: string }
  | { type: 'resetMonth'; monthKey: string }
  | { type: 'purge'; photoIds: string[] };

export const initialReviewState: ReviewState = { months: {} };

const emptyMonth: MonthReview = { decisions: {}, history: [] };

export function getMonthReview(state: ReviewState, monthKey: string): MonthReview {
  return state.months[monthKey] ?? emptyMonth;
}

function withMonth(state: ReviewState, monthKey: string, month: MonthReview): ReviewState {
  return { ...state, months: { ...state.months, [monthKey]: month } };
}

export function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case 'hydrate':
      return action.state;

    case 'decide': {
      const month = getMonthReview(state, action.monthKey);
      return withMonth(state, action.monthKey, {
        decisions: { ...month.decisions, [action.photoId]: action.decision },
        history: [...month.history.filter((id) => id !== action.photoId), action.photoId],
      });
    }

    case 'undo': {
      const month = getMonthReview(state, action.monthKey);
      const last = month.history[month.history.length - 1];
      if (last === undefined) return state;
      const { [last]: _removed, ...decisions } = month.decisions;
      return withMonth(state, action.monthKey, {
        decisions,
        history: month.history.slice(0, -1),
      });
    }

    case 'restore': {
      const month = getMonthReview(state, action.monthKey);
      if (month.decisions[action.photoId] !== 'delete') return state;
      return withMonth(state, action.monthKey, {
        ...month,
        decisions: { ...month.decisions, [action.photoId]: 'keep' },
      });
    }

    case 'resetMonth': {
      const { [action.monthKey]: _removed, ...months } = state.months;
      return { ...state, months };
    }

    case 'purge': {
      const purged = new Set(action.photoIds);
      const months: Record<string, MonthReview> = {};
      for (const [key, month] of Object.entries(state.months)) {
        const decisions: Record<string, Decision> = {};
        for (const [id, decision] of Object.entries(month.decisions)) {
          if (!purged.has(id)) decisions[id] = decision;
        }
        months[key] = { decisions, history: month.history.filter((id) => !purged.has(id)) };
      }
      return { ...state, months };
    }
  }
}

export function isReviewState(value: unknown): value is ReviewState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'months' in value &&
    typeof (value as { months: unknown }).months === 'object' &&
    (value as { months: unknown }).months !== null
  );
}

/** Saved state from before videos existed used bare `YYYY-MM` keys for photo months. */
export function migrateReviewState(state: ReviewState): ReviewState {
  const months: Record<string, MonthReview> = {};
  for (const [key, month] of Object.entries(state.months)) {
    months[/^\d{4}-\d{2}$/.test(key) ? `photo-${key}` : key] = month;
  }
  return { ...state, months };
}
