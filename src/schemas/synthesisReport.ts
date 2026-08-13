import { z } from 'zod';
import { FitLabelEnum } from './companyReport.js';

export const PriorityGapSchema = z.object({
  skill: z.string().catch('').default(''),
  companies_needing: z.array(z.string()).catch([]).default([]),
  priority_rank: z.coerce.number().catch(0).default(0),
  action: z.string().catch('').default(''),
  resource: z.string().catch('').default(''),
  time_estimate: z.string().catch('').default('')
});

export type PriorityGap = z.infer<typeof PriorityGapSchema>;

export const CompanyRankingInfoSchema = z.object({
  company: z.string().catch('Unknown Company').default('Unknown Company'),
  fit_label: FitLabelEnum.catch('SKIP').default('SKIP'),
  reason: z.string().catch('').default(''),
  apply_after: z.string().catch('').default('')
});

export type CompanyRankingInfo = z.infer<typeof CompanyRankingInfoSchema>;

export const TodayActionSchema = z.object({
  what: z
    .string()
    .catch('Review the strongest cross-company gap')
    .default('Review the strongest cross-company gap'),
  resource: z.string().catch('').default(''),
  time: z.string().catch('').default(''),
  why: z.string().catch('').default(''),
  helps_for: z.array(z.string()).catch([]).default([])
});

export type TodayAction = z.infer<typeof TodayActionSchema>;

const defaultTodayAction = {
  what: 'Review the strongest cross-company gap',
  resource: '',
  time: '',
  why: '',
  helps_for: []
};

export const SynthesisReportSchema = z.object({
  priority_gaps: z.array(PriorityGapSchema).catch([]).default([]),
  company_ranking: z.array(CompanyRankingInfoSchema).catch([]).default([]),
  today_action: TodayActionSchema.catch(defaultTodayAction).default(defaultTodayAction)
});

export type SynthesisReport = z.infer<typeof SynthesisReportSchema>;
