/**
 * Protocol 1: Ignition Workflow (thin orchestrator)
 *
 * Trigger: AppOpen event (student opens the app)
 * Output:  NegotiatedIntentIssued event
 *
 * Flow:
 *   loadStudentContext  -> tools: computeAggregates, getPolicy, getAllTopicStates, queryEvents
 *   computeScores       -> pure: computeStateScore, computeIntentScore, computeAmbitionDelta
 *   classifyAndSelect   -> pure: assignP1Label -> resolveMode -> escalation (PatternA/B/C) -> selectPlay
 *   executeAndEmit      -> pure: executePlay -> tool: appendEvent(NegotiatedIntentIssued)
 *
 * After the client receives NegotiatedIntentIssued, it MUST send an IntentResponse
 * event when the student accepts / edits / rejects / ignores the intent.
 *
 * @see EI_Protocol_1_Ignition.md
 * @see EI_Engine_Taxonomy.md sections 3.1, 4
 */

import { createStep } from '@mastra/core/workflows';
import { createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

// Engine layers (pure functions)
import { computeStateScore, computeIntentScore, computeAmbitionDelta } from '../../ei/engine/score';
import { assignP1Label, resolveMode } from '../../ei/engine/classify';
import type { StudentAggregates, StudentPolicy, P1Context } from '../../ei/engine/classify';
import { computeEscalationContext } from '../../ei/engine/escalation';
import type { IntentResponseEvent, NegotiatedIntentEvent } from '../../ei/engine/escalation';
import { selectPlay } from '../../ei/engine/plays';
import type { PlayContext } from '../../ei/engine/plays';
import { executeP1Play } from '../../ei/engine/play-executor';
import { applyDoNoHarmGuardrail } from '../../ei/engine/escalation';

// ============================================================================
// Step 1: Load student context via tools
// ============================================================================

const loadStudentContext = createStep({
  id: 'load-student-context',
  inputSchema: z.object({
    studentId: z.string(),
    energy: z.number().min(1).max(5),
    sleepBucket: z.enum(['<6', '6-7', '7-8', '>=8']),
    pressure: z.number().min(1).max(5),
    backlogPressure: z.number().min(1).max(5),
    openedAt: z.string().datetime(),
  }),
  outputSchema: z.object({
    studentId: z.string(),
    energy: z.number(),
    sleepBucket: z.string(),
    pressure: z.number(),
    backlogPressure: z.number(),
    aggregates: z.any(),
    policy: z.any(),
    topicStates: z.any(),
    recentIntents: z.any(),
    recentResponses: z.any(),
  }),
  execute: async ({ inputData, mapiClient }) => {
    const { studentId, energy, sleepBucket, pressure, backlogPressure } = inputData;

    // Call tools to load context
    // NOTE: In actual implementation, these would be calls to the Mastra tool runner
    // e.g., const aggregates = await mapiClient.runTool('computeAggregates', { studentId });
    // For now, these are placeholders showing the shape of tool calls.

    const aggregates = {} as StudentAggregates; // tool: computeAggregates({ studentId })
    const policy = {} as StudentPolicy; // tool: getPolicy({ studentId })
    const topicStates = []; // tool: getAllTopicStates({ studentId })
    const recentIntents = [] as NegotiatedIntentEvent[]; // tool: queryEvents({ studentId, filters: { eventTypes: ['NegotiatedIntentIssued'] } })
    const recentResponses = [] as IntentResponseEvent[]; // tool: queryEvents({ studentId, filters: { eventTypes: ['IntentResponse'] } })

    return {
      studentId,
      energy,
      sleepBucket,
      pressure,
      backlogPressure,
      aggregates,
      policy,
      topicStates,
      recentIntents,
      recentResponses,
    };
  },
});

// ============================================================================
// Step 2: Compute scores (pure)
// ============================================================================

const computeScores = createStep({
  id: 'compute-scores',
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { energy, sleepBucket, pressure, backlogPressure } = inputData;

    const stateScore = computeStateScore({
      energy,
      sleepBucket: sleepBucket as '<6' | '6-7' | '7-8' | '>=8',
      pressure,
      backlogPressure,
    });

    return {
      ...inputData,
      stateScore,
    };
  },
});

// ============================================================================
// Step 3: Classify, check escalation, select play (pure)
// ============================================================================

const classifyAndSelectPlay = createStep({
  id: 'classify-and-select-play',
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const {
      energy,
      sleepBucket,
      pressure,
      backlogPressure,
      aggregates,
      policy,
      recentIntents,
      recentResponses,
      stateScore,
    } = inputData;

    const p1Context: P1Context = { energy, sleepBucket, pressure, backlogPressure };

    // 1. Assign label
    const label = assignP1Label(p1Context, aggregates);

    // 2. Resolve mode (applies 6 precedence rules)
    let mode = resolveMode(label, aggregates, policy);

    // 3. Check escalation (failure patterns A/B/C)
    const escalation = computeEscalationContext(
      aggregates,
      energy,
      pressure,
      backlogPressure,
      sleepBucket as '<6' | '6-7' | '7-8' | '>=8',
      recentIntents,
      recentResponses,
    );

    // 4. Apply do-no-harm guardrail
    mode = applyDoNoHarmGuardrail(
      mode,
      aggregates,
      energy,
      pressure,
      sleepBucket as '<6' | '6-7' | '7-8' | '>=8',
    );

    // 5. Build play context and select play
    const playContext: PlayContext = {
      studentId: inputData.studentId,
      aggregates,
      tightnessLevel: escalation.tightnessLevel,
      p1FailurePatterns: escalation.p1FailurePatterns,
      currentEnergy: energy,
      currentPressure: pressure,
      currentBacklogPressure: backlogPressure,
      loopLatencyTrend: aggregates.loopLatencyTrend,
    };

    const play = selectPlay(1, mode, playContext);

    return {
      ...inputData,
      label,
      mode,
      play,
      escalation,
      playContext,
    };
  },
});

// ============================================================================
// Step 4: Execute play and emit event (pure + tool)
// ============================================================================

const executeAndEmit = createStep({
  id: 'execute-and-emit',
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { play, playContext, policy, stateScore } = inputData;

    // Execute the selected play to produce the output contract
    const output = executeP1Play(play, playContext, policy, stateScore);

    // In actual implementation: tool call to appendEvent('NegotiatedIntentIssued', output)
    // const result = await mapiClient.runTool('appendEvent', {
    //   studentId: output.studentId,
    //   eventType: 'NegotiatedIntentIssued',
    //   topicId: output.topicId,
    //   payload: output,
    // });

    return output;
  },
});

// ============================================================================
// Workflow definition
// ============================================================================

export const protocol1IgnitionWorkflow = createWorkflow({
  id: 'ei-protocol1-ignition',
  inputSchema: z.object({
    studentId: z.string(),
    energy: z.number().min(1).max(5),
    sleepBucket: z.enum(['<6', '6-7', '7-8', '>=8']),
    pressure: z.number().min(1).max(5),
    backlogPressure: z.number().min(1).max(5),
    openedAt: z.string().datetime(),
  }),
  outputSchema: z.any(),
})
  .then(loadStudentContext)
  .then(computeScores)
  .then(classifyAndSelectPlay)
  .then(executeAndEmit)
  .commit();
