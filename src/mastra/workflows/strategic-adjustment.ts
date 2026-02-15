/**
 * Strategic Adjustment Workflow (thin orchestrator)
 *
 * Trigger: Scheduled weekly (cron) OR risk-triggered when computeAggregates
 *          detects threshold flips (EI_Spec.md section 4.13)
 * Output:  StrategicAdjustmentDecision event + updated ei_student_policy
 *
 * Flow:
 *   loadFullEvidence       -> tools: computeAggregates, getAllTopicStates, queryEvents (review window)
 *   computeDeltas          -> pure:  Ambition / Execution / Efficiency / Perception deltas over window
 *   matchScenarioAndDials  -> pure:  matchScenario -> computeDials -> do-no-harm guardrail
 *   computeTightness       -> pure:  computeTightnessLevel, merge with SA dials
 *   persistAndEmit         -> tools: setPolicy, appendEvent(StrategicAdjustmentDecision)
 *
 * @see EI_Spec.md sections 4.6-4.8, 4.14
 * @see EI_Engine_Taxonomy.md section 3.4
 */

import { createStep } from '@mastra/core/workflows';
import { createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

// Engine layers (pure functions)
import type { StudentAggregates } from '../../ei/engine/classify';
import { computeTightnessLevel } from '../../ei/engine/escalation';
import { shouldSuppressTightening } from '../../ei/engine/escalation';
import {
  matchScenario,
  computeDials,
  computeEfficiencyDiagnosis,
  applyEfficiencyDiagnosis,
  computeStrategicAdjustment,
} from '../../ei/engine/strategic-adjustment';
import type { DeltaMetrics, TopicState } from '../../ei/engine/strategic-adjustment';
import { computeAmbitionDelta } from '../../ei/engine/score';
import { SA_REVIEW_WINDOW_MIN_DAYS, SA_REVIEW_WINDOW_MAX_DAYS } from '../../ei/engine/tunables';

// ============================================================================
// Step 1: Load full evidence via tools
// ============================================================================

const loadFullEvidence = createStep({
  id: 'load-full-evidence',
  inputSchema: z.object({
    studentId: z.string(),
    trigger: z.enum(['scheduled', 'risk-triggered']),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { studentId } = inputData;

    // tool: computeAggregates({ studentId })
    const aggregates = {} as StudentAggregates;
    // tool: getAllTopicStates({ studentId })
    const topicStates = [] as TopicState[];
    // tool: queryEvents({ studentId, filters: { since: reviewWindowStart } })
    // The review window is 7-14 days depending on available data
    const reviewWindowDays = SA_REVIEW_WINDOW_MIN_DAYS;
    const reviewEvents: Array<{
      eventType: string;
      payload: Record<string, unknown>;
      occurredAt: Date;
    }> = [];

    return {
      ...inputData,
      aggregates,
      topicStates,
      reviewEvents,
      reviewWindowDays,
    };
  },
});

// ============================================================================
// Step 2: Compute deltas over review window (pure)
// ============================================================================

const computeDeltas = createStep({
  id: 'compute-deltas',
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { reviewEvents, aggregates } = inputData;

    // In practice, compute these from the raw event sequence:
    //
    // Ambition Delta:  avg(IntentScore - StateScore) over review window
    // Execution Delta: (effortDays / scheduledDays) - target
    // Efficiency Delta: (TMS improvement / effort) - baseline
    // Perception Delta: self-reported energy/pressure trend
    //
    // For now, default to zero (balanced) -- actual computation needs
    // the full event sequence which the tool provides.

    const deltas: DeltaMetrics = {
      ambitionDelta: 0,
      executionDelta: 0,
      efficiencyDelta: 0,
      perceptionDelta: 0,
    };

    // TODO: Implement actual delta computation from reviewEvents
    // Example: iterate over NegotiatedIntentIssued + AppOpen events,
    // extract stateScore/intentScore pairs, compute averages.

    return {
      ...inputData,
      deltas,
    };
  },
});

// ============================================================================
// Step 3: Match scenario, compute dials, apply guardrails (pure)
// ============================================================================

const matchScenarioAndDials = createStep({
  id: 'match-scenario-and-dials',
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { deltas, aggregates, topicStates } = inputData;

    // Use the combined function that does scenario + diagnosis + dials
    const saDecision = computeStrategicAdjustment(deltas, aggregates, topicStates);

    return {
      ...inputData,
      saDecision,
    };
  },
});

// ============================================================================
// Step 4: Compute tightness level and merge with SA dials (pure)
// ============================================================================

const computeTightnessStep = createStep({
  id: 'compute-tightness',
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { aggregates, saDecision } = inputData;

    const tightnessLevel = computeTightnessLevel(aggregates);

    return {
      ...inputData,
      tightnessLevel,
    };
  },
});

// ============================================================================
// Step 5: Persist policy and emit event (tools)
// ============================================================================

const persistAndEmit = createStep({
  id: 'persist-and-emit',
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { studentId, saDecision, tightnessLevel } = inputData;

    // Construct the policy to persist
    const policyUpdate = {
      studentId,
      tightnessLevel,
      adjustmentMode: saDecision.mode,
      dials: {
        scopeMultiplier: saDecision.dials.scopeMultiplier,
        difficultyTierDelta: saDecision.dials.difficultyTierDelta,
        minQuestionsDefault: saDecision.dials.minQuestionsDefault,
        scheduleAllowed: saDecision.dials.scheduleAllowed,
        dueInHoursDefault: saDecision.dials.dueInHoursDefault,
      },
      constraints: saDecision.dials.constraints,
    };

    // In actual implementation:
    // tool: setPolicy(policyUpdate)
    // tool: appendEvent('StrategicAdjustmentDecision', { mode, dials, diagnosis, deltas })

    return {
      studentId,
      mode: saDecision.mode,
      dials: saDecision.dials,
      diagnosis: saDecision.diagnosis,
      tightnessLevel,
    };
  },
});

// ============================================================================
// Workflow definition
// ============================================================================

export const strategicAdjustmentWorkflow = createWorkflow({
  id: 'ei-strategic-adjustment',
  inputSchema: z.object({
    studentId: z.string(),
    trigger: z.enum(['scheduled', 'risk-triggered']),
  }),
  outputSchema: z.any(),
})
  .then(loadFullEvidence)
  .then(computeDeltas)
  .then(matchScenarioAndDials)
  .then(computeTightnessStep)
  .then(persistAndEmit)
  .commit();
