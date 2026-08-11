import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from '../../api/analyze';
import * as rateLimitModule from '../../api/middleware/rateLimit';
import {
  TEST_SECRET_KEY,
  MOCK_ANALYZE_PAYLOAD,
  MOCK_OPENAI_RESPONSE
} from '../fixtures/auth.fixtures';
import {
  MOCK_RATE_LIMIT_SUCCESS,
  MOCK_RATE_LIMIT_EXCEEDED
} from '../fixtures/rateLimit.fixtures';

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
    _getHeader(name: string) {
      return resHeaders[name.toLowerCase()];
    },
    _getHeaders() {
      return resHeaders;
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

describe('Full Middleware Chain Integration Tests (Auth -> RateLimit -> Handler)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      API_KEY: TEST_SECRET_KEY,
      OPENAI_API_KEY: 'mock_openai_key'
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

  it('1. Auth Failure Short-Circuit: missing key returns 401 immediately without calling rate limit', async () => {
    const rateLimitSpy = vi.spyOn(rateLimitModule, 'checkRateLimit');

    const { req, res } = createMockReqRes({
      headers: {},
      body: MOCK_ANALYZE_PAYLOAD
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(401);
    const body = res._getParsedBody();
    expect(body.code).toBe('AUTH_REQUIRED');

    // Rate limiter must NOT be invoked when auth fails
    expect(rateLimitSpy).not.toHaveBeenCalled();
  });

  it('2. Rate Limit Short-Circuit: valid key + rate limit exceeded returns 429 with Retry-After without calling OpenAI handler', async () => {
    const rateLimitSpy = vi
      .spyOn(rateLimitModule, 'checkRateLimit')
      .mockResolvedValue(MOCK_RATE_LIMIT_EXCEEDED);

    const fetchSpy = globalThis.fetch as any;

    const { req, res } = createMockReqRes({
      headers: { 'x-api-key': TEST_SECRET_KEY },
      body: MOCK_ANALYZE_PAYLOAD
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(429);
    const body = res._getParsedBody();
    expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(body.error).toContain('Rate limit exceeded');

    // Headers verification
    expect(res._getHeader('retry-after')).toBeDefined();
    expect(res._getHeader('x-ratelimit-limit')).toBe('10');
    expect(res._getHeader('x-ratelimit-remaining')).toBe('0');
    expect(res._getHeader('x-ratelimit-reset')).toBeDefined();

    expect(rateLimitSpy).toHaveBeenCalled();
    // OpenAI fetch must NOT be called when rate limit is exceeded
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('3. Full Pipeline Success: valid key + under rate limit proceeds to handler and returns 200 with X-RateLimit-* headers', async () => {
    vi.spyOn(rateLimitModule, 'checkRateLimit').mockResolvedValue(MOCK_RATE_LIMIT_SUCCESS);

    const { req, res } = createMockReqRes({
      headers: { 'x-api-key': TEST_SECRET_KEY },
      body: MOCK_ANALYZE_PAYLOAD
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(200);
    const body = res._getParsedBody();
    expect(body.correlationId).toBeDefined();
    expect(body.summary).toBeDefined();

    // Headers verification
    expect(res._getHeader('x-ratelimit-limit')).toBe('10');
    expect(res._getHeader('x-ratelimit-remaining')).toBe('9');
    expect(res._getHeader('x-ratelimit-reset')).toBeDefined();
  });

  it('4. Rate Limit Headers present on 400 validation error responses', async () => {
    vi.spyOn(rateLimitModule, 'checkRateLimit').mockResolvedValue(MOCK_RATE_LIMIT_SUCCESS);

    const { req, res } = createMockReqRes({
      headers: { 'x-api-key': TEST_SECRET_KEY },
      body: {} // invalid empty body
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(400);
    const body = res._getParsedBody();
    expect(body.code).toBe('INVALID_INPUT');

    expect(res._getHeader('x-ratelimit-limit')).toBe('10');
    expect(res._getHeader('x-ratelimit-remaining')).toBe('9');
    expect(res._getHeader('x-ratelimit-reset')).toBeDefined();
  });
});
