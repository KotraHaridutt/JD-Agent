import type { SynthesisReport } from '../../types';

export const VALID_SYNTHESIS_REPORT: SynthesisReport = {
  priority_gaps: [
    {
      skill: 'Kubernetes Container Orchestration',
      companies_needing: ['Acme Corp', 'TechCorp Inc'],
      priority_rank: 1,
      action: 'Complete Minikube deployment walkthrough and containerize sample app',
      resource: 'Kubernetes Official Documentation',
      time_estimate: '5 hours'
    },
    {
      skill: 'GraphQL Client Integration',
      companies_needing: ['Acme Corp'],
      priority_rank: 2,
      action: 'Build sample Apollo Client querying script',
      resource: 'Apollo GraphQL Client Docs',
      time_estimate: '2 hours'
    }
  ],
  company_ranking: [
    {
      company: 'Acme Corp',
      fit_label: 'APPLY_NOW',
      reason: '92% match with strong alignment in TypeScript, React, and serverless stack',
      apply_after: 'Reviewing Apollo GraphQL basics'
    },
    {
      company: 'Stealth Startup',
      fit_label: 'SKIP',
      reason: 'Low match score (45%) requiring low-level C++ systems programming',
      apply_after: 'N/A - Skip application'
    }
  ],
  today_action: {
    what: 'Review Apollo GraphQL query structure and build a basic client integration',
    resource: 'Apollo GraphQL Getting Started Guide',
    time: '2 hours',
    why: 'Directly addresses the primary partial gap for top target company Acme Corp',
    helps_for: ['Acme Corp']
  }
};

export const MALFORMED_SYNTHESIS_REPORT: any = {
  priority_gaps: [
    {
      skill: 'Kubernetes',
      priority_rank: 'first' // Invalid type: string instead of number
    }
  ],
  company_ranking: 'Top Companies', // Invalid type: string instead of array
  today_action: {
    what: 'Study GraphQL',
    helps_for: null // Invalid type: null instead of array
  }
};
