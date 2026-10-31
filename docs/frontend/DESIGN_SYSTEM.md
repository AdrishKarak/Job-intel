# Design System — Neobrutalism

## Brief

Neobrutalism theme: white background, thick black borders and hard offset shadows, pastel accent colors (pink, light red, light blue, light green) used for buttons and interactive elements. This document turns that brief into concrete tokens, typography, and component rules — and grounds the four accent colors in the product's actual data (the application status pipeline) rather than using them as arbitrary decoration.

## Color

| Name | Hex | Role |
|---|---|---|
| Paper | `#FFFFFF` | Page background — see "Why white isn't just a preference" below |
| Ink | `#141414` | All borders, all body text, all shadows |
| Bubblegum Pink | `#FFB4D8` | Status accent — "in motion" (Applied, OA Received, OA Cleared) |
| Sky Blue | `#9ED8FF` | Status accent — "active engagement" (Interview Scheduled, Interview Cleared) |
| Mint Green | `#B6F2C4` | Status accent — terminal positive outcome (Offer), and match scores ≥ 80% |
| Blush Red | `#FFA8A0` | Status accent — terminal negative outcome (Rejected, Ghosted) |

**Why these four map to status, not to arbitrary UI elements:** `ApplicationStatus` (per `architecture/DOMAIN_MODEL.md`) already has a natural four-stage shape: not yet acted on → in motion → actively engaged → resolved (positive or negative). Assigning one accent color per stage means color in this UI *encodes information* (which stage a job is in, glanceable across the whole Jobs table) rather than just decorating buttons. This follows the "visual structure is information" principle — the palette earns its four colors because there are four meaningful states, not because four pastel buttons look nice.

| Status | Color |
|---|---|
| `DISCOVERED`, `SAVED` | No fill — white pill, ink border only (nothing has happened yet) |
| `APPLIED`, `OA_RECEIVED`, `OA_CLEARED` | Bubblegum Pink |
| `INTERVIEW_SCHEDULED`, `INTERVIEW_CLEARED` | Sky Blue |
| `OFFER` | Mint Green |
| `REJECTED`, `GHOSTED` | Blush Red |

Match score distribution (Dashboard widget, per `product/USER_STORIES.md` #23) reuses two of the same colors rather than introducing new ones: **Mint Green for ≥80%, Sky Blue for 70–79%, plain Ink-outline/white below 70%.** Deliberately *not* Blush Red for low scores — a low match isn't a failure state the way a rejection is, and reusing red there would misleadingly equate "less relevant" with "bad."

**Buttons default to Ink fill with Paper text** (primary actions), with the pastel accents reserved for status/semantic meaning rather than generic call-to-action buttons — this keeps the accent palette meaningful instead of diluting it across every button on the page. A generic "Save" or "Export" button is Ink-on-Paper; only status- and outcome-related UI (badges, the status-change control, score indicators) uses the four accents.

**Why white isn't just a preference:** neobrutalism's signature move — the hard, offset, non-blurred shadow — only reads clearly against a plain, uninterrupted background. A gradient or textured background would make every offset shadow look muddy. White is a structural requirement for the shadow language to work, not only an aesthetic choice.

## Typography

| Role | Typeface | Why |
|---|---|---|
| Display / headings | **Archivo Black** | Maximum weight, geometric, unapologetically blunt — the typeface itself carries the "brutalist" half of the brief. Used for page titles, big dashboard numbers, section headers. |
| Body / UI | **Inter** | Highly legible at small sizes, huge weight range, doesn't compete with Archivo Black for attention. Used for everything else: labels, table cells, form fields, buttons. |
| Data (numeric only) | **IBM Plex Mono** | Reserved narrowly for salary figures, match scores, and dates in the Jobs table. Monospace figures align in columns, which matters for a data-dense CRM table — this is a functional choice for tabular alignment, not a decorative "tech" label font, and it's used only where numbers actually need to line up. |

Two families carry the page's personality (Archivo Black for voice, Inter for legibility); the third is a narrow, functional exception for aligned numerals, not a competing display face.

**Type scale:** headings step up in clear jumps (e.g. 14 / 16 / 20 / 28 / 40px) rather than a fine-grained scale — chunky, deliberate jumps match the blocky visual language better than subtle intermediate sizes.

## Layout

```
┌──────────┬──────────────────────────────────────┐
│          │  Page title (Archivo Black, 40px)     │
│  NAV     │  ┌────────┐ ┌────────┐ ┌────────┐    │
│  (Ink    │  │ Stat   │ │ Stat   │ │ Stat   │    │  ← bordered cards,
│  border- │  │ card   │ │ card   │ │ card   │    │    hard offset shadow
│  right)  │  └────────┘ └────────┘ └────────┘    │
│          │                                        │
│  Dash    │  ┌──────────────────────────────────┐ │
│  Jobs    │  │  Chart / table content            │ │
│  Profile │  │                                    │ │
│          │  └──────────────────────────────────┘ │
└──────────┴──────────────────────────────────────┘
```

- **Left sidebar, persistent across all three pages** — bold Inter labels, thick right border (4px, Ink), active page indicated by a solid Ink fill behind the label (not a thin underline — thin accents undersell the brutalist language).
- **Left-aligned throughout.** This is a data tool, not a marketing page — centered text/layouts would fight the CRM-table-and-dashboard content this app is actually built around.
- **Dashboard as a bento-style grid** of bordered cards (stat cards, chart cards, the skill gap widget, activity feed) — each card is Paper background, 2–3px Ink border, and a hard offset shadow (`4px 4px 0 #141414`, no blur).
- **Jobs table rows** get a bottom border only (not full cell borders — full grid lines would visually compete with the status pill borders sitting inside each row).
- **Status shown as a pill badge**: colored fill (or white/Ink-outline for not-yet-acted, per the color table above), 2px Ink border, Inter Bold text in Ink (never white text on a pastel fill — see accessibility note below).

## Component patterns

**Buttons**
- Default state: fill color per role (Ink for primary, pastel accent for status-related actions), 2–3px Ink border, `4px 4px 0 #141414` offset shadow, no border-radius or a minimal 2px radius — enough to not look like a sharp blade, not enough to soften the brutalist edge.
- Press/active state: shadow collapses to `0 0 0`, button visually shifts down-and-right by the shadow's original offset (`translate(4px, 4px)`) — this is the signature neobrutalist interaction, giving tactile "this got physically pressed" feedback. This is the one deliberate motion moment in the system (per the frontend-design principle of spending motion on one orchestrated thing rather than scattering hover effects everywhere) — don't add separate fade/slide hover transitions elsewhere on top of this.
- Disabled state: Ink border at reduced opacity, no shadow (reads as "flat against the page," i.e. not interactive).

**Cards**
- Paper background, 2–3px Ink border, hard offset shadow. Cards do not use rounded corners beyond the same minimal radius as buttons — one consistent corner treatment across every bordered element, not cards-rounded-more-than-buttons or vice versa.

**Status pills** — see color table above. Text is always Ink, regardless of fill color, for contrast (see accessibility).

**Charts** (jobs-per-day, applications-by-status, match distribution) — flat fills in the four accent colors where they map to status/score meaning; Ink for axis lines and labels; no gradients, no drop shadows on chart elements themselves (reserve the hard-shadow language for containers/cards, not for every bar in a bar chart, or the page becomes visually noisy).

## Accessibility

- **Never use white text on a pastel fill.** Bubblegum Pink, Sky Blue, Mint Green, and Blush Red are all light enough that white text fails contrast — every pill, button, or card using these fills gets Ink text, not Paper text.
- **Visible keyboard focus**: a focus ring reuses the shadow language — on focus, apply the same `4px 4px 0 #141414` offset shadow used for hover/rest state buttons (if not already present) plus a 2px Ink outline offset from the element, so focus is unmistakable without introducing a new visual language just for focus states.
- **Reduced motion**: the button press-shift animation should be disabled (snap instantly, no transition) under `prefers-reduced-motion: reduce`.
- **Don't rely on color alone for status.** Every status pill carries text (e.g. "Interview Scheduled"), not just a color swatch — color reinforces the state for users who can distinguish it, but isn't the only signal, which also covers colorblind users who may not distinguish pink from blush red at a glance.

## Implementation notes (Tailwind + shadcn/ui)

Since `engineering/TECH_STACK.md` already specifies Tailwind + shadcn/ui, adopting this theme means overriding shadcn's default tokens rather than fighting them component-by-component:

- Define the six named colors as CSS variables in the app's global stylesheet (`apps/web/app/globals.css`), and extend `tailwind.config.ts`'s theme with them (`paper`, `ink`, `pink`, `sky`, `mint`, `blush`) so they're usable as ordinary Tailwind classes (`bg-pink`, `border-ink`, etc.) rather than one-off hex values scattered through components.
- Override shadcn's `--radius` CSS variable to a small value (e.g. `2px`) globally, rather than passing a custom radius prop per component — this keeps every shadcn primitive (Button, Card, Badge, Input) consistent with the flat-cornered brutalist look without hand-editing each one.
- Add a shared `neo-shadow` utility class (`box-shadow: 4px 4px 0 var(--ink); border: 2px solid var(--ink);`) and a `neo-shadow-press` variant for the `:active` state, applied via shadcn's `cva` variant system on the `Button` and `Card` components rather than as inline styles, so the effect is defined once and reused everywhere.
- Status pill colors map directly to the `ApplicationStatus` enum from `packages/db/prisma/schema.prisma` — implement this as a single lookup object (`statusColorMap: Record<ApplicationStatus, string>`) shared wherever a status pill renders (Jobs table, Job detail panel, activity feed) rather than reimplementing the mapping in multiple components.

## Restraint check

The one bold, memorable element in this system is the button/card **press interaction** — everything else (layout, spacing, card treatment) stays quiet and consistent so that interaction reads as intentional rather than one effect among many competing for attention. Resist adding rotation/tilt, additional hover-only shadows, or per-section decorative flourishes — the brief already gives this theme a strong identity through color + border + shadow + type; anything extra dilutes it rather than adding to it.
