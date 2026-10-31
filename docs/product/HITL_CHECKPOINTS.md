# Human-in-the-Loop (HITL) Checkpoints

This document names, as a deliberate pattern, the points where the system requires explicit human approval before an automated result is trusted or acted on. Several of these already exist implicitly across `product/ACCEPTANCE_CRITERIA.md` and `api/API_SPEC.md` — this doc collects them in one place so future features get evaluated against the same principle, rather than each one being decided ad hoc.

## Guiding principle

**Automate information gathering and analysis fully. Require human confirmation before anything that (a) overwrites previously-entered user data, (b) takes an action visible outside the platform, or (c) would be costly or embarrassing to get wrong.**

Discovery, scoring, and recommendation are low-risk to fully automate — being wrong just means a slightly worse ranking the user can ignore. Overwriting profile data or submitting something on the user's behalf is high-risk — being wrong there directly damages trust or has real-world consequences.

## Existing checkpoints

| Checkpoint | What's gated | Why | Reference |
|---|---|---|---|
| Resume parsing → profile creation | The extracted profile is shown for review/edit before being treated as the user's real profile | A parsing error silently accepted would corrupt every downstream match score | `product/ACCEPTANCE_CRITERIA.md` AC 2.1 |
| Resume re-upload → profile update | A diff/preview is shown before new extraction overwrites the existing profile | Prevents silent loss of manually-added skills or previously-corrected fields | `product/ACCEPTANCE_CRITERIA.md` AC 6.1–6.2, `api/API_SPEC.md` `previewResumeUpdate`/`confirmResumeUpdate` |
| Job application submission | The system never submits an application — it only surfaces the application link | Submitting an application is an externally-visible, hard-to-reverse action taken in the user's name | `product/PRD.md` non-goals |
| Application status transitions | Status only changes when the user manually updates it | The CRM's value is an accurate record of *what the user actually did* — an agent guessing at status would corrupt that record | `product/USER_STORIES.md` #16 |
| Manual skill add/remove | Always a direct user action, never inferred and silently applied | The user's stated skills are ground truth for matching; agents can *recommend* but not *assert* skills the user hasn't confirmed | `product/USER_STORIES.md` #4 |

## What is deliberately NOT gated (fully automated by design)

| Not gated | Why automation is safe here |
|---|---|
| Job discovery | Purely additive — new `Job` rows appearing doesn't overwrite or misrepresent anything; worst case is an irrelevant job the user ignores |
| Match scoring | Informational — a wrong score is a UX quality issue, not a data-integrity or external-action issue; corrected automatically on the next run if the underlying data changes |
| Skill gap recommendations | Advisory only — presented as a suggestion, never auto-applied to the profile or acted on elsewhere |
| Report generation and email delivery | Informational output, not an action taken on the user's behalf toward a third party — sending a report is different in kind from submitting a job application |

Skill gap recommendations are a useful borderline case: the *recommendation* is fully automated, but nothing about acting on it (e.g. if a future "mark as learning" feature is added) should auto-apply anything to the profile — that would need its own HITL checkpoint at that point.

## Rule for evaluating new features

Before building a new automated capability, answer:

1. Does it overwrite or replace existing user-entered data? → needs a review/confirm step, like resume re-upload.
2. Does it take an action visible outside the platform (submitting something, contacting someone, publishing something)? → needs explicit per-instance user confirmation, not just a one-time settings toggle.
3. Is a wrong result merely informational (a score, a suggestion, a summary)? → safe to fully automate, as long as `agents/GUARDRAILS.md`'s output validation still applies.

If a proposed feature fails (1) or (2), design its HITL checkpoint before implementation, and add it to the table above.

## Relationship to guardrails

HITL checkpoints and `agents/GUARDRAILS.md` address different risks. Guardrails catch the AI producing *wrong* output before it's used. HITL checkpoints exist even for *correct* output — a perfectly accurate profile extraction still goes through review, because the point isn't distrust of the AI's accuracy, it's that the user should be the one who confirms what represents them before it's treated as fact.
