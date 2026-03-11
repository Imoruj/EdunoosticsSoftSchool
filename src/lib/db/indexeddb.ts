/**
 * IndexedDB Wrapper for Local-First Storage
 * Provides a simple interface for storing encrypted data locally
 */

import { encryptObject, decryptObject, EncryptedData } from '../crypto/encryption';
import { getKey } from '../crypto/keys';

const DB_NAME = 'lms_local_db';
const DB_VERSION = 1;

// Store names
export const STORES = {
  LESSONS: 'lessons',
  QUIZZES: 'quizzes',
  QUIZ_ATTEMPTS: 'quiz_attempts',
  ASSIGNMENTS: 'assignments',
  SUBMISSIONS: 'submissions',
  MESSAGES: 'messages',
  PROGRESS: 'progress',
  MEDIA: 'media',
  SYNC_QUEUE: 'sync_queue',
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

/**
 * Initialize IndexedDB with all required object stores
 */
export async function initLocalDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });

          // Create indexes based on store type
          switch (storeName) {
            case STORES.LESSONS:
              store.createIndex('subjectId', 'subjectId', { unique: false });
              store.createIndex('createdAt', 'createdAt', { unique: false });
              store.createIndex('updatedAt', 'updatedAt', { unique: false });
              break;

            case STORES.QUIZZES:
              store.createIndex('subjectId', 'subjectId', { unique: false });
              store.createIndex('lessonId', 'lessonId', { unique: false });
              break;

            case STORES.QUIZ_ATTEMPTS:
              store.createIndex('quizId', 'quizId', { unique: false });
              store.createIndex('studentId', 'studentId', { unique: false });
              store.createIndex('startedAt', 'startedAt', { unique: false });
              break;

            case STORES.ASSIGNMENTS:
              store.createIndex('subjectId', 'subjectId', { unique: false });
              store.createIndex('dueDate', 'dueDate', { unique: false });
              break;

            case STORES.SUBMISSIONS:
              store.createIndex('assignmentId', 'assignmentId', { unique: false });
              store.createIndex('studentId', 'studentId', { unique: false });
              store.createIndex('status', 'status', { unique: false });
              break;

            case STORES.MESSAGES:
              store.createIndex('streamId', 'streamId', { unique: false });
              store.createIndex('senderId', 'senderId', { unique: false });
              store.createIndex('sentAt', 'sentAt', { unique: false });
              break;

            case STORES.PROGRESS:
              store.createIndex('studentId', 'studentId', { unique: false });
              store.createIndex('lessonId', 'lessonId', { unique: false });
              break;

            case STORES.SYNC_QUEUE:
              store.createIndex('status', 'status', { unique: false });
              store.createIndex('createdAt', 'createdAt', { unique: false });
              break;
          }
        }
      });
    };
  });
}

/**
 * Generic save function with encryption
 */
export async function saveEncrypted<T extends { id: string }>(
  storeName: StoreName,
  data: T,
  userId: string
): Promise<void> {
  const db = await initLocalDB();
  const masterKey = await getKey(`master_${userId}`);

  if (!masterKey) {
    throw new Error('Master key not found');
  }

  // Encrypt sensitive fields
  const encrypted = await encryptObject(data, masterKey);

  const record = {
    id: data.id,
    encrypted: encrypted,
    updatedAt: Date.now(),
    // Store non-sensitive metadata unencrypted for indexing
    ...(storeName === STORES.LESSONS && {
      subjectId: (data as any).subjectId,
      createdAt: (data as any).createdAt,
    }),
    ...(storeName === STORES.MESSAGES && {
      streamId: (data as any).streamId,
      senderId: (data as any).senderId,
      sentAt: (data as any).sentAt,
    }),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Generic get function with decryption
 */
export async function getEncrypted<T>(
  storeName: StoreName,
  id: string,
  userId: string
): Promise<T | null> {
  const db = await initLocalDB();
  const masterKey = await getKey(`master_${userId}`);

  if (!masterKey) {
    throw new Error('Master key not found');
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = async () => {
      const record = request.result;

      if (!record) {
        resolve(null);
        return;
      }

      try {
        const decrypted = await decryptObject<T>(record.encrypted, masterKey);
        resolve(decrypted);
      } catch (error) {
        reject(error);
      }
    };

    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get all items from a store
 */
export async function getAllEncrypted<T>(
  storeName: StoreName,
  userId: string
): Promise<T[]> {
  const db = await initLocalDB();
  const masterKey = await getKey(`master_${userId}`);

  if (!masterKey) {
    throw new Error('Master key not found');
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = async () => {
      const records = request.result;

      try {
        const decrypted = await Promise.all(
          records.map((record) => decryptObject<T>(record.encrypted, masterKey))
        );
        resolve(decrypted);
      } catch (error) {
        reject(error);
      }
    };

    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Query by index
 */
export async function queryEncrypted<T>(
  storeName: StoreName,
  indexName: string,
  value: any,
  userId: string
): Promise<T[]> {
  const db = await initLocalDB();
  const masterKey = await getKey(`master_${userId}`);

  if (!masterKey) {
    throw new Error('Master key not found');
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = async () => {
      const records = request.result;

      try {
        const decrypted = await Promise.all(
          records.map((record) => decryptObject<T>(record.encrypted, masterKey))
        );
        resolve(decrypted);
      } catch (error) {
        reject(error);
      }
    };

    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete item
 */
export async function deleteItem(
  storeName: StoreName,
  id: string
): Promise<void> {
  const db = await initLocalDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Save unencrypted (for non-sensitive data like progress)
 */
export async function saveUnencrypted<T extends { id: string }>(
  storeName: StoreName,
  data: T
): Promise<void> {
  const db = await initLocalDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get unencrypted item
 */
export async function getUnencrypted<T>(
  storeName: StoreName,
  id: string
): Promise<T | null> {
  const db = await initLocalDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Clear all data from a store
 */
export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await initLocalDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return {
      usage,
      quota,
      percentage: quota > 0 ? (usage / quota) * 100 : 0,
    };
  }

  return { usage: 0, quota: 0, percentage: 0 };
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    return await navigator.storage.persist();
  }
  return false;
}
