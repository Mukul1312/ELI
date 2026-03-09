# ELI Relationship Arc — How Depth Emerges Over Time

> The relationship between ELI and the student deepens not through a single synthesis event, but through the progressive unlocking of micro-moments across every session. This doc maps what changes between Session 1 and Session 20+, why the Day 15 guardrails are unnecessary, and which realism failures are resolved.

---

## What this doc covers

- The relationship arc as distributed design (not a single moment)
- Session-by-session capability unlocking
- How each system contributes to deepening
- Checkin evolution over time
- Why Day 15 guardrails are superseded
- Realism failures resolution status
- Engine gaps resolution status
- What remains open

Related docs:
- [Craving Loop](../foundations/craving-loop.md) — The 6-beat loop that deepening serves
- [footer-identity.md](footer-identity.md) — Identity moment system
- [formation-period.md](formation-period.md) — Pattern claim tiers, progressive introduction
- [topic-recommendation.md](topic-recommendation.md) — Recommendation intelligence
- [silence-reentry.md](silence-reentry.md) — Formation-aware silence interpretation
- `docs/product-audit/02-realism-failures.md` — Realism failures audit
- `docs/product-audit/03-engine-gaps.md` — Engine gaps audit
- `docs/product-audit/04-lovable-product-gaps.md` §6 — Original gap analysis

---

## The core principle

A relationship deepens when:
1. The companion references shared history
2. The companion stops asking things it already knows
3. The companion notices patterns and names them unprompted
4. The companion starts anticipating rather than just responding

ELI achieves all four — not through a special "now I know you" moment, but through systems that progressively unlock as data accumulates. The student never sees a transition. They just notice that ELI is getting more specific.

---

## Session-by-session capability map

What ELI can do at each stage, and which system provides it.

### Sessions 1–2 (Stranger)

ELI knows almost nothing. It asks everything. The experience is warm but generic.

| Capability | What ELI does | System |
|---|---|---|
| Greeting | Template: warm, no references to history. "Let's start." | Microcopy templates |
| Checkin | All fields shown. No observations. Blank slate. | Phase 1 form |
| Topic recommendation | None. Student picks freely. | Doc 18: no recommendation until Session 3 |
| Silence interpretation | No re-entry treatment for any gap length. ELI hasn't established a baseline. | Doc 19: formation rules |
| Pattern claims | **None.** ELI has no data to claim anything. | Doc 16: no tiers active |
| Identity moments | Not eligible. | Doc 08: requires 4+ sessions in 7 days |

**What the student experiences:** A simple, low-friction study companion. Pleasant but impersonal. "This could be any student."

### Sessions 3–4 (Acquaintance)

ELI starts learning. First signals appear.

| Capability | What changes | System |
|---|---|---|
| Time commitment picker | Appears for the first time. Student declares scope. | Doc 16: Session 3+ |
| Topic recommendation | Simple: surfaces continuation topic if one exists. | Doc 18: simple mode Sessions 3–5 |
| Greeting | Can reference session count: "Your third session." | Microcopy templates |
| Pattern claims | **Tier 1:** Simple observations from any data. "You studied Thermodynamics yesterday." | Doc 16 |

**What the student experiences:** ELI remembers what happened last time. Small but noticeable. "It knows I was here yesterday."

### Sessions 5–7 (Early Trust)

The loop has run enough times for ELI to observe patterns.

| Capability | What changes | System |
|---|---|---|
| Topic recommendation | Full algorithm: priority stack, energy adjustment, overdue revisits. | Doc 18: full mode Session 5+ |
| Pattern claims | **Tier 2:** Tentative patterns from 5+ data points. "Your energy has been Good 4 of your last 5 sessions." | Doc 16 |
| Checkin observation | One-line observation above energy tap: "Good energy 4 of your last 5." Student still taps freely. | Checkin evolution (below) |
| Silence interpretation | Still formation rules — no re-entry for short gaps. But 7+ day gap gets gentle treatment. | Doc 19 |

**What the student experiences:** ELI is starting to notice things. The recommendations feel less random. "It suggested the right topic today."

### Sessions 8–10 (Established)

Formation period ends. ELI has a baseline.

| Capability | What changes | System |
|---|---|---|
| Silence interpretation | Switches to established rules. Calendar gaps are measured against the student's observed pattern. | Doc 19: established mode |
| Pattern claims | **Tier 3:** Confident patterns from 7+ data points. "You tend to close loops when energy is Good." | Doc 16 |
| Identity moments | Eligible if criteria met (verification rate ≥ 0.70, ≤ 2 pending checks, 4+ sessions in 7 days). | Doc 08 |
| Weekend pattern | `hasWeekendPattern` can be computed (3+ weeks of history). Weekend gaps stop triggering re-entry. | Doc 19 |
| Greeting | Can reference multi-session patterns: "3 sessions this week, 2 loops closed." | Microcopy templates + Tier 2 data |

**What the student experiences:** ELI feels like it knows the rhythm. Re-entry after a weekend doesn't feel like a "welcome back" ceremony. Identity moments land because they reference real behaviour. "ELI noticed I've been consistent."

### Sessions 11–20 (Deepening)

ELI's observations compound. Each session adds precision.

| Capability | What changes | System |
|---|---|---|
| Pattern claims | **Tier 4:** Correlations from 10+ co-occurrences. "4 of your last 7 sessions happened in the evening." "Your last 3 sessions at Good energy all had verified closures." | Doc 16 |
| Topic recommendation | Avoidance detection active (3+ skips tracked). Recommendation reasons become more specific. | Doc 18 |
| Pre-silence context | Enough data for energy trend analysis, frequency decline detection. Re-entry is contextual. | Doc 19 |
| Chat companion | Enough history to reference patterns, correlations. Chat becomes genuinely useful. | Doc 15 |

**What the student experiences:** ELI's specificity is noticeable. Greetings reference real patterns. Topic recommendations feel earned. Re-entry after silence acknowledges context, not just the calendar gap. "ELI actually knows how I study."

### Sessions 20+ (Companion)

Full capability. ELI has earned the right to make specific claims.

| Capability | What changes | System |
|---|---|---|
| All tiers active | Full pattern claim vocabulary. Correlations, multi-week trends, energy-outcome patterns. | Doc 16 |
| Recommendation intelligence | Full history. Can detect multi-week avoidance, seasonal patterns, topic cycling. | Doc 18 |
| Identity moments | Regular eligibility. Statements reference accumulated evidence. | Doc 08 |
| Silence differentiation | Full pre-silence context: energy trends, frequency shifts, last session outcome. | Doc 19 |

**What the student experiences:** ELI feels like a companion who has been paying attention for weeks. Not because it announced it — but because every interaction carries the weight of shared history.

---

## Checkin evolution

The checkin form doesn't lose fields over time — ELI always needs current energy. But it gains context.

| Stage | What the checkin looks like |
|---|---|
| **Sessions 1–4** | Clean form. Energy tap, optional sleep. No observations. |
| **Sessions 5–9** | One-line observation above the energy tap: "Good energy 4 of your last 5 sessions." Student still taps freely. The observation is informational, not prescriptive. |
| **Sessions 10+** | Observation can reference patterns: "You've been Sharp the last 2 evenings." Still informational. ELI never pre-fills or suggests an energy value — energy is the student's subjective report. |

**What ELI never does:** Pre-fill the energy tap. Suggest what the student should pick. Say "You're usually Good at this time." Energy is self-report, not prediction. The observation is ELI showing it remembers, not ELI telling the student how they feel.

**Tier gating:** The observation text follows pattern claim tier rules. Session 5 observation uses Tier 2 language (tentative). Session 10+ can use Tier 3 (confident). Session 20+ can use Tier 4 (correlations).

---

## Why Day 15 guardrails are superseded

The storyboards (S2/S5/S7 Scene 10) show ELI surfacing "two plain rules" at Day 15 as a coaching anchor. This feature was identified as undesigned in both `02-realism-failures.md` §3 and `03-engine-gaps.md` §4.

### What the guardrails would have required

1. A trigger that fires at Day 15 (or equivalent milestone) — undefined
2. An algorithm that computes personalized rules from session history — undefined
3. An SDUI component to display the coaching output — nonexistent
4. A persistence model for the rules once shown — undefined
5. A personalisation model (per-student vs. per-archetype) — undefined

### Why they're unnecessary now

The relationship arc is distributed across systems that didn't exist when the storyboards were written:

| What the guardrails provided | What provides it now |
|---|---|
| "ELI shows it has learned about you" | Pattern claim tiers — ELI's vocabulary expands visibly at Session 5/7/10 |
| "Personalized behavioral rules" | Topic recommendation — surfaces the right topic for the right reason (doc 18) |
| "Coaching anchor for the coming week" | Identity moments — weekly behavioral reflections that reference real data (doc 08) |
| "ELI synthesizes what it knows" | Checkin observations — small-N facts shown every session, building gradually |

The Day 15 card would reduce ELI's accumulated awareness to two bullet points. The distributed approach is more effective — the student experiences deepening in every interaction, not in a single announcement.

### Decision

**Do not build the Day 15 guardrails card.** The `StrategicAdjustmentDecision` event retains its value as an internal routing adjustment (recovery mode, difficulty raise, etc.) but does not need a student-facing synthesis output. The relationship arc happens through the micro-moments, not a ceremony.

---

## Realism failures resolution status

Cross-referencing `docs/product-audit/02-realism-failures.md` against current design:

| # | Failure | Resolution | Status |
|---|---|---|---|
| 1 | Content instruction ELI cannot give ("solve Q1") | Principle established: ELI prescribes CONDITIONS (topic, time, motion), never CONTENT (page, question, answer). | **Principle resolved.** Storyboards need rewrite. |
| 2 | Cognitive claim without cognitive data ("recall feels shaky") | Pattern claim tiers (doc 16) structurally prevent ELI from claiming internal states. Tier constraints enforce "data before opinion." | **Resolved.** |
| 3 | Day 15 guardrails with no mechanism | Superseded by distributed relationship arc. Identity moments + pattern claim tiers + topic recommendation provide the deepening. No synthesis card needed. | **Superseded.** |
| 4 | Energy × Time-of-Day pattern claim | Pattern claim tiers gate what ELI can say. Tier 1–2: small-N observations ("4 of your last 7 sessions were evening"). Tier 3–4: pattern claims ("you tend to..."). Exactly the audit's "minimum viable version." | **Resolved.** |
| 5 | Template ceiling on Recognition beat | Postponed. Pattern claim tiers extend template useful life (more state combinations × tier-gated language). AI generation deferred to future — templates + tiers cover Sessions 1–20+. | **Mitigated, not fully resolved.** |

---

## Engine gaps resolution status

Cross-referencing `docs/product-audit/03-engine-gaps.md` against current design:

| # | Gap | Resolution | Status |
|---|---|---|---|
| 1 | V3 trigger signals (`examProximityDays`, `avoidancePattern`, `recentMockFailure`) | Still undefined. These signals require new data inputs (exam dates, app-start-without-checkin tracking, mock results). | **Open** |
| 2 | `timeCommitment` in AppOpen | Field still missing from taxonomy. Spec updated from 10/20/45/1h+ to ~15/~30/~45/1h+ (doc 16). Gap is valid: field needs to exist in AppOpen event. | **Open** (spec updated, contract still missing) |
| 3 | Chat data layer | No events, no context type, no history model. Chat cannot be implemented without these contracts. | **Open** |
| 4 | `StrategicAdjustmentDecision` delivery | Student-facing synthesis output (Day 15 card) is superseded. The event itself is valid as internal routing. Trigger definition still needed for the routing use case. | **Partially resolved** (student output superseded, trigger still undefined) |
| 5 | BacklogPressure routing references ghost value | Still open. `backlogPressure` removed as student input but still referenced in LOW_ENERGY/HIGH_ENERGY routing conditions. Needs resolution: either remove condition or replace with `computedBacklogLevel`. | **Open** |
| 6 | Topic recommendation ordering | **Resolved** by doc 18. Priority stack, per-topic signals, energy adjustment, avoidance detection — all defined. | **Resolved** |

---

## What remains open

### Resolved by this design arc (docs 16–21)

- Pattern claim constraints (what ELI can say and when)
- Topic recommendation intelligence
- Silence differentiation and formation-aware re-entry
- Success metrics that measure product love
- Day 15 guardrails superseded by distributed deepening
- Relationship arc mapped to session milestones

### Still open (requires future design or engineering work)

| Item | What's needed | Where it's tracked |
|---|---|---|
| V3 trigger signals | New data inputs: exam dates, AppAbandon event, mock results | Engine gap 1 |
| `timeCommitment` in AppOpen | Add field to event contract in taxonomy | Engine gap 2 |
| Chat data layer | Events, context type, history model, availability rules | Engine gap 3 |
| `StrategicAdjustmentDecision` trigger | Define firing conditions for internal routing | Engine gap 4 (routing part) |
| BacklogPressure routing | Remove or replace ghost value in routing conditions | Engine gap 5 |
| AI greeting generation | Template ceiling mitigation beyond Session 20+ | Lovable gap 3 (deferred) |
| Storyboard rewrite | Update S2/S5/S7 to reflect current design (pattern tiers, session-based units, honest ELI voice) | Realism failure 1, general staleness |

---

## Summary

| Principle | Detail |
|---|---|
| **Distributed, not ceremonial** | Deepening happens through micro-moments in every session, not a single "now I know you" event |
| **Session-gated unlocking** | ELI's capabilities expand at Session 3/5/8/10/20 — invisible to the student, felt in every interaction |
| **Tier-governed honesty** | Pattern claim tiers structurally prevent ELI from overstepping. Claims match data, always. |
| **Checkin evolves, never pre-fills** | Observations appear above the tap. Energy remains the student's subjective report. |
| **Day 15 guardrails superseded** | The synthesis card is unnecessary. Identity moments + pattern tiers + topic recommendation provide more effective deepening. |
| **Storyboards need rewrite** | Days 10–21 in all three storyboards assume capabilities that are now formally gated by pattern claim tiers and session milestones. |

---

*Craving loop: [Craving Loop](../foundations/craving-loop.md)*
*Identity moments: [footer-identity.md](footer-identity.md)*
*Formation period & pattern tiers: [formation-period.md](formation-period.md)*
*Topic recommendation: [topic-recommendation.md](topic-recommendation.md)*
*Silence & re-entry: [silence-reentry.md](silence-reentry.md)*
*Success criteria: [Success Criteria](../validation/success-criteria.md)*
*Realism failures: `docs/product-audit/02-realism-failures.md`*
*Engine gaps: `docs/product-audit/03-engine-gaps.md`*
