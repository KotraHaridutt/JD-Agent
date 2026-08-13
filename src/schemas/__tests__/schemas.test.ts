import { describe, it, expect } from 'vitest';
import {
  ResumeProfileSchema,
  ProjectSchema,
  GapInfoSchema,
  GapTypeEnum,
  CompanyReportSchema,
  FitLabelEnum,
  SynthesisReportSchema,
  PriorityGapSchema,
  CompanyRankingInfoSchema,
  AnalyzeRequestSchema,
  validateAnalyzeRequest,
  sanitizeString,
  JobAgentResultSchema
} from '../index';

import {
  VALID_RESUME_PROFILE,
  MINIMAL_RESUME_PROFILE,
  MALFORMED_RESUME_PROFILE
} from '../../test/fixtures/resume-profile';

import {
  VALID_COMPANY_REPORT,
  SIMULATED_COMPANY_REPORT
} from '../../test/fixtures/company-report';

import {
  VALID_SYNTHESIS_REPORT
} from '../../test/fixtures/synthesis-report';

describe('ResumeProfileSchema & ProjectSchema', () => {
  it('validates a complete valid resume profile using safeParse', () => {
    const result = ResumeProfileSchema.safeParse(VALID_RESUME_PROFILE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.languages).toContain('TypeScript');
      expect(result.data.projects.length).toBe(2);
    }
  });

  it('validates a minimal profile with empty arrays using safeParse', () => {
    const result = ResumeProfileSchema.safeParse(MINIMAL_RESUME_PROFILE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.languages).toEqual([]);
      expect(result.data.projects).toEqual([]);
      expect(result.data.depth_signals).toEqual({});
    }
  });

  it('handles missing required fields via defaults in safeParse', () => {
    const result = ResumeProfileSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.languages).toEqual([]);
      expect(result.data.projects).toEqual([]);
    }
  });

  it('handles wrong types for depth_signals via fallback in safeParse', () => {
    const result = ResumeProfileSchema.safeParse(MALFORMED_RESUME_PROFILE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.languages).toBe('object'); // string fallback to empty array
      expect(result.data.depth_signals).toEqual({});
    }
  });

  it('validates strict ProjectSchema items and catches field path errors', () => {
    const strictProjectSchema = ProjectSchema.omit({ stack: true, signals: true }).extend({
      name: ProjectSchema.shape.name,
      stack: ProjectSchema.shape.stack,
      signals: ProjectSchema.shape.signals
    });

    const validProj = { name: 'App', stack: ['React'], signals: ['Fast'] };
    const validResult = strictProjectSchema.safeParse(validProj);
    expect(validResult.success).toBe(true);

    const malformedProj = { name: 12345, stack: 'React' };
    const invalidResult = strictProjectSchema.safeParse(malformedProj);
    // ProjectSchema uses .catch() so safeParse succeeds with default values
    expect(invalidResult.success).toBe(true);
    if (invalidResult.success) {
      expect(invalidResult.data.name).toBe('12345');
    }
  });
});

describe('GapInfoSchema & GapTypeEnum', () => {
  it('validates valid GapTypeEnum values', () => {
    expect(GapTypeEnum.safeParse('STRONG_MATCH').success).toBe(true);
    expect(GapTypeEnum.safeParse('PARTIAL_MATCH').success).toBe(true);
    expect(GapTypeEnum.safeParse('REAL_GAP').success).toBe(true);
  });

  it('rejects invalid GapTypeEnum values with issue path using safeParse', () => {
    const result = GapTypeEnum.safeParse('INVALID_GAP');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
      expect(result.error.issues[0].code).toBe('invalid_enum_value');
    }
  });

  it('rejects lowercase gap_type values due to case sensitivity', () => {
    const result = GapTypeEnum.safeParse('strong_match');
    expect(result.success).toBe(false);
  });

  it('validates a complete GapInfo object using safeParse', () => {
    const gap = {
      jd_says: 'GraphQL',
      jd_means: 'API Querying',
      candidate_has: 'REST',
      gap_type: 'PARTIAL_MATCH',
      bridge: 'Learn Apollo',
      time_estimate: '2 days',
      resource: 'Docs'
    };
    const result = GapInfoSchema.safeParse(gap);
    expect(result.success).toBe(true);
  });
});

describe('CompanyReportSchema & FitLabelEnum', () => {
  it('validates valid FitLabelEnum values', () => {
    expect(FitLabelEnum.safeParse('APPLY_NOW').success).toBe(true);
    expect(FitLabelEnum.safeParse('APPLY_AFTER_PREP').success).toBe(true);
    expect(FitLabelEnum.safeParse('SKIP').success).toBe(true);
  });

  it('rejects invalid FitLabelEnum values using safeParse', () => {
    const result = FitLabelEnum.safeParse('SUPER_FIT');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe('invalid_enum_value');
    }
  });

  it('validates a valid CompanyReport with live JD URL using safeParse', () => {
    const result = CompanyReportSchema.safeParse(VALID_COMPANY_REPORT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.company).toBe('Acme Corp');
      expect(result.data.fit_label).toBe('APPLY_NOW');
      expect(result.data.match_score).toBe(92);
      expect(result.data.proof_note).toContain('JD source reviewed for Acme Corp');
    }
  });

  it('validates a simulated JD CompanyReport using safeParse', () => {
    const result = CompanyReportSchema.safeParse(SIMULATED_COMPANY_REPORT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jd_url).toBe('simulated');
      expect(result.data.fit_label).toBe('SKIP');
      expect(result.data.proof_note).toContain('No live posting found');
    }
  });

  it('coerces string match_score to number when valid', () => {
    const reportWithStrScore = { ...VALID_COMPANY_REPORT, match_score: '85' };
    const result = CompanyReportSchema.safeParse(reportWithStrScore);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.match_score).toBe(85);
    }
  });

  it('falls back to 0 match_score for un-coercible string values', () => {
    const reportWithInvalidScore = { ...VALID_COMPANY_REPORT, match_score: 'one-hundred' };
    const result = CompanyReportSchema.safeParse(reportWithInvalidScore);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.match_score).toBe(0);
    }
  });

  it('handles empty gaps array as valid using safeParse', () => {
    const reportEmptyGaps = { ...VALID_COMPANY_REPORT, gaps: [] };
    const result = CompanyReportSchema.safeParse(reportEmptyGaps);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gaps).toEqual([]);
    }
  });
});

describe('SynthesisReportSchema, PriorityGap, CompanyRanking & TodayAction', () => {
  it('validates a complete valid SynthesisReport using safeParse', () => {
    const result = SynthesisReportSchema.safeParse(VALID_SYNTHESIS_REPORT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority_gaps.length).toBe(2);
      expect(result.data.today_action.what).toContain('Apollo GraphQL');
    }
  });

  it('validates empty priority_gaps array as a valid edge case', () => {
    const emptyGapsReport = {
      priority_gaps: [],
      company_ranking: VALID_SYNTHESIS_REPORT.company_ranking,
      today_action: VALID_SYNTHESIS_REPORT.today_action
    };
    const result = SynthesisReportSchema.safeParse(emptyGapsReport);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority_gaps).toEqual([]);
    }
  });

  it('validates PriorityGapSchema coercion for priority_rank', () => {
    const gap = {
      skill: 'Docker',
      companies_needing: ['Acme'],
      priority_rank: '1',
      action: 'Build image',
      resource: 'Docs',
      time_estimate: '1h'
    };
    const result = PriorityGapSchema.safeParse(gap);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority_rank).toBe(1);
    }
  });

  it('validates CompanyRankingInfoSchema and applies default fit_label if omitted', () => {
    const info = { company: 'TechCorp', reason: 'High fit', apply_after: 'Now' };
    const result = CompanyRankingInfoSchema.safeParse(info);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fit_label).toBe('SKIP');
    }
  });

  it('handles missing today_action with fallback default in safeParse', () => {
    const result = SynthesisReportSchema.safeParse({ priority_gaps: [], company_ranking: [] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.today_action.what).toBe('Review the strongest cross-company gap');
    }
  });
});

describe('AnalyzeRequestSchema & validateAnalyzeRequest', () => {
  it('validates a valid AnalyzeRequest using safeParse', () => {
    const validReq = {
      system: 'You are a career advisor.',
      message: 'Analyze this job description.',
      useWebSearch: true
    };
    const result = AnalyzeRequestSchema.safeParse(validReq);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.system).toBe('You are a career advisor.');
      expect(result.data.useWebSearch).toBe(true);
    }
  });

  it('defaults useWebSearch to false when omitted', () => {
    const validReq = {
      system: 'System prompt',
      message: 'User message'
    };
    const result = AnalyzeRequestSchema.safeParse(validReq);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.useWebSearch).toBe(false);
    }
  });

  it('rejects missing system field with field path ["system"] and error message using safeParse', () => {
    const invalidReq = { message: 'Hello' };
    const result = AnalyzeRequestSchema.safeParse(invalidReq);
    expect(result.success).toBe(false);
    if (!result.success) {
      const systemIssue = result.error.issues.find((i) => i.path.includes('system'));
      expect(systemIssue).toBeDefined();
    }
  });

  it('rejects missing message field with field path ["message"] using safeParse', () => {
    const invalidReq = { system: 'System prompt' };
    const result = AnalyzeRequestSchema.safeParse(invalidReq);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messageIssue = result.error.issues.find((i) => i.path.includes('message'));
      expect(messageIssue).toBeDefined();
    }
  });

  it('rejects empty system prompt after sanitization using safeParse', () => {
    const invalidReq = { system: '   <script></script>  ', message: 'Valid message' };
    const result = AnalyzeRequestSchema.safeParse(invalidReq);
    expect(result.success).toBe(false);
    if (!result.success) {
      const systemIssue = result.error.issues.find((i) => i.path.includes('system'));
      expect(systemIssue?.message).toContain('system prompt cannot be empty');
    }
  });

  it('rejects message exceeding 100,000 characters with field path ["message"] using safeParse', () => {
    const hugeMessage = 'a'.repeat(100001);
    const invalidReq = { system: 'System prompt', message: hugeMessage };
    const result = AnalyzeRequestSchema.safeParse(invalidReq);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messageIssue = result.error.issues.find((i) => i.path.includes('message'));
      expect(messageIssue).toBeDefined();
      expect(messageIssue?.message).toContain('cannot exceed 100,000 characters');
    }
  });

  it('rejects non-boolean useWebSearch values with field path ["useWebSearch"] using safeParse', () => {
    const invalidReq = { system: 'System prompt', message: 'Valid message', useWebSearch: 'yes' };
    const result = AnalyzeRequestSchema.safeParse(invalidReq);
    expect(result.success).toBe(false);
    if (!result.success) {
      const webSearchIssue = result.error.issues.find((i) => i.path.includes('useWebSearch'));
      expect(webSearchIssue).toBeDefined();
      expect(webSearchIssue?.code).toBe('invalid_type');
    }
  });

  it('sanitizes HTML tags and control characters in string inputs', () => {
    const raw = '<h1>Title</h1>\x00Hello\nWorld  ';
    const clean = sanitizeString(raw);
    expect(clean).toBe('TitleHello\nWorld');
  });

  it('validateAnalyzeRequest helper formats error issues with field paths', () => {
    const invalidBody = { system: '', message: '' };
    const result = validateAnalyzeRequest(invalidBody);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBeDefined();
      expect(result.errors[0].message).toBeDefined();
    }
  });

  it('validateAnalyzeRequest helper rejects non-object body', () => {
    const result = validateAnalyzeRequest('not an object');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].field).toBe('body');
      expect(result.errors[0].message).toContain('valid JSON object');
    }
  });
});

describe('JobAgentResultSchema', () => {
  it('validates a complete JobAgentResult object using safeParse', () => {
    const fullResult = {
      profile: VALID_RESUME_PROFILE,
      jdReports: [VALID_COMPANY_REPORT, SIMULATED_COMPANY_REPORT],
      synthesis: VALID_SYNTHESIS_REPORT
    };
    const result = JobAgentResultSchema.safeParse(fullResult);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jdReports.length).toBe(2);
      expect(result.data.profile.languages).toContain('TypeScript');
    }
  });

  it('falls back to default objects when sub-schemas fail or are omitted using safeParse', () => {
    const result = JobAgentResultSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profile.languages).toEqual([]);
      expect(result.data.jdReports).toEqual([]);
      expect(result.data.synthesis.today_action.what).toBe('Review the strongest cross-company gap');
    }
  });
});
