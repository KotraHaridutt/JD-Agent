import { callLLMWithValidation } from '../api/llmClient';
import {
  ResumeProfileSchema,
  CompanyReportSchema,
  SynthesisReportSchema
} from '../schemas';
import type {
  JobAgentResult,
  ResumeProfile,
  CompanyReport,
  SynthesisReport,
  FitLabel,
  GapType
} from '../types';

const ORCHESTRATOR_SYSTEM_PROMPT = `You are a resume parser. Extract a structured skill profile 
from the resume. For each skill, extract EVIDENCE — where 
it was used, in what context, at what depth.
Distinguish: production use vs project use vs mentioned once.
Return ONLY valid JSON, no markdown, no explanation.
JSON shape:
{
  "languages": [],
  "frameworks": [],
  "databases": [],
  "infra": [],
  "domains": [],
  "projects": [{ "name": "...", "stack": [], "signals": [] }],
  "depth_signals": { "skillName": "evidence string" }
}`;

const JD_AGENT_SYSTEM_PROMPT = `You are a job analyst agent. You will:
1. Use web search to find a FRESH (2024-2025) job description 
  for the given company and role.
  Prefer an official careers page or ATS posting.
  Search official pages first, then ATS pages such as Greenhouse, Lever, Workday, SmartRecruiters, Ashby, and similar.
  Treat equivalent role titles as matches: Backend SDE, Backend Software Engineer, Software Engineer Backend, Platform Engineer, Product Software Engineer.
  If you find a live posting, you must return its exact jd_url, a source_title, and a proof_note that names the page used.
  Only set jd_url to "simulated" after you have exhausted live official/ATS results for the given company and an equivalent role title.
2. Extract requirements. Tag each as HARD or SOFT.
   HARD = 'required', 'must have', 'you will'
   SOFT = 'preferred', 'nice to have', 'plus'
3. Interpret each requirement — what is it ACTUALLY used for 
   in this role context? Not the literal skill name.
   Example: 'Java' in fintech backend = Spring Boot microservices
   Example: 'Python' in ML team = PyTorch, data pipelines
4. Compare against the candidate resume profile provided.
   Three-way classification:
   STRONG_MATCH: skill present with relevant evidence
   PARTIAL_MATCH: adjacent skill exists — identify the BRIDGE
                  (what is the delta, not from zero)
                  NEVER say 'learn X from scratch' if bridge exists
   REAL_GAP: genuinely missing. If HARD requirement + 
             not learnable in timeline -> mark role LOW_FIT
5. Return ONLY valid JSON, no markdown, no explanation.
JSON shape:
{
  "company": "string",
  "role": "string",
  "jd_url": "string (or 'simulated')",
  "proof_note": "string",
  "source_title": "string",
  "search_terms": ["string"],
  "jd_freshness": "string",
  "fit_label": "APPLY_NOW" | "APPLY_AFTER_PREP" | "SKIP",
  "match_score": number (1-10),
  "strengths": ["string"],
  "gaps": [
    {
      "jd_says": "string",
      "jd_means": "string",
      "candidate_has": "string",
      "gap_type": "STRONG_MATCH" | "PARTIAL_MATCH" | "REAL_GAP",
      "bridge": "string",
      "time_estimate": "string",
      "resource": "specific doc/guide/chapter"
    }
  ],
  "top_3_actions": ["string"]
}`;

const SYNTHESIS_SYSTEM_PROMPT = `You are a synthesis agent. Given multiple company gap reports,
you will:
1. Find cross-company overlapping gaps — rank by frequency.
   More companies need it = higher priority.
2. Filter by timeline — if timeline is short, only surface 
   things achievable in that time. 
3. Rank companies: APPLY_NOW first, then APPLY_AFTER_PREP, 
   then SKIP with clear reason.
4. Generate TODAY'S SINGLE ACTION — the most impactful specific
   thing to do today. Must have: exact resource, time needed, 
   which companies it helps.
   NOT: 'Study system design'
   YES: 'Read DDIA Chapter 5 (replication) — 2-3 hours — 
         directly addresses what Google + Swiggy both need'
5. Return ONLY valid JSON, no markdown, no explanation.
JSON shape:
{
  "priority_gaps": [
    {
      "skill": "string",
      "companies_needing": ["string"],
      "priority_rank": number,
      "action": "string",
      "resource": "string",
      "time_estimate": "string"
    }
  ],
  "company_ranking": [
    {
      "company": "string",
      "fit_label": "string",
      "reason": "string",
      "apply_after": "string"
    }
  ],
  "today_action": {
    "what": "string",
    "resource": "string",
    "time": "string",
    "why": "string",
    "helps_for": ["string"]
  }
}`;

export type AgentStepCallback = (step: string) => void;

export async function runJobAgent(
  resume: string,
  companies: string[],
  role: string,
  timeline: string,
  onProgress: AgentStepCallback
): Promise<JobAgentResult> {
  try {
    // STEP 1: Orchestrator
    onProgress('Step 1/3: Parsing resume into structured profile...');
    const profile = await callLLMWithValidation(
      {
        system: ORCHESTRATOR_SYSTEM_PROMPT,
        message: resume,
        useWebSearch: false
      },
      ResumeProfileSchema
    );

    // STEP 2: JD Agents
    onProgress(`Step 2/3: Fetching JDs and analyzing gaps for ${companies.join(', ')}...`);
    const jdReports = await Promise.all(
      companies.map(company => analyzeCompany(company, role, timeline, profile))
    );

    // STEP 3: Synthesis Agent
    onProgress('Step 3/3: Synthesizing cross-company report and next actions...');
    const synthesis = await callLLMWithValidation(
      {
        system: SYNTHESIS_SYSTEM_PROMPT,
        message: `Timeline: ${timeline}\nAll company reports: ${JSON.stringify(jdReports)}`,
        useWebSearch: false
      },
      SynthesisReportSchema
    );

    onProgress('Done');
    return {
      profile,
      jdReports,
      synthesis
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Job Agent Error:', err);
    throw new Error('Analysis failed: ' + message);
  }
}

export async function analyzeCompany(company: string, role: string, timeline: string, profile: any) {
  const roleVariants = buildRoleVariants(role);
  let lastReport: any = null;

  for (const roleVariant of roleVariants) {
    const searchHints = buildSearchHints(company, roleVariant);
    const report = await callLLMWithValidation(
      {
        system: JD_AGENT_SYSTEM_PROMPT,
        message: `Search pass for company: ${company}\nTarget role: ${roleVariant}\nOriginal user role: ${role}\nCompany-specific search hints: ${searchHints.join(' | ')}\nSearch priority: official careers page, then ATS page, then archived company posting only if current posting is not found\nUse equivalent current titles if needed, but prefer the most exact live opening you can verify.\nReturn the most specific live JD URL you can verify.\nTimeline: ${timeline}\nResume Profile: ${JSON.stringify(profile)}`,
        useWebSearch: true
      },
      CompanyReportSchema
    );

    lastReport = report;
    if (report.jd_url !== 'simulated') {
      return report;
    }
  }

  return CompanyReportSchema.parse(lastReport ?? { company, role });
}

export function buildRoleVariants(role: string): string[] {
  const normalizedRole = role.trim();
  const lowerRole = normalizedRole.toLowerCase();
  const variants = [normalizedRole];

  if (lowerRole === 'software engineer' || lowerRole === 'swe') {
    variants.push('Software Engineer');
    variants.push('Backend Software Engineer');
    variants.push('Product Software Engineer');
  } else if (lowerRole.includes('backend')) {
    variants.push('Backend Software Engineer', 'Backend Engineer', 'Software Engineer');
  } else if (lowerRole.includes('platform')) {
    variants.push('Platform Engineer', 'Software Engineer');
  } else if (lowerRole.includes('infrastructure') || lowerRole.includes('infra')) {
    variants.push('Infrastructure Engineer', 'Platform Engineer', 'Software Engineer');
  } else if (lowerRole.includes('product')) {
    variants.push('Product Software Engineer', 'Software Engineer');
  } else {
    variants.push('Software Engineer');
  }

  return Array.from(new Set(variants.filter(Boolean)));
}

export function buildSearchHints(company: string, roleVariant: string): string[] {
  const normalizedCompany = company.trim().toLowerCase();

  if (normalizedCompany.includes('stripe')) {
    return [
      `site:stripe.com/jobs "${roleVariant}"`,
      `site:stripe.com/careers "${roleVariant}"`,
      `Stripe jobs ${roleVariant}`
    ];
  }

  if (normalizedCompany.includes('nvidia') || normalizedCompany.includes('nvidia corporation')) {
    return [
      `site:nvidia.com/en-us/about-nvidia/careers "${roleVariant}"`,
      `site:careers.nvidia.com "${roleVariant}"`,
      `site:nvidia.wd1.myworkdayjobs.com "${roleVariant}"`,
      `site:nvidia.wd5.myworkdayjobs.com "${roleVariant}"`,
      `NVIDIA jobs "${roleVariant}"`,
      `NVIDIA careers "Software Engineer"`,
      `NVIDIA careers "Product Software Engineer"`
    ];
  }

  if (normalizedCompany.includes('google')) {
    return [
      `site:careers.google.com "${roleVariant}"`,
      `site:google.com/about/careers/applications/jobs/results "${roleVariant}"`,
      `Google careers ${roleVariant}`
    ];
  }

  if (normalizedCompany.includes('swiggy')) {
    return [
      `site:careers.swiggy.com "${roleVariant}"`,
      `site:swiggy.com/careers "${roleVariant}"`,
      `Swiggy careers ${roleVariant}`
    ];
  }

  if (normalizedCompany.includes('atlan')) {
    return [
      `site:atlan.com/careers "${roleVariant}"`,
      `site:atlan.com/jobs "${roleVariant}"`,
      `Atlan careers ${roleVariant}`,
      `Atlan jobs ${roleVariant}`
    ];
  }

  if (normalizedCompany.includes('accenture')) {
    return [
      `site:accenture.com/careers "${roleVariant}"`,
      `site:accenture.com/global-en/careers "${roleVariant}"`,
      `site:accenture.com/in-en/careers "${roleVariant}"`,
      `Accenture careers ${roleVariant}`
    ];
  }

  if (normalizedCompany.includes('infosys')) {
    return [
      `site:infosys.com/careers "${roleVariant}"`,
      `site:careers.infosys.com "${roleVariant}"`,
      `Infosys careers ${roleVariant}`
    ];
  }

  return [
    `${company} careers "${roleVariant}"`,
    `${company} jobs "${roleVariant}"`,
    `official careers page for ${company} "${roleVariant}"`,
    `ATS posting for ${company} "${roleVariant}"`,
    `site:boards.greenhouse.io "${company}" "${roleVariant}"`,
    `site:jobs.lever.co "${company}" "${roleVariant}"`,
    `site:myworkdayjobs.com "${company}" "${roleVariant}"`,
    `site:smartrecruiters.com "${company}" "${roleVariant}"`,
    `site:ashbyhq.com "${company}" "${roleVariant}"`
  ];
}

/**
 * Normalization helper functions exported for testability & characterization tests.
 */
export function isPlainObject(val: unknown): boolean {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

export function asStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) {
    return [];
  }
  return val.filter((item): item is string => typeof item === 'string');
}

export function normalizeFitLabel(val: unknown): FitLabel {
  if (val === 'APPLY_NOW' || val === 'APPLY_AFTER_PREP' || val === 'SKIP') {
    return val;
  }
  return 'SKIP';
}

export function normalizeGapType(val: unknown): GapType {
  if (val === 'STRONG_MATCH' || val === 'PARTIAL_MATCH' || val === 'REAL_GAP') {
    return val;
  }
  return 'REAL_GAP';
}

export function normalizeProfile(val: unknown): ResumeProfile {
  if (!isPlainObject(val)) {
    return {
      languages: [],
      frameworks: [],
      databases: [],
      infra: [],
      domains: [],
      projects: [],
      depth_signals: {}
    };
  }

  const obj = val as Record<string, any>;
  const rawProjects = Array.isArray(obj.projects) ? obj.projects : [];
  const projects = rawProjects.map((p: any) => {
    if (!isPlainObject(p)) {
      return { name: '', stack: [], signals: [] };
    }
    return {
      name: typeof p.name === 'string' ? p.name : String(p.name ?? ''),
      stack: asStringArray(p.stack),
      signals: asStringArray(p.signals)
    };
  });

  const rawSignals = isPlainObject(obj.depth_signals) ? obj.depth_signals : {};
  const depth_signals: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawSignals)) {
    if (typeof v === 'string') {
      depth_signals[k] = v;
    }
  }

  return {
    languages: asStringArray(obj.languages),
    frameworks: asStringArray(obj.frameworks),
    databases: asStringArray(obj.databases),
    infra: asStringArray(obj.infra),
    domains: asStringArray(obj.domains),
    projects,
    depth_signals
  };
}

export function normalizeCompanyReport(val: unknown): CompanyReport {
  if (!isPlainObject(val)) {
    return {
      company: 'Unknown Company',
      role: '',
      jd_url: 'simulated',
      source_title: 'Unknown Company',
      proof_note: 'No live posting found after checking official/ATS sources for Unknown Company across multiple backend role variants. The proof is the search trail plus the gap-level evidence below.',
      search_terms: [],
      jd_freshness: '',
      fit_label: 'SKIP',
      match_score: 0,
      strengths: [],
      gaps: [],
      top_3_actions: []
    };
  }

  const obj = val as Record<string, any>;
  const company = typeof obj.company === 'string' && obj.company.trim() ? obj.company : 'Unknown Company';
  const role = typeof obj.role === 'string' ? obj.role : '';
  const jd_url = typeof obj.jd_url === 'string' && obj.jd_url.trim() ? obj.jd_url : 'simulated';
  const source_title = typeof obj.source_title === 'string' && obj.source_title.trim() ? obj.source_title : company;

  const proof_note =
    typeof obj.proof_note === 'string' && obj.proof_note.trim()
      ? obj.proof_note
      : jd_url === 'simulated'
        ? `No live posting found after checking official/ATS sources for ${company} across multiple backend role variants. The proof is the search trail plus the gap-level evidence below.`
        : `JD source reviewed for ${company}: ${source_title}`;

  const rawMatchScore = Number(obj.match_score);
  const match_score = isNaN(rawMatchScore) ? 0 : rawMatchScore;

  const rawGaps = Array.isArray(obj.gaps) ? obj.gaps : [];
  const gaps = rawGaps.map((g: any) => {
    if (!isPlainObject(g)) {
      return {
        jd_says: '',
        jd_means: '',
        candidate_has: '',
        gap_type: 'REAL_GAP' as GapType,
        bridge: '',
        time_estimate: '',
        resource: ''
      };
    }
    return {
      jd_says: typeof g.jd_says === 'string' ? g.jd_says : '',
      jd_means: typeof g.jd_means === 'string' ? g.jd_means : '',
      candidate_has: typeof g.candidate_has === 'string' ? g.candidate_has : '',
      gap_type: normalizeGapType(g.gap_type),
      bridge: typeof g.bridge === 'string' ? g.bridge : '',
      time_estimate: typeof g.time_estimate === 'string' ? g.time_estimate : '',
      resource: typeof g.resource === 'string' ? g.resource : ''
    };
  });

  return {
    company,
    role,
    jd_url,
    source_title,
    proof_note,
    search_terms: asStringArray(obj.search_terms),
    jd_freshness: typeof obj.jd_freshness === 'string' ? obj.jd_freshness : '',
    fit_label: normalizeFitLabel(obj.fit_label),
    match_score,
    strengths: asStringArray(obj.strengths),
    gaps,
    top_3_actions: asStringArray(obj.top_3_actions)
  };
}

export function normalizeSynthesisReport(val: unknown): SynthesisReport {
  const defaultTodayAction = {
    what: 'Review the strongest cross-company gap',
    resource: '',
    time: '',
    why: '',
    helps_for: []
  };

  if (!isPlainObject(val)) {
    return {
      priority_gaps: [],
      company_ranking: [],
      today_action: defaultTodayAction
    };
  }

  const obj = val as Record<string, any>;

  const rawGaps = Array.isArray(obj.priority_gaps) ? obj.priority_gaps : [];
  const priority_gaps = rawGaps.map((g: any) => {
    if (!isPlainObject(g)) {
      return {
        skill: '',
        companies_needing: [],
        priority_rank: 0,
        action: '',
        resource: '',
        time_estimate: ''
      };
    }
    const rank = Number(g.priority_rank);
    return {
      skill: typeof g.skill === 'string' ? g.skill : '',
      companies_needing: asStringArray(g.companies_needing),
      priority_rank: isNaN(rank) ? 0 : rank,
      action: typeof g.action === 'string' ? g.action : '',
      resource: typeof g.resource === 'string' ? g.resource : '',
      time_estimate: typeof g.time_estimate === 'string' ? g.time_estimate : ''
    };
  });

  const rawRanking = Array.isArray(obj.company_ranking) ? obj.company_ranking : [];
  const company_ranking = rawRanking.map((r: any) => {
    if (!isPlainObject(r)) {
      return {
        company: 'Unknown Company',
        fit_label: 'SKIP' as FitLabel,
        reason: '',
        apply_after: ''
      };
    }
    return {
      company: typeof r.company === 'string' ? r.company : 'Unknown Company',
      fit_label: normalizeFitLabel(r.fit_label),
      reason: typeof r.reason === 'string' ? r.reason : '',
      apply_after: typeof r.apply_after === 'string' ? r.apply_after : ''
    };
  });

  const rawToday = isPlainObject(obj.today_action) ? obj.today_action : {};
  const today_action = {
    what: typeof rawToday.what === 'string' && rawToday.what.trim() ? rawToday.what : defaultTodayAction.what,
    resource: typeof rawToday.resource === 'string' ? rawToday.resource : '',
    time: typeof rawToday.time === 'string' ? rawToday.time : '',
    why: typeof rawToday.why === 'string' ? rawToday.why : '',
    helps_for: asStringArray(rawToday.helps_for)
  };

  return {
    priority_gaps,
    company_ranking,
    today_action
  };
}
