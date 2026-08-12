import type { CompanyReport } from '../../types';

export const VALID_COMPANY_REPORT: CompanyReport = {
  company: 'Acme Corp',
  role: 'Senior Full Stack Engineer',
  jd_url: 'https://careers.acme.com/jobs/12345',
  source_title: 'Senior Full Stack Engineer posting on Acme Careers',
  proof_note: 'JD source reviewed for Acme Corp: Senior Full Stack Engineer posting on Acme Careers',
  search_terms: ['Acme Corp Senior Full Stack Engineer', 'Acme backend typescript job'],
  jd_freshness: 'Posted 2 days ago',
  fit_label: 'APPLY_NOW',
  match_score: 92,
  strengths: [
    'Strong alignment in TypeScript, React, and Node.js',
    'Demonstrated experience with serverless architecture on Vercel/AWS',
    'Solid background in API design and database schema modeling'
  ],
  gaps: [
    {
      jd_says: 'GraphQL API experience preferred',
      jd_means: 'Comfortable writing and consuming GraphQL queries',
      candidate_has: 'REST API expertise with JSON schemas',
      gap_type: 'PARTIAL_MATCH',
      bridge: 'Highlight REST expertise and quick adoption of GraphQL client libraries',
      time_estimate: '3 days',
      resource: 'Official Apollo GraphQL Tutorial'
    },
    {
      jd_says: 'Kubernetes cluster deployment experience required',
      jd_means: 'Managing containerized microservices in k8s',
      candidate_has: 'Docker containerization and AWS ECS experience',
      gap_type: 'REAL_GAP',
      bridge: 'Complete hands-on Kubernetes deployment tutorial',
      time_estimate: '1 week',
      resource: 'Kubernetes Up & Running Book'
    }
  ],
  top_3_actions: [
    'Tailor resume to emphasize Docker and serverless backend architecture',
    'Review Apollo GraphQL basics before technical interview',
    'Submit application directly on Acme Careers portal'
  ]
};

export const SIMULATED_COMPANY_REPORT: CompanyReport = {
  company: 'Stealth Startup',
  role: 'Founding Backend Engineer',
  jd_url: 'simulated',
  source_title: 'Stealth Startup',
  proof_note: 'No live posting found after checking official/ATS sources for Stealth Startup across multiple backend role variants.',
  search_terms: ['Stealth Startup backend engineer', 'Stealth Startup jobs'],
  jd_freshness: 'Simulated profile based on target role requirements',
  fit_label: 'SKIP',
  match_score: 45,
  strengths: ['JavaScript proficiency'],
  gaps: [
    {
      jd_says: '10+ years C++ systems development',
      jd_means: 'Low-level performance optimization',
      candidate_has: 'High-level web development background',
      gap_type: 'REAL_GAP',
      bridge: 'Significant gap requiring extensive retraining',
      time_estimate: '6 months',
      resource: 'C++ Systems Programming Course'
    }
  ],
  top_3_actions: [
    'Skip application due to low match score and mismatched technical domain',
    'Focus efforts on higher-fit full stack roles'
  ]
};

export const MALFORMED_COMPANY_REPORT: any = {
  company: 12345, // Invalid type: number instead of string
  role: null,
  fit_label: 'SUPER_FIT', // Invalid enum value
  match_score: 'high', // Invalid type: string instead of number
  gaps: [
    {
      jd_says: 'GraphQL',
      gap_type: 'NOT_A_VALID_TYPE' // Invalid enum value
    }
  ]
};
