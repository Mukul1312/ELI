# **EI Product Storyboard — S5 (Burnout runway + silence) — Day 1 to Day 21**

This is a **product-readable** storyboard for S5, written in student language.

- **Scale meanings + notation**: see `EI_UX_Scales.md` (use **Label (Number)** everywhere)
- **Gates used**: `AppOpen` → `IntentSet` → `SessionEnd`

**Pending checks** (student term): things you studied but haven’t tested yet.

---

## **Student snapshot**

- Low energy, high pressure, feeling very behind.
- The trap: avoids opening the app/studying at all → days go silent → guilt grows.

---

## **Storyboard (12 scenes spanning Day 1 → Day 21)**

### **Scene 1 — Day 1: “I can’t do this today”**
- **Where**: late evening, exhausted
- **`AppOpen` (taps)**:
  - `Energy: Low (2)`
  - (Once/day add-on) `Sleep: Sleep-debt (<6h)`
  - (Optional “More context”) `Pressure: Very stressed (4)`
  - (Conditional add-on) `BacklogPressure: Drowning (5)`
- **`IntentSet`**:
  - `Topic: Trigonometry`
  - `TaskType: Practice (practice)`
  - `DifficultyTier: Easy (1)`
- **What happens**: they still don’t start.
- **ELI message (very gentle)**:
  - “No speeches. Let’s keep it tiny. Just one small step today.”

### **Scene 2 — Day 2–3: Silence without punishment**
- **Where**: student doesn’t open the app
- **What ELI does**:
  - minimal pressure (no spam)
  - waits for the next natural moment (next open)
- **Risk reality (student-facing)**:
  - silence usually means sleep + pressure + backlog are colliding.

### **Scene 3 — Day 4: Re-entry is a 5-minute win**
- **Where**: opens app again after a gap
- **`AppOpen`**:
  - `Energy: Low (2)`
  - (Optional) `Pressure: Uneasy (3)`
- **ELI message**:
  - “Welcome back. Today is not a comeback story. It’s a **5-minute win**.”
- **Buttons**:
  - `5-minute win (recommended)`
  - `I can do more`

### **Scene 4 — Day 4: Make the start impossible to refuse**
- **`IntentSet`** (student chooses the tiniest version):
  - `TaskType: Revise (revise)` or `Practice (practice)` (either is fine)
  - `DifficultyTier: Easy (1)`
- **ELI instruction style**: framed as an option, not an order:
  - “Open one page / solve just Q1 / write 3 key points.”

### **Scene 5 — Day 4 end: Proof is tiny, not a test**
- **`SessionEnd`**:
  - ELI: “Just one quick check. Not a test.”
- **Buttons**:
  - `Do 1 question now (2 min)`
  - `Remind me tomorrow (24h)`
  - `Skip (Time | Fatigue | Confusion)`
- **Student taps**: `Do 1 question now (2 min)` (or picks a 24h reminder)
- **Visible state**: `Pending checks` stops rising.

### **Scene 6 — Day 5–7: Protect sleep, keep dignity**
- **Where**: short evening windows
- **`AppOpen`**:
  - `Energy: Low (2)` or `Okay (3)`
  - (Once/day) `Sleep: Low sleep (6–7h)` (slowly improving)
- **ELI behavior**:
  - keeps the plan small
  - doesn’t push “Hard” days
- **Student feeling**:
  - “I didn’t collapse today. That counts.”

### **Scene 7 — Day 8–10: Pending checks become bounded**
- **Where**: student is back to opening the app
- **`AppOpen`**: `Energy: Okay (3)`
- **ELI message**:
  - “One pending check first, then anything else.”
- **Buttons**:
  - `Clear 1 pending check (5 min)`
  - `Start new topic`
- **Student taps**: usually clears 1 first.

### **Scene 8 — Day 11–12: When skipping happens, it stays safe**
- **Where**: a bad day returns
- **`AppOpen`**: `Energy: Low (2)`
- **`SessionEnd`**:
  - student chooses `Skip (Fatigue)` sometimes
- **What ELI does**:
  - keeps tone calm
  - suggests a smaller scope at the next start—ELI does not assign tasks or manage the calendar.

### **Scene 9 — Day 14: Light personalization without pressure**
- **Where**: opens app after a few stable days
- **`AppOpen`**: `Energy: Okay (3)`
- **UI micro-hint (example)**:
  - “When you pick **Okay (3)**, a **short block + 1 check** works best.”

### **Scene 10 — Day 15: Weekly recovery guardrails**
- **Where**: evening start
- **ELI sets two plain rules**:
  - “Sleep first. Keep sessions short.”
  - “Do **one tiny check** at the end.”
- **Note**: These are guardrails, not a full weekly plan—ELI does not become a task manager or calendar.

### **Scene 11 — Day 16–18: Autonomy returns slowly**
- **Where**: student begins choosing their own topics again
- **`IntentSet`**:
  - `TaskType: Practice (practice)` becomes more common
  - `DifficultyTier: Medium (2)` appears occasionally
- **ELI behavior**:
  - fewer prompts
  - still protects against piling up pending checks

### **Scene 12 — Day 21: Outcome snapshot**
- **What the app shows (student-facing)**:
  - “You came back.”
  - `Pending checks: bounded` (not exploding)
- **Student feeling**:
  - less fear of opening the app, more steady re-engagement

---

## Notes (for product/design)

- S5’s core product insight: **too many prompts can cause dropout**. Re-entry must be tiny, calm, and dignity-preserving.
- Keep the end-of-session check minimal (often 1 question) or use a strict 24h reminder when time/energy is low.

