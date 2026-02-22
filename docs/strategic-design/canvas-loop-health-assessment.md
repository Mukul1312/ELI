# Bounded Context Canvas — LoopHealthAssessment

> **How to use:** Duplicate this file per bounded context from [03-context-map.md](03-context-map.md). Fill after Context Map and Domain Message Flow. See [../bounded-context.md](../bounded-context.md) for section definitions.

**Subdomain(s):** LoopHealthAssessment  
**Context Map reference:** [03-context-map.md](03-context-map.md)  
**Sources:** [02-subdomains.md](02-subdomains.md), [05-domain-message-flows-storyboards.md](05-domain-message-flows-storyboards.md)

---

## Name

LoopHealthAssessment

---

## Purpose

Assess loop health and produce a LoopHealthSnapshot (labels + key evidence numbers) for downstream consumers. Single place for "what is healthy"—own thresholds, precedence rules, and label semantics so that EI Runtime, Strategic Adjustment, and Institute Radar all rely on the same interpretation. Key actors: EI Runtime (primary), Strategic Adjustment, Institute Radar.

---

## Strategic Classification

| Dimension | Choice | Notes |
|-----------|--------|-------|
| **Domain** | core | Labels and precedence are EI's differentiation; not commodity |
| **Business model role** | engagement | Enables correct Rescue/Boost routing and adjustment-mode choice |
| **Evolution** | custom built | EI-specific thresholds and label definitions |

---

## Domain Roles

- **Analysis context:** Interpretation and labeling (metrics → labels); precedence rules
- **Gateway context:** LoopHealthSnapshot contract as single output for all consumers

---

## Ubiquitous Language (in this context)

| Term | Definition (in this context) |
|------|------------------------------|
| LoopHealthSnapshot | Contract: labels (p1, p2, p3) + key evidence numbers; consumed by Runtime, SA, Radar |
| OpenLoops | Count of topics with effort but no retrieval (or missed schedules) |
| VerificationRate7d | 7-day rolling rate of verification compliance |
| LoopLatency | Per-topic latency from effort to retrieval |
| SilenceDays | Consecutive days without app/session activity |
| StateTrend | Trend in energy/state over recent period |
| AVOIDANT | P3 label: verification avoidance; low rate, high openLoops |
| CONFIDENT | P3 label: verification integrity; high rate, bounded openLoops |
| LOW_ENERGY | P1 label: low capacity (energy, anxiety, backlog pressure) |
| HIGH_ENERGY | P1 label: high capacity; may still be overridden by risk |
| STALLED | P2 label: high start latency, replans |
| FLOWING | P2 label: fast starts, no replans |
| Precedence rules | Risk overrides ambition; e.g. AVOIDANT overrides CONFIDENT, openLoops≥3 overrides HIGH_ENERGY |

---

## Inbound Communication

| Collaborator | Message type | Message name | Key data | Integration style | Relationship (from context map) |
|--------------|--------------|--------------|----------|-------------------|-----------------------------------|
| EI Projections | Query | GetStudentSignals (or equivalent) | openLoops, verificationRate7d, silenceDays, startLatencyMinMedian7d, policy dials, topic state | Sync query | Customer-Supplier |

---

## Outbound Communication

| Message type | Message name | Collaborator | Key data | Integration style | Relationship |
|--------------|---------------|--------------|----------|-------------------|--------------|
| Query response | AssessLoopHealth → R/LoopHealthSnapshot | EI Runtime | labels (p1, p2, p3) + key evidence | Sync call | Published Language |
| Query response | LoopHealthSnapshot (labels + aggregated evidence) | Institute Radar | No raw events; privacy-safe | Sync / feed | Published Language |
| Query response | LoopHealthSnapshot (labels + key evidence) | Strategic Adjustment | Same contract as LHA→Runtime | Sync call | Published Language |

---

## Business Decisions

- **Risk overrides ambition:** High energy by mood does not permit Boost when openLoops≥3 or scheduleMisses elevated; precedence rules apply.
- **Thresholds and labels owned here:** Changing thresholds does not require changing EI Runtime gate code; only snapshot contract if it changes.
- **Single contract for consumers:** LoopHealthSnapshot is the versioned Published Language; all consumers get same shape.
- **No raw events to Radar:** Radar receives only labels and aggregated evidence; privacy boundary enforced.

---

## Assumptions

- Numeric evidence from Projections is sufficient for label computation; no need for raw events.
- Threshold tuning cadence is independent of gate logic; we can iterate thresholds without Runtime changes.
- LoopHealthSnapshot contract is stable; breaking changes require coordination with Runtime, SA, Radar.

---

## Verification Metrics

- Label assignments match scenario expectations in EI_Scenarios (e.g. S2 lowCapacity, S5 lowEnergy, S7 avoidantRisk).
- Precedence rules correctly override mood-based labels when adherence risk is high.
- Threshold changes are isolated to this context; no propagation to gate code.

---

## Open Questions

- Formal versioning of LoopHealthSnapshot if exposed as API or event.
