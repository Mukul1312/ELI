# TopicLoop + StudentAggregates Compliance Report

**Date:** 2025-02-22  
**Scope:** TopicLoop and StudentAggregates aggregates per strategic/tactical docs.

---

## Checklist Results

| Criterion | TopicLoop | StudentAggregates |
|-----------|-----------|-------------------|
| Monotonic topic state (GREATEST) | ✓ | N/A |
| Replaceability (recompute from Ledger) | ✓ | ✓ |
| Domain ID validation (non-empty) | ✓ | ✓ |
| Use-case boundary errors (reject invalid payload) | ✓ | ✓ |
| Application layer: imports domain only | ✓ | ✓ |
| Event schema strictness on append path | ✓ (via validateEventPayload) | N/A |
| verificationRate7d = verified / sessionEnds | N/A | ✓ |
| replanLoopCount7d = Replan count in 7d | N/A | ✓ |
| graceMs injected by infrastructure | N/A | ✓ |
| Unit + application + infrastructure tests | ✓ | ✓ |

---

## Residual Gaps (intentional or deferred)

1. **Event payload validator:** Event types not in `EVENT_SCHEMAS` (e.g. some protocol outputs) pass through unvalidated. Add schemas as those events are used.
2. **Nested strictness:** Top-level `.strict()` rejects unknown keys; nested objects in event payloads may still accept extra keys. Full nested strictness would require schema-wide updates.
3. **StudentAggregatesIdProps:** Pre-existing TypeScript constraint on `Record<string, unknown>` in ValueObject base; no functional impact.

---

## References

- [03-context-map.md](03-context-map.md)
- [05-cross-cutting-concerns.md](05-cross-cutting-concerns.md)
- [tactical/01-ei-tactical-conventions.md](tactical/01-ei-tactical-conventions.md)
- [tactical/topic-loop-tactical-spec.md](tactical/topic-loop-tactical-spec.md)
- [tactical/student-aggregates-tactical-spec.md](tactical/student-aggregates-tactical-spec.md)
