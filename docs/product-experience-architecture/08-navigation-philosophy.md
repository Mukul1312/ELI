# Navigation Philosophy

The Eli product should use shallow, loop-centered navigation.

The goal of navigation is not to expose a large map of utilities. The goal is to help the student move into and through the primary study loop with minimal friction.

## Navigation Principle

Navigation should answer:

- where am I?
- what matters next?
- how do I continue?

It should not encourage:

- browsing for productivity reassurance
- comparing many parallel destinations
- exploring management utilities before starting

## Preferred Navigation Posture

Eli should prefer:

- one obvious primary route
- a very small number of secondary routes
- embedded continuity that supports return
- minimal top-level destinations

This keeps the product centered on study behavior rather than feature discovery.

## What To Avoid

Avoid a navigation model that feels like:

- Home / Tasks / Progress / Insights / Profile
- a tab-heavy productivity app
- a tool shelf with many equal destinations
- a dashboard-first interface

That structure would make Eli feel like a management product instead of a companion product.

## Navigation Layers

### Primary route
The main route should follow the product loop and remain the dominant path through the product:

- return
- orient
- commit
- work
- close

### Secondary routes
Only a small number of secondary routes are legitimate in V1:

- setup
- preferences and boundaries
- a lightweight history view, if needed for recall

These should feel clearly secondary.

## Route Implications Of Surface Transitions

The canonical transition model in `07-surface-architecture.md` should determine navigation behavior, not the other way around.

- Moving between `Arrival`, `Commitment`, `Active Study`, and `Completion` is in-flow movement inside the main route.
- `Continuity` is an embedded insert around return or close, not a route transition.
- `Reflection` is an earned insert near return or close, not a peer-level route.
- Leaving for setup, preferences, or lightweight history is a temporary departure from the main route and should return the student to the same loop point when possible.
- Re-entry with active work should resolve directly to `Active Study`.
- Re-entry without active work should resolve to `Arrival`.

## Recommended Top-Level IA Posture

In practice, Eli's IA should feel like:

- **one main home or return route** that leads into the loop
- **one in-flow study route** that carries commitment into active work and closure
- **one boundaries route** for setup, preferences, and guardrails
- **one lightweight history route at most**, only if needed to support recall rather than review

It should not feel like a product with many peer-level destinations.

## Leave And Return Behavior

Shallow navigation depends on predictable leave-and-return rules:

- secondary routes should preserve the student's last meaningful loop point
- returning from setup or preferences should resume the main route rather than restart the experience
- returning from lightweight history should support recall, then hand back into `Arrival` or the active loop point
- navigation should not convert interruption into overview browsing by default
- route restoration should reinforce the main loop, not compete with it

## Continuity In Navigation

Per the canonical continuity definition in `04-structural-product-model.md`, continuity is a lightweight embedded surface inside the main route, not a top-level destination or navigation route.

The navigation implication: continuity does not appear as a tab, a peer-level destination, or a navigable section. It appears embedded within the main route, especially around return and closure. If a separate historical view exists, it remains clearly secondary and supports recall, not self-review.

## What Shallow Navigation Looks Like

Shallow navigation in Eli should mean:

- the student can always tell what the current moment is for
- the next meaningful action is visible without browsing
- secondary areas do not compete visually or structurally with the loop
- moving into study feels easier than exploring the product

## Navigation Test

The navigation is correct when:

- the default next action is obvious
- secondary areas feel supportive rather than equally important
- the product remains oriented around the current unit of study
- the student is gently pulled toward real action rather than overview behavior
