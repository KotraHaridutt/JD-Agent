import type { CallLLMParams } from '../../llmClient';

export const MOCK_CALL_LLM_PARAMS: CallLLMParams = {
  system: 'You are a job description analysis agent.',
  message: 'Analyze software engineer role at NVIDIA',
  useWebSearch: true
};

export const MOCK_LLM_RESPONSE_PAYLOAD = {
  company: 'NVIDIA',
  role: 'Software Engineer',
  jd_url: 'https://nvidia.wd5.myworkdayjobs.com/careers/job/123',
  source_title: 'NVIDIA Careers - Software Engineer',
  proof_note: 'Official Workday ATS posting',
  search_terms: ['NVIDIA', 'Software Engineer'],
  jd_freshness: '2025',
  fit_label: 'APPLY_NOW',
  match_score: 9,
  strengths: ['Distributed Systems', 'C++', 'CUDA'],
  gaps: [
    {
      jd_says: '5+ years GPU systems experience',
      jd_means: 'Designing high-throughput parallel compute pipelines',
      candidate_has: '3 years experience with C++ and multi-threading',
      gap_type: 'PARTIAL_MATCH',
      bridge: 'Deep dive into CUDA memory management',
      time_estimate: '2 weeks',
      resource: 'CUDA Programming Guide'
    }
  ],
  top_3_actions: ['Read CUDA Programming Guide', 'Build prototype kernel', 'Apply']
};
