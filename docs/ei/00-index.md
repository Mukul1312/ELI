# Execution Intelligence (EI) — Document Index

> This folder is the **source-of-truth chain** for EI. It contains the product narrative, scientific thesis, protocol specifications, storyboards, and engineering contracts. The student-facing UX architecture that derives from these docs lives in [`../student-ux-architecture/`](../student-ux-architecture/).

---

## How to use

1. **New to EI?** Start with [Unified_Master_Doc](master/Unified_Master_Doc.md) for the executive overview, then [EI_Spec](spec/EI_Spec.md) for the deep thesis.
2. **Implementing gates?** Go to [EI_Engine_Taxonomy](EI_Engine_Taxonomy.md) for event contracts and routing, then the protocol deep dives in `spec/`.
3. **Designing UX?** Use the storyboards and [EI_Engine_Taxonomy](EI_Engine_Taxonomy.md) — the [student-ux-architecture](../student-ux-architecture/) folder translates these into screen phases, copy, and anti-patterns.
4. **Validating protocol routing?** Use [EI_Scenarios](scenarios/EI_Scenarios.md) to stress-test labels and guardrails.

---

## Folder structure

```
docs/ei/
├── 00-index.md              ← You are here
├── master/
│   └── Unified_Master_Doc.md   # Executive summary, B2B pivot, problem, loop overview
├── spec/
│   ├── EI_Spec.md              # Canonical EI thesis (source of truth)
│   ├── EI_Protocols_Deep_Dive.md   # Protocol index + shared definitions
│   ├── EI_Protocol_1_Ignition.md    # State → Intent (P1)
│   ├── EI_Protocol_2_Activation.md  # Intent → Effort (P2)
│   └── EI_Protocol_3_Verification.md   # Effort → Retrieval (P3)
├── scenarios/
│   └── EI_Scenarios.md         # Reality harness: stress-test protocol routing
├── storyboards/
│   ├── EI_Storyboard_S2_RevengePlanning_Day1-21.md
│   ├── EI_Storyboard_S5_BurnoutRunway_Day1-21.md
│   └── EI_Storyboard_S7_Day1-21.md
├── EI_Engine_Taxonomy.md       # Engineering contract: events, signals, labels, output shapes
└── EI_UX_Scales.md             # Redirect → student-ux-architecture/03-ux-scales.md
```

---

## Document roles

| Document | Role |
|----------|------|
| [Unified_Master_Doc](master/Unified_Master_Doc.md) | Product narrative, value prop, leading indicators, B2B thesis |
| [EI_Spec](spec/EI_Spec.md) | Canonical EI thesis: loop equation, protocols, deltas, guardrails |
| [EI_Protocols_Deep_Dive](spec/EI_Protocols_Deep_Dive.md) | Protocol index, shared definitions (signals, modes, guardrails) |
| [EI_Protocol_1_Ignition](spec/EI_Protocol_1_Ignition.md) | P1: State → Intent, NegotiatedIntent, Rescue/Boost plays |
| [EI_Protocol_2_Activation](spec/EI_Protocol_2_Activation.md) | P2: Intent → Effort, ActivationPlan, micro-start, focus contract |
| [EI_Protocol_3_Verification](spec/EI_Protocol_3_Verification.md) | P3: Effort → Retrieval, VerificationDecision, Trojan Horse, schedule |
| [EI_Scenarios](scenarios/EI_Scenarios.md) | Scenario template + example journeys for protocol sanity-checking |
| [EI_Storyboard_S2](storyboards/EI_Storyboard_S2_RevengePlanning_Day1-21.md) | Revenge planning after bad mock (high pressure) |
| [EI_Storyboard_S5](storyboards/EI_Storyboard_S5_BurnoutRunway_Day1-21.md) | Burnout, silence, re-entry |
| [EI_Storyboard_S7](storyboards/EI_Storyboard_S7_Day1-21.md) | Ambitious collector, pending checks pile up |
| [EI_Engine_Taxonomy](EI_Engine_Taxonomy.md) | Internal contract: event names, payload shapes, derived signals, labels, precedence |
| [EI_UX_Scales](EI_UX_Scales.md) | Redirect — student-facing scale semantics now in [03-ux-scales](../student-ux-architecture/03-ux-scales.md) |

---

## Recommended reading order

**For product / strategy:**
1. [Unified_Master_Doc](master/Unified_Master_Doc.md) → [EI_Spec](spec/EI_Spec.md) → Storyboards

**For protocol design:**
1. [EI_Spec](spec/EI_Spec.md) §4 → [EI_Protocols_Deep_Dive](spec/EI_Protocols_Deep_Dive.md) → Protocol 1/2/3 deep dives → [EI_Scenarios](scenarios/EI_Scenarios.md)

**For engineering:**
1. [EI_Engine_Taxonomy](EI_Engine_Taxonomy.md) → Protocol deep dives (output shapes) → [student-ux-architecture/13-implementation-map](../student-ux-architecture/13-implementation-map.md)

---

## Relationship map

```
docs/ei/                     →  EI source of truth (this folder)
     │
     ├── master/              →  Executive narrative
     ├── spec/                →  Canonical thesis + protocol deep dives
     ├── scenarios/           →  Validation harness
     ├── storyboards/         →  Product-readable 21-day journeys
     │
     └── EI_Engine_Taxonomy   →  Engineering contract (events, signals, outputs)
              │
              ▼
docs/student-ux-architecture/  →  UX translation: phases, copy, anti-patterns
              │
              ▼
     src/ei/sdui/             →  ViewComposer implementation
```

---

## Boundaries

- **This folder defines:** product narrative, protocol logic, event contracts, output shapes, routing labels.
- **This folder does not define:** student-facing UI copy, prompt wording, scale label meanings for users — those live in [student-ux-architecture](../student-ux-architecture/) and [EI_UX_Scales](EI_UX_Scales.md) (redirect).
- **Engine Taxonomy** is the engineering contract; do not modify it from the UX folder. The UX folder translates taxonomy outputs into SDUI behavior.
