# Project Structure

Monorepo managed with **pnpm workspaces + Turborepo**.

```
ai-job-intelligence-platform/
├── apps/
│   ├── web/                      # Next.js 15 frontend + tRPC API layer
│   │   ├── app/
│   │   │   ├── globals.css       # design tokens (colors, radius) per docs/frontend/DESIGN_SYSTEM.md
│   │   │   ├── (dashboard)/      # Dashboard page + components
│   │   │   ├── (profile)/        # Profile page + components
│   │   │   ├── (jobs)/           # Jobs CRM page + components
│   │   │   ├── api/              # Route handlers (webhooks, Inngest endpoint, etc.)
│   │   │   └── layout.tsx
│   │   ├── server/
│   │   │   ├── trpc/             # tRPC routers (profile, jobs, reports)
│   │   │   └── inngest/          # Inngest client + scheduled functions
│   │   ├── components/           # shadcn/ui-based shared components
│   │   ├── lib/                  # client-side utilities
│   │   ├── .env.example
│   │   └── package.json
│   │
│   ├── mcp-server/                # Long-running Node service exposing MCP tools
│   │   ├── src/
│   │   │   ├── tools/
│   │   │   │   ├── searchJobs.ts
│   │   │   │   ├── scoreJobs.ts
│   │   │   │   ├── getProfile.ts
│   │   │   │   ├── generateReport.ts
│   │   │   │   └── sendEmail.ts
│   │   │   ├── discovery/         # ATS connector orchestration, Firecrawl, Puppeteer fallback
│   │   │   ├── matching/          # scoring logic, embedding generation/comparison
│   │   │   ├── server.ts          # MCP protocol server entrypoint
│   │   │   └── index.ts
│   │   ├── .env.example
│   │   └── package.json
│   │
│   └── agent-worker/               # LangGraph orchestration, MCP client
│       ├── src/
│       │   ├── graph/
│       │   │   ├── supervisor.ts
│       │   │   ├── profileAgent.ts
│       │   │   ├── matchingAgent.ts
│       │   │   ├── skillGapAgent.ts
│       │   │   ├── reportAgent.ts
│       │   │   ├── notificationAgent.ts
│       │   │   └── graph.ts        # wires nodes + conditional edges together
│       │   ├── mcpClient.ts        # connects to apps/mcp-server
│       │   └── index.ts
│       ├── .env.example
│       └── package.json
│
├── packages/
│   ├── db/                         # Prisma schema + generated client (shared)
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── seed.ts
│   │   └── package.json
│   │
│   ├── ats-connectors/              # One module per ATS
│   │   ├── src/
│   │   │   ├── greenhouse.ts
│   │   │   ├── lever.ts
│   │   │   ├── ashby.ts
│   │   │   ├── workday.ts
│   │   │   ├── smartrecruiters.ts
│   │   │   ├── workable.ts
│   │   │   └── normalize.ts        # maps every ATS shape → common Job shape
│   │   └── package.json
│   │
│   ├── ai-clients/                  # Gemini / Groq wrappers
│   │   ├── src/
│   │   │   ├── gemini.ts
│   │   │   ├── groq.ts
│   │   │   └── embeddings.ts
│   │   └── package.json
│   │
│   └── shared-types/                # Zod schemas + shared TS types used across apps
│       ├── src/
│       │   ├── job.ts
│       │   ├── profile.ts
│       │   └── report.ts
│       └── package.json
│
├── docs/                             # ← you are here
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Ownership boundaries

- **`apps/web`** never talks to ATS connectors, Firecrawl, or the AI providers directly. It reads/writes via Prisma (`packages/db`) for CRUD, and triggers agent runs (via Inngest → HTTP call to `apps/agent-worker`, or directly to `apps/mcp-server` for simple reads) for anything AI-driven.
- **`apps/mcp-server`** is the only app allowed to call ATS connectors, Firecrawl, Puppeteer, and the AI provider clients directly. Per `architecture/AGENT_DESIGN.md`, agents never bypass it.
- **`apps/agent-worker`** never touches the database or external APIs directly — it only calls tools exposed by `apps/mcp-server` as an MCP client.
- **`packages/db`** is the single source of truth for the schema — both `apps/web` and `apps/mcp-server` import the generated Prisma client from here rather than each maintaining their own.

## Where new code goes

| Task | Location |
|---|---|
| New ATS connector | `packages/ats-connectors/src/` |
| New MCP tool | `apps/mcp-server/src/tools/` |
| New agent node | `apps/agent-worker/src/graph/` |
| New dashboard widget | `apps/web/app/(dashboard)/` |
| New database model | `packages/db/prisma/schema.prisma` → migrate |
| New shared type/schema | `packages/shared-types/src/` |
| New design token or theme change | `apps/web/tailwind.config.ts` + `apps/web/app/globals.css` — see `docs/frontend/DESIGN_SYSTEM.md` first |
