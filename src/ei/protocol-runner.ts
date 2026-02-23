/**
 * Protocol Runner: orchestrates P1/P2/P3 by calling Mastra tools + pure engine.
 *
 * This is the v1 canonical protocol logic. Next.js API routes call these
 * functions directly. The Mastra workflow files remain as structured
 * documentation and can wrap this same runner logic later.
 *
 * Each function: load data (tools) -> adapt types -> engine pipeline -> enrich -> persist -> return.
 */

// ── Tools ──────────────────────────────────────────────────────────────────
import { computeAggregatesTool } from '../mastra/tools/signal-compute';
import { getPolicyTool } from '../mastra/tools/policy-store';
import { getAllTopicStatesTool, getTopicStateTool } from '../mastra/tools/tms-store';
import { queryEventsTool, appendEventTool } from '../mastra/tools/event-store';

// ── Engine (pure functions) ────────────────────────────────────────────────
import { computeStateScore } from './engine/score';
import type { SleepBucket } from './engine/score';
import type {
  StudentAggregates, StudentPolicy, P1Context, P2Context, P3Context, StateTrend, Mode,
} from './engine/classify';
import { AssessLoopHealthHandler } from './application/assess-loop-health/handler';
import { PostgresGetStudentSignalsAdapter } from './infrastructure/persistence/get-student-signals.pg';
import { getEiDb } from './runtime/db';
import { getClock } from './runtime/clock';
import {
  computeEscalationContext, computeTightnessLevel,
  getP2Escalation, getP3Escalation, applyDoNoHarmGuardrail,
} from './engine/escalation';
import type { NegotiatedIntentEvent, IntentResponseEvent } from './engine/escalation';
import { selectPlay } from './engine/plays';
import type { PlayContext } from './engine/plays';
import { executeP1Play, executeP2Play, executeP3Play } from './engine/play-executor';
import {
  findP1VerificationFloorFromEvents, findP2WatchOnlyFlagFromEvents,
} from './engine/cross-protocol';
import type { StoredEvent } from './engine/cross-protocol';

// ── Output types (from schemas) ───────────────────────────────────────────
import type {
  NegotiatedIntentIssuedOutput,
  ActivationPlanIssuedOutput,
  VerificationDecisionIssuedOutput,
} from './schemas/outputs';

// ============================================================================
// Input types
// ============================================================================

export interface P1Input {
  studentId: string;
  topic: string;
  energy: number;        // 1-5
  sleepBucket?: string;  // '<6' | '6-7' | '7-8' | '>=8'
  pressure?: number;     // 1-5
  backlogPressure?: number; // 1-5
}

export interface P2Input {
  studentId: string;
  topic: string;
  taskType?: string;
  setAt: string; // ISO datetime
}

export interface P3Input {
  studentId: string;
  topic: string;
  endedAt: string; // ISO datetime
}

// ============================================================================
// Type adapters (tool output → engine input)
// ============================================================================

type ToolCtx = { requestContext: any };

function adaptAggregates(raw: Record<string, any>): StudentAggregates {
  return {
    pendingChecks: raw.pendingChecks ?? 0,
    openLoops: raw.openLoops ?? 0,
    verificationRate7d: raw.verificationRate7d ?? 1,
    scheduleMisses7d: raw.scheduleMisses7d ?? 0,
    avoidantExits7d: raw.avoidantExits7d ?? 0,
    skipCount7d: raw.skipCount7d ?? 0,
    silenceDays: raw.silenceDays ?? 0,
    startLatencyMin: raw.startLatencyMinMedian7d ?? undefined,
    intentAcceptanceRate7d: raw.intentAcceptanceRate7d ?? undefined,
    replanLoopCount7d: raw.replanLoopCount7d ?? 0,
    stateTrend7d: (raw.stateTrend7d as StateTrend) ?? 'flat',
    loopLatencyTrend: raw.loopLatencyTrend as StudentAggregates['loopLatencyTrend'] ?? undefined,
  };
}

function adaptPolicy(raw: Record<string, any> | null): StudentPolicy {
  if (!raw) return {};
  const dials = (raw.dials ?? {}) as Record<string, any>;
  const constraints = (raw.constraints ?? {}) as Record<string, any>;
  return {
    tightnessLevel: raw.tightnessLevel as StudentPolicy['tightnessLevel'],
    scopeMultiplier: dials.scopeMultiplier as number | undefined,
    difficultyTierDelta: dials.difficultyTierDelta as number | undefined,
    constraints: {
      closeOldestOpenLoopFirst:
        (constraints.closeOldestOpenLoopFirst as boolean | undefined) ??
        (constraints.closeLoopsFirst as boolean | undefined),
      noNewTopicUntil: constraints.noNewTopicUntil as string | undefined,
    },
  };
}

function adaptEventsToStoredEvents(
  events: Array<{ id: string; eventType: string; topicId: string | null; payload: Record<string, unknown>; occurredAt: string }>
): StoredEvent[] {
  return events.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    topicId: e.topicId ?? undefined,
    payload: e.payload,
    occurredAt: new Date(e.occurredAt),
  }));
}

function extractNegotiatedIntentEvents(
  events: Array<{ eventType: string; payload: Record<string, unknown>; occurredAt: string }>
): NegotiatedIntentEvent[] {
  return events
    .filter((e) => e.eventType === 'NegotiatedIntentIssued')
    .map((e) => ({
      ambitionDelta: (e.payload.ambitionDelta as number) ?? 0,
      occurredAt: new Date(e.occurredAt),
    }));
}

function extractIntentResponseEvents(
  events: Array<{ eventType: string; payload: Record<string, unknown>; occurredAt: string }>
): IntentResponseEvent[] {
  return events
    .filter((e) => e.eventType === 'IntentResponse')
    .map((e) => ({
      decision: (e.payload.decision as IntentResponseEvent['decision']) ?? 'ignored',
      occurredAt: new Date(e.occurredAt),
    }));
}

// ============================================================================
// Protocol 1: Ignition
// ============================================================================

export async function runProtocol1(
  input: P1Input,
  requestContext: any,
): Promise<NegotiatedIntentIssuedOutput> {
  const ctx: ToolCtx = { requestContext };
  const { studentId, topic, energy, sleepBucket: rawSleep, pressure: rawPressure, backlogPressure: rawBacklog } = input;

  const sleepBucket = (rawSleep ?? '7-8') as SleepBucket;
  const pressure = rawPressure ?? 3;
  const backlogPressure = rawBacklog ?? 3;

  // ── 1. Load data via tools ───────────────────────────────────────────────
  const [aggResult, policyResult, topicStatesResult, eventsResult] = await Promise.all([
    computeAggregatesTool.execute!({ studentId }, ctx),
    getPolicyTool.execute!({ studentId }, ctx),
    getAllTopicStatesTool.execute!({ studentId }, ctx),
    queryEventsTool.execute!(
      { studentId, filters: { eventTypes: ['NegotiatedIntentIssued', 'IntentResponse'], limit: 10 } },
      ctx,
    ),
  ]);

  // ── 2. Adapt types ──────────────────────────────────────────────────────
  const aggregates = adaptAggregates(aggResult as Record<string, any>);
  const policy = adaptPolicy(policyResult as Record<string, any> | null);
  const rawEvents = (eventsResult as any).events ?? [];
  const recentIntents = extractNegotiatedIntentEvents(rawEvents);
  const recentResponses = extractIntentResponseEvents(rawEvents);

  // ── 3. Engine pipeline (LHA use case) ────────────────────────────────────
  const stateScore = computeStateScore({ energy, sleepBucket, pressure, backlogPressure });

  const p1Context: P1Context = { energy, sleepBucket, pressure, backlogPressure };
  const db = getEiDb(ctx);
  const clock = getClock(ctx);
  const assessLoopHealthUseCase = new AssessLoopHealthHandler(
    new PostgresGetStudentSignalsAdapter(db),
    clock,
  );
  const snapshot = await assessLoopHealthUseCase.execute({
    studentId,
    gatePhase: 'P1',
    gateContext: p1Context,
    aggregates,
    policy,
  });
  let mode = snapshot.mode;
  mode = applyDoNoHarmGuardrail(mode, aggregates, energy, pressure, sleepBucket);

  const escalation = computeEscalationContext(
    aggregates, energy, pressure, backlogPressure, sleepBucket,
    recentIntents, recentResponses,
  );

  mode = applyDoNoHarmGuardrail(mode, aggregates, energy, pressure, sleepBucket);

  const playContext: PlayContext = {
    studentId,
    topicId: topic,
    aggregates,
    tightnessLevel: escalation.tightnessLevel,
    p1FailurePatterns: escalation.p1FailurePatterns,
    currentEnergy: energy,
    currentPressure: pressure,
    currentBacklogPressure: backlogPressure,
    loopLatencyTrend: aggregates.loopLatencyTrend,
  };

  const play = selectPlay(1, mode, playContext);
  const rawOutput = executeP1Play(play, playContext, policy, stateScore);

  // ── 4. Enrich output ───────────────────────────────────────────────────
  const output: NegotiatedIntentIssuedOutput = {
    studentId,
    mode,
    playId: rawOutput.playId,
    topic,
    taskType: undefined,
    scope: rawOutput.scope,
    verificationPlan: rawOutput.verificationPlan,
    constraints: rawOutput.constraints
      ? { closeOpenLoopFirst: rawOutput.constraints.closeOpenLoopFirst, noNewTopicUntil: rawOutput.constraints.noNewTopicUntil }
      : undefined,
    stateScore: rawOutput.stateScore,
    intentScore: rawOutput.intentScore,
    ambitionDelta: rawOutput.ambitionDelta,
    rationale: rawOutput.rationale,
    issuedAt: new Date().toISOString(),
  };

  // ── 5. Persist event ───────────────────────────────────────────────────
  await appendEventTool.execute!(
    { studentId, eventType: 'NegotiatedIntentIssued' as const, topicId: topic, payload: output as any },
    ctx,
  );

  return output;
}

// ============================================================================
// Protocol 2: Activation
// ============================================================================

export async function runProtocol2(
  input: P2Input,
  requestContext: any,
): Promise<ActivationPlanIssuedOutput> {
  const ctx: ToolCtx = { requestContext };
  const { studentId, topic, taskType, setAt } = input;

  // ── 1. Load data via tools ───────────────────────────────────────────────
  const [aggResult, policyResult, eventsResult] = await Promise.all([
    computeAggregatesTool.execute!({ studentId }, ctx),
    getPolicyTool.execute!({ studentId }, ctx),
    queryEventsTool.execute!(
      { studentId, filters: { eventTypes: ['Replan', 'FirstActionStarted', 'IntentSet'], since: setAt, limit: 50 } },
      ctx,
    ),
  ]);

  // ── 2. Adapt types ──────────────────────────────────────────────────────
  const aggregates = adaptAggregates(aggResult as Record<string, any>);
  const policy = adaptPolicy(policyResult as Record<string, any> | null);
  const rawEvents = ((eventsResult as any).events ?? []) as Array<{ eventType: string; occurredAt: string }>;

  // ── 3. Compute session metrics ──────────────────────────────────────────
  const replans = rawEvents.filter((e) => e.eventType === 'Replan');
  const firstAction = rawEvents.find((e) => e.eventType === 'FirstActionStarted');
  const replanCount = replans.length;
  const hasStartSignal = !!firstAction;
  let startLatencyMin: number | undefined;
  if (firstAction) {
    startLatencyMin = (new Date(firstAction.occurredAt).getTime() - new Date(setAt).getTime()) / 60_000;
  }
  const timeSinceIntentSet = (Date.now() - new Date(setAt).getTime()) / 60_000;

  // ── 4. Engine pipeline (LHA use case) ─────────────────────────────────────
  const p2Context: P2Context = { startLatencyMin, replanCount, hasStartSignal, timeSinceIntentSet };
  const db = getEiDb(ctx);
  const clock = getClock(ctx);
  const assessLoopHealthUseCase = new AssessLoopHealthHandler(
    new PostgresGetStudentSignalsAdapter(db),
    clock,
  );
  const snapshot = await assessLoopHealthUseCase.execute({
    studentId,
    gatePhase: 'P2',
    gateContext: p2Context,
    aggregates,
    policy,
  });
  const mode = snapshot.mode;

  const tightnessLevel = computeTightnessLevel(aggregates);
  const p2Escalation = getP2Escalation(aggregates, 0, 0);

  const playContext: PlayContext = {
    studentId,
    topicId: topic,
    aggregates,
    tightnessLevel,
    p2Escalation,
    replanCount,
    startLatencyMin,
    currentEnergy: undefined,
    currentPressure: undefined,
  };

  const play = selectPlay(2, mode, playContext);
  const rawOutput = executeP2Play(play, playContext, policy);

  // ── 5. Enrich output ───────────────────────────────────────────────────
  const output: ActivationPlanIssuedOutput = {
    studentId,
    mode,
    playId: rawOutput.playId,
    firstAction: rawOutput.firstAction,
    replanCap: rawOutput.replanCap,
    focusContract: rawOutput.constraints?.noSwitchingUntil
      ? { noSwitchingUntil: rawOutput.constraints.noSwitchingUntil }
      : undefined,
    allowedFallback: rawOutput.constraints?.enforceWatchOnlyVerification
      ? { enforceWatchOnlyVerification: true }
      : undefined,
    rationale: rawOutput.rationale,
    issuedAt: new Date().toISOString(),
  };

  // ── 6. Persist event ───────────────────────────────────────────────────
  await appendEventTool.execute!(
    { studentId, eventType: 'ActivationPlanIssued' as const, topicId: topic, payload: output as any },
    ctx,
  );

  return output;
}

// ============================================================================
// Protocol 3: Verification
// ============================================================================

export async function runProtocol3(
  input: P3Input,
  requestContext: any,
): Promise<VerificationDecisionIssuedOutput> {
  const ctx: ToolCtx = { requestContext };
  const { studentId, topic, endedAt } = input;

  // ── 1. Load data via tools ───────────────────────────────────────────────
  const [aggResult, policyResult, eventsResult] = await Promise.all([
    computeAggregatesTool.execute!({ studentId }, ctx),
    getPolicyTool.execute!({ studentId }, ctx),
    queryEventsTool.execute!(
      {
        studentId,
        filters: {
          eventTypes: [
            'NegotiatedIntentIssued', 'ActivationPlanIssued',
            'RetrievalVerified', 'RetrievalScheduled', 'VerificationCompleted',
          ],
          limit: 20,
        },
      },
      ctx,
    ),
  ]);

  // ── 2. Adapt types ──────────────────────────────────────────────────────
  const aggregates = adaptAggregates(aggResult as Record<string, any>);
  const policy = adaptPolicy(policyResult as Record<string, any> | null);
  const rawEvents = ((eventsResult as any).events ?? []) as Array<{
    id: string; eventType: string; topicId: string | null; payload: Record<string, unknown>; occurredAt: string;
  }>;
  const storedEvents = adaptEventsToStoredEvents(rawEvents);

  // ── 3. Cross-protocol constraints ──────────────────────────────────────
  const p1VerificationFloor = findP1VerificationFloorFromEvents(storedEvents);
  const p2WatchOnlyFlag = findP2WatchOnlyFlagFromEvents(storedEvents);
  const hasRetrieval = storedEvents.some((e) => e.eventType === 'RetrievalVerified');
  const hasSchedule = storedEvents.some((e) => e.eventType === 'RetrievalScheduled');

  // ── 4. Engine pipeline (LHA use case) ─────────────────────────────────────
  const p3Context: P3Context = { hasRetrieval, hasSchedule };
  const db = getEiDb(ctx);
  const clock = getClock(ctx);
  const assessLoopHealthUseCase = new AssessLoopHealthHandler(
    new PostgresGetStudentSignalsAdapter(db),
    clock,
  );
  const snapshot = await assessLoopHealthUseCase.execute({
    studentId,
    gatePhase: 'P3',
    gateContext: p3Context,
    aggregates,
    policy,
  });
  const mode = snapshot.mode;

  const tightnessLevel = computeTightnessLevel(aggregates);
  const p3Escalation = getP3Escalation(aggregates);

  const playContext: PlayContext = {
    studentId,
    topicId: topic,
    aggregates,
    tightnessLevel,
    p3Escalation,
    hasRetrieval,
    hasSchedule,
    loopLatencyTrend: aggregates.loopLatencyTrend,
  };

  const play = selectPlay(3, mode, playContext);
  const rawOutput = executeP3Play(
    play, playContext, policy,
    p1VerificationFloor ?? undefined,
    p2WatchOnlyFlag,
  );

  // ── 5. Enrich output ───────────────────────────────────────────────────
  const output: VerificationDecisionIssuedOutput = {
    studentId,
    mode,
    playId: rawOutput.playId,
    topic,
    verificationDecision: rawOutput.decision as 'VerifyNow' | 'ScheduleVerify' | 'Skip',
    verificationSpec: rawOutput.verifyNow
      ? {
          minQuestions: rawOutput.verifyNow.minQuestions,
          timeboxSec: rawOutput.verifyNow.timeboxSec,
          difficultyTier: rawOutput.verifyNow.difficultyTier,
          format: rawOutput.verifyNow.format,
        }
      : undefined,
    deadlineSpec: rawOutput.scheduleVerify
      ? {
          dueInHours: rawOutput.scheduleVerify.dueInHours,
          graceHours: rawOutput.scheduleVerify.graceHours,
          minQuestions: rawOutput.scheduleVerify.minQuestions,
        }
      : undefined,
    reason: rawOutput.skipReason,
    rationale: rawOutput.rationale,
    issuedAt: new Date().toISOString(),
  };

  // ── 6. Persist event ───────────────────────────────────────────────────
  await appendEventTool.execute!(
    { studentId, eventType: 'VerificationDecisionIssued' as const, topicId: topic, payload: output as any },
    ctx,
  );

  return output;
}
