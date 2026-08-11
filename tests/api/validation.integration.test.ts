import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from '../../api/analyze';
import { TEST_SECRET_KEY, MOCK_OPENAI_RESPONSE } from '../fixtures/auth.fixtures';
import {
  VALID_ANALYZE_PAYLOAD,
  OVERSIZED_MESSAGE_PAYLOAD,
  HTML_AND_CONTROL_CHARS_PAYLOAD
} from '../fixtures/validation.fixtures';

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

describe('Zod Validation API Handler Integration Tests (POST /api/analyze)', () => {
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

  it('should process a valid payload successfully and return 200 OK', async () => {
    const { req, res } = createMockReqRes({
      headers: { 'x-api-key': TEST_SECRET_KEY },
      body: VALID_ANALYZE_PAYLOAD
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(200);
    const body = res._getParsedBody();
    expect(body.correlationId).toBeDefined();
    expect(body.summary).toBeDefined();
  });

  it('should return 400 VALIDATION_ERROR with field details when message exceeds 100,000 chars', async () => {
    const { req, res } = createMockReqRes({
      headers: { 'x-api-key': TEST_SECRET_KEY },
      body: OVERSIZED_MESSAGE_PAYLOAD
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(400);
    const body = res._getParsedBody();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.error).toBe('Invalid request body');
    expect(body.details).toBeDefined();
    expect(Array.isArray(body.details)).toBe(true);

    const messageFieldErr = body.details.find((d: any) => d.field === 'message');
    expect(messageFieldErr).toBeDefined();
    expect(messageFieldErr.message).toContain('100,000 characters');
  });

  it('should return 400 VALIDATION_ERROR when system or message is missing', async () => {
    const { req, res } = createMockReqRes({
      headers: { 'x-api-key': TEST_SECRET_KEY },
      body: { message: 'Only message provided' }
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(400);
    const body = res._getParsedBody();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toBeDefined();

    const systemFieldErr = body.details.find((d: any) => d.field === 'system');
    expect(systemFieldErr).toBeDefined();
  });

  it('should sanitize HTML tags and control chars before passing payload to LLM handler', async () => {
    const fetchSpy = globalThis.fetch as any;

    const { req, res } = createMockReqRes({
      headers: { 'x-api-key': TEST_SECRET_KEY },
      body: HTML_AND_CONTROL_CHARS_PAYLOAD
    });

    await handler(req, res);

    expect(res._getStatus()).toBe(200);
    expect(fetchSpy).toHaveBeenCalled();

    // Check payload sent to OpenAI fetch
    const fetchArgs = fetchSpy.mock.calls[0];
    const openAiPayload = JSON.parse(fetchArgs[1].body);

    const sanitizedSystemText = openAiPayload.input[0].content[0].text;
    expect(sanitizedSystemText).not.toContain('<script>');
    expect(sanitizedSystemText).not.toContain('</script>');
    expect(sanitizedSystemText).toContain('alert("xss") System Prompt');
  });
});
