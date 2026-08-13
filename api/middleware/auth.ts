import crypto from 'crypto';

export type AuthValidationResult =
  | { valid: true }
  | { valid: false; code: 'AUTH_REQUIRED' | 'AUTH_INVALID'; error: string };

/**
 * Validates an incoming API key against the server-configured key using constant-time comparison.
 *
 * @param providedKey The API key string received from the request header (e.g. X-API-Key).
 * @param expectedKey The API key string configured on the server environment.
 * @returns AuthValidationResult object indicating validity, error code, and error message.
 */
export function validateApiKey(
  providedKey: string | undefined | null,
  expectedKey: string
): AuthValidationResult {
  if (providedKey === undefined || providedKey === null) {
    return {
      valid: false,
      code: 'AUTH_REQUIRED',
      error: 'Authentication key required. Please provide a valid API-Key header.'
    };
  }

  const trimmedProvided = providedKey.trim();
  if (trimmedProvided.length === 0) {
    return {
      valid: false,
      code: 'AUTH_REQUIRED',
      error: 'Authentication key required. Please provide a valid API-Key header.'
    };
  }

  if (!expectedKey) {
    return {
      valid: false,
      code: 'AUTH_INVALID',
      error: 'Server environment misconfiguration.'
    };
  }

  const bufProvided = Buffer.from(trimmedProvided);
  const bufExpected = Buffer.from(expectedKey);

  if (bufProvided.length !== bufExpected.length) {
    // Constant-time execution path even when buffer lengths differ to mitigate timing attacks
    crypto.timingSafeEqual(bufProvided, bufProvided);
    return {
      valid: false,
      code: 'AUTH_INVALID',
      error: 'Invalid API key provided in API-Key header.'
    };
  }

  const isMatch = crypto.timingSafeEqual(bufProvided, bufExpected);
  if (!isMatch) {
    return {
      valid: false,
      code: 'AUTH_INVALID',
      error: 'Invalid API key provided in API-Key header.'
    };
  }

  return { valid: true };
}
