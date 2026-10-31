# MCP Spec

How this project implements and uses the Model Context Protocol.

## Transport

`apps/mcp-server` runs as a standalone long-running Node process (see `architecture/DECISIONS.md`, ADR-006) and is reached over the network by `apps/agent-worker`. It exposes MCP over **streamable HTTP** (not stdio, since the client is a separate networked process rather than a subprocess).

```
apps/agent-worker  --(HTTP, MCP protocol)-->  apps/mcp-server
```

## Server identity

- **Name:** `job-intelligence-mcp`
- **Version:** semantic-versioned alongside the rest of the monorepo; bump on any tool signature change
- Capabilities advertised: `tools` only (no `resources` or `prompts` in initial scope — there's no need to expose browsable resources or reusable prompt templates to the client for this system's use case)

## Authentication between agent-worker and mcp-server

Since both services run inside the same private network/deployment (see `operations/DEPLOYMENT_ARCHITECTURE.md`), auth is a shared-secret bearer token, not a full OAuth flow:

- `MCP_SERVER_URL` and `MCP_SERVER_TOKEN` are configured in `apps/agent-worker`'s environment
- `apps/mcp-server` validates the bearer token on every request and rejects unauthenticated calls
- This token is never exposed to `apps/web` or the browser — only the two backend services know it

## Tool listing

Full signatures live in `mcp/TOOL_REGISTRY.md`. Summary:

| Tool | Purpose |
|---|---|
| `searchJobs` | Discover/refresh jobs for a user against the company registry |
| `scoreJobs` | Compute match score, matched/missing skills, AI explanation for jobs |
| `getProfile` | Retrieve a user's structured candidate profile |
| `updateSkillGaps` | Persist aggregated skill-gap recommendations |
| `generateReport` | Compile a daily/weekly report summary + Excel export |
| `sendEmail` | Deliver a report via Resend |

## Versioning policy

- Additive changes (new optional input field, new output field) do not require a version bump communicated to clients — `apps/agent-worker` and `apps/mcp-server` are deployed from the same monorepo and same commit, so there's no cross-version compatibility concern in practice.
- Breaking changes (removed/renamed field, changed semantics) should still be called out explicitly in the tool's changelog comment in `mcp/TOOL_REGISTRY.md`, since agent code depends on exact shapes.

## Error handling contract

Every tool response follows a consistent shape so `apps/agent-worker` can handle failures uniformly:

```ts
type ToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; retryable: boolean } };
```

Agents branch on `retryable` to decide whether to retry once (per `engineering/ERROR_HANDLING.md`) or log-and-continue.

## What MCP is NOT used for in this project

- Not used as the interface between `apps/web` and its own backend — that's plain tRPC, since the browser never needs to be an MCP client here.
- Not used to expose tools to any third-party LLM client — this MCP server is internal-only, consumed solely by `apps/agent-worker`.
