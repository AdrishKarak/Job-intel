# Kickoff Prompt

Paste this as the first message to your coding agent (Claude Code or equivalent) when starting work in this repository.

---

You are working as the engineering agent building the **AI Job Intelligence Platform** in this repository. Before writing any code, do the following, in order.

## 1. Read the documentation — all of it, in this order

1. `CLAUDE.md` (repo root) — the non-negotiable rules and the "which doc do I need" map. Treat every rule in it as a hard constraint, not a suggestion.
2. `docs/CONTEXT.md` — what this system is and, just as importantly, what it is explicitly *not* (no auto-apply, no chatbot interface, no public job board).
3. `docs/product/PRD.md`, `docs/product/USER_STORIES.md`, `docs/product/ACCEPTANCE_CRITERIA.md`, `docs/product/HITL_CHECKPOINTS.md`
4. `docs/architecture/SYSTEM_ARCHITECTURE.md`, `DOMAIN_MODEL.md`, `AGENT_DESIGN.md`, `MEMORY_ARCHITECTURE.md`, `DECISIONS.md` — read `DECISIONS.md` especially carefully; it records tradeoffs already settled (e.g. no Kafka, per-user job storage, MCP server as a separate service). Do not re-litigate a settled ADR without flagging it explicitly to me first.
5. `docs/mcp/MCP_SPEC.md`, `TOOL_REGISTRY.md`, `AGENT_TOOL_ACCESS.md`, `MCP_WORKFLOWS.md`
6. `docs/engineering/*` (all six files)
7. `docs/api/*` (all three files)
8. `docs/operations/*` (all three files)
9. `docs/agents/AGENT_PROMPTS.md`, `GUARDRAILS.md`, `EVALUATION_CRITERIA.md`
10. `docs/frontend/DESIGN_SYSTEM.md`
11. `docs/PROJECT_STRUCTURE.md`, `docs/SETUP.md`
12. `docs/roadmap/TASK_BREAKDOWN.md` — read this last, since it only makes sense once you understand the system it's building.

Use `docs/INDEX.md` if you lose track of what you've read.

## 2. Confirm understanding before touching code

After reading everything, before starting Phase 0, give me a short summary (not a restatement of every doc): what the system does, the three-service shape and why, and the biggest constraint you think will shape early implementation decisions. Then explicitly ask me any questions you have — about ambiguity in the docs, about anything that seems to conflict, or about anything left as an open question in `PRD.md`'s "Open questions" section. Do not guess silently on anything that materially affects architecture; ask.

## 3. Follow the roadmap phase by phase — one phase at a time

Work through `docs/roadmap/TASK_BREAKDOWN.md` strictly in order. For each phase:

- Implement only what that phase lists. Do not pull in work from a later phase "while you're in there," even if it seems convenient — the phasing exists specifically so I can review incrementally rather than getting a huge diff at the end.
- Check the phase's stated **exit criteria** before considering it done.
- Follow the non-negotiable rules in `CLAUDE.md` on every phase, not just the ones where they seem obviously relevant (e.g. per-user data isolation matters even in Phase 1, which doesn't look like a "security phase").
- If you hit a decision the docs don't cover, add an ADR entry to `docs/architecture/DECISIONS.md` explaining the tradeoff, rather than deciding silently and moving on.
- If implementing a phase reveals that a doc is wrong, outdated, or missing something, fix the doc in the same phase and call this out in your review (see below) — don't let code and docs drift apart.

## 4. Stop after every phase and wait for me

**This is the most important instruction: do not proceed to the next phase automatically.** After finishing a phase, stop and give me:

1. **What you built** — a short summary, not a wall of diffs.
2. **Exit criteria check** — go through the phase's stated exit criteria explicitly and confirm each is met (or say which isn't and why).
3. **Deviations** — anything you did differently from what the docs described, and why, including any new ADR you added.
4. **Open questions** — anything you're unsure about, anything you made a judgment call on that I might want to weigh in on, or anything in a later phase that this phase's work might affect.
5. **What's next** — the next phase, in one sentence, so I know what I'm approving before I say go.

Then explicitly ask: *"Should I proceed to the next phase, or would you like changes first?"* Wait for my response before continuing. Treat silence or an ambiguous reply as "wait," not "proceed."

## 5. Ongoing rules, every phase

- Never skip a HITL checkpoint from `docs/product/HITL_CHECKPOINTS.md` to make a feature "more automated" than the docs specify.
- Apply the guardrails in `docs/agents/GUARDRAILS.md` to any AI-driven code you write, from the first phase that touches an LLM call — not retrofitted later.
- Match `docs/engineering/CODING_STANDARDS.md` and `docs/frontend/DESIGN_SYSTEM.md` from the first line of code, not as a later cleanup pass.
- If you're about to build something that isn't in any phase yet but seems necessary, stop and ask rather than improvising scope.

Begin with step 1.
