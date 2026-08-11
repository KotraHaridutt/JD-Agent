import { z } from 'zod';
import { ResumeProfileSchema } from './resumeProfile';
import { CompanyReportSchema } from './companyReport';
import { SynthesisReportSchema } from './synthesisReport';

export const JobAgentResultSchema = z.object({
  profile: ResumeProfileSchema,
  jdReports: z.array(CompanyReportSchema).catch([]).default([]),
  synthesis: SynthesisReportSchema
});

export type JobAgentResult = z.infer<typeof JobAgentResultSchema>;
