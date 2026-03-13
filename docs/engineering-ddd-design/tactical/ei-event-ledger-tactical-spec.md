# EI Event Ledger — Tactical DDD Spec

> Docs-only specification for implementing EI Event Ledger as an append-only Domain Event store. Source: [canvas-ei-event-ledger.md](../canvas-ei-event-ledger.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md), [src/ei/schemas/events.ts](../../src/ei/schemas/events.ts), [src/ei/db/queries.ts](../../src/ei/db/queries.ts).

---

## 1) Purpose and Boundary

- **Primary building block:** Domain Events (stored, not raised here) + Value Objects + Ports. No Aggregate.
- **Scope:** Append-only persistence of domain events; schema validation; idempotency enforcement; timeline query by student.
- **Responsibility:** Schema ownership for all EventTypeEnum members; idempotency guarantee; behavioral timeline read model.
- **Non-goals (outside EI Event Ledger):**
  - Computing derived state (openLoops, verificationRate7d, etc.) — EI Projections
  - Interpreting metrics into labels/snapshots — LoopHealthAssessment
  - Protocol semantics for events (what a SessionIntentIssued *means*, which intentSource applies) — EI Runtime / Strategic Adjustment

---

## 2) Ubiquitous Language (Tactical Terms)


| Term | Definition |
| ---- | ---------- |
| `DomainEvent` | **Domain Event (stored, not raised here):** immutable record of a significant EI occurrence — type, student context, schema-validated payload, occurred_at. Produced by Runtime or SA; schema-owned by Ledger; stored (not raised) by Ledger. All EventTypeEnum members qualify. |
| `EventType` | **Enum Value Object:** `AppOpen \| IntentSet \| SessionEnd \| SessionIntentIssued \| ActivationPlanIssued \| IntentResponse \| FirstActionStarted \| Replan \| VerificationDecisionIssued \| RetrievalVerified \| RetrievalScheduled \| RetrievalSkipped \| VerificationCompleted \| StrategicAdjustmentDecision \| ScheduleMissed` — immutable string union, equality by value. (`SessionIntentIssued` replaces the former `NegotiatedIntentIssued`; carries `intentSource: 'negotiated' \| 'declared'` discriminator.) |
| `EventPayload<T>` | **Structural Value Object (per-type):** Zod-validated JSONB data for one EventType; shape varies per type (`AppOpenPayload`, `IntentSetPayload`, etc.). Immutable by convention, equality by all fields. |
| `IdempotencyKey` | **Value Object:** non-empty string uniquely identifying one logical append attempt. Recommended format: `{context}:{eventType}:{studentId}:{timestamp}`. Equality by string value. Prevents duplicate events on retry. |
| `OccurredAt` | **Value type:** ISO 8601 datetime string set by the producer (Runtime/SA) at the time the event occurred. Distinct from `created_at` (storage timestamp). |
| `EventRecord` | **Structural Value Object:** query output shape — `{ id, studentId, eventType, payload, occurredAt, topicId? }`. Immutable by convention, no lifecycle. |
| `BehavioralTimeline` | **Read Model:** ordered `EventRecord[]` per student from QueryEventsByStudent. Not a persistent entity — derived on query. Consumed by Projections (batch recompute) and Ops (debug timeline). |


> **Building block note:** Domain Events are stored (not raised) here — Ledger schema-owns them; Runtime/SA own their business semantics. No Aggregate exists: the append-only invariant replaces the consistency boundary that aggregates normally enforce. Value Objects (`EventType`, `IdempotencyKey`, `EventPayload<T>`, `EventRecord`) capture schema and idempotency semantics. None extend `ValueObject<Props>` from `domain/shared/value-object.ts`; this is intentional for a thin persistence module. Code: [`src/ei/schemas/events.ts`](../../src/ei/schemas/events.ts), [`src/ei/db/queries.ts`](../../src/ei/db/queries.ts).

---

## 3) Input/Output Contract

### InsertEvent

**Input:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| studentId | string | Yes | Student identifier |
| eventType | EventType (Enum VO) | Yes | One of EventTypeEnum values |
| payload | EventPayload\<T\> | Yes | Zod-validated per eventType |
| occurredAt | OccurredAt (ISO 8601) | Yes | When the event occurred (set by producer) |
| idempotencyKey | IdempotencyKey | No | If provided, duplicate key returns existing event without new insert |
| topicId | string | No | Topic identifier for topic-scoped events |

**Output:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| eventId | string (UUID) | The stored event's identifier |
| duplicate | boolean | True if idempotencyKey matched an existing record |

### QueryEventsByStudent

**Input:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| studentId | string | Yes | Student identifier |
| eventTypes | EventType[] | No | Filter to specific event types |
| topicId | string | No | Filter to specific topic |
| since | OccurredAt | No | Lower bound (inclusive) for occurred_at |
| until | OccurredAt | No | Upper bound (inclusive) for occurred_at |
| limit | number | No | Max records to return |

**Output:** `EventRecord[]` — ordered by occurred_at ASC. Empty array if no matching events.

---

## 4) Invariants (Must Hold Per Invocation)

Per [05-cross-cutting-concerns.md#invariants](../05-cross-cutting-concerns.md):

1. **Immutability:** No updates or deletes on `ei_events`. Once appended, an event record is permanent.
2. **Idempotency:** Duplicate `insertEvent` calls with the same `idempotencyKey` return the existing `eventId` without inserting a new row. Checked via `ei_idempotency_keys` table.
3. **Schema strictness:** Every `payload` must pass Zod validation for its `eventType` before append. Unknown keys rejected.
4. **Append-only growth:** The behavioral timeline can only grow. Projections can safely recompute from the log at any point in time.

---

## 5) Domain Logic (Code Pointers)


| Operation | Location | Responsibility |
| --------- | -------- | -------------- |
| EventTypeEnum + payload schemas | [`src/ei/schemas/events.ts`](../../src/ei/schemas/events.ts) | Canonical schema ownership; Zod validators per event type |
| `insertEvent` (idempotent append) | [`src/ei/db/queries.ts`](../../src/ei/db/queries.ts) | Idempotency check → insert → return eventId + duplicate flag |
| `queryEvents` (timeline read) | [`src/ei/db/queries.ts`](../../src/ei/db/queries.ts) | Filter by studentId, eventTypes, topicId, since/until, limit |
| Table definitions | [`src/ei/db/migrate.ts`](../../src/ei/db/migrate.ts) | `ei_events` (append-only log), `ei_idempotency_keys` (dedup table) |


### Value Objects and Data Shapes

All types are immutable; `EventRecord` equality is by all fields; Enum VOs equality is by string value.

| Name | Kind | Immutable | Equality rule | Code pointer |
| ---- | ---- | --------- | ------------- | ------------ |
| `EventType` | Enum VO | Yes — string union | By string value | `schemas/events.ts` (EventTypeEnum) |
| `IdempotencyKey` | Structural VO | By convention | By string value | `db/queries.ts` (insertEvent param) |
| `OccurredAt` | Value type | By convention | By string value | `schemas/events.ts` (shared) |
| `EventPayload<T>` | Structural VO (per-type) | By convention | All fields equal | `schemas/events.ts` (per-type Zod schemas) |
| `EventRecord` | Structural VO | By convention | All fields equal | `db/queries.ts` (queryEvents return type) |
| `BehavioralTimeline` | Read Model (`EventRecord[]`) | By convention | — | `db/queries.ts` (queryEvents) |

**No Aggregate.** The append-only invariant + idempotency key replace the consistency semantics that aggregates normally enforce.

---

## 6) Ports (Interfaces — Docs Level)


| Port | Role | Responsibility |
| ---- | ---- | -------------- |
| **InsertEventPort** | Driven | Idempotent append of a domain event to the behavioral timeline. Returns eventId + duplicate flag. |
| **QueryEventsByStudentPort** | Driven | Fetch ordered EventRecord[] for a student; supports filters (eventTypes, topicId, since/until, limit). Consumed by Projections (batch recompute) and Ops (debug). |


Current implementation: `insertEvent` and `queryEvents` in [`src/ei/db/queries.ts`](../../src/ei/db/queries.ts) serve as the infrastructure adapter. No formal port interface file exists yet; these functions are the implementation.

---

## 7) Application Use-Case Contract

**InsertEvent** (no formal handler file; implemented in `db/queries.ts`):

| Aspect | Specification |
| ------ | ------------- |
| **Input** | studentId, eventType, payload, occurredAt; optional: idempotencyKey, topicId |
| **Output** | `{ eventId, duplicate }` |
| **Errors** | Invalid eventType; payload fails Zod schema for eventType |
| **Preconditions** | `studentId` non-empty; `occurredAt` is valid ISO 8601 |
| **Idempotency** | If `idempotencyKey` provided and already in `ei_idempotency_keys`, return existing `eventId` without insert (no error) |


**QueryEventsByStudent** (implemented in `db/queries.ts`):

| Aspect | Specification |
| ------ | ------------- |
| **Input** | studentId; optional filters: eventTypes[], topicId, since, until, limit |
| **Output** | `EventRecord[]` ordered by occurred_at ASC; empty array if none |
| **Errors** | Invalid studentId; invalid date format for since/until |
| **Idempotency** | Safe to call repeatedly; read-only, no side effects |

---

## 8) Test Strategy (Spec Tests)


| Scenario | Input | Expected outcome |
| -------- | ----- | ---------------- |
| Idempotent insert (key provided) | Same `idempotencyKey` twice | Second call: `duplicate: true`, same `eventId`, no new `ei_events` row |
| Idempotent insert (no key) | Two inserts without `idempotencyKey` | Two separate rows created |
| Schema validation — valid | `AppOpen` payload with valid energy field | Insert succeeds |
| Schema validation — invalid | `AppOpen` payload missing required field | Reject with schema error before insert |
| Immutability | Attempt to update/delete `ei_events` row | Not permitted (port contract; no update path exists) |
| Timeline query | Multiple events for student | Returns EventRecord[] ordered by occurred_at ASC |
| Timeline query with filter | `eventTypes: [SessionEnd]` | Returns only SessionEnd events |
| Append-only growth | Multiple inserts then query | All events present; timeline count grows monotonically |


---

## 9) Open Questions and Deferred Decisions

- Formal port interface file (e.g. `src/ei/application/insert-event/port.ts`) when the hexagonal layer boundary needs to be enforced explicitly.
- Event retention / archival policy for long-term compliance (noted in canvas Open Questions).
- `schemaVersion` field on event payloads for schema evolution strategy.

---

## References

- [canvas-ei-event-ledger.md](../canvas-ei-event-ledger.md)
- [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md) — invariants (immutability, idempotency, schema strictness), event catalog
- [02-subdomains.md](../02-subdomains.md) §4 — Event Ledger subdomain definition
- [03-context-map.md](../03-context-map.md) — Runtime → Ledger (Customer-Supplier), Ledger → Projections (Conformist), Ledger → Ops (read-only)
- [05-domain-message-flows-storyboards.md](../05-domain-message-flows-storyboards.md) — S2/S5/S7 DMFs showing Ledger append flow
- [`src/ei/schemas/events.ts`](../../src/ei/schemas/events.ts) — EventTypeEnum + Zod payload schemas (canonical schema ownership)
- [`src/ei/db/queries.ts`](../../src/ei/db/queries.ts) — `insertEvent` (idempotent append), `queryEvents` (timeline read)
- [`src/ei/db/migrate.ts`](../../src/ei/db/migrate.ts) — `ei_events` table, `ei_idempotency_keys` table
