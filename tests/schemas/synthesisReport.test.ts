import { describe, it, expect } from 'vitest';
import { SynthesisReportSchema } from '../../src/schemas/synthesisReport';
import { VALID_SYNTHESIS_REPORT, MALFORMED_SYNTHESIS_REPORT } from '../fixtures/domainFixtures';

describe('SynthesisReportSchema Unit Tests', () => {
  it('should successfully parse valid SynthesisReport data', () => {
    const result = SynthesisReportSchema.safeParse(VALID_SYNTHESIS_REPORT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority_gaps.length).toBe(1);
      expect(result.data.priority_gaps[0].skill).toBe('System Design');
      expect(result.data.company_ranking[0].fit_label).toBe('APPLY_AFTER_PREP');
      expect(result.data.today_action.what).toBe('Read DDIA Chapter 5 (Replication)');
    }
  });

  it('should apply defaults when given an empty object', () => {
    const result = SynthesisReportSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority_gaps).toEqual([]);
      expect(result.data.company_ranking).toEqual([]);
      expect(result.data.today_action.what).toBe('Review the strongest cross-company gap');
    }
  });

  it('should recover defensively using catch defaults on malformed data', () => {
    const result = SynthesisReportSchema.safeParse(MALFORMED_SYNTHESIS_REPORT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority_gaps).toEqual([]);
      expect(result.data.company_ranking[0].fit_label).toBe('SKIP');
      expect(result.data.today_action.what).toBe('Review the strongest cross-company gap');
    }
  });
});
