import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from '../../api/analyze';
import {
  TEST_SECRET_KEY,
  TEST_INVALID_KEY,
  MOCK_ANALYZE_PAYLOAD,
  MOCK_OPENAI_RESPONSE
} from '../fixtures/auth.fixtures';

function createMockReqRes(options: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}) {
  const method = options.method ?? 'POST';
  const headers = options.headers ?? {};
  const body = options.body;

  const req: any = {
    method,
    headers,
    body: typeof body === 'object' ? JSON.stringify(body) : body
  };

  let statusCode = 200;
  const resHeaders: Record<string, string> = {};
  let endData = '';

  const res: any = {
    get statusCode() {
      return statusCode;
    },
    set statusCode(val: number) {
      statusCode = val;
    },
    setHeader(name: string, value: string) {
      resHeaders[name.toLowerCase()] = value;
    },
    end(data?: string) {
      if (data) {
        endData = data;
      }
    },
    _getParsedBody() {
      return endData ? JSON.parse(endData) : null;
    },
    _getStatus() {
      return statusCode;
    }
  };

  return { req, res };
}

describe('POST /api/analyze Integration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      API_KEY: TEST_SECRET_KEY,
      OPENAI_API_KEY: 'mock_openai_api_key_123',
      OPENAI_MODEL: 'gpt-4o-mini'
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => MOCK_OPENAI_RESPONSE,
        text: async () => JSON.stringify(MOCK_OPENAI_RESPONSE)
      })
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should return 401 AUTH_REQUIRED when X-API-Key header is missing', async () => {
    const { req, res } = createMockReqRes({
      headers: {},
      body: MOCK_ANALYZE_PAYLOAD
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(401);
    const body = res._getParsedBody();
    expect(body.code).toBe('AUTH_REQUIRED');
    expect(body.error).toContain('Authentication key required');
    expect(body.correlationId).toBeDefined();
    expect(typeof body.correlationId).toBe('string');
  });

  it('should return 401 AUTH_INVALID when X-API-Key header is incorrect', async () => {
    const { req, res } = createMockReqRes({
      headers: { 'x-api-key': TEST_INVALID_KEY },
      body: MOCK_ANALYZE_PAYLOAD
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(401);
    const body = res._getParsedBody();
    expect(body.code).toBe('AUTH_INVALID');
    expect(body.error).toContain('Invalid API key');
    expect(body.correlationId).toBeDefined();
  });

  it('should return 200 OK with valid X-API-Key header and payload', async () => {
    const { req, res } = createMockReqRes({
      headers: { 'x-api-key': TEST_SECRET_KEY },
      body: MOCK_ANALYZE_PAYLOAD
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(200);
    const body = res._getParsedBody();
    expect(body.correlationId).toBeDefined();
    expect(body.summary).toBeDefined();
    expect(body.matchScore).toBe(85);
  });

  it('should return 500 SERVER_MISCONFIGURED if API_KEY is missing on server', async () => {
    delete process.env.API_KEY;

    const { req, res } = createMockReqRes({
      headers: { 'x-api-key': TEST_SECRET_KEY },
      body: MOCK_ANALYZE_PAYLOAD
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(500);
    const body = res._getParsedBody();
    expect(body.code).toBe('SERVER_MISCONFIGURED');
    expect(body.correlationId).toBeDefined();
  });
});
