import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from '../analyze';
import { createMockRequest, createMockResponse } from '../../src/test/helpers';
import { createOpenAIMock } from '../../src/test/mocks/openai';

describe('api/analyze.ts End-to-End Integration Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.API_KEY = 'valid-server-api-key';
    process.env.OPENAI_API_KEY = 'sk-test-openai-secret-key-12345';
    process.env.OPENAI_MODEL = 'gpt-4o-mini';
    process.env.SKIP_RATE_LIMIT = 'true';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Happy Path Integration', () => {
    it('processes valid POST request end-to-end and returns 200 with parseable JSON and headers', async () => {
      const mockFetch = createOpenAIMock({
        outputText: JSON.stringify({
          status: 'success',
          summary: 'Candidate has strong TypeScript background'
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const req = createMockRequest({
        method: 'POST',
        headers: {
          'x-api-key': 'valid-server-api-key',
          'content-type': 'application/json'
        },
        body: {
          system: 'You are an expert career agent.',
          message: 'Analyze candidate resume for Senior Frontend role.',
          useWebSearch: false
        }
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/json');
      expect(res.headers['x-correlation-id']).toBeDefined();

      const json = res._getJsonBody();
      expect(json.status).toBe('success');
      expect(json.summary).toBe('Candidate has strong TypeScript background');
      expect(json.correlationId).toBeDefined();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchArgs = mockFetch.mock.calls[0];
      expect(fetchArgs[0]).toBe('https://api.openai.com/v1/responses');
      expect(fetchArgs[1].headers.Authorization).toBe('Bearer sk-test-openai-secret-key-12345');
    });

    it('processes web search mode POST request cleanly', async () => {
      const mockFetch = createOpenAIMock({
        outputMessageText: JSON.stringify({ liveJdFound: true, company: 'Google' })
      });
      vi.stubGlobal('fetch', mockFetch);

      const req = createMockRequest({
        method: 'POST',
        headers: { 'x-api-key': 'valid-server-api-key' },
        body: {
          system: 'You are a search agent.',
          message: 'Find Google Backend roles',
          useWebSearch: true
        }
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const json = res._getJsonBody();
      expect(json.liveJdFound).toBe(true);

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload.tools).toEqual([{ type: 'web_search_preview' }]);
    });
  });

  describe('Authentication Middleware Integration', () => {
    it('returns 401 AUTH_INVALID when X-API-Key header is missing', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: {}, // missing x-api-key
        body: { system: 'System', message: 'Message' }
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(401);
      const json = res._getJsonBody();
      expect(json.error).toBeDefined();
      expect(json.code).toBe('AUTH_INVALID');
      expect(json.correlationId).toBeDefined();
    });

    it('returns 401 AUTH_INVALID when X-API-Key header is invalid', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: { 'x-api-key': 'invalid-secret-key' },
        body: { system: 'System', message: 'Message' }
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(401);
      const json = res._getJsonBody();
      expect(json.code).toBe('AUTH_INVALID');
    });
  });

  describe('Rate Limiting Middleware Integration', () => {
    it('attaches rate limiting response headers on every response', async () => {
      delete process.env.SKIP_RATE_LIMIT;

      const mockFetch = createOpenAIMock({
        outputText: JSON.stringify({ ok: true })
      });
      vi.stubGlobal('fetch', mockFetch);

      const req = createMockRequest({
        method: 'POST',
        headers: { 'x-api-key': 'valid-server-api-key' },
        body: { system: 'System', message: 'Message' }
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('returns 429 RATE_LIMIT_EXCEEDED with Retry-After header when rate limit is exceeded', async () => {
      delete process.env.SKIP_RATE_LIMIT;

      const mockFetch = createOpenAIMock({ outputText: JSON.stringify({ ok: true }) });
      vi.stubGlobal('fetch', mockFetch);

      const reqOptions = {
        method: 'POST',
        headers: { 'x-api-key': 'valid-server-api-key' },
        socket: { remoteAddress: '192.168.1.100' },
        body: { system: 'System', message: 'Message' }
      };

      // Send 10 rapid requests (under 10 req/min rate limit)
      for (let i = 0; i < 10; i++) {
        const req = createMockRequest(reqOptions);
        const res = createMockResponse();
        await handler(req, res);
      }

      // 11th request from same IP should trigger 429
      const req11 = createMockRequest(reqOptions);
      const res11 = createMockResponse();
      await handler(req11, res11);

      expect(res11.statusCode).toBe(429);
      expect(res11.headers['retry-after']).toBeDefined();
      const json = res11._getJsonBody();
      expect(json.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Input Schema Validation Integration', () => {
    it('returns 400 VALIDATION_ERROR when system prompt is empty', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: { 'x-api-key': 'valid-server-api-key' },
        body: { system: '   ', message: 'Valid message' }
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      const json = res._getJsonBody();
      expect(json.code).toBe('VALIDATION_ERROR');
      expect(json.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'system' })
        ])
      );
    });

    it('returns 400 VALIDATION_ERROR when message exceeds 100,000 characters', async () => {
      const hugeMessage = 'x'.repeat(100001);
      const req = createMockRequest({
        method: 'POST',
        headers: { 'x-api-key': 'valid-server-api-key' },
        body: { system: 'System prompt', message: hugeMessage }
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      const json = res._getJsonBody();
      expect(json.code).toBe('VALIDATION_ERROR');
      expect(json.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'message' })
        ])
      );
    });

    it('returns 400 VALIDATION_ERROR when useWebSearch is non-boolean', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: { 'x-api-key': 'valid-server-api-key' },
        body: { system: 'System prompt', message: 'User message', useWebSearch: 'true' }
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      const json = res._getJsonBody();
      expect(json.code).toBe('VALIDATION_ERROR');
      expect(json.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'useWebSearch' })
        ])
      );
    });
  });

  describe('Error Response Format & Sanitization', () => {
    it('formats all error responses consistently with error, code, and correlationId fields', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(405);
      const json = res._getJsonBody();
      expect(typeof json.error).toBe('string');
      expect(typeof json.code).toBe('string');
      expect(typeof json.correlationId).toBe('string');
    });

    it('never leaks secret API keys, internal file paths, or stack traces in error responses', async () => {
      const secretKey = 'sk-test-openai-secret-key-12345';
      const mockFetch = createOpenAIMock({
        status: 500,
        statusText: 'Internal Error',
        errorText: `Fatal crash in /var/server/api/analyze.ts using key ${secretKey}`
      });
      vi.stubGlobal('fetch', mockFetch);

      const req = createMockRequest({
        method: 'POST',
        headers: { 'x-api-key': 'valid-server-api-key' },
        body: { system: 'System', message: 'Message' }
      });
      const res = createMockResponse();

      await handler(req, res);

      const rawResponseText = JSON.stringify(res._getJsonBody());
      expect(rawResponseText).not.toContain(secretKey);
      expect(rawResponseText).not.toContain('stack');
      expect(rawResponseText).not.toContain('/var/server/api/analyze.ts');
    });
  });

  describe('Response Format Consistency', () => {
    it('ensures successful output JSON does not contain raw markdown code fences', async () => {
      const markdownJson = '```json\n{\n  "analysis": "clean"\n}\n```';
      const mockFetch = createOpenAIMock({
        outputText: markdownJson
      });
      vi.stubGlobal('fetch', mockFetch);

      const req = createMockRequest({
        method: 'POST',
        headers: { 'x-api-key': 'valid-server-api-key' },
        body: { system: 'System', message: 'Message' }
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const json = res._getJsonBody();
      expect(json.analysis).toBe('clean');
      const resText = res._getOutputText();
      expect(resText).not.toContain('```json');
    });
  });

  describe('Edge Cases & Concurrent Executions', () => {
    it('handles text/plain Content-Type with valid JSON payload correctly', async () => {
      const mockFetch = createOpenAIMock({
        outputText: JSON.stringify({ plainTextSupported: true })
      });
      vi.stubGlobal('fetch', mockFetch);

      const req = createMockRequest({
        method: 'POST',
        headers: {
          'x-api-key': 'valid-server-api-key',
          'content-type': 'text/plain'
        },
        body: JSON.stringify({ system: 'System', message: 'Message' })
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const json = res._getJsonBody();
      expect(json.plainTextSupported).toBe(true);
    });

    it('processes concurrent handler calls without state contamination', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url, init) => {
        const bodyObj = JSON.parse(init.body);
        const userText = bodyObj.input[1].content[0].text;
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ output_text: JSON.stringify({ processedUserText: userText }) }),
          text: async () => JSON.stringify({ output_text: JSON.stringify({ processedUserText: userText }) })
        };
      });
      vi.stubGlobal('fetch', mockFetch);

      const req1 = createMockRequest({
        method: 'POST',
        headers: { 'x-api-key': 'valid-server-api-key' },
        body: { system: 'System 1', message: 'Message User 1' }
      });
      const res1 = createMockResponse();

      const req2 = createMockRequest({
        method: 'POST',
        headers: { 'x-api-key': 'valid-server-api-key' },
        body: { system: 'System 2', message: 'Message User 2' }
      });
      const res2 = createMockResponse();

      await Promise.all([handler(req1, res1), handler(req2, res2)]);

      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);
      expect(res1._getJsonBody().processedUserText).toBe('Message User 1');
      expect(res2._getJsonBody().processedUserText).toBe('Message User 2');
    });

    it('returns 500 SERVER_MISCONFIGURED when server API_KEY is completely omitted', async () => {
      delete process.env.API_KEY;

      const req = createMockRequest({
        method: 'POST',
        headers: { 'x-api-key': 'valid-server-api-key' },
        body: { system: 'System', message: 'Message' }
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      const json = res._getJsonBody();
      expect(json.code).toBe('SERVER_MISCONFIGURED');
    });
  });
});
