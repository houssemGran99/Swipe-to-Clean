import {
  Asset,
  AssetField,
  MediaType,
  Query,
  getPermissionsAsync,
  requestPermissionsAsync,
  type PermissionResponse,
} from 'expo-media-library';

/** Lightweight, serialisable description of a photo. URIs are resolved lazily (see useAssetUri). */
export type Photo = {
  id: string;
  creationTime: number;
  width: number;
  height: number;
};

/** A calendar month bucket, keyed as `YYYY-MM`. */
export type MonthGroup = {
  key: string;
  label: string;
  /** Photos ordered newest first. */
  photos: Photo[];
};

export type PermissionState = 'undetermined' | 'granted' | 'limited' | 'denied';

export function toPermissionState(response: PermissionResponse): PermissionState {
  if (response.status === 'granted') {
    return response.accessPrivileges === 'limited' ? 'limited' : 'granted';
  }
  if (response.status === 'denied') return 'denied';
  return 'undetermined';
}

export async function getPhotoPermission(): Promise<PermissionResponse> {
  return getPermissionsAsync(false, ['photo']);
}

export async function requestPhotoPermission(): Promise<PermissionResponse> {
  return requestPermissionsAsync(false, ['photo']);
}

/**
 * Fetches metadata for every image in the library in a single native call.
 * Only plain metadata crosses the bridge, so this stays cheap even for large camera rolls.
 */
export async function fetchAllPhotos(): Promise<Photo[]> {
  const metadata = await new Query()
    .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
    .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
    .exeForMetadata();

  return metadata.map((m) => ({
    id: m.id,
    creationTime: m.creationTime ?? m.modificationTime ?? 0,
    width: m.width ?? 0,
    height: m.height ?? 0,
  }));
}

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

export function monthKeyFor(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabelFor(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return monthFormatter.format(new Date(year, month - 1, 1));
}

/** Groups photos (already sorted newest first) into month buckets, newest month first. */
export function groupByMonth(photos: Photo[]): MonthGroup[] {
  const groups = new Map<string, Photo[]>();
  for (const photo of photos) {
    const key = monthKeyFor(photo.creationTime);
    let bucket = groups.get(key);
    if (!bucket) {
      bucket = [];
      groups.set(key, bucket);
    }
    bucket.push(photo);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, bucket]) => ({ key, label: monthLabelFor(key), photos: bucket }));
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

/** Resolves (and memoises) the displayable URI of an asset. */
export function resolveUri(id: string): Promise<string> {
  let pending = uriCache.get(id);
  if (!pending) {
    pending = new Asset(id).getUri();
    pending.catch(() => uriCache.delete(id));
    uriCache.set(id, pending);
  }
  return pending;
}

export function forgetUris(ids: string[]): void {
  for (const id of ids) uriCache.delete(id);
}
