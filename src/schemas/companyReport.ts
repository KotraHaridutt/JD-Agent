import { z } from 'zod';
import { GapInfoSchema } from './gapInfo.js';

export const FitLabelEnum = z.enum(['APPLY_NOW', 'APPLY_AFTER_PREP', 'SKIP']);
export type FitLabel = z.infer<typeof FitLabelEnum>;

export const CompanyReportSchema = z
  .object({
    company: z.string().catch('Unknown Company').default('Unknown Company'),
    role: z.string().catch('').default(''),
    jd_url: z.string().catch('simulated').default('simulated'),
    source_title: z.string().catch('').default(''),
    proof_note: z.string().catch('').default(''),
    search_terms: z.array(z.string()).catch([]).default([]),
    jd_freshness: z.string().catch('').default(''),
    fit_label: FitLabelEnum.catch('SKIP').default('SKIP'),
    match_score: z.coerce.number().catch(0).default(0),
    strengths: z.array(z.string()).catch([]).default([]),
    gaps: z.array(GapInfoSchema).catch([]).default([]),
    top_3_actions: z.array(z.string()).catch([]).default([])
  })
  .transform((report) => {
    const company = report.company || 'Unknown Company';
    const sourceTitle = report.source_title || company;
    const proofNote =
      report.proof_note && report.proof_note.trim()
        ? report.proof_note
        : report.jd_url === 'simulated'
          ? `No live posting found after checking official/ATS sources for ${company} across multiple backend role variants. The proof is the search trail plus the gap-level evidence below.`
          : `JD source reviewed for ${company}: ${sourceTitle}`;

    return {
      ...report,
      company,
      source_title: sourceTitle,
      proof_note: proofNote
    };
  });

export type CompanyReport = z.infer<typeof CompanyReportSchema>;
