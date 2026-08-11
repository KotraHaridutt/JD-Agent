export const VALID_RESUME_PROFILE = {
  languages: ['TypeScript', 'Python', 'Go'],
  frameworks: ['React', 'Node.js', 'Express'],
  databases: ['PostgreSQL', 'Redis'],
  infra: ['AWS', 'Docker', 'Vercel'],
  domains: ['Fintech', 'Backend Systems'],
  projects: [
    {
      name: 'JD-Agent',
      stack: ['React', 'TypeScript', 'Vite'],
      signals: ['Production deployment', 'Sliding window rate limiter']
    }
  ],
  depth_signals: {
    TypeScript: '5 years production experience'
  }
};

export const MALFORMED_RESUME_PROFILE = {
  languages: 'TypeScript', // wrong type, should fall back to []
  projects: 'invalid project array', // wrong type
  depth_signals: null // wrong type
};

export const VALID_GAP_INFO = {
  jd_says: '5+ years Node.js microservices experience',
  jd_means: 'Designing and deploying scalable Node.js services',
  candidate_has: '3 years Node.js experience in monolith and serverless',
  gap_type: 'PARTIAL_MATCH',
  bridge: 'Scale up event-driven architecture experience',
  time_estimate: '2-3 weeks',
  resource: 'Node.js Microservices Guide'
};

export const MALFORMED_GAP_INFO = {
  gap_type: 'INVALID_ENUM_VALUE', // should fall back to REAL_GAP
  jd_says: 12345 // wrong type, should fall back to ''
};

export const VALID_COMPANY_REPORT = {
  company: 'NVIDIA',
  role: 'Backend Software Engineer',
  jd_url: 'https://nvidia.wd5.myworkdayjobs.com/careers/job/123',
  source_title: 'NVIDIA Careers - Backend Software Engineer',
  proof_note: 'Official Workday ATS posting',
  search_terms: ['NVIDIA', 'Backend Software Engineer'],
  jd_freshness: '2025',
  fit_label: 'APPLY_AFTER_PREP',
  match_score: 8,
  strengths: ['Strong Node.js', 'System design foundation'],
  gaps: [VALID_GAP_INFO],
  top_3_actions: ['Read DDIA Chapter 5', 'Build microservice prototype', 'Apply']
};

export const MALFORMED_COMPANY_REPORT = {
  company: 999, // wrong type
  fit_label: 'SUPER_FIT', // invalid enum value
  match_score: '8.5', // coerced to 8.5
  gaps: 'not an array' // wrong type
};

export const VALID_SYNTHESIS_REPORT = {
  priority_gaps: [
    {
      skill: 'System Design',
      companies_needing: ['NVIDIA', 'Google'],
      priority_rank: 1,
      action: 'Read DDIA Chapter 5',
      resource: 'Designing Data-Intensive Applications',
      time_estimate: '2-3 hours'
    }
  ],
  company_ranking: [
    {
      company: 'NVIDIA',
      fit_label: 'APPLY_AFTER_PREP',
      reason: 'Strong core skills, needs system design prep',
      apply_after: '2 weeks'
    }
  ],
  today_action: {
    what: 'Read DDIA Chapter 5 (Replication)',
    resource: 'Designing Data-Intensive Applications Book',
    time: '2 hours',
    why: 'Addresses system design requirements for both NVIDIA and Swiggy',
    helps_for: ['NVIDIA', 'Swiggy']
  }
};

export const MALFORMED_SYNTHESIS_REPORT = {
  priority_gaps: 'invalid array',
  company_ranking: [
    {
      company: 12345,
      fit_label: 'MAYBE' // Invalid enum, should default to SKIP
    }
  ],
  today_action: 'Not an object' // Invalid object, should fall back to default TodayAction
};

export const VALID_JOB_AGENT_RESULT = {
  profile: VALID_RESUME_PROFILE,
  jdReports: [VALID_COMPANY_REPORT],
  synthesis: VALID_SYNTHESIS_REPORT
};
