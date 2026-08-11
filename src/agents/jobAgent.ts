import { callGemini } from '../api/gemini';
import type { JobAgentResult } from '../types';

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
    const profile = await callGemini({
      system: ORCHESTRATOR_SYSTEM_PROMPT,
      message: resume,
      useWebSearch: false
    });

    // STEP 2: JD Agents
    onProgress(`Step 2/3: Fetching JDs and analyzing gaps for ${companies.join(', ')}...`);
    const jdReports = await Promise.all(
      companies.map(company => analyzeCompany(company, role, timeline, profile))
    );

    // STEP 3: Synthesis Agent
    onProgress('Step 3/3: Synthesizing cross-company report and next actions...');
    const synthesis = await callGemini({
      system: SYNTHESIS_SYSTEM_PROMPT,
      message: `Timeline: ${timeline}\nAll company reports: ${JSON.stringify(jdReports)}`,
      useWebSearch: false
    });

    onProgress('Done');
    return {
      profile: normalizeProfile(profile),
      jdReports: jdReports.map(normalizeCompanyReport),
      synthesis: normalizeSynthesisReport(synthesis)
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Job Agent Error:', err);
    throw new Error('Analysis failed: ' + message);
  }
}

async function analyzeCompany(company: string, role: string, timeline: string, profile: any) {
  const roleVariants = buildRoleVariants(role);
  let lastReport: any = null;

  for (const roleVariant of roleVariants) {
    const searchHints = buildSearchHints(company, roleVariant);
    const report = await callGemini({
      system: JD_AGENT_SYSTEM_PROMPT,
      message: `Search pass for company: ${company}\nTarget role: ${roleVariant}\nOriginal user role: ${role}\nCompany-specific search hints: ${searchHints.join(' | ')}\nSearch priority: official careers page, then ATS page, then archived company posting only if current posting is not found\nUse equivalent current titles if needed, but prefer the most exact live opening you can verify.\nReturn the most specific live JD URL you can verify.\nTimeline: ${timeline}\nResume Profile: ${JSON.stringify(profile)}`,
      useWebSearch: true
    });

    lastReport = report;
    const normalized = normalizeCompanyReport(report);
    if (normalized.jd_url !== 'simulated') {
      return normalized;
    }
  }

  return normalizeCompanyReport(lastReport ?? { company, role });
}

function buildRoleVariants(role: string): string[] {
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

function buildSearchHints(company: string, roleVariant: string): string[] {
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

function normalizeProfile(profile: any) {
  return {
    languages: asStringArray(profile?.languages),
    frameworks: asStringArray(profile?.frameworks),
    databases: asStringArray(profile?.databases),
    infra: asStringArray(profile?.infra),
    domains: asStringArray(profile?.domains),
    projects: Array.isArray(profile?.projects)
      ? profile.projects.map((project: any) => ({
          name: typeof project?.name === 'string' ? project.name : '',
          stack: asStringArray(project?.stack),
          signals: asStringArray(project?.signals)
        }))
      : [],
    depth_signals: isPlainObject(profile?.depth_signals) ? profile.depth_signals : {}
  };
}

function normalizeCompanyReport(report: any) {
  const company = typeof report?.company === 'string' ? report.company : 'Unknown Company';
  const jdUrl = typeof report?.jd_url === 'string' ? report.jd_url : 'simulated';
  const sourceTitle = typeof report?.source_title === 'string' ? report.source_title : company;
  return {
    company,
    role: typeof report?.role === 'string' ? report.role : '',
    jd_url: jdUrl,
    source_title: sourceTitle,
    proof_note: typeof report?.proof_note === 'string' && report.proof_note.trim()
      ? report.proof_note
      : jdUrl === 'simulated'
        ? `No live posting found after checking official/ATS sources for ${company} across multiple backend role variants. The proof is the search trail plus the gap-level evidence below.`
        : `JD source reviewed for ${company}: ${sourceTitle}`,
    jd_freshness: typeof report?.jd_freshness === 'string' ? report.jd_freshness : '',
    fit_label: normalizeFitLabel(report?.fit_label),
    match_score: typeof report?.match_score === 'number' ? report.match_score : 0,
    strengths: asStringArray(report?.strengths),
    gaps: Array.isArray(report?.gaps)
      ? report.gaps.map((gap: any) => ({
          jd_says: typeof gap?.jd_says === 'string' ? gap.jd_says : '',
          jd_means: typeof gap?.jd_means === 'string' ? gap.jd_means : '',
          candidate_has: typeof gap?.candidate_has === 'string' ? gap.candidate_has : '',
          gap_type: normalizeGapType(gap?.gap_type),
          bridge: typeof gap?.bridge === 'string' ? gap.bridge : '',
          time_estimate: typeof gap?.time_estimate === 'string' ? gap.time_estimate : '',
          resource: typeof gap?.resource === 'string' ? gap.resource : ''
        }))
      : [],
    top_3_actions: asStringArray(report?.top_3_actions)
  };
}

function normalizeSynthesisReport(synthesis: any) {
  return {
    priority_gaps: Array.isArray(synthesis?.priority_gaps)
      ? synthesis.priority_gaps.map((gap: any) => ({
          skill: typeof gap?.skill === 'string' ? gap.skill : '',
          companies_needing: asStringArray(gap?.companies_needing),
          priority_rank: typeof gap?.priority_rank === 'number' ? gap.priority_rank : 0,
          action: typeof gap?.action === 'string' ? gap.action : '',
          resource: typeof gap?.resource === 'string' ? gap.resource : '',
          time_estimate: typeof gap?.time_estimate === 'string' ? gap.time_estimate : ''
        }))
      : [],
    company_ranking: Array.isArray(synthesis?.company_ranking)
      ? synthesis.company_ranking.map((rank: any) => ({
          company: typeof rank?.company === 'string' ? rank.company : 'Unknown Company',
          fit_label: typeof rank?.fit_label === 'string' ? rank.fit_label : 'SKIP',
          reason: typeof rank?.reason === 'string' ? rank.reason : '',
          apply_after: typeof rank?.apply_after === 'string' ? rank.apply_after : ''
        }))
      : [],
    today_action: {
      what: typeof synthesis?.today_action?.what === 'string' ? synthesis.today_action.what : 'Review the strongest cross-company gap',
      resource: typeof synthesis?.today_action?.resource === 'string' ? synthesis.today_action.resource : '',
      time: typeof synthesis?.today_action?.time === 'string' ? synthesis.today_action.time : '',
      why: typeof synthesis?.today_action?.why === 'string' ? synthesis.today_action.why : '',
      helps_for: asStringArray(synthesis?.today_action?.helps_for)
    }
  };
}

function asStringArray(value: any): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function isPlainObject(value: any): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeFitLabel(label: any) {
  return label === 'APPLY_NOW' || label === 'APPLY_AFTER_PREP' || label === 'SKIP' ? label : 'SKIP';
}

function normalizeGapType(label: any) {
  return label === 'STRONG_MATCH' || label === 'PARTIAL_MATCH' || label === 'REAL_GAP' ? label : 'REAL_GAP';
}
