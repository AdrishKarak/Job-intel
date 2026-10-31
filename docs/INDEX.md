# Documentation Index

Full map of `docs/`. Start with `CONTEXT.md` if you're new to the project; start with the root `CLAUDE.md` if you're a coding agent about to make a change.

## Top level

| Doc | What it covers |
|---|---|
| [`CONTEXT.md`](./CONTEXT.md) | The problem, the solution, the core pipeline, what this is NOT |
| [`SETUP.md`](./SETUP.md) | Local dev environment setup, running the monorepo |
| [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md) | Monorepo layout — apps, packages, ownership boundaries |

## `product/` — what to build and why

| Doc | What it covers |
|---|---|
| [`PRD.md`](./product/PRD.md) | Problem statement, goals, non-goals, target user, success metrics |
| [`USER_STORIES.md`](./product/USER_STORIES.md) | Feature-by-feature user stories |
| [`ACCEPTANCE_CRITERIA.md`](./product/ACCEPTANCE_CRITERIA.md) | Given/When/Then criteria for the highest-priority stories |
| [`HITL_CHECKPOINTS.md`](./product/HITL_CHECKPOINTS.md) | Where the system requires human confirmation before acting, and the rule for evaluating new automated features |

## `architecture/` — how the system is shaped

| Doc | What it covers |
|---|---|
| [`SYSTEM_ARCHITECTURE.md`](./architecture/SYSTEM_ARCHITECTURE.md) | The three services, daily pipeline, onboarding flow, data flow ownership |
| [`DOMAIN_MODEL.md`](./architecture/DOMAIN_MODEL.md) | Bounded contexts, entities, relationships (conceptual companion to `packages/db/prisma/schema.prisma`) |
| [`AGENT_DESIGN.md`](./architecture/AGENT_DESIGN.md) | The LangGraph agent graph, each agent's responsibilities, error handling |
| [`MEMORY_ARCHITECTURE.md`](./architecture/MEMORY_ARCHITECTURE.md) | The four kinds of memory in this system and their durability |
| [`DECISIONS.md`](./architecture/DECISIONS.md) | ADR log — every major tradeoff and why it was made |

## `mcp/` — the agent/tool boundary

| Doc | What it covers |
|---|---|
| [`MCP_SPEC.md`](./mcp/MCP_SPEC.md) | Transport, auth, versioning, error contract for the MCP server |
| [`TOOL_REGISTRY.md`](./mcp/TOOL_REGISTRY.md) | Exact input/output signatures for every MCP tool |
| [`AGENT_TOOL_ACCESS.md`](./mcp/AGENT_TOOL_ACCESS.md) | Which agent may call which tool, and why |
| [`MCP_WORKFLOWS.md`](./mcp/MCP_WORKFLOWS.md) | End-to-end tool call sequences for each major flow |

## `frontend/` — visual design

| Doc | What it covers |
|---|---|
| [`DESIGN_SYSTEM.md`](./frontend/DESIGN_SYSTEM.md) | Neobrutalism theme: color tokens, typography, layout, component patterns, accessibility, Tailwind/shadcn implementation notes |

## `engineering/` — how to write the code

| Doc | What it covers |
|---|---|
| [`TECH_STACK.md`](./engineering/TECH_STACK.md) | Full stack list with rationale |
| [`CODING_STANDARDS.md`](./engineering/CODING_STANDARDS.md) | TypeScript/React conventions, naming, imports, commits |
| [`FOLDER_STRUCTURE.md`](./engineering/FOLDER_STRUCTURE.md) | Within-app/package directory conventions |
| [`TESTING_STRATEGY.md`](./engineering/TESTING_STRATEGY.md) | Test pyramid, what to test where, CI gates |
| [`ERROR_HANDLING.md`](./engineering/ERROR_HANDLING.md) | Expected vs. unexpected failures, retry policy, partial-failure handling |
| [`SECURITY_REQUIREMENTS.md`](./engineering/SECURITY_REQUIREMENTS.md) | Data isolation, auth, secrets, scraping conduct |

## `api/` — the tRPC + env surface

| Doc | What it covers |
|---|---|
| [`API_SPEC.md`](./api/API_SPEC.md) | tRPC routers, procedures, webhooks |
| [`ENVIRONMENT_VARIABLES.md`](./api/ENVIRONMENT_VARIABLES.md) | Every env var, which app needs it, what it's for |
| [`RATE_LIMITS.md`](./api/RATE_LIMITS.md) | Scraping, AI provider, and internal API rate limits |

## `operations/` — running it in production

| Doc | What it covers |
|---|---|
| [`DEPLOYMENT_ARCHITECTURE.md`](./operations/DEPLOYMENT_ARCHITECTURE.md) | Where each service deploys, network topology, CI/CD, rollback |
| [`OBSERVABILITY.md`](./operations/OBSERVABILITY.md) | Structured logging, Inngest run visibility, key metrics, alerting thresholds (no error tracker) |
| [`COST_STRATEGY.md`](./operations/COST_STRATEGY.md) | Cost drivers and the controls already built into the design |

## `agents/` — the AI layer specifically

| Doc | What it covers |
|---|---|
| [`AGENT_PROMPTS.md`](./agents/AGENT_PROMPTS.md) | Prompt templates for each agent's AI-driven steps |
| [`GUARDRAILS.md`](./agents/GUARDRAILS.md) | Prompt injection defense, output validation, fairness guardrail |
| [`EVALUATION_CRITERIA.md`](./agents/EVALUATION_CRITERIA.md) | How to judge whether each AI component is working well enough to trust |
| [`KICKOFF_PROMPT.md`](./agents/KICKOFF_PROMPT.md) | The prompt to paste into a coding agent to have it read all docs and work through `roadmap/TASK_BREAKDOWN.md` phase by phase, with a review checkpoint after each phase |

## `roadmap/` — build order

| Doc | What it covers |
|---|---|
| [`TASK_BREAKDOWN.md`](./roadmap/TASK_BREAKDOWN.md) | Phased build plan, what should/shouldn't exist at each phase |

## Reading order for a new contributor

1. `CONTEXT.md` — what and why
2. `product/PRD.md` — the product in more detail
3. `architecture/SYSTEM_ARCHITECTURE.md` — how it's shaped
4. `PROJECT_STRUCTURE.md` + `SETUP.md` — get it running locally
5. `roadmap/TASK_BREAKDOWN.md` — find where the project currently is, and start there

## Reading order for a coding agent about to make a change

Don't read all 30+ docs — use the root `CLAUDE.md`'s task-based map to jump straight to the 2-3 docs relevant to your change.
