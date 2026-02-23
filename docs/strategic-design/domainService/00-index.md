# Domain Services — Index

> Per [domain-service-template.md](domain-service-template.md). Stateless domain services (interpretation, computation) that do not have consistency boundaries or persistence. See [09-tactical-ddd-candidates.md](../09-tactical-ddd-candidates.md) for tactical candidates.

---

| Domain Service | Owned by | Responsibility | Status | Link |
|----------------|----------|----------------|--------|------|
| LoopHealth | LoopHealthAssessment | Interpret metrics to labels + LoopHealthSnapshot; single source for "what is healthy" | draft | [ds-loop-health.md](ds-loop-health.md) |
