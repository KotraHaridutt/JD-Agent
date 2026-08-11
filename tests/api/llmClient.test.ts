import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callLLMWithValidation, ValidationExhaustedError } from '../../src/api/llmClient';
import * as geminiModule from '../../src/api/gemini';
import { ResumeProfileSchema, CompanyReportSchema } from '../../src/schemas';
import {
  VALID_LLM_PROFILE_RESPONSE,
  MALFORMED_LLM_PROFILE_RESPONSE,
  VALID_LLM_COMPANY_REPORT_RESPONSE
} from '../fixtures/llmResponseFixtures';

describe('callLLMWithValidation Unit & Integration Tests (src/api/llmClient.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return validated typed data immediately on successful 1st attempt', async () => {
    const callGeminiSpy = vi
      .spyOn(geminiModule, 'callGemini')
      .mockResolvedValue(VALID_LLM_PROFILE_RESPONSE);

    const result = await callLLMWithValidation(
      {
        system: 'System prompt',
        message: 'User message',
        useWebSearch: false
      },
      ResumeProfileSchema
    );

    expect(callGeminiSpy).toHaveBeenCalledTimes(1);
    expect(result.languages).toEqual(['TypeScript', 'Python']);
    expect(result.projects.length).toBe(1);
  });

  it('should retry when 1st attempt fails validation and succeed on 2nd attempt with feedback', async () => {
    const callGeminiSpy = vi
      .spyOn(geminiModule, 'callGemini')
      .mockResolvedValueOnce(MALFORMED_LLM_PROFILE_RESPONSE)
      .mockResolvedValueOnce(VALID_LLM_PROFILE_RESPONSE);

    const result = await callLLMWithValidation(
      {
        system: 'System prompt',
        message: 'User message',
        useWebSearch: true
      },
      ResumeProfileSchema,
      2
    );

    expect(callGeminiSpy).toHaveBeenCalledTimes(2);
    expect(result.languages).toEqual(['TypeScript', 'Python']);

    // Check 1st call arguments: useWebSearch should be true
    expect(callGeminiSpy.mock.calls[0][0].useWebSearch).toBe(true);

    // Check 2nd call arguments: useWebSearch should be false, and message should contain error details
    const secondCallParams = callGeminiSpy.mock.calls[1][0];
    expect(secondCallParams.useWebSearch).toBe(false);
    expect(secondCallParams.message).toContain('Your previous response had validation errors');
  });

  it('should throw ValidationExhaustedError when all 3 attempts fail schema validation', async () => {
    vi.spyOn(geminiModule, 'callGemini').mockResolvedValue(MALFORMED_LLM_PROFILE_RESPONSE);

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

  it('should propagate API/Network errors immediately without retrying schema validation', async () => {
    const callGeminiSpy = vi
      .spyOn(geminiModule, 'callGemini')
      .mockRejectedValue(new Error('Rate limit exceeded (429)'));

    await expect(
      callLLMWithValidation(
        {
          system: 'System prompt',
          message: 'User message'
        },
        CompanyReportSchema,
        2
      )
    ).rejects.toThrow('Rate limit exceeded (429)');

    expect(callGeminiSpy).toHaveBeenCalledTimes(1);
  });
});
