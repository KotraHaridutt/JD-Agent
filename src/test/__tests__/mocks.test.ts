import { describe, it, expect, beforeEach } from 'vitest';
import { MockRedisClient } from '../mocks/redis';
import { createOpenAIMock } from '../mocks/openai';
import { createMockRequest, createMockResponse } from '../helpers';
import { VALID_RESUME_PROFILE, MINIMAL_RESUME_PROFILE, MALFORMED_RESUME_PROFILE } from '../fixtures/resume-profile';
import { VALID_COMPANY_REPORT, SIMULATED_COMPANY_REPORT, MALFORMED_COMPANY_REPORT } from '../fixtures/company-report';
import { VALID_SYNTHESIS_REPORT, MALFORMED_SYNTHESIS_REPORT } from '../fixtures/synthesis-report';

describe('MockRedisClient', () => {
  let redis: MockRedisClient;

  beforeEach(() => {
    redis = new MockRedisClient();
  });

  it('stores and retrieves string values', async () => {
    await redis.set('key1', 'value1');
    const val = await redis.get('key1');
    expect(val).toBe('value1');
  });

  it('returns null for non-existent keys', async () => {
    const val = await redis.get('nonexistent');
    expect(val).toBeNull();
  });

  it('increments numeric values and initializes non-existent keys to 1', async () => {
    const val1 = await redis.incr('counter');
    expect(val1).toBe(1);

    const val2 = await redis.incr('counter');
    expect(val2).toBe(2);
  });

  it('deletes keys correctly', async () => {
    await redis.set('keyToDelete', 'val');
    const deletedCount = await redis.del('keyToDelete');
    expect(deletedCount).toBe(1);

    const val = await redis.get('keyToDelete');
    expect(val).toBeNull();
  });

  it('clears all data on reset', async () => {
    await redis.set('k1', 'v1');
    await redis.set('k2', 'v2');
    redis.reset();

    expect(await redis.get('k1')).toBeNull();
    expect(await redis.get('k2')).toBeNull();
  });
});

describe('createOpenAIMock', () => {
  it('intercepts fetch calls to OpenAI API returning output_text', async () => {
    const mockFetch = createOpenAIMock({ outputText: '{"result": "success"}' });
    global.fetch = mockFetch;

    const res = await fetch('https://api.openai.com/v1/responses', { method: 'POST' });
    expect(res.ok).toBe(true);

    const json = await res.json();
    expect(json.output_text).toBe('{"result": "success"}');
  });

  it('returns error responses when configured', async () => {
    const mockFetch = createOpenAIMock({ status: 500, errorText: 'Internal Error' });
    global.fetch = mockFetch;

    const res = await fetch('https://api.openai.com/v1/responses', { method: 'POST' });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(500);

    const text = await res.text();
    expect(text).toBe('Internal Error');
  });
});

describe('Serverless Helpers', () => {
  it('creates mock request with normalized headers', () => {
    const req = createMockRequest({
      method: 'POST',
      headers: { 'X-API-Key': 'test-key' },
      body: { test: true }
    });

    expect(req.method).toBe('POST');
    expect(req.headers['x-api-key']).toBe('test-key');
    expect(req.body).toEqual({ test: true });
  });

  it('creates mock response that captures status, headers, and body', () => {
    const res = createMockResponse();
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end({ error: 'Bad Request' });

    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toBe('application/json');
    expect(res._isEnded()).toBe(true);
    expect(res._getJsonBody()).toEqual({ error: 'Bad Request' });
  });
});

describe('Fixture Data Integrity', () => {
  it('exports valid ResumeProfile fixtures', () => {
    expect(VALID_RESUME_PROFILE.languages).toContain('TypeScript');
    expect(MINIMAL_RESUME_PROFILE.languages).toEqual([]);
    expect(typeof MALFORMED_RESUME_PROFILE.languages).toBe('string');
  });

  it('exports valid CompanyReport fixtures', () => {
    expect(VALID_COMPANY_REPORT.fit_label).toBe('APPLY_NOW');
    expect(SIMULATED_COMPANY_REPORT.jd_url).toBe('simulated');
    expect(MALFORMED_COMPANY_REPORT.fit_label).toBe('SUPER_FIT');
  });

  it('exports valid SynthesisReport fixtures', () => {
    expect(VALID_SYNTHESIS_REPORT.priority_gaps.length).toBeGreaterThan(0);
    expect(MALFORMED_SYNTHESIS_REPORT.today_action.helps_for).toBeNull();
  });
});
