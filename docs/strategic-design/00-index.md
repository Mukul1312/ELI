# DDD-lite Strategic Design — Index

> This folder is the single source for DDD strategic modeling outputs. It follows the [Strategic Design Checklist](.agents/skills/clean-ddd-hexagonal/references/DDD-STRATEGIC.md#strategic-design-checklist) from the clean-ddd-hexagonal skill.
>
> **Format:** Hybrid — workbook prompts for you now; distilled strategic design for future teammates.

---

## How to use

1. **Modeling sessions:** Use the domain-expert docs (table below) as your "expert interviews." Fill each section in order.
2. **Validation:** Cross-check section outputs against the codebase pointers at the bottom.
3. **Revisit:** Update the strategic design every 4–6 weeks as product discovery evolves.

---

## Domain Expert Documents (inputs)

All of these feed the modeling. Reference them explicitly when filling each section.


| Doc                                                                                                                                                                                                  | Role                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [Unified_Master_Doc.md](../../Unified_Master_Doc.md)                                                                                                                                                 | Product narrative, problem, loop, value prop, leading indicators                |
| [EI_Spec.md](../../EI_Spec.md)                                                                                                                                                                       | Canonical EI thesis, loop equation, protocols, deltas                           |
| [EI_Engine_Taxonomy.md](../../EI_Engine_Taxonomy.md)                                                                                                                                                 | Internal contracts, event names, derived signals, labels                        |
| [EI_UX_Scales.md](../../EI_UX_Scales.md)                                                                                                                                                             | Student-facing scale semantics (Energy, Pressure, Backlog, Sleep); labels-first |
| [EI_Protocols_Deep_Dive.md](../../EI_Protocols_Deep_Dive.md)                                                                                                                                         | Protocol index, shared definitions (signals, modes, guardrails)                 |
| [EI_Protocol_1_Ignition.md](../../EI_Protocol_1_Ignition.md), [EI_Protocol_2_Activation.md](../../EI_Protocol_2_Activation.md), [EI_Protocol_3_Verification.md](../../EI_Protocol_3_Verification.md) | Protocol deep dives                                                             |
| [EI_Scenarios.md](../../EI_Scenarios.md)                                                                                                                                                             | Scenario template, real journeys, expected routing, failure risks               |
| [EI_Storyboard_S7_Day1-21.md](../../EI_Storyboard_S7_Day1-21.md)                                                                                                                                     | Ambitious student, pending checks pile up                                       |
| [EI_Storyboard_S5_BurnoutRunway_Day1-21.md](../../EI_Storyboard_S5_BurnoutRunway_Day1-21.md)                                                                                                         | Burnout/silence, re-entry                                                       |
| [EI_Storyboard_S2_RevengePlanning_Day1-21.md](../../EI_Storyboard_S2_RevengePlanning_Day1-21.md)                                                                                                     | Revenge planning after bad mock                                                 |
| [launch-requirements-checklist.md](../launch-requirements-checklist.md)                                                                                                                              | P0/P1 requirements, data, SLOs                                                  |


---

## Strategic Design Checklist (skill) → Section mapping


| #   | Checklist item                                         | Delivered in                                                                            |
| --- | ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 1   | Identify ubiquitous language terms with domain experts | Ubiquitous language in each bounded context canvas                                      |
| 2   | Map subdomains (core, supporting, generic)             | [02-subdomains.md](02-subdomains.md)                                                    |
| 3   | Define bounded context boundaries                      | [03-context-map.md](03-context-map.md)                                                  |
| 4   | Document context map with relationships                | [03-context-map.md](03-context-map.md)                                                  |
| 5   | Design anti-corruption layers for external systems     | [05-cross-cutting-concerns.md#acls](05-cross-cutting-concerns.md#acls)                  |
| 6   | Define integration event schemas                       | [05-cross-cutting-concerns.md#event-catalog](05-cross-cutting-concerns.md#event-catalog) |
| 7   | Ensure each context has its own data store             | [05-cross-cutting-concerns.md#data-ownership](05-cross-cutting-concerns.md#data-ownership) |


---

## Section index


| File                                                           | Purpose                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| [01-domain-narrative.md](01-domain-narrative.md)               | One-page problem, actors, EI loop, what "working" means             |
| [02-subdomains.md](02-subdomains.md)                           | Subdomain list; Core/Supporting/Generic; Now/Next/Later             |
| [03-context-map.md](03-context-map.md)                         | Bounded contexts, boundaries, relationships, Mermaid diagram        |
| [05-cross-cutting-concerns.md](05-cross-cutting-concerns.md)   | Invariants, event catalog, data ownership, ACLs                    |
| [09-tactical-ddd-candidates.md](09-tactical-ddd-candidates.md) | Proposed aggregates, domain services, and value objects             |
| [tactical/00-index.md](tactical/00-index.md)                   | Tactical DDD specs (TopicLoop, LoopHealth, …)                        |


### Bounded context canvases (core)

Detailed canvases per [bounded-context-canvas-template.md](bounded-context-canvas-template.md):


| Canvas                                                               | Context                                                  |
| -------------------------------------------------------------------- | -------------------------------------------------------- |
| [canvas-ei-runtime.md](canvas-ei-runtime.md)                         | EI Runtime (AdaptiveCoaching, StudySessionOrchestration) |
| [canvas-ei-event-ledger.md](canvas-ei-event-ledger.md)               | EI Event Ledger                                          |
| [canvas-ei-projections.md](canvas-ei-projections.md)                 | EI Projections (DerivedSignals)                          |
| [canvas-loop-health-assessment.md](canvas-loop-health-assessment.md) | LoopHealthAssessment                                     |


### Bounded context canvases (supporting + generic)


| Canvas                                                           | Context                                    |
| ---------------------------------------------------------------- | ------------------------------------------ |
| [canvas-strategic-adjustment.md](canvas-strategic-adjustment.md) | Strategic Adjustment (StrategicAdjustment) |
| [canvas-cohort-access.md](canvas-cohort-access.md)               | CohortAccess (Identity, Cohorts, RBAC)     |
| [canvas-institute-radar.md](canvas-institute-radar.md)           | Institute Radar (InstituteRadar)           |
| [canvas-ops-observability.md](canvas-ops-observability.md)       | Ops & Observability (OpsObservability)     |
| [canvas-billing-entitlements.md](canvas-billing-entitlements.md) | BillingEntitlements                        |


### Aggregate design canvases

Per [aggregate-design-canvas.md](../aggregate-design-canvas.md), see [aggregates/00-index.md](aggregates/00-index.md).

### Domain service design

Per [domainService/domain-service-template.md](domainService/domain-service-template.md), see [domainService/00-index.md](domainService/00-index.md).


---

## Implemented vs planned (code pointers)

Use these when reconciling spec vs reality:

- **Protocol runtime:** [src/ei/protocol-runner.ts](../../src/ei/protocol-runner.ts)
- **Engine (pure logic):** [src/ei/engine/](../../src/ei/engine/)
- **Tools (DB boundary):** [src/mastra/tools/](../../src/mastra/tools/)
- **DB layer:** [src/ei/db/](../../src/ei/db/)
- **API routes:** [src/app/api/ei/](../../src/app/api/ei/)
- **Event schemas:** [src/ei/schemas/events.ts](../../src/ei/schemas/events.ts), [src/ei/schemas/outputs.ts](../../src/ei/schemas/outputs.ts)

