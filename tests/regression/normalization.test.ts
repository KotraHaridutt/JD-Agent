import { describe, it, expect } from 'vitest';
import {
  ResumeProfileSchema,
  CompanyReportSchema,
  SynthesisReportSchema,
  JobAgentResultSchema
} from '../../src/schemas';
import {
  VALID_RESUME_PROFILE,
  VALID_COMPANY_REPORT,
  VALID_SYNTHESIS_REPORT,
  VALID_JOB_AGENT_RESULT
} from '../fixtures/domainFixtures';

describe('Zod Schema Pipeline Regression Tests (tests/regression/normalization.test.ts)', () => {
  it('should generate simulated proof_note fallback when proof_note is empty and jd_url is simulated', () => {
    const rawReport = {
      company: 'NVIDIA',
      role: 'Software Engineer',
      jd_url: 'simulated',
      proof_note: ''
    };

    const parsed = CompanyReportSchema.parse(rawReport);
    expect(parsed.company).toBe('NVIDIA');
    expect(parsed.jd_url).toBe('simulated');
    expect(parsed.proof_note).toContain(
      'No live posting found after checking official/ATS sources for NVIDIA'
    );
  });

  it('should generate live JD proof_note fallback when proof_note is empty and jd_url is live', () => {
    const rawReport = {
      company: 'Stripe',
      role: 'Backend Engineer',
      jd_url: 'https://stripe.com/jobs/123',
      source_title: 'Stripe Careers',
      proof_note: ''
    };

    const parsed = CompanyReportSchema.parse(rawReport);
    expect(parsed.company).toBe('Stripe');
    expect(parsed.jd_url).toBe('https://stripe.com/jobs/123');
    expect(parsed.proof_note).toBe('JD source reviewed for Stripe: Stripe Careers');
  });

  it('should preserve custom proof_note when explicitly provided', () => {
    const rawReport = {
      company: 'Google',
      role: 'SWE',
      jd_url: 'simulated',
      proof_note: 'Custom verified proof note'
    };

    const parsed = CompanyReportSchema.parse(rawReport);
    expect(parsed.proof_note).toBe('Custom verified proof note');
  });

  it('should validate complete ResumeProfile structure cleanly', () => {
    const parsed = ResumeProfileSchema.parse(VALID_RESUME_PROFILE);
    expect(parsed.languages).toEqual(['TypeScript', 'Python', 'Go']);
    expect(parsed.projects.length).toBe(1);
  });

  it('should validate complete SynthesisReport structure cleanly', () => {
    const parsed = SynthesisReportSchema.parse(VALID_SYNTHESIS_REPORT);
    expect(parsed.priority_gaps.length).toBe(1);
    expect(parsed.company_ranking[0].fit_label).toBe('APPLY_AFTER_PREP');
    expect(parsed.today_action.what).toBeDefined();
  });

  it('should validate composite JobAgentResult structure cleanly', () => {
    const parsed = JobAgentResultSchema.parse(VALID_JOB_AGENT_RESULT);
    expect(parsed.profile.languages).toContain('TypeScript');
    expect(parsed.jdReports.length).toBe(1);
    expect(parsed.synthesis.today_action.what).toBeDefined();
  });
});
