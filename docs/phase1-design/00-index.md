# Phase 1 Design — Sprint 1 Working Folder

> This folder is the active design workspace for **Phase 1: The Open**, end-to-end. It translates the UX spec in `docs/student-ux-architecture/` into actionable design decisions: visual language, interaction patterns, onboarding flow, and high-fidelity variant specs for all 9 screen states.

---

## What's Blocked (Why This Sprint Exists)

Before this folder, Phase 1 was fully specced at the **logic layer** but had zero decisions at the **sensory layer**:

- No color palette, typography, or spacing decisions → engineers can't implement consistently
- Scales input (energy/pressure) was UI-undefined → highest-friction interaction in the product
- Onboarding was one wireframe line → first session has no designed path
- Phase 1 variants existed as ASCII sketches → not buildable

This sprint closes all four gaps.

---

## Folder Structure

```
docs/phase1-design/
├── 00-index.md              ← You are here
├── 01-visual-language.md    ← Design system: color, type, spacing, motion
├── 02-scales-input-ux.md    ← Energy/sleep/pressure/backlog input interaction
├── 03-onboarding-flow.md    ← First-ever open: topic selection + ELI intro
└── 04-phase1-variants.md    ← All 9 Phase 1 variants, high-fidelity
```

---

## Reading Order

| Order | Doc | What you get |
|---|---|---|
| 1 | [01-visual-language.md](01-visual-language.md) | Design tokens, type scale, spacing, motion, Rescue/Neutral/Boost visual tone |
| 2 | [02-scales-input-ux.md](02-scales-input-ux.md) | Chip interaction design for all 4 scales; personalization hint placement |
| 3 | [03-onboarding-flow.md](03-onboarding-flow.md) | First-ever open: 3-screen flow, topic input, task type selection |
| 4 | [04-phase1-variants.md](04-phase1-variants.md) | All 9 Phase 1 states with full wireframe, component list, exact copy |

---

## Decisions Made in This Sprint

| Decision | Chosen direction | Doc |
|---|---|---|
| Scale input type | Labeled chips (5 horizontal), not slider | [02](02-scales-input-ux.md) |
| Verification flow | Self-reporting (student taps confidence level, not ELI evaluates) | — |
| Color philosophy | Warm neutral base + one focused accent (indigo); no red/green evaluation colors | [01](01-visual-language.md) |
| Typography | Single typeface (Inter or system sans); weight 400/500/600 only; no bold headings for greeting | [01](01-visual-language.md) |
| Topic input | Free text + subject tag (P/C/M/B); no structured chapter picker | [03](03-onboarding-flow.md) |
| Onboarding length | 2 screens max before first session; no tutorial, no walkthrough | [03](03-onboarding-flow.md) |
| Rescue mode visual | More padding, less content, no pending list, warmer bg | [04](04-phase1-variants.md) |

---

## How This Connects to Existing Docs

```
docs/ei/EI_Engine_Taxonomy.md       ← Gate outputs (mode, labels) that drive variant selection
        ↓
docs/student-ux-architecture/       ← UX logic: craving loop, archetypes, microcopy, anti-patterns
        ↓
docs/phase1-design/                 ← THIS FOLDER: visual + interaction design decisions
        ↓
src/ei/sdui/view-composer.ts        ← Implementation: ViewComposer reads mode, builds SDUI tree
src/app/sdui/components/            ← React components that render the SDUI payload
```

**Rule:** This folder translates UX logic into design decisions. It does not modify the engine taxonomy or the SDUI component contracts. Those live in `EI_Engine_Taxonomy.md` and `src/ei/sdui/types/`.

**North star storyboard:** [`storyboards/S4-flowing-but-avoidant.md`](../student-ux-architecture/storyboards/S4-flowing-but-avoidant.md) — 20 sessions across 12 days, all systems applied. This is the definitive stress test for how Phase 1 variants, checkin observations, task type auto-suggestion, and topic recommendation interact in practice.

**Key cross-references for systems that affect Phase 1:**
- [16-formation-period.md](../student-ux-architecture/16-formation-period.md) — session-vs-day convention, pattern claim tier thresholds
- [17-task-types-and-phase3.md](../student-ux-architecture/17-task-types-and-phase3.md) — task type definitions, auto-suggestion rules
- [18-topic-recommendation.md](../student-ux-architecture/18-topic-recommendation.md) — priority stack for topic suggestions
- [21-relationship-arc.md](../student-ux-architecture/21-relationship-arc.md) — session-by-session capability map

---

## What's Not In This Sprint

- **Phase 2 (in-session) visual design** — ✓ designed in Sprint 3: [docs/phase2-design/](../phase2-design/)
- **Phase 3 (the close) visual design** — ✓ designed in Sprint 2: [docs/phase3-design/](../phase3-design/)
- **Push notification design** — ✓ designed in Sprint 3: [docs/phase2-design/03-push-notifications.md](../phase2-design/03-push-notifications.md)
- **Verification self-report interaction** — ✓ designed in Sprint 2: [docs/phase3-design/01-verification-ask.md](../phase3-design/01-verification-ask.md)
- Institute-facing dashboard — deferred (separate product surface)

---

*Phase 1 is the most important screen in the product. Get this right before Phase 2 and 3.*
