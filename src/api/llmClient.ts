import { ZodType } from 'zod';

export interface CallLLMParams {
  system: string;
  message: string;
  useWebSearch?: boolean;
}

export type LLMCallParams = CallLLMParams;

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
 * Low-level HTTP client function that sends requests to the serverless analysis endpoint /api/analyze.
 */
export async function callLLM({ system, message, useWebSearch = false }: CallLLMParams): Promise<any> {
  const apiKey = import.meta.env.VITE_API_KEY;

  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    const configError = new Error(
      'VITE_API_KEY environment variable is not configured. Please set VITE_API_KEY in your .env file.'
    );
    console.error(configError.message);
    throw configError;
  }

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey.trim()
      },
      body: JSON.stringify({ system, message, useWebSearch })
    });

    if (!response.ok) {
      const errorData = await response.text();

      if (response.status === 401) {
        throw new Error(
          `Authentication failed (401). Please check your VITE_API_KEY configuration - ${errorData}`
        );
      }

      if (response.status === 429) {
        throw new Error(
          `Rate limit exceeded (429). Please wait a moment before trying again - ${errorData}`
        );
      }

      throw new Error(`Analysis API error: ${response.status} ${response.statusText} - ${errorData}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling analysis API:', error);
    throw error;
  }
}

/**
 * Executes an LLM API call via callLLM with Zod schema validation and a self-correcting retry loop.
 * On validation failure, appends Zod error details to the prompt as feedback context (up to maxRetries).
 */
export async function callLLMWithValidation<T>(
  params: CallLLMParams,
  schema: ZodType<T, any, any>,
  maxRetries: number = 2
): Promise<T> {
  let currentMessage = params.message;
  let lastRawResponse: unknown = null;
  let lastErrors: string[] = [];

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const isFirstAttempt = attempt === 1;
    const useWebSearch = isFirstAttempt ? (params.useWebSearch ?? false) : false;

    try {
      const response = await callLLM({
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
