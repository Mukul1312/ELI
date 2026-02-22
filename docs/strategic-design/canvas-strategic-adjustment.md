# Bounded Context Canvas — Strategic Adjustment

> **How to use:** Duplicate this file per bounded context from [03-context-map.md](03-context-map.md). Fill after Context Map and Domain Message Flow. See [../bounded-context.md](../bounded-context.md) for section definitions.

**Subdomain(s):** StrategicAdjustment  
**Context Map reference:** [03-context-map.md](03-context-map.md)  
**Sources:** [02-subdomains.md](02-subdomains.md), [05-domain-message-flows-storyboards.md](05-domain-message-flows-storyboards.md)
**See also (cross-cutting):** [05-cross-cutting-concerns.md](05-cross-cutting-concerns.md) — invariants, event catalog, data ownership, ACLs

---

## Name

Strategic Adjustment

---

## Purpose

Next-cycle synthesis engine that emits a StrategicAdjustmentDecision (guardrails + dials), triggered weekly by default or by risk spike. Policy semantics define horizon-level dials and constraints that feed Runtime via Projections; wrong SA affects a week, wrong gate play affects a session.

---

## Strategic Classification

| Dimension               | Choice       | Notes                                                              |
| ----------------------- | ------------ | ------------------------------------------------------------------ |
| **Domain**              | core         | Next-cycle policy is EI's differentiation; horizon-level decisions |
| **Business model role** | engagement   | Policy tuning drives sustained student progress                    |
| **Evolution**           | custom built | EI-specific policy semantics; no off-the-shelf equivalent         |

---

## Domain Roles

- **Analysis context:** Policy semantics from accumulated evidence (aggregates, topic state, labels); mode choice (Recovery, TechniquePivot, IntegrityClamp, etc.)
- **Gateway context:** StrategicAdjustmentDecision contract; appends StrategicAdjustmentDecision to Ledger; Projections consume and persist policy

---

## Ubiquitous Language (in this context)

| Term                      | Definition (in this context)                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| StrategicAdjustmentDecision | Output: guardrails + dials + constraints; appended to Ledger; Projections consume and persist policy                                                       |
| AdjustmentMode            | Recovery, TechniquePivot, IntegrityClamp, DifficultyRaise, CloseLoopsFirst                                                                                   |
| dials                     | scopeMultiplier, difficultyTierDelta, minQuestionsDefault, scheduleAllowed, dueInHoursDefault                                                                |
| constraints               | maxOpenLoops, noNewTopicUntil, closeOldestOpenLoopFirst                                                                                                     |
| review boundary           | Weekly cycle by default; evidence accumulated over this horizon drives mode choice                                                                        |
| risk-triggered             | Adjustment can fire on risk spike (e.g. silence, integrity debt) in addition to scheduled run                                                             |
| TightnessLevel             | Policy strictness tier; affects how dials/constraints apply                                                                                                 |

---

## Inbound Communication

| Collaborator         | Message type   | Message name                              | Key data                                                                 | Integration style | Relationship (from context map) |
| -------------------- | -------------- | ----------------------------------------- | ------------------------------------------------------------------------ | ----------------- | ------------------------------- |
| EI Projections       | Query response | GetStudentSignals / R/Signals              | aggregates, topic state, policy (openLoops, verificationRate7d, etc.)    | Sync query        | Customer-Supplier               |
| LoopHealthAssessment | Query response | AssessLoopHealth → R/LoopHealthSnapshot    | labels (p1, p2, p3) + key evidence                                       | Sync call         | Published Language              |

---

## Outbound Communication

| Message type | Message name                | Collaborator      | Key data                                               | Integration style | Relationship      |
| ------------ | --------------------------- | ----------------- | ------------------------------------------------------ | ----------------- | ----------------- |
| Event        | StrategicAdjustmentDecision | EI Event Ledger   | dials, constraints, adjustmentMode, tightnessLevel, issuedAt | Sync append       | Customer-Supplier |

Projections consume from Ledger and persist to ei_student_policy per Event Catalog.

---

## Business Decisions

- **Policy semantics owned here:** SA defines what each dial and constraint means; Projections own policy storage.
- **Horizon vs gate:** Wrong SA affects a week; wrong gate play affects a session. SA is not a task planner.
- **Scheduled + risk-triggered:** Runs weekly by default; can fire on risk spike (silence, integrity debt).
- **Interpretation boundary:** SA consumes labels from LoopHealthAssessment; does not re-derive thresholds.

---

## Assumptions

- LoopHealthSnapshot contract is stable; threshold tuning stays in LoopHealthAssessment.
- Projections persist policy atomically; Runtime reads policy via Projections when querying signals.
- Review boundary (weekly) aligns with product expectations for policy cadence.

---

## Verification Metrics

- Policy write path from SA to Projections is correct; Runtime receives constraints at gate time.
- Adjustment-mode choice matches scenario expectations (e.g. S7 close-loops-first).
- Risk-triggered runs fire when thresholds are met without over-triggering.

---

## Open Questions

- Exact risk-trigger conditions and threshold tuning for early SA runs.
- Versioning of StrategicAdjustmentDecision schema if consumers (Radar, ops) evolve.
