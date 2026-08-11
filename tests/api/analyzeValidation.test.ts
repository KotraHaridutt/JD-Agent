import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from '../../api/analyze';
import { TEST_SECRET_KEY, MOCK_OPENAI_RESPONSE } from '../fixtures/auth.fixtures';
import {
  VALID_API_REQUEST,
  MISSING_SYSTEM_API_REQUEST,
  MISSING_MESSAGE_API_REQUEST,
  OVERSIZED_SYSTEM_API_REQUEST,
  OVERSIZED_MESSAGE_API_REQUEST,
  XSS_HTML_API_REQUEST
} from '../fixtures/requestFixtures';

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

describe('Inbound API Request Validation Tests (POST /api/analyze)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      API_KEY: TEST_SECRET_KEY,
      OPENAI_API_KEY: 'mock_openai_key',
      SKIP_RATE_LIMIT: 'true'
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

  it('should pass valid API request and return 200 OK with correlation ID header', async () => {
    const { req, res } = createMockReqRes({
      headers: {
        'x-api-key': TEST_SECRET_KEY,
        'x-correlation-id': 'test-corr-valid-123'
      },
      body: VALID_API_REQUEST
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(200);
    expect(res._getHeader('x-correlation-id')).toBe('test-corr-valid-123');
    const body = res._getParsedBody();
    expect(body.correlationId).toBe('test-corr-valid-123');
  });

  it('should reject missing system prompt with 400 VALIDATION_ERROR and field details', async () => {
    const { req, res } = createMockReqRes({
      headers: { 'x-api-key': TEST_SECRET_KEY },
      body: MISSING_SYSTEM_API_REQUEST
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(400);
    expect(res._getHeader('x-correlation-id')).toBeDefined();
    const body = res._getParsedBody();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.error).toBe('Invalid request body');
  });

  it('should reject missing message with 400 VALIDATION_ERROR and field details', async () => {
    const { req, res } = createMockReqRes({
      headers: { 'x-api-key': TEST_SECRET_KEY },
      body: MISSING_MESSAGE_API_REQUEST
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(400);
    const body = res._getParsedBody();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('should reject system prompt > 10,000 characters with 400 VALIDATION_ERROR', async () => {
    const { req, res } = createMockReqRes({
      headers: { 'x-api-key': TEST_SECRET_KEY },
      body: OVERSIZED_SYSTEM_API_REQUEST
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(400);
    const body = res._getParsedBody();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('should reject message > 100,000 characters with 400 VALIDATION_ERROR', async () => {
    const { req, res } = createMockReqRes({
      headers: { 'x-api-key': TEST_SECRET_KEY },
      body: OVERSIZED_MESSAGE_API_REQUEST
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(400);
    const body = res._getParsedBody();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('should sanitize HTML tags and control characters before processing request', async () => {
    const fetchSpy = globalThis.fetch as any;

    const { req, res } = createMockReqRes({
      headers: { 'x-api-key': TEST_SECRET_KEY },
      body: XSS_HTML_API_REQUEST
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(200);
    expect(fetchSpy).toHaveBeenCalled();

    const fetchArgs = fetchSpy.mock.calls[0];
    const openAiPayload = JSON.parse(fetchArgs[1].body);

    const sanitizedSystem = openAiPayload.input[0].content[0].text;
    expect(sanitizedSystem).not.toContain('<script>');
    expect(sanitizedSystem).toContain('alert("xss") System Prompt');
  });
});
