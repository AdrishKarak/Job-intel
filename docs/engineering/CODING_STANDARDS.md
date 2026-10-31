# Coding Standards

## TypeScript

- **Strict mode everywhere.** `strict: true` in every `tsconfig.json` across `apps/*` and `packages/*`.
- **No `any`.** Use `unknown` and narrow, or define a proper type. If a third-party library forces `any`, isolate it behind a typed wrapper in the relevant `packages/*` module rather than letting it leak.
- **Validate at every boundary with Zod**, not just TypeScript types: tRPC procedure inputs, MCP tool inputs/outputs, external API responses (ATS connectors, Firecrawl, AI provider responses). TypeScript types alone don't protect against malformed runtime data from external sources.
- Prefer `type` for object shapes and unions used as data contracts (matches Zod's `z.infer` pattern); use `interface` only when declaration merging is actually needed.

## File & folder conventions

- One React component per file; file name matches the component name (`JobDetailPanel.tsx`, not `panel.tsx`).
- Co-locate a component's tests with the component (`JobDetailPanel.test.tsx` next to `JobDetailPanel.tsx`).
- Zod schemas that are shared across apps live in `packages/shared-types`, not duplicated per app.
- See `engineering/FOLDER_STRUCTURE.md` for directory-level conventions within each app/package.

## Naming

- `camelCase` for variables/functions, `PascalCase` for types/components/classes, `SCREAMING_SNAKE_CASE` for true constants and enum values (matches the Prisma enum style already in `packages/db`).
- Boolean variables/props read as a question: `isLoading`, `hasError`, `canRetry` — not `loading`, `error` (ambiguous with an error value itself), `retry`.
- MCP tool names and agent names use the exact casing established in `mcp/TOOL_REGISTRY.md` and `architecture/AGENT_DESIGN.md` everywhere they're referenced in code — no ad hoc renaming in comments or logs.

## React / Next.js

- Server Components by default; add `"use client"` only where interactivity genuinely requires it (forms, charts, filters).
- Data fetching in `apps/web` goes through tRPC + TanStack Query — no direct `fetch` calls to internal APIs from components.
- Keep page components thin; push logic into hooks (`use*.ts`) or the tRPC router itself.

## Error handling

See `engineering/ERROR_HANDLING.md` for the full pattern. In short: functions that can fail in an expected way return a typed result (not throw), reserving thrown exceptions for truly unexpected/programmer-error cases.

## Imports

- Absolute imports within an app (`@/components/...`) rather than long relative chains (`../../../components/...`).
- Cross-package imports use the package name (`@repo/db`, `@repo/shared-types`, `@repo/ats-connectors`), never reach into another package's `src/` by relative path.

## Linting & formatting

- ESLint + Prettier, config shared at the repo root, inherited by every app/package — no per-app style deviations.
- Lint and typecheck must pass before merge (see `engineering/TESTING_STRATEGY.md` for CI gate details).

## Comments & documentation

- Comment *why*, not *what* — the code should already say what it does.
- Any deviation from a documented architectural decision (see `architecture/DECISIONS.md`) needs a comment linking to the relevant ADR and explaining why the deviation was necessary here.
- Non-obvious business logic (e.g. the exact match-score formula in `scoreJobs`) should have a comment explaining the reasoning, since `mcp/TOOL_REGISTRY.md` documents the contract but not necessarily every internal weighting choice.

## Commits

- Conventional commit style (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`) to keep history scannable and to support any future automated changelog generation.
