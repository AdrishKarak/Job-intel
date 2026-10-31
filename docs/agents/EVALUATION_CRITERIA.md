# Evaluation Criteria

How to judge whether each AI-driven component is working well enough to trust, beyond "it doesn't crash."

## Resume parsing (Profile Analysis Agent)

- **Field-level accuracy:** against a small hand-labeled set of sample resumes (build this early — even 15-20 diverse resumes is a useful starting benchmark), measure precision/recall on extracted skills, and correctness of experience/education fields.
- **Hallucination rate:** specifically check for skills or claims in the extracted output that are NOT present anywhere in the source resume — this should be at or near zero, given the "do not infer" instruction in `agents/AGENT_PROMPTS.md`. Any hallucination here is a higher-severity issue than a missed field, since it actively corrupts matching.
- **Graceful degradation:** for resumes with unusual formats (heavy graphics, non-standard section headers, non-English content if in scope), verify the system produces a partial-but-honest extraction or a clear failure — not a confidently wrong one.

## Match scoring (Job Matching Agent)

- **Score-to-outcome correlation:** once there's real usage data, check whether jobs the user actually applied to/progressed in tend to have had higher match scores than ones they ignored/were rejected from. This is the most important long-run signal that scoring is doing its job, not just producing plausible-looking numbers.
- **Explanation faithfulness:** spot-check that generated explanations never state a fact contradicting the structured matched/missing skills or score (per AC 12.1) — this can be partially automated by checking that skill names mentioned in the explanation text actually appear in the corresponding structured lists.
- **Score stability:** re-running `scoreJobs` on the same unchanged job/profile pair should produce the same or near-identical score — significant unexplained variance between runs indicates a scoring bug or an overly stochastic AI-driven component.

## Skill gap recommendations

- **Relevance:** do recommended skills actually appear in a meaningful fraction of the user's missing-skill data, not just a generically "popular" skill unrelated to their actual job search?
- **Actionability:** manual review — does the recommendation read as something a candidate could reasonably act on, rather than a vague restatement of the missing skill list?

## Report generation

- **Accuracy against source data:** every number/name in a generated report must trace back exactly to the structured `generateReport` output — this is directly testable (not just human-reviewable) by parsing the generated text/email and cross-checking figures against the input summary object.
- **Tone appropriateness:** the "nothing new today" case (AC 25.2) should read as normal, not apologetic or broken.

## Job discovery / normalization

- **Duplicate rate:** what fraction of discovery runs produce a `(userId, companyId, externalId)` collision that the uniqueness constraint has to catch, versus clean inserts — a persistently high collision rate signals a connector bug generating unstable external IDs.
- **Coverage:** what fraction of currently open positions on a sampled company's actual career page are successfully discovered and normalized — spot-check periodically against a manual look at a few companies' real listings.
- **Normalization correctness:** salary, location, and remote-status fields should be checked against the raw source for a sample of jobs per ATS type, since each ATS's raw format differs and normalization bugs are easy to introduce per-connector.

## Overall agent run health

- **Run completion rate:** percentage of triggered orchestration runs that complete through Notification Agent without an uncaught failure (ties into `operations/OBSERVABILITY.md` metrics).
- **Latency:** end-to-end time from trigger to report delivery, tracked over time — a slow but steady increase suggests scaling attention is needed before it becomes a user-visible problem (e.g. daily reports arriving later than the promised schedule).

## How to use this document

This isn't a one-time checklist — revisit it as features mature. Early on, most of this evaluation will be manual spot-checking against a small sample set; as usage grows, prioritize automating the ones with objective ground truth (hallucination checks, report accuracy, duplicate rate) before the more qualitative ones (tone, actionability).
