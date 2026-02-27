# Phase 3 Design — Sprint 2 Working Folder

> Phase 3 is where addiction is born. Phase 1 earns trust. Phase 3 earns return visits. This sprint designs everything that happens after the student ends a study session — the proof ask, the counter drop, the 7 scenario screens, and the Seed that pulls them back tomorrow.

---

## What Was Missing Before This Sprint

| Gap | Impact |
|---|---|
| Verification ask screen not designed | The most important ask in the product — "prove you remember it" — had no interaction design |
| Self-reporting flow undefined | User confirmed: verification is self-report. What does the student tap, in what order, with what copy? |
| Counter animation only sketchily specced | The `3 → 2` drop is the dopamine moment. It needed a frame-by-frame animation contract. |
| 7 scenarios (A–G) only wireframed in ASCII in UX spec | Not buildable without component lists, exact copy, and visual notes |
| Skip flow undefined at interaction level | 3 fixed reasons shown how, in what order, after what trigger? |

---

## Folder Structure

```
docs/phase3-design/
├── 00-index.md                 ← You are here
├── 01-verification-ask.md      ← Proof ask screen: self-report flow, skip flow, session-duration variants
├── 02-counter-animation.md     ← Animation contract: the 3→2 drop, milestone (→0), first-ever
└── 03-phase3-scenarios.md      ← All 7 scenarios (A–G) with wireframes, copy, components, visual notes
```

---

## Key Decisions Made in This Sprint

| Decision | Chosen direction | Doc |
|---|---|---|
| Verification interaction | Self-reporting: student does 1 question independently, then taps result | [01](01-verification-ask.md) |
| Self-report options | 3 options: Got it / Shaky / Need more practice (no binary pass/fail) | [01](01-verification-ask.md) |
| Skip trigger | Small "Can't right now" link below CTAs → expands to 3 reason chips | [01](01-verification-ask.md) |
| Counter animation duration | ~470ms total, two-phase (old number out, new number in + pulse) | [02](02-counter-animation.md) |
| Milestone (`→ 0`) treatment | Distinct scenario (F) — special copy, no "Clear one more" | [02](02-counter-animation.md) |
| Phase 3 background | Same `--color-bg` for skip/reminder; `--color-closed-soft` tint for loop-closed card | [03](03-phase3-scenarios.md) |
| Checkmark | Text character `✓`, styled with `--color-closed`, 28px — no SVG icon | [03](03-phase3-scenarios.md) |

---

## How Phase 3 Flows

```
Phase 2 (student studying)
    ↓
Student ends session → SessionEnd fires
    ↓
P3 Gate runs → VerificationDecisionIssued
    ↓
ViewComposer renders "proof ask" screen   ← NEW: designed in 01-verification-ask.md
    ↓
Student self-reports result (or defers / skips)
    ↓
ViewComposer renders Phase 3 close card   ← Scenarios A–G: designed in 03-phase3-scenarios.md
    ↓ (counter animates if loop closed)
Student taps "Done" or "Clear one more"
    ↓
Phase 1 re-renders with updated aggregates
```

---

## How This Connects to Existing Docs

```
docs/ei/spec/EI_Protocol_3_Verification.md  ← P3 gate logic (VerificationDecisionIssued)
docs/ei/EI_Engine_Taxonomy.md §5.3          ← verificationDecision output shape
docs/student-ux-architecture/07-phase3-the-close.md  ← UX spec: 7 scenarios, counter rules, seed rules
docs/phase1-design/01-visual-language.md    ← Design tokens (reused here)
        ↓
docs/phase3-design/                          ← THIS FOLDER: interaction + visual design
        ↓
src/ei/sdui/view-composer.ts               ← composePhase3View() implementation
src/app/sdui/components/loop-closed-card   ← Counter animation component
```

---

## What's Not in This Sprint

- **Phase 2 (in-session) visual design** — ✓ designed in Sprint 3: [docs/phase2-design/](../phase2-design/)
- **Push notification design** — ✓ designed in Sprint 3: [docs/phase2-design/03-push-notifications.md](../phase2-design/03-push-notifications.md)
- Institute-facing risk dashboard — deferred (separate product surface)
- Strategic adjustment screen — deferred (weekly cadence, low priority for v1 student UX)

---

*Phase 3 owns the Closure beat and the Seed beat — the two beats that determine whether the student returns tomorrow.*
