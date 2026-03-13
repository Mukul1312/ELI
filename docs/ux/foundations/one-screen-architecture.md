# The One-Screen Architecture — Three Phases

> The entire student experience lives on a single screen that transforms through three phases. There is no dashboard, no settings page, no navigation menu. One screen, three shapes, zero friction.

---

## Why Not a Separate Dashboard

A dashboard feels obvious. Every ed-tech app ships one. Here is why this product does not.

| Reason | Impact on archetype |
|---|---|
| A dashboard implies navigation away from the session — "check my stats" becomes a procrastination ritual | **S5 (Burnout)** uses it as avoidance; opens dashboard, feels bad, closes app |
| Raw numbers without coaching context add anxiety, not insight | **S2 (Revenge Planner)** sees "4 pending checks" as failure, not progress |
| The data is minimal (5-6 numbers + 1 label) — not worth an entire page | All archetypes — a sparse dashboard feels broken |
| Day 21 outcomes are identity statements ("I follow through"), not chart milestones — a dashboard misses the point | All archetypes — graphs cannot represent identity change |
| Any "check stats" screen competes with "start studying" — it adds a decision before the session even begins | Universal friction — every tap before study is a dropout risk |

**Design decision:** All data the student needs is shown **inline**, inside the phases. The footer (see [08-footer-and-identity.md](../systems/footer-identity.md)) carries the "Your Week" summary. No separate screen required.

---

## The Three Phases

The single screen transforms through three phases within a single app session. Each phase is a distinct layout rendered by the ViewComposer based on the current session state.

```
 ┌─────────────────────────────────────────────────────────────┐
 │                     ONE SCREEN                              │
 │                                                             │
 │   ┌─────────────┐     ┌──────────────┐     ┌────────────┐  │
 │   │  PHASE 1    │     │   PHASE 2    │     │  PHASE 3   │  │
 │   │  THE OPEN   │────>│  THE SESSION │────>│  THE CLOSE │  │
 │   │             │     │              │     │            │  │
 │   │ - Greeting  │     │ - SDUI flow  │     │ - Loop     │  │
 │   │ - Pending   │     │ - IntentSet  │     │   closed   │  │
 │   │ - Action    │     │ - Active     │     │ - Counter  │  │
 │   │   buttons   │     │ - SessionEnd │     │ - Forward  │  │
 │   │ - Footer    │     │ - Proof gate │     │   signal   │  │
 │   └─────────────┘     └──────────────┘     └────────────┘  │
 │         ↑                                       │           │
 │         └───────────────────────────────────────┘           │
 │              student taps "Done" / "Clear one more"         │
 └─────────────────────────────────────────────────────────────┘
```

### Phase transitions

| Transition | Trigger | What happens |
|---|---|---|
| **Phase 1 --> Phase 2** | Student taps an action button (fires `IntentSet` or topic select) | Screen morphs into session SDUI flow; Phase 1 UI collapses |
| **Phase 2 --> Phase 3** | `SessionEnd` fires; P3 gate runs | Session SDUI clears; Phase 3 card renders with loop-closed state + counter |
| **Phase 3 --> Phase 1** | Student taps "Done" or "Clear one more" | Page refreshes `AppOpen` data; Phase 1 re-renders with updated aggregates |

**Key constraint:** The URL/route never changes. There is no navigation event. The ViewComposer swaps layout components in place.

---

## State-Adaptive UI

The number of UI elements shown is a function of the student's current state. This is emotionally responsive design. A student in burnout re-entry sees one button and three words. A student with high energy and pending checks sees a full card with a deal offer and a list.

The P1 gate mode (Rescue / Neutral / Boost) directly drives UI complexity. The ViewComposer owns this mapping.

### Student state x EI mode --> UI complexity

| Student state | EI mode | UI complexity | Primary CTA | Button count | Notes |
|---|---|---|---|---|---|
| Burnout / silence re-entry (S5) | Rescue | Minimal, sparse | "5-minute win" | 1 | Less UI = less overwhelm |
| High pressure (S2 Day 1) | Rescue | Reduced, brief copy | "Start 2 minutes, then decide" | 2 | Scope negotiation only |
| Low energy, stable | Rescue | Reduced | "Short session" / "Just 1 check" | 2 | Protect rest |
| Normal / steady | Neutral | Standard coaching card | Normal IntentSet flow | 2-3 | Conversational |
| High energy, pending checks | Neutral | Full, with deal card | "Clear 1 first, then go big" | 2 + pending list | S7 pattern |
| High energy, no pending | Boost | Full, with challenge | "Let's raise the bar" | 2-3 | Allow Hard/Advanced |
| Day 14+, personalization earned | Any | Adds micro-hint row | (same as state CTA) | (same) | One hint only |

**Rule:** The ViewComposer reads `eiMode` from the P1 gate output and selects the layout variant. Rescue = fewest elements. Boost = most elements. Neutral = standard. Personalization hints are additive — they do not change the layout variant, only append a row.

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| **App killed mid-session** | On next `AppOpen`, Phase 1 shows with a stale-session indicator ("You had a session in progress"). No data loss — events were already persisted at each step boundary. |
| **Returning to stale state** | If aggregates are >1 hour old, `AppOpen` triggers a background recompute before rendering Phase 1. The student sees a brief loading state, then fresh data. |
| **Offline re-entry** | Phase 1 shows a minimal loading state (greeting only, no data cards). Once the POST response arrives, the full Phase 1 renders. No error screen — partial UI is better than a spinner. |
| **Multiple opens same day** | Second `AppOpen` of the day skips the Sleep question (already answered). Energy is re-asked — it changes within a day. All other Phase 1 data refreshes normally. |
| **Session completed but app not closed** | Phase 3 remains visible until the student taps "Done" or "Clear one more". No timeout. The screen does not auto-advance. |

---

## What Each Phase References

| Phase | Detailed spec | Key connection |
|---|---|---|
| Phase 1: The Open | [05-phase1-the-open.md](../phase1/00-overview.md) | Craving loop: Recognition + Micro-win beats |
| Phase 2: The Session | [06-phase2-the-session.md](../phase2/00-overview.md) | Existing SDUI flow |
| Phase 3: The Close | [07-phase3-the-close.md](../phase3/00-overview.md) | Craving loop: Closure + Seed beats |
| Footer (all phases) | [08-footer-and-identity.md](../systems/footer-identity.md) | P1 dashboard requirement |

---

*Next: [05-phase1-the-open.md](../phase1/00-overview.md) — deep spec for the most important screen.*
