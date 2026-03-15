# Arrival Surface

## Emotional Job

Welcome the student back. Restore orientation. Make the next step visible. Never make the student review themselves before they can start.

## When It Appears

This spec applies whenever the architecture layer resolves the student to `Arrival`.

Canonical entry resolution lives in:

- `docs/product-experience-architecture/07-surface-architecture.md`
- `docs/product-experience-architecture/08-navigation-philosophy.md`

When the student has no topics yet (first-ever session), see `07-first-session.md` — the Arrival and Commitment surfaces are merged.

## Presentation States

The Arrival Surface has distinct presentation states. UX must handle each explicitly.

| State | Condition | What the student sees |
|-------|-----------|------------------------|
| **First-use** | No topics exist | Merged Arrival + Commitment flow. See `07-first-session.md`. |
| **Empty (returning)** | Student removed all topics or data reset | Greeting + empty-state message + "Something new" action. No topic list. |
| **Populated** | One or more topics exist | Greeting + topic list + "Something new" action. |
| **Loading** | Topics are being resolved | Greeting + loading indicator or skeleton for topic list. No interaction until resolved. |

## Screen Layout (Populated State)

```
┌─────────────────────────────────┐
│                        [avatar] │  ← Profile access (subtle, top-right)
│                                 │
│                                 │
│  "Hey. What are you working     │  ← Greeting line (Voice Type)
│   on today?"                    │
│                                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Organic Chemistry        │  │  ← Topic card (tappable)
│  │  2 days ago               │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Thermodynamics           │  │  ← Topic card (tappable)
│  │  Yesterday                │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Math — Integration       │  │  ← Topic card (tappable)
│  │  4 days ago               │  │
│  └───────────────────────────┘  │
│                                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │  + Something new          │  │  ← New topic action (tertiary)
│  └───────────────────────────┘  │
│                                 │
│                                 │
└─────────────────────────────────┘
```

## Element Breakdown

### 1. Greeting Line

- **Type:** Voice Type (Eli's spoken presence)
- **Content:** A calm, non-presumptuous line that orients without reviewing.
- **Phase behavior (Arrival phase):** Generic and welcoming. Eli does not yet know the student well enough to be specific. Examples of the *pattern* (not fixed copy):
  - "Hey. What are you working on today?"
  - "Back again. What's next?"
  - "Ready when you are."
- **What it must never say:**
  - "You haven't studied in 3 days" (guilt)
  - "Great to see you back!" (hype)
  - "Based on your history, I recommend..." (premature specificity)
- **Visual:** Deep Charcoal on Warm Paper. Generous whitespace above and below. No decoration.

### 2. Topic List

- **Type:** Structure Type (actionable, orientational)
- **Content:** Existing topics (study threads) the student has studied before, shown as tappable cards.
- **Card contents:**
  - Topic name (Deep Charcoal, primary weight)
  - Recency indicator (Warm Charcoal, secondary) — relative time like "Yesterday", "2 days ago", "Last week". Not an absolute date. Not a session count.
- **Order:** Per `08-embedded-continuity.md` — most recently active first. Less recent topics sink lower.
- **Visibility:** Show up to 5 topics. If more exist, the list scrolls. No "see all" button — scrolling is sufficient.
- **Visual:** Soft card surfaces on Warm Paper. Subtle shadow or soft border. Rounded corners. Generous spacing between cards.
- **Empty state:** When no topics exist (first-ever session), this section is absent. See `07-first-session.md`. When the student has removed all topics, show empty-state copy per below.

### 3. "Something new" Action

- **Type:** Structure Type (tertiary affordance)
- **Content:** A clearly secondary action for declaring a new topic.
- **Visual:** Not a card — a lighter treatment. Text-only or outlined, not filled. Positioned below the topic list so it doesn't compete with existing topics.
- **Interaction:** Tap → Commitment Surface with an empty topic field.

### 4. Profile Access

- **Type:** Subtle icon (top-right corner)
- **Content:** Leads to a minimal overlay with student name and exam info. Not a full settings page.
- **Visual:** Small, understated. Does not compete with the greeting or topic list. Warm Charcoal icon on Warm Paper.

## Content-State Behavior

### Long Topic Labels

- Topic names are student-defined and may be long. Truncate with ellipsis at a reasonable character limit (e.g., ~40 chars). Full text on tap or in Commitment.
- **Validation note:** Exact truncation threshold is a V1 implementation choice.

### Large List (6+ Topics)

- List scrolls. No pagination. No "see all" — scrolling is sufficient.
- **Validation note:** Whether to cap visible count or allow infinite scroll is a V1 implementation choice. The principle: the list should not feel archival or dashboard-like.

### Empty State (Returning Student, No Topics)

When the student has removed all topics or data has reset:

- Greeting remains.
- Replace topic list with a brief empty-state message: e.g., "Nothing here yet. Add a topic when you're ready."
- "Something new" action remains prominent.
- No guilt, no pressure, no "You haven't added anything!"

## Interaction Model

| Action | Destination | What happens |
|--------|-------------|--------------|
| Tap a topic card | Commitment Surface | The selected topic is carried into the next loop moment. |
| Tap "Something new" | Commitment Surface | The next loop moment begins with an empty topic field. |
| Long-press a topic card | Contextual action | "Remove" option. Per `08-embedded-continuity.md`. |
| Tap profile icon | Profile overlay | Minimal sheet with name + exam info. |
| System back | Architecture-defined | Root-level back behavior is owned by the transition model. |

## Continuity Without Dashboard Drift

The topic list IS continuity. It must:

- Help the student re-enter without demanding review
- Feel supportive, not evaluative
- Never show session counts, metrics, or performance summaries on this surface

Per `08-embedded-continuity.md` for what continuity reveals and what it must never become.

## Hierarchy

1. **Greeting** (Voice Type) — noticed first, sets emotional tone
2. **Topic list** (Structure Type) — actionable, the main thing to interact with
3. **"Something new"** — tertiary, available but not competing
4. **Profile** — minimal, corner-positioned

## What This Surface Must Never Become

- A dashboard showing study stats, session counts, or performance summaries
- A review surface where the student evaluates themselves before starting
- A feature launcher with multiple equally weighted destinations
- A notification center or inbox
- A greeting-heavy surface where Eli talks too much before the student can act

## Accessibility

- **Focus order:** Greeting (if focusable) → first topic card → … → "Something new" → profile icon. Logical top-to-bottom, left-to-right.
- **Screen reader:** Each topic card must have an accessible label: topic name + recency (e.g., "Organic Chemistry, 2 days ago").
- **Tap targets:** Minimum 44×44 pt for topic cards and "Something new".
- **Dynamic type:** Layout should accommodate larger text without breaking. Topic names may wrap if needed.
- **Reduced motion:** No decorative motion on this surface. Transitions should respect system reduced-motion preference.

## Visual Notes

- **Background:** Warm Paper (`#FDFCF8`)
- **Primary text:** Deep Charcoal (`#2A2825`)
- **Secondary text:** Warm Charcoal (`#736F66`)
- **Cards:** Soft surfaces with subtle depth. Not flat rectangles with hard borders.
- **Spacing:** Generous negative space. The screen should feel calm and uncluttered even with 5 topic cards.
- **No color accents on this surface.** No Terracotta (CTA belongs on Commitment). No Sage Green (confirmation belongs on Completion). The Arrival Surface is Paper + Charcoal only.
