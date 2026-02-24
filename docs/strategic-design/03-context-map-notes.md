# Context Map — Explanatory Notes

> Companion to [03-context-map.md](03-context-map.md). Explains the "why" behind relationships, patterns, and design choices.

---

## Context map vs bounded context vs subdomain

- **Subdomain** (problem-space): A slice of the domain — what the business does. See [02-subdomains.md](02-subdomains.md).
- **Bounded context** (solution-space): A slice of the system — how we build it. Each context has its own model and ubiquitous language.
- **Context map**: The diagram and catalog that show *which* bounded contexts exist and *how* they integrate (who supplies whom, which pattern). So a context map is a map *of* bounded contexts.

---

## Upstream vs downstream: impact vs dependency

Two distinct ideas:

| Idea | Upstream | Downstream |
|------|----------|------------|
| **Impact** | Its changes **affect** downstream | It is **affected by** upstream |
| **Dependency** | **Does not depend** on downstream to work | **Depends on** upstream to work |

So: upstream *affects* downstream (impact flows down), but upstream does *not depend* on downstream (it can succeed without it). The downstream depends on the upstream. Every relationship in our catalog is "Upstream → Downstream" because we only modeled one-way supplier–consumer pairs.

---

## Why we don't model all 9×8 = 72 relationships

We only draw a relationship when there is a **real integration**: one context **supplies** another (data, commands, events). Most pairs don't talk to each other (e.g. Billing doesn't supply EI Runtime; LHA doesn't supply CohortAccess). So we document only the 16 relationships that exist in the design, not every possible pair.

---

## Pattern selection heuristics

| Pattern | When to use |
|---------|-------------|
| **ACL** | Downstream must **not** adopt upstream's model; we translate into our own terms (e.g. never trust client identity; protect our model from auth). |
| **Customer-Supplier** | Normal supply/consume; downstream uses upstream's output as **input** to its own model. |
| **Customer-Supplier (Conformist)** | Downstream **adopts** upstream's model/schema as-is (e.g. Projections conform to Ledger's event schema). |
| **Published Language** | We want a **versioned, documented contract** between contexts; both translate to/from it; stable for multiple consumers. |

---

## Non-redundancy: why both Proj and LHA supply Runtime, Radar, SA

- **LHA** supplies **interpretation** (labels, LoopHealthSnapshot, evidence).
- **Projections** supplies **state/aggregates** (numbers, topic state, policy) that consumers also need.

**Runtime:** Needs (a) labels from LHA for mode/play routing and (b) aggregates/policy from Projections for gate logic (e.g. verification floor, cross-protocol state). LHA doesn't pass through full policy or full topic state — it outputs a snapshot. So both edges stay.

**Radar:** Needs labels (from LHA) and the privacy-safe alerts feed (from Projections). LHA supplies interpretation; Projections supplies the feed/metrics for alerts. Both edges stay.

**SA:** Needs state (from Projections) and labels (from LHA) to decide adjustment mode and policy. SA appends StrategicAdjustmentDecision to Ledger; Projections consume from Ledger and persist policy. LHA supplies interpretation; Projections supplies the state SA needs beyond the snapshot. Both edges stay.

---

## SA and Projections: not mutually dependent

We have **Proj → SA** (Proj supplies state) and **SA → Ledger** (SA appends decisions). SA does not write directly to Projections; Projections consume from Ledger and persist policy. That does *not* make SA and Projections **mutually dependent**. Mutually dependent means: *both* need the other to deliver; neither can succeed without the other. Here: **Projections** can exist and serve Runtime, LHA, Radar, Ops without SA. **SA** cannot succeed without Projections (it needs state to decide) and without Ledger (it needs a place to append decisions). So the dependency is one-sided; we keep both relationships as separate upstream–downstream pairs.
