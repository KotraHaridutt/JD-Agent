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
1. Use googleSearch to find a FRESH (2024-2025) job description 
   for the given company and role. 
   If no active opening found, simulate the standard requirements for that tier.
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
    onProgress(\`Step 2/3: Fetching JDs and analyzing gaps for \${companies.join(', ')}...\`);
    const jdReports = await Promise.all(
      companies.map(company =>
        callGemini({
          system: JD_AGENT_SYSTEM_PROMPT,
          message: \`Company: \${company}\\nRole: \${role}\\nTimeline: \${timeline}\\nResume Profile: \${JSON.stringify(profile)}\`,
          useWebSearch: true
        })
      )
    );

    // STEP 3: Synthesis Agent
    onProgress('Step 3/3: Synthesizing cross-company report and next actions...');
    const synthesis = await callGemini({
      system: SYNTHESIS_SYSTEM_PROMPT,
      message: \`Timeline: \${timeline}\\nAll company reports: \${JSON.stringify(jdReports)}\`,
      useWebSearch: false
    });

    onProgress('Done');
    return { profile, jdReports, synthesis };
  } catch (err: any) {
    console.error('Job Agent Error:', err);
    throw new Error('Analysis failed: ' + err.message);
  }
}
