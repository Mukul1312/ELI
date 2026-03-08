# Engine Gaps Audit

> Signals, events, and data contracts required by product features that the engine taxonomy (`docs/ei/EI_Engine_Taxonomy.md`) does not define. These are not design decisions waiting to be made — they are implementation blockers. Features cannot be built without these contracts.

---

## Overview

The engine taxonomy is the shared contract between Product and Engineering. When a product feature requires a signal or event that the taxonomy doesn't define, that feature cannot be implemented — not because the engineering is hard, but because the contract doesn't exist for Engineering to implement against.

| # | Gap | Feature blocked | Severity |
|---|---|---|---|
| 1 | V3 trigger signals | HIGH_PRESSURE checkin variant | CRITICAL — V3 cannot fire |
| 2 | `timeCommitment` in AppOpen | Scope calculation in P1 gate | CRITICAL — scope has no declared time baseline |
| 3 | Chat data layer | ELI chat companion | CRITICAL — chat cannot be implemented |
| 4 | `StrategicAdjustmentDecision` delivery | Weekly coaching output / Day 15 guardrails | HIGH — feature has no path to student |
| 5 | BacklogPressure routing references ghost value | LOW_ENERGY routing | HIGH — routing condition references removed input |
| 6 | Topic recommendation ordering | ELI's primary daily intelligence | HIGH — ELI cannot recommend what to study |

---

## 1. V3 Trigger Signals

### What's missing

The HIGH_PRESSURE checkin variant (V3) is defined in `docs/student-ux-architecture/05-phase1-the-open.md` and the plan for `docs/phase1-design/04-phase1-variants.md`. It fires on three behavioral triggers:

- `examProximityDays <= 7`
- `avoidancePattern` (3+ AppOpens without sessions in 24h)
- `recentMockFailure`

None of these three signals exist in the engine taxonomy.

### What the taxonomy currently has

The taxonomy (`§2 — Derived signals`) defines:
- `StartLatencyMin` — minutes from IntentSet to start
- `VerificationRate7d` — rolling 7-day verification rate
- `ScheduleMisses7d` — missed scheduled verifications
- `AvoidantExits7d` — session ends with no retrieval
- `skipCount7d` — skip count
- `OpenLoops` — topics with effort but overdue retrieval
- `SilenceDays` — days since last meaningful event
- `StateTrend7d` — coarse direction of state

There is no `examProximityDays`, no `avoidancePattern`, no `recentMockFailure` signal.

### Gap analysis per trigger

**`examProximityDays <= 7`**

Requires:
- An exam date stored somewhere per student (or per batch, from the institute)
- A derivation rule: `examProximityDays = examDate - now`

Open questions:
- Who sets the exam date? Student self-report at onboarding? Institute import? Batch-level configuration by institute admin?
- Is this per-subject exam or a single main exam date? JEE/NEET students have multiple subject exams; which one triggers the signal?
- What if no exam date is set? Does V3 simply never fire via this trigger?
- Should `examProximityDays` be a student-level or batch-level derived signal?

This is not just a missing signal — it requires a new data input that doesn't exist anywhere in the current event model.

**`avoidancePattern` (3+ AppOpens without sessions in 24h)**

Requires:
- Tracking AppOpens that do NOT result in an `IntentSet` within a session window
- A derived signal: count of "abandoned opens" in the last 24 hours

Current problem: `AppOpen` in the taxonomy is the checkin event — it captures a student who completes the checkin. But an AppOpen-without-study (the student opened the app and left before completing the checkin) is not captured as a separate event.

To implement this signal:
- A new event `AppAbandon(openedAt, closedAt)` or similar would need to exist
- Or `AppOpen` would need to be split into `AppStart` (app launched) and `AppOpen` (checkin completed)
- The signal `avoidancePattern` would then be: `count(AppStart without AppOpen in 24h) >= 3`

This is a significant architecture change — it requires tracking user behaviour before the checkin is even started.

**`recentMockFailure`**

Requires:
- Mock result data to be ingested — either as a student self-report event or as an institute-imported data point
- A threshold for "failure": what score constitutes a failure? Student-relative (below their own average)? Absolute (below some percentile)?
- A recency window: "recent" = how many days?

Open questions:
- Mock results are not in the current event taxonomy. What event would carry them? `MockResultReceived(score, subject, date, source)`?
- Who provides this: the student (entering their own score) or the institute (exporting from their test platform)?
- Is this a student-sensitive input? (Students may not want to self-report failure to the app.) How does this affect the trust model?

### Current state summary

The V3 variant is fully designed at UX level but has zero data contract. It cannot fire because none of its three trigger signals exist. This is the highest-severity gap in the taxonomy.

---

## 2. `timeCommitment` Field Missing from AppOpen

### What's missing

`docs/student-ux-architecture/05-phase1-the-open.md` specifies 4 time commitment options at the checkin screen: 10 min / 20 min / 45 min / 1h+. This is a primary input to scope calculation.

The AppOpen event in the taxonomy:
```
AppOpen(energy, pressure(optional), sleepBucket(optional), backlogPressure(optional), openedAt)
```
No `timeCommitment` field.

### What feature requires it

`NegotiatedIntentIssued` outputs `scope` described as "coarse; timebox minutes or question-count." Without `timeCommitment`, the P1 gate has no declared time to compute scope from. Energy alone is insufficient: a Good (4) energy student with 10 minutes needs a radically different scope from a Good (4) energy student with 1 hour.

The current taxonomy describes scope as a gate output but gives the gate no time input. This means either:
- Scope is computed without declared time (using some internal default or energy-based heuristic only)
- Or the implementation already uses `timeCommitment` but the taxonomy hasn't been updated to reflect it

Either way, the contract is incomplete.

### The V3 and V1 internal-time special cases

Two variants explicitly do NOT collect `timeCommitment` from the student but use a fixed internal value:

- **V3 (HIGH_PRESSURE):** time fixed at 2 min internally. Student never sees time chips.
- **V1 (SILENCE_RE_ENTRY):** time fixed at 5 min internally. Student never sees time chips.

The taxonomy has no contract for this behaviour. How does the P1 gate know to use 2 min for a V3 session? It would need either:
- A null-handling rule: "if `timeCommitment` is absent and variant conditions indicate HIGH_PRESSURE, use 2 min"
- A separate field like `variantDefault.timeboxMin` set by the variant detection logic before AppOpen completes

Neither is defined.

### What the taxonomy needs

At minimum:
```
AppOpen(energy, sleepBucket(optional), timeCommitment(optional), openedAt)
```

With a note: `timeCommitment` is absent when variant detection fixes time internally (V3: 2 min, V1: 5 min). When absent, `NegotiatedIntentIssued` uses the variant-specific default.

Additionally, `NegotiatedIntentIssued.scope` should reference `timeCommitment` as its primary input alongside energy and `OpenLoops` constraints.

---

## 3. Chat Data Layer — No Contract Exists

### What's missing

`docs/student-ux-architecture/15-chat-companion.md` is fully designed at UX level: entry point (footer → bottom sheet), opening message rules, in-scope vs. out-of-scope topics, ELI's voice rules, availability by phase, chat history model, data ELI can reference.

The engine taxonomy has zero coverage of chat. No events, no context type, no history model.

### What feature requires it

The chat companion is a core retention mechanism — the Conversation Layer of the craving loop. Without a data contract, it cannot be implemented.

### Specific contracts that need to exist

**Events:**

The chat surface requires at minimum:
- `ChatOpen(openedAt, phase)` — student opens the chat sheet; phase indicates P1 or P3
- `ChatMessage(messageText, sentAt)` — student sends a message (for analytics and history, not for ELI processing directly)
- `ChatClose(closedAt, messageCount)` — student closes the chat

These events are needed for:
- Analytics (how often is chat used? in which phase?)
- History model (current + last conversation scoping)
- Session-availability enforcement (chat unavailable during Phase 2)

**`chatContext` type:**

ELI needs to know what signals are available when composing a chat response. Doc 15 §8 lists them:
- `pending_checks` count
- `last_scheduled_due_at` per topic
- `sessionsLast7d`
- `verificationRate7d`
- `state_trend_7d`
- `silenceDays`
- Topic recency (last session date per topic)
- Session timestamps
- `taskType` history
- Energy history

This is the `chatContext` — a superset of the signals available in the gate flows. It needs to be formally defined so that the chat response generation knows what it can reference.

**History model:**

Doc 15 specifies: current conversation + last completed conversation visible to student. Older conversations: not shown, not retrievable. This requires:
- A persistence model for chat history (where is it stored? events? a separate table?)
- A scoping definition: what constitutes "a conversation"? One ChatOpen→ChatClose pair? One session (between AppOpen and SessionEnd)?
- A retrieval contract: when the chat sheet opens, what history is loaded?

**Rate limiting / session availability:**

Doc 15 §6 specifies: chat unavailable during Phase 2. This enforcement requires the system to know what phase the student is in — which the SDUI layer already handles, but the chat availability rule needs to be a formal part of the contract so that chat-open requests can be rejected or suppressed during Phase 2.

### Current state

Without these contracts, the chat feature cannot be implemented. An engineer attempting to implement doc 15's UX would have no data contract to work from.

---

## 4. `StrategicAdjustmentDecision` Has No Delivery Mechanism

### What's missing

The taxonomy defines `StrategicAdjustmentDecision` as a gate output:
```
Fields:
- adjustmentMode ∈ { Recovery, TechniquePivot, IntegrityClamp, DifficultyRaise, CloseLoopsFirst }
- nextCycleConstraints(optional)
- dials(optional)
- rationale(optional)
```

But this event has three critical gaps:

### Gap 1: No defined trigger

The taxonomy states: "Trigger: scheduled weekly review OR risk-triggered wrap."

- "Scheduled weekly review" — no cron spec, no day/time definition, no event that schedules it
- "Risk-triggered wrap" — no threshold defined (what combination of signals constitutes a risk that triggers a wrap?)

The `StrategicAdjustmentDecision` event is described but has no defined firing condition. It is an output without an input.

### Gap 2: Output fields are routing parameters, not student content

The output fields (`adjustmentMode`, `nextCycleConstraints`, `dials`) are internal routing parameters consumed by subsequent P1/P2/P3 gate calls. They tell the engine how to route the next cycle — they do not produce student-visible content.

But the storyboards (see `02-realism-failures.md` — Failure 3) describe a student-visible moment: ELI surfacing "two plain rules" as a coaching anchor. There is no path from `StrategicAdjustmentDecision` fields to a student-facing message or card.

The gap: `StrategicAdjustmentDecision` is designed as an internal routing adjustment. The storyboards imply it should also produce a student-facing coaching output. These are two different things. Neither the trigger nor the student-facing delivery is designed.

### Gap 3: No SDUI component for weekly coaching output

Even if `StrategicAdjustmentDecision` were to produce student content, there is no SDUI component to render it. The Phase 1 SDUI view (`composeP1View`) has no slot for a "weekly rules card" or "behavioural insight card." The component doesn't exist in `types/components.ts` or `registry.tsx`.

### What this means for the storyboard promise

The Day 15 guardrail moment in all three storyboards cannot be delivered with the current `StrategicAdjustmentDecision` design. It would require:
1. A defined firing trigger
2. A student-content output alongside the routing parameters
3. A new SDUI component to render it
4. A persistence model for the content

This is a substantial design and implementation gap, not a minor omission.

---

## 5. BacklogPressure Routing Condition References a Ghost Value

### What's missing

The LOW_ENERGY routing condition in `EI_Engine_Taxonomy.md §3.1`:
```
LOW_ENERGY if any:
- energy ≤ 2, OR
- sleepBucket = "<6", OR
- pressure ≥ 4, OR
- backlogPressure ≥ 4, OR   ← this line
- StateTrend7d = worsening
```

The HIGH_ENERGY routing condition:
```
HIGH_ENERGY if all:
- energy ≥ 4, AND
- sleepBucket ∈ {"7-8", ">=8"} (if known), AND
- pressure ≤ 2 (if known), AND
- backlogPressure ≤ 3 (if known), AND   ← this line
- no active risk spike
```

If `backlogPressure` is removed as a student-tapped input (as decided and documented in `01-stale-features.md`), these conditions reference a value that will never be in the AppOpen payload.

### What this means at runtime

At routing time:
- `backlogPressure` will always be absent from the input
- `backlogPressure ≥ 4` will always evaluate to false (absent field)
- `backlogPressure ≤ 3` will always evaluate to false (absent field)

The LOW_ENERGY condition loses one of its five triggers. The HIGH_ENERGY condition loses one of its gates. These are silent changes — the routing logic won't error, it will just silently behave differently.

### Two resolution paths

**Path A: Remove condition entirely, rely on behavioral equivalents**

`OpenLoops ≥ 3` is a behavioral proxy for high backlog pressure. A student with `OpenLoops ≥ 3` likely feels behind regardless of their self-report. This is already in the LOW_ENERGY conditions via the `no active risk spike` HIGH_ENERGY gate that references `OpenLoops ≥ 3`.

The LOW_ENERGY condition may already be adequately covered by `OpenLoops ≥ 3` for the avoidant/behind student. Simply removing `backlogPressure ≥ 4` without replacement may lose very little routing coverage.

**Path B: Define `computedBacklogLevel` as a derived signal**

A formal derived signal that computes backlog severity from behavioral data:
```
computedBacklogLevel ∈ {low, medium, high}

high if any:
- pendingChecks ≥ 4, OR
- OpenLoops ≥ 3, OR
- (ScheduleMisses7d ≥ 2 AND OpenLoops ≥ 2)

medium if any:
- pendingChecks ∈ {2, 3}, OR
- OpenLoops ∈ {1, 2} AND ScheduleMisses7d ≥ 1

low: otherwise
```

Then the routing condition becomes `computedBacklogLevel = high` instead of `backlogPressure ≥ 4`. The routing logic is preserved; the data source changes from self-report to behavioral inference.

Path B preserves the routing contract and makes the inference explicit. Path A is simpler but loses the explicit backlog signal in routing.

---

## 6. Topic Recommendation Ordering — The Intelligence Gap

### What's missing

The storyboards and chat companion repeatedly show ELI surfacing specific topic recommendations:
- "Thermodynamics hasn't been touched in 9 days."
- "The Organic Chemistry check has been sitting since Tuesday."
- "Given 9 days on Thermodynamics and your energy pattern..."

These imply ELI has an ordering algorithm: when multiple topics are eligible, it knows which to surface first. But no such algorithm is defined anywhere in the taxonomy.

### What the engine currently knows per topic

From events and derived signals, ELI has access to:
- `pendingChecks` — count of topics with pending verification (from derived signals)
- `last_scheduled_due_at` per topic — which pending check is oldest (implied by `ScheduleMisses7d`, but not a per-topic signal)
- `OpenLoops` — topics with effort but retrieval overdue (count, not ranked list)
- `SilenceDays` per topic — implied by session event history, but not a defined derived signal

What is NOT defined:
- `topicRecency(topic)` — days since last session on this topic (not a defined derived signal)
- `topicPriorityScore(topic)` — a composite ranking of which topic to surface
- Any ordering algorithm for when multiple topics compete

### The ordering problem in detail

Consider a student with:
- Thermodynamics: 9 days since last session, 1 pending check (from Tuesday)
- Organic Chemistry: 3 days since last session, 1 pending check (from yesterday)
- Integration: 1 day since last session, 0 pending checks
- Waves: 0 pending checks, never studied

Which topic does ELI recommend?

Multiple valid orderings:
1. **Oldest pending check first:** Thermodynamics (Tuesday > yesterday)
2. **Most overdue session first:** Thermodynamics (9 days > 3 days)
3. **Continuation:** Integration (most recently started, lowest context-switch cost)
4. **Energy-matched difficulty:** Depends on current energy — Waves for low energy (fresh topic, easier entry) vs. Thermodynamics for high energy (catch up on debt)
5. **Institute priority:** Some topics may be marked higher priority by the institute for upcoming exams
6. **Avoidance detection:** If the student has been systematically avoiding Organic Chemistry despite it having pending checks, surface it specifically

None of these orderings is defined. "ELI recommends Thermodynamics" in the storyboards is always a narrative convenience — the storyboard author picked the topic that makes the scene work.

### Why this is the core intelligence gap

Topic recommendation is arguably the most important thing ELI does. The craving loop's Anticipation beat ("I wonder what ELI has for me today") depends on students trusting that ELI's recommendation is genuinely the right thing to study. If ELI's recommendation is random or arbitrary, Anticipation doesn't form.

"What should I study today?" is the question every JEE/NEET student asks themselves every day. If ELI can answer this question better than the student can answer it themselves, it becomes indispensable. If it cannot, it is just a session tracker with nice microcopy.

### What the taxonomy needs

At minimum, a new derived signal category for topic-level signals:

```
Per-topic derived signals:
- topicRecencyDays(topic): days since last session on this topic
- topicPendingCheckAge(topic): days since pending check was created (if exists)
- topicSessionCount7d(topic): sessions on this topic in last 7 days
- topicAvoidanceScore(topic): count of times topic was surfaced but not selected in last 7d
```

And a recommendation output:
```
RecommendedTopics: ordered list of 1-3 topics with:
- topic
- reason ∈ { oldest_pending_check, most_overdue, continuation, energy_matched, avoidance_pattern }
- urgency ∈ { high, medium, low }
```

The ordering algorithm and conflict resolution rules also need to be defined — these are product decisions, not implementation details.
