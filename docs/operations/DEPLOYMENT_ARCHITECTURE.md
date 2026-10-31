# Deployment Architecture

## Where each service runs

| Service | Platform | Why |
|---|---|---|
| `apps/web` | Vercel | Standard Next.js hosting, serverless-friendly, no long-running process needed for the UI/tRPC layer |
| `apps/mcp-server` | A persistent-process host (Railway, Fly.io, Render, or AWS ECS/Fargate) | Long-running Node service per `architecture/DECISIONS.md` ADR-006 — Puppeteer sessions and multi-company discovery crawls can exceed serverless timeout windows |
| `apps/agent-worker` | Same category of host as `apps/mcp-server` (can be the same platform, separate service) | LangGraph orchestration runs are also potentially long-running and shouldn't be constrained by serverless cold starts/timeouts |
| Database | Neon (managed serverless Postgres) | Already the chosen provider; handles its own scaling |

**Why not Vercel for all three:** Vercel's serverless functions have execution time limits that are a poor fit for `apps/mcp-server` (which may run multi-minute discovery crawls, especially with Puppeteer) and `apps/agent-worker` (which orchestrates the full sequence including those same crawls). Running them as persistent services avoids timeout-driven failures and avoids re-architecting the discovery pipeline around serverless constraints.

## Network topology

```
Public internet
      │
      ▼
   Vercel (apps/web)
      │  (private network / internal URL)
      ▼
apps/agent-worker  ──(private network)──▶  apps/mcp-server
      │                                          │
      └──────────────────┬───────────────────────┘
                          ▼
                    Neon Postgres
```

- `apps/mcp-server` should not be exposed on a public IP/domain — only reachable from `apps/agent-worker` within the same private network or VPC, per `engineering/SECURITY_REQUIREMENTS.md`.
- `apps/agent-worker` exposes only the minimal endpoint needed for `apps/web` to trigger runs (via the `AGENT_WORKER_URL`/`AGENT_WORKER_TOKEN` pair) — not a broad public API.

## Environments

| Environment | Purpose |
|---|---|
| `development` | Local machine, `pnpm dev` (see `docs/SETUP.md`); can point at a shared dev Neon branch or a local Postgres with pgvector |
| `staging` | Mirrors production topology; used for pre-release verification, seeded with synthetic company/job data, not real user resumes |
| `production` | Live environment |

Neon's branching feature is a good fit here — a dev/staging branch of the same database schema without needing entirely separate Postgres instances, though production data should never be branched into a less-secured environment without anonymization.

## CI/CD flow

1. PR opened → CI runs typecheck, lint, unit/integration tests, E2E smoke suite (see `engineering/TESTING_STRATEGY.md`)
2. Merge to `main` → deploy pipeline triggers:
   - `apps/web` deploys to Vercel automatically (standard Vercel Git integration)
   - `apps/mcp-server` and `apps/agent-worker` build and deploy to their persistent-process host via that platform's deployment mechanism (container build + rolling deploy, or platform-specific equivalent)
3. Database migrations (`packages/db`) run as an explicit, separate step before the new `apps/mcp-server`/`apps/web` versions go live — never auto-applied as a side effect of app boot, to avoid partial-migration states under concurrent deploys

## Scaling considerations

- `apps/mcp-server` and `apps/agent-worker` should scale by running orchestration for different users concurrently (horizontal scaling of the process), not by making a single run faster at the cost of complexity — the workload is naturally parallelizable per-user.
- Puppeteer sessions are the most resource-intensive operation; consider capping concurrent Puppeteer sessions independently of overall service scaling, to avoid one burst of fallback-scraping starving discovery for other users.

## Rollback

- `apps/web` — standard Vercel instant rollback to a previous deployment.
- `apps/mcp-server` / `apps/agent-worker` — rely on the chosen platform's rollback mechanism (previous container image); since these are stateless services (all durable state lives in Postgres), rollback is safe without data migration concerns as long as no breaking Prisma schema change shipped in the same release.
