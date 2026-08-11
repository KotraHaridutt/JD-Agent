import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from '../../api/analyze';
import { TEST_SECRET_KEY } from '../fixtures/auth.fixtures';
import { VALID_ANALYZE_PAYLOAD } from '../fixtures/validation.fixtures';

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
    _getParsedBody() {
      return endData ? JSON.parse(endData) : null;
    },
    _getStatus() {
      return statusCode;
    }
  };

  return { req, res };
}

describe('Error Sanitization Integration Tests (POST /api/analyze)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      API_KEY: TEST_SECRET_KEY,
      OPENAI_API_KEY: 'mock_openai_key_invalid',
      SKIP_RATE_LIMIT: 'true'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should return sanitized 502 SERVICE_ERROR and X-Correlation-ID header when OpenAI API returns 401 Unauthorized', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => '{"error": {"message": "Invalid API Key sk-proj-12345"}}'
      })
    );

    const { req, res } = createMockReqRes({
      headers: {
        'x-api-key': TEST_SECRET_KEY,
        'x-correlation-id': 'test-client-corr-id'
      },
      body: VALID_ANALYZE_PAYLOAD
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(502);
    expect(res._getHeader('x-correlation-id')).toBe('test-client-corr-id');

    const body = res._getParsedBody();
    expect(body.error).toBe('Analysis service temporarily unavailable');
    expect(body.code).toBe('SERVICE_ERROR');
    expect(body.correlationId).toBe('test-client-corr-id');

    // Security assertions: details, stack, file paths, and secret keys must be absent
    expect(body.details).toBeUndefined();
    expect(body.stack).toBeUndefined();
    const rawBodyString = JSON.stringify(body);
    expect(rawBodyString).not.toContain('sk-proj');
    expect(rawBodyString).not.toContain('OPENAI_API_KEY');
  });

  it('should return sanitized 502 SERVICE_ERROR when OpenAI returns non-JSON response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ output_text: '```json\n { invalid json syntax \n```' }),
        text: async () => '<html>500 Internal Error</html>'
      })
    );

    const { req, res } = createMockReqRes({
      headers: { 'x-api-key': TEST_SECRET_KEY },
      body: VALID_ANALYZE_PAYLOAD
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(502);
    expect(res._getHeader('x-correlation-id')).toBeDefined();

    const body = res._getParsedBody();
    expect(body.code).toBe('SERVICE_ERROR');
    expect(body.details).toBeUndefined();
  });

  it('should attach X-Correlation-ID header and return sanitized body on 401 Auth error', async () => {
    const { req, res } = createMockReqRes({
      headers: {},
      body: VALID_ANALYZE_PAYLOAD
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(401);
    expect(res._getHeader('x-correlation-id')).toBeDefined();

    const body = res._getParsedBody();
    expect(body.code).toBe('AUTH_REQUIRED');
    expect(body.correlationId).toBeDefined();
    expect(body.details).toBeUndefined();
  });
});
