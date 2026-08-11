import { describe, it, expect } from 'vitest';
import { AppError } from '../../api/lib/AppError';

describe('AppError Unit Tests (api/lib/AppError.ts)', () => {
  it('should instantiate correctly with message, status, code, and details', () => {
    const details = { field: 'email', reason: 'invalid format' };
    const err = new AppError('Validation failed', 400, 'VALIDATION_ERROR', details);

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe('AppError');
    expect(err.message).toBe('Validation failed');
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual(details);
  });

  it('should handle instantiation without optional details', () => {
    const err = new AppError('Unauthorized', 401, 'AUTH_REQUIRED');

    expect(err.message).toBe('Unauthorized');
    expect(err.status).toBe(401);
    expect(err.code).toBe('AUTH_REQUIRED');
    expect(err.details).toBeUndefined();
  });

  it('should return true for AppError.isAppError with an AppError instance', () => {
    const err = new AppError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
    expect(AppError.isAppError(err)).toBe(true);
  });

  it('should return true for AppError.isAppError with duck-typed error objects', () => {
    const duckErr = {
      name: 'AppError',
      message: 'Service error',
      status: 502,
      code: 'SERVICE_ERROR'
    };
    expect(AppError.isAppError(duckErr)).toBe(true);
  });

  it('should return false for AppError.isAppError with standard Error instances', () => {
    const stdErr = new Error('Standard error');
    expect(AppError.isAppError(stdErr)).toBe(false);
  });

  it('should return false for AppError.isAppError with non-Error values', () => {
    expect(AppError.isAppError(null)).toBe(false);
    expect(AppError.isAppError(undefined)).toBe(false);
    expect(AppError.isAppError('Error string')).toBe(false);
    expect(AppError.isAppError(500)).toBe(false);
    expect(AppError.isAppError({})).toBe(false);
  });
});
