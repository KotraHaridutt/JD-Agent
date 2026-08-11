import { z } from 'zod';

export const GapTypeEnum = z.enum(['STRONG_MATCH', 'PARTIAL_MATCH', 'REAL_GAP']);
export type GapType = z.infer<typeof GapTypeEnum>;

export const GapInfoSchema = z.object({
  jd_says: z.string().catch('').default(''),
  jd_means: z.string().catch('').default(''),
  candidate_has: z.string().catch('').default(''),
  gap_type: GapTypeEnum.catch('REAL_GAP').default('REAL_GAP'),
  bridge: z.string().catch('').default(''),
  time_estimate: z.string().catch('').default(''),
  resource: z.string().catch('').default('')
});

export type GapInfo = z.infer<typeof GapInfoSchema>;
