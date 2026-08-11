import { describe, it, expect } from 'vitest';
import { GapInfoSchema } from '../../src/schemas/gapInfo';
import { VALID_GAP_INFO, MALFORMED_GAP_INFO } from '../fixtures/domainFixtures';

describe('GapInfoSchema Unit Tests', () => {
  it('should successfully parse valid GapInfo data', () => {
    const result = GapInfoSchema.safeParse(VALID_GAP_INFO);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gap_type).toBe('PARTIAL_MATCH');
      expect(result.data.jd_says).toBe('5+ years Node.js microservices experience');
      expect(result.data.bridge).toBe('Scale up event-driven architecture experience');
    }
  });

  it('should default missing fields to empty strings and gap_type to REAL_GAP', () => {
    const result = GapInfoSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jd_says).toBe('');
      expect(result.data.gap_type).toBe('REAL_GAP');
    }
  });

  it('should fall back defensively on invalid enum values and wrong field types', () => {
    const result = GapInfoSchema.safeParse(MALFORMED_GAP_INFO);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gap_type).toBe('REAL_GAP');
      expect(result.data.jd_says).toBe('');
    }
  });
});
