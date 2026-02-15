/**
 * Protocol 2: Activation Workflow (thin orchestrator)
 *
 * Trigger: IntentSet event (student commits to a topic/task)
 * Output:  ActivationPlanIssued event
 *
 * Flow:
 *   loadStudentContext    -> tools: computeAggregates, getPolicy, queryEvents (recent Replans/FirstAction)
 *   computeSessionMetrics -> pure:  compute startLatencyMin, replanCount from queried events
 *   classifyAndSelect     -> pure:  assignP2Label -> resolveMode -> escalation -> selectPlay
 *   executeAndEmit        -> pure:  executePlay -> tool: appendEvent(ActivationPlanIssued)
 *
 * Cross-protocol: if play is P2-R3 (watch-only), the ActivationPlanIssued payload
 * sets `constraints.enforceWatchOnlyVerification = true`. P3 reads this flag and
 * MUST enforce minimum verification even though the student only watched/read.
 *
 * The client must track Replan and FirstActionStarted events and send them
 * so the system can detect STALLED behaviour.
 *
 * @see EI_Protocol_2_Activation.md
 * @see EI_Engine_Taxonomy.md sections 3.2, 4
 */

import { createStep } from '@mastra/core/workflows';
import { createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

// Engine layers (pure functions)
import { assignP2Label, resolveMode } from '../../ei/engine/classify';
import type { StudentAggregates, StudentPolicy, P2Context } from '../../ei/engine/classify';
import { computeTightnessLevel, getP2Escalation, applyDoNoHarmGuardrail } from '../../ei/engine/escalation';
import { selectPlay } from '../../ei/engine/plays';
import type { PlayContext } from '../../ei/engine/plays';
import { executeP2Play } from '../../ei/engine/play-executor';

// ============================================================================
// Step 1: Load student context via tools
// ============================================================================

const loadStudentContext = createStep({
  id: 'load-student-context',
  inputSchema: z.object({
    studentId: z.string(),
    topic: z.string(),
    taskType: z.string().optional(),
    setAt: z.string().datetime(),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { studentId, topic, setAt } = inputData;

    // tool: computeAggregates({ studentId })
    const aggregates = {} as StudentAggregates;
    // tool: getPolicy({ studentId })
    const policy = {} as StudentPolicy;
    // tool: queryEvents({ studentId, filters: { eventTypes: ['Replan', 'FirstActionStarted', 'IntentSet'], since: <sessionStart> } })
    const sessionEvents: Array<{ eventType: string; occurredAt: Date }> = [];

    return {
      ...inputData,
      aggregates,
      policy,
      sessionEvents,
    };
  },
});

// ============================================================================
// Step 2: Compute session metrics from raw events (pure)
// ============================================================================

const computeSessionMetrics = createStep({
  id: 'compute-session-metrics',
  inputSchema: z.any(),
  outputSchema: z.any(),
  execute: async ({ inputData }) => {
    const { sessionEvents, setAt } = inputData;

    // Count replans before first action
    const replans = sessionEvents.filter((e: { eventType: string }) => e.eventType === 'Replan');
    const firstAction = sessionEvents.find((e: { eventType: string }) => e.eventType === 'FirstActionStarted');

    const replanCount = replans.length;
    const hasStartSignal = !!firstAction;

    // Compute start latency in minutes
    let startLatencyMin: number | undefined;
    if (firstAction) {
      const intentSetTime = new Date(setAt).getTime();
      const startTime = new Date(firstAction.occurredAt).getTime();
      startLatencyMin = (startTime - intentSetTime) / 60_000;
    }

    // Time since intent was set
    const timeSinceIntentSet = (Date.now() - new Date(setAt).getTime()) / 60_000;

    return {
      ...inputData,
      replanCount,
      hasStartSignal,
      startLatencyMin,
      timeSinceIntentSet,
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
      aggregates,
      policy,
      replanCount,
      hasStartSignal,
      startLatencyMin,
      timeSinceIntentSet,
    } = inputData;

    const p2Context: P2Context = {
      startLatencyMin,
      replanCount,
      hasStartSignal,
      timeSinceIntentSet,
    };

    // 1. Assign label
    const label = assignP2Label(p2Context, aggregates);

    // 2. Resolve mode
    let mode = resolveMode(label, aggregates, policy);

    // 3. Check P2-specific escalation
    const tightnessLevel = computeTightnessLevel(aggregates);
    // For stallCount7d and watchOnlyCount7d we would query events; placeholder 0 for now
    const p2Escalation = getP2Escalation(aggregates, 0, 0);

    // 4. Build play context and select play
    const playContext: PlayContext = {
      studentId: inputData.studentId,
      topicId: inputData.topic,
      aggregates,
      tightnessLevel,
      p2Escalation,
      replanCount,
      startLatencyMin,
      currentEnergy: undefined, // P2 doesn't re-read energy; uses aggregates
      currentPressure: undefined,
    };

    const play = selectPlay(2, mode, playContext);

    return {
      ...inputData,
      label,
      mode,
      play,
      playContext,
      tightnessLevel,
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
    const { play, playContext, policy } = inputData;

    const output = executeP2Play(play, playContext, policy);

    // In actual implementation: tool call to appendEvent('ActivationPlanIssued', output)

    return output;
  },
});

// ============================================================================
// Workflow definition
// ============================================================================

export const protocol2ActivationWorkflow = createWorkflow({
  id: 'ei-protocol2-activation',
  inputSchema: z.object({
    studentId: z.string(),
    topic: z.string(),
    taskType: z.string().optional(),
    setAt: z.string().datetime(),
  }),
  outputSchema: z.any(),
})
  .then(loadStudentContext)
  .then(computeSessionMetrics)
  .then(classifyAndSelectPlay)
  .then(executeAndEmit)
  .commit();
