"use client";
/**
 * Micro-couche IndexedDB — ~100 lignes plutôt qu'une dépendance.
 * Trois magasins :
 *   · `outbox` : mutations en attente de réseau (ordre = ordre d'écriture) ;
 *   · `blobs`  : photos compressées, trop lourdes pour localStorage ;
 *   · `cache`  : dernières données lues (tournée du jour) — affichées AVANT le réseau.
 */

const DB_NAME = "jrf-field";
const DB_VERSION = 1;
export const STORE_OUTBOX = "outbox";
export const STORE_BLOBS = "blobs";
export const STORE_CACHE = "cache";

let connexion: Promise<IDBDatabase> | null = null;

function ouvrir(): Promise<IDBDatabase> {
  if (connexion) return connexion;
  connexion = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexeddb_indisponible"));
      return;
    }
    const requete = indexedDB.open(DB_NAME, DB_VERSION);
    requete.onupgradeneeded = () => {
      const db = requete.result;
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: "key" });
      }
    };
    requete.onsuccess = () => resolve(requete.result);
    requete.onerror = () => reject(requete.error);
  });
  return connexion;
}

function transaction<T>(
  magasin: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return ouvrir().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(magasin, mode);
        const requete = action(tx.objectStore(magasin));
        requete.onsuccess = () => resolve(requete.result);
        requete.onerror = () => reject(requete.error);
      })
  );
}

export function idbPut<T>(magasin: string, valeur: T): Promise<IDBValidKey> {
  return transaction(magasin, "readwrite", (store) => store.put(valeur as never));
}

export function idbAdd<T>(magasin: string, valeur: T): Promise<IDBValidKey> {
  return transaction(magasin, "readwrite", (store) => store.add(valeur as never));
}

export function idbGet<T>(magasin: string, cle: IDBValidKey): Promise<T | undefined> {
  return transaction<T | undefined>(magasin, "readonly", (store) => store.get(cle));
}

export function idbGetAll<T>(magasin: string): Promise<T[]> {
  return transaction<T[]>(magasin, "readonly", (store) => store.getAll());
}

export function idbDelete(magasin: string, cle: IDBValidKey): Promise<undefined> {
  return transaction<undefined>(magasin, "readwrite", (store) => store.delete(cle));
}

export function idbClear(magasin: string): Promise<undefined> {
  return transaction<undefined>(magasin, "readwrite", (store) => store.clear());
}
