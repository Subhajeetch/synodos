import { useCallback, useEffect, useRef, useState } from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import type { Doc } from "yjs";
import { offlineDbName } from "@/lib/offline";

export function useOfflinePersistence(
  ydoc: Doc,
  docId: string,
  userId: string | undefined,
) {
  const [savedLocally, setSavedLocally] = useState(false);
  const ref = useRef<IndexeddbPersistence | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const persistence = new IndexeddbPersistence(
      offlineDbName(userId, docId),
      ydoc,
    );
    ref.current = persistence;
    void persistence.whenSynced.then(() => {
      if (!cancelled) setSavedLocally(true);
    });

    return () => {
      cancelled = true;
      ref.current = null;
      setSavedLocally(false);
      void persistence.destroy();
    };
  }, [ydoc, docId, userId]);

  const clear = useCallback(async () => {
    await ref.current?.clearData();
    setSavedLocally(false);
  }, []);

  return { savedLocally, clear };
}