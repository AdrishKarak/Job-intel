# Environment Variables

**One file, for now.** During Phases 0–8 everything runs inside `apps/web`, so there is a single `apps/web/.env` (template: `apps/web/.env.example`). See `architecture/DECISIONS.md` ADR-012 for why, and the "Phase 9 split" section below for what changes when `apps/mcp-server` and `apps/agent-worker` are extracted.

Rules that apply to every variable:

- Only `NEXT_PUBLIC_*` values may reach the browser. Everything else is server-only — never prefix a secret with `NEXT_PUBLIC_`.
- The real `.env` is gitignored; only `.env.example` (blank values) is committed.
- Validate the environment at startup with a Zod schema in `apps/web` so a missing required key fails fast and clearly, instead of surfacing as a confusing runtime error halfway through a discovery run.

## Required to boot (Phase 0)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Base URL used for links in emails/reports |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client-side key |
| `CLERK_SECRET_KEY` | Clerk server-side key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Auth routes (`/sign-in`, `/sign-up`) |
| `CLERK_WEBHOOK_SECRET` | Verifies Clerk webhook payloads at `/api/webhooks/clerk` |
| `DATABASE_URL` | Neon **pooled** connection string — used by the Prisma client at runtime |
| `DIRECT_URL` | Neon **unpooled** connection string — used only by `prisma migrate` (wired via `directUrl` in `schema.prisma`) |

## AI (Phase 1 onward)

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Resume parsing, match explanations, report text, embeddings. Embedding dimension must equal `vector(N)` in `schema.prisma` (currently 1536) |
| `GROQ_API_KEY` | Faster/cheaper inference for lighter steps |

## Job discovery (Phase 2 onward)

| Variable | Needed for | Notes |
|---|---|---|
| `FIRECRAWL_API_KEY` | Wellfound, custom career sites | Phase 8 |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `ADZUNA_COUNTRY` | Adzuna aggregator | Free, self-serve; ~250 calls/day by default; thin job detail |
| `JOOBLE_API_KEY` | Jooble aggregator | Free, but emailed after a request form; key sits in the URL path, so keep server-side; returns snippets |
| `RAPIDAPI_KEY` | JSearch (LinkedIn/Indeed/Glassdoor coverage via licensed data) | Free plan ≈ 200 requests/month — prototype scale only |
| `THE_MUSE_API_KEY` | The Muse | Sources disagree on whether a key is required; try blank first |
| `FINDWORK_API_TOKEN` | Findwork | Free-tier terms unverified — check before relying on it |
| `USAJOBS_API_KEY`, `USAJOBS_USER_AGENT_EMAIL` | USAJOBS (US federal only) | Commented out by default; API reported unreliable |

**No key needed:** Greenhouse, Lever, Ashby (public per-company JSON boards, keyed by the slug in the `Company` table), Arbeitnow, Remotive (rate-limited — poll gently), RemoteOK (**terms require a visible link back**), Himalayas (confirm terms before shipping).

Every aggregator is optional. A source whose variable is blank is skipped at runtime, not treated as an error — see `engineering/ERROR_HANDLING.md` on partial failure.

## Email, scheduling, storage

| Variable | Purpose |
|---|---|
| `SMTP_USER` | Brevo SMTP login (format: `xxxxxxx@smtp-brevo.com`) — from Brevo dashboard → SMTP & API → SMTP tab (Phase 7) |
| `SMTP_PASS` | Brevo SMTP key/password from the same tab. Server-only, never log |
| `SMTP_FROM` | Verified sender address (e.g. your Gmail verified in Brevo → Senders & IPs → Senders) |
| `INNGEST_EVENT_KEY` | Sends events to Inngest. Local dev: run `npx inngest-cli dev`, no keys needed |
| `INNGEST_SIGNING_KEY` | Verifies invocations at `/api/inngest` (production) |
| `AWS_ENDPOINT_URL_S3` | NeonDB S3-compatible endpoint URL, e.g. `https://<bucket>.storage.<region>.aws.neon.tech` — find it in your Neon project's Object Storage settings |
| `AWS_REGION` | AWS region for the NeonDB bucket, e.g. `ap-southeast-1` |
| `AWS_ACCESS_KEY_ID` | Access key ID generated in Neon's Object Storage credentials panel |
| `AWS_SECRET_ACCESS_KEY` | Secret access key paired with the above. Keep server-only; never log or expose to the browser |
| `STORAGE_BUCKET_NAME` | Bucket name as shown in Neon's Object Storage settings. Holds resumes only between upload and parse-confirmation (ADR-005) |

## Self-generated secrets

None are needed in single-app mode. The two shared tokens from the multi-service design (`MCP_SERVER_TOKEN`, `AGENT_WORKER_TOKEN`) only exist to authenticate calls *between* services, so they disappear until Phase 9.

## Phase 9 split

When `apps/mcp-server` and `apps/agent-worker` are extracted (`roadmap/TASK_BREAKDOWN.md` Phase 9), move variables to the service that actually uses them and give each its own `.env`:

| Service | Gets |
|---|---|
| `apps/web` | Clerk, `DATABASE_URL`/`DIRECT_URL`, Inngest, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `STORAGE_BUCKET_NAME`, `AGENT_WORKER_URL`, `AGENT_WORKER_TOKEN` |
| `apps/mcp-server` | `DATABASE_URL`/`DIRECT_URL`, Gemini/Groq, Firecrawl, all job-API keys, `SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`, `MCP_SERVER_PORT`, `MCP_SERVER_TOKEN` |
| `apps/agent-worker` | `MCP_SERVER_URL`, `MCP_SERVER_TOKEN`, `AGENT_WORKER_PORT`, `AGENT_WORKER_TOKEN` (AI keys only if a node reasons outside an MCP tool — should be rare) |

New shared values at that point (generate each with `openssl rand -hex 32`):

- `MCP_SERVER_TOKEN` — identical in `apps/mcp-server` and `apps/agent-worker`
- `AGENT_WORKER_TOKEN` — identical in `apps/web` and `apps/agent-worker`

The reason for splitting then is blast radius: once separate services exist, `apps/web` should no longer hold `GEMINI_API_KEY`, `FIRECRAWL_API_KEY`, or the job-API keys (see `engineering/SECURITY_REQUIREMENTS.md`).

## Notes

- A dedicated embedding-provider key is not listed — embeddings use `GEMINI_API_KEY` unless a different provider is chosen later, in which case add `EMBEDDING_API_KEY`.
- Scraping LinkedIn or Indeed directly is out of scope (terms-of-service and blocking risk). Cover them through a licensed aggregator such as JSearch instead.
- **NeonDB Object Storage setup:** install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` (`npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner dotenv`). All storage vars (`AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `STORAGE_BUCKET_NAME`) are server-only — no browser-reachable env var is needed. Configure the bucket as private (no public-read ACL). The server generates short-lived pre-signed PUT URLs for uploads; objects are namespaced by `userId` and the path is always chosen server-side. Set a lifecycle/expiry rule in Neon's Object Storage settings to auto-delete objects older than 1 day as a backstop for abandoned uploads (`engineering/SECURITY_REQUIREMENTS.md`).
- There is no error-tracking service (no Sentry), so there are no DSN or auth-token variables — see `operations/OBSERVABILITY.md` and ADR-013.
