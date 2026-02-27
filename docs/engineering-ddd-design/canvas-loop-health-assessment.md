# Bounded Context Canvas — LoopHealthAssessment

> **How to use:** Duplicate this file per bounded context from [03-context-map.md](03-context-map.md). Fill after Context Map and Domain Message Flow. See [../bounded-context.md](../bounded-context.md) for section definitions.

**Subdomain(s):** LoopHealthAssessment  
**Context Map reference:** [03-context-map.md](03-context-map.md)  
**Sources:** [02-subdomains.md](02-subdomains.md), [05-domain-message-flows-storyboards.md](05-domain-message-flows-storyboards.md), [domainService/ds-loop-health.md](domainService/ds-loop-health.md), [tactical/loop-health-assessment-tactical-spec.md](tactical/loop-health-assessment-tactical-spec.md)
**See also (cross-cutting):** [05-cross-cutting-concerns.md](05-cross-cutting-concerns.md) — invariants, event catalog, data ownership, ACLs

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
| PendingChecks | Student-facing term for topics with scheduled verification due |
| AvoidantExit | SessionEnd with no retrieval now and no scheduled retrieval |
| StateTrend7d | Coarse direction (improving/flat/worsening) from energy/pressure/sleep/backlog taps |

### Label conditions (v1 defaults)

Source: EI_Engine_Taxonomy §3

| Label | Protocol | Condition (v1 defaults) |
|-------|----------|-------------------------|
| **LOW_ENERGY** | P1 | energy ≤2, sleepBucket "<6", pressure ≥4, backlogPressure ≥4, or StateTrend7d worsening |
| **HIGH_ENERGY** | P1 | energy ≥4, sleepBucket 7-8 or ≥8, pressure ≤2, backlogPressure ≤3; no SilenceDays ≥2 or OpenLoops ≥3 |
| **STALLED** | P2 | StartLatencyMin ≥15, ≥2 Replans before start, or intent set but no start within ~20 min |
| **FLOWING** | P2 | StartLatencyMin ≤3, no repeated replans; not AVOIDANT |
| **AVOIDANT** | P3 | session ends without retrieval/schedule, VerificationRate7d <0.60, OpenLoops ≥3, or SilenceDays ≥2 |
| **CONFIDENT** | P3 | session with retrieval now or schedule honored; VerificationRate7d ≥0.75; OpenLoops ≤2 |
| **NEUTRAL** | All | Fallback when no label strongly applies; enforce minimal integrity (especially at P3) |

---

## Inbound Communication

| Collaborator | Message type | Message name | Key data | Integration style | Relationship (from context map) |
|--------------|--------------|--------------|----------|-------------------|-----------------------------------|
| EI Runtime | Query | AssessLoopHealth | studentId, gatePhase (P1/P2/P3), signals (or fetched via port) | Sync call | Customer-Supplier |
| Strategic Adjustment | Query | AssessLoopHealth | studentId, signals | Sync call | Customer-Supplier |
| Institute Radar | Query | AssessLoopHealth | studentId, signals | Sync call | Customer-Supplier |
| EI Projections | Query response | R/GetStudentSignals | aggregates, topic state, policy | Sync query (LHA fetches) | Customer-Supplier |

---

## Outbound Communication

| Message type | Message name | Collaborator | Key data | Integration style | Relationship |
|--------------|---------------|--------------|----------|-------------------|--------------|
| Query response | AssessLoopHealth → R/LoopHealthSnapshot | EI Runtime | labels (p1, p2, p3) + key evidence | Sync call | Published Language |
| Query response | LoopHealthSnapshot (labels + aggregated evidence) | Institute Radar | No raw events; privacy-safe | Sync call | Published Language |
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
- LoopHealthSnapshot contract is stable; breaking changes require coordination with Runtime, SA, Radar. When exposed as API or event, use schemaVersion (e.g. v1); version bumps require consumer coordination.

---

## Verification Metrics

- Label assignments match scenario expectations in EI_Scenarios (e.g. S2 lowCapacity, S5 lowEnergy, S7 avoidantRisk).
- Precedence rules correctly override mood-based labels when adherence risk is high.
- Threshold changes are isolated to this context; no propagation to gate code.

---

## Open Questions

- (Resolved: versioning moved to Assumptions — schemaVersion when exposed; coordination on breaking changes.)
