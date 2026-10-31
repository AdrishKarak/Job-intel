# CLAUDE.md

Instructions for any coding agent (Claude Code or otherwise) working in this repository. Read this first — it tells you which of the 30+ docs in `docs/` actually matters for the task in front of you, so you don't need to read all of them for every change.

## What this project is

A personalized AI job-search assistant: parses a resume once, then continuously discovers, scores, and tracks job opportunities for the user. Full context: `docs/CONTEXT.md`. Read that before making any non-trivial change — it explains what this system is *not* trying to be (not a chatbot, not an auto-apply tool, not a public job board), which prevents a whole category of scope-creep mistakes.

## Repo shape

Pnpm + Turborepo monorepo: `apps/web` (Next.js UI + tRPC), `apps/mcp-server` (long-running MCP tool server), `apps/agent-worker` (LangGraph orchestration), `packages/*` (shared DB schema, ATS connectors, AI clients, types). Full layout: `docs/PROJECT_STRUCTURE.md`. Within-package conventions: `docs/engineering/FOLDER_STRUCTURE.md`.

```
pnpm install
pnpm dev              # runs all three apps
pnpm --filter web dev # runs one app
pnpm db:generate / db:migrate / db:seed
```

Full setup: `docs/SETUP.md`.

## Non-negotiable rules — check these before writing code, not after

1. **Per-user data isolation.** Every query on `Job`, `CandidateProfile`, `Report`, etc. must be scoped to the authenticated `userId` — never trust a client-supplied `userId`. See `docs/engineering/SECURITY_REQUIREMENTS.md`. Treat any violation as critical, not minor.
2. **Agents never touch the database, ATS APIs, AI providers, or email directly.** Everything in `apps/agent-worker` goes through an MCP tool call to `apps/mcp-server`. See `docs/architecture/AGENT_DESIGN.md` and `docs/mcp/AGENT_TOOL_ACCESS.md` for exactly which agent may call which tool.
3. **No auto-apply, ever.** The system surfaces jobs and links; it never submits an application on the user's behalf. See `docs/product/HITL_CHECKPOINTS.md` before building anything that takes an action outside the platform — new automated actions need a HITL checkpoint designed *before* implementation, not after.
4. **Resume files are transient.** Delete after parsing + user confirmation; only structured `CandidateProfile` data persists. See `docs/architecture/DECISIONS.md` ADR-005.
5. **Scraped content is untrusted input to LLMs, not just untrusted data.** Any job description or scraped text going into a prompt needs the delimiting/injection-defense pattern in `docs/agents/GUARDRAILS.md` — don't just interpolate it raw.
6. **AI output gets validated before it's trusted**, not just schema-checked. See `docs/agents/GUARDRAILS.md` for the specific checks (score range, matched/missing skill consistency with the explanation text, etc.) and the fallback behavior when a check fails.
7. **No demographic inference for matching.** Scoring uses only skills, experience, salary, location, and remote preference — never inferred age/gender/ethnicity/etc., even if technically derivable from resume content. See `docs/agents/GUARDRAILS.md` §3.
8. **No Kafka.** Event chaining goes through Inngest step functions. If you're tempted to reach for a message broker, read `docs/architecture/DECISIONS.md` ADR-001 first.

## "Which doc do I need" map

| You're about to... | Read first |
|---|---|
| Add/change a database model | `docs/architecture/DOMAIN_MODEL.md`, then edit `packages/db/prisma/schema.prisma` |
| Add a new MCP tool | `docs/mcp/TOOL_REGISTRY.md` (follow "Adding a new tool"), then `docs/mcp/AGENT_TOOL_ACCESS.md` |
| Add or change an agent node | `docs/architecture/AGENT_DESIGN.md`, `docs/architecture/MEMORY_ARCHITECTURE.md` |
| Write or edit a prompt | `docs/agents/AGENT_PROMPTS.md`, `docs/agents/GUARDRAILS.md` |
| Add a tRPC procedure or route | `docs/api/API_SPEC.md`, `docs/engineering/SECURITY_REQUIREMENTS.md` |
| Add a new ATS connector | `docs/architecture/DECISIONS.md` ADR-004, `packages/ats-connectors` conventions in `docs/engineering/FOLDER_STRUCTURE.md` |
| Touch anything user-facing (UI) | `docs/product/PRD.md`, `docs/product/USER_STORIES.md`, `docs/product/ACCEPTANCE_CRITERIA.md`, `docs/frontend/DESIGN_SYSTEM.md` |
| Propose a new automated feature | `docs/product/HITL_CHECKPOINTS.md` — answer its "rule for evaluating new features" before building |
| Deal with a failure/retry case | `docs/engineering/ERROR_HANDLING.md` |
| Add tests | `docs/engineering/TESTING_STRATEGY.md` |
| Deploy or change infra | `docs/operations/DEPLOYMENT_ARCHITECTURE.md` |
| Worried about cost | `docs/operations/COST_STRATEGY.md` |
| Not sure where something belongs | `docs/INDEX.md` — full doc list with one-line descriptions |

## When a decision isn't covered

Check `docs/architecture/DECISIONS.md` first — many "why is it built this way" questions are already answered there as ADRs. If you make a new architectural tradeoff while working, add an ADR entry rather than letting the reasoning live only in a commit message or PR description.

## Current build phase

See `docs/roadmap/TASK_BREAKDOWN.md` for what phase the project is in and what should/shouldn't exist yet — e.g. `apps/mcp-server` and `apps/agent-worker` aren't meant to exist as separate services until Phase 9; earlier phases intentionally run simpler logic directly inside `apps/web`.
