# API Spec

`apps/web`'s API surface is entirely **tRPC**, consumed by its own frontend via TanStack Query. There is no public REST API in initial scope. For the MCP tool contracts used internally by the agent system, see `mcp/TOOL_REGISTRY.md` — that's a separate, internal-only surface.

## Routers

### `profileRouter`

| Procedure | Type | Input | Output | Notes |
|---|---|---|---|---|
| `get` | query | `{}` (userId from session) | `CandidateProfile & { skills: UserSkill[] }` | |
| `update` | mutation | `Partial<CandidateProfile>` fields (Zod schema, excludes `id`/`userId`) | updated `CandidateProfile` | |
| `addSkill` | mutation | `{ name: string; proficiency?: string; yearsOfUse?: number }` | created `UserSkill` | Creates the `Skill` row too if it doesn't exist yet |
| `removeSkill` | mutation | `{ skillId: string }` | `{ success: true }` | |
| `createResumeUploadUrl` | mutation | `{ filename: string; contentType: string; sizeBytes: number }` | `{ uploadUrl: string; storagePath: string }` | Validates type (PDF/DOCX) and size with Zod, then returns a short-lived pre-signed PUT URL generated via NeonDB Object Storage (AWS S3-compatible, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`) for a server-chosen path under the caller's `userId` — the client never picks the path |
| `uploadResume` | mutation | `{ storagePath: string }` (path returned by `createResumeUploadUrl`; the file is already uploaded) | `{ parseJobId: string }` | Verifies the path belongs to the session's user, then kicks off async parsing; see `previewResumeUpdate` for the follow-up |
| `previewResumeUpdate` | query | `{ parseJobId: string }` | `{ status: "pending" \| "ready" \| "failed"; diff?: ProfileDiff }` | Polled by the client until `status` is `ready`/`failed` |
| `confirmResumeUpdate` | mutation | `{ parseJobId: string; acceptedFields: string[] }` | updated `CandidateProfile` | Applies only the fields the user confirmed; deletes the resume file from NeonDB Object Storage |

### `jobsRouter`

| Procedure | Type | Input | Output | Notes |
|---|---|---|---|---|
| `list` | query | `{ filters?: { role?, location?, company?, minSalary?, status?, minMatchScore? }, sort?, page? }` | `{ jobs: Job[]; total: number }` | Always implicitly scoped to the session's `userId` |
| `getById` | query | `{ jobId: string }` | `Job & { matchedSkills, missingSkills, aiExplanation, statusHistory }` | 404s (typed error) if the job doesn't belong to the session's user |
| `updateStatus` | mutation | `{ jobId: string; status: ApplicationStatus; note?: string }` | updated `Job` | Also creates an `ApplicationStatusHistory` row (AC 16.2) |
| `exportExcel` | mutation | `{ filters?: same as list }` | `{ fileUrl: string }` | Generates on demand, not the same artifact as the daily report's Excel export |

### `reportsRouter`

| Procedure | Type | Input | Output | Notes |
|---|---|---|---|---|
| `list` | query | `{ type?: "DAILY" \| "WEEKLY"; limit?, cursor? }` | `Report[]` | |
| `getById` | query | `{ reportId: string }` | `Report` | |
| `regenerate` | mutation | `{ periodStart: string; periodEnd: string; type }` | `{ reportId: string }` | For manual re-generation outside the schedule; triggers the same underlying flow as Workflow 1 in `mcp/MCP_WORKFLOWS.md`, minus discovery/matching if already fresh |

## Conventions

- Every mutation input is validated with a Zod schema shared with `packages/shared-types` where the shape overlaps with an MCP tool's contract (e.g. `ApplicationStatus` enum is defined once, reused everywhere).
- Queries never accept a `userId` parameter from the client — it always comes from the authenticated session (see `engineering/SECURITY_REQUIREMENTS.md`).
- Long-running operations (resume parsing, Excel export generation) use a poll-based pattern (`uploadResume` → `previewResumeUpdate`) rather than blocking the mutation call, since parsing/export can take longer than a typical request timeout.
- Errors use tRPC's typed error codes (`NOT_FOUND`, `UNAUTHORIZED`, `BAD_REQUEST`) so the client can branch on error type, not just display a generic failure message.

## Webhooks (Route Handlers, not tRPC)

| Endpoint | Purpose |
|---|---|
| `POST /api/webhooks/clerk` | User lifecycle events (created/updated/deleted) — verified via Clerk's signing secret |
| `POST /api/inngest` | Inngest's function invocation endpoint — triggers scheduled and event-based functions (daily report, profile-update re-matching, onboarding-completed) |

## What's intentionally not exposed

- No public/unauthenticated endpoints beyond the two webhooks above.
- No direct client access to `apps/mcp-server` — the browser never talks to it, only `apps/web`'s backend orchestrates via Inngest → `apps/agent-worker` → MCP.
