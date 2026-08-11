export const VALID_LLM_PROFILE_RESPONSE = {
  languages: ['TypeScript', 'Python'],
  frameworks: ['React', 'Express'],
  databases: ['PostgreSQL'],
  infra: ['AWS', 'Docker'],
  domains: ['Fintech'],
  projects: [
    {
      name: 'JD-Agent',
      stack: ['TypeScript', 'React'],
      signals: ['Vercel deployment']
    }
  ],
  depth_signals: {
    TypeScript: '4 years production'
  }
};

export const MALFORMED_LLM_PROFILE_RESPONSE = {
  languages: 'TypeScript', // string instead of array
  frameworks: null,
  projects: 'invalid string'
};

export const VALID_LLM_COMPANY_REPORT_RESPONSE = {
  company: 'Google',
  role: 'Software Engineer',
  jd_url: 'https://careers.google.com/jobs/123',
  source_title: 'Google Careers',
  proof_note: 'Official Posting',
  search_terms: ['Google', 'Software Engineer'],
  jd_freshness: '2025',
  fit_label: 'APPLY_NOW',
  match_score: 9,
  strengths: ['Algorithms', 'System Design'],
  gaps: [],
  top_3_actions: ['Apply immediately']
};

export const INVALID_LLM_COMPANY_REPORT_RESPONSE = {
  company: 'Google',
  fit_label: 'INVALID_ENUM_LABEL',
  match_score: 'not a number string'
};
