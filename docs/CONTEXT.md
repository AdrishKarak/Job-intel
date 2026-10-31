# Project Context

## What this is

**AI Job Intelligence Platform** — a personalized, AI-powered job-search assistant. A user uploads their resume once; the system then continuously discovers, matches, and tracks job opportunities on their behalf, and reports back daily.

## The problem

Job searching today is fragmented across many disconnected surfaces: LinkedIn, Wellfound, individual company career pages, and ATS platforms like Greenhouse, Workday, and Lever. Candidates manually check each of these, track applications in spreadsheets, miss new postings, and have no systematic way to see which skills are actually holding back their match rate.

## The solution

A single platform that:

1. Parses a resume into a structured candidate profile
2. Continuously discovers jobs across ATS platforms, Wellfound, and company career sites
3. Scores every job against the candidate's profile (skills, experience, salary, location, remote preference)
4. Tracks each application through its lifecycle (saved → applied → OA → interview → offer/rejected)
5. Identifies skill gaps and recommends what to learn next
6. Sends a daily report summarizing everything new

## Core pipeline

```
Resume Upload
    ↓
Resume Parsing → Structured Candidate Profile (resume file then deleted)
    ↓
Continuous Job Discovery (ATS connectors + Firecrawl + Puppeteer fallback)
    ↓
Job Matching (skills overlap + salary/location fit + semantic similarity)
    ↓
Job CRM (save / apply / track status)
    ↓
Skill Gap Analysis
    ↓
Daily/Weekly Reports (in-app + email)
```

## What this is NOT

- **Not a chatbot.** There is no conversational interface for the user to talk to the system; interaction happens through the three UI pages (Dashboard, Profile, Jobs).
- **Not a job board.** The platform doesn't host job listings for the public — every job is discovered and scoped to a single user.
- **Not an auto-apply tool** (at least not in the initial scope). The system surfaces and ranks opportunities; the user still applies manually via the listed application link.

## Product surface (3 pages only)

| Page | Purpose |
|---|---|
| **Dashboard** | Overview cards, charts (jobs/day, applications by status, match score distribution), skill gap widget, recent activity feed |
| **Profile** | Candidate info, skills (editable), resume re-upload with diff/preview |
| **Jobs** | The CRM — job table, filters, job detail panel with match analysis, status management |

## Guiding principles for build decisions

- **Ship a working vertical slice before adding orchestration complexity.** Agents, LangGraph, and MCP formalize logic that should already work — they are not where correctness is first established.
- **Prefer the simplest infrastructure that solves the actual scale.** (See `architecture/DECISIONS.md` — this is why Kafka was rejected in favor of Inngest.)
- **Per-user data isolation is non-negotiable.** Jobs, profiles, and reports must never leak across users — this is a security requirement, not just a schema detail.
- **The resume file is transient; only structured data is durable.** Once parsed, the original file is deleted — see `architecture/MEMORY_ARCHITECTURE.md`.

## Related documents

- `docs/SETUP.md` — how to get the monorepo running locally
- `docs/PROJECT_STRUCTURE.md` — where everything lives
- `architecture/SYSTEM_ARCHITECTURE.md` — how the three apps and job pipeline fit together
- `architecture/DOMAIN_MODEL.md` — the data model
- `architecture/AGENT_DESIGN.md` — the multi-agent system
- `architecture/DECISIONS.md` — why things are built the way they are
- `roadmap/TASK_BREAKDOWN.md` — phased build plan
