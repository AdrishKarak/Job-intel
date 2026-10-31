# Observability

There is deliberately **no third-party error tracker** (no Sentry or equivalent) — see `architecture/DECISIONS.md` ADR-013. Visibility comes from three places instead:

1. **Structured logs** from every service (below) — the primary record.
2. **Inngest's run dashboard** — per-function and per-step success/failure, timing, and retry history.
3. **`onFailure` handlers** — every Inngest function defines one. It writes a single `error`-level log line with `runId`, `userId`, the step that failed, and the error message, and it counts toward the daily health summary (see "What healthy looks like").

## Structured logging

Each service emits JSON logs (not freeform strings) with at minimum: timestamp, level, service name, `runId`, `userId` (when applicable), operation name, and outcome. Generate one `runId` per orchestration run and carry it through every step, so a single user's run can be traced end to end. Through Phase 8 that is all inside `apps/web`; after the Phase 9 split it spans `apps/agent-worker` and `apps/mcp-server` logs.

**Log levels:**

| Level | Use for |
|---|---|
| `error` | Uncaught exceptions; a whole orchestration run failing; an AI provider call failing after its retry; a company failing discovery across multiple consecutive runs |
| `warn` | Routine, already-handled partial failures (one job failing to score while the rest succeed) — kept out of `error` so that stream stays meaningful |
| `info` | Run start/finish and agent graph node transitions (per `architecture/MEMORY_ARCHITECTURE.md`, working-memory snapshots are logged for debugging, never treated as a source of truth) |

**Never log:** secrets or API keys, full resume content, or full profile PII (see `engineering/SECURITY_REQUIREMENTS.md`). Log identifiers (`userId`, `jobId`, `companyId`), not content.

**Retention caveat:** host log retention is limited and varies by plan, and with no error tracker nothing else keeps a history of failures. That is acceptable for a small project; if you find yourself needing older history, adding a tracker later is a small change (one SDK, two env vars).

## Inngest observability

Inngest provides built-in visibility into scheduled and event-triggered function runs (success/failure per step, timing, retry history) — use this as the primary tool for diagnosing "did the daily run happen for this user, and where did it stop," rather than reconstructing that from application logs alone.

## Key metrics to track

| Metric | Why |
|---|---|
| Job discovery success rate (companies succeeded / companies queried, per run) | Surfaces ATS/Firecrawl/Puppeteer reliability degradation early |
| Match scoring latency (p50/p95 per job batch) | Detects AI provider slowdowns before they cause missed report deadlines |
| Orchestration run success rate (full runs completed without uncaught failure) | Top-level health signal for the whole daily pipeline |
| Email delivery success rate | Surfaces Resend issues separately from report-generation issues (per the Report/Notification agent split in `architecture/AGENT_DESIGN.md`) |
| Duplicate job rate (jobs violating expected uniqueness before the DB constraint catches them) | Signals a normalization bug in `packages/ats-connectors` |
| AI provider error rate (Gemini/Groq) | Correlates with retry-policy effectiveness and potential need for provider fallback |

## Alerting thresholds (starting points — tune with real data)

- Flag if orchestration run failure rate exceeds ~5% of scheduled runs in a day
- Flag if any single company fails discovery for 3+ consecutive scheduled runs (candidate for deactivation per `api/RATE_LIMITS.md`'s company-level backoff)
- Flag if email delivery success rate drops below ~95% over a rolling day
- Treat any `error`-level log from a service with no UI as needing same-day attention. After Phase 9, `apps/mcp-server` and `apps/agent-worker` have no user-facing surface to signal something is wrong, so the daily health summary below is the safety net

## What "healthy" looks like day to day

A quick daily check should answer: how many users had a successful run today, how many jobs were discovered/scored, how many reports were sent, how many `error`-level log lines there were, and whether any company or AI provider is trending toward failure. With no error tracker pushing alerts, make this a scheduled Inngest function that emails the operator a short daily health summary via Resend — it is the substitute for Sentry's alerting, so build it in Phase 11 at the latest.
