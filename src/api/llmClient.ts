import { ZodType } from 'zod';
import { callGemini } from './gemini';

export interface LLMCallParams {
  system: string;
  message: string;
  useWebSearch?: boolean;
}

export class ValidationExhaustedError extends Error {
  public attempts: number;
  public lastErrors: string[];
  public rawResponse: unknown;

  constructor(attempts: number, lastErrors: string[], rawResponse: unknown) {
    super(`Validation failed after ${attempts} attempts: ${lastErrors.join('; ')}`);
    this.name = 'ValidationExhaustedError';
    this.attempts = attempts;
    this.lastErrors = lastErrors;
    this.rawResponse = rawResponse;
  }
}

/**
 * Executes an LLM API call via callGemini with Zod schema validation and a self-correcting retry loop.
 * On validation failure, appends Zod error details to the prompt as feedback context (up to maxRetries).
 */
export async function callLLMWithValidation<T>(
  params: LLMCallParams,
  schema: ZodType<T>,
  maxRetries: number = 2
): Promise<T> {
  let currentMessage = params.message;
  let lastRawResponse: unknown = null;
  let lastErrors: string[] = [];

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const isFirstAttempt = attempt === 1;
    const useWebSearch = isFirstAttempt ? (params.useWebSearch ?? false) : false;

    try {
      const response = await callGemini({
        system: params.system,
        message: currentMessage,
        useWebSearch
      });

      lastRawResponse = response;
      const parseResult = schema.safeParse(response);

      if (parseResult.success) {
        return parseResult.data;
      }

      lastErrors = parseResult.error.issues.map(
        (issue) => `Field ${issue.path.join('.') || 'root'}: ${issue.message}`
      );

      console.error(
        `[callLLMWithValidation] Attempt ${attempt}/${maxRetries + 1} failed validation (${lastErrors.length} errors):`,
        lastErrors
      );

      if (attempt <= maxRetries) {
        const errorDetails = lastErrors.slice(0, 5).join('\n- ');
        currentMessage = `${params.message}\n\nYour previous response had validation errors:\n- ${errorDetails}\nPlease fix these issues and return valid JSON.`;
      }
    } catch (err: unknown) {
      console.error(`[callLLMWithValidation] Attempt ${attempt} failed with API error:`, err);
      throw err;
    }
  }

  throw new ValidationExhaustedError(maxRetries + 1, lastErrors, lastRawResponse);
}
