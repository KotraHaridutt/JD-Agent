import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkRateLimit, extractClientIp } from '../../api/middleware/rateLimit';

describe('rateLimit Middleware Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.SKIP_RATE_LIMIT;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('extractClientIp', () => {
    it('should extract first IP from single x-forwarded-for header', () => {
      const req = { headers: { 'x-forwarded-for': '198.51.100.1' } };
      expect(extractClientIp(req)).toBe('198.51.100.1');
    });

    it('should extract first IP from comma-separated x-forwarded-for header', () => {
      const req = { headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' } };
      expect(extractClientIp(req)).toBe('203.0.113.195');
    });

    it('should extract IP from x-real-ip when x-forwarded-for is missing', () => {
      const req = { headers: { 'x-real-ip': '192.0.2.45' } };
      expect(extractClientIp(req)).toBe('192.0.2.45');
    });

    it('should fallback to socket.remoteAddress if headers are missing', () => {
      const req = { headers: {}, socket: { remoteAddress: '10.0.0.5' } };
      expect(extractClientIp(req)).toBe('10.0.0.5');
    });

    it('should return 127.0.0.1 if no headers or socket address are found', () => {
      const req = { headers: {} };
      expect(extractClientIp(req)).toBe('127.0.0.1');
    });
  });

  describe('checkRateLimit Fail-Open & Bypass', () => {
    it('should return success: true when SKIP_RATE_LIMIT=true', async () => {
      process.env.SKIP_RATE_LIMIT = 'true';

      const result = await checkRateLimit('127.0.0.1');
      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(10);
    });

    it('should fail open (success: true) and log warning when Upstash credentials are missing', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await checkRateLimit('192.168.1.1');
      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RateLimit Warning] Upstash Redis credentials not configured')
      );
    });

    it('should fail open (success: true) and log warning when Redis throws error', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const faultyLimiter = {
        limit: vi.fn().mockRejectedValue(new Error('Redis Connection Refused'))
      };

      const result = await checkRateLimit('192.168.1.1', faultyLimiter);
      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RateLimit Warning] Upstash Redis rate limit check failed'),
        expect.any(Error)
      );
    });
  });
});
