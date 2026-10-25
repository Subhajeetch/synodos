const PREFIX = "synodos:";

export const offlineDbName = (userId: string, docId: string) =>
  `${PREFIX}${userId}:${docId}`;

export async function clearOfflineData(): Promise<void> {
  try {
    const dbs = await indexedDB.databases();
    await Promise.all(
      dbs.map(({ name }) => {
        if (!name?.startsWith(PREFIX)) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve(); // deletes once open connections close
        });
      }),
    );
  } catch {
    // for now
  }
}
