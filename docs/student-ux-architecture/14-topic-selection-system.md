# Topic Selection System — From Free Text to Structured Curriculum

> Today `topic` is a raw string everywhere — events, signals, view-composer. Students type "thermo", "Thermodynamics", "thermodynamics ch 5" and EI treats them as three different loops. This doc specifies the topic selection system in two stages: a structured curriculum tree (now) and graph edges (post-PMF).
>
> **Naming note:** "Stage" refers to the topic selection evolution. "Phase 1/2/3" always refers to the app phases (The Open / The Session / The Close).

---

## Why This Matters

Three compounding problems grow worse with every student onboarded:

1. **Typing friction.** "Thermodynamics" is 14 characters of academic jargon on a phone keyboard. Students abbreviate, misspell, or avoid typing altogether.
2. **Normalization chaos.** The same concept gets 5 string representations. Loop health, pending checks, `AvoidanceLatency(subject)`, and `TMS(topic)` all break on fuzzy matches.
3. **Analytics blindness.** Without stable topic identifiers, institute-level insights (Subject Avoidance alerts, cohort coverage reports) are unreliable.

The EI spec already assumes stable `topicId` in signals (`ei_topic_state.topicId`). Today that ID is whatever the student typed, lowercased.

---

## Design Principles

1. **Never block the student.** The catalog must allow free-text fallback. If the catalog doesn't have what the student needs, they type it and move on. Zero friction added.
2. **Recent topics first.** Most students cycle through 3-5 topics. Showing recent topics as 1-tap chips kills the majority of typing before any catalog exists.
3. **One input moment.** Topic selection happens once per session — in Phase 1 (The Open). Phase 2 and Phase 3 display the selected topic but never ask for it again.
4. **Catalog is shared, selection is private.** The curriculum tree is a shared reference (potentially institute-provided). Which topics a student selects, how often, and their loop health — that stays behind the Swiss Bank privacy boundary.
5. **Browse is scoped, search is not.** Institute students browse their curriculum tree. But type-ahead search always covers the full catalog — the student knows what they want, never hide results.

---

## Current State (What Exists Today)

```
Phase 1 (The Open):
┌─────────────────────────────────────┐
│  What are you studying?             │
│  [________________________]         │  ← text-input component
│  e.g. Thermodynamics, Organic...    │     inputId: 'topic'
│                                     │     type: z.string()
└─────────────────────────────────────┘
```

- **SDUI component:** `text-input` with `inputId: 'topic'` (view-composer.ts:994-1002)
- **Event schema:** `topic: z.string()` in `IntentSet`, `SessionEnd`, `RetrievalVerified`, `RetrievalScheduled`, `RetrievalSkipped`, `VerificationCompleted`, `FirstActionStarted`, `Replan`
- **Signals schema:** `topicId: z.string()` in `TopicState` — same raw string, no UUID
- **Pending items:** Displayed as `Topic name . X days ago` — shows whatever was typed

**Bypass path:** Tapping a pending item in the list fires `IntentSet` directly for that topic, skipping the text input entirely. This path is already friction-free and needs no change.

---

## Stage 1 — Curriculum Tree + Topic Picker (Ship Now)

> **Goal:** Replace free-text topic input with a structured curriculum tree, type-ahead search, and recent topic chips — all in one implementation. Stable TopicIds in all events. Institute-scoped browsing.

### The Topic Picker

The new `topic-input` component combines three interaction modes into a single input:

1. **Recent topics** — 1-tap chips for previously used topics (kills 70% of typing)
2. **Type-ahead search** — autocomplete from the full catalog as the student types
3. **Browse** — drill-down tree for structured exploration

```
┌─────────────────────────────────────┐
│  What are you studying?             │
│  [________________________] [Browse]│  ← type-ahead + browse button
│                                     │
│  Recent:                            │
│  [ Thermodynamics ]  [ Integration ]│  ← 1-tap chips
│  [ Organic Chemistry ]              │
└─────────────────────────────────────┘
```

All three modes resolve to the same output: a `topicId` (stable UUID) and `topicName` (display string) from the curriculum catalog.

---

### Recent Topics

Below the input, show the student's last 3-5 distinct topics as tappable chips.

**UX Rules:**


| Rule               | Detail                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Source**         | Last 5 distinct topics from the student's `ei_topic_state`, ordered by `updatedAt` DESC                                                           |
| **Deduplication**  | By `catalogTopicId`. If the student typed "thermo" last time and it resolved to the Thermodynamics catalog entry, the chip shows "Thermodynamics" |
| **Tap behavior**   | Sets the topic input value to the chip text. Does NOT auto-submit — student still confirms with the Phase 1 CTA                                   |
| **Display format** | Pill chips, single line wrapping to second row if needed                                                                                          |
| **Hidden when**    | First-ever open (no history), or when pending items list has >= 3 items (pending items already serve as topic shortcuts)                          |
| **Position**       | Below the text input, above the energy scale                                                                                                      |
| **Label**          | "Recent:" in `--color-text-tertiary`, 12px, weight 400                                                                                            |


**Chip Styling:**

```
Background:   --color-surface
Border:       1px solid --color-border
Radius:       20px (fully rounded pill)
Padding:      6px 14px
Font:         14px, weight 400, --color-text-primary
Tap state:    background → --color-accent-soft, border → --color-accent (150ms ease)
Gap:          8px between chips
```

**Variant Interaction:**


| Phase 1 Variant           | Recent Topics Shown? | Reason                                                   |
| ------------------------- | -------------------- | -------------------------------------------------------- |
| SILENCE RE-ENTRY (V1)     | Yes                  | Reduces typing friction for fragile re-entry             |
| LOW ENERGY (V2)           | Yes                  | Less typing = less effort                                |
| HIGH PRESSURE (V3)        | No                   | V3 has a fixed scope ("Start 2 minutes"); no topic input |
| CLEAN START (V4)          | Yes                  | Standard flow                                            |
| PENDING + STANDARD (V5)   | Conditional          | Hidden if pending list has >= 3 items                    |
| DEAL CARD (V6)            | No                   | Deal card drives topic selection                         |
| CHALLENGE (V7)            | Yes                  | Student picks what to challenge                          |
| CLEAR-THEN-CHALLENGE (V8) | Conditional          | Hidden if pending list has >= 3 items                    |
| IDENTITY MOMENT (V9)      | No                   | Identity screen has no topic input                       |
| ONBOARDING (V10)          | No                   | No history exists                                        |


---

### Type-Ahead Search

As the student types, matching topics appear as suggestions below the input.

**Suggestion Rules:**


| Rule                   | Detail                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trigger**            | Suggestions appear after 2+ characters typed                                                                                                      |
| **Max shown**          | 5 suggestions maximum                                                                                                                             |
| **Ranking**            | Exact prefix match first, then fuzzy match (Levenshtein distance <= 2), then substring match                                                      |
| **Source priority**    | (1) Student's own recent topics, (2) Catalog entries matching the input                                                                           |
| **Tap behavior**       | Replaces input value with the selected topic. Suggestions list closes                                                                             |
| **Dismiss**            | Tapping outside the suggestions list or pressing the CTA closes suggestions                                                                       |
| **Free-text fallback** | If the student ignores suggestions and submits custom text, it works. The custom text is queued for normalization (see Normalization Queue below) |
| **Empty state**        | If no matches found, show nothing — do NOT show "No results" (that feels like rejection)                                                          |


```
┌─────────────────────────────────────┐
│  What are you studying?             │
│  [ther___________________]          │  ← typing triggers suggestions
│                                     │
│  ┌─────────────────────────────────┐│
│  │  Thermodynamics       (JEE)    ││  ← tap to select
│  │  Thermal Expansion    (NEET)   ││
│  │  Theory of Relativity (JEE)    ││
│  └─────────────────────────────────┘│
│                                     │
│  Recent:                            │
│  [ Integration ]  [ Optics ]        │
└─────────────────────────────────────┘
```

**Suggestion Item Styling:**

```
Background:   --color-surface
Border:       1px solid --color-border (bottom only, except last item)
Padding:      12px 14px
Font:         15px, weight 400, --color-text-primary
Highlight:    matched characters in --color-accent, weight 500
Exam badge:   12px, weight 400, --color-text-tertiary, right-aligned
Tap state:    background → --color-bg (100ms)
Container:    --radius-lg (16px) on suggestion list, --shadow-card
Max height:   5 items, then scroll (unlikely given 5-item cap)
```

#### Institute-Aware Search Ranking

When a student belongs to an institute cohort, search results prioritize their institute's curriculum but never hide general catalog results:

1. Exact prefix match from **institute curriculum** (highest priority)
2. Exact prefix match from **general catalog**
3. Fuzzy/substring match from **institute curriculum**
4. Fuzzy/substring match from **general catalog**

A subtle exam badge (e.g. `(JEE)`, `(NEET)`) appears right-aligned in each suggestion row so the student knows where the topic comes from. Institute curriculum matches and general catalog matches both show their exam badge for consistency.

---

### Browse Tree

Tapping the "Browse" button opens a bottom sheet with the curriculum tree.

**Tree Structure:**

```
Exam (JEE Main / JEE Advanced / NEET / CBSE Board / ICSE Board)
  └── Subject (Physics / Chemistry / Mathematics / Biology)
       └── Unit (Mechanics / Thermodynamics / Organic / ...)
            └── Chapter (Laws of Motion / Chemical Bonding / ...)
                 └── Topic (Newton's Third Law / Hybridization / ...)
```


| Level   | Example            | Typical count   |
| ------- | ------------------ | --------------- |
| Exam    | JEE Main           | 3-5 exams       |
| Subject | Physics            | 4-6 per exam    |
| Unit    | Mechanics          | 5-8 per subject |
| Chapter | Laws of Motion     | 3-6 per unit    |
| Topic   | Newton's Third Law | 3-10 per chapter|


**Leaf selection only.** Students must select a topic (leaf node), not a unit or chapter. This ensures `topicId` is granular enough for loop tracking and verification.

**Browse wireframe:**

```
         taps "Browse"

┌─────────────────────────────────────┐
│  Pick your topic                    │
│                                     │
│  Physics                        >   │
│  Chemistry                      >   │
│  Mathematics                    >   │
│  Biology                        >   │
└─────────────────────────────────────┘

         taps "Physics"

┌─────────────────────────────────────┐
│  < Physics                          │
│                                     │
│  Mechanics                      >   │
│  Thermodynamics                 >   │
│  Waves & Optics                 >   │
│  Electrostatics                 >   │
│  Modern Physics                 >   │
└─────────────────────────────────────┘

         taps "Thermodynamics"

┌─────────────────────────────────────┐
│  < Thermodynamics                   │
│                                     │
│  . Zeroth Law                       │
│  . First Law & Internal Energy      │
│  . Specific Heat & Calorimetry      │
│  . Second Law & Entropy             │
│  . Carnot Engine                    │
└─────────────────────────────────────┘
```

**Browse UX Rules:**


| Rule                     | Detail                                                                       |
| ------------------------ | ---------------------------------------------------------------------------- |
| **Trigger**              | "Browse" icon/button next to the text input                                  |
| **Presentation**         | Bottom sheet (half-screen), not a new page. Respects one-screen architecture |
| **Navigation**           | Drill-down with back arrow. Breadcrumb shows current path                    |
| **Selection**            | Tapping a leaf topic closes the sheet and fills the input                    |
| **Search within browse** | A search bar at the top of the sheet filters the current level               |
| **Animation**            | Sheet slides up 200ms ease-out. Level transitions slide left/right 150ms     |
| **Dismiss**              | Swipe down or tap outside closes the sheet. No selection made                |


**Browse Styling:**

```
Sheet:
  Background:     --color-bg
  Border-radius:  --radius-lg (16px) top corners only
  Max height:     70vh
  Shadow:         0 -4px 24px rgba(0,0,0,0.08)

List items:
  Padding:        14px 16px
  Font:           15px, weight 400, --color-text-primary
  Chevron:        > icon, --color-text-tertiary (for non-leaf items)
  Bullet:         filled circle, --color-accent (for leaf items)
  Tap state:      background → --color-surface (100ms)
  Divider:        1px --color-border between items

Back button:
  < icon + level name, --color-accent, 14px weight 500
  Padding:        12px 16px
```

---

### Institute-Scoped Browse

When a student belongs to an institute cohort, the browse sheet shows **their institute's curriculum tree as the default view**.

**How it works:**

1. On `AppOpen`, the system resolves the student's cohort via CohortAccess
2. CohortAccess provides the `instituteId` (if any) — self-serve students have `instituteId: null`
3. ViewComposer passes `instituteId` to the browse sheet component
4. The browse sheet queries the curriculum catalog filtered by `instituteId`

**What the student sees:**

```
Institute student (JEE cohort):            Self-serve student:

┌──────────────────────────────┐         ┌──────────────────────────────┐
│  Pick your topic             │         │  Pick your topic             │
│                              │         │                              │
│  Physics               >    │         │  JEE Main                >   │
│  Chemistry             >    │         │  JEE Advanced            >   │
│  Mathematics           >    │         │  NEET                    >   │
│                              │         │  CBSE Board              >   │
│                              │         │  ICSE Board              >   │
│  Exam is pre-set (JEE Main)  │         │  Student picks exam first    │
└──────────────────────────────┘         └──────────────────────────────┘
```

**Key difference:** Institute students skip the exam level entirely. Their institute has already declared "we prepare for JEE Main", so the browse starts at the subject level. Self-serve students see exams as the first level and pick their own.

**Edge cases:**


| Scenario                                                                | Behavior                                                                                                                                                                          |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Institute uploaded partial curriculum (only Physics + Chemistry)        | Browse shows only those 2 subjects. Other subjects accessible via type-ahead search (search is never restricted)                                                                  |
| Student transfers between cohorts mid-year                              | Browse tree updates on next AppOpen to reflect new institute's curriculum. Recent topics and pending checks remain unchanged — they reference stable TopicIds, not tree positions |
| Institute hasn't uploaded any curriculum yet                            | Browse falls back to the full general catalog (same as self-serve). No empty state                                                                                                |
| Student is in institute cohort but wants a topic outside the curriculum | Uses type-ahead search. Browse is scoped; search is not                                                                                                                           |


### Full Catalog Search (Not Restricted to Institute)

The type-ahead search bar is **never restricted** to the institute's curriculum. It always searches the entire catalog across all exams and subjects.

**Why search is unrestricted while browse is scoped:**

- **Browse is for structured exploration** — "What topics exist in my syllabus?" The student expects to see their curriculum, not every topic in every exam. Showing NEET topics to a JEE student in browse creates confusion.
- **Search is for intent** — "I want to study X." The student already knows what they want. Blocking them because their institute didn't upload that topic violates the "never block the student" principle.

**What this looks like in practice:**

```
Institute student (JEE cohort) types "rela" in search:

┌─────────────────────────────────────┐
│  What are you studying?             │
│  [rela___________________]          │
│                                     │
│  ┌─────────────────────────────────┐│
│  │  Relative Motion      (JEE)    ││  ← from institute curriculum
│  │  Relations & Functions (JEE)   ││  ← from institute curriculum
│  │  Relativity           (NEET)   ││  ← from general catalog
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

Institute curriculum matches rank higher, but general catalog matches are never hidden.

**What happens when an institute student selects a topic outside their curriculum:**

- The selection works normally. `IntentSet` fires with the selected `topicId`
- Loop tracking, pending checks, and verification all work identically
- The topic appears in the student's recent topics list going forward
- **Institute Radar does NOT flag this as anomalous.** A student studying something outside their syllabus is not a risk signal — it's agency

**Privacy boundary (Swiss Bank):** Institutes never see which specific out-of-curriculum topics a student selected. They only see aggregate signals like "5% of sessions in this cohort used topics outside the uploaded curriculum" — a data quality signal for the institute to upload missing topics, not a student behavior alert.

---

### Institute Curriculum Import

For B2B onboarding, institutes provide their curriculum as a structured file (CSV or JSON).

**Import flow:**

1. Institute admin uploads curriculum file via admin panel
2. System maps it to the tree structure (Exam > Subject > Unit > Chapter > Topic)
3. Each topic gets a stable UUID — if a topic already exists in the general catalog (e.g. "Thermodynamics" under JEE Physics), it reuses the existing UUID rather than creating a duplicate
4. The uploaded tree is tagged with `instituteId` so it can be filtered for cohort-scoped browsing
5. Topics from the upload that don't exist in the general catalog are added to it — the general catalog grows as institutes onboard

**File format (CSV example):**

```csv
subject,unit,chapter,topic
Physics,Mechanics,Laws of Motion,Newton's First Law
Physics,Mechanics,Laws of Motion,Newton's Second Law
Physics,Mechanics,Laws of Motion,Newton's Third Law
Physics,Thermodynamics,Zeroth and First Law,Zeroth Law of Thermodynamics
Physics,Thermodynamics,Zeroth and First Law,First Law and Internal Energy
Chemistry,Chemical Bonding,Ionic Bonding,Lattice Energy
Chemistry,Chemical Bonding,Covalent Bonding,Hybridization
```

**Exam is set at the institute level** (e.g. "JEE Main"), not per row. This keeps the CSV simple and avoids repetition.

**Validation rules:**


| Rule                | Detail                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Minimum rows        | At least 10 topics required (prevents accidental partial uploads)                            |
| Duplicate detection | If two rows map to the same leaf topic, deduplicate silently                                 |
| Missing levels      | If a row skips "unit" (e.g. subject → chapter → topic), that's valid — unit becomes implicit |
| Unknown subjects    | Accepted and added to the catalog. The system doesn't enforce a fixed subject list           |


**Privacy note:** The curriculum tree itself is not private data — it's a public syllabus. What's private is which topics the student selects, how often, and their loop health. The Swiss Bank boundary is not affected by shared curriculum data.

---

### Catalog Seeding Strategy

Before any institute uploads, the system ships with a seed catalog:


| Exam                | Subjects                                 | Estimated topics |
| ------------------- | ---------------------------------------- | ---------------- |
| JEE Main            | Physics, Chemistry, Mathematics          | ~120 topics      |
| JEE Advanced        | Physics, Chemistry, Mathematics          | ~80 topics       |
| NEET                | Physics, Chemistry, Biology              | ~100 topics      |
| CBSE Board (11-12)  | Physics, Chemistry, Mathematics, Biology | ~120 topics      |
| ICSE Board (11-12)  | Physics, Chemistry, Mathematics          | ~80 topics       |


**Total seed:** ~500 entries. Curated manually from NCERT chapter lists, NTA syllabus documents, and common competitive exam syllabi. Not generated — reviewed by a domain expert.

**Catalog entry structure:**

```typescript
{
  id: string,          // stable UUID
  name: string,        // display name: "Thermodynamics"
  aliases: string[],   // alternative spellings: ["thermo", "heat transfer"]
  examId: string,      // reference to exam: "jee-main"
  subjectId: string,   // reference to subject: "physics"
  unitId: string,      // reference to unit: "thermodynamics-unit"
  chapterId: string,   // reference to chapter: "zeroth-and-first-law"
}
```

---

### Normalization Queue

When a student submits a free-text topic that doesn't match any catalog entry:

1. Store the raw string as `topic` in the event (no change to current behavior)
2. Log it to a normalization queue: `{ rawText, studentId, occurredAt }`
3. Periodically, a human or automated process reviews the queue:
  - If it matches an existing catalog entry → create an alias mapping
  - If it's a genuinely new topic → add to catalog with a new UUID
4. No retroactive event rewriting. Future events for the same student will benefit from the new alias.

**Important:** This queue is an ops tool, not a student-facing feature. Students never see "did you mean...?" corrections. Their input always works.

---

### SDUI Component

New component type `topic-input` that replaces `text-input` for the topic field:

```typescript
{
  type: 'topic-input',
  props: {
    inputId: 'topic',
    label: 'What are you studying?',
    placeholder: 'e.g. Thermodynamics, Organic Chemistry...',
    required: true,
    recentTopics: [
      { id: 'uuid-1', name: 'Thermodynamics' },
      { id: 'uuid-2', name: 'Integration' },
    ],
    browseEnabled: true,               // show Browse button
    instituteId: 'inst-abc' | null,    // scopes browse tree; null = self-serve
  }
}
```

Suggestions are NOT pre-loaded in the SDUI payload. They are fetched client-side as the student types (debounced, 200ms) via a lightweight search endpoint. This keeps the initial SDUI response small.

**Why a new component (not extending `text-input`):** The tight interaction between input, suggestions dropdown, recent chips, and browse sheet makes them a single component responsibility. Splitting them across sibling components creates coordination complexity.

---

### Schema Migration

This is where `topic: z.string()` in events evolves:

```
Before:
  topic: "thermodynamics"          ← raw string

After:
  topicId: "uuid-abc-123"          ← stable catalog ID (preferred)
  topicName: "Thermodynamics"      ← display name (denormalized for reads)
  topicRaw?: "thermo"              ← original input (kept for audit, optional)
```

**Migration strategy:**

1. New events include both `topicId` (UUID) and `topicName` (display string)
2. Old events retain `topic` (raw string) — no backfill, no rewriting
3. `ei_topic_state` gains a `catalogTopicId` column alongside existing `topicId` (which was the raw string)
4. Queries that join on topic use `catalogTopicId` when available, fall back to string match
5. The normalization queue drives alias mapping: as aliases are created, old `topicId` strings map to `catalogTopicId` UUIDs

---

### What Stage 1 Unlocks

- **Stable analytics:** Loop health, TMS, pending checks all tracked by UUID — no spelling variants
- **Institute Radar:** Subject-level avoidance alerts work reliably (topics grouped by subject)
- **Loop health per subject:** Aggregate `TMS` across topics within a subject
- **Curriculum coverage:** "Student has attempted 12/18 Physics topics" — useful for institute dashboards
- **Cross-student analytics:** "40% of this cohort avoids Thermodynamics" — only possible with stable IDs
- **Pending items show normalized names:** "Thermodynamics" instead of "thermo" in the pending list

---

## Stage 2 — Graph Edges (Post-PMF)

> **Goal:** Cross-topic relationships that power smart routing in Strategic Adjustment and Protocol 1.

### What Changes

Topics gain typed relationships to other topics. The tree structure remains the primary navigation; graph edges add a knowledge layer on top.

### Relationship Types


| Type           | Meaning                                      | Example                         | Used by                                                               |
| -------------- | -------------------------------------------- | ------------------------------- | --------------------------------------------------------------------- |
| `prerequisite` | Must understand A before B makes sense       | Vectors → Projectile Motion     | P1 Ignition: suggest prerequisite if student struggles                |
| `related`      | Conceptually connected, order doesn't matter | Electric Field → Magnetic Field | P1 Ignition: suggest related topic after loop closure                 |
| `builds-on`    | A is foundation, B extends it                | Differentiation → Integration   | Strategic Adjustment: sequence recommendations                        |
| `applies-in`   | A is a tool used within B                    | Trigonometry → Wave Motion      | Phase 3 (The Close) seed: "Next, see how this applies in Wave Motion" |


### UX Impact (Minimal)

Graph edges are **invisible to the student** in direct interaction. They power backend decisions:

- **Phase 1 (The Open) seed text:** "You closed the loop on Vectors. Next natural step: Projectile Motion." (The seed uses the `builds-on` edge to suggest the next topic)
- **P1 Ignition routing:** If a student sets intent for "Projectile Motion" but has never studied "Vectors", P1 might suggest: "Quick foundation check on Vectors first?" (Uses `prerequisite` edge)
- **Strategic Adjustment:** When computing `SubjectAvoidance`, graph edges reveal that avoiding "Vectors" cascades into weakness in "Projectile Motion", "Circular Motion", and "Relative Motion"
- **Institute Radar:** Prerequisite gaps become a signal: "Student skipped foundation topics in Mechanics"

### No Browse UI Change

The browse tree from Stage 1 stays the same. Students do not see or interact with graph edges directly. The edges influence copy, suggestions, and routing — not navigation.

### Edge Data Model

```typescript
{
  fromTopicId: string,    // UUID
  toTopicId: string,      // UUID
  type: 'prerequisite' | 'related' | 'builds-on' | 'applies-in',
  strength: number,       // 0.0-1.0, used for ranking when multiple edges exist
  source: 'curated' | 'inferred',  // curated = human-reviewed, inferred = data-driven
}
```

### Building the Graph


| Source                 | Method                                                                          | Timeline                |
| ---------------------- | ------------------------------------------------------------------------------- | ----------------------- |
| **Curated edges**      | Domain experts annotate prerequisite/builds-on relationships for NCERT syllabus | At Stage 2 launch       |
| **Inferred edges**     | Students who study topic A then study topic B within 48h → weak `related` edge  | After 6+ months of data |
| **Institute-provided** | Institutes can declare prerequisite chains for their curriculum                 | On request              |


**Start small.** Curate edges for 2-3 subjects (Physics, Mathematics) where prerequisite chains are well-known. Do not attempt full graph coverage at launch.

### What Stage 2 Unlocks

- **Smart seeds in Phase 3 (The Close):** "You just proved recall on Differentiation. Integration is the natural next step." — drives the craving loop's Seed beat with a concrete, relevant suggestion
- **Prerequisite guardrails:** P1 can gently redirect when a student attempts an advanced topic without foundations, without blocking them (always allow override)
- **Cascade risk detection:** Strategic Adjustment can flag that a single avoided topic (Vectors) creates downstream weakness in 4 dependent topics
- **Long-term: adaptive study paths** — but that's post-PMF, post-graph, and a separate design

---

## Impact on Existing App Phases

### Phase 1 (The Open)


| What                  | Stage 1                                            | Stage 2              |
| --------------------- | -------------------------------------------------- | -------------------- |
| Topic input component | `topic-input` (type-ahead + recent chips + browse) | No change            |
| Pending items list    | Shows normalized catalog names                     | Shows catalog names  |
| Seed text in greeting | No change                                          | Graph-informed seeds |


### Phase 2 (The Session)


| What        | Stage 1                           | Stage 2 (graph)                         |
| ----------- | --------------------------------- | --------------------------------------- |
| Context bar | Shows topic name (from selection) | Same + may show unit/chapter breadcrumb |
| ELI nudge   | No change                         | Could reference related topics          |


### Phase 3 (The Close)


| What             | Stage 1                      | Stage 2 (graph)                        |
| ---------------- | ---------------------------- | -------------------------------------- |
| Verification ask | Shows topic name             | Same                                   |
| Done screen seed | Can suggest same-unit topics | Suggests prerequisite/builds-on topics |
| Loop closed card | No change                    | No change                              |


---

## Archetype Impact


| Archetype                   | Key benefit                                                 | Stage   |
| --------------------------- | ----------------------------------------------------------- | ------- |
| **S1 Topper**               | Browse to find advanced topics quickly                      | Stage 1 |
| **S2 Revenge Planner**      | Recent topics = instant restart after bad mock              | Stage 1 |
| **S3 Stalled Starter**      | Recent topics remove "what should I study?" paralysis       | Stage 1 |
| **S4 Flowing-but-Avoidant** | Graph edges surface avoided prerequisites                   | Stage 2 |
| **S5 Burnout**              | Recent topics = zero effort to pick topic on low-energy day | Stage 1 |
| **S6 Grinder**              | Browse tree = structured exploration of full syllabus       | Stage 1 |
| **S7 Ambitious Collector**  | Catalog prevents duplicate loops from spelling variants     | Stage 1 |


---

## Anti-Patterns


| Do NOT                                             | Why                                                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Show "No results found" when typing                | Feels like rejection. If no catalog match, silently allow free text                                                |
| Require catalog selection (block free text)        | Violates "never block the student" principle. Catalog is a convenience, not a gate                                 |
| Auto-correct student's topic input                 | "Did you mean Thermodynamics?" is patronizing. Just show suggestions; let them pick or ignore                      |
| Show the full tree on Phase 1 by default           | Browse is opt-in. Default is type-ahead + recent chips. Tree is for exploration, not daily use                     |
| Add topic selection to Phase 2 or Phase 3          | One input moment per session. Topic is set in Phase 1 (The Open). Period                                           |
| Use graph edges to block topic selection           | "You haven't studied Vectors yet" is a suggestion, never a wall. Student always has final say                      |
| Share individual topic selections with institutes  | Swiss Bank boundary. Institutes see subject-level aggregates, never "Riya picked Thermodynamics 3 times this week" |
| Restrict type-ahead search to institute curriculum | Search is intent-driven. The student knows what they want. Never hide catalog results based on cohort              |
| Flag out-of-curriculum topic usage to institutes   | A student studying beyond their syllabus is agency, not anomaly. Only show aggregate curriculum coverage signals   |


---

## Engineering Handoff Notes

This section flags questions and constraints the product design introduces for the engineering team. These are **not** architectural decisions — they are inputs for the engineering team to evaluate against the existing DDD structure.

### What the product needs (for engineering to figure out where it lives)

1. **A curriculum catalog store.** Exams, subjects, units, chapters, topics — with stable UUIDs, aliases, and a search index. Where this lives architecturally (new subdomain? extension of an existing context? a shared kernel?) is an engineering decision.

2. **A search endpoint.** Type-ahead with 200ms debounce, returning max 5 results ranked by prefix → fuzzy → substring. Needs to accept optional `instituteId` for ranking priority (not filtering).

3. **Institute-scoped browse data.** When `instituteId` is present, the browse tree filters to that institute's uploaded curriculum. This interacts with CohortAccess (which provides the `instituteId`).

4. **Normalization queue.** An ops-facing queue of free-text inputs that didn't match catalog entries. Engineering decides whether this is a table, a job queue, or part of an existing ops context.

5. **Schema evolution.** Events currently use `topic: z.string()`. This needs to evolve to `topicId` (UUID) + `topicName` (display string) + optional `topicRaw`. How this migration is handled (dual-write, versioned events, projection backfill) is an engineering decision.

### Questions for the engineering team

- **Subdomain classification:** Is the curriculum catalog a new Supporting subdomain, an extension of DerivedSignals (which already owns `ei_topic_state`), or something else? See [02-subdomains.md](../engineering-ddd-design/02-subdomains.md) for existing classifications.
- **Bounded context boundaries:** Does the catalog warrant its own bounded context, or does it fold into an existing one? What context map patterns apply? See [03-context-map.md](../engineering-ddd-design/03-context-map.md).
- **Institute curriculum ownership:** The import flow interacts with CohortAccess (for `instituteId`). Who owns the curriculum-to-institute mapping?
- **Graph edges (Stage 2):** When graph edges are added, do they belong to the same context as the catalog, or are they a separate concern?
- **Topic ID in events vs projections:** Events are immutable (append-only ledger). Old events will always have `topic: string`. How do projections reconcile old string-based and new UUID-based topic references?

### Product constraints engineering must preserve

- **Free-text fallback always works.** The catalog is a convenience, not a gate. If the student types something not in the catalog, it must still fire `IntentSet` and create a session.
- **Search is never restricted by institute.** Institute scoping applies to browse only. Type-ahead search always covers the full catalog.
- **No retroactive event rewriting.** Old events keep their raw `topic` strings. Normalization happens forward-only.
- **Swiss Bank privacy boundary.** Institutes never see individual topic selections — only aggregate curriculum coverage signals.

---

## Summary: What Ships When


| Stage       | Ships                                                                                               | Prerequisite            | Schema change                                                                 | New component                       |
| ----------- | --------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------- | ----------------------------------- |
| **Stage 1** | Curriculum tree + topic picker (recent chips, type-ahead, browse) + seed catalog + institute import | None                    | Catalog tables, events gain `topicId` UUID + `topicName`, normalization queue | `topic-input`, `topic-browse-sheet` |
| **Stage 2** | Graph edges powering seeds, routing, radar                                                          | Stage 1 + 6 months data | Edge table                                                                    | None (backend only)                 |


---

Cross-references:

- Phase 1 topic input: [05-phase1-the-open.md](05-phase1-the-open.md) (Concrete Examples, topic selection moment)
- Adaptive scope: [05-phase1-the-open.md](05-phase1-the-open.md) (Scope Presentation Redesign — Layer 2/3 adaptive scope depends on stable TopicIds from this doc)
- Phase 2 context bar: [06-phase2-the-session.md](06-phase2-the-session.md) (displays selected topic)
- Phase 3 done screen seeds: [07-phase3-the-close.md](07-phase3-the-close.md) (seed text references topic)
- Implementation map: [13-implementation-map.md](13-implementation-map.md) (SDUI components, data flow)
- Phase 1 design spec: [../phase1-design/04-phase1-variants.md](../phase1-design/04-phase1-variants.md) (variant interaction with topic input)
- EI Spec topic model: [../ei/spec/EI_Spec.md](../ei/spec/EI_Spec.md) Section 4.11 (Multi-Topic Execution Model)
- DDD subdomains: [../engineering-ddd-design/02-subdomains.md](../engineering-ddd-design/02-subdomains.md) (for engineering team reference)
- Context map: [../engineering-ddd-design/03-context-map.md](../engineering-ddd-design/03-context-map.md) (for engineering team reference)
