# System Architecture

## The three services

```mermaid
graph LR
    U[User Browser] --> WEB[apps/web<br/>Next.js + tRPC]
    WEB --> DB[(Neon Postgres<br/>+ pgvector)]
    WEB -- triggers via Inngest --> AGENT[apps/agent-worker<br/>LangGraph orchestration]
    AGENT -- MCP protocol --> MCP[apps/mcp-server<br/>Tool server]
    MCP --> DB
    MCP --> ATS[ATS Connectors<br/>Greenhouse/Lever/Ashby/<br/>Workday/SmartRecruiters/Workable]
    MCP --> FC[Crawler Pool<br/>Firecrawl Keys 1 & 2<br/>+ Scrape.do proxy]
    MCP --> PUP[Puppeteer fallback]
    MCP --> AI[AI Pool<br/>Gemini Keys 1 & 2<br/>+ Groq pool]
    MCP --> RESEND[Brevo SMTP / Nodemailer<br/>email delivery + Excel attachment]
```

- **`apps/web`** is the only thing the user directly interacts with. It owns the UI (Dashboard, Profile, Jobs) and simple CRUD via tRPC → Prisma.
- **`apps/agent-worker`** runs the LangGraph state machine (Supervisor → Profile → Matching → \[Skill Gap\] → Report → Notification). It has no direct DB or external API access — everything it needs comes from MCP tool calls.
- **`apps/mcp-server`** is the only service allowed to touch ATS connectors, the Firecrawl & Scrape.do crawler pool, Puppeteer, the Gemini & Groq multi-key AI provider pools, and outbound SMTP email delivery. It exposes exactly six tools (see `mcp/TOOL_REGISTRY.md`): `searchJobs`, `scoreJobs`, `getProfile`, `updateSkillGaps`, `generateReport`, `sendEmail`.

This boundary exists so agent logic can be reasoned about, tested, and swapped independently of how job discovery or scoring is actually implemented underneath.

## Daily pipeline (steady state)

```mermaid
sequenceDiagram
    participant Inngest
    participant Web as apps/web
    participant Agent as apps/agent-worker
    participant MCP as apps/mcp-server
    participant DB as Postgres

    Inngest->>Web: scheduled trigger at 19:00 UTC / 12:30 AM IST (cron: "0 19 * * *")
    Web->>Agent: start orchestration run (per user)
    Agent->>MCP: searchJobs(profile)
    MCP->>DB: query Company registry, discover/normalize jobs
    MCP-->>Agent: new/updated Job records
    Agent->>MCP: scoreJobs(jobs, profile)
    MCP-->>Agent: matchScore, matchedSkills, missingSkills per job
    alt matchScore < 70% for a job
        Agent->>Agent: route to Skill Gap Agent
    end
    Agent->>MCP: generateReport(userId)
    MCP-->>Agent: report summary + generated .xlsx workbook buffer
    Agent->>MCP: sendEmail(report, excelAttachment)
    MCP-->>Agent: delivery confirmation (email dispatched with attachment)
```

## Onboarding flow (one-time per user)

```
User signs up (Clerk)
    ↓
User uploads resume → apps/web temp-stores file
    ↓
apps/web calls MCP tool (or a dedicated parse tool) → Gemini extracts structured data
    ↓
User reviews/edits extracted profile in apps/web UI
    ↓
Resume file deleted; only structured CandidateProfile persists
    ↓
First discovery run kicks off (can be immediate, not just the daily schedule)
```

## Why this shape

- **MCP as the only external-facing surface** means job discovery logic, scoring logic, and email delivery can all change without touching agent orchestration code, and vice versa.
- **`agent-worker` as a separate long-running service** (rather than serverless functions inside `apps/web`) was chosen because LangGraph orchestration runs can be longer than typical serverless timeout windows, and because it keeps agent state/orchestration concerns fully decoupled from the request/response lifecycle of the web app.
- **Kafka was explicitly rejected** in favor of Inngest step functions for triggering and chaining this pipeline — see `architecture/DECISIONS.md` for the reasoning.

## Data flow ownership

| Concern | Owner |
|---|---|
| User auth/session | Clerk, validated in `apps/web` |
| Candidate profile CRUD | `apps/web` (tRPC → Prisma) |
| Job discovery | `apps/mcp-server` (`searchJobs`) |
| Match scoring + embeddings | `apps/mcp-server` (`scoreJobs`) |
| Orchestration/sequencing | `apps/agent-worker` |
| Report generation | `apps/mcp-server` (`generateReport`) |
| Email delivery | `apps/mcp-server` (`sendEmail`) |
| Scheduling | Inngest, triggered from `apps/web` |

## Related documents

- `architecture/AGENT_DESIGN.md` — what each agent node does
- `mcp/MCP_SPEC.md` and `mcp/TOOL_REGISTRY.md` — tool contracts
- `architecture/DOMAIN_MODEL.md` — underlying data model
- `architecture/DECISIONS.md` — key architectural tradeoffs and why
