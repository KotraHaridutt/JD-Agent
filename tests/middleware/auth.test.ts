import { describe, it, expect } from 'vitest';
import { validateApiKey } from '../../api/middleware/auth';
import { TEST_SECRET_KEY, TEST_INVALID_KEY } from '../fixtures/auth.fixtures';

describe('validateApiKey Middleware Unit Tests', () => {
  it('should return AUTH_REQUIRED when providedKey is undefined', () => {
    const result = validateApiKey(undefined, TEST_SECRET_KEY);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('AUTH_REQUIRED');
    expect(result.error).toContain('Authentication key required');
  });

  it('should return AUTH_REQUIRED when providedKey is null', () => {
    const result = validateApiKey(null, TEST_SECRET_KEY);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('AUTH_REQUIRED');
    expect(result.error).toContain('Authentication key required');
  });

  it('should return AUTH_REQUIRED when providedKey is an empty string', () => {
    const result = validateApiKey('', TEST_SECRET_KEY);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('AUTH_REQUIRED');
    expect(result.error).toContain('Authentication key required');
  });

  it('should return AUTH_REQUIRED when providedKey contains only whitespace', () => {
    const result = validateApiKey('   \t\n ', TEST_SECRET_KEY);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('AUTH_REQUIRED');
    expect(result.error).toContain('Authentication key required');
  });

  it('should return AUTH_INVALID when providedKey does not match expected key', () => {
    const result = validateApiKey(TEST_INVALID_KEY, TEST_SECRET_KEY);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('AUTH_INVALID');
    expect(result.error).toContain('Invalid API key');
  });

  it('should return AUTH_INVALID when providedKey length differs from expected key', () => {
    const result = validateApiKey('short_key', TEST_SECRET_KEY);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('AUTH_INVALID');
    expect(result.error).toContain('Invalid API key');
  });

  it('should return valid: true when providedKey exactly matches expected key', () => {
    const result = validateApiKey(TEST_SECRET_KEY, TEST_SECRET_KEY);
    expect(result.valid).toBe(true);
    expect(result.code).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it('should return valid: true when providedKey has extra leading/trailing whitespace', () => {
    const result = validateApiKey(`   ${TEST_SECRET_KEY} \n\t`, TEST_SECRET_KEY);
    expect(result.valid).toBe(true);
    expect(result.code).toBeUndefined();
  });
});
