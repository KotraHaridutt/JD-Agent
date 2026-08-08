export interface ResumeProfile {
  languages: string[];
  frameworks: string[];
  databases: string[];
  infra: string[];
  domains: string[];
  projects: Array<{
    name: string;
    stack: string[];
    signals: string[];
  }>;
  depth_signals: Record<string, string>;
}

export interface GapInfo {
  jd_says: string;
  jd_means: string;
  candidate_has: string;
  gap_type: 'STRONG_MATCH' | 'PARTIAL_MATCH' | 'REAL_GAP';
  bridge: string;
  time_estimate: string;
  resource: string;
}

export interface CompanyReport {
  company: string;
  role: string;
  jd_url: string;
  jd_freshness: string;
  fit_label: 'APPLY_NOW' | 'APPLY_AFTER_PREP' | 'SKIP';
  match_score: number;
  strengths: string[];
  gaps: GapInfo[];
  top_3_actions: string[];
}

export interface PriorityGap {
  skill: string;
  companies_needing: string[];
  priority_rank: number;
  action: string;
  resource: string;
  time_estimate: string;
}

export interface CompanyRankingInfo {
  company: string;
  fit_label: string;
  reason: string;
  apply_after: string;
}

export interface TodayAction {
  what: string;
  resource: string;
  time: string;
  why: string;
  helps_for: string[];
}

export interface SynthesisReport {
  priority_gaps: PriorityGap[];
  company_ranking: CompanyRankingInfo[];
  today_action: TodayAction;
}

export interface JobAgentResult {
  profile: ResumeProfile;
  jdReports: CompanyReport[];
  synthesis: SynthesisReport;
}
