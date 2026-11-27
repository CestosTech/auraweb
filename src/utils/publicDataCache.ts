type PublicRecord<T = unknown> = { key: string; savedAt: number; value: T };
const DB_NAME = "aura-public-content-v1";
const STORE = "responses";
const FRESH_FOR_MS = 6 * 60 * 60 * 1000;
const KEEP_FOR_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_RECORDS = 80;

function isPublicFeed(path: string, body: unknown, authenticated: boolean) {
  if (authenticated || body !== undefined || typeof indexedDB === "undefined") return false;
  const route = path.split("?")[0];
  return /^\/v1\/(?:services(?:\/|$)|events(?:\/|$)|community(?:\/|$)|catalog\/)/.test(route)
    && !/(?:\/me|\/profile|\/media|\/receipt|\/chat)(?:\/|$)/i.test(route);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transact<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = work(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

export const publicDataCache = {
  key(path: string, body: unknown, authenticated: boolean) {
    return isPublicFeed(path, body, authenticated) ? path : null;
  },
  async read<T>(key: string): Promise<{ value: T; fresh: boolean } | null> {
    try {
      const record = await transact<PublicRecord<T> | undefined>("readonly", (store) => store.get(key));
      if (!record || Date.now() - record.savedAt > KEEP_FOR_MS) {
        if (record) void this.remove(key);
        return null;
      }
      return { value: record.value, fresh: Date.now() - record.savedAt < FRESH_FOR_MS };
    } catch { return null; }
  },
  async write<T>(key: string, value: T) {
    try {
      const encoded = JSON.stringify(value);
      // Public feeds are deliberately modest; skip a response that could crowd
      // out the browser's offline storage quota.
      if (encoded.length > 2_000_000) return;
      await transact("readwrite", (store) => store.put({ key, value, savedAt: Date.now() }));
      const records = await transact<PublicRecord[]>("readonly", (store) => store.getAll());
      const old = records
        .filter((r) => r.key !== key)
        .sort((a, b) => a.savedAt - b.savedAt);
      for (const record of old.slice(0, Math.max(0, records.length - MAX_RECORDS))) {
        await this.remove(record.key);
      }
    } catch { /* Offline cache is best-effort when storage is unavailable. */ }
  },
  async remove(key: string) {
    try { await transact("readwrite", (store) => store.delete(key)); } catch { /* no-op */ }
  },
};
