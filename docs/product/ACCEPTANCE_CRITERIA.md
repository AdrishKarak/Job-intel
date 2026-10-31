# Acceptance Criteria

Given/When/Then criteria for the highest-priority user stories (see `product/USER_STORIES.md` for the full list and numbering).

## Story 2 & 3 — Resume upload and profile review

**AC 2.1 — Successful parse**
- Given a user uploads a valid PDF/DOCX resume
- When parsing completes successfully
- Then the user is shown a review screen with extracted skills, experience, education, and projects, each individually editable

**AC 2.2 — Parse failure**
- Given a user uploads a resume that fails to parse (corrupted file, unsupported format, or extraction returns empty/malformed data)
- When the parse attempt completes
- Then the user sees a clear error message and is prompted to either retry or manually enter profile data — the system never silently proceeds with an empty/garbage profile

**AC 2.3 — File deletion**
- Given a resume has been successfully parsed and the user has confirmed/edited the resulting profile
- When the review step is complete
- Then the original resume file is deleted from storage, and only the structured `CandidateProfile` fields remain

## Story 6 & 7 — Resume re-upload with preview

**AC 6.1 — Diff preview**
- Given a user with an existing profile uploads a new resume
- When parsing of the new resume completes
- Then the user sees a side-by-side or diff-style preview of old vs. new values before anything is saved

**AC 6.2 — Preserving manual additions**
- Given a user has manually added skills not present in any resume
- When a new resume is parsed and applied
- Then manually-added skills are not silently removed — the user is shown them as "not found in new resume, keep or remove?" rather than having them deleted automatically

## Story 10, 11, 12 — Match scoring and explanation

**AC 10.1 — Score presence**
- Given a job has been scored
- When it's displayed anywhere in the UI (dashboard, jobs table, detail panel)
- Then a numeric match score (0–100) is always shown alongside it — no job is displayed without a score once scoring has run

**AC 11.1 — Skills breakdown**
- Given a job's match analysis has been computed
- When the user opens the job detail panel
- Then matched skills and missing skills are shown as two distinct, clearly labeled lists (not merged or ambiguous)

**AC 12.1 — Explanation grounding**
- Given a job has a match score and a matched/missing skills breakdown
- When the AI explanation is generated
- Then the explanation must reference the actual matched/missing skills and score — it must not state facts that contradict the structured breakdown (e.g. claiming a skill is missing when it's listed as matched)

## Story 16, 17 — Status tracking

**AC 16.1 — Status update persists and is scoped**
- Given a user updates a job's status
- When the update is saved
- Then the new status is persisted immediately, is visible on next page load, and is never visible to or editable by any other user

**AC 16.2 — Status history recorded**
- Given a job's status changes
- When the change is saved
- Then a new `ApplicationStatusHistory` record is created with a timestamp — history is append-only, not overwritten

## Story 18 — Retention

**AC 18.1 — Expiry**
- Given a job's `expiresAt` (discoveredAt + 40 days) has passed
- When the scheduled cleanup job runs
- Then the job and its dependent records (`JobSkill`, `ApplicationStatusHistory`) are deleted, and this does not affect any `Report` that previously referenced summary data derived from it

## Story 19, 20 — Skill gap

**AC 19.1 — Aggregation correctness**
- Given a user has multiple scored jobs with overlapping missing skills
- When skill gap recommendations are computed
- Then each recommended skill's `frequency` accurately reflects the count of jobs (within the aggregation window) that were missing it — not an arbitrary or stale count

## Story 25 — Daily email report

**AC 25.1 — Report sent on schedule**
- Given the scheduled trigger fires for a given day
- When the orchestration run completes successfully
- Then an email is sent to the user summarizing new jobs, best matches, skill gaps, and status changes for that period

**AC 25.2 — Graceful "nothing new" case**
- Given a scheduled run finds zero new jobs and zero status changes
- When the report is generated
- Then the email is still sent, explicitly stating that there were no updates — the system does not skip sending or fail silently

**AC 25.3 — Email failure doesn't lose the report**
- Given a report has been generated successfully
- When email delivery via Resend fails
- Then the report remains visible and accessible in-app regardless of the email outcome

## Story 27 — Data isolation

**AC 27.1 — Cross-user isolation**
- Given two different users each have jobs, profiles, and reports
- When either user queries their own data through any API surface
- Then no data belonging to the other user is ever returned, under any filter or query parameter combination
