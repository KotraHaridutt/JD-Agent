export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

let ratelimitInstance: any = null;

function getRatelimitInstance(): any {
  if (ratelimitInstance) {
    return ratelimitInstance;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  try {
    // Dynamic import pattern or require fallback for node runtime
    const { Redis } = require('@upstash/redis');
    const { Ratelimit } = require('@upstash/ratelimit');

    const redis = new Redis({ url, token });
    ratelimitInstance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
      prefix: 'jd_agent_ratelimit'
    });

    return ratelimitInstance;
  } catch (error) {
    console.warn('[RateLimit Warning] Failed to initialize Upstash Redis instance:', error);
    return null;
  }
}

/**
 * Extracts client IP address from request headers or socket details.
 */
export function extractClientIp(req: any): string {
  const forwardedFor =
    typeof req?.headers?.['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for']
      : typeof req?.headers?.get === 'function'
      ? req.headers.get('x-forwarded-for')
      : null;

  if (forwardedFor) {
    const ips = forwardedFor.split(',').map((ip: string) => ip.trim());
    if (ips[0]) {
      return ips[0];
    }
  }

  const realIp =
    typeof req?.headers?.['x-real-ip'] === 'string'
      ? req.headers['x-real-ip']
      : typeof req?.headers?.get === 'function'
      ? req.headers.get('x-real-ip')
      : null;

  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  const socketIp = req?.socket?.remoteAddress || req?.connection?.remoteAddress;
  if (socketIp && typeof socketIp === 'string') {
    return socketIp;
  }

  return '127.0.0.1';
}

/**
 * Checks IP rate limit using Upstash Redis sliding window algorithm (10 req/60s).
 * Fails open if credentials missing or Redis unavailable.
 */
export async function checkRateLimit(
  identifier: string,
  customRatelimit?: any
): Promise<RateLimitResult> {
  if (process.env.SKIP_RATE_LIMIT === 'true' && !customRatelimit) {
    return {
      success: true,
      limit: 10,
      remaining: 10,
      reset: Date.now() + 60000
    };
  }

  const limiter = customRatelimit ?? getRatelimitInstance();

  if (!limiter) {
    console.warn('[RateLimit Warning] Upstash Redis credentials not configured or unavailable. Failing open (allowing request).');
    return {
      success: true,
      limit: 10,
      remaining: 10,
      reset: Date.now() + 60000
    };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      success: Boolean(result.success),
      limit: typeof result.limit === 'number' ? result.limit : 10,
      remaining: typeof result.remaining === 'number' ? result.remaining : 0,
      reset: typeof result.reset === 'number' ? result.reset : Date.now() + 60000
    };
  } catch (error) {
    console.warn('[RateLimit Warning] Upstash Redis rate limit check failed. Failing open (allowing request):', error);
    return {
      success: true,
      limit: 10,
      remaining: 10,
      reset: Date.now() + 60000
    };
  }
}
