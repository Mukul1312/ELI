# Implementation Map — SDUI Components and Data Sources

This document translates the student experience system into implementation constraints for engineers. It maps UX requirements to SDUI component types, data sources, ViewComposer rules, and code paths. References `EI_Engine_Taxonomy.md` for gate output shapes -- that document is the engineering contract and is NOT modified by this folder.

---

## 1. P0/P1 Requirements to UX Solution Mapping

| Launch requirement | UX solution | Data source | Component |
|---|---|---|---|
| P0: Resume state on app open | Phase 1 contextual greeting | `ei_student_aggregates` + `ei_topic_state` | `resume-context-card` |
| P0: Pending checks count | Phase 1 pending items list | `ei_student_aggregates.pending_checks` | `pending-items-list` |
| P0: Next due verification | Phase 1 pending list ordered by due date | `ei_topic_state.last_scheduled_due_at` | `pending-items-list` |
| P0: Last intent topic | Phase 1 greeting copy | Last `IntentSet` event from `ei_events` | `resume-context-card` |
| P0: "Continue" affordance | Tappable items in pending list | `ei_topic_state` rows | `pending-items-list` |
| P1: Pending checks trend | Footer counter | `pending_checks` | `session-summary-footer` |
| P1: Verification rate | Footer expanded rate | `verification_rate_7d` | `session-summary-footer` |
| P1: Next due check | Phase 1 pending list | `last_scheduled_due_at` | `pending-items-list` |
| P1: Week pattern | Footer label | `state_trend_7d` | `session-summary-footer` |

---

## 2. New SDUI Component Types

| Component type | Used in | Key props | Notes |
|---|---|---|---|
| `resume-context-card` | Phase 1 | `greeting: string`, `pendingItems: PendingItem[]`, `primaryCta: Action`, `secondaryCta?: Action` | Replaces current welcome-back-card; mode-driven layout |
| `pending-items-list` | Phase 1 | `items: {topicId, topicName, daysAgo, actionId}[]` | Max 5 items; hidden in Rescue mode |
| `loop-closed-card` | Phase 3 | `topicName: string`, `countBefore: number`, `countAfter: number`, `message: string`, `seed?: string`, `clearMoreActionId?: string` | Counter animation 3->2; `clearMore` only if `energy >= 4` |
| `session-summary-footer` | Phase 1 + 3 | `collapsedLabel: string`, `sessions: number`, `loopsClosed: number`, `pending: number`, `rate: number`, `trend: string`, `identityStatement?: string` | Always collapsed by default |
| `identity-moment-card` | Phase 1 (weekly) | `statement: string`, `detail: string`, `ctaLabel: string` | Replaces `resume-context-card` when eligible |
| `session-context-bar` | Phase 2 | `topic: string`, `taskType: string`, `scope: string` | Fixed top bar during session; shows time commitment (e.g., `~20 min`), not DifficultyTier (removed from UI per [05-phase1-the-open.md](05-phase1-the-open.md)) |

---

## 3. ViewComposer Integration Rules

### Phase 1 (The Open)

ViewComposer reads `mode` from `NegotiatedIntentIssued` and selects the component tree complexity:

| Mode | Tree complexity | Components rendered |
|---|---|---|
| Rescue | Sparse (1 button, no pending list) | `resume-context-card` with single CTA only |
| Neutral | Standard | `resume-context-card` + `pending-items-list` + `session-summary-footer` |
| Boost | Full | `resume-context-card` (challenge variant) + `pending-items-list` + `session-summary-footer` |

### Phase 3 (The Close)

ViewComposer reads `verificationDecision` from `VerificationDecisionIssued` and selects the closing card variant:

| Decision | Card variant | Notes |
|---|---|---|
| Completed | `loop-closed-card` with counter animation | `clearMore` button shown only if `energy >= 4` |
| Reminded | `resume-context-card` (reminder-set variant) | Confirmation copy: "Got it. Tomorrow." |
| Skipped | `resume-context-card` (skip-acknowledged variant) | No judgment. Reason logged silently. |

### Footer Data

Footer data is included in the AppOpen SDUI response payload as a `sessionSummary` field. There is no separate GET endpoint for footer content. The client reads `sessionSummary` from the response and renders the footer persistently.

### Identity Moment

ViewComposer checks `weeklyIdentityCardEligible` (computed from aggregates). If `true`, it outputs `identity-moment-card` instead of `resume-context-card`. Eligibility logic is defined in [08-footer-and-identity.md](./08-footer-and-identity.md) Part 2 (Trigger Conditions).

---

## 4. Engineering Constraints

| Constraint | Detail |
|---|---|
| No new routes | Everything flows through existing SDUI `POST /api/ei/command` |
| No new pages | `page.tsx` is the only student-facing page |
| No `GET /api/ei/summary` | Footer data included in AppOpen response |
| No `GET /api/ei/dashboard` | Dashboard is the footer; no separate endpoint |
| Footer rendered client-side | `page.tsx` reads `sessionSummary` from AppOpen response and renders footer persistently |
| Identity check server-side | ViewComposer determines eligibility; client just renders what it receives |
| No client-side routing | Single page. Phase transitions are SDUI payload swaps, not route changes. |
| Mode logic stays in engine | ViewComposer does NOT compute mode. It reads mode from gate output. |

---

## 5. Code Pointers

Reference existing implementation paths for each concern:

| Concern | Path | Role |
|---|---|---|
| ViewComposer | `src/ei/sdui/` | Pure presenter; maps protocol VO outputs to `SduiResponse` |
| P1 gate | `src/ei/application/run-p1-gate/` | Computes Phase 1 output (mode, greeting, actions) |
| P2 gate | `src/ei/application/run-p2-gate/` | Computes Phase 2 output (session config, difficulty) |
| P3 gate | `src/ei/application/run-p3-gate/` | Computes Phase 3 output (verification decision, closing card) |
| Student aggregates | `src/ei/domain/student-aggregates/` + `src/ei/application/recompute-student-aggregates/` | Derived signals: `pending_checks`, `verification_rate_7d`, `state_trend_7d` |
| Topic state | `src/ei/db/queries.ts` (`getAllTopicStates`) | Per-topic state: `last_scheduled_due_at`, verification status |
| Events | `src/ei/db/queries.ts` (`queryEvents`) | Raw event log: `IntentSet`, `SessionEnd`, `VerificationCompleted` |
| SDUI types | `src/ei/sdui/types/` | TypeScript interfaces for all SDUI component props |
| SDUI renderer | `src/app/sdui/renderer.tsx` | Client-side component that maps SDUI payloads to React |
| Main page | `src/app/page.tsx` | Single student-facing page; renders SDUI + footer |

### Key Reference

`EI_Engine_Taxonomy.md` Section 5 defines gate output shapes (the VO types that ViewComposer consumes). Section 3 defines derived labels used for mode routing. Those sections are the authoritative contract between engine and UX -- this document translates that contract into component-level implementation guidance.

---

## 6. Data Flow Summary

```
AppOpen request
  -> POST /api/ei/command { command: "AppOpen" }
  -> P1 gate runs
     -> reads ei_student_aggregates (pending, rate, trend, silence)
     -> reads ei_topic_state (pending topics, due dates)
     -> reads ei_events (last intent)
     -> computes mode (Rescue / Neutral / Boost)
     -> emits NegotiatedIntentIssued VO
  -> ViewComposer
     -> reads mode from VO
     -> selects component tree (sparse / standard / full)
     -> checks weeklyIdentityCardEligible
     -> builds SduiResponse with:
        - Phase 1 components (resume-context-card, pending-items-list)
        - sessionSummary (footer data)
        - identity-moment-card (if eligible, replaces resume-context-card)
  -> Client renders single page with SDUI payload + persistent footer
```

---

Cross-references:
- UX requirements: [05-phase1-the-open.md](./05-phase1-the-open.md), [07-phase3-the-close.md](./07-phase3-the-close.md)
- Footer spec: [08-footer-and-identity.md](./08-footer-and-identity.md)
- Identity moment eligibility: [08-footer-and-identity.md](./08-footer-and-identity.md) Part 2
- Anti-patterns (what NOT to build): [12-anti-patterns.md](./12-anti-patterns.md)
- Archetype map (which variant per student): [11-archetype-experience-map.md](./11-archetype-experience-map.md)
- Engine contract: [`EI_Engine_Taxonomy.md`](../../EI_Engine_Taxonomy.md) Sections 3 and 5
