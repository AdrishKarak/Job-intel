# Security Requirements

## Per-user data isolation (highest priority)

- Every query touching `Job`, `CandidateProfile`, `UserSkill`, `Report`, `SkillGapRecommendation`, or `ApplicationStatusHistory` must be scoped by `userId`, derived from the authenticated session — never accepted as a raw client-supplied parameter without cross-checking against the session.
- tRPC procedures that touch user-scoped data must derive `userId` from the Clerk session context (`ctx.auth.userId`), not from request input, even if the input happens to include a `userId` field for convenience elsewhere.
- MCP tools accept `userId` as an explicit input (since `apps/mcp-server` has no session concept of its own) — but callers (`apps/agent-worker`) only ever pass the `userId` for the orchestration run currently executing, and tool implementations must not allow one tool call to touch another user's rows via any parameter.
- This is directly tied to `product/ACCEPTANCE_CRITERIA.md` AC 27.1 — treat any violation as a critical bug, not a minor one.

## Authentication & session handling

- Clerk owns authentication; `apps/web` validates the session on every request via Clerk's middleware — no route or tRPC procedure should assume authentication without explicit verification.
- Clerk webhooks (user created/updated/deleted) are verified using Clerk's signing secret before being trusted — never process an unverified webhook payload.

## Secrets management

- All API keys/secrets (Clerk, Gemini, Groq, Firecrawl, Brevo SMTP credentials, Inngest, the NeonDB Object Storage credentials, the internal MCP bearer token once it exists in Phase 9) live in environment variables per `api/ENVIRONMENT_VARIABLES.md` — never committed to the repo, never logged in plaintext.
- The MCP server's bearer token (`MCP_SERVER_TOKEN`, see `mcp/MCP_SPEC.md`) is known only to `apps/mcp-server` and `apps/agent-worker` — it must not be exposed to `apps/web` or any browser-reachable code path.
- Logging must redact or omit secrets and full API keys even in error messages (e.g. don't log a full Authorization header on a failed request).

## Resume handling

- Uploaded resume files are held only transiently (upload → parse) and deleted immediately after successful parsing and user confirmation (see `architecture/DECISIONS.md` ADR-005) — this is a privacy requirement, not just a storage optimization.
- If a parse fails and the user needs to retry, the file may be retained briefly for that retry flow, but should still be deleted on an upper time bound (e.g. failed uploads older than 24 hours are purged by a cleanup job) so failures don't become a backdoor to indefinite storage.
- Resume files live in a **private NeonDB Object Storage bucket** (AWS S3-compatible): the bucket has no public-read ACL, uploads use short-lived pre-signed PUT URLs that the server generates via `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` only after verifying the Clerk session, object paths are namespaced by `userId` and are never chosen by the client, and a lifecycle/expiry rule in Neon's Object Storage settings deletes any object older than 1 day as a backstop for abandoned uploads (complementing the 24-hour purge above).
- The NeonDB storage credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) are full-access credentials for the bucket. Keep them server-only, never log them, and scope the Neon Object Storage key to the minimum necessary permissions.

## Input validation

- Every external-facing boundary (tRPC inputs, MCP tool inputs, webhook payloads) is validated with Zod before any processing — this is both a correctness and security measure, since unvalidated input is the most common vector for downstream injection or crash-based issues.
- ATS connector responses and Firecrawl/Puppeteer scrape results are treated as untrusted external input, not just "data" — sanitize/validate before storing (e.g. don't store obviously malformed job descriptions that suggest a scrape went wrong and captured non-job content).

## Scraping conduct

- Respect `robots.txt` and reasonable per-company rate limits when scraping career sites directly (Puppeteer path) — see `api/RATE_LIMITS.md`. This is both a legal/ethical requirement and a practical one (getting IP-banned from a target company's site defeats the purpose).
- Puppeteer sessions should not attempt to bypass explicit anti-bot mechanisms (CAPTCHAs, active fingerprinting defenses) — if a site blocks automated access this deliberately, treat that company as unsupported rather than escalating evasion techniques.

## Inter-service communication

- `apps/agent-worker` ↔ `apps/mcp-server` communication uses the shared-secret bearer token (see `mcp/MCP_SPEC.md`) and should run over TLS in any non-local environment.
- Both services should be deployed on a private network where possible, not exposing `apps/mcp-server`'s port to the public internet at all — `apps/web` never needs to reach it directly (see `architecture/SYSTEM_ARCHITECTURE.md` ownership boundaries).

## Dependency hygiene

- Run automated dependency vulnerability scanning (e.g. `pnpm audit`, or a CI-integrated tool) on a schedule, not just at initial setup.
- Pin exact versions for security-sensitive dependencies (auth, crypto-adjacent libraries) rather than broad semver ranges.

## Email content

- Report emails should not include a user's full resume content or highly sensitive raw profile data beyond what's needed for the summary (job titles, companies, scores, skill names) — minimize what's transmitted over email, which is a less secure channel than the authenticated app itself.
