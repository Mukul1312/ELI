/**
 * Protocol 3: Verification Workflow (structured documentation)
 *
 * Real orchestration happens in src/ei/protocol-runner.ts.
 *
 * @see EI_Protocol_3_Verification.md
 * @see EI_Engine_Taxonomy.md sections 3.3, 4
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { assignP3Label, resolveMode } from '../../ei/engine/classify';
import type { StudentAggregates, StudentPolicy, P3Context } from '../../ei/engine/classify';
import { computeTightnessLevel, getP3Escalation } from '../../ei/engine/escalation';
import { selectPlay } from '../../ei/engine/plays';
import type { PlayContext } from '../../ei/engine/plays';
import { executeP3Play } from '../../ei/engine/play-executor';
import { findP1VerificationFloorFromEvents, findP2WatchOnlyFlagFromEvents } from '../../ei/engine/cross-protocol';
import type { StoredEvent } from '../../ei/engine/cross-protocol';
import { VerificationDecisionIssuedSchema } from '../../ei/schemas/outputs';

// ============================================================================
// Schemas
// ============================================================================

const AggregatesSchema = z.object({
  pendingChecks: z.number(), openLoops: z.number(), verificationRate7d: z.number(),
  scheduleMisses7d: z.number(), avoidantExits7d: z.number(), skipCount7d: z.number(),
  silenceDays: z.number(), startLatencyMin: z.number().optional(),
  intentAcceptanceRate7d: z.number().nullable().optional(), replanLoopCount7d: z.number(),
  stateTrend7d: z.enum(['improving', 'flat', 'worsening']),
  loopLatencyTrend: z.enum(['improving', 'worsening', 'stable']).nullable().optional(),
});

const PolicySchema = z.object({
  tightnessLevel: z.enum(['Loose', 'Normal', 'Tight']).optional(),
  scopeMultiplier: z.number().optional(), difficultyTierDelta: z.number().optional(),
  constraints: z.object({ closeOldestOpenLoopFirst: z.boolean().optional(), noNewTopicUntil: z.string().optional() }).optional(),
});

const ModeSchema = z.enum(['Rescue', 'Neutral', 'Boost']);

const EventSchema = z.object({
  id: z.string(), eventType: z.string(), topicId: z.string().optional(),
  payload: z.record(z.unknown()), occurredAt: z.coerce.date(),
});

const P3Input = z.object({ studentId: z.string(), topic: z.string(), endedAt: z.string().datetime() });

const ContextLoaded = P3Input.extend({
  aggregates: AggregatesSchema, policy: PolicySchema,
  topicState: z.record(z.unknown()), recentEvents: z.array(EventSchema),
});

const CrossChecked = ContextLoaded.extend({
  p1VerificationFloor: z.object({ minQuestions: z.number(), preferVerifyNow: z.boolean() }).nullable(),
  p2WatchOnlyFlag: z.boolean(), hasRetrieval: z.boolean(), hasSchedule: z.boolean(),
});

const Classified = CrossChecked.extend({
  label: z.string(), mode: ModeSchema, play: z.record(z.unknown()),
  playContext: z.record(z.unknown()), tightnessLevel: z.string(), p3Escalation: z.record(z.unknown()),
});

const Executed = Classified.extend({ decision: z.record(z.unknown()) });

// ============================================================================
// Steps
// ============================================================================

const loadStudentContext = createStep({
  id: 'load-student-context',
  inputSchema: P3Input,
  outputSchema: ContextLoaded,
  execute: async ({ inputData }): Promise<any> => ({
    ...inputData,
    aggregates: {} as StudentAggregates,
    policy: {} as StudentPolicy,
    topicState: {},
    recentEvents: [] as StoredEvent[],
  }),
});

const checkCrossProtocol = createStep({
  id: 'check-cross-protocol',
  inputSchema: ContextLoaded,
  outputSchema: CrossChecked,
  execute: async ({ inputData }): Promise<any> => {
    const events = inputData.recentEvents as unknown as StoredEvent[];
    return {
      ...inputData,
      p1VerificationFloor: findP1VerificationFloorFromEvents(events),
      p2WatchOnlyFlag: findP2WatchOnlyFlagFromEvents(events),
      hasRetrieval: events.some((e) => e.eventType === 'RetrievalVerified'),
      hasSchedule: events.some((e) => e.eventType === 'RetrievalScheduled'),
    };
  },
});

const classifyAndSelectPlay = createStep({
  id: 'classify-and-select-play',
  inputSchema: CrossChecked,
  outputSchema: Classified,
  execute: async ({ inputData }): Promise<any> => {
    const agg = inputData.aggregates as unknown as StudentAggregates;
    const pol = inputData.policy as unknown as StudentPolicy;
    const p3Context: P3Context = { hasRetrieval: inputData.hasRetrieval, hasSchedule: inputData.hasSchedule };
    const label = assignP3Label(p3Context, agg);
    const mode = resolveMode(label, agg, pol);
    const tightnessLevel = computeTightnessLevel(agg);
    const p3Escalation = getP3Escalation(agg);
    const playContext: PlayContext = {
      studentId: inputData.studentId, topicId: inputData.topic, aggregates: agg,
      tightnessLevel, p3Escalation, hasRetrieval: inputData.hasRetrieval, hasSchedule: inputData.hasSchedule,
      loopLatencyTrend: agg.loopLatencyTrend,
    };
    const play = selectPlay(3, mode, playContext);
    return { ...inputData, label, mode, play, playContext, tightnessLevel, p3Escalation };
  },
});

const executeAndEmit = createStep({
  id: 'execute-and-emit',
  inputSchema: Classified,
  outputSchema: Executed,
  execute: async ({ inputData }): Promise<any> => {
    const output = executeP3Play(
      inputData.play as any, inputData.playContext as unknown as PlayContext,
      inputData.policy as unknown as StudentPolicy,
      inputData.p1VerificationFloor ?? undefined, inputData.p2WatchOnlyFlag ?? false,
    );
    return { ...inputData, decision: output };
  },
});

const updateTopicState = createStep({
  id: 'update-topic-state',
  inputSchema: Executed,
  outputSchema: VerificationDecisionIssuedSchema,
  execute: async ({ inputData }): Promise<any> => {
    const d = inputData.decision as Record<string, any>;
    return {
      studentId: inputData.studentId, mode: inputData.mode, playId: d.playId ?? '',
      topic: inputData.topic, verificationDecision: d.decision ?? 'VerifyNow',
      verificationSpec: d.verifyNow, deadlineSpec: d.scheduleVerify,
      reason: d.skipReason, issuedAt: new Date().toISOString(),
    };
  },
});

// ============================================================================
// Workflow
// ============================================================================

export const protocol3VerificationWorkflow = createWorkflow({
  id: 'ei-protocol3-verification',
  inputSchema: P3Input,
  outputSchema: VerificationDecisionIssuedSchema,
})
  .then(loadStudentContext)
  .then(checkCrossProtocol)
  .then(classifyAndSelectPlay)
  .then(executeAndEmit)
  .then(updateTopicState)
  .commit();
