import { describe, it, expect } from 'vitest';
import type {
  ResumeProfile,
  GapInfo,
  CompanyReport,
  PriorityGap,
  CompanyRankingInfo,
  TodayAction,
  SynthesisReport,
  JobAgentResult
} from '../../src/types';
import {
  VALID_RESUME_PROFILE,
  VALID_GAP_INFO,
  VALID_COMPANY_REPORT,
  VALID_SYNTHESIS_REPORT,
  VALID_JOB_AGENT_RESULT
} from '../fixtures/domainFixtures';

describe('Type Compatibility Verification (src/types/index.ts)', () => {
  it('should verify that Zod inferred types match domain objects', () => {
    const profile: ResumeProfile = VALID_RESUME_PROFILE;
    const gap: GapInfo = VALID_GAP_INFO;
    const report: CompanyReport = VALID_COMPANY_REPORT;
    const synthesis: SynthesisReport = VALID_SYNTHESIS_REPORT;
    const result: JobAgentResult = VALID_JOB_AGENT_RESULT;

    expect(profile.languages).toContain('TypeScript');
    expect(gap.gap_type).toBe('PARTIAL_MATCH');
    expect(report.company).toBe('NVIDIA');
    expect(synthesis.today_action.what).toBeDefined();
    expect(result.jdReports.length).toBe(1);
  });

  it('should verify CompanyRankingInfo fit_label supports FitLabel enum values', () => {
    const rank: CompanyRankingInfo = {
      company: 'Google',
      fit_label: 'APPLY_NOW',
      reason: 'Strong match across all core requirements',
      apply_after: ''
    };

    expect(rank.fit_label).toBe('APPLY_NOW');
  });
});
