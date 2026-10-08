import { useEffect, useState } from 'react';

import { resolveUri } from '../lib/media';

/** Lazily resolves an asset URI; only mounted (i.e. visible) items ever trigger a lookup. */
export function useAssetUri(id: string): string | null {
  const [resolved, setResolved] = useState<{ id: string; uri: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveUri(id).then(
      (uri) => {
        if (!cancelled) setResolved({ id, uri });
      },
      () => {
        if (!cancelled) setResolved({ id, uri: null });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Ignore a stale result while a new id is resolving (e.g. a recycled list cell).
  return resolved?.id === id ? resolved.uri : null;
}
