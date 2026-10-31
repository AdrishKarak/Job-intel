# MCP Workflows

End-to-end tool call sequences for the system's key flows. These complement the sequence diagram in `architecture/SYSTEM_ARCHITECTURE.md` with concrete tool-call-level detail.

## Workflow 1 — Daily scheduled run (steady state)

Triggered by Inngest, one run per active user.

```
1. Supervisor:        getProfile(userId)
                       → if PROFILE_NOT_FOUND, skip this user, end run

2. Job Matching Agent: searchJobs(userId)
                       → { newJobs, updatedJobs, companiesFailed }

3. Job Matching Agent: scoreJobs(userId, jobIds: [...newJobs, ...updatedJobs].map(j => j.id))
                       → { scored, failed }

4. [conditional]       if any scored[].matchScore < 70:
                          Skill Gap Agent: scoreJobs(userId)  // re-read for aggregation across full recent batch
                          Skill Gap Agent: updateSkillGaps(userId, recommendations)
                          → { upserted }

5. Report Agent:       generateReport(userId, type: "DAILY", periodStart, periodEnd)
                       → { reportId, summary, fileUrl }

6. Notification Agent: sendEmail(userId, reportId)
                       → { delivered, providerMessageId }
```

**Notes:**
- Step 1's `PROFILE_NOT_FOUND` short-circuit means users mid-onboarding are silently skipped, not errored — this is expected, not a failure state.
- Step 4 only runs conditionally, per the LangGraph routing rule in `architecture/AGENT_DESIGN.md`.
- Steps 5–6 always run, even if step 2 found zero new jobs (see `product/ACCEPTANCE_CRITERIA.md` AC 25.2).

## Workflow 2 — Manual profile update triggers re-matching

Triggered when a user edits their profile or skills in `apps/web` (not on the daily schedule).

```
1. apps/web:           user saves profile edit → tRPC mutation → Postgres write (direct, not via MCP —
                       apps/web owns simple CRUD on its own data)

2. apps/web:           triggers an Inngest event ("profile.updated") →
                       apps/agent-worker starts a scoped run (skip discovery, go straight to matching)

3. Job Matching Agent: scoreJobs(userId)  // re-score existing, unexpired jobs against the updated profile
                       → { scored, failed }

4. [conditional]       Skill Gap Agent re-run, same condition as Workflow 1 step 4
```

**Note:** this workflow deliberately skips `searchJobs` — a profile edit doesn't mean new jobs exist, only that existing jobs should be re-evaluated. Re-running discovery here would be wasteful and could hit ATS rate limits unnecessarily (see `api/RATE_LIMITS.md`).

## Workflow 3 — First-time onboarding

Triggered immediately after resume parsing + profile confirmation, not waiting for the next scheduled run.

```
1. apps/web:           resume parsed, user confirms profile → Postgres write

2. apps/web:           triggers an Inngest event ("onboarding.completed") →
                       apps/agent-worker starts a full run (discovery + matching + report), same as Workflow 1
                       steps 2–6, but periodStart/periodEnd cover "since account creation" rather than "since
                       yesterday"

3. Notification Agent: sendEmail(userId, reportId)  // the user's first report, framed as a welcome summary
                       rather than a routine daily update — this framing difference lives in the report
                       template, not in a different tool
```

## Workflow 4 — Weekly skill-gap trend refresh (cost-control cadence)

Per `operations/COST_STRATEGY.md`, trending-technology analysis for skill gaps runs weekly, not on every daily run, to control AI provider cost.

```
1. Inngest (weekly schedule): triggers Skill Gap Agent directly (not via the full daily graph)

2. Skill Gap Agent:    scoreJobs(userId)  // read current scored jobs, no new discovery needed
                       → aggregates missing-skill frequency over the trailing week
                       → (internally) calls out to a trend-data source to estimate trendScore

3. Skill Gap Agent:    updateSkillGaps(userId, recommendations)
                       → { upserted }

4. No report/email triggered by this workflow directly — updated skill gap data is simply available
   for the next daily report to include
```
