import {
  Asset,
  AssetField,
  MediaType,
  Query,
  getPermissionsAsync,
  requestPermissionsAsync,
  type PermissionResponse,
} from 'expo-media-library';
import { getThumbnailAsync } from 'expo-video-thumbnails';

export type MediaKind = 'photo' | 'video';

/** Lightweight, serialisable description of a photo or video. URIs are resolved lazily (see useAssetUri). */
export type Photo = {
  id: string;
  kind: MediaKind;
  creationTime: number;
  width: number;
  height: number;
  /** Seconds; 0 for photos. */
  duration: number;
};

/** A calendar month bucket for one media kind, keyed as `photo-YYYY-MM` / `video-YYYY-MM`. */
export type MonthGroup = {
  key: string;
  kind: MediaKind;
  label: string;
  /** Items ordered newest first. */
  photos: Photo[];
};

export type PermissionState = 'undetermined' | 'granted' | 'limited' | 'denied';

const GRANULAR: ('photo' | 'video')[] = ['photo', 'video'];

export function toPermissionState(response: PermissionResponse): PermissionState {
  if (response.status === 'granted') {
    return response.accessPrivileges === 'limited' ? 'limited' : 'granted';
  }
  if (response.status === 'denied') return 'denied';
  return 'undetermined';
}

export async function getPhotoPermission(): Promise<PermissionResponse> {
  return getPermissionsAsync(false, GRANULAR);
}

export async function requestPhotoPermission(): Promise<PermissionResponse> {
  return requestPermissionsAsync(false, GRANULAR);
}

/**
 * Fetches metadata for every photo and video in the library in a single native call.
 * Only plain metadata crosses the bridge, so this stays cheap even for large camera rolls.
 */
export async function fetchAllMedia(): Promise<Photo[]> {
  const metadata = await new Query()
    .within(AssetField.MEDIA_TYPE, [MediaType.IMAGE, MediaType.VIDEO])
    .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
    .exeForMetadata();

  return metadata.map((m) => ({
    id: m.id,
    kind: m.mediaType === MediaType.VIDEO ? 'video' : 'photo',
    creationTime: m.creationTime ?? m.modificationTime ?? 0,
    width: m.width ?? 0,
    height: m.height ?? 0,
    duration: m.duration ?? 0,
  }));
}

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

export function monthKeyFor(kind: MediaKind, timestamp: number): string {
  const d = new Date(timestamp);
  return `${kind}-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function kindOfMonthKey(key: string): MediaKind {
  return key.startsWith('video-') ? 'video' : 'photo';
}

export function monthLabelFor(key: string): string {
  const [year, month] = key.slice(-7).split('-').map(Number);
  if (!year || !month) return key;
  return monthFormatter.format(new Date(year, month - 1, 1));
}

/** Groups items (already sorted newest first) into month buckets, newest month first. */
export function groupByMonth(items: Photo[], kind: MediaKind): MonthGroup[] {
  const groups = new Map<string, Photo[]>();
  for (const item of items) {
    const key = monthKeyFor(kind, item.creationTime);
    let bucket = groups.get(key);
    if (!bucket) {
      bucket = [];
      groups.set(key, bucket);
    }
    bucket.push(item);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, bucket]) => ({ key, kind, label: monthLabelFor(key), photos: bucket }));
}

/**
 * Batch-deletes assets. The OS shows its own confirmation dialog (iOS always, Android 11+);
 * the promise rejects if the user cancels it.
 */
export async function deletePhotos(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await Asset.delete(ids.map((id) => new Asset(id)));
}

const uriCache = new Map<string, Promise<string>>();
const thumbCache = new Map<string, Promise<string>>();

function memo(cache: Map<string, Promise<string>>, id: string, load: () => Promise<string>) {
  let pending = cache.get(id);
  if (!pending) {
    pending = load();
    pending.catch(() => cache.delete(id));
    cache.set(id, pending);
  }
  return pending;
}

/** Resolves (and memoises) the full-resolution URI of an asset (the file itself for videos). */
export function resolveUri(id: string): Promise<string> {
  return memo(uriCache, id, () => new Asset(id).getUri());
}

/** Resolves a displayable image URI: the photo itself, or a generated still frame for a video. */
export function resolveImageUri(id: string, kind: MediaKind): Promise<string> {
  if (kind === 'photo') return resolveUri(id);
  return memo(thumbCache, id, async () => {
    const source = await resolveUri(id);
    const thumb = await getThumbnailAsync(source, { time: 0, quality: 0.6 });
    return thumb.uri;
  });
}

export function forgetUris(ids: string[]): void {
  for (const id of ids) {
    uriCache.delete(id);
    thumbCache.delete(id);
  }
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
