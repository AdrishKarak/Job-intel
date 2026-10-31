# Agent → Tool Access

Which agent (see `architecture/AGENT_DESIGN.md`) may call which MCP tool (see `mcp/TOOL_REGISTRY.md`). This is an enforced boundary, not just documentation — `apps/agent-worker` should structure its MCP client wrapper per-agent so a given agent's code cannot accidentally call a tool outside its allowed set.

| Agent | `searchJobs` | `scoreJobs` | `getProfile` | `updateSkillGaps` | `generateReport` | `sendEmail` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Supervisor | | | ✅ (read-only, routing) | | | |
| Profile Analysis Agent | | | ✅ | | | |
| Job Matching Agent | ✅ | ✅ | | | | |
| Skill Gap Agent | | ✅ (read, for aggregation) | | ✅ | | |
| Report Agent | | | | | ✅ | |
| Notification Agent | | | | | | ✅ |

## Rationale for restricting access this tightly

- **Supervisor** only reads the profile to make routing decisions (e.g. skip a user with no profile yet) — it never mutates state or triggers discovery/matching itself, keeping it a thin coordination layer.
- **Job Matching Agent** is the only agent with `searchJobs` access, since discovery and matching are tightly coupled steps (you score what you just discovered) and giving other agents discovery access would create unclear ownership of when new jobs get pulled in.
- **Skill Gap Agent** does not call `generateReport` directly — its output (`SkillGapRecommendation` updates, persisted via `updateSkillGaps`) is a durable side effect within its own tool calls, but the actual report compilation stays owned by the Report Agent so there's a single place that assembles the final summary.
- **Report Agent** and **Notification Agent** are kept separate (rather than one agent generating and sending) so a reporting failure and a delivery failure are distinguishable in logs/observability, and so delivery failures never block report persistence (see `product/ACCEPTANCE_CRITERIA.md` AC 25.3).

## Extending this table

When adding a new agent or a new tool, update this matrix in the same PR — an agent gaining tool access should be a visible, reviewable change, not something inferred from reading implementation code.
