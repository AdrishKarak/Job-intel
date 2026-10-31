# Rate Limits

## Outbound scraping (job discovery)

| Source | Limit | Rationale |
|---|---|---|
| Greenhouse / Lever / Ashby public APIs | ~1 request/second per company, batched across companies with jitter | These are public but shared infrastructure — avoid looking like abuse even though no explicit published limit exists |
| Workday / SmartRecruiters / Workable | Follow each platform's documented rate limits where published; default to the same ~1 req/sec-per-company conservative pace otherwise | These platforms are more likely to have bot-detection; being conservative reduces the risk of a company's instance blocking the discovery pipeline entirely |
| Firecrawl | Governed by Firecrawl's own plan limits (check current plan quota) | Firecrawl is a paid third-party service — its own rate limits are the binding constraint, not one we set ourselves |
| Puppeteer (direct scraping) | 1 concurrent session per company at a time; respect `robots.txt`; add delay between page navigations within a session | Puppeteer is the highest-risk path for both getting blocked and for load impact on the target site — see `engineering/SECURITY_REQUIREMENTS.md` on scraping conduct |

**Company-level backoff:** if a company's discovery fails repeatedly across consecutive scheduled runs (e.g. 5 in a row), mark it inactive in the `Company` registry and flag for manual review rather than continuing to retry indefinitely — this protects against wasted compute and potential IP-level blocking from repeatedly hitting a broken or hostile endpoint.

## AI provider calls

| Provider | Constraint | Mitigation |
|---|---|---|
| Gemini | Provider-side rate limits (check current plan tier) | Batch resume parsing and match explanation generation where possible rather than one call per tiny operation; cache embeddings (regenerate only on source content change, per `architecture/MEMORY_ARCHITECTURE.md`) |
| Groq | Provider-side rate limits (check current plan tier) | Reserve for lower-stakes/higher-volume calls where latency matters more than Gemini's reasoning depth |

Both providers' calls should implement the retry policy in `engineering/ERROR_HANDLING.md` (1 retry with backoff, then mark the item failed rather than blocking the batch).

## Internal API (tRPC, `apps/web`)

- Standard authenticated-user rate limiting to prevent abuse (e.g. a compromised session hammering `jobs.exportExcel` or `reports.regenerate`) — a reasonable starting point is a per-user limit like 30 requests/minute on mutation endpoints, tightened later based on real usage patterns.
- `reports.regenerate` specifically should have a tighter limit (e.g. a few per hour per user) since it can trigger a full re-matching run — this prevents a user (or a bug in the client) from accidentally triggering excessive orchestration runs and driving up AI provider cost.

## Email (Resend)

- Governed by Resend's plan-level sending limits. Since email volume here is inherently bounded (one report per user per day/week, not transactional high-volume), this is unlikely to be a binding constraint at expected scale — revisit only if the user base grows significantly.

## Internal service-to-service calls

- `apps/agent-worker` → `apps/mcp-server`: no artificial rate limit needed between these two trusted internal services beyond natural concurrency limits (e.g. don't run more orchestration jobs in parallel than the deployment's compute can handle) — see `operations/DEPLOYMENT_ARCHITECTURE.md` for scaling considerations.
