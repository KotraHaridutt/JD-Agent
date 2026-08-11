import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getOrGenerateCorrelationId,
  sanitizeErrorResponse,
  logServerError
} from '../../api/lib/errorHandler';
import {
  MOCK_OPENAI_401_ERROR,
  MOCK_OPENAI_429_ERROR,
  MOCK_OPENAI_PARSE_ERROR,
  MOCK_INTERNAL_STACK_ERROR
} from '../fixtures/sanitization.fixtures';

describe('Error Sanitization Library Unit Tests (api/lib/errorHandler.ts)', () => {
  describe('getOrGenerateCorrelationId', () => {
    it('should reuse valid incoming x-correlation-id header', () => {
      const req = { headers: { 'x-correlation-id': 'custom-correlation-12345' } };
      expect(getOrGenerateCorrelationId(req)).toBe('custom-correlation-12345');
    });

    it('should generate a new UUID v4 when no header is present', () => {
      const id = getOrGenerateCorrelationId({});
      expect(id).toBeDefined();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate a new UUID v4 if incoming header is invalid or malicious', () => {
      const req = { headers: { 'x-correlation-id': '  ' } };
      const id = getOrGenerateCorrelationId(req);
      expect(id).toBeDefined();
      expect(id).not.toBe('  ');
    });
  });

  describe('sanitizeErrorResponse', () => {
    const testCorrelationId = 'test-uuid-1234-5678';

    it('should map OpenAI 401 error to sanitized 502 SERVICE_ERROR', () => {
      const result = sanitizeErrorResponse(MOCK_OPENAI_401_ERROR, testCorrelationId);

      expect(result.status).toBe(502);
      expect(result.body).toEqual({
        error: 'Analysis service temporarily unavailable',
        code: 'SERVICE_ERROR',
        correlationId: testCorrelationId
      });

      // Assert no details, stack trace, or secrets in response
      expect((result.body as any).details).toBeUndefined();
      expect((result.body as any).stack).toBeUndefined();
      expect(JSON.stringify(result.body)).not.toContain('sk-proj');
    });

    it('should map OpenAI 429 error to sanitized 502 SERVICE_ERROR', () => {
      const result = sanitizeErrorResponse(MOCK_OPENAI_429_ERROR, testCorrelationId);

      expect(result.status).toBe(502);
      expect(result.body.code).toBe('SERVICE_ERROR');
      expect((result.body as any).details).toBeUndefined();
    });

    it('should map JSON parse error to sanitized 502 SERVICE_ERROR', () => {
      const result = sanitizeErrorResponse(MOCK_OPENAI_PARSE_ERROR, testCorrelationId);

      expect(result.status).toBe(502);
      expect(result.body.code).toBe('SERVICE_ERROR');
      expect((result.body as any).details).toBeUndefined();
      expect(JSON.stringify(result.body)).not.toContain('C:/server/api');
    });

    it('should map unknown 500 stack error to sanitized 500 SERVER_ERROR', () => {
      const result = sanitizeErrorResponse(MOCK_INTERNAL_STACK_ERROR, testCorrelationId);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({
        error: 'Unexpected server error',
        code: 'SERVER_ERROR',
        correlationId: testCorrelationId
      });

      expect(JSON.stringify(result.body)).not.toContain('TypeError');
      expect(JSON.stringify(result.body)).not.toContain('C:\\app\\server');
    });

    it('should return ONLY error, code, and correlationId in response body keys', () => {
      const result = sanitizeErrorResponse(MOCK_OPENAI_401_ERROR, testCorrelationId);
      const keys = Object.keys(result.body).sort();
      expect(keys).toEqual(['code', 'error', 'correlationId'].sort());
    });
  });

  describe('logServerError', () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log structured JSON containing correlationId, timestamp, error, and request metadata', () => {
      logServerError(MOCK_INTERNAL_STACK_ERROR, 'corr-999', { method: 'POST', url: '/api/analyze' });

      expect(consoleSpy).toHaveBeenCalled();
      const logString = consoleSpy.mock.calls[0][0];
      const parsedLog = JSON.parse(logString);

      expect(parsedLog.correlationId).toBe('corr-999');
      expect(parsedLog.timestamp).toBeDefined();
      expect(parsedLog.level).toBe('ERROR');
      expect(parsedLog.error.code).toBe('INTERNAL_ERROR');
      expect(parsedLog.error.stack).toBeDefined();
      expect(parsedLog.req.method).toBe('POST');
    });
  });
});
