import { describe, it, expect } from 'vitest';
import { JobAgentResultSchema } from '../../src/schemas/jobAgentResult';
import { VALID_JOB_AGENT_RESULT } from '../fixtures/domainFixtures';

describe('JobAgentResultSchema Unit Tests', () => {
  it('should successfully validate a complete JobAgentResult composite object', () => {
    const result = JobAgentResultSchema.safeParse(VALID_JOB_AGENT_RESULT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profile.languages).toContain('TypeScript');
      expect(result.data.jdReports.length).toBe(1);
      expect(result.data.jdReports[0].company).toBe('NVIDIA');
      expect(result.data.synthesis.priority_gaps.length).toBe(1);
    }
  });

  it('should default missing jdReports to empty array and construct valid profile & synthesis defaults when empty', () => {
    const result = JobAgentResultSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profile.languages).toEqual([]);
      expect(result.data.jdReports).toEqual([]);
      expect(result.data.synthesis.today_action.what).toBe('Review the strongest cross-company gap');
    }
  });
});
