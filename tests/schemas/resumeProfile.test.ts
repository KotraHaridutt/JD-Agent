import { describe, it, expect } from 'vitest';
import { ResumeProfileSchema } from '../../src/schemas/resumeProfile';
import { VALID_RESUME_PROFILE, MALFORMED_RESUME_PROFILE } from '../fixtures/domainFixtures';

describe('ResumeProfileSchema Unit Tests', () => {
  it('should successfully parse a valid resume profile', () => {
    const result = ResumeProfileSchema.safeParse(VALID_RESUME_PROFILE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.languages).toEqual(['TypeScript', 'Python', 'Go']);
      expect(result.data.projects.length).toBe(1);
      expect(result.data.projects[0].name).toBe('JD-Agent');
      expect(result.data.depth_signals.TypeScript).toBe('5 years production experience');
    }
  });

  it('should apply defaults when optional/missing fields are omitted', () => {
    const result = ResumeProfileSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.languages).toEqual([]);
      expect(result.data.frameworks).toEqual([]);
      expect(result.data.databases).toEqual([]);
      expect(result.data.infra).toEqual([]);
      expect(result.data.domains).toEqual([]);
      expect(result.data.projects).toEqual([]);
      expect(result.data.depth_signals).toEqual({});
    }
  });

  it('should recover defensively using catch defaults when malformed fields are passed', () => {
    const result = ResumeProfileSchema.safeParse(MALFORMED_RESUME_PROFILE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.languages).toEqual([]);
      expect(result.data.projects).toEqual([]);
      expect(result.data.depth_signals).toEqual({});
    }
  });
});
