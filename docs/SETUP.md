# Setup

## Prerequisites

- **Node.js** 20+ (LTS)
- **pnpm** 9+ (`npm install -g pnpm`)
- **Turborepo** — installed as a dev dependency at the repo root, no global install needed
- A **Neon PostgreSQL** database (with the `pgvector` extension enabled)
- API keys for: Clerk, Gemini, Groq, Firecrawl, Brevo SMTP credentials, Inngest, NeonDB Object Storage (access key + secret for resume storage), plus any optional job APIs you want (Adzuna, Jooble, JSearch, …) — see `api/ENVIRONMENT_VARIABLES.md`

## 1. Clone and install

```bash
git clone <repo-url>
cd ai-job-intelligence-platform
pnpm install
```

This installs dependencies for every app and package in the monorepo via pnpm workspaces.

## 2. Environment variables

There is a single `.env` file for Phases 0–8 (ADR-012):

```bash
cp apps/web/.env.example apps/web/.env
```

Fill in the values. See `api/ENVIRONMENT_VARIABLES.md` for what each one does and where to get it. At minimum you need the Clerk and database variables to boot; add the AI, job-API, email, and Inngest keys as you reach the phases that use them. Every job-API key is optional — a blank one just disables that source.

**Prisma and the single `.env`:** Next.js loads `apps/web/.env` automatically, but Prisma commands run from `packages/db` and won't see it. Load it explicitly in `packages/db/package.json` with `dotenv-cli`:

```json
"scripts": {
  "prisma": "dotenv -e ../../apps/web/.env -- prisma",
  "seed": "dotenv -e ../../apps/web/.env -- tsx seed.ts"
}
```

Then run `pnpm --filter @repo/db prisma migrate dev` (the root `db:*` scripts already go through this filter). Without it, `prisma migrate` fails with "Environment variable not found: DATABASE_URL".

## 3. Database setup

The Prisma schema lives in `packages/db`.

```bash
cd packages/db
pnpm prisma generate
pnpm prisma migrate dev --name init
```

This creates the tables described in `architecture/DOMAIN_MODEL.md`. Make sure the `pgvector` extension is enabled on your Neon database before running migrations — Neon supports this via the SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Note on vector indexes:** `prisma migrate dev` can create the `vector` columns themselves (via `Unsupported("vector(1536)")`, per `packages/db/prisma/schema.prisma`), but it does not support creating pgvector's similarity indexes (HNSW/IVFFlat). Add those with a custom migration once similarity search is actually implemented in Phase 4:

```bash
pnpm prisma migrate dev --name add-vector-indexes --create-only
```

then hand-edit the generated migration file to add, e.g.:

```sql
CREATE INDEX ON "candidate_profiles" USING hnsw ("profileEmbedding" vector_cosine_ops);
CREATE INDEX ON "jobs" USING hnsw ("jobEmbedding" vector_cosine_ops);
```

before applying it.

## 4. Seed the company registry

The `Company` table needs an initial set of companies to poll (see `roadmap/TASK_BREAKDOWN.md` Phase 2 — start with ~20–30 Greenhouse/Lever companies).

```bash
cd packages/db
pnpm seed
```

(Seed script location/contents TBD as Phase 2 is implemented — this section should be updated once it exists.)

## 5. Running the apps

From the repo root, using Turborepo:

```bash
pnpm dev
```

This starts all three apps concurrently:

| App | Default port | What it is |
|---|---|---|
| `apps/web` | `3000` | Next.js frontend + tRPC API |
| `apps/mcp-server` | `4000` | MCP tool server (long-running Node process) |
| `apps/agent-worker` | `4100` | LangGraph agent orchestration process |

To run a single app instead:

```bash
pnpm --filter web dev
pnpm --filter mcp-server dev
pnpm --filter agent-worker dev
```

## 6. Verifying the setup

- Visit `http://localhost:3000` — you should be able to sign up via Clerk and land on an empty Dashboard.
- `apps/mcp-server` should log a "MCP server listening on port 4000" (or similar) message on startup.
- `apps/agent-worker` should log that it successfully connected to the MCP server as a client.

If any of these fail, check `api/ENVIRONMENT_VARIABLES.md` first — most early setup issues are missing or mismatched keys between apps.

## Common issues

| Symptom | Likely cause |
|---|---|
| Prisma migration fails referencing `vector` type | `pgvector` extension not enabled on the Neon database |
| `agent-worker` can't reach `mcp-server` | Check the MCP server's host/port env var matches between the two apps |
| Clerk redirects fail | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `SIGN_UP_URL` mismatch with your Clerk dashboard config |
