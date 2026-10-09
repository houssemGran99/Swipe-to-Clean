import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useLibrary } from '../state/LibraryContext';
import { useReview } from '../state/ReviewContext';

/** Deletes items from the device (via the OS confirmation dialog) and forgets their review state. */
export function useDeletePhotos() {
  const { deleteFromDevice } = useLibrary();
  const { purge } = useReview();
  const [deleting, setDeleting] = useState(false);

  const deletePhotos = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return false;
      setDeleting(true);
      const ok = await deleteFromDevice(ids);
      setDeleting(false);
      if (!ok) {
        Alert.alert('Nothing was deleted', 'The deletion was cancelled or not permitted.');
        return false;
      }
      purge(ids);
      Alert.alert('Done', `${ids.length} item${ids.length === 1 ? '' : 's'} deleted.`);
      return true;
    },
    [deleteFromDevice, purge],
  );

  return { deletePhotos, deleting };
}
