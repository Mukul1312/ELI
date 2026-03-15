# Information Architecture

This document defines the UX-owned IA contract for V1. It assumes the product architecture has already defined transition semantics, entry resolution, and return paths. The job here is to specify how those resolved states are presented and what the UX layer assumes.

## Source Of Truth For Route Semantics

Canonical transition semantics, entry resolution, and leave/return behavior are owned by:

- `docs/product-experience-architecture/07-surface-architecture.md`
- `docs/product-experience-architecture/08-navigation-philosophy.md`
- `docs/product-experience-architecture/12-v1-product-architecture.md`

This IA doc consumes those decisions. It does not redefine them.

## Navigation Model

Eli V1 uses **no persistent navigation chrome**. No tab bar. No bottom navigation. No hamburger menu. The loop IS the navigation.

The student should feel like they are moving through one clear loop rather than browsing a product map.

## What The UX Layer Assumes

The architecture layer resolves:

- which canonical surface the student should land on (Arrival, Active Study, or Completion)
- whether the student is entering fresh, resuming, or closing
- whether any embedded `Continuity` or earned `Mirror` moment is allowed

At the UX-spec layer, the job is to show how that resolved state is presented, not to redefine the transition contract.

### Entry resolution

- **Cold entry:** App opened with no active work → Architecture resolves to Arrival. UX presents the Arrival Surface.
- **Return with active work:** App reopened or notification tapped with session in progress → Architecture resolves to Active Study. UX presents the Active Study Surface.
- **Return after completion:** Student closed last session and returns → Architecture resolves to Arrival. UX presents the Arrival Surface.
- **Return after interruption without active work:** Student left mid-session or abandoned → Architecture resolves to Arrival. UX presents the Arrival Surface.

### Return paths

- Leaving for setup, preferences, or lightweight history preserves the current loop point. Return resumes the main route rather than restarting.
- Re-entry with active work resolves directly to Active Study. Re-entry without active work resolves to Arrival.

## Primary Route

The primary (and only) route follows the study loop:

```
┌──────────┐     ┌────────────┐     ┌──────────────┐     ┌────────────┐
│ ARRIVAL  │ ──→ │ COMMITMENT │ ──→ │ ACTIVE STUDY │ ──→ │ COMPLETION │
│          │     │            │     │              │     │            │
│ Return + │     │ Topic +    │     │ Quiet focus  │     │ Self-report│
│ Orient   │     │ Frame +    │     │ protection   │     │ + closure  │
│          │     │ Begin      │     │              │     │            │
└──────────┘     └────────────┘     └──────────────┘     └────────────┘
     ↑                                                        │
     └────────────────────────────────────────────────────────┘
                        (loop restarts)
```

## IA-Owned Presentation Consequences

| Architecture decision | UX presentation consequence |
|-----------------------|-----------------------------|
| Continuity is embedded, not a route | Continuity appears as an embedded insert within Arrival or Completion, not as a tab, destination, or navigable section |
| Reflection is earned, not default | Reflection appears as a sparse insert when earned; no dedicated reflection route |
| One main loop | One obvious primary path; no peer-level destinations competing for attention |
| Secondary routes are clearly secondary | Setup, preferences, history (if present) feel secondary and return to the loop point |

## Secondary Access

One minimal secondary affordance exists on the Arrival Surface:

- **Profile area** — accessible via a subtle icon (top corner). Contains only: student name, exam info. Not a full settings page. Not a destination that competes with the loop.
- This is the only element outside the loop in V1.

**Lightweight history:** If V1 includes a history route for recall, it is a clearly secondary route. Its exact form (overlay, sheet, or minimal route) is an open product decision. See `docs/product-experience-architecture/15-open-questions-and-decisions.md`.

## IA Depth

The product is **one level deep**. There are no nested screens, no drill-downs, no expandable sections. Every surface is a full-screen moment in the loop.

| Level | What lives here |
|-------|-----------------|
| L0 (Loop) | Arrival, Commitment, Active Study, Completion |
| L1 (Overlay) | Profile area (minimal, overlay or sheet); lightweight history if present |

## What This IA Rejects

- Tab bars (Home / Study / Progress / Profile)
- Dashboard-first home screens
- Browsable feature sections
- Parallel routes that compete with the loop
- Deep navigation hierarchies
- Settings as a first-class destination
- Continuity or reflection as a destination or route
