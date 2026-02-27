# Domain Service Design — [ServiceName]

> **How to use:** Duplicate this file per stateless domain service. Domain services are stateless—no persistence, no consistency boundary, no commands or events. They interpret or compute from inputs and return outputs. See [aggregate-template.md](../aggregates/aggregate-template.md) for contrast (aggregates have state; domain services do not).

**Tactical spec:** [tactical/[service]-tactical-spec.md](../tactical/[service]-tactical-spec.md) (if exists)

**Owned by bounded context:** [ContextName]
**Related subdomain(s):** [SubdomainName(s)]
**Sources:** [02-subdomains.md](../02-subdomains.md), [03-context-map.md](../03-context-map.md), [05-cross-cutting-concerns.md](../05-cross-cutting-concerns.md)
**Code pointers (current):** `src/...`

---

## 1) Name

- **Domain Service:** [ServiceName]
- **Scope:** Stateless — no identity, no persistence, no transactional boundary
- **Lifetime:** Per invocation only

---

## 2) Description

- **Responsibility:**
- **Why domain service (not aggregate):** No mutable state; no consistency boundary; pure interpretation or computation from inputs.
- **Trade-offs:** (what you intentionally did NOT include)

---

## 2b) Dependencies

Upstream contexts or ports this service depends on for input data.

- 
- 

---

## 3) Input/Output Contract

Define the input and output schemas. No state is stored between calls.

### Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| | | | |

### Output

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| | | | |

---

## 4) Invariants

Invariants that must hold for every invocation (determinism, privacy, etc.).

- 
- 

---

## 5) Supported Queries (Entry Points)

The primary operation(s) that callers invoke.

| Query | Key params | Returns | Notes |
|-------|------------|---------|-------|
| | | | |

---

## Open questions

- 
