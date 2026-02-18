/**
 * Protocol 2: Activation Workflow (structured documentation)
 *
 * Real orchestration happens in src/ei/protocol-runner.ts.
 *
 * @see EI_Protocol_2_Activation.md
 * @see EI_Engine_Taxonomy.md sections 3.2, 4
 */

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { assignP2Label, resolveMode } from '../../ei/engine/classify';
import type { StudentAggregates, StudentPolicy, P2Context } from '../../ei/engine/classify';
import { computeTightnessLevel, getP2Escalation } from '../../ei/engine/escalation';
import { selectPlay } from '../../ei/engine/plays';
import type { PlayContext } from '../../ei/engine/plays';
import { executeP2Play } from '../../ei/engine/play-executor';
import { ActivationPlanIssuedSchema } from '../../ei/schemas/outputs';

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
  constraints: z.object({ closeLoopsFirst: z.boolean().optional(), noNewTopicUntil: z.string().optional() }).optional(),
});

const ModeSchema = z.enum(['Rescue', 'Neutral', 'Boost']);

const P2Input = z.object({
  studentId: z.string(), topic: z.string(), taskType: z.string().optional(), setAt: z.string().datetime(),
});

const ContextLoaded = P2Input.extend({
  aggregates: AggregatesSchema, policy: PolicySchema,
  sessionEvents: z.array(z.object({ eventType: z.string(), occurredAt: z.coerce.date() })),
});

const Metricked = ContextLoaded.extend({
  replanCount: z.number(), hasStartSignal: z.boolean(),
  startLatencyMin: z.number().optional(), timeSinceIntentSet: z.number(),
});

const Classified = Metricked.extend({
  label: z.string(), mode: ModeSchema, play: z.record(z.unknown()),
  playContext: z.record(z.unknown()), tightnessLevel: z.string(),
});

// ============================================================================
// Steps
// ============================================================================

const loadStudentContext = createStep({
  id: 'load-student-context',
  inputSchema: P2Input,
  outputSchema: ContextLoaded,
  execute: async ({ inputData }): Promise<any> => ({
    ...inputData,
    aggregates: {} as StudentAggregates,
    policy: {} as StudentPolicy,
    sessionEvents: [],
  }),
});

const computeSessionMetrics = createStep({
  id: 'compute-session-metrics',
  inputSchema: ContextLoaded,
  outputSchema: Metricked,
  execute: async ({ inputData }): Promise<any> => {
    const { sessionEvents, setAt } = inputData;
    const replans = sessionEvents.filter((e: any) => e.eventType === 'Replan');
    const firstAction = sessionEvents.find((e: any) => e.eventType === 'FirstActionStarted');
    const replanCount = replans.length;
    const hasStartSignal = !!firstAction;
    let startLatencyMin: number | undefined;
    if (firstAction) {
      startLatencyMin = (new Date(firstAction.occurredAt).getTime() - new Date(setAt).getTime()) / 60_000;
    }
    const timeSinceIntentSet = (Date.now() - new Date(setAt).getTime()) / 60_000;
    return { ...inputData, replanCount, hasStartSignal, startLatencyMin, timeSinceIntentSet };
  },
});

const classifyAndSelectPlay = createStep({
  id: 'classify-and-select-play',
  inputSchema: Metricked,
  outputSchema: Classified,
  execute: async ({ inputData }): Promise<any> => {
    const { aggregates, policy, replanCount, hasStartSignal, startLatencyMin, timeSinceIntentSet } = inputData;
    const agg = aggregates as unknown as StudentAggregates;
    const pol = policy as unknown as StudentPolicy;
    const p2Context: P2Context = { startLatencyMin, replanCount, hasStartSignal, timeSinceIntentSet };
    const label = assignP2Label(p2Context, agg);
    const mode = resolveMode(label, agg, pol);
    const tightnessLevel = computeTightnessLevel(agg);
    const p2Escalation = getP2Escalation(agg, 0, 0);
    const playContext: PlayContext = {
      studentId: inputData.studentId, topicId: inputData.topic,
      aggregates: agg, tightnessLevel, p2Escalation, replanCount, startLatencyMin,
    };
    const play = selectPlay(2, mode, playContext);
    return { ...inputData, label, mode, play, playContext, tightnessLevel };
  },
});

const executeAndEmit = createStep({
  id: 'execute-and-emit',
  inputSchema: Classified,
  outputSchema: ActivationPlanIssuedSchema,
  execute: async ({ inputData }): Promise<any> => {
    const { play, playContext, policy, mode } = inputData;
    const output = executeP2Play(play as any, playContext as unknown as PlayContext, policy as unknown as StudentPolicy);
    return { ...output, mode, issuedAt: new Date().toISOString() };
  },
});

// ============================================================================
// Workflow
// ============================================================================

export const protocol2ActivationWorkflow = createWorkflow({
  id: 'ei-protocol2-activation',
  inputSchema: P2Input,
  outputSchema: ActivationPlanIssuedSchema,
})
  .then(loadStudentContext)
  .then(computeSessionMetrics)
  .then(classifyAndSelectPlay)
  .then(executeAndEmit)
  .commit();
