/**
 * Signature Verification and Device Authentication
 * Used to verify the authenticity of messages and data
 */

import { verifySignature, signData } from './encryption';
import { getKeyPair, importPublicKey } from './keys';

export interface SignedMessage {
  data: string;
  signature: string;
  senderId: string;
  timestamp: number;
}

/**
 * Sign a message with user's signing key
 */
export async function signMessage(
  data: string,
  userId: string
): Promise<SignedMessage> {
  const signingKeyPair = await getKeyPair(`signing_${userId}`);

  if (!signingKeyPair) {
    throw new Error('Signing key not found');
  }

  const signature = await signData(data, signingKeyPair.privateKey);

  return {
    data,
    signature,
    senderId: userId,
    timestamp: Date.now(),
  };
}

/**
 * Verify a signed message
 */
export async function verifySignedMessage(
  message: SignedMessage,
  senderPublicKeyStr: string
): Promise<boolean> {
  try {
    const publicKey = await importPublicKey(senderPublicKeyStr, 'ECDSA');
    return await verifySignature(message.data, message.signature, publicKey);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Verify message timestamp is recent (prevent replay attacks)
 */
export function verifyTimestamp(
  timestamp: number,
  maxAgeMs: number = 300000
): boolean {
  const now = Date.now();
  const age = now - timestamp;
  return age >= 0 && age <= maxAgeMs;
}

/**
 * Create a challenge for device authentication
 */
export function createAuthChallenge(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...Array.from(array)));
}

/**
 * Respond to authentication challenge
 */
export async function respondToChallenge(
  challenge: string,
  userId: string
): Promise<{ challenge: string; response: string }> {
  const signingKeyPair = await getKeyPair(`signing_${userId}`);

  if (!signingKeyPair) {
    throw new Error('Signing key not found');
  }

  const response = await signData(challenge, signingKeyPair.privateKey);

  return {
    challenge,
    response,
  };
}

/**
 * Verify challenge response
 */
export async function verifyChallengeResponse(
  challenge: string,
  response: string,
  publicKeyStr: string
): Promise<boolean> {
  try {
    const publicKey = await importPublicKey(publicKeyStr, 'ECDSA');
    return await verifySignature(challenge, response, publicKey);
  } catch (error) {
    console.error('Challenge verification failed:', error);
    return false;
  }
}

/**
 * Create integrity hash for data
 */
export async function createIntegrityHash(data: any): Promise<string> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonString);

  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

  return btoa(String.fromCharCode(...Array.from(new Uint8Array(hashBuffer))));
}

/**
 * Verify data integrity
 */
export async function verifyIntegrity(
  data: any,
  expectedHash: string
): Promise<boolean> {
  const actualHash = await createIntegrityHash(data);
  return actualHash === expectedHash;
}
