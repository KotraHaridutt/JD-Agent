import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { callGemini } from '../../src/api/gemini';

describe('callGemini Frontend API Client Tests', () => {
  const TEST_VITE_KEY = 'test_vite_api_key_777';

  beforeEach(() => {
    vi.stubEnv('VITE_API_KEY', TEST_VITE_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('should include X-API-Key header in fetch request when VITE_API_KEY is configured', async () => {
    const mockResponse = { result: 'success', summary: 'Job description analyzed' };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await callGemini({
      system: 'Test system prompt',
      message: 'Test job description message'
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/analyze');
    expect(options.headers['X-API-Key']).toBe(TEST_VITE_KEY);
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(result).toEqual(mockResponse);
  });

  it('should throw an error before fetch call if VITE_API_KEY is missing or empty', async () => {
    vi.stubEnv('VITE_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      callGemini({
        system: 'Test system prompt',
        message: 'Test message'
      })
    ).rejects.toThrow('VITE_API_KEY environment variable is not configured');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should throw specific authentication error when backend returns 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => JSON.stringify({ error: 'Invalid API Key', code: 'AUTH_INVALID' })
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      callGemini({
        system: 'Test system',
        message: 'Test message'
      })
    ).rejects.toThrow('Authentication failed (401)');
  });

  it('should throw specific rate-limit error when backend returns 429', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' })
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      callGemini({
        system: 'Test system',
        message: 'Test message'
      })
    ).rejects.toThrow('Rate limit exceeded (429)');
  });
});
