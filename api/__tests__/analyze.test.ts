import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler, { analyzeRequest } from '../analyze';
import { createMockRequest, createMockResponse } from '../../src/test/helpers';
import { createOpenAIMock } from '../../src/test/mocks/openai';

describe('api/analyze.ts - handler function', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-server-api-key';
    process.env.OPENAI_API_KEY = 'test-openai-api-key';
    process.env.SKIP_RATE_LIMIT = 'true';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns 200 OK with correlationId for a valid POST request', async () => {
    const mockFetch = createOpenAIMock({
      outputText: JSON.stringify({ message: 'Analysis Complete' })
    });
    vi.stubGlobal('fetch', mockFetch);

    const req = createMockRequest({
      method: 'POST',
      headers: { 'x-api-key': 'test-server-api-key' },
      body: {
        system: 'You are an AI assistant.',
        message: 'Analyze resume'
      }
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-correlation-id']).toBeDefined();
    const json = res._getJsonBody();
    expect(json.message).toBe('Analysis Complete');
    expect(json.correlationId).toBeDefined();
  });

  it('returns 405 Method Not Allowed for non-POST requests', async () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    const json = res._getJsonBody();
    expect(json.error).toBe('Method not allowed');
    expect(json.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('returns 500 SERVER_MISCONFIGURED when server API_KEY is missing', async () => {
    delete process.env.API_KEY;

    const req = createMockRequest({ method: 'POST' });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    const json = res._getJsonBody();
    expect(json.code).toBe('SERVER_MISCONFIGURED');
  });

  it('returns 401 AUTH_INVALID when x-api-key header is missing or incorrect', async () => {
    const req = createMockRequest({
      method: 'POST',
      headers: { 'x-api-key': 'wrong-key' }
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    const json = res._getJsonBody();
    expect(json.code).toBe('AUTH_INVALID');
  });

  it('returns 400 VALIDATION_ERROR when request body schema validation fails', async () => {
    const req = createMockRequest({
      method: 'POST',
      headers: { 'x-api-key': 'test-server-api-key' },
      body: { system: '' } // missing message & empty system
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    const json = res._getJsonBody();
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.details).toBeDefined();
  });
});

describe('api/analyze.ts - analyzeRequest function', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.OPENAI_API_KEY = 'test-openai-api-key';
    process.env.OPENAI_MODEL = 'gpt-4o-mini';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('executes JSON mode request and returns parsed JSON response', async () => {
    const mockFetch = createOpenAIMock({
      outputText: JSON.stringify({ status: 'ok', data: [1, 2, 3] })
    });
    vi.stubGlobal('fetch', mockFetch);

    const body = {
      system: 'System prompt',
      message: 'User message',
      useWebSearch: false
    };

    const result = await analyzeRequest(body);
    expect(result).toEqual({ status: 'ok', data: [1, 2, 3] });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const fetchArgs = mockFetch.mock.calls[0];
    const payload = JSON.parse(fetchArgs[1].body);
    expect(payload.model).toBe('gpt-4o-mini');
    expect(payload.text.format.type).toBe('json_object');
    expect(payload.tools).toBeUndefined();
  });

  it('executes web search mode request with tools payload', async () => {
    const mockFetch = createOpenAIMock({
      outputMessageText: JSON.stringify({ searchResult: 'Found info' })
    });
    vi.stubGlobal('fetch', mockFetch);

    const body = {
      system: 'System prompt',
      message: 'User message',
      useWebSearch: true
    };

    const result = await analyzeRequest(body);
    expect(result).toEqual({ searchResult: 'Found info' });

    const fetchArgs = mockFetch.mock.calls[0];
    const payload = JSON.parse(fetchArgs[1].body);
    expect(payload.tools).toEqual([{ type: 'web_search_preview' }]);
    expect(payload.text).toBeUndefined();
  });

  it('throws error when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const body = { system: 'System', message: 'Message' };
    await expect(analyzeRequest(body)).rejects.toThrow();
  });

  it('propagates OpenAI 401 unauthorized error', async () => {
    const mockFetch = createOpenAIMock({
      status: 401,
      statusText: 'Unauthorized',
      errorText: 'Invalid OpenAI Key'
    });
    vi.stubGlobal('fetch', mockFetch);

    const body = { system: 'System', message: 'Message' };
    await expect(analyzeRequest(body)).rejects.toMatchObject({
      status: 401,
      code: 'OPENAI_API_ERROR'
    });
  });

  it('propagates OpenAI 429 rate limit error', async () => {
    const mockFetch = createOpenAIMock({
      status: 429,
      statusText: 'Rate Limit Exceeded',
      errorText: 'Quota exceeded'
    });
    vi.stubGlobal('fetch', mockFetch);

    const body = { system: 'System', message: 'Message' };
    await expect(analyzeRequest(body)).rejects.toMatchObject({
      status: 429,
      code: 'OPENAI_API_ERROR'
    });
  });

  it('propagates OpenAI 500 server error', async () => {
    const mockFetch = createOpenAIMock({
      status: 500,
      statusText: 'Internal Error',
      errorText: 'OpenAI Server Error'
    });
    vi.stubGlobal('fetch', mockFetch);

    const body = { system: 'System', message: 'Message' };
    await expect(analyzeRequest(body)).rejects.toMatchObject({
      status: 500,
      code: 'OPENAI_API_ERROR'
    });
  });

  it('throws 502 OPENAI_EMPTY_RESPONSE when no text can be extracted', async () => {
    const mockFetch = createOpenAIMock({
      rawResponse: { empty: true }
    });
    vi.stubGlobal('fetch', mockFetch);

    const body = { system: 'System', message: 'Message' };
    await expect(analyzeRequest(body)).rejects.toMatchObject({
      status: 502,
      code: 'OPENAI_EMPTY_RESPONSE'
    });
  });

  it('throws 502 OPENAI_PARSE_ERROR when response text is not valid JSON', async () => {
    const mockFetch = createOpenAIMock({
      outputText: 'This is plain text, not JSON'
    });
    vi.stubGlobal('fetch', mockFetch);

    const body = { system: 'System', message: 'Message' };
    await expect(analyzeRequest(body)).rejects.toMatchObject({
      status: 502,
      code: 'OPENAI_PARSE_ERROR'
    });
  });

  it('strips markdown ```json code fences and parses JSON correctly', async () => {
    const fencedJson = '```json\n{\n  "fenced": true\n}\n```';
    const mockFetch = createOpenAIMock({
      outputText: fencedJson
    });
    vi.stubGlobal('fetch', mockFetch);

    const body = { system: 'System', message: 'Message' };
    const result = await analyzeRequest(body);
    expect(result).toEqual({ fenced: true });
  });

  it('extracts JSON from leading and trailing text using first { and last }', async () => {
    const rawWithText = 'Here is your output: {"success": true} Thank you!';
    const mockFetch = createOpenAIMock({
      outputText: rawWithText
    });
    vi.stubGlobal('fetch', mockFetch);

    const body = { system: 'System', message: 'Message' };
    const result = await analyzeRequest(body);
    expect(result).toEqual({ success: true });
  });
});

describe('api/analyze.ts - extractResponseText & parseJsonResponse fallback paths', () => {
  it('extracts text from nested output message array structure', async () => {
    const mockFetch = createOpenAIMock({
      outputMessageText: '{"nested": true}'
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await analyzeRequest({ system: 'sys', message: 'msg' });
    expect(result).toEqual({ nested: true });
  });

  it('handles custom config override parameter in analyzeRequest', async () => {
    const mockFetch = createOpenAIMock({
      outputText: '{"custom": true}'
    });
    vi.stubGlobal('fetch', mockFetch);

    const customConfig = {
      apiKey: 'override-key',
      model: 'gpt-4-custom'
    };

    const result = await analyzeRequest({ system: 'sys', message: 'msg' }, customConfig);
    expect(result).toEqual({ custom: true });

    const fetchArgs = mockFetch.mock.calls[0];
    const payload = JSON.parse(fetchArgs[1].body);
    expect(payload.model).toBe('gpt-4-custom');
    expect(fetchArgs[1].headers.Authorization).toBe('Bearer override-key');
  });
});
