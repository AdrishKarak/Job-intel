# Testing Strategy

## Test pyramid

```
        ▲
        │   E2E (Playwright) — few, high-value
        │   ─────────────────────────
        │   Integration (Vitest + real DB/test containers) — moderate
        │   ─────────────────────────
        │   Unit (Vitest) — many, fast
        ▼
```

## Unit tests (Vitest)

**What gets unit tested:**
- Rule-based scoring logic (`apps/mcp-server/src/matching/`) — given fixed profile + job inputs, assert exact match score and matched/missing skills output. This is the highest-value test surface in the whole system since scoring correctness is the product's core promise.
- ATS connector normalization (`packages/ats-connectors/src/normalize.ts`) — given raw sample payloads from each ATS (fixtures), assert the normalized `Job` shape is correct.
- Skill gap aggregation logic — given a batch of scored jobs, assert frequency counts are correct.
- Zod schemas — boundary validation accepts valid shapes and rejects invalid ones.

**What doesn't need unit tests:** thin pass-through code (e.g. a tRPC procedure that just calls Prisma with no branching logic) — cover that at the integration level instead.

## Integration tests (Vitest + test database)

**What gets integration tested:**
- MCP tools end-to-end against a real (test) Postgres instance — e.g. `scoreJobs` actually reads a `CandidateProfile` and writes back to `Job` rows correctly, not just that the pure function inside it is correct.
- tRPC routers against a test database — e.g. updating a job's status actually persists and creates an `ApplicationStatusHistory` row.
- ATS connectors against recorded/mocked HTTP responses (not live external calls in CI — see below).

**External services in tests:** never hit live Greenhouse/Lever/Firecrawl/Gemini/Groq/Resend APIs in automated tests. Use recorded fixtures or a mocking library (e.g. `msw` for HTTP-level mocking). This keeps tests deterministic and avoids burning API quota or rate limits (see `api/RATE_LIMITS.md`) on every CI run.

## Agent graph tests

`apps/agent-worker`'s LangGraph nodes should be testable with a **mocked MCP client** — assert that:
- The Job Matching Agent correctly routes to the Skill Gap Agent when any score < 70%, and skips it otherwise (the core conditional logic in `architecture/AGENT_DESIGN.md`)
- A `PROFILE_NOT_FOUND` result from `getProfile` causes the Supervisor to end the run cleanly, not crash it
- Partial failures (e.g. `scoreJobs` returning some `failed` entries) don't halt the whole graph — see `engineering/ERROR_HANDLING.md`

These tests should not require a running `apps/mcp-server` instance — the MCP client is mocked at the boundary.

## End-to-end tests (Playwright)

Cover the three pages' critical user flows, not exhaustive UI permutations:
- Sign up → upload resume → review/edit extracted profile → land on dashboard
- Jobs page: filter by status, open a job's detail panel, update its status, confirm it persists on reload
- Profile page: add a manual skill, confirm it appears and is usable in a subsequent match (may require seeding a test job)

E2E tests run against a seeded test environment, not production data, and should be the smallest layer of the pyramid — reserve them for flows that genuinely span multiple pages/systems.

## Coverage expectations

- No hard blanket coverage percentage requirement — prioritize coverage on scoring logic, connectors, and status transitions (the areas where a silent bug directly produces wrong user-facing results) over incidental UI code.
- Every new MCP tool (see `mcp/TOOL_REGISTRY.md` "Adding a new tool") requires at least one integration test covering its documented success path and its documented error modes.

## CI gates

Before merge:
1. Typecheck (`tsc --noEmit`) across all apps/packages
2. Lint (ESLint)
3. Unit + integration tests (`vitest run`)
4. E2E smoke suite (a small, fast subset of Playwright tests — full E2E suite can run on a schedule rather than every PR if it becomes slow)
