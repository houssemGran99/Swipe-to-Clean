import { addListener, presentPermissionsPicker, type PermissionResponse } from 'expo-media-library';
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
import { AppState, Linking } from 'react-native';

import {
  deletePhotos,
  fetchAllPhotos,
  forgetUris,
  getPhotoPermission,
  groupByMonth,
  requestPhotoPermission,
  toPermissionState,
  type MonthGroup,
  type PermissionState,
  type Photo,
} from '../lib/media';

/** 'idle' covers both "no access" and "first scan still running". */
type LoadStatus = 'idle' | 'ready' | 'error';

type LibraryContextValue = {
  permission: PermissionState | null;
  /** False once the OS will no longer show the permission prompt (user must go to Settings). */
  canAskAgain: boolean;
  status: LoadStatus;
  error: string | null;
  months: MonthGroup[];
  getMonth: (key: string) => MonthGroup | undefined;
  requestPermission: () => Promise<void>;
  openSettings: () => void;
  /** iOS / Android 14+: lets a user with limited access pick more photos. */
  managePhotoSelection: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Deletes photos from the device. Resolves to false if the user cancelled the OS dialog. */
  deleteFromDevice: (ids: string[]) => Promise<boolean>;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: PropsWithChildren) {
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const loadId = useRef(0);

  const load = useCallback((): Promise<void> => {
    const id = ++loadId.current;
    return fetchAllPhotos().then(
      (all) => {
        // A newer load superseded this one (e.g. a library change event fired mid-scan).
        if (id !== loadId.current) return;
        setPhotos(all);
        setError(null);
        setStatus('ready');
      },
      (e: unknown) => {
        if (id !== loadId.current) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      },
    );
  }, []);

  const applyPermission = useCallback((response: PermissionResponse) => {
    setPermission(toPermissionState(response));
    setCanAskAgain(response.canAskAgain);
  }, []);

  // Initial permission check, and re-check whenever the app returns to the foreground
  // (the user may have changed access in system Settings).
  useEffect(() => {
    getPhotoPermission().then(applyPermission, () => setPermission('denied'));
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') getPhotoPermission().then(applyPermission, () => {});
    });
    return () => sub.remove();
  }, [applyPermission]);

  const hasAccess = permission === 'granted' || permission === 'limited';

  useEffect(() => {
    if (!hasAccess) return;
    load();
    const sub = addListener(() => {
      load();
    });
    return () => sub.remove();
  }, [hasAccess, load]);

  const requestPermission = useCallback(async () => {
    applyPermission(await requestPhotoPermission());
  }, [applyPermission]);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const managePhotoSelection = useCallback(async () => {
    try {
      await presentPermissionsPicker(['photo']);
    } catch {
      // Not available on this platform/OS version.
    }
    await load();
  }, [load]);

  const deleteFromDevice = useCallback(
    async (ids: string[]) => {
      try {
        await deletePhotos(ids);
      } catch {
        return false;
      }
      const removed = new Set(ids);
      forgetUris(ids);
      setPhotos((prev) => prev.filter((p) => !removed.has(p.id)));
      return true;
    },
    [],
  );

  // Without access, whatever was loaded before is no longer valid to show.
  const months = useMemo(() => (hasAccess ? groupByMonth(photos) : []), [hasAccess, photos]);
  const monthIndex = useMemo(() => new Map(months.map((m) => [m.key, m])), [months]);
  const getMonth = useCallback((key: string) => monthIndex.get(key), [monthIndex]);

  const value = useMemo<LibraryContextValue>(
    () => ({
      permission,
      canAskAgain,
      status: hasAccess ? status : 'idle',
      error,
      months,
      getMonth,
      requestPermission,
      openSettings,
      managePhotoSelection,
      refresh: load,
      deleteFromDevice,
    }),
    [
      permission,
      canAskAgain,
      hasAccess,
      status,
      error,
      months,
      getMonth,
      requestPermission,
      openSettings,
      managePhotoSelection,
      load,
      deleteFromDevice,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}
