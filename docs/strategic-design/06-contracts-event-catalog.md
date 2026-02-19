# Event Catalog & Contracts

> **How to fill:** For each event type, document: required fields, producer, consumer(s), projection side-effects. Add an **Integration events** subsection for published, versioned schemas consumed by external or cross-context systems (e.g. Radar, Institute).
>
> **Checklist item #6:** Define integration event schemas.
>
> **Code reference:** [src/ei/schemas/events.ts](../../src/ei/schemas/events.ts), [src/ei/schemas/outputs.ts](../../src/ei/schemas/outputs.ts)

---

## Internal event catalog

| Event type | Required fields | Producer | Consumer(s) | Projection side-effects |
|------------|-----------------|----------|-------------|--------------------------|
| AppOpen | studentId, energy, openedAt | UI | P1, Ledger | — |
| IntentSet | studentId, topic, setAt | UI | P2, Ledger | — |
| SessionEnd | studentId, topic, endedAt | UI | P3, Ledger | ei_topic_state.last_effort_at |
| NegotiatedIntentIssued | studentId, mode, topic, scope, verificationPlan, issuedAt | P1 | Ledger, P3 (cross-protocol floor) | — |
| ActivationPlanIssued | studentId, mode, firstAction, issuedAt | P2 | Ledger, P3 (watch-only flag) | — |
| VerificationDecisionIssued | studentId, mode, topic, verificationDecision, issuedAt | P3 | Ledger | — |
| IntentResponse | studentId, negotiatedIntentId, decision, respondedAt | UI | Ledger | — |
| FirstActionStarted | studentId, topic, startedAt | UI | Ledger | — |
| Replan | studentId, topic, replannedAt | UI | Ledger | — |
| RetrievalVerified | studentId, topic, verifiedAt | UI | Ledger | ei_topic_state.last_retrieval_at |
| RetrievalScheduled | studentId, topic, dueAt, scheduledAt | UI | Ledger | ei_topic_state.last_scheduled_due_at |
| RetrievalSkipped | studentId, topic, reason, skippedAt | UI | Ledger | — |
| VerificationCompleted | studentId, topic, completedAt, result | UI | Ledger | ei_topic_state.last_retrieval_at |
| ScheduleMissed | studentId, topic, missedAt | System/Projection | Ledger | — |
| StrategicAdjustmentDecision | studentId, adjustmentMode, dials, issuedAt | SA | Ledger | ei_student_policy |

---

## Integration event schemas

> **Purpose:** Published, versioned schemas for cross-context or external consumers. EI never exposes raw event payloads externally.

### Radar alert (Institute-facing)

Schema for alerts consumed by Institute dashboard. Privacy-safe: no raw events, no PII.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://api.ei.example.com/events/radar/alert/v1.json",
  "title": "RadarAlert",
  "description": "Privacy-safe risk alert for institute dashboard",
  "type": "object",
  "required": ["studentId", "batchId", "alertType", "severity", "evidenceSummary", "recommendedAction"],
  "properties": {
    "studentId": { "type": "string", "format": "uuid" },
    "batchId": { "type": "string" },
    "alertType": { "enum": ["Silence", "IntegrityDebt", "VerificationDrop", "BurnoutRunway", "SubjectAvoidance"] },
    "severity": { "enum": ["low", "medium", "high", "critical"] },
    "evidenceSummary": {
      "type": "object",
      "additionalProperties": true,
      "description": "Aggregated metrics only; no raw event content"
    },
    "recommendedAction": { "type": "string" },
    "lastUpdatedAt": { "type": "string", "format": "date-time" }
  }
}
```

<!-- Fill: Add other integration events (e.g. cohort enrollment, coupon redemption) as needed. -->
