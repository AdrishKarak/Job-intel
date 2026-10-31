# Agent Prompts

Prompt templates/skeletons for each agent's AI-driven steps. These are structural starting points, not final tuned prompts — expect iteration once real outputs can be evaluated against `agents/EVALUATION_CRITERIA.md`.

## Profile Analysis Agent — resume extraction prompt

Used when parsing a newly uploaded resume into structured fields.

```
You are extracting structured candidate information from a resume. Return ONLY valid JSON
matching this shape, with no additional commentary:

{
  "skills": [{ "name": string, "category": string | null }],
  "experienceYears": number | null,
  "experienceSummary": [{ "company": string, "title": string, "start": string, "end": string | null, "highlights": string[] }],
  "projectsSummary": [{ "name": string, "description": string, "tech": string[] }],
  "educationSummary": [{ "school": string, "degree": string, "field": string, "year": number | null }],
  "professionalSummary": string | null
}

Rules:
- Only extract information explicitly present in the resume text below. Do not infer or invent
  skills, dates, or achievements not stated.
- If a field cannot be determined, use null (or an empty array for list fields) rather than
  guessing.
- Normalize skill names to their common form (e.g. "ReactJS" -> "React").

Resume text:
"""
{{resumeText}}
"""
```

**Why "do not infer" matters here:** downstream matching treats this as ground truth about the candidate. A hallucinated skill directly produces a misleading match score, which is a core trust failure for the product.

## Job Matching Agent — match explanation prompt

Used within `scoreJobs` to generate the natural-language explanation, given already-computed structured results.

```
Given the following computed match data, write a 2-3 sentence explanation for the candidate.
Do not state anything that contradicts the data below — every claim must be traceable to a
listed matched skill, missing skill, or the score itself.

Match score: {{matchScore}}
Matched skills: {{matchedSkills}}
Missing skills: {{missingSkills}}

Write in a direct, encouraging-but-honest tone. If there are missing skills, mention the single
most impactful one and, if reasonably estimable from the data given, a rough sense of how
addressing it could affect future matches. Do not fabricate a specific percentage unless one is
provided to you as input.
```

**Why this is separated from extraction:** this step only rephrases already-validated structured data into prose — it should never be the source of the underlying facts (see `product/ACCEPTANCE_CRITERIA.md` AC 12.1). If the model needs to state a specific "X% improvement" figure, that number should be computed and passed in, not generated freeform by the prompt.

## Skill Gap Agent — trend context prompt (weekly cadence)

Used when incorporating external "trending skill" signal into recommendations (see `mcp/MCP_WORKFLOWS.md` Workflow 4).

```
Given this list of skills missing across the candidate's recent job matches, with how often each
appeared:

{{skillFrequencyList}}

For each skill, briefly note whether it appears to be a widely in-demand skill in the current job
market based on the search results provided below, or a niche/company-specific requirement.
Do not rank or recommend priority yet — that's computed separately from frequency + this signal.

Search results:
"""
{{searchResults}}
"""
```

**Note:** this step should use the web search tool grounding (or equivalent retrieval) rather than the model's own training-data knowledge of "what's trending," since technology demand shifts faster than any model's knowledge cutoff.

## Report Agent — report summary prompt

Used to turn the structured `generateReport` output into a readable email body.

```
Turn the following structured report data into a friendly, concise daily job search summary
email. Use the exact numbers and job/skill names given — do not add or omit any listed item.

New jobs found: {{newJobsCount}}
Best matches: {{bestMatchesList}}
Top skill gaps: {{skillGapsList}}
Status changes: {{statusChangesList}}

If all counts are zero, write a short, positive note that there's nothing new today rather than
an empty or awkward-sounding email (see product/ACCEPTANCE_CRITERIA.md AC 25.2).
```

## General prompt conventions

- Every prompt that touches structured data instructs the model to use exactly what it's given and not embellish — this is a recurring guard against hallucination given how directly these outputs affect user trust and decisions.
- Prompts requesting JSON output specify the exact shape inline rather than relying on a separate schema reference, since the model has no other way to see `packages/shared-types` definitions at inference time.
- Version prompts alongside code changes (in the same files as their calling logic in `apps/mcp-server`) rather than only in this document — this document is the human-readable reference, not necessarily the last-updated copy if a prompt is tuned during development. Keep them in sync.
