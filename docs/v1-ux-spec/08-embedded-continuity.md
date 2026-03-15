# Embedded Continuity

This doc specifies how continuity is surfaced in the V1 UX. It does not define the structural semantics of continuity — those live upstream.

## Structural Ownership

Continuity is defined as a **lightweight embedded surface inside the main route**. It is not a top-level destination, page, or navigation route.

Source docs:

- `docs/product-experience-architecture/04-structural-product-model.md`
- `docs/product-experience-architecture/07-surface-architecture.md`

This doc translates that into UX-owned surfaced behavior.

## Product Object Alignment

Internally, continuity is about **study threads** persisting across sessions. In the UX, the student sees **topics** — their own words for what they're studying. Each topic label maps to one study thread. This doc uses "topic" for what the student sees and "thread" only when referring to architecture-owned semantics.

## Where Continuity Appears

Continuity inserts in two structural positions only:

1. **Around Arrival** — to help the student re-enter with trusted carryover
2. **Around Completion** — to help meaningful work carry forward without forcing review behavior

It supports the current loop moment; it does not become the current loop moment.

---

## 1. Arrival Surface — Topic List (Primary Continuity)

The topic list on the Arrival Surface is the primary continuity mechanism. It answers: "What carries forward from last time?"

### What The Student Sees

- Their topics, in continuity order (most recently active first)
- A relative recency indicator per topic ("Yesterday", "3 days ago", "Last week")
- No session count, no metrics, no performance summary

### Ordering Behavior (UX-Owned)

- Topics appear in product-defined continuity order
- Less recently active topics sink lower
- The surface should feel persistent without becoming archival or analytical
- **Reversal:** If the student returns to an older topic, that topic moves up in the list. Order reflects recency of engagement, not creation order.

### What Continuity Reveals (V1)

| Revealed | Not revealed |
|----------|--------------|
| Topic labels (student's own words) | Session count per topic on Arrival |
| Relative recency ("Yesterday", "3 days ago") | Performance metrics, trends, or comparisons |
| That work carries forward | What the student "should" do next |
| Ability to pick up or start new | Guilt, pressure, or recommendations |

### Empty State

When the student has no topics yet, the Arrival Surface shows an empty state that invites first topic creation. See `07-first-session.md` for first-use behavior.

---

## 2. Completion Surface — Quiet Session Count

After the student's second session with a topic, the Completion confirmation may include a quiet session count.

### Display Rules

| Session # | What the student sees |
|-----------|------------------------|
| 1st | "Organic Chemistry — done." (no count) |
| 2nd | "Organic Chemistry — done. 2nd session." |
| 3rd | "Organic Chemistry — done. 3rd session." |
| … | Per-topic running total |

### Constraints

- **Eligibility:** Appears only on "Covered it" and "Partially" confirmations. Not on "Got stuck" or "Didn't get to it."
- **Visual weight:** Quiet, factual note in Warm Charcoal — secondary to the main confirmation line
- **Scope:** Per-topic count only. Not cumulative across all topics.
- **Semantics:** Running total. Missing days do not reset it. This is NOT a streak.
- **No "1st session":** The count appears starting from session 2. "1st session" would feel self-conscious.

### Validation Note

Whether to show session count at all, and at what threshold, is a V1 implementation choice to validate. The principle is: continuity should feel supportive, not evaluative. If the count starts feeling like a performance metric, it violates the continuity test.

---

## Topic Lifecycle (UX Layer)

### Creation

A topic first appears in continuity when the student has completed at least one session with it. In V1, the student's exact topic words remain the visible label. No inferred renaming.

### Persistence

Topics carry forward reliably across sessions. The student should not need to manage history. The UX implication: once a topic exists, it stays in the list until the student removes it.

### Removal

| Aspect | UX behavior |
|--------|-------------|
| **Trigger** | Long-press on a topic card on the Arrival Surface |
| **Affordance** | "Remove" option (sheet or contextual action) |
| **Confirmation** | None. The action is quiet. |
| **Reversibility** | Removed means gone from the list. The student can create a new topic with the same or similar name if desired. |
| **Archive** | No archive concept in V1. Remove = gone from list. |

### No Editing in V1

Topic renaming and editing are deferred to Pass 2. If the student made a typo, they can remove the topic and create a new one.

---

## What Continuity Must Never Become

- A timeline showing all past sessions chronologically
- An analytics surface with charts, graphs, or trend lines
- A performance review the student feels obligated to check
- A comparison surface (topic A vs topic B)
- A recommendation engine ("You should study X because...")
- A guilt surface ("You haven't studied Thermodynamics in 2 weeks!")

---

## The Continuity Test

Continuity is working correctly when:

- The student can re-enter and immediately know what they were working on
- Re-entry feels easier than starting from scratch
- The student never feels obligated to "review" before studying
- Topic persistence feels supportive, not surveillance-like
- The product feels like it remembers without feeling like it's watching

---

## Design Principle

Continuity in Eli should feel like opening a notebook that still has your bookmark in it — you can see where you left off, but no one is grading your reading speed.
