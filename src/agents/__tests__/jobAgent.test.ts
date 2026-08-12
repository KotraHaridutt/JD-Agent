import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  runJobAgent,
  analyzeCompany,
  buildRoleVariants,
  buildSearchHints,
  isPlainObject,
  asStringArray,
  normalizeFitLabel,
  normalizeGapType,
  normalizeProfile,
  normalizeCompanyReport,
  normalizeSynthesisReport
} from '../jobAgent';

import { callLLMWithValidation } from '../../api/llmClient';

import {
  VALID_RESUME_PROFILE,
  MINIMAL_RESUME_PROFILE,
  MALFORMED_RESUME_PROFILE
} from '../../test/fixtures/resume-profile';

import {
  VALID_COMPANY_REPORT,
  SIMULATED_COMPANY_REPORT,
  MALFORMED_COMPANY_REPORT
} from '../../test/fixtures/company-report';

import {
  VALID_SYNTHESIS_REPORT,
  MALFORMED_SYNTHESIS_REPORT
} from '../../test/fixtures/synthesis-report';

vi.mock('../../api/llmClient', () => ({
  callLLMWithValidation: vi.fn()
}));

const mockCallLLMWithValidation = vi.mocked(callLLMWithValidation);

describe('isPlainObject helper', () => {
  it('returns true for plain objects and empty objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ key: 'val' })).toBe(true);
  });

  it('returns false for arrays, null, undefined, and primitive types', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
    expect(isPlainObject('hello')).toBe(false);
    expect(isPlainObject(123)).toBe(false);
    expect(isPlainObject(true)).toBe(false);
  });
});

describe('asStringArray helper', () => {
  it('passes through valid string arrays', () => {
    expect(asStringArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(asStringArray([])).toEqual([]);
  });

  it('filters out non-string elements from mixed arrays', () => {
    expect(asStringArray([1, 'hello', null, 'world', true, undefined, {}])).toEqual(['hello', 'world']);
  });

  it('returns empty array for non-array inputs, null, and undefined', () => {
    expect(asStringArray('not an array')).toEqual([]);
    expect(asStringArray(123)).toEqual([]);
    expect(asStringArray(null)).toEqual([]);
    expect(asStringArray(undefined)).toEqual([]);
    expect(asStringArray({ length: 2 })).toEqual([]);
  });
});

describe('normalizeFitLabel helper', () => {
  it('passes through all three valid FitLabel enum values', () => {
    expect(normalizeFitLabel('APPLY_NOW')).toBe('APPLY_NOW');
    expect(normalizeFitLabel('APPLY_AFTER_PREP')).toBe('APPLY_AFTER_PREP');
    expect(normalizeFitLabel('SKIP')).toBe('SKIP');
  });

  it('defaults invalid string, empty string, number, null, and undefined to SKIP', () => {
    expect(normalizeFitLabel('SUPER_FIT')).toBe('SKIP');
    expect(normalizeFitLabel('')).toBe('SKIP');
    expect(normalizeFitLabel(100)).toBe('SKIP');
    expect(normalizeFitLabel(null)).toBe('SKIP');
    expect(normalizeFitLabel(undefined)).toBe('SKIP');
  });
});

describe('normalizeGapType helper', () => {
  it('passes through all three valid GapType enum values', () => {
    expect(normalizeGapType('STRONG_MATCH')).toBe('STRONG_MATCH');
    expect(normalizeGapType('PARTIAL_MATCH')).toBe('PARTIAL_MATCH');
    expect(normalizeGapType('REAL_GAP')).toBe('REAL_GAP');
  });

  it('defaults invalid string, lowercase string, null, and undefined to REAL_GAP', () => {
    expect(normalizeGapType('INVALID_GAP')).toBe('REAL_GAP');
    expect(normalizeGapType('strong_match')).toBe('REAL_GAP');
    expect(normalizeGapType('')).toBe('REAL_GAP');
    expect(normalizeGapType(null)).toBe('REAL_GAP');
    expect(normalizeGapType(undefined)).toBe('REAL_GAP');
  });
});

describe('normalizeProfile function', () => {
  it('normalizes valid complete profile fixture correctly', () => {
    const profile = normalizeProfile(VALID_RESUME_PROFILE);
    expect(profile.languages).toContain('TypeScript');
    expect(profile.projects.length).toBe(2);
    expect(profile.depth_signals['TypeScript']).toBeDefined();
  });

  it('normalizes minimal profile fixture correctly', () => {
    const profile = normalizeProfile(MINIMAL_RESUME_PROFILE);
    expect(profile.languages).toEqual([]);
    expect(profile.projects).toEqual([]);
    expect(profile.depth_signals).toEqual({});
  });

  it('returns default empty profile for null, undefined, or non-object inputs', () => {
    const defaultProfile = {
      languages: [],
      frameworks: [],
      databases: [],
      infra: [],
      domains: [],
      projects: [],
      depth_signals: {}
    };
    expect(normalizeProfile(null)).toEqual(defaultProfile);
    expect(normalizeProfile(undefined)).toEqual(defaultProfile);
    expect(normalizeProfile('string input')).toEqual(defaultProfile);
  });

  it('defaults missing fields and non-array projects to empty arrays', () => {
    const raw = {
      languages: 'not an array',
      projects: 'not an array',
      depth_signals: 'not an object'
    };
    const profile = normalizeProfile(raw);
    expect(profile.languages).toEqual([]);
    expect(profile.projects).toEqual([]);
    expect(profile.depth_signals).toEqual({});
  });

  it('normalizes nested project items with missing name, stack, or signals', () => {
    const raw = {
      projects: [
        { name: 'Proj 1' }, // missing stack & signals
        { stack: ['React'] }, // missing name
        'not a project object'
      ]
    };
    const profile = normalizeProfile(raw);
    expect(profile.projects.length).toBe(3);
    expect(profile.projects[0]).toEqual({ name: 'Proj 1', stack: [], signals: [] });
    expect(profile.projects[1]).toEqual({ name: '', stack: ['React'], signals: [] });
    expect(profile.projects[2]).toEqual({ name: '', stack: [], signals: [] });
  });
});

describe('normalizeCompanyReport function', () => {
  it('normalizes valid company report fixture correctly', () => {
    const report = normalizeCompanyReport(VALID_COMPANY_REPORT);
    expect(report.company).toBe('Acme Corp');
    expect(report.fit_label).toBe('APPLY_NOW');
    expect(report.match_score).toBe(92);
    expect(report.proof_note).toContain('JD source reviewed for Acme Corp');
  });

  it('normalizes simulated company report fixture correctly', () => {
    const report = normalizeCompanyReport(SIMULATED_COMPANY_REPORT);
    expect(report.company).toBe('Swiggy');
    expect(report.jd_url).toBe('simulated');
    expect(report.fit_label).toBe('SKIP');
    expect(report.proof_note).toContain('No live posting found');
  });

  it('returns default report for null, undefined, or non-object inputs', () => {
    const reportNull = normalizeCompanyReport(null);
    expect(reportNull.company).toBe('Unknown Company');
    expect(reportNull.jd_url).toBe('simulated');
    expect(reportNull.fit_label).toBe('SKIP');

    const reportUndef = normalizeCompanyReport(undefined);
    expect(reportUndef.company).toBe('Unknown Company');
    expect(reportUndef.jd_url).toBe('simulated');
  });

  it('auto-generates proof_note for simulated vs live JDs when proof_note is missing', () => {
    const liveNoNote = { company: 'Google', jd_url: 'https://careers.google.com/123', source_title: 'Backend Engineer' };
    const liveReport = normalizeCompanyReport(liveNoNote);
    expect(liveReport.proof_note).toBe('JD source reviewed for Google: Backend Engineer');

    const simNoNote = { company: 'Stripe', jd_url: 'simulated' };
    const simReport = normalizeCompanyReport(simNoNote);
    expect(simReport.proof_note).toContain('No live posting found after checking official/ATS sources for Stripe');
  });

  it('normalizes invalid fit_label and invalid gap_type in gaps array', () => {
    const raw = {
      company: 'TechCorp',
      fit_label: 'INVALID_LABEL',
      gaps: [
        { jd_says: 'Docker', gap_type: 'INVALID_TYPE' }
      ]
    };
    const report = normalizeCompanyReport(raw);
    expect(report.fit_label).toBe('SKIP');
    expect(report.gaps[0].gap_type).toBe('REAL_GAP');
  });
});

describe('normalizeSynthesisReport function', () => {
  it('normalizes valid synthesis report fixture correctly', () => {
    const report = normalizeSynthesisReport(VALID_SYNTHESIS_REPORT);
    expect(report.priority_gaps.length).toBe(2);
    expect(report.company_ranking.length).toBe(2);
    expect(report.today_action.what).toContain('Apollo GraphQL');
  });

  it('returns default synthesis report for null, undefined, or non-object inputs', () => {
    const reportNull = normalizeSynthesisReport(null);
    expect(reportNull.priority_gaps).toEqual([]);
    expect(reportNull.company_ranking).toEqual([]);
    expect(reportNull.today_action.what).toBe('Review the strongest cross-company gap');

    const reportUndef = normalizeSynthesisReport(undefined);
    expect(reportUndef.priority_gaps).toEqual([]);
  });

  it('handles missing priority_gaps, company_ranking, and today_action fields', () => {
    const raw = { priority_gaps: null, company_ranking: 'invalid' };
    const report = normalizeSynthesisReport(raw);
    expect(report.priority_gaps).toEqual([]);
    expect(report.company_ranking).toEqual([]);
    expect(report.today_action.what).toBe('Review the strongest cross-company gap');
  });

  it('normalizes malformed items inside priority_gaps and company_ranking', () => {
    const raw = {
      priority_gaps: [
        { skill: 'GraphQL', priority_rank: '1' },
        'not a gap object'
      ],
      company_ranking: [
        { company: 'Acme', fit_label: 'APPLY_NOW' },
        'not a ranking object'
      ]
    };
    const report = normalizeSynthesisReport(raw);
    expect(report.priority_gaps[0].priority_rank).toBe(1);
    expect(report.priority_gaps[1].skill).toBe('');
    expect(report.company_ranking[0].company).toBe('Acme');
    expect(report.company_ranking[1].company).toBe('Unknown Company');
  });
});

describe('buildRoleVariants function', () => {
  it('generates expected role variants for Software Engineer / swe', () => {
    const variantsSWE = buildRoleVariants('Software Engineer');
    expect(variantsSWE).toContain('Software Engineer');
    expect(variantsSWE).toContain('Backend Software Engineer');
    expect(variantsSWE).toContain('Product Software Engineer');

    const variantsAbbr = buildRoleVariants('swe');
    expect(variantsAbbr).toContain('Software Engineer');
  });

  it('generates expected role variants for backend roles', () => {
    const variants = buildRoleVariants('Backend SDE');
    expect(variants).toContain('Backend SDE');
    expect(variants).toContain('Backend Software Engineer');
    expect(variants).toContain('Backend Engineer');
    expect(variants).toContain('Software Engineer');
  });

  it('generates expected role variants for platform, infrastructure, and product roles', () => {
    expect(buildRoleVariants('Platform Engineer')).toContain('Platform Engineer');
    expect(buildRoleVariants('Infrastructure Engineer')).toContain('Infrastructure Engineer');
    expect(buildRoleVariants('Product Engineer')).toContain('Product Software Engineer');
  });
});

describe('buildSearchHints function', () => {
  it('returns company-specific hints for Stripe, Google, and NVIDIA', () => {
    const stripeHints = buildSearchHints('Stripe', 'Backend Engineer');
    expect(stripeHints.some((h) => h.includes('stripe.com'))).toBe(true);

    const googleHints = buildSearchHints('Google', 'Software Engineer');
    expect(googleHints.some((h) => h.includes('careers.google.com'))).toBe(true);

    const nvidiaHints = buildSearchHints('NVIDIA', 'Platform Engineer');
    expect(nvidiaHints.some((h) => h.includes('nvidia.com'))).toBe(true);
  });

  it('is case-insensitive for hardcoded company names', () => {
    const stripeLower = buildSearchHints('stripe', 'Backend Engineer');
    expect(stripeLower.some((h) => h.includes('stripe.com'))).toBe(true);

    const nvidiaLower = buildSearchHints('nvidia corporation', 'Software Engineer');
    expect(nvidiaLower.some((h) => h.includes('nvidia.com'))).toBe(true);
  });

  it('returns generic ATS search hints for unknown companies', () => {
    const hints = buildSearchHints('Unknown Startup', 'Software Engineer');
    expect(hints.some((h) => h.includes('greenhouse.io'))).toBe(true);
    expect(hints.some((h) => h.includes('lever.co'))).toBe(true);
  });
});

describe('analyzeCompany function', () => {
  beforeEach(() => {
    mockCallLLMWithValidation.mockReset();
  });

  it('stops searching role variants when a live JD URL is found', async () => {
    mockCallLLMWithValidation.mockResolvedValueOnce({
      ...VALID_COMPANY_REPORT,
      jd_url: 'https://careers.acme.com/job/123'
    });

    const report = await analyzeCompany('Acme', 'Backend SDE', '2 weeks', VALID_RESUME_PROFILE);
    expect(report.jd_url).toBe('https://careers.acme.com/job/123');
    expect(mockCallLLMWithValidation).toHaveBeenCalledTimes(1);
  });

  it('falls back to last simulated report when all role variants return simulated JDs', async () => {
    mockCallLLMWithValidation.mockResolvedValue({
      ...SIMULATED_COMPANY_REPORT,
      jd_url: 'simulated'
    });

    const report = await analyzeCompany('Acme', 'Backend SDE', '2 weeks', VALID_RESUME_PROFILE);
    expect(report.jd_url).toBe('simulated');
    expect(mockCallLLMWithValidation).toHaveBeenCalledGreaterThan(1);
  });
});

describe('runJobAgent pipeline orchestration function', () => {
  beforeEach(() => {
    mockCallLLMWithValidation.mockReset();
  });

  it('executes 3-stage LLM pipeline in order and triggers progress callback 4 times', async () => {
    mockCallLLMWithValidation
      .mockResolvedValueOnce(VALID_RESUME_PROFILE) // Stage 1 Orchestrator
      .mockResolvedValueOnce(VALID_COMPANY_REPORT)  // Stage 2 Company 1
      .mockResolvedValueOnce(SIMULATED_COMPANY_REPORT) // Stage 2 Company 2
      .mockResolvedValueOnce(VALID_SYNTHESIS_REPORT); // Stage 3 Synthesis

    const onProgress = vi.fn();
    const result = await runJobAgent(
      'Resume text...',
      ['Acme Corp', 'Swiggy'],
      'Backend Engineer',
      '2 weeks',
      onProgress
    );

    expect(result.profile).toEqual(VALID_RESUME_PROFILE);
    expect(result.jdReports.length).toBe(2);
    expect(result.synthesis).toEqual(VALID_SYNTHESIS_REPORT);

    expect(onProgress).toHaveBeenCalledTimes(4);
    expect(onProgress.mock.calls[0][0]).toContain('Step 1/3');
    expect(onProgress.mock.calls[1][0]).toContain('Step 2/3');
    expect(onProgress.mock.calls[2][0]).toContain('Step 3/3');
    expect(onProgress.mock.calls[3][0]).toBe('Done');
  });

  it('handles empty companies array by completing stages 1 and 3 with empty jdReports', async () => {
    mockCallLLMWithValidation
      .mockResolvedValueOnce(VALID_RESUME_PROFILE)
      .mockResolvedValueOnce(VALID_SYNTHESIS_REPORT);

    const onProgress = vi.fn();
    const result = await runJobAgent(
      'Resume text...',
      [],
      'Software Engineer',
      '1 month',
      onProgress
    );

    expect(result.profile).toEqual(VALID_RESUME_PROFILE);
    expect(result.jdReports).toEqual([]);
    expect(result.synthesis).toEqual(VALID_SYNTHESIS_REPORT);
    expect(onProgress).toHaveBeenCalledTimes(4);
  });

  it('catches errors in any stage and re-throws with "Analysis failed: ..."', async () => {
    mockCallLLMWithValidation.mockRejectedValueOnce(new Error('LLM API Timeout'));

    const onProgress = vi.fn();
    await expect(
      runJobAgent('Resume text...', ['Acme'], 'Software Engineer', '2 weeks', onProgress)
    ).rejects.toThrow('Analysis failed: LLM API Timeout');
  });
});
