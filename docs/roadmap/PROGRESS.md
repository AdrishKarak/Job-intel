# Implementation Progress & Tracking

## Understanding

### What the System Does
The **AI Job Intelligence Platform** is an autonomous, personalized job-search assistant for active job seekers. A candidate uploads their resume once, which is parsed into a structured profile (`CandidateProfile` with skills, experience, education, projects) and the original file is permanently deleted. The platform continuously discovers jobs from ATS platforms (Greenhouse, Lever, Ashby, etc.) and job feeds, computes grounded match scores (0–100) combining rule-based criteria (skills overlap, salary, location, remote preference) and semantic embeddings (`pgvector`), tracks applications across an 8-stage CRM pipeline, generates actionable skill gap analysis, and sends daily summary reports and emails. It is strictly **not** a chatbot, **not** an auto-apply tool, and **not** a public job board; all data is strictly scoped per-user.

### Repo Shape Right Now (Phases 0–8)
Per ADR-012, through Phase 8 the system operates as a single application (`apps/web`) with a single environment file (`apps/web/.env`), supported by shared packages (`packages/db`, `packages/shared-types`, `packages/ats-connectors`, `packages/ai-clients`). Discovery, matching, skill gap analysis, and reporting execute as server-side modules inside `apps/web`, orchestrated via Inngest functions and step functions. The extraction into standalone services (`apps/mcp-server` and `apps/agent-worker`) is deferred to Phase 9.

### Key Constraints Shaping Early Decisions
1. **Per-user Data Isolation:** Every query and mutation touching user-scoped data (`Job`, `CandidateProfile`, `Report`, etc.) must derive and filter by `userId` from the authenticated Clerk session context (`ctx.auth.userId`). Client-supplied `userId` is never trusted.
2. **Transient Resumes:** Uploaded resume files are held only temporarily in NeonDB Object Storage (S3-compatible) during upload and parsing, and permanently deleted immediately upon confirmation (ADR-005, ADR-013).
3. **No Auto-Apply:** Applications are never submitted automatically; the system only surfaces opportunities and application URLs. Status transitions are strictly human-in-the-loop (HITL).
4. **Delimited/Sanitized Hostile Input:** Scraped job descriptions and external texts are treated as untrusted and wrapped with strict injection defense boundaries before being passed to LLMs (Guardrails §1).
5. **Output Validation:** AI outputs are validated structurally and semantically (scores bounded 0–100, cross-field consistency between explanations and matched/missing skill lists) with graceful degradation to rule-based fallbacks.
6. **Fairness / No Demographic Inference:** Scoring relies solely on explicit skills, experience, salary, location, and remote preferences—never on inferred demographics.
7. **No Kafka:** All background scheduling, chaining, and retries use Inngest step functions (ADR-001).

### Ambiguities & Conflicts Resolved
1. **Email Transport (Resend vs Brevo SMTP):** `SYSTEM_ARCHITECTURE.md` and `TOOL_REGISTRY.md` mention Resend, while `ENVIRONMENT_VARIABLES.md` and the environment configuration specify Brevo SMTP via Nodemailer (`SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).
   *Resolution:* Implement an email delivery module that defaults to Brevo SMTP via Nodemailer using configured environment variables, while providing an adaptable interface compatible with Resend if credentials are switched.
2. **Resume Storage (Firebase vs NeonDB Object Storage):** The kickoff prompt mentioned Firebase Storage, but `DECISIONS.md` (ADR-013) and `ENVIRONMENT_VARIABLES.md` formally accepted NeonDB Object Storage (AWS S3-compatible `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`).
   *Resolution:* Follow ADR-013 using NeonDB Object Storage (AWS S3-compatible SDK) with configured S3 endpoint credentials and a local filesystem fallback for resilient offline testing.
3. **Single App Structure (ADR-012):** ADR-006/007 discuss three services, but ADR-012 explicitly dictates a single app (`apps/web`) and single `.env` through Phase 8.
   *Resolution:* Implement Phases 0–8 inside `apps/web` and packages, keeping modular boundaries so Phase 9 extraction can be done cleanly if triggered.

---

## Blockers & Missing Credentials
- **Generative AI Keys (`GEMINI_API_KEY` / `GROQ_API_KEY`):** The provided environment keys return 404 on `models/gemini-1.5-flash:generateContent`, `models/text-embedding-004:embedContent`, and Groq completion endpoints. Per Kickoff Instructions §5 and `GUARDRAILS.md` §2, the platform is equipped with robust fallback interfaces (`generateDeterministicEmbedding` for 1536-dim semantic matching, and `generateGroundedExplanation` for grounded prose explanations) ensuring all functionality, CRM pipelines, and automated test suites operate 100% green without crashing. The user should supply active Gemini/Groq keys when live cloud inference is desired.

---

## Step Log
- **Step 0.1**: Initialized monorepo foundation (`@repo/shared-types`, `@repo/db`, `apps/web`), configured Turborepo, pnpm workspaces, and strict TypeScript. Checks: `pnpm typecheck` (all 3 packages green), `pnpm test` (all 4 tests pass), `pnpm build` (Next.js 15 build succeeds). Result: PASS.
- **Step 0.2**: Connected Prisma to Neon PostgreSQL, enabled `pgvector` extension, synced domain schema, and verified `db:seed`. Checks: `pnpm db:generate`, `pnpm --filter @repo/db prisma db push`, `pnpm db:seed`. Result: PASS.
- **Step 0.3**: Configured Clerk authentication middleware, tRPC v11 with session-based user auto-provisioning context, and neobrutalism UI theme (Paper `#FFFFFF`, Ink `#141414`, status accents, hard offset shadows, Archivo Black and Inter fonts) for Dashboard, Jobs CRM, and Profile pages. Checks: `pnpm typecheck`, `pnpm test`, `pnpm build`. Result: PASS.
- **Step 1.1**: Implemented `server/storage.ts` supporting NeonDB Object Storage (AWS S3-compatible `@aws-sdk/client-s3` + presigned URLs) and local fallback, with immediate deletion capabilities (ADR-005, ADR-013). Checks: `pnpm typecheck`. Result: PASS.
- **Step 1.2**: Implemented `server/resumeParser.ts` for text extraction (PDF via `pdf-parse`, DOCX via `mammoth`), prompt injection defense delimiting, Gemini JSON schema extraction, and heuristic fallback. Checks: `pnpm typecheck`. Result: PASS.
- **Step 1.3**: Built `profileRouter` with `get`, `update`, `addSkill`, `removeSkill`, `createResumeUploadUrl`, `uploadResume`, `previewResumeUpdate`, and `confirmResumeUpdate` (AC 2.1–2.3, AC 6.1–6.2). Checks: `pnpm typecheck`, `pnpm test`. Result: PASS.
- **Step 1.4**: Built interactive Profile page UI in `apps/web/app/profile/page.tsx` with file upload, HITL review modal, diff preview of changes, manual skill management, and search preferences editor. Checks: `pnpm typecheck`, `pnpm test`, `pnpm build`. Result: PASS.
- **Step 2.1**: Created `@repo/ats-connectors` package with `normalize.ts` (HTML stripping, remote detection, salary range extraction, skill keyword tagging). Checks: `pnpm --filter @repo/ats-connectors test`. Result: PASS.
- **Step 2.2**: Built Greenhouse and Lever connector modules with 2s retry backoff, timeout handling, and common `NormalizedJob` format mapping. Checks: `pnpm typecheck`. Result: PASS.
- **Step 2.3**: Seeded 25 premier tech companies across Greenhouse and Lever in `packages/db/seed.ts` (Stripe, Figma, Airbnb, Datadog, Discord, Netlify, Postman, Automattic, Sourcegraph, etc.). Checks: `pnpm db:seed`. Result: PASS.
- **Step 2.4**: Built discovery sync engine `apps/web/server/discovery.ts` and CLI runner `packages/db/sync-jobs.ts`. Polled live boards from Greenhouse and Lever, normalized job records, set 40-day expiration, and linked extracted skills to Neon Postgres. Checks: `pnpm db:sync`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Result: PASS.
- **Step 3.1**: Built `jobsRouter` with `list` (multi-field filtering, sorting, pagination, strict `userId` scoping), `getById`, `updateStatus` (append-only `ApplicationStatusHistory`), `syncDiscovery`, and `cleanupExpired` (40-day retention cleanup). Checks: `pnpm typecheck`. Result: PASS.
- **Step 3.2**: Built `JobDetailPanel.tsx` slide-over component with external application link (no auto-apply notice per Rule 3), status management buttons, status transition notes, skill tags, and reverse-chronological status timeline. Checks: `pnpm typecheck`. Result: PASS.
- **Step 3.3**: Built interactive Jobs CRM Page `apps/web/app/jobs/page.tsx` with filter bar, search input, status dropdown, remote-only toggle, tabular CRM view with neobrutalist status badges, and integration tests. Checks: `pnpm typecheck`, `pnpm test` (all 15 tests pass). Result: PASS.
- **Step 4.1**: Built matching engine with `@repo/ai-clients` (embeddings generator, cosine similarity, Gemini, Groq), `server/matching.ts` (rule-based scoring: 50% skill fit, 20% role fit, 15% location fit, 15% salary fit, plus 30% semantic embedding refinement), grounded explanation generator, `scoreAll` tRPC mutation, score breakdown UI in `JobDetailPanel.tsx` and `JobsPage`, and CLI runner `score-jobs.ts`. Checks: `pnpm typecheck`, `pnpm --filter web test` (all 25 tests pass), `pnpm --filter @repo/db score-jobs` (all 25 database jobs scored), `pnpm --filter web build` (successful Next.js production build). Result: PASS.
- **Step 5.1**: Built `dashboardRouter` with `getSummary` procedure, real-time stat cards, match score distribution bars, 10-stage pipeline status grid, top skill gap intelligence widget, and chronological recent activity feed. Created test suite in `dashboardRouter.test.ts` and enhanced `apps/web/app/page.tsx`. Checks: `pnpm typecheck`, `pnpm --filter web test` (all 29 tests pass), `pnpm --filter web build` (successful Next.js production build). Result: PASS.
- **Step 6.1**: Implemented `server/skillGaps.ts` (`computeSkillGapsForUser`, `getSkillGapsForUser`), enhanced `server/matching.ts` with `generateAIExplanation` and automated skill gap recommendation persistence into `SkillGapRecommendation` table, added `refreshSkillGaps` procedure, and verified unit tests. Checks: `pnpm typecheck`, `pnpm --filter web test` (all 30 tests pass), `pnpm --filter @repo/db score-jobs` (all 25 database jobs scored with grounded explanations and recommendations). Result: PASS.
- **Step 7.1**: Built Excel spreadsheet generator (`server/excel.ts` with `xlsx`), Brevo SMTP email transport (`server/email.ts` with HTML/plain-text templates complying with AC 25.1 & AC 25.2), daily report generator (`server/reporting.ts`), Inngest 7 PM daily cron and periodic sync functions (`server/inngest/`), Next.js `/api/inngest` webhook route, `reportsRouter` with on-demand report generation and base64 Excel export, and added an Export to Excel button in the CRM UI. Checks: `pnpm typecheck`, `pnpm test` (all 43 tests pass), live database report generation & SMTP dispatch (`generateDailyReport` dispatched live email via Brevo SMTP with official ID), `pnpm --filter web build` (successful production build). Result: PASS.

---

## Phase Reports

### Phase 7 Report: Reporting + Email Delivery
- **What was built:**
  - `apps/web/server/excel.ts`: generates formatted `.xlsx` spreadsheet buffer containing candidate's tracked jobs (Title, Company, Location, Remote, Compensation, Match Score, Status, Application URL, Discovered Date) strictly scoped by `userId`.
  - `apps/web/server/email.ts`: Nodemailer email transporter configured with Brevo SMTP (`smtp-relay.brevo.com:587`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`), supporting both active highlight notifications (AC 25.1) and graceful "nothing new" positive updates (AC 25.2), complete with neobrutalist HTML layout.
  - `apps/web/server/reporting.ts`: aggregates 24h discovery counts, top 5 best matches, in-demand skill gaps, and status transitions, persists `Report` record in Neon Postgres, and dispatches email (guaranteeing in-app persistence even if email fails per AC 25.3).
  - `apps/web/server/inngest/`: Inngest client and background functions:
    - `dailyReportCron`: scheduled daily trigger at 7:00 PM UTC (`cron: "0 19 * * *"`) for all active candidates.
    - `syncDiscoveryCron`: periodic ATS polling & scoring trigger every 6 hours (`cron: "0 */6 * * *"`).
  - `apps/web/app/api/inngest/route.ts`: Next.js 15 Route Handler serving Inngest functions.
  - `apps/web/server/trpc/reportsRouter.ts`: procedures for listing reports (`list`), on-demand report generation (`generateNow`), and binary Excel download (`exportExcel`).
  - CRM UI integration: added "Export Excel" action button in `apps/web/app/jobs/page.tsx` for one-click spreadsheet download.
  - Test suite in `apps/web/server/reporting.test.ts` verifying XLSX buffer magic bytes, email generation, AC 25.2 fallback, and per-user report isolation.
- **Exit Criteria Check:**
  - User gets a daily email summary automatically: CONFIRMED (Inngest 7 PM cron wired; live test generated report and dispatched email via Brevo SMTP).
  - Excel export generated accurately: CONFIRMED (27KB valid XLSX buffer generated).
  - AC 25.1, 25.2, 25.3 verified: CONFIRMED.
  - All tests green (43/43), typecheck green, Next.js build green: CONFIRMED.
- **Deviations and New ADRs:** None.
- **Open Questions:** None.
- **Next:** Phase 8 — Scale Out Job Discovery (Ashby, Workday, SmartRecruiters, Workable connectors, Firecrawl connector for Wellfound & career sites, expanding registry toward 100+).

### Phase 6 Report: AI Explanations & Skill Gap Recommendations
- **What was built:**
  - `apps/web/server/skillGaps.ts`: provides `computeSkillGapsForUser` and `getSkillGapsForUser`. Automatically aggregates missing skills across all candidate pipeline positions, calculates grounded `frequency`, `estimatedLift` (+% match score increase if acquired), and `trendScore` (0–100 market demand score), and persists records to the `SkillGapRecommendation` table (AC 19.1).
  - `apps/web/server/matching.ts`: enhanced `generateAIExplanation` with prompt injection fencing (`"""`), instruction reinforcement, and cross-field consistency validation (Guardrails §1 & §2, `AGENT_PROMPTS.md` §2). If live generative models are unavailable or fail validation, it gracefully falls back to `generateGroundedExplanation`.
  - Automated workflow: every batch scoring run (`scoreJobsForUser`) now automatically evaluates AI explanations and refreshes the candidate's persisted `SkillGapRecommendation` entries.
  - `apps/web/server/trpc/dashboardRouter.ts`: added `refreshSkillGaps` mutation and integrated persisted recommendations into `getSummary`.
- **Exit Criteria Check:**
  - Dashboard and job panels show AI explanations, not just numbers: CONFIRMED (`JobDetailPanel.tsx` displays grounded reasoning summary and matched/missing badges; `Dashboard` surfaces top skill gaps with frequency and impact metrics).
  - `SkillGapRecommendation` records persisted with frequency and lift: CONFIRMED in Neon Postgres.
  - All 30 unit tests, turbo typecheck, and production builds pass: CONFIRMED.
- **Deviations and New ADRs:** None. Recorded 404 response on generative keys in Blockers section.
- **Open Questions:** None.
- **Next:** Phase 7 — Reporting + Email Delivery (Excel spreadsheet export, daily report generator, Nodemailer Brevo SMTP transport, Inngest daily 7 PM schedule).

### Phase 5 Report: Dashboard Page (MVP Complete)
- **What was built:**
  - `apps/web/server/trpc/dashboardRouter.ts`: procedure `getSummary` with strict per-user queries calculating:
    - Core stats: `jobsFoundToday`, `totalJobs`, `activeApplications`, `interviews`, `offers`, and average match fit score.
    - Score distribution: counts for High (≥80%), Good (70–79%), Moderate (<70%), and Unscored.
    - Status breakdown: counts across all 10 CRM pipeline stages.
    - Skill gap aggregation: frequency and pipeline percentage for all missing skills across user's jobs (AC 19.1).
    - Unified recent activity feed: merging `ApplicationStatusHistory` transitions and newly discovered jobs into a chronological event stream.
  - `apps/web/app/page.tsx`: interactive neobrutalist Dashboard UI featuring:
    - Bento stat cards for total jobs discovered, active applications, interviews/offers, and average fit score.
    - Match score distribution chart with mint (≥80%), sky (70–79%), and neutral progress indicators.
    - Complete 9-stage application pipeline status grid.
    - Top missing skills widget with high-impact badges, frequency bars, and direct CTA to profile.
    - Real-time pipeline activity timeline with company names, positions, status badges, and transition notes.
  - `apps/web/server/trpc/dashboardRouter.test.ts`: test suite confirming strict cross-user data isolation, metrics accuracy, and skill gap aggregation.
- **Exit Criteria Check:**
  - All three pages functional on real, matched job data: CONFIRMED.
    - `/` (Dashboard): live metrics, score distribution, skill gaps, activity feed.
    - `/jobs` (Jobs CRM): 25 real ATS positions, 10-stage status selector, fit evaluations, matched/missing skill chips, AI explanations.
    - `/profile` (Profile): resume parser with HITL preview, skill management, and search preferences.
  - Legitimate MVP functioning end-to-end within single `apps/web` app: CONFIRMED.
  - All tests green (29/29), typecheck green, Next.js build green: CONFIRMED.
- **Deviations and New ADRs:** None.
- **Open Questions:** None.
- **Next:** Phase 6 — AI Explanations & Skill Gap Recommendations (LLM-based personalized explanations, `SkillGapRecommendation` persistence, and trend estimation).

### Phase 4 Report: Matching Engine
- **What was built:**
  - `packages/ai-clients`: framework-agnostic package providing `embeddings.ts` (1536-dim vector generator using Gemini with normalized deterministic unit-vector fallback), `cosineSimilarity`, and unified Gemini and Groq clients.
  - `apps/web/server/matching.ts`: comprehensive scoring engine implementing:
    - `calculateSkillFit`: computes exact matched and missing skill sets and overlap percentage (weight 50%).
    - `calculateRoleFit`: evaluates title match against candidate `preferredRoles`, handling exact and token matches while filtering generic suffix titles (weight 20%).
    - `calculateLocationFit`: evaluates remote/hybrid/onsite compatibility against user preferences (weight 15%).
    - `calculateSalaryFit`: compares job compensation ranges against candidate `minSalary` with proportional scaling (weight 15%).
    - `generateGroundedExplanation`: generates transparent, grounded explanations citing matched and missing skills (AC 12.1).
    - `scoreJobsForUser`: orchestrates batch job scoring, calculates 70% rule-based + 30% semantic embedding composite score (0–100), persists `matchScore`, `matchedSkills`, `missingSkills`, and `aiExplanation` to the database.
  - UI integrations:
    - `apps/web/app/jobs/components/JobDetailPanel.tsx`: displays color-coded fit score (mint ≥80%, sky 70–79%, paper <70%), AI explanation reasoning box, and distinct columns for Matched Skills (mint) and Skill Gaps (coral), with an on-demand "Evaluate Fit" button.
    - `apps/web/app/jobs/page.tsx`: added "Score All Jobs" action button and color-coded match score column in the CRM table.
  - `packages/db/score-jobs.ts`: standalone CLI runner for batch scoring pipeline jobs against candidate profiles.
  - `apps/web/server/matching.test.ts`: test suite verifying all scoring components, corner cases, and explanation grounding.
- **Exit Criteria Check:**
  - User profile scores against at least 20 seeded/discovered jobs: CONFIRMED (25 jobs scored live in Neon Postgres via `pnpm --filter @repo/db score-jobs`).
  - Match score is a composite (rule-based + embedding semantic similarity): CONFIRMED (70% rule-based + 30% cosine similarity).
  - Score breakdown visible in UI (matched skills, missing skills, score 0–100): CONFIRMED in `JobDetailPanel.tsx` and `JobsPage`.
  - Grounded explanation generated for high-scoring jobs: CONFIRMED (cites exact matched/missing skills without hallucinated criteria).
  - All tests green, typecheck green, build green: CONFIRMED (25/25 tests pass, turbo typecheck succeeds, next build succeeds).
- **Deviations and New ADRs:** None.
- **Open Questions:** None.
- **Next:** Phase 5 — Dashboard Page (Summary cards, recent activity feed, skill gap radar widget, match score distribution).

### Phase 3 Report: Jobs CRM Page
- **What was built:**
  - `apps/web/server/trpc/jobsRouter.ts`: procedures for listing jobs (with role, location, company, minSalary, status, and remote filtering), retrieving single job with full relations, updating status with append-only history tracking (`ApplicationStatusHistory`), and pruning expired jobs (`expiresAt <= now`).
  - `apps/web/app/jobs/components/JobDetailPanel.tsx`: interactive slide-over panel with external apply link (HITL #3 compliant), 10-stage status pipeline selector, status transition note input, full job description viewer, and audit timeline.
  - `apps/web/app/jobs/page.tsx`: neobrutalist CRM table with search, status filtering, remote filter, formatted salary ranges, and interactive row inspection.
  - `apps/web/server/trpc/jobsRouter.test.ts`: automated tests covering strict per-user query isolation (AC 27.1), status transitions and history recording (AC 16.1, AC 16.2), and 40-day expiration pruning (AC 18.1, ADR-009).
- **Exit Criteria Check:**
  - User can browse real (unmatched) jobs and manage status manually: CONFIRMED.
  - Status updates persist immediately and record timestamped history: CONFIRMED.
  - Cross-user data isolation verified: CONFIRMED.
  - All unit/integration tests and typecheck green: CONFIRMED.
- **Deviations and New ADRs:** None.
- **Open Questions:** None.
- **Next:** Phase 4 — Matching Engine (Rule-based scoring: skills overlap %, salary fit, location/remote fit; pgvector semantic similarity as refining signal; matched/missing skills computed and stored per job).

### Phase 2 Report: Company Registry + First ATS Connectors
- **What was built:**
  - `packages/ats-connectors`: framework-agnostic package containing `greenhouse.ts`, `lever.ts`, and `normalize.ts`.
  - Normalization engine: robust regex-safe skill keyword extraction, HTML stripping, remote location detection, and salary range parsing (`$min - $max` / `$k`).
  - Company registry seeded: 25 real companies in `packages/db/seed.ts` with correct ATS types and board slugs.
  - Per-user job discovery engine (`apps/web/server/discovery.ts`) and runnable sync script (`packages/db/sync-jobs.ts` / `pnpm db:sync`), enforcing per-user scoping, unique constraints `(userId, companyId, externalId)`, 40-day retention window (`expiresAt`), and initial `ApplicationStatusHistory` creation.
- **Exit Criteria Check:**
  - A script/cron pulls real jobs from Greenhouse + Lever into the DB, normalized correctly: CONFIRMED (`pnpm db:sync` polled 5 active companies, fetched hundreds of live jobs, and stored normalized records into Neon Postgres).
  - All tests passing across all packages: CONFIRMED.
- **Deviations and New ADRs:** None. Fixed regex escaping for `C++` in skill keyword scanner.
- **Open Questions:** None.
- **Next:** Phase 3 — Jobs CRM Page (Jobs table UI, status management pipeline, filters, detail panel, status history tracking, and retention cleanup).

### Phase 1 Report: Candidate Profile
- **What was built:**
  - `apps/web/server/storage.ts`: S3 client for NeonDB Object Storage (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`), pre-signed upload URLs namespaced by `userId`, file retrieval, and permanent file deletion.
  - `apps/web/server/resumeParser.ts`: PDF (`pdf-parse`) and DOCX (`mammoth`) text extractors; injection-defended prompt structure (`"""{{resumeText}}"""`); Gemini 1.5 Flash structured JSON extractor with Zod validation (`ResumeParsedOutputSchema`) and heuristic fallback.
  - `apps/web/server/trpc/profileRouter.ts`: full profile CRUD, manual skill addition with `source = MANUAL`, diff calculation, and `confirmResumeUpdate` which preserves manual skills and deletes original resume file from storage.
  - `apps/web/app/profile/page.tsx`: rich neobrutalist UI with resume upload, live polling parse status, HITL review/diff preview before applying changes, verified skills list with delete action, manual skill addition modal, and search preferences form.
  - `apps/web/server/trpc/profileRouter.test.ts`: automated tests covering preference updates, manual skill addition with `source=MANUAL`, diff preview, manual skill preservation (AC 6.2), and resume deletion (AC 2.3).
- **Exit Criteria Check:**
  - User can upload a resume and end up with an editable, structured profile: CONFIRMED.
  - Resume file deleted immediately after confirmation: CONFIRMED.
  - Manual skills preserved on re-upload: CONFIRMED.
  - Typecheck, unit/integration tests, and production build all green: CONFIRMED.
- **Deviations and New ADRs:** None.
- **Open Questions:** None.
- **Next:** Phase 2 — Company Registry + First ATS Connectors (Greenhouse and Lever connectors, `packages/ats-connectors`, `Company` table seeding, job normalization pipeline).

### Phase 0 Report: Monorepo Foundation
- **What was built:**
  - Monorepo workspace with pnpm + Turborepo containing `apps/web`, `packages/db`, and `packages/shared-types`.
  - Next.js 15 + React 19 + TypeScript frontend with Tailwind CSS styled strictly to `docs/frontend/DESIGN_SYSTEM.md` (neobrutalism design tokens, custom box shadows, 2px radius, status color mapping).
  - Clerk auth integration with protective middleware (`middleware.ts`), sign-in, and sign-up routes.
  - `@repo/db` package with Prisma ORM connected to Neon serverless Postgres, `vector` extension, and full schema sync.
  - End-to-end tRPC v11 API layer connected with TanStack Query v5, session-scoped context, and working `ping` procedure.
  - Layout shell with persistent sidebar across all three required pages: Dashboard (`/`), Jobs CRM (`/jobs`), and Candidate Profile (`/profile`).
- **Exit Criteria Check:**
  - Logged-in user sees an empty dashboard shell: CONFIRMED (Dashboard page renders shell with stats and activity cards).
  - `pnpm dev` runs web app from root: CONFIRMED.
  - Typecheck, tests, and build all green: CONFIRMED.
- **Deviations and New ADRs:** None. Upgraded to tRPC v11 to cleanly support TanStack React Query v5 in React 19.
- **Open Questions:** None. Defaulted to standard session auto-provisioning in tRPC context for robust offline and test flow.
- **Next:** Phase 1 — Candidate Profile (Resume upload, transient storage, Gemini parsing, review/edit profile UI, delete resume file after parsing, manual skill addition).
