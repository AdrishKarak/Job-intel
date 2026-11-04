# Architecture Decisions

Lightweight ADR log. Each entry: Status, Context, Decision, Consequences. New decisions get appended, not inserted — this is a history, not a living spec.

---

## ADR-001: Reject Kafka in favor of Inngest step functions

**Status:** Accepted

**Context:** The original spec called for Kafka topics (`job-discovered`, `job-matched`, `report-generated`) to drive event-based processing between discovery, matching, and reporting.

**Decision:** Use Inngest step functions instead. Inngest is already required for scheduling (the daily report trigger), so extending it to cover the discovery → matching → reporting → notification chain adds zero new infrastructure.

**Consequences:** Simpler ops (no broker to run/monitor), built-in retries and step observability. Tradeoff: less suited to very high-throughput, many-consumer event fan-out — acceptable because this system is single-user-scoped, daily-batch, not high-frequency streaming. Revisit only if concrete multi-tenant scale numbers justify it.

**Alternatives considered:** Postgres-backed queue (`graphile-worker`/`pg-boss`), Upstash QStash, BullMQ + Redis.

---

## ADR-002: Per-user job storage, not a global job pool

**Status:** Accepted

**Context:** The same job posting could be discovered for multiple users. A global `Job` table with a separate per-user "interest" join table would reduce duplication.

**Decision:** Store `Job` rows scoped directly to `userId`, accepting duplication across users.

**Consequences:** Simpler queries (no join needed for the common case of "show me my jobs with my match score and my status"), simpler retention logic (delete by `expiresAt` per row, no orphan-checking against other users' references). Tradeoff: redundant storage/compute if the user base grows and many users target the same companies — acceptable at current scale; revisit if storage/compute cost becomes material.

---

## ADR-003: pgvector similarity as a matching signal, not a full RAG pipeline

**Status:** Accepted

**Context:** The original spec called for a "RAG system" for semantic job matching.

**Decision:** Generate one embedding per candidate profile and one per job description, store them via `pgvector` on the existing Postgres database, and use cosine similarity as one input into the overall match score alongside rule-based signals (skills overlap, salary fit, location fit).

**Consequences:** No separate vector database, no chunking/retrieval-ranking infrastructure needed. Tradeoff: this doesn't generalize to retrieval over large unstructured corpora — if a future feature needs that (e.g. searching across full interview transcripts), a proper RAG layer would need to be added then, not now.

---

## ADR-004: Build ATS connectors in order of API friendliness

**Status:** Accepted

**Context:** Six ATS platforms are targeted (Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Workable), plus Firecrawl/Puppeteer for non-ATS sources.

**Decision:** Build Greenhouse and Lever first (predictable public JSON APIs), then Ashby, then Workday/SmartRecruiters/Workable, then Firecrawl, with Puppeteer strictly as a last-resort fallback.

**Consequences:** Validates the normalization pipeline early against the easiest sources, so structural bugs are caught before tackling harder integrations. Company registry coverage will be uneven early on — that's expected and acceptable per the phased roadmap.

---

## ADR-005: Delete the resume file after parsing; keep only structured data

**Status:** Accepted (from original spec, recorded here for traceability)

**Context:** Storing raw resume files indefinitely is a privacy liability and isn't needed once structured extraction succeeds.

**Decision:** Resume files are held only transiently (upload → parse) and deleted immediately after. Only the structured `CandidateProfile` fields persist.

**Consequences:** Reduced privacy/compliance surface area. Tradeoff: if extraction is imperfect, there's no original file to re-parse against later — re-extraction requires the user to re-upload. Accepted as a reasonable privacy/convenience tradeoff; if this proves painful in practice, consider a short-lived (e.g. 24-hour) encrypted retention window instead of immediate deletion.

---

## ADR-006: MCP server as a separate long-running Node service

**Status:** Accepted

**Context:** MCP tools could be implemented as serverless route handlers inside `apps/web`, or as a standalone persistent service.

**Decision:** Run `apps/mcp-server` as its own long-running Node process, separate from `apps/web`.

**Consequences:** Avoids serverless cold-start and timeout constraints for potentially long operations (multi-company discovery crawls, Puppeteer sessions). Requires a hosting target that supports persistent processes (not pure Vercel serverless) — see `operations/DEPLOYMENT_ARCHITECTURE.md`. Also cleanly enforces the "agents never touch external systems directly" boundary at a process/network level, not just a code-organization convention.

---

## ADR-007: Monorepo with pnpm + Turborepo, three apps

**Status:** Accepted

**Context:** The system has three distinct runtime concerns (web UI + simple API, MCP tool server, agent orchestration) plus shared code (DB schema, ATS connectors, AI client wrappers, shared types).

**Decision:** Single monorepo, `apps/web` + `apps/mcp-server` + `apps/agent-worker`, with shared logic in `packages/*`, managed with pnpm workspaces and Turborepo for task orchestration/caching.

**Consequences:** Shared types and the Prisma client stay in sync across apps automatically. Slightly more setup complexity than a single Next.js app, justified by the genuinely different deployment/runtime needs of each service (see ADR-006).

---

## ADR-008: Agents only access the system through MCP tools

**Status:** Accepted (from original spec, recorded here for traceability)

**Context:** Without a boundary, agent code could end up calling the database, ATS APIs, or AI providers directly, making the orchestration layer hard to test and reason about independently of implementation details.

**Decision:** `apps/agent-worker` has no database client, no ATS connector imports, and no direct AI provider SDK usage. Every side effect goes through an MCP tool call to `apps/mcp-server`.

**Consequences:** Agent logic can be tested by mocking the MCP client. Tool implementations can change (e.g. swap Puppeteer for a different scraping approach) without touching agent code. Slight overhead: every agent action is a network call rather than an in-process function call.

---

## ADR-009: 40-day job retention window

**Status:** Accepted (from original spec, recorded here for traceability)

**Context:** Job postings age out; keeping them indefinitely bloats the per-user `Job` table without ongoing value.

**Decision:** `Job.expiresAt` is set to `discoveredAt + 40 days`; a scheduled cleanup job deletes expired rows (cascading to `JobSkill` and `ApplicationStatusHistory`).

**Consequences:** Bounded table growth. Tradeoff: a user's historical view of "everything I was ever matched with" is lost after 40 days — acceptable since `Report` snapshots preserve point-in-time summaries independently.

---

## ADR-010: Rule-based scoring first, embeddings as a refining signal

**Status:** Accepted

**Context:** Match scoring could be built embeddings-first or rules-first.

**Decision:** Implement rule-based scoring (skills overlap %, salary fit, location/remote fit) first, since it's simple, explainable, and immediately useful. Add embedding-based semantic similarity as an additional input once the rule-based path is validated (per `roadmap/TASK_BREAKDOWN.md` Phase 4).

**Consequences:** Faster path to a usable match score; embeddings improve recall for cases where skill/keyword overlap alone misses genuinely relevant jobs (e.g. "built RAG systems" matching a job asking for "search systems experience"). The final score formula (how rule-based and semantic signals combine) is left as an implementation detail of `scoreJobs` — see `mcp/TOOL_REGISTRY.md`.

---

## ADR-011: Add a dedicated `updateSkillGaps` tool

**Status:** Accepted

**Context:** The Skill Gap Agent's design (`architecture/AGENT_DESIGN.md`) always said it "produces/updates `SkillGapRecommendation` records via an MCP tool call," but no such tool existed in `mcp/TOOL_REGISTRY.md` — the agent had no actual way to persist its output. This was caught during a documentation consistency review, not during implementation, which is exactly when it's cheap to fix.

**Decision:** Add `updateSkillGaps(userId, recommendations)` as a sixth MCP tool, upserting by `(userId, skillName)`.

**Consequences:** Closes the gap; keeps the Skill Gap Agent within the "agents only act through MCP tools" boundary (ADR-008) instead of needing an exception. Precedent: whenever an agent is described as producing a durable side effect, that side effect should be traceable to a named tool in `mcp/TOOL_REGISTRY.md` — treat "via an MCP tool call" without a name as an incomplete spec, not an implementation detail to fill in later.

---

## ADR-012: Single `.env` (single app) until Phase 9

**Status:** Accepted. Supersedes the per-app env layout implied by ADR-006/ADR-007 for Phases 0–8 only.

**Context:** The docs described three services, each with its own `.env`, but `roadmap/TASK_BREAKDOWN.md` does not create `apps/mcp-server` or `apps/agent-worker` until Phase 9. Maintaining three env files (and two shared tokens) for services that don't exist yet is pure overhead, and the project owner wanted the simpler Next.js-style setup.

**Decision:** Through Phase 8 there is exactly one `apps/web/.env` (template: `apps/web/.env.example`). Discovery, matching, and reporting run as server-side modules inside `apps/web`, called from Inngest functions. ADR-006 and ADR-007 still describe the target architecture; they take effect at Phase 9, not before.

**Consequences:** One place to configure; the `MCP_SERVER_TOKEN` and `AGENT_WORKER_TOKEN` shared secrets don't exist yet. Tradeoffs: (1) every secret, including AI and job-API keys, lives in the web app's environment, so the blast-radius argument for per-service keys (`engineering/SECURITY_REQUIREMENTS.md`) is deferred to Phase 9; (2) Prisma commands run from `packages/db` need `dotenv-cli` to read `apps/web/.env` (`SETUP.md`); (3) long-running work (multi-company crawls, Playwright/Puppeteer fallback) must fit within serverless step timeouts via Inngest step functions, and is the most likely trigger for pulling the Phase 9 split forward. When it happens, follow the split table in `api/ENVIRONMENT_VARIABLES.md`.

---

## ADR-013: NeonDB Object Storage for resumes; no Sentry

**Status:** Accepted

**Context:** The docs assumed Vercel Blob for transient resume storage and Sentry for error tracking. The project owner chose Firebase Storage for files and no Sentry, then subsequently switched to NeonDB Object Storage (AWS S3-compatible) to consolidate infrastructure under a single Neon project and avoid a Google Cloud dependency.

**Decision:**
1. Resume files go to a **private NeonDB Object Storage bucket** (AWS S3-compatible), accessed only server-side using `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` (install: `npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner dotenv`). Uploads use server-issued pre-signed PUT URLs; the bucket has no public-read ACL; object paths are namespaced by `userId` and chosen server-side; a lifecycle/expiry rule auto-deletes objects older than one day as a backstop. This keeps ADR-005 (transient resume files) intact.
2. **No Sentry.** Observability is structured JSON logs, the Inngest run dashboard, and an `onFailure` handler on every Inngest function (`operations/OBSERVABILITY.md`).

**Consequences:**
- *NeonDB Object Storage:* keeps all infrastructure (Postgres + pgvector + object storage) inside a single Neon project. Five env vars (`AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `STORAGE_BUCKET_NAME`) replace the four Firebase vars. No Google Cloud dependency, no service-account JSON, no newline-escaping quirks. The AWS SDK is well-documented and the S3 pre-signed URL pattern is widely understood.
- *No Sentry:* uncaught exceptions in route handlers exist only in host logs, whose retention is limited, and nothing pushes an alert by itself, groups errors, or tracks releases. Acceptable for a small single-owner project through Phase 8, mitigated by the daily health-summary email. Revisit at Phase 9, when two headless services with no UI exist. Re-adding a tracker later is a small change (one SDK, two env vars).

---

## ADR-014: Multi-key pooling, Scrape.do proxy engine, and 18:30 UTC report schedule with Excel attachment

**Status:** Accepted

**Context:**
1. Third-party free tiers (Gemini token/RPM quotas, Firecrawl scrape credit limits) hit rate limits (HTTP 429) and credit exhaustion (HTTP 402) during intensive discovery crawls and resume parsing.
2. Certain enterprise career pages deploy aggressive anti-bot protections that block direct scraping.
3. Users requested the daily intelligence email dispatch at 6:30 PM UTC (18:30 UTC) with their complete tracked job inventory attached directly as an Excel spreadsheet (`.xlsx`).

**Decision:**
1. **Gemini & Groq Key Pooling:** Implement an active `ApiKeyPool` (`packages/ai-clients/src/keyPool.ts`) that distributes load via round-robin across `GEMINI_API_KEY` and `GEMINI_API_KEY2` (as well as `GROQ_API_KEY` and `GROQ_API_KEY2`). When a 429 or `RESOURCE_EXHAUSTED` error is detected, the key is quarantined for 5 minutes and the call automatically fails over to the backup key.
2. **Multi-Engine Web Crawler Pool:** Implement `CrawlerPool` (`packages/ats-connectors/src/crawlerPool.ts`) with a structured failover sequence:
   - Firecrawl Key 1 (`FIRECRAWL_API_KEY`)
   - Firecrawl Key 2 (`FIRECRAWL_API_KEY2` on 429 or 402 quota exhaustion)
   - Scrape.do Residential Proxy (`SCRAPEDO_API_KEY` for anti-bot / Cloudflare bypass)
   - Direct HTTP fetch with custom User-Agent
   - Safe heuristic fallback
3. **Daily Schedule & Attachment:** Inngest's `dailyReportCron` triggers at 18:30 UTC (`cron: "30 18 * * *"`). `generateJobsExcel()` generates the binary `.xlsx` buffer containing the candidate's complete tracked jobs (with salary LPA, match score, and clickable application links), which is attached directly to the outgoing email via Nodemailer Brevo SMTP transport.

**Consequences:**
- Eliminates single points of failure on API quota limits; provides automatic failover without user disruption.
- High crawl success rate across complex enterprise career sites using Scrape.do proxy.
- Users receive a comprehensive offline-ready Excel spreadsheet in their inbox daily at 6:30 PM UTC.
