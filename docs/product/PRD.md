# Product Requirements Document (PRD)

## Problem statement

Job searching requires checking many disconnected platforms (LinkedIn, Wellfound, company career pages, various ATS platforms), manually tracking applications, and guessing at what skills would actually improve a candidate's chances. This is repetitive, error-prone, and gives no systematic feedback loop.

## Target user

An active job seeker (initially: software engineers/technical roles, given the ATS platforms and skill examples in scope) who is applying to multiple companies over an extended search period and wants a single place to discover, evaluate, and track opportunities.

## Goals

1. Reduce the manual effort of checking multiple job sources to near zero
2. Give every discovered job a match score grounded in the candidate's actual profile, not generic keyword matching
3. Replace spreadsheet-based application tracking with a proper CRM-style view
4. Surface actionable skill-gap insight, not just "you're missing X"
5. Deliver a daily summary so the user doesn't need to open the app to stay informed

## Non-goals (explicitly out of scope for initial build)

- **Not** an auto-apply system — the user still submits applications manually
- **Not** a public job board — no job is visible to any user other than the one it was discovered for
- **Not** a networking/referral feature
- **Not** a resume builder/editor — the platform consumes an existing resume, it doesn't help write one
- **Not** a general career-coaching chatbot — no open-ended conversational interface in initial scope

## Key features

### 1. Resume-driven onboarding
User uploads a resume once; the system extracts a structured profile (skills, experience, education, projects) which the user can review and edit. The original file is deleted after parsing.

### 2. Continuous job discovery
The system polls a registry of 100–150 target companies across six ATS platforms (Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Workable) plus Wellfound and custom career sites, on a recurring (initially daily) schedule.

### 3. Match scoring
Every discovered job gets a 0–100 match score based on skills overlap, salary compatibility, location/remote compatibility, and semantic similarity between the job description and the candidate's profile — plus a human-readable AI explanation of the score.

### 4. Application CRM
A filterable, sortable table of all discovered/saved/applied jobs, with a status pipeline (Saved → Applied → OA Received → OA Cleared → Interview Scheduled → Interview Cleared → Offer/Rejected/Ghosted) the user updates manually.

### 5. Skill gap analysis
Aggregated view of which missing skills appear most often across the user's matched jobs, with an estimate of how learning them could improve match rates.

### 6. Reporting
Daily (and weekly) reports summarizing new jobs, best matches, skill gaps, and status changes — visible in-app and delivered by email.

## Success metrics (initial, directional — refine once there's usage data)

| Metric | Why it matters |
|---|---|
| % of discovered jobs with a match score ≥ 70% that the user actually engages with (saves/applies) | Validates that scoring correlates with real relevance |
| Time from job posting to discovery | Measures the value of continuous polling vs. manual checking |
| Weekly active usage of the Jobs CRM page | Indicates the tracking feature is actually replacing spreadsheets |
| Email open/click-through rate on daily reports | Validates the report is useful enough to act on |
| Skill gap recommendations the user marks as "learning" (if such a flag is added) | Validates the skill-gap feature drives real action, not just information |

## Product surface

See `docs/CONTEXT.md` for the three-page summary (Dashboard, Profile, Jobs) and `product/USER_STORIES.md` / `product/ACCEPTANCE_CRITERIA.md` for detailed behavior.

## Open questions (to resolve as the product evolves, not blockers for initial build)

- Should match scoring differ by role type (e.g. weight skills differently for backend vs. data roles)?
- Should the company registry be user-customizable (add/remove target companies) or platform-curated only?
- Should there be a way to mark a job as "not interested" to suppress similar future matches?
