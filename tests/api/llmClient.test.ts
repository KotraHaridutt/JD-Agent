import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callLLM, callLLMWithValidation, ValidationExhaustedError } from '../../src/api/llmClient';
import { ResumeProfileSchema, CompanyReportSchema } from '../../src/schemas';
import {
  VALID_LLM_PROFILE_RESPONSE,
  MALFORMED_LLM_PROFILE_RESPONSE,
  VALID_LLM_COMPANY_REPORT_RESPONSE
} from '../fixtures/llmResponseFixtures';

describe('llmClient Unit & Integration Tests (src/api/llmClient.ts)', () => {
  const originalEnv = import.meta.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    import.meta.env.VITE_API_KEY = 'test_vite_api_key';
  });

  afterEach(() => {
    import.meta.env.VITE_API_KEY = originalEnv.VITE_API_KEY;
    vi.restoreAllMocks();
  });

  describe('callLLM low-level fetch client', () => {
    it('should send POST request with X-API-Key header and return parsed JSON', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => VALID_LLM_COMPANY_REPORT_RESPONSE
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await callLLM({
        system: 'System prompt',
        message: 'Job description message',
        useWebSearch: true
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/analyze');
      expect(options.headers['X-API-Key']).toBe('test_vite_api_key');
      expect(JSON.parse(options.body)).toEqual({
        system: 'System prompt',
        message: 'Job description message',
        useWebSearch: true
      });
      expect(result.company).toBe('Google');
    });

    it('should throw error when 401 Unauthorized is returned', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: async () => 'Invalid API key'
        })
      );

      await expect(
        callLLM({ system: 'sys', message: 'msg' })
      ).rejects.toThrow('Authentication failed (401)');
    });
  });

  describe('callLLMWithValidation wrapper client', () => {
    it('should return validated typed data immediately on successful 1st attempt', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => VALID_LLM_PROFILE_RESPONSE
        })
      );

      const result = await callLLMWithValidation(
        {
          system: 'System prompt',
          message: 'User message',
          useWebSearch: false
        },
        ResumeProfileSchema
      );

      expect(result.languages).toEqual(['TypeScript', 'Python']);
      expect(result.projects.length).toBe(1);
    });

    it('should retry when 1st attempt fails validation and succeed on 2nd attempt with feedback', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MALFORMED_LLM_PROFILE_RESPONSE
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => VALID_LLM_PROFILE_RESPONSE
        });
      vi.stubGlobal('fetch', mockFetch);

      const result = await callLLMWithValidation(
        {
          system: 'System prompt',
          message: 'User message',
          useWebSearch: true
        },
        ResumeProfileSchema,
        2
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.languages).toEqual(['TypeScript', 'Python']);

      const firstCallBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(firstCallBody.useWebSearch).toBe(true);

      const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(secondCallBody.useWebSearch).toBe(false);
      expect(secondCallBody.message).toContain('Your previous response had validation errors');
    });

    it('should throw ValidationExhaustedError when all 3 attempts fail schema validation', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => MALFORMED_LLM_PROFILE_RESPONSE
        })
      );

      await expect(
        callLLMWithValidation(
          {
            system: 'System prompt',
            message: 'User message'
          },
          ResumeProfileSchema,
          2
        )
      ).rejects.toThrow(ValidationExhaustedError);
    });
  });
});
