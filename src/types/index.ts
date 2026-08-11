import type { z } from 'zod';
import type {
  ResumeProfileSchema,
  ProjectSchema,
  GapInfoSchema,
  GapTypeEnum,
  CompanyReportSchema,
  FitLabelEnum,
  PriorityGapSchema,
  CompanyRankingInfoSchema,
  TodayActionSchema,
  SynthesisReportSchema,
  JobAgentResultSchema
} from '../schemas';

export type ResumeProfile = z.infer<typeof ResumeProfileSchema>;
export type Project = z.infer<typeof ProjectSchema>;

export type GapInfo = z.infer<typeof GapInfoSchema>;
export type GapType = z.infer<typeof GapTypeEnum>;

export type CompanyReport = z.infer<typeof CompanyReportSchema>;
export type FitLabel = z.infer<typeof FitLabelEnum>;

export type PriorityGap = z.infer<typeof PriorityGapSchema>;
export type CompanyRankingInfo = z.infer<typeof CompanyRankingInfoSchema>;
export type TodayAction = z.infer<typeof TodayActionSchema>;
export type SynthesisReport = z.infer<typeof SynthesisReportSchema>;

export type JobAgentResult = z.infer<typeof JobAgentResultSchema>;
