# Tool Registry

Exact input/output contracts for every MCP tool exposed by `apps/mcp-server`. All inputs/outputs are validated with Zod schemas living in `packages/shared-types`.

---

## `searchJobs`

Discovers new jobs and refreshes existing ones for a given user, across the company registry.

**Input**
```ts
{
  userId: string;
  companyIds?: string[]; // optional: limit to a subset (e.g. for manual re-run against specific companies)
}
```

**Output**
```ts
{
  newJobs: Job[];       // jobs inserted this run
  updatedJobs: Job[];   // existing jobs whose posting content changed (e.g. description edited upstream)
  companiesQueried: number;
  companiesFailed: { companyId: string; reason: string }[];
}
```

**Internals (not part of the contract, for context):** iterates active `Company` records, dispatches to the appropriate connector (`packages/ats-connectors`) based on `atsType`, falls back to Firecrawl then Puppeteer for non-ATS sources, normalizes results into the common `Job` shape, and de-dupes against existing `(userId, companyId, externalId)` rows.

**Error modes:** individual company failures are captured in `companiesFailed` and do not fail the whole call — see `engineering/ERROR_HANDLING.md`.

---

## `scoreJobs`

Computes match score, matched/missing skills, and an AI explanation for a batch of jobs against a user's profile.

**Input**
```ts
{
  userId: string;
  jobIds?: string[]; // omit to score all unscored/stale jobs for the user
}
```

**Output**
```ts
{
  scored: {
    jobId: string;
    matchScore: number;         // 0–100
    matchedSkills: string[];
    missingSkills: string[];
    aiExplanation: string;
  }[];
  failed: { jobId: string; reason: string }[];
}
```

**Internals:** combines rule-based scoring (skills overlap, salary fit, location/remote fit) with pgvector cosine similarity between `CandidateProfile.profileEmbedding` and `Job.jobEmbedding` (generating embeddings on first use if missing), per ADR-003 and ADR-010 in `architecture/DECISIONS.md`. The AI explanation is generated from the computed score + skill breakdown, not independently — it must not contradict the structured output (see `product/ACCEPTANCE_CRITERIA.md` AC 12.1).

---

## `updateSkillGaps`

Persists aggregated skill-gap recommendations for a user. Introduced to close a gap in the original design, where the Skill Gap Agent's persistence step was described but not given an explicit tool contract (see `architecture/DECISIONS.md` ADR-011).

**Input**
```ts
{
  userId: string;
  recommendations: {
    skillName: string;
    frequency: number;
    trendScore?: number;
    estimatedLift?: number;
  }[];
}
```

**Output**
```ts
{
  upserted: SkillGapRecommendation[];
}
```

**Internals:** upserts by `(userId, skillName)` — a re-run updates `frequency`/`trendScore`/`estimatedLift` for a skill already being tracked rather than creating duplicate rows. This tool does not compute the aggregation itself (that's the Skill Gap Agent's job, per `architecture/AGENT_DESIGN.md`); it only persists already-computed results, keeping the same "tools do IO, agents do reasoning" split used by every other tool in this registry.

---

## `getProfile`

Retrieves a user's structured candidate profile.

**Input**
```ts
{
  userId: string;
}
```

**Output**
```ts
{
  profile: CandidateProfile & { skills: UserSkill[] };
}
```

**Error modes:** returns `ok: false` with code `PROFILE_NOT_FOUND` if the user hasn't completed onboarding — callers (e.g. Profile Analysis Agent) should treat this as "skip this user's run," not a fatal error for the whole orchestration.

---

## `generateReport`

Compiles a structured summary and Excel export for a given period.

**Input**
```ts
{
  userId: string;
  type: "DAILY" | "WEEKLY";
  periodStart: string; // ISO date
  periodEnd: string;   // ISO date
}
```

**Output**
```ts
{
  reportId: string;
  summary: {
    newJobs: number;
    bestMatches: { jobId: string; title: string; company: string; matchScore: number }[];
    skillGaps: { skill: string; frequency: number }[];
    statusChanges: { jobId: string; from: string; to: string }[];
  };
  fileUrl?: string; // Excel export location, if persisted externally
}
```

**Guarantee:** always returns a valid report, even when all counts are zero (see `product/ACCEPTANCE_CRITERIA.md` AC 25.2) — this tool never returns `ok: false` purely because there was "nothing to report."

---

## `sendEmail`

Delivers a generated report via Resend.

**Input**
```ts
{
  userId: string;
  reportId: string;
}
```

**Output**
```ts
{
  delivered: boolean;
  providerMessageId?: string;
}
```

**Error modes:** delivery failure is returned as `ok: false, error.retryable: true` (transient) for the Notification Agent to retry once. Per AC 25.3, failure here must never roll back or delete the underlying `Report`.

---

## Adding a new tool

1. Define its Zod input/output schema in `packages/shared-types`
2. Implement it in `apps/mcp-server/src/tools/`
3. Register it in the MCP server's tool list (`apps/mcp-server/src/server.ts`)
4. Add it to the summary table in `mcp/MCP_SPEC.md`
5. Document it here, following the format above
6. Update `mcp/AGENT_TOOL_ACCESS.md` with which agent(s) may call it
