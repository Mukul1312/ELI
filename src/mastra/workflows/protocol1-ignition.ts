/**
 * Protocol 1: Ignition Workflow (structured documentation)
 *
 * Real orchestration happens in src/ei/protocol-runner.ts.
 * This workflow documents the step-by-step flow with properly typed schemas.
 *
 * @see EI_Protocol_1_Ignition.md
 * @see EI_Engine_Taxonomy.md sections 3.1, 4
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { computeStateScore } from '../../ei/engine/score';
import { assignP1Label, resolveMode } from '../../ei/engine/classify';
import type { StudentAggregates, StudentPolicy, P1Context } from '../../ei/engine/classify';
import { computeEscalationContext, applyDoNoHarmGuardrail } from '../../ei/engine/escalation';
import type { IntentResponseEvent, NegotiatedIntentEvent } from '../../ei/engine/escalation';
import { selectPlay } from '../../ei/engine/plays';
import type { PlayContext } from '../../ei/engine/plays';
import { executeP1Play } from '../../ei/engine/play-executor';
import { NegotiatedIntentIssuedSchema } from '../../ei/schemas/outputs';

// ============================================================================
// Shared schemas for pipeline state
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
  constraints: z.object({ closeLoopsFirst: z.boolean().optional(), noNewTopicUntil: z.string().optional() }).optional(),
});

const ModeSchema = z.enum(['Rescue', 'Neutral', 'Boost']);

const P1Input = z.object({
  studentId: z.string(), energy: z.number().min(1).max(5),
  sleepBucket: z.enum(['<6', '6-7', '7-8', '>=8']),
  pressure: z.number().min(1).max(5), backlogPressure: z.number().min(1).max(5),
  openedAt: z.string().datetime(),
});

const ContextLoaded = z.object({
  studentId: z.string(), energy: z.number(), sleepBucket: z.string(),
  pressure: z.number(), backlogPressure: z.number(),
  aggregates: AggregatesSchema, policy: PolicySchema,
  topicStates: z.array(z.record(z.unknown())),
  recentIntents: z.array(z.record(z.unknown())),
  recentResponses: z.array(z.record(z.unknown())),
});

const Scored = ContextLoaded.extend({ stateScore: z.number() });

const Classified = Scored.extend({
  label: z.string(), mode: ModeSchema,
  play: z.record(z.unknown()), escalation: z.record(z.unknown()), playContext: z.record(z.unknown()),
});

// ============================================================================
// Steps
// ============================================================================

const loadStudentContext = createStep({
  id: 'load-student-context',
  inputSchema: P1Input,
  outputSchema: ContextLoaded,
  execute: async ({ inputData }): Promise<any> => {
    const { studentId, energy, sleepBucket, pressure, backlogPressure } = inputData;
    return {
      studentId, energy, sleepBucket, pressure, backlogPressure,
      aggregates: {} as StudentAggregates,
      policy: {} as StudentPolicy,
      topicStates: [],
      recentIntents: [] as NegotiatedIntentEvent[],
      recentResponses: [] as IntentResponseEvent[],
    };
  },
});

const computeScores = createStep({
  id: 'compute-scores',
  inputSchema: ContextLoaded,
  outputSchema: Scored,
  execute: async ({ inputData }): Promise<any> => {
    const { energy, sleepBucket, pressure, backlogPressure } = inputData;
    const stateScore = computeStateScore({
      energy, sleepBucket: sleepBucket as '<6' | '6-7' | '7-8' | '>=8', pressure, backlogPressure,
    });
    return { ...inputData, stateScore };
  },
});

const classifyAndSelectPlay = createStep({
  id: 'classify-and-select-play',
  inputSchema: Scored,
  outputSchema: Classified,
  execute: async ({ inputData }): Promise<any> => {
    const { energy, sleepBucket, pressure, backlogPressure, aggregates, policy, recentIntents, recentResponses } = inputData;
    const p1Context: P1Context = { energy, sleepBucket: sleepBucket as any, pressure, backlogPressure };
    const agg = aggregates as unknown as StudentAggregates;
    const pol = policy as unknown as StudentPolicy;
    const label = assignP1Label(p1Context, agg);
    let mode = resolveMode(label, agg, pol);
    const escalation = computeEscalationContext(
      agg, energy, pressure, backlogPressure, sleepBucket as any,
      recentIntents as unknown as NegotiatedIntentEvent[],
      recentResponses as unknown as IntentResponseEvent[],
    );
    mode = applyDoNoHarmGuardrail(mode, agg, energy, pressure, sleepBucket as any);
    const playContext: PlayContext = {
      studentId: inputData.studentId, aggregates: agg,
      tightnessLevel: escalation.tightnessLevel, p1FailurePatterns: escalation.p1FailurePatterns,
      currentEnergy: energy, currentPressure: pressure, currentBacklogPressure: backlogPressure,
      loopLatencyTrend: agg.loopLatencyTrend,
    };
    const play = selectPlay(1, mode, playContext);
    return { ...inputData, label, mode, play, escalation, playContext };
  },
});

const executeAndEmit = createStep({
  id: 'execute-and-emit',
  inputSchema: Classified,
  outputSchema: NegotiatedIntentIssuedSchema,
  execute: async ({ inputData }): Promise<any> => {
    const { play, playContext, policy, stateScore, mode } = inputData;
    const output = executeP1Play(
      play as any, playContext as unknown as PlayContext,
      policy as unknown as StudentPolicy, stateScore,
    );
    return { ...output, topic: output.topicId, mode, issuedAt: new Date().toISOString() };
  },
});

// ============================================================================
// Workflow definition
// ============================================================================

export const protocol1IgnitionWorkflow = createWorkflow({
  id: 'ei-protocol1-ignition',
  inputSchema: P1Input,
  outputSchema: NegotiatedIntentIssuedSchema,
})
  .then(loadStudentContext)
  .then(computeScores)
  .then(classifyAndSelectPlay)
  .then(executeAndEmit)
  .commit();
