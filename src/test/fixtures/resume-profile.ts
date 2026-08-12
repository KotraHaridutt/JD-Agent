import type { ResumeProfile } from '../../types';

export const VALID_RESUME_PROFILE: ResumeProfile = {
  languages: ['TypeScript', 'JavaScript', 'Python', 'Go'],
  frameworks: ['React', 'Next.js', 'Node.js', 'Express', 'TailwindCSS'],
  databases: ['PostgreSQL', 'MongoDB', 'Redis'],
  infra: ['AWS', 'Vercel', 'Docker', 'GitHub Actions'],
  domains: ['Full Stack Development', 'API Design', 'DevOps', 'Distributed Systems'],
  projects: [
    {
      name: 'JD-Agent',
      stack: ['TypeScript', 'Vite', 'React', 'Vercel Serverless'],
      signals: ['LLM Orchestration', 'Zod Validation', 'Tailwind Styling']
    },
    {
      name: 'AI News Intelligence',
      stack: ['Python', 'FastAPI', 'PostgreSQL'],
      signals: ['News Scraping', 'RAG Embeddings']
    }
  ],
  depth_signals: {
    TypeScript: '5 years commercial experience with strict typing and Zod schemas',
    React: 'Extensive frontend architecture experience building component libraries',
    AWS: 'Deployed serverless applications with Lambda, API Gateway, and S3'
  }
};

export const MINIMAL_RESUME_PROFILE: ResumeProfile = {
  languages: [],
  frameworks: [],
  databases: [],
  infra: [],
  domains: [],
  projects: [],
  depth_signals: {}
};

export const MALFORMED_RESUME_PROFILE: any = {
  languages: 'TypeScript, JavaScript', // Invalid type: string instead of array
  frameworks: null,
  databases: ['PostgreSQL'],
  projects: [
    {
      name: 'Broken Project',
      stack: 'React' // Invalid type: string instead of array
    }
  ],
  depth_signals: null
};
