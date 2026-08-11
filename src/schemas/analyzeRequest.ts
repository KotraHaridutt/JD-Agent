import { z } from 'zod';
import { sanitizeString } from '../../api/lib/validation';

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
