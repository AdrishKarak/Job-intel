# Cost Strategy

## Primary cost drivers

| Driver | Why it's significant |
|---|---|
| AI provider calls (Gemini/Groq) | Resume parsing, match explanations, report summarization, embeddings — the most usage-scaled cost in the system (grows with users × jobs) |
| Firecrawl | Paid per crawl/page; scales with company registry size and discovery frequency |
| Puppeteer compute | Running headless browser sessions is comparatively expensive compute — should stay a fallback, not a primary path (per `architecture/DECISIONS.md`) |
| Persistent compute (`apps/mcp-server`, `apps/agent-worker`) | Always-on hosting cost, independent of usage volume, unlike serverless |
| Neon compute | Scales with query volume/data size; pgvector similarity queries are more compute-intensive than simple lookups |

## Cost controls already baked into the design

1. **Embeddings are cached, not regenerated per run.** `profileEmbedding` and `jobEmbedding` are only recomputed when their source content actually changes, not on every matching run (`architecture/MEMORY_ARCHITECTURE.md`) — this is the single biggest lever against runaway AI cost, since embedding generation would otherwise scale with every scheduled run × every job.
2. **Rule-based scoring runs first; embeddings are a refining signal, not the primary mechanism** (ADR-010) — cheaper computation handles the bulk of scoring, with the more expensive semantic step adding precision rather than being the sole method.
3. **Skill-gap trend analysis runs weekly, not daily** (`mcp/MCP_WORKFLOWS.md` Workflow 4) — the specific AI/trend-data calls involved in identifying "trending technologies" don't need daily freshness, so this cadence directly cuts that cost by ~7x versus running it in every daily orchestration.
4. **Puppeteer is strictly last-resort**, after Firecrawl, after native ATS APIs (ADR-004, `mcp/MCP_SPEC.md`) — the most expensive discovery method is used only when nothing cheaper works.
5. **Batch tool calls where possible** (e.g. `scoreJobs` takes a batch of `jobIds`, not one call per job) — reduces per-call overhead and makes it easier to apply provider-side batch pricing if available.
6. **Manual re-matching (`reports.regenerate`, profile-update workflow) skips discovery** (`mcp/MCP_WORKFLOWS.md` Workflow 2) — avoids re-triggering the most expensive part of the pipeline (discovery + Firecrawl/Puppeteer) when only re-scoring is actually needed.

## Additional levers to apply as usage grows

- **Cache AI-generated match explanations** if a job's score and skill breakdown haven't changed since the last run — no need to regenerate identical natural-language text.
- **Tier discovery frequency by company activity** — a company with no new postings in months doesn't need the same daily polling cadence as an actively hiring one; consider adaptive polling intervals per `Company` once there's enough historical data to identify low-activity companies.
- **Right-size persistent compute** for `apps/mcp-server`/`apps/agent-worker` based on actual concurrent-run load rather than provisioning for peak from day one — scale up only once real usage data justifies it.
- **Choose Groq over Gemini** for any sub-task where its lower cost/latency doesn't sacrifice needed reasoning quality (e.g. simple classification steps vs. full match-explanation generation).
- **Monitor per-user cost**, not just aggregate cost — if AI/scraping cost per active user is known, it directly informs whether the product's engagement level justifies its infrastructure cost, which matters if this ever needs a pricing/monetization conversation.

## What NOT to do for cost savings

- Don't skip embedding generation entirely to save cost — this degrades match quality (ADR-010's whole rationale for adding semantic matching in the first place) in a way users would directly notice as "the matches don't make sense."
- Don't reduce discovery frequency below daily as a default cost-saving measure — timely discovery is core to the product's value proposition (`product/PRD.md` goal #1); tune per-company cadence instead of degrading the baseline.
- Don't cache scoring results indefinitely across profile changes — a stale match score after a user edits their profile actively undermines trust in the platform.
