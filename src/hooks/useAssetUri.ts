import { useEffect, useState } from 'react';

import { resolveImageUri, type MediaKind } from '../lib/media';

/** Lazily resolves a displayable image URI (a still frame for videos); only mounted (i.e. visible) items ever trigger a lookup. */
export function useAssetUri(id: string, kind: MediaKind = 'photo'): string | null {
  const [resolved, setResolved] = useState<{ id: string; uri: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveImageUri(id, kind).then(
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
  }, [id, kind]);

  // Ignore a stale result while a new id is resolving (e.g. a recycled list cell).
  return resolved?.id === id ? resolved.uri : null;
}
