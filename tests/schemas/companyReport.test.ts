import { describe, it, expect } from 'vitest';
import { CompanyReportSchema } from '../../src/schemas/companyReport';
import { VALID_COMPANY_REPORT, MALFORMED_COMPANY_REPORT } from '../fixtures/domainFixtures';

describe('CompanyReportSchema Unit Tests', () => {
  it('should successfully parse valid CompanyReport data', () => {
    const result = CompanyReportSchema.safeParse(VALID_COMPANY_REPORT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.company).toBe('NVIDIA');
      expect(result.data.fit_label).toBe('APPLY_AFTER_PREP');
      expect(result.data.match_score).toBe(8);
      expect(result.data.gaps.length).toBe(1);
      expect(result.data.gaps[0].gap_type).toBe('PARTIAL_MATCH');
    }
  });

  it('should coerce string numbers into match_score and default fit_label on invalid enum', () => {
    const result = CompanyReportSchema.safeParse(MALFORMED_COMPANY_REPORT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.company).toBe('Unknown Company');
      expect(result.data.fit_label).toBe('SKIP');
      expect(result.data.match_score).toBe(8.5);
      expect(result.data.gaps).toEqual([]);
    }
  });

  it('should apply default values when given an empty object', () => {
    const result = CompanyReportSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.company).toBe('Unknown Company');
      expect(result.data.jd_url).toBe('simulated');
      expect(result.data.fit_label).toBe('SKIP');
      expect(result.data.match_score).toBe(0);
      expect(result.data.strengths).toEqual([]);
      expect(result.data.gaps).toEqual([]);
      expect(result.data.top_3_actions).toEqual([]);
    }
  });
});
