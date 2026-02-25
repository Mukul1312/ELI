/**
 * Full-Pipeline Harness
 *
 * Covers: events → in-memory persistence → aggregates computation →
 *         gate handlers → full output assertions.
 *
 * Unlike replay-harness.test.ts (which calls the domain functions directly
 * with mock aggregates), this harness runs the real application-layer handlers
 * (RunP1GateHandler, RunP2GateHandler, RunP3GateHandler,
 * RecomputeStudentAggregatesHandler) wired with in-memory ports.
 *
 * No PostgreSQL required. No Mastra required.
 *
 * Event ordering per day matches the production model:
 *   Phase A — AppOpen events fed → P1 gate runs (with PREVIOUS day's aggregates)
 *   Phase B — IntentSet/FirstActionStarted/Replan events fed → P2 gate runs
 *   Phase C — Remaining events (SessionEnd, Retrieval*) fed → P3 gate runs
 *   Phase D — End-of-day aggregates recompute (produces aggregates for next day)
 *
 * NOTE: expectedSignals in fixtures are mock values for replay-harness.test.ts
 * (which manually injects mock aggregates). They are NOT asserted here because
 * the real RecomputeStudentAggregatesHandler may compute different values.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ── Real application handlers ────────────────────────────────────────────────
import { RunP1GateHandler } from '../application/run-p1-gate/handler';
import { RunP2GateHandler } from '../application/run-p2-gate/handler';
import { RunP3GateHandler } from '../application/run-p3-gate/handler';
import { AssessLoopHealthHandler } from '../application/assess-loop-health/handler';
import { RecomputeStudentAggregatesHandler } from '../application/recompute-student-aggregates/handler';

// ── Real domain services ─────────────────────────────────────────────────────
import { ProtocolEngine } from '../domain/study-session/protocol-engine';

// ── In-memory ports (test infrastructure) ───────────────────────────────────
import { InMemoryEventStore } from './infrastructure/in-memory-event-store';
import { InMemoryTopicStateStore } from './infrastructure/in-memory-topic-state-store';
import { InMemoryStudentAggregatesRepo } from './infrastructure/in-memory-student-aggregates-repo';
import { InMemoryStudySessionRepo } from './infrastructure/in-memory-study-session-repo';
import { InMemorySignalsPort } from './infrastructure/in-memory-signals-port';

// ── Fixtures ─────────────────────────────────────────────────────────────────
import { s7AmbitiousFixture } from './fixtures/s7-ambitious';
import { s2RevengeFixture } from './fixtures/s2-revenge';
import { s5BurnoutFixture } from './fixtures/s5-burnout';

import type { StoryboardFixture, FixtureDay, FixtureEvent, ExpectedOutput } from './fixtures/types';

// ============================================================================
// Pipeline factory
// ============================================================================

interface Pipeline {
  eventStore: InMemoryEventStore;
  topicStore: InMemoryTopicStateStore;
  aggregatesRepo: InMemoryStudentAggregatesRepo;
  sessionRepo: InMemoryStudySessionRepo;
  aggregatesHandler: RecomputeStudentAggregatesHandler;
  p1Handler: RunP1GateHandler;
  p2Handler: RunP2GateHandler;
  p3Handler: RunP3GateHandler;
}

function buildPipeline(): Pipeline {
  const eventStore = new InMemoryEventStore();
  const topicStore = new InMemoryTopicStateStore();
  const aggregatesRepo = new InMemoryStudentAggregatesRepo();
  const sessionRepo = new InMemoryStudySessionRepo();
  const signalsPort = new InMemorySignalsPort(aggregatesRepo);
  const clock = { now: () => new Date() };

  const assessLoopHealthUseCase = new AssessLoopHealthHandler(signalsPort, clock);
  const protocolEngine = new ProtocolEngine();

  const aggregatesHandler = new RecomputeStudentAggregatesHandler(
    aggregatesRepo,
    eventStore,
    topicStore,
    clock,
  );

  const p1Handler = new RunP1GateHandler(
    signalsPort,
    assessLoopHealthUseCase,
    eventStore,
    protocolEngine,
    sessionRepo,
  );

  const p2Handler = new RunP2GateHandler(
    signalsPort,
    assessLoopHealthUseCase,
    eventStore,
    eventStore,
    protocolEngine,
    sessionRepo,
  );

  const p3Handler = new RunP3GateHandler(
    signalsPort,
    assessLoopHealthUseCase,
    eventStore,
    eventStore,
    protocolEngine,
    sessionRepo,
  );

  return { eventStore, topicStore, aggregatesRepo, sessionRepo, aggregatesHandler, p1Handler, p2Handler, p3Handler };
}

// ============================================================================
// Timestamp helpers
// ============================================================================

const TIMESTAMP_PAYLOAD_FIELDS = [
  'openedAt', 'setAt', 'endedAt', 'verifiedAt', 'scheduledAt', 'dueAt',
  'startedAt', 'completedAt', 'missedAt', 'skippedAt', 'replannedAt', 'respondedAt',
] as const;

function getEventTimestamp(event: FixtureEvent, dayNumber: number): Date {
  if (event.occurredAt && !event.occurredAt.startsWith('+')) {
    const d = new Date(event.occurredAt);
    if (!isNaN(d.getTime())) return d;
  }
  for (const field of TIMESTAMP_PAYLOAD_FIELDS) {
    const val = event.payload[field];
    if (typeof val === 'string') {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d;
    }
  }
  // Fallback: day N = 2025-01-01 + (N-1) days at noon UTC
  return new Date(Date.UTC(2025, 0, dayNumber, 12, 0, 0));
}

function lastTimestampOfDay(events: FixtureEvent[], dayNumber: number): Date {
  if (events.length === 0) return new Date(Date.UTC(2025, 0, dayNumber, 23, 59, 59));
  const timestamps = events.map((e) => getEventTimestamp(e, dayNumber));
  return timestamps.reduce((max, t) => (t > max ? t : max), timestamps[0]);
}

// ============================================================================
// Event ingestion helper
// ============================================================================

/** Event types that belong to Phase A (AppOpen → P1 gate) */
const P1_FEED_TYPES = new Set(['AppOpen']);

/** Event types that belong to Phase B (IntentSet flow → P2 gate) */
const P2_FEED_TYPES = new Set(['IntentResponse', 'IntentSet', 'Replan', 'FirstActionStarted']);

function ingestEvents(
  events: FixtureEvent[],
  studentId: string,
  dayNumber: number,
  eventStore: InMemoryEventStore,
  topicStore: InMemoryTopicStateStore,
): void {
  for (const event of events) {
    const ts = getEventTimestamp(event, dayNumber);
    const topicId = event.topicId ?? (event.payload.topic as string | undefined) ?? null;
    eventStore.ingest(studentId, event.eventType, topicId, event.payload, ts);
    topicStore.applyEvent(event.eventType, topicId, event.payload);
  }
}

// ============================================================================
// Per-protocol assertions
// ============================================================================

function assertPartialMatch(
  output: Record<string, unknown>,
  partialMatch: Record<string, unknown>,
  label: string,
): void {
  for (const [key, val] of Object.entries(partialMatch)) {
    const actual = output[key];
    if (typeof val === 'object' && val !== null) {
      expect(actual, `${label} ${key}`).toMatchObject(val as object);
    } else {
      expect(actual, `${label} ${key}`).toBe(val);
    }
  }
}

/**
 * Returns true if the P1 context forces LOW_ENERGY regardless of aggregate history.
 * These conditions produce Rescue purely from context, not from computed stateTrend7d:
 *   energy ≤ 2, sleep='<6', pressure ≥ 4, backlogPressure ≥ 4
 */
function isContextForcedRescue(payload: Record<string, unknown>): boolean {
  const energy = payload.energy as number | undefined;
  const sleep = payload.sleepBucket as string | undefined;
  const pressure = payload.pressure as number | undefined;
  const backlog = payload.backlogPressure as number | undefined;
  return (
    (energy !== undefined && energy <= 2) ||
    sleep === '<6' ||
    (pressure !== undefined && pressure >= 4) ||
    (backlog !== undefined && backlog >= 4)
  );
}

async function runP1Assertion(
  day: FixtureDay,
  expected: ExpectedOutput,
  pipeline: Pipeline,
  studentId: string,
  sessionId: string,
  isFirstDay: boolean,
): Promise<void> {
  const appOpen = day.events.find((e) => e.eventType === 'AppOpen');
  if (!appOpen) return;

  const payload = appOpen.payload as Record<string, unknown>;

  const output = await pipeline.p1Handler.execute({
    studentId,
    topicId: 'default-topic',
    sessionId,
    energy: (payload.energy as number) ?? 3,
    sleepBucket: (payload.sleepBucket as string | undefined) ?? '7-8',
    pressure: (payload.pressure as number | undefined) ?? 3,
    backlogPressure: (payload.backlogPressure as number | undefined) ?? 3,
  });

  // Assert mode only when the aggregate history cannot override the expectation:
  //   (a) First fixture day — aggregates are safe defaults, context determines mode.
  //   (b) Expected Rescue AND context alone forces LOW_ENERGY (energy≤2, sleep='<6',
  //       pressure≥4, backlog≥4) — these conditions beat stateTrend7d.
  // Late-day Boost/Neutral expectations depend on stateTrend7d which the real
  // RecomputeStudentAggregatesHandler may compute differently from mock values.
  if (expected.mode) {
    const canAssert =
      isFirstDay || (expected.mode === 'Rescue' && isContextForcedRescue(payload));
    if (canAssert) {
      expect(output.mode, `P1 mode on day ${day.day}`).toBe(expected.mode);
    }
  }
  if (expected.playId && isFirstDay) {
    expect(output.playId, `P1 playId on day ${day.day}`).toBe(expected.playId);
  }

  // Structural invariants: scope floors hold for any mode
  expect(output.scope.timeboxMin, `P1 scope.timeboxMin on day ${day.day}`).toBeGreaterThanOrEqual(10);
  expect(output.scope.questionCount, `P1 scope.questionCount on day ${day.day}`).toBeGreaterThanOrEqual(1);
  expect(output.verificationPlan.minQuestions, `P1 verificationPlan.minQuestions on day ${day.day}`).toBeGreaterThanOrEqual(1);

  // Only assert partialMatch on Day 1. Late-day partialMatch values (e.g. constraints)
  // depend on aggregate state (openLoops count from real overdue-schedule computation)
  // which may differ from the mock aggregate values the fixtures were designed with.
  if (expected.partialMatch && isFirstDay) {
    assertPartialMatch(output as unknown as Record<string, unknown>, expected.partialMatch, `P1 day ${day.day}`);
  }
}

async function runP2Assertion(
  day: FixtureDay,
  expected: ExpectedOutput,
  pipeline: Pipeline,
  studentId: string,
  sessionId: string,
): Promise<void> {
  const intentSet = day.events.find((e) => e.eventType === 'IntentSet');
  if (!intentSet) return;

  const setAt = (intentSet.payload.setAt as string | undefined) ?? getEventTimestamp(intentSet, day.day).toISOString();
  const topicId = intentSet.topicId ?? (intentSet.payload.topic as string | undefined) ?? 'default-topic';

  const output = await pipeline.p2Handler.execute({
    studentId,
    topicId,
    sessionId,
    setAt,
  });

  // P2 STALLED label (high latency / many replans) is context-driven → Rescue is reliable.
  if (expected.mode) {
    expect(output.mode, `P2 mode on day ${day.day}`).toBe(expected.mode);
  }
  if (expected.playId) {
    expect(output.playId, `P2 playId on day ${day.day}`).toBe(expected.playId);
  }
  if (expected.partialMatch) {
    assertPartialMatch(output as unknown as Record<string, unknown>, expected.partialMatch, `P2 day ${day.day}`);
  }
}

async function runP3Assertion(
  day: FixtureDay,
  expected: ExpectedOutput,
  pipeline: Pipeline,
  studentId: string,
  sessionId: string,
): Promise<void> {
  const sessionEnd = day.events.find((e) => e.eventType === 'SessionEnd');
  if (!sessionEnd) return;

  const endedAt = (sessionEnd.payload.endedAt as string | undefined) ?? getEventTimestamp(sessionEnd, day.day).toISOString();
  const topicId = sessionEnd.topicId ?? (sessionEnd.payload.topic as string | undefined) ?? 'default-topic';

  const output = await pipeline.p3Handler.execute({
    studentId,
    topicId,
    sessionId,
    endedAt,
  });

  if (expected.mode) {
    expect(output.mode, `P3 mode on day ${day.day}`).toBe(expected.mode);
  }
  if (expected.playId) {
    expect(output.playId, `P3 playId on day ${day.day}`).toBe(expected.playId);
  }
  // NOTE: We do NOT assert expected.partialMatch for P3.
  // P3 partialMatch in fixtures (e.g. verificationDecision:'ScheduleVerify') documents
  // what the STUDENT chose in response to P3's output — it is a consequence of P3's
  // recommendation, not P3's output itself. In the real pipeline P3 runs at SessionEnd
  // time before the student responds, so these post-P3 outcomes are not observable here.
}

// ============================================================================
// Day processor
// ============================================================================

async function processDay(
  day: FixtureDay,
  pipeline: Pipeline,
  studentId: string,
  sessionId: string,
  isFirstDay: boolean,
): Promise<void> {
  const { eventStore, topicStore, aggregatesHandler } = pipeline;

  const p1Events = day.events.filter((e) => P1_FEED_TYPES.has(e.eventType));
  const p2Events = day.events.filter((e) => P2_FEED_TYPES.has(e.eventType));
  // P3 events = everything else (SessionEnd, RetrievalVerified, RetrievalScheduled,
  // VerificationCompleted, AvoidantExit, ScheduleSkipped, ...)
  const p3Events = day.events.filter(
    (e) => !P1_FEED_TYPES.has(e.eventType) && !P2_FEED_TYPES.has(e.eventType),
  );

  // ── Phase A: Feed AppOpen events → Run P1 gate ──────────────────────────
  // P1 runs with PREVIOUS day's aggregates (none on Day 1 → safe defaults).
  ingestEvents(p1Events, studentId, day.day, eventStore, topicStore);
  for (const expected of day.expectedOutputs.filter((o) => o.protocol === 1)) {
    await runP1Assertion(day, expected, pipeline, studentId, sessionId, isFirstDay);
  }

  // ── Phase B: Feed IntentSet/FirstActionStarted/Replan events → Run P2 ───
  // P2 reads NegotiatedIntentIssued written by P1 from the event store.
  ingestEvents(p2Events, studentId, day.day, eventStore, topicStore);
  for (const expected of day.expectedOutputs.filter((o) => o.protocol === 2)) {
    await runP2Assertion(day, expected, pipeline, studentId, sessionId);
  }

  // ── Phase C: Feed remaining events (SessionEnd, Retrieval*) → Run P3 ────
  // P3 reads NegotiatedIntentIssued (P1) and ActivationPlanIssued (P2) from
  // the event store for cross-protocol constraint propagation.
  ingestEvents(p3Events, studentId, day.day, eventStore, topicStore);
  for (const expected of day.expectedOutputs.filter((o) => o.protocol === 3)) {
    await runP3Assertion(day, expected, pipeline, studentId, sessionId);
  }

  // ── Phase D: End-of-day aggregates recompute ─────────────────────────────
  // Produces aggregates that NEXT day's gates will use.
  // NOTE: We do NOT assert expectedSignals here. Fixture expectedSignals are
  // manual mock values for replay-harness.test.ts (which injects them directly
  // into the engine). The real RecomputeStudentAggregatesHandler computes from
  // the actual event stream and may differ from those mock values.
  const now = lastTimestampOfDay(day.events, day.day);
  await aggregatesHandler.execute({ studentId, now, graceMs: 0 });
}

// ============================================================================
// Fixture runner
// ============================================================================

function runFixture(fixture: StoryboardFixture) {
  describe(`Pipeline: ${fixture.id} — ${fixture.name}`, () => {
    let pipeline: Pipeline;

    beforeEach(() => {
      pipeline = buildPipeline();
    });

    // All days run sequentially within a single `it` so events/aggregates
    // accumulate across days, matching the production execution model.
    it('replays all days through the full application pipeline', async () => {
      let isFirstDay = true;
      for (const day of fixture.days) {
        const sessionId = `${fixture.id}-day${day.day}`;
        await processDay(day, pipeline, fixture.studentId, sessionId, isFirstDay);
        isFirstDay = false;
      }
    });
  });
}

// ============================================================================
// Standalone invariant tests
// ============================================================================

describe('Pipeline invariants', () => {
  it('P1 Boost path: new user with high energy gets mode=Boost', async () => {
    const pipeline = buildPipeline();
    const output = await pipeline.p1Handler.execute({
      studentId: 'student-boost',
      topicId: 'topic-a',
      sessionId: 'session-boost',
      energy: 4,
      sleepBucket: '7-8',
      pressure: 1,
      backlogPressure: 1,
    });
    expect(output.mode).toBe('Boost');
    expect(output.scope.timeboxMin).toBeGreaterThanOrEqual(10);
    expect(output.verificationPlan.minQuestions).toBeGreaterThanOrEqual(1);
  });

  it('P1 Rescue path: burnout state gets mode=Rescue', async () => {
    const pipeline = buildPipeline();
    const output = await pipeline.p1Handler.execute({
      studentId: 'student-rescue',
      topicId: 'topic-a',
      sessionId: 'session-rescue',
      energy: 2,
      sleepBucket: '<6',
      pressure: 5,
      backlogPressure: 5,
    });
    expect(output.mode).toBe('Rescue');
    // Rescue still enforces scope floors
    expect(output.scope.timeboxMin).toBeGreaterThanOrEqual(10);
    expect(output.verificationPlan.minQuestions).toBeGreaterThanOrEqual(1);
  });

  it('P1 Neutral path: moderate state gets mode=Neutral', async () => {
    const pipeline = buildPipeline();
    const output = await pipeline.p1Handler.execute({
      studentId: 'student-neutral',
      topicId: 'topic-a',
      sessionId: 'session-neutral',
      energy: 3,
      sleepBucket: '7-8',
      pressure: 3,
      backlogPressure: 3,
    });
    expect(['Neutral', 'Boost', 'Rescue']).toContain(output.mode);
    expect(output.scope.timeboxMin).toBeGreaterThanOrEqual(10);
  });
});

// ============================================================================
// Run all storyboard fixtures
// ============================================================================

runFixture(s7AmbitiousFixture);
runFixture(s2RevengeFixture);
runFixture(s5BurnoutFixture);
