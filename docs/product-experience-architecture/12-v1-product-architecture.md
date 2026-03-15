# V1 Product Architecture

This document defines the first-version product form for Eli.

It is not a screen spec. It is the binding architectural decision for what V1 is, what it includes, and what it excludes.

## V1 Product Form

Eli V1 is a calm companion product built around one primary study loop.

That loop is:

- return
- orient
- commit
- work
- close
- reflect when earned

## Main Route

The main route prioritizes:

1. re-entry without pressure
2. a bounded next step
3. protection of actual study
4. grounded completion

This route dominates the experience. It is the product's center of gravity, and the default path the product continuously pulls the student back toward.

## Supporting Routes

V1 includes only these supporting routes:

- setup and preferences
- a lightweight history view for recall (secondary, not a peer-level destination)

These exist only to support the main route.

Per the canonical continuity definition in `04-structural-product-model.md`, continuity is embedded within the main route — not a destination, page, or navigation route. It appears around return and closure.

## V1 Transition Subset

V1 binds the following transition paths as in scope:

- `Arrival -> Commitment`
- `Commitment -> Active Study`
- `Active Study -> Completion`
- `Completion -> Arrival`
- re-entry to `Arrival` when there is no active work to resume
- re-entry to `Active Study` when active work is still in progress
- embedded `Continuity` around return or close when it helps carry context without becoming a route
- sparse `Reflection` inserts near return or close when the brand has earned them

V1 allows these limited alternate paths:

- remain on `Commitment` to narrow or revise the next unit of effort
- leave to setup/preferences or lightweight history and return without redefining the main route
- resume in `Active Study` after interruption rather than forcing a reset to `Arrival`

V1 does **not** include:

- a dedicated continuity route
- a dedicated reflection destination
- heavy branching inside the core loop
- transition logic that turns closure into an analytics review ritual
- interruption patterns that routinely eject the student from active work into overview behavior

## Mirror in V1

`Mirror` exists in V1 as a light reflective layer, not a destination.

V1 includes:

- occasional reflective moments around return or close when earned
- sparse reflective surfaces

V1 excludes:

- a permanent "insights" section
- heavy reflection frequency
- reflection in `Arrival` phase or `Gentle` × `Arrival` combinations
- reflection as a required step before commitment or after every completion

## What V1 Feels Like

If the architecture is correct, V1 feels:

- better to study with than a normal study app
- clearer about what matters right now
- quieter once the student begins
- more believable at completion than typical productivity products
- reflective only when reflection is earned

## What V1 Includes

V1 includes:

- one primary return-to-study route
- the four core loop surfaces: arrival, commitment, active study, completion
- lightweight embedded continuity within the main route
- setup and boundaries support
- a lightweight history view for recall (clearly secondary)
- restrained, occasional `Mirror` moments near return or close when earned
- simple re-entry behavior that resolves to `Arrival` or `Active Study` rather than a dashboard-like overview

## What Is Secondary In V1

These exist as clearly secondary support:

- the history view for recall
- preference and setup areas
- limited reflective carryover outside the main loop

None of these compete with the core route.

## What Is Out Of Scope For V1

V1 excludes:

- analytics-heavy continuity
- parallel feature areas
- a dedicated insights destination
- rich reflection systems before credibility is earned
- expressive personalization beyond state and phase adaptation
- management surfaces that pull attention away from studying
- dashboard-like review surfaces
- rich alternate transition trees inside the main route

## V1 Architecture Decision

V1 is a loop-centered product with a small number of canonical surfaces, shallow navigation, and adaptive behavior driven by state, phase, and `Mirror`.

It is implemented as:

- one dominant main route
- embedded continuity (per `04-structural-product-model.md`)
- two clearly secondary support routes: setup/preferences and lightweight history
- sparse, earned `Mirror` behavior

This is the binding V1 product architecture.
