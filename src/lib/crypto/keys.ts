/**
 * Cryptographic Key Management
 * Handles generation, storage, and retrieval of encryption keys
 * Uses Web Crypto API for maximum security
 */

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface StoredKeyPair {
  publicKey: string;
  privateKeyId: string; // IDB key for non-extractable key
}

const KEYS_DB_NAME = 'crypto_keys_db';
const KEYS_STORE_NAME = 'keys';
const KEY_VERSION = 1;

/**
 * Initialize IndexedDB for key storage
 */
async function initKeysDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(KEYS_DB_NAME, KEY_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(KEYS_STORE_NAME)) {
        db.createObjectStore(KEYS_STORE_NAME);
      }
    };
  });
}

/**
 * Generate identity key pair (ECDH for key agreement)
 * Non-extractable for maximum security
 */
export async function generateIdentityKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false, // non-extractable
    ['deriveKey', 'deriveBits']
  );

  return keyPair as KeyPair;
}

/**
 * Generate signing key pair (ECDSA for signatures)
 */
export async function generateSigningKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false, // non-extractable
    ['sign', 'verify']
  );

  return keyPair as KeyPair;
}

/**
 * Generate AES key for symmetric encryption
 */
export async function generateAESKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive encryption key from password using PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  // Generate salt if not provided
  const keySalt = salt || crypto.getRandomValues(new Uint8Array(16));

  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: keySalt as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );

  return { key: derivedKey, salt: keySalt };
}

/**
 * Export public key to base64 string (for sharing)
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', publicKey);
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(exported))));
}

/**
 * Import public key from base64 string
 */
export async function importPublicKey(
  publicKeyStr: string,
  algorithm: 'ECDH' | 'ECDSA'
): Promise<CryptoKey> {
  const keyData = Uint8Array.from(atob(publicKeyStr), (c) => c.charCodeAt(0));

  const keyUsages: KeyUsage[] =
    algorithm === 'ECDH' ? ['deriveKey', 'deriveBits'] : ['verify'];

  return await crypto.subtle.importKey(
    'spki',
    keyData,
    {
      name: algorithm,
      namedCurve: 'P-256',
    },
    true,
    keyUsages
  );
}

/**
 * Store key pair in IndexedDB
 * Private keys are stored as non-extractable CryptoKey objects
 */
export async function storeKeyPair(
  keyPair: KeyPair,
  keyId: string
): Promise<void> {
  const db = await initKeysDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(KEYS_STORE_NAME);

    const publicKeyData = {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
    };

    const request = store.put(publicKeyData, keyId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Retrieve key pair from IndexedDB
 */
export async function getKeyPair(keyId: string): Promise<KeyPair | null> {
  const db = await initKeysDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(KEYS_STORE_NAME);
    const request = store.get(keyId);

    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        resolve({
          publicKey: result.publicKey,
          privateKey: result.privateKey,
        });
      } else {
        resolve(null);
      }
    };

    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Store single CryptoKey in IndexedDB
 */
export async function storeKey(
  key: CryptoKey,
  keyId: string
): Promise<void> {
  const db = await initKeysDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(KEYS_STORE_NAME);
    const request = store.put(key, keyId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Retrieve single CryptoKey from IndexedDB
 */
export async function getKey(keyId: string): Promise<CryptoKey | null> {
  const db = await initKeysDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(KEYS_STORE_NAME);
    const request = store.get(keyId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Initialize user keys on first login
 * Generates all necessary keys and stores them securely
 */
export async function initializeUserKeys(userId: string, password: string) {
  // Derive master key from password
  const { key: masterKey, salt } = await deriveKeyFromPassword(password);

  // Generate identity key pair for ECDH
  const identityKeyPair = await generateIdentityKeyPair();

  // Generate signing key pair for ECDSA
  const signingKeyPair = await generateSigningKeyPair();

  // Store keys
  await storeKey(masterKey, `master_${userId}`);
  await storeKeyPair(identityKeyPair, `identity_${userId}`);
  await storeKeyPair(signingKeyPair, `signing_${userId}`);

  // Export public keys for server storage
  const identityPublicKey = await exportPublicKey(identityKeyPair.publicKey);
  const signingPublicKey = await exportPublicKey(signingKeyPair.publicKey);

  return {
    identityPublicKey,
    signingPublicKey,
    salt: Array.from(salt),
  };
}

/**
 * Derive shared secret using ECDH
 */
export async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  return await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}
