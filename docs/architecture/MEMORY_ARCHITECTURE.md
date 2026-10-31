# Memory Architecture

This system is not a chatbot, so "memory" here means something more specific than conversation history. There are four distinct kinds of memory in play, each with different durability, storage, and access patterns.

## 1. Long-term structured memory

**What:** `CandidateProfile`, `Skill`, `UserSkill`, `Company`, `Job` (non-embedding fields), `ApplicationStatusHistory`, `SkillGapRecommendation`, `Report`.

**Where:** Postgres (via Prisma), owned by `packages/db`.

**Written by:** `apps/web` (direct user edits) and `apps/mcp-server` (tool-driven writes during agent runs).

**Read by:** Both `apps/web` (for UI rendering) and `apps/mcp-server` tools (for matching/reporting).

This is the durable source of truth. It survives process restarts, deployments, and is the only memory that matters once an orchestration run completes.

## 2. Long-term semantic memory

**What:** `CandidateProfile.profileEmbedding` and `Job.jobEmbedding` — vector representations used for similarity-based matching.

**Where:** Same Postgres database, via `pgvector`. Deliberately *not* a separate vector store (e.g. Pinecone) — see `architecture/DECISIONS.md` for why colocating with structured data was chosen over a dedicated RAG pipeline.

**Regenerated when:** the profile changes (resume re-upload, manual skill edits) or a new job is discovered. Embeddings are not regenerated on every matching run — only on source-content change — to control AI provider cost (see `operations/COST_STRATEGY.md`).

**Note:** this is intentionally "RAG-lite." There's no chunking, retrieval-ranking, or document store — a single embedding per profile and per job description is compared directly. If future features need retrieval over larger unstructured content (e.g. full interview transcripts), that would warrant a proper RAG layer; the current scope doesn't.

## 3. Working / session memory (per orchestration run)

**What:** the LangGraph state object passed between agent nodes during a single run — `userId`, `profileContext`, `jobBatch`, `scoredJobs`, `skillGapUpdates`, `report`, `notificationStatus` (see `architecture/AGENT_DESIGN.md`).

**Where:** in-process memory within `apps/agent-worker`, for the duration of one graph execution. Not persisted to Postgres as its own record.

**Lifespan:** ephemeral. If `apps/agent-worker` crashes mid-run, this state is lost — the run should be safely re-triggerable from the start (idempotent discovery/matching) rather than resumable mid-graph, at least for the initial build. See `engineering/ERROR_HANDLING.md`.

**Debugging exception:** it's reasonable to log a snapshot of this state (e.g. as `info`-level structured logs) at each node transition for observability, without treating that log as a source of truth to read back from.

## 4. Episodic memory

**What:** `ApplicationStatusHistory` (every status transition for a job) and the `Job` records themselves within their 40-day retention window.

**Where:** Postgres, subject to the retention cleanup job.

**Distinction from long-term structured memory:** this is explicitly time-bound and expected to be pruned — it represents "what happened," not "what is true about the candidate." A user's skills persist indefinitely; a specific job posting from six weeks ago does not need to.

## What's explicitly out of scope

- **No conversational memory.** There's no chat interface, so there's no need for message history, summarization, or context-window management of a dialogue.
- **No per-agent private memory.** Agents don't maintain their own hidden state across runs — anything an agent needs on a future run comes from the long-term structured/semantic memory, not from the previous run's working memory. This keeps agents stateless and reruns predictable.

## Summary table

| Memory type | Durable? | Storage | Regenerated on |
|---|---|---|---|
| Structured (profile, jobs, skills) | Yes | Postgres | User edits, discovery runs |
| Semantic (embeddings) | Yes | Postgres (pgvector) | Source content change only |
| Working (graph state) | No | In-process (agent-worker) | Every run, from scratch |
| Episodic (status history, job retention) | Yes, time-bound | Postgres | Status changes; pruned after 40 days |
