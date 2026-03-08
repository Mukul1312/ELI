# Phase 2 Design — Sprint 3 Working Folder

> Phase 2 is the most humble phase in the product. The student is studying — ELI's job is to stay out of the way. This sprint designs two surfaces: the activation entry (what the student sees when they first commit) and the active session screen (what they see while working). Push notifications are also designed here — the system's voice when the app is closed.

---

## What Was Missing Before This Sprint

| Gap | Impact |
|---|---|
| Activation entry screen not designed | The P2 gate emits `firstAction`, `timeboxMin`, `focusContract` — but what does the student see? No visual spec existed |
| "2-minute start" only described in words | The most critical Rescue mechanic had no interaction design — timer style, "Keep going?" prompt, transition to active session |
| Active session screen undefined | What fills the screen while the student works? When does ELI speak? What does "End session" look like? |
| Push notifications undesigned | 3 notification types were specced in EI logic but had no copy, timing, or routing design |

---

## Folder Structure

```
docs/phase2-design/
├── 00-index.md                    ← You are here
├── 01-activation-entry.md         ← P2 gate output → screen: firstAction cards, 2-min timer, focus contract
├── 02-active-session.md           ← Active session: context bar, elapsed time, ELI nudge, End session
└── 03-push-notifications.md       ← 3 notification types: copy, timing, deep-link routing
```

---

## Reading Order

| Order | Doc | What you get |
|---|---|---|
| 1 | [01-activation-entry.md](01-activation-entry.md) | What the student sees immediately after tapping a CTA in Phase 1 |
| 2 | [02-active-session.md](02-active-session.md) | The screen the student sees while studying — sparse by design |
| 3 | [03-push-notifications.md](03-push-notifications.md) | The app's voice when closed: 3 notification types with full copy |

---

## Key Decisions Made in This Sprint

| Decision | Chosen direction | Doc |
|---|---|---|
| Timer direction | Elapsed only (counts up), never countdown | [01](01-activation-entry.md), [02](02-active-session.md) |
| Active session visual | Intentionally empty middle — student should be studying, not looking at app | [02](02-active-session.md) |
| ELI mid-session nudge | One nudge per session max, fades in at ~15 min, dismissible | [02](02-active-session.md) |
| "End session" affordance | Text-only link (tertiary), always visible, no confirm dialog | [02](02-active-session.md) |
| Session end trigger | Student taps "End session" → `SessionEnd` fires → Phase 3 | [02](02-active-session.md) |
| Push notification types | 3 types: 24h reminder, silence re-entry, student schedule miss | [03](03-push-notifications.md) |
| Deep-link routing | Each notification type lands on a specific screen state, not generic Phase 1 | [03](03-push-notifications.md) |

---

## How Phase 2 Flows

```
Phase 1 (student taps CTA)
    ↓
IntentSet fires
    ↓
P2 gate → ActivationPlanIssued (mode, firstAction, timeboxMin, focusContract)
    ↓
Activation entry screen     ← designed in 01-activation-entry.md
    ↓
Student taps "I've started" or timebox expires → screen clears
    ↓
Active session screen        ← designed in 02-active-session.md
(ELI nudge fires at ~15 min — once, dismissible)
    ↓
Student taps "End session" → SessionEnd fires
    ↓
Phase 3 (verification ask → close card)
```

---

## How This Connects to Existing Docs

```
docs/ei/spec/EI_Protocol_2_Activation.md   ← P2 gate logic (plays, modes, firstAction, timebox)
docs/student-ux-architecture/06-phase2-the-session.md  ← UX spec: 2-min pattern, context bar, edge cases
docs/phase1-design/01-visual-language.md   ← Design tokens (reused here — same system)
        ↓
docs/phase2-design/                         ← THIS FOLDER: interaction + visual design
        ↓
src/ei/sdui/view-composer.ts               ← composeP2View() implementation
src/app/sdui/components/session-context-bar ← context bar component
```

**North star storyboard:** [`storyboards/S4-flowing-but-avoidant.md`](../student-ux-architecture/storyboards/S4-flowing-but-avoidant.md) — 20 sessions across 12 days. Shows activation entry plays, context bar content, nudge timing, and session duration variance in practice.

**Key cross-references:**
- [06-phase2-the-session.md](../student-ux-architecture/06-phase2-the-session.md) — authoritative UX spec for Phase 2 (context bar shows `[Topic] · [TaskType] · [Scope label]`, not DifficultyTier)
- [17-task-types-and-phase3.md](../student-ux-architecture/17-task-types-and-phase3.md) — task type definitions that affect context bar content

---

## What's Not in This Sprint

- Phase 2 visual design for advanced `focusContract` features (distraction blocking) — v2
- Rich-media or audio nudges from ELI — v2
- In-app notification centre or history — deferred
- Institute-facing push notifications — separate product surface

---

*Phase 2's design is defined by restraint. The less the app demands attention during the session, the more the student can actually study.*
