# Structural Product Model

Eli should be structured around a primary loop with a small number of supporting layers.

It should not be structured like a productivity suite where many tools compete for equal importance.

## Structural Principle

The product should be:

- loop-centered
- shallow in navigation
- calm in emphasis
- selective in what gets first-class product space

## Product Object Model

Eli should distinguish between three different product objects:

### 1. Session
A `session` is one bounded study attempt or study moment.

- It is the immediate unit of action.
- It is what the main loop carries from commitment into work and closure.
- In V1, a session belongs to exactly one `study thread`.

### 2. Study thread
A `study thread` is the ongoing line of work the student returns to over time.

- It is the persistent continuity object in the product.
- It is what sessions accumulate around.
- It is student-declared first, using the student's own language.
- It may correspond to a topic, chapter, unit, revision target, weakness area, or another student-meaningful slice of work.

### 3. Curriculum context
`Curriculum context` is optional academic structure around a study thread.

- It may include subject, unit, chapter, exam, or other academic framing.
- It can enrich orientation and continuity when useful.
- It must remain supportive and quiet rather than becoming the primary product object.

### Relationship model

- sessions are temporary
- study threads persist across sessions
- curriculum context may enrich a study thread, but must not replace it as the product's primary continuity object

### Anti-drift rule

Eli should remain **thread-first, taxonomy-second**.

If curriculum structure starts leading the experience, the product will drift toward syllabus management, planning overhead, and managerial posture. The student should be able to begin from a study thread even when the curriculum structure is incomplete, messy, or implicit.

## Structural Layers

### 1. Primary loop
This is the center of the product:

- return
- orient
- commit
- work
- close

This loop should feel like the default route through Eli.

### 2. Supporting layers
These exist to support the loop, not replace it.

Likely supporting layers include:

- continuity
- preparation or setup
- preferences and boundaries
- lightweight history where it helps the student re-enter
- a temporary summoned conversational support mode, if it helps the student orient, reconnect, or continue without becoming a destination

These layers should never overshadow the main loop.

### Conversational support mode
If conversational Eli exists, it should be treated as a temporary summoned support mode.

- It is not a primary destination.
- It is not a replacement for continuity surfaces.
- It is not a container for full dashboard behavior.
- It may reveal history, continuity, or thread-level truth on request, but should do so as supportive recall rather than evaluative review.
- It should hand the student back into the main loop once its support job is complete.

## Continuity Decision (Canonical Definition)

> **Structural decision:** Continuity in Eli is a lightweight embedded surface inside the main route. It is not a top-level destination, not a dedicated page, and not a navigation route. This definition is canonical. Other docs in this folder reference this section rather than restating the decision.

Continuity appears inside the main product flow, especially around return and closure, where it helps the student re-enter or understand what still carries forward.

That means continuity:

- appears in support of the main route
- preserves context without demanding review behavior
- remains embedded, not navigated
- inserts around return or closure rather than replacing the primary surface
- hands the student back into the main route once its support job is complete

It does **not** become:

- a top-level destination
- a performance summary area
- a self-review page
- a parallel route that competes with study itself

### Continuity insertion rule
Continuity may insert in two structural positions only:

- around `Arrival`, where it helps the student re-enter with trusted carryover
- around `Completion`, where it helps meaningful work carry forward without forcing review behavior

Continuity should be suppressed or minimized when it would add more load than clarity. It supports the current loop moment; it does not become the current loop moment.

### 3. Reflective surfaces
`Mirror` belongs here.

Reflective surfaces may appear:

- around return
- around closure
- in occasional continuity moments

They should feel like a layer of meaning, not a separate product section that demands regular browsing.

## Loop To Surface Crosswalk

This is the product-level bridge between the experience spine and the canonical surfaces:

| Spine stage | Canonical surface |
|---|---|
| Return + Orient | Arrival Surface |
| Commit | Commitment Surface |
| Work | Active Study Surface |
| Close | Completion Surface |
| Reflect when earned | Reflection Surface |
| Carryover around return or close | Continuity Surface |

This crosswalk is the structural translation of the shared system map in `docs/00-documentation-boundary-and-terminology.md`.

## Continuity Without Dashboard Drift

Eli still needs continuity. The student should not feel like every visit is disconnected from the last one.

But continuity should be expressed through:

- orientation
- trusted context
- visible carryover of meaningful work
- sparse, believable reminders of recent effort

It should **not** be expressed through:

- analytical overviews
- pressure-heavy recaps
- percentage progress dashboards
- endless summaries of pending obligations

If a separate historical view exists at all, it should remain clearly secondary and should serve recall, not self-evaluation.

## Structural Test

The product structure is correct when:

- the main route is obvious
- support layers feel secondary
- reflection feels optional and earned
- the product does not encourage browsing for productivity theater

If a user can spend long periods navigating Eli without moving toward real study, the structure has drifted.
