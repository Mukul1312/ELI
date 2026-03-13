# Bounded Context Canvas — CurriculumCatalog

> **How to use:** Duplicate this file per bounded context from [03-context-map.md](03-context-map.md). Fill after Context Map and Domain Message Flow. See [../bounded-context.md](../bounded-context.md) for section definitions.

**Subdomain(s):** CurriculumCatalog
**Context Map reference:** [03-context-map.md](03-context-map.md)
**See also (cross-cutting):** [05-cross-cutting-concerns.md](05-cross-cutting-concerns.md) — invariants, event catalog, data ownership, ACLs
**Design source:** [14-topic-selection-system.md](../student-ux-architecture/14-topic-selection-system.md)

---

## Name

CurriculumCatalog

---

## Purpose

Maintain a structured, searchable catalog of study topics with stable identifiers, enabling friction-free topic selection across all phases and reliable topic-level analytics. Replaces the current free-text topic input (`z.string()`) with a curriculum tree backed by stable UUIDs, type-ahead search, institute-scoped browse, and a normalization queue for unmapped free-text fallback.

**Key actors:**

- **Students** — topic selection via type-ahead search, recent chips, or hierarchical browse
- **Institute admins** — curriculum import (CSV/JSON), institute-scoped topic subsets
- **Ops** — normalization queue review (resolve unmapped free-text → aliases)

---

## Strategic Classification


| Dimension               | Choice       | Notes                                                                                   |
| ----------------------- | ------------ | --------------------------------------------------------------------------------------- |
| **Domain**              | Supporting   | Enables core coaching logic but does not itself make coaching decisions                 |
| **Business model role** | Enablement   | Reliable topic identity enables analytics, retention mechanics, and institute reporting |
| **Evolution**           | Custom built | Structured curriculum tree with institute scoping; no off-the-shelf solution fits       |


---

## Domain Roles

- **Information holder** — canonical topic catalog (source of truth for topic identity)
- **Gateway** — search/browse API surface for topic selection

---

## Ubiquitous Language (in this context)


| Term                | Definition (in this context)                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| CatalogTopic        | A leaf-level study topic with a stable UUID, display name, and zero or more aliases                          |
| TopicId             | Stable UUID assigned to a CatalogTopic; never reused or reassigned once issued                               |
| TopicName           | Display name for a topic (e.g. "Thermodynamics")                                                             |
| Alias               | Alternative name or abbreviation that resolves to a CatalogTopic (e.g. "thermo" → Thermodynamics)            |
| TopicReference      | Published Language VO: `{ topicId: UUID, topicName: string }` — the contract consumed by downstream contexts |
| Exam                | Top-level grouping (e.g. JEE Main, NEET, MHT-CET)                                                            |
| Subject             | Second-level grouping under an Exam (e.g. Physics, Chemistry)                                                |
| Unit                | Third-level grouping under a Subject                                                                         |
| Chapter             | Fourth-level grouping under a Unit; contains CatalogTopics                                                   |
| CurriculumTree      | The full Exam → Subject → Unit → Chapter → Topic hierarchy                                                   |
| InstituteCurriculum | Institute-scoped subset of the catalog; controls which topics appear in browse for that institute's students |
| NormalizationQueue  | Log of unmapped free-text inputs awaiting alias resolution by ops                                            |


---

## Inbound Communication


| Collaborator             | Message type | Message name              | Key data                                                           | Integration style | Relationship (from context map)           |
| ------------------------ | ------------ | ------------------------- | ------------------------------------------------------------------ | ----------------- | ----------------------------------------- |
| CohortAccess             | Query        | GetInstituteScope         | `instituteId` from AuthSession / cohort membership                 | Sync              | Customer-Supplier (CohortAccess upstream) |
| Student (via EI Runtime) | Query        | SearchTopics              | search query string, optional `instituteId` for ranking            | Sync              | — (user interaction)                      |
| Student (via EI Runtime) | Query        | BrowseTree                | `examId`, optional `subjectId`/`unitId`/`chapterId`, `instituteId` | Sync              | — (user interaction)                      |
| Student (via EI Runtime) | Command      | ResolveTopic              | raw free-text string                                               | Sync              | — (user interaction)                      |
| Institute Admin          | Command      | ImportCurriculum          | CSV/JSON file, `instituteId`                                       | Batch             | — (admin operation)                       |
| Ops                      | Command      | ResolveNormalizationEntry | queue entry id, target `topicId` or new alias                      | Sync              | — (ops operation)                         |


---

## Outbound Communication


| Message type   | Message name   | Collaborator    | Key data                                                                     | Integration style | Relationship       |
| -------------- | -------------- | --------------- | ---------------------------------------------------------------------------- | ----------------- | ------------------ |
| Query response | TopicReference | EI Runtime      | `{ topicId: UUID, topicName: string }`                                       | Sync              | Published Language |
| Query response | TopicReference | Institute Radar | `{ topicId, topicName }` + subject/exam grouping for SubjectAvoidance alerts | Sync              | Published Language |
| Query response | AliasLookup    | EI Projections  | Alias/UUID resolution for reconciling legacy string-based topics             | Sync              | Customer-Supplier  |


---

## Business Decisions

- **Never block the student:** Free-text fallback always works. If a student types a topic not in the catalog, the system accepts it (logs to normalization queue) and creates a temporary reference. The student is never prevented from starting a session.
- **Search is unrestricted; browse is scoped:** Type-ahead search returns results from the full catalog (institute topics ranked higher). Hierarchical browse is filtered to the student's institute curriculum.
- **Topic UUIDs are stable and permanent:** Once a `topicId` UUID is issued, it must not be reused or reassigned. This is a hard invariant — downstream contexts (events, projections, radar) depend on UUID stability.
- **No retroactive event rewriting:** Old events with `topic: z.string()` are never backfilled. Projections reconcile via alias lookup. Append-only ledger invariant is preserved.
- **Dedup on import:** Institute curriculum imports deduplicate against existing catalog entries (match by normalized name + exam context).

---

## Assumptions

- ~500 seed topics sufficient for launch (JEE Main, NEET, MHT-CET curricula).
- Institute curriculum import is batch (not real-time sync).
- Fuzzy search can use Postgres (`pg_trgm` or prefix match) — no external search engine needed pre-PMF.
- Normalization queue volume is low enough for manual ops review initially; LLM-assisted alias suggestions are Stage 2.
- Graph edges (topic prerequisites, related topics) belong in this same BC but are Stage 2 (post-PMF).

---

## Verification Metrics

- **Topic picker adoption rate:** % of sessions using catalog selection (type-ahead / browse / recent chip) vs raw free-text fallback. Target: >80% within 30 days of launch.
- **Normalization queue backlog:** Number of unmapped free-text entries awaiting resolution. Target: <50 at any time.
- **Search latency p95:** Type-ahead response time. Target: <200ms.
- **Alias coverage:** % of free-text inputs that successfully resolve to a catalog topic via alias match.

---

## Open Questions

- When to move search from Postgres to a dedicated search engine if query volume grows significantly.
- Whether to pre-build topic alias suggestions using LLM or keep manual-only for normalization queue resolution.
- Exact ranking algorithm for institute-priority search results (simple boost vs learned ranking).

