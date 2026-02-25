# **EI Product Storyboard — S2 (Revenge planning after a bad mock) — Day 1 to Day 21**

This is a **product-readable** storyboard for S2, written in student language.

- **Scale meanings + notation**: see `EI_UX_Scales.md` (use **Label (Number)** everywhere)
- **Gates used**: `AppOpen` → `IntentSet` → `SessionEnd`

**Pending checks** (student term): things you studied but haven’t tested yet.

---

## **Student snapshot**

- Smart and hardworking, but after a bad mock they try to “fix everything today.”
- The trap: high **Pressure** makes them overscope → they freeze → then guilt rises again.

---

## **Storyboard (12 scenes spanning Day 1 → Day 21)**

### **Scene 1 — Day 1 (after bad mock): “I have to cover it all today”**

- **Where**: commute home after mock result
- `**AppOpen` (taps)**:
  - `Energy: Good (4)`
  - (Optional “More context”) `Pressure: Panicky (5)`
- `**IntentSet` (chooses)**:
  - `Topic: Waves`
  - `TaskType: Learn (learn)`
  - `DifficultyTier: Hard (3)`
- **What happens**: they stare at the plan and don’t start.
- **ELI message (calm)**:
  - “Your drive is real. But today’s pressure is high. Let’s make a plan you can actually start.”

### **Scene 2 — Same day: “Make it startable in 2 minutes”**

- `**IntentSet` (ELI reframes the start)**:
  - “We’re not committing to hours. Just start with one tiny step.”
- **Buttons**:
  - `Start 2 minutes (then decide)`
  - `Make plan smaller`
- **Student taps**: `Start 2 minutes (then decide)`
- **Outcome**: they finally begin (momentum > guilt).

### **Scene 3 — Day 1 end: Proof kept tiny (no shame)**

- `**SessionEnd`**: ELI keeps the ask small.
- **Buttons**:
  - `Do 1 question now (2 min)`
  - `Remind me tomorrow (24h)`
  - `Skip (Reason)`
- **Student taps**: `Do 1 question now (2 min)`
- **Visible state**: `Pending checks` stays low (doesn’t start piling up).

### **Scene 4 — Day 2: “Pressure is still high, but I can start”**

- **Where**: evening desk time
- `**AppOpen`**:
  - `Energy: Good (4)`
  - (Optional) `Pressure: Very stressed (4)`
- `**IntentSet**`:
  - `Topic: Algebra`
  - `TaskType: Practice (practice)`
  - `DifficultyTier: Medium (2)`
- **ELI message**:
  - “Pressure day = smaller scope, same integrity. One set, one check.”

### **Scene 5 — Day 2 end: “If not now, lock it in”**

- `**SessionEnd`**:
  - ELI: “Quick check while memory is warm.”
- **Buttons**:
  - `Do 1 question now (2 min)`
  - `Remind me tomorrow (24h)`
  - `Skip (Reason)`
- **Student taps**: `Remind me tomorrow (24h)`
- **Visible state**: `Pending checks: 1` (but time-bound)

### **Scene 6 — Day 3–4: The relapse risk (revenge plan tries to return)**

- **Where**: after seeing backlog / comparing with friends
- `**AppOpen`**:
  - `Energy: Good (4)`
  - (Optional) `Pressure: Uneasy (3)`
- **Student tries**: `DifficultyTier: Hard (3)` + too much scope again.
- **ELI message**:
  - “When pressure rises, big plans make you freeze. Let’s win small today.”
- **Buttons**:
  - `Small win (recommended)`
  - `Keep hard, but shorten it`

### **Scene 7 — Day 5–7: “Pressure ≠ capacity” becomes a habit**

- **Where**: weeknight routine
- `**AppOpen`**: `Energy: Okay (3)` or `Good (4)`
- **ELI behavior**:
  - keeps intent realistic on high-pressure days
  - keeps proof tiny but consistent
- **Visible state**: `Pending checks: 1–2` (bounded)

### **Scene 8 — Day 8–10: Converting guilt into action (practice-first)**

- **Where**: weekend study block
- `**AppOpen`**:
  - `Energy: Good (4)`
  - `Pressure: Uneasy (3)` (optional)
- `**IntentSet**`:
  - `TaskType: Practice (practice)` (default suggestion)
  - `DifficultyTier: Medium (2)` (then stretch later)
- **ELI message**:
  - “Let’s reduce thinking and increase doing. One set now.”

### **Scene 9 — Day 11–12: When time is short**

- **Where**: late night, low time
- `**AppOpen`**: `Energy: Okay (3)`
- `**SessionEnd**`:
  - ELI offers the smallest integrity option.
- **Buttons**:
  - `Do 1 question now (2 min)`
  - `Remind me tomorrow (24h)`
  - `Skip (Time | Fatigue | Confusion)`
- **If student skips**:
  - ELI keeps tone calm and suggests a smaller scope at the next start—ELI does not assign tasks or manage the calendar.

### **Scene 10 — Day 15: Weekly check-in becomes 2 guardrails**

- **Where**: evening start
- **ELI sets two plain rules**:
  - “On pressure days, pick a **smaller scope**.”
  - “End every session with **one tiny check**.”
- **Note**: These are guardrails, not a full weekly plan—ELI does not become a task manager or calendar.

### **Scene 11 — Day 16–18: Autonomy returns**

- **Where**: normal weekday flow
- `**AppOpen`**: `Energy: Good (4)`
- **ELI behavior**:
  - fewer interruptions
  - allows `DifficultyTier: Hard (3)` when the student is calm and consistent

### **Scene 12 — Day 21: Outcome snapshot**

- **What the app shows (student-facing)**:
  - `Pending checks: 1–2` (bounded)
  - “Pressure days don’t break you anymore—you still start.”
- **Student feeling**:
  - less guilt-spiral, more control and consistency

---

## Notes (for product/design)

- This storyboard’s core product insight: **high Pressure can exist with high Energy**, and the fix is to negotiate scope + reduce start friction (not motivate harder).
- Keep proof-of-learning tiny (often 1 question) to prevent “revenge planning” from turning into freezing.

