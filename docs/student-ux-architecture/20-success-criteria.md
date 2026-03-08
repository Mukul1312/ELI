# Success Criteria — Measuring Product Love

> The original success criteria (from `ux-design-brief.md §10`) measure whether the product works. These criteria measure whether students want to use it. These are different questions.

---

## What this doc covers

- Why the existing success criteria are insufficient
- Two metric categories: launchable (Day 1) vs. signal-dependent (when engine gaps close)
- Retention metrics (calendar-based) + engagement milestones (session-based)
- Per-metric definitions, data sources, and targets
- What success looks like at 7 / 14 / 21 days

Related docs:
- [01-craving-loop.md](01-craving-loop.md) — The 6-beat loop these metrics ultimately measure
- [16-formation-period.md](16-formation-period.md) — Formation period (Sessions 1–7) that D7 retention gates
- [18-topic-recommendation.md](18-topic-recommendation.md) — Recommendation acceptance rate definition
- [19-silence-and-reentry.md](19-silence-and-reentry.md) — Re-entry success measurement
- `docs/product-audit/04-lovable-product-gaps.md` §5 — Original gap analysis

---

## Why existing criteria are insufficient

The current success criteria (`ux-design-brief.md §10`):

| Current criterion | What it actually measures | What it misses |
|---|---|---|
| AppOpen completion time < 10 seconds | Form speed | Whether the student returns tomorrow |
| Student accepts ELI's scope reframe | Compliance with ELI | Whether the scope was right for them |
| Student picks one of 3 options at SessionEnd | UI completion (didn't abandon) | Whether the closure felt meaningful |
| Pending checks ≤ 2 over 21 days | Behavioural outcome | Whether the student chose to close them or felt nagged |
| Student doesn't feel "watched" | Trust perception | Unmeasurable without research |
| Mentor identifies 3 at-risk students in < 2 min | Institute usability | Not student love at all |

A student who completes AppOpen in 8 seconds, accepts ELI's scope reframe, and picks "Remind me tomorrow" at SessionEnd has met all current criteria. But if they don't return the next day, the product has failed.

---

## Two metric categories

Not all metrics are measurable from Day 1. Separating them avoids designing for metrics we can't compute.

### Launchable metrics (Day 1 — no engine gaps required)

These use events and signals that already exist or are computable from session history.

### Signal-dependent metrics (future — require engine gap resolution)

These require signals that are documented as engine gaps (`03-engine-gaps.md`). They are valid targets but cannot be instrumented until the underlying signals exist.

---

## Launchable metrics

### 1. Retention gates (calendar-based)

Retention is inherently a calendar question: "does the student come back in real time?" A student who did 10 sessions in 3 days but never opens the app again hasn't formed a habit.

| Metric | Definition | Target | Why this target |
|---|---|---|---|
| **S7 retention** | Student has ≥ 1 session on calendar Day 7 (± 1 day) after first session | > 60% of onboarded students | Formation period gate. If the student returns on Day 7, the loop is forming. |
| **S14 retention** | Student has ≥ 1 session on calendar Day 14 (± 1 day) | > 45% of S7-retained students | Past the template ceiling. ELI must feel personal by now. |
| **S21 retention** | Student has ≥ 1 session on calendar Day 21 (± 1 day) | > 35% of S14-retained students | Full loop formation. Student is habitual. |

**Measurement:** Count distinct students with a `SessionEnd` event within the target day window.

**Note:** "S7" here means "still active at calendar Day 7," not "Session 7." Using "S" to avoid confusion with the overloaded "D" (which could mean "Day" or "Doc"). These are calendar milestones.

### 2. Session-count milestones (progression-based)

Calendar retention misses engagement intensity. A student at Session 15 on Day 7 is very different from a student at Session 4 on Day 7. Session milestones capture depth.

| Milestone | What it signals | What unlocks at this point |
|---|---|---|
| **Session 3** | Student chose to return twice after first session. Not a one-time try. | Time commitment picker appears. |
| **Session 5** | Student has experienced at least one full loop (topic → revisit → check). | Full topic recommendation algorithm active. |
| **Session 10** | Significant engagement. ELI has real data. | Pattern claim Tier 3 active. Personalisation is meaningful. |
| **Session 20** | Established relationship. | Full algorithm suite. ELI can reference multi-week patterns. |

**Metric:** % of onboarded students reaching each milestone, and median calendar days to reach it.

**Why both clocks matter:** A student reaching Session 10 in 5 calendar days has high intensity but unknown sustainability. A student reaching Session 10 in 14 calendar days has moderate intensity but proven consistency. Both matter, and tracking the ratio reveals engagement quality.

### 3. Loop closure rate

The single best proxy for "is ELI actually helping the student retain knowledge?"

| Metric | Definition | Target |
|---|---|---|
| **7-day closure rate** | % of revisits closed (verification completed) within 7 calendar days of creation | > 50% by Day 14 for active students |
| **Revisit decay rate** | % of revisits that age past 14 days without being closed | < 20% of all revisits created |

**Why this matters:** If revisits pile up without closure, the student is doing sessions but not completing loops. The craving loop's Closure beat (Beat 4) requires the counter going down. If it only goes up, the motivational model fails.

**Measurement:** For each revisit creation event, track whether a corresponding verification event occurs within 7/14 days.

### 4. Verification rate trend

Does ELI actually improve the student's study behaviour, or just record it?

| Metric | Definition | Target |
|---|---|---|
| **Verification rate (7-day rolling)** | `verification events / (verification events + skip events)` over trailing 7 days | Upward trend for > 60% of active students over their first 21 days |

**What "upward trend" means:** Compare Week 1 verification rate to Week 3 verification rate. If Week 3 is higher, the student is improving. If it's flat or declining, ELI isn't driving behaviour change.

**Failure signal:** If > 40% of students have a flat or declining verification rate, the Phase 3 experience needs redesign — it's not creating enough motivation to close loops.

### 5. Session completion rate

Does the student finish what they start?

| Metric | Definition | Target |
|---|---|---|
| **Completion rate** | `SessionEnd events / IntentSet events` | > 85% of started sessions reach Phase 3 |
| **Early exit rate** | Sessions where duration < 3 minutes AND no SessionEnd event | < 10% of IntentSet events |

**Why this matters:** A student who starts sessions but doesn't finish them is experiencing friction *during* the session — either the content is wrong, the scope is too long, or something external interrupted. High early-exit rates point to Phase 2 problems.

### 6. Scope accuracy

Is the time commitment picker actually helping students pick the right scope?

| Metric | Definition | Target |
|---|---|---|
| **Scope match rate** | % of sessions where actual duration is within ± 50% of declared scope | > 60% of sessions (from Session 3+, when scope picker is active) |

**Example:** Student picks ~30 min, actual session is 15–45 min → match. Student picks ~15 min, actual session is 45 min → mismatch (scope was too conservative, but student engaged — not necessarily bad).

**What mismatch tells us:**
- Consistently shorter than declared → student is overestimating their availability. Scope picker defaults may need adjustment.
- Consistently longer than declared → student is more engaged than expected. This is a positive signal, not a failure.
- Both directions randomly → scope picker is not helping. Student is guessing.

### 7. Recommendation acceptance rate

Does the student follow ELI's topic recommendation?

| Metric | Definition | Target |
|---|---|---|
| **Acceptance rate** | % of sessions where the student picks the recommended topic (from `pending-items-list` priority ordering) | > 60% of sessions where a recommendation is shown |
| **Avoidance rate** | % of topics with `topicAvoidanceScore ≥ 3` (3+ skips in 7 days) | < 10% of topics with active revisits |

**Data source:** Topic recommendation algorithm output (doc 18) vs. actual IntentSet topic. Avoidance score is already tracked per topic.

**Failure signal:** If acceptance rate is < 40%, either the algorithm is recommending wrong topics, or the student prefers to choose freely. Both require investigation — the response is different (fix algorithm vs. reduce recommendation prominence).

### 8. Re-entry success rate

When a student returns after silence, do they actually start a session?

| Metric | Definition | Target |
|---|---|---|
| **Re-entry conversion** | % of re-entry AppOpens (SilenceDays ≥ 2) that result in an IntentSet within the same session | > 70% for Tier 1 (2–3 days), > 50% for Tier 2 (4–6 days), > 40% for Tier 3 (7+ days) |

**Why tiered targets:** Longer silence = harder re-engagement. Expecting 70% conversion from a 10-day-absent student is unrealistic. The goal is that ELI's re-entry greeting creates enough ease for the student to take one step.

**Data source:** Silence tier (doc 19) assigned at AppOpen, then track IntentSet occurrence.

---

## Signal-dependent metrics (future)

These require signals that are currently engine gaps. Documenting them as targets so they're ready when signals ship.

### 9. Silent exit rate

| Metric | Definition | Target | Required signal |
|---|---|---|---|
| **Silent exit rate** | % of AppOpens where the student closes the app without starting a session AND without using a skip/exit action | < 10% of all AppOpens | `avoidancePattern` (open-and-close detection) |

**Why it matters:** Skip-with-reason is healthy — the student is communicating. Silent exit is a trust failure — the student looked at ELI and decided not to engage, without telling ELI why.

### 10. V3 trigger conversion

| Metric | Definition | Target | Required signal |
|---|---|---|---|
| **V3 → session start** | % of HIGH_PRESSURE variant displays that result in an IntentSet | > 50% | `recentMockFailure`, `avoidancePattern`, `examProximityDays` |

**Why it matters:** V3 is designed for the highest-pressure moments. If a student in "A bit shaken" state sees the V3 greeting and still leaves, the greeting failed at its most critical job.

### 11. Chat engagement

| Metric | Definition | Target | Required signal |
|---|---|---|---|
| **Chat open rate** | % of sessions where the student opens the chat layer | > 30% by Day 21 | Chat data layer (engine gap) |
| **Chat initiated after Phase 3** | % of Phase 3 completions where the student opens chat before closing the app | > 15% by Day 21 | Chat data layer |

**Why it matters:** Chat usage signals that the student sees ELI as a relationship, not just a gate. If chat never opens, the experience is transactional.

### 12. "Feel known" perception

| Metric | Definition | Target | Required signal |
|---|---|---|---|
| **Feel known score** | Student's self-reported sense that ELI understands them | Positive trend over 21 days | In-app micro-survey or user research |

**Why it's separate:** This cannot be instrumented from event data. It requires qualitative measurement — either a periodic 1-question in-app survey ("Does ELI feel like it knows you? Yes/No") or dedicated user research sessions.

**When to measure:** Not at launch. After Session 10+ cohort reaches 100+ students, run qualitative research. Use as a directional signal, not a gate.

---

## What success looks like over time

### Day 7 checkpoint

| Signal | Healthy | Warning |
|---|---|---|
| S7 retention | > 60% | < 40% — formation period is failing |
| Median session count | ≥ 5 sessions | < 3 — students aren't returning frequently enough to form loops |
| Loop closure rate | > 30% | < 15% — revisits are piling up, no Closure beat |
| Completion rate | > 85% | < 70% — sessions are being abandoned mid-flow |

### Day 14 checkpoint

| Signal | Healthy | Warning |
|---|---|---|
| S14 retention (of S7 cohort) | > 45% | < 30% — loop didn't hold past formation |
| Verification rate trend | Upward for > 50% | Flat/declining for > 50% — ELI isn't changing behaviour |
| Recommendation acceptance | > 50% | < 30% — algorithm or UX issue |
| 7-day closure rate | > 40% | < 25% — revisits are rotting |

### Day 21 checkpoint

| Signal | Healthy | Warning |
|---|---|---|
| S21 retention (of S14 cohort) | > 35% | < 20% — long-term engagement failing |
| Session 10 milestone reached | > 60% of S21 retained | < 40% — retained students aren't engaged enough |
| Revisit decay rate | < 20% | > 35% — debt is accumulating, motivation model breaking |
| Scope match rate | > 60% | < 40% — time picker isn't helping |

---

## Metrics that are explicitly NOT success criteria

| Not a metric | Why |
|---|---|
| AppOpen completion time | Speed of form fill tells you nothing about desire to return |
| Number of topics added | Quantity ≠ quality. A student with 2 deeply looped topics is better than 10 shallow ones |
| Total session count (absolute) | Intensity without retention is unsustainable. 20 sessions in 3 days then churn = failure |
| ELI's scope reframe acceptance | Compliance ≠ product love. Student may accept because they have no alternative |
| Streak length | Streaks create guilt, not craving. One missed day breaking a streak is punishment, not motivation |

---

## Implementation notes

### Event requirements

All launchable metrics are computable from events that already exist or are trivially derivable:

- `AppOpen` — with timestamp
- `IntentSet` — with topic, task type, declared scope
- `SessionEnd` — with timestamp (actual duration = SessionEnd - IntentSet), outcome
- `CheckCreated` / `CheckClosed` — revisit lifecycle
- `VerificationCompleted` / `VerificationSkipped` — Phase 3 outcomes

No new events are required. The metrics layer reads from the event ledger.

### Dashboard vs. alerting

These metrics are not for a student-facing dashboard. They are internal product health signals. Two consumption modes:

1. **Cohort dashboard** — weekly view of all metrics by cohort (onboarding week). Identifies systemic issues.
2. **Threshold alerts** — when any metric crosses the "warning" threshold for a cohort, flag for investigation.

The student never sees these numbers. ELI's behaviour adapts based on individual signals (energy, silence, avoidance), not aggregate metrics.

---

## Summary

| Category | Metrics | Measurable from |
|---|---|---|
| **Retention gates** | S7 / S14 / S21 calendar retention | Day 1 |
| **Progression milestones** | Session 3 / 5 / 10 / 20 reached + time-to-reach | Day 1 |
| **Loop health** | 7-day closure rate, revisit decay rate | Day 1 |
| **Behaviour change** | Verification rate trend (7-day rolling) | Day 7+ |
| **Session quality** | Completion rate, early exit rate, scope match rate | Day 1 |
| **Recommendation quality** | Acceptance rate, avoidance rate | Session 5+ |
| **Re-entry quality** | Re-entry conversion by silence tier | When silence occurs |
| **Trust signals (future)** | Silent exit rate, V3 conversion, chat engagement, "feel known" | When engine gaps close |

---

*Craving loop: [01-craving-loop.md](01-craving-loop.md)*
*Formation period: [16-formation-period.md](16-formation-period.md)*
*Topic recommendation: [18-topic-recommendation.md](18-topic-recommendation.md)*
*Silence and re-entry: [19-silence-and-reentry.md](19-silence-and-reentry.md)*
*Original gap analysis: `docs/product-audit/04-lovable-product-gaps.md` §5*
