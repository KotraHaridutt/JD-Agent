import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit } from '../../api/middleware/rateLimit';
import { MockUpstashRatelimit } from '../fixtures/redis.fixtures';

describe('Rate Limiter System Integration Tests (Mock Redis)', () => {
  let mockRatelimit: MockUpstashRatelimit;

  beforeEach(() => {
    mockRatelimit = new MockUpstashRatelimit({ limitMax: 10, windowMs: 60000 });
  });

  it('should allow requests 1 through 10 and decrement remaining counter', async () => {
    const testIp = '203.0.113.50';

    for (let i = 1; i <= 10; i++) {
      const result = await checkRateLimit(testIp, mockRatelimit);
      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(10 - i);
    }
  });

  it('should reject 11th request when limit is exceeded (success: false)', async () => {
    const testIp = '203.0.113.50';

    // Exhaust limit (10 requests)
    for (let i = 0; i < 10; i++) {
      await checkRateLimit(testIp, mockRatelimit);
    }

    // 11th request
    const eleventhResult = await checkRateLimit(testIp, mockRatelimit);
    expect(eleventhResult.success).toBe(false);
    expect(eleventhResult.remaining).toBe(0);
    expect(eleventhResult.limit).toBe(10);
  });

  it('should track rate limits independently per IP address', async () => {
    const ipA = '198.51.100.10';
    const ipB = '198.51.100.20';

    // Exhaust limit for ipA
    for (let i = 0; i < 10; i++) {
      await checkRateLimit(ipA, mockRatelimit);
    }

    // ipA should be blocked
    const resultIpA = await checkRateLimit(ipA, mockRatelimit);
    expect(resultIpA.success).toBe(false);

    // ipB should still be allowed with full bucket
    const resultIpB = await checkRateLimit(ipB, mockRatelimit);
    expect(resultIpB.success).toBe(true);
    expect(resultIpB.remaining).toBe(9);
  });
});
