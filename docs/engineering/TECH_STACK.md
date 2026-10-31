# Tech Stack

## Frontend
- **Next.js 15** (App Router) — `apps/web`
- **React 19**
- **TypeScript** — strict mode across the entire monorepo
- **Tailwind CSS**
- **shadcn/ui** — component primitives, themed for a neobrutalism look (see `docs/frontend/DESIGN_SYSTEM.md` — overridden `--radius`, custom offset-shadow utilities, four semantic accent colors mapped to `ApplicationStatus`)
- **TanStack Query** — client-side data fetching/caching, paired with tRPC
- **tRPC** — typed API layer between `apps/web`'s frontend and its own backend
- **Zod** — input/output validation at every boundary (tRPC procedures, MCP tool contracts, form validation)

## Backend
- **Next.js Route Handlers** — for webhooks (Clerk, Inngest) within `apps/web`
- **tRPC** — CRUD API for profile, jobs, reports
- **Prisma** — ORM, schema owned by `packages/db`, shared client across `apps/web` and `apps/mcp-server`

## Database
- **Neon PostgreSQL** — serverless Postgres
- **pgvector** — extension for embedding storage/similarity search (profile and job embeddings)

## Authentication
- **Clerk** — sign-up/sign-in, session management, webhooks for user lifecycle events

## AI
- **Gemini** — resume parsing, match explanations, report summarization
- **Groq** — lower-latency/cheaper inference where full Gemini reasoning isn't needed
- **LangGraph** — agent orchestration state machine, runs in `apps/agent-worker`
- **Custom MCP server** — `apps/mcp-server`, the sole interface between agents and the rest of the system (database, ATS connectors, Firecrawl, Puppeteer, email)
- **pgvector-based semantic matching** — deliberately not a full RAG retrieval pipeline (see `architecture/DECISIONS.md` ADR-003)

## Job discovery
- **ATS connectors** (`packages/ats-connectors`): Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Workable
- **Firecrawl** — Wellfound and custom/non-ATS career sites
- **Puppeteer** — last-resort fallback for sites Firecrawl can't handle

## Event processing / scheduling
- **Inngest** — scheduling (daily report trigger) and step-function-based event chaining between discovery → matching → reporting → notification, replacing the originally-proposed Kafka setup (see `architecture/DECISIONS.md` ADR-001)

## Email
- **Resend** — daily/weekly report delivery

## Storage
- **NeonDB Object Storage** (AWS S3-compatible, accessed via `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`, server-side only) — transient resume storage between upload and parse-confirmation; private bucket, server-issued pre-signed upload URLs, no public access (ADR-013, `engineering/SECURITY_REQUIREMENTS.md`)

## Monitoring
- **Structured JSON logs + Inngest run dashboard** — no third-party error tracker (ADR-013); see `operations/OBSERVABILITY.md`

## Monorepo tooling
- **pnpm** — package manager, workspace-based dependency management
- **Turborepo** — task orchestration/caching across `apps/*` and `packages/*`

## Deployment targets (see `operations/DEPLOYMENT_ARCHITECTURE.md` for detail)
- `apps/web` — Vercel (serverless-friendly, standard Next.js hosting)
- `apps/mcp-server` and `apps/agent-worker` — a host supporting persistent Node processes (e.g. Railway, Fly.io, Render, or AWS ECS), since both need long-running processes, not serverless functions (see `architecture/DECISIONS.md` ADR-006)
- Database — Neon (already serverless-managed)

## Testing (see `engineering/TESTING_STRATEGY.md` for detail)
- **Vitest** — unit tests
- **Playwright** — end-to-end tests for the three-page UI
