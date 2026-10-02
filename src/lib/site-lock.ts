/**
 * 公開サイトの合言葉（site lock）。解錠ページ（scripts/site-lock/unlock.html）が、合言葉から作った鍵を
 * IndexedDB `site-lock` に保存している（合言葉そのものは保存しない）。ここではそれを確かめる／消すだけ。
 * 手帳（localStorage）には触れない。
 */
const DB = 'site-lock';
const STORE = 'k';
const KEY = 'site';

async function dbExists(): Promise<boolean> {
  const f = indexedDB as IDBFactory & {databases?: () => Promise<{name?: string}[]>};
  if (typeof f.databases !== 'function') return true;
  try {
    return (await f.databases()).some((d) => d.name === DB);
  } catch {
    return true;
  }
}

function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onerror = () => reject(r.error);
    r.onsuccess = () => {
      const t = r.result.transaction(STORE, mode);
      const q = fn(t.objectStore(STORE));
      t.oncomplete = () => { r.result.close(); resolve(q.result); };
      t.onerror = t.onabort = () => { r.result.close(); reject(t.error); };
    };
  });
}

/** この端末に合言葉の鍵が保存されているか。 */
export async function hasSiteKey(): Promise<boolean> {
  if (typeof indexedDB === 'undefined' || !(await dbExists())) return false;
  try {
    return !!(await withStore('readonly', (s) => s.get(KEY)));
  } catch {
    return false;
  }
}

/** この端末の合言葉の鍵を消す（次に開くときに合言葉がいる）。手帳のデータは消さない。 */
export async function forgetSiteKey(): Promise<void> {
  await withStore('readwrite', (s) => s.delete(KEY));
  navigator.serviceWorker?.controller?.postMessage({type: 'SITE_LOCK_FORGET'});
}
