import { describe, it, expect } from 'vitest';
import { AnalyzeRequestSchema } from '../../src/schemas/analyzeRequest';

describe('AnalyzeRequestSchema Unit Tests (src/schemas/analyzeRequest.ts)', () => {
  it('should validate a correct payload and set default useWebSearch to false', () => {
    const payload = {
      system: 'Valid system prompt',
      message: 'Valid job description message'
    };
    const result = AnalyzeRequestSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.system).toBe('Valid system prompt');
      expect(result.data.message).toBe('Valid job description message');
      expect(result.data.useWebSearch).toBe(false);
    }
  });

  it('should preserve useWebSearch = true when explicitly provided', () => {
    const payload = {
      system: 'Valid system prompt',
      message: 'Valid job description message',
      useWebSearch: true
    };
    const result = AnalyzeRequestSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.useWebSearch).toBe(true);
    }
  });

  it('should reject requests with system prompt exceeding 10,000 characters', () => {
    const payload = {
      system: 's'.repeat(10001),
      message: 'Valid message'
    };
    const result = AnalyzeRequestSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('system'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('10,000 characters');
    }
  });

  it('should reject requests with message exceeding 100,000 characters', () => {
    const payload = {
      system: 'Valid system',
      message: 'm'.repeat(100001)
    };
    const result = AnalyzeRequestSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('message'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('100,000 characters');
    }
  });
});
