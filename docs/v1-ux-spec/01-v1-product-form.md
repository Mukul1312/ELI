# V1 Product Form

These are binding product decisions for V1. They resolve open questions from the experience architecture into firm calls.

This doc is the UX-owned translation of the product architecture. It does not redefine the structural model in `docs/product-experience-architecture/04-structural-product-model.md` or `12-v1-product-architecture.md`; it instantiates them for build.

## What Eli V1 Is

Eli V1 is a single-route, loop-centered mobile app that helps exam students study better. The student studies externally (textbooks, notes, other tools). Eli is the companion layer around that external activity — it helps the student start, stay oriented, and close meaningfully.

## Product Object Model (V1 Translation)

The architecture distinguishes three product objects. For V1 UX:

| Object | Internal model | Student-facing label | V1 behavior |
|-------|----------------|----------------------|-------------|
| Session | One bounded study attempt | "session" (implicit in flow) | One session per loop pass; belongs to one study thread |
| Study thread | Ongoing line of work | **Topic** | Student declares and sees it as a topic label; Eli tracks it internally as a study thread |
| Curriculum context | Optional academic structure | Not surfaced in V1 | Deferred; may support quietly in background in later passes |

**V1 call:** The student-facing label for a study thread is **topic**. The student types whatever they want ("Organic Chemistry", "Chapter 4 — Thermodynamics", "Math formulas"). Eli treats it as a topic label and tracks it internally as a study thread. This is a V1 implementation choice; whether "study thread" ever becomes user-facing language is an open product decision (see `docs/product-experience-architecture/15-open-questions-and-decisions.md`).

## The Loop

The entire product is organized around one loop:

```
Arrival → Commitment → Active Study → Completion → (back to Arrival)
```

Every screen belongs to this loop. There are no peer-level destinations that compete with it.

## Four Primary Surfaces

| Surface | Loop stage | Primary object | Emotional job |
|---------|-----------|----------------|---------------|
| Arrival | Return + Orient | Study thread (as topic) | Welcome back, restore orientation, make the next step visible |
| Commitment | Commit | Upcoming session in chosen thread | Narrow ambiguity, bound the task, make beginning feel manageable |
| Active Study | Work | Current session | Protect focus, stay quiet, let external study remain the center |
| Completion | Close | Closed session feeding thread | Verify progress honestly, make completion feel grounded |

## Firm V1 Calls

### Topic model (study-thread-facing)
- **Free-text declaration.** The student types whatever they want. Eli treats it as a topic label and tracks it as a study thread.
- No predefined curriculum catalog. No subject taxonomy. No syllabus browsing.
- Topics are the student's own words. They carry forward across sessions as living threads.
- **Thread-first, taxonomy-second.** If curriculum structure appears later, it supports the thread; it does not replace it.

### Session framing
- Eli pre-fills a suggested session frame (e.g., "20 min") on the Commitment Surface.
- The student can **accept** (tap and go), **adjust** (edit to their own frame), or **clear** (go frameless).
- The frame is an invitation, not a contract. Eli does not enforce timers or force stops.
- **Validation note:** The "20 min" default is a V1 implementation choice to validate; it is not a principle-level requirement.

### Verification
- **Layer 1 (every session):** Honest self-report on the Completion Surface. Four options: "Covered it" / "Partially" / "Got stuck" / "Didn't get to it." All options are equal — no shame for any choice.
- **Layer 2 (periodic retrieval check):** Deferred to Pass 2. Phase-gated, earned.

### Active study model
- Study happens outside the app. Eli provides a minimal ambient screen if the app stays open, and supports notification-based return if the app is closed.
- The Active Study Surface is the quietest surface in the product.

### Return and re-engagement
- Self-initiated return is the primary model.
- Push notifications default to zero. No streaks. No daily reminders. No guilt.
- Scheduled retrieval nudges (opt-in, rare) are deferred to Pass 2.

### Continuity and reflection
- **Continuity:** Embedded within the main route, per `04-structural-product-model.md`. Appears around Arrival and Completion to support re-entry and carryover. Not a destination, page, or navigation route.
- **Reflection (Mirror):** Deferred to Pass 2 for full treatment. V1 may include sparse, earned reflective moments near return or close when the brand has earned them; no dedicated reflection destination.

### Secondary modes
- **Conversational Eli:** If present in V1, it is a temporary summoned support mode, not a primary destination. See `docs/product-experience-architecture/07-surface-architecture.md` for surface-specific allowed help and disallowed behavior.
- **Lightweight history:** V1 may include a clearly secondary history route for recall. Its exact product form is an open decision.

## Principle vs V1 Choice (Validation Summary)

| Decision | Type | Notes |
|----------|------|-------|
| Topic = student-facing label for study thread | V1 call | May change if "study thread" becomes user-facing |
| "20 min" default frame | To validate | Test whether it feels right; not a principle |
| Session count on Completion | To validate | Per `08-embedded-continuity.md`; principle: supportive, not evaluative |
| 2–3 sec auto-advance on Completion | To validate | Test with accessibility tools; may need adjustment |
| No "see all" for topic list; scroll only | To validate | Principle: list should not feel archival |
| Long-press remove (no confirmation) | To validate | Principle: quiet, reversible-feeling; test accidental taps |
| Truncation threshold for long topic names | To validate | Implementation choice; ~40 chars is a starting point |

## What V1 Does Not Include

- No settings page (boundaries are inline where needed)
- No history/timeline view as a peer-level destination
- No analytics, dashboards, or insights section
- No Mirror moments as a dedicated surface (deferred to Pass 2)
- No tab bar or bottom navigation
- No onboarding wizard or tutorial
- No gamification (badges, streaks, points, leaderboards)
- No performance summaries or progress bars
- No multi-topic sessions
