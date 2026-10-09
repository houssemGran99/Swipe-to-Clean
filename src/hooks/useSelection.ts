import { useCallback, useState } from 'react';

/**
 * Tracks which items are marked for deletion. Items fall back to `isDefaultSelected` until the
 * user toggles them, so new results (e.g. from an ongoing scan) get a sensible default.
 */
export function useSelection(isDefaultSelected: (id: string) => boolean) {
  const [overrides, setOverrides] = useState<Map<string, boolean>>(() => new Map());

  const isSelected = useCallback(
    (id: string) => overrides.get(id) ?? isDefaultSelected(id),
    [overrides, isDefaultSelected],
  );

  const toggle = useCallback(
    (id: string) =>
      setOverrides((prev) => {
        const next = new Map(prev);
        next.set(id, !(prev.get(id) ?? isDefaultSelected(id)));
        return next;
      }),
    [isDefaultSelected],
  );

  const setMany = useCallback(
    (ids: string[], selected: boolean) =>
      setOverrides((prev) => {
        const next = new Map(prev);
        for (const id of ids) next.set(id, selected);
        return next;
      }),
    [],
  );

  return { isSelected, toggle, setMany };
}
