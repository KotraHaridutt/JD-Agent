import { z } from 'zod';

/**
 * Sanitizes input strings:
 * 1. Strips HTML tags (e.g. <script>, <div>, etc.)
 * 2. Removes ASCII control characters (preserving \n, \r, \t)
 * 3. Trims leading and trailing whitespace
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Strip control characters (preserve \n, \r, \t)
    .trim(); // Trim whitespace
}

export const AnalyzeRequestSchema = z.object({
  system: z
    .string({ required_error: 'system prompt is required' })
    .transform(sanitizeString)
    .pipe(
      z
        .string()
        .min(1, 'system prompt cannot be empty')
        .max(10000, 'system prompt cannot exceed 10,000 characters')
    ),

  message: z
    .string({ required_error: 'message is required' })
    .transform(sanitizeString)
    .pipe(
      z
        .string()
        .min(1, 'message cannot be empty')
        .max(100000, 'message cannot exceed 100,000 characters')
    ),

  useWebSearch: z.boolean().optional().default(false)
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export interface ValidationErrorIssue {
  field: string;
  message: string;
}

export type ValidationResult =
  | { success: true; data: AnalyzeRequest }
  | { success: false; errors: ValidationErrorIssue[] };

/**
 * Validates and sanitizes an incoming request body using AnalyzeRequestSchema.
 */
export function validateAnalyzeRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return {
      success: false,
      errors: [{ field: 'body', message: 'Request body must be a valid JSON object' }]
    };
  }

  const parseResult = AnalyzeRequestSchema.safeParse(body);

  if (!parseResult.success) {
    const errors: ValidationErrorIssue[] = parseResult.error.issues.map((issue) => {
      const fieldPath = issue.path.join('.') || 'body';
      return {
        field: fieldPath,
        message: issue.message
      };
    });

    return { success: false, errors };
  }

  return { success: true, data: parseResult.data };
}
