import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hash user password using bcrypt with 12 salt rounds
 */
export const hashPassword = async (password) => {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

/**
 * Compare plaintext password with stored bcrypt hash
 */
export const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate cryptographically secure random hex string of given byte length
 */
export const generateRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Compute SHA-256 digest of any string (used for zero-knowledge token hash storage)
 */
export const hashSha256 = (value) => {
  return crypto.createHash('sha256').update(value).digest('hex');
};

/**
 * Compute HMAC-SHA-256 signature for data payload
 */
export const createHmacSignature = (data, secret = config.qrHmacSecret) => {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * Constant-time comparison between two string digests to prevent timing attacks
 */
export const safeCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Create a signed QR authentication payload
 * Format: `${requestId}.${nonce}.${signature}`
 */
export const createSignedQrToken = (requestId, nonce) => {
  const payload = `${requestId}.${nonce}`;
  const signature = createHmacSignature(payload);
  return `${payload}.${signature}`;
};

/**
 * Verify a signed QR authentication payload
 * Returns { valid: boolean, requestId: string, nonce: string }
 */
export const verifySignedQrToken = (token) => {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Invalid token structure' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed token payload' };
  }

  const [requestId, nonce, signature] = parts;
  const expectedPayload = `${requestId}.${nonce}`;
  const expectedSignature = createHmacSignature(expectedPayload);

  if (!safeCompare(signature, expectedSignature)) {
    return { valid: false, error: 'Cryptographic HMAC signature verification failed' };
  }

  return { valid: true, requestId, nonce };
};
