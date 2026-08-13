import { z } from 'zod';
import { ResumeProfileSchema } from './resumeProfile.js';
import { CompanyReportSchema } from './companyReport.js';
import { SynthesisReportSchema } from './synthesisReport.js';

const defaultResumeProfile = {
  languages: [],
  frameworks: [],
  databases: [],
  infra: [],
  domains: [],
  projects: [],
  depth_signals: {}
};

const defaultSynthesisReport = {
  priority_gaps: [],
  company_ranking: [],
  today_action: {
    what: 'Review the strongest cross-company gap',
    resource: '',
    time: '',
    why: '',
    helps_for: []
  }
};

export const JobAgentResultSchema = z.object({
  profile: ResumeProfileSchema.catch(defaultResumeProfile).default(defaultResumeProfile),
  jdReports: z.array(CompanyReportSchema).catch([]).default([]),
  synthesis: SynthesisReportSchema.catch(defaultSynthesisReport).default(defaultSynthesisReport)
});

export type JobAgentResult = {
  profile: z.infer<typeof ResumeProfileSchema>;
  jdReports: z.infer<typeof CompanyReportSchema>[];
  synthesis: z.infer<typeof SynthesisReportSchema>;
};
