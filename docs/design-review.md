# Cross-Sprint Design Review — Pre-Engineering Pass

> Conducted after Sprints 1, 2, and 3. Walks the full student journey Phase 1 → Phase 2 → Phase 3 as an engineer would read it for the first time. All findings are classified, fixed in-doc, and recorded here.

---

## Review Method

1. Walked all three sprint folders end-to-end as a single student journey
2. Checked visual consistency (tokens, radius, button styles) across phase boundaries
3. Verified the 5-beat craving loop was intact from Phase 1 greeting to Phase 3 Seed
4. Walked three archetypes (S5 burnout, S2 high-pressure, S7 ambitious) through all 3 phases
5. Checked every "next sprint" forward reference for unresolved gaps

---

## What's Solid

**Craving loop end-to-end:** All 5 beats are served by the design.

| Beat | Where | Status |
|---|---|---|
| Anticipation | Phase 3 Seed + Push notifications | ✓ |
| Recognition | Phase 1 contextual greeting (10 variants) | ✓ |
| Micro-win | Phase 2 firstAction confirmation ("I've started") | ✓ |
| Closure | Phase 3 counter animation + loop-closed card | ✓ |
| Seed | Phase 3 forward-looking signal | ✓ |

**Visual language consistency:** Color tokens, typography scale, spacing, and motion spec from Phase 1 are correctly inherited in Phase 2 and Phase 3 — with the exceptions noted below.

**Copy tone:** ELI's voice is consistent across all three phases. Rescue mode warmth is maintained from Phase 1 greeting through Phase 2 nudge through Phase 3 close. No tone breaks detected.

**S5 (Burnout) journey:** V1 → P2-R1 → warm empty session → deferred verification → Scenario C/D. Coherent, warm throughout, no pressure at any step.

**S2 (High Pressure) journey:** V3 → P2-R2 → Two-minute timer → "Keep going?" → standard verification. Coherent — *with the one fix below.*

---

## Findings

### Classification

| ID | Severity | Location | Issue |
|---|---|---|---|
| R-01 | **Critical** | Phase 1 V3 | "Make it smaller" tap — sub-state unspecced. Engineers cannot build it. |
| R-02 | **Critical** | Phase 2 entry | No firstAction pattern for retrieval sessions (pending check clearance). |
| R-03 | **Critical** | Phase 2 entry | "Clear one more" → Phase 2 re-entry unspecced. |
| R-04 | **Inconsistency** | Phase 2 (both docs) | Card border radius uses `--radius-md` (12px); Phase 3 cards are 16px. |
| R-05 | **Inconsistency** | Phase 3 verification ask | Screen has no background color spec for any mode variant. |
| R-06 | **Inconsistency** | Phase 3 scenarios | CTA button styles ("Done", "Clear one more") never explicitly stated. |
| R-07 | **Engineering note** | Push notifications | Type 1 deep-link must use stored schedule context, not re-run P3 gate. |
| R-08 | **Engineering note** | Phase 2 | Elapsed timer must reset when new IntentSet fires via "Clear one more". |

---

### R-01 — V3 "Make it smaller" sub-state (Phase 1)

**Issue:** Visual notes for V3 say tapping "Make it smaller" shows a "1 minute, anything CTA" but there is no wireframe, copy, or component spec.

**Fix:** Added a sub-state wireframe and copy to V3 in `04-phase1-variants.md`. See below.

**What it shows:** Card transforms in-place. Greeting collapses to "Just 1 minute. Anything counts." Single CTA: "1 minute, then stop." Footer unchanged. Fires `IntentSet(scope=micro, timeboxMin=1)` which triggers P2-R2 with a 1-minute timebox.

---

### R-02 — Retrieval session variant missing (Phase 2)

**Issue:** When a student taps "Clear 1 first" or a pending item, `IntentSet` fires for a **retrieval session**, not a new learning session. The Phase 2 firstAction pattern "Start with Problem Set A, Q1-3 only" is wrong here. The student already studied this topic — they need to do 1 question to prove recall, not start fresh.

**Fix:** Added a dedicated section "Pending Check Clearance (Retrieval Mode)" to `01-activation-entry.md`.

**What's different:** The firstAction is retrieval-specific ("Do 1 question from [topic]. In your head or on paper."). After tapping "I've done it", the screen does NOT go to active session — it goes **directly to the Phase 3 verification ask**. This is a retrieval loop, not a study session.

This is the S7 loop — clear a pending check, see the counter drop, possibly "Clear one more." The entire action takes ~5 minutes as intended.

---

### R-03 — "Clear one more" → Phase 2 re-entry (Phase 2)

**Issue:** When the student taps "Clear one more" in Phase 3 Scenario A, a new `IntentSet` fires for the next pending topic. Phase 2 activates again. But the existing 7 P2 plays don't cover this mini-loop re-entry.

**Fix:** Added an "R-03" section to `01-activation-entry.md` specifying this re-entry uses the same Retrieval Mode pattern (same as R-02) — the firstAction fires for the next pending topic, the student does 1 question, and goes straight to Phase 3 again without an active session.

---

### R-04 — Card border radius inconsistency (Phase 2)

**Issue:** Phase 2 activation entry and nudge cards specify `--radius-md` (12px). Phase 3 close cards explicitly state 16px (`--radius-lg`). All primary cards across the product should use `--radius-lg`.

**Fix:** Updated `01-activation-entry.md` and `02-active-session.md` to replace `--radius-md` with `--radius-lg` (16px) in all card design notes.

---

### R-05 — Verification ask background colors (Phase 3)

**Issue:** The verification ask screen has 4 mode variants (standard/short/long/rescue) but no background color is specified for any of them. Without this, implementation defaults to `--color-bg` for all modes, which is wrong for Rescue.

**Fix:** Added to Phase 3 `01-verification-ask.md` component spec:
- `rescue` mode → `--color-bg-rescue`
- `standard` / `short` / `long` modes → `--color-bg`

---

### R-06 — Phase 3 CTA button styles (Phase 3)

**Issue:** "Done for today", "Done", "Clear one more" appear in all 7 Phase 3 scenarios but their button styles are never stated — only copy labels in brackets. Engineers referencing only Phase 3 docs would have no style guidance.

**Fix:** Added a CTA button style spec to the Shared Rules section of `03-phase3-scenarios.md`, explicitly referencing Phase 1 button spec values:
- Primary ("Done for today", "Done"): `--color-accent` fill, 48px height, `--radius-lg`
- Secondary ("Clear one more"): outline, `--color-border-strong`, 44px height, `--radius-lg`

---

### R-07 — Push notification Type 1 deep-link (Engineering note)

**Issue:** When a student taps the 24h verification reminder notification, the app must open using the stored `VerificationDecisionIssued(ScheduleVerify)` context — not trigger a fresh P3 gate evaluation. The gate already ran. Re-running it could produce a different decision (e.g., if the student's state has changed).

**Engineering note:** The deep-link must pass `{ topic, scheduledAt, decision: 'ScheduleVerify' }` as route params. The verification ask screen reads this directly and renders without calling the P3 gate.

---

### R-08 — Elapsed timer resets on "Clear one more" re-entry (Engineering note)

**Issue:** Not stated anywhere. When a new `IntentSet` fires via "Clear one more", the context bar elapsed timer must reset to 0:00 — it is tracking the current session, not cumulative study time.

---

## Archetype Check (Post-Review)

| Archetype | Phase 1 | Phase 2 | Phase 3 | Coherent? |
|---|---|---|---|---|
| S1 Topper | V7 Challenge → | P2-B2 Hard-first → | Long session verify, Scenario A | ✓ |
| S2 Revenge Planner | V3 High Pressure → | P2-R2 Two-minute → | Rescue verify, Scenario A/B | ✓ (with R-01 fix) |
| S3 Stalled Starter | V2 Low Energy → | P2-R1 Micro-start → | Short session, Scenario B likely | ✓ |
| S4 Flowing-but-Avoidant | V5 Pending Standard → | Retrieval mode → | Scenario A, counter drop | ✓ (with R-02 fix) |
| S5 Burnout | V1 Silence Re-Entry → | P2-R1 → empty session → | Rescue verify, Scenario C/D | ✓ |
| S6 Grinder | V4 Clean Start → | P2-N1 Standard → | Long session, Scenario A | ✓ |
| S7 Ambitious | V8 Clear-Then-Challenge → | Retrieval mode → | Scenario A → "Clear one more" loop | ✓ (with R-02, R-03 fixes) |

---

## Status

All 6 design gaps (R-01 through R-06) are **fixed in their source documents**. See the modified files:

- `docs/phase1-design/04-phase1-variants.md` — R-01
- `docs/phase2-design/01-activation-entry.md` — R-02, R-03, R-04
- `docs/phase2-design/02-active-session.md` — R-04
- `docs/phase3-design/01-verification-ask.md` — R-05
- `docs/phase3-design/03-phase3-scenarios.md` — R-06

Engineering notes R-07 and R-08 require no doc change — communicate during hand-off.

---

*Design is ready for engineering hand-off. Phase 1 first.*
