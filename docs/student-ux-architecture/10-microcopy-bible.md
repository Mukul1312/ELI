# The Microcopy Bible — Every Word Matters

In a Server-Driven UI app, copy IS the interface. The student never sees a custom screen — they see text and buttons assembled by the ViewComposer. The exact words in those text blocks and button labels determine whether S5 stays or closes the app, whether S2 starts or freezes. This document is the definitive reference for what ELI says and what ELI never says.

---

## 1. Tone Grammar Rules

These rules apply to every piece of copy that surfaces through the ViewComposer, regardless of which domain generated it.

1. **Active voice, second person ("you"), present tense.**
   Write "you still start" — not "you have been starting" or "starting has been observed."

2. **Maximum 2 sentences per message block.**
   Shorter in Rescue mode — often 1 sentence or a fragment. If you need a third sentence, split it into a second card.

3. **No questions in Rescue mode.**
   Questions add cognitive load to someone who is already struggling. A student in Rescue mode needs direction, not choices that require evaluation.

4. **Questions are okay in Neutral/Boost.**
   "What are you working on today?" is fine when the student has energy and no risk signals.

5. **"Deal" framing for constraints — choice, not command.**
   "Deal: clear 1 first, then go big." The word "Deal" signals negotiation, not instruction.

6. **Contractions are fine.**
   "you're", "that's", "let's" — sounds like a person, not a system. Avoid full forms ("you are", "that is") unless emphasis is needed.

7. **Exclamation marks: never in Rescue, sparingly in Neutral, only in Boost for genuine enthusiasm.**
   If the exclamation mark could be removed without losing meaning, remove it.

8. **Numbers in copy: use words for 1-3 ("one", "two", "three"), digits for 4+ ("4 checks").**
   Exception: when the number is the focal point of the message ("You have 2 pending checks"), digits are acceptable for any count.

---

## 2. Copy Patterns per Emotional State

Every message the student sees is shaped by their current emotional state. The table below defines the tone, opening patterns, and CTA patterns for each state.

| State | Mode | Tone keywords | Opening pattern examples | CTA pattern examples |
|---|---|---|---|---|
| Low energy (1-2) | Rescue | Short, warm, no questions | "No speeches." / "Keep it tiny." / "One small thing." | "5-minute win" / "Just 1 check" |
| High pressure (>=4) | Rescue | Calm, scope-reducing, validating | "Your drive is real. But today's pressure is high." / "Pressure day. Smaller = better." | "Start 2 minutes, then decide" / "Make it smaller" |
| Silence re-entry (>=3 days) | Rescue | Warm, gap-invisible, dignity-first | "Welcome back." / "Hey. No speeches." / "Hey." | "5-minute win" |
| Normal / steady | Neutral | Conversational, 1 nudge + 1 choice | "You have X pending checks." / "Ready to go." | "Clear 1 first, then go big" / "Start your session" |
| High energy, no risk | Boost | Challenging, raises bar, celebrates | "You're fully charged." / "Clean slate." | "Let's raise the bar" / "Hard practice" |
| Personalization (Day 14+) | Any | Observational, reflective | "When you pick [Label], [observed pattern]." | (same CTA as current state) |

**Notes on the table:**

- "Silence re-entry" overrides all other states. If the student has been gone for 3+ days, Rescue mode applies regardless of energy or pressure readings.
- "Personalization" is a modifier, not a standalone state. It layers observational copy on top of whatever mode is active.
- The opening pattern and CTA pattern are assembled independently. Any opening can pair with any CTA from the same mode row.

---

## 3. The Deal Card Copy Pattern

The deal card is used when ELI needs to impose a constraint (usually close-loops-first). It ALWAYS frames the constraint as a choice.

### Template

> "[Observation]. Deal: [constraint framed as offer]."

### Examples

- "You have 3 pending checks. Deal: clear the oldest one first, then go big."
- "You're working hard. But 3 things are waiting. Deal: close one first (5 min), then anything else."
- "Your ambition is real. Deal: 1 pending check before the new topic."

### Rules

| Rule | Rationale |
|---|---|
| Both buttons must be valid choices — no "wrong" button | If one option is clearly punished, it is not a deal; it is coercion. |
| The deal framing makes the constraint feel negotiated, not imposed | The student retains agency. The system suggests; the student decides. |
| Never show more than one deal card per session | Multiple deals feel like a lecture. One deal per session preserves the negotiation frame. |
| The word "Deal" must appear in the copy | It creates a reciprocal social contract. Without the word, the constraint feels like a command. |
| The observation sentence must be true and specific | "You have 3 pending checks" — not "You have some things pending." Vagueness erodes trust. |
| The offer side must include a time or scope anchor | "5 min", "1 check", "the oldest one" — something concrete the student can evaluate. |

---

## 4. SessionEnd & Phase 3 Copy Patterns

When a session ends, the student sees one of the following lines based on their choice. Each line is calibrated to validate the decision without adding pressure.

### Deferrals & Skips

| Student's choice | Copy line | Tone | Notes |
|---|---|---|---|
| Do 1 question now (2 min) | "Quick check so this session counts." | Casual, non-threatening | The "counts" framing validates the effort |
| Remind me tomorrow (24h) | "Locked in. Tomorrow at this time." | Confirmatory | Specific time creates commitment |
| Skip (Time) | "Noted. Short day." | Neutral, no judgment | 2 words of acknowledgment |
| Skip (Fatigue) | "Noted. Rest is part of the plan." | Warm, validating | Validates fatigue as a real constraint |
| Skip (Confusion) | "That's okay. Different approach next time." | Supportive, forward-looking | The only skip that hints at future change |

**Design principle:** Every skip reason gets exactly one short acknowledgment. No follow-up. No "are you sure?" No guilt. The student made a choice; the system respects it.

### First Encounter Override

When the student completes a Practice or Revise session on a topic that is new to ELI.

| Element | Copy | Tone / Notes |
|---|---|---|
| Prompt | "First time practicing/revising this here. Want ELI to schedule a revisit?" | Respects reality without assuming they want tracking for a potentially one-off session. |
| Button: Accept | `[Yes, schedule it]` | Clear action. Creates a revisit and starts tracking. |
| Button: Reject | `[No, skip]` | Clear action. Logs session without adding to pending list. |

---

## 5. Forward-Looking Signal Copy (The "Seed")

After session close, ELI may plant a forward-looking signal — a small phrase that creates anticipation for the next session without adding pressure.

| Phase 3 outcome | Seed copy | Why this works |
|---|---|---|
| Verification completed | "[X] checks left this week — you're ahead." | Specific count + positive framing creates curiosity |
| 24h reminder set | "See you tomorrow." / "Tomorrow at this time." | Time anchor creates mild commitment |
| Skip (any reason) | (no seed — nothing) | Don't add pressure after a skip. Silence IS the appropriate response. |
| Pending = 0 | "Everything you've studied, you've also proved. That's rare." | Identity statement replaces seed |
| First verification ever | (no seed — teaching moment is enough) | Don't overwhelm the first close |

**Rules for seeds:**

- Seeds are optional. If the session was heavy (Rescue mode throughout), skip the seed entirely.
- Seeds never reference the past. They point forward or state the present.
- Seeds are always 1 sentence. If it needs 2 sentences, it is not a seed — it is a message block.

---

## 6. Banned Phrases (with Better Alternatives)

This is the most important section. Every phrase in the "Never say" column has been observed to cause dropout, uninstall, or trust breakdown in similar products.

| Never say | Why it fails | Say instead |
|---|---|---|
| "You missed X days" | Shame; quantifies failure; S5 uninstalls | "Welcome back." |
| "You're falling behind" | Judgment; triggers S5 spiral | (nothing — just lower the bar silently) |
| "You need to verify more" | Lecture tone; feels like school | "Quick check so this session counts." |
| "Great job!" / "Amazing!" / "Awesome!" | Patronizing; students sense falseness from an AI | "Loop closed." / "That's rare." / "Good session." |
| "You should sleep more" | Obvious; adds guilt about something they can't control tonight | (reduce scope silently based on sleepBucket) |
| "Don't worry" / "Calm down" | Minimizing; invalidates pressure; S2 feels dismissed | "Your drive is real." |
| "You still have X pending" (in Phase 3) | Pressure after a session; ruins the Closure beat | Show the count going DOWN, or nothing |
| Any streak count ("7-day streak!") | Any broken streak punishes gaps; S5 sees "0 days" and quits | (never show streaks of any kind) |
| "You need to be more consistent" | Meta-judgment; the student knows this already | (adjust defaults silently; show consistency when it's there) |
| "Let's get back on track" | Implies they were off track; shame adjacent | "Welcome back." / "One small thing." |
| "You've been doing well!" (after silence) | Reveals that the system noticed the absence; feels surveilled | (say nothing about the past; focus on now) |
| "Your peers are..." / "Other students..." | Social comparison; privacy violation; competitive pressure | (never reference other students) |

### Why banning matters more than writing

A single banned phrase can undo weeks of trust-building. The ViewComposer must enforce these bans at the assembly layer — no domain service should be able to inject a banned phrase into a rendered view. Consider this list a compile-time constraint, not a style suggestion.

---

## 7. Identity Statement Library

These are the specific statements used in identity moment cards (see [08-footer-and-identity.md](./08-footer-and-identity.md)) and in the footer expanded view.

| Pattern | Statement | When triggered |
|---|---|---|
| High integrity, consistent (S7 resolved) | "You're not just studying — you're closing the loop." | verificationRate >= 0.75, pending decreased |
| Re-engaged after silence (S5 resolved) | "You came back. That matters." | silenceDays was >=3 recently, now >=4 sessions in 7d |
| Pressure + consistent starts (S2 resolved) | "Pressure days don't break you anymore — you still start." | >=2 high-pressure sessions with completed verification |
| Technique improved (S6 resolved) | "You're studying differently now. It shows." | TaskType shifted from learn to practice/revise |
| First topper pattern (S1) | "Clean slate. That's earned." | pending=0, verificationRate >= 0.90 |
| Stall overcome (S3 resolved) | "You started. That's the hardest part." | StartLatencyMin decreased over 14 days |
| Generic improvement (fallback) | "Consistency is harder than intensity. You're proving that." | Meets identity conditions, no specific pattern |
| Zero pending milestone | "Everything you've studied, you've also proved." | pendingChecks = 0, >=3 sessions in 7d |

### Copy rules for identity statements

1. **Second person ("you"), present tense ("you still start").**
   Never "you used to..." — no past tense framing. The student is defined by what they are doing now, not what they failed to do before.

2. **Maximum 1 sentence (or 2 very short clauses).**
   Identity statements are mirrors, not essays. If the statement needs explanation, it is not an identity statement.

3. **The statement must be TRUE based on data — never aspirational.**
   "You're closing the loop" is only shown when verificationRate >= 0.75. If the data does not support the statement, the statement does not appear. Lying to the student destroys trust permanently.

4. **The student should feel like looking in a mirror, not receiving a report card.**
   The difference: a mirror shows you who you are. A report card tells you how you scored. Identity statements reflect behavior patterns; they do not evaluate performance.

5. **No superlatives ("best", "most", "top").**
   Superlatives invite comparison. Identity statements are about the individual, not their rank.

6. **No temporal comparisons ("more than last week", "better than before").**
   Temporal comparisons require the student to remember the past. The statement should stand alone in the present moment.

---

## Cross-Reference

- Phase 1 copy assembly: [05-phase1-the-open.md](./05-phase1-the-open.md)
- Phase 2 session copy: [06-phase2-the-session.md](./06-phase2-the-session.md)
- Phase 3 closure copy: [07-phase3-the-close.md](./07-phase3-the-close.md)
- Footer and identity cards: [08-footer-and-identity.md](./08-footer-and-identity.md)
- Escalation arc (when copy shifts modes): [09-escalation-arc.md](./09-escalation-arc.md)
- Next doc: [11-archetype-experience-map.md](./11-archetype-experience-map.md)
