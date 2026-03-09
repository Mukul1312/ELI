# Onboarding Flow — First-Ever Open

> The first session is the entire product argument compressed into 90 seconds. The student needs to understand what ELI does, trust it enough to share something real, and complete one small action. If any of those three fail, they will not open the app again.

---

## 1. Design Constraints

Before designing, these constraints are non-negotiable:

| Constraint | Source |
|---|---|
| No energy question on first-ever open | `03-ux-scales.md` — no data to calibrate against yet |
| No sleep/pressure on first-ever open | Same — no context yet, feels clinical |
| No footer stats on first-ever open | No data to show |
| Maximum 2 screens before the first session starts | Beyond 2, drop-off hits 60%+ |
| No tutorial, no walkthrough, no "here's how it works" screens | Anti-pattern — students skip all of it |
| The product explains itself through the first action, not through text | Show, don't tell |

---

## 2. The First Session Goal

By the end of onboarding, the student must have:
1. Understood the 3-moment structure (open → study → close the loop) — in ONE sentence
2. Named a topic they're working on
3. Chosen a task type
4. Seen what ELI's first response looks like

Not: completed a tutorial, set up a profile, chosen their exam, entered their syllabus.

---

## 3. Screen Flow (2 Screens + 1 Transition)

```
Screen 1: Welcome
    ↓ tap "Get started"
Screen 2: Topic + Task type
    ↓ tap "Let's go"
Screen 3: ELI's first response (this is Phase 1 Variant: ONBOARDING in 04-phase1-variants.md)
    ↓ student starts studying
```

---

## 4. Screen 1 — Welcome

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                                                              │
│                                                              │
│                                                              │
│  ELI                                                         │
│                                                              │
│  Your study companion.                                       │
│                                                              │
│  No schedules. No tracking.                                  │
│  Just 3 moments — open, study, close the loop.              │
│                                                              │
│                                                              │
│                                                              │
│                                                              │
│  [ Get started ]                                             │
│                                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Copy rationale

- **"ELI"** — introduce the name, not the product name. The student builds a relationship with ELI, not with "AI Study Brother."
- **"Your study companion."** — companion, not assistant, not tracker, not coach. Companion implies it's on your side.
- **"No schedules. No tracking."** — immediately address the biggest fears. Students have been through enough productivity apps that turned into obligation machines.
- **"3 moments — open, study, close the loop."** — the entire product thesis in one sentence. The student understands the structure before they use it.

### Design specs

- "ELI" at top: 28px (`display`), weight 500, `--color-text-primary`
- "Your study companion." at 22px (`greeting`), weight 400, `--color-text-primary`
- The two copy lines: 16px (`body`), weight 400, `--color-text-secondary`
- "3 moments" line: same, but "open, study, close the loop" is in `--color-text-primary` weight 400 (not bold — just slightly darker)
- "Get started" button: primary CTA style, full-width, 52px height (Rescue-equivalent — this is a patient, unhurried moment)
- Generous top padding — lots of breathing room above "ELI"
- No logo, no icon, no illustration. Text only.

---

## 5. Screen 2 — Topic + Task Type

This is the most important design decision in onboarding: **how does topic input work?**

### Design decision: Free text + subject chip tag

**Option considered and rejected:** Structured subject → chapter picker
- Adds 2-3 taps before the student starts
- Requires maintaining a chapter list for JEE/NEET syllabus (scope creep)
- Feels like filling out a school form

**Decision: Free text input + optional subject tag**

The student types what they're working on (e.g., "Integration", "Thermodynamics", "Cell Division"). Optionally tags it with a subject chip (P / C / M / B). The backend normalizes this over time.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  What topic are you working on today?                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Integration                                           │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───┐  ┌───┐  ┌───┐  ┌───┐                                 │
│  │ P │  │ C │  │ M │  │ B │                                 │
│  └───┘  └───┘  └───┘  └───┘                                 │
│                                                              │
│  What kind of work?                                          │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  Learn   │  │ Practice │  │  Revise  │                   │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                              │
│  [ Let's go ]                                                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Topic input field

- **Type:** Standard text input
- **Placeholder:** "e.g. Integration, Cell Division, Electrostatics"
- **Autofocus:** Yes — keyboard appears immediately when this screen loads
- **Character limit:** 60 characters
- **Style:**
  - Height: 52px
  - Padding: 16px horizontal
  - Border: 1.5px `--color-border`, radius 12px
  - Focus border: 1.5px `--color-accent`
  - Font: 16px, weight 400, `--color-text-primary`
- **No autocomplete dropdown in v1** — deferred. Students type freely.

### Subject chips (P / C / M / B)

```
┌───┐  ┌───┐  ┌───┐  ┌───┐
│ P │  │ C │  │ M │  │ B │
└───┘  └───┘  └───┘  └───┘
Physics   Chemistry   Maths   Biology
```

- 4 chips, small (40px height), square-ish (min-width 44px)
- Optional — the "Let's go" button is enabled even without a subject tag
- P and C are pre-selected by default for JEE students (since most subjects overlap). Actually, **no pre-selection** — the student picks.
- Labels: single letter only (P / C / M / B) — universally understood by JEE/NEET students
- Tooltip on first open (disappears after 1 tap): "Physics / Chemistry / Maths / Biology"

### Task type chips (Learn / Practice / Revise)

Same chip design as scales, but 3 options only.

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Learn   │  │ Practice │  │  Revise  │
└──────────┘  └──────────┘  └──────────┘
```

- No number label (task type is not a scale)
- One must be selected before "Let's go" is enabled
- Default: no pre-selection. Student picks.
- Note for future personalization: starting Day 8, the previously used task type is pre-selected (it's usually the same)

### "Let's go" button

- Disabled until: topic text is non-empty AND task type is selected
- Disabled state: bg `--color-surface-subtle`, text `--color-text-tertiary`
- Enabled state: standard primary CTA style
- No animation on enable transition — just immediate color change

### Copy rationale

- **"What topic are you working on today?"** — "today" anchors it to right now, not a long-term plan. Reduces the pressure of committing to a study plan.
- **"What kind of work?"** — 3 words. Not "What type of study activity would you like to pursue?" Not even "Task type." Just: "What kind of work?"
- **No instructions** on this screen. The input is self-explanatory. Subject chips need no explanation (JEE/NEET students know P/C/M/B).

---

## 6. Transition: Screen 2 → ELI's First Response

After "Let's go" is tapped:

1. Screen 2 fades out (150ms)
2. ELI's Phase 1 ONBOARDING variant fades in (200ms)

**What ELI shows (first-ever, no energy data):**

```
Welcome.

ELI helps you study smarter —
not longer.

You're working on Integration.

[ Start learning (15–20 min) ]
[ Start practicing (15–20 min) ]

──────────────────────────────────
Your first session starts now.
```

The topic the student just entered appears by name. ELI remembers it immediately. This is the first "it knows me" signal — even on Day 1.

The CTAs match the task type they selected. If they picked "Learn", the primary CTA is "Start learning". If they picked "Practice", it's "Start practicing".

See [variants.md](variants.md) ONBOARDING variant for the full first-response spec.

---

## 7. Edge Cases

### Student taps "Get started" then closes the app (Screen 1 → abandonment)

On next open, show Screen 1 again. Do not treat this as "first session completed." The student hasn't given ELI any data yet.

### Student enters a topic but doesn't pick a task type

"Let's go" stays disabled. No error message — the absence of the enabled button is sufficient feedback. Do not show a red error state ("please select a task type") — that feels like a form validation failure.

### Student enters something nonsensical as a topic

Accept it. Do not validate. The student knows what they're studying. If they type "hhhhhh", that becomes their topic for today. It will never be recommended again (no pending check created from a nonsense session). Do not police input.

### Student closes the app mid-onboarding (after Screen 2)

On next open, resume from where they left off: if topic+task type were submitted, show ELI's first response again. The `AppOpen` event fires; if no prior completed session exists, the ONBOARDING variant fires.

### Student is JEE vs NEET (different syllabus)

v1: Do not ask which exam. The subject chips (P/C/M/B) handle both. JEE students use P/C/M. NEET students use P/C/B. ELI doesn't need to know the exam to be helpful on Day 1.

---

## 8. What Onboarding Does NOT Do

These are anti-patterns specifically for onboarding:

| Do NOT | Why |
|---|---|
| Ask for name, email, exam, target IIT/NEET rank | Creates pressure and a sense of evaluation before the student has experienced any value |
| Show a tutorial or feature walkthrough | Students skip it. The product must explain itself through use. |
| Ask energy on the first open | No history to calibrate against. The P1 gate defaults to Neutral on first session. |
| Show progress indicators ("Step 1 of 3") | Adds a finish-line pressure to onboarding. The student should feel like they're starting something, not completing a setup wizard. |
| Ask about study schedule or daily hours | ELI does not own the student's schedule. Asking implies it will. |
| Show benefits or features ("ELI tracks your study habits") | Feature lists feel like marketing, not product. The student learns what ELI does by using it. |

---

*Next: [variants.md](variants.md) — all 9 Phase 1 screen states, high-fidelity.*
