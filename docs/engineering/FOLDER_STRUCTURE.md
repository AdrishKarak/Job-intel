# Folder Structure (within-package conventions)

`docs/PROJECT_STRUCTURE.md` shows the monorepo-level tree (which apps/packages exist and why). This document covers the conventions *within* each app/package — how to organize code once you're inside `apps/web`, `apps/mcp-server`, `apps/agent-worker`, or a `packages/*` module.

## `apps/web`

Feature-oriented, not type-oriented, within the App Router:

```
app/
├── (dashboard)/
│   ├── page.tsx
│   ├── components/          # components used only by the dashboard page
│   └── hooks/                # hooks used only by the dashboard page
├── (profile)/
│   ├── page.tsx
│   ├── components/
│   └── hooks/
├── (jobs)/
│   ├── page.tsx
│   ├── components/
│   └── hooks/
└── api/
    ├── webhooks/clerk/route.ts
    └── inngest/route.ts
```

Shared, cross-page components (buttons, layout shells, shadcn primitives) live in the top-level `components/` directory, not inside any one page's folder. A component only moves to the shared `components/` directory once a second page actually needs it — don't pre-emptively generalize.

`server/trpc/` mirrors the page structure: `profileRouter.ts`, `jobsRouter.ts`, `reportsRouter.ts`, combined into a root router.

## `apps/mcp-server`

Organized by MCP tool, not by underlying implementation detail:

```
src/
├── tools/              # one file per exposed MCP tool — the public contract surface
│   ├── searchJobs.ts
│   ├── scoreJobs.ts
│   ├── getProfile.ts
│   ├── generateReport.ts
│   └── sendEmail.ts
├── discovery/           # internals used by searchJobs.ts — not exposed as tools themselves
├── matching/             # internals used by scoreJobs.ts
├── reporting/            # internals used by generateReport.ts
└── server.ts             # MCP server bootstrap, tool registration
```

Each file in `tools/` should be thin — validate input, call into the relevant internal module (`discovery/`, `matching/`, `reporting/`), shape the output per `mcp/TOOL_REGISTRY.md`, and return. Business logic belongs in the internal modules so it's independently testable without spinning up the MCP server.

## `apps/agent-worker`

Organized by graph node, matching `architecture/AGENT_DESIGN.md` one-to-one:

```
src/
├── graph/
│   ├── supervisor.ts
│   ├── profileAgent.ts
│   ├── matchingAgent.ts
│   ├── skillGapAgent.ts
│   ├── reportAgent.ts
│   ├── notificationAgent.ts
│   └── graph.ts          # wires nodes + conditional edges
├── mcpClient.ts           # single MCP client instance, scoped per-agent tool access (see mcp/AGENT_TOOL_ACCESS.md)
└── index.ts
```

No agent file should import another agent file directly — all handoffs happen through the graph definition in `graph.ts`, keeping the control flow in one place rather than scattered across node implementations.

## `packages/*`

Each package exports a clean public surface via its `index.ts` / `src/index.ts` — internal files are not imported directly by consumers across package boundaries.

```
packages/ats-connectors/
├── src/
│   ├── greenhouse.ts
│   ├── lever.ts
│   ├── ashby.ts
│   ├── workday.ts
│   ├── smartrecruiters.ts
│   ├── workable.ts
│   ├── normalize.ts
│   └── index.ts        # re-exports the public connector interface
```

## Tests

Co-located with the code they test (`foo.ts` + `foo.test.ts` in the same directory), not mirrored in a separate top-level `tests/` tree — this keeps a file and its tests moving together during refactors. End-to-end tests (Playwright) are the one exception, living in a top-level `e2e/` directory within `apps/web`, since they test cross-page flows rather than a single unit.
