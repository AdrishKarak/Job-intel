# Codebase Architecture, Dataflow & Implementation Guide

This document is a comprehensive educational reference for the AI Job Intelligence Platform. It explains how data flows through the application, provides a file-by-file breakdown of responsibilities and dependencies, and details the exact rationale behind critical backend code implementations.

---

## Table of Contents

- [1. System Mental Model & Architectural Principles](#1-system-mental-model--architectural-principles)
- [2. End-to-End Dataflow Walkthroughs](#2-end-to-end-dataflow-walkthroughs)
  - [Flow 1: Authentication, Context Creation & User Auto-Provisioning](#flow-1-authentication-context-creation--user-auto-provisioning)
  - [Flow 2: Resume Ingestion, AI Parsing & Profile Formation](#flow-2-resume-ingestion-ai-parsing--profile-formation)
  - [Flow 3: ATS Discovery, Normalization & Deduplication](#flow-3-ats-discovery-normalization--deduplication)
  - [Flow 4: Deterministic 3-Stage Filtration Pipeline](#flow-4-deterministic-3-stage-filtration-pipeline)
  - [Flow 5: Hybrid Scoring & Grounded AI Explanations](#flow-5-hybrid-scoring--grounded-ai-explanations)
  - [Flow 6: Skill Gap Analysis & Recommendation Lifecycle](#flow-6-skill-gap-analysis--recommendation-lifecycle)
  - [Flow 7: Daily Reporting, Excel Export & Email Delivery](#flow-7-daily-reporting-excel-export--email-delivery)
- [3. Complete File-by-File Breakdown & Interconnection Map](#3-complete-file-by-file-breakdown--interconnection-map)
  - [3.1 Monorepo Root & Configuration](#31-monorepo-root--configuration)
  - [3.2 Shared Types Package (`packages/shared-types`)](#32-shared-types-package-packagesshared-types)
  - [3.3 Database Package (`packages/db`)](#33-database-package-packagesdb)
  - [3.4 AI Clients Package (`packages/ai-clients`)](#34-ai-clients-package-packagesai-clients)
  - [3.5 ATS Connectors Package (`packages/ats-connectors`)](#35-ats-connectors-package-packagesats-connectors)
  - [3.6 Web Application Backend (`apps/web/server`)](#36-web-application-backend-appswebserver)
  - [3.7 Web Application Frontend & Routing (`apps/web/app`, `apps/web/components`, `apps/web/lib`)](#37-web-application-frontend--routing-appswebapp-appswebcomponents-appsweblib)
- [4. Deep Backend Code Annotations ("Why We Wrote This Code")](#4-deep-backend-code-annotations-why-we-wrote-this-code)
  - [Case 1: User Context Caching & Auto-Provisioning in `context.ts`](#case-1-user-context-caching--auto-provisioning-in-contextts)
  - [Case 2: Deterministic Seniority & Regex Extraction in `jobFilterEngine.ts`](#case-2-deterministic-seniority--regex-extraction-in-jobfilterenginets)
  - [Case 3: Hybrid Score Blending & Grounded Guardrails in `matching.ts`](#case-3-hybrid-score-blending--grounded-guardrails-in-matchingts)
  - [Case 4: Serverless Prisma Query Engine Copying in `copy-engine.js`](#case-4-serverless-prisma-query-engine-copying-in-copy-enginejs)
  - [Case 5: Multi-Tenant Query Isolation across tRPC Routers](#case-5-multi-tenant-query-isolation-across-trpc-routers)

---

## 1. System Mental Model & Architectural Principles

To understand this codebase, keep four fundamental design principles in mind:

1. **Deterministic Filtration Before Probabilistic Inference**:
   LLMs and vector calculations are computationally expensive and non-deterministic. The platform never asks an LLM or runs cosine similarity on a job posting until that job has passed three strict deterministic filters: Experience, Location, and Role Alignment.

2. **Per-User Scoped Data Isolation**:
   Every database query is tenant-scoped to the authenticated user ID (`ctx.userId`). Even though jobs originate from public company boards, each user has their own tracked state (`DISCOVERED`, `SAVED`, `APPLIED`, etc.), match score, notes, and 40-day expiration window.

3. **End-to-End Type Safety Without Code Generation**:
   Using tRPC 11 and TypeScript project references, modifying an API input or return schema in `apps/web/server` instantly triggers compile-time verification across the client pages in `apps/web/app`.

4. **Graceful Degradation Across All External Dependencies**:
   If Gemini is unavailable, the system falls back to Groq. If Groq is unavailable, the system falls back to regex-based heuristic parsing. If SMTP is unconfigured, emails log gracefully to stdout. If vector embeddings fail, rule-based scoring acts as the baseline. The user is never blocked by a third-party service outage.

---

## 2. End-to-End Dataflow Walkthroughs

### Flow 1: Authentication, Context Creation & User Auto-Provisioning

```
Browser Client Request
       |
       v
Next.js Edge Middleware (`middleware.ts`)
       | (Verifies Clerk session token)
       v
tRPC HTTP Handler (`/api/trpc/[trpc]/route.ts`)
       |
       v
Context Factory (`createTRPCContext` in `apps/web/server/trpc/context.ts`)
       |
       +---> Check in-memory user cache (`userCache` Map, 60s TTL)
       |     |
       |     +--> Cache Hit: Return cached user model
       |     +--> Cache Miss: Query PostgreSQL `prisma.user.findUnique({ clerkId })`
       |
       +---> If user not in DB:
       |     +--> Fetch email & name from Clerk API (`currentUser()`)
       |     +--> Check if email exists in DB (re-link account)
       |     +--> Upsert new user record in PostgreSQL
       |
       v
Procedure Middleware (`protectedProcedure` in `apps/web/server/trpc/trpc.ts`)
       | (Ensures session.userId exists and ctx.user is non-null)
       v
tRPC Router Execution (`jobsRouter`, `dashboardRouter`, etc.)
```

1. **Token Interception**: Every incoming HTTP request to `/api/trpc/*` passes through the Clerk middleware, which decodes the JWT and populates auth claims.
2. **Context Instantiation**: `createTRPCContext()` runs for every tRPC batch. To eliminate database latency spikes on parallel queries, it checks an in-memory `userCache` (60-second TTL).
3. **Automatic Provisioning**: If a user signs in for the first time, webhooks may experience delays. To ensure the application never throws a 500 or 401 error, `createTRPCContext` immediately queries Clerk's REST API for the user's primary email and creates or re-links the `User` record in Neon PostgreSQL.
4. **Procedure Authorization**: `protectedProcedure` validates that `ctx.auth.userId` and `ctx.user` are valid. If either fails, it throws a typed `TRPCError` with code `UNAUTHORIZED` or `INTERNAL_SERVER_ERROR`.

---

### Flow 2: Resume Ingestion, AI Parsing & Profile Formation

```
Candidate Uploads PDF/DOCX
       |
       v
API Endpoint (`/api/upload-resume-direct` or `profile.parseResume`)
       |
       v
Buffer Extraction (`extractTextFromBuffer` in `resumeParser.ts`)
       |
       +---> PDF: `pdf-parse` extracts clean text stream
       +---> DOCX: `mammoth.extractRawText` reads document body
       +---> Fallback: UTF-8 sanitized string extraction
       |
       v
AI Extraction Pipeline
       |
       +---> Primary: Google Gemini (`gemini-2.0-flash` or `gemini-1.5-flash`)
       |     Prompt instructs strict JSON conforming to `ResumeParsedOutputSchema`
       |
       +---> Secondary Fallback: Groq Cloud (`llama-3.3-70b-versatile`)
       |
       +---> Tertiary Fallback: `heuristicParse()` using regex keyword dictionary
       |
       v
Schema Validation (`ResumeParsedOutputSchema.safeParse(json)`)
       |
       v
Database Persistence (`packages/db`)
       |
       +---> Upsert `CandidateProfile` with structured summaries
       +---> Upsert `Skill` and link `UserSkill` records
       +---> Generate 1536-dimension profile embedding via `getEmbedding()`
```

1. **Multi-Format Extraction**: The raw file buffer is converted to clean text via `pdf-parse` or `mammoth`. Control characters are sanitized.
2. **Strict Schema Prompting**: The text is sent to Gemini with temperature 0.1 and strict JSON mode. The prompt enforces explicit JSON output matching the Zod contract (`experienceYears`, `skills`, `preferredRoles`, `education`, `projects`).
3. **Validation & Normalization**: The LLM output is parsed through `ResumeParsedOutputSchema`. If any field is malformed, defaults are applied.
4. **Vector Generation**: A composite profile string (`preferredRoles + skills + professionalSummary`) is passed to the embedding model (`text-embedding-004` or deterministic hash fallback), generating a 1536-float vector stored directly in Neon's `pgvector` column.

---

### Flow 3: ATS Discovery, Normalization & Deduplication

```
Discovery Trigger (User Button or Inngest Periodic Sync)
       |
       v
ATS Fetchers (`@repo/ats-connectors`)
       |
       +---> Greenhouse (`https://boards-api.greenhouse.io/v1/boards/{board}/jobs`)
       +---> Lever (`https://api.lever.co/v0/postings/{site}`)
       +---> Ashby (`https://api.ashbyhq.com/posting-api/job-board/{board}`)
       +---> Workable (`https://apply.workable.com/api/v3/accounts/{subdomain}/jobs`)
       +---> SmartRecruiters (`https://api.smartrecruiters.com/v1/companies/{company}/postings`)
       +---> Workday (`wday/cxs/{tenant}/{site}/jobs`)
       +---> Firecrawl (Web scrape on generic career pages)
       |
       v
Normalization (`normalizeJob` in `packages/ats-connectors/src/normalize.ts`)
       | (Transforms varying vendor JSON into unified `NormalizedJob` interface)
       v
Deduplication & Retention Check (`apps/web/server/discovery.ts`)
       |
       +---> Check uniqueness on composite key: `(userId, companyId, externalId)`
       +---> If exists: Update title, description, location, applicationUrl
       +---> If new: Create Job record with `expiresAt = now + 40 days`
```

1. **Vendor Translation**: Each ATS format differs significantly. For instance, Lever nests locations in `categories.location`, while Greenhouse returns an array of `offices`. Ashby provides custom compensation fields, while Workday uses custom faceted search payloads. Each connector extracts title, raw HTML/markdown description, location, remote flags, and salary ranges.
2. **Sanitization**: HTML tags in descriptions are stripped to standard text while preserving whitespace and bullet points.
3. **40-Day Retention**: To prevent database exhaustion, every discovered job receives an automatic `expiresAt` set to 40 days from ingestion.

---

### Flow 4: Deterministic 3-Stage Filtration Pipeline

```
Incoming Job Candidate Pair
       |
       v
Stage 1: Experience & Seniority Gate (`filterExperienceWise`)
       |
       +---> Extract required years from job text (e.g., "5+ years of experience")
       +---> Infer seniority from title regex (INTERN, ENTRY, SENIOR, STAFF, EXECUTIVE)
       +---> Compare against candidate experience and preferred search range
       |
       +---> Pass: Proceed to Stage 2
       +---> Fail: Disqualify listing (Reason logged)
       |
       v
Stage 2: Location & Remote Preference Gate (`filterLocationWise`)
       |
       +---> Resolve city synonyms (Bengaluru <-> Bangalore <-> BLR)
       +---> Strict REMOTE check: Reject on-site if candidate chose REMOTE
       +---> Strict ONSITE check: Reject remote if candidate chose ONSITE
       +---> Regional boundary check (e.g., India-friendly vs US-only)
       |
       +---> Pass: Proceed to Stage 3
       +---> Fail: Disqualify listing (Reason logged)
       |
       v
Stage 3: Position Domain & Skill Alignment Gate (`filterPositionAndSkillsWise`)
       |
       +---> Negative Domain Check: Reject medical, sales, retail, legal titles
       +---> Target Role Check: Verify title contains candidate target role tokens
       +---> Skill Overlap Check: Verify technical skill tags appear in job or description
       |
       +---> Pass: Eligible for Hybrid Scoring
       +---> Fail: Disqualify listing (Reason logged)
```

1. **Stage 1 (Seniority Matching)**: Employs compiled regular expressions to identify required years of experience and seniority titles. A candidate with 1 year of experience is barred from Staff or Executive listings; conversely, a candidate with 5 years is barred from student internships.
2. **Stage 2 (Location Resolution)**: Uses a bidirectional synonym map (`CITY_SYNONYMS`) covering major tech hubs. Handles multi-city strings (e.g., "Bengaluru / Gurgaon / Remote").
3. **Stage 3 (Occupational Integrity)**: Discards postings from outside the knowledge/engineering domain (e.g., "Dental Hygienist", "Store Associate") unless the candidate explicitly listed those roles in their profile preferences.

---

### Flow 5: Hybrid Scoring & Grounded AI Explanations

```
Qualified Job Listing
       |
       v
Hybrid Scoring Pipeline (`scoreJobsForUser` in `apps/web/server/matching.ts`)
       |
       +---> Component 1: Skill Fit (Weight: 50%)
       |     `matchedSkills.length / jobSkills.length * 100`
       |
       +---> Component 2: Role Fit (Weight: 20%)
       |     Title token overlap against `preferredRoles`
       |
       +---> Component 3: Location Fit (Weight: 15%)
       |     Preference alignment (Remote: 100, Hybrid: 90, Mismatch: 30-50)
       |
       +---> Component 4: Salary Fit (Weight: 15%)
       |     `effectiveMax / candidateMinSalary * 100` (Neutral 80 if unlisted)
       |
       +---> Rule-Based Composite:
       |     `ruleScore = Skill(0.5) + Role(0.2) + Loc(0.15) + Sal(0.15)`
       |
       +---> Semantic Vector Similarity:
       |     Fetch candidate profile embedding and job description embedding
       |     `semanticScore = cosineSimilarity(candidateVector, jobVector) * 100`
       |
       +---> Final Score:
       |     `finalScore = Math.round(ruleScore * 0.7 + semanticScore * 0.3)`
       |
       v
Explanation Synthesis (`generateAIExplanation`)
       |
       +---> Pass computed score, matched skills, and missing skills to Gemini/Groq
       +---> Guardrail: System prompt forbids asserting skills not in the provided lists
       +---> Fallback: `generateGroundedExplanation` rule template if AI fails
       |
       v
Persist Score, Matched Skills, Missing Skills & Explanation in PostgreSQL
```

---

### Flow 6: Skill Gap Analysis & Recommendation Lifecycle

```
Job Scoring or Dashboard Refresh
       |
       v
Skill Gap Engine (`computeSkillGapsForUser` in `apps/web/server/skillGaps.ts`)
       |
       v
Query High-Scoring Jobs for User (`matchScore >= 50` or `status != DISCOVERED`)
       |
       v
Aggregate `missingSkills` Array across all matching records
       |
       v
Count Occurrence Frequency per Skill
       |
       v
Calculate Estimated Match Lift
       Formula: `min(25, round((frequency / totalJobs) * 20) + 5)`
       |
       v
Prisma Transaction:
       +---> Delete previous `SkillGapRecommendation` records for user
       +---> Bulk-create top 10 recommended skills ordered by frequency
```

---

### Flow 7: Daily Reporting, Excel Export & Email Delivery

```
Inngest Daily Cron (`dailyReportCron` at 19:00 UTC)
       |
       v
Load All Users with Active Candidate Profiles
       |
       v
For Each User:
       |
       +---> Query jobs discovered within last 24 hours
       +---> Query application status transitions in last 24 hours
       +---> Identify top 5 best matches (`matchScore >= 75`)
       +---> Fetch top 3 persistent skill gaps
       |
       v
Generate Report Summary JSON (`generateDailyReport` in `reporting.ts`)
       |
       v
Compile Formatted HTML Email Body (`sendDailyReportEmail` in `reporting.ts`)
       |
       v
Dispatch Outbound Email via Nodemailer (`sendEmail` in `email.ts`)
       |
       v
(Optional User Export) Generate Multi-Tab Spreadsheet via `exceljs` (`excel.ts`)
       +---> Sheet 1: Active Applications & Status History
       +---> Sheet 2: Discovered Matches & Match Scores
       +---> Sheet 3: Skill Gap Analysis & Market Frequency
```

---

## 3. Complete File-by-File Breakdown & Interconnection Map

### 3.1 Monorepo Root & Configuration

- [`package.json`](file:///home/adrish/Desktop/ai-job-intelligence-platform/package.json): Root configuration defining the pnpm workspace scripts (`dev`, `build`, `test`, `db:deploy`). Configures the global Prisma schema path to ensure monorepo build tools resolve database definitions.
- [`pnpm-workspace.yaml`](file:///home/adrish/Desktop/ai-job-intelligence-platform/pnpm-workspace.yaml): Declares the workspace layout, binding `apps/*` and `packages/*`.
- [`turbo.json`](file:///home/adrish/Desktop/ai-job-intelligence-platform/turbo.json): Configures Turborepo pipeline caching. Defines dependencies between `@repo/db#build`, `test`, `lint`, and web application compilation.
- [`vercel.json`](file:///home/adrish/Desktop/ai-job-intelligence-platform/vercel.json): Customizes Vercel deployment commands, directing the builder to execute root-level pnpm deployment commands.
- [`.env.example`](file:///home/adrish/Desktop/ai-job-intelligence-platform/.env.example): Comprehensive template listing required database credentials, Clerk auth keys, LLM API keys, and SMTP configuration.

---

### 3.2 Shared Types Package (`packages/shared-types`)

- [`src/job.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/shared-types/src/job.ts): Defines TypeScript types and Zod schemas for jobs: `NormalizedJob`, `JobFiltersSchema`, `ApplicationStatus` enum, and status transition inputs.
- [`src/profile.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/shared-types/src/profile.ts): Defines `CandidateProfileInputSchema`, `ResumeParsedOutputSchema`, and experience/education structured JSON shapes.
- [`src/report.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/shared-types/src/report.ts): Defines `ReportSummarySchema`, `DailyReportOutputSchema`, and email delivery interfaces.
- [`src/index.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/shared-types/src/index.ts): Central export barrel for `@repo/shared-types`.

---

### 3.3 Database Package (`packages/db`)

- [`prisma/schema.prisma`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/db/prisma/schema.prisma): Source of truth for the PostgreSQL database schema. Specifies tables, composite indexes for high-speed dashboard queries, and `pgvector` vector columns. Specifies `rhel-openssl-3.0.x` binary targets for Vercel deployment.
- [`src/client.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/db/src/client.ts): Instantiates a global singleton `PrismaClient` using standard connection pooling best practices to avoid exhausting database connections during Next.js hot reloads.
- [`src/index.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/db/src/index.ts): Exports the Prisma client instance and generated Prisma namespace.
- [`seed.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/db/seed.ts): Populates initial companies (Google, Stripe, Airbnb, etc.) and foundational technical skills into the database.

---

### 3.4 AI Clients Package (`packages/ai-clients`)

- [`src/gemini.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/ai-clients/src/gemini.ts): Wrapper for the Google Generative AI SDK. Handles text generation, model fallback (`gemini-2.0-flash` -> `gemini-1.5-flash`), temperature control, and JSON mode enforcement.
- [`src/groq.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/ai-clients/src/groq.ts): Wrapper for Groq Cloud SDK executing Llama 3.3 70B for ultra-fast fallback inference.
- [`src/embeddings.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/ai-clients/src/embeddings.ts): Generates 1536-dimensional floating point vector embeddings. Implements vector cosine similarity calculations.
- [`src/index.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/ai-clients/src/index.ts): Barrel export for AI client utilities.

---

### 3.5 ATS Connectors Package (`packages/ats-connectors`)

- [`src/normalize.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/ats-connectors/src/normalize.ts): Core transformation logic mapping vendor-specific JSON payloads into the standardized `NormalizedJob` interface.
- [`src/greenhouse.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/ats-connectors/src/greenhouse.ts): Fetches open postings from Greenhouse public boards (`boards-api.greenhouse.io`).
- [`src/lever.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/ats-connectors/src/lever.ts): Queries Lever public postings API (`api.lever.co`).
- [`src/ashby.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/ats-connectors/src/ashby.ts): Queries Ashby public job board API (`api.ashbyhq.com`).
- [`src/workable.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/ats-connectors/src/workable.ts): Ingests postings from Workable account boards (`apply.workable.com`).
- [`src/smartrecruiters.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/ats-connectors/src/smartrecruiters.ts): Connects to SmartRecruiters postings API.
- [`src/workday.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/ats-connectors/src/workday.ts): Queries Workday Candidate Experience (CXS) search endpoints.
- [`src/firecrawl.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/ats-connectors/src/firecrawl.ts): Uses Firecrawl to scrape and extract listings from unstandardized custom career pages.
- [`src/openPlatforms.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/ats-connectors/src/openPlatforms.ts): Scrapes developer jobs from open platforms like RemoteOK and Hacker News Who is Hiring.
- [`src/index.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/packages/ats-connectors/src/index.ts): Barrel export for all ATS connectors.

---

### 3.6 Web Application Backend (`apps/web/server`)

#### tRPC Layer
- [`server/trpc/context.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/trpc/context.ts): Instantiates request context, authenticates the session via Clerk, enforces an in-memory 60s user cache, and automatically provisions new user records into PostgreSQL.
- [`server/trpc/trpc.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/trpc/trpc.ts): Initializes tRPC with SuperJSON transformer, custom error formatter, and defines `protectedProcedure` enforcing non-null authenticated user context.
- [`server/trpc/root.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/trpc/root.ts): Assembles the root AppRouter combining `jobsRouter`, `dashboardRouter`, `profileRouter`, and `reportsRouter`.
- [`server/trpc/jobsRouter.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/trpc/jobsRouter.ts): Handles job listing with pagination, filtering, status updates, manual sync triggers, and application tracking history.
- [`server/trpc/dashboardRouter.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/trpc/dashboardRouter.ts): Computes dashboard summary metrics, application funnel counts, top matches, and recent status timelines using parallel queries.
- [`server/trpc/profileRouter.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/trpc/profileRouter.ts): Handles candidate profile retrieval, preference updates, manual skill management, and resume upload parsing.
- [`server/trpc/reportsRouter.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/trpc/reportsRouter.ts): Manages on-demand report generation, history retrieval, and Excel spreadsheet exports.

#### Domain Engines & Services
- [`server/jobFilterEngine.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/jobFilterEngine.ts): The deterministic 3-stage filtration engine. Implements seniority regexes, YOE extraction, city synonym mapping, and domain disqualification.
- [`server/matching.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/matching.ts): The hybrid scoring engine. Blends 70% weighted rule scores with 30% vector cosine similarity. Generates grounded match explanations.
- [`server/resumeParser.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/resumeParser.ts): Extracts plaintext from PDF and DOCX files, coordinates structured LLM extraction, and provides heuristic fallback parsing.
- [`server/skillGaps.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/skillGaps.ts): Computes aggregate missing skills across candidate jobs and estimates match percentage lift.
- [`server/discovery.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/discovery.ts): Coordinates calling ATS connectors, deduplicating against the database, and saving per-user job records.
- [`server/reporting.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/reporting.ts): Aggregates daily highlights and formats executive HTML summary emails.
- [`server/excel.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/excel.ts): Formats multi-tab Excel workbooks containing jobs, application statuses, and skill gap metrics using `exceljs`.
- [`server/email.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/email.ts): Outbound SMTP transport with automatic console fallback when credentials are unconfigured.
- [`server/logger.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/logger.ts): Structured JSON logger with contextual `runId` generation for distributed request tracing.
- [`server/rateLimit.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/rateLimit.ts): Token-bucket rate limiter safeguarding AI inference and sync endpoints from excessive calls.
- [`server/userFitCache.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/userFitCache.ts): High-speed in-memory cache for candidate profiles and skills to avoid redundant database reads during multi-job evaluations.
- [`server/inngest/client.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/inngest/client.ts): Inngest client initialization.
- [`server/inngest/functions.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/server/inngest/functions.ts): Inngest serverless workflow definitions for the 19:00 daily report cron and 6-hour discovery sync cron.

---

### 3.7 Web Application Frontend & Routing (`apps/web/app`, `apps/web/components`, `apps/web/lib`)

- [`app/layout.tsx`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/app/layout.tsx): Root HTML layout wrapping the application in ClerkProvider and tRPC/React Query Provider.
- [`app/page.tsx`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/app/page.tsx): Main dashboard page displaying application funnel metrics, top recommended matches, skill gap cards, and recent activity.
- [`app/jobs/page.tsx`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/app/jobs/page.tsx): Job discovery and pipeline tracking interface with real-time status transitions, search debouncing, and pagination.
- [`app/profile/page.tsx`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/app/profile/page.tsx): Profile management page for uploading resumes, editing target roles, setting experience ranges, and configuring remote preferences.
- [`app/api/trpc/[trpc]/route.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/app/api/trpc/[trpc]/route.ts): Next.js App Router route handler serving GET and POST requests for tRPC procedures.
- [`app/api/inngest/route.ts`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/app/api/inngest/route.ts): Next.js App Router route handler serving Inngest webhook triggers and cron dispatches.
- [`components/layout/AppShell.tsx`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/components/layout/AppShell.tsx): Application layout wrapper providing the sidebar, navigation, and auth loading gates to prevent premature data fetching.
- [`components/layout/Sidebar.tsx`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/components/layout/Sidebar.tsx): Primary desktop and mobile navigation bar.
- [`components/profile/ExperienceRangeDoubleSlider.tsx`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/components/profile/ExperienceRangeDoubleSlider.tsx): Dual-thumb interactive slider for selecting minimum and maximum experience filters.
- [`components/profile/EngineeringPositionSelector.tsx`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/components/profile/EngineeringPositionSelector.tsx): Categorized role selector spanning Frontend, Backend, Fullstack, AI/ML, DevOps, and Mobile engineering specializations.
- [`lib/trpc/Provider.tsx`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/lib/trpc/Provider.tsx): TanStack React Query and tRPC React provider configuring cache invalidation and query deduplication.
- [`copy-engine.js`](file:///home/adrish/Desktop/ai-job-intelligence-platform/apps/web/copy-engine.js): Build-time script guaranteeing Prisma's serverless query engine is bundled into Vercel Lambda deployment outputs.

---

## 4. Deep Backend Code Annotations ("Why We Wrote This Code")

### Case 1: User Context Caching & Auto-Provisioning in `context.ts`

```typescript
// Located in apps/web/server/trpc/context.ts

interface CachedUser {
  user: any;
  cachedAt: number;
}

const USER_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const userCache = new Map<string, CachedUser>();

export async function createTRPCContext() {
  let session = null;
  try {
    session = await auth();
  } catch (authErr: any) {
    session = null;
  }

  let dbUser = null;
  if (session?.userId) {
    // 1. Check in-memory cache
    const cached = userCache.get(session.userId);
    if (cached && Date.now() - cached.cachedAt < USER_CACHE_TTL_MS) {
      dbUser = cached.user;
    } else {
      // 2. Load user from database
      dbUser = await prisma.user.findUnique({
        where: { clerkId: session.userId },
      });

      // 3. Auto-provision if user record does not exist
      if (!dbUser) {
        const clerkUser = await currentUser();
        const primaryEmail = clerkUser?.emailAddresses?.[0]?.emailAddress 
          || `${session.userId}@user.local`;

        const existingByEmail = await prisma.user.findUnique({
          where: { email: primaryEmail },
        });

        if (existingByEmail) {
          // Re-link existing account with updated clerkId
          dbUser = await prisma.user.update({
            where: { id: existingByEmail.id },
            data: { clerkId: session.userId },
          });
        } else {
          // Create brand new user record
          dbUser = await prisma.user.create({
            data: {
              clerkId: session.userId,
              email: primaryEmail,
              name: `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim() || undefined,
            },
          });
        }
      }
      userCache.set(session.userId, { user: dbUser, cachedAt: Date.now() });
    }
  }

  return { prisma, auth: session, user: dbUser, userId: dbUser?.id };
}
```

#### Why We Wrote This Code:
1. **Eliminating Cascading Database Latency**:
   On complex pages like the Dashboard, the browser triggers multiple parallel tRPC queries (`dashboard.getSummary`, `dashboard.getTopMatches`, `profile.get`). Without the in-memory cache, every single parallel query would execute a redundant `SELECT * FROM users WHERE clerk_id = ...` against Neon. The 60-second in-memory map collapses these redundant round trips into a single lookup.
2. **Eliminating Clerk Webhook Failure Modes**:
   Traditional architectures rely on Clerk HTTP webhooks to create user rows in PostgreSQL upon sign-up. If the webhook experiences network latency, signature verification failure, or cold-start timeouts, the user signs in to an application where their record does not exist, causing 500 errors. By checking and auto-provisioning directly inside `createTRPCContext`, the application is completely self-healing.
3. **Re-linking Accounts Across Environments**:
   When developers switch between Clerk Development (`pk_test_...`) and Clerk Production (`pk_live_...`) keys, the Clerk user ID changes even though the user's email address is identical. The `existingByEmail` lookup detects this transition and updates the `clerkId` foreign key without losing existing profile data or saved jobs.

---

### Case 2: Deterministic Seniority & Regex Extraction in `jobFilterEngine.ts`

```typescript
// Located in apps/web/server/jobFilterEngine.ts

const INTERN_REGEX = /\b(intern|internship|co-op|coop|apprentice|student)\b/i;
const ENTRY_REGEX = /\b(junior|jr\.?|entry|associate|new grad|new graduate|fresher)\b/i;
const SENIOR_REGEX = /\b(senior|sr\.?|lead)\b/i;
const STAFF_PRINCIPAL_REGEX = /\b(staff|principal|distinguished|fellow|architect)\b/i;
const EXECUTIVE_REGEX = /\b(director|vp|vice president|head of|chief|c-level|cto|cio|ciso)\b/i;

export function extractJobMinYears(title: string, description?: string | null): number | null {
  const text = `${title} ${description || ""}`;

  const patterns = [
    /(?:minimum|at least|requires?|with)\s+(\d{1,2})\+?\s*(?:to\s*\d+|-|\s*–\s*\d+)?\s*(?:years?|yrs)(?:\s+of)?\s+(?:relevant\s+|professional\s+|work\s+)?experience/i,
    /(\d{1,2})\+?\s*(?:to\s*\d+|-|\s*–\s*\d+)?\s*(?:years?|yrs)(?:\s+of)?\s+(?:relevant\s+|professional\s+|work\s+)?experience/i,
    /\b(\d{1,2})\+?\s*years?\s+(?:in|of)\b/i,
    /\b(\d{1,2})\+?\s*yoe\b/i,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (parsed >= 1 && parsed <= 25) {
        return parsed;
      }
    }
  }

  // Fallback to title-inferred seniority minimums
  if (EXECUTIVE_REGEX.test(title)) return 10;
  if (STAFF_PRINCIPAL_REGEX.test(title)) return 7;
  if (SENIOR_REGEX.test(title)) return 5;
  if (ENTRY_REGEX.test(title)) return 0;
  if (INTERN_REGEX.test(title)) return 0;

  return null;
}
```

#### Why We Wrote This Code:
1. **Unstructured Job Text Standardization**:
   ATS job postings vary wildly: some write "5+ years of relevant experience", others write "minimum 5 yrs experience", "requires 5-7 years", or "5 yoe". The ordered regular expressions capture these diverse linguistic formats and normalize them to an integer.
2. **Defensive Seniority Inference**:
   Many listings omit explicit year counts in the description but clearly state "Staff Software Engineer" or "VP of Engineering" in the title. The fallback rules ensure that senior titles receive appropriate baseline thresholds (e.g., Staff = 7 years, Senior = 5 years) even when the ATS description is brief or obscured behind an external link.
3. **Sub-Millisecond Execution**:
   Evaluating regular expressions across string buffers takes less than 0.1 milliseconds per job, allowing the engine to filter thousands of raw postings in memory without incurring AI API costs or latency.

---

### Case 3: Hybrid Score Blending & Grounded Guardrails in `matching.ts`

```typescript
// Located in apps/web/server/matching.ts

export async function generateAIExplanation(
  matchScore: number,
  matchedSkills: string[],
  missingSkills: string[],
  jobTitle?: string,
  companyName?: string
): Promise<string> {
  const hasGemini = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("AQ.placeholder");
  const hasGroq = process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.startsWith("gsk_placeholder");

  if (!hasGemini && !hasGroq) {
    return generateGroundedExplanation(matchScore, matchedSkills, missingSkills);
  }

  // Guardrail: strict grounding prompt enforcing zero hallucination
  const prompt = `Given the following computed match data, write a 2-3 sentence explanation for the candidate.
Do not state anything that contradicts the data below — every claim must be traceable to a listed matched skill, missing skill, or the score itself.

Position: ${jobTitle || "Job opening"} at ${companyName || "Company"}
Match score: ${matchScore}%
Matched skills: ${matchedSkills.length > 0 ? matchedSkills.join(", ") : "None explicitly tagged"}
Missing skills: ${missingSkills.length > 0 ? missingSkills.join(", ") : "None missing"}

Write in a direct, encouraging-but-honest tone. If there are missing skills, mention the single most impactful one. Do not fabricate or infer any skills outside the lists provided.`;

  try {
    let result = "";
    if (hasGemini) {
      result = await generateTextWithGemini(prompt, { temperature: 0.2 });
    } else if (hasGroq) {
      result = await generateTextWithGroq(prompt, { temperature: 0.2 });
    }

    const trimmed = result.trim();
    return trimmed || generateGroundedExplanation(matchScore, matchedSkills, missingSkills);
  } catch {
    // Graceful fallback to rule-based grounded explanation
    return generateGroundedExplanation(matchScore, matchedSkills, missingSkills);
  }
}
```

#### Why We Wrote This Code:
1. **Preventing LLM Hallucinations**:
   When prompted without constraints, generative LLMs often invent skills (e.g., "Great fit because of your 5 years in Rust" when the candidate never listed Rust). The prompt explicitly forbids asserting any skill not present in `matchedSkills` or `missingSkills`.
2. **Deterministic Fallback Safety Net**:
   If an AI provider experiences rate-limiting (HTTP 429), quota exhaustion, or network timeouts, the `catch` block intercepts the exception and immediately invokes `generateGroundedExplanation()`. The end user receives a polished, grammatically correct explanation without noticing any backend disruption.
3. **Low Temperature (0.2)**:
   A low sampling temperature ensures factual, predictable responses that closely adhere to the provided candidate data.

---

### Case 4: Serverless Prisma Query Engine Copying in `copy-engine.js`

```javascript
// Located in apps/web/copy-engine.js

const fs = require('fs');
const path = require('path');

const engineName = 'libquery_engine-rhel-openssl-3.0.x.so.node';
const sourcePaths = [
  path.join(__dirname, '../../packages/db/node_modules/.prisma/client', engineName),
  path.join(__dirname, '../../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client', engineName),
  path.join(__dirname, 'node_modules/.prisma/client', engineName),
];

const destDirs = [
  path.join(__dirname, '.next/server'),
  path.join(__dirname, '.next/server/chunks'),
  path.join(__dirname, 'node_modules/.prisma/client'),
];

// Locate engine binary and copy to destination directories
// ...
```

#### Why We Wrote This Code:
1. **Resolving Monorepo Serverless Engine Isolation**:
   In a pnpm monorepo deployed to Vercel, Prisma client code resides inside `packages/db`, while the Next.js API route bundle resides in `apps/web/.next/server`. During standalone bundling, Next.js tree-shaking frequently excludes the native C++ binary (`libquery_engine-rhel-openssl-3.0.x.so.node`), resulting in runtime crashes: `PrismaClientInitializationError: Query engine library not found`.
2. **Automated Build Integration**:
   By attaching `copy-engine.js` to the `postbuild` script in `apps/web/package.json`, the exact Linux binary is copied directly into `.next/server/` and `.next/server/chunks/` after every Next.js compile step, guaranteeing zero runtime missing-engine errors in production.

---

### Case 5: Multi-Tenant Query Isolation across tRPC Routers

```typescript
// Sample pattern from apps/web/server/trpc/jobsRouter.ts

export const jobsRouter = router({
  updateStatus: protectedProcedure
    .input(UpdateJobStatusInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Step 1: Query strictly verifying ownership
      const existing = await ctx.prisma.job.findFirst({
        where: {
          id: input.jobId,
          userId: ctx.userId, // Mandatory security predicate
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found or unauthorized.",
        });
      }

      // Step 2: Atomic update and status history logging
      return ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.job.update({
          where: { id: existing.id },
          data: { status: input.status },
        });

        await tx.applicationStatusHistory.create({
          data: {
            userId: ctx.userId,
            jobId: existing.id,
            status: input.status,
            note: input.note,
          },
        });

        return updated;
      });
    }),
});
```

#### Why We Wrote This Code:
1. **Preventing Insecure Direct Object References (IDOR)**:
   If a user provides a arbitrary `jobId` that belongs to another user, `findFirst({ where: { id, userId: ctx.userId } })` returns null, rejecting the request with a generic `NOT_FOUND` error rather than leaking the existence of other users' records.
2. **Transactional Integrity**:
   Updating a job's status must always produce an accompanying entry in `ApplicationStatusHistory`. Wrapping both operations inside `tx.$transaction` guarantees that the history audit log can never become out of sync with the current job state.
