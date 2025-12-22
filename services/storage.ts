
const DB_NAME = 'audiolibro_cache_v1';
const STORE_NAME = 'chunks';

let dbPromise: Promise<IDBDatabase> | null = null;

// Funzione per richiedere che i dati non vengano cancellati automaticamente dal browser
export const requestPersistentStorage = async (): Promise<boolean> => {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log(`Storage Persisted: ${isPersisted}`);
    return isPersisted;
  }
  return false;
};

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
};

export const saveAudioChunk = async (key: string, data: Uint8Array): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      // Cloniamo l'array buffer per evitare problemi di trasferimento
      const request = store.put(data.buffer, key); // Salviamo l'ArrayBuffer puro

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Errore salvataggio cache:", e);
  }
};

export const getAudioChunk = async (key: string): Promise<Uint8Array | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result) {
          resolve(new Uint8Array(request.result));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return null;
  }
};

export const getAllStoredKeys = async (): Promise<Set<string>> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();
        
        request.onsuccess = () => {
            resolve(new Set(request.result as string[]));
        };
        request.onerror = () => resolve(new Set());
    });
  } catch (e) {
      return new Set();
  }
};

export const clearAudioCache = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getCacheSizeInfo = async (): Promise<string> => {
   // Stima approssimativa contando le chiavi (non dimensione reale bytes per performance)
   try {
    const db = await openDB();
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const countRequest = store.count();
        countRequest.onsuccess = () => {
            resolve(`${countRequest.result} frammenti audio salvati`);
        };
        countRequest.onerror = () => resolve("Sconosciuto");
    });
   } catch (e) { return "Non disponibile"; }
}
