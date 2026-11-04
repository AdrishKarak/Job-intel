# Architecture & System Design

This document details the architectural topology, data models, domain execution flows, and technical decision records of the AI Job Intelligence Platform.

---

## Table of Contents

- [1. High-Level System Architecture](#1-high-level-system-architecture)
- [2. Domain Model & Entity Relationships](#2-domain-model--entity-relationships)
- [3. ATS Ingestion & Normalization Pipeline](#3-ats-ingestion--normalization-pipeline)
- [4. Multi-Stage Filtering & Scoring Pipeline](#4-multi-stage-filtering--scoring-pipeline)
- [5. Background Job & Inngest Execution Flow](#5-background-job--inngest-execution-flow)
- [6. Architectural Decision Records (ADRs)](#6-architectural-decision-records-adrs)
- [7. Security & Multi-Tenant Isolation](#7-security--multi-tenant-isolation)

---

## 1. High-Level System Architecture

The application is structured into distinct tiers operating across the client, edge middleware, serverless API runtimes, asynchronous job runners, and managed cloud infrastructure.

```mermaid
flowchart TD
    subgraph ClientTier["Client Tier (Browser)"]
        UI["React 19 Next.js Client Components"]
        RQ["TanStack React Query v5 Cache"]
        TRPCC["tRPC 11 React Client"]
        ClerkUI["Clerk Auth Provider"]
    end

    subgraph EdgeMiddleware["Edge Middleware Tier"]
        MW["Next.js Edge Middleware (Clerk Auth Guard)"]
    end

    subgraph APITier["Serverless API Tier (Next.js 15 / Vercel Serverless)"]
        Context["tRPC Context Builder (User Resolution & Cache)"]
        ProtProc["Protected Procedure Guard (Tenant Isolation)"]
        Router["Root tRPC Router"]
        JobsR["Jobs Router"]
        DashR["Dashboard Router"]
        ProfR["Profile Router"]
        RepR["Reports Router"]
    end

    subgraph EngineTier["Intelligence & Domain Engines"]
        FilterEngine["3-Stage Deterministic Filter Engine"]
        MatchingEngine["Hybrid Scoring Engine (Rules + Vector)"]
        ResumeParser["Resume Extraction Engine (Mammoth / pdf-parse)"]
        SkillGapEngine["Skill Gap Analyzer"]
        ExcelEngine["XLSX Spreadsheet Generator (Direct Download & Email Attachment)"]
    end

    subgraph WorkerTier["Async & Scheduled Execution Tier"]
        InngestClient["Inngest Workflow Runner"]
        CronDaily["Daily Intelligence Cron (18:30 UTC / 6:30 PM UTC)"]
        CronSync["ATS Discovery Sync Cron (Every 6h)"]
    end

    subgraph DataTier["Data & Vector Tier (Neon PostgreSQL)"]
        PG["PostgreSQL Database (Prisma ORM)"]
        PGV["pgvector Extension (1536-dim embeddings)"]
    end

    subgraph ExternalServices["External Infrastructure & SaaS"]
        ClerkAuth["Clerk Identity Platform"]
        AIProviders["Google Gemini Pool (Keys 1 & 2) / Groq Cloud"]
        ATSBoards["Target ATS Portals (Greenhouse, Lever, Ashby, Workday)"]
        WebCrawlers["Web Crawlers (Firecrawl Keys 1 & 2 + Scrape.do Proxy)"]
        SMTPService["SMTP / Brevo Email Transport"]
    end

    UI --> TRPCC
    UI --> ClerkUI
    TRPCC --> MW
    MW --> Context
    Context --> ClerkAuth
    Context --> PG
    Context --> ProtProc
    ProtProc --> Router
    Router --> JobsR
    Router --> DashR
    Router --> ProfR
    Router --> RepR

    JobsR --> FilterEngine
    JobsR --> MatchingEngine
    ProfR --> ResumeParser
    DashR --> FilterEngine
    DashR --> SkillGapEngine
    RepR --> ExcelEngine

    FilterEngine --> PG
    MatchingEngine --> PGV
    MatchingEngine --> AIProviders
    ResumeParser --> AIProviders

    InngestClient --> CronDaily
    InngestClient --> CronSync
    CronDaily --> RepR
    CronDaily --> ExcelEngine
    CronDaily --> SMTPService
    CronSync --> ATSBoards
    CronSync --> WebCrawlers
    CronSync --> FilterEngine
    CronSync --> PG
```

---

## 2. Domain Model & Entity Relationships

The relational data model is implemented on Neon PostgreSQL via Prisma ORM with vector extensions enabled.

```mermaid
erDiagram
    User ||--o| CandidateProfile : "owns"
    User ||--o{ UserSkill : "has"
    User ||--o{ Job : "tracks"
    User ||--o{ ApplicationStatusHistory : "generates"
    User ||--o{ SkillGapRecommendation : "receives"
    User ||--o{ Report : "possesses"

    Skill ||--o{ UserSkill : "referenced in"
    Skill ||--o{ JobSkill : "required in"

    Company ||--o{ Job : "posts"
    Job ||--o{ JobSkill : "specifies"
    Job ||--o{ ApplicationStatusHistory : "transitions"

    User {
        string id PK
        string clerkId UK
        string email UK
        string name
        datetime createdAt
        datetime updatedAt
    }

    CandidateProfile {
        string id PK
        string userId FK
        float experienceYears
        float minExperienceYears
        float maxExperienceYears
        string professionalSummary
        string[] preferredRoles
        string[] preferredLocations
        int minSalary
        int maxSalary
        enum remotePreference
        json experienceSummary
        json projectsSummary
        json educationSummary
        vector profileEmbedding
        datetime resumeUploadedAt
        datetime resumeParsedAt
    }

    Skill {
        string id PK
        string name UK
        string category
    }

    UserSkill {
        string id PK
        string userId FK
        string skillId FK
        enum source
        string proficiency
        float yearsOfUse
    }

    Company {
        string id PK
        string name UK
        enum atsType
        string atsIdentifier
        string careerPageUrl
        boolean active
    }

    Job {
        string id PK
        string userId FK
        string companyId FK
        string externalId
        string title
        string description
        string location
        boolean remote
        int salaryMin
        int salaryMax
        string applicationUrl
        enum source
        enum status
        float matchScore
        string[] matchedSkills
        string[] missingSkills
        string aiExplanation
        vector jobEmbedding
        datetime discoveredAt
        datetime expiresAt
        datetime updatedAt
    }

    JobSkill {
        string id PK
        string jobId FK
        string skillId FK
        boolean required
    }

    ApplicationStatusHistory {
        string id PK
        string userId FK
        string jobId FK
        enum status
        datetime changedAt
        string note
    }

    SkillGapRecommendation {
        string id PK
        string userId FK
        string skillName
        int frequency
        float trendScore
        float estimatedLift
        datetime recommendedAt
    }

    Report {
        string id PK
        string userId FK
        enum type
        json summary
        string fileUrl
        datetime generatedAt
    }
```

---

## 3. ATS Ingestion & Normalization Pipeline

The ATS connectors module extracts postings from diverse public APIs and web endpoints, translating varying schemas into a standardized `NormalizedJob` interface.

```mermaid
flowchart LR
    subgraph ATSPlatforms["Source ATS Platforms & Web Scraping"]
        GH["Greenhouse API"]
        LV["Lever Postings API"]
        ASH["Ashby Public API"]
        WRK["Workable API"]
        SR["SmartRecruiters API"]
        WD["Workday CX Portal"]
        FC1["Firecrawl Primary (Key 1)"]
        FC2["Firecrawl Backup (Key 2)"]
        SDO["Scrape.do Residential Proxy"]
    end

    subgraph ConnectorModule["@repo/ats-connectors"]
        FetchGH["fetchGreenhouseJobs()"]
        FetchLV["fetchLeverJobs()"]
        FetchASH["fetchAshbyJobs()"]
        FetchWRK["fetchWorkableJobs()"]
        FetchSR["fetchSmartRecruitersJobs()"]
        FetchWD["fetchWorkdayJobs()"]
        CrawlerPool["crawlTargetPage() Multi-Engine Pool"]
        ScrapeFC["scrapeJobsWithFirecrawl()"]
        Norm["normalizeJob() Transformer"]
    end

    subgraph IngestionBoundary["Ingestion & Persistence"]
        Dedupe["Deduplication Guard (userId + companyId + externalId)"]
        TTL["40-Day Expiration Calculation"]
        Persist["Prisma Job Upsert"]
    end

    GH --> FetchGH
    LV --> FetchLV
    ASH --> FetchASH
    WRK --> FetchWRK
    SR --> FetchSR
    WD --> FetchWD
    
    FC1 --> CrawlerPool
    FC2 --> CrawlerPool
    SDO --> CrawlerPool
    CrawlerPool --> ScrapeFC

    FetchGH --> Norm
    FetchLV --> Norm
    FetchASH --> Norm
    FetchWRK --> Norm
    FetchSR --> Norm
    FetchWD --> Norm
    ScrapeFC --> Norm

    Norm --> Dedupe
    Dedupe --> TTL
    TTL --> Persist
```

---

## 4. Multi-Stage Filtering & Scoring Pipeline

To avoid costly vector calculations and unnecessary LLM requests on non-viable postings, incoming listings pass through a deterministic three-stage filter before entering the hybrid scoring engine.

```mermaid
flowchart TD
    RawJob["Candidate Profile & Discovered Job"]

    subgraph Stage1["Stage 1: Experience & Seniority Gate"]
        ExpCheck{"Meets Experience Requirements?"}
        ExpPass["Pass Stage 1"]
        ExpFail["Reject: Seniority / YOE Mismatch"]
    end

    subgraph Stage2["Stage 2: Location & Work Mode Gate"]
        LocCheck{"Matches Location & Remote Preference?"}
        LocPass["Pass Stage 2"]
        LocFail["Reject: Location Incompatible"]
    end

    subgraph Stage3["Stage 3: Position Domain & Skill Gate"]
        PosCheck{"Matches Target Domain & Skill Baseline?"}
        PosPass["Pass Stage 3: Qualified Listing"]
        PosFail["Reject: Non-Target Domain / Role"]
    end

    subgraph ScoringEngine["Hybrid Scoring Engine"]
        SkillScore["Calculate Skill Overlap (Weight: 50%)"]
        RoleScore["Calculate Role Title Match (Weight: 20%)"]
        LocScore["Calculate Location / Remote Fit (Weight: 15%)"]
        SalScore["Calculate Compensation Fit (Weight: 15%)"]
        RuleComposite["Rule Score = Skill(0.5) + Role(0.2) + Loc(0.15) + Sal(0.15)"]

        VectorSim["Generate Embeddings (1536d) & Cosine Similarity"]
        FinalScore["Composite Score = RuleScore * 0.7 + VectorScore * 0.3"]
    end

    subgraph AIExplanation["Grounded Explanation Generation"]
        CheckKeys{"Gemini / Groq Available?"}
        LLMExplain["Fenced LLM Synthesis with Grounded Verification"]
        RuleExplain["Deterministic Grounded Template Explanation"]
    end

    RawJob --> ExpCheck
    ExpCheck -- "Yes" --> ExpPass --> LocCheck
    ExpCheck -- "No" --> ExpFail

    LocCheck -- "Yes" --> LocPass --> PosCheck
    LocCheck -- "No" --> LocFail

    PosCheck -- "Yes" --> PosPass --> SkillScore
    PosCheck -- "No" --> PosFail

    PosPass --> RoleScore
    PosPass --> LocScore
    PosPass --> SalScore

    SkillScore --> RuleComposite
    RoleScore --> RuleComposite
    LocScore --> RuleComposite
    SalScore --> RuleComposite

    PosPass --> VectorSim

    RuleComposite --> FinalScore
    VectorSim --> FinalScore

    FinalScore --> CheckKeys
    CheckKeys -- "Yes" --> LLMExplain
    CheckKeys -- "No" --> RuleExplain
```

---

## 5. Background Job & Inngest Execution Flow

Asynchronous and recurring workflows are managed by Inngest, ensuring reliable retries, step isolation, and failure reporting on serverless infrastructure.

```mermaid
sequenceDiagram
    autonumber
    participant Inngest as Inngest Cloud Scheduler
    participant Worker as /api/inngest Endpoint
    participant DB as Neon PostgreSQL
    participant AI as Gemini Pool (Keys 1 & 2) / Groq
    participant Excel as Excel Generator (excel.ts)
    participant SMTP as Nodemailer Brevo SMTP

    Note over Inngest,Worker: Daily Execution at 18:30 UTC (6:30 PM UTC)
    Inngest->>Worker: Trigger Event: cron("30 18 * * *")
    Worker->>DB: step.run("load-active-users")
    DB-->>Worker: Return User IDs with Active Profiles

    loop For Each User
        Worker->>DB: Query 24h Discovered Jobs & Status Transitions
        Worker->>DB: Query Top 5 High-Match Jobs (Score >= 75)
        Worker->>DB: Query Top 3 Skill Gaps
        Worker->>AI: Synthesize Daily Highlights
        Worker->>DB: Persist Report Record (JSON Summary)
        Worker->>Excel: generateJobsExcel(userId) -> Full .xlsx Buffer
        Worker->>SMTP: Dispatch Formatted HTML Email with Attached .xlsx Workbook
        SMTP-->>Worker: Email Accepted (with Attachment)
    end

    Worker-->>Inngest: Complete Workflow Run { totalUsers, results }
```

---

## 6. Architectural Decision Records (ADRs)

### ADR-001: Monorepo with Turborepo and pnpm
- **Context**: The platform consists of a full-stack Next.js application, shared TypeScript types, database schemas, AI client utilities, and ATS connectors.
- **Decision**: Use a pnpm workspace orchestrated by Turborepo.
- **Rationale**: Enables strict boundary separation while sharing types and schemas without publishing to a private npm registry. Turborepo provides incremental builds and cached test runs across packages.

### ADR-002: tRPC 11 with SuperJSON over REST / GraphQL
- **Context**: The client frontend and backend API are co-developed in TypeScript.
- **Decision**: Adopt tRPC 11 using SuperJSON transformer.
- **Rationale**: Eliminates code-generation steps required by OpenAPI or GraphQL. Any change to router inputs or return types immediately produces compile-time TypeScript errors on the client. SuperJSON ensures native JavaScript objects (Date, Set, Map) pass seamlessly over HTTP.

### ADR-003: Hybrid Scoring (70% Rules + 30% Semantic Embeddings)
- **Context**: Pure LLM evaluation for hundreds of jobs is cost-prohibitive, slow, and prone to scoring variance. Pure keyword matching fails on synonymy (e.g., "Postgres" vs "PostgreSQL", "Frontend" vs "UI").
- **Decision**: Implement a two-tier scoring system.
- **Rationale**: Rule-based scoring provides predictable, explainable metrics for skills, salary, location, and seniority. Semantic embeddings refine the ranking by measuring conceptual alignment between the candidate summary and job description. Blending at 70/30 maintains determinism while capturing nuance.

### ADR-004: 3-Stage Deterministic Filtration Prior to Scoring
- **Context**: Scoring every raw scraped posting against a candidate profile wastes database I/O, vector calculations, and LLM tokens.
- **Decision**: Gate all scoring behind an explicit 3-stage filter (Experience -> Location -> Role/Skill).
- **Rationale**: Out-of-region, incorrect seniority, or non-technical postings are disqualified in under 1 millisecond using compiled regex and string comparisons.

### ADR-005: Per-User Scoped Jobs with 40-Day TTL
- **Context**: Job listings become stale rapidly, and candidates need personalized application statuses (SAVED, APPLIED, INTERVIEWING).
- **Decision**: Store job records with a composite key of `(userId, companyId, externalId)` and assign an `expiresAt` timestamp set to 40 days past discovery.
- **Rationale**: Prevents cross-user data pollution, enables per-user notes and tracking, and prevents database bloat via scheduled cleanup of expired listings.

### ADR-006: Inngest for Asynchronous Workflow Management
- **Context**: Serverless hosting (Vercel) terminates long-running background processes and lacks a native persistent task queue.
- **Decision**: Use Inngest for event-driven workflows and cron scheduling.
- **Rationale**: Inngest functions execute as step-based HTTP calls, providing automatic retries, concurrency controls, step memoization, and observability without managing a persistent Redis or BullMQ server.

### ADR-007: Neon PostgreSQL with pgvector over Standalone Vector DBs
- **Context**: Matching requires both relational queries (filtering by user, status, salary) and similarity vector search.
- **Decision**: Store embeddings directly in Neon PostgreSQL using the `pgvector` extension.
- **Rationale**: Avoids dual-write synchronizations, distributed transactions, and the operational cost of managing a separate vector database (e.g., Pinecone). Relational and vector filters execute within a single atomic query.

### ADR-008: Grounded, Hallucination-Resistant Match Explanations
- **Context**: Generative models frequently fabricate candidate qualifications or claim matching skills not present in the source data.
- **Decision**: Constrain LLM prompts with strictly validated matched and missing skill arrays, backed by an automatic fallback to deterministic grounded templates.
- **Rationale**: Ensures every claim in the UI is verifiable against the candidate profile and job requirements, preventing candidate deception.

### ADR-009: Multi-Key API Pooling & Tiered Crawler Failover (Gemini, Firecrawl, Scrape.do)
- **Context**: Free and consumption-tiered third-party APIs (Gemini tokens/RPM, Firecrawl scrape credits) frequently hit rate limits (HTTP 429) or quota exhaustion (HTTP 402), which would otherwise abort resume parsing, embeddings, or job discovery.
- **Decision**: Implement resilient `ApiKeyPool` and `CrawlerPool` managers with round-robin load distribution, automatic cooldown quarantining, and multi-tier engine failover.
- **Rationale**:
  - **AI Inference**: Load balances across `GEMINI_API_KEY` and `GEMINI_API_KEY2`. Upon encountering 429 or `RESOURCE_EXHAUSTED`, the exhausted key is quarantined for 5 minutes and execution immediately retries on the backup key. If all Gemini keys fail, tasks fall back to Groq or deterministic heuristics.
  - **Web Crawling**: Dispatches non-ATS scraping requests through Firecrawl Key 1 -> Firecrawl Key 2 -> Scrape.do Residential Proxy (`SCRAPEDO_API_KEY`) -> Direct HTTP fetch. Anti-bot obstacles and depleted credits in one vendor do not compromise discovery sync.

---

## 7. Security & Multi-Tenant Isolation

### 7.1 Multi-Tenant Data Isolation
Every protected procedure in the backend extracts the verified user identity from Clerk authentication tokens via `ctx.userId`. All database queries strictly scope their `where` conditions:

```typescript
// Enforced isolation pattern
const jobs = await ctx.prisma.job.findMany({
  where: {
    userId: ctx.userId, // Non-negotiable tenant boundary
    // ...additional filters
  },
});
```

Unit and hardening tests explicitly verify that attempting to read, update, or transition another user's job or profile throws an authorization error.

### 7.2 Input Validation & Boundary Defense
All incoming request payloads are parsed through Zod schemas before reaching business logic. Unknown or malformed fields are stripped.

### 7.3 Prompt Injection Guardrails
User inputs (resume summaries, job descriptions) injected into LLM evaluation prompts are wrapped in explicit boundary delimiters and instructed not to interpret user-supplied text as system commands.
