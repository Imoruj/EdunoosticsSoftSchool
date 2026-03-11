/**
 * Encryption and Decryption Utilities
 * Implements AES-GCM encryption for data at rest and in transit
 */

export interface EncryptedData {
  ciphertext: string; // base64 encoded
  iv: string; // base64 encoded initialization vector
  tag?: string; // authentication tag
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptData(
  plaintext: string,
  key: CryptoKey
): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random IV (96 bits for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(
  encrypted: EncryptedData,
  key: CryptoKey
): Promise<string> {
  const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);
  const iv = base64ToArrayBuffer(encrypted.iv);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt object (converts to JSON first)
 */
export async function encryptObject(
  obj: any,
  key: CryptoKey
): Promise<EncryptedData> {
  const jsonString = JSON.stringify(obj);
  return await encryptData(jsonString, key);
}

/**
 * Decrypt object (parses JSON after decryption)
 */
export async function decryptObject<T = any>(
  encrypted: EncryptedData,
  key: CryptoKey
): Promise<T> {
  const jsonString = await decryptData(encrypted, key);
  return JSON.parse(jsonString) as T;
}

/**
 * Encrypt file/blob
 */
export async function encryptBlob(
  blob: Blob,
  key: CryptoKey
): Promise<{ encrypted: Blob; iv: Uint8Array }> {
  const arrayBuffer = await blob.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    arrayBuffer
  );

  return {
    encrypted: new Blob([encrypted]),
    iv,
  };
}

/**
 * Decrypt file/blob
 */
export async function decryptBlob(
  encryptedBlob: Blob,
  iv: Uint8Array,
  key: CryptoKey
): Promise<Blob> {
  const arrayBuffer = await encryptedBlob.arrayBuffer();

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    arrayBuffer
  );

  return new Blob([decrypted]);
}

/**
 * Sign data using ECDSA
 */
export async function signData(
  data: string,
  privateKey: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    privateKey,
    dataBuffer
  );

  return arrayBufferToBase64(signature);
}

/**
 * Verify signature using ECDSA
 */
export async function verifySignature(
  data: string,
  signature: string,
  publicKey: CryptoKey
): Promise<boolean> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const signatureBuffer = base64ToArrayBuffer(signature);

  return await crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    publicKey,
    signatureBuffer,
    dataBuffer
  );
}

/**
 * Generate random string (for IDs, nonces, etc.)
 */
export function generateRandomId(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return arrayBufferToBase64(array.buffer).slice(0, length);
}

/**
 * Hash data using SHA-256
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

  return arrayBufferToBase64(hashBuffer);
}

/**
 * Utility: Convert ArrayBuffer to base64
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Utility: Convert base64 to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Utility: Convert Uint8Array to hex string
 */
export function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Utility: Convert hex string to Uint8Array
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Encrypt for multiple recipients
 * Used for group messages/lessons
 */
export async function encryptForRecipients(
  plaintext: string,
  recipientPublicKeys: CryptoKey[],
  senderPrivateKey: CryptoKey
): Promise<{
  encryptedData: EncryptedData;
  encryptedKeys: Record<string, EncryptedData>;
}> {
  // Generate ephemeral message key
  const messageKey = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable for re-encryption
    ['encrypt', 'decrypt']
  );

  // Encrypt content with message key
  const encryptedData = await encryptData(plaintext, messageKey);

  // Export message key
  const exportedKey = await crypto.subtle.exportKey('raw', messageKey);
  const messageKeyBase64 = arrayBufferToBase64(exportedKey);

  // Encrypt message key for each recipient
  const encryptedKeys: Record<string, EncryptedData> = {};

  for (let i = 0; i < recipientPublicKeys.length; i++) {
    const recipientPublicKey = recipientPublicKeys[i];

    // Derive shared secret with recipient
    const sharedSecret = await crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: recipientPublicKey,
      },
      senderPrivateKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt']
    );

    // Encrypt message key with shared secret
    const encryptedKey = await encryptData(messageKeyBase64, sharedSecret);
    encryptedKeys[`recipient_${i}`] = encryptedKey;
  }

  return {
    encryptedData,
    encryptedKeys,
  };
}

/**
 * Decrypt message encrypted for multiple recipients
 */
export async function decryptFromSender(
  encryptedData: EncryptedData,
  encryptedMessageKey: EncryptedData,
  senderPublicKey: CryptoKey,
  recipientPrivateKey: CryptoKey
): Promise<string> {
  // Derive shared secret with sender
  const sharedSecret = await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: senderPublicKey,
    },
    recipientPrivateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );

  // Decrypt message key
  const messageKeyBase64 = await decryptData(encryptedMessageKey, sharedSecret);

  // Import message key
  const messageKey = await crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(messageKeyBase64),
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['decrypt']
  );

  // Decrypt actual message
  return await decryptData(encryptedData, messageKey);
}
