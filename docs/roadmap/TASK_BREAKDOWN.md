# Task Breakdown — Phased Build Plan

This supersedes the original single-app roadmap now that the project is structured as a monorepo (`apps/web`, `apps/mcp-server`, `apps/agent-worker`, `packages/*` — see `docs/PROJECT_STRUCTURE.md`). Same guiding principle as before: **ship a working vertical slice before adding orchestration complexity.** Agents, LangGraph, and MCP formalize logic that should already work — build them once there's a working pipeline to wrap, not before.

---

## Phase 0 — Monorepo Foundation (2–4 days)

- pnpm + Turborepo workspace scaffold: `apps/web`, `packages/db`, `packages/shared-types` (the other two apps come in later phases, once there's logic for them to hold)
- `apps/web`: Next.js 15 + React 19 + TypeScript, Tailwind + shadcn/ui, base layout for the 3 pages
- Clerk auth wired in
- `packages/db`: Prisma schema connected to Neon, `pgvector` extension enabled, initial migration run
- tRPC + TanStack Query wired end-to-end with one dummy `ping` procedure

**Exit criteria:** logged-in user sees an empty dashboard shell; `pnpm dev` runs the web app from the monorepo root.

---

## Phase 1 — Candidate Profile (3–5 days)

- Resume upload → temp storage → parse (direct call to Gemini from `apps/web` for now is fine at this stage — no need to stand up `apps/mcp-server` yet just for this one call; it moves behind MCP in Phase 9)
- `CandidateProfile` + `Skill` + `UserSkill` tables populated from parse
- Profile page: review/edit extracted data
- Delete resume file after parsing (ADR-005)
- Manual "Add Skill" flow

**Exit criteria:** user can upload a resume and end up with an editable, structured profile.

---

## Phase 2 — Company Registry + First ATS Connectors (3–5 days)

- `packages/ats-connectors` created; build Greenhouse and Lever first (predictable public JSON APIs — see ADR-004)
- `Company` table seeded with 20–30 companies
- Job normalization into the common `Job` shape
- This logic can still live in `apps/web` server code temporarily, or start directly in a minimal `apps/mcp-server` if you'd rather establish that service boundary early — either is fine; the important thing is `packages/ats-connectors` stays framework-agnostic so it doesn't matter which app calls it yet

**Exit criteria:** a script/cron pulls real jobs from Greenhouse + Lever into the DB, normalized correctly.

---

## Phase 3 — Jobs CRM Page (3–4 days)

- Jobs table UI, filters, detail panel, status updates (writes `ApplicationStatusHistory`)
- Retention: `expiresAt` + cleanup job

**Exit criteria:** user can browse real (unmatched) jobs and manage status manually.

---

## Phase 4 — Matching Engine (5–7 days)

- Rule-based scoring first (skills overlap, salary fit, location/remote fit) — ADR-010
- Add pgvector embeddings as a refining signal once rule-based scoring is validated
- Matched/missing skills computed and stored per job

**Exit criteria:** every job shows a match score and skills breakdown grounded in real profile data.

---

## Phase 5 — Dashboard Page (2–3 days)

- Overview cards, charts, skill gap widget (static aggregation is fine here — no dedicated agent needed yet), activity feed

**Exit criteria:** all three pages functional on real, matched job data. **This is a legitimate MVP**, still running as a single `apps/web` deployment with `packages/ats-connectors` and matching logic called from its server code.

---

## Phase 6 — AI Explanations + Skill Gap Recommendations (3–4 days)

- Match explanation generation (see `agents/AGENT_PROMPTS.md`)
- Skill gap aggregation logic, `SkillGapRecommendation` records

**Exit criteria:** dashboard and job panels show AI explanations, not just numbers.

---

## Phase 7 — Reporting + Email (3–4 days)

- Excel export, daily report generator, Resend integration
- Inngest introduced here for scheduling (the 7 PM daily trigger)

**Exit criteria:** user gets a daily email summary automatically.

---

## Phase 8 — Scale Out Job Discovery (5–8 days, ongoing)

- Add Ashby, Workday, SmartRecruiters, Workable connectors
- Add Firecrawl for Wellfound + custom sites; Puppeteer strictly as fallback
- Grow company registry toward 100–150

**Exit criteria:** broad coverage across ATS types and non-ATS sources.

---

## Phase 9 — Extract `apps/mcp-server` and `apps/agent-worker` (5–7 days)

**This is the point where the monorepo's full three-service shape comes into existence** — up to now, everything AI/discovery-related could reasonably live inside `apps/web`'s server code, calling `packages/ats-connectors` and `packages/ai-clients` directly. Now:

- Stand up `apps/mcp-server` as a long-running Node service (ADR-006); move discovery, matching, skill-gap persistence, report generation, and email sending into it as the six MCP tools (`mcp/TOOL_REGISTRY.md`)
- Stand up `apps/agent-worker`; implement the LangGraph state graph (`architecture/AGENT_DESIGN.md`) wrapping the now-proven logic
- `apps/web` stops calling discovery/matching/AI logic directly — it triggers runs via Inngest → `apps/agent-worker` instead
- Set up the shared-secret auth between `apps/agent-worker` and `apps/mcp-server` (`mcp/MCP_SPEC.md`)

**Exit criteria:** same user-visible behavior as before, now properly service-separated and agent-orchestrated.

---

## Phase 10 — Event-Driven Processing — only if scale demands it

Per ADR-001, Kafka is explicitly not planned. If real concurrency/scale pain emerges, extend Inngest step functions further before considering anything heavier — see `architecture/DECISIONS.md`.

---

## Phase 11 — Hardening (ongoing)

- Structured logging with a shared `runId` across every service, an `onFailure` handler on every Inngest function, and the daily health-summary email (`operations/OBSERVABILITY.md`)
- Zod validation audit across every external boundary
- Security review per `engineering/SECURITY_REQUIREMENTS.md`
- Rate limiting per `api/RATE_LIMITS.md`

---

## Suggested sequencing summary

| Priority | Phases | Why |
|---|---|---|
| **Must build first** | 0–5 | Working 3-page product, single-app simplicity |
| **High value, moderate effort** | 6–7 | Makes the product feel intelligent and hands-off |
| **Grows coverage** | 8 | Incremental, company-by-company |
| **Structural refactor** | 9 | Extracts the multi-service architecture once there's proven logic to move |
| **Only if needed** | 10 | Validate real scale need before adding anything Kafka-like |
| **Continuous** | 11 | Ongoing, not a discrete milestone |
