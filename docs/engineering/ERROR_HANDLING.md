# Error Handling

## General principle

Distinguish **expected failure** (a job can fail to parse, an ATS can be unreachable, an email can fail to send) from **unexpected failure** (a programmer error, a violated invariant). Expected failures are returned as typed results; unexpected failures throw and are caught at a top-level boundary and logged at `error` level with full context (see `operations/OBSERVABILITY.md`).

## The `ToolResult` pattern (MCP boundary)

Every MCP tool returns:

```ts
type ToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; retryable: boolean } };
```

(See `mcp/MCP_SPEC.md`.) Callers in `apps/agent-worker` must always check `ok` before accessing `data` — never assume success. This is enforced by making `ToolResult<T>` a discriminated union so TypeScript requires the narrowing.

## Partial failure within a batch operation

Batch tools (`searchJobs` across companies, `scoreJobs` across jobs) never fail the entire call because one item failed. They return per-item failure lists (`companiesFailed`, `failed`) alongside successful results (see `mcp/TOOL_REGISTRY.md`). Callers log/surface the partial failures but proceed with what succeeded — a single flaky ATS endpoint should never block matching or reporting for everything else.

## Retry policy

| Operation | Retry? | Strategy |
|---|---|---|
| ATS connector HTTP call | Yes | 1 retry with short backoff (~2s); mark as failed for this run after that, don't block the batch |
| Firecrawl call | Yes | 1 retry; fall back to Puppeteer only after both attempts fail (per `architecture/DECISIONS.md` — Puppeteer is last resort) |
| Puppeteer session | No automatic retry | These are expensive; a failure here is logged and the job source is skipped for this run |
| AI provider call (Gemini/Groq) | Yes | 1 retry with backoff; if both fail, the specific job/profile item is marked failed, not the whole run |
| `sendEmail` | Yes | 1 retry from the Notification Agent; a persistent failure is logged but never rolls back the already-persisted `Report` (AC 25.3) |
| Database writes | No application-level retry beyond what Prisma/Postgres already provide | A failed write is an unexpected failure — throw and let it surface as an `error`-level log and a failed Inngest run |

## Agent-level failure handling

- If `getProfile` returns `PROFILE_NOT_FOUND`, the Supervisor ends the run cleanly for that user — this is expected (mid-onboarding user), not an error to alert on.
- If a whole orchestration run throws an uncaught exception, the run is marked failed in the logs and the Inngest run dashboard, and the next scheduled run for that user proceeds independently — one failed run must never permanently block future runs (no persistent "stuck" state).
- Agent graph state (per `architecture/MEMORY_ARCHITECTURE.md`) is not resumed mid-run after a crash — a failed run is simply re-triggered from the start on the next schedule or manual retry, since discovery and matching are idempotent (re-running produces the same or updated correct state, not duplicates, thanks to the `(userId, companyId, externalId)` uniqueness constraint on `Job`).

## User-facing error states (`apps/web`)

- Resume parse failure: explicit error message + retry/manual-entry option (AC 2.2) — never silently proceed with an empty profile.
- Any tRPC procedure failure: surfaced as a toast/inline error, not a blank screen; TanStack Query's error state drives this.
- Stale data: if a mutation fails, the UI should not optimistically show the change as if it succeeded — roll back optimistic updates on failure.

## Logging & observability

All caught expected-but-notable failures (a company's discovery failing repeatedly across multiple runs, an AI provider call failing) should be logged with enough context (`userId`, `companyId`/`jobId`, operation name) to investigate without needing to reproduce. See `operations/OBSERVABILITY.md` for log levels and what must never be logged.
