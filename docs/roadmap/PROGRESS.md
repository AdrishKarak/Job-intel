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
- None currently blocking; live keys for Clerk, Neon Postgres, Gemini, Groq, Firecrawl, Brevo SMTP, Inngest, and Neon Object Storage are present in root `.env.example`.

---

## Step Log
- **Step 0.1**: Initialized monorepo foundation (`@repo/shared-types`, `@repo/db`, `apps/web`), configured Turborepo, pnpm workspaces, and strict TypeScript. Checks: `pnpm typecheck` (all 3 packages green), `pnpm test` (all 4 tests pass), `pnpm build` (Next.js 15 build succeeds). Result: PASS.
- **Step 0.2**: Connected Prisma to Neon PostgreSQL, enabled `pgvector` extension, synced domain schema, and verified `db:seed`. Checks: `pnpm db:generate`, `pnpm --filter @repo/db prisma db push`, `pnpm db:seed`. Result: PASS.
- **Step 0.3**: Configured Clerk authentication middleware, tRPC v11 with session-based user auto-provisioning context, and neobrutalism UI theme (Paper `#FFFFFF`, Ink `#141414`, status accents, hard offset shadows, Archivo Black and Inter fonts) for Dashboard, Jobs CRM, and Profile pages. Checks: `pnpm typecheck`, `pnpm test`, `pnpm build`. Result: PASS.

---

## Phase Reports

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
